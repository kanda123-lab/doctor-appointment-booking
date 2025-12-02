const Appointment = require('../models/Appointment');
const logger = require('../utils/logger');
const NotificationService = require('../services/notificationService');

class AppointmentController {
  // Create a new appointment (patients)
  static async createAppointment(req, res) {
    try {
      const { doctor_id, appointment_date, start_time, end_time, appointment_type, notes, patient_name, patient_phone } = req.body;

      const appointment = await Appointment.create({
        doctor_id,
        patient_id: req.body.patient_id || req.user.profile_id,
        appointment_date,
        start_time,
        end_time,
        appointment_type,
        notes,
        patient_name,
        patient_phone
      });

      logger.info('Appointment created:', {
        appointmentId: appointment.id,
        doctorId: doctor_id,
        patientId: appointment.patient_id,
        date: appointment_date,
        time: `${start_time}-${end_time}`
      });

      // Send real-time notification for new appointment
      await NotificationService.sendAppointmentNotification({
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        doctorId: doctor_id,
        patientName: patient_name,
        patientPhone: patient_phone,
        doctorName: 'Doctor', // TODO: Get actual doctor name from database
        appointmentDate: appointment_date,
        appointmentTime: start_time,
        status: 'confirmed',
        appointmentType: appointment_type || 'appointment'
      }, 'new_appointment');

      res.status(201).json({
        status: 'success',
        message: 'Appointment booked successfully',
        data: { appointment }
      });
    } catch (error) {
      logger.error('Error creating appointment:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create appointment'
      });
    }
  }

  // Get available time slots for a doctor on a specific date
  static async getAvailableSlots(req, res) {
    try {
      const { doctor_id } = req.params;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({
          status: 'error',
          message: 'Date parameter is required'
        });
      }

      const slots = await Appointment.getAvailableSlots(doctor_id, date);

      res.json({
        status: 'success',
        data: {
          doctor_id,
          date,
          available_slots: slots
        }
      });
    } catch (error) {
      logger.error('Error getting available slots:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get available slots'
      });
    }
  }

  // Get doctor's appointments
  static async getDoctorAppointments(req, res) {
    try {
      const { doctor_id } = req.params;
      const { date, status } = req.query;

      const filters = {};
      if (date) filters.date = date;
      if (status) filters.status = status;

      const appointments = await Appointment.findByDoctorId(doctor_id, filters);

      res.json({
        status: 'success',
        data: {
          appointments,
          count: appointments.length
        }
      });
    } catch (error) {
      logger.error('Error getting doctor appointments:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get appointments'
      });
    }
  }

  // Get patient's appointments
  static async getPatientAppointments(req, res) {
    try {
      const { patient_id } = req.params;
      const { status } = req.query;

      const filters = {};
      if (status) filters.status = status;

      const appointments = await Appointment.findByPatientId(patient_id, filters);

      res.json({
        status: 'success',
        data: {
          appointments,
          count: appointments.length
        }
      });
    } catch (error) {
      logger.error('Error getting patient appointments:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get appointments'
      });
    }
  }

  // Update appointment status (doctors can confirm/cancel, patients can cancel)
  static async updateAppointmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const appointment = await Appointment.updateStatus(id, status, notes);

      if (!appointment) {
        return res.status(404).json({
          status: 'error',
          message: 'Appointment not found'
        });
      }

      logger.info('Appointment status updated:', {
        appointmentId: id,
        newStatus: status,
        updatedBy: 'system'
      });

      // Send real-time notification for status update
      await NotificationService.sendAppointmentNotification({
        appointmentId: id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        patientName: appointment.patient_name || 'Patient',
        patientPhone: appointment.patient_phone,
        doctorName: 'Doctor', // TODO: Get actual doctor name from database
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.start_time,
        status: status,
        appointmentType: appointment.appointment_type || 'appointment'
      }, 'status_update');

      res.json({
        status: 'success',
        message: 'Appointment status updated successfully',
        data: { appointment }
      });
    } catch (error) {
      logger.error('Error updating appointment status:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update appointment status'
      });
    }
  }

  // Get appointment details
  static async getAppointmentDetails(req, res) {
    try {
      const { id } = req.params;

      const appointment = await Appointment.findById(id);

      if (!appointment) {
        return res.status(404).json({
          status: 'error',
          message: 'Appointment not found'
        });
      }

      res.json({
        status: 'success',
        data: { appointment }
      });
    } catch (error) {
      logger.error('Error getting appointment details:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get appointment details'
      });
    }
  }

  // Cancel appointment
  static async cancelAppointment(req, res) {
    try {
      const { id } = req.params;
      const { cancellation_reason } = req.body;

      const appointment = await Appointment.updateStatus(id, 'cancelled', cancellation_reason);

      if (!appointment) {
        return res.status(404).json({
          status: 'error',
          message: 'Appointment not found'
        });
      }

      logger.info('Appointment cancelled:', {
        appointmentId: id,
        cancelledBy: 'system',
        reason: cancellation_reason
      });

      // Send real-time notification for cancellation
      await NotificationService.sendAppointmentNotification({
        appointmentId: id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        patientName: appointment.patient_name || 'Patient',
        patientPhone: appointment.patient_phone,
        doctorName: 'Doctor', // TODO: Get actual doctor name from database
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.start_time,
        status: 'cancelled',
        appointmentType: appointment.appointment_type || 'appointment'
      }, 'cancellation');

      res.json({
        status: 'success',
        message: 'Appointment cancelled successfully',
        data: { appointment }
      });
    } catch (error) {
      logger.error('Error cancelling appointment:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to cancel appointment'
      });
    }
  }
}

module.exports = AppointmentController;