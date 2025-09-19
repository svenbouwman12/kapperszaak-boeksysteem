// wijzig-afspraak.js
let currentAppointment = null;
let allBarbers = [];
let allServices = [];
let multipleAppointments = []; // Store multiple appointments for back navigation

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
    
    // Load barbers and services for dropdowns
    await loadBarbers();
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
    document.getElementById('deleteBtn').addEventListener('click', deleteAppointment);
    
    // Reload times when service changes
    document.getElementById('editService').addEventListener('change', async () => {
        const date = document.getElementById('editDate').value;
        const barber = document.getElementById('editBarber').value;
        if (date && barber) {
            // Show loading state
            const timeSelect = document.getElementById('editTime');
            const currentValue = timeSelect.value;
            timeSelect.innerHTML = '<option value="">Laden...</option>';
            timeSelect.disabled = true;
            
            try {
                await loadAvailableTimes(date, barber);
                
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
        const barber = document.getElementById('editBarber').value;
        if (barber) {
            await loadAvailableTimes(document.getElementById('editDate').value, barber);
        }
    });
    
    // Confirmation popup
    document.getElementById('closeConfirmation').addEventListener('click', hideConfirmation);
});

async function loadBarbers() {
    try {
        const { data, error } = await window.supabaseClient.from('barbers').select('*').order('naam');
        if (error) throw error;
        
        allBarbers = data;
        const select = document.getElementById('editBarber');
        select.innerHTML = '<option value="">Selecteer barber...</option>';
        data.forEach(barber => {
            const option = document.createElement('option');
            option.value = barber.id;
            option.textContent = barber.naam;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading barbers:', error);
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

async function getBarberData(barberId) {
    try {
        const { data, error } = await window.supabaseClient
            .from('barbers')
            .select('naam')
            .eq('id', barberId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching barber data:', error);
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
            const barberData = await getBarberData(selectedAppointment.barber_id);
            const serviceData = await getServiceData(selectedAppointment.dienst_id);
            
            const appointmentWithDetails = {
                ...selectedAppointment,
                barbers: barberData,
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
    
    document.getElementById('appointmentDetails').innerHTML = `
        ${backButton}
        <div class="appointment-info">
            <p><strong>Klant:</strong> ${appointment.klantnaam}</p>
            <p><strong>Email:</strong> ${appointment.email}</p>
            <p><strong>Telefoon:</strong> ${appointment.telefoon || 'Niet opgegeven'}</p>
            <p><strong>Datum:</strong> ${date}</p>
            <p><strong>Tijd:</strong> ${time}</p>
            <p><strong>Barber:</strong> ${appointment.barbers?.naam || 'Onbekend'}</p>
            <p><strong>Dienst:</strong> ${appointment.diensten?.naam || 'Onbekend'} (€${appointment.diensten?.prijs_euro || '0'})</p>
        </div>
    `;
    
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
        
        // Get barber and service data
        const barberData = await getBarberData(appointment.barber_id);
        const serviceData = await getServiceData(appointment.dienst_id);
        
        appointmentsHTML += `
            <div class="appointment-item" data-appointment-id="${appointment.id}">
                <div class="appointment-time">${time}</div>
                <div class="appointment-details">
                    <div class="appointment-service">${serviceData?.naam || 'Onbekend'}</div>
                    <div class="appointment-barber">${barberData?.naam || 'Onbekend'}</div>
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
                const barberData = await getBarberData(selectedAppointment.barber_id);
                const serviceData = await getServiceData(selectedAppointment.dienst_id);
                
                const appointmentWithDetails = {
                    ...selectedAppointment,
                    barbers: barberData,
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
    document.getElementById('editBarber').value = currentAppointment.barber_id;
    document.getElementById('editService').value = currentAppointment.dienst_id;
    
    // Show edit form immediately
    document.getElementById('editForm').style.display = 'block';
    document.querySelector('.appointment-actions').style.display = 'none';
    
    try {
        // Load available times for selected date
        await loadAvailableTimes(appointmentDate.toISOString().split('T')[0], currentAppointment.barber_id);
        
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

async function loadAvailableTimes(date, barberId) {
    try {
        console.log('🕐 Loading available times for:', { date, barberId });
        
        // Load data in parallel for better performance
        const [availabilityResult, bookedTimesResult] = await Promise.all([
            window.supabaseClient
                .from('barber_availability')
                .select('*')
                .eq('barber_id', barberId),
            window.supabaseClient
                .from('boekingen')
                .select('datumtijd, dienst_id')
                .eq('barber_id', barberId)
                .gte('datumtijd', `${date}T00:00:00`)
                .lt('datumtijd', `${date}T23:59:59`)
        ]);
        
        const availability = availabilityResult.data;
        const bookedTimes = bookedTimesResult.data;
        
        console.log('📅 Booked times:', bookedTimes);
        
        // Generate time slots
        const timeSelect = document.getElementById('editTime');
        timeSelect.innerHTML = '<option value="">Selecteer tijd...</option>';
        
        // Get working hours for this day
        const dayOfWeek = new Date(date).getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];
        
        const workingHours = availability?.find(avail => avail.day_of_week === dayName);
        
        if (workingHours) {
            const startTime = workingHours.start_time;
            const endTime = workingHours.end_time;
            
            // Generate 15-minute slots
            const slots = generateTimeSlots(startTime, endTime);
            
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
    
    const newDate = document.getElementById('editDate').value;
    const newTime = document.getElementById('editTime').value;
    const newBarber = document.getElementById('editBarber').value;
    const newService = document.getElementById('editService').value;
    
    if (!newDate || !newTime || !newBarber || !newService) {
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
            barber_id: parseInt(newBarber),
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

async function deleteAppointment() {
    if (!currentAppointment) return;
    
    if (!confirm('Weet je zeker dat je deze afspraak wilt annuleren?')) {
        return;
    }
    
    try {
        const { error } = await window.supabaseClient
            .from('boekingen')
            .delete()
            .eq('id', currentAppointment.id);
        
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
