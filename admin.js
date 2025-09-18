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
    const { data, error } = await supabase.from("boekingen").select(`
      id,
      klantnaam,
      datumtijd,
      barber_id (id, naam),
      dienst_id (id, naam)
    `).order("datumtijd", { ascending: true });

    if (error) throw error;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">Geen boekingen gevonden</td></tr>`;
      return;
    }

    data.forEach(b => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${b.id}</td>
        <td>${b.klantnaam}</td>
        <td>${b.barber_id ? b.barber_id.naam : '-'}</td>
        <td>${b.dienst_id ? b.dienst_id.naam : '-'}</td>
        <td>${new Date(b.datumtijd).toLocaleString()}</td>
        <td>
          <button onclick="deleteBoeking(${b.id})">Verwijder</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Fout bij laden boekingen:", err);
    tbody.innerHTML = `<tr><td colspan="6">Fout bij laden</td></tr>`;
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
