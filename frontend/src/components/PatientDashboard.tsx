import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/SimpleAuthContext';
import { Patient, Doctor } from '../types';
import { appointmentService, TimeSlot, CreateAppointmentData } from '../services/appointmentService';
import { doctorService } from '../services/doctorService';
import Layout from './Layout';
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Box,
  Button,
  Paper,
  Fade,
  TextField,
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
  Backdrop
} from '@mui/material';
import {
  LocalHospital,
  Star,
  CheckCircle,
  CalendarToday,
  AccessTime,
  Add,
  MedicalServices,
  Schedule
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const PatientDashboard: React.FC = () => {
  const { profile } = useAuth();
  const patient = profile as Patient;

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [appointmentType, setAppointmentType] = useState<string>('consultation');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, data: null as CreateAppointmentData | null });

  const fetchData = useCallback(async () => {
    try {
      const doctorsData = await doctorService.getAvailableDoctors();
      
      setDoctors(doctorsData);
      setError('');
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDoctorSelect = async (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);
    setAvailableSlots([]);
    
    if (selectedDate) {
      await fetchAvailableSlots(doctor.id, selectedDate);
    }
  };

  const handleDateSelect = async (date: string) => {
    console.log('🔍 Date selected from input:', date);
    console.log('🔍 Date type:', typeof date);
    console.log('🔍 Date object from input:', new Date(date));
    console.log('🔍 ISO string from input:', new Date(date).toISOString());
    setSelectedDate(date);
    setSelectedSlot(null);
    
    if (selectedDoctor) {
      await fetchAvailableSlots(selectedDoctor.id, date);
    }
  };

  const fetchAvailableSlots = async (doctorId: string, date: string) => {
    try {
      setLoading(true);
      const slots = await appointmentService.getAvailableSlots(doctorId, date);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
      setError('Failed to load available slots');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      setError('Please select a doctor, date, and time slot');
      return;
    }

    setBookingLoading(true);
    setError('');

    try {
      const appointmentData: CreateAppointmentData = {
        doctor_id: selectedDoctor.id,
        patient_id: patient.id,
        appointment_date: selectedDate,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        appointment_type: appointmentType,
        notes: notes
      };

      setConfirmDialog({ open: true, data: appointmentData });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to book appointment',
        severity: 'error'
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!confirmDialog.data) return;

    try {
      setBookingLoading(true);
      await appointmentService.createAppointment(confirmDialog.data);
      
      // Refresh available slots
      if (selectedDoctor && selectedDate) {
        await fetchAvailableSlots(selectedDoctor.id, selectedDate);
      }

      // Reset form
      setSelectedSlot(null);
      setNotes('');
      setError('');
      setConfirmDialog({ open: false, data: null });
      setSnackbar({
        open: true,
        message: 'Appointment booked successfully!',
        severity: 'success'
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to book appointment',
        severity: 'error'
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog({ open: false, data: null });
  };

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
              Loading doctors...
            </Typography>
          </Box>
        </Backdrop>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 6 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Welcome Section */}
        <Paper
          elevation={3}
          sx={{
            mb: 4,
            p: { xs: 3, sm: 4 },
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: { xs: 50, sm: 64 },
                height: { xs: 50, sm: 64 },
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <MedicalServices sx={{ fontSize: { xs: 24, sm: 32 } }} />
            </Avatar>
            <Box>
              <Typography
                variant="h4"
                fontWeight="700"
                sx={{
                  fontSize: { xs: '1.5rem', sm: '2.125rem' },
                  mb: 0.5
                }}
              >
                Welcome, {patient.first_name}{patient.last_name && ` ${patient.last_name}`}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  opacity: 0.9,
                  fontWeight: 400,
                  fontSize: { xs: '0.875rem', sm: '1.125rem' }
                }}
              >
                Book appointments with our specialist doctors
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Main Booking Section */}
        <Box maxWidth="lg" mx="auto">
          <Card
            elevation={8}
            sx={{
              borderRadius: 4,
              overflow: 'visible',
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {/* Section Header */}
            <CardContent sx={{ pt: 4, pb: 2, px: { xs: 3, sm: 4 } }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)'
                  }}
                >
                  <Add sx={{ fontSize: 24 }} />
                </Avatar>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight="700"
                    color="text.primary"
                    sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
                  >
                    Book New Appointment
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    Choose your preferred doctor and time slot
                  </Typography>
                </Box>
              </Box>
            </CardContent>

            <CardContent sx={{ px: { xs: 3, sm: 4 }, pt: 0 }}>
              {/* Doctor Selection Section */}
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  mb: 4,
                  borderRadius: 3,
                  background: 'white',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Schedule color="primary" sx={{ fontSize: 28 }} />
                  <Box>
                    <Typography
                      variant="h5"
                      fontWeight="600"
                      color="text.primary"
                    >
                      Choose Your Doctor
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Browse our available specialists
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
                  gap: 2, 
                  maxHeight: 400, 
                  overflowY: 'auto' 
                }}>
                  {doctors.map((doctor) => (
                    <Fade in timeout={300} key={doctor.id}>
                      <Card
                        onClick={() => handleDoctorSelect(doctor)}
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: selectedDoctor?.id === doctor.id ? 'scale(1.02)' : 'scale(1)',
                          border: selectedDoctor?.id === doctor.id ? '3px solid' : '1px solid',
                          borderColor: selectedDoctor?.id === doctor.id ? 'primary.main' : 'grey.300',
                          background: selectedDoctor?.id === doctor.id 
                            ? 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)'
                            : 'white',
                          boxShadow: selectedDoctor?.id === doctor.id 
                            ? '0 12px 40px rgba(25, 118, 210, 0.2)'
                            : '0 4px 16px rgba(0, 0, 0, 0.08)',
                          borderRadius: 3,
                          '&:hover': {
                            transform: 'scale(1.02)',
                            boxShadow: '0 12px 40px rgba(25, 118, 210, 0.2)',
                            borderColor: 'primary.main'
                          }
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box display="flex" alignItems="center" gap={3}>
                            <Box position="relative">
                              <Avatar
                                sx={{
                                  width: 72,
                                  height: 72,
                                  background: `linear-gradient(135deg, ${
                                    ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][doctor.id.charCodeAt(0) % 5]
                                  } 0%, ${
                                    ['#FF8E8E', '#81E6D9', '#68D391', '#A78BFA', '#FBD38D'][doctor.id.charCodeAt(0) % 5]
                                  } 100%)`,
                                  fontSize: '2rem',
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                  border: '3px solid white'
                                }}
                              >
                                <LocalHospital sx={{ fontSize: 32 }} />
                              </Avatar>
                              {selectedDoctor?.id === doctor.id && (
                                <CheckCircle 
                                  color="primary" 
                                  sx={{ 
                                    position: 'absolute',
                                    bottom: -4,
                                    right: -4,
                                    fontSize: 24,
                                    backgroundColor: 'white',
                                    borderRadius: '50%'
                                  }} 
                                />
                              )}
                            </Box>
                            <Box flex={1}>
                              <Typography 
                                variant="h6" 
                                fontWeight="700" 
                                color="text.primary"
                                sx={{ fontSize: '1.25rem', mb: 1 }}
                              >
                                Dr. {doctor.first_name}{doctor.last_name && ` ${doctor.last_name}`}
                              </Typography>
                              
                              <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <Chip
                                  label={doctor.specialization}
                                  size="medium"
                                  sx={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    fontWeight: '600',
                                    fontSize: '0.875rem',
                                    '& .MuiChip-icon': { color: 'white !important' }
                                  }}
                                  icon={<Star />}
                                />
                                {doctor.is_available && (
                                  <Chip
                                    label="Available"
                                    size="small"
                                    sx={{
                                      bgcolor: 'success.main',
                                      color: 'white',
                                      fontSize: '0.75rem'
                                    }}
                                  />
                                )}
                              </Box>
                              
                              <Box display="flex" alignItems="center" gap={1}>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    px: 2,
                                    py: 1,
                                    borderRadius: 2,
                                    bgcolor: 'success.50',
                                    border: '1px solid',
                                    borderColor: 'success.200'
                                  }}
                                >
                                  <Typography
                                    variant="h6"
                                    sx={{
                                      color: 'success.main',
                                      fontWeight: '700'
                                    }}
                                  >
                                    ₹{doctor.consultation_fee}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    consultation fee
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Fade>
                  ))}
                </Box>
              </Paper>

              {/* Date Selection Section */}
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  mb: 4,
                  borderRadius: 3,
                  background: 'white',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <CalendarToday color="primary" sx={{ fontSize: 28 }} />
                  <Box>
                    <Typography
                      variant="h5"
                      fontWeight="600"
                      color="text.primary"
                    >
                      Select Date
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pick your preferred appointment date
                    </Typography>
                  </Box>
                </Box>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Select Date"
                    value={selectedDate ? dayjs(selectedDate) : null}
                    onChange={(newValue) => {
                      if (newValue) {
                        handleDateSelect(newValue.format('YYYY-MM-DD'));
                      }
                    }}
                    minDate={dayjs().add(1, 'day')}
                    disabled={!selectedDoctor}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        variant: 'outlined',
                        InputProps: {
                          startAdornment: (
                            <CalendarToday sx={{ color: 'primary.main', mr: 1 }} />
                          )
                        },
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '&:hover fieldset': {
                              borderColor: 'primary.main'
                            }
                          }
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Paper>

              {/* Time Slot Selection */}
              {availableSlots.length > 0 && (
                <Paper
                  elevation={2}
                  sx={{
                    p: 3,
                    mb: 4,
                    borderRadius: 3,
                    background: 'white',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <AccessTime color="primary" sx={{ fontSize: 28 }} />
                    <Box>
                      <Typography
                        variant="h5"
                        fontWeight="600"
                        color="text.primary"
                      >
                        Available Time Slots
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Choose your convenient time
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, 
                    gap: 1.5, 
                    maxHeight: 300, 
                    overflowY: 'auto' 
                  }}>
                    {availableSlots.map((slot, index) => (
                      <Paper
                        key={index}
                        onClick={() => handleSlotSelect(slot)}
                        elevation={selectedSlot === slot ? 8 : 2}
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          background: selectedSlot === slot 
                            ? 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)'
                            : 'white',
                          color: selectedSlot === slot ? 'white' : 'text.primary',
                          border: selectedSlot === slot ? '2px solid #1976d2' : '1px solid #e0e0e0',
                          borderRadius: 2,
                          textAlign: 'center',
                          transform: selectedSlot === slot ? 'scale(1.02)' : 'scale(1)',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            boxShadow: '0 8px 24px rgba(25, 118, 210, 0.15)',
                            borderColor: 'primary.main'
                          }
                        }}
                      >
                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                          <AccessTime sx={{ fontSize: 16 }} />
                          <Typography 
                            variant="body2" 
                            fontWeight="600"
                            sx={{ fontSize: '0.875rem' }}
                          >
                            {appointmentService.formatTimeSlot(slot)}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Paper>
              )}

              {selectedDate && selectedDoctor && availableSlots.length === 0 && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                  No available slots for this date. Please try another date.
                </Alert>
              )}

              {/* Appointment Type & Notes Section */}
              {selectedSlot && (
                <Paper
                  elevation={2}
                  sx={{
                    p: 3,
                    mb: 4,
                    borderRadius: 3,
                    background: 'white',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <MedicalServices color="primary" sx={{ fontSize: 28 }} />
                    <Box>
                      <Typography
                        variant="h5"
                        fontWeight="600"
                        color="text.primary"
                      >
                        Appointment Details
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Provide additional information for your visit
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box mb={3}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Appointment Type</InputLabel>
                      <Select
                        value={appointmentType}
                        onChange={(e) => setAppointmentType(e.target.value)}
                        label="Appointment Type"
                        sx={{
                          borderRadius: 2,
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main'
                          }
                        }}
                      >
                        <MenuItem value="consultation">Consultation</MenuItem>
                        <MenuItem value="follow_up">Follow-up</MenuItem>
                        <MenuItem value="routine_checkup">Routine Checkup</MenuItem>
                        <MenuItem value="emergency">Emergency</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <Box mb={3}>
                    <TextField
                      label="Notes (Optional)"
                      multiline
                      rows={3}
                      fullWidth
                      variant="outlined"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe your symptoms or reason for visit..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: 'primary.main'
                          }
                        }
                      }}
                    />
                  </Box>
                </Paper>
              )}

              {/* Book Button */}
              {selectedSlot && (
                <Box sx={{ px: 3, pb: 3 }}>
                  <Button
                    onClick={handleBookAppointment}
                    disabled={bookingLoading}
                    variant="contained"
                    fullWidth
                    size="large"
                    sx={{
                      py: 2,
                      borderRadius: 3,
                      background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                      boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      textTransform: 'none',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #43A047 30%, #7CB342 90%)',
                        boxShadow: '0 12px 40px rgba(76, 175, 80, 0.4)',
                        transform: 'translateY(-2px)'
                      },
                      '&:disabled': {
                        background: 'linear-gradient(45deg, #9E9E9E 30%, #BDBDBD 90%)',
                        color: 'white'
                      },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    {bookingLoading ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <CircularProgress size={20} color="inherit" />
                        Booking...
                      </Box>
                    ) : (
                      'Book Appointment'
                    )}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialog.open} 
        onClose={handleCloseConfirmDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: '600' }}>
            Confirm Appointment Booking
          </Typography>
        </DialogTitle>
        <DialogContent>
          {confirmDialog.data && (
            <Box sx={{ pt: 1 }}>
              <Paper sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                      <LocalHospital />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="600">
                        Dr. {selectedDoctor?.first_name}{selectedDoctor?.last_name && ` ${selectedDoctor.last_name}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedDoctor?.specialization}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Date
                      </Typography>
                      <Typography variant="body1" fontWeight="600">
                        {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Time
                      </Typography>
                      <Typography variant="body1" fontWeight="600">
                        {selectedSlot && appointmentService.formatTimeSlot(selectedSlot)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Appointment Type
                    </Typography>
                    <Typography variant="body1" fontWeight="600" sx={{ textTransform: 'capitalize' }}>
                      {appointmentType.replace('_', ' ')}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Consultation Fee
                    </Typography>
                    <Typography variant="h6" color="success.main" fontWeight="600">
                      ₹{selectedDoctor?.consultation_fee}
                    </Typography>
                  </Box>
                  
                  {notes && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Notes
                      </Typography>
                      <Typography variant="body1">
                        {notes}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCloseConfirmDialog} 
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmBooking} 
            variant="contained" 
            disabled={bookingLoading}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #43A047 30%, #7CB342 90%)'
              }
            }}
          >
            {bookingLoading ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={16} color="inherit" />
                Booking...
              </Box>
            ) : (
              'Confirm Booking'
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
          severity={snackbar.severity as 'success' | 'error'} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default PatientDashboard;