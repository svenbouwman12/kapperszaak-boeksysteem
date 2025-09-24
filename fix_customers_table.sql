-- QUICK FIX: Voeg ontbrekende kolommen toe aan customers tabel

-- Voeg geboortedatum kolom toe als deze nog niet bestaat
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'customers' AND column_name = 'geboortedatum') THEN
    ALTER TABLE customers ADD COLUMN geboortedatum DATE;
  END IF;
END $$;

-- Controleer of de kolom is toegevoegd
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'customers' 
ORDER BY ordinal_position;
