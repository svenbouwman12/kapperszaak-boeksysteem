# Database Setup voor Gebruikers Beheer

## Stap 1: SQL Script uitvoeren

1. Ga naar je **Supabase Dashboard**
2. Klik op **SQL Editor** in het menu
3. Kopieer en plak de volgende SQL code:

```sql
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
```

4. Klik op **Run** om het script uit te voeren

## Stap 2: Je eerste admin gebruiker toevoegen

1. Ga naar **Authentication** → **Users** in Supabase
2. Zoek je eigen gebruiker en kopieer het **User ID** (UUID)
3. Ga terug naar **SQL Editor** en voer dit uit:

```sql
-- Vervang 'jouw-user-uuid' met je echte User ID
-- Vervang 'jouw-email@example.com' met je echte email
INSERT INTO admin_users (id, email, role) 
VALUES ('jouw-user-uuid', 'jouw-email@example.com', 'admin');
```

## Stap 3: Testen

1. Ga naar je admin panel
2. Klik op de **Gebruikers** tab
3. Je zou nu je eigen gebruiker moeten zien met de rol "Administrator"
4. Je kunt nu nieuwe gebruikers toevoegen via de interface

## Problemen oplossen

### Error: "relation admin_users does not exist"
- Zorg ervoor dat je het SQL script hebt uitgevoerd in Supabase

### Error: "permission denied"
- Controleer of je ingelogd bent als admin gebruiker
- Zorg ervoor dat je eigen gebruiker de rol "admin" heeft

### Error: "foreign key constraint"
- Zorg ervoor dat de User ID bestaat in de auth.users tabel
- Controleer of je de juiste UUID hebt gebruikt

## Rollen uitleg

- **🔑 Administrator**: Alle rechten, kan gebruikers beheren
- **👨‍💼 Manager**: Kan afspraken, klanten en barbers beheren
- **👤 Medewerker**: Kan afspraken bekijken en wijzigen
- **👁️ Bekijker**: Alleen bekijken, geen wijzigingen
