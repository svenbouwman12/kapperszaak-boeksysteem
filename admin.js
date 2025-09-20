// ====================== Gebruik globale Supabase client ======================
const supabase = window.supabase;

// Global variables for current user
let currentUser = null;
let currentUserRole = null;

// Get current user and their role
async function getCurrentUserInfo() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return null;
    }

    // Get user role from admin_users table
    const { data: adminUser, error: roleError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !adminUser) {
      console.error('Role error:', roleError);
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: adminUser.role
    };
  } catch (error) {
    console.error('Error getting current user info:', error);
    return null;
  }
}

// Role-based access control
function hasPermission(action, resource) {
  if (!currentUserRole) return false;
  
  const permissions = {
    admin: ['*'], // Admin can do everything
    manager: ['read', 'write', 'update', 'delete'], // Manager can do most things
    staff: ['read', 'write', 'update'], // Staff can read, write, update but not delete
    viewer: ['read'] // Viewer can only read
  };
  
  const userPermissions = permissions[currentUserRole] || [];
  return userPermissions.includes('*') || userPermissions.includes(action);
}

function canAccessTab(tabId) {
  if (!currentUserRole) return false;
  
  const tabPermissions = {
    'boekingen': ['admin', 'manager', 'staff', 'viewer'], // Everyone can see bookings
    'diensten': ['admin', 'manager', 'staff'], // Staff and above can manage services
    'barbers': ['admin', 'manager', 'staff'], // Staff and above can manage barbers
    'klanten': ['admin', 'manager', 'staff'], // Staff and above can manage customers
    'gebruikers': ['admin'], // Only admin can manage users
    'statistieken': ['admin', 'manager'], // Only admin and manager can see stats
    'instellingen': ['admin'] // Only admin can change settings
  };
  
  const allowedRoles = tabPermissions[tabId] || [];
  return allowedRoles.includes(currentUserRole);
}

// Apply role-based access control to tabs
function applyRoleBasedAccess() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  
  tabButtons.forEach(button => {
    const tabId = button.getAttribute('data-tab');
    
    if (!canAccessTab(tabId)) {
      button.style.display = 'none';
    }
  });
  
  // Hide delete buttons for staff and viewer roles
  if (!hasPermission('delete')) {
    const deleteButtons = document.querySelectorAll('[class*="delete"], [id*="delete"], [onclick*="delete"]');
    deleteButtons.forEach(button => {
      button.style.display = 'none';
    });
  }
  
  // Show user info
  if (currentUser) {
    const header = document.querySelector('header h1');
    if (header) {
      const roleDisplay = {
        admin: '🔑 Administrator',
        manager: '👨‍💼 Manager', 
        staff: '👤 Medewerker',
        viewer: '👁️ Bekijker'
      };
      
      const roleText = roleDisplay[currentUserRole] || currentUserRole;
      header.innerHTML += ` <span style="font-size: 0.7em; color: #666;">(${roleText})</span>`;
    }
  }
}

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
      const targetPanel = document.getElementById(targetSubTab);
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
  if (!hasPermission('delete')) {
    alert('Je hebt geen toestemming om afspraken te verwijderen.');
    return;
  }
  
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

