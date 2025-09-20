-- =====================================================
-- KAPPERSZAAK BOEKSYSTEEM - DATABASE EXPORT
-- =====================================================
-- Dit script exporteert alle tabellen, data en configuraties
-- voor een nieuwe kapperszaak setup
-- 
-- Gebruik: Voer dit script uit in je nieuwe Supabase project
-- Datum: 20 september 2025
-- =====================================================

-- 1. TABELLEN AANMAKEN
-- =====================================================

-- Admin users tabel
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    last_login TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Barbers tabel
CREATE TABLE IF NOT EXISTS barbers (
    id SERIAL PRIMARY KEY,
    naam TEXT NOT NULL,
    email TEXT,
    telefoon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services tabel
CREATE TABLE IF NOT EXISTS diensten (
    id SERIAL PRIMARY KEY,
    naam TEXT NOT NULL,
    prijs_euro DECIMAL(10,2) NOT NULL,
    duur_minuten INTEGER NOT NULL DEFAULT 30,
    beschrijving TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barber availability tabel
CREATE TABLE IF NOT EXISTS barber_availability (
    id SERIAL PRIMARY KEY,
    barber_id INTEGER REFERENCES barbers(id) ON DELETE CASCADE,
    dag_van_week INTEGER NOT NULL CHECK (dag_van_week >= 0 AND dag_van_week <= 6),
    start_tijd TIME NOT NULL,
    eind_tijd TIME NOT NULL,
    UNIQUE(barber_id, dag_van_week)
);

-- Bookings tabel
CREATE TABLE IF NOT EXISTS boekingen (
    id SERIAL PRIMARY KEY,
    klant_naam TEXT NOT NULL,
    klant_email TEXT NOT NULL,
    klant_telefoon TEXT,
    barber_id INTEGER REFERENCES barbers(id),
    dienst_id INTEGER REFERENCES diensten(id),
    datumtijd TIMESTAMP WITH TIME ZONE NOT NULL,
    begin_tijd TIME NOT NULL,
    eind_tijd TIME NOT NULL,
    status TEXT DEFAULT 'bevestigd',
    opmerkingen TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers tabel
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    naam TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefoon TEXT,
    adres TEXT,
    geboortedatum DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer notes tabel
CREATE TABLE IF NOT EXISTS customer_notes (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loyalty points tabel
CREATE TABLE IF NOT EXISTS loyalty_points (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings tabel
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. INDEXEN AANMAKEN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_boekingen_datumtijd ON boekingen(datumtijd);
CREATE INDEX IF NOT EXISTS idx_boekingen_barber_id ON boekingen(barber_id);
CREATE INDEX IF NOT EXISTS idx_boekingen_dienst_id ON boekingen(dienst_id);
CREATE INDEX IF NOT EXISTS idx_boekingen_klant_email ON boekingen(klant_email);
CREATE INDEX IF NOT EXISTS idx_barber_availability_barber_id ON barber_availability(barber_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- 3. TRIGGERS EN FUNCTIES
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. STANDARD DATA INSERTEN
-- =====================================================

-- Default barber
INSERT INTO barbers (naam, email, telefoon) VALUES 
('Sven', 'sven@example.com', '06-12345678')
ON CONFLICT DO NOTHING;

-- Default services
INSERT INTO diensten (naam, prijs_euro, duur_minuten, beschrijving) VALUES 
('Herenknippen', 25.00, 30, 'Professioneel herenknippen'),
('Damesknippen', 35.00, 45, 'Stylish damesknippen'),
('Wassen & Föhnen', 15.00, 20, 'Haar wassen en föhnen'),
('Baard trimmen', 20.00, 25, 'Baard bijwerken en trimmen')
ON CONFLICT DO NOTHING;

-- Default barber availability (Sven werkt ma-vr 9:00-17:00)
INSERT INTO barber_availability (barber_id, dag_van_week, start_tijd, eind_tijd) VALUES 
(1, 1, '09:00', '17:00'), -- Maandag
(1, 2, '09:00', '17:00'), -- Dinsdag
(1, 3, '09:00', '17:00'), -- Woensdag
(1, 3, '09:00', '17:00'), -- Donderdag
(1, 4, '09:00', '17:00')  -- Vrijdag
ON CONFLICT (barber_id, dag_van_week) DO NOTHING;

-- Default settings
INSERT INTO settings (key, value, description) VALUES 
('loyalty_enabled', 'true', 'Loyalty programma aan/uit'),
('points_per_appointment', '25', 'Punten per afspraak'),
('points_for_discount', '100', 'Punten nodig voor korting'),
('discount_percentage', '50', 'Kortingspercentage'),
('dark_mode_enabled', 'false', 'Dark mode aan/uit'),
('primary_color', '#f49595', 'Primaire kleur'),
('secondary_color', '#f49696', 'Secundaire kleur'),
('background_color', '#ffffff', 'Achtergrondkleur'),
('text_color', '#333333', 'Tekstkleur'),
('site_title', 'Kapperszaak Boeksysteem', 'Site titel'),
('time_slot_interval', '15', 'Tijdslot interval in minuten'),
('max_advance_booking', '30', 'Maximaal vooruit boeken in dagen')
ON CONFLICT (key) DO NOTHING;

-- 5. CONSTRAINTS EN VALIDATIES
-- =====================================================

-- Barber availability constraints
ALTER TABLE barber_availability ADD CONSTRAINT check_start_before_end 
CHECK (start_tijd < eind_tijd);

-- Booking constraints
ALTER TABLE boekingen ADD CONSTRAINT check_begin_before_end 
CHECK (begin_tijd < eind_tijd);

-- 6. RLS (ROW LEVEL SECURITY) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE diensten ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE boekingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Admin users policies
CREATE POLICY "Admin users can view all" ON admin_users FOR SELECT USING (true);
CREATE POLICY "Admin users can insert" ON admin_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin users can update" ON admin_users FOR UPDATE USING (true);

-- Barbers policies
CREATE POLICY "Anyone can view barbers" ON barbers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can modify barbers" ON barbers FOR ALL USING (auth.role() = 'authenticated');

-- Services policies
CREATE POLICY "Anyone can view services" ON diensten FOR SELECT USING (true);
CREATE POLICY "Authenticated users can modify services" ON diensten FOR ALL USING (auth.role() = 'authenticated');

-- Availability policies
CREATE POLICY "Anyone can view availability" ON barber_availability FOR SELECT USING (true);
CREATE POLICY "Authenticated users can modify availability" ON barber_availability FOR ALL USING (auth.role() = 'authenticated');

-- Bookings policies
CREATE POLICY "Anyone can view bookings" ON boekingen FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bookings" ON boekingen FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update bookings" ON boekingen FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete bookings" ON boekingen FOR DELETE USING (auth.role() = 'authenticated');

-- Customers policies
CREATE POLICY "Authenticated users can view customers" ON customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can modify customers" ON customers FOR ALL USING (auth.role() = 'authenticated');

-- Customer notes policies
CREATE POLICY "Authenticated users can view notes" ON customer_notes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can modify notes" ON customer_notes FOR ALL USING (auth.role() = 'authenticated');

-- Loyalty points policies
CREATE POLICY "Authenticated users can view loyalty" ON loyalty_points FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can modify loyalty" ON loyalty_points FOR ALL USING (auth.role() = 'authenticated');

-- Settings policies
CREATE POLICY "Authenticated users can view settings" ON settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can modify settings" ON settings FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- DATABASE EXPORT VOLTOOID
-- =====================================================
-- Je database is nu klaar voor gebruik!
-- 
-- Volgende stappen:
-- 1. Maak een admin gebruiker aan via de admin panel
-- 2. Configureer je instellingen
-- 3. Voeg je barbers en services toe
-- 4. Test je booking systeem
-- =====================================================
