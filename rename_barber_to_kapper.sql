-- SQL Script to rename all barber references to kapper
-- Execute this script in your Supabase SQL editor

-- 1. Rename the barbers table to kappers
ALTER TABLE barbers RENAME TO kappers;

-- 2. Rename barber_id columns to kapper_id in other tables
ALTER TABLE appointments RENAME COLUMN barber_id TO kapper_id;
ALTER TABLE barber_availability RENAME COLUMN barber_id TO kapper_id;

-- 3. Rename barber_availability table to kapper_availability
ALTER TABLE barber_availability RENAME TO kapper_availability;

-- 4. Update any constraints or indexes that reference the old names
-- (These will be automatically updated by PostgreSQL, but you can verify with:)
-- \d+ appointments
-- \d+ kapper_availability

-- 5. Update any RLS policies that reference barbers
-- Drop old policies
DROP POLICY IF EXISTS "Barbers are viewable by everyone" ON kappers;
DROP POLICY IF EXISTS "Anyone can insert barbers" ON kappers;
DROP POLICY IF EXISTS "Anyone can update barbers" ON kappers;
DROP POLICY IF EXISTS "Anyone can delete barbers" ON kappers;

-- Create new policies for kappers
CREATE POLICY "Kappers are viewable by everyone" ON kappers
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert kappers" ON kappers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update kappers" ON kappers
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete kappers" ON kappers
    FOR DELETE USING (true);

-- Update kapper_availability policies
DROP POLICY IF EXISTS "Availability is viewable by everyone" ON kapper_availability;
DROP POLICY IF EXISTS "Anyone can insert availability" ON kapper_availability;
DROP POLICY IF EXISTS "Anyone can update availability" ON kapper_availability;
DROP POLICY IF EXISTS "Anyone can delete availability" ON kapper_availability;

CREATE POLICY "Availability is viewable by everyone" ON kapper_availability
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert availability" ON kapper_availability
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update availability" ON kapper_availability
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete availability" ON kapper_availability
    FOR DELETE USING (true);

-- 6. Update any existing data if needed (optional)
-- If you have any data that needs to be updated, add those queries here

-- 7. Verify the changes
SELECT 'Tables renamed successfully' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%kapper%';
