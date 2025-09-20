-- Simple admin_users table creation
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Add foreign key constraint with CASCADE delete
ALTER TABLE admin_users 
ADD CONSTRAINT fk_admin_users_auth_users 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Simple policy - only authenticated users can access
CREATE POLICY "Authenticated users can manage admin_users" ON admin_users
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Insert your current admin user (replace with your actual admin email)
-- First, get your user ID from auth.users table:
-- SELECT id, email FROM auth.users WHERE email = 'your-admin-email@example.com';

-- Then insert (replace the UUID with your actual user ID):
-- INSERT INTO admin_users (id, email, role) 
-- VALUES ('your-user-uuid-here', 'your-admin-email@example.com', 'admin');
