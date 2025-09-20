-- Create admin_users table for user management
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_users table
-- Only admins can view all users
CREATE POLICY "Admins can view all users" ON admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Only admins can insert new users
CREATE POLICY "Admins can insert users" ON admin_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Only admins can update users
CREATE POLICY "Admins can update users" ON admin_users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Only admins can delete users
CREATE POLICY "Admins can delete users" ON admin_users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Users can view their own record
CREATE POLICY "Users can view own record" ON admin_users
  FOR SELECT
  USING (id = auth.uid());

-- Insert the current admin user (replace with actual admin user ID)
-- You'll need to get this from your auth.users table first
-- INSERT INTO admin_users (id, email, role, created_by)
-- SELECT 
--   id, 
--   email, 
--   'admin'::VARCHAR(50), 
--   id 
-- FROM auth.users 
-- WHERE email = 'your-admin-email@example.com'
-- LIMIT 1;

-- Create a function to get user permissions
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID DEFAULT auth.uid())
RETURNS VARCHAR(50) AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM admin_users 
    WHERE id = user_id 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(permission_type VARCHAR(50), user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR(50);
BEGIN
  user_role := get_user_role(user_id);
  
  CASE permission_type
    WHEN 'manage_users' THEN
      RETURN user_role = 'admin';
    WHEN 'manage_settings' THEN
      RETURN user_role IN ('admin');
    WHEN 'manage_appointments' THEN
      RETURN user_role IN ('admin', 'manager', 'staff');
    WHEN 'manage_customers' THEN
      RETURN user_role IN ('admin', 'manager', 'staff');
    WHEN 'manage_barbers' THEN
      RETURN user_role IN ('admin', 'manager');
    WHEN 'view_statistics' THEN
      RETURN user_role IN ('admin', 'manager', 'staff', 'viewer');
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
