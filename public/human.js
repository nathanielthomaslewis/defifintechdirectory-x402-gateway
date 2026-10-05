/* The local browser client never fabricates a balance, quote or delivered result. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  let session;
  async function request(path, method = 'GET', body) {
    let response;
    try { response = await fetch(`/api/human${path}`, { method, credentials: 'same-origin', headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(session?.csrfToken && method !== 'GET' ? { 'X-CSRF-Token': session.csrfToken } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }); }
    catch { throw new Error('The local server is offline. Check that it is running, then try again.'); }
    const data = await response.json();
    if (!response.ok) { const error = new Error(`${data.message || 'The request could not finish.'}${data.traceId ? ` Trace: ${data.traceId}` : ''}`); error.code = data.error; error.job = data.job; throw error; }
    return data;
  }
  async function ensureSession(create = true) {
    if (session && session.expiresAt > Date.now()) return session;
    try { session = await request('/session'); }
    catch (error) { if (error.code !== 'session_required' || !create) throw error; session = await request('/session', 'POST', {}); }
    return session;
  }
  const date = value => new Date(value).toLocaleString();
  const showError = (element, error) => { element.textContent = error.message; element.hidden = false; };
  const el = (tag, content, className) => { const node = document.createElement(tag); if (content !== undefined) node.textContent = content; if (className) node.className = className; return node; };
  if ($('#tool-search')) {
    const filters = [...document.querySelectorAll('[data-filter]')];
    const refresh = () => { let count = 0; const query = $('#tool-search').value.trim().toLowerCase(); document.querySelectorAll('[data-tool]').forEach(node => { node.hidden = !node.dataset.title.includes(query) || filters.some(filter => filter.value && node.dataset[filter.dataset.filter] !== filter.value); if (!node.hidden) count++; }); $('#catalog-count').textContent = `${count} ${count === 1 ? 'workspace' : 'workspaces'} · local preview catalog`; $('#catalog-empty').hidden = count !== 0; };
    $('#tool-search').addEventListener('input', refresh); filters.forEach(filter => filter.addEventListener('change', refresh)); $('.filters').addEventListener('submit', event => event.preventDefault());
    $('#clear-filters').addEventListener('click', () => { $('#tool-search').value = ''; filters.forEach(filter => { filter.value = ''; }); refresh(); $('#tool-search').focus(); });
  }
  if ($('#workspace-form')) {
    const form = $('#workspace-form'); const input = $('#workspace-text'); const errorBox = $('#workspace-error'); const status = $('#workspace-status');
    let quote; let quotedInput; let key; let running = false; let expiryTimer;
    function invalidate() { quote = undefined; clearTimeout(expiryTimer); $('#quote-panel').hidden = true; $('#quote-confirm').checked = false; $('#run-button').disabled = true; $('#character-count').textContent = `${[...input.value].length} / 4,000`; }
    input.addEventListener('input', invalidate);
    $('#use-example').addEventListener('click', () => { input.value = $('#use-example').dataset.example; invalidate(); input.focus(); });
    $('#quote-confirm').addEventListener('change', () => { $('#run-button').disabled = !quote || !$('#quote-confirm').checked || running; });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (running) return;
      errorBox.hidden = true; invalidate(); $('#result-panel').hidden = true;
      if (!input.value.trim() || [...input.value].length > 4000) { showError(errorBox, new Error('Enter between 1 and 4,000 non-blank characters.')); return; }
      $('#quote-button').disabled = true; input.disabled = true; $('#use-example').disabled = true; status.textContent = 'Starting your local session and requesting a demo quote…';
      try {
        await ensureSession(); quotedInput = { text: input.value };
        const data = await request('/quotes', 'POST', { capabilityId: form.dataset.capability, input: quotedInput });
        quote = data.quote; key = crypto.randomUUID();
        $('#quote-detail').textContent = `${quote.credits} demo credit · ${new Intl.NumberFormat(undefined, { style: 'currency', currency: quote.currency }).format(quote.amountMinor / 100)} real charge. Quote expires ${date(quote.expiresAt)}. Session ends ${date(session.expiresAt)}.`;
        $('#quote-panel').hidden = false; $('#quote-confirm').focus(); status.textContent = 'Quote ready. Review and confirm before running.';
        expiryTimer = setTimeout(() => { quote = undefined; $('#run-button').disabled = true; status.textContent = 'Your quote expired. Request a new quote before running.'; }, Math.max(0, quote.expiresAt - Date.now()));
      } catch (error) { showError(errorBox, error); status.textContent = ''; if (error.code === 'session_required') session = undefined; }
      finally { $('#quote-button').disabled = false; input.disabled = false; $('#use-example').disabled = false; }
    });
    $('#run-button').addEventListener('click', async () => {
      if (!quote || !$('#quote-confirm').checked || running) return;
      running = true; $('#run-button').disabled = true; $('#quote-button').disabled = true; input.disabled = true; $('#use-example').disabled = true; errorBox.hidden = true; status.textContent = 'Running your local sample. A demo credit is reserved…';
      try {
        const result = await request('/jobs', 'POST', { quoteId: quote.id, input: quotedInput, confirmed: true, idempotencyKey: key });
        if (result.job.state !== 'completed') throw new Error(result.job.error || 'The sample did not finish. Check job history.');
        clearTimeout(expiryTimer); $('#result-output').textContent = JSON.stringify(result.job.result, null, 2); $('#result-download').href = `/api/human/artifacts/${encodeURIComponent(result.job.artifactId)}`; $('#result-panel').hidden = false;
        status.textContent = `Sample complete. ${result.credits.available} demo credits available. This result expires with your session at ${date(session.expiresAt)}.`;
        $('#result-download').focus(); quote = undefined; $('#quote-panel').hidden = true;
      } catch (error) { showError(errorBox, error); status.textContent = 'The run could not finish. Check job history before retrying; the same quote retry cannot charge twice.'; if (error.code === 'session_required') { session = undefined; quote = undefined; } }
      finally { running = false; input.disabled = false; $('#use-example').disabled = false; $('#quote-button').disabled = false; $('#run-button').disabled = !quote || !$('#quote-confirm').checked || quote.expiresAt <= Date.now(); }
    });
  }
  const account = $('[data-account]');
  if (account) {
    const errorBox = $('#account-error'); const status = $('#account-status'); const dataNode = $('#account-data');
    function reset() { session = undefined; dataNode.replaceChildren(); $('#session-summary').textContent = 'No active local session. Start a demo to explore the workspace.'; $('#start-session').hidden = false; if ($('#settings-controls')) $('#settings-controls').hidden = true; }
    async function load(create = false) {
      errorBox.hidden = true; status.textContent = 'Loading local demo session…';
      try {
        await ensureSession(create); $('#start-session').hidden = true; $('#session-summary').textContent = `Demo session · expires ${date(session.expiresAt)}. Created for 30 minutes; no real account or purchases.`; dataNode.replaceChildren();
        if (account.dataset.account === 'jobs') {
          const data = await request('/jobs');
          if (!data.jobs.length) { const empty = el('div', undefined, 'empty'); empty.append(el('h3', 'Your first task starts here.'), el('p', 'No demo jobs yet. Try the text workspace to create a local sample.')); const link = el('a', 'Open text workspace ↗', 'button secondary'); link.href = '/tools/preview_text_workspace'; empty.append(link); dataNode.append(empty); }
          data.jobs.forEach(job => { const row = el('article', undefined, 'job-row'); row.append(el('h3', job.title), el('span', `Demo · ${job.state}`, 'badge'), el('span', date(job.createdAt), 'meta')); if (job.error) row.append(el('p', job.error)); if (job.result) { const details = el('details'); details.append(el('summary', 'View sample result'), el('pre', JSON.stringify(job.result, null, 2))); row.append(details); } if (job.artifactId) { const link = el('a', 'Download private sample ↧', 'text-link'); link.href = `/api/human/artifacts/${encodeURIComponent(job.artifactId)}`; row.append(link); } dataNode.append(row); });
        } else if (account.dataset.account === 'credits') {
          const credits = await request('/credits'); dataNode.append(el('span', 'Demo balance · no monetary value', 'badge'));
          const balance = el('p', `${credits.available} `, 'balance'); balance.append(el('span', 'demo credits available')); dataNode.append(balance, el('p', `${credits.reserved} reserved · Demo credits cannot be purchased. Real checkout and receipts are unavailable.`));
          const table = el('table', undefined, 'ledger'); table.append(el('caption', 'Demo credit ledger')); const head = el('thead'); const header = el('tr'); ['Entry', 'Demo credits', 'Time'].forEach(text => { const th = el('th', text); th.scope = 'col'; header.append(th); }); head.append(header); table.append(head); const body = el('tbody'); credits.entries.forEach(entry => { const row = el('tr'); row.append(el('td', entry.type.replaceAll('_', ' ')), el('td', String(entry.amount)), el('td', date(entry.createdAt))); body.append(row); }); table.append(body); dataNode.append(table);
        } else $('#settings-controls').hidden = false;
        status.textContent = '';
      } catch (error) { if (error.code === 'session_required') { reset(); status.textContent = ''; } else { showError(errorBox, error); status.textContent = ''; } }
    }
    $('#start-session').addEventListener('click', async () => { $('#start-session').disabled = true; await load(true); $('#start-session').disabled = false; });
    if ($('#logout-button')) {
      $('#delete-confirm').addEventListener('change', () => { $('#delete-button').disabled = !$('#delete-confirm').checked; });
      const remove = async deleting => { errorBox.hidden = true; $('#logout-button').disabled = true; $('#delete-button').disabled = true; try { await ensureSession(false); await request(deleting ? '/account' : '/logout', deleting ? 'DELETE' : 'POST', {}); reset(); status.textContent = deleting ? 'Your demo session and its data were deleted.' : 'Logged out. Your protected demo data is no longer accessible.'; $('#delete-confirm').checked = false; } catch (error) { showError(errorBox, error); } finally { $('#logout-button').disabled = false; $('#delete-button').disabled = !$('#delete-confirm').checked; } };
      $('#logout-button').addEventListener('click', () => remove(false)); $('#delete-button').addEventListener('click', () => remove(true));
    }
    load();
  }
})();
