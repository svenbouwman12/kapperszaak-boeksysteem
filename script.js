// ================= Supabase setup =================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = "https://owrojqutbtoifitqijdi.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cm9qcXV0YnRvaWZpdHFpamRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjQ3NjUsImV4cCI6MjA3MzcwMDc2NX0.ugj1qCdzDd_40ZqJE5pYuMarFOhLlT3ZU_8piIPt_Mc";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= Vul dropdowns =================
async function loadOptions() {
  let { data: diensten } = await supabase.from("diensten").select("*");
  let dienstSelect = document.getElementById("dienstSelect");
  diensten.forEach(d => {
    let opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = `${d.naam} (€${d.prijs_euro})`;
    dienstSelect.appendChild(opt);
  });

  let { data: medewerkers } = await supabase.from("medewerkers").select("*");
  let medewerkerSelect = document.getElementById("medewerkerSelect");
  medewerkers.forEach(m => {
    let opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.naam;
    medewerkerSelect.appendChild(opt);
  });
}

// ================= Boek afspraak =================
document.getElementById("bookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const klantNaam = document.getElementById("klantNaam").value;
  const dienstId = document.getElementById("dienstSelect").value;
  const medewerkerId = document.getElementById("medewerkerSelect").value;
  const datum = document.getElementById("datum").value;
  const tijd = document.getElementById("tijd").value;

  let { error } = await supabase.from("boekingen").insert([
    { klantnaam: klantNaam, dienst_id: dienstId, medewerker_id: medewerkerId, datum, tijd, status: "geboekt" }
  ]);

  if (error) {
    document.getElementById("output").innerText = "❌ Fout: " + error.message;
  } else {
    document.getElementById("output").innerText = "✅ Afspraak geboekt!";
    document.getElementById("bookingForm").reset();
  }
});

loadOptions();
