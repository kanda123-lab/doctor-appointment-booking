const { db } = require('../config/database');

class Doctor {
  static async create(doctorData) {
    const {
      user_id,
      first_name,
      last_name,
      specialization,
      license_number,
      phone,
      consultation_fee,
      working_hours,
    } = doctorData;

    const query = `
      INSERT INTO doctors (user_id, first_name, last_name, specialization, license_number, phone, consultation_fee, working_hours)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      user_id,
      first_name,
      last_name,
      specialization,
      license_number,
      phone,
      consultation_fee,
      working_hours,
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT d.*, u.email, u.is_active
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = $1 AND u.is_active = true
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByUserId(user_id) {
    const query = `
      SELECT d.*, u.email, u.is_active
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.user_id = $1 AND u.is_active = true
    `;
    const result = await db.query(query, [user_id]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT d.*, u.email, u.is_active
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE u.is_active = true
    `;
    const params = [];
    let paramCount = 0;

    if (filters.specialization) {
      paramCount++;
      query += ` AND d.specialization ILIKE $${paramCount}`;
      params.push(`%${filters.specialization}%`);
    }

    if (filters.is_available !== undefined) {
      paramCount++;
      query += ` AND d.is_available = $${paramCount}`;
      params.push(filters.is_available);
    }

    query += ' ORDER BY d.created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  static async updateAvailability(id, is_available) {
    const query = `
      UPDATE doctors 
      SET is_available = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [is_available, id]);
    return result.rows[0];
  }

  static async update(id, updateData) {
    const allowedFields = [
      'first_name',
      'last_name',
      'specialization',
      'phone',
      'consultation_fee',
      'working_hours',
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
      UPDATE doctors 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const values = [id, ...fields.map((field) => updateData[field])];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async getAvailableDoctors(specialization = null) {
    let query = `
      SELECT d.*, u.email
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.is_available = true AND u.is_active = true
    `;
    const params = [];

    if (specialization) {
      query += ' AND d.specialization ILIKE $1';
      params.push(`%${specialization}%`);
    }

    query += ' ORDER BY d.specialization, d.last_name, d.first_name';

    const result = await db.query(query, params);
    return result.rows;
  }

  static async getDoctorStats(doctorId, startDate = null, endDate = null) {
    let query = `
      SELECT 
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
        COUNT(CASE WHEN a.status = 'no_show' THEN 1 END) as no_show_appointments,
        AVG(CASE WHEN qh.wait_time_minutes IS NOT NULL THEN qh.wait_time_minutes END) as avg_wait_time,
        AVG(CASE WHEN qh.consultation_duration_minutes IS NOT NULL THEN qh.consultation_duration_minutes END) as avg_consultation_time
      FROM doctors d
      LEFT JOIN appointments a ON d.id = a.doctor_id
      LEFT JOIN queue_history qh ON d.id = qh.doctor_id
      WHERE d.id = $1
    `;
    const params = [doctorId];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      query += ` AND a.scheduled_time >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND a.scheduled_time <= $${paramCount}`;
      params.push(endDate);
    }

    const result = await db.query(query, params);
    return result.rows[0];
  }
}

module.exports = Doctor;
