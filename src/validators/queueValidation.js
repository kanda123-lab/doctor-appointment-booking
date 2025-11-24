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

const validateJoinQueue = [
  body('doctor_id').isUUID().withMessage('Valid doctor ID is required'),

  body('patient_id').isUUID().withMessage('Valid patient ID is required'),

  body('appointment_id')
    .optional()
    .isUUID()
    .withMessage('Appointment ID must be a valid UUID'),

  body('priority_level')
    .optional()
    .isInt({ min: 1, max: 3 })
    .withMessage(
      'Priority level must be 1 (normal), 2 (urgent), or 3 (emergency)'
    ),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),

  handleValidationErrors,
];

const validateUpdateQueueStatus = [
  param('id').isUUID().withMessage('Valid queue ID is required'),

  body('status')
    .isIn(['waiting', 'called', 'in_consultation', 'completed', 'missed'])
    .withMessage(
      'Status must be one of: waiting, called, in_consultation, completed, missed'
    ),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),

  handleValidationErrors,
];

const validateDoctorId = [
  param('doctor_id').isUUID().withMessage('Valid doctor ID is required'),

  handleValidationErrors,
];

const validatePatientId = [
  param('patient_id').isUUID().withMessage('Valid patient ID is required'),

  handleValidationErrors,
];

const validateQueueId = [
  param('id').isUUID().withMessage('Valid queue ID is required'),

  handleValidationErrors,
];

const validateQueueQuery = [
  query('status')
    .optional()
    .isIn(['waiting', 'called', 'in_consultation', 'completed', 'missed'])
    .withMessage(
      'Status must be one of: waiting, called, in_consultation, completed, missed'
    ),

  query('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format'),

  handleValidationErrors,
];

const validateDoctorQuery = [
  query('doctor_id')
    .optional()
    .isUUID()
    .withMessage('Doctor ID must be a valid UUID'),

  handleValidationErrors,
];

module.exports = {
  validateJoinQueue,
  validateUpdateQueueStatus,
  validateDoctorId,
  validatePatientId,
  validateQueueId,
  validateQueueQuery,
  validateDoctorQuery,
  handleValidationErrors,
};
