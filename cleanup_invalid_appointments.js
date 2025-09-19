// Cleanup script for appointments that end after barber shift end time
// Run this in the browser console on the admin page

async function cleanupInvalidAppointments() {
  console.log('🔍 Starting cleanup of invalid appointments...');
  
  try {
    // Get all appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('boekingen')
      .select('*')
      .order('datumtijd');
    
    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return;
    }
    
    console.log(`📊 Found ${appointments.length} total appointments`);
    
    // Get all barbers and their availability
    const { data: barbers, error: barbersError } = await supabase
      .from('barbers')
      .select('*');
    
    if (barbersError) {
      console.error('Error fetching barbers:', barbersError);
      return;
    }
    
    // Get all services and their durations
    const { data: services, error: servicesError } = await supabase
      .from('diensten')
      .select('*');
    
    if (servicesError) {
      console.error('Error fetching services:', servicesError);
      return;
    }
    
    // Get barber availability
    const { data: availability, error: availabilityError } = await supabase
      .from('barber_availability')
      .select('*');
    
    if (availabilityError) {
      console.error('Error fetching availability:', availabilityError);
      return;
    }
    
    // Create lookup maps
    const barberMap = {};
    barbers.forEach(barber => {
      barberMap[barber.id] = barber;
    });
    
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id] = service;
    });
    
    const availabilityMap = {};
    availability.forEach(avail => {
      const key = `${avail.barber_id}_${avail.day_of_week}`;
      availabilityMap[key] = avail;
    });
    
    // Check each appointment
    const invalidAppointments = [];
    
    for (const appointment of appointments) {
      const appointmentDate = new Date(appointment.datumtijd);
      const dayOfWeek = appointmentDate.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      
      const barber = barberMap[appointment.barber_id];
      const service = serviceMap[appointment.dienst_id];
      const workingHours = availabilityMap[`${appointment.barber_id}_${dayName}`];
      
      if (!barber || !service || !workingHours) {
        console.warn(`⚠️ Missing data for appointment ${appointment.id}:`, {
          barber: !!barber,
          service: !!service,
          workingHours: !!workingHours
        });
        continue;
      }
      
      // Calculate appointment end time
      const appointmentStart = new Date(appointment.datumtijd);
      const appointmentEnd = new Date(appointmentStart.getTime() + service.duur_minuten * 60000);
      
      // Parse shift end time
      const shiftEndTime = workingHours.end || '17:00';
      const [shiftEndHour, shiftEndMin] = shiftEndTime.split(':').map(Number);
      const shiftEndDate = new Date(appointmentDate);
      shiftEndDate.setHours(shiftEndHour, shiftEndMin, 0, 0);
      
      // Check if appointment ends after shift end
      if (appointmentEnd > shiftEndDate) {
        invalidAppointments.push({
          appointment,
          barber: barber.naam,
          service: service.naam,
          appointmentStart: appointmentStart.toLocaleString('nl-NL'),
          appointmentEnd: appointmentEnd.toLocaleString('nl-NL'),
          shiftEnd: shiftEndDate.toLocaleString('nl-NL'),
          duration: service.duur_minuten
        });
      }
    }
    
    console.log(`❌ Found ${invalidAppointments.length} invalid appointments:`);
    
    invalidAppointments.forEach((item, index) => {
      console.log(`${index + 1}. Appointment ${item.appointment.id}:`);
      console.log(`   Barber: ${item.barber}`);
      console.log(`   Service: ${item.service} (${item.duration} min)`);
      console.log(`   Start: ${item.appointmentStart}`);
      console.log(`   End: ${item.appointmentEnd}`);
      console.log(`   Shift End: ${item.shiftEnd}`);
      console.log('');
    });
    
    if (invalidAppointments.length === 0) {
      console.log('✅ All appointments are valid!');
      return;
    }
    
    // Ask user if they want to delete invalid appointments
    const shouldDelete = confirm(
      `Found ${invalidAppointments.length} invalid appointments that end after barber shift end time.\n\n` +
      `Would you like to delete these appointments?\n\n` +
      `This action cannot be undone!`
    );
    
    if (shouldDelete) {
      console.log('🗑️ Deleting invalid appointments...');
      
      const appointmentIds = invalidAppointments.map(item => item.appointment.id);
      
      const { error: deleteError } = await supabase
        .from('boekingen')
        .delete()
        .in('id', appointmentIds);
      
      if (deleteError) {
        console.error('Error deleting appointments:', deleteError);
        return;
      }
      
      console.log(`✅ Successfully deleted ${invalidAppointments.length} invalid appointments`);
      console.log('🔄 Please refresh the admin panel to see the changes');
    } else {
      console.log('❌ Cleanup cancelled by user');
    }
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Function to just check without deleting
async function checkInvalidAppointments() {
  console.log('🔍 Checking for invalid appointments...');
  
  try {
    // Get all appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('boekingen')
      .select('*')
      .order('datumtijd');
    
    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return;
    }
    
    // Get all barbers and their availability
    const { data: barbers } = await supabase.from('barbers').select('*');
    const { data: services } = await supabase.from('diensten').select('*');
    const { data: availability } = await supabase.from('barber_availability').select('*');
    
    // Create lookup maps
    const barberMap = {};
    barbers.forEach(barber => {
      barberMap[barber.id] = barber;
    });
    
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id] = service;
    });
    
    const availabilityMap = {};
    availability.forEach(avail => {
      const key = `${avail.barber_id}_${avail.day_of_week}`;
      availabilityMap[key] = avail;
    });
    
    // Check each appointment
    const invalidAppointments = [];
    
    for (const appointment of appointments) {
      const appointmentDate = new Date(appointment.datumtijd);
      const dayOfWeek = appointmentDate.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      
      const barber = barberMap[appointment.barber_id];
      const service = serviceMap[appointment.dienst_id];
      const workingHours = availabilityMap[`${appointment.barber_id}_${dayName}`];
      
      if (!barber || !service || !workingHours) continue;
      
      // Calculate appointment end time
      const appointmentStart = new Date(appointment.datumtijd);
      const appointmentEnd = new Date(appointmentStart.getTime() + service.duur_minuten * 60000);
      
      // Parse shift end time
      const shiftEndTime = workingHours.end || '17:00';
      const [shiftEndHour, shiftEndMin] = shiftEndTime.split(':').map(Number);
      const shiftEndDate = new Date(appointmentDate);
      shiftEndDate.setHours(shiftEndHour, shiftEndMin, 0, 0);
      
      // Check if appointment ends after shift end
      if (appointmentEnd > shiftEndDate) {
        invalidAppointments.push({
          id: appointment.id,
          barber: barber.naam,
          service: service.naam,
          date: appointmentDate.toLocaleDateString('nl-NL'),
          start: appointmentStart.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
          end: appointmentEnd.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
          shiftEnd: shiftEndDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
        });
      }
    }
    
    console.log(`❌ Found ${invalidAppointments.length} invalid appointments:`);
    console.table(invalidAppointments);
    
    return invalidAppointments;
    
  } catch (error) {
    console.error('Error checking appointments:', error);
  }
}

console.log('🧹 Cleanup script loaded!');
console.log('💡 Run checkInvalidAppointments() to check for invalid appointments');
console.log('💡 Run cleanupInvalidAppointments() to delete invalid appointments');
