const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const JWTService = require('../utils/jwt');
const logger = require('../utils/logger');
const { db } = require('../config/database');

class AuthController {
  static async register(req, res) {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const { email, password, role, profile } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          status: 'error',
          message: 'Email already registered',
        });
      }

      // Create user
      const user = await User.create({ email, password, role });

      // Create profile based on role
      let profileData = null;

      if (role === 'doctor') {
        if (!profile || !profile.license_number) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            status: 'error',
            message: 'License number required for doctor registration',
          });
        }

        profileData = await Doctor.create({
          user_id: user.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          specialization: profile.specialization,
          license_number: profile.license_number,
          phone: profile.phone,
          consultation_fee: profile.consultation_fee,
          working_hours: profile.working_hours,
        });
      } else if (role === 'patient') {
        if (!profile) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            status: 'error',
            message: 'Profile information required for patient registration',
          });
        }

        profileData = await Patient.create({
          user_id: user.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          date_of_birth: profile.date_of_birth,
          phone: profile.phone,
          address: profile.address,
          emergency_contact: profile.emergency_contact,
          medical_history: profile.medical_history,
        });
      }

      // Generate tokens
      const tokens = JWTService.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      await client.query('COMMIT');

      logger.info(`New ${role} registered:`, { email, id: user.id });

      res.status(201).json({
        status: 'success',
        message: 'Registration successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
          profile: profileData,
          tokens,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Registration failed:', error);

      if (error.code === '23505') {
        // Unique violation
        return res.status(409).json({
          status: 'error',
          message: 'Email or license number already exists',
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Registration failed',
      });
    } finally {
      client.release();
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials',
        });
      }

      // Validate password
      const isValidPassword = await User.validatePassword(
        password,
        user.password_hash
      );
      if (!isValidPassword) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials',
        });
      }

      // Get profile data
      let profile = null;
      if (user.role === 'doctor') {
        profile = await Doctor.findByUserId(user.id);
      } else if (user.role === 'patient') {
        profile = await Patient.findByUserId(user.id);
      }

      // Generate tokens
      const tokens = JWTService.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      logger.info('User logged in:', { email, id: user.id, role: user.role });

      res.json({
        status: 'success',
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            is_active: user.is_active,
          },
          profile,
          tokens,
        },
      });
    } catch (error) {
      logger.error('Login failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Login failed',
      });
    }
  }

  static async logout(req, res) {
    try {
      // In a production app, you might want to blacklist the token
      // For now, we'll just return success
      logger.info('User logged out:', {
        id: req.user?.id,
        email: req.user?.email,
      });

      res.json({
        status: 'success',
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Logout failed',
      });
    }
  }

  static async getProfile(req, res) {
    try {
      const { user } = req;

      // Get detailed profile based on role
      let profile = null;
      if (user.role === 'doctor') {
        profile = await Doctor.findByUserId(user.id);
      } else if (user.role === 'patient') {
        profile = await Patient.findByUserId(user.id);
      }

      res.json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
          profile,
        },
      });
    } catch (error) {
      logger.error('Get profile failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get profile',
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { user } = req;
      const updateData = req.body;

      let updatedProfile = null;

      if (user.role === 'doctor') {
        updatedProfile = await Doctor.update(
          updateData.id || updateData.doctor_id,
          updateData
        );
      } else if (user.role === 'patient') {
        updatedProfile = await Patient.update(
          updateData.id || updateData.patient_id,
          updateData
        );
      } else {
        return res.status(400).json({
          status: 'error',
          message: 'Profile updates not supported for this user role',
        });
      }

      if (!updatedProfile) {
        return res.status(404).json({
          status: 'error',
          message: 'Profile not found',
        });
      }

      logger.info('Profile updated:', { userId: user.id, role: user.role });

      res.json({
        status: 'success',
        message: 'Profile updated successfully',
        data: {
          profile: updatedProfile,
        },
      });
    } catch (error) {
      logger.error('Update profile failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update profile',
      });
    }
  }

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const { user } = req;

      // Get user with password hash
      const userWithPassword = await User.findByEmail(user.email);

      // Validate current password
      const isValidPassword = await User.validatePassword(
        currentPassword,
        userWithPassword.password_hash
      );
      if (!isValidPassword) {
        return res.status(400).json({
          status: 'error',
          message: 'Current password is incorrect',
        });
      }

      // Update password
      await User.updatePassword(user.id, newPassword);

      logger.info('Password changed:', { userId: user.id, email: user.email });

      res.json({
        status: 'success',
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Change password failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to change password',
      });
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

module.exports = AuthController;
