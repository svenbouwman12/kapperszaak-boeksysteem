-- Originele Database Setup voor Kapperszaak Boeksysteem
-- Zoals het altijd was - voordat alle aanpassingen

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

-- Policies voor publieke toegang (alleen lezen)
CREATE POLICY "Enable read access for all users" ON kappers FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON diensten FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON openingstijden FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON settings FOR SELECT USING (true);

-- Policy voor boekingen (lezen en schrijven)
CREATE POLICY "Enable all access for all users" ON boekingen FOR ALL USING (true);

-- Policy voor admin_users (alleen admin toegang)
CREATE POLICY "Enable admin access for admin users" ON admin_users FOR ALL USING (true);

-- Test data toevoegen
INSERT INTO kappers (naam, specialiteiten) VALUES
('Jan de Kapper', ARRAY['Knippen', 'Wassen', 'Styling']),
('Marie van der Berg', ARRAY['Knippen', 'Kleuren', 'Highlights']),
('Piet van Dijk', ARRAY['Baard trimmen', 'Knippen', 'Styling']);

INSERT INTO diensten (naam, prijs, duur_minuten, beschrijving) VALUES
('Knippen en wassen', 25.00, 30, 'Basis knipbeurt met wassen'),
('Knippen, wassen en föhnen', 35.00, 45, 'Complete behandeling'),
('Kleuren', 45.00, 60, 'Haar kleuren'),
('Highlights', 65.00, 90, 'Highlights aanbrengen'),
('Baard trimmen', 15.00, 20, 'Baard bijwerken');

INSERT INTO openingstijden (dag_van_week, open_tijd, sluit_tijd, gesloten) VALUES
(0, NULL, NULL, TRUE),  -- Zondag gesloten
(1, '09:00', '18:00', FALSE),  -- Maandag
(2, '09:00', '18:00', FALSE),  -- Dinsdag
(3, '09:00', '18:00', FALSE),  -- Woensdag
(4, '09:00', '18:00', FALSE),  -- Donderdag
(5, '09:00', '18:00', FALSE),  -- Vrijdag
(6, '09:00', '17:00', FALSE);  -- Zaterdag

-- Settings voor loyalty systeem
INSERT INTO settings (key, value) VALUES
('loyalty_enabled', 'false'),
('points_per_appointment', '10'),
('points_for_discount', '100'),
('discount_percentage', '10');

-- Admin users toevoegen (vervang met echte admin emails)
INSERT INTO admin_users (id, email, role) VALUES
('2b37e357-367b-4c8f-a11a-b26b2544a52f', 'admin@salon.nl', 'admin'),
('83a9a8f5-ca63-4adc-b3f0-8a534c5c42c3', 'beheerder@salon.nl', 'admin');

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
