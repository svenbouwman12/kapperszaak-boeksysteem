// Gebruik de client die in index.html is aangemaakt
const supabase = window.supabaseClient;

// Diensten laden
async function loadDiensten() {
  const select = document.getElementById("dienstSelect");
  if (!select) return;

  select.innerHTML = "<option>Laden...</option>";

  try {
    const { data, error } = await supabase.from("diensten").select("*").order("id", { ascending: true });
    if (error) throw error;

    select.innerHTML = "";
    if (data.length === 0) {
      select.innerHTML = "<option>Geen diensten gevonden</option>";
      return;
    }

    data.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = `${d.naam} (€${d.prijs_euro})`;
      select.appendChild(opt);
    });
  } catch (e) {
    console.error("Fout bij loadDiensten:", e);
    select.innerHTML = "<option>Fout bij laden</option>";
    const out = document.getElementById("output");
    if(out) out.innerText = "Check console voor details";
  }
}

// Boeking bevestigen (demo)
async function boekDienst() {
  const select = document.getElementById("dienstSelect");
  if (!select) return alert("Geen dienst geselecteerd");

  const dienstId = select.value;
  const dienstNaam = select.options[select.selectedIndex].text;

  // Feedback aan gebruiker
  const out = document.getElementById("output");
  if(out) out.innerText = `Je hebt gekozen voor: ${dienstNaam}`;

  // Voorbeeld insert (als je tabel 'boekingen' hebt)
  /*
  const { data, error } = await supabase.from("boekingen").insert([{ dienst_id: dienstId, klantnaam: "Test Klant", datum: new Date() }]);
  if (error) console.error("Fout bij boeken:", error);
  else console.log("Boeking toegevoegd:", data);
  */
}

// Event listener
document.addEventListener("DOMContentLoaded", () => {
  loadDiensten();
  const btn = document.getElementById("bookBtn");
  if (btn) btn.addEventListener("click", boekDienst);
});
