-- SecondOp Database Seed Data
-- This file contains sample data for development and testing

-- Insert subscription plans
INSERT INTO subscription_plans (name, description, price, billing_cycle, features, question_limit, is_active) VALUES
('Basic', 'Perfect for occasional consultations', 29.99, 'monthly', 
 '{"features": ["5 questions per month", "Email support", "Basic health tracking", "Document upload"]}', 
 5, true),
('Standard', 'Great for regular health monitoring', 49.99, 'monthly',
 '{"features": ["15 questions per month", "Priority email support", "Advanced health tracking", "Unlimited document upload", "Video consultations"]}',
 15, true),
('Premium', 'Comprehensive healthcare management', 99.99, 'monthly',
 '{"features": ["Unlimited questions", "24/7 priority support", "Advanced health tracking", "Unlimited document upload", "Video consultations", "Dedicated health advisor"]}',
 -1, true),
('Annual Basic', 'Basic plan with annual billing', 299.99, 'yearly',
 '{"features": ["5 questions per month", "Email support", "Basic health tracking", "Document upload", "2 months free"]}',
 5, true);

-- Insert sample doctors (passwords are 'password123' hashed with bcrypt)
INSERT INTO users (email, phone, password_hash, user_type, is_verified, is_active) VALUES
('dr.smith@secondop.com', '+1234567890', '$2a$10$rKZvVvJvJvJvJvJvJvJvJeO7vJvJvJvJvJvJvJvJvJvJvJvJvJvJv', 'doctor', true, true),
('dr.johnson@secondop.com', '+1234567891', '$2a$10$rKZvVvJvJvJvJvJvJvJvJeO7vJvJvJvJvJvJvJvJvJvJvJvJvJvJv', 'doctor', true, true),
('dr.williams@secondop.com', '+1234567892', '$2a$10$rKZvVvJvJvJvJvJvJvJvJeO7vJvJvJvJvJvJvJvJvJvJvJvJvJvJv', 'doctor', true, true);

-- Get the user IDs for the doctors
DO $$
DECLARE
  smith_id UUID;
  johnson_id UUID;
  williams_id UUID;
BEGIN
  SELECT id INTO smith_id FROM users WHERE email = 'dr.smith@secondop.com';
  SELECT id INTO johnson_id FROM users WHERE email = 'dr.johnson@secondop.com';
  SELECT id INTO williams_id FROM users WHERE email = 'dr.williams@secondop.com';

  -- Insert doctor profiles
  INSERT INTO doctors (user_id, first_name, last_name, specialty, sub_specialties, license_number, years_of_experience, hospital_affiliation, education, certifications, languages, bio, consultation_fee, rating, review_count, country, city, is_verified, is_available) VALUES
  (smith_id, 'John', 'Smith', 'Cardiology', ARRAY['Interventional Cardiology', 'Heart Failure'], 'MD123456', 15, 'Mayo Clinic', 
   ARRAY['MD - Harvard Medical School', 'Residency - Johns Hopkins'], 
   ARRAY['Board Certified Cardiologist', 'FACC'], 
   ARRAY['English', 'Spanish'], 
   'Dr. Smith is a board-certified cardiologist with over 15 years of experience in treating complex cardiac conditions.',
   150.00, 4.8, 127, 'United States', 'Rochester, MN', true, true),
  
  (johnson_id, 'Emily', 'Johnson', 'Oncology', ARRAY['Breast Cancer', 'Lung Cancer'], 'MD789012', 12, 'MD Anderson Cancer Center',
   ARRAY['MD - Stanford University', 'Fellowship - Memorial Sloan Kettering'],
   ARRAY['Board Certified Oncologist', 'ASCO Member'],
   ARRAY['English', 'French'],
   'Dr. Johnson specializes in personalized cancer treatment with a focus on breast and lung cancers.',
   175.00, 4.9, 203, 'United States', 'Houston, TX', true, true),
  
  (williams_id, 'Michael', 'Williams', 'Neurology', ARRAY['Stroke', 'Epilepsy', 'Movement Disorders'], 'MD345678', 20, 'Cleveland Clinic',
   ARRAY['MD - Yale School of Medicine', 'Residency - Massachusetts General Hospital'],
   ARRAY['Board Certified Neurologist', 'FAAN'],
   ARRAY['English', 'German', 'Italian'],
   'Dr. Williams is a renowned neurologist with expertise in stroke management and movement disorders.',
   200.00, 4.7, 156, 'United States', 'Cleveland, OH', true, true);
END $$;

-- Insert a sample patient (password is 'password123')
INSERT INTO users (email, phone, password_hash, user_type, is_verified, is_active) VALUES
('patient@example.com', '+1234567899', '$2a$10$rKZvVvJvJvJvJvJvJvJvJeO7vJvJvJvJvJvJvJvJvJvJvJvJvJvJv', 'patient', true, true);

DO $$
DECLARE
  patient_user_id UUID;
  patient_id UUID;
BEGIN
  SELECT id INTO patient_user_id FROM users WHERE email = 'patient@example.com';
  
  INSERT INTO patients (user_id, first_name, last_name, date_of_birth, gender, address, city, state, country, postal_code, blood_type)
  VALUES (patient_user_id, 'Jane', 'Doe', '1985-06-15', 'female', '123 Main St', 'New York', 'NY', 'United States', '10001', 'O+')
  RETURNING id INTO patient_id;
  
  -- Create a sample case
  INSERT INTO cases (case_number, patient_id, title, description, specialty, priority, urgency_level, status)
  VALUES ('SO' || EXTRACT(EPOCH FROM NOW())::BIGINT, patient_id, 'Chest Pain Evaluation', 
          'Experiencing intermittent chest pain for the past week. Looking for a second opinion on recent cardiac tests.',
          'Cardiology', 'high', 'urgent', 'pending');
END $$;

COMMIT;

-- Display summary
SELECT 'Seed data inserted successfully!' as message;
SELECT 'Subscription Plans: ' || COUNT(*) as summary FROM subscription_plans;
SELECT 'Doctors: ' || COUNT(*) as summary FROM doctors;
SELECT 'Patients: ' || COUNT(*) as summary FROM patients;
SELECT 'Cases: ' || COUNT(*) as summary FROM cases;

