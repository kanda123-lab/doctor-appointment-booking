-- Update appointments table to match new time slot booking system

-- First, clear any existing data
TRUNCATE TABLE appointments CASCADE;

-- Add new columns and modify existing ones
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS appointment_date DATE,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME;

-- Update the table structure
UPDATE appointments SET 
  appointment_date = scheduled_time::date,
  start_time = scheduled_time::time,
  end_time = (scheduled_time + (duration_minutes || ' minutes')::interval)::time
WHERE scheduled_time IS NOT NULL;

-- Drop old columns
ALTER TABLE appointments DROP COLUMN IF EXISTS scheduled_time;
ALTER TABLE appointments DROP COLUMN IF EXISTS duration_minutes;
ALTER TABLE appointments DROP COLUMN IF EXISTS consultation_fee;

-- Update status check constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'));

-- Make required columns NOT NULL
ALTER TABLE appointments 
  ALTER COLUMN doctor_id SET NOT NULL,
  ALTER COLUMN patient_id SET NOT NULL,
  ALTER COLUMN appointment_date SET NOT NULL,
  ALTER COLUMN start_time SET NOT NULL,
  ALTER COLUMN end_time SET NOT NULL;

-- Update foreign key constraints to point to profile tables
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;

ALTER TABLE appointments ADD CONSTRAINT appointments_doctor_id_fkey 
  FOREIGN KEY (doctor_id) REFERENCES doctor_profiles(id) ON DELETE CASCADE;
  
ALTER TABLE appointments ADD CONSTRAINT appointments_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES patient_profiles(id) ON DELETE CASCADE;

-- Add exclusion constraint to prevent overlapping appointments
ALTER TABLE appointments ADD CONSTRAINT no_doctor_overlap 
  EXCLUDE USING gist (
    doctor_id WITH =,
    appointment_date WITH =,
    tsrange(start_time::text, end_time::text, '[)') WITH &&
  ) WHERE (status IN ('pending', 'confirmed'));

-- Create/update indexes
DROP INDEX IF EXISTS idx_appointments_doctor_date;
DROP INDEX IF EXISTS idx_appointments_date_time;

CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX idx_appointments_date_time ON appointments(appointment_date, start_time);