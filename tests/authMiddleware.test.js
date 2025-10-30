const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../src/middleware/auth');

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
}));

const pool = require('../src/config/database');

describe('Auth middleware', () => {
  test('authenticate rejects missing token', async () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await authenticate(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Missing bearer token' });
  });

  test('authenticate attaches user with valid token', async () => {
    const secret = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
    const token = jwt.sign({ sub: 1, email: 'test@example.com' }, secret, { expiresIn: '1h' });
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', display_name: 'Test', is_active: true }] });
    pool.query.mockResolvedValueOnce({ rows: [{ name: 'admin' }] });
    pool.query.mockResolvedValueOnce({ rows: [{ code: 'INVENTORY_READ' }, { code: 'INVENTORY_WRITE' }] });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(req.user).toBeDefined();
    expect(req.user.email).toBe('test@example.com');
    expect(req.user.roles).toEqual(['admin']);
    expect(req.user.permissions).toContain('INVENTORY_READ');
    expect(next).toHaveBeenCalled();
  });

  test('authorize allows request when permission present', () => {
    const req = { user: { permissions: ['INVENTORY_READ', 'INVENTORY_WRITE'] } };
    const res = {};
    const next = jest.fn();
    authorize('INVENTORY_READ')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('authorize blocks request when permission missing', () => {
    const req = { user: { permissions: ['INVENTORY_READ'] } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    authorize('INVENTORY_WRITE')(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Forbidden: insufficient permissions' });
  });
});
