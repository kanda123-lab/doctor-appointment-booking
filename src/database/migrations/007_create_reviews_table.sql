-- Migration: Create reviews table for patient feedback
-- Description: Table to store patient reviews and ratings for the medical services

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    reviewer_name VARCHAR(255) NOT NULL,
    reviewer_email VARCHAR(255),
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES doctors(id),
    appointment_id UUID REFERENCES appointments(id),
    is_anonymous BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_doctor_id ON reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_patient_id ON reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(is_approved);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_reviews_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE reviews IS 'Patient reviews and ratings for medical services';
COMMENT ON COLUMN reviews.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN reviews.comment IS 'Patient feedback text';
COMMENT ON COLUMN reviews.reviewer_name IS 'Name of the person leaving the review';
COMMENT ON COLUMN reviews.reviewer_email IS 'Email of reviewer (optional)';
COMMENT ON COLUMN reviews.patient_id IS 'Reference to patient (optional for anonymous reviews)';
COMMENT ON COLUMN reviews.doctor_id IS 'Reference to specific doctor (optional)';
COMMENT ON COLUMN reviews.appointment_id IS 'Reference to specific appointment (optional)';
COMMENT ON COLUMN reviews.is_anonymous IS 'Whether the review is anonymous';
COMMENT ON COLUMN reviews.is_approved IS 'Whether the review is approved for public display';
COMMENT ON COLUMN reviews.is_featured IS 'Whether the review is featured/highlighted';