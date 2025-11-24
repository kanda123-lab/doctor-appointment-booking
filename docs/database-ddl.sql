-- =====================================================
-- Doctor Appointment Virtual Queue System - DDL Script
-- =====================================================
-- Version: 1.0
-- Created: 2025-11-15
-- Description: Complete database schema for doctor appointment virtual queue management system
-- Features: User management, Doctor/Patient profiles, Appointment scheduling, Virtual queue system
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Base users table for authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Doctors profile table
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20),
    consultation_fee DECIMAL(10,2),
    is_available BOOLEAN DEFAULT false,
    working_hours JSONB, -- Store working schedule as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients profile table
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    phone VARCHAR(20),
    address TEXT,
    emergency_contact JSONB, -- Store emergency contact info as JSON
    medical_history TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
    appointment_type VARCHAR(50) DEFAULT 'consultation',
    notes TEXT,
    consultation_fee DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Virtual queue management table
CREATE TABLE queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    queue_number INTEGER NOT NULL,
    priority_level INTEGER DEFAULT 1, -- 1=normal, 2=urgent, 3=emergency
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_consultation', 'completed', 'missed')),
    estimated_wait_time INTEGER, -- in minutes
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    called_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Queue history for analytics and reporting
CREATE TABLE queue_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES doctors(id),
    patient_id UUID REFERENCES patients(id),
    appointment_id UUID REFERENCES appointments(id),
    queue_number INTEGER NOT NULL,
    priority_level INTEGER,
    wait_time_minutes INTEGER,
    consultation_duration_minutes INTEGER,
    queue_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- User table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Doctor table indexes
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_doctors_availability ON doctors(is_available);

-- Patient table indexes
CREATE INDEX idx_patients_user_id ON patients(user_id);

-- Appointments table indexes
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_scheduled_time ON appointments(scheduled_time);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Queue table indexes
CREATE INDEX idx_queue_doctor_id ON queue(doctor_id);
CREATE INDEX idx_queue_patient_id ON queue(patient_id);
CREATE INDEX idx_queue_status ON queue(status);
CREATE INDEX idx_queue_joined_at ON queue(joined_at);
CREATE INDEX idx_queue_priority_status ON queue(priority_level, status);

-- Queue history indexes
CREATE INDEX idx_queue_history_date ON queue_history(queue_date);
CREATE INDEX idx_queue_history_doctor_date ON queue_history(doctor_id, queue_date);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at 
    BEFORE UPDATE ON doctors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at 
    BEFORE UPDATE ON patients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Function to get next queue number for a doctor on current date
CREATE OR REPLACE FUNCTION get_next_queue_number(doctor_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(queue_number), 0) + 1 
    INTO next_number 
    FROM queue 
    WHERE doctor_id = doctor_uuid 
    AND DATE(joined_at) = CURRENT_DATE;
    
    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate estimated wait time based on queue position and priority
CREATE OR REPLACE FUNCTION calculate_wait_time(doctor_uuid UUID, priority INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
    avg_consultation_time INTEGER := 30; -- default 30 minutes per consultation
    queue_position INTEGER;
    estimated_time INTEGER;
BEGIN
    -- Get position in queue considering priority (higher priority goes first)
    SELECT COUNT(*) + 1
    INTO queue_position
    FROM queue
    WHERE doctor_id = doctor_uuid
    AND status = 'waiting'
    AND priority_level >= priority
    AND DATE(joined_at) = CURRENT_DATE;
    
    -- Calculate estimated wait time
    estimated_time := (queue_position - 1) * avg_consultation_time;
    
    RETURN GREATEST(estimated_time, 0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA (for development/testing)
-- =====================================================

-- Note: Sample data can be inserted using the initialization script
-- This includes sample users, doctors, patients, and appointments
-- Password for all sample users: "password123" (hashed with bcrypt)

-- =====================================================
-- SECURITY CONSIDERATIONS
-- =====================================================

-- 1. All passwords are stored as bcrypt hashes
-- 2. UUID primary keys to prevent enumeration attacks
-- 3. Cascading deletes for data consistency
-- 4. Check constraints for data validation
-- 5. Indexes for performance on frequently queried columns
-- 6. JSONB fields for flexible emergency contact and working hours storage

-- =====================================================
-- MAINTENANCE NOTES
-- =====================================================

-- 1. Queue table should be periodically cleaned of completed entries
-- 2. Queue history provides analytics data and can be archived
-- 3. Monitor queue performance and adjust avg_consultation_time in calculate_wait_time function
-- 4. Consider partitioning queue_history by date for large datasets
-- 5. Regular backup strategy should include all tables

-- =====================================================
-- END OF DDL SCRIPT
-- =====================================================