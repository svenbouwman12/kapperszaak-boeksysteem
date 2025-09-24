-- Fix RLS Policy voor kapper_availability tabel
-- Voer dit script uit in Supabase SQL Editor om de 403 Forbidden error op te lossen

-- Controleer of de policy al bestaat
DO $$ 
BEGIN
    -- Voeg INSERT/UPDATE/DELETE policy toe voor kapper_availability
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kapper_availability' AND policyname = 'Enable all access for all users') THEN
        CREATE POLICY "Enable all access for all users" ON kapper_availability FOR ALL USING (true);
        RAISE NOTICE 'RLS policy toegevoegd voor kapper_availability tabel';
    ELSE
        RAISE NOTICE 'RLS policy bestaat al voor kapper_availability tabel';
    END IF;
END $$;

-- Controleer bestaande policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'kapper_availability';

-- Test de fix
SELECT 'RLS policy fix completed' as status;
