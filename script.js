// script.js
let sb = null;

// Wacht tot de Supabase client beschikbaar is
function waitForSupabase() {
  return new Promise((resolve) => {
    const checkSupabase = () => {
      if (window.supabaseClient) {
        sb = window.supabaseClient;
        resolve();
      } else {
        setTimeout(checkSupabase, 100);
      }
    };
    checkSupabase();
  });
}

// Flow state
let currentStep = 1;
let selectedDienstId = null;
let selectedDate = null;
let selectedBarberId = null;
let dateOffset = 0; // days from today for first card
let selectedTime = null;

// Get service duration
async function getServiceDuration(serviceId) {
  if (!sb) return 30; // Default 30 minutes
  try {
    const { data, error } = await sb.from("diensten").select("duur_minuten").eq("id", serviceId).single();
    if (error) throw error;
    return data?.duur_minuten || 30;
  } catch (e) {
    console.error("Error fetching service duration:", e);
    return 30; // Default fallback
  }
}

// Diensten laden
async function loadDiensten() {
  console.log("🔥 loadDiensten called");
  const sel = document.getElementById("dienstSelect");
  const list = document.getElementById("dienstList");
  if (!sel) {
    console.error("dienstSelect element not found");
    return;
  }
  if (list) list.innerHTML = "";
  sel.innerHTML = "<option>Laden...</option>";
  
  if (!sb) {
    console.error("Supabase client not available in loadDiensten");
    sel.innerHTML = "<option>Database verbinding fout</option>";
    return;
  }
  
  try {
    console.log("🔥 Fetching diensten from database...");
    const { data, error } = await sb.from("diensten").select("*").order("id");
    console.log("🔥 Diensten data:", data);
    console.log("🔥 Diensten error:", error);
    
    if (error) throw error;
    sel.innerHTML = "";
    if (!data || data.length === 0) {
      console.log("🔥 No diensten found");
      sel.innerHTML = "<option>Geen diensten gevonden</option>";
      return;
    }
    data.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = `${d.naam} (€${d.prijs_euro})`;
      sel.appendChild(opt);

      // render list item
      if (list) {
        const item = document.createElement('div');
        item.className = 'service-item';
        item.dataset.value = String(d.id);
        item.innerHTML = `
          <div class="service-left">
            <span class="service-radio"></span>
            <div>
              <div class="service-title">${d.naam}</div>
              <div class="service-meta">${d.duur_minuten || ''} minuten</div>
            </div>
          </div>
          <div class="service-price">€ ${d.prijs_euro}</div>
        `;
        item.addEventListener('click', () => selectDienst(String(d.id)));
        list.appendChild(item);
      }
    });
  } catch (e) {
    console.error(e);
    sel.innerHTML = "<option>Fout bij laden</option>";
  }
}

// Barbers laden
async function loadBarbers() {
  const sel = document.getElementById("barberSelect");
  const barberList = document.getElementById("barberList");
  if (!sel || !barberList) return;
  
  // Reset both dropdown and list
  sel.innerHTML = "";
  sel.value = "";
  barberList.innerHTML = "<div style='padding: 12px; text-align: center; color: #666;'>Laden...</div>";
  
  try {
    const { data, error } = await sb.from("barbers").select("*").order("id");
    if (error) throw error;
    
    // Clear the list
    barberList.innerHTML = "";
    
    // Add placeholder option to hidden dropdown for compatibility
    const placeholderOpt = document.createElement("option");
    placeholderOpt.value = "";
    placeholderOpt.textContent = "Maak een keuze uit onze barbers";
    placeholderOpt.disabled = true;
    placeholderOpt.selected = true;
    sel.appendChild(placeholderOpt);
    
    if (!data || data.length === 0) {
      barberList.innerHTML = "<div style='padding: 12px; text-align: center; color: #666;'>Geen barbers gevonden</div>";
      return;
    }
    
    // Create barber cards
    data.forEach(barber => {
      // Add to hidden dropdown for compatibility
      const opt = document.createElement("option");
      opt.value = barber.id;
      opt.textContent = barber.naam;
      sel.appendChild(opt);
      
      // Create barber card
      const barberCard = document.createElement("div");
      barberCard.className = "barber-item";
      barberCard.dataset.barberId = barber.id;
      barberCard.innerHTML = `
        <div class="barber-left">
          <div class="barber-radio"></div>
          <div>
            <div class="barber-title">${barber.naam}</div>
          </div>
        </div>
      `;
      
      // Add click handler
      barberCard.addEventListener('click', () => {
        // Remove selection from all barber cards
        document.querySelectorAll('.barber-item').forEach(item => {
          item.classList.remove('selected');
        });
        
        // Select this barber card
        barberCard.classList.add('selected');
        
        // Update hidden dropdown for compatibility
        sel.value = barber.id;
        
        // Trigger change event for existing logic
        sel.dispatchEvent(new Event('change'));
      });
      
      barberList.appendChild(barberCard);
    });
  } catch (e) {
    console.error(e);
    barberList.innerHTML = "<div style='padding: 12px; text-align: center; color: #f28b82;'>Fout bij laden van barbers</div>";
  }
}

