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
  Refresh
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

  const handleConfirmStatusUpdate = async () => {
    if (!confirmDialog.appointmentId || !confirmDialog.status) return;

    try {
      setActionLoading(confirmDialog.appointmentId);
      await appointmentService.updateAppointmentStatus(
        confirmDialog.appointmentId,
        confirmDialog.status,
        confirmDialog.status === 'cancelled' ? 'Cancelled by doctor' : 
        confirmDialog.status === 'no_show' ? 'Patient did not show up' : undefined
      );
      await fetchAppointments();
      setSnackbar({
        open: true,
        message: `Appointment status updated to ${confirmDialog.status.replace('_', ' ')}`,
        severity: 'success'
      });
      setConfirmDialog({ open: false, appointmentId: '', status: '', message: '' });
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
            <Assessment color="primary" />
            Statistics for {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : 'Selected Date'}
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
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
                  <CalendarToday />
                </Avatar>
                <Typography variant="h6" fontWeight="700">
                  Appointment Management
                </Typography>
                <Tooltip title="Refresh appointments">
                  <IconButton 
                    onClick={fetchAppointments} 
                    size="small" 
                    sx={{ color: 'white', ml: 1 }}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} width={{ xs: '100%', sm: 'auto' }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Select Date"
                    value={selectedDate ? dayjs(selectedDate) : dayjs()}
                    onChange={(newValue) => {
                      if (newValue) {
                        handleDateChange(newValue.format('YYYY-MM-DD'));
                      }
                    }}
                    slotProps={{
                      textField: {
                        size: 'small',
                        variant: 'filled',
                        InputProps: {
                          sx: { 
                            bgcolor: 'rgba(255, 255, 255, 0.9)', 
                            borderRadius: 1,
                            '&:hover': { bgcolor: 'white' }
                          }
                        },
                        sx: { minWidth: 160 }
                      }
                    }}
                  />
                </LocalizationProvider>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel sx={{ color: 'white' }}>Status Filter</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    variant="filled"
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'white' }
                    }}
                    startAdornment={<FilterList sx={{ mr: 1, color: 'action.active' }} />}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="confirmed">Confirmed</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                    <MenuItem value="no_show">No Show</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Box>
          
          {/* Appointments List */}
          <CardContent sx={{ p: 0 }}>
            {appointments.length === 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center" py={8} px={4}>
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', mb: 2 }}>
                  <CalendarToday sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h6" fontWeight="600" color="text.primary" mb={1}>
                  No appointments for this date
                </Typography>
                <Typography variant="body2" color="text.secondary">
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
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              <Person />
                            </Avatar>
                            <Box flex={1} minWidth={0}>
                              <Typography variant="subtitle1" fontWeight="600" noWrap>
                                {appointment.patient_first_name} {appointment.patient_last_name}
                              </Typography>
                              {appointment.patient_phone && (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <Phone sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary" noWrap>
                                    {appointment.patient_phone}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>

                          {/* Time */}
                          <Box display="flex" alignItems="center" gap={1} mb={2}>
                            <AccessTime color="primary" sx={{ fontSize: 20 }} />
                            <Typography variant="body2" fontWeight="600">
                              {appointment.start_time} - {appointment.end_time}
                            </Typography>
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
            <Typography variant="h6" fontWeight="600">
              Confirm Action
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box display="flex" alignItems="center" gap={2} py={2}>
              <Avatar sx={{ bgcolor: 'warning.main' }}>
                <Error />
              </Avatar>
              <Typography>
                {confirmDialog.message}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseConfirmDialog} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmStatusUpdate}
              variant="contained"
              disabled={!!actionLoading}
              color={confirmDialog.status === 'cancelled' ? 'error' : 'primary'}
            >
              {actionLoading ? (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={16} />
                  Updating...
                </Box>
              ) : (
                'Confirm'
              )}
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