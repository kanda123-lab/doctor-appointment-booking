const request = require('supertest');
const app = require('../../server');
const DatabaseInitializer = require('../../src/database/init');

describe('Authentication API', () => {
  beforeAll(async () => {
    // Reset database for clean testing
    await DatabaseInitializer.reset();
    await DatabaseInitializer.initialize();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new doctor', async () => {
      const doctorData = {
        email: 'test.doctor@test.com',
        password: 'TestPassword123!',
        role: 'doctor',
        profile: {
          first_name: 'Test',
          last_name: 'Doctor',
          specialization: 'General Medicine',
          license_number: 'TEST123',
          consultation_fee: 100.0,
        },
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(doctorData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(doctorData.email);
      expect(response.body.data.user.role).toBe('doctor');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.profile.specialization).toBe(
        doctorData.profile.specialization
      );
    });

    test('should register a new patient', async () => {
      const patientData = {
        email: 'test.patient@test.com',
        password: 'TestPassword123!',
        role: 'patient',
        profile: {
          first_name: 'Test',
          last_name: 'Patient',
          date_of_birth: '1990-01-01',
        },
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(patientData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(patientData.email);
      expect(response.body.data.user.role).toBe('patient');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    test('should reject registration with invalid email', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
        role: 'patient',
        profile: {
          first_name: 'Test',
          last_name: 'Patient',
        },
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Validation failed');
    });

    test('should reject registration with weak password', async () => {
      const weakPasswordData = {
        email: 'test@test.com',
        password: 'weak',
        role: 'patient',
        profile: {
          first_name: 'Test',
          last_name: 'Patient',
        },
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Validation failed');
    });

    test('should reject duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@test.com',
        password: 'TestPassword123!',
        role: 'patient',
        profile: {
          first_name: 'Test',
          last_name: 'Patient',
        },
      };

      // Register first time
      await request(app).post('/api/auth/register').send(userData).expect(201);

      // Try to register again with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Email already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    let doctorCredentials;

    beforeAll(async () => {
      // Register a doctor for login tests
      doctorCredentials = {
        email: 'login.doctor@test.com',
        password: 'TestPassword123!',
      };

      await request(app)
        .post('/api/auth/register')
        .send({
          ...doctorCredentials,
          role: 'doctor',
          profile: {
            first_name: 'Login',
            last_name: 'Doctor',
            specialization: 'Cardiology',
            license_number: 'LOGIN123',
          },
        });
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(doctorCredentials)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(doctorCredentials.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.profile).toBeDefined();
    });

    test('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'TestPassword123!',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid credentials');
    });

    test('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: doctorCredentials.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid credentials');
    });

    test('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: doctorCredentials.email,
          // missing password
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('Protected Routes', () => {
    let accessToken;
    let doctorId;

    beforeAll(async () => {
      // Register and login a doctor
      const doctorData = {
        email: 'protected.doctor@test.com',
        password: 'TestPassword123!',
        role: 'doctor',
        profile: {
          first_name: 'Protected',
          last_name: 'Doctor',
          specialization: 'Neurology',
          license_number: 'PROTECTED123',
        },
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(doctorData);

      accessToken = registerResponse.body.data.tokens.accessToken;
      doctorId = registerResponse.body.data.user.id;
    });

    describe('GET /api/auth/profile', () => {
      test('should get profile with valid token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.user.id).toBe(doctorId);
        expect(response.body.data.profile).toBeDefined();
      });

      test('should reject request without token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .expect(401);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Access token required');
      });

      test('should reject request with invalid token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Invalid token');
      });
    });

    describe('POST /api/auth/logout', () => {
      test('should logout successfully', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.message).toBe('Logout successful');
      });
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let refreshToken;

    beforeAll(async () => {
      // Register a user to get refresh token
      const userData = {
        email: 'refresh.user@test.com',
        password: 'TestPassword123!',
        role: 'patient',
        profile: {
          first_name: 'Refresh',
          last_name: 'User',
        },
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      refreshToken = response.body.data.tokens.refreshToken;
    });

    test('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('accessToken');
    });

    test('should reject with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid refresh token');
    });
  });
});
