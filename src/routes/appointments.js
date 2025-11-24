const express = require('express');
const AppointmentController = require('../controllers/appointmentController');
const AuthMiddleware = require('../middleware/auth');
const { 
  validateCreateAppointment,
  validateAppointmentId,
  validateDoctorId,
  validatePatientId,
  validateUpdateStatus
} = require('../validators/appointmentValidation');

const router = express.Router();

// Remove authentication requirement - direct access
// router.use(AuthMiddleware.authenticate);

// Create appointment (patients and admins)
router.post(
  '/',
  validateCreateAppointment,
  AppointmentController.createAppointment
);

// Get available slots for a doctor on a specific date
router.get(
  '/doctor/:doctor_id/slots',
  validateDoctorId,
  AppointmentController.getAvailableSlots
);

// Get doctor's appointments
router.get(
  '/doctor/:doctor_id',
  validateDoctorId,
  AppointmentController.getDoctorAppointments
);

// Get patient's appointments
router.get(
  '/patient/:patient_id',
  validatePatientId,
  AppointmentController.getPatientAppointments
);

// Get appointment details
router.get(
  '/:id',
  validateAppointmentId,
  AppointmentController.getAppointmentDetails
);

// Update appointment status (confirm/cancel by doctor, cancel by patient)
router.put(
  '/:id/status',
  validateAppointmentId,
  validateUpdateStatus,
  AppointmentController.updateAppointmentStatus
);

// Cancel appointment
router.delete(
  '/:id',
  validateAppointmentId,
  AppointmentController.cancelAppointment
);

module.exports = router;