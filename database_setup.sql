-- Database Setup Script voor Kapperszaak Boeksysteem
-- Voer dit script uit in de Supabase SQL Editor

-- 1. Kappers tabel
CREATE TABLE IF NOT EXISTS kappers (
  id SERIAL PRIMARY KEY,
  naam VARCHAR(100) NOT NULL,
  specialiteiten TEXT[],
  beschikbaarheid JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Diensten tabel
CREATE TABLE IF NOT EXISTS diensten (
  id SERIAL PRIMARY KEY,
  naam VARCHAR(100) NOT NULL,
  prijs DECIMAL(10,2) NOT NULL,
  duur_minuten INTEGER NOT NULL,
  beschrijving TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Afspraken/Boekingen tabel
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

-- 4. Openingstijden tabel
CREATE TABLE IF NOT EXISTS openingstijden (
  id SERIAL PRIMARY KEY,
  dag_van_week INTEGER NOT NULL, -- 0=zondag, 1=maandag, etc.
  open_tijd TIME,
  sluit_tijd TIME,
  gesloten BOOLEAN DEFAULT FALSE
);

-- 5. Settings tabel (voor loyalty systeem)
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Admin users tabel (voor admin toegang)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS (Row Level Security) inschakelen
ALTER TABLE kappers ENABLE ROW LEVEL SECURITY;
ALTER TABLE diensten ENABLE ROW LEVEL SECURITY;
ALTER TABLE boekingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE openingstijden ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policies voor publieke toegang (alleen lezen) - alleen aanmaken als ze niet bestaan
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kappers' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON kappers FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diensten' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON diensten FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'openingstijden' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON openingstijden FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON settings FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boekingen' AND policyname = 'Enable all access for all users') THEN
        CREATE POLICY "Enable all access for all users" ON boekingen FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'Enable admin access for admin users') THEN
        CREATE POLICY "Enable admin access for admin users" ON admin_users FOR ALL USING (true);
    END IF;
END $$;

-- Test data toevoegen (alleen als ze nog niet bestaan)
INSERT INTO kappers (naam, specialiteiten) 
SELECT * FROM (VALUES
('Jan de Kapper', ARRAY['Knippen', 'Wassen', 'Styling']::TEXT[]),
('Marie van der Berg', ARRAY['Knippen', 'Kleuren', 'Highlights']::TEXT[]),
('Piet van Dijk', ARRAY['Baard trimmen', 'Knippen', 'Styling']::TEXT[])
) AS v(naam, specialiteiten)
WHERE NOT EXISTS (SELECT 1 FROM kappers WHERE naam = v.naam);

INSERT INTO diensten (naam, prijs, duur_minuten, beschrijving) 
SELECT * FROM (VALUES
('Knippen en wassen', 25.00::DECIMAL, 30, 'Basis knipbeurt met wassen'),
('Knippen, wassen en föhnen', 35.00::DECIMAL, 45, 'Complete behandeling'),
('Kleuren', 45.00::DECIMAL, 60, 'Haar kleuren'),
('Highlights', 65.00::DECIMAL, 90, 'Highlights aanbrengen'),
('Baard trimmen', 15.00::DECIMAL, 20, 'Baard bijwerken')
) AS v(naam, prijs, duur_minuten, beschrijving)
WHERE NOT EXISTS (SELECT 1 FROM diensten WHERE naam = v.naam);

INSERT INTO openingstijden (dag_van_week, open_tijd, sluit_tijd, gesloten) 
SELECT * FROM (VALUES
(0, NULL::TIME, NULL::TIME, TRUE),  -- Zondag gesloten
(1, '09:00'::TIME, '18:00'::TIME, FALSE),  -- Maandag
(2, '09:00'::TIME, '18:00'::TIME, FALSE),  -- Dinsdag
(3, '09:00'::TIME, '18:00'::TIME, FALSE),  -- Woensdag
(4, '09:00'::TIME, '18:00'::TIME, FALSE),  -- Donderdag
(5, '09:00'::TIME, '18:00'::TIME, FALSE),  -- Vrijdag
(6, '09:00'::TIME, '17:00'::TIME, FALSE)  -- Zaterdag
) AS v(dag_van_week, open_tijd, sluit_tijd, gesloten)
WHERE NOT EXISTS (SELECT 1 FROM openingstijden WHERE dag_van_week = v.dag_van_week);

-- Settings voor loyalty systeem (alleen als ze nog niet bestaan)
INSERT INTO settings (key, value) 
SELECT * FROM (VALUES
('loyalty_enabled', 'false'),
('points_per_appointment', '10'),
('points_for_discount', '100'),
('discount_percentage', '10')
) AS v(key, value)
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = v.key);

-- Admin users toevoegen (alleen als ze nog niet bestaan)
INSERT INTO admin_users (id, email, role) 
SELECT * FROM (VALUES
('2b37e357-367b-4c8f-a11a-b26b2544a52f'::UUID, 'admin@salon.nl', 'admin'),
('83a9a8f5-ca63-4adc-b3f0-8a534c5c42c3'::UUID, 'beheerder@salon.nl', 'admin')
) AS v(id, email, role)
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE id = v.id);

-- Indexes voor betere performance
CREATE INDEX IF NOT EXISTS idx_boekingen_datum ON boekingen(datum);
CREATE INDEX IF NOT EXISTS idx_boekingen_kapper ON boekingen(kapper_id);
CREATE INDEX IF NOT EXISTS idx_boekingen_dienst ON boekingen(dienst_id);
CREATE INDEX IF NOT EXISTS idx_boekingen_status ON boekingen(status);

-- Controleer of alles correct is aangemaakt
SELECT 'Tables created successfully' as status;
SELECT COUNT(*) as kappers_count FROM kappers;
SELECT COUNT(*) as diensten_count FROM diensten;
SELECT COUNT(*) as openingstijden_count FROM openingstijden;
SELECT COUNT(*) as settings_count FROM settings;
SELECT COUNT(*) as admin_users_count FROM admin_users;
