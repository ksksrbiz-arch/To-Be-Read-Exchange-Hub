const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/users - List all users (admin only)
 */
router.get('/', authorize('INVENTORY_READ'), async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, display_name, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, users: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/:id - Get user details with roles/permissions
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    // Users can view their own profile, admins can view any
    if (parseInt(id) !== req.user.id && !req.user.permissions.includes('INVENTORY_READ')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    const userResult = await pool.query(
      'SELECT id, email, display_name, is_active, created_at FROM users WHERE id=$1',
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const rolesResult = await pool.query(
      'SELECT r.id, r.name FROM roles r JOIN user_roles ur ON r.id=ur.role_id WHERE ur.user_id=$1',
      [id]
    );
    const permsResult = await pool.query(
      'SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON p.id=rp.permission_id JOIN user_roles ur ON ur.role_id=rp.role_id WHERE ur.user_id=$1',
      [id]
    );
    
    const user = userResult.rows[0];
    user.roles = rolesResult.rows;
    user.permissions = permsResult.rows.map(p => p.code);
    
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/:id - Update user profile
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    // Users can update their own profile, admins can update any
    if (parseInt(id) !== req.user.id && !req.user.permissions.includes('INVENTORY_WRITE')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    const { display_name, is_active } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (display_name !== undefined) {
      updates.push(`display_name=$${paramIndex++}`);
      values.push(display_name);
    }
    // Only admins can change active status
    if (is_active !== undefined && req.user.permissions.includes('INVENTORY_WRITE')) {
      updates.push(`is_active=$${paramIndex++}`);
      values.push(is_active);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }
    
    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${paramIndex} RETURNING id, email, display_name, is_active`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users/:id/roles - Assign role to user (admin only)
 */
router.post('/:id/roles', authorize('INVENTORY_WRITE'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role_name } = req.body;
    
    if (!role_name) {
      return res.status(400).json({ success: false, error: 'role_name required' });
    }
    
    const roleResult = await pool.query('SELECT id FROM roles WHERE name=$1', [role_name]);
    if (roleResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }
    
    await pool.query(
      'INSERT INTO user_roles(user_id, role_id) VALUES($1, $2) ON CONFLICT DO NOTHING',
      [id, roleResult.rows[0].id]
    );
    
    res.json({ success: true, message: 'Role assigned' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/users/:id/roles/:roleId - Remove role from user (admin only)
 */
router.delete('/:id/roles/:roleId', authorize('INVENTORY_WRITE'), async (req, res, next) => {
  try {
    const { id, roleId } = req.params;
    await pool.query('DELETE FROM user_roles WHERE user_id=$1 AND role_id=$2', [id, roleId]);
    res.json({ success: true, message: 'Role removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
