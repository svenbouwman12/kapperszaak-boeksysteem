# 🔐 RLS Policy Fix Guide - Kapper Availability

## 🚨 **PROBLEEM**
403 Forbidden error bij het opslaan van kapper availability:
- **Error:** `new row violates row-level security policy for table "kapper_availability"`
- **Oorzaak:** RLS policy ontbreekt voor INSERT/UPDATE/DELETE operaties
- **Gevolg:** Admin kan geen kapper werktijden opslaan

## ✅ **OPLOSSING**

### **Stap 1: Voer RLS Fix Script Uit**
1. Ga naar **Supabase Dashboard** → SQL Editor
2. Kopieer de inhoud van `fix_rls_policy.sql`
3. Plak en voer uit
4. Controleer of de policy is toegevoegd

### **Stap 2: Verificeer de Fix**
Na het uitvoeren zou je moeten zien:
- ✅ "RLS policy toegevoegd voor kapper_availability tabel"
- ✅ Policy details in de output
- ✅ Geen errors meer bij het opslaan

## 🔧 **WAT ER GEBEURT**

### **Voor de Fix:**
```sql
-- Alleen SELECT policy (lezen)
CREATE POLICY "Enable read access for all users" ON kapper_availability FOR SELECT USING (true);
```

### **Na de Fix:**
```sql
-- SELECT policy (lezen)
CREATE POLICY "Enable read access for all users" ON kapper_availability FOR SELECT USING (true);

-- ALL policy (lezen, schrijven, verwijderen)
CREATE POLICY "Enable all access for all users" ON kapper_availability FOR ALL USING (true);
```

## 🎯 **VERWACHT RESULTAAT**

Na het uitvoeren van de fix:
- ✅ **Geen 403 Forbidden errors** meer
- ✅ **Kapper availability** kan worden opgeslagen
- ✅ **Admin panel** werkt volledig
- ✅ **Alle CRUD operaties** werken (Create, Read, Update, Delete)

## 🔍 **VERIFICATIE**

### **Controleer in Supabase:**
1. **Authentication** → Policies
2. **Zoek naar** `kapper_availability` tabel
3. **Controleer of** beide policies bestaan:
   - "Enable read access for all users" (SELECT)
   - "Enable all access for all users" (ALL)

### **Test in Admin Panel:**
1. **Ga naar admin panel**
2. **Selecteer een kapper**
3. **Stel werktijden in**
4. **Klik "Opslaan"**
5. **Controleer of** geen errors meer optreden

## 🚨 **ALS HET NOG STEEDS NIET WERKT**

### **Mogelijke Oorzaken:**
1. **Script niet uitgevoerd** - Controleer of het script is uitgevoerd
2. **Verkeerde tabel** - Controleer of je in de juiste database zit
3. **Permissions** - Controleer of je admin rechten hebt
4. **Cache** - Refresh de admin panel pagina

### **Debug Stappen:**
1. **Controleer Supabase logs** in het dashboard
2. **Test directe database query** in Supabase
3. **Controleer browser console** voor specifieke errors
4. **Verificeer RLS policies** in Authentication

## 📞 **SUPPORT**

### **Als Je Problemen Hebt:**
1. **Controleer Supabase logs** in het dashboard
2. **Test database queries** direct in Supabase
3. **Controleer RLS policies** in Authentication
4. **Verificeer admin user permissions**

### **Debug Commands:**
```sql
-- Controleer bestaande policies
SELECT * FROM pg_policies WHERE tablename = 'kapper_availability';

-- Test directe insert
INSERT INTO kapper_availability (kapper_id, day_of_week, start_time, end_time) 
VALUES (1, 1, '09:00', '17:00');
```

---

## 🎉 **NA HET UITVOEREN**

**Je kapper availability systeem zou volledig moeten werken:**
- ✅ Geen 403 Forbidden errors
- ✅ Kapper werktijden kunnen worden opgeslagen
- ✅ Admin panel volledig functioneel
- ✅ Alle CRUD operaties werken

**🚀 Ready to use the kapper availability system!**