// Tijdslots (customizable start/end times per 15 min)
async function generateTimeSlots(startTime = '09:00', endTime = '18:00') {
  const container = document.getElementById("timeSlots");
  if(!container) {
    console.error('Time slots container not found!');
    return;
  }
  
  console.log('Clearing time slots container');
  container.innerHTML = "";

  // Parse start and end times
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  // Handle 24:00:00 as 24:00 (end of day)
  const actualEndHour = endHour === 24 ? 24 : endHour;
  const actualEndMin = endHour === 24 ? 0 : endMin;
  
  const interval = 15;
  console.log('Generating time slots from', startTime, 'to', endTime);
  console.log('Parsed times:', { startHour, startMin, endHour, endMin });
  console.log('Actual end time:', { actualEndHour, actualEndMin });

  // Get current time to disable past time slots
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Get selected date
  const selectedDate = document.getElementById('dateInput')?.value;
  const isToday = selectedDate === now.toISOString().split('T')[0];

  // Get selected service to calculate max booking time
  let maxServiceDuration = 30; // Default 30 minutes
  if (selectedDienstId) {
    maxServiceDuration = await getServiceDuration(selectedDienstId);
    console.log('Selected service duration:', maxServiceDuration, 'minutes');
  } else {
    // If no service selected, use the longest possible service duration to be safe
    try {
      const { data: services } = await sb.from("diensten").select("duur_minuten");
      if (services && services.length > 0) {
        maxServiceDuration = Math.max(...services.map(s => s.duur_minuten || 30));
        console.log('No service selected, using max service duration:', maxServiceDuration, 'minutes');
      }
    } catch (error) {
      console.log('Could not fetch max service duration, using default 30 minutes');
    }
  }

  // Calculate the latest time slot that allows the service to finish before shift end
  const maxBookingTime = new Date(`2000-01-01T${actualEndHour}:${actualEndMin}:00`);
  const latestStartTime = new Date(maxBookingTime.getTime() - maxServiceDuration * 60000);
  
  console.log('=== TIME SLOT GENERATION DEBUG ===');
  console.log('Input endTime:', endTime);
  console.log('Parsed endHour:', endHour, 'endMin:', endMin);
  console.log('ActualEndHour:', actualEndHour, 'actualEndMin:', actualEndMin);
  console.log('Shift end time:', endTime);
  console.log('Max service duration:', maxServiceDuration, 'minutes');
  console.log('Shift end DateTime:', maxBookingTime.toTimeString().slice(0, 5));
  console.log('Latest start time to finish before shift end:', latestStartTime.toTimeString().slice(0, 5));

  let slotCount = 0;
  for(let h=startHour; h<actualEndHour; h++){
    for(let m=0; m<60; m+=interval){
      // Skip if before start time or at/after end time
      if (h < startHour || (h === startHour && m < startMin) || h > actualEndHour || (h === actualEndHour && m >= actualEndMin)) {
        continue;
      }
      
      const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
      const slotTime = new Date(`2000-01-01T${timeStr}:00`);
      
      // Skip if this slot would not allow the service to finish before shift end
      const serviceEndTime = new Date(slotTime.getTime() + maxServiceDuration * 60000);
      if (serviceEndTime > maxBookingTime) {
        console.log(`❌ Skipping ${timeStr} - service would finish at ${serviceEndTime.toTimeString().slice(0, 5)} after shift end (${maxBookingTime.toTimeString().slice(0, 5)})`);
        continue;
      } else {
        console.log(`✅ Allowing ${timeStr} - service would finish at ${serviceEndTime.toTimeString().slice(0, 5)} before shift end (${maxBookingTime.toTimeString().slice(0, 5)})`);
      }
      
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerText = timeStr;
      btn.className = "time-btn";
      
      // Check if this time slot is in the past (only for today)
      if (isToday && (h < currentHour || (h === currentHour && m < currentMinute))) {
        btn.classList.add('disabled', 'past-time');
        btn.disabled = true;
        btn.title = 'Deze tijd is al voorbij';
        console.log(`⏰ Disabling past time slot: ${timeStr}`);
      }
      
      btn.addEventListener("click",(e)=>{
        // Prevent clicking on disabled buttons
        if (btn.classList.contains('disabled') || btn.hasAttribute('disabled')) {
          e.preventDefault();
          e.stopPropagation();
          console.log('Click prevented on disabled button:', timeStr);
          return false;
        }
        selectTimeSlot(timeStr);
      });
      container.appendChild(btn);
      slotCount++;
    }
  }
  
  console.log(`Generated ${slotCount} time slots (considering ${maxServiceDuration}min service duration)`);
  console.log(`Container now has ${container.children.length} children`);
  
  // Debug: Log the last few time slots to verify they're correct
  const timeButtons = container.querySelectorAll('.time-btn');
  const lastFewSlots = Array.from(timeButtons).slice(-3).map(btn => btn.textContent);
  console.log('Last few time slots generated:', lastFewSlots);
  
  // Debug: Check if any slot would exceed shift end
  timeButtons.forEach(btn => {
    const timeStr = btn.textContent;
    const [hour, min] = timeStr.split(':').map(Number);
    const slotTime = new Date(`2000-01-01T${hour}:${min}:00`);
    const serviceEndTime = new Date(slotTime.getTime() + maxServiceDuration * 60000);
    if (serviceEndTime > maxBookingTime) {
      console.warn(`⚠️ BUG: Time slot ${timeStr} would end at ${serviceEndTime.toTimeString().slice(0, 5)} after shift end!`);
    }
  });
  
  // Debug: Test specific problematic time
  const testTime = '16:45';
  const [testHour, testMin] = testTime.split(':').map(Number);
  const testSlotTime = new Date(`2000-01-01T${testHour}:${testMin}:00`);
  const testServiceEndTime = new Date(testSlotTime.getTime() + maxServiceDuration * 60000);
  console.log(`🔍 TEST: Time ${testTime} with ${maxServiceDuration}min service:`);
  console.log(`  Start: ${testSlotTime.toTimeString().slice(0, 5)}`);
  console.log(`  End: ${testServiceEndTime.toTimeString().slice(0, 5)}`);
  console.log(`  Shift End: ${maxBookingTime.toTimeString().slice(0, 5)}`);
  console.log(`  Valid: ${testServiceEndTime <= maxBookingTime ? 'YES' : 'NO'}`);
}

