# EmailJS Setup Instructies

## Waarom EmailJS?
- ✅ **Gratis** - 200 emails per maand gratis
- ✅ **Simpel** - werkt direct vanuit de frontend
- ✅ **Betrouwbaar** - geen serverless functies nodig
- ✅ **Geen authenticatie problemen** - zoals bij Gmail SMTP

## Stap 1: Account aanmaken
1. Ga naar [emailjs.com](https://www.emailjs.com)
2. Maak een gratis account aan
3. Verifieer je email adres

## Stap 2: Email Service instellen
1. Ga naar **Email Services** in je dashboard
2. Klik **Add New Service**
3. Kies **Gmail** (of je eigen email provider)
4. Volg de instructies om Gmail te koppelen
5. Noteer je **Service ID** (bijv. `service_abc123`)

## Stap 3: Email Template maken
1. Ga naar **Email Templates** in je dashboard
2. Klik **Create New Template**
3. Gebruik deze template:

**Subject:** Bevestiging afspraak bij {{salon_name}}

**Content:**
```
Beste {{to_name}},

Bedankt voor je afspraak bij {{salon_name}}!

📅 Afspraak Details:
- Datum: {{appointment_date}}
- Tijd: {{appointment_time}} - {{appointment_end_time}}
- Dienst: {{service_name}}
- Kapper: {{kapper_name}}

📍 Onze gegevens:
{{salon_name}}
{{salon_address}}
{{salon_phone}}

We kijken uit naar je bezoek!

Met vriendelijke groet,
Het team van {{salon_name}}
```

4. Noteer je **Template ID** (bijv. `template_xyz789`)

## Stap 4: Public Key ophalen
1. Ga naar **Account** in je dashboard
2. Kopieer je **Public Key** (bijv. `abc123def456`)

## Stap 5: Code aanpassen
Open `script.js` en vervang deze regels:

```javascript
const EMAIL_CONFIG = {
  serviceId: 'service_1234567', // ← Vervang met jouw Service ID
  templateId: 'template_1234567', // ← Vervang met jouw Template ID
  publicKey: 'your_public_key_here', // ← Vervang met jouw Public Key
  salonName: 'Barbershop Delfzijl',
  salonPhone: '06-12345678',
  salonAddress: 'Jouw Adres 123, Plaats'
};
```

## Stap 6: Testen
1. Maak een test afspraak
2. Controleer of je een email ontvangt
3. Check de browser console voor eventuele errors

## Troubleshooting
- **"EmailJS not configured"** → Controleer of je de keys correct hebt ingevuld
- **"EmailJS not loaded"** → Controleer of de EmailJS SDK correct geladen wordt
- **Geen email ontvangen** → Controleer je spam folder en EmailJS dashboard

## Voordelen van EmailJS
- Geen serverless functies nodig
- Geen Gmail App Password problemen
- Werkt direct vanuit de browser
- 200 gratis emails per maand
- Makkelijk te configureren
