const express = require('express');
const QueueController = require('../controllers/queueController');
const AuthMiddleware = require('../middleware/auth');
const {
  validateJoinQueue,
  validateUpdateQueueStatus,
  validateDoctorId,
  validatePatientId,
  validateQueueId,
  validateQueueQuery,
  validateDoctorQuery,
} = require('../validators/queueValidation');

const router = express.Router();

// All queue routes require authentication
router.use(AuthMiddleware.authenticate);

// Join queue (patients and admins)
router.post(
  '/join',
  validateJoinQueue,
  AuthMiddleware.authorize('patient', 'admin'),
  QueueController.joinQueue
);

// Get queue by doctor (doctors, admins, and optionally patients for their own status)
router.get(
  '/doctor/:doctor_id',
  validateDoctorId,
  validateQueueQuery,
  QueueController.getQueueByDoctor
);

// Get patient queue status
router.get(
  '/patient/:patient_id',
  validatePatientId,
  validateDoctorQuery,
  QueueController.getPatientQueueStatus
);

// Call next patient (doctors and admins only)
router.post(
  '/doctor/:doctor_id/call-next',
  validateDoctorId,
  AuthMiddleware.requireDoctorOrAdmin,
  QueueController.callNextPatient
);

// Update queue status (doctors and admins only)
router.put(
  '/:id/status',
  validateUpdateQueueStatus,
  AuthMiddleware.requireDoctorOrAdmin,
  QueueController.updateQueueStatus
);

// Remove from queue
router.delete('/:id', validateQueueId, QueueController.removeFromQueue);

// Get queue statistics (doctors and admins only)
router.get(
  '/doctor/:doctor_id/stats',
  validateDoctorId,
  validateQueueQuery,
  AuthMiddleware.requireDoctorOrAdmin,
  QueueController.getQueueStats
);

// Get queue position
router.get('/:id/position', validateQueueId, QueueController.getQueuePosition);

// Update estimated wait times (doctors and admins only)
router.post(
  '/doctor/:doctor_id/update-wait-times',
  validateDoctorId,
  AuthMiddleware.requireDoctorOrAdmin,
  QueueController.updateEstimatedWaitTimes
);

module.exports = router;
