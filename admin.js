// ====== Supabase setup ======
const SUPABASE_URL = "https://owrojqutbtoifitqijdi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cm9qcXV0YnRvaWZpdHFpamRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjQ3NjUsImV4cCI6MjA3MzcwMDc2NX0.ugj1qCdzDd_40ZqJE5pYuMarFOhLlT3ZU_8piIPt_Mc";

const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== Auth check ======
async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if(!user) window.location.href = "admin.html"; // login pagina
}

// ====== Logout ======
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "admin.html";
});

// ====== Boekingen ======
async function loadBoekingen() {
  const { data: boekingen, error: boekingenError } = await supabase.from("boekingen").select("*");
  const { data: barbers } = await supabase.from("barbers").select("*");
  const { data: diensten } = await supabase.from("diensten").select("*");
  const tbody = document.getElementById("boekingenBody");
  if(boekingenError){ console.error(boekingenError); return; }
  tbody.innerHTML = "";
  boekingen.forEach(b => {
    const barber = barbers.find(x=>x.id===b.barber_id);
    const dienst = diensten.find(x=>x.id===b.dienst_id);
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

async function deleteBoeking(id){
  if(!confirm("Weet je zeker dat je deze boeking wilt verwijderen?")) return;
  const { error } = await supabase.from("boekingen").delete().eq("id", id);
  if(error) { console.error(error); alert("Fout bij verwijderen"); }
  loadBoekingen();
}

// ====== Barbers ======
async function loadBarbers() {
  const { data, error } = await supabase.from("barbers").select("*").order("id");
  const tbody = document.getElementById("barbersBody");
  if(error){ console.error(error); return; }
  tbody.innerHTML = "";
  data.forEach(b => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${b.id}</td>
      <td><input type="text" value="${b.naam}" data-id="${b.id}" class="barberNameInput"></td>
      <td><button class="deleteBarberBtn" data-id="${b.id}">Verwijder</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Event listeners voor edit en delete
  document.querySelectorAll(".barberNameInput").forEach(input=>{
    input.addEventListener("change", async ()=>{
      const id = input.dataset.id;
      const name = input.value.trim();
      if(!name) return alert("Naam mag niet leeg zijn");
      const { error } = await supabase.from("barbers").update({ naam: name }).eq("id", id);
      if(error) console.error(error);
      loadBarbers();
    });
  });

  document.querySelectorAll(".deleteBarberBtn").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.dataset.id;
      if(!confirm("Weet je zeker?")) return;
      const { error } = await supabase.from("barbers").delete().eq("id", id);
      if(error) console.error(error);
      loadBarbers();
    });
  });
}

document.getElementById("addBarberBtn").addEventListener("click", async ()=>{
  const name = document.getElementById("newBarberName").value.trim();
  if(!name) return alert("Vul een naam in!");
  const { error } = await supabase.from("barbers").insert([{ naam: name }]);
  if(error){ console.error(error); return alert("Fout bij toevoegen"); }
  document.getElementById("newBarberName").value = "";
  loadBarbers();
});

// ====== Diensten ======
async function loadDiensten() {
  const { data, error } = await supabase.from("diensten").select("*").order("id");
  const tbody = document.getElementById("dienstenBody");
  if(error){ console.error(error); return; }
  tbody.innerHTML = "";
  data.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.id}</td>
      <td><input type="text" value="${d.naam}" data-id="${d.id}" class="dienstNameInput"></td>
      <td><button class="deleteDienstBtn" data-id="${d.id}">Verwijder</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll(".dienstNameInput").forEach(input=>{
    input.addEventListener("change", async ()=>{
      const id = input.dataset.id;
      const name = input.value.trim();
      if(!name) return alert("Naam mag niet leeg zijn");
      const { error } = await supabase.from("diensten").update({ naam: name }).eq("id", id);
      if(error) console.error(error);
      loadDiensten();
    });
  });

  document.querySelectorAll(".deleteDienstBtn").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.dataset.id;
      if(!confirm("Weet je zeker?")) return;
      const { error } = await supabase.from("diensten").delete().eq("id", id);
      if(error) console.error(error);
      loadDiensten();
    });
  });
}

document.getElementById("addDienstBtn").addEventListener("click", async ()=>{
  const name = document.getElementById("newDienstName").value.trim();
  if(!name) return alert("Vul een naam in!");
  const { error } = await supabase.from("diensten").insert([{ naam: name }]);
  if(error){ console.error(error); return alert("Fout bij toevoegen"); }
  document.getElementById("newDienstName").value = "";
  loadDiensten();
});

// ====== Initial load ======
checkAuth().then(()=>{
  loadBoekingen();
  loadBarbers();
  loadDiensten();
});
