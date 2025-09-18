// gebruik de al gemaakte client
const supabase = window.supabaseClient;

// geen const SUPABASE_URL of SUPABASE_KEY hier! anders krijg je dubbele declaratie errors

async function loadDiensten() {
  const sel = document.getElementById("dienstSelect");
  if (!sel) return;

  sel.innerHTML = "<option>Laden...</option>";

  try {
    const { data, error } = await supabase.from("diensten").select("*").order("id", { ascending: true });
    if (error) throw error;

    sel.innerHTML = "";
    data.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = `${d.naam} (€${d.prijs_euro})`;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error("Fout bij loadDiensten:", e);
    sel.innerHTML = "<option>Fout bij laden</option>";
  }
}

// event listener
document.addEventListener("DOMContentLoaded", function() {
  loadDiensten();
  const btn = document.getElementById("bookBtn");
  if (btn) btn.addEventListener("click", () => {
    const sel = document.getElementById("dienstSelect");
    alert("Gekozen dienst: " + sel.options[sel.selectedIndex].text);
  });
});
