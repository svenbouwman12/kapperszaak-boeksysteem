-- Simple settings table creation
-- Run this in Supabase SQL Editor

-- Step 1: Create the table
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Insert default values
INSERT INTO settings (key, value, description) VALUES
  ('loyalty_enabled', 'true', 'Enable loyalty program'),
  ('points_per_appointment', '25', 'Points awarded per appointment'),
  ('points_for_discount', '100', 'Points required for discount'),
  ('discount_percentage', '50', 'Discount percentage when threshold is reached');

-- Step 3: Verify the table was created
SELECT * FROM settings;
