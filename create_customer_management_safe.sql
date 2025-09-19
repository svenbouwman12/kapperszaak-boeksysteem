-- Safe customer management tables creation
-- This script safely creates tables for customer profiles, loyalty points, and appointment history

-- Step 1: Create customers table (if not exists)
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  naam VARCHAR(255) NOT NULL,
  telefoon VARCHAR(20),
  geboortedatum DATE,
  adres TEXT,
  postcode VARCHAR(10),
  plaats VARCHAR(100),
  notities TEXT,
  loyaliteitspunten INTEGER DEFAULT 0,
  totaal_uitgegeven DECIMAL(10,2) DEFAULT 0.00,
  aantal_afspraken INTEGER DEFAULT 0,
  laatste_afspraak DATE,
  voorkeuren JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create loyalty_points table (if not exists)
CREATE TABLE IF NOT EXISTS loyalty_points (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  punten INTEGER NOT NULL,
  reden VARCHAR(255) NOT NULL,
  afspraak_id INTEGER REFERENCES boekingen(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create customer_notes table (if not exists)
CREATE TABLE IF NOT EXISTS customer_notes (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by VARCHAR(255) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Add indexes for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_naam ON customers(naam);
CREATE INDEX IF NOT EXISTS idx_customers_telefoon ON customers(telefoon);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer ON loyalty_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);

-- Step 5: Create or replace function to update customer stats when booking is made
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer statistics
  UPDATE customers 
  SET 
    aantal_afspraken = aantal_afspraken + 1,
    laatste_afspraak = NEW.datumtijd::DATE,
    totaal_uitgegeven = totaal_uitgegeven + (
      SELECT prijs_euro FROM diensten WHERE id = NEW.dienst_id
    ),
    updated_at = NOW()
  WHERE email = NEW.email;
  
  -- Add loyalty points (1 point per euro spent)
  INSERT INTO loyalty_points (customer_id, punten, reden, afspraak_id)
  SELECT 
    c.id,
    FLOOR((SELECT prijs_euro FROM diensten WHERE id = NEW.dienst_id)),
    'Afspraak geboekt',
    NEW.id
  FROM customers c 
  WHERE c.email = NEW.email;
  
  -- Update total loyalty points
  UPDATE customers 
  SET loyaliteitspunten = (
    SELECT COALESCE(SUM(punten), 0) 
    FROM loyalty_points 
    WHERE customer_id = customers.id
  )
  WHERE email = NEW.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_customer_stats ON boekingen;
CREATE TRIGGER trigger_update_customer_stats
  AFTER INSERT ON boekingen
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Step 7: Create or replace function to sync existing customers
CREATE OR REPLACE FUNCTION sync_existing_customers()
RETURNS void AS $$
BEGIN
  -- Insert customers from existing bookings
  INSERT INTO customers (email, naam, telefoon, aantal_afspraken, totaal_uitgegeven, laatste_afspraak)
  SELECT 
    email,
    klantnaam,
    telefoon,
    COUNT(*) as aantal_afspraken,
    SUM(d.prijs_euro) as totaal_uitgegeven,
    MAX(datumtijd::DATE) as laatste_afspraak
  FROM boekingen b
  JOIN diensten d ON b.dienst_id = d.id
  WHERE email IS NOT NULL AND email != ''
  GROUP BY email, klantnaam, telefoon
  ON CONFLICT (email) DO UPDATE SET
    naam = EXCLUDED.naam,
    telefoon = EXCLUDED.telefoon,
    aantal_afspraken = EXCLUDED.aantal_afspraken,
    totaal_uitgegeven = EXCLUDED.totaal_uitgegeven,
    laatste_afspraak = EXCLUDED.laatste_afspraak,
    updated_at = NOW();
    
  -- Calculate loyalty points for existing customers
  UPDATE customers 
  SET loyaliteitspunten = FLOOR(totaal_uitgegeven)
  WHERE loyaliteitspunten = 0;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Run the sync function
SELECT sync_existing_customers();
