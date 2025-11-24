// Test file for date filtering logic used in PatientDashboard

interface MockAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

// Extracted date filter logic from PatientDashboard
export const filterAppointmentsByDate = (appointments: MockAppointment[], selectedDate: string): MockAppointment[] => {
  return appointments.filter(appointment => {
    if (!selectedDate) return true; // Show all appointments when no date is selected
    
    try {
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
      
      // Check if dates are valid
      if (isNaN(appointmentDateObj.getTime()) || isNaN(selectedDateObj.getTime())) {
        return false; // Invalid dates don't match
      }
      
      const appointmentDateString = appointmentDateObj.toISOString().split('T')[0];
      const selectedDateString = selectedDateObj.toISOString().split('T')[0];
      
      return appointmentDateString === selectedDateString;
    } catch (error) {
      // If any error occurs during date processing, exclude the appointment
      return false;
    }
  });
};

describe('Date Filter Logic', () => {
  const mockAppointments: MockAppointment[] = [
    {
      id: 'apt1',
      appointment_date: '2025-11-25T14:00:00Z',
      start_time: '14:00:00',
      end_time: '14:30:00',
      status: 'pending'
    },
    {
      id: 'apt2',
      appointment_date: '2025-11-26T15:30:00Z',
      start_time: '15:30:00',
      end_time: '16:00:00',
      status: 'confirmed'
    },
    {
      id: 'apt3',
      appointment_date: '2025-11-25T10:00:00.000Z',
      start_time: '10:00:00',
      end_time: '10:30:00',
      status: 'completed'
    },
    {
      id: 'apt4',
      appointment_date: '2025-11-25',
      start_time: '16:00:00',
      end_time: '16:30:00',
      status: 'pending'
    }
  ];

  test('should show all appointments when no date is selected', () => {
    const filtered = filterAppointmentsByDate(mockAppointments, '');
    expect(filtered).toHaveLength(4);
    expect(filtered.map(apt => apt.id)).toEqual(['apt1', 'apt2', 'apt3', 'apt4']);
  });

  test('should filter appointments for November 25, 2025 correctly', () => {
    const filtered = filterAppointmentsByDate(mockAppointments, '2025-11-25');
    expect(filtered).toHaveLength(3);
    expect(filtered.map(apt => apt.id)).toEqual(['apt1', 'apt3', 'apt4']);
  });

  test('should filter appointments for November 26, 2025 correctly', () => {
    const filtered = filterAppointmentsByDate(mockAppointments, '2025-11-26');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('apt2');
  });

  test('should return empty array when no appointments match selected date', () => {
    const filtered = filterAppointmentsByDate(mockAppointments, '2025-11-27');
    expect(filtered).toHaveLength(0);
  });

  test('should handle ISO date string format correctly', () => {
    const appointmentsWithISO = [
      {
        id: 'iso1',
        appointment_date: '2025-11-25T14:00:00.000Z',
        start_time: '14:00:00',
        end_time: '14:30:00',
        status: 'pending'
      }
    ];

    const filtered = filterAppointmentsByDate(appointmentsWithISO, '2025-11-25');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('iso1');
  });

  test('should handle date-only string format correctly', () => {
    const appointmentsWithDateOnly = [
      {
        id: 'date1',
        appointment_date: '2025-11-25',
        start_time: '14:00:00',
        end_time: '14:30:00',
        status: 'pending'
      }
    ];

    const filtered = filterAppointmentsByDate(appointmentsWithDateOnly, '2025-11-25');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('date1');
  });

  test('should handle timezone differences correctly', () => {
    const appointmentsWithTimezone = [
      {
        id: 'tz1',
        appointment_date: '2025-11-25T23:59:59-05:00', // Late evening in UTC-5
        start_time: '23:59:59',
        end_time: '24:00:00',
        status: 'pending'
      },
      {
        id: 'tz2',
        appointment_date: '2025-11-26T04:59:59Z', // Early morning UTC (same as above in UTC)
        start_time: '04:59:59',
        end_time: '05:30:00',
        status: 'confirmed'
      }
    ];

    // Both should be on different dates when normalized
    const filteredNov25 = filterAppointmentsByDate(appointmentsWithTimezone, '2025-11-25');
    const filteredNov26 = filterAppointmentsByDate(appointmentsWithTimezone, '2025-11-26');

    expect(filteredNov25).toHaveLength(1);
    expect(filteredNov26).toHaveLength(1);
    expect(filteredNov25[0].id).toBe('tz1');
    expect(filteredNov26[0].id).toBe('tz2');
  });

  test('should handle edge cases with year boundaries', () => {
    const edgeCaseAppointments = [
      {
        id: 'edge1',
        appointment_date: '2025-12-31T23:59:59Z',
        start_time: '23:59:59',
        end_time: '24:00:00',
        status: 'pending'
      },
      {
        id: 'edge2',
        appointment_date: '2026-01-01T00:00:00Z',
        start_time: '00:00:00',
        end_time: '00:30:00',
        status: 'confirmed'
      }
    ];

    const filteredDec31 = filterAppointmentsByDate(edgeCaseAppointments, '2025-12-31');
    const filteredJan01 = filterAppointmentsByDate(edgeCaseAppointments, '2026-01-01');

    expect(filteredDec31).toHaveLength(1);
    expect(filteredJan01).toHaveLength(1);
    expect(filteredDec31[0].id).toBe('edge1');
    expect(filteredJan01[0].id).toBe('edge2');
  });

  test('should handle invalid date formats gracefully', () => {
    const invalidDateAppointments = [
      {
        id: 'invalid1',
        appointment_date: 'invalid-date',
        start_time: '14:00:00',
        end_time: '14:30:00',
        status: 'pending'
      }
    ];

    // Should not crash and should exclude invalid date appointments
    const filtered = filterAppointmentsByDate(invalidDateAppointments, '2025-11-25');
    expect(filtered).toHaveLength(0); // Invalid date appointments should be excluded
    
    // Should not crash with invalid selected date either
    const filtered2 = filterAppointmentsByDate(mockAppointments, 'invalid-selected-date');
    expect(filtered2).toHaveLength(0); // No appointments should match invalid selected date
  });

  describe('Real-world scenarios based on the UI issue', () => {
    test('should fix the original issue: Nov 25 selected but Nov 26 appointments showing', () => {
      const realWorldAppointments = [
        {
          id: 'real1',
          appointment_date: '2025-11-25T14:00:00Z',
          start_time: '14:00:00',
          end_time: '14:30:00',
          status: 'pending'
        },
        {
          id: 'real2',
          appointment_date: '2025-11-26T15:30:00Z',
          start_time: '15:30:00',
          end_time: '16:00:00',
          status: 'confirmed'
        }
      ];

      // When November 25 is selected, only Nov 25 appointment should show
      const filteredNov25 = filterAppointmentsByDate(realWorldAppointments, '2025-11-25');
      expect(filteredNov25).toHaveLength(1);
      expect(filteredNov25[0].id).toBe('real1');
      expect(filteredNov25[0].start_time).toBe('14:00:00');

      // When November 26 is selected, only Nov 26 appointment should show
      const filteredNov26 = filterAppointmentsByDate(realWorldAppointments, '2025-11-26');
      expect(filteredNov26).toHaveLength(1);
      expect(filteredNov26[0].id).toBe('real2');
      expect(filteredNov26[0].start_time).toBe('15:30:00');
    });

    test('should validate the date input format compatibility', () => {
      const appointment = {
        id: 'format-test',
        appointment_date: '2025-11-25T14:00:00Z',
        start_time: '14:00:00',
        end_time: '14:30:00',
        status: 'pending'
      };

      // Date input format (YYYY-MM-DD) should work correctly
      const filtered = filterAppointmentsByDate([appointment], '2025-11-25');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('format-test');
    });
  });
});