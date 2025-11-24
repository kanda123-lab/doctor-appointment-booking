const express = require('express');
const PatientController = require('../controllers/patientController');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(AuthMiddleware.authenticate);

// Search patients (admin and doctors only)
router.get(
  '/search',
  AuthMiddleware.authorize('admin', 'doctor'),
  PatientController.searchPatients
);

// Get all patients (admin only)
router.get('/', AuthMiddleware.requireAdmin, PatientController.getAllPatients);

// Patient specific routes
router.get('/:id', PatientController.getPatient);
router.put('/:id', PatientController.updatePatient);
router.get('/:id/history', PatientController.getPatientHistory);
router.get('/:id/appointments', PatientController.getUpcomingAppointments);
router.get('/:id/stats', PatientController.getPatientStats);

// Queue management for patients
router.post('/:id/queue', PatientController.joinQueue);
router.get('/:id/queue', PatientController.getQueueStatus);

module.exports = router;
