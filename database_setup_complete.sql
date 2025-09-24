-- Complete Database Setup voor Kapperszaak Boeksysteem
-- Gebaseerd op daadwerkelijke gebruikte kolommen in de code

-- ===========================================
-- 1. KAPPERS TABEL
-- ===========================================
CREATE TABLE IF NOT EXISTS kappers (
  id SERIAL PRIMARY KEY,
  naam VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 2. DIENSTEN TABEL  
-- ===========================================
CREATE TABLE IF NOT EXISTS diensten (
  id SERIAL PRIMARY KEY,
  naam VARCHAR(100) NOT NULL,
  prijs_euro DECIMAL(10,2) NOT NULL,
  duur_minuten INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 3. BOEKINGEN TABEL
-- ===========================================
CREATE TABLE IF NOT EXISTS boekingen (
  id SERIAL PRIMARY KEY,
  klantnaam VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  telefoon VARCHAR(20),
  kapper_id INTEGER REFERENCES kappers(id),
  dienst_id INTEGER REFERENCES diensten(id),
  datumtijd TIMESTAMP NOT NULL,
  begin_tijd TIME,
  eind_tijd TIME,
  status VARCHAR(20) DEFAULT 'bevestigd',
  opmerkingen TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 4. KAPPER_AVAILABILITY TABEL
-- ===========================================
CREATE TABLE IF NOT EXISTS kapper_availability (
  id SERIAL PRIMARY KEY,
  kapper_id INTEGER REFERENCES kappers(id),
  day_of_week INTEGER NOT NULL, -- 0=zondag, 1=maandag, etc.
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 5. ADMIN_USERS TABEL
-- ===========================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 6. SETTINGS TABEL
-- ===========================================
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 7. CUSTOMERS TABEL (voor klantbeheer)
-- ===========================================
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  naam VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  telefoon VARCHAR(20),
  loyaliteitspunten INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 8. CUSTOMER_NOTES TABEL (voor klantnotities)
-- ===========================================
CREATE TABLE IF NOT EXISTS customer_notes (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  note TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- RLS (Row Level Security) INSCHAKELEN
-- ===========================================
ALTER TABLE kappers ENABLE ROW LEVEL SECURITY;
ALTER TABLE diensten ENABLE ROW LEVEL SECURITY;
ALTER TABLE boekingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE kapper_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS POLICIES AANMAKEN (alleen als ze niet bestaan)
-- ===========================================
DO $$ 
BEGIN
    -- Policies voor publieke toegang (alleen lezen)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kappers' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON kappers FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diensten' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON diensten FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kapper_availability' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON kapper_availability FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kapper_availability' AND policyname = 'Enable all access for all users') THEN
        CREATE POLICY "Enable all access for all users" ON kapper_availability FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON settings FOR SELECT USING (true);
    END IF;
    
    -- Policies voor boekingen (lezen en schrijven)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boekingen' AND policyname = 'Enable all access for all users') THEN
        CREATE POLICY "Enable all access for all users" ON boekingen FOR ALL USING (true);
    END IF;
    
    -- Policies voor admin_users (alleen admin toegang)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'Enable admin access for admin users') THEN
        CREATE POLICY "Enable admin access for admin users" ON admin_users FOR ALL USING (true);
    END IF;
    
    -- Policies voor customers (alleen admin toegang)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Enable admin access for customers') THEN
        CREATE POLICY "Enable admin access for customers" ON customers FOR ALL USING (true);
    END IF;
    
    -- Policies voor customer_notes (alleen admin toegang)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_notes' AND policyname = 'Enable admin access for customer notes') THEN
        CREATE POLICY "Enable admin access for customer notes" ON customer_notes FOR ALL USING (true);
    END IF;
END $$;

-- ===========================================
-- TEST DATA TOEVOEGEN (alleen als ze nog niet bestaan)
-- ===========================================

-- Kappers toevoegen
INSERT INTO kappers (naam) 
SELECT * FROM (VALUES
('Jan de Kapper'),
('Marie van der Berg'),
('Piet van Dijk')
) AS v(naam)
WHERE NOT EXISTS (SELECT 1 FROM kappers WHERE naam = v.naam);

-- Diensten toevoegen
INSERT INTO diensten (naam, prijs_euro, duur_minuten) 
SELECT * FROM (VALUES
('Knippen en wassen', 25.00::DECIMAL, 30),
('Knippen, wassen en föhnen', 35.00::DECIMAL, 45),
('Kleuren', 45.00::DECIMAL, 60),
('Highlights', 65.00::DECIMAL, 90),
('Baard trimmen', 15.00::DECIMAL, 20)
) AS v(naam, prijs_euro, duur_minuten)
WHERE NOT EXISTS (SELECT 1 FROM diensten WHERE naam = v.naam);

-- Kapper availability toevoegen (standaard werktijden)
INSERT INTO kapper_availability (kapper_id, day_of_week, start_time, end_time) 
SELECT * FROM (VALUES
(1, 1, '09:00'::TIME, '18:00'::TIME),  -- Jan - Maandag
(1, 2, '09:00'::TIME, '18:00'::TIME),  -- Jan - Dinsdag
(1, 3, '09:00'::TIME, '18:00'::TIME),  -- Jan - Woensdag
(1, 4, '09:00'::TIME, '18:00'::TIME),  -- Jan - Donderdag
(1, 5, '09:00'::TIME, '18:00'::TIME),  -- Jan - Vrijdag
(1, 6, '09:00'::TIME, '17:00'::TIME),  -- Jan - Zaterdag
(2, 1, '09:00'::TIME, '18:00'::TIME),  -- Marie - Maandag
(2, 2, '09:00'::TIME, '18:00'::TIME),  -- Marie - Dinsdag
(2, 3, '09:00'::TIME, '18:00'::TIME),  -- Marie - Woensdag
(2, 4, '09:00'::TIME, '18:00'::TIME),  -- Marie - Donderdag
(2, 5, '09:00'::TIME, '18:00'::TIME),  -- Marie - Vrijdag
(2, 6, '09:00'::TIME, '17:00'::TIME),  -- Marie - Zaterdag
(3, 1, '09:00'::TIME, '18:00'::TIME),  -- Piet - Maandag
(3, 2, '09:00'::TIME, '18:00'::TIME),  -- Piet - Dinsdag
(3, 3, '09:00'::TIME, '18:00'::TIME),  -- Piet - Woensdag
(3, 4, '09:00'::TIME, '18:00'::TIME),  -- Piet - Donderdag
(3, 5, '09:00'::TIME, '18:00'::TIME),  -- Piet - Vrijdag
(3, 6, '09:00'::TIME, '17:00'::TIME)   -- Piet - Zaterdag
) AS v(kapper_id, day_of_week, start_time, end_time)
WHERE NOT EXISTS (SELECT 1 FROM kapper_availability WHERE kapper_id = v.kapper_id AND day_of_week = v.day_of_week);

-- Settings voor loyalty systeem
INSERT INTO settings (key, value) 
SELECT * FROM (VALUES
('loyalty_enabled', 'false'),
('points_per_appointment', '10'),
('points_for_discount', '100'),
('discount_percentage', '10')
) AS v(key, value)
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = v.key);

-- Admin users toevoegen (vervang met echte admin emails)
INSERT INTO admin_users (id, email, role) 
SELECT * FROM (VALUES
('2b37e357-367b-4c8f-a11a-b26b2544a52f'::UUID, 'admin@salon.nl', 'admin'),
('83a9a8f5-ca63-4adc-b3f0-8a534c5c42c3'::UUID, 'beheerder@salon.nl', 'admin')
) AS v(id, email, role)
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE id = v.id);

-- ===========================================
-- INDEXES VOOR BETERE PERFORMANCE
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_boekingen_datumtijd ON boekingen(datumtijd);
CREATE INDEX IF NOT EXISTS idx_boekingen_kapper ON boekingen(kapper_id);
CREATE INDEX IF NOT EXISTS idx_boekingen_dienst ON boekingen(dienst_id);
CREATE INDEX IF NOT EXISTS idx_boekingen_status ON boekingen(status);
CREATE INDEX IF NOT EXISTS idx_kapper_availability_kapper ON kapper_availability(kapper_id);
CREATE INDEX IF NOT EXISTS idx_kapper_availability_day ON kapper_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);

-- ===========================================
-- CONTROLEER RESULTAAT
-- ===========================================
SELECT 'Database setup completed successfully' as status;
SELECT COUNT(*) as kappers_count FROM kappers;
SELECT COUNT(*) as diensten_count FROM diensten;
SELECT COUNT(*) as kapper_availability_count FROM kapper_availability;
SELECT COUNT(*) as settings_count FROM settings;
SELECT COUNT(*) as admin_users_count FROM admin_users;
SELECT COUNT(*) as customers_count FROM customers;
SELECT COUNT(*) as customer_notes_count FROM customer_notes;
