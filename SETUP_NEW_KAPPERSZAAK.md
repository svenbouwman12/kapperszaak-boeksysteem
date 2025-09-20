# Nieuwe Kapperszaak Setup - Stap voor Stap

## 🚀 Quick Setup (5 minuten)

### Stap 1: Repository Clonen
```bash
# Template repository clonen
git clone https://github.com/svenbouwman12/kapperszaak-boeksysteem.git kapperszaak-[NAAM]-boeksysteem
cd kapperszaak-[NAAM]-boeksysteem
```

### Stap 2: GitHub Repository Maken
- Ga naar GitHub
- Klik "New Repository"
- Naam: `kapperszaak-[NAAM]-boeksysteem`
- Maak repository aan
- Push code:
```bash
git remote set-url origin git@github.com/svenbouwman12/kapperszaak-[NAAM]-boeksysteem.git
git push -u origin main
```

### Stap 3: Supabase Database
- Ga naar Supabase.com
- Klik "New Project"
- Naam: `kapperszaak-[NAAM]-db`
- Maak project aan
- Kopieer URL en anon key

### Stap 4: Supabase Configuratie
- Ga naar Supabase SQL Editor
- Voer `export_database.sql` uit
- Database is volledig geconfigureerd!

### Stap 5: Vercel Deployment
- Ga naar Vercel.com
- "Import Git Repository"
- Selecteer: `kapperszaak-[NAAM]-boeksysteem`
- Environment variables:
  - `SUPABASE_URL`: [jouw supabase url]
  - `SUPABASE_ANON_KEY`: [jouw supabase key]
- Deploy

### Stap 6: Domain Setup (optioneel)
- Custom domain toevoegen in Vercel
- DNS records instellen

## 🔧 Customization

### Styling Aanpassen
- `style.css` - kleuren en fonts
- `admin.html` - admin panel styling
- `index.html` - hoofdpagina styling

### Content Aanpassen
- Site naam in admin instellingen
- Contact informatie
- Openingstijden
- Services

## 📋 Checklist
- [ ] Repository gemaakt
- [ ] Code gepusht
- [ ] Supabase project aangemaakt
- [ ] Database geconfigureerd
- [ ] Vercel deployment live
- [ ] Environment variables ingesteld
- [ ] Test login werkt
- [ ] Custom domain (optioneel)

## 💰 Kosten Per Kapperszaak
- **Vercel:** Gratis (Pro: $20/maand)
- **Supabase:** Gratis (Pro: $25/maand)
- **Domain:** ~€10/jaar
- **Totaal:** €0-55/maand per zaak

## 🎯 Template Variabelen
Vervang `[NAAM]` met de naam van de kapperszaak:
- Repository: `kapperszaak-[NAAM]-boeksysteem`
- Supabase: `kapperszaak-[NAAM]-db`
- Vercel: `kapperszaak-[NAAM].vercel.app`
- Domain: `[NAAM]-kapper.nl` of `[NAAM].kappersysteem.nl`
