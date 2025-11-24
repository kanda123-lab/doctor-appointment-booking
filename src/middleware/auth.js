const JWTService = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

class AuthMiddleware {
  static async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          status: 'error',
          message: 'Access token required',
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'Access token required',
        });
      }

      // Verify token
      const decoded = JWTService.verifyToken(token);

      // Get user details
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'User not found',
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          status: 'error',
          message: 'User account is deactivated',
        });
      }

      // Add user to request
      req.user = user;
      req.token = token;

      next();
    } catch (error) {
      logger.error('Authentication failed:', error);

      if (error.message === 'Token has expired') {
        return res.status(401).json({
          status: 'error',
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED',
        });
      }

      return res.status(401).json({
        status: 'error',
        message: 'Invalid token',
      });
    }
  }

  static authorize(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required',
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
        });
      }

      next();
    };
  }

  static requireRole(role) {
    return this.authorize(role);
  }

  static requireDoctor(req, res, next) {
    return AuthMiddleware.authorize('doctor')(req, res, next);
  }

  static requirePatient(req, res, next) {
    return AuthMiddleware.authorize('patient')(req, res, next);
  }

  static requireAdmin(req, res, next) {
    return AuthMiddleware.authorize('admin')(req, res, next);
  }

  static requireDoctorOrAdmin(req, res, next) {
    return AuthMiddleware.authorize('doctor', 'admin')(req, res, next);
  }

  static requirePatientOrAdmin(req, res, next) {
    return AuthMiddleware.authorize('patient', 'admin')(req, res, next);
  }

  static async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // Continue without user
      }

      const token = authHeader.substring(7);

      if (!token) {
        return next(); // Continue without user
      }

      const decoded = JWTService.verifyToken(token);
      const user = await User.findById(decoded.id);

      if (user && user.is_active) {
        req.user = user;
        req.token = token;
      }

      next();
    } catch (error) {
      // If optional auth fails, continue without user
      logger.debug('Optional auth failed:', error.message);
      next();
    }
  }

  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          status: 'error',
          message: 'Refresh token required',
        });
      }

      const newAccessToken = JWTService.refreshAccessToken(refreshToken);

      res.json({
        status: 'success',
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (error) {
      logger.error('Token refresh failed:', error);

      res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token',
      });
    }
  }
}

module.exports = AuthMiddleware;
