const logger = require('../utils/logger');

let io;
const connectedUsers = new Map(); // Store user connections

const socketHandler = (socketIo) => {
  io = socketIo;

  io.on('connection', (socket) => {
    logger.info(`New WebSocket connection: ${socket.id}`);

    // Handle user authentication and room joining
    socket.on('join', (userData) => {
      const { userId, userType, doctorId } = userData;
      
      // Store user connection info
      connectedUsers.set(socket.id, {
        userId,
        userType,
        doctorId,
        socketId: socket.id
      });

      // Join user to appropriate rooms
      if (userType === 'doctor') {
        socket.join(`doctor_${userId}`);
        socket.join('doctors');
        logger.info(`Doctor ${userId} joined their room`);
      } else if (userType === 'patient') {
        socket.join(`patient_${userId}`);
        if (doctorId) {
          socket.join(`doctor_${doctorId}_patients`);
        }
        logger.info(`Patient ${userId} joined rooms`);
      }

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to real-time updates',
        timestamp: new Date().toISOString()
      });
    });

    // Handle appointment status updates
    socket.on('appointment_status_update', (data) => {
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo && userInfo.userType === 'doctor') {
        // Broadcast to patient and other doctors
        broadcastAppointmentUpdate(data);
      }
    });

    // Handle typing indicators for chat (future feature)
    socket.on('typing', (data) => {
      socket.to(data.room).emit('user_typing', {
        userId: data.userId,
        isTyping: data.isTyping
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        logger.info(`User ${userInfo.userId} (${userInfo.userType}) disconnected`);
        connectedUsers.delete(socket.id);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });
};

// Broadcast appointment status updates
const broadcastAppointmentUpdate = (appointmentData) => {
  const { appointmentId, patientId, doctorId, status, patientName } = appointmentData;

  // Notify the specific patient
  io.to(`patient_${patientId}`).emit('appointment_status_changed', {
    appointmentId,
    status,
    message: getStatusMessage(status),
    timestamp: new Date().toISOString()
  });

  // Notify all patients of this doctor (for queue updates)
  io.to(`doctor_${doctorId}_patients`).emit('queue_updated', {
    doctorId,
    message: `Queue updated - ${patientName}'s appointment is now ${status}`,
    timestamp: new Date().toISOString()
  });

  // Notify other doctors (for admin purposes)
  io.to('doctors').emit('appointment_update', {
    appointmentId,
    doctorId,
    patientId,
    status,
    patientName,
    timestamp: new Date().toISOString()
  });

  logger.info(`Broadcasted appointment update: ${appointmentId} -> ${status}`);
};

// Send notification to specific user
const sendNotificationToUser = (userId, userType, notification) => {
  const room = `${userType}_${userId}`;
  io.to(room).emit('notification', {
    ...notification,
    timestamp: new Date().toISOString()
  });
  logger.info(`Sent notification to ${userType} ${userId}: ${notification.title}`);
};

// Send bulk notifications
const sendBulkNotification = (userType, notification) => {
  const room = userType === 'doctor' ? 'doctors' : 'patients';
  io.to(room).emit('notification', {
    ...notification,
    timestamp: new Date().toISOString()
  });
  logger.info(`Sent bulk notification to ${userType}s: ${notification.title}`);
};

// Get user-friendly status messages
const getStatusMessage = (status) => {
  const messages = {
    confirmed: 'Your appointment has been confirmed! 🎉',
    cancelled: 'Your appointment has been cancelled. Please reschedule if needed.',
    completed: 'Your appointment has been completed. Thank you for visiting! ✅',
    no_show: 'You missed your appointment. Please contact us to reschedule.',
    pending: 'Your appointment is pending confirmation.'
  };
  return messages[status] || 'Appointment status updated.';
};

// Get connected users info (for debugging)
const getConnectedUsers = () => {
  const users = [];
  connectedUsers.forEach((userInfo, socketId) => {
    users.push({
      socketId,
      ...userInfo
    });
  });
  return users;
};

module.exports = {
  socketHandler,
  broadcastAppointmentUpdate,
  sendNotificationToUser,
  sendBulkNotification,
  getConnectedUsers
};