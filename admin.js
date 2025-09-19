// ====================== Gebruik globale Supabase client ======================
const supabase = window.supabase;

// ====================== Tab Navigation ======================
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      // Remove active class from all buttons and panels
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));
      
      // Add active class to clicked button and corresponding panel
      button.classList.add('active');
      const targetPanel = document.getElementById(targetTab);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

// ====================== Sub-Tab Navigation ======================
function initSubTabs() {
  const subTabButtons = document.querySelectorAll('.sub-tab-btn');
  const subTabPanels = document.querySelectorAll('.sub-tab-panel');

  subTabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetSubTab = button.getAttribute('data-subtab');
      
      // Remove active class from all sub-tab buttons and panels
      subTabButtons.forEach(btn => btn.classList.remove('active'));
      subTabPanels.forEach(panel => panel.classList.remove('active'));
      
      // Add active class to clicked button and corresponding panel
      button.classList.add('active');
      const targetPanel = document.getElementById(targetSubTab + '-barbers');
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

// ====================== Auth check ======================
async function checkAuth() {
  try {
    // Wacht even om ervoor te zorgen dat de sessie volledig geladen is
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // In Supabase v2 kan getUser() een AuthSessionMissingError geven als er geen sessie is.
    // Eerst sessie checken, daarna (optioneel) user ophalen.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Auth session error:", sessionError);
      window.location.href = "admin-login.html";
      return;
    }
    if (!session) {
      console.log("No session found, redirecting to login");
      window.location.href = "admin-login.html";
      return;
    }
    console.log("Session found, user authenticated");
    // Optioneel: user ophalen indien nodig
    // const { data: { user } } = await supabase.auth.getUser();
  } catch (e) {
    console.error("Auth check error:", e);
    window.location.href = "admin-login.html";
  }
}

// ====================== Logout ======================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "admin-login.html";
  });
}

// ====================== Boekingen ======================
async function loadBoekingen() {
  const { data: boekingen, error: boekingenError } = await supabase.from("boekingen").select("*");
  const { data: barbers } = await supabase.from("barbers").select("*");
  const { data: diensten } = await supabase.from("diensten").select("*");
  const tbody = document.getElementById("boekingenBody");
  if (!tbody) return;

  if (boekingenError) {
    console.error("Fout bij laden boekingen:", boekingenError);
    return;
  }

  tbody.innerHTML = "";
  boekingen.forEach(b => {
    const barber = barbers.find(x => x.id === b.barber_id);
    const dienst = diensten.find(x => x.id === b.dienst_id);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${b.id}</td>
      <td>${b.klantnaam}</td>
      <td>${barber ? barber.naam : "[barber onbekend]"}</td>
      <td>${dienst ? dienst.naam : "[dienst onbekend]"}</td>
      <td>${new Date(b.datumtijd).toLocaleString()}</td>
      <td><button onclick="deleteBoeking(${b.id})">Verwijder</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function deleteBoeking(id) {
  if (!confirm("Weet je zeker dat je deze boeking wilt verwijderen?")) return;
  const { error } = await supabase.from("boekingen").delete().eq("id", id);
  if (error) console.error("Fout bij verwijderen:", error);
  loadBoekingen();
}

// ====================== Barbers ======================
async function loadBarbers() {
  const { data, error } = await supabase.from("barbers").select("*").order("id");
  const tbody = document.getElementById("barbersBody");
  if (!tbody) return;

  if (error) {
    console.error("Fout bij laden barbers:", error);
    return;
  }

  tbody.innerHTML = "";
  data.forEach(b => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${b.id}</td>
      <td><input type="text" value="${b.naam}" data-id="${b.id}" class="barberNameInput"></td>
      <td>
        <button class="saveBarberBtn" data-id="${b.id}">Aanpassen</button>
        <button class="deleteBarberBtn btn-danger icon-btn" title="Verwijderen" data-id="${b.id}">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Also populate the barber availability selector
  const barberSelect = document.getElementById('barberAvailabilitySelect');
  if (barberSelect) {
    barberSelect.innerHTML = '<option value="">Kies een barber...</option>';
    data.forEach(barber => {
      const option = document.createElement('option');
      option.value = barber.id;
      option.textContent = barber.naam;
      barberSelect.appendChild(option);
    });
  }

  // Edit barber
  document.querySelectorAll(".barberNameInput").forEach(input => {
    input.addEventListener("change", async () => {
      const id = input.dataset.id;
      const name = input.value.trim();
      if (!name) return alert("Naam mag niet leeg zijn");
      const { error } = await supabase.from("barbers").update({ naam: name }).eq("id", id);
      if (error) console.error(error);
      loadBarbers();
    });
  });

  // Save barber (explicit aanpassen)
  document.querySelectorAll(".saveBarberBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const input = document.querySelector(`input.barberNameInput[data-id="${id}"]`);
      const name = input ? input.value.trim() : "";
      if (!name) return alert("Naam mag niet leeg zijn");
      const { error } = await supabase.from("barbers").update({ naam: name }).eq("id", id);
      if (error) console.error(error);
      loadBarbers();
    });
  });

  // Delete barber
  document.querySelectorAll(".deleteBarberBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("Weet je zeker?")) return;
      const { error } = await supabase.from("barbers").delete().eq("id", id);
      if (error) console.error(error);
      loadBarbers();
    });
  });
}

const addBarberBtn = document.getElementById("addBarberBtn");
if (addBarberBtn) {
  addBarberBtn.addEventListener("click", async () => {
    const name = document.getElementById("newBarberName").value.trim();
    if (!name) return alert("Vul een naam in!");
    const { error } = await supabase.from("barbers").insert([{ naam: name }]);
    if (error) { console.error(error); return alert("Fout bij toevoegen"); }
    document.getElementById("newBarberName").value = "";
    loadBarbers();
  });
}

// Helper functions for appointment details
async function getServiceDuration(serviceId) {
  if (!serviceId) return 30;
  try {
    const { data, error } = await supabase.from("diensten").select("duur_minuten").eq("id", serviceId).single();
    if (error) throw error;
    return data?.duur_minuten || 30;
  } catch (e) {
    console.error("Error fetching service duration:", e);
    return 30;
  }
}

async function getServiceName(serviceId) {
  if (!serviceId) return "Onbekend";
  try {
    const { data, error } = await supabase.from("diensten").select("naam").eq("id", serviceId).single();
    if (error) throw error;
    return data?.naam || "Onbekend";
  } catch (e) {
    console.error("Error fetching service name:", e);
    return "Onbekend";
  }
}

async function getBarberName(barberId) {
  if (!barberId) return "Onbekend";
  try {
    const { data, error } = await supabase.from("barbers").select("naam").eq("id", barberId).single();
    if (error) throw error;
    return data?.naam || "Onbekend";
  } catch (e) {
    console.error("Error fetching barber name:", e);
    return "Onbekend";
  }
}

async function getServicePrice(serviceId) {
  if (!serviceId) return null;
  try {
    const { data, error } = await supabase.from("diensten").select("prijs_euro").eq("id", serviceId).single();
    if (error) throw error;
    return data?.prijs_euro || null;
  } catch (e) {
    console.error("Error fetching service price:", e);
    return null;
  }
}

// ====================== Diensten ======================
async function loadDiensten() {
  const { data, error } = await supabase.from("diensten").select("*").order("id");
  const tbody = document.getElementById("dienstenBody");
  if (!tbody) return;

  if (error) {
    console.error("Fout bij laden diensten:", error);
    return;
  }

  tbody.innerHTML = "";
  data.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.id}</td>
      <td><input type="text" value="${d.naam}" data-id="${d.id}" class="dienstNameInput"></td>
      <td><input type="number" value="${Number(d.prijs_euro ?? 0).toFixed(2)}" step="0.01" min="0" data-id="${d.id}" class="dienstPriceInput"></td>
      <td><input type="number" value="${d.duur_minuten ?? 30}" min="5" max="300" data-id="${d.id}" class="dienstDurationInput"> min</td>
      <td>
        <button class="saveDienstBtn" data-id="${d.id}">Aanpassen</button>
        <button class="deleteDienstBtn btn-danger icon-btn" title="Verwijderen" data-id="${d.id}">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Edit dienst naam
  document.querySelectorAll(".dienstNameInput").forEach(input => {
    input.addEventListener("change", async () => {
      const id = input.dataset.id;
      const name = input.value.trim();
      if (!name) return alert("Naam mag niet leeg zijn");
      const { error } = await supabase.from("diensten").update({ naam: name }).eq("id", id);
      if (error) console.error(error);
      loadDiensten();
    });
  });

  // Edit dienst prijs
  document.querySelectorAll(".dienstPriceInput").forEach(input => {
    input.addEventListener("change", async () => {
      const id = input.dataset.id;
      const price = parseFloat(input.value);
      if (isNaN(price) || price < 0) return alert("Vul een geldige prijs in");
      const { error } = await supabase.from("diensten").update({ prijs_euro: price }).eq("id", id);
      if (error) console.error(error);
      loadDiensten();
    });
  });

  // Edit dienst duur
  document.querySelectorAll(".dienstDurationInput").forEach(input => {
    input.addEventListener("change", async () => {
      const id = input.dataset.id;
      const duration = parseInt(input.value);
      if (isNaN(duration) || duration < 5 || duration > 300) return alert("Duur moet tussen 5 en 300 minuten zijn");
      const { error } = await supabase.from("diensten").update({ duur_minuten: duration }).eq("id", id);
      if (error) console.error(error);
      loadDiensten();
    });
  });

  // Save dienst (naam + prijs + duur) via knop "Aanpassen"
  document.querySelectorAll(".saveDienstBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const nameInput = document.querySelector(`input.dienstNameInput[data-id="${id}"]`);
      const priceInput = document.querySelector(`input.dienstPriceInput[data-id="${id}"]`);
      const durationInput = document.querySelector(`input.dienstDurationInput[data-id="${id}"]`);
      const name = nameInput ? nameInput.value.trim() : "";
      const price = priceInput ? parseFloat(priceInput.value) : NaN;
      const duration = durationInput ? parseInt(durationInput.value) : 30;
      if (!name) return alert("Naam mag niet leeg zijn");
      if (isNaN(price) || price < 0) return alert("Vul een geldige prijs in");
      if (isNaN(duration) || duration < 5 || duration > 300) return alert("Duur moet tussen 5 en 300 minuten zijn");
      const { error } = await supabase.from("diensten").update({ naam: name, prijs_euro: price, duur_minuten: duration }).eq("id", id);
      if (error) console.error(error);
      loadDiensten();
    });
  });

  // Delete dienst
  document.querySelectorAll(".deleteDienstBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("Weet je zeker?")) return;
      const { error } = await supabase.from("diensten").delete().eq("id", id);
      if (error) console.error(error);
      loadDiensten();
    });
  });
}

