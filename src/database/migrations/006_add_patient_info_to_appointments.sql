-- Add patient name and phone columns to appointments table
-- This allows storing patient information directly with each appointment

ALTER TABLE appointments 
ADD COLUMN patient_name VARCHAR(255),
ADD COLUMN patient_phone VARCHAR(50);

-- Update existing appointments to use patient information from patients table
UPDATE appointments 
SET 
  patient_name = CONCAT(p.first_name, CASE WHEN p.last_name IS NOT NULL AND p.last_name != '' THEN CONCAT(' ', p.last_name) ELSE '' END),
  patient_phone = p.phone
FROM patients p 
WHERE appointments.patient_id = p.id;

-- Add indexes for better query performance
CREATE INDEX idx_appointments_patient_name ON appointments(patient_name);
CREATE INDEX idx_appointments_patient_phone ON appointments(patient_phone);