import api from './api';

export interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  notes: string;
  created_at: string;
  updated_at: string;
  patient_first_name?: string;
  patient_last_name?: string;
  patient_phone?: string;
  patient_email?: string;
  doctor_first_name?: string;
  doctor_last_name?: string;
  specialization?: string;
  consultation_fee?: string;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

export interface CreateAppointmentData {
  doctor_id: string;
  patient_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type?: string;
  notes?: string;
  patient_name?: string;
  patient_phone?: string;
}

class AppointmentService {
  // Get available time slots for a doctor on a specific date
  async getAvailableSlots(doctorId: string, date: string): Promise<TimeSlot[]> {
    try {
      const response = await api.get(`/api/appointments/doctor/${doctorId}/slots?date=${date}`);
      return response.data.data.available_slots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }

  // Create a new appointment
  async createAppointment(appointmentData: CreateAppointmentData): Promise<Appointment> {
    try {
      const response = await api.post('/api/appointments', appointmentData);
      return response.data.data.appointment;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  // Get doctor's appointments
  async getDoctorAppointments(doctorId: string, date?: string, status?: string): Promise<Appointment[]> {
    try {
      let url = `/api/appointments/doctor/${doctorId}`;
      const params = new URLSearchParams();
      
      if (date) params.append('date', date);
      if (status) params.append('status', status);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('Making API call to:', url);
      const response = await api.get(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      console.log('API response status:', response.status);
      console.log('API response data:', response.data);
      console.log('Appointments array:', response.data.data?.appointments);
      console.log('Appointments count:', response.data.data?.appointments?.length);
      return response.data.data?.appointments || [];
    } catch (error: any) {
      console.error('Error getting doctor appointments:', error);
      console.error('Full error:', error.response || error);
      throw error;
    }
  }

  // Get patient's appointments
  async getPatientAppointments(patientId: string, status?: string): Promise<Appointment[]> {
    try {
      let url = `/api/appointments/patient/${patientId}`;
      if (status) {
        url += `?status=${status}`;
      }

      const response = await api.get(url);
      return response.data.data.appointments;
    } catch (error) {
      console.error('Error getting patient appointments:', error);
      throw error;
    }
  }

  // Update appointment status
  async updateAppointmentStatus(appointmentId: string, status: string, notes?: string): Promise<Appointment> {
    try {
      const response = await api.put(`/api/appointments/${appointmentId}/status`, {
        status,
        notes
      });
      return response.data.data.appointment;
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }
  }

  // Get appointment details
  async getAppointmentDetails(appointmentId: string): Promise<Appointment> {
    try {
      const response = await api.get(`/api/appointments/${appointmentId}`);
      return response.data.data.appointment;
    } catch (error) {
      console.error('Error getting appointment details:', error);
      throw error;
    }
  }

  // Cancel appointment
  async cancelAppointment(appointmentId: string, reason?: string): Promise<Appointment> {
    try {
      const response = await api.delete(`/api/appointments/${appointmentId}`, {
        data: { cancellation_reason: reason }
      });
      return response.data.data.appointment;
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  }

  // Helper function to format time for display
  formatTimeSlot(slot: TimeSlot): string {
    return `${slot.start_time} - ${slot.end_time}`;
  }

  // Helper function to format appointment date/time
  formatAppointmentDateTime(appointment: Appointment): string {
    const date = new Date(appointment.appointment_date);
    const dateStr = date.toLocaleDateString();
    return `${dateStr} ${appointment.start_time} - ${appointment.end_time}`;
  }
}

export const appointmentService = new AppointmentService();
export default appointmentService;