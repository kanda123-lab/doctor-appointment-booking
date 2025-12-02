import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, Doctor, Patient } from './types';
import { SimpleAuthProvider } from './context/SimpleAuthContext';
import Home from './components/Home';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import AdminDashboard from './components/AdminDashboard';

// Mock user data - no authentication needed
const mockDoctor: Doctor = {
  id: 'c2370ee0-c76c-4229-b235-a56d81c51aa5',
  user_id: 'e8ad06a0-1cc8-4bcf-9a2a-8a165f670844',
  first_name: 'Monisha',
  last_name: '',
  specialization: 'General Medicine',
  license_number: 'MD12345',
  phone: '+91-9876543210',
  consultation_fee: 250,
  is_available: true,
  working_hours: null,
  created_at: '2025-11-22T00:00:00Z',
  updated_at: '2025-11-22T00:00:00Z'
};

const mockPatient: Patient = {
  id: '770e8400-e29b-41d4-a716-446655440001',
  user_id: '7e4c7e0f-f0b5-4c68-a7c9-7c85a8b7ef27',
  first_name: 'Monisha',
  last_name: 'Patel',
  date_of_birth: '1990-05-15',
  phone: '+91-9876543210',
  address: '123 Medical Center, Mumbai, Maharashtra 400001',
  emergency_contact: '+91-9123456789',
  medical_history: 'No known allergies. Previous consultations for general health checkups.',
  created_at: '2025-11-22T00:00:00Z',
  updated_at: '2025-11-22T00:00:00Z'
};

const mockDoctorUser: User = {
  id: 'e8ad06a0-1cc8-4bcf-9a2a-8a165f670844',
  email: 'monisha@clinic.com',
  role: 'doctor',
  created_at: '2025-11-22T00:00:00Z',
  updated_at: '2025-11-22T00:00:00Z'
};

const mockPatientUser: User = {
  id: '7e4c7e0f-f0b5-4c68-a7c9-7c85a8b7ef27',
  email: 'monisha.patel@example.com',
  role: 'patient',
  created_at: '2025-11-22T00:00:00Z',
  updated_at: '2025-11-22T00:00:00Z'
};

// Wrapper components that provide the right user context
const DoctorWrapper: React.FC = () => {
  return (
    <SimpleAuthProvider user={mockDoctorUser} profile={mockDoctor}>
      <DoctorDashboard />
    </SimpleAuthProvider>
  );
};

const PatientWrapper: React.FC = () => {
  return (
    <SimpleAuthProvider user={mockPatientUser} profile={mockPatient}>
      <PatientDashboard />
    </SimpleAuthProvider>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/doctor" element={<DoctorWrapper />} />
          <Route path="/patient" element={<PatientWrapper />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
