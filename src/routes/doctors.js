const express = require('express');
const DoctorController = require('../controllers/doctorController');
const AuthMiddleware = require('../middleware/auth');
const {
  validateDoctorId,
  validateUpdateDoctor,
  validateAvailability,
  validateDoctorQuery,
  validateStatsQuery,
  validateQueueStatusUpdate,
} = require('../validators/doctorValidation');

const router = express.Router();

// Public routes
router.get('/', validateDoctorQuery, DoctorController.getAllDoctors);
router.get(
  '/available',
  validateDoctorQuery,
  DoctorController.getAvailableDoctors
);
router.get('/:id', validateDoctorId, DoctorController.getDoctor);

// Remove authentication requirement for availability updates
router.put(
  '/:id/availability',
  validateAvailability,
  DoctorController.updateAvailability
);

// Protected routes (commented out)
// router.use(AuthMiddleware.authenticate);

// Doctor and Admin only routes (keep auth for other routes)
router.put(
  '/:id/profile',
  AuthMiddleware.authenticate,
  validateUpdateDoctor,
  AuthMiddleware.requireDoctorOrAdmin,
  DoctorController.updateDoctor
);


router.get(
  '/:id/stats',
  validateStatsQuery,
  AuthMiddleware.requireDoctorOrAdmin,
  DoctorController.getDoctorStats
);

router.get(
  '/:id/queue',
  validateDoctorId,
  AuthMiddleware.requireDoctorOrAdmin,
  DoctorController.getDoctorQueue
);

router.post(
  '/:id/call-next',
  validateDoctorId,
  AuthMiddleware.requireDoctorOrAdmin,
  DoctorController.callNextPatient
);

router.put(
  '/:id/queue/status',
  validateQueueStatusUpdate,
  AuthMiddleware.requireDoctorOrAdmin,
  DoctorController.updatePatientStatus
);

module.exports = router;
