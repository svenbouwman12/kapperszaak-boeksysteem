-- FINALE DATABASE SETUP - EXACT OVEREENKOMST MET CODE
-- Gebruik dit script om de database te herstellen

-- 1. KAPPERS TABEL (exact zoals code verwacht)
CREATE TABLE IF NOT EXISTS kappers (
  id SERIAL PRIMARY KEY,
  naam VARCHAR(100) NOT NULL,
  specialiteiten TEXT[],
  beschikbaarheid JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. DIENSTEN TABEL (exact zoals code verwacht)
CREATE TABLE IF NOT EXISTS diensten (
  id SERIAL PRIMARY KEY,
  naam VARCHAR(100) NOT NULL,
  prijs DECIMAL(10,2) NOT NULL,
  duur_minuten INTEGER NOT NULL,
  beschrijving TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. BOEKINGEN TABEL (exact zoals code verwacht)
CREATE TABLE IF NOT EXISTS boekingen (
  id SERIAL PRIMARY KEY,
  klant_naam VARCHAR(100) NOT NULL,
  klant_email VARCHAR(100),
  klant_telefoon VARCHAR(20),
  kapper_id INTEGER REFERENCES kappers(id),
  dienst_id INTEGER REFERENCES diensten(id),
  datum DATE NOT NULL,
  start_tijd TIME NOT NULL,
  eind_tijd TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'bevestigd',
  opmerkingen TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. KAPPER_AVAILABILITY TABEL (exact zoals code verwacht)
CREATE TABLE IF NOT EXISTS kapper_availability (
  id SERIAL PRIMARY KEY,
  kapper_id INTEGER REFERENCES kappers(id),
  day_of_week INTEGER NOT NULL,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. OPENINGSTIJDEN TABEL (exact zoals code verwacht)
CREATE TABLE IF NOT EXISTS openingstijden (
  id SERIAL PRIMARY KEY,
  dag_van_week INTEGER NOT NULL,
  open_tijd TIME,
  sluit_tijd TIME,
  gesloten BOOLEAN DEFAULT FALSE
);

-- 6. SETTINGS TABEL (exact zoals code verwacht)
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. ADMIN_USERS TABEL (exact zoals code verwacht)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. CUSTOMERS TABEL (voor admin functionaliteit)
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  naam VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  telefoon VARCHAR(20),
  loyaliteitspunten INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. CUSTOMER_NOTES TABEL (voor admin functionaliteit)
CREATE TABLE IF NOT EXISTS customer_notes (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  note TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS INSCHAKELEN
ALTER TABLE kappers ENABLE ROW LEVEL SECURITY;
ALTER TABLE diensten ENABLE ROW LEVEL SECURITY;
ALTER TABLE boekingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE kapper_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE openingstijden ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (exact zoals code verwacht)
CREATE POLICY "Enable read access for all users" ON kappers FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON diensten FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON openingstijden FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON settings FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON kapper_availability FOR SELECT USING (true);
CREATE POLICY "Enable all access for all users" ON boekingen FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON kapper_availability FOR ALL USING (true);
CREATE POLICY "Enable admin access for admin users" ON admin_users FOR ALL USING (true);
CREATE POLICY "Enable admin access for customers" ON customers FOR ALL USING (true);
CREATE POLICY "Enable admin access for customer notes" ON customer_notes FOR ALL USING (true);

-- TEST DATA (exact zoals code verwacht)
INSERT INTO kappers (naam, specialiteiten) 
SELECT * FROM (VALUES
('Jan de Kapper', ARRAY['Knippen', 'Wassen', 'Styling']),
('Marie van der Berg', ARRAY['Knippen', 'Kleuren', 'Highlights']),
('Piet van Dijk', ARRAY['Baard trimmen', 'Knippen', 'Styling'])
) AS v(naam, specialiteiten)
WHERE NOT EXISTS (SELECT 1 FROM kappers WHERE naam = v.naam);

INSERT INTO diensten (naam, prijs_euro, duur_minuten, beschrijving) 
SELECT * FROM (VALUES
('Knippen en wassen', 25.00, 30, 'Basis knipbeurt met wassen'),
('Knippen, wassen en föhnen', 35.00, 45, 'Complete behandeling'),
('Kleuren', 45.00, 60, 'Haar kleuren'),
('Highlights', 65.00, 90, 'Highlights aanbrengen'),
('Baard trimmen', 15.00, 20, 'Baard bijwerken')
) AS v(naam, prijs_euro, duur_minuten, beschrijving)
WHERE NOT EXISTS (SELECT 1 FROM diensten WHERE naam = v.naam);

INSERT INTO openingstijden (dag_van_week, open_tijd, sluit_tijd, gesloten) 
SELECT * FROM (VALUES
(0, NULL, NULL, TRUE),
(1, '09:00', '18:00', FALSE),
(2, '09:00', '18:00', FALSE),
(3, '09:00', '18:00', FALSE),
(4, '09:00', '18:00', FALSE),
(5, '09:00', '18:00', FALSE),
(6, '09:00', '17:00', FALSE)
) AS v(dag_van_week, open_tijd, sluit_tijd, gesloten)
WHERE NOT EXISTS (SELECT 1 FROM openingstijden WHERE dag_van_week = v.dag_van_week);

INSERT INTO settings (key, value) 
SELECT * FROM (VALUES
('loyalty_enabled', 'false'),
('points_per_appointment', '10'),
('points_for_discount', '100'),
('discount_percentage', '10')
) AS v(key, value)
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = v.key);

INSERT INTO admin_users (id, email, role) 
SELECT * FROM (VALUES
('2b37e357-367b-4c8f-a11a-b26b2544a52f', 'admin@salon.nl', 'admin'),
('83a9a8f5-ca63-4adc-b3f0-8a534c5c42c3', 'beheerder@salon.nl', 'admin')
) AS v(id, email, role)
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE id = v.id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_boekingen_datum ON boekingen(datum);
CREATE INDEX IF NOT EXISTS idx_boekingen_kapper ON boekingen(kapper_id);
CREATE INDEX IF NOT EXISTS idx_boekingen_dienst ON boekingen(dienst_id);
CREATE INDEX IF NOT EXISTS idx_boekingen_status ON boekingen(status);
CREATE INDEX IF NOT EXISTS idx_kapper_availability_kapper ON kapper_availability(kapper_id);
CREATE INDEX IF NOT EXISTS idx_kapper_availability_day ON kapper_availability(day_of_week);

-- CONTROLEER RESULTAAT
SELECT 'Database setup completed successfully' as status;
SELECT COUNT(*) as kappers_count FROM kappers;
SELECT COUNT(*) as diensten_count FROM diensten;
SELECT COUNT(*) as openingstijden_count FROM openingstijden;
SELECT COUNT(*) as settings_count FROM settings;
SELECT COUNT(*) as admin_users_count FROM admin_users;
