-- Disable email verification for admin users
-- Run this script in Supabase SQL Editor

-- Create a function to automatically confirm admin users
CREATE OR REPLACE FUNCTION auto_confirm_admin_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this user is in admin_users table
  IF EXISTS (SELECT 1 FROM admin_users WHERE id = NEW.id) THEN
    -- Mark as email confirmed
    NEW.email_confirmed_at = NOW();
    NEW.confirmed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically confirm admin users
DROP TRIGGER IF EXISTS trigger_auto_confirm_admin_users ON auth.users;
CREATE TRIGGER trigger_auto_confirm_admin_users
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_admin_users();

-- Alternative: Disable email confirmation globally for your project
-- Go to Authentication > Settings in Supabase Dashboard and disable "Enable email confirmations"

-- Or update existing admin users to be confirmed
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE id IN (
  SELECT id FROM admin_users
);
