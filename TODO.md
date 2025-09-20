# TODO Lijst - Fixes en Verbeteringen

## 🔥 Prioriteit Hoog

### 🐛 Critical Bugs
- [ ] **Afspraak wijzigen via klant informatie werkt niet** `[bug]` `[admin]`
  - Wijzigingen worden niet doorgevoerd in database
  - Status: Niet werkend
- [ ] **Gebruiker toevoegen conflict** `[bug]` `[admin]`
  - Email dat ooit bestond maar verwijderd is kan niet opnieuw toegevoegd worden
  - Geeft foutmelding "gebruiker bestaat al"
- [ ] **Statistieken updaten niet** `[bug]` `[admin]`
  - Nieuwe afspraken worden niet weergegeven in statistieken
  - Real-time updates werken niet

## 🟡 Prioriteit Gemiddeld

### 📱 Mobile UX Issues
- [ ] **Klanten tab default sub-tab** `[mobile]` `[ui/ux]`
  - Op mobiel: Klanten tab opent geen sub-tab standaard
  - Oplossing: Zet standaard op "Overzicht" sub-tab
- [ ] **Instellingen tab default sub-tab** `[mobile]` `[ui/ux]`
  - Op mobiel: Instellingen tab opent geen sub-tab standaard  
  - Oplossing: Zet standaard op "Loyaliteit" sub-tab

### 🎨 UI/UX Verbeteringen
- [ ] **Opslaan knop diensten styling** `[ui/ux]` `[admin]`
  - Andere kleur zodat knop zichtbaar is
  - Toon melding wanneer opslaan gelukt is
- [ ] **Barber beschikbaarheid styling** `[ui/ux]` `[admin]`
  - Start en eindtijd invulvelden hebben betere styling nodig
  - Consistent maken met rest van interface

## 🟢 Prioriteit Laag

### ⚙️ Functionaliteit Verbeteringen
- [ ] **Afspraak wijzigen overlap preventie** `[feature]` `[booking]`
  - Bij wijzigen afspraak rekening houden met al geboekte tijden
  - Tijd selectie interface hetzelfde maken als nieuwe afspraak maken
  - Geldt voor: planning, klant info, klant zelf wijzigen

### 🗑️ Cleanup
- [ ] **Dark mode volledig verwijderen** `[cleanup]`
  - Alle dark mode code uit hele software halen
  - CSS, JavaScript en HTML opruimen

## ✅ Afgerond
- [x] Backup gemaakt van werkende staat
- [x] Onnodige bestanden opgeruimd
- [x] TODO management systeem toegevoegd

---

## 📊 Samenvatting
- **Totaal items:** 8
- **Hoog:** 3 items
- **Gemiddeld:** 4 items  
- **Laag:** 1 item

## 🏷️ Tags Legenda
- `bug` - Bugs die gefixed moeten worden
- `feature` - Nieuwe functionaliteit
- `ui/ux` - Interface verbeteringen
- `mobile` - Mobile specifieke issues
- `admin` - Admin panel gerelateerd
- `booking` - Booking systeem gerelateerd
- `cleanup` - Code opruimen/refactoring

---

**Laatste update:** 20 september 2025
