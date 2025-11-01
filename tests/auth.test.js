const request = require('supertest');
const express = require('express');
const authRoutes = require('../src/routes/auth');

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
}));

const pool = require('../src/config/database');

describe('Auth routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/auth/register creates user and returns token', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', display_name: 'Test User' }] });
    const res = await request(app).post('/api/auth/register').send({ email: 'test@example.com', password: 'secure123', display_name: 'Test User' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/auth/register rejects duplicate email', async () => {
    pool.query.mockRejectedValueOnce({ code: '23505' }); // unique violation
    const res = await request(app).post('/api/auth/register').send({ email: 'dup@example.com', password: 'secure123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/);
  });

  test('POST /api/auth/login validates credentials', async () => {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('mypassword', 10);
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'user@example.com', password_hash: hash, display_name: 'User' }] });
    const res = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'mypassword' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/auth/login rejects invalid password', async () => {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('correct', 10);
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'user@example.com', password_hash: hash, display_name: 'User' }] });
    const res = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid credentials/);
  });
});
