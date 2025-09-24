-- QUICK FIX: Voeg ontbrekende kolommen toe aan settings tabel

-- Voeg updated_at kolom toe als deze nog niet bestaat
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'settings' AND column_name = 'updated_at') THEN
    ALTER TABLE settings ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Voeg description kolom toe als deze nog niet bestaat
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'settings' AND column_name = 'description') THEN
    ALTER TABLE settings ADD COLUMN description TEXT;
  END IF;
END $$;

-- Controleer of de kolom is toegevoegd
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'settings' 
ORDER BY ordinal_position;
