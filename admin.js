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

  // Save dienst (naam + prijs) via knop "Aanpassen"
  document.querySelectorAll(".saveDienstBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const nameInput = document.querySelector(`input.dienstNameInput[data-id="${id}"]`);
      const priceInput = document.querySelector(`input.dienstPriceInput[data-id="${id}"]`);
      const name = nameInput ? nameInput.value.trim() : "";
      const price = priceInput ? parseFloat(priceInput.value) : NaN;
      if (!name) return alert("Naam mag niet leeg zijn");
      if (isNaN(price) || price < 0) return alert("Vul een geldige prijs in");
      const { error } = await supabase.from("diensten").update({ naam: name, prijs_euro: price }).eq("id", id);
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
    const price = priceValue === "" ? null : parseFloat(priceValue);
    if (!name) return alert("Vul een naam in!");
    if (price !== null && (isNaN(price) || price < 0)) return alert("Vul een geldige prijs in!");
    const { error } = await supabase.from("diensten").insert([{ naam: name, prijs_euro: price }]);
    if (error) { console.error(error); return alert("Fout bij toevoegen"); }
    document.getElementById("newDienstName").value = "";
    if (document.getElementById("newDienstPrice")) document.getElementById("newDienstPrice").value = "";
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
function buildAdminTimeSlots() {
  const container = document.getElementById('adminTimeSlots');
  if (!container) return;
  container.innerHTML = '';
  const startHour = 9;
  const endHour = 18;
  const interval = 15;
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += interval) {
      const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerText = timeStr;
      btn.className = 'time-btn';
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('#adminTimeSlots .time-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      container.appendChild(btn);
    }
  }
}

async function refreshAdminAvailability(){
  const barberId = document.getElementById('adminBarberSelect')?.value;
  const dateVal = document.getElementById('adminDateInput')?.value;
  const msg = document.getElementById('adminAvailMsg');
  if (!barberId || !dateVal) return;
  // reuse client on window from index page if present, else create locally
  const client = window.supabase;
  const start = `${dateVal}T00:00:00`;
  const d = new Date(dateVal);
  const next = new Date(d.getTime() + 24*60*60*1000);
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth()+1).padStart(2,'0');
  const dd = String(next.getDate()).padStart(2,'0');
  const end = `${yyyy}-${mm}-${dd}T00:00:00`;
  const { data, error } = await client
    .from('boekingen')
    .select('datumtijd')
    .eq('barber_id', barberId)
    .gte('datumtijd', start)
    .lt('datumtijd', end);
  if (error) { console.error(error); return; }
  const blocked = new Set((data||[]).map(r=>String(r.datumtijd).split('T')[1]?.slice(0,5)));
  document.querySelectorAll('#adminTimeSlots .time-btn').forEach(btn=>{
    const t = btn.innerText;
    if (blocked.has(t)) {
      btn.classList.add('disabled');
      btn.setAttribute('disabled','true');
    } else {
      btn.classList.remove('disabled');
      btn.removeAttribute('disabled');
    }
  });
  if (msg) msg.textContent = `Geboekte/gebloqueerde tijden: ${[...blocked].sort().join(', ') || 'geen'}`;
}

async function populateAdminBarbers(){
  const sel = document.getElementById('adminBarberSelect');
  if (!sel) return;
  sel.innerHTML = '<option>Laden...</option>';
  const { data, error } = await supabase.from('barbers').select('*').order('id');
  if (error) { console.error(error); return; }
  sel.innerHTML = '';
  data.forEach(b=>{
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.naam;
    sel.appendChild(opt);
  });
}

async function adminBlockSelected(){
  const barberId = document.getElementById('adminBarberSelect')?.value;
  const dateVal = document.getElementById('adminDateInput')?.value;
  const selectedBtn = document.querySelector('#adminTimeSlots .time-btn.selected');
  if (!barberId || !dateVal || !selectedBtn) return alert('Selecteer barber, datum en tijd');
  const time = selectedBtn.innerText;
  const dt = `${dateVal}T${time}:00`;
  const { error } = await supabase.from('boekingen').insert([{ barber_id: barberId, dienst_id: null, klantnaam: '[geblokkeerd]', email: null, telefoon: null, datumtijd: dt }]);
  if (error) { console.error(error); alert('Fout bij blokkeren'); return; }
  await refreshAdminAvailability();
  await loadBoekingen();
}

