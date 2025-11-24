import api from './api';
import { QueueEntry, QueueStats, QueueJoinData, ApiResponse } from '../types';

export const queueService = {
  // Patient functions
  joinQueue: async (data: QueueJoinData): Promise<{ queue: QueueEntry; position: number; estimated_wait_time: number }> => {
    const response = await api.post('/api/queue/join', data);
    return response.data.data;
  },

  getPatientQueueStatus: async (patientId: string, doctorId?: string): Promise<QueueEntry[]> => {
    const params = doctorId ? { doctor_id: doctorId } : {};
    const response = await api.get(`/api/queue/patient/${patientId}`, { params });
    return response.data.data.queue;
  },

  getQueuePosition: async (queueId: string): Promise<number> => {
    const response = await api.get(`/api/queue/${queueId}/position`);
    return response.data.data.position;
  },

  // Doctor functions
  getDoctorQueue: async (doctorId: string, status = 'waiting'): Promise<{ queue: QueueEntry[]; stats: QueueStats; count: number }> => {
    const response = await api.get(`/api/queue/doctor/${doctorId}`, {
      params: { status }
    });
    return response.data.data;
  },

  callNextPatient: async (doctorId: string): Promise<QueueEntry> => {
    const response = await api.post(`/api/queue/doctor/${doctorId}/call-next`);
    return response.data.data.patient;
  },

  updateQueueStatus: async (queueId: string, status: string, notes?: string): Promise<QueueEntry> => {
    const response = await api.put(`/api/queue/${queueId}/status`, { status, notes });
    return response.data.data.queue;
  },

  getQueueStats: async (doctorId: string, date?: string): Promise<QueueStats> => {
    const params = date ? { date } : {};
    const response = await api.get(`/api/queue/doctor/${doctorId}/stats`, { params });
    return response.data.data.stats;
  },

  removeFromQueue: async (queueId: string): Promise<void> => {
    await api.delete(`/api/queue/${queueId}`);
  },
};