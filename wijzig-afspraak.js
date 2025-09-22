// wijzig-afspraak.js
let currentAppointment = null;
let allKappers = [];
let allServices = [];
let multipleAppointments = []; // Store multiple appointments for back navigation

/**
 * Generate quarter-hour time slots (00:00, 00:15, 00:30, 00:45, etc.)
 */
function generateQuarterHourSlots() {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
  }
  return slots;
}

/**
 * Generate time slots based on kapper availability for a specific date
 */
async function generateKapperAvailableSlots(kapperId, date) {
  try {
    // Get kapper availability for the day of week
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const { data: availability, error } = await window.supabaseClient
      .from('kapper_availability')
      .select('start_time, end_time')
      .eq('kapper_id', kapperId)
      .eq('day_of_week', dayName)
      .single();
    
    if (error || !availability) {
      // Kapper doesn't work on this day
      return [];
    }
    
    // Generate quarter-hour slots within working hours
    const slots = [];
    const startTime = availability.start_time;
    const endTime = availability.end_time;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    let current = new Date(start);
    while (current < end) {
      slots.push(current.toTimeString().slice(0, 5));
      current.setMinutes(current.getMinutes() + 15);
    }
    
    return slots;
  } catch (error) {
    console.error('Error generating kapper available slots:', error);
    return [];
  }
}

