require('dotenv').config({ path: '.env.test' });

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.DB_NAME = 'doctor_appointment_test';

beforeAll(() => {
  console.log('Test setup initialized');
});

afterAll(() => {
  console.log('Test cleanup completed');
});
