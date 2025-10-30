const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const router = express.Router();

// Config
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Helper: generate JWT
function generateToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Register endpoint
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, display_name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users(email, password_hash, display_name) VALUES($1, $2, $3) RETURNING id, email, display_name',
      [email, passwordHash, display_name || null]
    );
    const user = result.rows[0];
    return res.status(201).json({ success: true, user, token: generateToken(user) });
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }
    next(err);
  }
});

// Login endpoint
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    const result = await pool.query('SELECT id, email, password_hash, display_name FROM users WHERE email=$1 AND is_active=true', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const token = generateToken(user);
    return res.json({ success: true, user: { id: user.id, email: user.email, display_name: user.display_name }, token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