async function testDatabaseConnection() {
    try {
        console.log('🔧 Testing database connection...');
        const { data, error } = await window.supabaseClient
            .from('boekingen')
            .select('id')
            .limit(1);
        
        if (error) {
            console.error('❌ Database connection failed:', error);
            alert('Database verbinding mislukt: ' + error.message);
        } else {
            console.log('✅ Database connection successful');
        }
    } catch (error) {
        console.error('❌ Database test error:', error);
        alert('Database test mislukt: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Test database connection first
    await testDatabaseConnection();
    
    // Load kappers and services for dropdowns
    await loadKappers();
    await loadServices();
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('searchDate').min = today;
    document.getElementById('editDate').min = today;
    
    // Search form
    document.getElementById('searchForm').addEventListener('submit', searchAppointment);
    
    // Edit buttons
    document.getElementById('editBtn').addEventListener('click', async () => {
        await showEditForm();
    });
    document.getElementById('cancelEdit').addEventListener('click', hideEditForm);
    document.getElementById('updateForm').addEventListener('submit', updateAppointment);
    // Remove existing listener if any and add new one
    const deleteBtn = document.getElementById('deleteBtn');
    deleteBtn.removeEventListener('click', deleteAppointment);
    deleteBtn.addEventListener('click', deleteAppointment);
    
    // Add global click listener for delete-related elements
    document.addEventListener('click', (event) => {
        if (event.target.id === 'deleteBtn' || 
            event.target.classList.contains('delete-emoji') || 
            event.target.textContent.includes('🗑️') ||
            event.target.textContent.includes('Annuleer')) {
            console.log('Global delete click detected', event.target);
            event.preventDefault();
            event.stopPropagation();
            deleteAppointment(event);
        }
    });
    
    // Reload times when service changes
    document.getElementById('editService').addEventListener('change', async () => {
        const date = document.getElementById('editDate').value;
        const kapper = document.getElementById('editKapper').value;
        if (date && kapper) {
            // Show loading state
            const timeSelect = document.getElementById('editTime');
            const currentValue = timeSelect.value;
            timeSelect.innerHTML = '<option value="">Laden...</option>';
            timeSelect.disabled = true;
            
            try {
                await loadAvailableTimes(date, kapper);
                
                // Try to restore previous selection if still available
                if (currentValue && Array.from(timeSelect.options).some(opt => opt.value === currentValue)) {
                    timeSelect.value = currentValue;
                }
                timeSelect.disabled = false;
            } catch (error) {
                console.error('Error reloading times:', error);
                timeSelect.innerHTML = '<option value="">Fout bij laden</option>';
                timeSelect.disabled = true;
            }
        }
    });
    
    // Reload times when date changes
    document.getElementById('editDate').addEventListener('change', async () => {
        const kapper = document.getElementById('editKapper').value;
        if (kapper) {
            await loadAvailableTimes(document.getElementById('editDate').value, kapper);
        }
    });
    
    // Confirmation popup
    document.getElementById('closeConfirmation').addEventListener('click', hideConfirmation);
});

async function loadKappers() {
    try {
        const { data, error } = await window.supabaseClient.from('kappers').select('*').order('naam');
        if (error) throw error;
        
        allKappers = data;
        const select = document.getElementById('editKapper');
        select.innerHTML = '<option value="">Selecteer kapper...</option>';
        data.forEach(kapper => {
            const option = document.createElement('option');
            option.value = kapper.id;
            option.textContent = kapper.naam;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading kappers:', error);
    }
}

async function loadServices() {
    try {
        const { data, error } = await window.supabaseClient.from('diensten').select('*').order('naam');
        if (error) throw error;
        
        allServices = data;
        const select = document.getElementById('editService');
        select.innerHTML = '<option value="">Selecteer dienst...</option>';
        data.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.naam} (€${service.prijs_euro})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

async function getKapperData(kapperId) {
    try {
        const { data, error } = await window.supabaseClient
            .from('kappers')
            .select('naam')
            .eq('id', kapperId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching kapper data:', error);
        return { naam: 'Onbekend' };
    }
}

async function getServiceData(serviceId) {
    try {
        const { data, error } = await window.supabaseClient
            .from('diensten')
            .select('naam, prijs_euro')
            .eq('id', serviceId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching service data:', error);
        return { naam: 'Onbekend', prijs_euro: 0 };
    }
}

async function searchAppointment(e) {
    e.preventDefault();
    
    const email = document.getElementById('searchEmail').value.trim();
    const date = document.getElementById('searchDate').value;
    
    if (!email || !date) {
        alert('Vul beide velden in');
        return;
    }
    
    try {
        console.log('🔍 Searching for appointment with:', { email, date });
        
        // First try a simple query without date filters
        console.log('🔍 Trying simple email query...');
        const { data: allAppointments, error: simpleError } = await window.supabaseClient
            .from('boekingen')
            .select('*')
            .eq('email', email);
        
        console.log('🔍 Simple query result:', { allAppointments, simpleError });
        
        if (simpleError) {
            console.error('❌ Simple query failed:', simpleError);
            alert('Er is een fout opgetreden bij het zoeken: ' + simpleError.message);
            return;
        }
        
        // Filter by date in JavaScript
        const appointment = allAppointments.filter(apt => {
            const aptDate = new Date(apt.datumtijd).toISOString().split('T')[0];
            return aptDate === date;
        });
        
        console.log('🔍 Filtered appointments:', appointment);
        
        if (!appointment || appointment.length === 0) {
            console.log('❌ No appointments found for this date');
            showNoResult();
            return;
        }
        
        console.log('✅ Found appointments:', appointment.length);
        
        // Show all appointments if multiple found
        if (appointment.length === 1) {
            // Single appointment - show directly
            const selectedAppointment = appointment[0];
            const kapperData = await getKapperData(selectedAppointment.kapper_id);
            const serviceData = await getServiceData(selectedAppointment.dienst_id);
            
            const appointmentWithDetails = {
                ...selectedAppointment,
                kappers: kapperData,
                diensten: serviceData
            };
            
            currentAppointment = appointmentWithDetails;
            showAppointment(appointmentWithDetails);
        } else {
            // Multiple appointments - show list
            multipleAppointments = appointment;
            showMultipleAppointments(appointment);
        }
    } catch (error) {
        console.error('Error searching appointment:', error);
        alert('Er is een fout opgetreden bij het zoeken');
    }
}

function showAppointment(appointment) {
    const appointmentDate = new Date(appointment.datumtijd);
    const time = appointmentDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    const date = appointmentDate.toLocaleDateString('nl-NL');
    
    // Add back button if there are multiple appointments
    const backButton = multipleAppointments.length > 1 ? 
        '<button id="backToList" class="btn btn-secondary" style="margin-bottom: 15px;">← Terug naar lijst</button>' : '';
    
    // Check if cancellation and modification are allowed
    const canCancel = canCancelAppointment(appointment);
    const canModify = canModifyAppointment(appointment);
    const cancelButtonText = canCancel ? 'Annuleer Afspraak' : 'Annulering Niet Mogelijk';
    const cancelButtonClass = canCancel ? 'btn-danger' : 'btn-disabled';
    const cancelButtonDisabled = canCancel ? '' : 'disabled';
    
    document.getElementById('appointmentDetails').innerHTML = `
        ${backButton}
        <div class="appointment-info">
            <p><strong>Klant:</strong> ${appointment.klantnaam}</p>
            <p><strong>Email:</strong> ${appointment.email}</p>
            <p><strong>Telefoon:</strong> ${appointment.telefoon || 'Niet opgegeven'}</p>
            <p><strong>Datum:</strong> ${date}</p>
            <p><strong>Tijd:</strong> ${time}</p>
            <p><strong>Kapper:</strong> ${appointment.kappers?.naam || 'Onbekend'}</p>
            <p><strong>Dienst:</strong> ${appointment.diensten?.naam || 'Onbekend'} (€${appointment.diensten?.prijs_euro || '0'})</p>
            ${!canCancel && !canModify ? '<p style="color: #e74c3c; font-weight: bold; margin-top: 15px;">⚠️ Annuleren & wijzigen kan alleen tot 24 uur van tevoren</p>' : ''}
            ${!canCancel && canModify ? '<p style="color: #e74c3c; font-weight: bold; margin-top: 15px;">⚠️ Annuleren kan alleen tot 24 uur van tevoren</p>' : ''}
            ${canCancel && !canModify ? '<p style="color: #e74c3c; font-weight: bold; margin-top: 15px;">⚠️ Wijzigen kan alleen tot 24 uur van tevoren</p>' : ''}
        </div>
    `;
    
    // Update the delete button
    const deleteBtn = document.getElementById('deleteBtn');
    console.log('Delete button found:', deleteBtn, 'Can cancel:', canCancel);
    
    if (deleteBtn) {
        if (canCancel) {
            deleteBtn.textContent = '🗑️ Annuleer Afspraak';
            deleteBtn.className = 'btn btn-danger';
            deleteBtn.disabled = false;
        } else {
            deleteBtn.textContent = 'Annulering Niet Mogelijk';
            deleteBtn.className = 'btn btn-disabled';
            deleteBtn.disabled = true;
        }
    } else {
        console.error('Delete button not found!');
    }
    
    // Ensure event listener is properly attached
    deleteBtn.removeEventListener('click', deleteAppointment);
    deleteBtn.addEventListener('click', deleteAppointment);
    
    // Alternative: also try to find by class or other attributes
    const deleteBtnAlt = document.querySelector('[id="deleteBtn"], .delete-emoji, button[class*="btn-danger"]');
    if (deleteBtnAlt && deleteBtnAlt !== deleteBtn) {
        console.log('Found alternative delete button, adding listener');
        deleteBtnAlt.removeEventListener('click', deleteAppointment);
        deleteBtnAlt.addEventListener('click', deleteAppointment);
    }
    
    // Update the edit button - hide completely if modification not allowed
    const editBtn = document.getElementById('editBtn');
    if (!canModify) {
        editBtn.style.display = 'none';
    } else {
        editBtn.style.display = 'inline-block';
        editBtn.textContent = 'Wijzig Afspraak';
        editBtn.className = 'btn btn-primary';
        editBtn.disabled = false;
    }
    
    document.getElementById('searchResult').style.display = 'block';
    document.getElementById('noResult').style.display = 'none';
    
    // Add back button event listener
    const backBtn = document.getElementById('backToList');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showMultipleAppointments(multipleAppointments);
        });
    }
}

function showNoResult() {
    document.getElementById('searchResult').style.display = 'none';
    document.getElementById('noResult').style.display = 'block';
}

async function showMultipleAppointments(appointments) {
    console.log('📋 Showing multiple appointments:', appointments.length);
    
    // Create appointments list HTML
    let appointmentsHTML = '<h3>Meerdere Afspraken Gevonden</h3>';
    appointmentsHTML += '<p>Je hebt meerdere afspraken op deze datum. Kies welke je wilt wijzigen:</p>';
    appointmentsHTML += '<div class="appointments-list">';
    
    for (let i = 0; i < appointments.length; i++) {
        const appointment = appointments[i];
        const appointmentDate = new Date(appointment.datumtijd);
        const time = appointmentDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        
        // Get kapper and service data
        const kapperData = await getKapperData(appointment.kapper_id);
        const serviceData = await getServiceData(appointment.dienst_id);
        
        appointmentsHTML += `
            <div class="appointment-item" data-appointment-id="${appointment.id}">
                <div class="appointment-time">${time}</div>
                <div class="appointment-details">
                    <div class="appointment-service">${serviceData?.naam || 'Onbekend'}</div>
                    <div class="appointment-kapper">${kapperData?.naam || 'Onbekend'}</div>
                    <div class="appointment-price">€${serviceData?.prijs_euro || '0'}</div>
                </div>
                <button class="btn btn-primary select-appointment" data-appointment-id="${appointment.id}">
                    Selecteer
                </button>
            </div>
        `;
    }
    
    appointmentsHTML += '</div>';
    
    document.getElementById('appointmentDetails').innerHTML = appointmentsHTML;
    document.getElementById('searchResult').style.display = 'block';
    document.getElementById('noResult').style.display = 'none';
    
    // Add event listeners to select buttons
    document.querySelectorAll('.select-appointment').forEach(button => {
        button.addEventListener('click', async (e) => {
            const appointmentId = e.target.dataset.appointmentId;
            const selectedAppointment = appointments.find(apt => apt.id == appointmentId);
            
            if (selectedAppointment) {
                const kapperData = await getKapperData(selectedAppointment.kapper_id);
                const serviceData = await getServiceData(selectedAppointment.dienst_id);
                
                const appointmentWithDetails = {
                    ...selectedAppointment,
                    kappers: kapperData,
                    diensten: serviceData
                };
                
                currentAppointment = appointmentWithDetails;
                showAppointment(appointmentWithDetails);
            }
        });
    });
}

async function showEditForm() {
    if (!currentAppointment) return;
    
    // Show loading state
    const timeSelect = document.getElementById('editTime');
    timeSelect.innerHTML = '<option value="">Laden...</option>';
    timeSelect.disabled = true;
    
    // Populate edit form with current data
    const appointmentDate = new Date(currentAppointment.datumtijd);
    const currentTime = appointmentDate.toTimeString().slice(0, 5); // HH:MM format
    
    document.getElementById('editDate').value = appointmentDate.toISOString().split('T')[0];
    document.getElementById('editKapper').value = currentAppointment.kapper_id;
    document.getElementById('editService').value = currentAppointment.dienst_id;
    
    // Show edit form immediately
    document.getElementById('editForm').style.display = 'block';
    document.querySelector('.appointment-actions').style.display = 'none';
    
    try {
        // Load available times for selected date
        await loadAvailableTimes(appointmentDate.toISOString().split('T')[0], currentAppointment.kapper_id);
        
        // Set current time as selected after loading available times
        timeSelect.value = currentTime;
        timeSelect.disabled = false;
        
        console.log('🕐 Set current time in edit form:', currentTime);
    } catch (error) {
        console.error('Error loading times:', error);
        timeSelect.innerHTML = '<option value="">Fout bij laden</option>';
        timeSelect.disabled = true;
    }
}

function hideEditForm() {
    document.getElementById('editForm').style.display = 'none';
    document.querySelector('.appointment-actions').style.display = 'block';
}

async function loadAvailableTimes(date, kapperId) {
    try {
        console.log('🕐 Loading available times for:', { date, kapperId });
        
        // Load data in parallel for better performance
        const [availabilityResult, bookedTimesResult] = await Promise.all([
            window.supabaseClient
                .from('kapper_availability')
                .select('*')
                .eq('kapper_id', kapperId),
            window.supabaseClient
                .from('boekingen')
                .select('datumtijd, dienst_id')
                .eq('kapper_id', kapperId)
                .gte('datumtijd', `${date}T00:00:00`)
                .lt('datumtijd', `${date}T23:59:59`)
        ]);
        
        const availability = availabilityResult.data;
        const bookedTimes = bookedTimesResult.data;
        
        console.log('📅 Booked times:', bookedTimes);
        
        // Generate time slots based on kapper availability
        const timeSelect = document.getElementById('editTime');
        timeSelect.innerHTML = '<option value="">Selecteer tijd...</option>';
        
        // Use the new kapper availability function
        const slots = await generateKapperAvailableSlots(kapperId, date);
        
        if (slots.length > 0) {
            
            // Get selected service duration
            const selectedServiceId = document.getElementById('editService').value;
            const serviceDuration = selectedServiceId ? await getServiceDuration(selectedServiceId) : 30;
            
            console.log('⏱️ Service duration:', serviceDuration, 'minutes');
            
            // Filter out overlapping times
            const availableSlots = await filterAvailableSlots(slots, bookedTimes, serviceDuration, currentAppointment?.id);
            
            // Get current appointment time to ensure it's always available
            const currentTime = currentAppointment ? 
                new Date(currentAppointment.datumtijd).toTimeString().slice(0, 5) : null;
            
            availableSlots.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot;
                option.textContent = slot;
                
                // Mark current time with special styling
                if (currentTime && slot === currentTime) {
                    option.textContent += ' (huidige tijd)';
                    option.style.fontWeight = 'bold';
                }
                
                timeSelect.appendChild(option);
            });
            
            // If current time is not in available slots, add it anyway
            if (currentTime && !availableSlots.includes(currentTime)) {
                const currentOption = document.createElement('option');
                currentOption.value = currentTime;
                currentOption.textContent = `${currentTime} (huidige tijd)`;
                currentOption.style.fontWeight = 'bold';
                timeSelect.appendChild(currentOption);
                console.log('🕐 Added current time to options:', currentTime);
            }
            
            // Add message if no slots available
            if (availableSlots.length === 0 && !currentTime) {
                const noSlotsOption = document.createElement('option');
                noSlotsOption.value = '';
                noSlotsOption.textContent = 'Geen beschikbare tijden (overlap met andere afspraken)';
                noSlotsOption.disabled = true;
                timeSelect.appendChild(noSlotsOption);
            }
            
            console.log('✅ Available slots:', availableSlots.length);
        }
    } catch (error) {
        console.error('Error loading available times:', error);
    }
}

function generateTimeSlots(startTime, endTime) {
    const slots = [];
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    let current = new Date(start);
    while (current < end) {
        slots.push(current.toTimeString().slice(0, 5));
        current.setMinutes(current.getMinutes() + 15);
    }
    
    return slots;
}

async function getServiceDuration(serviceId) {
    try {
        const { data, error } = await window.supabaseClient
            .from('diensten')
            .select('duur_minuten')
            .eq('id', serviceId)
            .single();
        
        if (error) throw error;
        return data?.duur_minuten || 30;
    } catch (error) {
        console.error('Error fetching service duration:', error);
        return 30;
    }
}

async function filterAvailableSlots(slots, bookedTimes, serviceDuration, currentAppointmentId) {
    const availableSlots = [];
    
    console.log('🔍 Filtering slots:', { slots: slots.length, bookedTimes: bookedTimes.length, serviceDuration, currentAppointmentId });
    
    for (const slot of slots) {
        const slotStart = new Date(`2000-01-01T${slot}:00`);
        const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);
        
        let hasOverlap = false;
        
        for (const booking of bookedTimes) {
            // Skip current appointment when checking overlaps
            if (booking.id === currentAppointmentId) {
                console.log(`⏭️ Skipping current appointment ${booking.id}`);
                continue;
            }
            
            // Use old method - calculate end time from service duration
            const bookingStart = new Date(booking.datumtijd);
            const bookingServiceDuration = await getServiceDuration(booking.dienst_id);
            const bookingEnd = new Date(bookingStart.getTime() + bookingServiceDuration * 60000);
            
            console.log(`Checking overlap: slot ${slot} (${slotStart.toTimeString().slice(0, 5)}-${slotEnd.toTimeString().slice(0, 5)}) vs booking ${booking.datumtijd} (${bookingStart.toTimeString().slice(0, 5)}-${bookingEnd.toTimeString().slice(0, 5)})`);
            
            // Check for overlap - two time ranges overlap if one starts before the other ends
            if (slotStart < bookingEnd && slotEnd > bookingStart) {
                console.log(`❌ Slot ${slot} overlaps with booking ${booking.datumtijd} (${bookingServiceDuration}min)`);
                hasOverlap = true;
                break;
            }
        }
        
        if (!hasOverlap) {
            availableSlots.push(slot);
            console.log(`✅ Slot ${slot} is available`);
        }
    }
    
    console.log('📋 Final available slots:', availableSlots);
    return availableSlots;
}

