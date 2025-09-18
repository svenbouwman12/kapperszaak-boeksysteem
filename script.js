// script.js
const sb = window.supabaseClient; // gebruik een andere naam dan 'supabase'

// Flow state
let currentStep = 1;
let selectedDienstId = null;
let selectedDate = null;
let selectedBarberId = null;
let selectedTime = null;

// Diensten laden
async function loadDiensten() {
  const sel = document.getElementById("dienstSelect");
  const list = document.getElementById("dienstList");
  if (!sel) return;
  if (list) list.innerHTML = "";
  sel.innerHTML = "<option>Laden...</option>";
  try {
    const { data, error } = await sb.from("diensten").select("*").order("id");
    if (error) throw error;
    sel.innerHTML = "";
    if (!data || data.length === 0) {
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

// Barbers laden
async function loadBarbers() {
  const sel = document.getElementById("barberSelect");
  if (!sel) return;
  sel.innerHTML = "<option>Laden...</option>";
  try {
    const { data, error } = await sb.from("barbers").select("*").order("id");
    if (error) throw error;
    sel.innerHTML = "";
    if (!data || data.length === 0) {
      sel.innerHTML = "<option>Geen barbers gevonden</option>";
      return;
    }
    data.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.naam;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
    sel.innerHTML = "<option>Fout bij laden</option>";
  }
}

// Tijdslots (09:00-18:00 per 15 min)
function generateTimeSlots() {
  const container = document.getElementById("timeSlots");
  if(!container) return;
  container.innerHTML = "";

  const startHour = 9;
  const endHour = 18;
  const interval = 15;

  for(let h=startHour; h<endHour; h++){
    for(let m=0; m<60; m+=interval){
      const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerText = timeStr;
      btn.className = "time-btn";
      btn.addEventListener("click",()=>selectTimeSlot(timeStr));
      container.appendChild(btn);
    }
  }
}

function selectTimeSlot(time){
  selectedTime = time;
  document.querySelectorAll(".time-btn").forEach(btn=>btn.classList.remove("selected"));
  document.querySelectorAll(".time-btn").forEach(btn=>{
    if(btn.innerText===time) btn.classList.add("selected");
  });
}

// Fetch booked times for a given date (YYYY-MM-DD) and barber
async function fetchBookedTimes(dateStr, barberId){
  if (!dateStr || !barberId) {
    console.log('fetchBookedTimes: Missing date or barber', { dateStr, barberId });
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

    console.log('fetchBookedTimes: Querying for', { dateStr, barberId, start, end });

    const { data, error } = await sb
      .from('boekingen')
      .select('datumtijd')
      .eq('barber_id', barberId)
      .gte('datumtijd', start)
      .lt('datumtijd', end);
    if (error) throw error;
    
    console.log('fetchBookedTimes: Raw data from DB', data);
    
    const times = new Set();
    (data || []).forEach(row => {
      const dt = row.datumtijd;
      if (typeof dt === 'string') {
        const t = dt.split('T')[1]?.slice(0,5);
        if (t) times.add(t);
      }
    });
    
    console.log('fetchBookedTimes: Processed times', Array.from(times));
    return times;
  } catch (e) {
    console.error('Fout bij laden van geboekte tijden:', e);
    return new Set();
  }
}

async function refreshAvailability(){
  const dateVal = document.getElementById('dateInput')?.value;
  const barberVal = document.getElementById('barberSelect')?.value;
  console.log('refreshAvailability called with', { dateVal, barberVal });
  
  generateTimeSlots();
  
  // If no date selected, show all times as available
  if (!dateVal) {
    console.log('No date selected, showing all times as available');
    return;
  }
  
  // If no barber selected, show all times as available but with a message
  if (!barberVal) {
    console.log('No barber selected, showing all times as available');
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.classList.remove('disabled');
      btn.removeAttribute('disabled');
    });
    return;
  }
  
  // Fetch booked times and disable them
  console.log('Fetching booked times for', { dateVal, barberVal });
  const blocked = await fetchBookedTimes(dateVal, barberVal);
  console.log('Blocked times:', Array.from(blocked));
  
  document.querySelectorAll('.time-btn').forEach(btn => {
    const t = btn.innerText;
    if (blocked.has(t)) {
      console.log('Disabling time slot:', t);
      btn.classList.add('disabled');
      btn.setAttribute('disabled', 'true');
    } else {
      btn.classList.remove('disabled');
      btn.removeAttribute('disabled');
    }
  });
}

function selectDienst(id){
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
}

// Boeking opslaan
async function boekDienst(){
  const naam = document.getElementById("naamInput").value.trim();
  const email = document.getElementById("emailInput")?.value.trim();
  const telefoon = document.getElementById("phoneInput")?.value.trim();
  const barberId = document.getElementById("barberSelect").value;
  const dienstId = document.getElementById("dienstSelect").value;
  const date = document.getElementById("dateInput").value;

  // basis validatie
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneDigits = telefoon ? telefoon.replace(/\D/g, "") : "";

  if(!naam || !email || !telefoon || !barberId || !dienstId || !date || !selectedTime){
    return alert("Vul alle velden in (naam, e-mail, telefoon, dienst, datum, tijd)!");
  }
  if(!emailRegex.test(email)){
    return alert("Vul een geldig e-mailadres in.");
  }
  if(phoneDigits.length < 8){
    return alert("Vul een geldig telefoonnummer in.");
  }

  const datetime = `${date}T${selectedTime}:00`;

  try{
    const { data, error } = await sb.from("boekingen").insert([{
      klantnaam: naam,
      email: email,
      telefoon: telefoon,
      barber_id: barberId,
      dienst_id: dienstId,
      datumtijd: datetime
    }]);
    if(error) throw error;

    document.getElementById("output").innerText = `Boeking succesvol: ${naam} - ${datetime}`;
    console.log("Boeking toegevoegd:", data);
    // refresh availability after successful booking
    refreshAvailability();
  }catch(e){
    console.error("Fout bij boeken:", e);
    alert("Er is iets misgegaan, check console");
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  if (!sb) {
    console.error("Supabase client ontbreekt");
    return;
  }

  loadDiensten();
  loadBarbers();
  generateTimeSlots();

  // Date: today min
  const dateInput = document.getElementById("dateInput");
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
  let dateOffset = 0; // days from today for first card

  function renderDateCards() {
    if (!(datePicker && dateInput)) return;
    datePicker.innerHTML = "";
    const daysToShow = 7;
    const formatterWeekday = new Intl.DateTimeFormat('nl-NL', { weekday: 'short' });
    const formatterMonth = new Intl.DateTimeFormat('nl-NL', { month: 'short' });
    const today = new Date();
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
      const isToday = (new Date().toDateString() === d.toDateString());
      card.innerHTML = `
        <div class="weekday">${isToday ? 'Vandaag' : formatterWeekday.format(d)}</div>
        <div class="day">${dd}</div>
        <div class="month">${formatterMonth.format(d).toUpperCase()}</div>
      `;
      card.addEventListener('click', () => {
        document.querySelectorAll('.date-card').forEach(el=>el.classList.remove('selected'));
        card.classList.add('selected');
        dateInput.value = value;
        refreshAvailability();
      });
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
    renderDateCards();
  }

  if (datePrev) {
    datePrev.addEventListener('click', () => {
      // Do not navigate to past dates before today
      dateOffset = Math.max(0, dateOffset - 7);
      renderDateCards();
      refreshAvailability();
    });
  }
  if (dateNext) {
    dateNext.addEventListener('click', () => {
      dateOffset += 7;
      renderDateCards();
      refreshAvailability();
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
    // Scroll into view for better UX
    const container = document.querySelector('.container');
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // No explicit step1 now; right panel unlocks when service selected

  const toStep3 = document.getElementById("toStep3");
  if (toStep3) {
    toStep3.addEventListener("click", ()=>{
      const dateVal = document.getElementById("dateInput")?.value;
      const barberVal = document.getElementById("barberSelect")?.value;
      if (!dateVal) {
        alert("Kies eerst een datum.");
        return;
      }
      if (!selectedTime) {
        alert("Kies eerst een tijd.");
        return;
      }
      if (!barberVal) {
        alert("Kies een barber.");
        return;
      }
      selectedDate = dateVal;
      selectedBarberId = barberVal;
      showStep(3);
    });
  }

  const backTo2 = document.getElementById("backTo2");
  if (backTo2) {
    backTo2.addEventListener("click", ()=>{
      showStep(2);
    });
  }

  // When barber changes, refresh availability
  const barberSelect = document.getElementById('barberSelect');
  if (barberSelect) {
    barberSelect.addEventListener('change', refreshAvailability);
  }
  
  // Add event listener for direct date input changes
  if (dateInput) {
    dateInput.addEventListener('change', refreshAvailability);
  }
});
