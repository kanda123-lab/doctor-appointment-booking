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
  Schedule,
  Cancel,
  QueueMusic,
  Business,
  Apartment,
  Phone,
  Person,
  NotificationsActive,
  DoneAll
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
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('+91-');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, data: null as CreateAppointmentData | null });
  
  // Validation states
  const [formErrors, setFormErrors] = useState({
    patientName: '',
    patientPhone: ''
  });

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

  // Validation functions
  const validatePatientName = (name: string): string => {
    if (!name.trim()) return 'Patient name is required';
    if (name.trim().length < 2) return 'Name must be at least 2 characters';
    if (name.trim().length > 100) return 'Name must be less than 100 characters';
    return '';
  };

  const validatePhoneNumber = (phone: string): string => {
    if (!phone.trim()) return 'Phone number is required';
    // Support multiple international formats
    const phoneRegex = /^(\+\d{1,3}[- ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$|^\+\d{10,15}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return 'Please enter a valid phone number (e.g., +91-9876543210)';
    }
    return '';
  };

  const validateForm = (): boolean => {
    const errors = {
      patientName: validatePatientName(patientName),
      patientPhone: validatePhoneNumber(patientPhone)
    };

    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

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

    // Validate patient information
    if (!validateForm()) {
      setError('Please fix the errors in the form before proceeding');
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
        notes: notes,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim()
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
      setPatientName('');
      setPatientPhone('+91-');
      setFormErrors({ patientName: '', patientPhone: '' });
      setError('');
      setConfirmDialog({ open: false, data: null });
      
      setSnackbar({
        open: true,
        message: '🎉 Appointment booked successfully! You will receive a confirmation shortly.',
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
      <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 4, sm: 8 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>
            {error}
          </Alert>
        )}


        {/* Booking Flow Cards */}
        <Box maxWidth="lg" mx="auto" sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Doctor Selection Section */}
          <Card
            elevation={6}
            sx={{
              borderRadius: 3,
              background: 'white',
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                transform: 'translateY(-2px)'
              }
            }}
          >
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Box mb={3}>
                <Box display="flex" alignItems="center" gap={2} mb={1.5}>
                  <Schedule color="primary" sx={{ fontSize: 28 }} />
                  <Typography
                    variant="h5"
                    fontWeight="600"
                    color="text.primary"
                  >
                    Choose Your Doctor
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
                  Browse our available specialists
                </Typography>
              </Box>

                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                  gap: 3, 
                  maxHeight: 500, 
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
                          border: selectedDoctor?.id === doctor.id ? '2px solid' : '1px solid',
                          borderColor: selectedDoctor?.id === doctor.id ? 'primary.main' : 'divider',
                          background: selectedDoctor?.id === doctor.id 
                            ? 'linear-gradient(135deg, #e3f2fd 0%, #f8f9ff 100%)'
                            : 'white',
                          boxShadow: selectedDoctor?.id === doctor.id 
                            ? '0 12px 40px rgba(25, 118, 210, 0.2)'
                            : '0 2px 12px rgba(0, 0, 0, 0.08)',
                          borderRadius: 3,
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': selectedDoctor?.id === doctor.id ? {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '3px',
                            background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)'
                          } : {},
                          '&:hover': {
                            transform: 'scale(1.03)',
                            boxShadow: '0 16px 48px rgba(25, 118, 210, 0.25)',
                            borderColor: 'primary.main',
                            background: selectedDoctor?.id === doctor.id 
                              ? 'linear-gradient(135deg, #e3f2fd 0%, #f8f9ff 100%)'
                              : 'linear-gradient(135deg, #fafafa 0%, #f0f8ff 100%)',
                            '& .doctor-avatar': {
                              transform: 'scale(1.1)',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                            },
                            '& .doctor-name': {
                              color: 'primary.main'
                            },
                            '& .availability-chip': {
                              transform: 'scale(1.05)'
                            }
                          },
                          '&:active': {
                            transform: 'scale(1.01)'
                          },
                          '&:focus-visible': {
                            outline: '3px solid',
                            outlineColor: 'primary.main',
                            outlineOffset: '2px',
                            transform: 'scale(1.02)',
                            boxShadow: '0 0 0 6px rgba(25, 118, 210, 0.15)'
                          }
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box display="flex" alignItems="center" gap={3}>
                            {/* Left: Avatar */}
                            <Box position="relative">
                              <Avatar
                                className="doctor-avatar"
                                sx={{
                                  width: 60,
                                  height: 60,
                                  background: `linear-gradient(135deg, ${
                                    ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'][doctor.id.charCodeAt(0) % 5]
                                  } 0%, ${
                                    ['#764ba2', '#667eea', '#f5576c', '#f093fb', '#00f2fe'][doctor.id.charCodeAt(0) % 5]
                                  } 100%)`,
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                  border: '2px solid white',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                              >
                                <LocalHospital sx={{ fontSize: 24, color: 'white' }} />
                              </Avatar>
                              {selectedDoctor?.id === doctor.id && (
                                <CheckCircle 
                                  color="primary" 
                                  sx={{ 
                                    position: 'absolute',
                                    bottom: -2,
                                    right: -2,
                                    fontSize: 20,
                                    backgroundColor: 'white',
                                    borderRadius: '50%'
                                  }} 
                                />
                              )}
                            </Box>

                            {/* Middle: Name & Specialty */}
                            <Box flex={1} minWidth={0}>
                              <Typography 
                                className="doctor-name"
                                variant="h6" 
                                fontWeight="700" 
                                color="text.primary"
                                sx={{ 
                                  fontSize: '1.125rem', 
                                  lineHeight: 1.2, 
                                  mb: 0.5,
                                  transition: 'color 0.2s ease-in-out'
                                }}
                                noWrap
                              >
                                Dr. {doctor.first_name}{doctor.last_name && ` ${doctor.last_name}`}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ 
                                  fontSize: '0.875rem', 
                                  fontWeight: 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5
                                }}
                                noWrap
                              >
                                <LocalHospital sx={{ fontSize: 14, opacity: 0.7 }} />
                                {doctor.specialization}
                              </Typography>
                            </Box>

                            {/* Right: Status & Fee */}
                            <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
                              {/* Availability Status */}
                              {doctor.is_available ? (
                                <Chip
                                  className="availability-chip"
                                  label="Available"
                                  size="small"
                                  sx={{
                                    bgcolor: 'success.main',
                                    color: 'white',
                                    fontWeight: '600',
                                    fontSize: '0.75rem',
                                    height: 24,
                                    minWidth: 90,
                                    transition: 'all 0.2s ease-in-out',
                                    boxShadow: '0 2px 4px rgba(76, 175, 80, 0.2)'
                                  }}
                                  icon={<CheckCircle sx={{ fontSize: 14 }} />}
                                />
                              ) : (
                                <Chip
                                  className="availability-chip"
                                  label="Busy"
                                  size="small"
                                  sx={{
                                    bgcolor: 'error.main',
                                    color: 'white',
                                    fontWeight: '600',
                                    fontSize: '0.75rem',
                                    height: 24,
                                    minWidth: 90,
                                    transition: 'all 0.2s ease-in-out',
                                    boxShadow: '0 2px 4px rgba(244, 67, 54, 0.2)'
                                  }}
                                  icon={<Cancel sx={{ fontSize: 14 }} />}
                                />
                              )}
                              
                              {/* Consultation Fee */}
                              <Typography
                                variant="body1"
                                sx={{
                                  color: selectedDoctor?.id === doctor.id ? 'primary.main' : 'success.main',
                                  fontWeight: '700',
                                  fontSize: '0.875rem',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                ₹{doctor.consultation_fee} consultation fee
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Fade>
                  ))}
              </Box>
            </CardContent>
          </Card>

          {/* Date & Time Selection Section */}
          <Card
            elevation={6}
            sx={{
              borderRadius: 3,
              background: 'white',
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                transform: 'translateY(-2px)'
              }
            }}
          >
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Box mb={3}>
                <Box display="flex" alignItems="center" gap={2} mb={1.5}>
                  <CalendarToday color="primary" sx={{ fontSize: 28 }} />
                  <Typography
                    variant="h5"
                    fontWeight="600"
                    color="text.primary"
                  >
                    Select Date & Time
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
                  Pick your preferred appointment date and time slot
                </Typography>
              </Box>
              
              {/* Date Picker Section */}
              <Box mb={4}>
                <Typography 
                  variant="subtitle2" 
                  color="text.primary" 
                  fontWeight="600"
                  sx={{ mb: 1, fontSize: '0.875rem' }}
                >
                  Select Date
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
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
                        placeholder: 'Choose your appointment date',
                        InputProps: {
                          startAdornment: (
                            <CalendarToday sx={{ 
                              color: 'primary.main', 
                              mr: 1.5, 
                              fontSize: 20,
                              transition: 'all 0.2s ease-in-out'
                            }} />
                          ),
                          sx: {
                            height: 56,
                            borderRadius: 3,
                            px: 2,
                            backgroundColor: selectedDate ? 'primary.50' : 'grey.50',
                            transition: 'all 0.3s ease-in-out',
                            '&:hover': {
                              backgroundColor: 'primary.50',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)'
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: selectedDate ? 'primary.main' : 'grey.300',
                              borderWidth: selectedDate ? 2 : 1,
                              transition: 'all 0.2s ease-in-out'
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              borderWidth: 2
                            },
                            '&.Mui-focused': {
                              backgroundColor: 'primary.50',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 16px rgba(25, 118, 210, 0.2)'
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              borderWidth: 2,
                              boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)'
                            },
                            '& input': {
                              fontWeight: 500,
                              color: selectedDate ? 'primary.main' : 'text.primary',
                              transition: 'color 0.2s ease-in-out'
                            }
                          }
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Box>

              {/* Enhanced Time Slots Section */}
              {availableSlots.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography 
                    variant="subtitle2" 
                    color="text.primary" 
                    fontWeight="600"
                    sx={{ 
                      mb: 3, 
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <AccessTime color="primary" sx={{ fontSize: 18 }} />
                    Available Time Slots
                  </Typography>
                  
                  {/* Time Slot Grid */}
                  <Box 
                    sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { 
                        xs: 'repeat(2, 1fr)', 
                        sm: 'repeat(3, 1fr)', 
                        md: 'repeat(4, 1fr)' 
                      }, 
                      gap: { xs: 2, sm: 3 },
                      mb: selectedSlot ? 3 : 0
                    }}
                  >
                    {availableSlots.map((slot, index) => (
                      <Fade in timeout={300 + index * 50} key={index}>
                        <Chip
                          label={appointmentService.formatTimeSlot(slot)}
                          variant={selectedSlot === slot ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleSlotSelect(slot)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSlotSelect(slot);
                            }
                          }}
                          icon={<AccessTime sx={{ fontSize: 16 }} />}
                          sx={{
                            height: 44,
                            borderRadius: 3,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            px: 1,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer',
                            
                            // Default state (outlined)
                            ...(selectedSlot !== slot && {
                              backgroundColor: 'background.paper',
                              borderColor: 'grey.300',
                              color: 'text.primary',
                              borderWidth: 2,
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                              
                              '&:hover': {
                                backgroundColor: 'primary.50',
                                borderColor: 'primary.main',
                                color: 'primary.main',
                                transform: 'translateY(-2px) scale(1.02)',
                                boxShadow: '0 8px 24px rgba(25, 118, 210, 0.15)',
                                '& .MuiChip-icon': {
                                  color: 'primary.main',
                                  transform: 'scale(1.1)'
                                }
                              }
                            }),
                            
                            // Selected state (filled)
                            ...(selectedSlot === slot && {
                              backgroundColor: 'primary.main',
                              borderColor: 'primary.main',
                              color: 'white',
                              borderWidth: 2,
                              transform: 'translateY(-1px) scale(1.02)',
                              boxShadow: '0 12px 32px rgba(25, 118, 210, 0.3)',
                              
                              '&:hover': {
                                backgroundColor: 'primary.dark',
                                borderColor: 'primary.dark',
                                transform: 'translateY(-3px) scale(1.04)',
                                boxShadow: '0 16px 40px rgba(25, 118, 210, 0.4)'
                              },
                              
                              '& .MuiChip-icon': {
                                color: 'white',
                                transform: 'scale(1.1)'
                              }
                            }),
                            
                            // Focus state for accessibility
                            '&:focus-visible': {
                              outline: '3px solid',
                              outlineColor: 'primary.main',
                              outlineOffset: '2px'
                            },
                            
                            // Icon styling
                            '& .MuiChip-icon': {
                              transition: 'all 0.3s ease-in-out',
                              fontSize: 16
                            },
                            
                            // Active state
                            '&:active': {
                              transform: selectedSlot === slot 
                                ? 'translateY(-1px) scale(1.01)' 
                                : 'translateY(0) scale(1.01)'
                            }
                          }}
                        />
                      </Fade>
                    ))}
                  </Box>
                  
                  {/* Selected Time Display */}
                  {selectedSlot && (
                    <Fade in timeout={300}>
                      <Box 
                        sx={{ 
                          mt: 3,
                          p: 3,
                          backgroundColor: 'primary.50',
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: 'primary.200',
                          textAlign: 'center'
                        }}
                      >
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ mb: 0.5, fontSize: '0.75rem', fontWeight: 500 }}
                        >
                          SELECTED TIME SLOT
                        </Typography>
                        <Typography 
                          variant="h6" 
                          color="primary.main"
                          sx={{ 
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1
                          }}
                        >
                          <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />
                          {appointmentService.formatTimeSlot(selectedSlot)}
                          <AccessTime sx={{ fontSize: 16, opacity: 0.7 }} />
                        </Typography>
                      </Box>
                    </Fade>
                  )}
                </Box>
              )}

              {selectedDate && selectedDoctor && availableSlots.length === 0 && (
                <Box mt={3}>
                  <Alert severity="warning" sx={{ borderRadius: 3, p: 2 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CalendarToday sx={{ fontSize: 20 }} />
                      <Typography variant="body2" fontWeight="500">
                        No available slots for this date. Please try another date.
                      </Typography>
                    </Box>
                  </Alert>
                </Box>
              )}
            </CardContent>
          </Card>


          {/* Appointment Details Section */}
          {selectedSlot && (
            <Card
              elevation={6}
              sx={{
                borderRadius: 3,
                background: 'white',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Box mb={3}>
                  <Box display="flex" alignItems="center" gap={2} mb={1.5}>
                    <MedicalServices color="primary" sx={{ fontSize: 28 }} />
                    <Typography
                      variant="h5"
                      fontWeight="600"
                      color="text.primary"
                    >
                      Appointment Details
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
                    Provide additional information for your visit
                  </Typography>
                </Box>
                  
                  {/* Patient Information */}
                  <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={3}>
                    <Box>
                      <TextField
                        fullWidth
                        label="Patient Name"
                        variant="outlined"
                        value={patientName}
                        onChange={(e) => {
                          setPatientName(e.target.value);
                          if (formErrors.patientName) {
                            setFormErrors(prev => ({ ...prev, patientName: validatePatientName(e.target.value) }));
                          }
                        }}
                        onBlur={() => {
                          setFormErrors(prev => ({ ...prev, patientName: validatePatientName(patientName) }));
                        }}
                        error={!!formErrors.patientName}
                        helperText={formErrors.patientName}
                        InputProps={{
                          startAdornment: (
                            <Person sx={{ 
                              color: patientName ? 'primary.main' : 'text.secondary', 
                              mr: 1.5, 
                              fontSize: 20,
                              transition: 'color 0.2s ease-in-out'
                            }} />
                          ),
                          sx: {
                            transition: 'all 0.3s ease-in-out',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                            },
                            '&.Mui-focused': {
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)'
                            }
                          }
                        }}
                        sx={{
                          borderRadius: 2,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 3
                          },
                          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                            borderWidth: 2
                          },
                          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)'
                          }
                        }}
                        required
                      />
                    </Box>
                    <Box>
                      <TextField
                        fullWidth
                        label="Phone Number"
                        variant="outlined"
                        value={patientPhone}
                        onChange={(e) => {
                          setPatientPhone(e.target.value);
                          if (formErrors.patientPhone) {
                            setFormErrors(prev => ({ ...prev, patientPhone: validatePhoneNumber(e.target.value) }));
                          }
                        }}
                        onBlur={() => {
                          setFormErrors(prev => ({ ...prev, patientPhone: validatePhoneNumber(patientPhone) }));
                        }}
                        error={!!formErrors.patientPhone}
                        helperText={formErrors.patientPhone}
                        placeholder="+91-9876543210"
                        InputProps={{
                          startAdornment: (
                            <Phone sx={{ 
                              color: patientPhone && patientPhone !== '+91-' ? 'primary.main' : 'text.secondary', 
                              mr: 1.5, 
                              fontSize: 20,
                              transition: 'color 0.2s ease-in-out'
                            }} />
                          ),
                          sx: {
                            transition: 'all 0.3s ease-in-out',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                            },
                            '&.Mui-focused': {
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)'
                            }
                          }
                        }}
                        sx={{
                          borderRadius: 2,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 3
                          },
                          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                            borderWidth: 2
                          },
                          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)'
                          }
                        }}
                        required
                      />
                    </Box>
                  </Box>
                  
                  <Box mb={3}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel
                        sx={{ 
                          color: appointmentType ? 'primary.main' : 'text.secondary',
                          '&.Mui-focused': {
                            color: 'primary.main'
                          }
                        }}
                      >
                        Appointment Type
                      </InputLabel>
                      <Select
                        value={appointmentType}
                        onChange={(e) => setAppointmentType(e.target.value)}
                        label="Appointment Type"
                        startAdornment={
                          <MedicalServices sx={{ 
                            color: appointmentType ? 'primary.main' : 'text.secondary', 
                            mr: 1.5, 
                            fontSize: 20,
                            transition: 'color 0.2s ease-in-out'
                          }} />
                        }
                        sx={{
                          borderRadius: 3,
                          backgroundColor: appointmentType ? 'primary.50' : 'grey.50',
                          transition: 'all 0.3s ease-in-out',
                          '&:hover': {
                            backgroundColor: 'primary.50',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              borderWidth: 2
                            }
                          },
                          '&.Mui-focused': {
                            backgroundColor: 'primary.50',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              borderWidth: 2,
                              boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)'
                            }
                          },
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: appointmentType ? 'primary.main' : 'grey.300',
                            borderWidth: appointmentType ? 2 : 1,
                            transition: 'all 0.2s ease-in-out'
                          }
                        }}
                      >
                        <MenuItem value="consultation">
                          <Box display="flex" alignItems="center" gap={1}>
                            <LocalHospital sx={{ fontSize: 16, color: 'primary.main' }} />
                            Consultation
                          </Box>
                        </MenuItem>
                        <MenuItem value="follow_up">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Schedule sx={{ fontSize: 16, color: 'info.main' }} />
                            Follow-up
                          </Box>
                        </MenuItem>
                        <MenuItem value="routine_checkup">
                          <Box display="flex" alignItems="center" gap={1}>
                            <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                            Routine Checkup
                          </Box>
                        </MenuItem>
                        <MenuItem value="emergency">
                          <Box display="flex" alignItems="center" gap={1}>
                            <NotificationsActive sx={{ fontSize: 16, color: 'error.main' }} />
                            Emergency
                          </Box>
                        </MenuItem>
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
                      InputLabelProps={{
                        sx: {
                          color: notes ? 'primary.main' : 'text.secondary',
                          '&.Mui-focused': {
                            color: 'primary.main'
                          }
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          backgroundColor: notes ? 'primary.50' : 'grey.50',
                          transition: 'all 0.3s ease-in-out',
                          '&:hover': {
                            backgroundColor: 'primary.50',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                            '& fieldset': {
                              borderColor: 'primary.main',
                              borderWidth: 2
                            }
                          },
                          '&.Mui-focused': {
                            backgroundColor: 'primary.50',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
                            '& fieldset': {
                              borderColor: 'primary.main',
                              borderWidth: 2,
                              boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)'
                            }
                          },
                          '& fieldset': {
                            borderColor: notes ? 'primary.main' : 'grey.300',
                            borderWidth: notes ? 2 : 1,
                            transition: 'all 0.2s ease-in-out'
                          },
                          '& textarea': {
                            fontWeight: 500,
                            color: notes ? 'primary.main' : 'text.primary',
                            transition: 'color 0.2s ease-in-out'
                          }
                        }
                      }}
                    />
                  </Box>
              </CardContent>
            </Card>
          )}

          {/* Book Button */}
          {selectedSlot && (
            <Card
              elevation={6}
              sx={{
                borderRadius: 3,
                background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                border: 'none',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 40px rgba(76, 175, 80, 0.4)'
                }
              }}
            >
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Button
                  onClick={handleBookAppointment}
                  disabled={bookingLoading}
                  variant="contained"
                  fullWidth
                  size="large"
                  sx={{
                    py: 2.5,
                    borderRadius: 3,
                    background: 'transparent',
                    color: 'white',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    textTransform: 'none',
                    boxShadow: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.15)',
                      boxShadow: 'none',
                      transform: 'translateY(-2px)',
                      '& .button-icon': {
                        transform: 'scale(1.1) rotate(5deg)'
                      }
                    },
                    '&:active': {
                      transform: 'translateY(0px)'
                    },
                    '&:disabled': {
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.7)',
                      transform: 'none'
                    }
                  }}
                >
                  {bookingLoading ? (
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <CircularProgress size={22} color="inherit" />
                      <Typography variant="inherit" fontWeight="600">
                        Booking your appointment...
                      </Typography>
                    </Box>
                  ) : (
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Add 
                        className="button-icon"
                        sx={{ 
                          fontSize: 22,
                          transition: 'all 0.3s ease-in-out'
                        }} 
                      />
                      <Typography variant="inherit" fontWeight="600">
                        Book Appointment
                      </Typography>
                    </Box>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
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
                  
                  {/* Patient Information */}
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: '600' }}>
                      Patient Information
                    </Typography>
                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} sx={{ mt: 1 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Name
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {patientName}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Phone
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {patientPhone}
                        </Typography>
                      </Box>
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

      {/* Enhanced Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={8000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            borderRadius: 3
          }
        }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity as 'success' | 'error'} 
          icon={
            snackbar.severity === 'success' ? 
              <DoneAll sx={{ fontSize: 20 }} /> : 
              undefined
          }
          sx={{ 
            width: '100%',
            borderRadius: 3,
            fontSize: '0.95rem',
            fontWeight: 500,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            border: snackbar.severity === 'success' ? '1px solid #4caf50' : '1px solid #f44336',
            background: snackbar.severity === 'success' 
              ? 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)'
              : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
            '& .MuiAlert-icon': {
              fontSize: 22
            },
            '& .MuiAlert-message': {
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            {snackbar.message}
            {snackbar.severity === 'success' && (
              <CheckCircle sx={{ fontSize: 18, color: 'success.main', ml: 0.5 }} />
            )}
          </Box>
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default PatientDashboard;