# 🔐 Admin Setup Guide - Kapperszaak Boeksysteem

## 🚨 **PROBLEEM**
Admin login geeft 404 errors omdat de `admin_users` tabel ontbreekt:
- `admin_users` tabel niet aangemaakt
- Admin gebruikers niet geregistreerd
- RLS policies niet ingesteld

## ✅ **OPLOSSING**

### **Stap 1: Voer Database Script Uit**
1. Ga naar **Supabase Dashboard** → SQL Editor
2. Voer het **bijgewerkte database_setup.sql** script uit
3. Controleer of alle tabellen zijn aangemaakt

### **Stap 2: Admin Gebruikers Toevoegen**
Het script voegt automatisch test admin gebruikers toe:
- **Email:** admin@salon.nl
- **Email:** beheerder@salon.nl

### **Stap 3: Echte Admin Gebruikers Toevoegen**
```sql
-- Vervang de test emails met echte admin emails
UPDATE admin_users 
SET email = 'jouw-email@domein.nl' 
WHERE id = '2b37e357-367b-4c8f-a11a-b26b2544a52f';

-- Of voeg nieuwe admin toe
INSERT INTO admin_users (id, email, role) VALUES
('nieuwe-uuid-hier', 'nieuwe-admin@domein.nl', 'admin');
```

## 🔧 **ADMIN CONFIGURATIE**

### **Admin Gebruikers Beheren**
```sql
-- Alle admin gebruikers bekijken
SELECT * FROM admin_users;

-- Nieuwe admin toevoegen
INSERT INTO admin_users (id, email, role) VALUES
('uuid-hier', 'email@domein.nl', 'admin');

-- Admin verwijderen
DELETE FROM admin_users WHERE email = 'email@domein.nl';
```

### **Admin Toegang Testen**
1. Open `test_database.html`
2. Klik **"Test Alle Tabellen"**
3. Controleer of `admin_users` tabel werkt
4. Controleer of admin records zichtbaar zijn

## 🎯 **VERWACHT RESULTAAT**

Na het uitvoeren van het bijgewerkte script:
- ✅ **admin_users tabel** aangemaakt
- ✅ **RLS policies** ingesteld
- ✅ **Test admin gebruikers** toegevoegd
- ✅ **Admin login** werkt zonder 404 errors
- ✅ **Admin panel** toegankelijk

## 🔍 **VERIFICATIE**

### **Controleer Admin Tabel:**
```sql
-- Controleer admin_users tabel
SELECT * FROM admin_users;

-- Controleer RLS policies
SELECT * FROM pg_policies WHERE tablename = 'admin_users';
```

### **Test Admin Login:**
1. Ga naar `admin-login.html`
2. Probeer in te loggen
3. Controleer browser console (geen 404 errors)
4. Controleer of admin panel toegankelijk is

## 🚨 **TROUBLESHOOTING**

### **Als Admin Login Nog Steeds Niet Werkt:**

#### **1. Controleer Admin Users Tabel**
```sql
-- Controleer of tabel bestaat
SELECT COUNT(*) FROM admin_users;

-- Controleer of admin records bestaan
SELECT * FROM admin_users;
```

#### **2. Controleer RLS Policies**
```sql
-- Controleer RLS policies
SELECT * FROM pg_policies WHERE tablename = 'admin_users';
```

#### **3. Controleer Admin User IDs**
- Controleer of de UUIDs in `admin-login.html` overeenkomen
- Controleer of de admin users correct zijn toegevoegd

#### **4. Test Directe Query**
```sql
-- Test directe query
SELECT * FROM admin_users WHERE id = '2b37e357-367b-4c8f-a11a-b26b2544a52f';
```

## 📞 **SUPPORT**

### **Als Je Problemen Hebt:**
1. **Controleer Supabase logs** in het dashboard
2. **Test database connectie** met `test_database.html`
3. **Controleer RLS policies** in Authentication
4. **Verificeer admin user records**

### **Debug Stappen:**
1. **Controleer browser console** voor specifieke errors
2. **Test database queries** direct in Supabase
3. **Controleer admin user IDs** in de code
4. **Verificeer RLS policies** voor admin_users tabel

---

## 🎉 **NA HET UITVOEREN**

**Je admin systeem zou volledig moeten werken:**
- ✅ Admin login zonder errors
- ✅ Admin panel toegankelijk
- ✅ Admin gebruikers beheer
- ✅ Volledige functionaliteit

**🚀 Ready to use the admin system!**
