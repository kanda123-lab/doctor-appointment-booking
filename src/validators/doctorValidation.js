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

const validateDoctorId = [
  param('id').isUUID().withMessage('Valid doctor ID is required'),

  handleValidationErrors,
];

const validateUpdateDoctor = [
  param('id').isUUID().withMessage('Valid doctor ID is required'),

  body('first_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .trim()
    .withMessage('First name must be between 2 and 100 characters'),

  body('last_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .trim()
    .withMessage('Last name must be between 2 and 100 characters'),

  body('specialization')
    .optional()
    .isLength({ min: 2, max: 100 })
    .trim()
    .withMessage('Specialization must be between 2 and 100 characters'),

  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),

  body('consultation_fee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a positive number'),

  body('working_hours')
    .optional()
    .isObject()
    .withMessage('Working hours must be a valid object'),

  handleValidationErrors,
];

const validateAvailability = [
  param('id').isUUID().withMessage('Valid doctor ID is required'),

  body('is_available')
    .isBoolean()
    .withMessage('Availability status must be true or false'),

  handleValidationErrors,
];

const validateDoctorQuery = [
  query('specialization')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Specialization must be between 2 and 100 characters'),

  query('is_available')
    .optional()
    .isBoolean()
    .withMessage('Available filter must be true or false'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  handleValidationErrors,
];

const validateStatsQuery = [
  param('id').isUUID().withMessage('Valid doctor ID is required'),

  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format'),

  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format'),

  handleValidationErrors,
];

const validateQueueStatusUpdate = [
  param('id').isUUID().withMessage('Valid doctor ID is required'),

  body('queueId').isUUID().withMessage('Valid queue ID is required'),

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

module.exports = {
  validateDoctorId,
  validateUpdateDoctor,
  validateAvailability,
  validateDoctorQuery,
  validateStatsQuery,
  validateQueueStatusUpdate,
  handleValidationErrors,
};