async function updateAppointment(e) {
    e.preventDefault();
    
    if (!currentAppointment) return;
    
    // Check if modification is allowed (24 hours in advance)
    if (!canModifyAppointment(currentAppointment)) {
        const appointmentDate = new Date(currentAppointment.datumtijd);
        const appointmentDateStr = appointmentDate.toLocaleDateString('nl-NL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        showConfirmation(
            'Wijziging Niet Mogelijk', 
            `Je kunt deze afspraak niet meer wijzigen.\n\n` +
            `Afspraak: ${appointmentDateStr}\n` +
            `Regel: Wijzigen kan alleen tot 24 uur van tevoren.\n\n` +
            `Neem contact op met de kapper voor wijzigingen op korte termijn.`
        );
        return;
    }
    
    const newDate = document.getElementById('editDate').value;
    const newTime = document.getElementById('editTime').value;
    const newKapper = document.getElementById('editKapper').value;
    const newService = document.getElementById('editService').value;
    
    if (!newDate || !newTime || !newKapper || !newService) {
        alert('Vul alle velden in');
        return;
    }
    
    try {
        const newBeginTijd = `${newDate}T${newTime}:00`;
        
        // Calculate end time based on service duration
        const serviceDuration = await getServiceDuration(newService);
        const beginDateTime = new Date(newBeginTijd);
        const eindDateTime = new Date(beginDateTime.getTime() + serviceDuration * 60000);
        const newEindTijd = eindDateTime.toISOString();
        
        // Try to update with new columns first
        let updateData = {
            datumtijd: newBeginTijd,
            kapper_id: parseInt(newKapper),
            dienst_id: parseInt(newService)
        };
        
        // Temporarily use old method until database constraints are fixed
        console.log('Using old method until database constraints are fixed');
        const { error } = await window.supabaseClient
            .from('boekingen')
            .update(updateData)
            .eq('id', currentAppointment.id);
        
        if (error) throw error;
        console.log("Afspraak gewijzigd met oude methode");
        
        showConfirmation('Afspraak Gewijzigd', 'Je afspraak is succesvol gewijzigd!');
        
        // Refresh appointment data
        await searchAppointment({ preventDefault: () => {} });
        hideEditForm();
        
    } catch (error) {
        console.error('Error updating appointment:', error);
        alert('Er is een fout opgetreden bij het wijzigen');
    }
}

