// ====================== Configuratie ======================
let uurloon = localStorage.getItem('uurloon') || 15; // standaard €15
let timezone = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
let shifts = JSON.parse(localStorage.getItem('shifts')) || []; // array van alle shifts

// ====================== Shift functies ======================
function startShift() {
  const now = new Date();
  shifts.push({start: now, pause: 0, pausestart: null, end: null});
  saveShifts();
  renderHome();
}

function stopShift() {
  const now = new Date();
  let lastShift = shifts[shifts.length-1];
  if(lastShift.end === null) lastShift.end = now;
  saveShifts();
  renderHome();
}

function startPause() {
  let lastShift = shifts[shifts.length-1];
  if(lastShift.pausestart === null) lastShift.pausestart = new Date();
  saveShifts();
  renderHome();
}

function stopPause() {
  let lastShift = shifts[shifts.length-1];
  if(lastShift.pausestart !== null) {
    lastShift.pause += (new Date() - new Date(lastShift.pausestart))/1000/60/60; // uren
    lastShift.pausestart = null;
  }
  saveShifts();
  renderHome();
}

// ====================== Opslaan & laden ======================
function saveShifts() {
  localStorage.setItem('shifts', JSON.stringify(shifts));
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

// ====================== Render Home ======================
function renderHome() {
  const totalHoursElem = document.getElementById('totalHours');
  const totalEarningsElem = document.getElementById('totalEarnings');

  if(totalHoursElem) totalHoursElem.innerText = getTotalHours().toFixed(2) + ' uur';
  if(totalEarningsElem) totalEarningsElem.innerText = '€ ' + getTotalEarnings().toFixed(2);

  // Grafiek
  const chartElem = document.getElementById('hoursChart');
  if(chartElem) {
    const ctx = chartElem.getContext('2d');
    const labels = shifts.map(s => new Date(s.start).toLocaleDateString());
    const data = shifts.map(s => ((s.end ? (new Date(s.end)-new Date(s.start))/1000/60/60 - s.pause : 0).toFixed(2)));

    if(window.myChart) window.myChart.destroy();
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
      options: {
        responsive:true,
        scales: { y: { beginAtZero: true } }
      }
    });
  }
}

// ====================== Render Uren pagina ======================
function renderUren() {
  const tbody = document.getElementById('shiftsTableBody');
  if(!tbody) return;

  tbody.innerHTML = '';
  shifts.forEach((s, index) => {
    const startVal = new Date(s.start).toISOString().slice(0,16);
    const endVal = s.end ? new Date(s.end).toISOString().slice(0,16) : '';
    tbody.innerHTML += `<tr>
      <td>${new Date(s.start).toLocaleDateString()}</td>
      <td><input type="datetime-local" value="${startVal}" onchange="updateShift(${index}, 'start', this.value)"></td>
      <td><input type="number" step="0.01" value="${(s.pause||0).toFixed(2)}" onchange="updateShift(${index}, 'pause', this.value)"></td>
      <td><input type="datetime-local" value="${endVal}" onchange="updateShift(${index}, 'end', this.value)"></td>
      <td>${s.end ? (((new Date(s.end)-new Date(s.start))/1000/60/60 - s.pause)*uurloon).toFixed(2) : '-'}</td>
      <td><button onclick="deleteShift(${index})">Verwijder</button></td>
    </tr>`;
  });

  const totalEarningsElem = document.getElementById('totalEarningsUren');
  if(totalEarningsElem) totalEarningsElem.innerText = 'Totaal verdiend: € ' + getTotalEarnings().toFixed(2);
}

// ====================== Shift updates ======================
function updateShift(index, field, value) {
  if(field === 'start' || field === 'end') {
    shifts[index][field] = new Date(value);
  } else if(field === 'pause') {
    shifts[index][field] = parseFloat(value);
  }
  saveShifts();
  renderUren();
  renderHome(); // update grafieken en totaal
}

function deleteShift(index) {
  if(confirm('Weet je zeker dat je deze shift wilt verwijderen?')) {
    shifts.splice(index,1);
    saveShifts();
    renderUren();
    renderHome();
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

  localStorage.setItem('uurloon', uurloon);
  localStorage.setItem('timezone', timezone);

  alert('Instellingen opgeslagen!');
  renderHome();
}
