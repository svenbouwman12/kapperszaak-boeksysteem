const supabase = window.supabaseClient;

// Diensten laden
async function loadDiensten() {
  const sel = document.getElementById("dienstSelect");
  if (!sel) return;
  sel.innerHTML = "<option>Laden...</option>";
  try {
    const { data, error } = await supabase.from("diensten").select("*").order("id");
    if (error) throw error;
    sel.innerHTML = "";
    if (!data || data.length === 0) {
      sel.innerHTML = "<option>Geen diensten gevonden</option>";
      return;
    }
    data.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = `${d.naam} (€${d.prijs_euro})`;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
    sel.innerHTML = "<option>Fout bij laden</option>";
  }
}

// Barbers laden (voorbeeld)
async function loadBarbers() {
  const sel = document.getElementById("barberSelect");
  if (!sel) return;
  sel.innerHTML = "<option>Laden...</option>";
  try {
    const { data, error } = await supabase.from("barbers").select("*").order("id");
    if (error) throw error;
    sel.innerHTML = "";
    if (!data || data.length === 0) {
      sel.innerHTML = "<option>Geen barbers gevonden</option>";
      return;
    }
    data.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.naam;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
    sel.innerHTML = "<option>Fout bij laden</option>";
  }
}

// Boeking opslaan
async function boekDienst() {
  const naam = document.getElementById("naamInput").value.trim();
  const barberId = document.getElementById("barberSelect").value;
  const dienstId = document.getElementById("dienstSelect").value;
  const datetime = document.getElementById("datetimeInput").value;

  if (!naam || !barberId || !dienstId || !datetime) {
    return alert("Vul alles in!");
  }

  try {
    const { data, error } = await supabase.from("boekingen").insert([{
      klantnaam: naam,
      barber_id: barberId,
      dienst_id: dienstId,
      datumtijd: datetime
    }]);
    if (error) throw error;

    document.getElementById("output").innerText = `Boeking succesvol: ${naam} - ${datetime}`;
    console.log("Boeking toegevoegd:", data);
  } catch (e) {
    console.error("Fout bij boeken:", e);
    alert("Er is iets misgegaan, check console");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadDiensten();
  loadBarbers();

  const btn = document.getElementById("bookBtn");
  if (btn) btn.addEventListener("click", boekDienst);
});