// Check if appointment can be cancelled (24 hours in advance)
function canCancelAppointment(appointment) {
    if (!appointment || !appointment.datumtijd) return false;
    
    const appointmentDate = new Date(appointment.datumtijd);
    const now = new Date();
    const timeDiff = appointmentDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    console.log(`Appointment: ${appointmentDate.toLocaleString()}`);
    console.log(`Now: ${now.toLocaleString()}`);
    console.log(`Hours difference: ${hoursDiff.toFixed(2)}`);
    
    return hoursDiff >= 24;
}

// Check if appointment can be modified (24 hours in advance)
function canModifyAppointment(appointment) {
    if (!appointment || !appointment.datumtijd) return false;
    
    const appointmentDate = new Date(appointment.datumtijd);
    const now = new Date();
    const timeDiff = appointmentDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    console.log(`Appointment: ${appointmentDate.toLocaleString()}`);
    console.log(`Now: ${now.toLocaleString()}`);
    console.log(`Hours difference: ${hoursDiff.toFixed(2)}`);
    
    return hoursDiff >= 24;
}

async function deleteAppointment(event) {
    console.log('deleteAppointment called', event);
    event?.preventDefault?.(); // Prevent default behavior if any
    
    if (!currentAppointment) {
        console.log('No current appointment, returning');
        return;
    }
    
    console.log('Checking if cancellation is allowed...');
    // Check if cancellation is allowed (24 hours in advance)
    if (!canCancelAppointment(currentAppointment)) {
        const appointmentDate = new Date(currentAppointment.datumtijd);
        const appointmentDateStr = appointmentDate.toLocaleDateString('nl-NL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        showConfirmation(
            'Annulering Niet Mogelijk', 
            `Je kunt deze afspraak niet meer annuleren.\n\n` +
            `Afspraak: ${appointmentDateStr}\n` +
            `Regel: Annuleren kan alleen tot 24 uur van tevoren.\n\n` +
            `Neem contact op met de kapper voor annulering op korte termijn.`
        );
        return;
    }
    
    const appointmentDate = new Date(currentAppointment.datumtijd);
    const appointmentDateStr = appointmentDate.toLocaleDateString('nl-NL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Show custom confirmation dialog and wait for user response
    console.log('Showing delete confirmation dialog');
    const confirmed = await showDeleteConfirmation(currentAppointment, appointmentDateStr);
    
    if (!confirmed) {
        console.log('User cancelled the deletion');
        return;
    }
    
    console.log('User confirmed deletion, proceeding...');
    await confirmDeleteAppointment(currentAppointment);
}

function showDeleteConfirmation(appointment, appointmentDateStr) {
    return new Promise((resolve) => {
        // Prevent multiple confirmations
        const existing = document.getElementById('deleteConfirmationPopup');
        if (existing) {
            resolve(false);
            return;
        }
        
        const message = `Weet je zeker dat je deze afspraak wilt annuleren?\n\nAfspraak: ${appointmentDateStr}\n\nJe kunt tot 24 uur van tevoren gratis annuleren.`;
        
        // Create custom confirmation dialog
        const confirmationHtml = `
            <div id="deleteConfirmationPopup" class="popup" style="display: flex;">
                <div class="popup-content">
                    <h3>Bevestig Annulering</h3>
                    <p style="white-space: pre-line; margin: 20px 0;">${message}</p>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="cancelDeleteBtn" class="btn btn-secondary">Annuleren</button>
                        <button id="confirmDeleteBtn" class="btn btn-danger">Ja, Annuleer</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add new confirmation
        document.body.insertAdjacentHTML('beforeend', confirmationHtml);
        
        // Add event listeners only once
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
            console.log('Cancel delete button clicked');
            hideDeleteConfirmation();
            resolve(false);
        });
        
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            console.log('Confirm delete button clicked');
            hideDeleteConfirmation();
            resolve(true);
        });
    });
}

function hideDeleteConfirmation() {
    const popup = document.getElementById('deleteConfirmationPopup');
    if (popup) {
        popup.remove();
    }
}

async function confirmDeleteAppointment(appointment) {
    try {
        const { error } = await window.supabaseClient
            .from('boekingen')
            .delete()
            .eq('id', appointment.id);
        
        if (error) throw error;
        
        showConfirmation('Afspraak Geannuleerd', 'Je afspraak is succesvol geannuleerd!');
        
        // Clear form
        document.getElementById('searchForm').reset();
        document.getElementById('searchResult').style.display = 'none';
        document.getElementById('noResult').style.display = 'none';
        currentAppointment = null;
        
    } catch (error) {
        console.error('Error deleting appointment:', error);
        alert('Er is een fout opgetreden bij het annuleren');
    }
}

function showConfirmation(title, message) {
    document.getElementById('confirmationTitle').textContent = title;
    document.getElementById('confirmationMessage').textContent = message;
    document.getElementById('confirmationPopup').style.display = 'flex';
}

function hideConfirmation() {
    document.getElementById('confirmationPopup').style.display = 'none';
}
