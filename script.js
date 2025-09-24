// script.js

// Email Configuration - EmailJS
const EMAIL_CONFIG = {
  serviceId: 'service_5nu9m6g', // Jouw EmailJS service ID
  templateId: 'template_zjllz0d', // Jouw EmailJS template ID
  publicKey: 'A3JIgDeJroSYPlB69', // Jouw EmailJS public key
  salonName: 'Barbershop Delfzijl',
  salonPhone: '06-12345678',
  salonAddress: 'Jouw Adres 123, Plaats'
};

// Initialize EmailJS when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAIL_CONFIG.publicKey);
    debugLog('EmailJS initialized successfully');
  } else {
    console.warn('EmailJS not loaded');
  }
});
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
let selectedKapperId = null;
let dateOffset = 0; // days from today for first card
let selectedTime = null;

// Waitlist state
let waitlistEnabled = false;
let currentWaitlistSlot = null;

// Waitlist functions
async function addToWaitlist(klantnaam, email, telefoon, kapperId, dienstId, datumtijd, tijd) {
  if (!sb) {
    console.error('Supabase client not available');
    return false;
  }
  
  debugLog('🔍 Adding to waitlist with data:', {
    klantnaam, email, telefoon, kapperId, dienstId, datumtijd, tijd
  });
  
  try {
    const { data, error } = await sb
      .from('wachtlijst')
      .insert([{
        klantnaam: klantnaam,
        email: email,
        telefoon: telefoon,
        kapper_id: kapperId,
        dienst_id: dienstId,
        datumtijd: datumtijd,
        tijd: tijd,
        aangemeld_op: new Date().toISOString(),
        status: 'wachtend'
      }])
      .select(); // Add .select() to get the inserted data back
    
    if (error) {
      console.error('❌ Database error bij toevoegen aan wachtlijst:', error);
      debugLog('❌ Error details:', error);
      throw error;
    }
    
    debugLog('✅ Klant toegevoegd aan wachtlijst:', data);
    
    // Verify the entry was actually created
    if (data && data.length > 0) {
      debugLog('✅ Wachtlijst entry verified with ID:', data[0].id);
    } else {
      debugLog('⚠️ Wachtlijst entry created but no data returned (possible RLS issue)');
      
      // Try to verify by querying the table
      try {
        const { data: verifyData, error: verifyError } = await sb
          .from('wachtlijst')
          .select('*')
          .eq('email', email)
          .eq('datumtijd', datumtijd)
          .order('aangemeld_op', { ascending: false })
          .limit(1);
        
        if (verifyError) {
          debugLog('❌ Error verifying wachtlijst entry:', verifyError);
        } else {
          debugLog('✅ Wachtlijst entry verified by query:', verifyData);
        }
      } catch (verifyErr) {
        debugLog('❌ Error during verification:', verifyErr);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Fout bij toevoegen aan wachtlijst:', error);
    debugLog('❌ Full error details:', error);
    return false;
  }
}

async function checkWaitlistForSlot(kapperId, dienstId, datumtijd, tijd) {
  if (!sb) return null;
  
  try {
    const { data, error } = await sb
      .from('wachtlijst')
      .select('*')
      .eq('kapper_id', kapperId)
      .eq('dienst_id', dienstId)
      .eq('datumtijd', datumtijd)
      .eq('tijd', tijd)
      .eq('status', 'wachtend')
      .order('aangemeld_op', { ascending: true })
      .limit(1);
    
    if (error) throw error;
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Fout bij controleren wachtlijst:', error);
    return null;
  }
}

async function processWaitlistBooking(waitlistEntry) {
  if (!sb) return false;
  
  try {
    // Create the actual booking
    const { data: bookingData, error: bookingError } = await sb
      .from('boekingen')
      .insert([{
        klantnaam: waitlistEntry.klantnaam,
        email: waitlistEntry.email,
        telefoon: waitlistEntry.telefoon,
        kapper_id: waitlistEntry.kapper_id,
        dienst_id: waitlistEntry.dienst_id,
        datumtijd: waitlistEntry.datumtijd
      }]);
    
    if (bookingError) throw bookingError;
    
    // Update waitlist entry status
    const { error: updateError } = await sb
      .from('wachtlijst')
      .update({ status: 'geboekt', geboekt_op: new Date().toISOString() })
      .eq('id', waitlistEntry.id);
    
    if (updateError) throw updateError;
    
    // Send notification email
    await sendWaitlistNotificationEmail(waitlistEntry);
    
    debugLog('Wachtlijst boeking verwerkt:', bookingData);
    return true;
  } catch (error) {
    console.error('Fout bij verwerken wachtlijst boeking:', error);
    return false;
  }
}

// Check for waitlist entries when a booking is cancelled
async function checkWaitlistOnBookingCancellation(kapperId, datumtijd, tijd) {
  if (!sb) {
    console.error('Supabase client not available for waitlist check');
    return;
  }
  
  debugLog('🔍 Checking waitlist for cancelled appointment:', { kapperId, datumtijd, tijd });
  
  try {
    // Find waitlist entry for this exact slot
    const waitlistEntry = await checkWaitlistForSlot(kapperId, null, datumtijd, tijd);
    
    debugLog('🔍 Waitlist check result:', waitlistEntry);
    
    if (waitlistEntry) {
      debugLog('✅ Wachtlijst entry gevonden voor vrijgekomen slot:', waitlistEntry);
      
      // Process the waitlist booking
      const success = await processWaitlistBooking(waitlistEntry);
      
      if (success) {
        debugLog('✅ Wachtlijst boeking succesvol verwerkt');
      } else {
        console.error('❌ Fout bij verwerken wachtlijst boeking');
      }
    } else {
      debugLog('ℹ️ Geen wachtlijst entries gevonden voor deze tijd');
    }
  } catch (error) {
    console.error('❌ Fout bij controleren wachtlijst:', error);
    debugLog('❌ Waitlist check error details:', error);
  }
}

// Make function globally available
window.checkWaitlistOnBookingCancellation = checkWaitlistOnBookingCancellation;

async function sendWaitlistNotificationEmail(waitlistEntry) {
  try {
    const serviceName = await getServiceName(waitlistEntry.dienst_id);
    const kapperName = await getKapperName(waitlistEntry.kapper_id);
    
    const templateParams = {
      to_name: waitlistEntry.klantnaam,
      to_email: waitlistEntry.email,
      service_name: serviceName,
      kapper_name: kapperName,
      appointment_date: waitlistEntry.datumtijd.split('T')[0],
      appointment_time: waitlistEntry.tijd,
      salon_name: EMAIL_CONFIG.salonName,
      salon_phone: EMAIL_CONFIG.salonPhone
    };
    
    await emailjs.send(
      EMAIL_CONFIG.serviceId,
      'template_waitlist', // Nieuwe template voor wachtlijst
      templateParams
    );
    
    debugLog('Wachtlijst notificatie email verzonden');
  } catch (error) {
    console.error('Fout bij verzenden wachtlijst notificatie:', error);
  }
}

async function renderOccupiedSlotsWithWaitlist(container, selectedDate, dienstId) {
  try {
    debugLog('🔍 Rendering occupied slots with waitlist for:', { selectedDate, dienstId });
    
    // Get all kappers and their working hours for this date
    const { data: kappers, error: kappersError } = await sb
      .from('kappers')
      .select('id, naam, kapper_availability(start_time, end_time, day_of_week)');
    
    if (kappersError) throw kappersError;
    debugLog('📋 Found kappers:', kappers);
    
    const dayOfWeek = new Date(selectedDate).getDay();
    const occupiedSlots = [];
    
    // Get all existing bookings for this date
    const { data: bookings, error: bookingsError } = await sb
      .from('boekingen')
      .select('kapper_id, datumtijd, dienst_id')
      .gte('datumtijd', `${selectedDate}T00:00:00`)
      .lte('datumtijd', `${selectedDate}T23:59:59`);
    
    if (bookingsError) throw bookingsError;
    debugLog('📅 Found bookings:', bookings);
    
    // Generate all possible time slots for each kapper
    for (const kapper of kappers) {
      const availability = kapper.kapper_availability.find(avail => 
        avail.day_of_week === dayOfWeek || avail.day_of_week === getDayName(dayOfWeek)
      );
      
      if (!availability) continue;
      
      const startTime = availability.start_time;
      const endTime = availability.end_time === '00:00:00' ? '24:00:00' : availability.end_time;
      
      // Generate 15-minute slots
      const slots = generateTimeSlotsForKapper(startTime, endTime, selectedDate, kapper.id, [], 30);
      
      // Check which slots are occupied
      for (const slot of slots) {
        const slotDateTime = `${selectedDate}T${slot.time}:00`;
        const isOccupied = bookings.some(booking => {
          const bookingTime = booking.datumtijd.slice(11, 16);
          return booking.kapper_id === kapper.id && bookingTime === slot.time;
        });
        
        if (isOccupied) {
          occupiedSlots.push({
            time: slot.time,
            kapperId: kapper.id,
            kapperName: kapper.naam,
            isOccupied: true
          });
        }
      }
    }
    
    debugLog('🎯 Found occupied slots:', occupiedSlots);
    
    if (occupiedSlots.length === 0) {
      debugLog('❌ No occupied slots found, showing default message');
      container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; font-style: italic;">Geen beschikbare tijden gevonden voor deze datum</p>';
      return;
    }
    
    // Sort by time
    occupiedSlots.sort((a, b) => a.time.localeCompare(b.time));
    
    // Render occupied slots with waitlist option
    occupiedSlots.forEach(slot => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = `
        <div class="time-slot-content">
          <div class="time-slot-time">${slot.time}</div>
          <div class="time-slot-status">Bezet</div>
          <div class="time-slot-waitlist">Wachtlijst</div>
        </div>
      `;
      btn.className = "time-btn occupied-time-btn waitlist-btn";
      btn.dataset.time = slot.time;
      btn.dataset.kapperId = slot.kapperId;
      btn.dataset.kapperName = slot.kapperName;
      btn.dataset.isOccupied = "true";
      
      // Add click handler for waitlist
      btn.addEventListener('click', () => {
        showWaitlistModal(slot);
      });
      
      container.appendChild(btn);
    });
    
    // Add message about waitlist
    const waitlistInfo = document.createElement("div");
    waitlistInfo.className = "waitlist-info";
    waitlistInfo.innerHTML = `
      <p style="text-align: center; color: #666; padding: 10px; font-size: 14px;">
        💡 Geen vrije tijden? Meld je aan voor de wachtlijst en krijg automatisch een mailtje als er een plek vrijkomt!
      </p>
    `;
    container.appendChild(waitlistInfo);
    
  } catch (error) {
    console.error('Fout bij laden bezette tijdslots:', error);
    container.innerHTML = '<p style="text-align: center; color: #f28b82; padding: 20px;">Fout bij laden van tijdslots</p>';
  }
}

async function renderMixedTimeSlots(container, selectedDate, dienstId, availableSlots) {
  try {
    debugLog('🔄 Rendering mixed time slots (available + occupied with waitlist)');
    
    // Get all kappers and their working hours for this date
    const { data: kappers, error: kappersError } = await sb
      .from('kappers')
      .select('id, naam, kapper_availability(start_time, end_time, day_of_week)');
    
    if (kappersError) throw kappersError;
    
    const dayOfWeek = new Date(selectedDate).getDay();
    const allSlots = [];
    
    // Get all existing bookings for this date
    const { data: bookings, error: bookingsError } = await sb
      .from('boekingen')
      .select('kapper_id, datumtijd, dienst_id')
      .gte('datumtijd', `${selectedDate}T00:00:00`)
      .lte('datumtijd', `${selectedDate}T23:59:59`);
    
    if (bookingsError) throw bookingsError;
    
    // Generate all possible time slots for each kapper
    for (const kapper of kappers) {
      const availability = kapper.kapper_availability.find(avail => 
        avail.day_of_week === dayOfWeek || avail.day_of_week === getDayName(dayOfWeek)
      );
      
      if (!availability) continue;
      
      const startTime = availability.start_time;
      const endTime = availability.end_time === '00:00:00' ? '24:00:00' : availability.end_time;
      
      // Generate 15-minute slots
      const slots = generateTimeSlotsForKapper(startTime, endTime, selectedDate, kapper.id, [], 30);
      
      // Check which slots are occupied
      for (const slot of slots) {
        const isOccupied = bookings.some(booking => {
          const bookingTime = booking.datumtijd.slice(11, 16);
          return booking.kapper_id === kapper.id && bookingTime === slot.time;
        });
        
        const isAvailable = availableSlots.some(availSlot => 
          availSlot.time === slot.time && availSlot.kapperId === kapper.id
        );
        
        allSlots.push({
          time: slot.time,
          kapperId: kapper.id,
          kapperName: kapper.naam,
          isOccupied: isOccupied,
          isAvailable: isAvailable
        });
      }
    }
    
    // Sort by time
    allSlots.sort((a, b) => a.time.localeCompare(b.time));
    
    // Clear container and render all slots
    container.innerHTML = "";
    
    allSlots.forEach(slot => {
      const btn = document.createElement("button");
      btn.type = "button";
      
      if (slot.isAvailable) {
        // Available slot - normal styling
        btn.innerHTML = `
          <div class="time-slot-content">
            <div class="time-slot-time">${slot.time}</div>
          </div>
        `;
        btn.className = "time-btn auto-time-btn";
        btn.dataset.time = slot.time;
        btn.dataset.kapperId = slot.kapperId;
        btn.dataset.kapperName = slot.kapperName;
        
        // Add click handler for normal booking
        btn.addEventListener('click', () => {
          // Remove selection from all time buttons
          document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
          
          // Select this button
          btn.classList.add('selected');
          
          // Set global selectedTime variable
          selectedTime = slot.time;
          
          // Update hidden inputs
          document.getElementById('selectedTime').value = slot.time;
          document.getElementById('selectedKapperId').value = slot.kapperId;
          document.getElementById('selectedKapperName').value = slot.kapperName;
          
          debugLog('🕐 Normal time slot selected:', slot.time, 'with kapper:', slot.kapperName);
          debugLog('🕐 Global selectedTime set to:', selectedTime);
        });
      } else if (slot.isOccupied) {
        // Occupied slot - waitlist styling
        btn.innerHTML = `
          <div class="time-slot-content">
            <div class="time-slot-time">${slot.time}</div>
            <div class="time-slot-status">Bezet</div>
            <div class="time-slot-waitlist">Wachtlijst</div>
          </div>
        `;
        btn.className = "time-btn occupied-time-btn waitlist-btn";
        btn.dataset.time = slot.time;
        btn.dataset.kapperId = slot.kapperId;
        btn.dataset.kapperName = slot.kapperName;
        btn.dataset.isOccupied = "true";
        
        // Add click handler for waitlist
        btn.addEventListener('click', () => {
          showWaitlistModal(slot);
        });
      } else {
        // Past slot or not available - disabled styling
        btn.innerHTML = `
          <div class="time-slot-content">
            <div class="time-slot-time">${slot.time}</div>
            <div class="time-slot-status">Niet beschikbaar</div>
          </div>
        `;
        btn.className = "time-btn disabled-time-btn";
        btn.disabled = true;
      }
      
      container.appendChild(btn);
    });
    
    // Add waitlist info message
    const waitlistInfo = document.createElement("div");
    waitlistInfo.className = "waitlist-info";
    waitlistInfo.innerHTML = `
      <p style="text-align: center; color: #666; padding: 10px; font-size: 14px;">
        💡 Geen vrije tijden? Meld je aan voor de wachtlijst en krijg automatisch een mailtje als er een plek vrijkomt!
      </p>
    `;
    container.appendChild(waitlistInfo);
    
    debugLog('✅ Mixed time slots rendered successfully');
    
  } catch (error) {
    console.error('Fout bij laden gemengde tijdslots:', error);
    container.innerHTML = '<p style="text-align: center; color: #f28b82; padding: 20px;">Fout bij laden van tijdslots</p>';
  }
}

async function addWaitlistToOccupiedSlots(dateVal, kapperVal) {
  try {
    debugLog('🔧 Adding waitlist functionality to occupied slots...');
    
    // Get all existing bookings for this date and kapper
    const { data: bookings, error: bookingsError } = await sb
      .from('boekingen')
      .select('kapper_id, datumtijd, dienst_id')
      .eq('kapper_id', kapperVal)
      .gte('datumtijd', `${dateVal}T00:00:00`)
      .lte('datumtijd', `${dateVal}T23:59:59`);
    
    if (bookingsError) throw bookingsError;
    
    debugLog('📅 Found bookings for waitlist:', bookings);
    
    // Get kapper info
    const { data: kapper, error: kapperError } = await sb
      .from('kappers')
      .select('id, naam')
      .eq('id', kapperVal)
      .single();
    
    if (kapperError) throw kapperError;
    
    // Get kapper availability to generate all possible slots
    const kapperAvailability = await fetchKapperAvailability(kapperVal);
    const dayOfWeek = new Date(dateVal).getDay();
    const workingHours = getKapperWorkingHoursNEW(kapperAvailability, dayOfWeek);
    
    if (!workingHours) {
      debugLog('❌ No working hours found for waitlist');
      return;
    }
    
    // Generate all possible time slots
    const allSlots = generateTimeSlotsForKapper(
      workingHours.start, 
      workingHours.end, 
      dateVal, 
      kapperVal, 
      [], 
      30
    );
    
    debugLog('🕐 Generated all possible slots:', allSlots);
    
    // Find occupied slots that are not currently shown as available
    const occupiedSlots = [];
    
    for (const slot of allSlots) {
      const isOccupied = bookings.some(booking => {
        const bookingTime = booking.datumtijd.slice(11, 16);
        return bookingTime === slot.time;
      });
      
      if (isOccupied) {
        occupiedSlots.push({
          time: slot.time,
          kapperId: kapperVal,
          kapperName: kapper.naam,
          isOccupied: true
        });
      }
    }
    
    debugLog('🎯 Found occupied slots for waitlist:', occupiedSlots);
    
    // Add waitlist buttons for occupied slots
    const container = document.getElementById("timeSlots");
    if (!container) return;
    
    occupiedSlots.forEach(slot => {
      // Check if this slot is already shown as disabled
      const existingBtn = Array.from(container.children).find(btn => 
        btn.textContent.includes(slot.time) && btn.classList.contains('disabled')
      );
      
      if (existingBtn) {
        // Convert disabled slot to waitlist slot
        debugLog('🔄 Converting disabled slot to waitlist slot:', slot.time);
        
        existingBtn.innerHTML = `
          <div class="time-slot-content">
            <div class="time-slot-time">${slot.time}</div>
            <div class="time-slot-status">Bezet</div>
            <div class="time-slot-waitlist">Wachtlijst</div>
          </div>
        `;
        existingBtn.className = "time-btn occupied-time-btn waitlist-btn";
        existingBtn.dataset.time = slot.time;
        existingBtn.dataset.kapperId = slot.kapperId;
        existingBtn.dataset.kapperName = slot.kapperName;
        existingBtn.dataset.isOccupied = "true";
        existingBtn.disabled = false;
        existingBtn.style.pointerEvents = 'auto';
        existingBtn.style.opacity = '1';
        existingBtn.style.backgroundColor = '';
        existingBtn.style.color = '';
        existingBtn.style.textDecoration = '';
        existingBtn.style.cursor = '';
        existingBtn.style.borderColor = '';
        
        // Remove old click handlers and add waitlist handler
        existingBtn.replaceWith(existingBtn.cloneNode(true));
        const newBtn = container.querySelector(`[data-time="${slot.time}"]`);
        newBtn.addEventListener('click', () => {
          showWaitlistModal(slot);
        });
      }
    });
    
    // Add waitlist info message if there are occupied slots
    if (occupiedSlots.length > 0) {
      const waitlistInfo = document.createElement("div");
      waitlistInfo.className = "waitlist-info";
      waitlistInfo.innerHTML = `
        <p style="text-align: center; color: #666; padding: 10px; font-size: 14px;">
          💡 Geen vrije tijden? Meld je aan voor de wachtlijst en krijg automatisch een mailtje als er een plek vrijkomt!
        </p>
      `;
      container.appendChild(waitlistInfo);
    }
    
    debugLog('✅ Waitlist functionality added successfully');
    
  } catch (error) {
    console.error('Fout bij toevoegen wachtlijst functionaliteit:', error);
  }
}

function showWaitlistModal(slot) {
  // Store current waitlist slot
  currentWaitlistSlot = slot;
  waitlistEnabled = true;
  
  // Set selectedTime for waitlist booking
  selectedTime = slot.time;
  debugLog('🕐 Waitlist modal - setting selectedTime to:', selectedTime);
  
  // Show simple waitlist popup
  const popup = document.getElementById('bookingConfirmationPopup');
  if (popup) {
    // Update popup for waitlist
    const popupHeader = popup.querySelector('.popup-header h3');
    const popupBody = popup.querySelector('.popup-body');
    const confirmButton = popup.querySelector('#confirmBooking');
    
    if (popupHeader) popupHeader.textContent = 'Aanmelden voor Wachtlijst';
    if (confirmButton) confirmButton.textContent = 'Aanmelden voor Wachtlijst';
    
    if (popupBody) {
      popupBody.innerHTML = `
        <div class="waitlist-info">
          <div class="waitlist-icon">⏰</div>
          <h3>Wachtlijst Aanmelding</h3>
          <div class="waitlist-details">
            <p><strong>Dienst:</strong> <span id="waitlistService">Laden...</span></p>
            <p><strong>Kapper:</strong> <span id="waitlistKapper">Laden...</span></p>
            <p><strong>Datum:</strong> <span id="waitlistDate">Laden...</span></p>
            <p><strong>Tijd:</strong> <span id="waitlistTime">Laden...</span></p>
          </div>
          <div class="waitlist-explanation">
            <p>Je wordt automatisch geboekt als deze tijd vrijkomt.</p>
            <p>Je ontvangt een bevestigingsmail.</p>
          </div>
        </div>
        
        <div class="waitlist-form">
          <h4>Jouw gegevens</h4>
          <div class="form-group">
            <label for="waitlistNaam">Naam:</label>
            <input type="text" id="waitlistNaam" placeholder="Vul je naam in" required>
          </div>
          <div class="form-group">
            <label for="waitlistEmail">E-mail:</label>
            <input type="email" id="waitlistEmail" placeholder="jij@example.com" required>
          </div>
          <div class="form-group">
            <label for="waitlistTelefoon">Telefoon:</label>
            <input type="tel" id="waitlistTelefoon" placeholder="0612345678" required>
          </div>
        </div>
      `;
    }
    
    // Update content
    const serviceName = document.querySelector('.service-item.selected .service-title')?.textContent || 'Onbekend';
    const kapperName = slot.kapperName;
    const date = document.getElementById("dateInput").value;
    const time = slot.time;
    
    document.getElementById('waitlistService').textContent = serviceName;
    document.getElementById('waitlistKapper').textContent = kapperName;
    document.getElementById('waitlistDate').textContent = new Date(date).toLocaleDateString('nl-NL');
    document.getElementById('waitlistTime').textContent = time;
    
    // Show popup
    popup.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function showWaitlistPopup() {
  // Create waitlist popup if it doesn't exist
  let popup = document.getElementById('waitlistPopup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'waitlistPopup';
    popup.className = 'popup-overlay';
    popup.innerHTML = `
      <div class="popup-content waitlist-popup">
        <div class="popup-header">
          <h3>⏰ Aanmelden voor Wachtlijst</h3>
          <button class="popup-close" onclick="hideWaitlistPopup()">&times;</button>
        </div>
        <div class="popup-body">
          <div class="waitlist-info">
            <div class="waitlist-icon">⏰</div>
            <h3>Wachtlijst Aanmelding</h3>
            <div class="waitlist-details">
              <p><strong>Dienst:</strong> <span id="waitlistService">Laden...</span></p>
              <p><strong>Kapper:</strong> <span id="waitlistKapper">Laden...</span></p>
              <p><strong>Datum:</strong> <span id="waitlistDate">Laden...</span></p>
              <p><strong>Tijd:</strong> <span id="waitlistTime">Laden...</span></p>
            </div>
            <div class="waitlist-explanation">
              <p>Je wordt automatisch geboekt als deze tijd vrijkomt.</p>
              <p>Je ontvangt een bevestigingsmail.</p>
            </div>
          </div>
          
          <div class="waitlist-form">
            <h4>Jouw gegevens</h4>
            <div class="form-group">
              <label for="waitlistNaam">Naam:</label>
              <input type="text" id="waitlistNaam" placeholder="Vul je naam in" required>
            </div>
            <div class="form-group">
              <label for="waitlistEmail">E-mail:</label>
              <input type="email" id="waitlistEmail" placeholder="jij@example.com" required>
            </div>
            <div class="form-group">
              <label for="waitlistTelefoon">Telefoon:</label>
              <input type="tel" id="waitlistTelefoon" placeholder="0612345678" required>
            </div>
          </div>
        </div>
        <div class="popup-footer">
          <button id="confirmWaitlist" class="btn btn-primary">Aanmelden voor Wachtlijst</button>
          <button onclick="hideWaitlistPopup()" class="btn btn-secondary">Annuleren</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
  }
  
  // Update popup content
  updateWaitlistPopupContent();
  
  // Show popup
  popup.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  // Add event listener for confirm button
  document.getElementById('confirmWaitlist').onclick = confirmWaitlistBooking;
}

function updateWaitlistPopupContent() {
  if (!currentWaitlistSlot) return;
  
  // Get service info
  const dienstId = document.getElementById("dienstSelect").value;
  const serviceName = document.querySelector('.service-item.selected .service-title')?.textContent || 'Onbekend';
  const kapperName = currentWaitlistSlot.kapperName;
  const date = document.getElementById("dateInput").value;
  const time = currentWaitlistSlot.time;
  
  // Update popup content
  document.getElementById('waitlistService').textContent = serviceName;
  document.getElementById('waitlistKapper').textContent = kapperName;
  document.getElementById('waitlistDate').textContent = new Date(date).toLocaleDateString('nl-NL');
  document.getElementById('waitlistTime').textContent = time;
}

function hideWaitlistPopup() {
  const popup = document.getElementById('waitlistPopup');
  if (popup) {
    popup.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}

async function showWaitlistConfirmation(naam, email, telefoon) {
  const popup = document.getElementById('bookingConfirmationPopup');
  if (!popup || !currentWaitlistSlot) return;
  
  // Get service info
  const dienstId = document.getElementById("dienstSelect").value;
  const serviceName = await getServiceName(dienstId);
  const kapperName = currentWaitlistSlot.kapperName;
  const date = document.getElementById("dateInput").value;
  const time = currentWaitlistSlot.time;
  
  // Update popup content for waitlist
  const popupHeader = popup.querySelector('.popup-header h3');
  const popupBody = popup.querySelector('.popup-body');
  const confirmButton = popup.querySelector('#confirmBooking');
  
  if (popupHeader) {
    popupHeader.textContent = 'Aanmelden voor wachtlijst';
  }
  
  if (popupBody) {
    popupBody.innerHTML = `
      <div class="waitlist-confirmation">
        <div class="waitlist-icon">⏰</div>
        <h3>Wachtlijst Aanmelding</h3>
        <div class="waitlist-details">
          <p><strong>Dienst:</strong> ${serviceName}</p>
          <p><strong>Kapper:</strong> ${kapperName}</p>
          <p><strong>Datum:</strong> ${new Date(date).toLocaleDateString('nl-NL')}</p>
          <p><strong>Tijd:</strong> ${time}</p>
        </div>
        <div class="waitlist-info">
          <p>Je wordt automatisch geboekt en krijgt een mailtje zodra deze tijd vrijkomt!</p>
        </div>
      </div>
    `;
  }
  
  if (confirmButton) {
    confirmButton.textContent = 'Aanmelden voor wachtlijst';
    confirmButton.onclick = () => confirmWaitlistBooking();
  }
  
  // Show popup
  popup.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

async function confirmWaitlistBooking() {
  if (!currentWaitlistSlot) {
    debugLog('❌ No currentWaitlistSlot found');
    return;
  }
  
  const naam = document.getElementById("waitlistNaam").value.trim();
  const email = document.getElementById("waitlistEmail").value.trim();
  const telefoon = document.getElementById("waitlistTelefoon").value.trim();
  const dienstId = document.getElementById("dienstSelect").value;
  const date = document.getElementById("dateInput").value;
  
  debugLog('🔍 Waitlist booking data:', {
    naam, email, telefoon, dienstId, date,
    currentWaitlistSlot: currentWaitlistSlot
  });
  
  // Validate inputs
  if (!naam || !email || !telefoon) {
    alert("Vul alle velden in!");
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) {
    alert("Vul een geldig e-mailadres in.");
    return;
  }
  
  debugLog('🔍 Calling addToWaitlist with:', {
    naam, email, telefoon,
    kapperId: currentWaitlistSlot.kapperId,
    dienstId,
    datumtijd: `${date}T${currentWaitlistSlot.time}:00`,
    tijd: currentWaitlistSlot.time
  });
  
  // Add to waitlist
  const success = await addToWaitlist(
    naam,
    email,
    telefoon,
    currentWaitlistSlot.kapperId,
    dienstId,
    `${date}T${currentWaitlistSlot.time}:00`,
    currentWaitlistSlot.time
  );
  
  debugLog('🔍 addToWaitlist result:', success);
  
  if (success) {
    // Show success message in popup
    const popup = document.getElementById('bookingConfirmationPopup');
    if (popup) {
      const popupBody = popup.querySelector('.popup-body');
      if (popupBody) {
        popupBody.innerHTML = `
          <div class="waitlist-success">
            <div class="success-icon">✅</div>
            <h3>Wachtlijst Aanmelding Bevestigd!</h3>
            <p>Je bent aangemeld voor de wachtlijst. Je krijgt automatisch een mailtje zodra er een plek vrijkomt.</p>
          </div>
        `;
      }
      
      // Update footer
      const popupFooter = popup.querySelector('.popup-footer');
      if (popupFooter) {
        popupFooter.innerHTML = `
          <button onclick="location.reload()" class="btn btn-primary">Nieuwe Boeking</button>
          <button onclick="hideBookingConfirmation()" class="btn btn-secondary">Sluiten</button>
        `;
      }
    }
    
    // Reset waitlist state
    waitlistEnabled = false;
    currentWaitlistSlot = null;
  } else {
    alert("Er is een fout opgetreden bij het aanmelden voor de wachtlijst. Probeer het opnieuw.");
  }
}

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
  debugLog("🔥 loadDiensten called");
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
    debugLog("🔥 Fetching diensten from database...");
    const { data, error } = await sb.from("diensten").select("*").order("id");
    debugLog("🔥 Diensten data:", data);
    debugLog("🔥 Diensten error:", error);
    
    if (error) throw error;
    sel.innerHTML = "";
    if (!data || data.length === 0) {
      debugLog("🔥 No diensten found");
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

// Kappers laden
async function loadKappers() {
  const sel = document.getElementById("kapperSelect");
  const kapperList = document.getElementById("kapperList");
  if (!sel || !kapperList) return;
  
  // Reset both dropdown and list
  sel.innerHTML = "";
  sel.value = "";
  kapperList.innerHTML = "<div style='padding: 12px; text-align: center; color: #666;'>Laden...</div>";
  
  try {
    const { data, error } = await sb.from("kappers").select("*").order("id");
    if (error) throw error;
    
    // Clear the list
    kapperList.innerHTML = "";
    
    // Add placeholder option to hidden dropdown for compatibility
    const placeholderOpt = document.createElement("option");
    placeholderOpt.value = "";
    placeholderOpt.textContent = "Maak een keuze uit onze kappers";
    placeholderOpt.disabled = true;
    placeholderOpt.selected = true;
    sel.appendChild(placeholderOpt);
    
    if (!data || data.length === 0) {
      kapperList.innerHTML = "<div style='padding: 12px; text-align: center; color: #666;'>Geen kappers gevonden</div>";
      return;
    }
    
    // Add "Geen keuze" option first
    const geenKeuzeOpt = document.createElement("option");
    geenKeuzeOpt.value = "auto";
    geenKeuzeOpt.textContent = "Geen keuze - Laat ons kiezen";
    sel.appendChild(geenKeuzeOpt);
    
    // Create "Geen keuze" card
    const geenKeuzeCard = document.createElement("div");
    geenKeuzeCard.className = "kapper-item geen-keuze-option";
    geenKeuzeCard.dataset.kapperId = "auto";
    geenKeuzeCard.innerHTML = `
      <div class="kapper-left">
        <div class="kapper-radio"></div>
        <div>
          <div class="kapper-title">🤖 Geen keuze</div>
          <div class="kapper-subtitle">Laat ons automatisch de beste kapper kiezen</div>
        </div>
      </div>
    `;
    
    // Add click handler for "Geen keuze"
    geenKeuzeCard.addEventListener('click', () => {
      // Remove selection from all kapper cards
      document.querySelectorAll('.kapper-item').forEach(item => {
        item.classList.remove('selected');
      });
      
      // Select this kapper card
      geenKeuzeCard.classList.add('selected');
      
      // Update hidden dropdown for compatibility
      sel.value = "auto";
      
      // Trigger change event for existing logic
      sel.dispatchEvent(new Event('change'));
    });
    
    kapperList.appendChild(geenKeuzeCard);
    
    // Create kapper cards
    data.forEach(kapper => {
      // Add to hidden dropdown for compatibility
      const opt = document.createElement("option");
      opt.value = kapper.id;
      opt.textContent = kapper.naam;
      sel.appendChild(opt);
      
      // Create kapper card
      const kapperCard = document.createElement("div");
      kapperCard.className = "kapper-item";
      kapperCard.dataset.kapperId = kapper.id;
      kapperCard.innerHTML = `
        <div class="kapper-left">
          <div class="kapper-radio"></div>
          <div>
            <div class="kapper-title">${kapper.naam}</div>
          </div>
        </div>
      `;
      
      // Add click handler
      kapperCard.addEventListener('click', () => {
        // Remove selection from all kapper cards
        document.querySelectorAll('.kapper-item').forEach(item => {
          item.classList.remove('selected');
        });
        
        // Select this kapper card
        kapperCard.classList.add('selected');
        
        // Update hidden dropdown for compatibility
        sel.value = kapper.id;
        
        // Trigger change event for existing logic
        sel.dispatchEvent(new Event('change'));
      });
      
      kapperList.appendChild(kapperCard);
    });
  } catch (e) {
    console.error(e);
    kapperList.innerHTML = "<div style='padding: 12px; text-align: center; color: #f28b82;'>Fout bij laden van kappers</div>";
  }
}

// Tijdslots (customizable start/end times per 15 min)
async function generateAllAvailableTimeSlots(selectedDate) {
  debugLog('🤖 Generating all available time slots for auto selection');
  debugLog('Selected date received:', selectedDate, typeof selectedDate);
  
  const container = document.getElementById("timeSlots");
  if (!container) {
    console.error('Time slots container not found!');
    return;
  }
  
  container.innerHTML = "";
  
  try {
    // Validate and format the date
    if (!selectedDate) {
      console.error('No date provided to generateAllAvailableTimeSlots');
      container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; font-style: italic;">Geen datum geselecteerd</p>';
      return;
    }
    
    // Ensure the date is in YYYY-MM-DD format
    let formattedDate = selectedDate;
    if (selectedDate instanceof Date) {
      formattedDate = selectedDate.toISOString().split('T')[0];
    } else if (typeof selectedDate === 'string') {
      // Validate the date string format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
        console.error('Invalid date format:', selectedDate);
        container.innerHTML = '<p style="text-align: center; color: #f28b82; padding: 20px;">Ongeldige datum format</p>';
        return;
      }
    }
    
    debugLog('Formatted date:', formattedDate);
    
    // Get all kappers
    const { data: allKappers, error: kappersError } = await sb.from("kappers").select("*").order("id");
    if (kappersError) throw kappersError;
    
    if (!allKappers || allKappers.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; font-style: italic;">Geen kappers beschikbaar</p>';
      return;
    }
    
    // Get all existing appointments for the selected date
    const startDateTime = new Date(`${formattedDate}T00:00:00.000Z`);
    const endDateTime = new Date(`${formattedDate}T23:59:59.999Z`);
    
    debugLog('Date range for query:', {
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString()
    });
    
    const { data: existingAppointments, error: appointmentsError } = await sb
      .from('boekingen')
      .select('kapper_id, datumtijd, dienst_id')
      .gte('datumtijd', startDateTime.toISOString())
      .lte('datumtijd', endDateTime.toISOString());
    
    if (appointmentsError) throw appointmentsError;
    
    // Get service duration for conflict checking
    const selectedDienstId = document.getElementById('dienstSelect')?.value;
    let serviceDuration = 30; // default
    if (selectedDienstId) {
      serviceDuration = await getServiceDuration(selectedDienstId);
    }
    
    // Create a map of occupied time slots per kapper
    const occupiedSlots = {};
    existingAppointments.forEach(apt => {
      const kapperId = apt.kapper_id;
      const startTime = new Date(apt.datumtijd);
      const endTime = new Date(startTime.getTime() + serviceDuration * 60000);
      
      if (!occupiedSlots[kapperId]) occupiedSlots[kapperId] = [];
      occupiedSlots[kapperId].push({ start: startTime, end: endTime });
    });
    
    // Collect all available time slots from all kappers
    const allAvailableSlots = [];
    
    for (const kapper of allKappers) {
      const kapperAvailability = await fetchKapperAvailability(kapper.id);
      if (!kapperAvailability || kapperAvailability.length === 0) continue;
      
      const selectedDateObj = new Date(formattedDate);
      const dayOfWeek = selectedDateObj.getDay();
      
      const isWorking = isKapperWorkingOnDay(kapperAvailability, dayOfWeek);
      if (!isWorking) continue;
      
      const workingHours = getKapperWorkingHoursNEW(kapperAvailability, dayOfWeek);
      if (!workingHours) continue;
      
      const { start: startTime, end: endTime } = workingHours;
      const availableSlots = generateTimeSlotsForKapper(
        startTime, 
        endTime, 
        formattedDate, 
        kapper.id, 
        occupiedSlots[kapper.id] || [], 
        serviceDuration
      );
      
      // Add kapper info to each slot
      availableSlots.forEach(slot => {
        slot.kapperId = kapper.id;
        slot.kapperName = kapper.naam;
        allAvailableSlots.push(slot);
      });
    }
    
    // Sort all slots by time
    allAvailableSlots.sort((a, b) => a.time.localeCompare(b.time));
    
    // Remove duplicates (same time from multiple kappers) with smart kapper selection
    const uniqueSlots = [];
    const seenTimes = new Set();
    const kapperWorkload = {}; // Track appointments per kapper for this day
    
    // Count existing appointments per kapper for this day
    allKappers.forEach(kapper => {
      const kapperAppointments = existingAppointments.filter(apt => apt.kapper_id === kapper.id);
      kapperWorkload[kapper.id] = kapperAppointments.length;
    });
    
    debugLog('Kapper workload for smart selection:', kapperWorkload);
    
    // Group slots by time and choose the best kapper for each time
    const slotsByTime = {};
    allAvailableSlots.forEach(slot => {
      if (!slotsByTime[slot.time]) {
        slotsByTime[slot.time] = [];
      }
      slotsByTime[slot.time].push(slot);
    });
    
    // For each time slot, choose the kapper with the least workload
    Object.keys(slotsByTime).forEach(time => {
      const slotsForTime = slotsByTime[time];
      
      // Sort by workload (least appointments first), then by kapper ID for consistency
      slotsForTime.sort((a, b) => {
        const workloadDiff = kapperWorkload[a.kapperId] - kapperWorkload[b.kapperId];
        if (workloadDiff !== 0) return workloadDiff;
        return a.kapperId - b.kapperId; // Consistent ordering if workload is same
      });
      
      // Choose the kapper with least workload
      const bestSlot = slotsForTime[0];
      uniqueSlots.push(bestSlot);
      
      // Update workload for this kapper (simulate adding this appointment)
      kapperWorkload[bestSlot.kapperId]++;
    });
    
    // Sort the final slots by time
    uniqueSlots.sort((a, b) => a.time.localeCompare(b.time));
    
    // Render the time slots
    if (uniqueSlots.length === 0) {
      // Check if there are any occupied slots that could have waitlist
      debugLog('No available slots found, checking for occupied slots with waitlist...');
      await renderOccupiedSlotsWithWaitlist(container, selectedDate, dienstId);
      return;
    }
    
    // Also show occupied slots with waitlist option even when there are available slots
    debugLog('Available slots found, also checking for occupied slots with waitlist...');
    await renderMixedTimeSlots(container, selectedDate, dienstId, uniqueSlots);
    
    debugLog(`Generated ${uniqueSlots.length} available time slots from all kappers`);
    
  } catch (error) {
    console.error('Error generating all available time slots:', error);
    container.innerHTML = '<p style="text-align: center; color: #f28b82; padding: 20px;">Fout bij laden van beschikbare tijden</p>';
  }
}

function generateTimeSlotsForKapper(startTime, endTime, selectedDate, kapperId, occupiedSlots, serviceDuration) {
  debugLog('generateTimeSlotsForKapper called with:', { startTime, endTime, selectedDate, kapperId });
  
  // Validate parameters
  if (!startTime || !endTime) {
    console.error('Missing startTime or endTime:', { startTime, endTime });
    return [];
  }
  
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const interval = 15;
  const now = new Date();
  const isToday = selectedDate === now.toISOString().split('T')[0];
  
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += interval) {
      if (h < startHour || (h === startHour && m < startMin) || h >= endHour || (h === endHour && m >= endMin)) {
        continue;
      }
      
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const slotTime = new Date(`${selectedDate}T${timeStr}:00`);
      
      // Check if slot is in the past (only for today)
      if (isToday) {
        const currentTime = new Date();
        const slotDateTime = new Date(`${selectedDate}T${timeStr}:00`);
        if (slotDateTime <= currentTime) continue;
      }
      
      // Check if slot conflicts with existing appointments
      const slotEndTime = new Date(slotTime.getTime() + serviceDuration * 60000);
      const hasConflict = occupiedSlots.some(occupied => {
        return (slotTime < occupied.end && slotEndTime > occupied.start);
      });
      
      if (hasConflict) continue;
      
      // Check if service would finish before kapper's shift ends
      const shiftEndTime = new Date(`${selectedDate}T${endTime}:00`);
      if (slotEndTime > shiftEndTime) continue;
      
      slots.push({
        time: timeStr,
        kapperId: kapperId
      });
    }
  }
  
  return slots;
}

async function generateTimeSlots(startTime = '09:00', endTime = '18:00') {
  const container = document.getElementById("timeSlots");
  if(!container) {
    console.error('Time slots container not found!');
    return;
  }
  
  debugLog('Clearing time slots container');
  container.innerHTML = "";

  // Parse start and end times
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  // Handle 24:00:00 as 24:00 (end of day)
  const actualEndHour = endHour === 24 ? 24 : endHour;
  const actualEndMin = endHour === 24 ? 0 : endMin;
  
  const interval = 15;
  debugLog('Generating time slots from', startTime, 'to', endTime);
  debugLog('Parsed times:', { startHour, startMin, endHour, endMin });
  debugLog('Actual end time:', { actualEndHour, actualEndMin });

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
    debugLog('Selected service duration:', maxServiceDuration, 'minutes');
  } else {
    // If no service selected, use the longest possible service duration to be safe
    try {
      const { data: services } = await sb.from("diensten").select("duur_minuten");
      if (services && services.length > 0) {
        maxServiceDuration = Math.max(...services.map(s => s.duur_minuten || 30));
        debugLog('No service selected, using max service duration:', maxServiceDuration, 'minutes');
      }
    } catch (error) {
      debugLog('Could not fetch max service duration, using default 30 minutes');
    }
  }

  // Calculate the latest time slot that allows the service to finish before shift end
  const maxBookingTime = new Date(`2000-01-01T${actualEndHour.toString().padStart(2,'0')}:${actualEndMin.toString().padStart(2,'0')}:00`);
  const latestStartTime = new Date(maxBookingTime.getTime() - maxServiceDuration * 60000);
  
  debugLog('=== TIME SLOT GENERATION DEBUG ===');
  debugLog('Input endTime:', endTime);
  debugLog('Parsed endHour:', endHour, 'endMin:', endMin);
  debugLog('ActualEndHour:', actualEndHour, 'actualEndMin:', actualEndMin);
  debugLog('Shift end time:', endTime);
  debugLog('Max service duration:', maxServiceDuration, 'minutes');
  debugLog('Shift end DateTime:', maxBookingTime.toTimeString().slice(0, 5));
  debugLog('Latest start time to finish before shift end:', latestStartTime.toTimeString().slice(0, 5));
  debugLog('Selected date:', selectedDate);
  debugLog('Is today:', isToday);
  debugLog('Current time:', now.toLocaleTimeString());

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
        debugLog(`❌ Skipping ${timeStr} - service would finish at ${serviceEndTime.toTimeString().slice(0, 5)} after shift end (${maxBookingTime.toTimeString().slice(0, 5)})`);
        continue;
      } else {
        debugLog(`✅ Allowing ${timeStr} - service would finish at ${serviceEndTime.toTimeString().slice(0, 5)} before shift end (${maxBookingTime.toTimeString().slice(0, 5)})`);
      }
      
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerText = timeStr;
      btn.className = "time-btn";
      
      // Check if this time slot is in the past (only for today)
      if (isToday) {
        // Create a proper time comparison
        const slotTime = new Date();
        slotTime.setHours(h, m, 0, 0);
        const currentTime = new Date();
        
        // Add 15 minutes buffer to current time to prevent booking too close to current time
        const bufferTime = new Date(currentTime.getTime() + 15 * 60000);
        
        if (slotTime < bufferTime) {
          // Skip past time slots entirely - don't create buttons for them
          debugLog(`⏰ Skipping past time slot: ${timeStr} (current time: ${currentTime.toLocaleTimeString()})`);
          continue;
        }
      }
      
      btn.addEventListener("click",(e)=>{
        // Prevent clicking on disabled buttons
        if (btn.classList.contains('disabled') || btn.hasAttribute('disabled')) {
          e.preventDefault();
          e.stopPropagation();
          debugLog('Click prevented on disabled button:', timeStr);
          return false;
        }
        selectTimeSlot(timeStr);
      });
      container.appendChild(btn);
      slotCount++;
    }
  }
  
  debugLog(`Generated ${slotCount} time slots (considering ${maxServiceDuration}min service duration)`);
  debugLog(`Container now has ${container.children.length} children`);
  
  // Debug: Log the last few time slots to verify they're correct
  const timeButtons = container.querySelectorAll('.time-btn');
  const lastFewSlots = Array.from(timeButtons).slice(-3).map(btn => btn.textContent);
  debugLog('Last few time slots generated:', lastFewSlots);
  
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
  debugLog(`🔍 TEST: Time ${testTime} with ${maxServiceDuration}min service:`);
  debugLog(`  Start: ${testSlotTime.toTimeString().slice(0, 5)}`);
  debugLog(`  End: ${testServiceEndTime.toTimeString().slice(0, 5)}`);
  debugLog(`  Shift End: ${maxBookingTime.toTimeString().slice(0, 5)}`);
  debugLog(`  Valid: ${testServiceEndTime <= maxBookingTime ? 'YES' : 'NO'}`);
}

// Check if a day has any available time slots
async function checkIfDayHasAvailableTimes(date, kapperAvailability, serviceId) {
  try {
    // Get kapper working hours for this day
    const dayOfWeek = date.getDay();
    const workingHours = kapperAvailability?.find(avail => {
      return avail.day_of_week === dayOfWeek || 
             avail.day_of_week === getDayName(dayOfWeek);
    });
    
    if (!workingHours) {
      return false; // Kapper doesn't work on this day
    }
    
    const startTime = workingHours.start || '09:00';
    const endTime = workingHours.end || '17:00';
    
    // Get service duration
    let serviceDuration = 30; // Default
    if (serviceId) {
      serviceDuration = await getServiceDuration(serviceId);
    } else {
      // If no service selected, use the longest possible service duration to be safe
      try {
        const { data: services } = await sb.from("diensten").select("duur_minuten");
        if (services && services.length > 0) {
          serviceDuration = Math.max(...services.map(s => s.duur_minuten || 30));
        }
      } catch (error) {
        debugLog('Could not fetch max service duration, using default 30 minutes');
      }
    }
    
    // Parse working hours
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const actualEndHour = endHour === 24 ? 24 : endHour;
    const actualEndMin = endHour === 24 ? 0 : endMin;
    
    // Calculate latest possible booking time
    const maxBookingTime = new Date(`2000-01-01T${actualEndHour.toString().padStart(2,'0')}:${actualEndMin.toString().padStart(2,'0')}:00`);
    const latestStartTime = new Date(maxBookingTime.getTime() - serviceDuration * 60000);
    
    // Check current time for today
    const isToday = (new Date().toDateString() === date.toDateString());
    const currentTime = new Date();
    const bufferTime = new Date(currentTime.getTime() + 15 * 60000);
    
    // Check if there are any available slots
    const interval = 15;
    for (let h = startHour; h < actualEndHour; h++) {
      for (let m = 0; m < 60; m += interval) {
        // Skip if before start time or at/after end time
        if (h < startHour || (h === startHour && m < startMin) || h > actualEndHour || (h === actualEndHour && m >= actualEndMin)) {
          continue;
        }
        
        const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
        const slotTime = new Date(`2000-01-01T${timeStr}:00`);
        
        // Skip if service would not finish before shift end
        const serviceEndTime = new Date(slotTime.getTime() + serviceDuration * 60000);
        if (serviceEndTime > maxBookingTime) {
          continue;
        }
        
        // Skip if it's today and time is in the past
        if (isToday) {
          const slotTimeToday = new Date();
          slotTimeToday.setHours(h, m, 0, 0);
          if (slotTimeToday < bufferTime) {
            continue;
          }
        }
        
        // If we reach here, there's at least one available slot
        return true;
      }
    }
    
    return false; // No available slots found
    
  } catch (error) {
    console.error('Error checking day availability:', error);
    return true; // Default to available if error occurs
  }
}

// Apply blocked times to time slot buttons
function applyBlockedTimes(blockedTimes) {
  if (!blockedTimes || blockedTimes.size === 0) {
    debugLog('No blocked times to apply');
    return;
  }
  
  debugLog('Applying blocked times:', Array.from(blockedTimes));
  debugLog('Total time buttons found:', document.querySelectorAll('.time-btn').length);
  
  let disabledCount = 0;
  document.querySelectorAll('.time-btn').forEach(btn => {
    const timeStr = btn.innerText;
    if (blockedTimes.has(timeStr)) {
      btn.classList.add('disabled');
      btn.setAttribute('disabled', 'true');
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      debugLog(`🔒 Disabled time slot: ${timeStr}`);
      disabledCount++;
    } else {
      btn.classList.remove('disabled');
      btn.removeAttribute('disabled');
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  });
  
  debugLog(`✅ Applied blocked times: ${disabledCount} slots disabled`);
}

function selectTimeSlot(time){
  // Check if the clicked button is disabled
  const clickedBtn = Array.from(document.querySelectorAll(".time-btn")).find(btn => btn.innerText === time);
  if (clickedBtn && (clickedBtn.classList.contains('disabled') || clickedBtn.hasAttribute('disabled'))) {
    debugLog('Cannot select disabled time slot:', time);
    return; // Don't select disabled time slots
  }
  
  selectedTime = time;
  debugLog(`🕐 Selected time slot: ${time}`);
  
  // Update hidden inputs for normal kapper selection
  const kapperSelectValue = document.getElementById("kapperSelect")?.value;
  if (kapperSelectValue && kapperSelectValue !== 'auto') {
    document.getElementById('selectedTime').value = time;
    document.getElementById('selectedKapperId').value = kapperSelectValue;
    document.getElementById('selectedKapperName').value = document.getElementById("kapperSelect").options[document.getElementById("kapperSelect").selectedIndex]?.text || '';
  }
  
  // Check if this time is in the blocked times
  if (blockedTimes && blockedTimes.has(time)) {
    debugLog(`⚠️ WARNING: ${time} is in blocked times but was selected!`);
    debugLog('Blocked times:', Array.from(blockedTimes));
  }
  
  document.querySelectorAll(".time-btn").forEach(btn=>btn.classList.remove("selected"));
  document.querySelectorAll(".time-btn").forEach(btn=>{
    if(btn.innerText===time) btn.classList.add("selected");
  });
}

// Fetch booked times for a given date (YYYY-MM-DD) and kapper
async function fetchBookedTimes(dateStr, kapperId){
  if (!dateStr || !kapperId) {
    debugLog('fetchBookedTimes: Missing date or kapper', { dateStr, kapperId });
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

    debugLog('fetchBookedTimes: Querying for', { dateStr, kapperId, start, end });

    // Use old method for now - get booked times with service durations
    debugLog('Using old method for overlap detection');
    const { data, error } = await sb
      .from('boekingen')
      .select('datumtijd, dienst_id')
      .eq('kapper_id', kapperId)
      .gte('datumtijd', start)
      .lt('datumtijd', end);
    
    if (error) throw error;
    
    debugLog('fetchBookedTimes: Raw data from DB', data);
    
    const times = new Set();
    for (const row of (data || [])) {
      const dt = row.datumtijd;
      if (typeof dt === 'string') {
        const t = dt.split('T')[1]?.slice(0,5);
        if (t) {
          const duration = await getServiceDuration(row.dienst_id);
          const startTime = new Date(`2000-01-01T${t}:00`);
          const endTime = new Date(startTime.getTime() + duration * 60000);
          
          debugLog(`🔒 Blocking times from ${t} to ${endTime.toTimeString().slice(0, 5)} (${duration}min)`);
          
          // Block time slots every 15 minutes for the duration
          for (let i = 0; i < duration; i += 15) {
            const blockedTime = new Date(startTime.getTime() + i * 60000);
            const blockedTimeStr = blockedTime.toTimeString().slice(0, 5);
            times.add(blockedTimeStr);
            debugLog(`  - Blocked: ${blockedTimeStr}`);
          }
          
          // Also block times that would overlap when booking a new appointment
          // Check all possible start times that would overlap with this existing appointment
          const existingEndTime = new Date(startTime.getTime() + duration * 60000);
          debugLog(`🔍 Checking for overlapping start times that would conflict with ${t}-${existingEndTime.toTimeString().slice(0, 5)}`);
          
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
                debugLog(`  - Blocked overlapping start time: ${checkTimeStr} (would end at ${checkEndTime.toTimeString().slice(0, 5)})`);
              }
            }
          }
        }
      }
    }
    
    debugLog('fetchBookedTimes: Processed times', Array.from(times));
    
    // Debug: Check specific times
    debugLog('🔍 DEBUG: Checking specific times:');
    debugLog('09:45 in blocked times?', times.has('09:45'));
    debugLog('10:00 in blocked times?', times.has('10:00'));
    debugLog('10:15 in blocked times?', times.has('10:15'));
    debugLog('10:30 in blocked times?', times.has('10:30'));
    
    if (times.has('09:45')) {
      debugLog('⚠️ 09:45 is available but should be blocked if there\'s a 10:00 appointment');
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

// Fetch kapper availability (working days and hours)
async function fetchKapperAvailability(kapperId) {
  if (!kapperId || kapperId === 'Laden...' || isNaN(kapperId)) {
    debugLog('fetchKapperAvailability: No valid kapper ID provided');
    return null;
  }
  
  try {
    const { data, error } = await sb
      .from('kapper_availability')
      .select('day_of_week, start_time, end_time')
      .eq('kapper_id', kapperId);

    if (error) {
      console.error('Error fetching kapper availability:', error);
      debugLog('Table might not exist yet, using fallback availability');
      // Return fallback availability (all days, 9-17)
      return getFallbackAvailability();
    }

    debugLog('Fetched kapper availability:', data);
    
    // If no data returned, use fallback
    if (!data || data.length === 0) {
      debugLog('No availability data found, using fallback');
      return getFallbackAvailability();
    }
    
    return data;
  } catch (error) {
    console.error('Error in fetchKapperAvailability:', error);
    debugLog('Using fallback availability due to error');
    return getFallbackAvailability();
  }
}

// Fallback availability when table doesn't exist or has no data
function getFallbackAvailability() {
  // Return empty array to indicate no availability
  return [];
}

// Check if a kapper works on a specific day
function isKapperWorkingOnDay(availability, dayOfWeek) {
  debugLog('isKapperWorkingOnDay called with:', { availability, dayOfWeek });
  
  if (!availability || !Array.isArray(availability) || availability.length === 0) {
    debugLog('No availability data, returning false');
    return false; // No availability data means not working
  }
  
  // Check if availability uses integer day_of_week (0-6) or string day names
  const isWorking = availability.some(avail => {
    // Check both integer and string formats
    return avail.day_of_week === dayOfWeek || 
           avail.day_of_week === getDayName(dayOfWeek);
  });
  
  debugLog('isKapperWorkingOnDay result:', { dayOfWeek, isWorking });
  return isWorking;
}

// Helper function to get day name from integer
function getDayName(dayOfWeek) {
  const dayMapping = {
    0: 'sunday',
    1: 'monday', 
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
  };
  return dayMapping[dayOfWeek];
}

// NEW FUNCTION - Get kapper working hours for a specific day
function getKapperWorkingHoursNEW(availability, dayOfWeek) {
  debugLog('🔥 NEW FUNCTION CALLED - getKapperWorkingHoursNEW:', { availability, dayOfWeek });
  
  if (!availability || !Array.isArray(availability) || availability.length === 0) {
    debugLog('🔥 NO AVAILABILITY - RETURNING NULL');
    return null;
  }
  
  // Check both integer and string formats for day_of_week
  const dayAvailability = availability.find(avail => {
    return avail.day_of_week === dayOfWeek || 
           avail.day_of_week === getDayName(dayOfWeek);
  });
  
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
  debugLog('🔥🔥🔥 NEW refreshAvailabilityNEW FUNCTION CALLED 🔥🔥🔥');
  let dateVal = document.getElementById('dateInput')?.value;
  const kapperVal = document.getElementById('kapperSelect')?.value;
  
  // If no date in hidden input, try to get it from selected date card
  if (!dateVal) {
    const selectedDateCard = document.querySelector('.date-card.selected');
    if (selectedDateCard) {
      dateVal = selectedDateCard.dataset.value;
      debugLog('Got date from selected date card:', dateVal);
    }
  }
  
  debugLog('🔥 NEW FUNCTION called with', { dateVal, kapperVal });
  
  // If no kapper selected or still loading, don't show time slots yet
  if (!kapperVal || kapperVal === 'Laden...') {
    debugLog('No valid kapper selected yet, hiding time slots');
    const timeSlotsContainer = document.querySelector('.time-slots');
    if (timeSlotsContainer) {
      timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; font-style: italic;">Selecteer eerst een kapper om beschikbare tijden te zien</p>';
    }
    return;
  }
  
  // Handle "auto" selection - get all available times from all kappers
  if (kapperVal === 'auto') {
    debugLog('Auto kapper selection - getting all available times');
    
    // Check if date is selected first
    if (!dateVal) {
      debugLog('No date selected for auto kapper selection');
      const timeSlotsContainer = document.querySelector('.time-slots');
      if (timeSlotsContainer) {
        timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; font-style: italic;">Selecteer eerst een datum om beschikbare tijden te zien</p>';
      }
      return;
    }
    
    await generateAllAvailableTimeSlots(dateVal);
    return;
  }
  
  // Fetch kapper availability first
  debugLog('Fetching kapper availability for', kapperVal);
  const kapperAvailability = await fetchKapperAvailability(kapperVal);
  debugLog('Fetched kapper availability:', kapperAvailability);
  
  // If no date selected, show message instead of times
  if (!dateVal) {
    debugLog('No date selected, showing message');
    const timeSlotsContainer = document.querySelector('.time-slots');
    if (timeSlotsContainer) {
      timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; font-style: italic;">Selecteer eerst een datum om beschikbare tijden te zien</p>';
    }
    return;
  }
  
  // If no kapper availability data, show message instead of times
  if (!kapperAvailability || !Array.isArray(kapperAvailability) || kapperAvailability.length === 0) {
    debugLog('No kapper availability data, showing message');
    const timeSlotsContainer = document.querySelector('.time-slots');
    if (timeSlotsContainer) {
      timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; font-style: italic;">Deze kapper heeft nog geen werktijden ingesteld. Neem contact op voor beschikbaarheid.</p>';
    }
    return;
  }
  
  debugLog('Kapper availability data found:', kapperAvailability);
  
  // Check if kapper works on the selected date
  const selectedDate = new Date(dateVal);
  const dayOfWeek = selectedDate.getDay();
  debugLog('Checking if kapper works on day:', { selectedDate: dateVal, dayOfWeek, kapperAvailability });
  
  const isWorking = isKapperWorkingOnDay(kapperAvailability, dayOfWeek);
  debugLog('Is kapper working on this day?', isWorking);
  
  if (!isWorking) {
    debugLog('Kapper does not work on this day, hiding time slots');
    const timeSlotsContainer = document.querySelector('.time-slots');
    if (timeSlotsContainer) {
      timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Deze kapper werkt niet op deze dag</p>';
    }
    return;
  }
  
  // Get kapper working hours for this day - USING NEW FUNCTION
  const workingHours = getKapperWorkingHoursNEW(kapperAvailability, dayOfWeek);
  debugLog('🔥 NEW FUNCTION RESULT:', workingHours);
  debugLog('🔥 Working hours type:', typeof workingHours, 'Is null:', workingHours === null);
  
  // Check if kapper has working hours for this day - VERSION 2.0
  if (!workingHours) {
    debugLog('=== NO WORKING HOURS - SHOWING MESSAGE V2.0 ===');
    const timeSlotsContainer = document.querySelector('.time-slots');
    if (timeSlotsContainer) {
      timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; font-style: italic;">Deze kapper werkt niet op deze dag. Kies een andere dag of kapper.</p>';
    }
    return;
  }
  
  // Ensure we have valid working hours
  let startTime = workingHours.start || '09:00';
  let endTime = workingHours.end || '17:00';
  
  // Additional fix for end time issues
  if (endTime === '00:00:00' || endTime === '00:00') {
    endTime = '24:00:00';
    debugLog('Fixed end time in refreshAvailability:', endTime);
  }
  
  debugLog('Using working hours:', { startTime, endTime });
  
  // Generate time slots based on kapper's working hours
  debugLog('About to generate time slots with:', { startTime, endTime });
  await generateTimeSlots(startTime, endTime);
  
  // Fetch and apply blocked times
  debugLog('Fetching blocked times for:', { dateVal, kapperVal });
  blockedTimes = await fetchBookedTimes(dateVal, kapperVal);
  debugLog('Fetched blocked times:', Array.from(blockedTimes));
  
  // Apply blocked times to time slots
  applyBlockedTimes(blockedTimes);
  
  // Add waitlist functionality for occupied slots
  debugLog('Adding waitlist functionality for occupied slots...');
  await addWaitlistToOccupiedSlots(dateVal, kapperVal);
  
  // Verify time slots were generated
  const timeSlotsContainer = document.querySelector('.time-slots');
  const timeSlotCount = timeSlotsContainer ? timeSlotsContainer.children.length : 0;
  debugLog('Time slots generated:', timeSlotCount);
  
  // Fetch booked times and disable them
  debugLog('Fetching booked times for', { dateVal, kapperVal });
  const blocked = await fetchBookedTimes(dateVal, kapperVal);
  debugLog('Blocked times:', Array.from(blocked));
  
  document.querySelectorAll('.time-btn').forEach(btn => {
    const t = btn.innerText;
    if (blocked.has(t)) {
      debugLog('Disabling booked time slot:', t);
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
      debugLog('Enabling available time slot:', t);
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
    debugLog('Cannot change service in step 3');
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
  
  // Regenerate time slots with new service duration if we have a date and kapper selected
  const dateVal = document.getElementById('dateInput')?.value;
  const kapperVal = document.getElementById('kapperSelect')?.value;
  
  if (dateVal && kapperVal) {
    debugLog('Service changed, regenerating time slots with new duration...');
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
  
  // Check if this is a waitlist booking
  if (waitlistEnabled && currentWaitlistSlot) {
    await showWaitlistConfirmation(naam, email, telefoon);
    return;
  }
  
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
  
  debugLog('Price calculation:', {
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
    
    debugLog('Discount calculation:', {
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
  
  // Get kapper info
  const kapperName = kapperSelect ? kapperSelect.options[kapperSelect.selectedIndex]?.text : 'Onbekend';
  
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
  document.getElementById('popupKapper').textContent = kapperName;
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
  const kapperId = document.getElementById("kapperSelect").value;
  const dienstId = document.getElementById("dienstSelect").value;
  const date = document.getElementById("dateInput").value;

  // basis validatie
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneDigits = telefoon ? telefoon.replace(/\D/g, "") : "";

  if(!naam || !email || !telefoon || !kapperId || !dienstId || !date || !selectedTime){
    return alert("Vul alle velden in (naam, e-mail, telefoon, dienst, datum, tijd)!");
  }
  if(!emailRegex.test(email)){
    return alert("Vul een geldig e-mailadres in.");
  }
  if(phoneDigits.length < 8){
    return alert("Vul een geldig telefoonnummer in.");
  }

  // Check if the selected time is not in the past
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (selectedDate < today) {
    return alert("Je kunt geen afspraak maken voor een datum in het verleden.");
  }
  
  // If it's today, check if the time is not in the past
  if (selectedDate.getTime() === today.getTime()) {
    const [timeHour, timeMin] = selectedTime.split(':').map(Number);
    const appointmentTime = new Date();
    appointmentTime.setHours(timeHour, timeMin, 0, 0);
    
    // Add 15 minutes buffer to current time
    const currentTime = new Date();
    const bufferTime = new Date(currentTime.getTime() + 15 * 60000);
    
    if (appointmentTime < bufferTime) {
      return alert("Deze tijd is al voorbij of te kort van tevoren geboekt. Kies een later tijdstip.");
    }
  }

  // Check if the selected time allows the service to finish before shift end
  const serviceDuration = await getServiceDuration(dienstId);
  const kapperAvailability = await fetchKapperAvailability(kapperId);
  const dayOfWeek = new Date(date).getDay();
  const workingHours = kapperAvailability?.find(avail => {
    return avail.day_of_week === dayOfWeek || 
           avail.day_of_week === getDayName(dayOfWeek);
  });
  
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
      return alert(`Deze afspraak zou eindigen om ${endTimeStr}, maar de kapper werkt maar tot ${shiftEndStr}. Kies een eerder tijdstip.`);
    }
  }

  // Check if this is a waitlist booking
  if (waitlistEnabled && currentWaitlistSlot) {
    // For waitlist, show popup directly
    showWaitlistModal(currentWaitlistSlot);
    debugLog('🕐 Showing waitlist popup from boekDienst');
    return;
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
  const kapperSelectValue = document.getElementById("kapperSelect").value;
  const dienstId = document.getElementById("dienstSelect").value;
  const date = document.getElementById("dateInput").value;
  
  // Check if this is a waitlist booking
  if (waitlistEnabled && currentWaitlistSlot) {
    debugLog('🕐 Processing waitlist booking');
    await confirmWaitlistBooking();
    return;
  }

  // Handle auto kapper selection
  let kapperId;
  if (kapperSelectValue === 'auto') {
    // Get the selected kapper from the time slot
    const selectedKapperId = document.getElementById('selectedKapperId')?.value;
    if (!selectedKapperId) {
      alert('Er is een fout opgetreden bij het selecteren van de kapper. Probeer opnieuw.');
      return;
    }
    kapperId = selectedKapperId;
  } else {
    kapperId = kapperSelectValue;
  }

  // Check if selectedTime is valid
  if (!selectedTime || selectedTime === 'null' || selectedTime === null) {
    console.error('No time selected:', selectedTime);
    alert('Selecteer eerst een tijd voor je afspraak.');
    return;
  }
  
  const beginTijd = `${date}T${selectedTime}:00`;
  
  debugLog('🔍 Date validation debug:', {
    date: date,
    selectedTime: selectedTime,
    beginTijd: beginTijd,
    dienstId: dienstId
  });
  
  // Get service duration to calculate end time
  const serviceDuration = await getServiceDuration(dienstId);
  const beginDateTime = new Date(beginTijd);
  
  debugLog('🔍 Date creation debug:', {
    beginDateTime: beginDateTime,
    isValid: !isNaN(beginDateTime.getTime()),
    timestamp: beginDateTime.getTime()
  });
  
  // Validate the date before proceeding
  if (isNaN(beginDateTime.getTime())) {
    console.error('Invalid date format:', beginTijd);
    alert('Ongeldige datum/tijd combinatie. Probeer opnieuw.');
    return;
  }
  
  const eindDateTime = new Date(beginDateTime.getTime() + serviceDuration * 60000);
  const eindTijd = eindDateTime.toISOString();

  try{
    // Try to insert with new columns first
    let insertData = {
      klantnaam: naam,
      email: email,
      telefoon: telefoon,
      kapper_id: kapperId,
      dienst_id: dienstId,
      datumtijd: beginTijd
    };
    
    // Use old method - only insert basic data without new columns
    debugLog('Using old method - inserting basic data only');
    const { data, error } = await sb.from("boekingen").insert([insertData]);
    if(error) {
      console.error('Database error:', error);
      throw error;
    }
    debugLog("Boeking opgeslagen:", data);

    // Send confirmation email (with error handling for Vercel issues)
    try {
      await sendBookingConfirmationEmail({
        customerName: naam,
        customerEmail: email,
        serviceName: await getServiceName(dienstId),
        kapperName: await getKapperName(kapperId),
        appointmentDate: date,
        appointmentTime: selectedTime,
        serviceDuration: serviceDuration
      });
    } catch (emailError) {
      debugLog('E-mail kon niet worden verzonden (Vercel probleem):', emailError.message);
      // E-mail fout blokkeert de boeking niet
    }

    // Show confirmation message instead of hiding popup
    showBookingConfirmationMessage();
    
    debugLog("Boeking toegevoegd:", data);
    
    // refresh availability after successful booking
    await refreshAvailabilityNEW();
    
    // Refresh statistics if we're on admin page
    if (typeof loadStatistics === 'function') {
      debugLog('Refreshing statistics after new booking');
      await loadStatistics();
    }
  }catch(e){
    console.error("Fout bij boeken:", e);
    alert("Er is iets misgegaan, check console");
  }
}

// Helper function to get service name
async function getServiceName(serviceId) {
  try {
    const { data: service } = await sb.from('diensten').select('naam').eq('id', serviceId).single();
    return service?.naam || 'Onbekende dienst';
  } catch (error) {
    console.error('Error fetching service name:', error);
    return 'Onbekende dienst';
  }
}

// Helper function to get kapper name
async function getKapperName(kapperId) {
  try {
    const { data: kapper } = await sb.from('kappers').select('naam').eq('id', kapperId).single();
    return kapper?.naam || 'Onbekende kapper';
  } catch (error) {
    console.error('Error fetching kapper name:', error);
    return 'Onbekende kapper';
  }
}

// Send booking confirmation email via EmailJS
async function sendBookingConfirmationEmail(bookingData) {
  // Skip if no email provided
  if (!bookingData.customerEmail) {
    debugLog('No email provided, skipping email notification');
    return;
  }

  // Skip if EmailJS is not configured
  if (EMAIL_CONFIG.publicKey === 'your_public_key_here') {
    debugLog('EmailJS not configured, skipping email notification');
    return;
  }

  try {
    // Format date for display
    const dateObj = new Date(bookingData.appointmentDate);
    const formattedDate = dateObj.toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Calculate end time
    const startTime = new Date(`2000-01-01T${bookingData.appointmentTime}:00`);
    const endTime = new Date(startTime.getTime() + bookingData.serviceDuration * 60000);
    const endTimeStr = endTime.toTimeString().slice(0, 5);

    // Send email via EmailJS
    const response = await emailjs.send(
      EMAIL_CONFIG.serviceId,
      EMAIL_CONFIG.templateId,
      {
        to_name: bookingData.customerName,
        to_email: bookingData.customerEmail,
        service_name: bookingData.serviceName || 'Onbekend',
        kapper_name: bookingData.kapperName || 'Onbekend',
        appointment_date: formattedDate,
        appointment_time: bookingData.appointmentTime,
        appointment_end_time: endTimeStr,
        salon_name: EMAIL_CONFIG.salonName,
        salon_phone: EMAIL_CONFIG.salonPhone,
        salon_address: EMAIL_CONFIG.salonAddress
      }
    );

    debugLog('Confirmation email sent successfully:', response);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    // Don't throw error - booking should still succeed even if email fails
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
  selectedKapperId = null;
  
  // Reset UI
  document.querySelectorAll('.service-item').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.date-card').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.time-btn').forEach(el => el.classList.remove('selected'));
  document.getElementById('kapperSelect').value = '';
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
  
  debugLog("Supabase client found:", sb);

  // Clear kapper selection first
  const kapperSelect = document.getElementById("kapperSelect");
  if (kapperSelect) {
    kapperSelect.innerHTML = "";
    kapperSelect.value = "";
  }
  
  loadDiensten();
  
  // Small delay to ensure kapper dropdown is properly reset
  setTimeout(() => {
    loadKappers();
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
  selectedKapperId = null;
  
  // Clear UI selections
  document.querySelectorAll('.service-item').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.date-card').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.time-btn').forEach(el => el.classList.remove('selected'));
  
  // Render date cards (will show message if no kapper selected)
  await renderDateCards();
  
  // Test: call refreshAvailabilityNEW on page load
  debugLog('Page loaded, calling refreshAvailabilityNEW...');
  setTimeout(async () => {
    await refreshAvailabilityNEW();
  }, 200);
  
  
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
  debugLog('Testing direct database query...');
  sb.from('boekingen').select('*').limit(5).then(({data, error}) => {
    debugLog('Direct query result:', {data, error});
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
    
    // Get selected kapper
    const kapperVal = document.getElementById('kapperSelect')?.value;
    
    // If no kapper selected, show message instead of date cards
    if (!kapperVal || kapperVal === 'Laden...' || (isNaN(kapperVal) && kapperVal !== 'auto')) {
      datePicker.innerHTML = '<div class="no-kapper-message" style="text-align: center; padding: 20px; color: #666; font-style: italic;">Selecteer eerst een kapper om beschikbare dagen te zien</div>';
      return;
    }
    
    datePicker.innerHTML = "";
    const daysToShow = 7;
    const formatterWeekday = new Intl.DateTimeFormat('nl-NL', { weekday: 'short' });
    const formatterMonth = new Intl.DateTimeFormat('nl-NL', { month: 'short' });
    const today = new Date();
    
    let kapperAvailability = null;
    
    if (kapperVal === 'auto') {
      // For auto selection, get all kappers and their availability
      debugLog('Auto selection - fetching all kappers');
      const { data: allKappers, error: kappersError } = await sb.from('kappers').select('id, naam');
      if (kappersError || !allKappers || allKappers.length === 0) {
        debugLog('No kappers found for auto selection');
        datePicker.innerHTML = '<div class="no-availability-message" style="text-align: center; padding: 20px; color: #666; font-style: italic;">Geen kappers gevonden.</div>';
        return;
      }
      
      // Fetch availability for all kappers
      const allAvailability = [];
      for (const kapper of allKappers) {
        const avail = await fetchKapperAvailability(kapper.id);
        if (avail && Array.isArray(avail) && avail.length > 0) {
          allAvailability.push(...avail);
        }
      }
      
      kapperAvailability = allAvailability;
      debugLog('Auto selection - combined availability:', kapperAvailability);
    } else {
      kapperAvailability = await fetchKapperAvailability(kapperVal);
    }
    
    // Check if kapper has any availability data
    debugLog('Checking kapper availability for dates:', { kapperVal, kapperAvailability });
    if (!kapperAvailability || !Array.isArray(kapperAvailability) || kapperAvailability.length === 0) {
      debugLog('No availability data found, showing message for dates');
      datePicker.innerHTML = '<div class="no-availability-message" style="text-align: center; padding: 20px; color: #666; font-style: italic;">Deze kapper heeft nog geen werktijden ingesteld. Neem contact op voor beschikbaarheid.</div>';
      return;
    }
    
    debugLog('Kapper availability data found for dates:', kapperAvailability);
    
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
      
      // Check if kapper works on this day
      const dayOfWeek = d.getDay();
      const isWorking = kapperAvailability ? isKapperWorkingOnDay(kapperAvailability, dayOfWeek) : true;
      
      // Check if there are any available time slots for this day
      let hasAvailableTimes = true;
      if (isWorking) {
        hasAvailableTimes = await checkIfDayHasAvailableTimes(d, kapperAvailability, selectedDienstId);
      }
      
      if (!isWorking || !hasAvailableTimes) {
        card.classList.add('unavailable');
        card.style.opacity = '0.4';
        card.style.cursor = 'not-allowed';
        card.style.backgroundColor = '#f3f4f6';
        card.style.borderColor = '#d1d5db';
        card.style.color = '#9ca3af';
      }
      
      const isToday = (new Date().toDateString() === d.toDateString());
      const unavailableText = !isWorking ? 'Kapper werkt niet' : !hasAvailableTimes ? 'Geen tijden beschikbaar' : '';
      
      card.innerHTML = `
        <div class="weekday">${isToday ? 'Vandaag' : formatterWeekday.format(d)}</div>
        <div class="day">${dd}</div>
        <div class="month">${formatterMonth.format(d).toUpperCase()}</div>
        ${unavailableText ? `<div class="unavailable-text">${unavailableText}</div>` : ''}
      `;
      
      if (isWorking && hasAvailableTimes) {
        card.addEventListener('click', () => {
          debugLog('Date card clicked:', value);
          document.querySelectorAll('.date-card').forEach(el=>el.classList.remove('selected'));
          card.classList.add('selected');
          dateInput.value = value;
          debugLog('About to call refreshAvailabilityNEW');
          setTimeout(async () => {
            await refreshAvailabilityNEW();
          }, 50);
        });
      } else {
        card.addEventListener('click', (e) => {
          e.preventDefault();
          const message = !isWorking ? 'Deze kapper werkt niet op deze dag' : 'Geen beschikbare tijden meer op deze dag';
          alert(message);
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
    await renderDateCards();
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
      const kapperVal = document.getElementById("kapperSelect")?.value;
      if (!dateVal) {
        alert("Kies eerst een datum.");
        return;
      }
      if (!selectedTime) {
        alert("Kies eerst een tijd.");
        return;
      }
      if (!kapperVal) {
        alert("Kies een kapper.");
        return;
      }
      selectedDate = dateVal;
      selectedKapperId = kapperVal;
      showStep(3);
    });
  }

  const backTo2 = document.getElementById("backTo2");
  if (backTo2) {
    backTo2.addEventListener("click", ()=>{
      showStep(2);
    });
  }

  // When kapper changes, refresh availability and date cards
  if (kapperSelect) {
    kapperSelect.addEventListener('change', async () => {
      debugLog('Kapper select changed:', kapperSelect.value);
      await renderDateCards(); // Refresh date cards with new kapper availability
      
      // For auto selection, automatically select the first available day
      if (kapperSelect.value === 'auto') {
        setTimeout(() => {
          selectFirstDayOfWeek();
          refreshAvailabilityNEW();
        }, 100);
      } else {
        await refreshAvailabilityNEW();
      }
    });
  }
  
  // Add event listener for direct date input changes
  if (dateInput) {
    dateInput.addEventListener('change', async () => {
      await refreshAvailabilityNEW();
    });
  }
  
  // Initial call to refresh availability when page loads
  debugLog('Page loaded, calling refreshAvailability initially');
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
  debugLog('🔥 Looking for date card with value:', value);
  debugLog('🔥 Found date card:', firstDayCard);
  
  if (firstDayCard) {
    firstDayCard.classList.add('selected');
    selectedDate = value;
    debugLog('🔥 Selected first day card:', value);
  } else {
    debugLog('🔥 Date card not found, available cards:', 
      Array.from(document.querySelectorAll('.date-card')).map(card => card.dataset.value)
    );
  }
  
  // Trigger the date selection
  const event = new Event('change', { bubbles: true });
  dateInput.dispatchEvent(event);
  
  debugLog('🔥 Selected first day of week:', value);
}

// ====================== Loyalty System ======================
let loyaltySettings = {
  enabled: false,
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
    
    debugLog('Loyalty settings loaded:', loyaltySettings);
    
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
    
    if (error) {
      // If table doesn't exist or no data, return default values
      if (error.code === 'PGRST116' || error.message.includes('0 rows')) {
        debugLog('No loyalty data found for email:', email);
        return { points: 0, hasDiscount: false, discountPercentage: 0 };
      }
      throw error;
    }
    
    const points = data?.loyaliteitspunten || 0;
    return {
      points: points,
      hasDiscount: points >= loyaltySettings.pointsForDiscount,
      discountPercentage: points >= loyaltySettings.pointsForDiscount ? loyaltySettings.discountPercentage : 0
    };
  } catch (error) {
    debugLog('Error checking loyalty status:', error);
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
  
  debugLog('Loyalty elements hidden - system disabled');
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
      .in('key', ['primary_color', 'secondary_color', 'background_color', 'text_color', 'site_title']);
    
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
  
  
  debugLog('Frontend theme settings applied:', settings);
}