// Apply blocked times to time slot buttons
function applyBlockedTimes(blockedTimes) {
  if (!blockedTimes || blockedTimes.size === 0) {
    console.log('No blocked times to apply');
    return;
  }
  
  console.log('Applying blocked times:', Array.from(blockedTimes));
  console.log('Total time buttons found:', document.querySelectorAll('.time-btn').length);
  
  let disabledCount = 0;
  document.querySelectorAll('.time-btn').forEach(btn => {
    const timeStr = btn.innerText;
    if (blockedTimes.has(timeStr)) {
      btn.classList.add('disabled');
      btn.setAttribute('disabled', 'true');
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      console.log(`🔒 Disabled time slot: ${timeStr}`);
      disabledCount++;
    } else {
      btn.classList.remove('disabled');
      btn.removeAttribute('disabled');
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  });
  
  console.log(`✅ Applied blocked times: ${disabledCount} slots disabled`);
}

function selectTimeSlot(time){
  // Check if the clicked button is disabled
  const clickedBtn = Array.from(document.querySelectorAll(".time-btn")).find(btn => btn.innerText === time);
  if (clickedBtn && (clickedBtn.classList.contains('disabled') || clickedBtn.hasAttribute('disabled'))) {
    console.log('Cannot select disabled time slot:', time);
    return; // Don't select disabled time slots
  }
  
  selectedTime = time;
  console.log(`🕐 Selected time slot: ${time}`);
  
  // Check if this time is in the blocked times
  if (blockedTimes && blockedTimes.has(time)) {
    console.log(`⚠️ WARNING: ${time} is in blocked times but was selected!`);
    console.log('Blocked times:', Array.from(blockedTimes));
  }
  
  document.querySelectorAll(".time-btn").forEach(btn=>btn.classList.remove("selected"));
  document.querySelectorAll(".time-btn").forEach(btn=>{
    if(btn.innerText===time) btn.classList.add("selected");
  });
}

// Fetch booked times for a given date (YYYY-MM-DD) and barber
async function fetchBookedTimes(dateStr, barberId){
  if (!dateStr || !barberId) {
    console.log('fetchBookedTimes: Missing date or barber', { dateStr, barberId });
    return new Set();
  }
  try {
    const start = `${dateStr}T00:00:00`;
    // compute next day for exclusive upper bound
    const d = new Date(dateStr);
    const next = new Date(d.getTime() + 24*60*60*1000);
    const yyyy = next.getFullYear();
    const mm = String(next.getMonth()+1).padStart(2,'0');
    const dd = String(next.getDate()).padStart(2,'0');
    const end = `${yyyy}-${mm}-${dd}T00:00:00`;

    console.log('fetchBookedTimes: Querying for', { dateStr, barberId, start, end });

    // Use old method for now - get booked times with service durations
    console.log('Using old method for overlap detection');
    const { data, error } = await sb
      .from('boekingen')
      .select('datumtijd, dienst_id')
      .eq('barber_id', barberId)
      .gte('datumtijd', start)
      .lt('datumtijd', end);
    
    if (error) throw error;
    
    console.log('fetchBookedTimes: Raw data from DB', data);
    
    const times = new Set();
    for (const row of (data || [])) {
      const dt = row.datumtijd;
      if (typeof dt === 'string') {
        const t = dt.split('T')[1]?.slice(0,5);
        if (t) {
          const duration = await getServiceDuration(row.dienst_id);
          const startTime = new Date(`2000-01-01T${t}:00`);
          const endTime = new Date(startTime.getTime() + duration * 60000);
          
          console.log(`🔒 Blocking times from ${t} to ${endTime.toTimeString().slice(0, 5)} (${duration}min)`);
          
          // Block time slots every 15 minutes for the duration
          for (let i = 0; i < duration; i += 15) {
            const blockedTime = new Date(startTime.getTime() + i * 60000);
            const blockedTimeStr = blockedTime.toTimeString().slice(0, 5);
            times.add(blockedTimeStr);
            console.log(`  - Blocked: ${blockedTimeStr}`);
          }
          
          // Also block times that would overlap when booking a new appointment
          // Check all possible start times that would overlap with this existing appointment
          const existingEndTime = new Date(startTime.getTime() + duration * 60000);
          console.log(`🔍 Checking for overlapping start times that would conflict with ${t}-${existingEndTime.toTimeString().slice(0, 5)}`);
          
          // Check all 15-minute slots from 09:00 to 17:00
          for (let checkHour = 9; checkHour < 17; checkHour++) {
            for (let checkMin = 0; checkMin < 60; checkMin += 15) {
              const checkTimeStr = `${checkHour.toString().padStart(2,'0')}:${checkMin.toString().padStart(2,'0')}`;
              const checkStartTime = new Date(`2000-01-01T${checkTimeStr}:00`);
              
              // Calculate what the end time would be for a 30-minute service starting at this time
              const checkEndTime = new Date(checkStartTime.getTime() + 30 * 60000); // Assume 30min service
              
              // Check if this potential appointment would overlap with the existing one
              if (checkStartTime < existingEndTime && checkEndTime > startTime) {
                times.add(checkTimeStr);
                console.log(`  - Blocked overlapping start time: ${checkTimeStr} (would end at ${checkEndTime.toTimeString().slice(0, 5)})`);
              }
            }
          }
        }
      }
    }
    
    console.log('fetchBookedTimes: Processed times', Array.from(times));
    
    // Debug: Check specific times
    console.log('🔍 DEBUG: Checking specific times:');
    console.log('09:45 in blocked times?', times.has('09:45'));
    console.log('10:00 in blocked times?', times.has('10:00'));
    console.log('10:15 in blocked times?', times.has('10:15'));
    console.log('10:30 in blocked times?', times.has('10:30'));
    
    if (times.has('09:45')) {
      console.log('⚠️ 09:45 is available but should be blocked if there\'s a 10:00 appointment');
    }
    
    return times;
  } catch (e) {
    console.error('Fout bij laden van geboekte tijden:', e);
    return new Set();
  }
}

// Helper function for old method fallback
async function processOldBookedTimes(data) {
  const times = new Set();
  for (const row of (data || [])) {
    const dt = row.datumtijd;
    if (typeof dt === 'string') {
      const t = dt.split('T')[1]?.slice(0,5);
      if (t) {
        const duration = await getServiceDuration(row.dienst_id);
        const startTime = new Date(`2000-01-01T${t}:00`);
        
        for (let i = 0; i < duration; i += 15) {
          const blockedTime = new Date(startTime.getTime() + i * 60000);
          const blockedTimeStr = blockedTime.toTimeString().slice(0, 5);
          times.add(blockedTimeStr);
        }
      }
    }
  }
  return times;
}

// Fetch barber availability (working days and hours)
async function fetchBarberAvailability(barberId) {
  if (!barberId || barberId === 'Laden...' || isNaN(barberId)) {
    console.log('fetchBarberAvailability: No valid barber ID provided');
    return null;
  }
  
  try {
    const { data, error } = await sb
      .from('barber_availability')
      .select('day_of_week, start_time, end_time')
      .eq('barber_id', barberId);

    if (error) {
      console.error('Error fetching barber availability:', error);
      console.log('Table might not exist yet, using fallback availability');
      // Return fallback availability (all days, 9-17)
      return getFallbackAvailability();
    }

    console.log('Fetched barber availability:', data);
    
    // If no data returned, use fallback
    if (!data || data.length === 0) {
      console.log('No availability data found, using fallback');
      return getFallbackAvailability();
    }
    
    return data;
  } catch (error) {
    console.error('Error in fetchBarberAvailability:', error);
    console.log('Using fallback availability due to error');
    return getFallbackAvailability();
  }
}

// Fallback availability when table doesn't exist or has no data
function getFallbackAvailability() {
  // Return empty array to indicate no availability
  return [];
}

// Check if a barber works on a specific day
function isBarberWorkingOnDay(availability, dayOfWeek) {
  console.log('isBarberWorkingOnDay called with:', { availability, dayOfWeek });
  
  if (!availability || !Array.isArray(availability) || availability.length === 0) {
    console.log('No availability data, returning false');
    return false; // No availability data means not working
  }
  
  const dayMapping = {
    0: 'sunday',
    1: 'monday', 
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
  };
  
  const dayName = dayMapping[dayOfWeek];
  const isWorking = availability.some(avail => avail.day_of_week === dayName);
  console.log('isBarberWorkingOnDay result:', { dayName, isWorking });
  return isWorking;
}

// NEW FUNCTION - Get barber working hours for a specific day
function getBarberWorkingHoursNEW(availability, dayOfWeek) {
  console.log('🔥 NEW FUNCTION CALLED - getBarberWorkingHoursNEW:', { availability, dayOfWeek });
  
  if (!availability || !Array.isArray(availability) || availability.length === 0) {
    console.log('🔥 NO AVAILABILITY - RETURNING NULL');
    return null;
  }
  
  const dayMapping = {
    0: 'sunday',
    1: 'monday', 
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
  };
  
  const dayName = dayMapping[dayOfWeek];
  const dayAvailability = availability.find(avail => avail.day_of_week === dayName);
  
  if (dayAvailability) {
    let endTime = dayAvailability.end_time;
    if (endTime === '00:00:00') {
      endTime = '24:00:00';
    }
    
    return {
      start: dayAvailability.start_time,
      end: endTime
    };
  }
  
  return null;
}

async function refreshAvailabilityNEW(){
  console.log('🔥🔥🔥 NEW refreshAvailabilityNEW FUNCTION CALLED 🔥🔥🔥');
  const dateVal = document.getElementById('dateInput')?.value;
  const barberVal = document.getElementById('barberSelect')?.value;
  console.log('🔥 NEW FUNCTION called with', { dateVal, barberVal });
  
  // If no barber selected or still loading, don't show time slots yet
  if (!barberVal || barberVal === 'Laden...' || isNaN(barberVal)) {
    console.log('No valid barber selected yet, hiding time slots');
    const timeSlotsContainer = document.querySelector('.time-slots');
    if (timeSlotsContainer) {
      timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; font-style: italic;">Selecteer eerst een barber om beschikbare tijden te zien</p>';
    }
    return;
  }
  
  // Fetch barber availability first
  console.log('Fetching barber availability for', barberVal);
  const barberAvailability = await fetchBarberAvailability(barberVal);
  console.log('Fetched barber availability:', barberAvailability);
  
  // If no date selected, show message instead of times
  if (!dateVal) {
    console.log('No date selected, showing message');
    const timeSlotsContainer = document.querySelector('.time-slots');
    if (timeSlotsContainer) {
      timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; font-style: italic;">Selecteer eerst een datum om beschikbare tijden te zien</p>';
    }
    return;
  }
  
  // If no barber availability data, show message instead of times
  if (!barberAvailability || !Array.isArray(barberAvailability) || barberAvailability.length === 0) {
    console.log('No barber availability data, showing message');
    const timeSlotsContainer = document.querySelector('.time-slots');
    if (timeSlotsContainer) {
      timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; font-style: italic;">Deze barber heeft nog geen werktijden ingesteld. Neem contact op voor beschikbaarheid.</p>';
    }
    return;
  }
  
  console.log('Barber availability data found:', barberAvailability);
  
  // Check if barber works on the selected date
  const selectedDate = new Date(dateVal);
  const dayOfWeek = selectedDate.getDay();
  console.log('Checking if barber works on day:', { selectedDate: dateVal, dayOfWeek, barberAvailability });
  
  const isWorking = isBarberWorkingOnDay(barberAvailability, dayOfWeek);
  console.log('Is barber working on this day?', isWorking);
  
  if (!isWorking) {
    console.log('Barber does not work on this day, hiding time slots');
    const timeSlotsContainer = document.querySelector('.time-slots');
    if (timeSlotsContainer) {
      timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Deze barber werkt niet op deze dag</p>';
    }
    return;
  }
  
  // Get barber working hours for this day - USING NEW FUNCTION
  const workingHours = getBarberWorkingHoursNEW(barberAvailability, dayOfWeek);
  console.log('🔥 NEW FUNCTION RESULT:', workingHours);
  console.log('🔥 Working hours type:', typeof workingHours, 'Is null:', workingHours === null);
  
  // Check if barber has working hours for this day - VERSION 2.0
  if (!workingHours) {
    console.log('=== NO WORKING HOURS - SHOWING MESSAGE V2.0 ===');
    const timeSlotsContainer = document.querySelector('.time-slots');
    if (timeSlotsContainer) {
      timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; font-style: italic;">Deze barber werkt niet op deze dag. Kies een andere dag of barber.</p>';
    }
    return;
  }
  
  // Ensure we have valid working hours
  let startTime = workingHours.start || '09:00';
  let endTime = workingHours.end || '17:00';
  
  // Additional fix for end time issues
  if (endTime === '00:00:00' || endTime === '00:00') {
    endTime = '24:00:00';
    console.log('Fixed end time in refreshAvailability:', endTime);
  }
  
  console.log('Using working hours:', { startTime, endTime });
  
  // Generate time slots based on barber's working hours
  console.log('About to generate time slots with:', { startTime, endTime });
  await generateTimeSlots(startTime, endTime);
  
  // Fetch and apply blocked times
  console.log('Fetching blocked times for:', { dateVal, barberVal });
  blockedTimes = await fetchBookedTimes(dateVal, barberVal);
  console.log('Fetched blocked times:', Array.from(blockedTimes));
  
  // Apply blocked times to time slots
  applyBlockedTimes(blockedTimes);
  
  // Verify time slots were generated
  const timeSlotsContainer = document.querySelector('.time-slots');
  const timeSlotCount = timeSlotsContainer ? timeSlotsContainer.children.length : 0;
  console.log('Time slots generated:', timeSlotCount);
  
  // Fetch booked times and disable them
  console.log('Fetching booked times for', { dateVal, barberVal });
  const blocked = await fetchBookedTimes(dateVal, barberVal);
  console.log('Blocked times:', Array.from(blocked));
  
  document.querySelectorAll('.time-btn').forEach(btn => {
    const t = btn.innerText;
    if (blocked.has(t)) {
      console.log('Disabling booked time slot:', t);
      // Make booked time slots grey and disabled
      btn.classList.add('disabled');
      btn.setAttribute('disabled', 'true');
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.6';
      btn.style.backgroundColor = '#f5f5f5';
      btn.style.color = '#9aa0a6';
      btn.style.textDecoration = 'line-through';
      btn.style.cursor = 'not-allowed';
      btn.style.borderColor = '#d1d5db';
    } else {
      console.log('Enabling available time slot:', t);
      // Make available time slots normal
      btn.classList.remove('disabled');
      btn.removeAttribute('disabled');
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
      btn.style.backgroundColor = '';
      btn.style.color = '';
      btn.style.textDecoration = '';
      btn.style.cursor = '';
      btn.style.borderColor = '';
    }
  });
}

async function selectDienst(id){
  // Prevent service switching if we're in step 3 (customer details)
  if (currentStep === 3) {
    console.log('Cannot change service in step 3');
    return;
  }
  
  const sel = document.getElementById("dienstSelect");
  if (sel) sel.value = id;
  selectedDienstId = id;
  document.querySelectorAll('.service-item').forEach(el=>el.classList.remove('selected'));
  const active = document.querySelector(`.service-item[data-value="${id}"]`);
  if (active) active.classList.add('selected');
  // enable right panel
  const right = document.getElementById('rightPanel');
  if (right) right.classList.remove('disabled');
  // On small screens, scroll to right panel
  if (window.innerWidth <= 900 && right) {
    right.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  // Regenerate time slots with new service duration if we have a date and barber selected
  const dateVal = document.getElementById('dateInput')?.value;
  const barberVal = document.getElementById('barberSelect')?.value;
  
  if (dateVal && barberVal) {
    console.log('Service changed, regenerating time slots with new duration...');
    await refreshAvailabilityNEW();
  }
}

// Show booking confirmation popup
async function showBookingConfirmation() {
  const popup = document.getElementById('bookingConfirmationPopup');
  if (!popup) return;
  
  // Get all the data
  const naam = document.getElementById("naamInput").value.trim();
  const email = document.getElementById("emailInput")?.value.trim();
  const telefoon = document.getElementById("phoneInput")?.value.trim();
  
  // Check loyalty status
  let loyaltyInfo = null;
  if (email) {
    loyaltyInfo = await checkLoyaltyStatus(email);
  }
  
  // Get service info
  const selectedService = document.querySelector('.service-item.selected');
  const serviceName = selectedService ? selectedService.querySelector('.service-title')?.textContent : 'Onbekend';
  const servicePrice = selectedService ? selectedService.querySelector('.service-price')?.textContent : 'Onbekend';
  
  // Extract price from service price text (e.g., "€25" or "€ 25" -> 25)
  const priceMatch = servicePrice.match(/€\s*(\d+)/);
  let originalPrice = priceMatch ? parseInt(priceMatch[1]) : 0;
  
  // Fallback: try to extract any number from the price text
  if (originalPrice === 0) {
    const numberMatch = servicePrice.match(/(\d+)/);
    originalPrice = numberMatch ? parseInt(numberMatch[1]) : 0;
  }
  
  console.log('Price calculation:', {
    servicePrice,
    priceMatch,
    originalPrice,
    loyaltyInfo
  });
  
  // Apply loyalty discount if applicable (only if loyalty system is enabled)
  let finalPrice = originalPrice;
  let discountInfo = null;
  if (loyaltySettings.enabled && loyaltyInfo && loyaltyInfo.hasDiscount) {
    const discountAmount = originalPrice * (loyaltySettings.discountPercentage / 100);
    const finalPriceCalculated = originalPrice - discountAmount;
    
    console.log('Discount calculation:', {
      originalPrice,
      discountAmount,
      finalPriceCalculated,
      loyaltyPoints: loyaltyInfo.points
    });
    
    discountInfo = {
      originalPrice: originalPrice,
      discountAmount: discountAmount,
      finalPrice: finalPriceCalculated,
      discountPercentage: loyaltySettings.discountPercentage,
      points: loyaltyInfo.points
    };
    
    finalPrice = finalPriceCalculated;
  }
  
  // Get barber info
  const barberName = barberSelect ? barberSelect.options[barberSelect.selectedIndex]?.text : 'Onbekend';
  
  // Format date
  const dateObj = new Date(selectedDate);
  const formattedDate = dateObj.toLocaleDateString('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Populate popup
  document.getElementById('popupDate').textContent = formattedDate;
  document.getElementById('popupTime').textContent = selectedTime;
  document.getElementById('popupBarber').textContent = barberName;
  document.getElementById('popupService').textContent = serviceName;
  
  // Show/hide loyalty discount banner (only if loyalty system is enabled)
  const discountBanner = document.getElementById('loyaltyDiscountBanner');
  if (loyaltySettings.enabled && discountInfo) {
    // Show big discount banner
    discountBanner.style.display = 'block';
    document.getElementById('discountAmount').textContent = `€${discountInfo.discountAmount}`;
    
    // Update loyalty points and appointments count
    const appointmentsCount = Math.floor(discountInfo.points / loyaltySettings.pointsPerAppointment);
    document.getElementById('loyaltyPoints').textContent = discountInfo.points;
    document.querySelector('.discount-reason').innerHTML = 
      `Je hebt <span>${discountInfo.points}</span> punten (${appointmentsCount} afspraken) en verdient deze korting!`;
    
    // Update price display
    const priceElement = document.getElementById('popupPrice');
    priceElement.innerHTML = `
      <span style="text-decoration: line-through; color: #999;">€${discountInfo.originalPrice}</span>
      <span style="color: #28a745; font-weight: bold; font-size: 18px;">€${discountInfo.finalPrice}</span>
    `;
  } else {
    // Hide discount banner
    discountBanner.style.display = 'none';
    
    // Normal price display
    const priceElement = document.getElementById('popupPrice');
    priceElement.textContent = servicePrice;
    
    // Only show loyalty info if system is enabled
    if (loyaltySettings.enabled && loyaltyInfo) {
      priceElement.innerHTML += `<br><small style="color: #666;">Loyaliteitspunten: ${loyaltyInfo.points} (${loyaltySettings.pointsForDiscount - loyaltyInfo.points} tot korting)</small>`;
    }
  }
  
  document.getElementById('popupName').textContent = naam;
  document.getElementById('popupEmail').textContent = email || 'Niet opgegeven';
  document.getElementById('popupPhone').textContent = telefoon || 'Niet opgegeven';
  
  // Show popup
  popup.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Hide booking confirmation popup
function hideBookingConfirmation() {
  const popup = document.getElementById('bookingConfirmationPopup');
  if (popup) {
    popup.style.display = 'none';
    document.body.style.overflow = 'auto'; // Re-enable scrolling
  }
}

// Boeking opslaan
async function boekDienst(){
  const naam = document.getElementById("naamInput").value.trim();
  const email = document.getElementById("emailInput")?.value.trim();
  const telefoon = document.getElementById("phoneInput")?.value.trim();
  const barberId = document.getElementById("barberSelect").value;
  const dienstId = document.getElementById("dienstSelect").value;
  const date = document.getElementById("dateInput").value;

  // basis validatie
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneDigits = telefoon ? telefoon.replace(/\D/g, "") : "";

  if(!naam || !email || !telefoon || !barberId || !dienstId || !date || !selectedTime){
    return alert("Vul alle velden in (naam, e-mail, telefoon, dienst, datum, tijd)!");
  }
  if(!emailRegex.test(email)){
    return alert("Vul een geldig e-mailadres in.");
  }
  if(phoneDigits.length < 8){
    return alert("Vul een geldig telefoonnummer in.");
  }

  // Check if the selected time allows the service to finish before shift end
  const serviceDuration = await getServiceDuration(dienstId);
  const barberAvailability = await fetchBarberAvailability(barberId);
  const dayOfWeek = new Date(date).getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  const workingHours = barberAvailability?.find(avail => avail.day_of_week === dayName);
  
  if (workingHours) {
    const shiftEndTime = workingHours.end || '17:00';
    const [endHour, endMin] = shiftEndTime.split(':').map(Number);
    const shiftEndDateTime = new Date(`2000-01-01T${endHour}:${endMin}:00`);
    
    const [timeHour, timeMin] = selectedTime.split(':').map(Number);
    const bookingStartDateTime = new Date(`2000-01-01T${timeHour}:${timeMin}:00`);
    const bookingEndDateTime = new Date(bookingStartDateTime.getTime() + serviceDuration * 60000);
    
    if (bookingEndDateTime > shiftEndDateTime) {
      const endTimeStr = bookingEndDateTime.toTimeString().slice(0, 5);
      const shiftEndStr = shiftEndDateTime.toTimeString().slice(0, 5);
      return alert(`Deze afspraak zou eindigen om ${endTimeStr}, maar de barber werkt maar tot ${shiftEndStr}. Kies een eerder tijdstip.`);
    }
  }

  // Show confirmation popup instead of directly saving
  showBookingConfirmation();
  return; // Exit here, actual saving happens in confirmBooking function
}

// Actually save the booking (called from popup confirmation)
async function confirmBooking(){
  const naam = document.getElementById("naamInput").value.trim();
  const email = document.getElementById("emailInput")?.value.trim();
  const telefoon = document.getElementById("phoneInput")?.value.trim();
  const barberId = document.getElementById("barberSelect").value;
  const dienstId = document.getElementById("dienstSelect").value;
  const date = document.getElementById("dateInput").value;

  const beginTijd = `${date}T${selectedTime}:00`;
  
  // Get service duration to calculate end time
  const serviceDuration = await getServiceDuration(dienstId);
  const beginDateTime = new Date(beginTijd);
  const eindDateTime = new Date(beginDateTime.getTime() + serviceDuration * 60000);
  const eindTijd = eindDateTime.toISOString();

  try{
    // Try to insert with new columns first
    let insertData = {
      klantnaam: naam,
      email: email,
      telefoon: telefoon,
      barber_id: barberId,
      dienst_id: dienstId,
      datumtijd: beginTijd
    };
    
    // Use old method - only insert basic data without new columns
    console.log('Using old method - inserting basic data only');
    const { data, error } = await sb.from("boekingen").insert([insertData]);
    if(error) {
      console.error('Database error:', error);
      throw error;
    }
    console.log("Boeking opgeslagen:", data);

    // Show confirmation message instead of hiding popup
    showBookingConfirmationMessage();
    
    console.log("Boeking toegevoegd:", data);
    
    // refresh availability after successful booking
    await refreshAvailabilityNEW();
  }catch(e){
    console.error("Fout bij boeken:", e);
    alert("Er is iets misgegaan, check console");
  }
}

// Show confirmation message in popup
function showBookingConfirmationMessage() {
  // Get the data for confirmation message
  const date = document.getElementById("dateInput").value;
  const serviceName = document.querySelector('.service-item.selected')?.querySelector('.service-title')?.textContent || 'Onbekend';
  
  // Format date for display
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  
  // Populate confirmation message
  document.getElementById('confirmationDate').textContent = formattedDate;
  document.getElementById('confirmationTime').textContent = selectedTime;
  document.getElementById('confirmationService').textContent = serviceName;
  
  // Hide booking summary and show confirmation
  document.getElementById('bookingSummary').style.display = 'none';
  document.getElementById('bookingConfirmation').style.display = 'block';
  
  // Update footer buttons
  const footer = document.querySelector('.popup-footer');
  footer.innerHTML = `
    <button id="closePopupAfterConfirm" class="btn-confirm">Sluiten</button>
  `;
  
  // Add event listener to close button
  document.getElementById('closePopupAfterConfirm').addEventListener('click', resetFormAndClosePopup);
}

// Reset form and close popup
function resetFormAndClosePopup() {
  // Hide popup
  hideBookingConfirmation();
  
  // Reset form
  document.getElementById("naamInput").value = "";
  document.getElementById("emailInput").value = "";
  document.getElementById("phoneInput").value = "";
  selectedDienstId = null;
  selectedDate = null;
  selectedTime = null;
  selectedBarberId = null;
  
  // Reset UI
  document.querySelectorAll('.service-item').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.date-card').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.time-btn').forEach(el => el.classList.remove('selected'));
  document.getElementById('barberSelect').value = '';
  document.getElementById('dateInput').value = '';
  document.getElementById('timeSlots').innerHTML = '';
  
  // Hide right panel
  const right = document.getElementById('rightPanel');
  if (right) right.classList.add('disabled');
  
  // Reset popup to original state
  document.getElementById('bookingSummary').style.display = 'block';
  document.getElementById('bookingConfirmation').style.display = 'none';
  document.querySelector('.popup-footer').innerHTML = `
    <button id="confirmBooking" class="btn-confirm">Bevestig Afspraak</button>
    <button id="cancelBooking" class="btn-cancel">Annuleren</button>
  `;
  
  // Re-add event listeners
  document.getElementById('confirmBooking').addEventListener('click', confirmBooking);
  document.getElementById('cancelBooking').addEventListener('click', hideBookingConfirmation);
  
  // Redirect to home page after closing popup
  window.location.href = 'index.html';
}

document.addEventListener("DOMContentLoaded", async ()=>{
  // Wacht tot Supabase client beschikbaar is
  await waitForSupabase();
  
  if (!sb) {
    console.error("Supabase client ontbreekt");
    return;
  }
  
  console.log("Supabase client found:", sb);

  // Clear barber selection first
  const barberSelect = document.getElementById("barberSelect");
  if (barberSelect) {
    barberSelect.innerHTML = "";
    barberSelect.value = "";
  }
  
  loadDiensten();
  
  // Small delay to ensure barber dropdown is properly reset
  setTimeout(() => {
    loadBarbers();
  }, 100);
  
  // Clear any existing selections
  const dateInput = document.getElementById("dateInput");
  if (dateInput) {
    dateInput.value = "";
  }
  
  // Clear selected service
  selectedDienstId = null;
  selectedDate = null;
  selectedTime = null;
  selectedBarberId = null;
  
  // Clear UI selections
  document.querySelectorAll('.service-item').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.date-card').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.time-btn').forEach(el => el.classList.remove('selected'));
  
  // Render date cards (will show message if no barber selected)
  renderDateCards();
  
  // Test: call refreshAvailabilityNEW on page load
  console.log('Page loaded, calling refreshAvailabilityNEW...');
  setTimeout(async () => {
    await refreshAvailabilityNEW();
  }, 200);
  
  // Initialize theme
  initializeTheme();
  
  // Load loyalty settings
  await loadLoyaltySettings();
  
  // Hide loyalty elements if system is disabled
  if (!loyaltySettings.enabled) {
    hideLoyaltyElements();
  }
  
  // Add email input listener for loyalty status (only if loyalty system is enabled)
  document.getElementById('emailInput')?.addEventListener('input', async (e) => {
    const email = e.target.value.trim();
    if (email && selectedDienstId && loyaltySettings.enabled) {
      const loyaltyInfo = await checkLoyaltyStatus(email);
      if (loyaltyInfo.points > 0) {
        showLoyaltyStatus(loyaltyInfo);
      }
    }
  });
  
  // Test: try to fetch some data directly
  console.log('Testing direct database query...');
  sb.from('boekingen').select('*').limit(5).then(({data, error}) => {
    console.log('Direct query result:', {data, error});
  });

  // Date: today min
  if (dateInput) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth()+1).padStart(2,'0');
    const d = String(today.getDate()).padStart(2,'0');
    dateInput.min = `${y}-${m}-${d}`;
  }

  // Build horizontal date picker with pagination
  const datePicker = document.getElementById("datePicker");
  const datePrev = document.getElementById("datePrev");
  const dateNext = document.getElementById("dateNext");

  async function renderDateCards() {
    const datePicker = document.getElementById("datePicker");
    const dateInput = document.getElementById("dateInput");
    if (!(datePicker && dateInput)) return;
    
    // Get selected barber
    const barberVal = document.getElementById('barberSelect')?.value;
    
    // If no barber selected, show message instead of date cards
    if (!barberVal || barberVal === 'Laden...' || isNaN(barberVal)) {
      datePicker.innerHTML = '<div class="no-barber-message" style="text-align: center; padding: 20px; color: #666; font-style: italic;">Selecteer eerst een barber om beschikbare dagen te zien</div>';
      return;
    }
    
    datePicker.innerHTML = "";
    const daysToShow = 7;
    const formatterWeekday = new Intl.DateTimeFormat('nl-NL', { weekday: 'short' });
    const formatterMonth = new Intl.DateTimeFormat('nl-NL', { month: 'short' });
    const today = new Date();
    
    let barberAvailability = null;
    barberAvailability = await fetchBarberAvailability(barberVal);
    
    // Check if barber has any availability data
    console.log('Checking barber availability for dates:', { barberVal, barberAvailability });
    if (!barberAvailability || !Array.isArray(barberAvailability) || barberAvailability.length === 0) {
      console.log('No availability data found, showing message for dates');
      datePicker.innerHTML = '<div class="no-availability-message" style="text-align: center; padding: 20px; color: #666; font-style: italic;">Deze barber heeft nog geen werktijden ingesteld. Neem contact op voor beschikbaarheid.</div>';
      return;
    }
    
    console.log('Barber availability data found for dates:', barberAvailability);
    
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date();
      d.setDate(today.getDate() + dateOffset + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const value = `${yyyy}-${mm}-${dd}`;

      const card = document.createElement('div');
      card.className = 'date-card';
      card.dataset.value = value;
      
      // Check if barber works on this day
      const dayOfWeek = d.getDay();
      const isWorking = barberAvailability ? isBarberWorkingOnDay(barberAvailability, dayOfWeek) : true;
      
      if (!isWorking) {
        card.classList.add('unavailable');
        card.style.opacity = '0.4';
        card.style.cursor = 'not-allowed';
        card.style.backgroundColor = '#f3f4f6';
        card.style.borderColor = '#d1d5db';
        card.style.color = '#9ca3af';
      }
      
      const isToday = (new Date().toDateString() === d.toDateString());
      card.innerHTML = `
        <div class="weekday">${isToday ? 'Vandaag' : formatterWeekday.format(d)}</div>
        <div class="day">${dd}</div>
        <div class="month">${formatterMonth.format(d).toUpperCase()}</div>
        ${!isWorking ? '<div class="unavailable-text">Niet beschikbaar</div>' : ''}
      `;
      
      if (isWorking) {
        card.addEventListener('click', () => {
          console.log('Date card clicked:', value);
          document.querySelectorAll('.date-card').forEach(el=>el.classList.remove('selected'));
          card.classList.add('selected');
          dateInput.value = value;
          console.log('About to call refreshAvailabilityNEW');
          setTimeout(async () => {
            await refreshAvailabilityNEW();
          }, 50);
        });
      } else {
        card.addEventListener('click', (e) => {
          e.preventDefault();
          alert('Deze barber werkt niet op deze dag');
        });
      }
      
      datePicker.appendChild(card);

      // If current input date falls within page, keep highlighted
      if (dateInput.value === value) {
        card.classList.add('selected');
      }
    }

    // If no date selected yet, pick the first card as default
    if (!dateInput.value) {
      const firstCard = datePicker.querySelector('.date-card');
      if (firstCard) {
        firstCard.classList.add('selected');
        dateInput.value = firstCard.dataset.value;
      }
    }
  }

  if (datePicker && dateInput) {
    renderDateCards();
  }

  if (datePrev) {
    datePrev.addEventListener('click', async () => {
      // Do not navigate to past dates before today
      dateOffset = Math.max(0, dateOffset - 7);
      await renderDateCards();
      // Small delay to ensure date cards are rendered
      setTimeout(async () => {
        selectFirstDayOfWeek();
        await refreshAvailabilityNEW();
      }, 100);
    });
  }
  if (dateNext) {
    dateNext.addEventListener('click', async () => {
      dateOffset += 7;
      await renderDateCards();
      // Small delay to ensure date cards are rendered
      setTimeout(async () => {
        selectFirstDayOfWeek();
        await refreshAvailabilityNEW();
      }, 100);
    });
  }

  const btn = document.getElementById("bookBtn");
  if(btn) btn.addEventListener("click",boekDienst);

  const loginBtn = document.getElementById("loginBtn");
  if(loginBtn){
    loginBtn.addEventListener("click", () => {
      window.location.href = "admin.html"; 
    });
  }

  // Step navigation handlers
  function showStep(step){
    currentStep = step;
    const s1 = document.getElementById("step1");
    const s2 = document.getElementById("step2");
    const s3 = document.getElementById("step3");
    if (s1) s1.style.display = step === 1 ? "block" : "none";
    if (s2) s2.style.display = step === 2 ? "block" : "none";
    if (s3) s3.style.display = step === 3 ? "block" : "none";
    
    // Disable service selection in step 3
    const serviceItems = document.querySelectorAll('.service-item');
    serviceItems.forEach(item => {
      if (step === 3) {
        item.style.pointerEvents = 'none';
        item.style.opacity = '0.6';
        item.style.cursor = 'not-allowed';
      } else {
        item.style.pointerEvents = 'auto';
        item.style.opacity = '1';
        item.style.cursor = 'pointer';
      }
    });
    
    // Scroll into view for better UX
    const container = document.querySelector('.container');
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // No explicit step1 now; right panel unlocks when service selected

  const toStep3 = document.getElementById("toStep3");
  if (toStep3) {
    toStep3.addEventListener("click", ()=>{
      const dateVal = document.getElementById("dateInput")?.value;
      const barberVal = document.getElementById("barberSelect")?.value;
      if (!dateVal) {
        alert("Kies eerst een datum.");
        return;
      }
      if (!selectedTime) {
        alert("Kies eerst een tijd.");
        return;
      }
      if (!barberVal) {
        alert("Kies een barber.");
        return;
      }
      selectedDate = dateVal;
      selectedBarberId = barberVal;
      showStep(3);
    });
  }

  const backTo2 = document.getElementById("backTo2");
  if (backTo2) {
    backTo2.addEventListener("click", ()=>{
      showStep(2);
    });
  }

  // When barber changes, refresh availability and date cards
  if (barberSelect) {
    barberSelect.addEventListener('change', async () => {
      console.log('Barber select changed:', barberSelect.value);
      await renderDateCards(); // Refresh date cards with new barber availability
      await refreshAvailabilityNEW();
    });
  }
  
  // Add event listener for direct date input changes
  if (dateInput) {
    dateInput.addEventListener('change', async () => {
      await refreshAvailabilityNEW();
    });
  }
  
  // Initial call to refresh availability when page loads
  console.log('Page loaded, calling refreshAvailability initially');
  setTimeout(async () => {
    await refreshAvailabilityNEW();
  }, 100);
  
  // Popup event listeners
  const closePopup = document.getElementById('closePopup');
  const cancelBooking = document.getElementById('cancelBooking');
  const confirmBookingBtn = document.getElementById('confirmBooking');

  if (closePopup) {
    closePopup.addEventListener('click', hideBookingConfirmation);
  }

  if (cancelBooking) {
    cancelBooking.addEventListener('click', hideBookingConfirmation);
  }

  if (confirmBookingBtn) {
    confirmBookingBtn.addEventListener('click', confirmBooking);
  }

  // Close popup when clicking outside
  const popup = document.getElementById('bookingConfirmationPopup');
  if (popup) {
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        hideBookingConfirmation();
      }
    });
  }
});

