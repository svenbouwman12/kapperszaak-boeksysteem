const supabase = window.supabaseClient;

// LOGIN
const loginBtn = document.getElementById("loginBtn");
if(loginBtn){
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("emailInput").value.trim();
    const password = document.getElementById("passwordInput").value.trim();
    if(!email || !password) return alert("Vul email en wachtwoord in");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if(error){
      document.getElementById("loginOutput").innerText = "Fout: " + error.message;
      return;
    }
    // Login succesvol → redirect naar dashboard
    window.location.href = "dashboard.html";
  });
}

// LOGOUT
const logoutBtn = document.getElementById("logoutBtn");
if(logoutBtn){
  logoutBtn.addEventListener("click", async ()=>{
    await supabase.auth.signOut();
    window.location.href = "admin.html";
  });
}

// Check of ingelogd bij dashboard
async function checkAuth(){
  const { data: { session } } = await supabase.auth.getSession();
  if(!session){
    window.location.href = "admin.html";
  }
}

// BOEKINGEN LADEN
async function loadBoekingen() {
  await checkAuth();
  const tbody = document.getElementById("boekingenBody");
  if (!tbody) return;

  try {
    // 1️⃣ Haal alle boekingen op
    const { data: boekingen, error: boekingenError } = await supabase
      .from("boekingen")
      .select("*")
      .order("datumtijd", { ascending: true });

    if (boekingenError) throw boekingenError;

    // 2️⃣ Haal alle barbers op
    const { data: barbers, error: barbersError } = await supabase
      .from("barbers")
      .select("*");
    if (barbersError) throw barbersError;

    // 3️⃣ Haal alle diensten op
    const { data: diensten, error: dienstenError } = await supabase
      .from("diensten")
      .select("*");
    if (dienstenError) throw dienstenError;

    // 4️⃣ Tabel leegmaken
    tbody.innerHTML = "";

    if (!boekingen || boekingen.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">Geen boekingen gevonden</td></tr>`;
      return;
    }

    // 5️⃣ Loop door alle boekingen en match barber & dienst
    boekingen.forEach(b => {
      const barber = barbers.find(x => x.id === b.barber_id);
      const dienst = diensten.find(x => x.id === b.dienst_id);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${b.id}</td>
        <td>${b.klantnaam}</td>
        <td>${barber ? barber.naam : '-'}</td>
        <td>${dienst ? dienst.naam : '-'}</td>
        <td>${new Date(b.datumtijd).toLocaleString()}</td>
        <td>
          <button onclick="deleteBoeking(${b.id})">Verwijder</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Fout bij laden boekingen:", err);
    tbody.innerHTML = `<tr><td colspan="6">Fout bij laden boekingen</td></tr>`;
  }
}


// BOEKING VERWIJDEREN
async function deleteBoeking(id){
  if(!confirm("Weet je zeker dat je deze boeking wilt verwijderen?")) return;
  const { error } = await supabase.from("boekingen").delete().eq("id", id);
  if(error){
    console.error(error);
    return alert("Fout bij verwijderen");
  }
  loadBoekingen();
}

// Initialiseer dashboard
if(window.location.href.includes("dashboard.html")){
  checkAuth().then(loadBoekingen);
}

const logoutBtn = document.getElementById("logoutBtn");
if(logoutBtn){
  logoutBtn.addEventListener("click", async ()=>{
    await supabase.auth.signOut();
    window.location.href = "admin.html";
  });
}
