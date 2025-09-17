// ====================== Configuratie ======================
let uurloon = 15; // standaard €15, kan later uit Instellingen komen
let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
let shifts = []; // shifts worden geladen uit Supabase

// ====================== Supabase client ======================
const supabaseUrl = 'https://<JOUW-PROJECT-URL>.supabase.co';
const supabaseKey = '<JOUW-ANON-KEY>';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ====================== Load shifts ======================
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
  const { error } = await supabase
    .from('shifts')
    .insert([{ start: now, pause: 0 }]);
  if (error) console.error(error);
  await loadShifts();
}

async function stopShift() {
  const lastShift = shifts[shifts.length - 1];
  if (!lastShift || lastShift.end) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('shifts')
    .update({ end: now })
    .eq('id', lastShift.id);
  if (error) console.error(error);
  await loadShifts();
}

async function startPause() {
  const lastShift = shifts[shifts.length - 1];
  if (!lastShift || lastShift.pausestart) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('shifts')
    .update({ pausestart: now })
    .eq('id', lastShift.id);
  if (error) console.error(error);
  await loadShifts();
}

async function stopPause() {
  const lastShift = shifts[shifts.length - 1];
  if (!lastShift || !lastShift.pausestart) return;
  const now = new Date();
  const pauseHours = (new Date(now) - new Date(lastShift.pausestart)) / 1000 / 60 / 60;
  const { error } = await supabase
    .from('shifts')
    .update({ pause: (lastShift.pause || 0) + pauseHours, pausestart: null })
    .eq('id', lastShift.id);
  if (error) console.error(error);
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

  // Grafiek
  const chartElem = document.getElementById('hoursChart');
  if (chartElem) {
    const ctx = chartElem.getContext('2d');
    const labels = shifts.map(s => new Date(s.start).toLocaleDateString());
    const data = shifts.map(s => ((s.end ? (new Date(s.end) - new Date(s.start)) / 1000 / 60 / 60 - (s.pause || 0) : 0).toFixed(2)));

    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Gewerkte uren',
          data,
          backgroundColor: '#1db954'
        }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  }
}

// ====================== Render Uren pagina ======================
function renderUren() {
  const tbody = document.getElementById('shiftsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  shifts.forEach((s, index) => {
    const startVal = new Date(s.start).toISOString().slice(0, 16);
    const endVal = s.end ? new Date(s.end).toISOString().slice(0, 16) : '';
    tbody.innerHTML += `<tr>
      <td>${new Date(s.start).toLocaleDateString()}</td>
      <td><input type="datetime-local" value="${startVal}" onchange="updateShift('${s.id}', 'start', this.value)"></td>
      <td><input type="number" step="0.01" value="${(s.pause||0).toFixed(2)}" onchange="updateShift('${s.id}', 'pause', this.value)"></td>
      <td><input type="datetime-local" value="${endVal}" onchange="updateShift('${s.id}', 'end', this.value)"></td>
      <td>${s.end ? (((new Date(s.end) - new Date(s.start)) / 1000 / 60 / 60 - (s.pause || 0)) * uurloon).toFixed(2) : '-'}</td>
      <td><button onclick="deleteShift('${s.id}')">Verwijder</button></td>
    </tr>`;
  });

  const totalEarningsElem = document.getElementById('totalEarningsUren');
  if (totalEarningsElem) totalEarningsElem.innerText = 'Totaal verdiend: € ' + getTotalEarnings().toFixed(2);
}

// ====================== Shift updates ======================
async function updateShift(id, field, value) {
  const obj = {};
  obj[field] = (field === 'pause') ? parseFloat(value) : new Date(value).toISOString();
  const { error } = await supabase
    .from('shifts')
    .update(obj)
    .eq('id', id);
  if (error) console.error(error);
  await loadShifts();
}

async function deleteShift(id) {
  if(confirm('Weet je zeker dat je deze shift wilt verwijderen?')) {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id);
    if (error) console.error(error);
    await loadShifts();
  }
}

// ====================== Render Instellingen ======================
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

  alert('Instellingen opgeslagen!');
  renderHome();
}

// ====================== Initialize ======================
window.addEventListener('DOMContentLoaded', loadShifts);
