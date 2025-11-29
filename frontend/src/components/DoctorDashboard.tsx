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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Backdrop,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Person,
  Schedule,
  CheckCircle,
  Cancel,
  Error,
  Done,
  PersonOff,
  Assessment,
  AccessTime,
  Phone,
  CalendarToday,
  FilterList,
  Refresh,
  WhatsApp,
  LocalHospital,
  Badge,
  ContactPhone,
  Email,
  EventNote,
  Today
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
          appointment.patient_phone,
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
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}


        {/* Selected Date Statistics */}
        <Box mb={3}>
          <Typography variant="h6" fontWeight="600" color="text.primary" mb={2} display="flex" alignItems="center" gap={1}>
            <Assessment color="primary" sx={{ fontSize: 24 }} />
            Statistics for 
            <Box display="flex" alignItems="center" gap={0.5} ml={0.5}>
              <Today color="primary" sx={{ fontSize: 20 }} />
              {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Selected Date'}
            </Box>
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' },
            gap: { xs: 1.5, sm: 2 }
          }}>
            {[
              { label: 'Total', value: stats.total, icon: Assessment, color: 'primary', gradient: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)' },
              { label: 'Pending', value: stats.pending, icon: Schedule, color: 'warning', gradient: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)' },
              { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle, color: 'info', gradient: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)' },
              { label: 'Completed', value: stats.completed, icon: Done, color: 'success', gradient: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)' },
              { label: 'Cancelled', value: stats.cancelled, icon: Cancel, color: 'error', gradient: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)' },
              { label: 'No Show', value: stats.noShow, icon: PersonOff, color: 'inherit', gradient: 'linear-gradient(135deg, #9E9E9E 0%, #616161 100%)' }
            ].map((stat, index) => (
              <Fade in timeout={300 + index * 100} key={stat.label}>
                <Card
                  sx={{
                    background: stat.gradient,
                    color: 'white',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: 'scale(1)',
                    '&:hover': {
                      transform: 'scale(1.05) translateY(-4px)',
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        mb: 1,
                        mx: 'auto'
                      }}
                    >
                      <stat.icon sx={{ color: 'white' }} />
                    </Avatar>
                    <Typography variant="caption" fontWeight="700" display="block" sx={{ opacity: 0.9, mb: 0.5 }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="h5" fontWeight="700">
                      {stat.value}
                    </Typography>
                  </CardContent>
                </Card>
              </Fade>
            ))}
          </Box>
        </Box>

        {/* Appointment Management */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              p: 3
            }}
          >
            {/* Header Section */}
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 48, height: 48 }}>
                <CalendarToday sx={{ fontSize: 24 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="700">
                  Appointment Management
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Manage your appointments and patient interactions
                </Typography>
              </Box>
            </Box>

            {/* Control Bar */}
            <Box 
              sx={{
                mt: 4,
                mb: 3,
                p: 3,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                backdropFilter: 'blur(10px)'
              }}
            >
              <Box 
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', lg: 'row' },
                  alignItems: { xs: 'stretch', lg: 'end' },
                  gap: 3,
                  flexWrap: { xs: 'wrap', lg: 'nowrap' }
                }}
              >
                {/* Refresh Button */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '600',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Actions
                  </Typography>
                  <Button
                    onClick={fetchAppointments}
                    variant="contained"
                    startIcon={
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Refresh sx={{ fontSize: 18 }} />
                        <CalendarToday sx={{ fontSize: 16 }} />
                      </Box>
                    }
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      borderRadius: 2,
                      minWidth: 200,
                      height: 48,
                      fontWeight: '600',
                      textTransform: 'none',
                      px: 2,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.3)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    Refresh Appointments
                  </Button>
                </Box>

                {/* Date Picker */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 220 }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '600',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    <CalendarToday sx={{ fontSize: 14 }} />
                    Select Date
                  </Typography>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      value={selectedDate ? dayjs(selectedDate) : dayjs()}
                      onChange={(newValue) => {
                        if (newValue) {
                          handleDateChange(newValue.format('YYYY-MM-DD'));
                        }
                      }}
                      slotProps={{
                        textField: {
                          variant: 'outlined',
                          InputProps: {
                            sx: { 
                              bgcolor: 'rgba(255, 255, 255, 0.95)', 
                              borderRadius: 2,
                              height: 48,
                              px: 2,
                              '&:hover': { 
                                bgcolor: 'white',
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'rgba(255, 255, 255, 0.5)'
                                }
                              },
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'rgba(255, 255, 255, 0.3)'
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'white'
                              },
                              '& input': {
                                textAlign: 'center',
                                fontWeight: '500'
                              }
                            }
                          },
                          sx: { minWidth: 220 }
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Box>

                {/* Status Filter */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 200 }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '600',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    <FilterList sx={{ fontSize: 14 }} />
                    Status Filter
                  </Typography>
                  <FormControl variant="outlined">
                    <Select
                      value={filterStatus}
                      onChange={(e) => handleFilterChange(e.target.value)}
                      displayEmpty
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: 2,
                        height: 48,
                        '&:hover': { 
                          bgcolor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.5)'
                          }
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white'
                        },
                        '& .MuiSelect-select': {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          fontWeight: '500'
                        }
                      }}
                    >
                      <MenuItem value="all">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Assessment sx={{ fontSize: 18 }} />
                          All Status
                        </Box>
                      </MenuItem>
                      <MenuItem value="pending">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Schedule sx={{ fontSize: 18, color: 'warning.main' }} />
                          Pending
                        </Box>
                      </MenuItem>
                      <MenuItem value="confirmed">
                        <Box display="flex" alignItems="center" gap={1}>
                          <CheckCircle sx={{ fontSize: 18, color: 'info.main' }} />
                          Confirmed
                        </Box>
                      </MenuItem>
                      <MenuItem value="completed">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Done sx={{ fontSize: 18, color: 'success.main' }} />
                          Completed
                        </Box>
                      </MenuItem>
                      <MenuItem value="cancelled">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Cancel sx={{ fontSize: 18, color: 'error.main' }} />
                          Cancelled
                        </Box>
                      </MenuItem>
                      <MenuItem value="no_show">
                        <Box display="flex" alignItems="center" gap={1}>
                          <PersonOff sx={{ fontSize: 18, color: 'text.secondary' }} />
                          No Show
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Box>
          </Box>
          
          {/* Appointments List */}
          <CardContent sx={{ p: 0 }}>
            {appointments.length === 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center" py={8} px={4}>
                <Box position="relative" mb={2}>
                  <Avatar sx={{ 
                    width: 80, 
                    height: 80, 
                    bgcolor: 'primary.main',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                  }}>
                    <LocalHospital sx={{ fontSize: 40 }} />
                  </Avatar>
                  <Avatar sx={{ 
                    position: 'absolute',
                    bottom: -8,
                    right: -8,
                    width: 32,
                    height: 32,
                    bgcolor: 'background.paper',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}>
                    <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                  </Avatar>
                </Box>
                <Typography variant="h6" fontWeight="600" color="text.primary" mb={1} display="flex" alignItems="center" gap={1}>
                  <EventNote sx={{ fontSize: 20, color: 'text.secondary' }} />
                  No appointments for this date
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Select a different date or check your schedule
                </Typography>
              </Box>
            ) : (
              <Box p={2}>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                  gap: 2
                }}>
                  {appointments.map((appointment, index) => (
                    <Fade in timeout={300 + index * 100} key={appointment.id}>
                      <Card
                        elevation={2}
                        sx={{
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)'
                          }
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          {/* Patient Info */}
                          <Box display="flex" alignItems="center" gap={2} mb={2}>
                            <Avatar sx={{ 
                              bgcolor: 'primary.main',
                              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                            }}>
                              <Badge sx={{ fontSize: 20 }} />
                            </Avatar>
                            <Box flex={1} minWidth={0}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="subtitle1" fontWeight="600" noWrap>
                                  {appointment.patient_first_name} {appointment.patient_last_name}
                                </Typography>
                              </Box>
                              {appointment.patient_phone && (
                                <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                                  <ContactPhone sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary" noWrap>
                                    {appointment.patient_phone}
                                  </Typography>
                                </Box>
                              )}
                              {appointment.patient_email && (
                                <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                                  <Email sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary" noWrap>
                                    {appointment.patient_email}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>

                          {/* Appointment Details */}
                          <Box mb={2}>
                            {/* Time */}
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <AccessTime color="primary" sx={{ fontSize: 18 }} />
                              <Typography variant="body2" fontWeight="600" display="flex" alignItems="center" gap={0.5}>
                                <span>{appointment.start_time} - {appointment.end_time}</span>
                              </Typography>
                            </Box>
                            
                            {/* Appointment Type */}
                            <Box display="flex" alignItems="center" gap={1}>
                              <EventNote sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                {appointment.appointment_type?.replace('_', ' ') || 'Consultation'}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Status */}
                          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                            <Chip
                              label={appointment.status === 'no_show' ? 'No Show' : appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace('_', ' ')}
                              color={
                                appointment.status === 'pending' ? 'warning' :
                                appointment.status === 'confirmed' ? 'info' :
                                appointment.status === 'completed' ? 'success' :
                                appointment.status === 'cancelled' ? 'error' :
                                'default'
                              }
                              size="small"
                              variant="filled"
                            />
                          </Box>

                          {/* Action Buttons */}
                          <Box display="flex" gap={1}>
                            {appointment.status === 'pending' && (
                              <>
                                <Button
                                  onClick={() => handleUpdateAppointmentStatus(appointment.id, 'confirmed')}
                                  variant="contained"
                                  size="small"
                                  color="success"
                                  disabled={actionLoading === appointment.id}
                                  startIcon={actionLoading === appointment.id ? <CircularProgress size={16} /> : <CheckCircle />}
                                  sx={{ fontSize: '0.75rem', flex: 1 }}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  onClick={() => handleUpdateAppointmentStatus(appointment.id, 'cancelled')}
                                  variant="contained"
                                  size="small"
                                  color="error"
                                  disabled={actionLoading === appointment.id}
                                  startIcon={<Cancel />}
                                  sx={{ fontSize: '0.75rem', flex: 1 }}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            {appointment.status === 'confirmed' && (
                              <>
                                <Button
                                  onClick={() => handleUpdateAppointmentStatus(appointment.id, 'completed')}
                                  variant="contained"
                                  size="small"
                                  color="primary"
                                  disabled={actionLoading === appointment.id}
                                  startIcon={actionLoading === appointment.id ? <CircularProgress size={16} /> : <Done />}
                                  sx={{ fontSize: '0.75rem', flex: 1 }}
                                >
                                  Complete
                                </Button>
                                <Button
                                  onClick={() => handleUpdateAppointmentStatus(appointment.id, 'no_show')}
                                  variant="outlined"
                                  size="small"
                                  disabled={actionLoading === appointment.id}
                                  startIcon={<PersonOff />}
                                  sx={{ fontSize: '0.75rem', flex: 1 }}
                                >
                                  No Show
                                </Button>
                              </>
                            )}
                          </Box>

                          {/* Contact Actions */}
                          {appointment.patient_phone && (
                            <Box display="flex" gap={1} mt={1}>
                              <Button
                                onClick={() => handleWhatsAppContact(
                                  appointment.patient_phone, 
                                  appointment.patient_first_name + (appointment.patient_last_name ? ` ${appointment.patient_last_name}` : '')
                                )}
                                variant="contained"
                                size="small"
                                startIcon={<WhatsApp sx={{ fontSize: 16 }} />}
                                sx={{ 
                                  fontSize: '0.75rem', 
                                  flex: 1,
                                  height: 36,
                                  bgcolor: '#25D366',
                                  color: 'white',
                                  textTransform: 'none',
                                  fontWeight: '600',
                                  borderRadius: 2,
                                  boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
                                  '&:hover': {
                                    bgcolor: '#22c55e',
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)'
                                  },
                                  transition: 'all 0.2s ease-in-out'
                                }}
                              >
                                WhatsApp
                              </Button>
                              <Button
                                onClick={() => window.open(`tel:${appointment.patient_phone}`, '_self')}
                                variant="contained"
                                size="small"
                                startIcon={<Phone sx={{ fontSize: 16 }} />}
                                sx={{ 
                                  fontSize: '0.75rem', 
                                  flex: 1,
                                  height: 36,
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  textTransform: 'none',
                                  fontWeight: '600',
                                  borderRadius: 2,
                                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                                  '&:hover': {
                                    bgcolor: 'primary.dark',
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)'
                                  },
                                  transition: 'all 0.2s ease-in-out'
                                }}
                              >
                                Call
                              </Button>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Fade>
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

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