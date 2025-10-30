const pool = require('../config/database');
const marked = require('marked');
const sanitizeHtml = require('sanitize-html');
const logger = require('../utils/logger');

async function getContent(keys = []) {
  let query = 'SELECT content_key, content_value, updated_at FROM site_content';
  const params = [];
  if (keys.length > 0) {
    query += ' WHERE content_key = ANY($1)';
    params.push(keys);
  }
  const result = await pool.query(query, params);
  const map = {};
  result.rows.forEach(r => { map[r.content_key] = r.content_value; });

  // Render markdown for policy if present
  if (map.exchange_policy_md?.markdown) {
    try {
      const rawHtml = marked.parse(map.exchange_policy_md.markdown);
      map.exchange_policy_html = sanitizeHtml(rawHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1','h2','h3','img']),
        allowedAttributes: {
          a: ['href','name','target','rel'],
          img: ['src','alt','title'],
        },
        transformTags: {
          a: sanitizeHtml.simpleTransform('a', { rel: 'noopener nofollow' })
        }
      });
    } catch (e) {
      logger.warn('Failed to render policy markdown', { error: e.message });
    }
  }
  return map;
}

async function updateKey(key, valueObj) {
  const result = await pool.query(
    `INSERT INTO site_content (content_key, content_value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (content_key) DO UPDATE SET content_value = EXCLUDED.content_value, updated_at = NOW()
     RETURNING content_key, content_value, updated_at`,
    [key, valueObj]
  );
  return result.rows[0];
}

async function appendAffiliateLink(linkObj) {
  const content = await getContent(['affiliate_links']);
  const links = content.affiliate_links?.links || [];
  links.push(linkObj);
  return updateKey('affiliate_links', { links });
}

async function replaceAffiliateLinks(links) {
  return updateKey('affiliate_links', { links });
}

async function updateBusinessInfo(info) {
  return updateKey('business_info', info);
}

async function updatePolicyMarkdown(markdown) {
  return updateKey('exchange_policy_md', { markdown });
}

async function updateOwnerNotes(markdown) {
  return updateKey('owner_notes', { markdown });
}

module.exports = {
  getContent,
  updateKey,
  appendAffiliateLink,
  replaceAffiliateLinks,
  updateBusinessInfo,
  updatePolicyMarkdown,
  updateOwnerNotes,
};
