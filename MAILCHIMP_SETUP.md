# Mailchimp Setup Instructies

## Waarom Mailchimp?
- ✅ **Gratis** - 500 contacts en 1,000 emails per maand gratis
- ✅ **Betrouwbaar** - gebruikt door miljoenen bedrijven
- ✅ **Geen serverless functies** - werkt direct vanuit de frontend
- ✅ **Professional** - mooie email templates en analytics

## Stap 1: Account aanmaken
1. Ga naar [mailchimp.com](https://www.mailchimp.com)
2. Maak een gratis account aan
3. Verifieer je email adres

## Stap 2: API Key ophalen
1. Ga naar **Account** → **Extras** → **API keys**
2. Klik **Create A Key**
3. Geef je key een naam (bijv. "Kapperszaak Website")
4. Kopieer je **API Key** (bijv. `abc123def456-us1`)
5. Noteer je **Server Prefix** (het deel na de `-`, bijv. `us1`)

## Stap 3: Code aanpassen
Open `script.js` en vervang deze regels:

```javascript
const EMAIL_CONFIG = {
  apiKey: 'your_mailchimp_api_key_here', // ← Vervang met jouw API key
  serverPrefix: 'us1', // ← Vervang met jouw server prefix
  salonName: 'Barbershop Delfzijl',
  salonPhone: '06-12345678',
  salonAddress: 'Jouw Adres 123, Plaats'
};
```

## Stap 4: Testen
1. Maak een test afspraak
2. Controleer of je een email ontvangt
3. Check de browser console voor eventuele errors

## Troubleshooting
- **"Mailchimp not configured"** → Controleer of je de API key correct hebt ingevuld
- **CORS error** → Mailchimp API werkt niet direct vanuit de browser (zie oplossing hieronder)
- **Geen email ontvangen** → Controleer je spam folder

## ⚠️ Belangrijk: CORS Probleem
Mailchimp API heeft CORS restricties en werkt niet direct vanuit de browser. Je hebt 2 opties:

### Optie 1: Vercel Serverless Function (Aanbevolen)
Ik kan een Vercel serverless functie maken die Mailchimp aanroept.

### Optie 2: EmailJS (Eenvoudiger)
EmailJS werkt wel direct vanuit de browser en is makkelijker te configureren.

## Voordelen van Mailchimp
- 500 gratis contacts
- 1,000 gratis emails per maand
- Professional email templates
- Uitgebreide analytics
- Automatische email sequences

## Nadelen van Mailchimp
- CORS restricties (niet direct vanuit browser)
- Complexere setup dan EmailJS
- Meer gericht op marketing dan transactional emails

## Aanbeveling
Voor jouw kapperszaak zou ik **EmailJS** aanraden omdat:
- Werkt direct vanuit de browser
- Simpelere setup
- Perfect voor transactional emails
- Geen CORS problemen

Wil je dat ik terugschakel naar EmailJS?
