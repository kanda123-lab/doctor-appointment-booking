const express = require('express');
const AuthController = require('../controllers/authController');
const AuthMiddleware = require('../middleware/auth');
const {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
} = require('../validators/authValidation');

const router = express.Router();

// Public routes
router.post('/register', validateRegistration, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);

// Protected routes
router.use(AuthMiddleware.authenticate);
router.post('/logout', AuthController.logout);
router.get('/profile', AuthController.getProfile);
router.put('/profile', AuthController.updateProfile);
router.post(
  '/change-password',
  validatePasswordChange,
  AuthController.changePassword
);

module.exports = router;
