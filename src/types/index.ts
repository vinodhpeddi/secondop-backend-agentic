export interface User {
  id: string;
  email: string;
  phone?: string;
  password_hash?: string;
  user_type: 'patient' | 'doctor';
  is_verified: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface Patient {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: Date;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  blood_type?: string;
  allergies?: string[];
  current_medications?: string[];
  medical_conditions?: string[];
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Doctor {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  sub_specialties?: string[];
  license_number: string;
  years_of_experience?: number;
  hospital_affiliation?: string;
  education?: string[];
  certifications?: string[];
  languages?: string[];
  bio?: string;
  consultation_fee?: number;
  rating: number;
  review_count: number;
  avatar_url?: string;
  country?: string;
  city?: string;
  is_verified: boolean;
  is_available: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Case {
  id: string;
  case_number: string;
  patient_id: string;
  title: string;
  description?: string;
  specialty?: string;
  status: string;
  priority: string;
  urgency_level: string;
  submitted_date: Date;
  due_date?: Date;
  completed_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  case_id: string;
  sender_id: string;
  receiver_id: string;
  message_type: string;
  content: string;
  attachments?: any;
  is_read: boolean;
  read_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Appointment {
  id: string;
  appointment_number: string;
  patient_id: string;
  doctor_id: string;
  case_id?: string;
  appointment_type: string;
  scheduled_date: Date;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  notes?: string;
  video_room_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface HealthMetric {
  id: string;
  patient_id: string;
  metric_type: string;
  value: number;
  unit: string;
  recorded_at: Date;
  notes?: string;
  is_normal?: boolean;
  metadata?: any;
  created_at: Date;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  case_id?: string;
  prescription_number: string;
  status: string;
  issued_date: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Medication {
  id: string;
  prescription_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  start_date: Date;
  end_date?: Date;
  instructions?: string;
  side_effects?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface LabResult {
  id: string;
  patient_id: string;
  case_id?: string;
  lab_name?: string;
  test_name: string;
  test_category?: string;
  result_value?: string;
  unit?: string;
  reference_range?: string;
  is_abnormal: boolean;
  test_date: Date;
  result_date?: Date;
  notes?: string;
  file_id?: string;
  created_at: Date;
  updated_at: Date;
}

