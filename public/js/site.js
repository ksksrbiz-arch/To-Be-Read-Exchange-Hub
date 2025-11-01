// public/js/site.js
// Fetches public site content and populates landing page sections.
(async function() {
  const businessInfoEl = document.getElementById('businessInfoContent');
  const affiliateListEl = document.getElementById('affiliateLinksList');
  const policyEl = document.getElementById('policyContent');
  const editPolicyLink = document.getElementById('editPolicyLink');
  const accountPanel = document.getElementById('accountPanel');

  function escapeHtml(str){
    return str.replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  async function fetchJSON(url, opts={}) {
    const res = await fetch(url, opts);
    if(!res.ok) throw new Error('Request failed: '+res.status);
    return res.json();
  }

  try {
    const content = await fetchJSON('/api/site/content');
    const { business_info, affiliate_links, exchange_policy_html } = content;

    if (business_info && businessInfoEl) {
      const { name, tagline, address, hours, phone, email, google_business_url } = business_info;
      businessInfoEl.innerHTML = `
        <strong>${name || ''}</strong><br/>
        <em>${tagline || ''}</em><br/>
        <div>${address || ''}</div>
        <div>${hours ? 'Hours: '+escapeHtml(hours) : ''}</div>
        <div>${phone ? 'Phone: '+escapeHtml(phone) : ''}</div>
        <div>${email ? 'Email: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>' : ''}</div>
        ${google_business_url ? `<div><a href="${google_business_url}" target="_blank" rel="noopener">Google Business Page</a></div>` : ''}
      `;
    }

    if (Array.isArray(affiliate_links) && affiliateListEl) {
      affiliateListEl.innerHTML = affiliate_links.map(l => `<li><a href="${l.url}" target="_blank" rel="noopener">${l.label || l.url}</a></li>`).join('');
    }

    if (policyEl && exchange_policy_html) {
      policyEl.innerHTML = exchange_policy_html; // server rendered markdown (consider sanitization)
    }
  } catch (e) {
    console.error('Failed to load site content', e);
  }

  // Basic auth state detection (reuse auth.js if it sets window.auth?)
  try {
    const meRes = await fetch('/api/auth/me');
    if (meRes.ok) {
      const me = await meRes.json();
      if (me && me.user) {
        if (accountPanel) {
          accountPanel.innerHTML = `<p>Signed in as <strong>${me.user.email}</strong></p>`;
        }
        if (editPolicyLink && (me.user.role === 'admin' || me.user.role === 'staff')) {
          editPolicyLink.style.display = 'inline';
        }
      } else if (accountPanel) {
        accountPanel.innerHTML = '<p><a href="/login.html">Sign In</a> or <a href="/register.html">Register</a></p>';
      }
    } else if (accountPanel) {
      accountPanel.innerHTML = '<p><a href="/login.html">Sign In</a> or <a href="/register.html">Register</a></p>';
    }
  } catch (e) {
    if (accountPanel) accountPanel.innerHTML = '<p><a href="/login.html">Sign In</a> or <a href="/register.html">Register</a></p>';
  }
})();
