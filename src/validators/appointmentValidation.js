const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors:', errors.array());
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map((error) => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

const validateCreateAppointment = [
  body('doctor_id')
    .isUUID()
    .withMessage('Valid doctor ID is required'),

  body('patient_id')
    .optional()
    .isUUID()
    .withMessage('Valid patient ID is required'),

  body('appointment_date')
    .isDate()
    .withMessage('Valid appointment date is required (YYYY-MM-DD)')
    .custom((value) => {
      const appointmentDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        throw new Error('Appointment date cannot be in the past');
      }
      return true;
    }),

  body('start_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Valid start time is required (HH:MM format)'),

  body('end_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Valid end time is required (HH:MM format)')
    .custom((endTime, { req }) => {
      if (endTime <= req.body.start_time) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),

  body('appointment_type')
    .optional()
    .isIn(['consultation', 'follow_up', 'emergency', 'routine_checkup'])
    .withMessage('Invalid appointment type'),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),

  handleValidationErrors,
];

const validateUpdateStatus = [
  body('status')
    .isIn(['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
    .withMessage('Invalid appointment status'),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),

  handleValidationErrors,
];

const validateAppointmentId = [
  param('id')
    .isUUID()
    .withMessage('Valid appointment ID is required'),

  handleValidationErrors,
];

const validateDoctorId = [
  param('doctor_id')
    .isUUID()
    .withMessage('Valid doctor ID is required'),

  handleValidationErrors,
];

const validatePatientId = [
  param('patient_id')
    .isUUID()
    .withMessage('Valid patient ID is required'),

  handleValidationErrors,
];

const validateDateQuery = [
  query('date')
    .optional()
    .isDate()
    .withMessage('Valid date is required (YYYY-MM-DD)'),

  handleValidationErrors,
];

module.exports = {
  validateCreateAppointment,
  validateUpdateStatus,
  validateAppointmentId,
  validateDoctorId,
  validatePatientId,
  validateDateQuery,
  handleValidationErrors,
};