const addDienstBtn = document.getElementById("addDienstBtn");
if (addDienstBtn) {
  addDienstBtn.addEventListener("click", async () => {
    const name = document.getElementById("newDienstName").value.trim();
    const priceValue = document.getElementById("newDienstPrice").value;
    const durationValue = document.getElementById("newDienstDuration").value;
    const price = priceValue === "" ? null : parseFloat(priceValue);
    const duration = durationValue === "" ? 30 : parseInt(durationValue);
    if (!name) return alert("Vul een naam in!");
    if (price !== null && (isNaN(price) || price < 0)) return alert("Vul een geldige prijs in!");
    if (isNaN(duration) || duration < 5 || duration > 300) return alert("Duur moet tussen 5 en 300 minuten zijn!");
    const { error } = await supabase.from("diensten").insert([{ naam: name, prijs_euro: price, duur_minuten: duration }]);
    if (error) { console.error(error); return alert("Fout bij toevoegen"); }
    document.getElementById("newDienstName").value = "";
    if (document.getElementById("newDienstPrice")) document.getElementById("newDienstPrice").value = "";
    if (document.getElementById("newDienstDuration")) document.getElementById("newDienstDuration").value = "30";
    loadDiensten();
  });
}

// ====================== Initial load ======================
checkAuth().then(() => {
  loadBoekingen();
  loadBarbers();
  loadDiensten();
});

// ====================== Beschikbaarheid beheren ======================
// buildAdminTimeSlots function removed - no longer needed

// refreshAdminAvailability function removed - no longer needed

// populateAdminBarbers function removed - no longer needed

// adminBlockSelected function removed - no longer needed

// adminUnblockSelected function removed - no longer needed

// Hook up admin availability controls
// ====================== Barber Availability Management ======================
async function loadBarberAvailability(barberId) {
  if (!barberId) return;
  
  try {
    // Load existing availability for this barber
    const { data, error } = await supabase
      .from('barber_availability')
      .select('*')
      .eq('barber_id', barberId);

    if (error) {
      console.error('Error loading barber availability:', error);
      return;
    }

    // Reset all checkboxes and time inputs
    document.querySelectorAll('.day-checkbox input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = false;
    });
    
    document.querySelectorAll('.day-hours').forEach(dayHours => {
      dayHours.style.display = 'none';
    });

    // Populate with existing data
    if (data && data.length > 0) {
      data.forEach(availability => {
        const day = availability.day_of_week;
        const checkbox = document.querySelector(`input[data-day="${day}"]`);
        const dayHours = document.querySelector(`.day-hours[data-day="${day}"]`);
        
        if (checkbox) {
          checkbox.checked = true;
          if (dayHours) {
            dayHours.style.display = 'block';
          }
        }
        
        if (dayHours) {
          const startInput = dayHours.querySelector('input[data-type="start"]');
          const endInput = dayHours.querySelector('input[data-type="end"]');
          
          if (startInput) startInput.value = availability.start_time || '09:00';
          if (endInput) endInput.value = availability.end_time || '17:00';
        }
      });
    }
  } catch (error) {
    console.error('Error loading barber availability:', error);
  }
}

async function saveBarberAvailability(barberId) {
  if (!barberId) {
    alert('Selecteer eerst een barber');
    return;
  }

  try {
    // First, delete existing availability for this barber
    const { error: deleteError } = await supabase
      .from('barber_availability')
      .delete()
      .eq('barber_id', barberId);

    if (deleteError) {
      console.error('Error deleting existing availability:', deleteError);
      return;
    }

    // Get selected days and their times
    const selectedDays = [];
    document.querySelectorAll('.day-checkbox input[type="checkbox"]:checked').forEach(checkbox => {
      const day = checkbox.getAttribute('data-day');
      const dayHours = document.querySelector(`.day-hours[data-day="${day}"]`);
      
      if (dayHours) {
        const startInput = dayHours.querySelector('input[data-type="start"]');
        const endInput = dayHours.querySelector('input[data-type="end"]');
        
        selectedDays.push({
          barber_id: barberId,
          day_of_week: day,
          start_time: startInput ? startInput.value : '09:00',
          end_time: endInput ? endInput.value : '17:00'
        });
      }
    });

    // Insert new availability
    if (selectedDays.length > 0) {
      const { error: insertError } = await supabase
        .from('barber_availability')
        .insert(selectedDays);

      if (insertError) {
        console.error('Error saving availability:', insertError);
        alert('Fout bij het opslaan van beschikbaarheid');
        return;
      }
    }

    alert('Beschikbaarheid succesvol opgeslagen!');
  } catch (error) {
    console.error('Error saving barber availability:', error);
    alert('Fout bij het opslaan van beschikbaarheid');
  }
}

function initBarberAvailability() {
  // Barber selector change event
  const barberSelect = document.getElementById('barberAvailabilitySelect');
  if (barberSelect) {
    barberSelect.addEventListener('change', async (e) => {
      const barberId = e.target.value;
      const content = document.getElementById('barberAvailabilityContent');
      
      if (barberId) {
        content.style.display = 'block';
        await loadBarberAvailability(barberId);
      } else {
        content.style.display = 'none';
      }
    });
  }

  // Day checkbox change events
  document.querySelectorAll('.day-checkbox input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const day = e.target.getAttribute('data-day');
      const dayHours = document.querySelector(`.day-hours[data-day="${day}"]`);
      
      if (e.target.checked) {
        dayHours.style.display = 'block';
      } else {
        dayHours.style.display = 'none';
      }
    });
  });

  // Save button event
  const saveBtn = document.getElementById('saveAvailabilityBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const barberId = barberSelect ? barberSelect.value : null;
      await saveBarberAvailability(barberId);
    });
  }
}

// ====================== Modern Week Calendar ======================
let currentWeekStart = new Date();
let currentWeekEnd = new Date();

// Initialize modern week calendar
function initWeekCalendar() {
  console.log('🚀 Initializing modern week calendar...');
  
  // Set to start of current week (Monday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() + daysToMonday);
  currentWeekStart.setHours(0, 0, 0, 0);
  
  // Set end of week (Sunday)
  currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);
  
  updateWeekDisplay();
  generateTimeLabels();
  loadWeekAppointments();
  updateCurrentTimeLine();
  
  // Update current time line every minute
  // Set up interval to update current time line and appointment status every 30 seconds
  setInterval(() => {
    updateCurrentTimeLine();
    // Only refresh appointments if not already loading
    if (!window.appointmentsLoading) {
      loadWeekAppointments(); // Refresh appointments to update status colors
    }
  }, 30000);
  
  console.log('✅ Modern week calendar initialized!');
}

