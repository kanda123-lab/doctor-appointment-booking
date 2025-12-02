const webpush = require('web-push');
const twilio = require('twilio');
const logger = require('../utils/logger');
const { broadcastAppointmentUpdate, sendNotificationToUser } = require('./socketHandler');

// Initialize Twilio client (only if credentials are properly configured)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

// Configure web push notifications (only if VAPID keys are properly configured)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && 
    process.env.VAPID_PUBLIC_KEY !== 'your-vapid-public-key-here' &&
    process.env.VAPID_PRIVATE_KEY !== 'your-vapid-private-key-here') {
  try {
    webpush.setVapidDetails(
      'mailto:' + (process.env.VAPID_EMAIL || 'admin@medqueue.com'),
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (error) {
    logger.warn('Invalid VAPID keys provided, push notifications disabled:', error.message);
  }
} else {
  logger.warn('VAPID keys not configured, push notifications disabled');
}

class NotificationService {
  // Send push notification to user's device
  static async sendPushNotification(subscription, payload) {
    try {
      if (!process.env.VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY === 'your-vapid-public-key-here') {
        logger.warn('Push notification: VAPID keys not configured, notification not sent');
        return { success: false, error: 'VAPID keys not configured' };
      }

      const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
      logger.info('Push notification sent successfully', { result });
      return { success: true, result };
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send WhatsApp message using Twilio
  static async sendWhatsAppMessage(to, message, mediaUrl = null) {
    try {
      if (!twilioClient) {
        logger.warn('WhatsApp: Twilio credentials not configured, message not sent');
        return { success: false, error: 'Twilio not configured' };
      }

      const messageOptions = {
        from: process.env.WHATSAPP_FROM || 'whatsapp:+1234567890',
        to: `whatsapp:${to}`,
        body: message
      };

      if (mediaUrl) {
        messageOptions.mediaUrl = mediaUrl;
      }

      const result = await twilioClient.messages.create(messageOptions);
      
      logger.info('WhatsApp message sent successfully', { 
        to, 
        messageId: result.sid,
        status: result.status 
      });
      
      return { 
        success: true, 
        messageId: result.sid, 
        status: result.status 
      };
    } catch (error) {
      logger.error('Failed to send WhatsApp message:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS message using Twilio
  static async sendSMS(to, message) {
    try {
      if (!twilioClient) {
        logger.warn('SMS: Twilio credentials not configured, message not sent');
        return { success: false, error: 'Twilio not configured' };
      }

      const result = await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
        to: to,
        body: message
      });

      logger.info('SMS sent successfully', { 
        to, 
        messageId: result.sid,
        status: result.status 
      });

      return { 
        success: true, 
        messageId: result.sid, 
        status: result.status 
      };
    } catch (error) {
      logger.error('Failed to send SMS:', error);
      return { success: false, error: error.message };
    }
  }

  // Send comprehensive appointment notification
  static async sendAppointmentNotification(appointmentData, notificationType = 'status_update') {
    const {
      patientId,
      doctorId,
      patientName,
      patientPhone,
      doctorName,
      appointmentDate,
      appointmentTime,
      status,
      appointmentType,
      pushSubscription
    } = appointmentData;

    const notifications = [];

    // Generate messages based on notification type and status
    const messages = this.generateAppointmentMessages({
      patientName,
      doctorName,
      appointmentDate,
      appointmentTime,
      status,
      appointmentType,
      notificationType
    });

    try {
      // 1. Real-time WebSocket notification
      if (patientId) {
        sendNotificationToUser(patientId, 'patient', {
          type: 'appointment_update',
          title: messages.title,
          message: messages.webSocket,
          appointmentId: appointmentData.appointmentId,
          status: status
        });
        notifications.push({ type: 'websocket', success: true });
      }

      // 2. Push notification (if subscription exists)
      if (pushSubscription) {
        const pushResult = await this.sendPushNotification(pushSubscription, {
          title: messages.title,
          body: messages.push,
          icon: '/icons/appointment-icon.png',
          badge: '/icons/badge-icon.png',
          data: {
            appointmentId: appointmentData.appointmentId,
            type: 'appointment_update',
            url: '/patient/appointments'
          }
        });
        notifications.push({ type: 'push', ...pushResult });
      }

      // 3. WhatsApp notification
      if (patientPhone) {
        const whatsappResult = await this.sendWhatsAppMessage(
          patientPhone, 
          messages.whatsapp
        );
        notifications.push({ type: 'whatsapp', ...whatsappResult });
      }

      // 4. SMS backup notification (if WhatsApp fails or as backup)
      if (patientPhone) {
        const smsResult = await this.sendSMS(patientPhone, messages.sms);
        notifications.push({ type: 'sms', ...smsResult });
      }

      // 5. Broadcast real-time updates to connected clients
      if (appointmentData.appointmentId) {
        broadcastAppointmentUpdate({
          appointmentId: appointmentData.appointmentId,
          patientId,
          doctorId,
          status,
          patientName
        });
      }

      logger.info('Comprehensive appointment notification sent', {
        appointmentId: appointmentData.appointmentId,
        patientId,
        notifications: notifications.map(n => ({ type: n.type, success: n.success }))
      });

      return {
        success: true,
        notifications,
        message: 'Notifications sent successfully'
      };

    } catch (error) {
      logger.error('Failed to send comprehensive appointment notification:', error);
      return {
        success: false,
        error: error.message,
        notifications
      };
    }
  }

  // Generate appropriate messages for different channels
  static generateAppointmentMessages({ patientName, doctorName, appointmentDate, appointmentTime, status, appointmentType, notificationType }) {
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const baseInfo = `${appointmentType || 'Appointment'} with Dr. ${doctorName} on ${formattedDate} at ${appointmentTime}`;

    const statusMessages = {
      confirmed: {
        title: '✅ Appointment Confirmed',
        webSocket: `Great news! Your ${baseInfo} has been confirmed. We look forward to seeing you!`,
        push: `Your appointment with Dr. ${doctorName} is confirmed for ${formattedDate}`,
        whatsapp: `🏥 *MediQueue Confirmation*\n\nHi ${patientName}!\n\n✅ Your ${baseInfo} has been *CONFIRMED*.\n\n📅 *Date:* ${formattedDate}\n⏰ *Time:* ${appointmentTime}\n👨‍⚕️ *Doctor:* Dr. ${doctorName}\n🩺 *Type:* ${appointmentType}\n\n💡 *Tips for your visit:*\n• Arrive 15 minutes early\n• Bring your ID and insurance\n• Prepare your questions\n\nSee you soon! 😊`,
        sms: `MediQueue: Your ${appointmentType} with Dr. ${doctorName} on ${formattedDate} at ${appointmentTime} is CONFIRMED. Arrive 15 min early. Questions? Reply HELP.`
      },
      cancelled: {
        title: '❌ Appointment Cancelled',
        webSocket: `Your ${baseInfo} has been cancelled. Please reschedule when convenient.`,
        push: `Your appointment with Dr. ${doctorName} has been cancelled`,
        whatsapp: `🏥 *MediQueue Update*\n\nHi ${patientName},\n\n❌ Your ${baseInfo} has been *CANCELLED*.\n\n🔄 *Need to reschedule?*\n• Visit our patient portal\n• Call our office\n• Book online anytime\n\nWe apologize for any inconvenience.`,
        sms: `MediQueue: Your ${appointmentType} with Dr. ${doctorName} on ${formattedDate} is CANCELLED. Reschedule at mediqueue.com or call us.`
      },
      completed: {
        title: '✅ Appointment Completed',
        webSocket: `Your ${baseInfo} has been completed. Thank you for visiting us!`,
        push: `Your appointment with Dr. ${doctorName} is complete. Thank you!`,
        whatsapp: `🏥 *MediQueue - Visit Complete*\n\nHi ${patientName}!\n\n✅ Your ${baseInfo} has been *COMPLETED*.\n\n🙏 Thank you for choosing us!\n\n💊 *Next steps:*\n• Follow prescribed treatment\n• Schedule follow-up if needed\n• Rate your experience\n\nTake care! 🌟`,
        sms: `MediQueue: Your visit with Dr. ${doctorName} is complete. Thank you! Follow prescribed treatment and schedule follow-up if needed.`
      },
      reminder: {
        title: '⏰ Appointment Reminder',
        webSocket: `Reminder: You have ${baseInfo} coming up soon.`,
        push: `Reminder: Appointment with Dr. ${doctorName} tomorrow`,
        whatsapp: `🏥 *MediQueue Reminder*\n\nHi ${patientName}!\n\n⏰ *Appointment Reminder*\n\n📅 *Tomorrow:* ${formattedDate}\n⏰ *Time:* ${appointmentTime}\n👨‍⚕️ *Doctor:* Dr. ${doctorName}\n🩺 *Type:* ${appointmentType}\n\n📍 *Location:* MediQueue Clinic\n\n✅ *Confirmed & Ready!*\n\nSee you tomorrow! 😊`,
        sms: `MediQueue REMINDER: ${appointmentType} with Dr. ${doctorName} TOMORROW at ${appointmentTime}. Arrive 15 min early. Questions? Reply HELP.`
      },
      no_show: {
        title: '⚠️ Missed Appointment',
        webSocket: `You missed your ${baseInfo}. Please contact us to reschedule.`,
        push: `You missed your appointment with Dr. ${doctorName}. Please reschedule.`,
        whatsapp: `🏥 *MediQueue Update*\n\nHi ${patientName},\n\n⚠️ You missed your ${baseInfo}.\n\n🔄 *Reschedule Options:*\n• Visit our patient portal\n• Call our office\n• Book online anytime\n\nWe're here to help! 💙`,
        sms: `MediQueue: You missed your ${appointmentType} with Dr. ${doctorName}. Please reschedule at mediqueue.com or call us.`
      }
    };

    return statusMessages[status] || statusMessages.confirmed;
  }

  // Send appointment reminders (called by cron job)
  static async sendAppointmentReminders(appointments) {
    const results = [];
    
    for (const appointment of appointments) {
      try {
        const result = await this.sendAppointmentNotification({
          ...appointment,
          status: 'reminder'
        }, 'reminder');
        
        results.push({
          appointmentId: appointment.appointmentId,
          success: result.success,
          notifications: result.notifications
        });
      } catch (error) {
        logger.error(`Failed to send reminder for appointment ${appointment.appointmentId}:`, error);
        results.push({
          appointmentId: appointment.appointmentId,
          success: false,
          error: error.message
        });
      }
    }

    logger.info(`Sent ${results.length} appointment reminders`, {
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }
}

module.exports = NotificationService;