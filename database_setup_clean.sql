-- CLEAN DATABASE SETUP - VANAF NUL
-- Voer dit script uit in Supabase SQL Editor voor een schone start

-- ===========================================
-- 1. KAPPERS TABEL
-- ===========================================
CREATE TABLE kappers (
  id SERIAL PRIMARY KEY,
  naam VARCHAR(100) NOT NULL,
  specialiteiten TEXT[],
  beschikbaarheid JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 2. DIENSTEN TABEL  
-- ===========================================
CREATE TABLE diensten (
  id SERIAL PRIMARY KEY,
  naam VARCHAR(100) NOT NULL,
  prijs DECIMAL(10,2) NOT NULL,
  duur_minuten INTEGER NOT NULL,
  beschrijving TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 3. BOEKINGEN TABEL (aangepast voor code compatibiliteit)
-- ===========================================
CREATE TABLE boekingen (
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
CREATE TABLE kapper_availability (
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
CREATE TABLE openingstijden (
  id SERIAL PRIMARY KEY,
  dag_van_week INTEGER NOT NULL,
  open_tijd TIME,
  sluit_tijd TIME,
  gesloten BOOLEAN DEFAULT FALSE
);

-- ===========================================
-- 6. SETTINGS TABEL
-- ===========================================
CREATE TABLE settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 7. ADMIN_USERS TABEL
-- ===========================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- 8. CUSTOMERS TABEL
-- ===========================================
CREATE TABLE customers (
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
CREATE TABLE customer_notes (
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
-- RLS POLICIES AANMAKEN
-- ===========================================
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

-- ===========================================
-- TEST DATA TOEVOEGEN
-- ===========================================

-- Kappers toevoegen
INSERT INTO kappers (naam, specialiteiten) VALUES
('Jan de Kapper', ARRAY['Knippen', 'Wassen', 'Styling']),
('Marie van der Berg', ARRAY['Knippen', 'Kleuren', 'Highlights']),
('Piet van Dijk', ARRAY['Baard trimmen', 'Knippen', 'Styling']);

-- Diensten toevoegen
INSERT INTO diensten (naam, prijs, duur_minuten, beschrijving) VALUES
('Knippen en wassen', 25.00, 30, 'Basis knipbeurt met wassen'),
('Knippen, wassen en föhnen', 35.00, 45, 'Complete behandeling'),
('Kleuren', 45.00, 60, 'Haar kleuren'),
('Highlights', 65.00, 90, 'Highlights aanbrengen'),
('Baard trimmen', 15.00, 20, 'Baard bijwerken');

-- Kapper availability toevoegen (standaard werktijden)
INSERT INTO kapper_availability (kapper_id, day_of_week, start_time, end_time) VALUES
(1, 1, '09:00', '18:00'),  -- Jan - Maandag
(1, 2, '09:00', '18:00'),  -- Jan - Dinsdag
(1, 3, '09:00', '18:00'),  -- Jan - Woensdag
(1, 4, '09:00', '18:00'),  -- Jan - Donderdag
(1, 5, '09:00', '18:00'),  -- Jan - Vrijdag
(1, 6, '09:00', '17:00'),  -- Jan - Zaterdag
(2, 1, '09:00', '18:00'),  -- Marie - Maandag
(2, 2, '09:00', '18:00'),  -- Marie - Dinsdag
(2, 3, '09:00', '18:00'),  -- Marie - Woensdag
(2, 4, '09:00', '18:00'),  -- Marie - Donderdag
(2, 5, '09:00', '18:00'),  -- Marie - Vrijdag
(2, 6, '09:00', '17:00'),  -- Marie - Zaterdag
(3, 1, '09:00', '18:00'),  -- Piet - Maandag
(3, 2, '09:00', '18:00'),  -- Piet - Dinsdag
(3, 3, '09:00', '18:00'),  -- Piet - Woensdag
(3, 4, '09:00', '18:00'),  -- Piet - Donderdag
(3, 5, '09:00', '18:00'),  -- Piet - Vrijdag
(3, 6, '09:00', '17:00');  -- Piet - Zaterdag

-- Openingstijden toevoegen
INSERT INTO openingstijden (dag_van_week, open_tijd, sluit_tijd, gesloten) VALUES
(0, NULL, NULL, TRUE),  -- Zondag gesloten
(1, '09:00', '18:00', FALSE),  -- Maandag
(2, '09:00', '18:00', FALSE),  -- Dinsdag
(3, '09:00', '18:00', FALSE),  -- Woensdag
(4, '09:00', '18:00', FALSE),  -- Donderdag
(5, '09:00', '18:00', FALSE),  -- Vrijdag
(6, '09:00', '17:00', FALSE);  -- Zaterdag

-- Settings toevoegen
INSERT INTO settings (key, value) VALUES
('loyalty_enabled', 'false'),
('points_per_appointment', '10'),
('points_for_discount', '100'),
('discount_percentage', '10');

-- Admin users toevoegen
INSERT INTO admin_users (id, email, role) VALUES
('2b37e357-367b-4c8f-a11a-b26b2544a52f', 'admin@salon.nl', 'admin'),
('83a9a8f5-ca63-4adc-b3f0-8a534c5c42c3', 'beheerder@salon.nl', 'admin');

-- ===========================================
-- INDEXES VOOR PERFORMANCE
-- ===========================================
CREATE INDEX idx_boekingen_datumtijd ON boekingen(datumtijd);
CREATE INDEX idx_boekingen_kapper ON boekingen(kapper_id);
CREATE INDEX idx_boekingen_dienst ON boekingen(dienst_id);
CREATE INDEX idx_boekingen_status ON boekingen(status);
CREATE INDEX idx_kapper_availability_kapper ON kapper_availability(kapper_id);
CREATE INDEX idx_kapper_availability_day ON kapper_availability(day_of_week);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);

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
