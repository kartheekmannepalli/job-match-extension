/**
 * popup.js — Job Match AI Popup Controller
 * Features: single-tab analysis, multi-tab parallel analysis,
 *           category breakdown, cover letter, per-URL history
 */

const root = document.getElementById('root');
const settingsBtn = document.getElementById('settingsBtn');

settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

// ── History helpers ───────────────────────────────────────────────────────────
const MAX_HISTORY = 15;

async function saveToHistory(url, pageTitle, analysis, coverLetter) {
  const stored = await chrome.storage.local.get('jobHistory');
  const history = stored.jobHistory || [];
  const filtered = history.filter(h => h.url !== url);
  filtered.unshift({ url, pageTitle, analysis, coverLetter, timestamp: Date.now() });
  await chrome.storage.local.set({ jobHistory: filtered.slice(0, MAX_HISTORY) });
}

async function getHistoryForUrl(url) {
  const stored = await chrome.storage.local.get('jobHistory');
  const history = stored.jobHistory || [];
  return history.find(h => h.url === url) || null;
}

async function getAllHistory() {
  const stored = await chrome.storage.local.get('jobHistory');
  return stored.jobHistory || [];
}

async function clearHistory() {
  await chrome.storage.local.set({ jobHistory: [] });
}

// ── Colour helpers ────────────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 70) return '#22c55e';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
}
function scoreClass(score) {
  if (score >= 70) return 'score-high';
  if (score >= 45) return 'score-mid';
  return 'score-low';
}
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

// ── Clipboard ─────────────────────────────────────────────────────────────────
function copyToClipboard(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); } catch (_) {}
  document.body.removeChild(ta);
  return Promise.resolve();
}

// ── SVG ring ──────────────────────────────────────────────────────────────────
function buildRing(score) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);
  return `
    <svg class="score-ring" width="92" height="92" viewBox="0 0 92 92">
      <circle class="score-ring-bg" cx="46" cy="46" r="${r}"/>
      <circle class="score-ring-fill" cx="46" cy="46" r="${r}"
        stroke="${color}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
    </svg>
    <div class="score-center">
      <span class="score-number ${scoreClass(score)}">${score}</span>
      <span class="score-pct">match</span>
    </div>`;
}

// ── Category HTML ─────────────────────────────────────────────────────────────
function buildCategory(cat, idx) {
  const color = scoreColor(cat.score);
  const matched = (cat.matched || []).map(m => `<span class="tag matched">${m}</span>`).join('');
  const gaps = (cat.gaps || []).map(g => `<span class="tag gap">${g}</span>`).join('');
  return `
    <div class="category" id="cat-${idx}">
      <div class="category-header" onclick="toggleCat(${idx})">
        <span class="category-icon">${cat.icon || '📋'}</span>
        <span class="category-name">${cat.name}</span>
        <span class="category-score ${scoreClass(cat.score)}">${cat.score}%</span>
        <span class="chevron" id="chev-${idx}">▾</span>
      </div>
      <div class="category-bar-wrap">
        <div class="category-bar" style="width:${cat.score}%;background:${color}"></div>
      </div>
      <div class="category-detail" id="detail-${idx}">
        ${matched ? `<div class="detail-section">
          <div class="detail-label">✅ Matched</div>
          <div class="tag-list">${matched}</div>
        </div>` : ''}
        ${gaps ? `<div class="detail-section">
          <div class="detail-label">⚠️ Gaps / Missing</div>
          <div class="tag-list">${gaps}</div>
        </div>` : ''}
        ${cat.insight ? `<div class="insight">${cat.insight}</div>` : ''}
      </div>
    </div>`;
}

window.toggleCat = function (idx) {
  document.getElementById(`detail-${idx}`).classList.toggle('open');
  document.getElementById(`chev-${idx}`).classList.toggle('open');
};

