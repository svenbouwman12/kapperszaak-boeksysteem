// wijzig-afspraak.js
let currentAppointment = null;
let allBarbers = [];
let allServices = [];

document.addEventListener('DOMContentLoaded', async () => {
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
    document.getElementById('editBtn').addEventListener('click', showEditForm);
    document.getElementById('cancelEdit').addEventListener('click', hideEditForm);
    document.getElementById('updateForm').addEventListener('submit', updateAppointment);
    document.getElementById('deleteBtn').addEventListener('click', deleteAppointment);
    
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

async function searchAppointment(e) {
    e.preventDefault();
    
    const email = document.getElementById('searchEmail').value.trim();
    const date = document.getElementById('searchDate').value;
    
    if (!email || !date) {
        alert('Vul beide velden in');
        return;
    }
    
    try {
        // Search for appointment
        const { data, error } = await window.supabaseClient
            .from('boekingen')
            .select(`
                *,
                barbers:barber_id(naam),
                diensten:dienst_id(naam, prijs_euro)
            `)
            .eq('email', email)
            .gte('datumtijd', `${date}T00:00:00`)
            .lt('datumtijd', `${date}T23:59:59`)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                // No rows found
                showNoResult();
            } else {
                throw error;
            }
        } else {
            currentAppointment = data;
            showAppointment(data);
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
    
    document.getElementById('appointmentDetails').innerHTML = `
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
}

function showNoResult() {
    document.getElementById('searchResult').style.display = 'none';
    document.getElementById('noResult').style.display = 'block';
}

function showEditForm() {
    if (!currentAppointment) return;
    
    // Populate edit form with current data
    const appointmentDate = new Date(currentAppointment.datumtijd);
    document.getElementById('editDate').value = appointmentDate.toISOString().split('T')[0];
    document.getElementById('editBarber').value = currentAppointment.barber_id;
    document.getElementById('editService').value = currentAppointment.dienst_id;
    
    // Load available times for selected date
    loadAvailableTimes(appointmentDate.toISOString().split('T')[0], currentAppointment.barber_id);
    
    document.getElementById('editForm').style.display = 'block';
    document.querySelector('.appointment-actions').style.display = 'none';
}

function hideEditForm() {
    document.getElementById('editForm').style.display = 'none';
    document.querySelector('.appointment-actions').style.display = 'block';
}

async function loadAvailableTimes(date, barberId) {
    try {
        // Get barber availability
        const { data: availability } = await window.supabaseClient
            .from('barber_availability')
            .select('*')
            .eq('barber_id', barberId);
        
        // Get booked times for this date
        const { data: bookedTimes } = await window.supabaseClient
            .from('boekingen')
            .select('datumtijd, dienst_id')
            .eq('barber_id', barberId)
            .gte('datumtijd', `${date}T00:00:00`)
            .lt('datumtijd', `${date}T23:59:59`);
        
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
            
            // Filter out booked times
            const bookedSlots = new Set();
            bookedTimes?.forEach(booking => {
                const bookingTime = new Date(booking.datumtijd);
                const timeStr = bookingTime.toTimeString().slice(0, 5);
                bookedSlots.add(timeStr);
            });
            
            slots.forEach(slot => {
                if (!bookedSlots.has(slot)) {
                    const option = document.createElement('option');
                    option.value = slot;
                    option.textContent = slot;
                    timeSelect.appendChild(option);
                }
            });
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
        const newDateTime = `${newDate}T${newTime}:00`;
        
        const { error } = await window.supabaseClient
            .from('boekingen')
            .update({
                datumtijd: newDateTime,
                barber_id: parseInt(newBarber),
                dienst_id: parseInt(newService)
            })
            .eq('id', currentAppointment.id);
        
        if (error) throw error;
        
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
