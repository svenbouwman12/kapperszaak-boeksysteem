-- Fix barber availability end times that are stored as 00:00:00
-- This should be run in the Supabase SQL editor

-- First, let's see what we have
SELECT * FROM barber_availability WHERE end_time = '00:00:00';

-- Update all end times from 00:00:00 to 24:00:00
UPDATE barber_availability 
SET end_time = '24:00:00' 
WHERE end_time = '00:00:00';

-- Verify the changes
SELECT * FROM barber_availability;
