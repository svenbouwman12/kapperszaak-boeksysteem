# 📧 E-mail Setup Instructies - Vercel + Gmail SMTP

## 🚀 **Vercel + Gmail SMTP Setup (Aanbevolen)**

### **Voordelen:**
- ✅ **Volledig gratis**
- ✅ **Onbeperkt aantal e-mails**
- ✅ **Betrouwbaar (Google)**
- ✅ **Geen maandelijkse kosten**
- ✅ **Professionele e-mails**

---

## **Stap 1: Gmail App Password Aanmaken**

### 1.1 Google Account Instellingen
1. Ga naar [myaccount.google.com](https://myaccount.google.com)
2. Klik op "Beveiliging" in het linkermenu
3. Scroll naar "2-stapsverificatie" en zet dit AAN (vereist!)

### 1.2 App Password Genereren
1. Ga naar [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Selecteer "Mail" als app
3. Selecteer "Andere" als apparaat
4. Typ "Kapperszaak Boeksysteem" als naam
5. Klik "Genereren"
6. **Kopieer het 16-cijferige wachtwoord** (bijv. `abcd efgh ijkl mnop`)

---

## **Stap 2: Vercel Account Setup**

### 2.1 Vercel Account
1. Ga naar [vercel.com](https://vercel.com)
2. Klik "Sign Up" en maak account aan
3. Verbind je GitHub account (aanbevolen)

### 2.2 Project Deployen
1. Push je code naar GitHub
2. Ga naar [vercel.com/new](https://vercel.com/new)
3. Import je GitHub repository
4. Klik "Deploy"

---

## **Stap 3: Environment Variables Instellen**

### 3.1 Vercel Dashboard
1. Ga naar je project in Vercel dashboard
2. Klik op "Settings" tab
3. Klik op "Environment Variables"

### 3.2 Variables Toevoegen
Voeg deze environment variables toe:

| Name | Value | Description |
|------|-------|-------------|
| `GMAIL_USER` | `jouw-email@gmail.com` | Je Gmail adres |
| `GMAIL_APP_PASSWORD` | `abcd efgh ijkl mnop` | Je App Password |

**Belangrijk:** Zet beide op "Production", "Preview" en "Development"

---

## **Stap 4: Zaakgegevens Aanpassen**

Open `script.js` en pas de `EMAIL_CONFIG` aan:

```javascript
const EMAIL_CONFIG = {
  apiUrl: '/api/send-email',
  salonName: 'Jouw Kapperszaak', // ← Vervang met jouw zaaknaam
  salonPhone: '06-12345678', // ← Vervang met jouw telefoonnummer
  salonAddress: 'Jouw Adres 123, Plaats' // ← Vervang met jouw adres
};
```

---

## **Stap 5: Testen**

### 5.1 Lokale Test
```bash
# Installeer Vercel CLI
npm install -g vercel

# Test lokaal
vercel dev
```

### 5.2 Productie Test
1. Maak een testafspraak aan op je live site
2. Controleer of je de bevestigingsmail ontvangt
3. Check de Vercel logs voor eventuele fouten

---

## **Stap 6: Monitoring**

### 6.1 Vercel Logs
1. Ga naar je project dashboard
2. Klik op "Functions" tab
3. Bekijk logs van `/api/send-email`

### 6.2 Gmail Logs
1. Ga naar [gmail.com](https://gmail.com)
2. Check "Verzonden" folder
3. Controleer of e-mails worden verzonden

---

## **Troubleshooting**

### ❌ **"Authentication failed"**
- Controleer je Gmail App Password
- Zorg dat 2-stapsverificatie AAN staat

### ❌ **"Function not found"**
- Controleer of `api/send-email.js` bestaat
- Herdeploy je project

### ❌ **"Environment variable not found"**
- Controleer je environment variables in Vercel
- Herdeploy na het toevoegen van variables

### ❌ **E-mail komt niet aan**
- Check spam folder
- Controleer Gmail logs
- Test met een ander e-mailadres

---

## **Kosten Overzicht**

| Service | Kosten | Limiet | Backend |
|---------|--------|--------|---------|
| **Gmail SMTP + Vercel** | **Gratis** | **Onbeperkt** | ✅ |
| Resend | Gratis | 3000/maand | ❌ |
| EmailJS | Gratis | 200/maand | ❌ |
| SendGrid | Gratis | 100/dag | ❌ |

---

## **E-mail Template Preview**

Je klanten ontvangen een mooie HTML e-mail met:
- ✂️ Professionele header
- 📅 Afspraakdetails in een mooie box
- 📍 Jouw zaakgegevens
- 📱 Responsive design
- 🎨 Mooie styling

---

## **Support**

Als je problemen hebt:
1. Check de Vercel logs
2. Controleer je environment variables
3. Test lokaal met `vercel dev`
4. Controleer je Gmail App Password
