import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/SimpleAuthContext';
import { Doctor } from '../types';
import { appointmentService, Appointment } from '../services/appointmentService';
import Layout from './Layout';
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Box,
  Button,
  Fade,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Backdrop
} from '@mui/material';
import {
  Schedule,
  CheckCircle,
  Cancel,
  Done,
  PersonOff,
  Assessment,
  AccessTime,
  Phone,
  WhatsApp,
  LocalHospital,
  EventNote,
  Today,
  CalendarToday
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const DoctorDashboard: React.FC = () => {
  const { profile } = useAuth();
  const doctor = profile as Doctor;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, appointmentId: '', status: '', message: '' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Helper function to format time to 12-hour format
  const formatTime12Hour = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const isPM = hour >= 12;
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = isPM ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${period}`;
  };

  // Helper function to format time range
  const formatTimeRange = (startTime: string, endTime: string): string => {
    const start = formatTime12Hour(startTime);
    const end = formatTime12Hour(endTime);
    return `${start} – ${end}`;
  };

  // Helper function to get status chip color and props
  const getStatusChipProps = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { color: '#4caf50', bgColor: '#e8f5e9', label: 'Confirmed' };
      case 'pending':
        return { color: '#2196f3', bgColor: '#e3f2fd', label: 'In Queue' };
      case 'cancelled':
        return { color: '#f44336', bgColor: '#ffebee', label: 'Cancelled' };
      case 'no_show':
        return { color: '#9e9e9e', bgColor: '#f5f5f5', label: 'No-show' };
      case 'completed':
        return { color: '#ff9800', bgColor: '#fff3e0', label: 'Completed' };
      default:
        return { color: '#9e9e9e', bgColor: '#f5f5f5', label: 'Unknown' };
    }
  };

  const fetchAppointments = useCallback(async () => {
    try {
      console.log('Fetching appointments for doctor:', doctor.id);
      console.log('Selected date:', selectedDate);
      console.log('Filter status:', filterStatus);
      
      const appointmentsData = await appointmentService.getDoctorAppointments(
        doctor.id, 
        selectedDate, 
        filterStatus === 'all' ? undefined : filterStatus
      );
      
      console.log('Appointments response:', appointmentsData);
      console.log('Appointments length:', appointmentsData?.length);
      
      setAppointments(appointmentsData || []);
      setError('');
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [doctor.id, selectedDate, filterStatus]);

  useEffect(() => {
    if (doctor?.id) {
      fetchAppointments();
      // Refresh appointments every 60 seconds
      const interval = setInterval(fetchAppointments, 60000);
      return () => clearInterval(interval);
    }
  }, [doctor?.id, fetchAppointments]);


  const handleUpdateAppointmentStatus = async (appointmentId: string, status: string, notes?: string) => {
    setConfirmDialog({
      open: true,
      appointmentId,
      status,
      message: `Are you sure you want to mark this appointment as ${status.replace('_', ' ')}?`
    });
  };

  const sendWhatsAppConfirmation = (phone: string, patientName: string, appointmentDate: string, startTime: string, endTime: string) => {
    // Format phone number for WhatsApp
    const formattedPhone = phone.replace(/[^\d+]/g, '');
    
    // Format the appointment date for display
    const date = new Date(appointmentDate);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Create confirmation message
    const message = `Hello ${patientName}, your appointment with Dr. ${doctor.first_name}${doctor.last_name ? ` ${doctor.last_name}` : ''} has been confirmed for ${formattedDate} at ${startTime} - ${endTime}. Thank you!`;
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    // Open WhatsApp in new window/tab
    window.open(whatsappUrl, '_blank');
  };

  const handleConfirmStatusUpdate = async () => {
    if (!confirmDialog.appointmentId || !confirmDialog.status) return;

    try {
      setActionLoading(confirmDialog.appointmentId);
      
      // Find the appointment details for WhatsApp message
      const appointment = appointments.find(apt => apt.id === confirmDialog.appointmentId);
      
      // Update appointment status
      await appointmentService.updateAppointmentStatus(
        confirmDialog.appointmentId,
        confirmDialog.status,
        confirmDialog.status === 'cancelled' ? 'Cancelled by doctor' : 
        confirmDialog.status === 'no_show' ? 'Patient did not show up' : undefined
      );
      
      // Send WhatsApp confirmation if appointment is being confirmed and patient has phone
      if (confirmDialog.status === 'confirmed' && appointment && appointment.patient_phone) {
        const patientName = appointment.patient_first_name + (appointment.patient_last_name ? ` ${appointment.patient_last_name}` : '');
        sendWhatsAppConfirmation(
          appointment.patient_phone || '',
          patientName,
          appointment.appointment_date,
          appointment.start_time,
          appointment.end_time
        );
      }
      
      // Show success message first
      setSnackbar({
        open: true,
        message: `Appointment status updated to ${confirmDialog.status.replace('_', ' ')}${confirmDialog.status === 'confirmed' ? '. WhatsApp confirmation sent!' : ''}`,
        severity: 'success'
      });
      
      setConfirmDialog({ open: false, appointmentId: '', status: '', message: '' });
      
      // Try to refresh appointments, but don't let errors affect the success message
      try {
        await fetchAppointments();
      } catch (refreshError) {
        console.error('Failed to refresh appointments after update:', refreshError);
        // Optionally, you could show a separate message about refresh failure
      }
      
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to update appointment status',
        severity: 'error'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog({ open: false, appointmentId: '', status: '', message: '' });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
  };

  const handleWhatsAppContact = (phone: string, patientName: string) => {
    // Format phone number for WhatsApp (remove any non-digit characters except +)
    const formattedPhone = phone.replace(/[^\d+]/g, '');
    
    // Create WhatsApp message
    const message = `Hello ${patientName}, this is Dr. ${doctor.first_name}${doctor.last_name ? ` ${doctor.last_name}` : ''} regarding your appointment.`;
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    // Open WhatsApp in new window/tab
    window.open(whatsappUrl, '_blank');
  };


  const getStatsFromAppointments = () => {
    // Use appointments from selected date instead of only today's appointments
    const appointmentsToCount = appointments || [];
    console.log('Calculating stats from selected date appointments:', appointmentsToCount);
    console.log('Selected date:', selectedDate);
    console.log('Appointments length:', appointmentsToCount.length);
    
    if (!appointmentsToCount || !Array.isArray(appointmentsToCount)) {
      console.log('No appointments or not an array, returning zero stats');
      return { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0 };
    }
    
    const total = appointmentsToCount.length;
    const pending = appointmentsToCount.filter(a => a.status === 'pending').length;
    const confirmed = appointmentsToCount.filter(a => a.status === 'confirmed').length;
    const completed = appointmentsToCount.filter(a => a.status === 'completed').length;
    const cancelled = appointmentsToCount.filter(a => a.status === 'cancelled').length;
    const noShow = appointmentsToCount.filter(a => a.status === 'no_show').length;
    
    const stats = { total, pending, confirmed, completed, cancelled, noShow };
    console.log('Calculated stats for selected date:', stats);
    
    return stats;
  };

  const stats = getStatsFromAppointments();

  if (loading) {
    return (
      <Layout>
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={loading}
        >
          <Box display="flex" flexDirection="column" alignItems="center">
            <CircularProgress color="primary" size={60} />
            <Typography variant="h6" sx={{ mt: 2, color: 'primary.main' }}>
              Loading appointments...
            </Typography>
          </Box>
        </Backdrop>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Main Container with generous padding */}
      <Box sx={{ 
        px: { xs: 4, sm: 5 },  // 16-20px padding as requested
        py: { xs: 3, sm: 4 },
        maxWidth: '100%',
        mx: 'auto'
      }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        {/* MOBILE-FRIENDLY HEADER: Today's schedule + Doctor + Appointment count */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ 
            p: 4,
            backgroundColor: 'primary.main',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
            textAlign: 'center'
          }}>
            {/* Today's Schedule Title */}
            <Typography variant="h4" fontWeight="700" sx={{ mb: 1 }}>
              {
                selectedDate === new Date().toISOString().split('T')[0] ? "Today's Schedule" :
                selectedDate === new Date(Date.now() + 86400000).toISOString().split('T')[0] ? "Tomorrow's Schedule" :
                `Schedule for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
              }
            </Typography>
            
            {/* Doctor Name */}
            <Typography variant="h6" fontWeight="600" sx={{ opacity: 0.9, mb: 2 }}>
              Dr. {doctor.first_name}{doctor.last_name ? ` ${doctor.last_name}` : ''}
            </Typography>
            
            {/* Appointment Count Pill */}
            <Box sx={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              px: 3,
              py: 1.5,
              borderRadius: 25,
              border: '2px solid rgba(255, 255, 255, 0.3)'
            }}>
              <Assessment sx={{ fontSize: 20 }} />
              <Typography variant="body1" fontWeight="700">
                {stats.total} {stats.total === 1 ? 'appointment' : 'appointments'}
              </Typography>
            </Box>
          </Box>

        </Box>

        {/* SIMPLE MOBILE FILTERS: Date Chips + Status Segmented Control */}
        <Box sx={{ mb: 4 }}>
          {/* Date Selection Chips */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ 
              mb: 2, 
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: 0.5
            }}>
              Quick Date Selection
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              overflowX: 'auto',
              pb: 1,
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-track': { backgroundColor: 'grey.100', borderRadius: 2 },
              '&::-webkit-scrollbar-thumb': { backgroundColor: 'primary.main', borderRadius: 2 }
            }}>
              {[
                { 
                  label: 'Today', 
                  date: new Date().toISOString().split('T')[0],
                  icon: Today
                },
                { 
                  label: 'Tomorrow', 
                  date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                  icon: EventNote
                },
                { 
                  label: 'Pick Date', 
                  date: null,
                  icon: CalendarToday
                }
              ].map((dateOption, index) => {
                const isSelected = selectedDate === dateOption.date;
                const isPickDate = dateOption.date === null;
                
                return (
                  <Chip
                    key={dateOption.label}
                    label={dateOption.label}
                    onClick={() => {
                      if (isPickDate) {
                        setDatePickerOpen(true);
                      } else {
                        handleDateChange(dateOption.date!);
                      }
                    }}
                    variant={isSelected ? 'filled' : 'outlined'}
                    icon={dateOption.icon ? <dateOption.icon sx={{ fontSize: 18 }} /> : undefined}
                    sx={{
                      height: 44,  // 44px+ for easy tapping
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      borderRadius: 25,
                      minWidth: isPickDate ? 140 : 100,
                      cursor: 'pointer',
                      ...(isSelected ? {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'primary.dark'
                        }
                      } : {
                        backgroundColor: 'white',
                        borderColor: 'grey.300',
                        '&:hover': {
                          backgroundColor: 'primary.50',
                          borderColor: 'primary.main'
                        }
                      }),
                      transition: 'all 0.2s ease-in-out'
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Mobile-First Date Picker */}
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              open={datePickerOpen}
              onClose={() => setDatePickerOpen(false)}
              value={selectedDate ? dayjs(selectedDate) : dayjs()}
              onChange={(newValue) => {
                if (newValue) {
                  handleDateChange(newValue.format('YYYY-MM-DD'));
                  setDatePickerOpen(false);
                }
              }}
              minDate={dayjs()}
              slotProps={{
                textField: {
                  sx: { display: 'none' }
                },
                mobilePaper: {
                  sx: {
                    '& .MuiPickersCalendarHeader-root': {
                      paddingLeft: 2,
                      paddingRight: 2
                    },
                    '& .MuiDayCalendar-weekDayLabel': {
                      fontSize: '0.875rem',
                      fontWeight: 600
                    },
                    '& .MuiPickersDay-root': {
                      fontSize: '0.875rem',
                      width: 40,
                      height: 40
                    }
                  }
                }
              }}
            />
          </LocalizationProvider>

          {/* Status Segmented Control */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ 
              mb: 2, 
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: 0.5
            }}>
              Filter by Status
            </Typography>
            <Box sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              pb: 1,
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-track': { backgroundColor: 'grey.100', borderRadius: 2 },
              '&::-webkit-scrollbar-thumb': { backgroundColor: 'primary.main', borderRadius: 2 }
            }}>
              {[
                { value: 'all', label: 'All', icon: Assessment, count: stats.total },
                { value: 'pending', label: 'Pending', icon: Schedule, count: stats.pending },
                { value: 'confirmed', label: 'Confirmed', icon: CheckCircle, count: stats.confirmed },
                { value: 'completed', label: 'Completed', icon: Done, count: stats.completed }
              ].map((status) => {
                const isSelected = filterStatus === status.value;
                const IconComponent = status.icon;
                
                return (
                  <Chip
                    key={status.value}
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconComponent sx={{ fontSize: 16 }} />
                        <span>{status.label}</span>
                        <Box sx={{
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : 'primary.main',
                          color: isSelected ? 'inherit' : 'white',
                          borderRadius: '50%',
                          minWidth: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {status.count}
                        </Box>
                      </Box>
                    }
                    onClick={() => handleFilterChange(status.value)}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{
                      height: 44,  // 44px+ for easy tapping
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      borderRadius: 25,
                      cursor: 'pointer',
                      minWidth: 'fit-content',
                      ...(isSelected ? {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'primary.dark'
                        }
                      } : {
                        backgroundColor: 'white',
                        borderColor: 'grey.300',
                        '&:hover': {
                          backgroundColor: 'primary.50',
                          borderColor: 'primary.main'
                        }
                      }),
                      transition: 'all 0.2s ease-in-out'
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        </Box>
        {/* SCROLLABLE APPOINTMENT CARDS LIST - Single Column */}
        <Box>
          {appointments.length === 0 ? (
            <Box sx={{
              textAlign: 'center',
              py: 8,
              px: 4,
              backgroundColor: 'grey.50',
              borderRadius: 3,
              border: '2px dashed',
              borderColor: 'grey.300'
            }}>
              <Avatar sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: 'primary.main',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                mx: 'auto',
                mb: 2
              }}>
                <LocalHospital sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h6" fontWeight="600" color="text.primary" mb={1}>
                No appointments for this date
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a different date or check your schedule
              </Typography>
            </Box>
          ) : (
            /* Single Column List of Cards */
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3
            }}>
              {appointments.map((appointment, index) => (
                <Fade in timeout={200 + index * 50} key={appointment.id}>
                  <Card
                    elevation={2}
                    sx={{
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'grey.200',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                        borderColor: 'primary.light'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 4 }}>  {/* Generous padding */}
                      {/* Patient Info Section */}
                      <Box sx={{ mb: 3 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Box flex={1}>
                            <Typography variant="h5" fontWeight="700" color="text.primary" sx={{ mb: 0.5 }}>
                              {appointment.patient_first_name} {appointment.patient_last_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              backgroundColor: 'grey.100', 
                              px: 1.5, 
                              py: 0.5, 
                              borderRadius: 2,
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                              display: 'inline-block'
                            }}>
                              ID: #{appointment.id.slice(-6).toUpperCase()}
                            </Typography>
                          </Box>
                          <Chip
                            label={getStatusChipProps(appointment.status).label}
                            sx={{
                              backgroundColor: getStatusChipProps(appointment.status).bgColor,
                              color: getStatusChipProps(appointment.status).color,
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              height: 32,  // 44px+ for easy tapping
                              px: 1,
                              '& .MuiChip-label': {
                                px: 2
                              }
                            }}
                          />
                        </Box>

                        {/* Time and Type Info */}
                        <Box sx={{ mb: 3 }}>
                          <Box display="flex" alignItems="center" gap={2} mb={2}>
                            <AccessTime sx={{ fontSize: 24, color: 'primary.main' }} />
                            <Typography variant="h6" fontWeight="600" color="text.primary">
                              {formatTimeRange(appointment.start_time, appointment.end_time)}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={2}>
                            <EventNote sx={{ fontSize: 20, color: 'text.secondary' }} />
                            <Typography variant="body1" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                              {appointment.appointment_type?.replace('_', ' ') || 'Consultation'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Action Buttons - All 44px+ height for easy tapping */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Status Action Buttons */}
                        {appointment.status === 'pending' && (
                          <Box display="flex" gap={2}>
                            <Button
                              onClick={() => handleUpdateAppointmentStatus(appointment.id, 'confirmed')}
                              variant="contained"
                              color="success"
                              size="large"
                              disabled={actionLoading === appointment.id}
                              startIcon={actionLoading === appointment.id ? <CircularProgress size={20} /> : <CheckCircle sx={{ fontSize: 20 }} />}
                              sx={{ 
                                flex: 1,
                                height: 48,  // 44px+ for easy tapping
                                fontSize: '1rem', 
                                textTransform: 'none', 
                                fontWeight: 600,
                                borderRadius: 3
                              }}
                            >
                              Confirm
                            </Button>
                            <Button
                              onClick={() => handleUpdateAppointmentStatus(appointment.id, 'cancelled')}
                              variant="outlined"
                              color="error"
                              size="large"
                              disabled={actionLoading === appointment.id}
                              startIcon={<Cancel sx={{ fontSize: 20 }} />}
                              sx={{ 
                                flex: 1,
                                height: 48,  // 44px+ for easy tapping
                                fontSize: '1rem', 
                                textTransform: 'none', 
                                fontWeight: 600,
                                borderRadius: 3
                              }}
                            >
                              Cancel
                            </Button>
                          </Box>
                        )}
                        {appointment.status === 'confirmed' && (
                          <Box display="flex" gap={2}>
                            <Button
                              onClick={() => handleUpdateAppointmentStatus(appointment.id, 'completed')}
                              variant="contained"
                              color="primary"
                              size="large"
                              disabled={actionLoading === appointment.id}
                              startIcon={actionLoading === appointment.id ? <CircularProgress size={20} /> : <Done sx={{ fontSize: 20 }} />}
                              sx={{ 
                                flex: 1,
                                height: 48,  // 44px+ for easy tapping
                                fontSize: '1rem', 
                                textTransform: 'none', 
                                fontWeight: 600,
                                borderRadius: 3
                              }}
                            >
                              Complete
                            </Button>
                            <Button
                              onClick={() => handleUpdateAppointmentStatus(appointment.id, 'no_show')}
                              variant="outlined"
                              size="large"
                              disabled={actionLoading === appointment.id}
                              startIcon={<PersonOff sx={{ fontSize: 20 }} />}
                              sx={{ 
                                flex: 1,
                                height: 48,  // 44px+ for easy tapping
                                fontSize: '1rem', 
                                textTransform: 'none', 
                                fontWeight: 600,
                                borderRadius: 3
                              }}
                            >
                              No Show
                            </Button>
                          </Box>
                        )}

                        {/* Contact Action Buttons */}
                        <Box display="flex" gap={2}>
                          <Button
                            onClick={() => handleWhatsAppContact(
                              appointment.patient_phone || '', 
                              appointment.patient_first_name + (appointment.patient_last_name ? ` ${appointment.patient_last_name}` : '')
                            )}
                            variant="contained"
                            size="large"
                            startIcon={<WhatsApp sx={{ fontSize: 20 }} />}
                            sx={{ 
                              flex: 1,
                              height: 48,  // 44px+ for easy tapping
                              fontSize: '1rem',
                              bgcolor: '#25D366',
                              color: 'white',
                              textTransform: 'none',
                              fontWeight: '600',
                              borderRadius: 3,
                              '&:hover': {
                                bgcolor: '#22c55e',
                                transform: 'translateY(-1px)'
                              },
                              transition: 'all 0.2s ease-in-out'
                            }}
                          >
                            WhatsApp
                          </Button>
                          <Button
                            onClick={() => window.open(`tel:${appointment.patient_phone || ''}`, '_self')}
                            variant="contained"
                            size="large"
                            startIcon={<Phone sx={{ fontSize: 20 }} />}
                            sx={{ 
                              flex: 1,
                              height: 48,  // 44px+ for easy tapping
                              fontSize: '1rem',
                              bgcolor: 'primary.main',
                              color: 'white',
                              textTransform: 'none',
                              fontWeight: '600',
                              borderRadius: 3,
                              '&:hover': {
                                bgcolor: 'primary.dark',
                                transform: 'translateY(-1px)'
                              },
                              transition: 'all 0.2s ease-in-out'
                            }}
                          >
                            Call
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
              ))}
            </Box>
          )}
        </Box>

        {/* Confirmation Dialog */}
        <Dialog
          open={confirmDialog.open}
          onClose={handleCloseConfirmDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar sx={{ 
                bgcolor: confirmDialog.status === 'cancelled' ? 'error.main' : 'primary.main',
                width: 32,
                height: 32
              }}>
                {confirmDialog.status === 'confirmed' ? (
                  <CheckCircle sx={{ fontSize: 18 }} />
                ) : confirmDialog.status === 'cancelled' ? (
                  <Cancel sx={{ fontSize: 18 }} />
                ) : confirmDialog.status === 'completed' ? (
                  <Done sx={{ fontSize: 18 }} />
                ) : (
                  <PersonOff sx={{ fontSize: 18 }} />
                )}
              </Avatar>
              <Typography variant="h6" fontWeight="600">
                Confirm Action
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box display="flex" alignItems="center" gap={2} py={2}>
              <Avatar sx={{ 
                bgcolor: 'warning.main',
                background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)'
              }}>
                <EventNote />
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight="500">
                  {confirmDialog.message}
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  This action cannot be undone
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button 
              onClick={handleCloseConfirmDialog} 
              variant="outlined"
              startIcon={<Cancel sx={{ fontSize: 16 }} />}
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmStatusUpdate}
              variant="contained"
              disabled={!!actionLoading}
              color={confirmDialog.status === 'cancelled' ? 'error' : 'primary'}
              startIcon={
                actionLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : confirmDialog.status === 'confirmed' ? (
                  <CheckCircle sx={{ fontSize: 16 }} />
                ) : confirmDialog.status === 'cancelled' ? (
                  <Cancel sx={{ fontSize: 16 }} />
                ) : confirmDialog.status === 'completed' ? (
                  <Done sx={{ fontSize: 16 }} />
                ) : (
                  <PersonOff sx={{ fontSize: 16 }} />
                )
              }
              sx={{ borderRadius: 2 }}
            >
              {actionLoading ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
};

export default DoctorDashboard;