// ── Keywords ──────────────────────────────────────────────────────────────────
function buildKeywords(found = [], missing = []) {
  const foundTags = found.slice(0, 12).map(k => `<span class="tag matched">${k}</span>`).join('');
  const missingTags = missing.slice(0, 8).map(k => `<span class="tag gap">${k}</span>`).join('');
  return `
    <div class="keywords-section">
      <div class="section-label">Keyword Match</div>
      ${foundTags ? `<div class="detail-label" style="margin-bottom:5px">✅ Found in your resume</div>
      <div class="keyword-row">${foundTags}</div>` : ''}
      ${missingTags ? `<div class="detail-label" style="margin-bottom:5px;margin-top:8px">⚠️ Not found</div>
      <div class="keyword-row">${missingTags}</div>` : ''}
    </div>`;
}

// ── Cover letter ──────────────────────────────────────────────────────────────
function buildCoverLetter(text) {
  if (!text) return '';
  return `
    <div class="cover-letter-section">
      <div class="section-label">Auto-Generated Cover Letter</div>
      <div class="cover-letter-box">
        <div class="cover-letter-header">
          <h4>✉️ Cover Letter</h4>
          <span>≥60% match — ready to send!</span>
        </div>
        <div class="cover-letter-text" id="coverLetterText">${text}</div>
        <button class="copy-btn" id="copyBtn" onclick="copyCoverLetter()">📋 Copy to Clipboard</button>
      </div>
    </div>`;
}

window.copyCoverLetter = function () {
  const text = document.getElementById('coverLetterText').innerText;
  copyToClipboard(text).then(() => {
    const btn = document.getElementById('copyBtn');
    if (!btn) return;
    btn.textContent = '✅ Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      if (btn) { btn.textContent = '📋 Copy to Clipboard'; btn.classList.remove('copied'); }
    }, 2000);
  });
};

// ── Visa badge ────────────────────────────────────────────────────────────────
function buildVisaBadge(visa) {
  if (visa === 'yes') {
    return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;
      padding:3px 8px;border-radius:20px;font-weight:600;
      background:rgba(34,197,94,0.12);color:#22c55e;
      border:1px solid rgba(34,197,94,0.3);">✅ H1B Sponsorship</span>`;
  }
  if (visa === 'no') {
    return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;
      padding:3px 8px;border-radius:20px;font-weight:600;
      background:rgba(239,68,68,0.1);color:#ef4444;
      border:1px solid rgba(239,68,68,0.25);">❌ No Sponsorship</span>`;
  }
  return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;
    padding:3px 8px;border-radius:20px;font-weight:600;
    background:rgba(245,158,11,0.1);color:#f59e0b;
    border:1px solid rgba(245,158,11,0.25);">❓ Sponsorship Unknown</span>`;
}

// ── History view ──────────────────────────────────────────────────────────────
async function renderHistory() {
  const history = await getAllHistory();
  if (!history.length) {
    root.innerHTML = `
      <div class="state">
        <div class="state-icon">🕓</div>
        <h2>No History Yet</h2>
        <p>Analyzed jobs will appear here so you can review them anytime.</p>
      </div>
      <div style="padding:0 16px 16px;text-align:center">
        <button onclick="renderIdle()" style="background:none;border:none;color:var(--muted);font-size:12px;cursor:pointer;text-decoration:underline">← Back</button>
      </div>`;
    return;
  }

  const items = history.map((h, i) => {
    const score = h.analysis?.overallMatch || 0;
    const color = scoreColor(score);
    const role = h.analysis?.role || {};
    return `
      <div class="history-item" onclick="loadHistoryItem(${i})">
        <div class="history-score" style="color:${color}">${score}%</div>
        <div class="history-info">
          <div class="history-title">${role.title || h.pageTitle || 'Job Analysis'}</div>
          <div class="history-company">${role.company || ''} · ${timeAgo(h.timestamp)}</div>
        </div>
        <span style="color:var(--muted);font-size:11px">▶</span>
      </div>`;
  }).join('');

  root.innerHTML = `
    <div style="padding:12px 16px 8px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:12px;font-weight:700">Recent Analyses</span>
      <button onclick="confirmClearHistory()" style="background:none;border:none;color:var(--muted);font-size:11px;cursor:pointer">Clear all</button>
    </div>
    <div class="history-list">${items}</div>
    <div style="padding:8px 16px 16px;text-align:center">
      <button onclick="renderIdle()" style="background:none;border:none;color:var(--muted);font-size:12px;cursor:pointer;text-decoration:underline">← Back</button>
    </div>`;
}

