-- Healthcare Management System Database Schema

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS insurance_claims CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS healthcare_providers CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- Patients table
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    phone VARCHAR(20),
    address TEXT,
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Healthcare Providers table
CREATE TABLE healthcare_providers (
    id SERIAL PRIMARY KEY,
    provider_name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    facility_name VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    accepting_patients BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on-leave')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medical Records table
CREATE TABLE medical_records (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    record_number VARCHAR(20) UNIQUE NOT NULL,
    record_type VARCHAR(20) NOT NULL CHECK (record_type IN ('general', 'specialist')),
    blood_type VARCHAR(5),
    allergies TEXT,
    chronic_conditions TEXT,
    current_medications TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'transferred')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    medical_record_id INTEGER REFERENCES medical_records(id) ON DELETE CASCADE,
    provider_id INTEGER REFERENCES healthcare_providers(id) ON DELETE RESTRICT,
    appointment_type VARCHAR(50) NOT NULL,
    appointment_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 30 CHECK (duration_minutes > 0),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
    notes TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insurance Claims table
CREATE TABLE insurance_claims (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    claim_amount DECIMAL(15,2) NOT NULL CHECK (claim_amount > 0),
    coverage_percentage DECIMAL(5,2) NOT NULL CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
    copay_amount DECIMAL(15,2) DEFAULT 0.00,
    deductible_amount DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'paid', 'appealed')),
    claim_type VARCHAR(50) NOT NULL,
    service_date DATE NOT NULL,
    provider_name VARCHAR(100),
    diagnosis_code VARCHAR(20),
    procedure_code VARCHAR(20),
    notes TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processed_by VARCHAR(100)
);

-- Create indexes for better query performance
CREATE INDEX idx_healthcare_providers_specialty ON healthcare_providers(specialty);
CREATE INDEX idx_healthcare_providers_status ON healthcare_providers(status);
CREATE INDEX idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX idx_appointments_medical_record_id ON appointments(medical_record_id);
CREATE INDEX idx_appointments_provider_id ON appointments(provider_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date DESC);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_insurance_claims_patient_id ON insurance_claims(patient_id);
CREATE INDEX idx_insurance_claims_status ON insurance_claims(status);

-- Function to generate medical record number
CREATE OR REPLACE FUNCTION generate_record_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    new_number VARCHAR(20);
    number_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate random 10-digit medical record number with MRN prefix
        new_number := 'MRN' || LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0');
        
        -- Check if number already exists
        SELECT EXISTS(SELECT 1 FROM medical_records WHERE record_number = new_number) INTO number_exists;
        
        -- Exit loop if number is unique
        EXIT WHEN NOT number_exists;
    END LOOP;
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_healthcare_providers_updated_at BEFORE UPDATE ON healthcare_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert demo data
-- Insert demo healthcare providers
INSERT INTO healthcare_providers (provider_name, specialty, facility_name, phone, email, accepting_patients) VALUES
('Dr. Sarah Johnson', 'Family Medicine', 'City Medical Center', '555-1001', 'sjohnson@citymedical.com', true),
('Dr. Michael Chen', 'Cardiology', 'Heart Health Institute', '555-1002', 'mchen@hearthealthinst.com', true),
('Dr. Emily Rodriguez', 'Pediatrics', 'Children''s Healthcare', '555-1003', 'erodriguez@childrenshealth.com', true),
('Dr. James Wilson', 'Orthopedics', 'Sports Medicine Clinic', '555-1004', 'jwilson@sportsmedclinic.com', true),
('Dr. Lisa Anderson', 'Dermatology', 'Skin Care Specialists', '555-1005', 'landerson@skincarespecs.com', true),
('Dr. Robert Taylor', 'Internal Medicine', 'City Medical Center', '555-1006', 'rtaylor@citymedical.com', true),
('Dr. Maria Garcia', 'Obstetrics & Gynecology', 'Women''s Health Center', '555-1007', 'mgarcia@womenshealthctr.com', true),
('Dr. David Kim', 'Psychiatry', 'Mental Wellness Clinic', '555-1008', 'dkim@mentalwellness.com', true),
('Dr. Jennifer Lee', 'Ophthalmology', 'Vision Care Institute', '555-1009', 'jlee@visioncareinst.com', true),
('Dr. Thomas Brown', 'Dentistry', 'Dental Excellence', '555-1010', 'tbrown@dentalexcellence.com', true);

