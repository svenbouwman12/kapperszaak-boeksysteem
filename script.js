// ====================== Supabase Config ======================
const supabaseUrl = "https://owrojqutbtoifitqijdi.supabase.co"; // <-- VUL IN
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cm9qcXV0YnRvaWZpdHFpamRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjQ3NjUsImV4cCI6MjA3MzcwMDc2NX0.ugj1qCdzDd_40ZqJE5pYuMarFOhLlT3ZU_8piIPt_Mc"; // <-- VUL IN
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let uurloon = localStorage.getItem('uurloon') || 15;
let timezone = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
let shifts = [];

// ====================== Shifts Laden ======================
async function loadShifts() {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .order('start', { ascending: true });
  if (error) console.error(error);
  else shifts = data || [];

  renderHome();
  renderUren();
}

// ====================== Shift functies ======================
async function startShift() {
  const now = new Date().toISOString();
  await supabase.from('shifts').insert([{ start: now, pause: 0, pausestart: null }]);
  await loadShifts();
}

async function stopShift() {
  const lastShift = shifts[shifts.length - 1];
  if (!lastShift || lastShift.end) return;
  const now = new Date().toISOString();
  await supabase.from('shifts').update({ end: now }).eq('id', lastShift.id);
  await loadShifts();
}

async function startPause() {
  const lastShift = shifts[shifts.length - 1];
  if (!lastShift || lastShift.pausestart) return;
  const now = new Date().toISOString();
  await supabase.from('shifts').update({ pausestart: now }).eq('id', lastShift.id);
  await loadShifts();
}

async function stopPause() {
  const lastShift = shifts[shifts.length - 1];
  if (!lastShift || !lastShift.pausestart) return;
  const now = new Date();
  const pauseHours = (new Date(now) - new Date(lastShift.pausestart)) / 1000 / 60 / 60;
  await supabase.from('shifts')
    .update({ pause: (lastShift.pause || 0) + pauseHours, pausestart: null })
    .eq('id', lastShift.id);
  await loadShifts();
}

// ====================== Berekeningen ======================
function getTotalHours() {
  return shifts.reduce((sum, s) => {
    if (s.end) {
      let hours = (new Date(s.end) - new Date(s.start)) / 1000 / 60 / 60 - (s.pause || 0);
      return sum + hours;
    }
    return sum;
  }, 0);
}

function getTotalEarnings() {
  return getTotalHours() * uurloon;
}

// ====================== Render Home ======================
function renderHome() {
  const totalHoursElem = document.getElementById('totalHours');
  const totalEarningsElem = document.getElementById('totalEarnings');

  if (totalHoursElem) totalHoursElem.innerText = getTotalHours().toFixed(2) + ' uur';
  if (totalEarningsElem) totalEarningsElem.innerText = '€ ' + getTotalEarnings().toFixed(2);

  const chartElem = document.getElementById('hoursChart');
  if (chartElem) {
    const ctx = chartElem.getContext('2d');
    const labels = shifts.map(s => new Date(s.start).toLocaleDateString());
    const data = shifts.map(s => (s.end ? ((new Date(s.end) - new Date(s.start)) / 1000 / 60 / 60 - (s.pause || 0)).toFixed(2) : 0));

    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Gewerkte uren', data, backgroundColor: '#1db954' }] },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  }
}

// ====================== Render Uren ======================
function renderUren() {
  const tbody = document.getElementById('shiftsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  shifts.forEach((s) => {
    const startVal = new Date(s.start).toISOString().slice(0, 16);
    const endVal = s.end ? new Date(s.end).toISOString().slice(0, 16) : '';
    const pauseVal = (s.pause || 0).toFixed(2);

    tbody.innerHTML += `<tr>
      <td>${new Date(s.start).toLocaleDateString()}</td>
      <td><input type="datetime-local" value="${startVal}" onchange="updateShift('${s.id}', 'start', this.value)"></td>
      <td><input type="number" step="0.01" value="${pauseVal}" onchange="updateShift('${s.id}', 'pause', this.value)"></td>
      <td><input type="datetime-local" value="${endVal}" onchange="updateShift('${s.id}', 'end', this.value)"></td>
      <td>${s.end ? (((new Date(s.end) - new Date(s.start)) / 1000 / 60 / 60 - (s.pause || 0)) * uurloon).toFixed(2) : '-'}</td>
      <td><button onclick="deleteShift('${s.id}')">Verwijder</button></td>
    </tr>`;
  });

  const totalEarningsElem = document.getElementById('totalEarningsUren');
  if (totalEarningsElem) totalEarningsElem.innerText = 'Totaal verdiend: € ' + getTotalEarnings().toFixed(2);
}

async function updateShift(id, field, value) {
  let update = {};
  if (field === 'start' || field === 'end') {
    update[field] = new Date(value).toISOString();
  } else if (field === 'pause') {
    update[field] = parseFloat(value);
  }
  await supabase.from('shifts').update(update).eq('id', id);
  await loadShifts();
}

async function deleteShift(id) {
  if (confirm('Weet je zeker dat je deze shift wilt verwijderen?')) {
    await supabase.from('shifts').delete().eq('id', id);
    await loadShifts();
  }
}

// ====================== Instellingen ======================
function renderInstellingen() {
  const uurloonInput = document.getElementById('uurloonInput');
  const timezoneInput = document.getElementById('timezoneInput');

  if (uurloonInput) uurloonInput.value = uurloon;
  if (timezoneInput) timezoneInput.value = timezone;
}

function saveInstellingen() {
  const uurloonInput = document.getElementById('uurloonInput');
  const timezoneInput = document.getElementById('timezoneInput');

  if (uurloonInput) uurloon = parseFloat(uurloonInput.value);
  if (timezoneInput) timezone = timezoneInput.value;

  localStorage.setItem('uurloon', uurloon);
  localStorage.setItem('timezone', timezone);

  alert('Instellingen opgeslagen!');
  renderHome();
}

// ====================== Init ======================
window.addEventListener('DOMContentLoaded', loadShifts);
