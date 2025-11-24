import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import PatientDashboard from '../PatientDashboard';
import { AuthContext } from '../../context/SimpleAuthContext';
import { appointmentService } from '../../services/appointmentService';
import { doctorService } from '../../services/doctorService';

// Mock services
jest.mock('../../services/appointmentService');
jest.mock('../../services/doctorService');

const mockedAppointmentService = appointmentService as jest.Mocked<typeof appointmentService>;
const mockedDoctorService = doctorService as jest.Mocked<typeof doctorService>;

// Mock data
const mockPatient = {
  id: 'patient1',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '1234567890',
  date_of_birth: '1990-01-01',
  address: '123 Main St',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
};

const mockDoctors = [
  {
    id: 'doctor1',
    first_name: 'Dr. Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone: '9876543210',
    specialization: 'General Medicine',
    consultation_fee: '250.00',
    availability_status: 'available' as const,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  }
];

const mockAppointments = [
  {
    id: 'apt1',
    doctor_id: 'doctor1',
    patient_id: 'patient1',
    appointment_date: '2025-11-25T14:00:00Z',
    start_time: '14:00:00',
    end_time: '14:30:00',
    appointment_type: 'consultation',
    status: 'pending' as const,
    notes: 'Regular checkup',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    doctor_first_name: 'Dr. Jane',
    doctor_last_name: 'Smith',
    specialization: 'General Medicine'
  },
  {
    id: 'apt2',
    doctor_id: 'doctor1',
    patient_id: 'patient1',
    appointment_date: '2025-11-26T15:30:00Z',
    start_time: '15:30:00',
    end_time: '16:00:00',
    appointment_type: 'routine_checkup',
    status: 'confirmed' as const,
    notes: 'Follow-up appointment',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    doctor_first_name: 'Dr. Jane',
    doctor_last_name: 'Smith',
    specialization: 'General Medicine'
  }
];

const mockTimeSlots = [
  { start_time: '09:00', end_time: '09:30', available: true },
  { start_time: '09:30', end_time: '10:00', available: true },
  { start_time: '10:00', end_time: '10:30', available: true }
];

const MockedAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const authValue = {
    user: { id: 'patient1', email: 'john.doe@example.com', role: 'patient' as const },
    profile: mockPatient,
    login: jest.fn(),
    logout: jest.fn(),
    loading: false,
    error: null
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

const renderPatientDashboard = () => {
  return render(
    <BrowserRouter>
      <MockedAuthProvider>
        <PatientDashboard />
      </MockedAuthProvider>
    </BrowserRouter>
  );
};

describe('PatientDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockedDoctorService.getAvailableDoctors.mockResolvedValue(mockDoctors);
    mockedAppointmentService.getPatientAppointments.mockResolvedValue(mockAppointments);
    mockedAppointmentService.getAvailableSlots.mockResolvedValue(mockTimeSlots);
  });

  describe('Date Filtering Logic', () => {
    test('should show all appointments when no date is selected', async () => {
      renderPatientDashboard();

      await waitFor(() => {
        expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
      });

      // Should show both appointments (Nov 25 and Nov 26)
      const appointmentCards = screen.getAllByText(/Dr. Jane Smith/);
      expect(appointmentCards).toHaveLength(2);
    });

    test('should filter appointments to show only selected date (November 25, 2025)', async () => {
      const user = userEvent.setup();
      renderPatientDashboard();

      await waitFor(() => {
        expect(screen.getByText('Select Doctor')).toBeInTheDocument();
      });

      // Select doctor first
      const doctorCard = screen.getByText('Dr. Jane Smith');
      await user.click(doctorCard);

      // Select date (November 25, 2025)
      const dateInput = screen.getByDisplayValue('') as HTMLInputElement;
      await user.type(dateInput, '2025-11-25');

      await waitFor(() => {
        const appointmentCards = screen.getAllByText(/Dr. Jane Smith/);
        // Should only show 1 appointment for Nov 25
        expect(appointmentCards).toHaveLength(1);
      });

      // Verify the correct appointment is shown
      expect(screen.getByText('14:00:00 - 14:30:00')).toBeInTheDocument();
      expect(screen.queryByText('15:30:00 - 16:00:00')).not.toBeInTheDocument();
    });

    test('should filter appointments to show only selected date (November 26, 2025)', async () => {
      const user = userEvent.setup();
      renderPatientDashboard();

      await waitFor(() => {
        expect(screen.getByText('Select Doctor')).toBeInTheDocument();
      });

      // Select doctor first
      const doctorCard = screen.getByText('Dr. Jane Smith');
      await user.click(doctorCard);

      // Select date (November 26, 2025)
      const dateInput = screen.getByDisplayValue('') as HTMLInputElement;
      await user.type(dateInput, '2025-11-26');

      await waitFor(() => {
        const appointmentCards = screen.getAllByText(/Dr. Jane Smith/);
        // Should only show 1 appointment for Nov 26
        expect(appointmentCards).toHaveLength(1);
      });

      // Verify the correct appointment is shown
      expect(screen.getByText('15:30:00 - 16:00:00')).toBeInTheDocument();
      expect(screen.queryByText('14:00:00 - 14:30:00')).not.toBeInTheDocument();
    });

    test('should show no appointments message when selected date has no appointments', async () => {
      const user = userEvent.setup();
      renderPatientDashboard();

      await waitFor(() => {
        expect(screen.getByText('Select Doctor')).toBeInTheDocument();
      });

      // Select doctor first
      const doctorCard = screen.getByText('Dr. Jane Smith');
      await user.click(doctorCard);

      // Select date with no appointments (November 27, 2025)
      const dateInput = screen.getByDisplayValue('') as HTMLInputElement;
      await user.type(dateInput, '2025-11-27');

      await waitFor(() => {
        expect(screen.getByText(/No appointments scheduled for/)).toBeInTheDocument();
      });

      // Should not show any appointment cards
      expect(screen.queryByText('14:00:00 - 14:30:00')).not.toBeInTheDocument();
      expect(screen.queryByText('15:30:00 - 16:00:00')).not.toBeInTheDocument();
    });
  });

  describe('Date Format Handling', () => {
    test('should handle ISO date strings correctly', async () => {
      const appointmentsWithISODates = [
        {
          ...mockAppointments[0],
          appointment_date: '2025-11-25T14:00:00.000Z'
        }
      ];

      mockedAppointmentService.getPatientAppointments.mockResolvedValue(appointmentsWithISODates);
      
      const user = userEvent.setup();
      renderPatientDashboard();

      await waitFor(() => {
        expect(screen.getByText('Select Doctor')).toBeInTheDocument();
      });

      // Select doctor and date
      const doctorCard = screen.getByText('Dr. Jane Smith');
      await user.click(doctorCard);

      const dateInput = screen.getByDisplayValue('') as HTMLInputElement;
      await user.type(dateInput, '2025-11-25');

      await waitFor(() => {
        expect(screen.getByText('14:00:00 - 14:30:00')).toBeInTheDocument();
      });
    });

    test('should handle date-only strings correctly', async () => {
      const appointmentsWithDateOnly = [
        {
          ...mockAppointments[0],
          appointment_date: '2025-11-25'
        }
      ];

      mockedAppointmentService.getPatientAppointments.mockResolvedValue(appointmentsWithDateOnly);
      
      const user = userEvent.setup();
      renderPatientDashboard();

      await waitFor(() => {
        expect(screen.getByText('Select Doctor')).toBeInTheDocument();
      });

      // Select doctor and date
      const doctorCard = screen.getByText('Dr. Jane Smith');
      await user.click(doctorCard);

      const dateInput = screen.getByDisplayValue('') as HTMLInputElement;
      await user.type(dateInput, '2025-11-25');

      await waitFor(() => {
        expect(screen.getByText('14:00:00 - 14:30:00')).toBeInTheDocument();
      });
    });
  });

  describe('Appointment Layout and Alignment', () => {
    test('should display appointment cards with proper structure', async () => {
      renderPatientDashboard();

      await waitFor(() => {
        expect(screen.getByText('Your Appointments')).toBeInTheDocument();
      });

      // Check if appointment cards have proper structure
      const appointmentCards = screen.getAllByText(/Dr. Jane Smith/);
      expect(appointmentCards).toHaveLength(2);

      // Check if status badges are displayed
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Confirmed')).toBeInTheDocument();

      // Check if appointment types are displayed
      expect(screen.getByText('Consultation')).toBeInTheDocument();
      expect(screen.getByText('Routine checkup')).toBeInTheDocument();
    });

    test('should display time slots correctly when doctor and date are selected', async () => {
      const user = userEvent.setup();
      renderPatientDashboard();

      await waitFor(() => {
        expect(screen.getByText('Select Doctor')).toBeInTheDocument();
      });

      // Select doctor
      const doctorCard = screen.getByText('Dr. Jane Smith');
      await user.click(doctorCard);

      // Select date
      const dateInput = screen.getByDisplayValue('') as HTMLInputElement;
      await user.type(dateInput, '2025-11-25');

      await waitFor(() => {
        expect(screen.getByText('Available Time Slots')).toBeInTheDocument();
      });

      // Check if time slots are displayed
      expect(screen.getByText('09:00 - 09:30')).toBeInTheDocument();
      expect(screen.getByText('09:30 - 10:00')).toBeInTheDocument();
      expect(screen.getByText('10:00 - 10:30')).toBeInTheDocument();
    });

    test('should handle appointment cancellation', async () => {
      const user = userEvent.setup();
      mockedAppointmentService.updateAppointmentStatus.mockResolvedValue({
        ...mockAppointments[0],
        status: 'cancelled'
      });

      renderPatientDashboard();

      await waitFor(() => {
        expect(screen.getByText('Your Appointments')).toBeInTheDocument();
      });

      // Find and click cancel button (only for pending appointments)
      const cancelButton = screen.getByText('Cancel');
      
      // Mock window.confirm to return true
      window.confirm = jest.fn(() => true);
      
      await user.click(cancelButton);

      await waitFor(() => {
        expect(mockedAppointmentService.updateAppointmentStatus).toHaveBeenCalledWith(
          'apt1',
          'cancelled',
          'Cancelled by patient'
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('should display error message when appointments fail to load', async () => {
      mockedAppointmentService.getPatientAppointments.mockRejectedValue(
        new Error('Failed to load appointments')
      );

      renderPatientDashboard();

      await waitFor(() => {
        expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      });
    });

    test('should display error message when doctors fail to load', async () => {
      mockedDoctorService.getAvailableDoctors.mockRejectedValue(
        new Error('Failed to load doctors')
      );

      renderPatientDashboard();

      await waitFor(() => {
        expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      });
    });
  });
});

// Helper function to test date filtering logic in isolation
export const testDateFilterLogic = (appointments: any[], selectedDate: string) => {
  return appointments.filter(appointment => {
    if (!selectedDate) return true;
    
    // Extract date from appointment (handle both ISO string and date-only formats)
    let appointmentDate;
    if (appointment.appointment_date.includes('T')) {
      appointmentDate = appointment.appointment_date.split('T')[0];
    } else {
      appointmentDate = appointment.appointment_date;
    }
    
    // Ensure both dates are in YYYY-MM-DD format for comparison
    const appointmentDateObj = new Date(appointmentDate);
    const selectedDateObj = new Date(selectedDate);
    
    const appointmentDateString = appointmentDateObj.toISOString().split('T')[0];
    const selectedDateString = selectedDateObj.toISOString().split('T')[0];
    
    return appointmentDateString === selectedDateString;
  });
};

describe('Date Filter Logic (Unit Tests)', () => {
  const testAppointments = [
    { id: '1', appointment_date: '2025-11-25T14:00:00Z' },
    { id: '2', appointment_date: '2025-11-26T15:30:00Z' },
    { id: '3', appointment_date: '2025-11-25' },
    { id: '4', appointment_date: '2025-11-27T10:00:00.000Z' }
  ];

  test('should filter appointments for November 25, 2025', () => {
    const filtered = testDateFilterLogic(testAppointments, '2025-11-25');
    expect(filtered).toHaveLength(2);
    expect(filtered.map(a => a.id)).toEqual(['1', '3']);
  });

  test('should filter appointments for November 26, 2025', () => {
    const filtered = testDateFilterLogic(testAppointments, '2025-11-26');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });

  test('should return all appointments when no date is selected', () => {
    const filtered = testDateFilterLogic(testAppointments, '');
    expect(filtered).toHaveLength(4);
  });

  test('should handle edge cases with different date formats', () => {
    const edgeCaseAppointments = [
      { id: '1', appointment_date: '2025-12-31T23:59:59Z' },
      { id: '2', appointment_date: '2025-12-31' },
      { id: '3', appointment_date: '2026-01-01T00:00:00.000Z' }
    ];

    const filtered = testDateFilterLogic(edgeCaseAppointments, '2025-12-31');
    expect(filtered).toHaveLength(2);
    expect(filtered.map(a => a.id)).toEqual(['1', '2']);
  });
});