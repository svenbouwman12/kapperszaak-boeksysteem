// ==== LOGIN & AUTH ====
const loginContainer = document.getElementById("loginContainer");
const dashboardContainer = document.getElementById("dashboardContainer");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

async function checkAuth() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if(user){
    loginContainer.style.display = "none";
    dashboardContainer.style.display = "block";
    loadAllData();
  } else {
    loginContainer.style.display = "block";
    dashboardContainer.style.display = "none";
  }
}

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value;
  const password = document.getElementById("passwordInput").value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if(error) return alert("Login mislukt: " + error.message);
  checkAuth();
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  checkAuth();
});

// ==== LOAD DATA ====
async function loadAllData() {
  await loadBarbers();
  await loadDiensten();
  await loadBoekingen();
}

// ==== BARBERS CRUD ====
async function loadBarbers() {
  const { data, error } = await supabaseClient.from("barbers").select("*").order("id");
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

  document.querySelectorAll(".barberNameInput").forEach(input=>{
    input.addEventListener("change", async ()=>{
      const id = input.dataset.id;
      const name = input.value.trim();
      if(!name) return alert("Naam mag niet leeg zijn");
      await supabaseClient.from("barbers").update({ naam: name }).eq("id", id);
      loadBarbers();
    });
  });

  document.querySelectorAll(".deleteBarberBtn").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.dataset.id;
      if(!confirm("Weet je zeker?")) return;
      await supabaseClient.from("barbers").delete().eq("id", id);
      loadBarbers();
    });
  });
}

document.getElementById("addBarberBtn").addEventListener("click", async ()=>{
  const name = document.getElementById("newBarberName").value.trim();
  if(!name) return alert("Vul een naam in!");
  await supabaseClient.from("barbers").insert([{ naam: name }]);
  document.getElementById("newBarberName").value = "";
  loadBarbers();
});

// ==== DIENSTEN CRUD ====
async function loadDiensten() {
  const { data, error } = await supabaseClient.from("diensten").select("*").order("id");
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
      await supabaseClient.from("diensten").update({ naam: name }).eq("id", id);
      loadDiensten();
    });
  });

  document.querySelectorAll(".deleteDienstBtn").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.dataset.id;
      if(!confirm("Weet je zeker?")) return;
      await supabaseClient.from("diensten").delete().eq("id", id);
      loadDiensten();
    });
  });
}

document.getElementById("addDienstBtn").addEventListener("click", async ()=>{
  const name = document.getElementById("newDienstName").value.trim();
  if(!name) return alert("Vul een naam in!");
  await supabaseClient.from("diensten").insert([{ naam: name }]);
  document.getElementById("newDienstName").value = "";
  loadDiensten();
});

// ==== BOEKINGEN ====
async function loadBoekingen() {
  const { data: boekingen, error } = await supabaseClient.from("boekingen").select("*");
  const { data: barbers } = await supabaseClient.from("barbers").select("*");
  const { data: diensten } = await supabaseClient.from("diensten").select("*");
  const tbody = document.getElementById("boekingenBody");
  if(error){ console.error(error); return; }
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
  await supabaseClient.from("boekingen").delete().eq("id", id);
  loadBoekingen();
}

// ==== INIT ====
checkAuth();
