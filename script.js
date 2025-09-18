const supabase = window.supabaseClient;

let selectedTime = null;

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

// Barbers laden
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

// Tijdslots genereren (09:00-18:00, per 15 min)
function generateTimeSlots() {
  const container = document.getElementById("timeSlots");
  if(!container) return;
  container.innerHTML = "";

  const startHour = 9;
  const endHour = 18;
  const interval = 15;

  for(let h=startHour; h<endHour; h++){
    for(let m=0; m<60; m+=interval){
      const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerText = timeStr;
      btn.className = "time-btn";
      btn.addEventListener("click",()=>selectTimeSlot(timeStr));
      container.appendChild(btn);
    }
  }
}

function selectTimeSlot(time){
  selectedTime = time;
  document.querySelectorAll(".time-btn").forEach(btn=>btn.classList.remove("selected"));
  document.querySelectorAll(".time-btn").forEach(btn=>{
    if(btn.innerText===time) btn.classList.add("selected");
  });
}

// Boeking opslaan
async function boekDienst(){
  const naam = document.getElementById("naamInput").value.trim();
  const barberId = document.getElementById("barberSelect").value;
  const dienstId = document.getElementById("dienstSelect").value;
  const date = document.getElementById("dateInput").value;

  if(!naam || !barberId || !dienstId || !date || !selectedTime){
    return alert("Vul alles in!");
  }

  const datetime = `${date}T${selectedTime}:00`;

  try{
    const { data, error } = await supabase.from("boekingen").insert([{
      klantnaam: naam,
      barber_id: barberId,
      dienst_id: dienstId,
      datumtijd: datetime
    }]);
    if(error) throw error;

    document.getElementById("output").innerText = `Boeking succesvol: ${naam} - ${datetime}`;
    console.log("Boeking toegevoegd:", data);
  }catch(e){
    console.error("Fout bij boeken:", e);
    alert("Er is iets misgegaan, check console");
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  loadDiensten();
  loadBarbers();
  generateTimeSlots();

  const btn = document.getElementById("bookBtn");
  if(btn) btn.addEventListener("click",boekDienst);
});

const loginBtn = document.getElementById("loginBtn");
if(loginBtn){
  loginBtn.addEventListener("click", () => {
    // Stuur door naar login pagina
    window.location.href = "admin.html"; 
  });
}
