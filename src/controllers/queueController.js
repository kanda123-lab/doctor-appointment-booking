const Queue = require('../models/Queue');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const logger = require('../utils/logger');

class QueueController {
  static async joinQueue(req, res) {
    try {
      const {
        doctor_id,
        patient_id,
        appointment_id,
        priority_level = 1,
        notes,
      } = req.body;

      // Validate doctor exists and is available
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

      // Validate patient exists
      const patient = await Patient.findById(patient_id);
      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient not found',
        });
      }

      // Check if patient is already in queue for this doctor today
      const existingQueue = await Queue.getPatientQueueStatus(
        patient_id,
        doctor_id
      );
      if (existingQueue.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'Patient is already in queue for this doctor today',
          data: { queue: existingQueue[0] },
        });
      }

      const queueEntry = await Queue.joinQueue({
        doctor_id,
        patient_id,
        appointment_id,
        priority_level,
        notes,
      });

      logger.info('Patient joined queue:', {
        patientId: patient_id,
        doctorId: doctor_id,
        queueId: queueEntry.id,
        queueNumber: queueEntry.queue_number,
      });

      res.status(201).json({
        status: 'success',
        message: 'Successfully joined queue',
        data: {
          queue: queueEntry,
          position: queueEntry.queue_number,
          estimated_wait_time: queueEntry.estimated_wait_time,
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

  static async getQueueByDoctor(req, res) {
    try {
      const { doctor_id } = req.params;
      const { status = 'waiting' } = req.query;

      const queue = await Queue.getQueueByDoctor(doctor_id, status);
      const stats = await Queue.getQueueStats(doctor_id);

      res.json({
        status: 'success',
        data: {
          queue,
          stats,
          count: queue.length,
        },
      });
    } catch (error) {
      logger.error('Get queue by doctor failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get queue',
      });
    }
  }

  static async getPatientQueueStatus(req, res) {
    try {
      const { patient_id } = req.params;
      const { doctor_id } = req.query;

      const queueStatus = await Queue.getPatientQueueStatus(
        patient_id,
        doctor_id
      );

      res.json({
        status: 'success',
        data: {
          queue: queueStatus,
          count: queueStatus.length,
        },
      });
    } catch (error) {
      logger.error('Get patient queue status failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get queue status',
      });
    }
  }

  static async callNextPatient(req, res) {
    try {
      const { doctor_id } = req.params;

      const nextPatient = await Queue.callNext(doctor_id);

      if (!nextPatient) {
        return res.status(404).json({
          status: 'error',
          message: 'No patients waiting in queue',
        });
      }

      // Update estimated wait times for remaining patients
      await Queue.updateEstimatedWaitTimes(doctor_id);

      logger.info('Next patient called:', {
        doctorId: doctor_id,
        patientId: nextPatient.patient_id,
        queueId: nextPatient.id,
      });

      res.json({
        status: 'success',
        message: 'Patient called successfully',
        data: { patient: nextPatient },
      });
    } catch (error) {
      logger.error('Call next patient failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to call next patient',
      });
    }
  }

  static async updateQueueStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const updatedQueue = await Queue.updateStatus(id, status, notes);

      if (!updatedQueue) {
        return res.status(404).json({
          status: 'error',
          message: 'Queue entry not found',
        });
      }

      // If completed or missed, remove from active queue and update wait times
      if (status === 'completed' || status === 'missed') {
        const removedQueue = await Queue.removeFromQueue(id);
        if (removedQueue) {
          await Queue.updateEstimatedWaitTimes(removedQueue.doctor_id);
        }
      }

      logger.info('Queue status updated:', { queueId: id, status });

      res.json({
        status: 'success',
        message: 'Queue status updated successfully',
        data: { queue: updatedQueue },
      });
    } catch (error) {
      logger.error('Update queue status failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update queue status',
      });
    }
  }

  static async removeFromQueue(req, res) {
    try {
      const { id } = req.params;

      const removedQueue = await Queue.removeFromQueue(id);

      if (!removedQueue) {
        return res.status(404).json({
          status: 'error',
          message: 'Queue entry not found',
        });
      }

      // Update estimated wait times for remaining patients
      await Queue.updateEstimatedWaitTimes(removedQueue.doctor_id);

      logger.info('Patient removed from queue:', { queueId: id });

      res.json({
        status: 'success',
        message: 'Successfully removed from queue',
      });
    } catch (error) {
      logger.error('Remove from queue failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to remove from queue',
      });
    }
  }

  static async getQueueStats(req, res) {
    try {
      const { doctor_id } = req.params;
      const { date } = req.query;

      const queryDate = date ? new Date(date) : new Date();
      const stats = await Queue.getQueueStats(doctor_id, queryDate);

      res.json({
        status: 'success',
        data: { stats },
      });
    } catch (error) {
      logger.error('Get queue stats failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get queue stats',
      });
    }
  }

  static async getQueuePosition(req, res) {
    try {
      const { id } = req.params;

      const position = await Queue.getQueuePosition(id);

      if (position === null) {
        return res.status(404).json({
          status: 'error',
          message: 'Queue entry not found or not in waiting status',
        });
      }

      res.json({
        status: 'success',
        data: { position },
      });
    } catch (error) {
      logger.error('Get queue position failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get queue position',
      });
    }
  }

  static async updateEstimatedWaitTimes(req, res) {
    try {
      const { doctor_id } = req.params;

      const updatedQueue = await Queue.updateEstimatedWaitTimes(doctor_id);

      res.json({
        status: 'success',
        message: 'Estimated wait times updated',
        data: {
          queue: updatedQueue,
          count: updatedQueue.length,
        },
      });
    } catch (error) {
      logger.error('Update estimated wait times failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update estimated wait times',
      });
    }
  }
}

module.exports = QueueController;
