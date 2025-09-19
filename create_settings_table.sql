-- Create settings table for loyalty program configuration
-- This script creates a table to store system settings

-- Step 1: Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Insert default settings
INSERT INTO settings (key, value, description) VALUES
  ('loyalty_enabled', 'true', 'Enable loyalty program'),
  ('points_per_appointment', '25', 'Points awarded per appointment'),
  ('points_for_discount', '100', 'Points required for discount'),
  ('discount_percentage', '50', 'Discount percentage when threshold is reached')
ON CONFLICT (key) DO NOTHING;

-- Step 3: Create function to get setting value
CREATE OR REPLACE FUNCTION get_setting(setting_key VARCHAR)
RETURNS TEXT AS $$
DECLARE
  setting_value TEXT;
BEGIN
  SELECT value INTO setting_value FROM settings WHERE key = setting_key;
  RETURN COALESCE(setting_value, '');
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create function to update setting value
CREATE OR REPLACE FUNCTION update_setting(setting_key VARCHAR, setting_value TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO settings (key, value, updated_at)
  VALUES (setting_key, setting_value, NOW())
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
