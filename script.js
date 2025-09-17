// ====================== Supabase Config ======================
const SUPABASE_URL = "https://owrojqutbtoifitqijdi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cm9qcXV0YnRvaWZpdHFpamRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjQ3NjUsImV4cCI6MjA3MzcwMDc2NX0.ugj1qCdzDd_40ZqJE5pYuMarFOhLlT3ZU_8piIPt_Mc";
const { createClient } = supabase;
const supa = createClient(SUPABASE_URL, SUPABASE_KEY);

// ====================== Configuratie ======================
let uurloon = localStorage.getItem('uurloon') || 15;
let timezone = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
let shifts = [];

// ====================== Database functies ======================
async function loadShifts() {
  let { data, error } = await supa.from('shifts').select('*').order('start', { ascending: true });
  if (error) { console.error(error); return; }
  shifts = data.map(s => ({
    ...s,
    start: new Date(s.start),
    end: s.end ? new Date(s.end) : null
  }));
  renderHome();
  renderUren();
}

async function saveShift(shift) {
  const { error } = await supa.from('shifts').insert([{
    start: shift.start,
    end: shift.end,
    pause: shift.pause
  }]);
  if (error) console.error(error);
  else loadShifts();
}

async function updateShiftDB(id, field, value) {
  const { error } = await supa.from('shifts').update({ [field]: value }).eq('id', id);
  if (error) console.error(error);
  else loadShifts();
}

async function deleteShiftDB(id) {
  const { error } = await supa.from('shifts').delete().eq('id', id);
  if (error) console.error(error);
  else loadShifts();
}

// ====================== Shift functies ======================
function startShift() {
  const now = new Date();
  let shift = { start: now, pause: 0, end: null };
  saveShift(shift);
}

function stopShift() {
  const now = new Date();
  let lastShift = shifts[shifts.length-1];
  if(lastShift && !lastShift.end) {
    updateShiftDB(lastShift.id, 'end', now);
  }
}

function startPause() {
  let lastShift = shifts[shifts.length-1];
  if(lastShift && !lastShift.pausestart) {
    lastShift.pausestart = new Date();
  }
}

function stopPause() {
  let lastShift = shifts[shifts.length-1];
  if(lastShift && lastShift.pausestart) {
    let pauseHours = (new Date() - new Date(lastShift.pausestart))/1000/60/60;
    updateShiftDB(lastShift.id, 'pause', (lastShift.pause + pauseHours));
  }
}

// ====================== Berekeningen ======================
function getTotalHours() {
  return shifts.reduce((sum, s) => {
    if(s.end) {
      let hours = (new Date(s.end)-new Date(s.start))/1000/60/60 - s.pause;
      return sum + hours;
    }
    return sum;
  }, 0);
}

function getTotalEarnings() {
  return getTotalHours()*uurloon;
}

// ====================== Render functies ======================
function renderHome() {
  const totalHoursElem = document.getElementById('totalHours');
  const totalEarningsElem = document.getElementById('totalEarnings');
  if(totalHoursElem) totalHoursElem.innerText = getTotalHours().toFixed(2) + ' uur';
  if(totalEarningsElem) totalEarningsElem.innerText = '€ ' + getTotalEarnings().toFixed(2);

  const chartElem = document.getElementById('hoursChart');
  if(chartElem) {
    const ctx = chartElem.getContext('2d');
    const labels = shifts.map(s => new Date(s.start).toLocaleDateString());
    const data = shifts.map(s => (s.end ? ((new Date(s.end)-new Date(s.start))/1000/60/60 - s.pause).toFixed(2) : 0));
    if(window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Uren', data, backgroundColor: '#1db954' }] },
      options: { responsive:true, scales: { y: { beginAtZero: true } } }
    });
  }
}

function renderUren() {
  const tbody = document.getElementById('shiftsTableBody');
  if(!tbody) return;
  tbody.innerHTML = '';
  shifts.forEach((s) => {
    const startVal = s.start ? new Date(s.start).toISOString().slice(0,16) : '';
    const endVal = s.end ? new Date(s.end).toISOString().slice(0,16) : '';
    tbody.innerHTML += `<tr>
      <td>${new Date(s.start).toLocaleDateString()}</td>
      <td><input type="datetime-local" value="${startVal}" onchange="updateShiftDB(${s.id}, 'start', this.value)"></td>
      <td><input type="number" step="0.01" value="${(s.pause||0).toFixed(2)}" onchange="updateShiftDB(${s.id}, 'pause', this.value)"></td>
      <td><input type="datetime-local" value="${endVal}" onchange="updateShiftDB(${s.id}, 'end', this.value)"></td>
      <td>${s.end ? (((new Date(s.end)-new Date(s.start))/1000/60/60 - s.pause)*uurloon).toFixed(2) : '-'}</td>
      <td><button onclick="deleteShiftDB(${s.id})">Verwijder</button></td>
    </tr>`;
  });
  const totalEarningsElem = document.getElementById('totalEarningsUren');
  if(totalEarningsElem) totalEarningsElem.innerText = 'Totaal verdiend: € ' + getTotalEarnings().toFixed(2);
}

function renderInstellingen() {
  const uurloonInput = document.getElementById('uurloonInput');
  const timezoneInput = document.getElementById('timezoneInput');
  if(uurloonInput) uurloonInput.value = uurloon;
  if(timezoneInput) timezoneInput.value = timezone;
}

function saveInstellingen() {
  const uurloonInput = document.getElementById('uurloonInput');
  const timezoneInput = document.getElementById('timezoneInput');
  if(uurloonInput) uurloon = parseFloat(uurloonInput.value);
  if(timezoneInput) timezone = timezoneInput.value;
  localStorage.setItem('uurloon', uurloon);
  localStorage.setItem('timezone', timezone);
  alert('Instellingen opgeslagen!');
  renderHome();
}

// ====================== Handmatig shift toevoegen ======================
async function addManualShift() {
  const date = document.getElementById('manualDate').value;
  const start = document.getElementById('manualStart').value;
  const end = document.getElementById('manualEnd').value;
  const pause = parseFloat(document.getElementById('manualPause').value) || 0;
  if(!date || !start || !end) { alert("Vul alles in!"); return; }
  const startDate = new Date(`${date}T${start}`);
  const endDate = new Date(`${date}T${end}`);
  if(endDate <= startDate) { alert("Eindtijd moet na starttijd zijn!"); return; }
  saveShift({ start: startDate, end: endDate, pause });
}

// ====================== Initial load ======================
loadShifts();
