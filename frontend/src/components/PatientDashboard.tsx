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
  CheckCircle,
  CalendarToday,
  AccessTime,
  Add,
  MedicalServices,
  Cancel,
  Phone,
  Person,
  NotificationsActive,
  DoneAll,
  ArrowBack,
  ArrowForward,
  Edit,
  Healing,
  FavoriteRounded,
  Today,
  EventNote
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const PatientDashboard: React.FC = () => {
  const { profile } = useAuth();
  const patient = profile as Patient;

  // Helper function to create step headers
  const renderStepHeader = (stepNumber: number, totalSteps: number, title: string, isCompleted: boolean, isActive: boolean) => (
    <Box display="flex" alignItems="center" gap={2} mb={3}>
      <Box 
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          fontWeight: 700,
          backgroundColor: isCompleted ? 'success.main' : (isActive ? 'primary.main' : 'grey.300'),
          color: isCompleted || isActive ? 'white' : 'text.secondary',
          transition: 'all 0.3s ease-in-out',
          border: isActive ? '3px solid' : '2px solid',
          borderColor: isCompleted ? 'success.main' : (isActive ? 'primary.light' : 'grey.300'),
        }}
      >
        {isCompleted ? <CheckCircle sx={{ fontSize: 20 }} /> : stepNumber}
      </Box>
      <Box>
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.secondary',
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: 0.5
          }}
        >
          Step {stepNumber} of {totalSteps}
        </Typography>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 700,
            color: isActive ? 'primary.main' : 'text.primary',
            lineHeight: 1.2
          }}
        >
          {title}
        </Typography>
      </Box>
    </Box>
  );

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
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // Progressive form state
  const [currentFormStep, setCurrentFormStep] = useState(0);
  const [formStepsCompleted, setFormStepsCompleted] = useState<boolean[]>([false, false, false, false]);
  
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

  // Progressive form helpers
  const handleFormStepNext = () => {
    const newCompleted = [...formStepsCompleted];
    newCompleted[currentFormStep] = true;
    setFormStepsCompleted(newCompleted);
    setCurrentFormStep(Math.min(currentFormStep + 1, 3));
  };

  const handleFormStepBack = () => {
    setCurrentFormStep(Math.max(currentFormStep - 1, 0));
  };

  const canProceedToNextStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Name step
        return patientName.trim().length >= 2;
      case 1: // Phone step
        return validatePhoneNumber(patientPhone) === '';
      case 2: // Appointment type step
        return appointmentType !== '';
      case 3: // Notes step (optional)
        return true;
      default:
        return false;
    }
  };

  const getStepTitle = (stepIndex: number): string => {
    switch (stepIndex) {
      case 0: return "What's your name?";
      case 1: return "How can we reach you?";
      case 2: return "What type of visit?";
      case 3: return "Anything specific to mention?";
      default: return "Your Details";
    }
  };

  const getStepSubtitle = (stepIndex: number): string => {
    switch (stepIndex) {
      case 0: return "Let us know what to call you";
      case 1: return "We'll send appointment updates";
      case 2: return "Help us prepare for your visit";
      case 3: return "Optional - describe your symptoms or reason";
      default: return "";
    }
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
      setCurrentFormStep(0);
      setFormStepsCompleted([false, false, false, false]);
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


        {/* 3-Step Booking Process */}
        <Box maxWidth="lg" mx="auto" sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          
          {/* STEP 1: Choose Doctor */}
          <Card
            elevation={selectedDoctor ? 3 : 6}
            sx={{
              borderRadius: 3,
              background: 'white',
              border: '2px solid',
              borderColor: selectedDoctor ? 'success.main' : 'primary.main',
              transition: 'all 0.3s ease-in-out',
              opacity: 1
            }}
          >
            <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
              {renderStepHeader(1, 3, "Choose Doctor", !!selectedDoctor, !selectedDoctor)}
              
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

          {/* STEP 2: Pick Date & Time */}
          <Card
            elevation={selectedDate && selectedSlot ? 3 : 6}
            sx={{
              borderRadius: 3,
              background: 'white',
              border: '2px solid',
              borderColor: selectedDate && selectedSlot ? 'success.main' : (selectedDoctor ? 'primary.main' : 'grey.300'),
              transition: 'all 0.3s ease-in-out',
              opacity: selectedDoctor ? 1 : 0.6,
              pointerEvents: selectedDoctor ? 'auto' : 'none'
            }}
          >
            <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
              {renderStepHeader(2, 3, "Pick Date & Time", !!(selectedDate && selectedSlot), !!(selectedDoctor && !(selectedDate && selectedSlot)))}
              
              {!selectedDoctor && (
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    py: 4,
                    color: 'text.secondary'
                  }}
                >
                  <CalendarToday sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                  <Typography variant="h6" color="text.secondary">
                    Please choose a doctor first
                  </Typography>
                </Box>
              )}
              
              {selectedDoctor && (
                <Box mb={4}>
                  {/* Swipeable Date Cards */}
                  <Box mb={3}>
                    <Typography variant="h6" fontWeight="700" color="text.primary" mb={2}>
                      Select Appointment Date
                    </Typography>

                    {/* Quick Date Selection */}
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
                                  handleDateSelect(dateOption.date!);
                                }
                              }}
                              variant={isSelected ? 'filled' : 'outlined'}
                              icon={dateOption.icon ? <dateOption.icon sx={{ fontSize: 18 }} /> : undefined}
                              sx={{
                                height: 44,
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                borderRadius: 25,
                                minWidth: isPickDate ? 140 : 100,
                                cursor: 'pointer',
                                backgroundColor: isSelected ? 'primary.main' : 'transparent',
                                color: isSelected ? 'white' : 'text.primary',
                                borderColor: isSelected ? 'primary.main' : 'grey.300',
                                '&:hover': {
                                  backgroundColor: isSelected ? 'primary.dark' : 'primary.light',
                                  color: isSelected ? 'white' : 'primary.main',
                                  borderColor: 'primary.main'
                                }
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
                            handleDateSelect(newValue.format('YYYY-MM-DD'));
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
                    
                    {/* Date Cards Container */}
                    <Box 
                      sx={{ 
                        overflowX: 'auto', 
                        overflowY: 'hidden',
                        pb: 2,
                        '&::-webkit-scrollbar': {
                          height: 4,
                        },
                        '&::-webkit-scrollbar-track': {
                          backgroundColor: 'grey.100',
                          borderRadius: 2,
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: 'primary.main',
                          borderRadius: 2,
                        },
                      }}
                    >
                      <Box display="flex" gap={2} sx={{ width: 'max-content', pb: 1 }}>
                        {Array.from({ length: 14 }, (_, index) => {
                          const date = dayjs().add(index + 1, 'day');
                          const dateString = date.format('YYYY-MM-DD');
                          const isSelected = selectedDate === dateString;
                          const isToday = date.isSame(dayjs(), 'day');
                          const isWeekend = date.day() === 0 || date.day() === 6;
                          
                          return (
                            <Card
                              key={dateString}
                              onClick={() => handleDateSelect(dateString)}
                              elevation={isSelected ? 8 : 2}
                              sx={{
                                minWidth: 120,
                                height: 140,
                                cursor: 'pointer',
                                borderRadius: 3,
                                border: isSelected ? '3px solid' : '2px solid',
                                borderColor: isSelected ? 'primary.main' : 'transparent',
                                background: isSelected 
                                  ? 'linear-gradient(135deg, #e3f2fd 0%, #f8f9ff 100%)'
                                  : isWeekend 
                                    ? 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)'
                                    : 'white',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                overflow: 'hidden',
                                '&:hover': {
                                  transform: 'translateY(-4px) scale(1.03)',
                                  boxShadow: isSelected 
                                    ? '0 16px 48px rgba(25, 118, 210, 0.3)'
                                    : '0 12px 32px rgba(0, 0, 0, 0.15)',
                                  borderColor: 'primary.main',
                                  background: isSelected 
                                    ? 'linear-gradient(135deg, #e3f2fd 0%, #f8f9ff 100%)'
                                    : 'linear-gradient(135deg, #f0f8ff 0%, #fafafa 100%)'
                                },
                                '&:active': {
                                  transform: 'translateY(-2px) scale(1.01)'
                                },
                                '&:focus-visible': {
                                  outline: '3px solid',
                                  outlineColor: 'primary.main',
                                  outlineOffset: '2px'
                                }
                              }}
                            >
                              <CardContent sx={{ 
                                p: 2, 
                                textAlign: 'center',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                position: 'relative'
                              }}>
                                {/* Selected Indicator */}
                                {isSelected && (
                                  <CheckCircle 
                                    sx={{ 
                                      position: 'absolute',
                                      top: 8,
                                      right: 8,
                                      fontSize: 18,
                                      color: 'primary.main'
                                    }} 
                                  />
                                )}
                                
                                {/* Today Badge */}
                                {isToday && (
                                  <Chip 
                                    label="Today" 
                                    size="small"
                                    sx={{
                                      position: 'absolute',
                                      top: 8,
                                      left: 8,
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      bgcolor: 'error.main',
                                      color: 'white',
                                      height: 20
                                    }}
                                  />
                                )}
                                
                                {/* Day of Week */}
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    color: isSelected ? 'primary.main' : 'text.secondary',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    mb: 1
                                  }}
                                >
                                  {date.format('ddd')}
                                </Typography>
                                
                                {/* Date Number */}
                                <Typography 
                                  variant="h4" 
                                  sx={{ 
                                    fontWeight: 800,
                                    color: isSelected ? 'primary.main' : 'text.primary',
                                    lineHeight: 1,
                                    mb: 1,
                                    fontSize: '1.8rem'
                                  }}
                                >
                                  {date.format('D')}
                                </Typography>
                                
                                {/* Month */}
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    color: isSelected ? 'primary.main' : 'text.secondary',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  {date.format('MMM')}
                                </Typography>
                                
                                {/* Availability Indicator */}
                                <Box 
                                  sx={{ 
                                    position: 'absolute',
                                    bottom: 8,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: isWeekend ? 'warning.main' : 'success.main',
                                    animation: isSelected ? 'pulse 2s infinite' : 'none',
                                    '@keyframes pulse': {
                                      '0%': {
                                        boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)'
                                      },
                                      '70%': {
                                        boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)'
                                      },
                                      '100%': {
                                        boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)'
                                      }
                                    }
                                  }}
                                />
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Box>
                    </Box>
                    
                    {/* Helper Text */}
                    <Box display="flex" alignItems="center" justifyContent="center" gap={3} mt={2}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                        <Typography variant="caption" color="text.secondary">Available</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />
                        <Typography variant="caption" color="text.secondary">Weekend</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        👈 Swipe to see more dates
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Enhanced Time Slots Section */}
              {availableSlots.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  
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


          {/* STEP 3: Progressive Form Cards */}
          <Card
            elevation={6}
            sx={{
              borderRadius: 3,
              background: 'white',
              border: '2px solid',
              borderColor: selectedSlot ? 'primary.main' : 'grey.300',
              transition: 'all 0.3s ease-in-out',
              opacity: selectedSlot ? 1 : 0.6,
              pointerEvents: selectedSlot ? 'auto' : 'none'
            }}
          >
            <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
              {renderStepHeader(3, 3, "Your Details", formStepsCompleted.every(Boolean), !!selectedSlot)}
              
              {!selectedSlot && (
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    py: 4,
                    color: 'text.secondary'
                  }}
                >
                  <Person sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                  <Typography variant="h6" color="text.secondary">
                    Please select a date and time first
                  </Typography>
                </Box>
              )}
              
              {selectedSlot && (
                <Box>
                  {/* Progress Indicator */}
                  <Box display="flex" alignItems="center" gap={1} mb={4}>
                    {[0, 1, 2, 3].map((stepIndex) => (
                      <Box key={stepIndex} display="flex" alignItems="center" flex={1}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 
                              formStepsCompleted[stepIndex] ? 'success.main' :
                              currentFormStep === stepIndex ? 'primary.main' : 'grey.300',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            transition: 'all 0.3s ease-in-out',
                            transform: currentFormStep === stepIndex ? 'scale(1.1)' : 'scale(1)',
                            boxShadow: currentFormStep === stepIndex ? '0 4px 12px rgba(25, 118, 210, 0.3)' : 'none'
                          }}
                        >
                          {formStepsCompleted[stepIndex] ? <CheckCircle sx={{ fontSize: 18 }} /> : stepIndex + 1}
                        </Box>
                        {stepIndex < 3 && (
                          <Box
                            sx={{
                              flex: 1,
                              height: 2,
                              backgroundColor: formStepsCompleted[stepIndex] ? 'success.main' : 'grey.300',
                              mx: 1,
                              transition: 'all 0.3s ease-in-out'
                            }}
                          />
                        )}
                      </Box>
                    ))}
                  </Box>

                  {/* Form Card Container */}
                  <Box 
                    sx={{ 
                      position: 'relative',
                      minHeight: 300,
                      overflow: 'hidden',
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #f8f9ff 0%, #fafafa 100%)',
                      p: 0
                    }}
                  >
                    {/* Step 0: Name */}
                    <Fade in={currentFormStep === 0} timeout={300}>
                      <Box 
                        sx={{ 
                          display: currentFormStep === 0 ? 'block' : 'none',
                          p: 4,
                          textAlign: 'center'
                        }}
                      >
                        <Person sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h5" fontWeight="700" color="text.primary" mb={1}>
                          {getStepTitle(0)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={4}>
                          {getStepSubtitle(0)}
                        </Typography>
                        
                        <TextField
                          fullWidth
                          variant="outlined"
                          placeholder="Enter your full name"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          error={!!formErrors.patientName}
                          helperText={formErrors.patientName}
                          autoFocus
                          sx={{
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                              height: 56,
                              borderRadius: 3,
                              backgroundColor: 'white',
                              fontSize: '1.1rem',
                              '&:hover fieldset': {
                                borderColor: 'primary.main',
                                borderWidth: 2
                              }
                            }
                          }}
                          InputProps={{
                            startAdornment: (
                              <Edit sx={{ 
                                color: patientName ? 'primary.main' : 'text.secondary', 
                                mr: 1.5, 
                                fontSize: 20
                              }} />
                            )
                          }}
                        />
                        
                        <Button
                          onClick={handleFormStepNext}
                          disabled={!canProceedToNextStep(0)}
                          variant="contained"
                          size="large"
                          endIcon={<ArrowForward />}
                          sx={{
                            borderRadius: 3,
                            height: 48,
                            minWidth: 200,
                            fontSize: '1rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            boxShadow: canProceedToNextStep(0) ? '0 8px 24px rgba(25, 118, 210, 0.3)' : 'none',
                            '&:disabled': {
                              backgroundColor: 'grey.300',
                              color: 'grey.600'
                            }
                          }}
                        >
                          Continue
                        </Button>
                      </Box>
                    </Fade>

                    {/* Step 1: Phone */}
                    <Fade in={currentFormStep === 1} timeout={300}>
                      <Box 
                        sx={{ 
                          display: currentFormStep === 1 ? 'block' : 'none',
                          p: 4,
                          textAlign: 'center'
                        }}
                      >
                        <Phone sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h5" fontWeight="700" color="text.primary" mb={1}>
                          {getStepTitle(1)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={4}>
                          {getStepSubtitle(1)}
                        </Typography>
                        
                        <TextField
                          fullWidth
                          variant="outlined"
                          placeholder="+91-9876543210"
                          value={patientPhone}
                          onChange={(e) => setPatientPhone(e.target.value)}
                          error={!!formErrors.patientPhone}
                          helperText={formErrors.patientPhone || "We'll send appointment confirmation via SMS"}
                          autoFocus
                          sx={{
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                              height: 56,
                              borderRadius: 3,
                              backgroundColor: 'white',
                              fontSize: '1.1rem',
                              '&:hover fieldset': {
                                borderColor: 'primary.main',
                                borderWidth: 2
                              }
                            }
                          }}
                          InputProps={{
                            startAdornment: (
                              <Phone sx={{ 
                                color: patientPhone && patientPhone !== '+91-' ? 'primary.main' : 'text.secondary', 
                                mr: 1.5, 
                                fontSize: 20
                              }} />
                            )
                          }}
                        />
                        
                        <Box display="flex" gap={2} justifyContent="center">
                          <Button
                            onClick={handleFormStepBack}
                            variant="outlined"
                            size="large"
                            startIcon={<ArrowBack />}
                            sx={{
                              borderRadius: 3,
                              height: 48,
                              minWidth: 120,
                              textTransform: 'none'
                            }}
                          >
                            Back
                          </Button>
                          <Button
                            onClick={handleFormStepNext}
                            disabled={!canProceedToNextStep(1)}
                            variant="contained"
                            size="large"
                            endIcon={<ArrowForward />}
                            sx={{
                              borderRadius: 3,
                              height: 48,
                              minWidth: 120,
                              fontSize: '1rem',
                              fontWeight: 600,
                              textTransform: 'none',
                              boxShadow: canProceedToNextStep(1) ? '0 8px 24px rgba(25, 118, 210, 0.3)' : 'none'
                            }}
                          >
                            Continue
                          </Button>
                        </Box>
                      </Box>
                    </Fade>

                    {/* Step 2: Appointment Type */}
                    <Fade in={currentFormStep === 2} timeout={300}>
                      <Box 
                        sx={{ 
                          display: currentFormStep === 2 ? 'block' : 'none',
                          p: 4,
                          textAlign: 'center'
                        }}
                      >
                        <MedicalServices sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h5" fontWeight="700" color="text.primary" mb={1}>
                          {getStepTitle(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={4}>
                          {getStepSubtitle(2)}
                        </Typography>
                        
                        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)' }} gap={2} mb={3}>
                          {[
                            { value: 'consultation', label: 'General Consultation', icon: Healing, color: '#2196f3' },
                            { value: 'routine_checkup', label: 'Routine Checkup', icon: CheckCircle, color: '#4caf50' },
                            { value: 'emergency', label: 'Emergency Visit', icon: NotificationsActive, color: '#f44336' },
                            { value: 'follow_up', label: 'Follow-up Visit', icon: FavoriteRounded, color: '#9c27b0' }
                          ].map((type) => {
                            const IconComponent = type.icon;
                            return (
                              <Card
                                key={type.value}
                                onClick={() => setAppointmentType(type.value)}
                                sx={{
                                  cursor: 'pointer',
                                  p: 3,
                                  textAlign: 'center',
                                  border: appointmentType === type.value ? '3px solid' : '2px solid',
                                  borderColor: appointmentType === type.value ? 'primary.main' : 'grey.300',
                                  backgroundColor: appointmentType === type.value ? 'primary.50' : 'white',
                                  transition: 'all 0.3s ease-in-out',
                                  '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                                    borderColor: 'primary.main'
                                  }
                                }}
                              >
                                <IconComponent sx={{ fontSize: 32, color: type.color, mb: 1 }} />
                                <Typography variant="body2" fontWeight="600" color="text.primary">
                                  {type.label}
                                </Typography>
                              </Card>
                            );
                          })}
                        </Box>
                        
                        <Box display="flex" gap={2} justifyContent="center">
                          <Button
                            onClick={handleFormStepBack}
                            variant="outlined"
                            size="large"
                            startIcon={<ArrowBack />}
                            sx={{
                              borderRadius: 3,
                              height: 48,
                              minWidth: 120,
                              textTransform: 'none'
                            }}
                          >
                            Back
                          </Button>
                          <Button
                            onClick={handleFormStepNext}
                            disabled={!canProceedToNextStep(2)}
                            variant="contained"
                            size="large"
                            endIcon={<ArrowForward />}
                            sx={{
                              borderRadius: 3,
                              height: 48,
                              minWidth: 120,
                              fontSize: '1rem',
                              fontWeight: 600,
                              textTransform: 'none',
                              boxShadow: canProceedToNextStep(2) ? '0 8px 24px rgba(25, 118, 210, 0.3)' : 'none'
                            }}
                          >
                            Continue
                          </Button>
                        </Box>
                      </Box>
                    </Fade>

                    {/* Step 3: Notes & Final Booking */}
                    <Fade in={currentFormStep === 3} timeout={300}>
                      <Box 
                        sx={{ 
                          display: currentFormStep === 3 ? 'block' : 'none',
                          p: 4,
                          textAlign: 'center'
                        }}
                      >
                        <NotificationsActive sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h5" fontWeight="700" color="text.primary" mb={1}>
                          {getStepTitle(3)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={4}>
                          {getStepSubtitle(3)}
                        </Typography>
                        
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          variant="outlined"
                          placeholder="Describe your symptoms or reason for visit (optional)"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          sx={{
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 3,
                              backgroundColor: 'white',
                              '&:hover fieldset': {
                                borderColor: 'primary.main',
                                borderWidth: 2
                              }
                            }
                          }}
                        />
                        
                        <Box display="flex" gap={2} justifyContent="center">
                          <Button
                            onClick={handleFormStepBack}
                            variant="outlined"
                            size="large"
                            startIcon={<ArrowBack />}
                            sx={{
                              borderRadius: 3,
                              height: 48,
                              minWidth: 120,
                              textTransform: 'none'
                            }}
                          >
                            Back
                          </Button>
                          <Button
                            onClick={handleBookAppointment}
                            disabled={bookingLoading}
                            variant="contained"
                            size="large"
                            startIcon={bookingLoading ? <CircularProgress size={20} /> : <Add />}
                            sx={{
                              borderRadius: 3,
                              height: 48,
                              minWidth: 160,
                              fontSize: '1rem',
                              fontWeight: 600,
                              textTransform: 'none',
                              background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                              boxShadow: '0 8px 24px rgba(76, 175, 80, 0.3)',
                              '&:hover': {
                                background: 'linear-gradient(45deg, #43A047 30%, #7CB342 90%)',
                                transform: 'translateY(-2px)'
                              }
                            }}
                          >
                            {bookingLoading ? 'Booking...' : 'Book Appointment'}
                          </Button>
                        </Box>
                      </Box>
                    </Fade>
                  </Box>
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