const { db: pool } = require('../config/database');

class Appointment {
  static async create(appointmentData) {
    const {
      doctor_id,
      patient_id,
      appointment_date,
      start_time,
      end_time,
      appointment_type = 'consultation',
      notes = '',
      status = 'pending',
      patient_name = null,
      patient_phone = null
    } = appointmentData;

    const query = `
      INSERT INTO appointments (
        doctor_id, patient_id, appointment_date, start_time, end_time,
        appointment_type, notes, status, patient_name, patient_phone, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [
      doctor_id, patient_id, appointment_date, start_time, end_time,
      appointment_type, notes, status, patient_name, patient_phone
    ]);

    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT 
        a.*,
        COALESCE(a.patient_name, CONCAT(p.first_name, CASE WHEN p.last_name IS NOT NULL AND p.last_name != '' THEN CONCAT(' ', p.last_name) ELSE '' END)) as patient_first_name,
        '' as patient_last_name,
        COALESCE(a.patient_phone, p.phone) as patient_phone,
        pu.email as patient_email,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        d.specialization,
        d.consultation_fee
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN users pu ON p.user_id = pu.id
      WHERE a.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByDoctorId(doctorId, filters = {}) {
    let query = `
      SELECT 
        a.*,
        COALESCE(a.patient_name, CONCAT(p.first_name, CASE WHEN p.last_name IS NOT NULL AND p.last_name != '' THEN CONCAT(' ', p.last_name) ELSE '' END)) as patient_first_name,
        '' as patient_last_name,
        COALESCE(a.patient_phone, p.phone) as patient_phone,
        pu.email as patient_email
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users pu ON p.user_id = pu.id
      WHERE a.doctor_id = $1
    `;

    const queryParams = [doctorId];
    let paramCount = 1;

    if (filters.date) {
      paramCount++;
      query += ` AND a.appointment_date = $${paramCount}`;
      queryParams.push(filters.date);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND a.status = $${paramCount}`;
      queryParams.push(filters.status);
    }

    query += ` ORDER BY a.appointment_date ASC, a.start_time ASC`;

    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  static async findByPatientId(patientId, filters = {}) {
    let query = `
      SELECT 
        a.*,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        d.specialization,
        d.consultation_fee
      FROM appointments a
      LEFT JOIN doctors d ON a.doctor_id = d.id
      WHERE a.patient_id = $1
    `;

    const queryParams = [patientId];
    let paramCount = 1;

    if (filters.status) {
      paramCount++;
      query += ` AND a.status = $${paramCount}`;
      queryParams.push(filters.status);
    }

    query += ` ORDER BY a.appointment_date DESC, a.start_time DESC`;

    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  static async updateStatus(id, status, notes = null) {
    const query = `
      UPDATE appointments 
      SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [status, notes, id]);
    return result.rows[0];
  }

  static async getAvailableSlots(doctorId, date) {
    // Get doctor's working hours
    const doctorQuery = `
      SELECT working_hours, consultation_fee
      FROM doctors 
      WHERE id = $1 AND is_available = true
    `;
    
    const doctorResult = await pool.query(doctorQuery, [doctorId]);
    if (doctorResult.rows.length === 0) {
      return [];
    }

    const { working_hours } = doctorResult.rows[0];
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(); // get day like 'monday', 'tuesday'
    
    if (!working_hours || !working_hours[dayOfWeek]) {
      return [];
    }

    // Get existing appointments for the date
    const appointmentsQuery = `
      SELECT start_time, end_time 
      FROM appointments 
      WHERE doctor_id = $1 AND appointment_date = $2 AND status IN ('pending', 'confirmed')
    `;
    
    const appointmentsResult = await pool.query(appointmentsQuery, [doctorId, date]);
    const bookedSlots = appointmentsResult.rows;

    // Generate available 30-minute slots
    const { start: dayStart, end: dayEnd } = working_hours[dayOfWeek];
    const slots = [];
    
    const startTime = new Date(`1970-01-01T${dayStart}:00`);
    const endTime = new Date(`1970-01-01T${dayEnd}:00`);
    
    while (startTime < endTime) {
      const slotStart = startTime.toTimeString().slice(0, 5);
      const slotEndTime = new Date(startTime.getTime() + 30 * 60000);
      const slotEnd = slotEndTime.toTimeString().slice(0, 5);
      
      // Check if slot is available
      const isBooked = bookedSlots.some(booking => {
        return (slotStart >= booking.start_time && slotStart < booking.end_time) ||
               (slotEnd > booking.start_time && slotEnd <= booking.end_time);
      });
      
      if (!isBooked) {
        slots.push({
          start_time: slotStart,
          end_time: slotEnd,
          available: true
        });
      }
      
      startTime.setMinutes(startTime.getMinutes() + 30);
    }
    
    return slots;
  }

  static async delete(id) {
    const query = 'DELETE FROM appointments WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Appointment;