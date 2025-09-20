// Test script to create random appointments for statistics testing
// Run this in browser console on admin page

async function createTestAppointments() {
  const sb = window.supabase;
  
  if (!sb) {
    console.error('Supabase client not found');
    return;
  }

  // Get available services and barbers
  const [servicesResult, barbersResult] = await Promise.all([
    sb.from('diensten').select('*'),
    sb.from('barbers').select('*')
  ]);

  if (servicesResult.error || barbersResult.error) {
    console.error('Error fetching data:', servicesResult.error || barbersResult.error);
    return;
  }

  const services = servicesResult.data;
  const barbers = barbersResult.data;

  if (services.length === 0 || barbers.length === 0) {
    console.error('No services or barbers found');
    return;
  }

  // Create test appointments for the next 7 days
  const appointments = [];
  const today = new Date();
  
  for (let i = 0; i < 10; i++) {
    // Random date in next 7 days
    const randomDays = Math.floor(Math.random() * 7);
    const appointmentDate = new Date(today);
    appointmentDate.setDate(today.getDate() + randomDays);
    
    // Random time between 9:00 and 17:00
    const randomHour = 9 + Math.floor(Math.random() * 8);
    const randomMinute = Math.random() < 0.5 ? 0 : 30;
    
    // Random service and barber
    const randomService = services[Math.floor(Math.random() * services.length)];
    const randomBarber = barbers[Math.floor(Math.random() * barbers.length)];
    
    // Random customer data
    const customers = [
      { name: 'Jan Jansen', email: 'jan@test.com', phone: '06-12345678' },
      { name: 'Marie de Vries', email: 'marie@test.com', phone: '06-23456789' },
      { name: 'Piet Bakker', email: 'piet@test.com', phone: '06-34567890' },
      { name: 'Lisa van Dijk', email: 'lisa@test.com', phone: '06-45678901' },
      { name: 'Tom Mulder', email: 'tom@test.com', phone: '06-56789012' }
    ];
    
    const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
    
    // Create appointment datetime
    const appointmentDateTime = new Date(appointmentDate);
    appointmentDateTime.setHours(randomHour, randomMinute, 0, 0);
    
    const appointment = {
      klantnaam: randomCustomer.name,
      email: randomCustomer.email,
      telefoon: randomCustomer.phone,
      barber_id: randomBarber.id,
      dienst_id: randomService.id,
      datumtijd: appointmentDateTime.toISOString(),
      status: 'bevestigd'
    };
    
    appointments.push(appointment);
  }

  // Insert appointments
  console.log('Creating test appointments:', appointments);
  
  const { data, error } = await sb
    .from('boekingen')
    .insert(appointments);

  if (error) {
    console.error('Error creating appointments:', error);
  } else {
    console.log('Successfully created test appointments:', data);
    alert(`✅ ${appointments.length} test afspraken toegevoegd!`);
  }
}

// Run the function
createTestAppointments();
