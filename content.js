/**
 * content.js — Job Description Extractor
 * Works on any job board or company careers page.
 * Priority order: structured selectors → heuristic scoring → full body fallback.
 */

(function () {
  // ── Structured selectors for known job boards ──────────────────────────────
  const KNOWN_SELECTORS = [
    // LinkedIn
    '.job-view-layout',
    '.jobs-description__content',
    '.jobs-description-content__text',
    // Indeed
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    // Glassdoor
    '[data-test="description"]',
    '.JobDetails_jobDescription__uW_fK',
    // Greenhouse
    '#content',
    '.job__description',
    // Lever
    '.posting-requirements',
    '.posting-description',
    // Workday
    '[data-automation-id="jobPostingDescription"]',
    // SmartRecruiters
    '.job-sections',
    // Jobvite
    '.jv-job-detail-description',
    // iCIMS
    '#jobDescription',
    '.iCIMS_JobContent',
    // BambooHR
    '.BambooHR-ATS-body',
    // Ashby
    '[data-testid="job-description"]',
    // Generic fallbacks
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[class*="job_description"]',
    '[id*="job-description"]',
    '[id*="jobDescription"]',
    'article[class*="job"]',
    'section[class*="job"]',
  ];

  // ── Heuristic keyword scoring ──────────────────────────────────────────────
  const JOB_KEYWORDS = [
    'responsibilities', 'requirements', 'qualifications', 'experience',
    'skills', 'about the role', 'what you\'ll do', 'what we\'re looking for',
    'who you are', 'nice to have', 'preferred', 'must have', 'minimum',
    'you will', 'we are looking', 'join us', 'engineering', 'engineer',
    'compensation', 'salary', 'benefits', 'equity',
  ];

  function scoreElement(el) {
    if (!el || !el.innerText) return 0;
    const text = el.innerText.toLowerCase();
    if (text.length < 200) return 0; // too short to be a JD
    let score = 0;
    for (const kw of JOB_KEYWORDS) {
      if (text.includes(kw)) score++;
    }
    // Bonus for length — JDs tend to be 500–5000 chars
    if (text.length > 500) score += 2;
    if (text.length > 1500) score += 3;
    return score;
  }

  function extractJobDescription() {
    // 1. Try known structured selectors first
    for (const selector of KNOWN_SELECTORS) {
      try {
        const el = document.querySelector(selector);
        if (el && el.innerText && el.innerText.trim().length > 150) {
          return {
            text: el.innerText.trim(),
            source: 'structured',
            selector,
          };
        }
      } catch (_) {}
    }

    // 2. Heuristic: score all large block-level elements
    const candidates = Array.from(
      document.querySelectorAll('div, section, article, main, [role="main"]')
    );

    let best = null;
    let bestScore = 0;

    for (const el of candidates) {
      // Skip tiny elements and nav/header/footer
      const tag = el.tagName.toLowerCase();
      if (['nav', 'header', 'footer', 'aside'].includes(tag)) continue;
      const role = (el.getAttribute('role') || '').toLowerCase();
      if (['navigation', 'banner', 'contentinfo'].includes(role)) continue;

      const score = scoreElement(el);
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    if (best && bestScore >= 3) {
      return {
        text: best.innerText.trim(),
        source: 'heuristic',
        score: bestScore,
      };
    }

    // 3. Full body fallback (trim to 8000 chars to stay within token budget)
    const bodyText = document.body.innerText.trim();
    return {
      text: bodyText.substring(0, 8000),
      source: 'body_fallback',
    };
  }

  function getPageMeta() {
    return {
      title: document.title || '',
      url: window.location.href,
      hostname: window.location.hostname,
    };
  }

  // ── Message listener ───────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'EXTRACT_JOB') {
      try {
        const result = extractJobDescription();
        const meta = getPageMeta();
        sendResponse({
          success: true,
          jobText: result.text,
          meta,
          extractionInfo: result,
        });
      } catch (err) {
        sendResponse({
          success: false,
          error: err.message,
        });
      }
    }
    return true; // Keep message channel open for async
  });

  // ════════════════════════════════════════════════════════════════════════
  // AUTO-DETECTION — analyze job pages automatically as the user browses
  // ════════════════════════════════════════════════════════════════════════

  // Decide whether an extraction is confident enough to be a real job posting.
  // Stricter than manual analysis: manual is explicit user intent, auto must
  // avoid false positives (and wasted API calls) on non-job pages.
  function isLikelyJobPage(extraction) {
    if (!extraction || !extraction.text) return false;
    const text = extraction.text.trim();
    if (text.length < 400) return false;
    // Strong signal: matched a known job-board / ATS structured selector.
    if (extraction.source === 'structured') return true;
    // Heuristic: needs a solid keyword score (manual threshold is 3; auto = 6).
    if (extraction.source === 'heuristic' && (extraction.score || 0) >= 6) return true;
    // Body fallback alone is too weak to auto-trigger.
    return false;
  }

  let lastAutoUrl = '';        // URL we last sent for auto-analysis
  let autoDetectTimer = null;  // retry interval handle

  function safeSend(payload) {
    try { chrome.runtime.sendMessage(payload, () => void chrome.runtime.lastError); }
    catch (_) { /* extension context invalidated — ignore */ }
  }

  // One detection attempt. Returns true once a job page has been handled.
  function tryAutoAnalyze() {
    let extraction;
    try { extraction = extractJobDescription(); } catch (_) { return false; }
    if (!isLikelyJobPage(extraction)) return false;

    const meta = getPageMeta();
    if (meta.url === lastAutoUrl) return true; // already sent for this URL
    lastAutoUrl = meta.url;

    safeSend({
      type: 'AUTO_ANALYZE',
      jobText: extraction.text,
      jobTitle: meta.title,
      company: meta.hostname,
      url: meta.url,
    });
    return true;
  }

  // Job boards are mostly SPAs that lazy-load the description, so retry on a
  // short interval until detected or the budget runs out.
  function scheduleAutoDetection() {
    clearInterval(autoDetectTimer);
    let attempts = 0;
    const MAX_ATTEMPTS = 8; // ~10s total at 1.3s spacing
    if (tryAutoAnalyze()) return;
    autoDetectTimer = setInterval(() => {
      attempts++;
      if (tryAutoAnalyze() || attempts >= MAX_ATTEMPTS) {
        clearInterval(autoDetectTimer);
      }
    }, 1300);
  }

  // Watch for SPA navigations (URL changes with no full page reload).
  let currentHref = location.href;
  setInterval(() => {
    if (location.href !== currentHref) {
      currentHref = location.href;
      lastAutoUrl = '';                 // allow re-detection on the new URL
      safeSend({ type: 'CLEAR_BADGE' }); // drop the previous page's badge
      scheduleAutoDetection();
    }
  }, 1500);

  // Kick off: clear any stale badge from a prior page, then detect.
  safeSend({ type: 'CLEAR_BADGE' });
  scheduleAutoDetection();
})();
