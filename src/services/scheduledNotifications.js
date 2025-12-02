const cron = require('node-cron');
const { db } = require('../config/database');
const NotificationService = require('./notificationService');
const logger = require('../utils/logger');

class ScheduledNotificationService {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  // Initialize all scheduled notification jobs
  init() {
    if (this.isInitialized) {
      logger.warn('Scheduled notification service already initialized');
      return;
    }

    try {
      // Send appointment reminders every hour
      this.scheduleAppointmentReminders();
      
      // Check for missed appointments every 30 minutes
      this.scheduleMissedAppointmentCheck();
      
      // Daily system health notifications
      this.scheduleDailyHealthCheck();

      this.isInitialized = true;
      logger.info('Scheduled notification service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize scheduled notification service:', error);
    }
  }

  // Schedule appointment reminders
  scheduleAppointmentReminders() {
    // Run every hour at minute 0
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running scheduled appointment reminders check');
        
        // Get appointments for tomorrow (24 hours from now)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0];

        const query = `
          SELECT 
            a.id as appointment_id,
            a.appointment_date,
            a.start_time,
            a.end_time,
            a.appointment_type,
            a.status,
            a.patient_first_name,
            a.patient_last_name,
            a.patient_phone,
            a.patient_email,
            d.first_name as doctor_first_name,
            d.last_name as doctor_last_name,
            d.specialization
          FROM appointments a
          JOIN doctors d ON a.doctor_id = d.id
          WHERE a.appointment_date = $1 
            AND a.status IN ('confirmed', 'pending')
            AND a.reminder_sent = false
        `;

        const result = await db.query(query, [tomorrowDate]);
        const appointments = result.rows;

        if (appointments.length === 0) {
          logger.info('No appointment reminders to send for tomorrow');
          return;
        }

        logger.info(`Sending reminders for ${appointments.length} appointments`);

        // Send reminders
        const reminderResults = await NotificationService.sendAppointmentReminders(
          appointments.map(apt => ({
            appointmentId: apt.appointment_id,
            patientName: `${apt.patient_first_name} ${apt.patient_last_name || ''}`.trim(),
            patientPhone: apt.patient_phone,
            patientEmail: apt.patient_email,
            doctorName: `${apt.doctor_first_name} ${apt.doctor_last_name || ''}`.trim(),
            appointmentDate: apt.appointment_date,
            appointmentTime: apt.start_time,
            appointmentType: apt.appointment_type,
            status: apt.status
          }))
        );

        // Mark reminders as sent
        for (const appointment of appointments) {
          await db.query(
            'UPDATE appointments SET reminder_sent = true WHERE id = $1',
            [appointment.appointment_id]
          );
        }

        logger.info(`Appointment reminders processing complete`, {
          total: appointments.length,
          successful: reminderResults.filter(r => r.success).length,
          failed: reminderResults.filter(r => !r.success).length
        });

      } catch (error) {
        logger.error('Error in scheduled appointment reminders:', error);
      }
    }, {
      scheduled: false,
      timezone: process.env.TZ || 'America/New_York'
    });

    this.jobs.set('appointment_reminders', job);
    job.start();
    logger.info('Appointment reminders scheduled (hourly at :00)');
  }

  // Schedule missed appointment checks
  scheduleMissedAppointmentCheck() {
    // Run every 30 minutes
    const job = cron.schedule('*/30 * * * *', async () => {
      try {
        logger.info('Checking for missed appointments');
        
        const now = new Date();
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
        
        const query = `
          SELECT 
            a.id as appointment_id,
            a.appointment_date,
            a.start_time,
            a.end_time,
            a.patient_first_name,
            a.patient_last_name,
            a.patient_phone,
            d.id as doctor_id,
            d.first_name as doctor_first_name,
            d.last_name as doctor_last_name
          FROM appointments a
          JOIN doctors d ON a.doctor_id = d.id
          WHERE a.status = 'confirmed'
            AND a.appointment_date = CURRENT_DATE
            AND CONCAT(a.appointment_date, ' ', a.start_time)::timestamp < $1
        `;

        const result = await db.query(query, [thirtyMinutesAgo.toISOString()]);
        const missedAppointments = result.rows;

        for (const appointment of missedAppointments) {
          // Update status to no_show
          await db.query(
            'UPDATE appointments SET status = $1 WHERE id = $2',
            ['no_show', appointment.appointment_id]
          );

          // Send no-show notification
          await NotificationService.sendAppointmentNotification({
            appointmentId: appointment.appointment_id,
            patientName: `${appointment.patient_first_name} ${appointment.patient_last_name || ''}`.trim(),
            patientPhone: appointment.patient_phone,
            doctorId: appointment.doctor_id,
            doctorName: `${appointment.doctor_first_name} ${appointment.doctor_last_name || ''}`.trim(),
            appointmentDate: appointment.appointment_date,
            appointmentTime: appointment.start_time,
            status: 'no_show',
            appointmentType: 'appointment'
          }, 'no_show');

          logger.info(`Marked appointment ${appointment.appointment_id} as no-show and sent notifications`);
        }

        if (missedAppointments.length > 0) {
          logger.info(`Processed ${missedAppointments.length} missed appointments`);
        }

      } catch (error) {
        logger.error('Error checking for missed appointments:', error);
      }
    }, {
      scheduled: false,
      timezone: process.env.TZ || 'America/New_York'
    });

    this.jobs.set('missed_appointments', job);
    job.start();
    logger.info('Missed appointment checks scheduled (every 30 minutes)');
  }

  // Schedule daily health checks
  scheduleDailyHealthCheck() {
    // Run daily at 6 AM
    const job = cron.schedule('0 6 * * *', async () => {
      try {
        logger.info('Running daily system health check');
        
        // Get appointment statistics for yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayDate = yesterday.toISOString().split('T')[0];

        const statsQuery = `
          SELECT 
            COUNT(*) as total_appointments,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
            COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show,
            COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_remaining
          FROM appointments 
          WHERE appointment_date = $1
        `;

        const result = await db.query(statsQuery, [yesterdayDate]);
        const stats = result.rows[0];

        // Send daily report to administrators (you can customize this)
        logger.info('Daily appointment statistics', {
          date: yesterdayDate,
          ...stats
        });

        // If there are concerning metrics, send alerts
        const noShowRate = stats.total_appointments > 0 ? 
          (parseInt(stats.no_show) / parseInt(stats.total_appointments)) * 100 : 0;

        if (noShowRate > 20) { // Alert if no-show rate > 20%
          logger.warn(`High no-show rate detected: ${noShowRate.toFixed(2)}%`, {
            date: yesterdayDate,
            noShows: stats.no_show,
            total: stats.total_appointments
          });
        }

      } catch (error) {
        logger.error('Error in daily health check:', error);
      }
    }, {
      scheduled: false,
      timezone: process.env.TZ || 'America/New_York'
    });

    this.jobs.set('daily_health_check', job);
    job.start();
    logger.info('Daily health check scheduled (6 AM daily)');
  }

  // Stop all scheduled jobs
  stopAll() {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped scheduled job: ${name}`);
    });
    this.jobs.clear();
    this.isInitialized = false;
    logger.info('All scheduled notification jobs stopped');
  }

  // Get job status
  getStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running || false,
        scheduled: true
      };
    });
    return {
      initialized: this.isInitialized,
      jobs: status
    };
  }

  // Manually trigger appointment reminders (for testing)
  async triggerAppointmentReminders(targetDate = null) {
    try {
      const checkDate = targetDate || new Date().toISOString().split('T')[0];
      
      const query = `
        SELECT 
          a.id as appointment_id,
          a.appointment_date,
          a.start_time,
          a.appointment_type,
          a.status,
          a.patient_first_name,
          a.patient_last_name,
          a.patient_phone,
          d.first_name as doctor_first_name,
          d.last_name as doctor_last_name
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.appointment_date = $1 
          AND a.status IN ('confirmed', 'pending')
      `;

      const result = await db.query(query, [checkDate]);
      const appointments = result.rows;

      if (appointments.length === 0) {
        return { success: true, message: 'No appointments found for the specified date', count: 0 };
      }

      const reminderResults = await NotificationService.sendAppointmentReminders(
        appointments.map(apt => ({
          appointmentId: apt.appointment_id,
          patientName: `${apt.patient_first_name} ${apt.patient_last_name || ''}`.trim(),
          patientPhone: apt.patient_phone,
          doctorName: `${apt.doctor_first_name} ${apt.doctor_last_name || ''}`.trim(),
          appointmentDate: apt.appointment_date,
          appointmentTime: apt.start_time,
          appointmentType: apt.appointment_type,
          status: apt.status
        }))
      );

      return {
        success: true,
        message: `Sent reminders for ${appointments.length} appointments`,
        count: appointments.length,
        results: reminderResults
      };

    } catch (error) {
      logger.error('Error manually triggering appointment reminders:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const scheduledNotificationService = new ScheduledNotificationService();

module.exports = scheduledNotificationService;