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

// ====================== Auth check ======================
async function checkAuth() {
  try {
    // In Supabase v2 kan getUser() een AuthSessionMissingError geven als er geen sessie is.
    // Eerst sessie checken, daarna (optioneel) user ophalen.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Auth session error:", sessionError);
    }
    if (!session) {
      window.location.href = "index.html";
      return;
    }
    // Optioneel: user ophalen indien nodig
    // const { data: { user } } = await supabase.auth.getUser();
  } catch (e) {
    console.error("Auth check error:", e);
  }
}

// ====================== Logout ======================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
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
window.addEventListener('DOMContentLoaded', async () => {
  // Initialize tabs first
  initTabs();
  
  // Check authentication
  await checkAuth();
  
  // Load initial data
  await loadBoekingen();
  await loadBarbers();
  await loadDiensten();
  
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
});
