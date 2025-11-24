const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Queue = require('../models/Queue');
const logger = require('../utils/logger');

class PatientController {
  static async getAllPatients(req, res) {
    try {
      const { search, limit, offset } = req.query;

      const filters = {};
      if (search) filters.search = search;
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);

      const patients = await Patient.findAll(filters);

      res.json({
        status: 'success',
        data: {
          patients,
          count: patients.length,
        },
      });
    } catch (error) {
      logger.error('Get all patients failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get patients',
      });
    }
  }

  static async getPatient(req, res) {
    try {
      const { id } = req.params;

      // Check if patient belongs to authenticated user (if not admin/doctor)
      if (req.user.role === 'patient') {
        const patientProfile = await Patient.findByUserId(req.user.id);
        if (!patientProfile || patientProfile.id !== id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only view your own profile',
          });
        }
      }

      const patient = await Patient.findById(id);

      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient not found',
        });
      }

      res.json({
        status: 'success',
        data: { patient },
      });
    } catch (error) {
      logger.error('Get patient failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get patient',
      });
    }
  }

  static async updatePatient(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if patient belongs to authenticated user (if not admin)
      if (req.user.role === 'patient') {
        const patientProfile = await Patient.findByUserId(req.user.id);
        if (!patientProfile || patientProfile.id !== id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only update your own profile',
          });
        }
      }

      const patient = await Patient.update(id, updateData);

      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient not found',
        });
      }

      logger.info('Patient updated:', { patientId: id });

      res.json({
        status: 'success',
        message: 'Patient updated successfully',
        data: { patient },
      });
    } catch (error) {
      logger.error('Update patient failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update patient',
      });
    }
  }

  static async getPatientHistory(req, res) {
    try {
      const { id } = req.params;
      const { limit = 10 } = req.query;

      // Check if patient belongs to authenticated user (if not admin/doctor)
      if (req.user.role === 'patient') {
        const patientProfile = await Patient.findByUserId(req.user.id);
        if (!patientProfile || patientProfile.id !== id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only view your own history',
          });
        }
      }

      const history = await Patient.getPatientHistory(id, parseInt(limit));

      res.json({
        status: 'success',
        data: {
          history,
          count: history.length,
        },
      });
    } catch (error) {
      logger.error('Get patient history failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get patient history',
      });
    }
  }

  static async getUpcomingAppointments(req, res) {
    try {
      const { id } = req.params;

      // Check if patient belongs to authenticated user (if not admin/doctor)
      if (req.user.role === 'patient') {
        const patientProfile = await Patient.findByUserId(req.user.id);
        if (!patientProfile || patientProfile.id !== id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only view your own appointments',
          });
        }
      }

      const appointments = await Patient.getUpcomingAppointments(id);

      res.json({
        status: 'success',
        data: {
          appointments,
          count: appointments.length,
        },
      });
    } catch (error) {
      logger.error('Get upcoming appointments failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get upcoming appointments',
      });
    }
  }

  static async getPatientStats(req, res) {
    try {
      const { id } = req.params;

      // Check if patient belongs to authenticated user (if not admin/doctor)
      if (req.user.role === 'patient') {
        const patientProfile = await Patient.findByUserId(req.user.id);
        if (!patientProfile || patientProfile.id !== id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only view your own stats',
          });
        }
      }

      const stats = await Patient.getPatientStats(id);

      res.json({
        status: 'success',
        data: { stats },
      });
    } catch (error) {
      logger.error('Get patient stats failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get patient stats',
      });
    }
  }

  static async joinQueue(req, res) {
    try {
      const { id } = req.params;
      const { doctor_id, appointment_id, priority_level = 1, notes } = req.body;

      // Check if patient belongs to authenticated user (if not admin)
      if (req.user.role === 'patient') {
        const patientProfile = await Patient.findByUserId(req.user.id);
        if (!patientProfile || patientProfile.id !== id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only join queue for yourself',
          });
        }
      }

      // Check if doctor exists and is available
      const doctor = await Doctor.findById(doctor_id);
      if (!doctor) {
        return res.status(404).json({
          status: 'error',
          message: 'Doctor not found',
        });
      }

      if (!doctor.is_available) {
        return res.status(400).json({
          status: 'error',
          message: 'Doctor is currently unavailable',
        });
      }

      // Check if patient is already in queue for this doctor today
      const existingQueueEntry = await Queue.getPatientQueueStatus(
        id,
        doctor_id
      );
      if (existingQueueEntry.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'You are already in queue for this doctor today',
          data: {
            queue: existingQueueEntry[0],
          },
        });
      }

      const queueEntry = await Queue.joinQueue({
        doctor_id,
        patient_id: id,
        appointment_id,
        priority_level,
        notes,
      });

      logger.info('Patient joined queue:', {
        patientId: id,
        doctorId: doctor_id,
        queueId: queueEntry.id,
        queueNumber: queueEntry.queue_number,
      });

      res.status(201).json({
        status: 'success',
        message: 'Successfully joined queue',
        data: {
          queue: queueEntry,
          doctor: {
            id: doctor.id,
            first_name: doctor.first_name,
            last_name: doctor.last_name,
            specialization: doctor.specialization,
          },
        },
      });
    } catch (error) {
      logger.error('Join queue failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to join queue',
      });
    }
  }

  static async getQueueStatus(req, res) {
    try {
      const { id } = req.params;
      const { doctor_id } = req.query;

      // Check if patient belongs to authenticated user (if not admin/doctor)
      if (req.user.role === 'patient') {
        const patientProfile = await Patient.findByUserId(req.user.id);
        if (!patientProfile || patientProfile.id !== id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only view your own queue status',
          });
        }
      }

      const queueStatus = await Queue.getPatientQueueStatus(id, doctor_id);

      res.json({
        status: 'success',
        data: {
          queue: queueStatus,
          count: queueStatus.length,
        },
      });
    } catch (error) {
      logger.error('Get queue status failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get queue status',
      });
    }
  }

  static async searchPatients(req, res) {
    try {
      const { q, limit = 20 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          status: 'error',
          message: 'Search term must be at least 2 characters',
        });
      }

      const patients = await Patient.searchPatients(q, parseInt(limit));

      res.json({
        status: 'success',
        data: {
          patients,
          count: patients.length,
        },
      });
    } catch (error) {
      logger.error('Search patients failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to search patients',
      });
    }
  }
}

module.exports = PatientController;