async function fetchBarberAvailability(barberId) {
  if (!barberId) return null;
  try {
    const { data, error } = await supabase
      .from('barber_availability')
      .select('*')
      .eq('barber_id', barberId);
    
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error fetching barber availability:', e);
    return [];
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
  
  // Update header week display
  const currentWeekDisplayElement = document.getElementById('currentWeekDisplay');
  if (currentWeekDisplayElement) {
    const startDate = currentWeekStart.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' });
    const endDate = currentWeekEnd.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
    currentWeekDisplayElement.textContent = `Week van ${startDate} - ${endDate}`;
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
    
    // Auto-load Sven's appointments by default
    filterAppointmentsByBarber(1); // Sven's ID is 1
    
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
  
  // Calculate height: each 15-minute slot is 40px
  // For 30 minutes: (30 / 15) * 40 = 2 * 40 = 80px
  // For 15 minutes: (15 / 15) * 40 = 1 * 40 = 40px
  // Subtract 2px for border (1px top + 1px bottom) since box-sizing is border-box
  const heightPixels = Math.max((serviceDuration / 15) * 40 - 2, 38); // Minimum 38px height (1 slot minus border)
  console.log(`🔧 Height calculation: ${serviceDuration}min / 15 * 40 - 2 = ${heightPixels}px`);
  
  // Position: each hour is 160px, each 15 minutes is 40px
  // For 15:00: (15 * 160) + (0 / 15 * 40) = 2400 + 0 = 2400px
  // For 15:15: (15 * 160) + (15 / 15 * 40) = 2400 + 40 = 2440px
  const topPositionPixels = (appointmentDate.getHours() * 160) + (appointmentDate.getMinutes() / 15 * 40);
  
  console.log(`Appointment ${appointment.id}:`);
  console.log(`  Time: ${appointmentDate.toLocaleTimeString()}`);
  console.log(`  Duration: ${serviceDuration} minutes`);
  console.log(`  Height: ${heightPixels}px (${serviceDuration / 15} slots)`);
  console.log(`  Top: ${topPositionPixels}px`);
  console.log(`  Bottom: ${topPositionPixels + heightPixels}px`);
  
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
  
  // Reset day view flag
  window.inDayView = false;
  
  // Clear all appointments first
  document.querySelectorAll('.day-appointments').forEach(container => {
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
  
  // Set day view flag
  window.inDayView = true;
  
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
  
  // Check if the appointment would end after barber shift end time
  try {
    const serviceDuration = await getServiceDuration(serviceId);
    const barberAvailability = await fetchBarberAvailability(parseInt(barberId));
    const appointmentDateObj = new Date(appointmentDate);
    const dayOfWeek = appointmentDateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const workingHours = barberAvailability?.find(avail => avail.day_of_week === dayName);
    
    if (workingHours) {
      const shiftEndTime = workingHours.end || '17:00';
      const [shiftEndHour, shiftEndMin] = shiftEndTime.split(':').map(Number);
      const shiftEndDateTime = new Date(appointmentDateObj);
      shiftEndDateTime.setHours(shiftEndHour, shiftEndMin, 0, 0);
      
      const [timeHour, timeMin] = appointmentTime.split(':').map(Number);
      const bookingStartDateTime = new Date(appointmentDateObj);
      bookingStartDateTime.setHours(timeHour, timeMin, 0, 0);
      const bookingEndDateTime = new Date(bookingStartDateTime.getTime() + serviceDuration * 60000);
      
      if (bookingEndDateTime > shiftEndDateTime) {
        const endTimeStr = bookingEndDateTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        const shiftEndStr = shiftEndDateTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        return alert(`Deze afspraak zou eindigen om ${endTimeStr}, maar de barber werkt maar tot ${shiftEndStr}. Kies een eerder tijdstip.`);
      }
    }
  } catch (error) {
    console.error('Error validating appointment time:', error);
    // Continue with save if validation fails (fallback)
  }
  
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
  
  if (!hasPermission('delete')) {
    alert('Je hebt geen toestemming om afspraken te verwijderen.');
    return;
  }
  
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
  console.log('🔥 navigateWeek called with direction:', direction);
  console.log('🔥 currentWeekStart before:', currentWeekStart);
  
  if (direction === 'prev') {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  } else {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }
  
  currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);
  
  console.log('🔥 currentWeekStart after:', currentWeekStart);
  console.log('🔥 currentWeekEnd:', currentWeekEnd);
  
  updateWeekDisplay();
  
  // Reload appointments for the new week
  loadWeekAppointments();
}

window.addEventListener('DOMContentLoaded', async () => {
  // Only run admin functionality on admin pages
  if (!window.location.pathname.includes('admin.html')) {
    return;
  }
  
  // Initialize tabs first
  initTabs();
  initSubTabs();
  
  // Initialize user management
  initUserManagement();
  
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
  
  // Initialize statistics dashboard
  initializeStatisticsDashboard();
  
  // Initialize customer import functionality
  initializeCustomerImport();
  
  // Admin availability controls removed - now handled in Barbers tab
  
  // Add week navigation event listeners
  document.getElementById('prevWeekBtn')?.addEventListener('click', () => navigateWeek('prev'));
  document.getElementById('nextWeekBtn')?.addEventListener('click', () => navigateWeek('next'));
  
  
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

// ====================== User Management ======================
async function loadUsers() {
  try {
    console.log('Loading users...');
    const sb = window.supabase;
    
    if (!sb) {
      console.error('Supabase client not found');
      return;
    }
    
    const { data, error } = await sb
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading users:', error);
      
      // Check if it's a table not found error
      if (error.code === 'PGRST116' || error.message.includes('relation "admin_users" does not exist')) {
        const usersList = document.getElementById('usersList');
        if (usersList) {
          usersList.innerHTML = `
            <div style="text-align: center; padding: 20px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; color: #856404;">
              <h4>⚠️ Database tabel niet gevonden</h4>
              <p>De admin_users tabel bestaat nog niet in de database.</p>
              <p><strong>Oplossing:</strong> Voer het SQL script uit in Supabase:</p>
              <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; font-size: 12px;">
                create_admin_users_simple.sql
              </div>
              <p>Na het uitvoeren van het script kun je gebruikers toevoegen.</p>
            </div>
          `;
        }
        return;
      }
      
      // Other errors
      const usersList = document.getElementById('usersList');
      if (usersList) {
        usersList.innerHTML = `
          <div style="text-align: center; padding: 20px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; color: #721c24;">
            <h4>❌ Fout bij laden gebruikers</h4>
            <p>Er is een fout opgetreden: ${error.message}</p>
            <p>Controleer je database verbinding en rechten.</p>
          </div>
        `;
      }
      return;
    }
    
    console.log('Users loaded:', data);
    renderUsers(data || []);
  } catch (error) {
    console.error('Error in loadUsers:', error);
    
    const usersList = document.getElementById('usersList');
    if (usersList) {
      usersList.innerHTML = `
        <div style="text-align: center; padding: 20px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; color: #721c24;">
          <h4>❌ Onverwachte fout</h4>
          <p>Er is een onverwachte fout opgetreden: ${error.message}</p>
        </div>
      `;
    }
  }
}

function renderUsers(users) {
  const usersList = document.getElementById('usersList');
  if (!usersList) return;
  
  if (!users || users.length === 0) {
    usersList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Geen gebruikers gevonden.</p>';
    return;
  }
  
  const usersHTML = users.map(user => {
    const roleDisplay = getRoleDisplay(user.role);
    const roleClass = getRoleClass(user.role);
    
    return `
      <div class="user-card" data-user-id="${user.id}">
        <div class="user-info">
          <div class="user-email">${user.email}</div>
          <div class="user-role">${roleDisplay}</div>
        </div>
        <div class="user-actions">
          <select class="btn-role" onchange="changeUserRole('${user.id}', this.value)">
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>🔑 Administrator</option>
            <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>👨‍💼 Manager</option>
            <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>👤 Medewerker</option>
            <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>👁️ Bekijker</option>
          </select>
          <button class="btn-role btn-delete-user" onclick="deleteUser('${user.id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
  
  usersList.innerHTML = usersHTML;
}

function getRoleDisplay(role) {
  const roleMap = {
    'admin': '🔑 Administrator',
    'manager': '👨‍💼 Manager', 
    'staff': '👤 Medewerker',
    'viewer': '👁️ Bekijker'
  };
  return roleMap[role] || role;
}

function getRoleClass(role) {
  return `role-${role}`;
}

async function addUser() {
  try {
    if (currentUserRole !== 'admin') {
      alert('Alleen administrators kunnen nieuwe gebruikers toevoegen.');
      return;
    }
    
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    
    if (!email || !password || !role) {
      alert('Vul alle velden in.');
      return;
    }
    
    if (!isValidEmail(email)) {
      alert('Voer een geldig e-mailadres in.');
      return;
    }
    
    if (password.length < 6) {
      alert('Wachtwoord moet minimaal 6 karakters lang zijn.');
      return;
    }
    
    const sb = window.supabase;
    
    // Create user using signUp (works with anon key)
    const { data: authData, error: authError } = await sb.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: window.location.origin + '/admin-login.html'
      }
    });
    
    if (authError) {
      console.error('Auth error:', authError);
      alert('Fout bij aanmaken gebruiker: ' + authError.message);
      return;
    }
    
    if (!authData.user) {
      alert('Gebruiker kon niet worden aangemaakt.');
      return;
    }
    
    // Add user to admin_users table
    const { data: userData, error: userError } = await sb
      .from('admin_users')
      .insert({
        id: authData.user.id,
        email: email,
        role: role,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (userError) {
      console.error('User table error:', userError);
      
      // Check if it's a table not found error
      if (userError.code === 'PGRST116' || userError.message.includes('relation "admin_users" does not exist')) {
        alert('⚠️ Database tabel niet gevonden!\n\nVoer eerst het SQL script uit in Supabase:\ncreate_admin_users_simple.sql\n\nNa het uitvoeren kun je gebruikers toevoegen.');
        return;
      }
      
      alert('Fout bij opslaan gebruiker gegevens: ' + userError.message);
      return;
    }
    
    console.log('User created successfully:', userData);
    
    // Clear form
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserPassword').value = '';
    document.getElementById('newUserRole').value = 'staff';
    
    // Reload users
    await loadUsers();
    
    alert('Gebruiker succesvol toegevoegd! Ze kunnen direct inloggen.');
    
  } catch (error) {
    console.error('Error in addUser:', error);
    alert('Er is een fout opgetreden bij het toevoegen van de gebruiker: ' + error.message);
  }
}

async function changeUserRole(userId, newRole) {
  try {
    if (currentUserRole !== 'admin') {
      alert('Alleen administrators kunnen gebruikersrollen wijzigen.');
      return;
    }
    
    if (!confirm('Weet je zeker dat je de rol van deze gebruiker wilt wijzigen?')) {
      return;
    }
    
    const sb = window.supabase;
    
    const { error } = await sb
      .from('admin_users')
      .update({ role: newRole })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating user role:', error);
      alert('Fout bij wijzigen van rol.');
      return;
    }
    
    console.log('User role updated successfully');
    await loadUsers();
    
  } catch (error) {
    console.error('Error in changeUserRole:', error);
    alert('Er is een fout opgetreden bij het wijzigen van de rol.');
  }
}

async function deleteUser(userId) {
  try {
    if (currentUserRole !== 'admin') {
      alert('Alleen administrators kunnen gebruikers verwijderen.');
      return;
    }
    
    if (!confirm('Weet je zeker dat je deze gebruiker wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.')) {
      return;
    }
    
    const sb = window.supabase;
    
    // Delete from admin_users table (this will also delete from auth.users due to CASCADE)
    const { error: userError } = await sb
      .from('admin_users')
      .delete()
      .eq('id', userId);
    
    if (userError) {
      console.error('Error deleting user from table:', userError);
      alert('Fout bij verwijderen van gebruiker: ' + userError.message);
      return;
    }
    
    console.log('User deleted successfully');
    await loadUsers();
    alert('Gebruiker succesvol verwijderd!');
    
  } catch (error) {
    console.error('Error in deleteUser:', error);
    alert('Er is een fout opgetreden bij het verwijderen van de gebruiker: ' + error.message);
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


function searchUsers() {
  const searchTerm = document.getElementById('userSearch').value.toLowerCase();
  const roleFilter = document.getElementById('roleFilter').value;
  
  const userCards = document.querySelectorAll('.user-card');
  
  userCards.forEach(card => {
    const email = card.querySelector('.user-email').textContent.toLowerCase();
    const role = card.querySelector('select').value;
    
    const matchesSearch = email.includes(searchTerm);
    const matchesRole = roleFilter === 'all' || role === roleFilter;
    
    if (matchesSearch && matchesRole) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

function initUserManagement() {
  // Add user button
  const addUserBtn = document.getElementById('addUserBtn');
  if (addUserBtn) {
    addUserBtn.addEventListener('click', addUser);
  }
  
  // Search functionality
  const userSearch = document.getElementById('userSearch');
  if (userSearch) {
    userSearch.addEventListener('input', searchUsers);
  }
  
  const searchUserBtn = document.getElementById('searchUserBtn');
  if (searchUserBtn) {
    searchUserBtn.addEventListener('click', searchUsers);
  }
  
  // Role filter
  const roleFilter = document.getElementById('roleFilter');
  if (roleFilter) {
    roleFilter.addEventListener('change', searchUsers);
  }
  
  // Load users when tab is activated
  const gebruikersTab = document.querySelector('[data-tab="gebruikers"]');
  if (gebruikersTab) {
    gebruikersTab.addEventListener('click', () => {
      setTimeout(loadUsers, 100); // Small delay to ensure tab is active
    });
  }
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
      .in('key', ['loyalty_enabled', 'points_per_appointment', 'points_for_discount', 'discount_percentage', 'dark_mode_enabled', 'primary_color', 'secondary_color', 'background_color', 'text_color', 'site_title', 'time_slot_interval', 'max_advance_booking']);
    
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
      discount_percentage: '50',
      dark_mode_enabled: 'true',
      primary_color: '#F28B82',
      secondary_color: '#e67e73',
      background_color: '#f8f9fa',
      text_color: '#333333',
      site_title: 'Boekingssysteem',
      time_slot_interval: '15',
      max_advance_booking: '30'
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
    
    // Theme settings
    const darkModeEnabledEl = document.getElementById('darkModeEnabled');
    const primaryColorEl = document.getElementById('primaryColor');
    const secondaryColorEl = document.getElementById('secondaryColor');
    const backgroundColorEl = document.getElementById('backgroundColor');
    const textColorEl = document.getElementById('textColor');
    const siteTitleEl = document.getElementById('siteTitle');
    const timeSlotIntervalEl = document.getElementById('timeSlotInterval');
    const maxAdvanceBookingEl = document.getElementById('maxAdvanceBooking');
    
    // Apply loyalty settings
    if (loyaltyEnabledEl) loyaltyEnabledEl.checked = settings.loyalty_enabled === 'true';
    if (pointsPerAppointmentEl) pointsPerAppointmentEl.value = settings.points_per_appointment;
    if (pointsForDiscountEl) pointsForDiscountEl.value = settings.points_for_discount;
    if (discountPercentageEl) discountPercentageEl.value = settings.discount_percentage;
    
    // Apply theme settings
    if (darkModeEnabledEl) darkModeEnabledEl.checked = settings.dark_mode_enabled === 'true';
    if (primaryColorEl) primaryColorEl.value = settings.primary_color;
    if (secondaryColorEl) secondaryColorEl.value = settings.secondary_color;
    if (backgroundColorEl) backgroundColorEl.value = settings.background_color;
    if (textColorEl) textColorEl.value = settings.text_color;
    if (siteTitleEl) siteTitleEl.value = settings.site_title;
    if (timeSlotIntervalEl) timeSlotIntervalEl.value = settings.time_slot_interval;
    if (maxAdvanceBookingEl) maxAdvanceBookingEl.value = settings.max_advance_booking;
    
    // Apply theme to frontend
    applyThemeSettings(settings);
    
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
    
    // Set default theme settings
    const darkModeEnabledEl = document.getElementById('darkModeEnabled');
    const primaryColorEl = document.getElementById('primaryColor');
    const secondaryColorEl = document.getElementById('secondaryColor');
    const backgroundColorEl = document.getElementById('backgroundColor');
    const textColorEl = document.getElementById('textColor');
    const siteTitleEl = document.getElementById('siteTitle');
    const timeSlotIntervalEl = document.getElementById('timeSlotInterval');
    const maxAdvanceBookingEl = document.getElementById('maxAdvanceBooking');
    
    if (darkModeEnabledEl) darkModeEnabledEl.checked = true;
    if (primaryColorEl) primaryColorEl.value = '#F28B82';
    if (secondaryColorEl) secondaryColorEl.value = '#e67e73';
    if (backgroundColorEl) backgroundColorEl.value = '#f8f9fa';
    if (textColorEl) textColorEl.value = '#333333';
    if (siteTitleEl) siteTitleEl.value = 'Boekingssysteem';
    if (timeSlotIntervalEl) timeSlotIntervalEl.value = '15';
    if (maxAdvanceBookingEl) maxAdvanceBookingEl.value = '30';
    
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
      discount_percentage: document.getElementById('discountPercentage').value,
      dark_mode_enabled: document.getElementById('darkModeEnabled').checked.toString(),
      primary_color: document.getElementById('primaryColor').value,
      secondary_color: document.getElementById('secondaryColor').value,
      background_color: document.getElementById('backgroundColor').value,
      text_color: document.getElementById('textColor').value,
      site_title: document.getElementById('siteTitle').value,
      time_slot_interval: document.getElementById('timeSlotInterval').value,
      max_advance_booking: document.getElementById('maxAdvanceBooking').value
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
    
    // Apply theme settings to frontend
    applyThemeSettings(settings);
    
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
    'discount_percentage': 'Discount percentage when threshold is reached',
    'dark_mode_enabled': 'Enable dark mode toggle for users',
    'primary_color': 'Primary color of the website',
    'secondary_color': 'Secondary color for hover effects',
    'background_color': 'Background color of the website',
    'text_color': 'Base text color of the website',
    'site_title': 'Website title displayed in header',
    'time_slot_interval': 'Interval between available time slots',
    'max_advance_booking': 'Maximum days in advance customers can book'
  };
  return descriptions[key] || '';
}

function resetSettings() {
  if (confirm('Weet je zeker dat je alle instellingen wilt resetten naar de standaardwaarden?')) {
    // Loyalty settings
    document.getElementById('loyaltyEnabled').checked = true;
    document.getElementById('pointsPerAppointment').value = 25;
    document.getElementById('pointsForDiscount').value = 100;
    document.getElementById('discountPercentage').value = 50;
    
    // Theme settings
    document.getElementById('darkModeEnabled').checked = true;
    document.getElementById('primaryColor').value = '#F28B82';
    document.getElementById('secondaryColor').value = '#e67e73';
    document.getElementById('backgroundColor').value = '#f8f9fa';
    document.getElementById('textColor').value = '#333333';
    
    // Display settings
    document.getElementById('siteTitle').value = 'Boekingssysteem';
    document.getElementById('timeSlotInterval').value = '15';
    document.getElementById('maxAdvanceBooking').value = '30';
    
    alert('Instellingen gereset naar standaardwaarden. Klik "Opslaan" om de wijzigingen te bevestigen.');
  }
}

function applyThemeSettings(settings) {
  // Apply CSS custom properties
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
  
  // Update site title if it exists
  const siteTitleElement = document.querySelector('h1 a, .site-title');
  if (siteTitleElement && settings.site_title) {
    siteTitleElement.textContent = settings.site_title;
  }
  
  // Update page title
  if (settings.site_title) {
    document.title = settings.site_title;
  }
  
  console.log('Theme settings applied:', settings);
}

function previewTheme() {
  // Apply theme changes temporarily for preview
  const primaryColor = document.getElementById('primaryColor').value;
  const secondaryColor = document.getElementById('secondaryColor').value;
  const backgroundColor = document.getElementById('backgroundColor').value;
  const textColor = document.getElementById('textColor').value;
  
  // Create temporary CSS variables
  const style = document.createElement('style');
  style.id = 'theme-preview';
  style.textContent = `
    :root {
      --accent: ${primaryColor} !important;
      --accent-hover: ${secondaryColor} !important;
      --surface: ${backgroundColor} !important;
      --text: ${textColor} !important;
    }
  `;
  
  // Remove existing preview
  const existingPreview = document.getElementById('theme-preview');
  if (existingPreview) {
    existingPreview.remove();
  }
  
  // Add new preview
  document.head.appendChild(style);
  
  // Show preview message
  const message = document.createElement('div');
  message.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${primaryColor};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-weight: 600;
  `;
  message.textContent = '🎨 Thema voorbeeld actief - klik buiten dit bericht om te sluiten';
  document.body.appendChild(message);
  
  // Remove preview after 5 seconds or on click
  setTimeout(() => {
    if (message.parentNode) {
      message.remove();
    }
    if (style.parentNode) {
      style.remove();
    }
  }, 5000);
  
  message.addEventListener('click', () => {
    message.remove();
    style.remove();
  });
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
document.addEventListener('DOMContentLoaded', async () => {
  // Load current user info and apply role-based access control
  currentUser = await getCurrentUserInfo();
  if (currentUser) {
    currentUserRole = currentUser.role;
    console.log('Current user:', currentUser);
    applyRoleBasedAccess();
  } else {
    console.error('Could not load current user info');
    // Redirect to login if no user info
    window.location.href = 'admin-login.html';
    return;
  }
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
  document.getElementById('previewTheme')?.addEventListener('click', previewTheme);
  
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

// ====================== Statistics Dashboard ======================
function initializeStatisticsDashboard() {
  console.log('Initializing statistics dashboard...');
  
  // Add event listeners
  const refreshStatsBtn = document.getElementById('refreshStats');
  const statsDateRange = document.getElementById('statsDateRange');
  
  if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener('click', loadStatistics);
  }
  
  if (statsDateRange) {
    statsDateRange.addEventListener('change', loadStatistics);
  }
  
  // Load initial statistics
  loadStatistics();
  
  // Set up auto-refresh every 30 seconds when on statistics tab
  setInterval(() => {
    const statsTab = document.getElementById('statistieken');
    if (statsTab && statsTab.classList.contains('active')) {
      console.log('Auto-refreshing statistics...');
      loadStatistics();
    }
  }, 30000); // 30 seconds
  
  // Add real-time indicator
  addRealTimeIndicator();
}

function addRealTimeIndicator() {
  const controlsContainer = document.querySelector('.stats-controls');
  if (controlsContainer) {
    const indicator = document.createElement('div');
    indicator.className = 'realtime-indicator';
    indicator.innerHTML = `
      <span class="realtime-dot"></span>
      <span class="realtime-text">Live Data</span>
    `;
    indicator.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-secondary);
    `;
    
    const dot = indicator.querySelector('.realtime-dot');
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      animation: pulse 2s infinite;
    `;
    
    controlsContainer.appendChild(indicator);
  }
}

async function loadStatistics() {
  try {
    console.log('Loading statistics...');
    
    const dateRange = document.getElementById('statsDateRange')?.value || '30';
    const days = parseInt(dateRange);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    console.log(`Loading statistics for period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Load statistics (chart separately to ensure Chart.js is loaded)
    await Promise.all([
      loadRevenueStats(startDate, endDate),
      loadBarberRevenueStats(startDate, endDate),
      loadServiceStats(startDate, endDate),
      loadCustomerInsights(startDate, endDate),
      loadWeeklyTrends(startDate, endDate)
    ]);
    
    // Load chart after a small delay to ensure Chart.js is ready
    setTimeout(() => {
      loadDailyRevenueChart(startDate, endDate);
    }, 100);
    
    console.log('Statistics loaded successfully');
    
  } catch (error) {
    console.error('Error loading statistics:', error);
    alert('Fout bij laden van statistieken: ' + error.message);
  }
}

async function loadRevenueStats(startDate, endDate) {
  try {
    const sb = window.supabase;
    
    // First get all appointments in date range
    const { data: appointments, error } = await sb
      .from('boekingen')
      .select('id, datumtijd, dienst_id, barber_id')
      .gte('datumtijd', startDate.toISOString())
      .lte('datumtijd', endDate.toISOString())
      .order('datumtijd', { ascending: false });
    
    if (error) throw error;
    
    // Then get service details for each appointment
    const serviceIds = [...new Set(appointments.map(apt => apt.dienst_id))];
    const { data: services, error: servicesError } = await sb
      .from('diensten')
      .select('id, naam, prijs_euro, duur_minuten')
      .in('id', serviceIds);
    
    if (servicesError) throw servicesError;
    
    // Create service lookup map
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id] = service;
    });
    
    // Combine appointments with service data
    const appointmentsWithServices = appointments.map(appointment => ({
      ...appointment,
      diensten: serviceMap[appointment.dienst_id] || { naam: 'Onbekende Dienst', prijs_euro: 0, duur_minuten: 0 }
    }));
    
    // Calculate total revenue from actual service prices
    const totalRevenue = appointmentsWithServices.reduce((sum, appointment) => {
      const price = appointment.diensten?.prijs_euro || 0;
      return sum + price;
    }, 0);
    
    // Calculate total appointments
    const totalAppointments = appointmentsWithServices.length;
    
    // Calculate average revenue per appointment
    const avgRevenuePerAppointment = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
    
    // Find busiest day
    const dayStats = {};
    appointmentsWithServices.forEach(appointment => {
      const day = appointment.datumtijd.split('T')[0];
      dayStats[day] = (dayStats[day] || 0) + 1;
    });
    
    const busiestDay = Object.keys(dayStats).length > 0 ? 
      Object.keys(dayStats).reduce((a, b) => dayStats[a] > dayStats[b] ? a : b) : 'Geen data';
    
    const busiestDayCount = dayStats[busiestDay] || 0;
    
    // Update UI with real-time data
    const totalRevenueEl = document.getElementById('totalRevenue');
    const totalAppointmentsEl = document.getElementById('totalAppointments');
    const avgRevenueEl = document.getElementById('avgRevenuePerAppointment');
    const busiestDayEl = document.getElementById('busiestDay');
    const busiestDayCountEl = document.getElementById('busiestDayCount');
    
    if (totalRevenueEl) {
      totalRevenueEl.textContent = `€${totalRevenue.toFixed(2)}`;
      // Add animation for live updates
      totalRevenueEl.style.transform = 'scale(1.05)';
      setTimeout(() => totalRevenueEl.style.transform = 'scale(1)', 200);
    }
    
    if (totalAppointmentsEl) {
      totalAppointmentsEl.textContent = totalAppointments.toString();
      totalAppointmentsEl.style.transform = 'scale(1.05)';
      setTimeout(() => totalAppointmentsEl.style.transform = 'scale(1)', 200);
    }
    
    if (avgRevenueEl) {
      avgRevenueEl.textContent = `€${avgRevenuePerAppointment.toFixed(2)}`;
      avgRevenueEl.style.transform = 'scale(1.05)';
      setTimeout(() => avgRevenueEl.style.transform = 'scale(1)', 200);
    }
    
    if (busiestDayEl) {
      busiestDayEl.textContent = busiestDay !== 'Geen data' ? 
        new Date(busiestDay).toLocaleDateString('nl-NL', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        }) : 'Geen data';
    }
    
    if (busiestDayCountEl) {
      busiestDayCountEl.textContent = `${busiestDayCount} afspraken`;
    }
    
    // Store current data for comparison
    window.lastRevenueStats = {
      totalRevenue,
      totalAppointments,
      avgRevenuePerAppointment,
      busiestDay,
      busiestDayCount,
      timestamp: new Date()
    };
    
    console.log('Revenue stats loaded (real-time):', { 
      totalRevenue, 
      totalAppointments, 
      avgRevenuePerAppointment, 
      busiestDay,
      appointmentCount: appointmentsWithServices.length,
      services: appointmentsWithServices.map(a => ({
        service: a.diensten?.naam,
        price: a.diensten?.prijs_euro,
        date: a.datumtijd
      }))
    });
    
  } catch (error) {
    console.error('Error loading revenue stats:', error);
    
    // Show error in UI
    const totalRevenueEl = document.getElementById('totalRevenue');
    if (totalRevenueEl) {
      totalRevenueEl.textContent = 'Error';
      totalRevenueEl.style.color = '#ef4444';
    }
  }
}

async function loadBarberRevenueStats(startDate, endDate) {
  try {
    const sb = window.supabase;
    
    // Get appointments in date range
    const { data: appointments, error } = await sb
      .from('boekingen')
      .select('id, barber_id, dienst_id, datumtijd')
      .gte('datumtijd', startDate.toISOString())
      .lte('datumtijd', endDate.toISOString())
      .order('datumtijd', { ascending: false });
    
    if (error) throw error;
    
    // Get unique service and barber IDs
    const serviceIds = [...new Set(appointments.map(apt => apt.dienst_id))];
    const barberIds = [...new Set(appointments.map(apt => apt.barber_id))];
    
    // Fetch services and barbers data
    const [servicesResult, barbersResult] = await Promise.all([
      sb.from('diensten').select('id, naam, prijs_euro, duur_minuten').in('id', serviceIds),
      sb.from('barbers').select('id, naam').in('id', barberIds)
    ]);
    
    if (servicesResult.error) throw servicesResult.error;
    if (barbersResult.error) throw barbersResult.error;
    
    // Create lookup maps
    const serviceMap = {};
    servicesResult.data.forEach(service => {
      serviceMap[service.id] = service;
    });
    
    const barberMap = {};
    barbersResult.data.forEach(barber => {
      barberMap[barber.id] = barber;
    });
    
    // Combine appointments with service and barber data
    const appointmentsWithDetails = appointments.map(appointment => ({
      ...appointment,
      diensten: serviceMap[appointment.dienst_id] || { naam: 'Onbekende Dienst', prijs_euro: 0, duur_minuten: 0 },
      barbers: barberMap[appointment.barber_id] || { naam: 'Onbekend' }
    }));
    
    // Group by barber with detailed tracking
    const barberStats = {};
    appointmentsWithDetails.forEach(appointment => {
      const barberId = appointment.barber_id;
      const barberName = appointment.barbers?.naam || 'Onbekend';
      const price = appointment.diensten?.prijs_euro || 0;
      const serviceName = appointment.diensten?.naam || 'Onbekende Dienst';
      
      if (!barberStats[barberId]) {
        barberStats[barberId] = {
          id: barberId,
          name: barberName,
          revenue: 0,
          count: 0,
          services: {},
          appointments: []
        };
      }
      
      barberStats[barberId].revenue += price;
      barberStats[barberId].count += 1;
      barberStats[barberId].appointments.push({
        id: appointment.id,
        date: appointment.datumtijd,
        service: serviceName,
        price: price
      });
      
      // Track service breakdown per barber
      if (!barberStats[barberId].services[serviceName]) {
        barberStats[barberId].services[serviceName] = { count: 0, revenue: 0 };
      }
      barberStats[barberId].services[serviceName].count += 1;
      barberStats[barberId].services[serviceName].revenue += price;
    });
    
    // Sort by revenue (highest first)
    const sortedBarbers = Object.values(barberStats).sort((a, b) => b.revenue - a.revenue);
    
    // Update UI with real-time data
    const container = document.getElementById('barberRevenueGrid');
    if (container) {
      container.innerHTML = '';
      
      sortedBarbers.forEach((barber, index) => {
        const item = document.createElement('div');
        item.className = 'barber-revenue-item';
        
        // Add ranking indicator
        const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        
        item.innerHTML = `
          <div class="barber-revenue-info">
            <h4>${rankIcon} ${barber.name}</h4>
            <p>Kapper • ${Object.keys(barber.services).length} verschillende diensten</p>
          </div>
          <div class="barber-revenue-amount">
            <div class="amount">€${barber.revenue.toFixed(2)}</div>
            <div class="count">${barber.count} afspraken</div>
          </div>
        `;
        
        // Add click to see detailed breakdown
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => showBarberDetails(barber));
        
        container.appendChild(item);
      });
      
      if (sortedBarbers.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Geen afspraken in deze periode</p>';
      }
    }
    
    // Store for comparison
    window.lastBarberStats = {
      barbers: sortedBarbers,
      timestamp: new Date()
    };
    
    console.log('Barber revenue stats loaded (real-time):', {
      totalBarbers: sortedBarbers.length,
      topBarber: sortedBarbers[0]?.name,
      topRevenue: sortedBarbers[0]?.revenue,
      barberDetails: sortedBarbers.map(b => ({
        name: b.name,
        revenue: b.revenue,
        count: b.count,
        services: Object.keys(b.services).length
      })),
      debug: {
        appointmentsCount: appointments.length,
        uniqueBarberIds: barberIds,
        barberMap: Object.keys(barberMap),
        appointmentsWithDetails: appointmentsWithDetails.length
      }
    });
    
  } catch (error) {
    console.error('Error loading barber revenue stats:', error);
    
    // Show error in UI
    const container = document.getElementById('barberRevenueGrid');
    if (container) {
      container.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 20px;">Fout bij laden van kapper statistieken</p>';
    }
  }
}

// Function to show detailed barber breakdown
function showBarberDetails(barber) {
  const modal = document.createElement('div');
  modal.className = 'popup-overlay';
  modal.innerHTML = `
    <div class="popup-content" style="max-width: 600px;">
      <div class="popup-header">
        <h3>📊 ${barber.name} - Detail Rapport</h3>
        <button class="close-btn" onclick="this.closest('.popup-overlay').remove()">×</button>
      </div>
      <div class="popup-body">
        <div style="margin-bottom: 20px;">
          <h4>💰 Totaal: €${barber.revenue.toFixed(2)}</h4>
          <p>${barber.count} afspraken • Gemiddeld €${(barber.revenue / barber.count).toFixed(2)} per afspraak</p>
        </div>
        
        <h4>✂️ Diensten Breakdown:</h4>
        ${Object.entries(barber.services).map(([service, stats]) => `
          <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--surface); margin: 5px 0; border-radius: 4px;">
            <span>${service}</span>
            <span>€${stats.revenue.toFixed(2)} (${stats.count}x)</span>
          </div>
        `).join('')}
        
        <h4 style="margin-top: 20px;">📅 Recente Afspraken:</h4>
        <div style="max-height: 200px; overflow-y: auto;">
          ${barber.appointments.slice(0, 10).map(apt => `
            <div style="display: flex; justify-content: space-between; padding: 5px; font-size: 14px;">
              <span>${new Date(apt.date).toLocaleDateString('nl-NL')} - ${apt.service}</span>
              <span>€${apt.price.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

async function loadServiceStats(startDate, endDate) {
  try {
    const sb = window.supabase;
    
    // Get appointments in date range
    const { data: appointments, error } = await sb
      .from('boekingen')
      .select('id, dienst_id, datumtijd')
      .gte('datumtijd', startDate.toISOString())
      .lte('datumtijd', endDate.toISOString());
    
    if (error) throw error;
    
    // Get unique service IDs
    const serviceIds = [...new Set(appointments.map(apt => apt.dienst_id))];
    
    // Fetch services data
    const { data: services, error: servicesError } = await sb
      .from('diensten')
      .select('id, naam, prijs_euro, duur_minuten')
      .in('id', serviceIds);
    
    if (servicesError) throw servicesError;
    
    // Create service lookup map
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id] = service;
    });
    
    // Combine appointments with service data
    const appointmentsWithServices = appointments.map(appointment => ({
      ...appointment,
      diensten: serviceMap[appointment.dienst_id] || { naam: 'Onbekende Dienst', prijs_euro: 0, duur_minuten: 0 }
    }));
    
    // Group by service
    const serviceStats = {};
    appointmentsWithServices.forEach(appointment => {
      const serviceId = appointment.dienst_id;
      const serviceName = appointment.diensten?.naam || 'Onbekende Dienst';
      const price = appointment.diensten?.prijs_euro || 0;
      
      if (!serviceStats[serviceId]) {
        serviceStats[serviceId] = {
          name: serviceName,
          revenue: 0,
          count: 0
        };
      }
      
      serviceStats[serviceId].revenue += price;
      serviceStats[serviceId].count += 1;
    });
    
    // Sort by count
    const sortedServices = Object.values(serviceStats).sort((a, b) => b.count - a.count);
    
    // Update UI
    const container = document.getElementById('servicesStatsGrid');
    if (container) {
      container.innerHTML = '';
      
      sortedServices.forEach(service => {
        const item = document.createElement('div');
        item.className = 'service-stats-item';
        item.innerHTML = `
          <div class="service-stats-info">
            <h4>${service.name}</h4>
            <p>Dienst</p>
          </div>
          <div class="service-stats-amount">
            <div class="amount">€${service.revenue.toFixed(2)}</div>
            <div class="count">${service.count} afspraken</div>
          </div>
        `;
        container.appendChild(item);
      });
      
      if (sortedServices.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Geen data beschikbaar</p>';
      }
    }
    
    console.log('Service stats loaded:', sortedServices);
    
  } catch (error) {
    console.error('Error loading service stats:', error);
  }
}

async function loadCustomerInsights(startDate, endDate) {
  try {
    const sb = window.supabase;
    
    // Get all customers who made appointments in this period
    const { data: appointments, error } = await sb
      .from('boekingen')
      .select('email')
      .gte('datumtijd', startDate.toISOString())
      .lte('datumtijd', endDate.toISOString());
    
    if (error) throw error;
    
    // Get unique customers
    const uniqueCustomers = [...new Set(appointments.map(a => a.email))];
    
    // Get customers who made appointments before this period (returning customers)
    const { data: previousAppointments, error: prevError } = await sb
      .from('boekingen')
      .select('email')
      .lt('datumtijd', startDate.toISOString());
    
    if (prevError) throw prevError;
    
    const previousCustomers = [...new Set(previousAppointments.map(a => a.email))];
    
    // Calculate returning customers in this period
    const returningCustomers = uniqueCustomers.filter(email => previousCustomers.includes(email));
    
    // Calculate new customers
    const newCustomers = uniqueCustomers.filter(email => !previousCustomers.includes(email));
    
    // Calculate average appointments per customer
    const avgAppointmentsPerCustomer = uniqueCustomers.length > 0 ? 
      appointments.length / uniqueCustomers.length : 0;
    
    // Update UI
    document.getElementById('newCustomers').textContent = newCustomers.length.toString();
    document.getElementById('returningCustomers').textContent = 
      uniqueCustomers.length > 0 ? 
      `${((returningCustomers.length / uniqueCustomers.length) * 100).toFixed(1)}%` : '0%';
    document.getElementById('avgAppointmentsPerCustomer').textContent = avgAppointmentsPerCustomer.toFixed(1);
    
    console.log('Customer insights loaded:', { 
      newCustomers: newCustomers.length, 
      returningCustomers: returningCustomers.length, 
      avgAppointmentsPerCustomer 
    });
    
  } catch (error) {
    console.error('Error loading customer insights:', error);
  }
}

async function loadWeeklyTrends(startDate, endDate) {
  try {
    const sb = window.supabase;
    
    // Get this week's data
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);
    
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);
    thisWeekEnd.setHours(23, 59, 59, 999);
    
    // Get last week's data
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
    lastWeekEnd.setHours(23, 59, 59, 999);
    
    // Get this month's data
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    
    const thisMonthEnd = new Date();
    thisMonthEnd.setMonth(thisMonthEnd.getMonth() + 1, 0);
    thisMonthEnd.setHours(23, 59, 59, 999);
    
    // Fetch data for all periods
    const [thisWeekData, lastWeekData, thisMonthData] = await Promise.all([
      getRevenueForPeriod(sb, thisWeekStart, thisWeekEnd),
      getRevenueForPeriod(sb, lastWeekStart, lastWeekEnd),
      getRevenueForPeriod(sb, thisMonthStart, thisMonthEnd)
    ]);
    
    // Calculate comparisons
    const thisWeekComparison = lastWeekData > 0 ? 
      `${(((thisWeekData - lastWeekData) / lastWeekData) * 100).toFixed(1)}%` : '-';
    
    const thisMonthComparison = 'Deze maand';
    
    // Update UI
    document.getElementById('thisWeekRevenue').textContent = `€${thisWeekData.toFixed(2)}`;
    document.getElementById('thisWeekComparison').textContent = 
      thisWeekData > lastWeekData ? `↗️ +${thisWeekComparison}` : 
      thisWeekData < lastWeekData ? `↘️ ${thisWeekComparison}` : `→ ${thisWeekComparison}`;
    
    document.getElementById('lastWeekRevenue').textContent = `€${lastWeekData.toFixed(2)}`;
    document.getElementById('lastWeekComparison').textContent = 'Vorige week';
    
    document.getElementById('thisMonthRevenue').textContent = `€${thisMonthData.toFixed(2)}`;
    document.getElementById('thisMonthComparison').textContent = thisMonthComparison;
    
    console.log('Weekly trends loaded:', { thisWeekData, lastWeekData, thisMonthData });
    
  } catch (error) {
    console.error('Error loading weekly trends:', error);
  }
}

async function loadDailyRevenueChart(startDate, endDate) {
  try {
    const sb = window.supabase;
    
    // Get appointments in date range
    const { data: appointments, error } = await sb
      .from('boekingen')
      .select('datumtijd, dienst_id')
      .gte('datumtijd', startDate.toISOString())
      .lte('datumtijd', endDate.toISOString())
      .order('datumtijd', { ascending: true });
    
    if (error) throw error;
    
    if (appointments.length === 0) {
      renderEmptyChart();
      return;
    }
    
    // Get unique service IDs
    const serviceIds = [...new Set(appointments.map(apt => apt.dienst_id))];
    
    // Fetch services data
    const { data: services, error: servicesError } = await sb
      .from('diensten')
      .select('id, prijs_euro')
      .in('id', serviceIds);
    
    if (servicesError) throw servicesError;
    
    // Create service lookup map
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id] = service;
    });
    
    // Group appointments by date and calculate daily revenue
    const dailyRevenue = {};
    appointments.forEach(appointment => {
      const date = appointment.datumtijd.split('T')[0];
      const price = serviceMap[appointment.dienst_id]?.prijs_euro || 0;
      
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = 0;
      }
      dailyRevenue[date] += price;
    });
    
    // Create chart data
    const sortedDates = Object.keys(dailyRevenue).sort();
    const revenueData = sortedDates.map(date => dailyRevenue[date]);
    
    renderDailyRevenueChart(sortedDates, revenueData);
    
    console.log('Daily revenue chart loaded:', { sortedDates, revenueData });
    
  } catch (error) {
    console.error('Error loading daily revenue chart:', error);
    renderEmptyChart();
  }
}

function renderDailyRevenueChart(dates, revenueData) {
  const ctx = document.getElementById('dailyRevenueChart');
  if (!ctx) return;
  
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js not loaded yet');
    renderEmptyChart();
    return;
  }
  
  // Destroy existing chart if it exists
  if (window.dailyRevenueChart && typeof window.dailyRevenueChart.destroy === 'function') {
    window.dailyRevenueChart.destroy();
  }
  
  window.dailyRevenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dates.map(date => new Date(date).toLocaleDateString('nl-NL', { 
        day: 'numeric', 
        month: 'short' 
      })),
      datasets: [{
        label: 'Omzet per Dag (€)',
        data: revenueData,
        backgroundColor: 'rgba(242, 139, 130, 0.8)',
        borderColor: 'rgba(242, 139, 130, 1)',
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Omzet: €${context.parsed.y.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '€' + value;
            }
          }
        },
        x: {
          ticks: {
            maxRotation: 45
          }
        }
      }
    }
  });
}

function renderEmptyChart() {
  const ctx = document.getElementById('dailyRevenueChart');
  if (!ctx) return;
  
  // Destroy existing chart if it exists and Chart.js is loaded
  if (window.dailyRevenueChart && typeof window.dailyRevenueChart.destroy === 'function') {
    window.dailyRevenueChart.destroy();
  }
  
  // Show message instead of chart
  ctx.style.display = 'none';
  const container = ctx.parentElement;
  container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">Geen omzet data beschikbaar voor deze periode</p>';
}

async function getRevenueForPeriod(sb, startDate, endDate) {
  try {
    // Get appointments in date range
    const { data: appointments, error } = await sb
      .from('boekingen')
      .select('dienst_id')
      .gte('datumtijd', startDate.toISOString())
      .lte('datumtijd', endDate.toISOString());
    
    if (error) throw error;
    
    if (appointments.length === 0) return 0;
    
    // Get unique service IDs
    const serviceIds = [...new Set(appointments.map(apt => apt.dienst_id))];
    
    // Fetch services data
    const { data: services, error: servicesError } = await sb
      .from('diensten')
      .select('id, prijs_euro')
      .in('id', serviceIds);
    
    if (servicesError) throw servicesError;
    
    // Create service lookup map
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id] = service;
    });
    
    // Calculate total revenue
    return appointments.reduce((sum, appointment) => {
      const service = serviceMap[appointment.dienst_id];
      return sum + (service?.prijs_euro || 0);
    }, 0);
    
  } catch (error) {
    console.error('Error getting revenue for period:', error);
    return 0;
  }
}

// ====================== Customer Import ======================
function initializeCustomerImport() {
  console.log('Initializing customer import functionality...');
  
  // Add event listeners
  const selectCsvFileBtn = document.getElementById('selectCsvFile');
  const csvFileInput = document.getElementById('csvFileInput');
  const confirmImportBtn = document.getElementById('confirmImport');
  const cancelImportBtn = document.getElementById('cancelImport');
  const importTestCustomersBtn = document.getElementById('importTestCustomers');
  
  if (selectCsvFileBtn && csvFileInput) {
    selectCsvFileBtn.addEventListener('click', () => csvFileInput.click());
    csvFileInput.addEventListener('change', handleCsvFileSelect);
  }
  
  if (confirmImportBtn) {
    confirmImportBtn.addEventListener('click', confirmImport);
  }
  
  if (cancelImportBtn) {
    cancelImportBtn.addEventListener('click', cancelImport);
  }
  
  if (importTestCustomersBtn) {
    importTestCustomersBtn.addEventListener('click', importTestCustomers);
  }
}

function handleCsvFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  console.log('CSV file selected:', file.name);
  
  // Show selected file name
  const fileNameSpan = document.getElementById('selectedFileName');
  if (fileNameSpan) {
    fileNameSpan.textContent = file.name;
  }
  
  // Read and parse CSV
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const csvData = parseCSV(e.target.result);
      showImportPreview(csvData);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Fout bij het lezen van het CSV bestand: ' + error.message);
    }
  };
  
  reader.readAsText(file, 'UTF-8');
}

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('CSV bestand is leeg');
  }
  
  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  console.log('CSV headers:', headers);
  
  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }
  }
  
  console.log('Parsed CSV data:', { headers, rowCount: rows.length });
  
  return { headers, rows };
}

function showImportPreview(csvData) {
  const previewDiv = document.getElementById('importPreview');
  const previewTableHead = document.getElementById('previewTableHead');
  const previewTableBody = document.getElementById('previewTableBody');
  const mappingControls = document.getElementById('mappingControls');
  
  if (!previewDiv || !previewTableHead || !previewTableBody || !mappingControls) {
    console.error('Import preview elements not found');
    return;
  }
  
  // Show preview section
  previewDiv.style.display = 'block';
  
  // Create table header
  previewTableHead.innerHTML = '';
  const headerRow = document.createElement('tr');
  csvData.headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });
  previewTableHead.appendChild(headerRow);
  
  // Create table body (show first 10 rows)
  previewTableBody.innerHTML = '';
  csvData.rows.slice(0, 10).forEach(row => {
    const tr = document.createElement('tr');
    csvData.headers.forEach(header => {
      const td = document.createElement('td');
      td.textContent = row[header] || '';
      tr.appendChild(td);
    });
    previewTableBody.appendChild(tr);
  });
  
  // Create mapping controls
  createMappingControls(csvData.headers, mappingControls);
  
  // Update import count
  const importCountSpan = document.getElementById('importCount');
  if (importCountSpan) {
    importCountSpan.textContent = csvData.rows.length;
  }
  
  // Enable confirm button
  const confirmBtn = document.getElementById('confirmImport');
  if (confirmBtn) {
    confirmBtn.disabled = false;
  }
  
  console.log('Import preview shown for', csvData.rows.length, 'customers');
}

function createMappingControls(headers, container) {
  container.innerHTML = '';
  
  // Define required fields
  const requiredFields = [
    { key: 'naam', label: 'Naam', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'telefoon', label: 'Telefoon', required: false }
  ];
  
  requiredFields.forEach(field => {
    const controlDiv = document.createElement('div');
    controlDiv.className = 'mapping-control';
    
    const label = document.createElement('label');
    label.textContent = field.label + (field.required ? ' *' : '');
    label.style.color = field.required ? 'var(--accent)' : 'var(--text-secondary)';
    
    const select = document.createElement('select');
    select.id = `mapping_${field.key}`;
    select.required = field.required;
    
    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- Selecteer kolom --';
    select.appendChild(emptyOption);
    
    // Add CSV headers as options
    headers.forEach(header => {
      const option = document.createElement('option');
      option.value = header;
      option.textContent = header;
      
      // Auto-select if header matches field key
      if (header.toLowerCase().includes(field.key.toLowerCase())) {
        option.selected = true;
      }
      
      select.appendChild(option);
    });
    
    controlDiv.appendChild(label);
    controlDiv.appendChild(select);
    container.appendChild(controlDiv);
  });
}

async function confirmImport() {
  const mappingControls = document.getElementById('mappingControls');
  if (!mappingControls) return;
  
  // Get mapping configuration
  const mappings = {};
  const requiredFields = ['naam', 'email', 'telefoon'];
  
  requiredFields.forEach(field => {
    const select = document.getElementById(`mapping_${field}`);
    if (select) {
      mappings[field] = select.value;
    }
  });
  
  // Validate mappings
  if (!mappings.naam || !mappings.email) {
    alert('Naam en Email zijn verplichte velden');
    return;
  }
  
  // Get CSV data from preview
  const csvFileInput = document.getElementById('csvFileInput');
  if (!csvFileInput.files[0]) return;
  
  // Hide preview, show progress
  document.getElementById('importPreview').style.display = 'none';
  document.getElementById('importProgress').style.display = 'block';
  
  try {
    // Re-parse CSV with mapping
    const csvText = await readFileAsText(csvFileInput.files[0]);
    const csvData = parseCSV(csvText);
    
    // Map and validate data
    const customers = [];
    const errors = [];
    
    csvData.rows.forEach((row, index) => {
      const customer = {
        naam: row[mappings.naam]?.trim(),
        email: row[mappings.email]?.trim(),
        telefoon: mappings.telefoon ? row[mappings.telefoon]?.trim() : null
      };
      
      // Validate required fields
      if (!customer.naam) {
        errors.push(`Rij ${index + 2}: Naam ontbreekt`);
        return;
      }
      
      if (!customer.email) {
        errors.push(`Rij ${index + 2}: Email ontbreekt`);
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer.email)) {
        errors.push(`Rij ${index + 2}: Ongeldig email formaat`);
        return;
      }
      
      customers.push(customer);
    });
    
    // Show errors if any
    if (errors.length > 0) {
      showImportResults(false, 0, customers.length, errors);
      return;
    }
    
    // Import customers to database
    await importCustomersToDatabase(customers);
    
  } catch (error) {
    console.error('Import error:', error);
    showImportResults(false, 0, 0, [error.message]);
  }
}

async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(e);
    reader.readAsText(file, 'UTF-8');
  });
}

async function importCustomersToDatabase(customers) {
  const sb = window.supabase;
  let successCount = 0;
  const errors = [];
  
  const totalCustomers = customers.length;
  
  for (let i = 0; i < customers.length; i++) {
    try {
      // Update progress
      updateImportProgress(i + 1, totalCustomers);
      
      // Check if customer already exists
      const { data: existingCustomer } = await sb
        .from('customers')
        .select('id')
        .eq('email', customers[i].email)
        .single();
      
      if (existingCustomer) {
        errors.push(`${customers[i].naam}: Email bestaat al`);
        continue;
      }
      
      // Insert new customer
      const { error } = await sb
        .from('customers')
        .insert({
          naam: customers[i].naam,
          email: customers[i].email,
          telefoon: customers[i].telefoon || null,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        errors.push(`${customers[i].naam}: ${error.message}`);
      } else {
        successCount++;
      }
      
    } catch (error) {
      errors.push(`${customers[i].naam}: ${error.message}`);
    }
  }
  
  // Show results
  showImportResults(true, successCount, totalCustomers, errors);
  
  // Refresh customer list
  if (successCount > 0) {
    await loadCustomers();
  }
}

function updateImportProgress(current, total) {
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  
  if (progressFill) {
    const percentage = (current / total) * 100;
    progressFill.style.width = `${percentage}%`;
  }
  
  if (progressText) {
    progressText.textContent = `${current} van ${total} klanten geïmporteerd`;
  }
}

function showImportResults(success, successCount, totalCount, errors) {
  // Hide progress
  document.getElementById('importProgress').style.display = 'none';
  
  // Show results
  const resultsDiv = document.getElementById('importResults');
  const summaryDiv = document.getElementById('resultsSummary');
  const detailsDiv = document.getElementById('resultsDetails');
  
  if (!resultsDiv || !summaryDiv || !detailsDiv) return;
  
  resultsDiv.style.display = 'block';
  
  // Update summary
  if (success && successCount > 0) {
    summaryDiv.className = 'results-summary success';
    summaryDiv.innerHTML = `
      <h5>✅ Import Succesvol!</h5>
      <p>${successCount} van ${totalCount} klanten succesvol geïmporteerd</p>
    `;
  } else {
    summaryDiv.className = 'results-summary error';
    summaryDiv.innerHTML = `
      <h5>❌ Import Problemen</h5>
      <p>${successCount} van ${totalCount} klanten geïmporteerd</p>
    `;
  }
  
  // Update details
  if (errors.length > 0) {
    detailsDiv.innerHTML = `
      <h6>Fouten:</h6>
      <ul>
        ${errors.map(error => `<li>${error}</li>`).join('')}
      </ul>
    `;
  } else {
    detailsDiv.innerHTML = '<p>Alle klanten succesvol geïmporteerd!</p>';
  }
  
  console.log('Import results:', { success, successCount, totalCount, errors });
}

function cancelImport() {
  // Reset form
  document.getElementById('csvFileInput').value = '';
  document.getElementById('selectedFileName').textContent = '';
  document.getElementById('importPreview').style.display = 'none';
  document.getElementById('importProgress').style.display = 'none';
  document.getElementById('importResults').style.display = 'none';
  document.getElementById('confirmImport').disabled = true;
}

// ====================== Test Data Generator ======================
function generateTestCustomers() {
  console.log('Generating 25 test customers...');
  
  const firstNames = [
    'Jan', 'Piet', 'Klaas', 'Henk', 'Willem', 'Dirk', 'Gerard', 'Frank', 'Rob', 'Tom',
    'Maria', 'Anna', 'Els', 'Sandra', 'Linda', 'Petra', 'Monique', 'Ingrid', 'Marieke', 'Femke',
    'Ahmed', 'Mohamed', 'Hassan', 'Yusuf', 'Ibrahim', 'Fatima', 'Aisha', 'Zainab', 'Layla', 'Nour'
  ];
  
  const lastNames = [
    'Janssen', 'de Vries', 'Bakker', 'Visser', 'Smit', 'de Jong', 'Mulder', 'de Groot', 'Bos', 'Dijkstra',
    'Vermeulen', 'van Dijk', 'van der Berg', 'van den Berg', 'van der Meer', 'van der Wal', 'van der Laan',
    'van der Velde', 'van der Linden', 'van der Pol', 'van der Ven', 'van der Heijden', 'van der Beek',
    'van der Kooij', 'van der Steen', 'van der Zee', 'van der Werf', 'van der Werff', 'van der Woude',
    'Al-Hassan', 'Al-Zahra', 'Al-Rashid', 'Al-Mahmoud', 'Al-Nasser', 'Al-Khalil', 'Al-Farouk'
  ];
  
  const domains = ['gmail.com', 'hotmail.com', 'yahoo.nl', 'ziggo.nl', 'kpn.nl', 'outlook.com', 'live.nl'];
  
  const customers = [];
  
  for (let i = 0; i < 25; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    // Generate phone number (Dutch format)
    const phonePrefixes = ['06', '061', '062', '063', '064', '065', '066', '067', '068', '069'];
    const prefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];
    const phoneSuffix = Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 7);
    const phone = prefix + phoneSuffix;
    
    // Generate email
    const emailPrefix = firstName.toLowerCase() + '.' + lastName.toLowerCase().replace(/\s+/g, '');
    const email = `${emailPrefix}@${domain}`;
    
    customers.push({
      naam: `${firstName} ${lastName}`,
      email: email,
      telefoon: phone
    });
  }
  
  console.log('Generated test customers:', customers);
  return customers;
}

async function importTestCustomers() {
  try {
    console.log('Starting import of 25 test customers...');
    
    // Show progress immediately
    document.getElementById('importProgress').style.display = 'block';
    
    const customers = generateTestCustomers();
    
    // Import directly to database
    await importCustomersToDatabase(customers);
    
    console.log('Test customers import completed!');
    
  } catch (error) {
    console.error('Error importing test customers:', error);
    
    // Hide progress and show error
    document.getElementById('importProgress').style.display = 'none';
    showImportResults(false, 0, 0, [error.message]);
  }
}
