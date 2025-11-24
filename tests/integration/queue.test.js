const request = require('supertest');
const app = require('../../server');
const DatabaseInitializer = require('../../src/database/init');

describe('Queue Management API', () => {
  let doctorToken, patientToken;
  let doctorProfileId, patientProfileId;

  beforeAll(async () => {
    // Reset database for clean testing
    await DatabaseInitializer.reset();
    await DatabaseInitializer.initialize();

    // Register a doctor
    const doctorRegisterResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'queue.doctor@test.com',
        password: 'TestPassword123!',
        role: 'doctor',
        profile: {
          first_name: 'Queue',
          last_name: 'Doctor',
          specialization: 'Emergency Medicine',
          license_number: 'QUEUE123',
          consultation_fee: 150.0,
        },
      });

    doctorToken = doctorRegisterResponse.body.data.tokens.accessToken;
    doctorProfileId = doctorRegisterResponse.body.data.profile.id;

    // Set doctor as available
    await request(app)
      .put(`/api/doctors/${doctorProfileId}/availability`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ is_available: true });

    // Register a patient
    const patientRegisterResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'queue.patient@test.com',
        password: 'TestPassword123!',
        role: 'patient',
        profile: {
          first_name: 'Queue',
          last_name: 'Patient',
          date_of_birth: '1985-05-15',
        },
      });

    patientToken = patientRegisterResponse.body.data.tokens.accessToken;
    patientProfileId = patientRegisterResponse.body.data.profile.id;
  });

  describe('POST /api/queue/join', () => {
    test('should allow patient to join queue', async () => {
      const queueData = {
        doctor_id: doctorProfileId,
        patient_id: patientProfileId,
        priority_level: 1,
        notes: 'Routine checkup',
      };

      const response = await request(app)
        .post('/api/queue/join')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(queueData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.queue.doctor_id).toBe(doctorProfileId);
      expect(response.body.data.queue.patient_id).toBe(patientProfileId);
      expect(response.body.data.queue.queue_number).toBe(1);
      expect(response.body.data.queue.status).toBe('waiting');
      expect(response.body.data.estimated_wait_time).toBe(0);
    });

    test('should reject joining queue without authentication', async () => {
      const queueData = {
        doctor_id: doctorProfileId,
        patient_id: patientProfileId,
        priority_level: 1,
      };

      const response = await request(app)
        .post('/api/queue/join')
        .send(queueData)
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    test('should reject joining queue with invalid doctor_id', async () => {
      const queueData = {
        doctor_id: 'invalid-uuid',
        patient_id: patientProfileId,
        priority_level: 1,
      };

      const response = await request(app)
        .post('/api/queue/join')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(queueData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Validation failed');
    });

    test('should reject joining same doctor queue twice', async () => {
      const queueData = {
        doctor_id: doctorProfileId,
        patient_id: patientProfileId,
        priority_level: 1,
      };

      // Try to join again
      const response = await request(app)
        .post('/api/queue/join')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(queueData)
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe(
        'Patient is already in queue for this doctor today'
      );
    });
  });

  describe('GET /api/queue/doctor/:doctor_id', () => {
    test('should get doctor queue', async () => {
      const response = await request(app)
        .get(`/api/queue/doctor/${doctorProfileId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.queue).toBeInstanceOf(Array);
      expect(response.body.data.queue.length).toBeGreaterThan(0);
      expect(response.body.data.stats).toBeDefined();
    });

    test('should filter queue by status', async () => {
      const response = await request(app)
        .get(`/api/queue/doctor/${doctorProfileId}?status=waiting`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.queue).toBeInstanceOf(Array);
      response.body.data.queue.forEach((entry) => {
        expect(entry.status).toBe('waiting');
      });
    });
  });

  describe('GET /api/queue/patient/:patient_id', () => {
    test('should get patient queue status', async () => {
      const response = await request(app)
        .get(`/api/queue/patient/${patientProfileId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.queue).toBeInstanceOf(Array);
      expect(response.body.data.queue.length).toBeGreaterThan(0);
    });

    test('should filter patient queue by doctor', async () => {
      const response = await request(app)
        .get(
          `/api/queue/patient/${patientProfileId}?doctor_id=${doctorProfileId}`
        )
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.queue).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/queue/doctor/:doctor_id/call-next', () => {
    test('should call next patient in queue', async () => {
      const response = await request(app)
        .post(`/api/queue/doctor/${doctorProfileId}/call-next`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.patient).toBeDefined();
      expect(response.body.data.patient.status).toBe('called');
    });

    test('should reject call-next without proper authorization', async () => {
      const response = await request(app)
        .post(`/api/queue/doctor/${doctorProfileId}/call-next`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('PUT /api/queue/:id/status', () => {
    let queueId;

    beforeAll(async () => {
      // Register another patient and add to queue
      const patientResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'status.patient@test.com',
          password: 'TestPassword123!',
          role: 'patient',
          profile: {
            first_name: 'Status',
            last_name: 'Patient',
          },
        });

      const statusPatientToken = patientResponse.body.data.tokens.accessToken;
      const statusPatientId = patientResponse.body.data.profile.id;

      const queueResponse = await request(app)
        .post('/api/queue/join')
        .set('Authorization', `Bearer ${statusPatientToken}`)
        .send({
          doctor_id: doctorProfileId,
          patient_id: statusPatientId,
          priority_level: 1,
        });

      queueId = queueResponse.body.data.queue.id;
    });

    test('should update queue status', async () => {
      const response = await request(app)
        .put(`/api/queue/${queueId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          status: 'in_consultation',
          notes: 'Patient examination in progress',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.queue.status).toBe('in_consultation');
    });

    test('should reject invalid status', async () => {
      const response = await request(app)
        .put(`/api/queue/${queueId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          status: 'invalid_status',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Validation failed');
    });

    test('should complete consultation and remove from queue', async () => {
      const response = await request(app)
        .put(`/api/queue/${queueId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          status: 'completed',
          notes: 'Consultation completed successfully',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.queue.status).toBe('completed');
    });
  });

  describe('GET /api/queue/:id/position', () => {
    let waitingQueueId;

    beforeAll(async () => {
      // Add another patient to queue for position testing
      const patientResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'position.patient@test.com',
          password: 'TestPassword123!',
          role: 'patient',
          profile: {
            first_name: 'Position',
            last_name: 'Patient',
          },
        });

      const positionPatientToken = patientResponse.body.data.tokens.accessToken;
      const positionPatientId = patientResponse.body.data.profile.id;

      const queueResponse = await request(app)
        .post('/api/queue/join')
        .set('Authorization', `Bearer ${positionPatientToken}`)
        .send({
          doctor_id: doctorProfileId,
          patient_id: positionPatientId,
          priority_level: 1,
        });

      waitingQueueId = queueResponse.body.data.queue.id;
    });

    test('should get queue position', async () => {
      const response = await request(app)
        .get(`/api/queue/${waitingQueueId}/position`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.position).toBeGreaterThan(0);
    });
  });

  describe('GET /api/queue/doctor/:doctor_id/stats', () => {
    test('should get queue statistics', async () => {
      const response = await request(app)
        .get(`/api/queue/doctor/${doctorProfileId}/stats`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats).toHaveProperty('total_patients');
      expect(response.body.data.stats).toHaveProperty('waiting');
      expect(response.body.data.stats).toHaveProperty('completed');
    });
  });
});
