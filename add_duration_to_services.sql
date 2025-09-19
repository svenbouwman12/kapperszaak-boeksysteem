-- Add duration column to diensten table
ALTER TABLE diensten 
ADD COLUMN duur_minuten INTEGER DEFAULT 30;

-- Update existing services with default duration (30 minutes)
UPDATE diensten 
SET duur_minuten = 30 
WHERE duur_minuten IS NULL;

-- Add some example durations for different services
UPDATE diensten 
SET duur_minuten = 45 
WHERE naam ILIKE '%knippen%' OR naam ILIKE '%cut%';

UPDATE diensten 
SET duur_minuten = 60 
WHERE naam ILIKE '%wassen%' OR naam ILIKE '%wash%';

UPDATE diensten 
SET duur_minuten = 15 
WHERE naam ILIKE '%scheren%' OR naam ILIKE '%shave%';
