const express = require('express');
const router = express.Router();
const siteContent = require('../services/siteContent');
const pool = require('../config/database');

// Simple auth middleware (reuse existing auth strategy if available)
function requireAuth(req, res, next) {
  // Expect user injected earlier by auth middleware; fallback soon if missing
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
}

// GET all site content (public)
router.get('/content', async (req, res, next) => {
  try {
    const content = await siteContent.getContent();
    res.json({ success: true, content });
  } catch (err) {
    next(err);
  }
});

// PUT update business info (admin only)
router.put('/business-info', requireAuth, async (req, res, next) => {
  try {
    const info = req.body || {};
    const updated = await siteContent.updateBusinessInfo(info);
    res.json({ success: true, key: updated.content_key, value: updated.content_value });
  } catch (err) {
    next(err);
  }
});

// PUT replace affiliate links array
router.put('/affiliate-links', requireAuth, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.links)) {
      return res.status(400).json({ success: false, error: 'links must be an array' });
    }
    const sanitized = req.body.links.map(l => ({
      label: String(l.label || '').slice(0,100),
      url: String(l.url || '').slice(0,500),
    })).filter(l => l.label && l.url);
    const updated = await siteContent.replaceAffiliateLinks(sanitized);
    res.json({ success: true, key: updated.content_key, value: updated.content_value });
  } catch (err) {
    next(err);
  }
});

// POST append single affiliate link
router.post('/affiliate-links', requireAuth, async (req, res, next) => {
  try {
    const { label, url } = req.body;
    if (!label || !url) {
      return res.status(400).json({ success: false, error: 'label and url required' });
    }
    const updated = await siteContent.appendAffiliateLink({
      label: String(label).slice(0,100),
      url: String(url).slice(0,500),
    });
    res.status(201).json({ success: true, key: updated.content_key, value: updated.content_value });
  } catch (err) {
    next(err);
  }
});

// PUT update exchange / credit policy markdown
router.put('/policy', requireAuth, async (req, res, next) => {
  try {
    const { markdown } = req.body;
    if (typeof markdown !== 'string') {
      return res.status(400).json({ success: false, error: 'markdown string required' });
    }
    const updated = await siteContent.updatePolicyMarkdown(markdown);
    const rendered = await siteContent.getContent(['exchange_policy_md']);
    res.json({ success: true, key: updated.content_key, value: updated.content_value, html: rendered.exchange_policy_html });
  } catch (err) {
    next(err);
  }
});

// GET recent auto-link events (admin only placeholder)
router.get('/link-events', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM user_link_events ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, events: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
