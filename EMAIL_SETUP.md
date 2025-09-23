# 📧 E-mail Setup Instructies

## EmailJS Setup (Aanbevolen - Gratis)

### Stap 1: Account Aanmaken
1. Ga naar [emailjs.com](https://www.emailjs.com)
2. Klik op "Sign Up" en maak een gratis account aan
3. Je krijgt 200 e-mails per maand gratis

### Stap 2: E-mail Service Verbinden
1. Ga naar "Email Services" in je dashboard
2. Klik op "Add New Service"
3. Kies je e-mail provider (Gmail, Outlook, etc.)
4. Volg de instructies om je e-mail account te verbinden
5. **Noteer je Service ID** (bijv. `service_abc123`)

### Stap 3: E-mail Template Maken
1. Ga naar "Email Templates" in je dashboard
2. Klik op "Create New Template"
3. Gebruik deze template:

**Onderwerp:** Bevestiging afspraak bij {{salon_name}}

**Inhoud:**
```
Beste {{to_name}},

Bedankt voor je afspraak bij {{salon_name}}!

📅 **Afspraak Details:**
• Datum: {{appointment_date}}
• Tijd: {{appointment_time}} - {{appointment_end_time}}
• Dienst: {{service_name}}
• Kapper: {{kapper_name}}

📍 **Onze gegevens:**
{{salon_name}}
{{salon_address}}
Tel: {{salon_phone}}

We kijken uit naar je bezoek!

Met vriendelijke groet,
Het team van {{salon_name}}
```

4. **Noteer je Template ID** (bijv. `template_xyz789`)

### Stap 4: Public Key Ophalen
1. Ga naar "Account" → "General"
2. **Noteer je Public Key** (bijv. `user_abc123def456`)

### Stap 5: Code Configureren
Open `script.js` en vervang de waarden in de `EMAILJS_CONFIG`:

```javascript
const EMAILJS_CONFIG = {
  serviceId: 'service_abc123', // Jouw Service ID
  templateId: 'template_xyz789', // Jouw Template ID  
  publicKey: 'user_abc123def456' // Jouw Public Key
};
```

### Stap 6: Zaakgegevens Aanpassen
In de `sendBookingConfirmationEmail` functie, vervang:
- `'Jouw Kapperszaak'` → Jouw echte zaaknaam
- `'06-12345678'` → Jouw telefoonnummer
- `'Jouw Adres 123, Plaats'` → Jouw adres

## Alternatieve Gratis Opties

### 1. Resend (3000 e-mails/maand)
- Ga naar [resend.com](https://resend.com)
- Maak account aan
- Vervang EmailJS code met Resend API

### 2. SendGrid (100 e-mails/dag)
- Ga naar [sendgrid.com](https://sendgrid.com)
- Maak account aan
- Vervang EmailJS code met SendGrid API

### 3. Gmail SMTP (Onbeperkt)
- Maak App Password aan in Gmail
- Gebruik Nodemailer library
- Vereist backend server

## Testen
1. Maak een testafspraak aan
2. Controleer of je de bevestigingsmail ontvangt
3. Check de browser console voor eventuele fouten

## Troubleshooting
- **E-mail komt niet aan:** Check spam folder
- **"EmailJS not configured":** Controleer je configuratie
- **"No email provided":** Klant heeft geen e-mail ingevuld
- **Console errors:** Check je Service ID, Template ID en Public Key

## Kosten
- **EmailJS:** 200 e-mails/maand gratis, daarna $15/maand
- **Resend:** 3000 e-mails/maand gratis, daarna $20/maand  
- **SendGrid:** 100 e-mails/dag gratis, daarna $15/maand
- **Gmail SMTP:** Volledig gratis (onbeperkt)