async function adminUnblockSelected(){
  const barberId = document.getElementById('adminBarberSelect')?.value;
  const dateVal = document.getElementById('adminDateInput')?.value;
  const selectedBtn = document.querySelector('#adminTimeSlots .time-btn.selected');
  if (!barberId || !dateVal || !selectedBtn) return alert('Selecteer barber, datum en tijd');
  const time = selectedBtn.innerText;
  const start = `${dateVal}T${time}:00`;
  const { error } = await supabase.from('boekingen').delete().match({ barber_id: barberId, datumtijd: start, klantnaam: '[geblokkeerd]' });
  if (error) { console.error(error); alert('Fout bij deblokkeren'); return; }
  await refreshAdminAvailability();
  await loadBoekingen();
}

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

// ====================== Week Calendar ======================
let currentWeekStart = new Date();
let currentWeekEnd = new Date();

// Initialize week to start on Monday
function initWeekCalendar() {
  // Set to start of current week (Monday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, so go back 6 days
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
  loadBarberAvailabilityForWeek();
  updateCurrentTimeLine();
  
  // Update current time line every minute
  setInterval(updateCurrentTimeLine, 60000);
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
  if (!timeLabelsContainer) return;
  
  timeLabelsContainer.innerHTML = '';
  
  // Generate time labels from 0:00 to 23:00 (every hour)
  for (let hour = 0; hour <= 23; hour++) {
    const timeLabel = document.createElement('div');
    timeLabel.className = 'time-label';
    timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
    
    // Position based on hour (0:00 = 0%, 23:00 = 100%)
    const percentage = (hour / 23) * 100;
    timeLabel.style.top = `${percentage}%`;
    
    timeLabelsContainer.appendChild(timeLabel);
  }
}

function updateCurrentTimeLine() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Only show current time line for today
  if (now >= currentWeekStart && now <= currentWeekEnd) {
    const timeLines = document.querySelectorAll('.current-time-line');
    timeLines.forEach(line => {
      const dayColumn = line.closest('.day-column');
      const dayDate = new Date(dayColumn.querySelector('.day-date').textContent + ' ' + now.getFullYear());
      
      if (dayDate.getTime() === today.getTime()) {
        const timeInMinutes = now.getHours() * 60 + now.getMinutes();
        
        // Position based on 0:00-23:59 range (24 hours)
        const totalMinutes = 24 * 60; // 24 hours
        const topPosition = (timeInMinutes / totalMinutes) * 100;
        
        line.style.top = `${topPosition}%`;
        line.style.display = 'block';
      } else {
        line.style.display = 'none';
      }
    });
  } else {
    // Hide all time lines if not current week
    document.querySelectorAll('.current-time-line').forEach(line => {
      line.style.display = 'none';
    });
  }
}

