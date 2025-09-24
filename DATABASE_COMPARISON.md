# 🔍 Database Structuur Vergelijking

## 📊 **ANALYSE VAN DAADWERKELIJKE GEBRUIK**

Na analyse van de volledige codebase zijn dit de **daadwerkelijk gebruikte** tabellen en kolommen:

### ✅ **GEBRUIKTE TABELLEN**

#### 1. **kappers** tabel
**Gebruikte kolommen:**
- `id` (SERIAL PRIMARY KEY)
- `naam` (VARCHAR) - gebruikt in alle queries
- `created_at` (TIMESTAMP)

**Niet gebruikt:**
- ~~`specialiteiten`~~ (TEXT[]) - niet gebruikt in code
- ~~`beschikbaarheid`~~ (JSONB) - niet gebruikt in code

#### 2. **diensten** tabel  
**Gebruikte kolommen:**
- `id` (SERIAL PRIMARY KEY)
- `naam` (VARCHAR) - gebruikt in admin panel
- `prijs_euro` (DECIMAL) - gebruikt voor prijsberekening
- `duur_minuten` (INTEGER) - gebruikt voor tijdsplanning
- `created_at` (TIMESTAMP)

**Niet gebruikt:**
- ~~`beschrijving`~~ (TEXT) - niet gebruikt in code

#### 3. **boekingen** tabel
**Gebruikte kolommen:**
- `id` (SERIAL PRIMARY KEY)
- `klantnaam` (VARCHAR) - gebruikt in alle queries
- `email` (VARCHAR) - gebruikt voor notificaties
- `telefoon` (VARCHAR) - gebruikt in admin panel
- `kapper_id` (INTEGER) - foreign key naar kappers
- `dienst_id` (INTEGER) - foreign key naar diensten
- `datumtijd` (TIMESTAMP) - hoofdkolom voor planning
- `begin_tijd` (TIME) - gebruikt voor tijdsplanning
- `eind_tijd` (TIME) - gebruikt voor tijdsplanning
- `status` (VARCHAR) - gebruikt voor status tracking
- `opmerkingen` (TEXT) - gebruikt in admin panel
- `created_at` (TIMESTAMP)

**Niet gebruikt:**
- ~~`klant_naam`~~ (VARCHAR) - verkeerde naam, moet `klantnaam` zijn
- ~~`klant_email`~~ (VARCHAR) - verkeerde naam, moet `email` zijn
- ~~`klant_telefoon`~~ (VARCHAR) - verkeerde naam, moet `telefoon` zijn
- ~~`datum`~~ (DATE) - niet gebruikt, `datumtijd` wordt gebruikt
- ~~`start_tijd`~~ (TIME) - verkeerde naam, moet `begin_tijd` zijn

#### 4. **kapper_availability** tabel (NIEUW!)
**Gebruikte kolommen:**
- `id` (SERIAL PRIMARY KEY)
- `kapper_id` (INTEGER) - foreign key naar kappers
- `day_of_week` (INTEGER) - 0=zondag, 1=maandag, etc.
- `start_time` (TIME) - starttijd per dag
- `end_time` (TIME) - eindtijd per dag
- `created_at` (TIMESTAMP)

**Vervangt:**
- ~~`openingstijden`~~ tabel - niet gebruikt in code

#### 5. **admin_users** tabel
**Gebruikte kolommen:**
- `id` (UUID PRIMARY KEY) - moet UUID zijn voor Supabase auth
- `email` (VARCHAR) - gebruikt voor admin login
- `role` (VARCHAR) - gebruikt voor admin rechten
- `created_at` (TIMESTAMP)

#### 6. **settings** tabel
**Gebruikte kolommen:**
- `key` (VARCHAR) - gebruikt voor loyalty settings
- `value` (TEXT) - gebruikt voor loyalty settings
- `created_at` (TIMESTAMP)

#### 7. **customers** tabel (NIEUW!)
**Gebruikte kolommen:**
- `id` (SERIAL PRIMARY KEY)
- `naam` (VARCHAR) - gebruikt in admin panel
- `email` (VARCHAR) - gebruikt voor klantbeheer
- `telefoon` (VARCHAR) - gebruikt in admin panel
- `loyaliteitspunten` (INTEGER) - gebruikt voor loyalty systeem
- `created_at` (TIMESTAMP)

#### 8. **customer_notes** tabel (NIEUW!)
**Gebruikte kolommen:**
- `id` (SERIAL PRIMARY KEY)
- `customer_id` (INTEGER) - foreign key naar customers
- `note` (TEXT) - gebruikt voor klantnotities
- `created_at` (TIMESTAMP)

## 🔄 **BELANGRIJKE WIJZIGINGEN**

### **Verwijderde Tabellen:**
- ❌ `openingstijden` - vervangen door `kapper_availability`
- ❌ Ongebruikte kolommen in bestaande tabellen

### **Toegevoegde Tabellen:**
- ✅ `kapper_availability` - voor kapper werktijden
- ✅ `customers` - voor klantbeheer
- ✅ `customer_notes` - voor klantnotities

### **Gecorrigeerde Kolomnamen:**
- ✅ `klantnaam` (was `klant_naam`)
- ✅ `email` (was `klant_email`)
- ✅ `telefoon` (was `klant_telefoon`)
- ✅ `datumtijd` (was `datum`)
- ✅ `begin_tijd` (was `start_tijd`)
- ✅ `prijs_euro` (was `prijs`)

## 🎯 **VOORDELEN VAN NIEUWE STRUCTUUR**

### **1. Accuraat**
- Alleen kolommen die daadwerkelijk gebruikt worden
- Correcte kolomnamen die overeenkomen met de code
- Geen ongebruikte kolommen die verwarring veroorzaken

### **2. Compleet**
- Alle functionaliteiten ondersteund
- Kapper availability systeem
- Klantbeheer systeem
- Loyalty systeem

### **3. Efficiënt**
- Geoptimaliseerde indexes
- Correcte data types
- Geen overbodige kolommen

### **4. Schaalbaar**
- Klaar voor toekomstige uitbreidingen
- Modulaire structuur
- Flexibele kapper planning

## 🚀 **IMPLEMENTATIE**

**Gebruik `database_setup_complete.sql` voor:**
- ✅ Nieuwe installaties
- ✅ Bestaande databases updaten
- ✅ Alle functionaliteiten ondersteunen
- ✅ Geen errors bij uitvoering

**Dit script is gebaseerd op de daadwerkelijke code en ondersteunt alle functionaliteiten van het kapperszaak boeksysteem!**
