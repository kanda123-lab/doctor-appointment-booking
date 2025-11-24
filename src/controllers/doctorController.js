const Doctor = require('../models/Doctor');
const Queue = require('../models/Queue');
const logger = require('../utils/logger');

class DoctorController {
  static async getAllDoctors(req, res) {
    try {
      const { specialization, is_available, limit } = req.query;

      const filters = {};
      if (specialization) filters.specialization = specialization;
      if (is_available !== undefined)
        filters.is_available = is_available === 'true';
      if (limit) filters.limit = parseInt(limit);

      const doctors = await Doctor.findAll(filters);

      res.json({
        status: 'success',
        data: {
          doctors,
          count: doctors.length,
        },
      });
    } catch (error) {
      logger.error('Get all doctors failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get doctors',
      });
    }
  }

  static async getDoctor(req, res) {
    try {
      const { id } = req.params;
      const doctor = await Doctor.findById(id);

      if (!doctor) {
        return res.status(404).json({
          status: 'error',
          message: 'Doctor not found',
        });
      }

      res.json({
        status: 'success',
        data: { doctor },
      });
    } catch (error) {
      logger.error('Get doctor failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get doctor',
      });
    }
  }

  static async getAvailableDoctors(req, res) {
    try {
      const { specialization } = req.query;
      const doctors = await Doctor.getAvailableDoctors(specialization);

      res.json({
        status: 'success',
        data: {
          doctors,
          count: doctors.length,
        },
      });
    } catch (error) {
      logger.error('Get available doctors failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get available doctors',
      });
    }
  }

  static async updateAvailability(req, res) {
    try {
      const { id } = req.params;
      const { is_available } = req.body;

      // Check if doctor belongs to authenticated user (if not admin)
      if (req.user.role === 'doctor') {
        const doctorProfile = await Doctor.findByUserId(req.user.id);
        if (!doctorProfile || doctorProfile.id !== id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only update your own availability',
          });
        }
      }

      const doctor = await Doctor.updateAvailability(id, is_available);

      if (!doctor) {
        return res.status(404).json({
          status: 'error',
          message: 'Doctor not found',
        });
      }

      logger.info('Doctor availability updated:', {
        doctorId: id,
        is_available,
      });

      res.json({
        status: 'success',
        message: 'Availability updated successfully',
        data: { doctor },
      });
    } catch (error) {
      logger.error('Update availability failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update availability',
      });
    }
  }

  static async updateDoctor(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if doctor belongs to authenticated user (if not admin)
      if (req.user.role === 'doctor') {
        const doctorProfile = await Doctor.findByUserId(req.user.id);
        if (!doctorProfile || doctorProfile.id !== id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only update your own profile',
          });
        }
      }

      const doctor = await Doctor.update(id, updateData);

      if (!doctor) {
        return res.status(404).json({
          status: 'error',
          message: 'Doctor not found',
        });
      }

      logger.info('Doctor updated:', { doctorId: id });

      res.json({
        status: 'success',
        message: 'Doctor updated successfully',
        data: { doctor },
      });
    } catch (error) {
      logger.error('Update doctor failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update doctor',
      });
    }
  }

  static async getDoctorStats(req, res) {
    try {
      const { id } = req.params;
      const { start_date, end_date } = req.query;

      // Check if doctor belongs to authenticated user (if not admin)
      if (req.user.role === 'doctor') {
        const doctorProfile = await Doctor.findByUserId(req.user.id);
        if (!doctorProfile || doctorProfile.id !== id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only view your own stats',
          });
        }
      }

      const stats = await Doctor.getDoctorStats(id, start_date, end_date);

      res.json({
        status: 'success',
        data: { stats },
      });
    } catch (error) {
      logger.error('Get doctor stats failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get doctor stats',
      });
    }
  }

  static async getDoctorQueue(req, res) {
    try {
      const { id } = req.params;
      const { status = 'waiting' } = req.query;

      // Check if doctor belongs to authenticated user (if not admin)
      if (req.user.role === 'doctor') {
        const doctorProfile = await Doctor.findByUserId(req.user.id);
        if (!doctorProfile || doctorProfile.id !== id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only view your own queue',
          });
        }
      }

      const queue = await Queue.getQueueByDoctor(id, status);
      const queueStats = await Queue.getQueueStats(id);

      res.json({
        status: 'success',
        data: {
          queue,
          stats: queueStats,
        },
      });
    } catch (error) {
      logger.error('Get doctor queue failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get doctor queue',
      });
    }
  }

  static async callNextPatient(req, res) {
    try {
      const { id } = req.params;

      // Check if doctor belongs to authenticated user (if not admin)
      if (req.user.role === 'doctor') {
        const doctorProfile = await Doctor.findByUserId(req.user.id);
        if (!doctorProfile || doctorProfile.id !== id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only call patients from your own queue',
          });
        }
      }

      const nextPatient = await Queue.callNext(id);

      if (!nextPatient) {
        return res.status(404).json({
          status: 'error',
          message: 'No patients waiting in queue',
        });
      }

      // Update estimated wait times for remaining patients
      await Queue.updateEstimatedWaitTimes(id);

      logger.info('Doctor called next patient:', {
        doctorId: id,
        patientId: nextPatient.patient_id,
        queueId: nextPatient.id,
      });

      res.json({
        status: 'success',
        message: 'Patient called successfully',
        data: {
          patient: nextPatient,
        },
      });
    } catch (error) {
      logger.error('Call next patient failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to call next patient',
      });
    }
  }

  static async updatePatientStatus(req, res) {
    try {
      const { id } = req.params;
      const { queueId, status, notes } = req.body;

      // Check if doctor belongs to authenticated user (if not admin)
      if (req.user.role === 'doctor') {
        const doctorProfile = await Doctor.findByUserId(req.user.id);
        if (!doctorProfile || doctorProfile.id !== id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only update patients in your own queue',
          });
        }
      }

      const updatedQueue = await Queue.updateStatus(queueId, status, notes);

      if (!updatedQueue) {
        return res.status(404).json({
          status: 'error',
          message: 'Queue entry not found',
        });
      }

      // If completed or missed, remove from active queue
      if (status === 'completed' || status === 'missed') {
        await Queue.removeFromQueue(queueId);

        // Update estimated wait times for remaining patients
        await Queue.updateEstimatedWaitTimes(id);
      }

      logger.info('Patient status updated:', {
        doctorId: id,
        queueId,
        status,
      });

      res.json({
        status: 'success',
        message: 'Patient status updated successfully',
        data: {
          queue: updatedQueue,
        },
      });
    } catch (error) {
      logger.error('Update patient status failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update patient status',
      });
    }
  }
}

module.exports = DoctorController;
