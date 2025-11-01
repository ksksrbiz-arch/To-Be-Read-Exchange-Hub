// public/js/site-admin.js
// Admin page logic for editing site content.
(async function() {
  const notifyEl = document.getElementById('adminNotification');
  function notify(msg, type='info'){ if(notifyEl){ notifyEl.textContent = msg; notifyEl.className = 'notification ' + type; }}

  function formToJSON(form){
    return Array.from(new FormData(form).entries()).reduce((o,[k,v])=>{o[k]=v;return o;},{});
  }

  async function fetchJSON(url, opts={}) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(opts.headers||{}) }, ...opts });
    if(!res.ok) throw new Error('Request failed '+res.status);
    return res.json();
  }

  // Auth gate: Ensure user has admin/staff role
  try {
    const meRes = await fetch('/api/auth/me');
    if (!meRes.ok) { window.location = '/login.html'; return; }
    const me = await meRes.json();
    if (!me || !me.user || !['admin','staff'].includes(me.user.role)) { window.location = '/index.html'; return; }
  } catch (e) { window.location = '/login.html'; return; }

  // Elements
  const businessInfoForm = document.getElementById('businessInfoForm');
  const affiliateForm = document.getElementById('affiliateForm');
  const affiliateList = document.getElementById('affiliateList');
  const replaceLinksBtn = document.getElementById('replaceLinksBtn');
  const policyMarkdown = document.getElementById('policyMarkdown');
  const savePolicyBtn = document.getElementById('savePolicyBtn');
  const policyPreview = document.getElementById('policyPreview');

  async function loadContent(){
    try {
      const c = await fetchJSON('/api/site/content');
      if (c.business_info) {
        Object.entries(c.business_info).forEach(([k,v])=>{
          if (businessInfoForm.elements[k]) businessInfoForm.elements[k].value = v || '';
        });
      }
      if (Array.isArray(c.affiliate_links)) {
        renderAffiliateLinks(c.affiliate_links);
      }
      if (c.exchange_policy_html && c.exchange_policy_md) {
        policyMarkdown.value = c.exchange_policy_md;
        policyPreview.innerHTML = c.exchange_policy_html;
      }
    } catch(e){ notify('Failed to load content: '+e.message, 'error'); }
  }

  function renderAffiliateLinks(links){
    affiliateList.innerHTML = links.map((l,i)=>`<li data-index="${i}"><a href="${l.url}" target="_blank" rel="noopener">${l.label||l.url}</a></li>`).join('');
  }

  businessInfoForm.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const data = formToJSON(businessInfoForm);
      await fetchJSON('/api/site/business-info', { method:'PUT', body: JSON.stringify(data) });
      notify('Business info saved','success');
    } catch(e){ notify('Save failed: '+e.message, 'error'); }
  });

  affiliateForm.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const { label, url } = formToJSON(affiliateForm);
      await fetchJSON('/api/site/affiliate-links', { method:'POST', body: JSON.stringify({ label, url }) });
      await loadContent();
      affiliateForm.reset();
      notify('Affiliate link added','success');
    } catch(e){ notify('Add failed: '+e.message, 'error'); }
  });

  replaceLinksBtn.addEventListener('click', async () => {
    try {
      const labels = Array.from(affiliateList.querySelectorAll('li')); // Not editing inline yet; just reusing current
      const links = labels.map(li => ({ label: li.textContent.trim(), url: li.querySelector('a').href }));
      await fetchJSON('/api/site/affiliate-links', { method:'PUT', body: JSON.stringify({ links }) });
      notify('Links replaced (no changes unless you edited DOM manually)','success');
    } catch(e){ notify('Replace failed: '+e.message, 'error'); }
  });

  policyMarkdown.addEventListener('input', () => {
    // live preview (client-side markdown library could be used; for now simple escape to avoid raw HTML execution)
    const val = policyMarkdown.value;
    policyPreview.textContent = val; // raw text until saved (server renders markdown)
  });

  savePolicyBtn.addEventListener('click', async () => {
    try {
      await fetchJSON('/api/site/policy', { method:'PUT', body: JSON.stringify({ markdown: policyMarkdown.value }) });
      notify('Policy saved','success');
      await loadContent();
    } catch(e){ notify('Policy save failed: '+e.message, 'error'); }
  });

  await loadContent();
})();
