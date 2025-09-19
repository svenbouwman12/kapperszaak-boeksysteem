// Script om random afspraken te maken voor week 15-21 september 2025
// Dit script kan je uitvoeren in de browser console op je admin pagina

const randomAppointments = [
  // Maandag 15 september 2025
  {
    klantnaam: "Jan de Vries",
    email: "jan.devries@email.com",
    telefoon: "06-12345678",
    barber_id: 1,
    dienst_id: 1,
    datumtijd: "2025-09-15T09:30:00"
  },
  {
    klantnaam: "Lisa van der Berg",
    email: "lisa.vandenberg@email.com",
    telefoon: "06-23456789",
    barber_id: 2,
    dienst_id: 2,
    datumtijd: "2025-09-15T14:00:00"
  },
  
  // Dinsdag 16 september 2025
  {
    klantnaam: "Mohammed Ali",
    email: "mohammed.ali@email.com",
    telefoon: "06-34567890",
    barber_id: 1,
    dienst_id: 3,
    datumtijd: "2025-09-16T10:15:00"
  },
  {
    klantnaam: "Emma Bakker",
    email: "emma.bakker@email.com",
    telefoon: "06-45678901",
    barber_id: 2,
    dienst_id: 1,
    datumtijd: "2025-09-16T15:30:00"
  },
  
  // Woensdag 17 september 2025
  {
    klantnaam: "Piet Jansen",
    email: "piet.jansen@email.com",
    telefoon: "06-56789012",
    barber_id: 1,
    dienst_id: 2,
    datumtijd: "2025-09-17T11:00:00"
  },
  {
    klantnaam: "Sophie Mulder",
    email: "sophie.mulder@email.com",
    telefoon: "06-67890123",
    barber_id: 2,
    dienst_id: 3,
    datumtijd: "2025-09-17T16:45:00"
  },
  
  // Donderdag 18 september 2025
  {
    klantnaam: "Ahmed Hassan",
    email: "ahmed.hassan@email.com",
    telefoon: "06-78901234",
    barber_id: 1,
    dienst_id: 1,
    datumtijd: "2025-09-18T13:30:00"
  },
  {
    klantnaam: "Marieke Visser",
    email: "marieke.visser@email.com",
    telefoon: "06-89012345",
    barber_id: 2,
    dienst_id: 2,
    datumtijd: "2025-09-18T09:45:00"
  },
  
  // Vrijdag 19 september 2025
  {
    klantnaam: "Tom de Wit",
    email: "tom.dewit@email.com",
    telefoon: "06-90123456",
    barber_id: 1,
    dienst_id: 3,
    datumtijd: "2025-09-19T14:15:00"
  },
  {
    klantnaam: "Anna Smit",
    email: "anna.smit@email.com",
    telefoon: "06-01234567",
    barber_id: 2,
    dienst_id: 1,
    datumtijd: "2025-09-19T10:30:00"
  }
];

// Functie om afspraken toe te voegen
async function createRandomAppointments() {
  console.log("🎯 Starting to create random appointments...");
  
  // Check if supabase is available
  if (typeof window.supabase === 'undefined') {
    console.error("❌ Supabase client not found. Make sure you're on the admin page.");
    return;
  }
  
  const supabase = window.supabase;
  
  try {
    // Insert all appointments
    const { data, error } = await supabase
      .from('boekingen')
      .insert(randomAppointments);
    
    if (error) {
      console.error("❌ Error creating appointments:", error);
      return;
    }
    
    console.log("✅ Successfully created 10 random appointments!");
    console.log("📅 Week: 15-21 September 2025");
    console.log("👥 Appointments created:", randomAppointments.length);
    
    // Show summary
    randomAppointments.forEach((apt, index) => {
      const date = new Date(apt.datumtijd);
      console.log(`${index + 1}. ${apt.klantnaam} - ${date.toLocaleDateString('nl-NL')} ${date.toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'})}`);
    });
    
    // Refresh the admin page to show new appointments
    if (typeof loadWeekAppointments === 'function') {
      loadWeekAppointments();
    }
    
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

// Export the function to global scope
window.createRandomAppointments = createRandomAppointments;

console.log("🎯 Random appointments script loaded!");
console.log("💡 Run createRandomAppointments() in the console to create 10 random appointments for week 15-21 September 2025");
