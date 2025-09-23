# Technical Setup Guide - Kapperszaak Boeksysteem

## 🛠️ Complete Technische Setup voor Nieuwe Klant

### 📋 PREREQUISITES
- Vercel account (Pro plan aanbevolen)
- Supabase account
- EmailJS account
- Domain name (optioneel)

---

## 🗄️ STAP 1: SUPABASE SETUP

### 1.1 Nieuwe Database Aanmaken
```bash
# 1. Ga naar https://supabase.com
# 2. Klik "New Project"
# 3. Vul project details in:
#    - Name: [Salon Naam] Boeksysteem
#    - Database Password: [Sterk wachtwoord]
#    - Region: Europe West (Amsterdam)
```

### 1.2 Database Schema Importeren
```sql
-- Kopieer en plak dit in de SQL Editor:

-- Kappers tabel
CREATE TABLE kappers (
  id SERIAL PRIMARY KEY,
  naam VARCHAR(100) NOT NULL,
  specialiteiten TEXT[],
  beschikbaarheid JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Diensten tabel
CREATE TABLE diensten (
  id SERIAL PRIMARY KEY,
  naam VARCHAR(100) NOT NULL,
  prijs DECIMAL(10,2) NOT NULL,
  duur_minuten INTEGER NOT NULL,
  beschrijving TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Afspraken tabel
CREATE TABLE afspraken (
  id SERIAL PRIMARY KEY,
  klant_naam VARCHAR(100) NOT NULL,
  klant_email VARCHAR(100),
  klant_telefoon VARCHAR(20),
  kapper_id INTEGER REFERENCES kappers(id),
  dienst_id INTEGER REFERENCES diensten(id),
  datum DATE NOT NULL,
  start_tijd TIME NOT NULL,
  eind_tijd TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'bevestigd',
  opmerkingen TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Openingstijden tabel
CREATE TABLE openingstijden (
  id SERIAL PRIMARY KEY,
  dag_van_week INTEGER NOT NULL, -- 0=zondag, 1=maandag, etc.
  open_tijd TIME,
  sluit_tijd TIME,
  gesloten BOOLEAN DEFAULT FALSE
);

-- RLS (Row Level Security) inschakelen
ALTER TABLE kappers ENABLE ROW LEVEL SECURITY;
ALTER TABLE diensten ENABLE ROW LEVEL SECURITY;
ALTER TABLE afspraken ENABLE ROW LEVEL SECURITY;
ALTER TABLE openingstijden ENABLE ROW LEVEL SECURITY;

-- Policies voor publieke toegang (alleen lezen)
CREATE POLICY "Enable read access for all users" ON kappers FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON diensten FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON openingstijden FOR SELECT USING (true);

-- Policy voor afspraken (lezen en schrijven)
CREATE POLICY "Enable all access for all users" ON afspraken FOR ALL USING (true);
```

### 1.3 Test Data Toevoegen
```sql
-- Kappers toevoegen
INSERT INTO kappers (naam, specialiteiten) VALUES
('Jan de Kapper', ARRAY['Knippen', 'Wassen', 'Styling']),
('Marie van der Berg', ARRAY['Knippen', 'Kleuren', 'Highlights']),
('Piet van Dijk', ARRAY['Baard trimmen', 'Knippen', 'Styling']);

-- Diensten toevoegen
INSERT INTO diensten (naam, prijs, duur_minuten, beschrijving) VALUES
('Knippen en wassen', 25.00, 30, 'Basis knipbeurt met wassen'),
('Knippen, wassen en föhnen', 35.00, 45, 'Complete behandeling'),
('Kleuren', 45.00, 60, 'Haar kleuren'),
('Highlights', 65.00, 90, 'Highlights aanbrengen'),
('Baard trimmen', 15.00, 20, 'Baard bijwerken');

-- Openingstijden toevoegen
INSERT INTO openingstijden (dag_van_week, open_tijd, sluit_tijd, gesloten) VALUES
(0, NULL, NULL, TRUE),  -- Zondag gesloten
(1, '09:00', '18:00', FALSE),  -- Maandag
(2, '09:00', '18:00', FALSE),  -- Dinsdag
(3, '09:00', '18:00', FALSE),  -- Woensdag
(4, '09:00', '18:00', FALSE),  -- Donderdag
(5, '09:00', '18:00', FALSE),  -- Vrijdag
(6, '09:00', '17:00', FALSE);  -- Zaterdag
```

### 1.4 API Keys Ophalen
```bash
# 1. Ga naar Settings > API
# 2. Kopieer:
#    - Project URL
#    - anon/public key
# 3. Noteer deze voor later gebruik
```

---

## 🌐 STAP 2: VERCEL DEPLOYMENT

### 2.1 Repository Voorbereiden
```bash
# 1. Clone template repository
git clone https://github.com/svenbouwman12/kapperszaak-boeksysteem.git
cd kapperszaak-boeksysteem

# 2. Verwijder .git en maak nieuwe
rm -rf .git
git init
git add .
git commit -m "Initial commit for [Salon Naam]"

# 3. Maak nieuwe GitHub repository
# 4. Push naar GitHub
git remote add origin https://github.com/[username]/[salon-naam]-boeksysteem.git
git push -u origin main
```

### 2.2 Vercel Project Aanmaken
```bash
# 1. Ga naar https://vercel.com
# 2. Klik "New Project"
# 3. Import GitHub repository
# 4. Configureer:
#    - Framework Preset: Other
#    - Build Command: (leeg)
#    - Output Directory: .
#    - Install Command: (leeg)
```

