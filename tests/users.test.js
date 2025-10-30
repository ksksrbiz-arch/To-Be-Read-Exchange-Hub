const request = require('supertest');
const express = require('express');
const usersRoutes = require('../src/routes/users');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
}));

const pool = require('../src/config/database');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

describe('User management routes', () => {
  let app;
  let adminToken;
  let userToken;
  
  beforeAll(() => {
    // Create test tokens
    adminToken = jwt.sign({ sub: 1, email: 'admin@test.com' }, JWT_SECRET, { expiresIn: '1h' });
    userToken = jwt.sign({ sub: 2, email: 'user@test.com' }, JWT_SECRET, { expiresIn: '1h' });
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/users', usersRoutes);
  });
  
  test('GET /api/users returns user list for admin', async () => {
    // Mock authenticate middleware calls
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'admin@test.com', display_name: 'Admin', is_active: true }] });
    pool.query.mockResolvedValueOnce({ rows: [{ name: 'admin' }] });
    pool.query.mockResolvedValueOnce({ rows: [{ code: 'INVENTORY_READ' }, { code: 'INVENTORY_WRITE' }] });
    // Mock users list query
    pool.query.mockResolvedValueOnce({ rows: [
      { id: 1, email: 'admin@test.com', display_name: 'Admin', is_active: true, created_at: new Date() },
      { id: 2, email: 'user@test.com', display_name: 'User', is_active: true, created_at: new Date() },
    ]});
    
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.users).toHaveLength(2);
  });
  
  test('GET /api/users/:id returns user details', async () => {
    // Mock authenticate
    pool.query.mockResolvedValueOnce({ rows: [{ id: 2, email: 'user@test.com', display_name: 'User', is_active: true }] });
    pool.query.mockResolvedValueOnce({ rows: [{ name: 'customer' }] });
    pool.query.mockResolvedValueOnce({ rows: [{ code: 'SALES_READ_ORDER' }] });
    // Mock user details
    pool.query.mockResolvedValueOnce({ rows: [{ id: 2, email: 'user@test.com', display_name: 'User', is_active: true, created_at: new Date() }] });
    pool.query.mockResolvedValueOnce({ rows: [{ id: 3, name: 'customer' }] });
    pool.query.mockResolvedValueOnce({ rows: [{ code: 'SALES_READ_ORDER' }] });
    
    const res = await request(app)
      .get('/api/users/2')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('user@test.com');
    expect(res.body.user.roles).toBeDefined();
    expect(res.body.user.permissions).toBeDefined();
  });
  
  test('PUT /api/users/:id updates user display name', async () => {
    // Mock authenticate
    pool.query.mockResolvedValueOnce({ rows: [{ id: 2, email: 'user@test.com', display_name: 'User', is_active: true }] });
    pool.query.mockResolvedValueOnce({ rows: [{ name: 'customer' }] });
    pool.query.mockResolvedValueOnce({ rows: [{ code: 'SALES_READ_ORDER' }] });
    // Mock update
    pool.query.mockResolvedValueOnce({ rows: [{ id: 2, email: 'user@test.com', display_name: 'New Name', is_active: true }] });
    
    const res = await request(app)
      .put('/api/users/2')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ display_name: 'New Name' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.display_name).toBe('New Name');
  });
  
  test('POST /api/users/:id/roles assigns role (admin only)', async () => {
    // Mock authenticate
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'admin@test.com', display_name: 'Admin', is_active: true }] });
    pool.query.mockResolvedValueOnce({ rows: [{ name: 'admin' }] });
    pool.query.mockResolvedValueOnce({ rows: [{ code: 'INVENTORY_READ' }, { code: 'INVENTORY_WRITE' }] });
    // Mock role lookup
    pool.query.mockResolvedValueOnce({ rows: [{ id: 2 }] });
    // Mock insert
    pool.query.mockResolvedValueOnce({ rows: [] });
    
    const res = await request(app)
      .post('/api/users/2/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role_name: 'staff' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
