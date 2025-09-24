-- QUICK FIX: Voeg ontbrekende RLS policies toe voor kappers en diensten

-- Voeg ALL access policy toe voor kappers
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kappers' AND policyname = 'Enable all access for all users') THEN
    CREATE POLICY "Enable all access for all users" ON kappers FOR ALL USING (true);
  END IF;
END $$;

-- Voeg ALL access policy toe voor diensten  
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diensten' AND policyname = 'Enable all access for all users') THEN
    CREATE POLICY "Enable all access for all users" ON diensten FOR ALL USING (true);
  END IF;
END $$;

-- Controleer policies
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('kappers', 'diensten') ORDER BY tablename, policyname;