// Function to select the first day of the current week
function selectFirstDayOfWeek() {
  const dateInput = document.getElementById("dateInput");
  if (!dateInput) return;
  
  const today = new Date();
  const firstDayOfWeek = new Date(today);
  firstDayOfWeek.setDate(today.getDate() + dateOffset);
  
  const yyyy = firstDayOfWeek.getFullYear();
  const mm = String(firstDayOfWeek.getMonth() + 1).padStart(2, '0');
  const dd = String(firstDayOfWeek.getDate()).padStart(2, '0');
  const value = `${yyyy}-${mm}-${dd}`;
  
  dateInput.value = value;
  
  // Clear previous date card selections
  document.querySelectorAll('.date-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  // Find and select the first day card
  const firstDayCard = document.querySelector(`.date-card[data-value="${value}"]`);
  console.log('🔥 Looking for date card with value:', value);
  console.log('🔥 Found date card:', firstDayCard);
  
  if (firstDayCard) {
    firstDayCard.classList.add('selected');
    selectedDate = value;
    console.log('🔥 Selected first day card:', value);
  } else {
    console.log('🔥 Date card not found, available cards:', 
      Array.from(document.querySelectorAll('.date-card')).map(card => card.dataset.value)
    );
  }
  
  // Trigger the date selection
  const event = new Event('change', { bubbles: true });
  dateInput.dispatchEvent(event);
  
  console.log('🔥 Selected first day of week:', value);
}

// ====================== Loyalty System ======================
let loyaltySettings = {
  enabled: true,
  pointsPerAppointment: 25,
  pointsForDiscount: 100,
  discountPercentage: 50
};

async function loadLoyaltySettings() {
  try {
    const { data, error } = await sb
      .from('settings')
      .select('key, value')
      .in('key', ['loyalty_enabled', 'points_per_appointment', 'points_for_discount', 'discount_percentage']);
    
    if (error) throw error;
    
    // Set default values
    loyaltySettings = {
      enabled: true,
      pointsPerAppointment: 25,
      pointsForDiscount: 100,
      discountPercentage: 50
    };
    
    // Update with database values
    data.forEach(setting => {
      switch(setting.key) {
        case 'loyalty_enabled':
          loyaltySettings.enabled = setting.value === 'true';
          break;
        case 'points_per_appointment':
          loyaltySettings.pointsPerAppointment = parseInt(setting.value) || 25;
          break;
        case 'points_for_discount':
          loyaltySettings.pointsForDiscount = parseInt(setting.value) || 100;
          break;
        case 'discount_percentage':
          loyaltySettings.discountPercentage = parseInt(setting.value) || 50;
          break;
      }
    });
    
    console.log('Loyalty settings loaded:', loyaltySettings);
    
  } catch (error) {
    console.error('Error loading loyalty settings:', error);
    // Use default values if database fails
  }
}

async function checkLoyaltyStatus(email) {
  // Check if loyalty system is enabled
  if (!loyaltySettings.enabled) {
    return { points: 0, hasDiscount: false, discountPercentage: 0 };
  }
  
  try {
    const { data, error } = await sb
      .from('customers')
      .select('loyaliteitspunten')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    
    const points = data?.loyaliteitspunten || 0;
    return {
      points: points,
      hasDiscount: points >= loyaltySettings.pointsForDiscount,
      discountPercentage: points >= loyaltySettings.pointsForDiscount ? loyaltySettings.discountPercentage : 0
    };
  } catch (error) {
    console.error('Error checking loyalty status:', error);
    return { points: 0, hasDiscount: false, discountPercentage: 0 };
  }
}

async function applyLoyaltyDiscount(originalPrice, email) {
  const loyalty = await checkLoyaltyStatus(email);
  
  if (loyalty.hasDiscount) {
    const discountAmount = originalPrice * (loyalty.discountPercentage / 100);
    const finalPrice = originalPrice - discountAmount;
    
    return {
      originalPrice: originalPrice,
      discountAmount: discountAmount,
      finalPrice: finalPrice,
      discountPercentage: loyalty.discountPercentage,
      points: loyalty.points
    };
  }
  
  return {
    originalPrice: originalPrice,
    discountAmount: 0,
    finalPrice: originalPrice,
    discountPercentage: 0,
    points: loyalty.points
  };
}

function hideLoyaltyElements() {
  // Hide loyalty discount banner
  const discountBanner = document.getElementById('loyaltyDiscountBanner');
  if (discountBanner) {
    discountBanner.style.display = 'none';
  }
  
  // Remove any existing loyalty status
  const existingStatus = document.getElementById('loyaltyStatus');
  if (existingStatus) {
    existingStatus.remove();
  }
  
  console.log('Loyalty elements hidden - system disabled');
}

function showLoyaltyStatus(loyaltyInfo) {
  // Only show if loyalty system is enabled
  if (!loyaltySettings.enabled) {
    return;
  }
  
  // Remove existing loyalty status
  const existingStatus = document.getElementById('loyaltyStatus');
  if (existingStatus) {
    existingStatus.remove();
  }
  
  // Create loyalty status element
  const loyaltyDiv = document.createElement('div');
  loyaltyDiv.id = 'loyaltyStatus';
  loyaltyDiv.style.cssText = `
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
    padding: 15px;
    border-radius: 8px;
    margin: 15px 0;
    text-align: center;
    box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
  `;
  
  if (loyaltyInfo.hasDiscount) {
    loyaltyDiv.innerHTML = `
      <h3 style="margin: 0 0 10px 0; font-size: 18px;">🎉 Loyaliteitskorting Actief!</h3>
      <p style="margin: 0; font-size: 14px;">Je hebt ${loyaltyInfo.points} punten en krijgt ${loyaltySettings.discountPercentage}% korting op je volgende afspraak!</p>
    `;
  } else {
    const pointsNeeded = loyaltySettings.pointsForDiscount - loyaltyInfo.points;
    loyaltyDiv.innerHTML = `
      <h3 style="margin: 0 0 10px 0; font-size: 16px;">⭐ Loyaliteitspunten: ${loyaltyInfo.points}</h3>
      <p style="margin: 0; font-size: 14px;">Nog ${pointsNeeded} punten tot ${loyaltySettings.discountPercentage}% korting!</p>
    `;
  }
  
  // Insert after service selection
  const serviceSection = document.querySelector('.booking-section:nth-child(2)');
  if (serviceSection) {
    serviceSection.appendChild(loyaltyDiv);
  }
}

// ====================== Theme Management ======================
async function loadThemeSettings() {
  try {
    const { data, error } = await sb
      .from('settings')
      .select('key, value')
      .in('key', ['primary_color', 'secondary_color', 'background_color', 'text_color', 'site_title', 'dark_mode_enabled']);
    
    if (error) {
      console.error('Error loading theme settings:', error);
      return;
    }
    
    if (data && data.length > 0) {
      const settings = {};
      data.forEach(setting => {
        settings[setting.key] = setting.value;
      });
      
      // Apply theme settings
      applyFrontendThemeSettings(settings);
    }
  } catch (error) {
    console.error('Error loading theme settings:', error);
  }
}

function applyFrontendThemeSettings(settings) {
  const root = document.documentElement;
  
  if (settings.primary_color) {
    root.style.setProperty('--accent', settings.primary_color);
  }
  if (settings.secondary_color) {
    root.style.setProperty('--accent-hover', settings.secondary_color);
  }
  if (settings.background_color) {
    root.style.setProperty('--surface', settings.background_color);
  }
  if (settings.text_color) {
    root.style.setProperty('--text', settings.text_color);
  }
  
  // Update site title
  const siteTitleElement = document.querySelector('h1 a');
  if (siteTitleElement && settings.site_title) {
    siteTitleElement.textContent = settings.site_title;
  }
  
  // Update page title
  if (settings.site_title) {
    document.title = settings.site_title;
  }
  
  // Hide/show theme toggle based on dark mode setting
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle && settings.dark_mode_enabled === 'false') {
    themeToggle.style.display = 'none';
  } else if (themeToggle) {
    themeToggle.style.display = 'inline-block';
  }
  
  console.log('Frontend theme settings applied:', settings);
}

function initializeTheme() {
  // Check for saved theme preference or default to light mode
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
  
  // Add event listener to theme toggle button
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Load theme settings from database
  loadThemeSettings();
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  // Update theme toggle button icon
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  
  console.log(`Theme set to: ${theme}`);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}
