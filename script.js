// ======== Configuratie ========
let uurloon = localStorage.getItem('uurloon') || 15; // standaard €15
let timezone = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;

let shifts = JSON.parse(localStorage.getItem('shifts')) || []; // array van alle shifts

// ======== Shift functies ========
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

// ======== Opslaan & laden ========
function saveShifts() {
  localStorage.setItem('shifts', JSON.stringify(shifts));
}

// ======== Berekeningen ========
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

// ======== Render functies ========
function renderHome() {
  document.getElementById('totalHours').innerText = getTotalHours().toFixed(2) + ' uur';
  document.getElementById('totalEarnings').innerText = '€ ' + getTotalEarnings().toFixed(2);

  // Grafiek
  const ctx = document.getElementById('hoursChart').getContext('2d');
  const labels = shifts.map(s => new Date(s.start).toLocaleDateString());
  const data = shifts.map(s => ((new Date(s.end)-new Date(s.start))/1000/60/60 - s.pause).toFixed(2));
  
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

// ======== Render Uren pagina ========
function renderUren() {
  const tbody = document.getElementById('shiftsTableBody');
  tbody.innerHTML = '';
  shifts.forEach(s => {
    const start = new Date(s.start).toLocaleTimeString();
    const end = s.end ? new Date(s.end).toLocaleTimeString() : '-';
    const pause = (s.pause || 0).toFixed(2);
    const hours = s.end ? ((new Date(s.end)-new Date(s.start))/1000/60/60 - s.pause).toFixed(2) : '-';
    const earned = s.end ? (hours*uurloon).toFixed(2) : '-';
    tbody.innerHTML += `<tr>
      <td>${new Date(s.start).toLocaleDateString()}</td>
      <td>${start}</td>
      <td>${pause}</td>
      <td>${end}</td>
      <td>${earned}</td>
    </tr>`;
  });

  document.getElementById('totalEarningsUren').innerText = 'Totaal verdiend: € ' + getTotalEarnings().toFixed(2);
}

// ======== Render Instellingen ========
function renderInstellingen() {
  document.getElementById('uurloonInput').value = uurloon;
  document.getElementById('timezoneInput').value = timezone;
}

function saveInstellingen() {
  uurloon = parseFloat(document.getElementById('uurloonInput').value);
  timezone = document.getElementById('timezoneInput').value;
  localStorage.setItem('uurloon', uurloon);
  localStorage.setItem('timezone', timezone);
  alert('Instellingen opgeslagen!');
  renderHome();
}
