-- Disable email verification completely
-- Run this script in Supabase SQL Editor

-- Update all existing users to be confirmed (no email verification needed)
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Note: Also disable email confirmations in Supabase Dashboard:
-- Go to Authentication > Settings and turn off "Enable email confirmations"
