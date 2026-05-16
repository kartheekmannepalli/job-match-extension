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
    if (text.length < 200) return 0;
    let score = 0;
    for (const kw of JOB_KEYWORDS) {
      if (text.includes(kw)) score++;
    }
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
          return { text: el.innerText.trim(), source: 'structured', selector };
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
      return { text: best.innerText.trim(), source: 'heuristic', score: bestScore };
    }

    // 3. Full body fallback
    const bodyText = document.body.innerText.trim();
    return { text: bodyText.substring(0, 8000), source: 'body_fallback' };
  }

  function getPageMeta() {
    return {
      title: document.title || '',
      url: window.location.href,
      hostname: window.location.hostname,
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'EXTRACT_JOB') {
      try {
        const result = extractJobDescription();
        const meta = getPageMeta();
        sendResponse({ success: true, jobText: result.text, meta, extractionInfo: result });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true;
  });
})();
