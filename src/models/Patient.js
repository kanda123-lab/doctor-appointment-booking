const { db } = require('../config/database');

class Patient {
  static async create(patientData) {
    const {
      user_id,
      first_name,
      last_name,
      date_of_birth,
      phone,
      address,
      emergency_contact,
      medical_history,
    } = patientData;

    const query = `
      INSERT INTO patients (user_id, first_name, last_name, date_of_birth, phone, address, emergency_contact, medical_history)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      user_id,
      first_name,
      last_name,
      date_of_birth,
      phone,
      address,
      emergency_contact,
      medical_history,
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT p.*, u.email, u.is_active
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1 AND u.is_active = true
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByUserId(user_id) {
    const query = `
      SELECT p.*, u.email, u.is_active
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1 AND u.is_active = true
    `;
    const result = await db.query(query, [user_id]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT p.*, u.email, u.is_active
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE u.is_active = true
    `;
    const params = [];
    let paramCount = 0;

    if (filters.search) {
      paramCount++;
      query += ` AND (p.first_name ILIKE $${paramCount} OR p.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    query += ' ORDER BY p.created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  static async update(id, updateData) {
    const allowedFields = [
      'first_name',
      'last_name',
      'date_of_birth',
      'phone',
      'address',
      'emergency_contact',
      'medical_history',
    ];
    const fields = Object.keys(updateData).filter((key) =>
      allowedFields.includes(key)
    );

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(', ');
    const query = `
      UPDATE patients 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const values = [id, ...fields.map((field) => updateData[field])];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async getPatientHistory(patientId, limit = 10) {
    const query = `
      SELECT 
        a.*,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        d.specialization
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.patient_id = $1
      ORDER BY a.scheduled_time DESC
      LIMIT $2
    `;

    const result = await db.query(query, [patientId, limit]);
    return result.rows;
  }

  static async getUpcomingAppointments(patientId) {
    const query = `
      SELECT 
        a.*,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        d.specialization,
        q.queue_number,
        q.status as queue_status,
        q.estimated_wait_time
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN queue q ON a.id = q.appointment_id
      WHERE a.patient_id = $1 
        AND a.status IN ('scheduled', 'in_progress')
        AND a.scheduled_time >= NOW()
      ORDER BY a.scheduled_time ASC
    `;

    const result = await db.query(query, [patientId]);
    return result.rows;
  }

  static async getPatientStats(patientId) {
    const query = `
      SELECT 
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as total_appointments,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
        COUNT(CASE WHEN a.status = 'no_show' THEN 1 END) as missed_appointments,
        COUNT(CASE WHEN a.scheduled_time >= NOW() THEN 1 END) as upcoming_appointments,
        MAX(a.scheduled_time) as last_appointment_date
      FROM appointments a
      WHERE a.patient_id = $1
    `;

    const result = await db.query(query, [patientId]);
    return result.rows[0];
  }

  static async searchPatients(searchTerm, limit = 20) {
    const query = `
      SELECT p.*, u.email
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE u.is_active = true
        AND (
          p.first_name ILIKE $1 
          OR p.last_name ILIKE $1 
          OR u.email ILIKE $1
          OR p.phone ILIKE $1
        )
      ORDER BY p.last_name, p.first_name
      LIMIT $2
    `;

    const result = await db.query(query, [`%${searchTerm}%`, limit]);
    return result.rows;
  }
}

module.exports = Patient;