async function loadWeekAppointments() {
  try {
    // Clear existing appointments
    document.querySelectorAll('.appointments-container').forEach(container => {
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
    Object.keys(appointmentsByDay).forEach(dayName => {
      const container = document.getElementById(`appointments${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`);
      if (container) {
        appointmentsByDay[dayName].forEach(appointment => {
          const appointmentElement = createAppointmentElement(appointment);
          container.appendChild(appointmentElement);
        });
      }
    });
    
    // Update day dates
    updateDayDates();
    
  } catch (error) {
    console.error('Error loading week appointments:', error);
  }
}

function createAppointmentElement(appointment) {
  const appointmentDate = new Date(appointment.datumtijd);
  const timeInMinutes = appointmentDate.getHours() * 60 + appointmentDate.getMinutes();
  
  // Position based on 0:00-23:59 range (24 hours = 1440 minutes)
  const totalMinutes = 24 * 60; // 24 hours
  const topPosition = (timeInMinutes / totalMinutes) * 100;
  
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
  
  const appointmentElement = document.createElement('div');
  appointmentElement.className = `appointment-block ${statusClass}`;
  appointmentElement.style.top = `${topPosition}%`;
  appointmentElement.innerHTML = `
    <div class="appointment-time">${appointmentDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</div>
    <div class="appointment-customer">${appointment.klantnaam || 'Onbekend'}</div>
    <div class="appointment-service">Dienst ID: ${appointment.dienst_id || 'Onbekend'}</div>
    <div class="appointment-barber">Barber ID: ${appointment.barber_id || 'Onbekend'}</div>
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
  
  // Load additional data for the appointment
  const appointmentData = await loadAppointmentDetails(appointment.id);
  console.log('Appointment data for popup:', appointmentData);
  
  // Populate popup with data
  document.getElementById('appointmentCustomerName').textContent = appointmentData.klantnaam || appointment.klantnaam || 'Onbekend';
  document.getElementById('appointmentCustomerEmail').textContent = appointmentData.klantemail || appointment.klantemail || 'Onbekend';
  document.getElementById('appointmentCustomerPhone').textContent = appointmentData.klanttelefoon || appointment.klanttelefoon || 'Onbekend';
  
  const appointmentDate = new Date(appointmentData.datumtijd || appointment.datumtijd);
  document.getElementById('appointmentDate').textContent = appointmentDate.toLocaleDateString('nl-NL');
  document.getElementById('appointmentTime').textContent = appointmentDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  
  document.getElementById('appointmentBarber').textContent = appointmentData.barber_naam || `Barber ID: ${appointmentData.barber_id || appointment.barber_id}` || 'Onbekend';
  document.getElementById('appointmentService').textContent = appointmentData.dienst_naam || `Dienst ID: ${appointmentData.dienst_id || appointment.dienst_id}` || 'Onbekend';
  document.getElementById('appointmentPrice').textContent = appointmentData.dienst_prijs ? `€${appointmentData.dienst_prijs}` : 'Onbekend';
  
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
        let barberError = null;
        
        // First try 'barbers' table
        const { data: barbersData, error: barbersError } = await supabase
          .from('barbers')
          .select('naam')
          .eq('id', appointment.barber_id)
          .single();
        
        if (!barbersError && barbersData) {
          barber = barbersData;
        } else {
          // Try 'barber' table
          const { data: barberData, error: barberError } = await supabase
            .from('barber')
            .select('naam')
            .eq('id', appointment.barber_id)
            .single();
          
          if (!barberError && barberData) {
            barber = barberData;
          } else {
            barberError = barberError;
          }
        }
        
        if (!barberError && barber) {
          barberName = barber.naam;
        } else {
          console.error('Error loading barber:', barberError);
        }
      } catch (barberError) {
        console.error('Error loading barber:', barberError);
      }
    }
    
    // Load service data separately
    let serviceName = 'Onbekend';
    let servicePrice = null;
    if (appointment.dienst_id) {
      try {
        // Try different table names
        let service = null;
        let serviceError = null;
        
        // First try 'services' table
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('naam, prijs')
          .eq('id', appointment.dienst_id)
          .single();
        
        if (!servicesError && servicesData) {
          service = servicesData;
        } else {
          // Try 'diensten' table
          const { data: dienstenData, error: dienstenError } = await supabase
            .from('diensten')
            .select('naam, prijs')
            .eq('id', appointment.dienst_id)
            .single();
          
          if (!dienstenError && dienstenData) {
            service = dienstenData;
          } else {
            serviceError = dienstenError;
          }
        }
        
        if (!serviceError && service) {
          serviceName = service.naam;
          servicePrice = service.prijs;
        } else {
          console.error('Error loading service:', serviceError);
        }
      } catch (serviceError) {
        console.error('Error loading service:', serviceError);
      }
    }
    
    return {
      ...appointment,
      barber_naam: barberName,
      dienst_naam: serviceName,
      dienst_prijs: servicePrice
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
}

async function deleteAppointment() {
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
  loadWeekAppointments();
  loadBarberAvailabilityForWeek();
  updateCurrentTimeLine();
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
  
  // Load initial data
  await loadBoekingen();
  await loadBarbers();
  await loadDiensten();
  
  // Initialize barber availability
  initBarberAvailability();
  
  // Initialize week calendar
  initWeekCalendar();
  
  // Initialize admin availability controls
  buildAdminTimeSlots();
  await populateAdminBarbers();
  const date = document.getElementById('adminDateInput');
  if (date) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth()+1).padStart(2,'0');
    const d = String(today.getDate()).padStart(2,'0');
    date.value = `${y}-${m}-${d}`;
  }
  document.getElementById('adminBarberSelect')?.addEventListener('change', refreshAdminAvailability);
  document.getElementById('adminDateInput')?.addEventListener('change', refreshAdminAvailability);
  document.getElementById('adminBlockBtn')?.addEventListener('click', adminBlockSelected);
  document.getElementById('adminUnblockBtn')?.addEventListener('click', adminUnblockSelected);
  refreshAdminAvailability();
  
  // Add week navigation event listeners
  document.getElementById('prevWeekBtn')?.addEventListener('click', () => navigateWeek('prev'));
  document.getElementById('nextWeekBtn')?.addEventListener('click', () => navigateWeek('next'));
  
  // Add appointment popup event listeners
  document.getElementById('closeAppointmentPopup')?.addEventListener('click', hideAppointmentDetails);
  document.getElementById('closeAppointmentDetailsBtn')?.addEventListener('click', hideAppointmentDetails);
  document.getElementById('editAppointmentBtn')?.addEventListener('click', editAppointment);
  document.getElementById('deleteAppointmentBtn')?.addEventListener('click', deleteAppointment);
  
  // Close popup when clicking outside
  document.getElementById('appointmentDetailsPopup')?.addEventListener('click', (e) => {
    if (e.target.id === 'appointmentDetailsPopup') {
      hideAppointmentDetails();
    }
  });
});
