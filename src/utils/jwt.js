const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

class JWTService {
  static generateTokens(payload) {
    try {
      const accessToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'doctor-appointment-api',
        audience: 'doctor-appointment-client',
      });

      const refreshToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'doctor-appointment-api',
        audience: 'doctor-appointment-client',
      });

      return { accessToken, refreshToken };
    } catch (error) {
      logger.error('Token generation failed:', error);
      throw new Error('Failed to generate tokens');
    }
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'doctor-appointment-api',
        audience: 'doctor-appointment-client',
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        logger.error('Token verification failed:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  static decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('Token decode failed:', error);
      return null;
    }
  }

  static refreshAccessToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken);

      // Create new access token with same payload (excluding exp, iat)
      const newPayload = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      const accessToken = jwt.sign(newPayload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'doctor-appointment-api',
        audience: 'doctor-appointment-client',
      });

      return accessToken;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw new Error('Failed to refresh token');
    }
  }

  static getTokenExpiry(token) {
    try {
      const decoded = this.decodeToken(token);
      return decoded?.exp ? new Date(decoded.exp * 1000) : null;
    } catch {
      return null;
    }
  }

  static isTokenExpired(token) {
    try {
      const expiry = this.getTokenExpiry(token);
      return expiry ? Date.now() >= expiry.getTime() : true;
    } catch {
      return true;
    }
  }
}

module.exports = JWTService;
