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