### 2.3 Environment Variables
```bash
# In Vercel Dashboard > Settings > Environment Variables:
SUPABASE_URL=[jouw_supabase_url]
SUPABASE_ANON_KEY=[jouw_supabase_anon_key]
```

---

## 📧 STAP 3: EMAILJS SETUP

### 3.1 Account Aanmaken
```bash
# 1. Ga naar https://emailjs.com
# 2. Maak gratis account aan
# 3. Verifieer email adres
```

### 3.2 Email Service Configureren
```bash
# 1. Ga naar Email Services
# 2. Klik "Add New Service"
# 3. Kies "Gmail" (of andere provider)
# 4. Volg setup instructies
# 5. Noteer Service ID
```

### 3.3 Email Template Maken
```bash
# 1. Ga naar Email Templates
# 2. Klik "Create New Template"
# 3. Kopieer HTML uit email-template.html
# 4. Pas aan voor salon
# 5. Noteer Template ID
```

### 3.4 Public Key Ophalen
```bash
# 1. Ga naar Account
# 2. Kopieer Public Key
# 3. Noteer voor later gebruik
```

---

## ⚙️ STAP 4: CODE AANPASSEN

### 4.1 Supabase Configuratie
```javascript
// In script.js, vervang:
const SUPABASE_URL = 'https://jouw-project.supabase.co';
const SUPABASE_ANON_KEY = 'jouw-anon-key';
```

### 4.2 Salon Gegevens
```javascript
// In script.js, vervang:
const EMAIL_CONFIG = {
  serviceId: 'service_xxxxx',
  templateId: 'template_xxxxx', 
  publicKey: 'jouw-public-key',
  salonName: '[Salon Naam]',
  salonPhone: '[Telefoon]',
  salonAddress: '[Adres]'
};
```

### 4.3 HTML Aanpassingen
```html
<!-- In index.html, vervang: -->
<title>[Salon Naam] - Boek Online</title>
<h1>[Salon Naam]</h1>
```

---

## 🚀 STAP 5: DEPLOYMENT

### 5.1 Vercel Deploy
```bash
# 1. Push code naar GitHub
git add .
git commit -m "Configure for [Salon Naam]"
git push origin main

# 2. Vercel deployt automatisch
# 3. Controleer deployment status
```

### 5.2 Custom Domain (Optioneel)
```bash
# 1. Koop domain bij provider
# 2. Ga naar Vercel > Domains
# 3. Voeg domain toe
# 4. Configureer DNS records
```

---

## 🧪 STAP 6: TESTING

### 6.1 Functionaliteit Testen
```bash
# Test deze functies:
- [ ] Afspraak maken
- [ ] Email notificatie ontvangen
- [ ] Admin panel (wijzig-afspraak.html)
- [ ] Mobile responsiveness
- [ ] Database connectie
```

### 6.2 Email Testing
```bash
# Test email:
- [ ] Bevestiging ontvangen
- [ ] Template correct weergegeven
- [ ] Alle variabelen ingevuld
- [ ] Mobile email client
```

---

## 📊 STAP 7: MONITORING

### 7.1 Vercel Analytics
```bash
# 1. Ga naar Vercel > Analytics
# 2. Schakel analytics in
# 3. Monitor performance
```

### 7.2 Supabase Monitoring
```bash
# 1. Ga naar Supabase > Logs
# 2. Monitor database queries
# 3. Check error logs
```

---

## 🔧 STAP 8: ONDERHOUD

### 8.1 Backups
```bash
# Maandelijkse taken:
- [ ] Database backup exporteren
- [ ] Code backup maken
- [ ] Email templates backup
```

### 8.2 Updates
```bash
# Wanneer nodig:
- [ ] Supabase updates
- [ ] Vercel updates  
- [ ] EmailJS updates
- [ ] Code updates
```

---

## 📞 SUPPORT

### 8.1 Klant Support
```bash
# Voorbereiden:
- [ ] Help documentatie
- [ ] Video tutorials
- [ ] FAQ lijst
- [ ] Contact informatie
```

### 8.2 Technische Support
```bash
# Tools:
- [ ] Error logging
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Backup verificatie
```

---

## ✅ COMPLETION CHECKLIST

### Pre-Launch
- [ ] Supabase database werkend
- [ ] Vercel deployment succesvol
- [ ] EmailJS geconfigureerd
- [ ] Alle tests geslaagd
- [ ] Custom domain werkend
- [ ] Mobile responsive
- [ ] Email notificaties werkend

### Post-Launch
- [ ] Klant training gegeven
- [ ] Support contact opgezet
- [ ] Monitoring actief
- [ ] Backup procedures actief
- [ ] Performance geoptimaliseerd

---

## 🚨 TROUBLESHOOTING

### Veelvoorkomende Problemen

#### Supabase Connectie
```bash
# Probleem: Database niet bereikbaar
# Oplossing: Check URL en API key
# Controleer: RLS policies
```

#### Email Niet Aankomen
```bash
# Probleem: Geen email ontvangen
# Oplossing: Check EmailJS configuratie
# Controleer: Spam folder
```

#### Vercel Deployment Fout
```bash
# Probleem: Build failed
# Oplossing: Check environment variables
# Controleer: Build logs
```

---

## 📈 PERFORMANCE OPTIMALISATIE

### Database
```sql
-- Indexes toevoegen voor betere performance
CREATE INDEX idx_afspraken_datum ON afspraken(datum);
CREATE INDEX idx_afspraken_kapper ON afspraken(kapper_id);
```

### Caching
```javascript
// Browser caching instellen
// Service worker implementeren
// CDN gebruiken voor statische assets
```

---

**🎉 Gefeliciteerd! Je kapperszaak boeksysteem is nu volledig operationeel!**
