-- Check if settings table exists and has data
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'settings' 
ORDER BY ordinal_position;

-- Check if there's any data in settings table
SELECT * FROM settings;