window.loadHistoryItem = async function (idx) {
  const history = await getAllHistory();
  const entry = history[idx];
  if (entry) renderResults(entry.analysis, entry.coverLetter, true);
};

window.confirmClearHistory = async function () {
  if (confirm('Clear all history?')) {
    await clearHistory();
    renderHistory();
  }
};

// ── Render: idle ──────────────────────────────────────────────────────────────
function renderIdle() {
  root.innerHTML = `
    <div class="state">
      <div class="state-icon">🎯</div>
      <h2>Ready to Analyze</h2>
      <p>Navigate to a job listing and click below to compare it with your profile.</p>
    </div>
    <button class="analyze-btn" id="analyzeBtn">Analyze This Job</button>
    <button class="secondary-btn" id="multiBtn">⚡ Analyze Multiple Tabs in Parallel</button>
    <div style="padding:8px 16px 14px;display:flex;align-items:center;justify-content:center;gap:12px">
      <button onclick="renderHistory()" style="background:none;border:none;color:var(--accent-light);font-size:12px;cursor:pointer">🕓 History</button>
      <span style="color:var(--border)">·</span>
      <a href="#" id="setupLink" style="color:var(--muted);font-size:12px">⚙️ Setup</a>
    </div>`;

  document.getElementById('analyzeBtn').addEventListener('click', startAnalysis);
  document.getElementById('multiBtn').addEventListener('click', renderTabSelector);
  document.getElementById('setupLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

// ── Render: loading ───────────────────────────────────────────────────────────
function renderLoading(msg = 'Analyzing job description...') {
  root.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>${msg}</p>
    </div>`;
}

// ── Render: results (single tab) ──────────────────────────────────────────────
function renderResults(analysis, coverLetter, fromHistory = false, fromMulti = false) {
  const role = analysis.role || {};
  const cats = (analysis.categories || []).map((c, i) => buildCategory(c, i)).join('');

  const backBtn = fromMulti
    ? `<button onclick="renderMultiResults(window._multiResults, window._multiBlocked, window._multiErrors)"
         style="background:none;border:none;color:var(--muted);font-size:12px;cursor:pointer;text-decoration:underline">← All results</button>`
    : `<button onclick="resetView()" style="background:none;border:none;color:var(--muted);font-size:12px;cursor:pointer;text-decoration:underline">← New analysis</button>`;

  root.innerHTML = `
    <div class="results">
      <div class="role-header">
        ${fromHistory ? `<div style="font-size:10px;color:var(--accent-light);margin-bottom:4px">📂 From history</div>` : ''}
        ${fromMulti ? `<div style="font-size:10px;color:var(--accent-light);margin-bottom:4px">⚡ Multi-tab analysis</div>` : ''}
        <div class="role-company">${role.company || 'Company'}</div>
        <div class="role-title">${role.title || 'Job Title'}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:7px;align-items:center">
          ${role.level ? `<span class="role-level">${role.level}</span>` : ''}
          ${buildVisaBadge(analysis.visaSponsorship)}
        </div>
      </div>

      <div class="score-section">
        <div class="score-ring-wrap">${buildRing(analysis.overallMatch || 0)}</div>
        <div class="score-info">
          <h3>Overall Match</h3>
          <p>${analysis.summary || ''}</p>
        </div>
      </div>

      <div class="categories">
        <div class="section-label">Category Breakdown</div>
        ${cats}
      </div>

      ${buildKeywords(analysis.keywordsFound, analysis.keywordsMissing)}

      ${analysis.applicationAdvice ? `
        <div class="divider"></div>
        <div class="advice-section">
          <div class="advice-label">💡 Application Tip</div>
          <div class="advice-text">${analysis.applicationAdvice}</div>
        </div>` : ''}

      ${coverLetter ? `<div class="divider"></div>${buildCoverLetter(coverLetter)}` : ''}

      <div style="padding:12px 16px 4px;display:flex;align-items:center;justify-content:center;gap:16px">
        ${backBtn}
        <button onclick="renderHistory()" style="background:none;border:none;color:var(--accent-light);font-size:12px;cursor:pointer;text-decoration:underline">🕓 History</button>
      </div>
    </div>`;
}

// ── Render: no sponsorship stop screen ───────────────────────────────────────
function renderNoSponsorship(role = {}) {
  root.innerHTML = `
    <div style="padding:28px 20px 24px;text-align:center;">
      <div style="font-size:38px;margin-bottom:14px;">🚫</div>
      <h2 style="font-size:15px;font-weight:700;margin-bottom:8px;color:var(--text);">No Visa Sponsorship</h2>
      <p style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:18px;">
        <strong style="color:var(--text);">${role.title || 'This role'}</strong>
        ${role.company ? `at <strong style="color:var(--text);">${role.company}</strong>` : ''}
        explicitly does not offer H1B or work visa sponsorship.<br><br>
        Skipping match analysis — no point going further.
      </p>
      <div style="padding:10px 14px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);
        border-radius:var(--radius);font-size:11px;color:#f87171;margin-bottom:20px;">
        ❌ H1B / Visa Sponsorship Not Available
      </div>
      <button onclick="resetView()" style="background:none;border:none;color:var(--accent-light);
        font-size:12px;cursor:pointer;text-decoration:underline;">← Analyze a different job</button>
    </div>`;
}

// ── Render: error ─────────────────────────────────────────────────────────────
function renderError(message) {
  const isNoKey = message === 'NO_API_KEY';
  root.innerHTML = `
    <div class="state">
      <div class="state-icon">⚠️</div>
      <h2>${isNoKey ? 'API Key Required' : 'Something went wrong'}</h2>
      <p>${isNoKey ? 'Please add your Claude API key in settings to start analyzing jobs.' : message}</p>
    </div>
    ${isNoKey
      ? `<button class="analyze-btn" onclick="chrome.runtime.openOptionsPage()">Open Settings</button>`
      : `<button class="analyze-btn" onclick="resetView()">Try Again</button>`}`;
}

window.resetView = renderIdle;

// ── Single-tab analysis ───────────────────────────────────────────────────────
async function startAnalysis() {
  renderLoading('Reading job description...');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { renderError('Could not access the current tab.'); return; }

  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  } catch (_) {}

  let jobData;
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_JOB' });
    if (!response?.success) throw new Error(response?.error || 'Could not extract job description.');
    jobData = response;
  } catch (err) {
    renderError('Could not read this page. Try refreshing and clicking again.<br><small>Note: Extension cannot access chrome:// pages.</small>');
    return;
  }

  if (!jobData.jobText || jobData.jobText.trim().length < 100) {
    renderError('No job description found on this page. Navigate directly to the job listing and try again.');
    return;
  }

  renderLoading('Claude is analyzing your match...');

  const result = await chrome.runtime.sendMessage({
    type: 'ANALYZE_JOB',
    jobText: jobData.jobText,
    jobTitle: jobData.meta?.title || '',
    company: jobData.meta?.hostname || '',
  });

  if (!result?.success) {
    renderError(result?.error || 'Analysis failed. Please try again.');
    return;
  }

  if (result.blocked && result.reason === 'no_sponsorship') {
    renderNoSponsorship(result.role);
    return;
  }

  await saveToHistory(tab.url, tab.title, result.analysis, result.coverLetter);
  renderResults(result.analysis, result.coverLetter);
}

// ════════════════════════════════════════════════════════════════════════════════
// MULTI-TAB ANALYSIS
// ════════════════════════════════════════════════════════════════════════════════

// ── Tab selector screen ───────────────────────────────────────────────────────
async function renderTabSelector() {
  const allTabs = await chrome.tabs.query({});

  // Filter out chrome://, new tab, extension pages, empty URLs
  const tabs = allTabs.filter(t =>
    t.url &&
    !t.url.startsWith('chrome://') &&
    !t.url.startsWith('chrome-extension://') &&
    !t.url.startsWith('about:') &&
    !t.url.startsWith('edge://') &&
    t.title !== 'New Tab' &&
    t.title !== ''
  );

  if (!tabs.length) {
    root.innerHTML = `
      <div class="state">
        <div class="state-icon">🔍</div>
        <h2>No Accessible Tabs</h2>
        <p>Open a few job listing pages first, then come back here.</p>
      </div>
      <div style="padding:0 16px 16px;text-align:center">
        <button onclick="renderIdle()" style="background:none;border:none;color:var(--muted);font-size:12px;cursor:pointer;text-decoration:underline">← Back</button>
      </div>`;
    return;
  }

  // Check which tabs have cached history
  const stored = await chrome.storage.local.get('jobHistory');
  const history = stored.jobHistory || [];

  const items = tabs.map((t, i) => {
    const cached = history.find(h => h.url === t.url);
    const score = cached?.analysis?.overallMatch;
    let domain = '';
    try { domain = new URL(t.url).hostname.replace('www.', ''); } catch (_) {}

    return `
      <div class="tab-item">
        <input type="checkbox" class="tab-check" id="check-${i}"
          data-tab-id="${t.id}"
          data-tab-url="${(t.url || '').replace(/"/g, '&quot;')}"
          data-tab-title="${(t.title || '').replace(/"/g, '&quot;')}"
          onchange="updateAnalyzeBtn()">
        <label for="check-${i}" class="tab-label">
          <div class="tab-title">${t.title || domain}</div>
          <div class="tab-domain">${domain}${cached ? ' · analyzed' : ''}</div>
        </label>
        ${score != null ? `<span class="tab-cached-score" style="color:${scoreColor(score)}">${score}%</span>` : ''}
      </div>`;
  }).join('');

  root.innerHTML = `
    <div style="padding:12px 16px 8px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:12px;font-weight:700">Select Tabs to Analyze</span>
      <button onclick="toggleSelectAll()" id="selectAllBtn"
        style="background:none;border:none;color:var(--accent-light);font-size:11px;cursor:pointer">
        Select all
      </button>
    </div>
    <div class="tab-list">${items}</div>
    <div style="padding:10px 16px 14px">
      <button class="analyze-btn" id="multiAnalyzeBtn" disabled onclick="startMultiAnalysis()">
        Select tabs above
      </button>
      <div style="text-align:center;margin-top:8px">
        <button onclick="renderIdle()" style="background:none;border:none;color:var(--muted);font-size:12px;cursor:pointer;text-decoration:underline">← Back</button>
      </div>
    </div>`;
}

window.updateAnalyzeBtn = function () {
  const checks = [...document.querySelectorAll('.tab-check:checked')];
  const btn = document.getElementById('multiAnalyzeBtn');
  if (!btn) return;
  btn.disabled = checks.length === 0;
  if (checks.length === 0) {
    btn.textContent = 'Select tabs above';
  } else if (checks.length === 1) {
    btn.textContent = 'Analyze 1 Job';
  } else {
    btn.textContent = `⚡ Analyze ${checks.length} Jobs in Parallel`;
  }
};

window.toggleSelectAll = function () {
  const checks = document.querySelectorAll('.tab-check');
  const allChecked = [...checks].every(c => c.checked);
  checks.forEach(c => { c.checked = !allChecked; });
  const btn = document.getElementById('selectAllBtn');
  if (btn) btn.textContent = allChecked ? 'Select all' : 'Deselect all';
  updateAnalyzeBtn();
};

// ── Start parallel analysis ───────────────────────────────────────────────────
window.startMultiAnalysis = async function () {
  const checks = [...document.querySelectorAll('.tab-check:checked')];
  if (!checks.length) return;

  const selectedTabs = checks.map(c => ({
    id: parseInt(c.dataset.tabId),
    url: c.dataset.tabUrl,
    title: c.dataset.tabTitle,
  }));

  renderMultiProgress(selectedTabs);

  // Fire all analyses in parallel
  const promises = selectedTabs.map(tab => analyzeOneTab(tab));
  const settled = await Promise.allSettled(promises);

  const outcomes = settled.map((r, i) => ({
    tab: selectedTabs[i],
    ...(r.status === 'fulfilled' ? r.value : { error: r.reason?.message || 'Failed' }),
  }));

  const successful = outcomes.filter(o => o.analysis).sort((a, b) => b.analysis.overallMatch - a.analysis.overallMatch);
  const blocked = outcomes.filter(o => o.blocked);
  const errors = outcomes.filter(o => !o.analysis && !o.blocked);

  // Store for drill-down navigation
  window._multiResults = successful;
  window._multiBlocked = blocked;
  window._multiErrors = errors;

  renderMultiResults(successful, blocked, errors);
};

// ── Analyze a single tab (used inside parallel batch) ────────────────────────
async function analyzeOneTab(tab) {
  updateTabProgress(tab.id, 'reading');

  // Inject content script
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  } catch (_) {}

  // Extract job description
  let jobData;
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_JOB' });
    if (!response?.success) throw new Error('Could not extract job description');
    jobData = response;
  } catch (err) {
    updateTabProgress(tab.id, 'error', 'Could not read page');
    throw new Error('Could not read page');
  }

  if (!jobData.jobText || jobData.jobText.trim().length < 100) {
    updateTabProgress(tab.id, 'error', 'No job description found');
    throw new Error('No job description found');
  }

  updateTabProgress(tab.id, 'analyzing');

  let domain = '';
  try { domain = new URL(tab.url).hostname; } catch (_) {}

  const result = await chrome.runtime.sendMessage({
    type: 'ANALYZE_JOB',
    jobText: jobData.jobText,
    jobTitle: tab.title || '',
    company: domain,
  });

  if (!result?.success) {
    const msg = result?.error || 'Analysis failed';
    updateTabProgress(tab.id, 'error', msg);
    throw new Error(msg);
  }

  if (result.blocked && result.reason === 'no_sponsorship') {
    updateTabProgress(tab.id, 'blocked');
    return { blocked: true, reason: 'no_sponsorship', role: result.role };
  }

  await saveToHistory(tab.url, tab.title, result.analysis, result.coverLetter);
  updateTabProgress(tab.id, 'done', result.analysis.overallMatch);
  return { analysis: result.analysis, coverLetter: result.coverLetter };
}

// ── Progress screen ───────────────────────────────────────────────────────────
function renderMultiProgress(tabs) {
  const items = tabs.map(t => `
    <div class="progress-item" id="prog-${t.id}">
      <div class="progress-status" id="prog-status-${t.id}">⏳</div>
      <div class="progress-info">
        <div class="progress-title">${(t.title || t.url).substring(0, 60)}</div>
        <div class="progress-msg" id="prog-msg-${t.id}">Waiting...</div>
      </div>
    </div>`).join('');

  root.innerHTML = `
    <div style="padding:14px 16px 10px">
      <div style="font-size:13px;font-weight:700;margin-bottom:3px">
        ⚡ Analyzing ${tabs.length} job${tabs.length > 1 ? 's' : ''} in parallel
      </div>
      <div style="font-size:11px;color:var(--muted)">Claude is processing all tabs simultaneously</div>
    </div>
    <div class="progress-list">${items}</div>`;
}

function updateTabProgress(tabId, status, detail = '') {
  const statusEl = document.getElementById(`prog-status-${tabId}`);
  const msgEl = document.getElementById(`prog-msg-${tabId}`);
  if (!statusEl || !msgEl) return;

  const map = {
    reading:   ['🔍', 'Reading job description...', ''],
    analyzing: ['⚙️', 'Claude is analyzing...', ''],
    done:      ['✅', `${detail}% match`, scoreColor(parseInt(detail))],
    blocked:   ['🚫', 'No visa sponsorship — skipped', '#f87171'],
    error:     ['❌', detail || 'Failed', '#f87171'],
  };

  const [icon, msg, color] = map[status] || ['⏳', 'Waiting...', ''];
  statusEl.textContent = icon;
  msgEl.textContent = msg;
  if (color) msgEl.style.color = color;
}

// ── Multi-results summary list ────────────────────────────────────────────────
window.renderMultiResults = function (successful, blocked, errors) {
  const successItems = (successful || []).map((o, i) => {
    const score = o.analysis.overallMatch;
    const role = o.analysis.role || {};
    return `
      <div class="multi-result-item" onclick="viewMultiResult(${i})">
        <div class="multi-score" style="color:${scoreColor(score)}">${score}%</div>
        <div class="multi-info">
          <div class="multi-title">${role.title || o.tab.title || 'Job'}</div>
          <div class="multi-company">${role.company || ''}${role.level ? ' · ' + role.level : ''}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
          ${buildVisaBadge(o.analysis.visaSponsorship)}
          <span style="color:var(--muted);font-size:10px">▶ details</span>
        </div>
      </div>`;
  }).join('');

  const blockedItems = (blocked || []).map(o => `
    <div class="multi-result-item multi-result-blocked">
      <div class="multi-score">🚫</div>
      <div class="multi-info">
        <div class="multi-title">${o.role?.title || o.tab?.title || 'Job'}</div>
        <div class="multi-company" style="color:#f87171">No visa sponsorship — skipped</div>
      </div>
    </div>`).join('');

  const errorItems = (errors || []).map(o => `
    <div class="multi-result-item multi-result-error">
      <div class="multi-score">❌</div>
      <div class="multi-info">
        <div class="multi-title">${o.tab?.title || 'Job'}</div>
        <div class="multi-company" style="color:#f87171">${o.error || 'Failed'}</div>
      </div>
    </div>`).join('');

  const totalSkipped = (blocked?.length || 0) + (errors?.length || 0);
  const subtitle = [
    successful?.length ? `${successful.length} analyzed` : '',
    blocked?.length ? `${blocked.length} no sponsorship` : '',
    errors?.length ? `${errors.length} failed` : '',
  ].filter(Boolean).join(' · ');

  root.innerHTML = `
    <div style="padding:12px 16px 8px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:12px;font-weight:700">⚡ Parallel Results</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px">${subtitle}</div>
      </div>
      <button onclick="renderHistory()" style="background:none;border:none;color:var(--accent-light);font-size:11px;cursor:pointer">🕓 History</button>
    </div>
    <div class="multi-results-list">
      ${successItems}${blockedItems}${errorItems}
    </div>
    <div style="padding:8px 16px 14px;display:flex;align-items:center;justify-content:center;gap:16px">
      <button onclick="renderTabSelector()" style="background:none;border:none;color:var(--accent-light);font-size:12px;cursor:pointer;text-decoration:underline">⚡ Analyze more tabs</button>
      <button onclick="renderIdle()" style="background:none;border:none;color:var(--muted);font-size:12px;cursor:pointer;text-decoration:underline">← Home</button>
    </div>`;
};

window.viewMultiResult = function (idx) {
  const results = window._multiResults || [];
  const o = results[idx];
  if (!o) return;
  renderResults(o.analysis, o.coverLetter, false, true);
};

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    const cached = await getHistoryForUrl(tab.url);
    if (cached) {
      renderResults(cached.analysis, cached.coverLetter);
      return;
    }
  }
  renderIdle();
}

init();