function updateWeekDisplay() {
  // Update week number
  const weekNumber = getWeekNumber(currentWeekStart);
  const weekNumberElement = document.getElementById('weekNumber');
  if (weekNumberElement) {
    weekNumberElement.textContent = `W ${weekNumber}`;
  }
  
  // Update week dates
  const weekDatesElement = document.getElementById('weekDates');
  if (weekDatesElement) {
    const startDate = currentWeekStart.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' });
    const endDate = currentWeekEnd.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
    weekDatesElement.textContent = `${startDate} - ${endDate}`;
  }
  
  // Update day dates
  const dayDates = ['mondayDate', 'tuesdayDate', 'wednesdayDate', 'thursdayDate', 'fridayDate', 'saturdayDate', 'sundayDate'];
  
  dayDates.forEach((dayId, index) => {
    const dateElement = document.getElementById(dayId);
    if (dateElement) {
      const dayDate = new Date(currentWeekStart);
      dayDate.setDate(currentWeekStart.getDate() + index);
      const day = dayDate.getDate();
      const month = dayDate.toLocaleDateString('nl-NL', { month: 'short' });
      dateElement.textContent = `${day} ${month}`;
    }
  });
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function updateWeekDisplay() {
  const weekDisplay = document.getElementById('currentWeekDisplay');
  if (weekDisplay) {
    const startDate = currentWeekStart.toLocaleDateString('nl-NL', { 
      day: '2-digit', 
      month: '2-digit' 
    });
    const endDate = currentWeekEnd.toLocaleDateString('nl-NL', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
    weekDisplay.textContent = `Week van ${startDate} - ${endDate}`;
  }
}

function generateTimeLabels() {
  const timeLabelsContainer = document.getElementById('timeLabels');
  if (!timeLabelsContainer) {
    console.error('❌ Time labels container not found!');
    return;
  }
  
  timeLabelsContainer.innerHTML = '';
  
  // Generate labels for 24 hours with 15-minute intervals (0:00 to 23:45)
  // Each 15-minute slot = 40px height, positioned absolutely
  let labelCount = 0;
  for (let hour = 0; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeLabel = document.createElement('div');
      timeLabel.className = 'time-label';
      timeLabel.textContent = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Position each 15-minute slot at 40px intervals
      const topPosition = (hour * 160) + (minute / 15 * 40);
      timeLabel.style.top = `${topPosition}px`;
      timeLabel.style.height = '40px';
      timeLabel.style.minHeight = '40px';
      timeLabelsContainer.appendChild(timeLabel);
      labelCount++;
      
      // Debug: Log first few labels
      if (labelCount <= 5) {
        console.log(`Created label ${labelCount}: ${timeLabel.textContent} at ${topPosition}px`);
      }
    }
  }
  
  console.log(`✅ Generated ${timeLabelsContainer.children.length} time labels (24 hours, 15-minute intervals)`);
  console.log('Time labels container:', timeLabelsContainer);
}

function updateCurrentTimeLine() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const currentTimeLine = document.getElementById('currentTimeLine');
  if (!currentTimeLine) {
    console.error('❌ Current time line element not found!');
    return;
  }
  
  // Only show if it's today and within current week
  if (now >= currentWeekStart && now <= currentWeekEnd) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Position based on 24-hour range (0:00-23:59) - 160px per hour, 40px per 15 minutes
    const topPositionPixels = (currentHour * 160) + (currentMinute / 15 * 40);
    
    // Debug: Check if the calculation is correct
    console.log(`🕐 Current time: ${now.toLocaleTimeString('nl-NL')}`);
    console.log(`🕐 Hour: ${currentHour}, Minute: ${currentMinute}`);
    console.log(`🕐 Calculation: (${currentHour} * 60) + ${currentMinute} = ${topPositionPixels}px`);
    
    // Check what time this position should represent
    const expectedHour = Math.floor(topPositionPixels / 60);
    const expectedMinute = topPositionPixels % 60;
    console.log(`🕐 This position represents: ${expectedHour}:${expectedMinute.toString().padStart(2, '0')}`);
    
    currentTimeLine.style.top = `${topPositionPixels}px`;
    currentTimeLine.style.display = 'block';
    currentTimeLine.style.left = '100px';
    currentTimeLine.style.right = '0';
    
    console.log(`✅ Current time line positioned at ${topPositionPixels}px`);
  } else {
    currentTimeLine.style.display = 'none';
  }
}

async function loadWeekAppointments() {
  // Prevent multiple simultaneous calls
  if (window.appointmentsLoading) {
    console.log('Appointments already loading, skipping...');
    return;
  }
  
  window.appointmentsLoading = true;
  
  try {
    // Clear existing appointments
    document.querySelectorAll('.day-appointments').forEach(container => {
      container.innerHTML = '';
    });
    
    // Load barber filter
    await loadBarberFilter();
    
    console.log('Loading appointments for week:', {
      start: currentWeekStart.toISOString(),
      end: currentWeekEnd.toISOString()
    });
    
    // Load appointments for the current week without joins
    const { data: appointments, error } = await supabase
      .from('boekingen')
      .select('*')
      .gte('datumtijd', currentWeekStart.toISOString())
      .lte('datumtijd', currentWeekEnd.toISOString())
      .order('datumtijd');
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('Loaded appointments:', appointments);
    
    // Store all appointments for filtering
    allAppointments = appointments;
    
    // Auto-load all barbers day view by default
    showAllBarbersDayView();
    
    // Group appointments by day
    const appointmentsByDay = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };
    
    appointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.datumtijd);
      const dayOfWeek = appointmentDate.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      
      if (appointmentsByDay[dayName]) {
        appointmentsByDay[dayName].push(appointment);
      }
    });
    
    // Render appointments for each day
    for (const dayName of Object.keys(appointmentsByDay)) {
      const container = document.getElementById(`appointments${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`);
      if (container) {
        console.log(`Adding ${appointmentsByDay[dayName].length} appointments to ${dayName} container`);
        for (const appointment of appointmentsByDay[dayName]) {
          const appointmentElement = await createAppointmentElement(appointment);
          container.appendChild(appointmentElement);
          console.log(`Added appointment ${appointment.id} to ${dayName}`);
        }
      } else {
        console.log(`No container found for ${dayName}`);
      }
    }
    
    // Update day dates
    updateDayDates();
    
  } catch (error) {
    console.error('Error loading week appointments:', error);
  } finally {
    // Reset loading flag
    window.appointmentsLoading = false;
  }
}

