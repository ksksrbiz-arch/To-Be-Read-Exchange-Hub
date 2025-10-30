const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

// Authentication middleware: validates JWT and attaches user/roles/permissions
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing bearer token' });
  }
  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userResult = await pool.query('SELECT id, email, display_name, is_active FROM users WHERE id=$1', [payload.sub]);
    const user = userResult.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: 'Invalid user' });
    }
    const rolesResult = await pool.query('SELECT r.name FROM roles r JOIN user_roles ur ON r.id=ur.role_id WHERE ur.user_id=$1', [user.id]);
    const roles = rolesResult.rows.map(r => r.name);
    const permsResult = await pool.query('SELECT p.code FROM permissions p JOIN role_permissions rp ON p.id=rp.permission_id JOIN roles r ON r.id=rp.role_id JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id=$1', [user.id]);
    const permissions = permsResult.rows.map(p => p.code);
    req.user = { id: user.id, email: user.email, display_name: user.display_name, roles, permissions };
    next();
  } catch { // ignore error detail
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// Authorization middleware: checks required permission code(s)
function authorize(required) {
  const requiredList = Array.isArray(required) ? required : [required];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const hasAll = requiredList.every(code => req.user.permissions.includes(code));
    if (!hasAll) {
      return res.status(403).json({ success: false, error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
