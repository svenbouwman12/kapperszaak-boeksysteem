// ====================== Gebruik globale Supabase client ======================
const supabase = window.supabase;

// ====================== Auth check ======================
async function checkAuth() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Auth check error:", error);
    return;
  }
  if (!user) {
    window.location.href = "admin-login.html"; // stuur naar login pagina
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
      <td><button class="deleteBarberBtn" data-id="${b.id}">Verwijder</button></td>
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
      <td><button class="deleteDienstBtn" data-id="${d.id}">Verwijder</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Edit dienst
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
    if (!name) return alert("Vul een naam in!");
    const { error } = await supabase.from("diensten").insert([{ naam: name }]);
    if (error) { console.error(error); return alert("Fout bij toevoegen"); }
    document.getElementById("newDienstName").value = "";
    loadDiensten();
  });
}

// ====================== Initial load ======================
checkAuth().then(() => {
  loadBoekingen();
  loadBarbers();
  loadDiensten();
});
