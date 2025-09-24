# 🔧 Database Fix Guide - Supabase Setup

## 🚨 **PROBLEEM**
De website toont errors omdat de Supabase database tabellen nog niet bestaan:
- `404 errors` voor alle database queries
- `diensten`, `kappers`, `boekingen` tabellen ontbreken
- `settings` tabel ontbreekt

## ✅ **OPLOSSING**

### **Stap 1: Ga naar Supabase Dashboard**
1. Open https://supabase.com
2. Log in met je account
3. Selecteer je project: `owrojqutbtoifitqijdi`

### **Stap 2: Open SQL Editor**
1. Klik op **"SQL Editor"** in het linker menu
2. Klik op **"New query"**

### **Stap 3: Voer Database Script Uit**
1. Kopieer de volledige inhoud van `database_setup.sql`
2. Plak het in de SQL Editor
3. Klik op **"Run"** om het script uit te voeren

### **Stap 4: Controleer Resultaat**
Na het uitvoeren zou je moeten zien:
- ✅ "Tables created successfully"
- ✅ Kappers count: 3
- ✅ Diensten count: 5
- ✅ Openingstijden count: 7
- ✅ Settings count: 4

## 🎯 **VERWACHT RESULTAAT**

Na het uitvoeren van het script:
- ✅ Alle database tabellen zijn aangemaakt
- ✅ Test data is toegevoegd
- ✅ RLS policies zijn ingesteld
- ✅ Indexes zijn aangemaakt
- ✅ Website werkt zonder errors

## 🔍 **VERIFICATIE**

### **Controleer in Supabase:**
1. **Table Editor** → Bekijk alle tabellen
2. **Authentication** → Controleer RLS policies
3. **API** → Test queries

### **Controleer Website:**
1. Refresh de website
2. Controleer browser console (geen 404 errors)
3. Test het boeken van een afspraak

## 🚨 **ALS HET NOG STEEDS NIET WERKT**

### **Mogelijke Oorzaken:**
1. **Verkeerde project** - Controleer of je in het juiste Supabase project zit
2. **Permissions** - Controleer of je admin rechten hebt
3. **RLS policies** - Controleer of RLS correct is ingesteld
4. **API keys** - Controleer of de API keys correct zijn

### **Debug Stappen:**
1. **Controleer Supabase URL** in `index.html`
2. **Controleer API key** in `index.html`
3. **Test directe database query** in Supabase
4. **Controleer browser console** voor specifieke errors

## 📞 **SUPPORT**

Als je problemen hebt:
1. **Controleer Supabase logs** in het dashboard
2. **Test API endpoints** direct in Supabase
3. **Controleer RLS policies** in Authentication
4. **Verificeer database permissions**

---

**🎉 Na het uitvoeren van dit script zou je website volledig moeten werken!**
