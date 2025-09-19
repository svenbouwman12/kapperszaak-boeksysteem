-- Migrate boekingen table to include begin_tijd and eind_tijd
-- This script adds the new columns and populates them based on existing datumtijd and service duration

-- Step 1: Add new columns
ALTER TABLE boekingen 
ADD COLUMN begin_tijd TIMESTAMP WITH TIME ZONE,
ADD COLUMN eind_tijd TIMESTAMP WITH TIME ZONE;

-- Step 2: Update existing records with calculated times
-- This calculates eind_tijd based on datumtijd + service duration
UPDATE boekingen 
SET 
  begin_tijd = datumtijd,
  eind_tijd = datumtijd + INTERVAL '1 minute' * COALESCE(
    (SELECT duur_minuten FROM diensten WHERE diensten.id = boekingen.dienst_id), 
    30
  )
WHERE begin_tijd IS NULL;

-- Step 3: Make the new columns NOT NULL after populating them
ALTER TABLE boekingen 
ALTER COLUMN begin_tijd SET NOT NULL,
ALTER COLUMN eind_tijd SET NOT NULL;

-- Step 4: Add indexes for better performance
CREATE INDEX idx_boekingen_begin_tijd ON boekingen(begin_tijd);
CREATE INDEX idx_boekingen_eind_tijd ON boekingen(eind_tijd);
CREATE INDEX idx_boekingen_barber_tijd ON boekingen(barber_id, begin_tijd, eind_tijd);

-- Step 5: Add check constraint to ensure eind_tijd > begin_tijd
ALTER TABLE boekingen 
ADD CONSTRAINT check_tijd_validiteit 
CHECK (eind_tijd > begin_tijd);
