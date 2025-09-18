// ================== Supabase configuratie ==================
const SUPABASE_URL = "https://owrojqutbtoifitqijdi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cm9qcXV0YnRvaWZpdHFpamRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjQ3NjUsImV4cCI6MjA3MzcwMDc2NX0.ugj1qCdzDd_40ZqJE5pYuMarFOhLlT3ZU_8piIPt_Mc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================== Diensten laden ==================
async function loadDiensten() {
  const { data, error } = await supabaseClient.from("diensten").select("*");

  if (error) {
    console.error("Error loading diensten:", error);
    alert("Fout bij laden van diensten!");
    return;
  }

  const select = document.getElementById("dienstSelect");
  select.innerHTML = ""; // leegmaken

  data.forEach(dienst => {
    const option = document.createElement("option");
    option.value = dienst.id;
    option.textContent = `${dienst.naam} (€${dienst.prijs_euro})`;
    select.appendChild(option);
  });
}

// ================== Boeking bevestigen ==================
function boekDienst() {
  const select = document.getElementById("dienstSelect");
  const gekozenDienst = select.options[select.selectedIndex].text;

  alert("Je hebt gekozen voor: " + gekozenDienst);
}