-- Password for all patients is 'demo123'
INSERT INTO patients (username, email, password_hash, first_name, last_name, date_of_birth, phone, emergency_contact, emergency_phone) VALUES
('demo', 'demo@healthcare.com', '$2b$10$nKaMeo4wFIQHdbdOXzzzfus80x3LNh3RD8kXXR2QgSXYyW/Zf0Dde', 'Demo', 'Patient', '1985-06-15', '555-0100', 'Jane Patient', '555-0101'),
('john.smith', 'john.smith@example.com', '$2b$10$nKaMeo4wFIQHdbdOXzzzfus80x3LNh3RD8kXXR2QgSXYyW/Zf0Dde', 'John', 'Smith', '1978-03-22', '555-0200', 'Mary Smith', '555-0201'),
('sarah.johnson', 'sarah.johnson@example.com', '$2b$10$nKaMeo4wFIQHdbdOXzzzfus80x3LNh3RD8kXXR2QgSXYyW/Zf0Dde', 'Sarah', 'Johnson', '1992-11-08', '555-0300', 'Mike Johnson', '555-0301'),
('michael.chen', 'michael.chen@example.com', '$2b$10$nKaMeo4wFIQHdbdOXzzzfus80x3LNh3RD8kXXR2QgSXYyW/Zf0Dde', 'Michael', 'Chen', '1965-07-30', '555-0400', 'Linda Chen', '555-0401'),
('emily.davis', 'emily.davis@example.com', '$2b$10$nKaMeo4wFIQHdbdOXzzzfus80x3LNh3RD8kXXR2QgSXYyW/Zf0Dde', 'Emily', 'Davis', '1988-04-17', '555-0500', 'Robert Davis', '555-0501'),
('david.wilson', 'david.wilson@example.com', '$2b$10$nKaMeo4wFIQHdbdOXzzzfus80x3LNh3RD8kXXR2QgSXYyW/Zf0Dde', 'David', 'Wilson', '1975-09-25', '555-0600', 'Jennifer Wilson', '555-0601');

-- Insert demo medical records
INSERT INTO medical_records (patient_id, record_number, record_type, blood_type, allergies, chronic_conditions) VALUES
(1, 'MRN0001234', 'general', 'O+', 'Penicillin', 'None'),
(1, 'MRN0001235', 'specialist', 'O+', 'Penicillin', 'None'),
(2, 'MRN0002345', 'general', 'A+', 'None', 'Type 2 Diabetes'),
(3, 'MRN0003456', 'general', 'B+', 'Latex', 'Asthma'),
(4, 'MRN0004567', 'general', 'AB+', 'None', 'Hypertension'),
(5, 'MRN0005678', 'general', 'O-', 'Sulfa drugs', 'None'),
(6, 'MRN0006789', 'specialist', 'A-', 'None', 'Arthritis');

-- Insert demo appointments
INSERT INTO appointments (medical_record_id, provider_id, appointment_type, appointment_date, status, notes) VALUES
(1, 1, 'general-checkup', '2026-06-01 10:00:00', 'scheduled', 'Annual physical examination'),
(2, 2, 'specialist-consultation', '2026-05-28 14:30:00', 'completed', 'Cardiology consultation'),
(3, 1, 'follow-up', '2026-06-15 09:00:00', 'scheduled', 'Diabetes management follow-up');

-- Insert demo insurance claim
INSERT INTO insurance_claims (patient_id, claim_amount, coverage_percentage, copay_amount, status, claim_type, service_date, provider_name, diagnosis_code) VALUES
(1, 2500.00, 80.0, 50.00, 'approved', 'Preventive Care', '2026-05-15', 'Dr. Sarah Johnson', 'Z00.00');

COMMENT ON TABLE patients IS 'Healthcare system patients';
COMMENT ON TABLE healthcare_providers IS 'Healthcare providers and medical professionals';
COMMENT ON TABLE medical_records IS 'Patient medical records and health information';
COMMENT ON TABLE appointments IS 'Patient appointment history and scheduling';
COMMENT ON TABLE insurance_claims IS 'Insurance claim applications and processing';

-- Made with Bob
