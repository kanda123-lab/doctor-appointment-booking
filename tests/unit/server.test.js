const request = require('supertest');
const app = require('../../server');

describe('Server Setup', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty(
        'message',
        'Doctor Appointment API is running'
      );
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('404 Route Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.message).toContain(
        'Route /non-existent-route not found'
      );
    });
  });

  describe('Server Configuration', () => {
    it('should have proper CORS headers', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should have security headers from helmet', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });
});
