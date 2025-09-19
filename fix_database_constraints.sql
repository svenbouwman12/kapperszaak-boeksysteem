-- Fix database constraints for boekingen table
-- This script removes problematic constraints temporarily

-- Step 1: Drop the check constraint that's causing issues
ALTER TABLE boekingen DROP CONSTRAINT IF EXISTS check_tijd_validiteit;

-- Step 2: Make begin_tijd and eind_tijd nullable temporarily
ALTER TABLE boekingen 
ALTER COLUMN begin_tijd DROP NOT NULL,
ALTER COLUMN eind_tijd DROP NOT NULL;

-- Step 3: Update existing records to have proper begin_tijd and eind_tijd
UPDATE boekingen 
SET 
  begin_tijd = datumtijd,
  eind_tijd = datumtijd + INTERVAL '1 minute' * COALESCE(
    (SELECT duur_minuten FROM diensten WHERE diensten.id = boekingen.dienst_id), 
    30
  )
WHERE begin_tijd IS NULL OR eind_tijd IS NULL;

-- Step 4: Now make them NOT NULL again
ALTER TABLE boekingen 
ALTER COLUMN begin_tijd SET NOT NULL,
ALTER COLUMN eind_tijd SET NOT NULL;

-- Step 5: Add the check constraint back (but only if eind_tijd > begin_tijd)
ALTER TABLE boekingen 
ADD CONSTRAINT check_tijd_validiteit 
CHECK (eind_tijd > begin_tijd);