async function createAppointmentElement(appointment) {
  const appointmentDate = new Date(appointment.datumtijd);
  const timeInMinutes = appointmentDate.getHours() * 60 + appointmentDate.getMinutes();
  
  // Get service duration
  const serviceDuration = await getServiceDuration(appointment.dienst_id);
  // Calculate height: each 15-minute slot is 40px, so service duration in minutes / 15 * 40
  const heightPixels = Math.max((serviceDuration / 15) * 40, 20); // Minimum 20px height
  
  console.log(`Appointment ${appointment.id}: ${serviceDuration} minutes = ${heightPixels}px height`);
  
  // Position based on 24-hour range (0:00-23:59) - 160px per hour, 40px per 15 minutes
  const topPositionPixels = (appointmentDate.getHours() * 160) + (appointmentDate.getMinutes() / 15 * 40);
  
  console.log(`Appointment ${appointment.id}: ${appointmentDate.toLocaleTimeString()} = ${topPositionPixels}px top position`);
  
  const now = new Date();
  const appointmentTime = new Date(appointment.datumtijd);
  const timeDiff = appointmentTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  let statusClass = 'past';
  if (hoursDiff > 0 && hoursDiff <= 1) {
    statusClass = 'upcoming';
  } else if (hoursDiff <= 0 && hoursDiff >= -1) {
    statusClass = 'current';
  }
  
  // Get service and barber names
  const serviceName = await getServiceName(appointment.dienst_id);
  const barberName = await getBarberName(appointment.barber_id);
  
  const appointmentElement = document.createElement('div');
  appointmentElement.className = `appointment-block ${statusClass}`;
  appointmentElement.style.top = `${topPositionPixels}px`;
  appointmentElement.style.height = `${heightPixels}px`;
  
  // Calculate end time for time range display
  const endTime = new Date(appointmentDate.getTime() + serviceDuration * 60000);
  const timeRange = `${appointmentDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
  
  console.log(`Appointment ${appointment.id}: ${timeRange} (${serviceDuration} min) - Height: ${heightPixels}px, Top: ${topPositionPixels}px`);
  
  appointmentElement.innerHTML = `
    <div class="appointment-time">${timeRange}</div>
    <div class="appointment-customer">${appointment.klantnaam || 'Onbekend'}</div>
    <div class="appointment-service">${serviceName}</div>
  `;
  
  // Add click handler for appointment details
  appointmentElement.addEventListener('click', () => {
    showAppointmentDetails(appointment);
  });
  
  return appointmentElement;
}

function updateDayDates() {
  const dayColumns = document.querySelectorAll('.day-column');
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  dayColumns.forEach((column, index) => {
    const dayDate = new Date(currentWeekStart);
    dayDate.setDate(currentWeekStart.getDate() + index);
    
    const dateElement = column.querySelector('.day-date');
    if (dateElement) {
      dateElement.textContent = dayDate.toLocaleDateString('nl-NL', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  });
}

let currentAppointment = null;

async function showAppointmentDetails(appointment) {
  console.log('Showing appointment details for:', appointment);
  currentAppointment = appointment;
  currentEditingAppointment = appointment;
  
  // Reset edit mode - always show details view first
  document.querySelector('.appointment-details').style.display = 'block';
  document.getElementById('editAppointmentForm').style.display = 'none';
  
  // Load additional data for the appointment
  const appointmentData = await loadAppointmentDetails(appointment.id);
  console.log('Appointment data for popup:', appointmentData);
  
  // Populate popup with data
  console.log('Appointment data for display:', {
    klantnaam: appointmentData.klantnaam || appointment.klantnaam,
    email: appointmentData.email || appointment.email,
    telefoon: appointmentData.telefoon || appointment.telefoon
  });
  
  document.getElementById('appointmentCustomerName').textContent = appointmentData.klantnaam || appointment.klantnaam || 'Onbekend';
  document.getElementById('appointmentCustomerEmail').textContent = appointmentData.email || appointment.email || 'Onbekend';
  document.getElementById('appointmentCustomerPhone').textContent = appointmentData.telefoon || appointment.telefoon || 'Onbekend';
  
  const appointmentDate = new Date(appointmentData.datumtijd || appointment.datumtijd);
  document.getElementById('appointmentDate').textContent = appointmentDate.toLocaleDateString('nl-NL');
  document.getElementById('appointmentTime').textContent = appointmentDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  
  // Get service and barber names
  const serviceName = await getServiceName(appointmentData.dienst_id || appointment.dienst_id);
  const barberName = await getBarberName(appointmentData.barber_id || appointment.barber_id);
  const servicePrice = await getServicePrice(appointmentData.dienst_id || appointment.dienst_id);
  
  document.getElementById('appointmentBarber').textContent = barberName;
  document.getElementById('appointmentService').textContent = serviceName;
  document.getElementById('appointmentPrice').textContent = servicePrice ? `€${servicePrice}` : 'Onbekend';
  
  // Show popup
  document.getElementById('appointmentDetailsPopup').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

async function loadAppointmentDetails(appointmentId) {
  try {
    console.log('Loading appointment details for ID:', appointmentId);
    
    // Load appointment data
    const { data: appointment, error: appointmentError } = await supabase
    .from('boekingen')
      .select('*')
      .eq('id', appointmentId)
      .single();
    
    if (appointmentError) {
      console.error('Supabase error loading appointment:', appointmentError);
      throw appointmentError;
    }
    
    console.log('Loaded appointment data:', appointment);
    
    // Load barber data separately
    let barberName = 'Onbekend';
    if (appointment.barber_id) {
      try {
        // Try different table names
        let barber = null;
        
        // Use the correct table name directly
        const { data: barberData, error: barberError } = await supabase
          .from('barbers')
          .select('naam')
          .eq('id', appointment.barber_id)
          .single();
        
        if (!barberError && barberData) {
          barber = barberData;
          console.log('Found barber in barbers table:', barberData);
    } else {
          console.log('Barber not found in barbers table:', barberError);
        }
        
        if (barber) {
          barberName = barber.naam;
        } else {
          console.log('No barber table found, using fallback');
          barberName = `Barber ID: ${appointment.barber_id}`;
        }
      } catch (barberError) {
        console.error('Error loading barber:', barberError);
        barberName = `Barber ID: ${appointment.barber_id}`;
      }
    }
    
    // Load service data separately
    let serviceName = 'Onbekend';
    let servicePrice = null;
    if (appointment.dienst_id) {
      try {
        // Try different table names
        let service = null;
        
        // Use the correct table name directly
        const { data: serviceData, error: serviceError } = await supabase
          .from('diensten')
          .select('naam, prijs_euro')
          .eq('id', appointment.dienst_id)
          .single();
        
        if (!serviceError && serviceData) {
          service = serviceData;
          console.log('Found service in diensten table:', serviceData);
        } else {
          console.log('Service not found in diensten table:', serviceError);
        }
        
        if (service) {
          serviceName = service.naam;
          servicePrice = service.prijs_euro;
        } else {
          console.log('No service table found, using fallback');
          serviceName = `Dienst ID: ${appointment.dienst_id}`;
        }
      } catch (serviceError) {
        console.error('Error loading service:', serviceError);
        serviceName = `Dienst ID: ${appointment.dienst_id}`;
      }
    }
    
    return {
      ...appointment,
      barber_naam: barberName,
      dienst_naam: serviceName,
      dienst_prijs: servicePrice,
      // Ensure correct column names are available
      klantnaam: appointment.klantnaam,
      email: appointment.email,
      telefoon: appointment.telefoon
    };
  } catch (error) {
    console.error('Error loading appointment details:', error);
    // Fallback to current appointment data
    return currentAppointment;
  }
}

function hideAppointmentDetails() {
  document.getElementById('appointmentDetailsPopup').style.display = 'none';
  document.body.style.overflow = 'auto';
  currentAppointment = null;
  currentEditingAppointment = null;
  
  // Reset edit mode when closing popup
  document.querySelector('.appointment-details').style.display = 'block';
  document.getElementById('editAppointmentForm').style.display = 'none';
}

// Barber filter functions
let allAppointments = [];
let currentBarberFilter = '';

async function loadBarberFilter() {
  const barberSelect = document.getElementById('barberFilterSelect');
  if (!barberSelect) return;
  
  try {
    const { data: barbers, error } = await supabase.from('barbers').select('*').order('naam');
    if (error) throw error;
    
    barberSelect.innerHTML = '<option value="">Kies een barber...</option>';
    barbers.forEach(barber => {
      const option = document.createElement('option');
      option.value = barber.id;
      option.textContent = barber.naam;
      barberSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading barbers for filter:', error);
  }
}

function filterAppointmentsByBarber(barberId) {
  currentBarberFilter = barberId;
  
  // Clear all appointments first
  document.querySelectorAll('.appointments-container').forEach(container => {
    container.innerHTML = '';
  });
  
  if (!barberId) {
    // Show all appointments for the current week
    showWeekFirstDayView();
  } else {
    // Show only appointments for selected barber in the current week
    const filteredAppointments = allAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.datumtijd);
      const weekStart = new Date(currentWeekStart);
      const weekEnd = new Date(currentWeekEnd);
      
      return appointment.barber_id == barberId && 
             appointmentDate >= weekStart && 
             appointmentDate <= weekEnd;
    });
    
    // Group by day and display
    const appointmentsByDay = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };
    
    filteredAppointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.datumtijd);
      const dayOfWeek = appointmentDate.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      appointmentsByDay[dayName].push(appointment);
    });
    
    // Display appointments for each day
    Object.keys(appointmentsByDay).forEach(dayName => {
      const dayAppointments = appointmentsByDay[dayName];
      if (dayAppointments.length > 0) {
        const container = document.getElementById(`appointments${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`);
        if (container) {
          dayAppointments.forEach(appointment => {
            createAppointmentElement(appointment).then(element => {
              container.appendChild(element);
            });
          });
        }
      }
    });
  }
}

function displayAppointment(appointment) {
  const appointmentDate = new Date(appointment.datumtijd);
  const dayName = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const container = document.getElementById(`appointments${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`);
  
  if (container) {
    createAppointmentElement(appointment).then(element => {
      container.appendChild(element);
    });
  }
}

function clearAppointments() {
  document.querySelectorAll('.appointments-container').forEach(container => {
    container.innerHTML = '';
  });
}

async function showAllBarbersDayView() {
  console.log('🔥 showAllBarbersDayView called');
  console.log('🔥 allAppointments:', allAppointments);
  
  // Clear current appointments
  clearAppointments();
  
  // Get today's date
    const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  console.log('🔥 Today:', todayStr);
  
  // Filter appointments for today only
  const todayAppointments = allAppointments.filter(appointment => {
    const appointmentDate = new Date(appointment.datumtijd);
    const appointmentDateStr = appointmentDate.toISOString().split('T')[0];
    return appointmentDateStr === todayStr;
  });
  
  console.log('🔥 Today appointments:', todayAppointments);
  
  // Group by barber
  const appointmentsByBarber = {};
  todayAppointments.forEach(appointment => {
    if (!appointmentsByBarber[appointment.barber_id]) {
      appointmentsByBarber[appointment.barber_id] = [];
    }
    appointmentsByBarber[appointment.barber_id].push(appointment);
  });
  
  console.log('🔥 Appointments by barber:', appointmentsByBarber);
  
  // Get barber names
  const { data: barbers } = await supabase.from('barbers').select('*');
  const barberNames = {};
  barbers.forEach(barber => {
    barberNames[barber.id] = barber.naam;
  });
  
  console.log('🔥 Barber names:', barberNames);
  
  // Display appointments grouped by barber
  Object.keys(appointmentsByBarber).forEach(barberId => {
    const barberName = barberNames[barberId] || `Barber ${barberId}`;
    const appointments = appointmentsByBarber[barberId];
    
    // Create a container for this barber's appointments
    const barberContainer = document.createElement('div');
    barberContainer.className = 'barber-day-container';
    barberContainer.innerHTML = `
      <div class="barber-day-header">
        <h4>${barberName}</h4>
        <span class="appointment-count">${appointments.length} afspraak${appointments.length !== 1 ? 'ken' : ''}</span>
      </div>
      <div class="barber-appointments"></div>
    `;
    
    // Add to today's column
    const todayDayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayContainer = document.getElementById(`appointments${todayDayName.charAt(0).toUpperCase() + todayDayName.slice(1)}`);
    
    if (todayContainer) {
      todayContainer.appendChild(barberContainer);
      
      // Add appointments to this barber's container
      const appointmentsContainer = barberContainer.querySelector('.barber-appointments');
      appointments.forEach(appointment => {
        createAppointmentElement(appointment).then(element => {
          appointmentsContainer.appendChild(element);
        });
      });
    }
  });
  
  // Update week display to show today
  document.getElementById('currentWeekDisplay').textContent = `Vandaag - ${today.toLocaleDateString('nl-NL')}`;
}

async function showWeekFirstDayView() {
  console.log('🔥 showWeekFirstDayView called');
  console.log('🔥 currentWeekStart:', currentWeekStart);
  
  // Clear current appointments
  clearAppointments();
  
  // Get the first day of the selected week
  const firstDayOfWeek = new Date(currentWeekStart);
  const firstDayStr = firstDayOfWeek.toISOString().split('T')[0];
  console.log('🔥 First day of week:', firstDayStr);
  
  // Filter appointments for the first day of the week only
  const firstDayAppointments = allAppointments.filter(appointment => {
    const appointmentDate = new Date(appointment.datumtijd);
    const appointmentDateStr = appointmentDate.toISOString().split('T')[0];
    return appointmentDateStr === firstDayStr;
  });
  
  console.log('🔥 First day appointments:', firstDayAppointments);
  
  // Group by barber
  const appointmentsByBarber = {};
  firstDayAppointments.forEach(appointment => {
    if (!appointmentsByBarber[appointment.barber_id]) {
      appointmentsByBarber[appointment.barber_id] = [];
    }
    appointmentsByBarber[appointment.barber_id].push(appointment);
  });
  
  console.log('🔥 Appointments by barber:', appointmentsByBarber);
  
  // Get barber names
  const { data: barbers } = await supabase.from('barbers').select('*');
  const barberNames = {};
  barbers.forEach(barber => {
    barberNames[barber.id] = barber.naam;
  });
  
  console.log('🔥 Barber names:', barberNames);
  
  // Display appointments grouped by barber
  Object.keys(appointmentsByBarber).forEach(barberId => {
    const barberName = barberNames[barberId] || `Barber ${barberId}`;
    const appointments = appointmentsByBarber[barberId];
    
    // Create a container for this barber's appointments
    const barberContainer = document.createElement('div');
    barberContainer.className = 'barber-day-container';
    barberContainer.innerHTML = `
      <div class="barber-day-header">
        <h4>${barberName}</h4>
        <span class="appointment-count">${appointments.length} afspraak${appointments.length !== 1 ? 'ken' : ''}</span>
      </div>
      <div class="barber-appointments"></div>
    `;
    
    // Add to the first day's column
    const firstDayName = firstDayOfWeek.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const firstDayContainer = document.getElementById(`appointments${firstDayName.charAt(0).toUpperCase() + firstDayName.slice(1)}`);
    
    if (firstDayContainer) {
      firstDayContainer.appendChild(barberContainer);
      
      // Add appointments to this barber's container
      const appointmentsContainer = barberContainer.querySelector('.barber-appointments');
      appointments.forEach(appointment => {
        createAppointmentElement(appointment).then(element => {
          appointmentsContainer.appendChild(element);
        });
      });
    }
  });
  
  // Update week display to show the first day
  const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
  const dayName = dayNames[firstDayOfWeek.getDay()];
  document.getElementById('currentWeekDisplay').textContent = `${dayName} - ${firstDayOfWeek.toLocaleDateString('nl-NL')}`;
}

// Edit form functions
let currentEditingAppointment = null;

function showEditForm() {
  // Hide the details view and show the edit form
  document.querySelector('.appointment-details').style.display = 'none';
  document.getElementById('editAppointmentForm').style.display = 'block';
  
  // Load barbers and services for the dropdowns
  loadEditFormData();
}

function hideEditForm() {
  // Show the details view and hide the edit form
  document.querySelector('.appointment-details').style.display = 'block';
  document.getElementById('editAppointmentForm').style.display = 'none';
  
  // Clear any form data
  document.getElementById('editCustomerName').value = '';
  document.getElementById('editCustomerEmail').value = '';
  document.getElementById('editCustomerPhone').value = '';
  document.getElementById('editAppointmentDate').value = '';
  document.getElementById('editAppointmentTime').value = '';
  document.getElementById('editAppointmentBarber').value = '';
  document.getElementById('editAppointmentService').value = '';
}

async function loadEditFormData() {
  // Load barbers
  const barberSelect = document.getElementById('editAppointmentBarber');
  const { data: barbers } = await supabase.from('barbers').select('*').order('id');
  
  barberSelect.innerHTML = '<option value="">Kies een barber...</option>';
  barbers.forEach(barber => {
    const option = document.createElement('option');
    option.value = barber.id;
    option.textContent = barber.naam;
    barberSelect.appendChild(option);
  });
  
  // Load services
  const serviceSelect = document.getElementById('editAppointmentService');
  const { data: services } = await supabase.from('diensten').select('*').order('id');
  
  serviceSelect.innerHTML = '<option value="">Kies een dienst...</option>';
  services.forEach(service => {
    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = `${service.naam} (€${service.prijs_euro})`;
    serviceSelect.appendChild(option);
  });
  
  // Populate form with current appointment data
  if (currentEditingAppointment) {
    const appointment = currentEditingAppointment;
    const appointmentDate = new Date(appointment.datumtijd);
    
    document.getElementById('editCustomerName').value = appointment.klantnaam || '';
    document.getElementById('editCustomerEmail').value = appointment.email || '';
    document.getElementById('editCustomerPhone').value = appointment.telefoon || '';
    document.getElementById('editAppointmentDate').value = appointmentDate.toISOString().split('T')[0];
    document.getElementById('editAppointmentTime').value = appointmentDate.toTimeString().slice(0, 5);
    document.getElementById('editAppointmentBarber').value = appointment.barber_id || '';
    document.getElementById('editAppointmentService').value = appointment.dienst_id || '';
  }
}

async function saveAppointmentChanges() {
  if (!currentEditingAppointment) return;
  
  const appointmentId = currentEditingAppointment.id;
  const customerName = document.getElementById('editCustomerName').value.trim();
  const customerEmail = document.getElementById('editCustomerEmail').value.trim();
  const customerPhone = document.getElementById('editCustomerPhone').value.trim();
  const appointmentDate = document.getElementById('editAppointmentDate').value;
  const appointmentTime = document.getElementById('editAppointmentTime').value;
  const barberId = document.getElementById('editAppointmentBarber').value;
  const serviceId = document.getElementById('editAppointmentService').value;
  
  // Validation
  if (!customerName || !appointmentDate || !appointmentTime || !barberId || !serviceId) {
    alert('Vul alle verplichte velden in!');
    return;
  }
  
  // Combine date and time
  const newDateTime = `${appointmentDate}T${appointmentTime}:00`;
  
  try {
    // Update the appointment
    const { error } = await supabase
      .from('boekingen')
      .update({
        klantnaam: customerName,
        email: customerEmail,
        telefoon: customerPhone,
        datumtijd: newDateTime,
        barber_id: parseInt(barberId),
        dienst_id: parseInt(serviceId)
      })
      .eq('id', appointmentId);
    
    if (error) throw error;
    
    alert('Afspraak succesvol bijgewerkt!');
    
    // Hide edit form and refresh the week view
    hideEditForm();
    hideAppointmentDetails();
    loadWeekAppointments();
    
    // Reset edit mode
    currentEditingAppointment = null;
    
  } catch (error) {
    console.error('Error updating appointment:', error);
    alert('Fout bij bijwerken van afspraak: ' + error.message);
  }
}

async function deleteCurrentAppointment() {
  if (!currentAppointment) return;
  
  if (confirm('Weet je zeker dat je deze afspraak wilt verwijderen?')) {
    try {
      const { error } = await supabase
        .from('boekingen')
        .delete()
        .eq('id', currentAppointment.id);
      
      if (error) throw error;
      
      alert('Afspraak succesvol verwijderd!');
      hideAppointmentDetails();
      loadWeekAppointments(); // Refresh the calendar
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Er is een fout opgetreden bij het verwijderen van de afspraak.');
    }
  }
}

function editAppointment() {
  if (!currentAppointment) return;
  
  // For now, just show an alert
  // In a full implementation, you would open an edit form
  alert('Bewerken functionaliteit komt binnenkort beschikbaar!');
}

async function loadBarberAvailabilityForWeek() {
  try {
    // Load all barber availability
    const { data: availability, error } = await supabase
      .from('barber_availability')
      .select('*');
    
    if (error) {
      console.error('Error loading barber availability:', error);
      return;
    }
    
    // Group availability by barber
    const availabilityByBarber = {};
    availability.forEach(avail => {
      if (!availabilityByBarber[avail.barber_id]) {
        availabilityByBarber[avail.barber_id] = [];
      }
      availabilityByBarber[avail.barber_id].push(avail);
    });
    
    // Apply greyed out styling to unavailable times
    applyAvailabilityStyling(availabilityByBarber);
    
  } catch (error) {
    console.error('Error loading barber availability:', error);
  }
}

function applyAvailabilityStyling(availabilityByBarber) {
  const dayColumns = document.querySelectorAll('.day-column');
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  dayColumns.forEach((column, index) => {
    const dayName = dayNames[index];
    const timelineContainer = column.querySelector('.timeline-container');
    
    if (!timelineContainer) return;
    
    // Remove existing overlay
    const existingOverlay = timelineContainer.querySelector('.unavailable-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Create greyed out background for unavailable times
    const unavailableOverlay = document.createElement('div');
    unavailableOverlay.className = 'unavailable-overlay';
    timelineContainer.appendChild(unavailableOverlay);
    
    // Check if any barber is available for this day
    const isAnyBarberAvailable = checkDayAvailability(availabilityByBarber, dayName);
    
    if (!isAnyBarberAvailable) {
      // Grey out the entire day if no barber is available
      greyOutEntireDay(unavailableOverlay);
    } else {
      // Grey out specific time slots when no barber is available
      greyOutUnavailableTimes(unavailableOverlay, availabilityByBarber, dayName);
    }
  });
}

function checkDayAvailability(availabilityByBarber, dayName) {
  // Check if any barber is available on this day
  for (const barberId in availabilityByBarber) {
    const barberAvailability = availabilityByBarber[barberId];
    const dayAvailability = barberAvailability.find(avail => avail.day_of_week === dayName);
    if (dayAvailability) {
      return true;
    }
  }
  return false;
}

function greyOutEntireDay(overlay) {
  overlay.style.background = '#f8f9fa';
  overlay.style.opacity = '0.5';
  overlay.style.display = 'block';
}

function greyOutUnavailableTimes(overlay, availabilityByBarber, dayName) {
  // For now, show all times as available
  // In a full implementation, you would check each hour against barber availability
  overlay.style.display = 'none';
}

function navigateWeek(direction) {
  if (direction === 'prev') {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  } else {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }
  
  currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);
  
  updateWeekDisplay();
  
  // Show appointments for the first day of the selected week
  showWeekFirstDayView();
}

window.addEventListener('DOMContentLoaded', async () => {
  // Only run admin functionality on admin pages
  if (!window.location.pathname.includes('admin.html')) {
    return;
  }
  
  // Initialize tabs first
  initTabs();
  initSubTabs();
  
  // Check authentication
  await checkAuth();
  
  // Initialize theme
  initializeTheme();
  
  // Load initial data
  await loadBoekingen();
  await loadBarbers();
  await loadDiensten();
  await loadSettings();
  await loadCustomers();
  
  // Initialize barber availability
  initBarberAvailability();
  
  // Initialize week calendar
  initWeekCalendar();
  
  // Admin availability controls removed - now handled in Barbers tab
  
  // Add week navigation event listeners
  document.getElementById('prevWeekBtn')?.addEventListener('click', () => navigateWeek('prev'));
  document.getElementById('nextWeekBtn')?.addEventListener('click', () => navigateWeek('next'));
  
  // Add barber filter event listener
  document.getElementById('barberFilterSelect')?.addEventListener('change', (e) => {
    const selectedBarberId = e.target.value;
    if (selectedBarberId) {
      filterAppointmentsByBarber(selectedBarberId);
    } else {
      clearAppointments();
    }
  });
  
  // Add "view all barbers" button event listener
  document.getElementById('viewAllBarbersBtn')?.addEventListener('click', () => {
    showAllBarbersDayView();
  });
  
  // Add appointment popup event listeners
  document.getElementById('closeAppointmentPopup')?.addEventListener('click', hideAppointmentDetails);
  document.getElementById('closeAppointmentDetailsBtn')?.addEventListener('click', hideAppointmentDetails);
  document.getElementById('editAppointmentBtn')?.addEventListener('click', showEditForm);
  document.getElementById('deleteAppointmentBtn')?.addEventListener('click', deleteCurrentAppointment);
  
  // Edit form event listeners
  document.getElementById('cancelEditBtn')?.addEventListener('click', hideEditForm);
  document.getElementById('saveAppointmentBtn')?.addEventListener('click', saveAppointmentChanges);
  
  // Close popup when clicking outside
  document.getElementById('appointmentDetailsPopup')?.addEventListener('click', (e) => {
    if (e.target.id === 'appointmentDetailsPopup') {
      hideAppointmentDetails();
    }
  });
});

// ====================== Theme Management ======================
function initializeTheme() {
  // Check for saved theme preference or default to light mode
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
  
  // Add event listener to theme toggle button
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
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

// ====================== Settings Management ======================
async function loadSettings() {
  try {
    console.log('Loading settings...');
    const sb = window.supabase;
    
    if (!sb) {
      console.error('Supabase client not found');
      return;
    }
    
    const { data, error } = await sb
      .from('settings')
      .select('key, value')
      .in('key', ['loyalty_enabled', 'points_per_appointment', 'points_for_discount', 'discount_percentage']);
    
    if (error) {
      console.error('Database error loading settings:', error);
      throw error;
    }
    
    console.log('Settings data from database:', data);
    
    // Set default values
    const settings = {
      loyalty_enabled: 'true',
      points_per_appointment: '25',
      points_for_discount: '100',
      discount_percentage: '50'
    };
    
    // Update with database values
    if (data && data.length > 0) {
      data.forEach(setting => {
        settings[setting.key] = setting.value;
        console.log(`Loaded setting: ${setting.key} = ${setting.value}`);
      });
    } else {
      console.log('No settings found in database, using defaults');
    }
    
    // Update UI
    const loyaltyEnabledEl = document.getElementById('loyaltyEnabled');
    const pointsPerAppointmentEl = document.getElementById('pointsPerAppointment');
    const pointsForDiscountEl = document.getElementById('pointsForDiscount');
    const discountPercentageEl = document.getElementById('discountPercentage');
    
    if (loyaltyEnabledEl) loyaltyEnabledEl.checked = settings.loyalty_enabled === 'true';
    if (pointsPerAppointmentEl) pointsPerAppointmentEl.value = settings.points_per_appointment;
    if (pointsForDiscountEl) pointsForDiscountEl.value = settings.points_for_discount;
    if (discountPercentageEl) discountPercentageEl.value = settings.discount_percentage;
    
    console.log('Settings loaded successfully:', settings);
    
  } catch (error) {
    console.error('Error loading settings:', error);
    // Use default values if database fails
    const loyaltyEnabledEl = document.getElementById('loyaltyEnabled');
    const pointsPerAppointmentEl = document.getElementById('pointsPerAppointment');
    const pointsForDiscountEl = document.getElementById('pointsForDiscount');
    const discountPercentageEl = document.getElementById('discountPercentage');
    
    if (loyaltyEnabledEl) loyaltyEnabledEl.checked = true;
    if (pointsPerAppointmentEl) pointsPerAppointmentEl.value = 25;
    if (pointsForDiscountEl) pointsForDiscountEl.value = 100;
    if (discountPercentageEl) discountPercentageEl.value = 50;
    
    console.log('Using default settings due to error');
  }
}

async function saveSettings() {
  try {
    const sb = window.supabase;
    
    if (!sb) {
      console.error('Supabase client not found');
      alert('Database verbinding mislukt. Supabase client niet gevonden.');
      return;
    }
    
    const settings = {
      loyalty_enabled: document.getElementById('loyaltyEnabled').checked.toString(),
      points_per_appointment: document.getElementById('pointsPerAppointment').value,
      points_for_discount: document.getElementById('pointsForDiscount').value,
      discount_percentage: document.getElementById('discountPercentage').value
    };
    
    console.log('Attempting to save settings:', settings);
    
    // Validate settings
    if (parseInt(settings.points_per_appointment) < 1 || parseInt(settings.points_per_appointment) > 100) {
      alert('Punten per afspraak moet tussen 1 en 100 zijn');
      return;
    }
    
    if (parseInt(settings.points_for_discount) < 1 || parseInt(settings.points_for_discount) > 1000) {
      alert('Punten voor korting moet tussen 1 en 1000 zijn');
      return;
    }
    
    if (parseInt(settings.discount_percentage) < 1 || parseInt(settings.discount_percentage) > 100) {
      alert('Korting percentage moet tussen 1 en 100 zijn');
      return;
    }
    
    // Save each setting individually
    for (const [key, value] of Object.entries(settings)) {
      console.log(`Saving ${key} = ${value}`);
      
      try {
        // First try to update existing record
        const { data: updateData, error: updateError } = await sb
          .from('settings')
          .update({ 
            value: value,
            updated_at: new Date().toISOString()
          })
          .eq('key', key)
          .select();
        
        if (updateError) {
          console.error(`Update error for ${key}:`, updateError);
          throw updateError;
        }
        
        // If no rows were updated, try to insert
        if (!updateData || updateData.length === 0) {
          console.log(`No existing record for ${key}, trying insert...`);
          
          const { error: insertError } = await sb
            .from('settings')
            .insert({ 
              key: key, 
              value: value,
              description: getSettingDescription(key),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (insertError) {
            console.error(`Insert error for ${key}:`, insertError);
            throw insertError;
          }
          
          console.log(`Successfully inserted ${key}`);
        } else {
          console.log(`Successfully updated ${key}`);
        }
        
      } catch (settingError) {
        console.error(`Failed to save ${key}:`, settingError);
        throw settingError;
      }
    }
    
    alert('Instellingen succesvol opgeslagen!');
    console.log('All settings saved successfully');
    
  } catch (error) {
    console.error('Error saving settings:', error);
    const errorMessage = error.message || 'Onbekende fout';
    alert(`Fout bij opslaan van instellingen: ${errorMessage}`);
  }
}

function getSettingDescription(key) {
  const descriptions = {
    'loyalty_enabled': 'Enable loyalty program',
    'points_per_appointment': 'Points awarded per appointment',
    'points_for_discount': 'Points required for discount',
    'discount_percentage': 'Discount percentage when threshold is reached'
  };
  return descriptions[key] || '';
}

function resetSettings() {
  if (confirm('Weet je zeker dat je alle instellingen wilt resetten naar de standaardwaarden?')) {
    document.getElementById('loyaltyEnabled').checked = true;
    document.getElementById('pointsPerAppointment').value = 25;
    document.getElementById('pointsForDiscount').value = 100;
    document.getElementById('discountPercentage').value = 50;
    
    alert('Instellingen gereset naar standaardwaarden. Klik "Opslaan" om de wijzigingen te bevestigen.');
  }
}

// Test function to check database connection
async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    const sb = window.supabase;
    console.log('Supabase client:', sb);
    
    if (!sb) {
      console.error('Supabase client not found');
      return false;
    }
    
    // Test settings table directly
    const { data, error } = await sb
      .from('settings')
      .select('key, value')
      .limit(1);
    
    if (error) {
      console.error('Settings table error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'PGRST116') {
        console.log('Settings table does not exist - need to create it');
        return 'no_table';
      }
      
      if (error.code === 'PGRST301') {
        console.log('Permission denied - check RLS policies');
        return 'permission_denied';
      }
      
      return false;
    }
    
    console.log('Settings table connection successful');
    console.log('Found data:', data);
    return true;
  } catch (error) {
    console.error('Database test error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return false;
  }
}

// Add event listeners for settings
document.addEventListener('DOMContentLoaded', () => {
  // Settings event listeners
  document.getElementById('saveSettings')?.addEventListener('click', async () => {
    console.log('Save settings button clicked');
    const dbStatus = await testDatabaseConnection();
    
    if (dbStatus === false) {
      alert('Database verbinding mislukt. Controleer je internetverbinding en Supabase configuratie.');
      return;
    }
    
    if (dbStatus === 'no_table') {
      alert('Settings tabel bestaat niet. Ga naar Supabase Dashboard → SQL Editor en voer de create_settings_simple.sql uit.');
      return;
    }
    
    if (dbStatus === 'permission_denied') {
      alert('Geen toegang tot settings tabel. Controleer RLS policies in Supabase.');
      return;
    }
    
    if (dbStatus === true) {
      await saveSettings();
    }
  });
  
  document.getElementById('resetSettings')?.addEventListener('click', resetSettings);
  
  // Customer management event listeners
  document.getElementById('customerSearch')?.addEventListener('input', debounce(searchCustomers, 300));
  document.getElementById('searchBtn')?.addEventListener('click', searchCustomers);
  document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
});

// ====================== Customer Management ======================
let allCustomers = [];
let filteredCustomers = [];

async function loadCustomers() {
  try {
    console.log('Loading customers...');
    const sb = window.supabase;
    
    if (!sb) {
      console.error('Supabase client not found');
      return;
    }
    
    const { data, error } = await sb
      .from('customers')
      .select('*')
      .order('naam', { ascending: true });
    
    if (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
    
    allCustomers = data || [];
    filteredCustomers = [...allCustomers];
    
    console.log('Loaded customers:', allCustomers.length);
    await renderCustomers();
    
  } catch (error) {
    console.error('Error loading customers:', error);
    document.getElementById('customerList').innerHTML = '<div class="error">Fout bij laden van klanten</div>';
  }
}

async function renderCustomers() {
  const container = document.getElementById('customerList');
  if (!container) {
    console.error('customerList container not found');
    return;
  }
  
  if (filteredCustomers.length === 0) {
    container.innerHTML = '<div class="no-customers">Geen klanten gevonden</div>';
    return;
  }
  
        // Load appointment counts for each customer
        const customersWithCounts = await Promise.all(
          filteredCustomers.map(async (customer) => {
            try {
              const sb = window.supabase;
              const { count } = await sb
                .from('boekingen')
                .select('*', { count: 'exact', head: true })
                .eq('email', customer.email);
              
              return {
                ...customer,
                appointmentCount: count || 0
              };
            } catch (error) {
              console.error('Error loading appointment count for customer:', customer.naam, error);
              return {
                ...customer,
                appointmentCount: 0
              };
            }
          })
        );
        
        container.innerHTML = customersWithCounts.map(customer => `
          <div class="customer-card" data-customer-id="${customer.id}" style="cursor: pointer;">
            <div class="customer-info">
              <h3>${customer.naam}</h3>
              <p>${customer.email}</p>
              <p>${customer.telefoon || 'Geen telefoon'}</p>
            </div>
            <div class="customer-stats">
              <span class="appointment-count">${customer.appointmentCount} afspraken</span>
              <span class="loyalty-points">${customer.loyaliteitspunten || 0} punten</span>
            </div>
          </div>
        `).join('');
  
  // Add event listeners to customer cards
  container.querySelectorAll('.customer-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const customerId = parseInt(card.getAttribute('data-customer-id'));
      console.log('Customer card clicked, ID:', customerId);
      showCustomerDetails(customerId);
    });
  });
}

async function searchCustomers() {
  const searchTerm = document.getElementById('customerSearch')?.value.toLowerCase() || '';
  
  if (!searchTerm) {
    filteredCustomers = [...allCustomers];
  } else {
    filteredCustomers = allCustomers.filter(customer => 
      customer.naam.toLowerCase().includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm)
    );
  }
  
  await renderCustomers();
}

async function applyFilters() {
  const statusFilter = document.getElementById('statusFilter')?.value || 'all';
  
  let filtered = [...allCustomers];
  
  if (statusFilter === 'active') {
    filtered = filtered.filter(customer => (customer.totaal_afspraken || 0) > 0);
  } else if (statusFilter === 'inactive') {
    filtered = filtered.filter(customer => (customer.totaal_afspraken || 0) === 0);
  }
  
  // Apply search filter
  const searchTerm = document.getElementById('customerSearch')?.value.toLowerCase() || '';
  if (searchTerm) {
    filtered = filtered.filter(customer => 
      customer.naam.toLowerCase().includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm)
    );
  }
  
  filteredCustomers = filtered;
  await renderCustomers();
}

async function showCustomerDetails(customerId) {
  try {
    const sb = window.supabase;
    const customer = allCustomers.find(c => c.id === customerId);
    
    if (!customer) {
      alert('Klant niet gevonden');
      return;
    }
    
    // Load customer appointments
    const { data: appointments, error: appointmentsError } = await sb
      .from('boekingen')
      .select('*')
      .eq('email', customer.email)
      .order('datumtijd', { ascending: false });
    
    if (appointmentsError) throw appointmentsError;
    
    // Enrich appointments with barber and service data
    const enrichedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        const barberData = await getBarberData(appointment.barber_id);
        const serviceData = await getServiceData(appointment.dienst_id);
        
        return {
          ...appointment,
          barber_naam: barberData?.naam || 'Onbekend',
          dienst_naam: serviceData?.naam || 'Onbekend',
          dienst_prijs: serviceData?.prijs_euro || 0
        };
      })
    );
    
    // Show customer details modal
    showCustomerModal(customer, enrichedAppointments);
    
  } catch (error) {
    console.error('Error loading customer details:', error);
    alert('Fout bij laden van klant details');
  }
}

function showCustomerModal(customer, appointments) {
  
  // Separate past and upcoming appointments
  const now = new Date();
  const pastAppointments = appointments.filter(apt => new Date(apt.datumtijd) < now);
  const upcomingAppointments = appointments.filter(apt => new Date(apt.datumtijd) >= now);
  
  // Create modal HTML
  const modalHTML = `
    <div class="modal" id="customerModal" data-customer-id="${customer.id}">
      <div class="modal-content">
        <div class="customer-detail-header">
          <h2>${customer.naam}</h2>
          <div class="header-actions">
            <button class="btn btn-primary btn-sm" onclick="window.editCustomer(${customer.id})">
              <span class="btn-icon">✏️</span> Bewerken
            </button>
            <button class="close-modal" onclick="window.closeCustomerModal()">&times;</button>
          </div>
        </div>
        
        <div class="detail-section">
          <h3>Contactgegevens</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Email:</label>
              <span id="customer-email">${customer.email}</span>
            </div>
            <div class="info-item">
              <label>Telefoon:</label>
              <span id="customer-phone">${customer.telefoon || 'Niet opgegeven'}</span>
            </div>
            <div class="info-item">
              <label>Geboortedatum:</label>
              <span id="customer-birthdate">${customer.geboortedatum ? new Date(customer.geboortedatum).toLocaleDateString('nl-NL') : 'Niet opgegeven'}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h3>Statistieken</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <label>Totaal afspraken:</label>
              <span class="stat-value">${appointments.length}</span>
            </div>
            <div class="stat-item">
              <label>Loyaliteitspunten:</label>
              <span class="stat-value loyalty-points">${customer.loyaliteitspunten || 0}</span>
            </div>
            <div class="stat-item">
              <label>Laatste afspraak:</label>
              <span class="stat-value">${customer.laatste_afspraak ? new Date(customer.laatste_afspraak).toLocaleDateString('nl-NL') : 'Geen'}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h3>Aankomende Afspraken (${upcomingAppointments.length})</h3>
          <div class="appointments-list">
            ${upcomingAppointments.length > 0 ? upcomingAppointments.map(apt => `
              <div class="appointment-item upcoming">
                <div class="appointment-date">${new Date(apt.datumtijd).toLocaleDateString('nl-NL')}</div>
                <div class="appointment-time">${new Date(apt.datumtijd).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'})}</div>
                <div class="appointment-service">${apt.dienst_naam}</div>
                <div class="appointment-barber">${apt.barber_naam}</div>
                <div class="appointment-price">€${apt.dienst_prijs}</div>
                <div class="appointment-actions">
                  <button class="btn-edit-appointment" onclick="editAppointment(${apt.id})" title="Bewerken">
                    <span>✏️</span>
                  </button>
                  <button class="btn-delete-appointment" onclick="deleteAppointment(${apt.id})" title="Verwijderen">
                    <span>🗑️</span>
                  </button>
                </div>
              </div>
            `).join('') : '<p class="no-appointments">Geen aankomende afspraken</p>'}
          </div>
        </div>
        
        <div class="detail-section">
          <h3>Afgelopen Afspraken (${pastAppointments.length})</h3>
          <div class="appointments-list">
            ${pastAppointments.length > 0 ? pastAppointments.slice(0, 5).map(apt => `
              <div class="appointment-item past">
                <div class="appointment-date">${new Date(apt.datumtijd).toLocaleDateString('nl-NL')}</div>
                <div class="appointment-time">${new Date(apt.datumtijd).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'})}</div>
                <div class="appointment-service">${apt.dienst_naam}</div>
                <div class="appointment-barber">${apt.barber_naam}</div>
                <div class="appointment-price">€${apt.dienst_prijs}</div>
              </div>
            `).join('') : '<p class="no-appointments">Geen afgelopen afspraken</p>'}
            ${pastAppointments.length > 5 ? `<p class="more-appointments">... en ${pastAppointments.length - 5} meer</p>` : ''}
          </div>
        </div>
        
        <div class="detail-section">
          <h3>Notities</h3>
          <div class="notes-section">
            <div class="add-note">
              <textarea id="new-note" placeholder="Voeg een notitie toe..." rows="3"></textarea>
              <button class="btn btn-primary" onclick="addCustomerNote(${customer.id})">Notitie Toevoegen</button>
            </div>
            <div class="notes-list" id="notes-list-${customer.id}">
              ${customer.notities ? customer.notities.map(note => `
                <div class="note-item">
                  <div class="note-content">${note.content}</div>
                  <div class="note-date">${new Date(note.created_at).toLocaleDateString('nl-NL')}</div>
                  <button class="btn-delete-note" onclick="deleteCustomerNote(${customer.id}, ${note.id})">×</button>
                </div>
              `).join('') : '<p class="no-notes">Geen notities</p>'}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  `;
  
  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Add event listener for modal close on background click
  const modal = document.getElementById('customerModal');
  if (modal) {
    // Ensure modal is visible
    modal.style.display = 'block';
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeCustomerModal();
      }
    });
  } else {
    console.error('Modal element not found after adding to page');
  }
}

function closeCustomerModal() {
  const modal = document.getElementById('customerModal');
  if (modal) {
    modal.remove();
  }
}

function editCustomer(customerId) {
  const customer = allCustomers.find(c => c.id === customerId);
  if (!customer) {
    alert('Klant niet gevonden');
    return;
  }
  
  // Create edit modal
  const editModalHTML = `
    <div class="modal" id="editCustomerModal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1001;">
      <div class="modal-content" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
        <div class="edit-customer-header">
          <h2>Klant Bewerken: ${customer.naam}</h2>
          <button class="close-edit" onclick="window.closeEditModal()">&times;</button>
        </div>
        
        <form id="editCustomerForm" class="edit-customer-form">
          <div class="form-row">
            <div class="form-group">
              <label for="edit-name">Naam:</label>
              <input type="text" id="edit-name" value="${customer.naam}" required>
            </div>
            <div class="form-group">
              <label for="edit-email">Email:</label>
              <input type="email" id="edit-email" value="${customer.email}" required>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="edit-phone">Telefoon:</label>
              <input type="tel" id="edit-phone" value="${customer.telefoon || ''}">
            </div>
            <div class="form-group">
              <label for="edit-birthdate">Geboortedatum:</label>
              <input type="date" id="edit-birthdate" value="${customer.geboortedatum || ''}">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="edit-loyalty-points">Loyaliteitspunten:</label>
              <input type="number" id="edit-loyalty-points" value="${customer.loyaliteitspunten || 0}" min="0">
            </div>
            <div class="form-group">
              <label for="edit-total-appointments">Totaal Afspraken:</label>
              <input type="number" id="edit-total-appointments" value="${customer.totaal_afspraken || 0}" min="0" readonly>
              <small>Dit wordt automatisch bijgewerkt</small>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="window.closeEditModal()">Annuleren</button>
            <button type="submit" class="btn btn-primary">Opslaan</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Add edit modal to page
  document.body.insertAdjacentHTML('beforeend', editModalHTML);
  
  // Add form submit handler
  document.getElementById('editCustomerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateCustomer(customerId);
  });
}

async function updateCustomer(customerId) {
  try {
    const sb = window.supabase;
    
    const updatedData = {
      naam: document.getElementById('edit-name').value,
      email: document.getElementById('edit-email').value,
      telefoon: document.getElementById('edit-phone').value || null,
      geboortedatum: document.getElementById('edit-birthdate').value || null,
      loyaliteitspunten: parseInt(document.getElementById('edit-loyalty-points').value) || 0
    };
    
    const { error } = await sb
      .from('customers')
      .update(updatedData)
      .eq('id', customerId);
    
    if (error) throw error;
    
    // Update local data
    const customerIndex = allCustomers.findIndex(c => c.id === customerId);
    if (customerIndex !== -1) {
      allCustomers[customerIndex] = { ...allCustomers[customerIndex], ...updatedData };
      filteredCustomers = [...allCustomers];
    }
    
    // Close edit modal
    closeEditModal();
    
    // Refresh customer list
    await renderCustomers();
    
    alert('Klant succesvol bijgewerkt!');
    
  } catch (error) {
    console.error('Error updating customer:', error);
    alert('Fout bij bijwerken van klant');
  }
}

function closeEditModal() {
  const modal = document.getElementById('editCustomerModal');
  if (modal) {
    modal.remove();
  }
}

// Notities functionaliteit
async function addCustomerNote(customerId) {
  const noteContent = document.getElementById('new-note').value.trim();
  if (!noteContent) {
    alert('Voer een notitie in');
    return;
  }
  
  try {
    const sb = window.supabase;
    const { error } = await sb
      .from('customer_notes')
      .insert({
        customer_id: customerId,
        content: noteContent
      });
    
    if (error) throw error;
    
    // Clear textarea
    document.getElementById('new-note').value = '';
    
    // Refresh customer details
    showCustomerDetails(customerId);
    
  } catch (error) {
    console.error('Error adding note:', error);
    alert('Fout bij toevoegen van notitie');
  }
}

async function deleteCustomerNote(customerId, noteId) {
  if (!confirm('Weet je zeker dat je deze notitie wilt verwijderen?')) return;
  
  try {
    const sb = window.supabase;
    const { error } = await sb
      .from('customer_notes')
      .delete()
      .eq('id', noteId);
    
    if (error) throw error;
    
    // Refresh customer details
    showCustomerDetails(customerId);
    
  } catch (error) {
    console.error('Error deleting note:', error);
    alert('Fout bij verwijderen van notitie');
  }
}

function toggleAppointmentManagement(customerId) {
  // This function is now handled by the inline appointment actions
  console.log('Appointment management toggled for customer:', customerId);
}

async function editAppointment(appointmentId) {
  try {
    const sb = window.supabase;
    
    // Get appointment details
    const { data: appointment, error: fetchError } = await sb
      .from('boekingen')
      .select('*')
      .eq('id', appointmentId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Get barber and service data
    const barberData = await getBarberData(appointment.barber_id);
    const serviceData = await getServiceData(appointment.dienst_id);
    
    // Get all services and barbers for dropdowns
    const { data: allServices } = await sb.from('diensten').select('*').order('naam');
    const { data: allBarbers } = await sb.from('barbers').select('*').order('naam');
    
    // Create edit modal
    const editModalHTML = `
      <div class="modal" id="editAppointmentModal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1002;">
        <div class="modal-content" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
          <div class="edit-appointment-header">
            <h2>Afspraak Bewerken</h2>
            <button class="close-edit" onclick="closeEditAppointmentModal()">&times;</button>
          </div>
          
          <form id="editAppointmentForm" class="edit-appointment-form">
            <div class="form-group">
              <label for="edit-apt-date">Datum:</label>
              <input type="date" id="edit-apt-date" value="${appointment.datumtijd.split('T')[0]}" required>
            </div>
            
            <div class="form-group">
              <label for="edit-apt-time">Tijd:</label>
              <input type="time" id="edit-apt-time" value="${appointment.datumtijd.split('T')[1].substring(0, 5)}" required>
            </div>
            
            <div class="form-group">
              <label for="edit-apt-service">Dienst:</label>
              <select id="edit-apt-service" required>
                ${allServices.map(service => `
                  <option value="${service.id}" ${service.id === appointment.dienst_id ? 'selected' : ''}>
                    ${service.naam} - €${service.prijs_euro}
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label for="edit-apt-barber">Barber:</label>
              <select id="edit-apt-barber" required>
                ${allBarbers.map(barber => `
                  <option value="${barber.id}" ${barber.id === appointment.barber_id ? 'selected' : ''}>
                    ${barber.naam}
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="closeEditAppointmentModal()">Annuleren</button>
              <button type="submit" class="btn btn-primary">Opslaan</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Add edit modal to page
    document.body.insertAdjacentHTML('beforeend', editModalHTML);
    
    // Add form submit handler
    document.getElementById('editAppointmentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await updateAppointment(appointmentId);
    });
    
  } catch (error) {
    console.error('Error editing appointment:', error);
    alert('Fout bij laden van afspraak details');
  }
}

async function updateAppointment(appointmentId) {
  try {
    const sb = window.supabase;
    
    const date = document.getElementById('edit-apt-date').value;
    const time = document.getElementById('edit-apt-time').value;
    const serviceId = document.getElementById('edit-apt-service').value;
    const barberId = document.getElementById('edit-apt-barber').value;
    
    const newDateTime = `${date}T${time}:00`;
    
    const { error } = await sb
      .from('boekingen')
      .update({
        datumtijd: newDateTime,
        dienst_id: parseInt(serviceId),
        barber_id: parseInt(barberId)
      })
      .eq('id', appointmentId);
    
    if (error) throw error;
    
    // Close edit modal
    closeEditAppointmentModal();
    
    // Refresh customer details
    const customerId = document.querySelector('#customerModal')?.dataset.customerId;
    if (customerId) {
      showCustomerDetails(parseInt(customerId));
    }
    
    alert('Afspraak succesvol bijgewerkt!');
    
  } catch (error) {
    console.error('Error updating appointment:', error);
    alert('Fout bij bijwerken van afspraak');
  }
}

async function deleteAppointment(appointmentId) {
  if (!confirm('Weet je zeker dat je deze afspraak wilt verwijderen?')) return;
  
  try {
    const sb = window.supabase;
    
    // Ensure appointmentId is a number, not an event object
    const id = typeof appointmentId === 'number' ? appointmentId : parseInt(appointmentId);
    
    if (isNaN(id)) {
      console.error('Invalid appointment ID:', appointmentId);
      alert('Ongeldige afspraak ID');
      return;
    }
    
    console.log('Deleting appointment with ID:', id);
    
    const { error } = await sb
      .from('boekingen')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Refresh customer details
    const customerId = document.querySelector('#customerModal')?.dataset.customerId;
    if (customerId) {
      showCustomerDetails(parseInt(customerId));
    }
    
    alert('Afspraak succesvol verwijderd!');
    
  } catch (error) {
    console.error('Error deleting appointment:', error);
    alert('Fout bij verwijderen van afspraak: ' + error.message);
  }
}

function closeEditAppointmentModal() {
  const modal = document.getElementById('editAppointmentModal');
  if (modal) {
    modal.remove();
  }
}

// Make functions globally available
window.showCustomerDetails = showCustomerDetails;
window.closeCustomerModal = closeCustomerModal;
window.editCustomer = editCustomer;
window.closeEditModal = closeEditModal;
window.addCustomerNote = addCustomerNote;
window.deleteCustomerNote = deleteCustomerNote;
window.toggleAppointmentManagement = toggleAppointmentManagement;
window.editAppointment = editAppointment;
window.deleteAppointment = deleteAppointment;
window.closeEditAppointmentModal = closeEditAppointmentModal;

// Helper functions
async function getBarberData(barberId) {
  try {
    const sb = window.supabase;
    const { data, error } = await sb
      .from('barbers')
      .select('naam')
      .eq('id', barberId)
      .single();
    
    return error ? null : data;
  } catch (error) {
    console.error('Error fetching barber data:', error);
    return null;
  }
}

async function getServiceData(serviceId) {
  try {
    const sb = window.supabase;
    const { data, error } = await sb
      .from('diensten')
      .select('naam, prijs_euro')
      .eq('id', serviceId)
      .single();
    
    return error ? null : data;
  } catch (error) {
    console.error('Error fetching service data:', error);
    return null;
  }
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
