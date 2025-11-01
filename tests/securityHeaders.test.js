const request = require('supertest');
const app = require('../src/server');

describe('Security Headers', () => {
  test('CSP contains default-src self', async () => {
    const res = await request(app).get('/health');
    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toMatch(/default-src [^;]*'self'/);
  });
});