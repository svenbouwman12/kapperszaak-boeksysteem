-- Add shift end validation constraint to prevent appointments that end after barber shift end time
-- This creates a function and trigger that validates appointments before they are inserted/updated

-- First, create a function to validate appointment times
CREATE OR REPLACE FUNCTION validate_appointment_shift_end()
RETURNS TRIGGER AS $$
DECLARE
    appointment_date DATE;
    day_of_week TEXT;
    working_hours RECORD;
    service_duration INTEGER;
    appointment_start_time TIME;
    appointment_end_time TIME;
    shift_end_time TIME;
BEGIN
    -- Get appointment date and day of week
    appointment_date := NEW.datumtijd::DATE;
    day_of_week := LOWER(TO_CHAR(appointment_date, 'Day'));
    day_of_week := TRIM(day_of_week);
    
    -- Get service duration
    SELECT duur_minuten INTO service_duration
    FROM diensten
    WHERE id = NEW.dienst_id;
    
    -- Get working hours for this barber on this day
    SELECT start, "end" INTO working_hours
    FROM barber_availability
    WHERE barber_id = NEW.barber_id
    AND day_of_week = day_of_week;
    
    -- If no working hours found, skip validation (barber doesn't work this day)
    IF working_hours IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Extract time from datetime
    appointment_start_time := NEW.datumtijd::TIME;
    shift_end_time := working_hours."end";
    
    -- Calculate appointment end time
    appointment_end_time := appointment_start_time + (service_duration || ' minutes')::INTERVAL;
    
    -- Check if appointment ends after shift end
    IF appointment_end_time > shift_end_time THEN
        RAISE EXCEPTION 'Appointment would end at % but barber shift ends at % on %', 
            appointment_end_time, shift_end_time, day_of_week;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
DROP TRIGGER IF EXISTS validate_appointment_shift_end_insert ON boekingen;
CREATE TRIGGER validate_appointment_shift_end_insert
    BEFORE INSERT ON boekingen
    FOR EACH ROW
    EXECUTE FUNCTION validate_appointment_shift_end();

-- Create trigger for UPDATE operations
DROP TRIGGER IF EXISTS validate_appointment_shift_end_update ON boekingen;
CREATE TRIGGER validate_appointment_shift_end_update
    BEFORE UPDATE ON boekingen
    FOR EACH ROW
    EXECUTE FUNCTION validate_appointment_shift_end();

-- Test the constraint with an invalid appointment (this should fail)
-- INSERT INTO boekingen (klantnaam, email, telefoon, barber_id, dienst_id, datumtijd)
-- VALUES ('Test', 'test@test.com', '0612345678', 1, 1, '2025-09-20 16:45:00');
-- This should raise an exception if the service duration + start time exceeds shift end

COMMENT ON FUNCTION validate_appointment_shift_end() IS 'Validates that appointments do not end after barber shift end time';
COMMENT ON TRIGGER validate_appointment_shift_end_insert ON boekingen IS 'Prevents insertion of appointments that end after barber shift end time';
COMMENT ON TRIGGER validate_appointment_shift_end_update ON boekingen IS 'Prevents update of appointments that end after barber shift end time';
