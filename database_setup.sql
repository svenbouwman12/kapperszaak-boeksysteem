-- COMPLETE DATABASE SETUP - ALLE TABELLEN EN KOLOMMEN DIE DE CODE VERWACHT
-- Gebaseerd op volledige analyse van script.js, admin.js en wijzig-afspraak.js

-- ===========================================
-- 1. KAPPERS TABEL
-- ===========================================
CREATE TABLE IF NOT EXISTS kappers (
  id SERIAL PRIMARY KEY,
  naam VARCHAR(100) NOT NULL,
  specialiteiten TEXT[],
  beschikbaarheid JSONB,
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
  beschrijving TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 3. BOEKINGEN TABEL
-- ===========================================
CREATE TABLE IF NOT EXISTS boekingen (
  id SERIAL PRIMARY KEY,
  klantnaam VARCHAR(100) NOT NULL,
  email VARCHAR(100),
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
  day_of_week INTEGER NOT NULL,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 5. OPENINGSTIJDEN TABEL
-- ===========================================
CREATE TABLE IF NOT EXISTS openingstijden (
  id SERIAL PRIMARY KEY,
  dag_van_week INTEGER NOT NULL,
  open_tijd TIME,
  sluit_tijd TIME,
  gesloten BOOLEAN DEFAULT FALSE
);

-- ===========================================
-- 6. SETTINGS TABEL
-- ===========================================
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 7. ADMIN_USERS TABEL
-- ===========================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 8. CUSTOMERS TABEL
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
-- 9. CUSTOMER_NOTES TABEL
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
ALTER TABLE openingstijden ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS POLICIES AANMAKEN (met IF NOT EXISTS)
-- ===========================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kappers' AND policyname = 'Enable read access for all users') THEN
    CREATE POLICY "Enable read access for all users" ON kappers FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kappers' AND policyname = 'Enable all access for all users') THEN
    CREATE POLICY "Enable all access for all users" ON kappers FOR ALL USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diensten' AND policyname = 'Enable read access for all users') THEN
    CREATE POLICY "Enable read access for all users" ON diensten FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diensten' AND policyname = 'Enable all access for all users') THEN
    CREATE POLICY "Enable all access for all users" ON diensten FOR ALL USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'openingstijden' AND policyname = 'Enable read access for all users') THEN
    CREATE POLICY "Enable read access for all users" ON openingstijden FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Enable read access for all users') THEN
    CREATE POLICY "Enable read access for all users" ON settings FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kapper_availability' AND policyname = 'Enable read access for all users') THEN
    CREATE POLICY "Enable read access for all users" ON kapper_availability FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boekingen' AND policyname = 'Enable all access for all users') THEN
    CREATE POLICY "Enable all access for all users" ON boekingen FOR ALL USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kapper_availability' AND policyname = 'Enable all access for all users') THEN
    CREATE POLICY "Enable all access for all users" ON kapper_availability FOR ALL USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'Enable admin access for admin users') THEN
    CREATE POLICY "Enable admin access for admin users" ON admin_users FOR ALL USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Enable admin access for customers') THEN
    CREATE POLICY "Enable admin access for customers" ON customers FOR ALL USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_notes' AND policyname = 'Enable admin access for customer notes') THEN
    CREATE POLICY "Enable admin access for customer notes" ON customer_notes FOR ALL USING (true);
  END IF;
END $$;

-- ===========================================
-- TEST DATA TOEVOEGEN
-- ===========================================

-- Kappers toevoegen (met IF NOT EXISTS)
INSERT INTO kappers (naam, specialiteiten) 
SELECT * FROM (VALUES
('Jan de Kapper', ARRAY['Knippen', 'Wassen', 'Styling']),
('Marie van der Berg', ARRAY['Knippen', 'Kleuren', 'Highlights']),
('Piet van Dijk', ARRAY['Baard trimmen', 'Knippen', 'Styling'])
) AS v(naam, specialiteiten)
WHERE NOT EXISTS (SELECT 1 FROM kappers WHERE naam = v.naam);

-- Diensten toevoegen (met IF NOT EXISTS)
INSERT INTO diensten (naam, prijs_euro, duur_minuten, beschrijving) 
SELECT * FROM (VALUES
('Knippen en wassen', 25.00, 30, 'Basis knipbeurt met wassen'),
('Knippen, wassen en föhnen', 35.00, 45, 'Complete behandeling'),
('Kleuren', 45.00, 60, 'Haar kleuren'),
('Highlights', 65.00, 90, 'Highlights aanbrengen'),
('Baard trimmen', 15.00, 20, 'Baard bijwerken')
) AS v(naam, prijs_euro, duur_minuten, beschrijving)
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

-- Openingstijden toevoegen
INSERT INTO openingstijden (dag_van_week, open_tijd, sluit_tijd, gesloten) 
SELECT * FROM (VALUES
(0, NULL::TIME, NULL::TIME, TRUE),  -- Zondag gesloten
(1, '09:00'::TIME, '18:00'::TIME, FALSE),  -- Maandag
(2, '09:00'::TIME, '18:00'::TIME, FALSE),  -- Dinsdag
(3, '09:00'::TIME, '18:00'::TIME, FALSE),  -- Woensdag
(4, '09:00'::TIME, '18:00'::TIME, FALSE),  -- Donderdag
(5, '09:00'::TIME, '18:00'::TIME, FALSE),  -- Vrijdag
(6, '09:00'::TIME, '17:00'::TIME, FALSE)   -- Zaterdag
) AS v(dag_van_week, open_tijd, sluit_tijd, gesloten)
WHERE NOT EXISTS (SELECT 1 FROM openingstijden WHERE dag_van_week = v.dag_van_week);

-- Settings toevoegen
INSERT INTO settings (key, value) 
SELECT * FROM (VALUES
('loyalty_enabled', 'false'),
('points_per_appointment', '10'),
('points_for_discount', '100'),
('discount_percentage', '10'),
('primary_color', '#007bff'),
('secondary_color', '#6c757d'),
('background_color', '#ffffff'),
('text_color', '#333333'),
('site_title', 'Kapperszaak Boeksysteem')
) AS v(key, value)
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = v.key);

-- Admin users toevoegen (inclusief de UUID uit de error)
INSERT INTO admin_users (id, email, role) 
SELECT * FROM (VALUES
('2b37e357-367b-4c8f-a11a-b26b2544a52f'::UUID, 'admin@salon.nl', 'admin'),
('83a9a8f5-ca63-4adc-b3f0-8a534c5c42c3'::UUID, 'beheerder@salon.nl', 'admin'),
('1c4c216d-529b-4280-b23c-8b30b62e4709'::UUID, 'user@salon.nl', 'admin')
) AS v(id, email, role)
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE id = v.id);

-- ===========================================
-- INDEXES VOOR PERFORMANCE (met IF NOT EXISTS)
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_boekingen_datumtijd ON boekingen(datumtijd);
CREATE INDEX IF NOT EXISTS idx_boekingen_kapper ON boekingen(kapper_id);
CREATE INDEX IF NOT EXISTS idx_boekingen_dienst ON boekingen(dienst_id);
CREATE INDEX IF NOT EXISTS idx_boekingen_status ON boekingen(status);
CREATE INDEX IF NOT EXISTS idx_boekingen_email ON boekingen(email);
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
SELECT COUNT(*) as openingstijden_count FROM openingstijden;
SELECT COUNT(*) as settings_count FROM settings;
SELECT COUNT(*) as admin_users_count FROM admin_users;
SELECT COUNT(*) as customers_count FROM customers;
SELECT COUNT(*) as customer_notes_count FROM customer_notes;
