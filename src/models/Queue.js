const { db } = require('../config/database');

class Queue {
  static async joinQueue(queueData) {
    const {
      doctor_id,
      patient_id,
      appointment_id,
      priority_level = 1,
      notes,
    } = queueData;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get next queue number
      const queueNumberResult = await client.query(
        'SELECT get_next_queue_number($1) as queue_number',
        [doctor_id]
      );
      const queue_number = queueNumberResult.rows[0].queue_number;

      // Calculate estimated wait time
      const waitTimeResult = await client.query(
        'SELECT calculate_wait_time($1, $2) as estimated_wait_time',
        [doctor_id, priority_level]
      );
      const estimated_wait_time = waitTimeResult.rows[0].estimated_wait_time;

      // Insert into queue
      const insertQuery = `
        INSERT INTO queue (doctor_id, patient_id, appointment_id, queue_number, priority_level, estimated_wait_time, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        doctor_id,
        patient_id,
        appointment_id,
        queue_number,
        priority_level,
        estimated_wait_time,
        notes,
      ]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getQueueByDoctor(doctor_id, status = 'waiting') {
    const query = `
      SELECT 
        q.*,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.phone as patient_phone,
        a.appointment_type,
        a.notes as appointment_notes
      FROM queue q
      JOIN patients p ON q.patient_id = p.id
      LEFT JOIN appointments a ON q.appointment_id = a.id
      WHERE q.doctor_id = $1 
        AND q.status = $2
        AND DATE(q.joined_at) = CURRENT_DATE
      ORDER BY q.priority_level DESC, q.queue_number ASC
    `;

    const result = await db.query(query, [doctor_id, status]);
    return result.rows;
  }

  static async getPatientQueueStatus(patient_id, doctor_id = null) {
    let query = `
      SELECT 
        q.*,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        d.specialization,
        a.scheduled_time,
        a.appointment_type
      FROM queue q
      JOIN doctors d ON q.doctor_id = d.id
      LEFT JOIN appointments a ON q.appointment_id = a.id
      WHERE q.patient_id = $1 
        AND q.status IN ('waiting', 'called')
        AND DATE(q.joined_at) = CURRENT_DATE
    `;

    const params = [patient_id];

    if (doctor_id) {
      query += ' AND q.doctor_id = $2';
      params.push(doctor_id);
    }

    query += ' ORDER BY q.joined_at DESC';

    const result = await db.query(query, params);
    return result.rows;
  }

  static async callNext(doctor_id) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Find next patient in queue
      const nextPatientQuery = `
        SELECT * FROM queue
        WHERE doctor_id = $1 
          AND status = 'waiting'
          AND DATE(joined_at) = CURRENT_DATE
        ORDER BY priority_level DESC, queue_number ASC
        LIMIT 1
        FOR UPDATE
      `;

      const nextPatientResult = await client.query(nextPatientQuery, [
        doctor_id,
      ]);

      if (nextPatientResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const nextPatient = nextPatientResult.rows[0];

      // Update status to called
      const updateQuery = `
        UPDATE queue 
        SET status = 'called', called_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(updateQuery, [nextPatient.id]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateStatus(queueId, status, notes = null) {
    const validStatuses = [
      'waiting',
      'called',
      'in_consultation',
      'completed',
      'missed',
    ];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    let query = `
      UPDATE queue 
      SET status = $1, updated_at = NOW()
    `;

    const params = [status];
    let paramIndex = 2;

    if (status === 'completed') {
      query += ', completed_at = NOW()';
    }

    if (notes) {
      query += `, notes = $${paramIndex}`;
      params.push(notes);
      paramIndex++;
    }

    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(queueId);

    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async removeFromQueue(queueId) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get queue details before deletion
      const queueResult = await client.query(
        'SELECT * FROM queue WHERE id = $1',
        [queueId]
      );

      if (queueResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const queueData = queueResult.rows[0];

      // Move to history if it was completed
      if (queueData.status === 'completed') {
        const historyQuery = `
          INSERT INTO queue_history (
            doctor_id, patient_id, appointment_id, queue_number, priority_level,
            wait_time_minutes, consultation_duration_minutes, queue_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        const waitTime = queueData.called_at
          ? Math.round(
              (queueData.called_at - queueData.joined_at) / (1000 * 60)
            )
          : null;
        const consultationTime =
          queueData.completed_at && queueData.called_at
            ? Math.round(
                (queueData.completed_at - queueData.called_at) / (1000 * 60)
              )
            : null;

        await client.query(historyQuery, [
          queueData.doctor_id,
          queueData.patient_id,
          queueData.appointment_id,
          queueData.queue_number,
          queueData.priority_level,
          waitTime,
          consultationTime,
          new Date(queueData.joined_at).toDateString(),
        ]);
      }

      // Delete from queue
      await client.query('DELETE FROM queue WHERE id = $1', [queueId]);

      await client.query('COMMIT');
      return queueData;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getQueueStats(doctor_id, date = new Date()) {
    const query = `
      SELECT 
        COUNT(*) as total_patients,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
        COUNT(CASE WHEN status = 'called' THEN 1 END) as called,
        COUNT(CASE WHEN status = 'in_consultation' THEN 1 END) as in_consultation,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed,
        AVG(estimated_wait_time) as avg_estimated_wait_time,
        MAX(queue_number) as last_queue_number
      FROM queue
      WHERE doctor_id = $1 AND DATE(joined_at) = $2
    `;

    const result = await db.query(query, [doctor_id, date.toDateString()]);
    return result.rows[0];
  }

  static async updateEstimatedWaitTimes(doctor_id) {
    const query = `
      UPDATE queue 
      SET estimated_wait_time = calculate_wait_time($1, priority_level)
      WHERE doctor_id = $1 
        AND status = 'waiting' 
        AND DATE(joined_at) = CURRENT_DATE
      RETURNING *
    `;

    const result = await db.query(query, [doctor_id]);
    return result.rows;
  }

  static async getQueuePosition(queueId) {
    const query = `
      WITH queue_position AS (
        SELECT 
          id,
          ROW_NUMBER() OVER (
            PARTITION BY doctor_id 
            ORDER BY priority_level DESC, queue_number ASC
          )::int as position
        FROM queue
        WHERE status = 'waiting' 
          AND DATE(joined_at) = CURRENT_DATE
          AND doctor_id = (SELECT doctor_id FROM queue WHERE id = $1)
      )
      SELECT position FROM queue_position WHERE id = $1
    `;

    const result = await db.query(query, [queueId]);
    return result.rows[0]?.position || null;
  }
}

module.exports = Queue;
