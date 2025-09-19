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
let selectedTime = null;

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
  if (!sel) return;
  
  // Force reset the dropdown first
  sel.innerHTML = "";
  sel.value = "";
  
  sel.innerHTML = "<option>Laden...</option>";
  try {
    const { data, error } = await sb.from("barbers").select("*").order("id");
    if (error) throw error;
    sel.innerHTML = "";
    
    // Add placeholder option
    const placeholderOpt = document.createElement("option");
    placeholderOpt.value = "";
    placeholderOpt.textContent = "Maak een keuze uit onze barbers";
    placeholderOpt.disabled = true;
    placeholderOpt.selected = true;
    sel.appendChild(placeholderOpt);
    
    // Force the placeholder to be selected
    sel.selectedIndex = 0;
    
    if (!data || data.length === 0) {
      sel.innerHTML = "<option>Geen barbers gevonden</option>";
      return;
    }
    data.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.naam;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
    sel.innerHTML = "<option>Fout bij laden</option>";
  }
}

// Tijdslots (customizable start/end times per 15 min)
function generateTimeSlots(startTime = '09:00', endTime = '18:00') {
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

  let slotCount = 0;
  for(let h=startHour; h<actualEndHour; h++){
    for(let m=0; m<60; m+=interval){
      // Skip if before start time or at/after end time
      if (h < startHour || (h === startHour && m < startMin) || h > actualEndHour || (h === actualEndHour && m >= actualEndMin)) {
        continue;
      }
      
      const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerText = timeStr;
      btn.className = "time-btn";
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
  
  console.log(`Generated ${slotCount} time slots`);
  console.log(`Container now has ${container.children.length} children`);
}

function selectTimeSlot(time){
  // Check if the clicked button is disabled
  const clickedBtn = Array.from(document.querySelectorAll(".time-btn")).find(btn => btn.innerText === time);
  if (clickedBtn && (clickedBtn.classList.contains('disabled') || clickedBtn.hasAttribute('disabled'))) {
    console.log('Cannot select disabled time slot:', time);
    return; // Don't select disabled time slots
  }
  
  selectedTime = time;
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

    const { data, error } = await sb
      .from('boekingen')
      .select('datumtijd')
      .eq('barber_id', barberId)
      .gte('datumtijd', start)
      .lt('datumtijd', end);
    if (error) throw error;
    
    console.log('fetchBookedTimes: Raw data from DB', data);
    
    const times = new Set();
    (data || []).forEach(row => {
      const dt = row.datumtijd;
      if (typeof dt === 'string') {
        const t = dt.split('T')[1]?.slice(0,5);
        if (t) times.add(t);
      }
    });
    
    console.log('fetchBookedTimes: Processed times', Array.from(times));
    return times;
  } catch (e) {
    console.error('Fout bij laden van geboekte tijden:', e);
    return new Set();
  }
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
  generateTimeSlots(startTime, endTime);
  
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

function selectDienst(id){
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
}

// Show booking confirmation popup
function showBookingConfirmation() {
  const popup = document.getElementById('bookingConfirmationPopup');
  if (!popup) return;
  
  // Get all the data
  const naam = document.getElementById("naamInput").value.trim();
  const email = document.getElementById("emailInput")?.value.trim();
  const telefoon = document.getElementById("phoneInput")?.value.trim();
  
  // Get service info
  const selectedService = document.querySelector('.service-item.selected');
  const serviceName = selectedService ? selectedService.querySelector('.service-title')?.textContent : 'Onbekend';
  const servicePrice = selectedService ? selectedService.querySelector('.service-price')?.textContent : 'Onbekend';
  
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
  document.getElementById('popupPrice').textContent = servicePrice;
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

  const datetime = `${date}T${selectedTime}:00`;

  try{
    const { data, error } = await sb.from("boekingen").insert([{
      klantnaam: naam,
      email: email,
      telefoon: telefoon,
      barber_id: barberId,
      dienst_id: dienstId,
      datumtijd: datetime
    }]);
    if(error) throw error;

    // Show confirmation message instead of hiding popup
    showBookingConfirmationMessage();
    
    console.log("Boeking toegevoegd:", data);
    
    // refresh availability after successful booking
    refreshAvailabilityNEW();
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
  refreshAvailabilityNEW();
  
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
  let dateOffset = 0; // days from today for first card

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
          refreshAvailabilityNEW();
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
      refreshAvailabilityNEW();
    });
  }
  if (dateNext) {
    dateNext.addEventListener('click', async () => {
      dateOffset += 7;
      await renderDateCards();
      refreshAvailabilityNEW();
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
      refreshAvailabilityNEW();
    });
  }
  
  // Add event listener for direct date input changes
  if (dateInput) {
    dateInput.addEventListener('change', refreshAvailabilityNEW);
  }
  
  // Initial call to refresh availability when page loads
  console.log('Page loaded, calling refreshAvailability initially');
  refreshAvailabilityNEW();
  
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
