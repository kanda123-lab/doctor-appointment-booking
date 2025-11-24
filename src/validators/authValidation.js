const { body, validationResult } = require('express-validator');
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

const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),

  body('password')
    .isLength({ min: 4 })
    .withMessage('Password must be at least 4 characters long'),

  body('role')
    .isIn(['patient', 'doctor'])
    .withMessage('Role must be either patient or doctor'),

  // Profile validation based on role
  body('profile').isObject().withMessage('Profile information is required'),

  body('profile.first_name')
    .isLength({ min: 2, max: 100 })
    .trim()
    .withMessage('First name must be between 2 and 100 characters'),

  body('profile.last_name')
    .isLength({ min: 2, max: 100 })
    .trim()
    .withMessage('Last name must be between 2 and 100 characters'),

  // Doctor-specific validation
  body('profile.specialization')
    .if(body('role').equals('doctor'))
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage(
      'Specialization is required for doctors and must be less than 100 characters'
    ),

  body('profile.license_number')
    .if(body('role').equals('doctor'))
    .notEmpty()
    .isLength({ max: 50 })
    .withMessage(
      'License number is required for doctors and must be less than 50 characters'
    ),

  body('profile.consultation_fee')
    .if(body('role').equals('doctor'))
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a positive number'),

  // Patient-specific validation
  body('profile.date_of_birth')
    .if(body('role').equals('patient'))
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),

  body('profile.phone')
    .optional({ values: 'falsy' })
    .isMobilePhone()
    .withMessage('Valid phone number is required'),

  body('profile.address')
    .if(body('role').equals('patient'))
    .optional()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),

  handleValidationErrors,
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),

  body('password').notEmpty().withMessage('Password is required'),

  handleValidationErrors,
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 4 })
    .withMessage('New password must be at least 4 characters long'),

  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match new password');
    }
    return true;
  }),

  handleValidationErrors,
];

const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .isJWT()
    .withMessage('Valid refresh token is required'),

  handleValidationErrors,
];

module.exports = {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateRefreshToken,
  handleValidationErrors,
};
