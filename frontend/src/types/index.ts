export interface User {
  id: string;
  email: string;
  role: 'doctor' | 'patient' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  license_number: string;
  phone?: string;
  consultation_fee: number;
  is_available: boolean;
  working_hours?: any;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone?: string;
  address?: string;
  emergency_contact?: any;
  medical_history?: string;
  created_at: string;
  updated_at: string;
}

export interface QueueEntry {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_id?: string;
  queue_number: number;
  priority_level: number;
  status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'missed';
  estimated_wait_time: number;
  joined_at: string;
  called_at?: string;
  completed_at?: string;
  updated_at: string;
  notes?: string;
  // Additional fields when fetching queue details
  patient_first_name?: string;
  patient_last_name?: string;
  patient_phone?: string;
  appointment_type?: string;
  appointment_notes?: string;
}

export interface QueueStats {
  total_patients: string;
  waiting: string;
  called: string;
  in_consultation: string;
  completed: string;
  missed: string;
  avg_estimated_wait_time: string | null;
  last_queue_number: number | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  status: string;
  message: string;
  data: {
    user: User;
    profile: Doctor | Patient;
    tokens: AuthTokens;
  };
}

export interface RegisterData {
  email: string;
  password: string;
  role: 'doctor' | 'patient';
  profile: {
    first_name: string;
    last_name: string;
    specialization?: string;
    license_number?: string;
    consultation_fee?: number;
    date_of_birth?: string;
    phone?: string;
    address?: string;
  };
}

export interface QueueJoinData {
  doctor_id: string;
  patient_id: string;
  appointment_id?: string;
  priority_level?: number;
  notes?: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data?: T;
}

export interface AuthContextType {
  user: User | null;
  profile: Doctor | Patient | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}