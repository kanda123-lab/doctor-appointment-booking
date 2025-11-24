import api from './api';
import { Doctor } from '../types';

export const doctorService = {
  getDoctors: async (): Promise<Doctor[]> => {
    const response = await api.get('/api/doctors');
    return response.data.data.doctors;
  },

  getAvailableDoctors: async (): Promise<Doctor[]> => {
    const response = await api.get('/api/doctors/available');
    return response.data.data.doctors;
  },

  getDoctorById: async (doctorId: string): Promise<Doctor> => {
    const response = await api.get(`/api/doctors/${doctorId}`);
    return response.data.data.doctor;
  },

  updateAvailability: async (doctorId: string, isAvailable: boolean): Promise<Doctor> => {
    const response = await api.put(`/api/doctors/${doctorId}/availability`, {
      is_available: isAvailable
    });
    return response.data.data.doctor;
  },

  updateProfile: async (doctorId: string, profileData: Partial<Doctor>): Promise<Doctor> => {
    const response = await api.put(`/api/doctors/${doctorId}`, profileData);
    return response.data.data.doctor;
  },
};