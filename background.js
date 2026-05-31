/**
 * background.js — Service Worker
 * Handles Claude API calls for job match analysis and cover letter generation.
 */

// ── Default resume (pre-loaded with Kartheek's resume) ─────────────────────
const DEFAULT_RESUME = `
Kartheek Mannepalli
Senior Software Engineer | Seattle, WA
LinkedIn: https://www.linkedin.com/in/kartheekmannepalli/
Email: kartheekmannepalli@gmail.com | Phone: 408-348-4539

SUMMARY
Senior Software Engineer with 15 years of experience specializing in high-scale microservices (1M TPS) and AI orchestration. Proven track record of driving ~$150M+ in annual revenue through architectural convergence and pioneering MCP-based AI frameworks.

TECHNICAL SKILLS
Languages & Frameworks: Kotlin, Java, Scala, Python, JavaScript, Spring, NodeJS, Typescript
Data & Infrastructure: AWS, Kafka, Docker, Kubernetes, PostgreSQL, Redis, DynamoDB, Terraform, CI/CD, Airflow
Back-End & Architecture: Microservices, Event-Driven Architecture, CQRS, Domain-Driven Design, gRPC
AI & LLM Infrastructure: AI Agents, MCP, RAG Architecture, LLM Integration, LangChain, Vector DB, Embeddings, GenAI

WORK EXPERIENCE

Expedia Inc., Seattle, WA — July 2022 to May 2026
Senior Software Development Engineer
- Managed a mission-critical suite of services in a complex gRPC-based microservice architecture, overseeing technical delivery and system health for high-traffic environments reaching ~1M TPS maintaining 99.99% uptime during peak.
- Led cross-functional projects involving multiple services, closely collaborating with the product team to gather requirements and plan project deliveries for features like XLR and IPM TSF resulting in ~$100M+ in annual revenue.
- Pioneered the design and deployment of an org specific AI agent along with standardized Model Context Protocol (MCP) tools, establishing a framework for AI agents to interface with complex backend services. This initiative eliminated manual data discovery and analysis bottleneck, reducing debugging time from 2-3 hours to 10 minutes.
- Spearheaded an organization-wide AI hackathons and training programs, successfully upskilling ~200 engineers on RAG-based application development, directly leading to the launch of ~40 internal AI initiatives.
- Designed and deployed RAG-based agents to streamline internal documentation search, resulting in a 50% increase in knowledge discovery speed and reducing repetitive support tickets by 20%.
- Championed an inner-source model for Pricing services, enabling 6 engineers from external teams to contribute code independently, reducing core team dependency.
- Orchestrated critical architectural convergence initiatives within the vacation rental domain, unifying disparate legacy systems to enable high-impact promotion capabilities that drove a ~$50M+ increase in annual revenue.
- Independently engineered an organization-wide automated testing and debugging suite used by 6 teams, reducing manual investigation time by 60% and ensuring zero-discrepancy transitions.
- Mentored engineers by providing technical guidance, sharing best practices, and facilitating their professional growth resulting in 20% increase in team story-point velocity.

Expeditors International of Washington, Inc., Seattle, WA — November 2015 to July 2022
Senior Software Developer

Project: Delivery & Pickup (October 2021 to July 2022)
- Led the design of a next-generation logistics platform for Delivery & Pickup utilizing Domain-Driven Design (DDD) and microservices to accelerate global operations.

Project: Warehousing (December 2017 to October 2021)
- Architected and implemented Zero Downtime deployment strategies for the Warehousing project, ensuring 24/7 service availability for international branches.
- Configured a continuous integration pipeline using GitLab runners which automates the build process, runs unit tests and integration tests.
- Orchestrated a containerized CI/CD infrastructure using GitLab, Docker, and Kubernetes, enabling concurrent pipeline execution and automated testing.
- Engineered robust event-processing strategies to handle millions of Kafka events using CQRS and event-driven principles.
- Mentored and trained new developers to get them up to speed with all the tools and technologies used within the application.
- Identified and remediated critical performance bottlenecks, achieving a 67% reduction in latency for the core web application through sophisticated debugging strategies.
- Supported the initial deployment of the application to a single branch and then expansion to other branches around the globe.

Project: Customs (November 2015 to December 2017)
- Designed & implemented features which helped expand the application to branches in Europe.
- Pioneered the use of Kafka for inter-application communication.
- Built an API for the app to help flow of data from other applications.
- Championed the team's transition to Agile methodologies, improving transparency and delivery predictability.

Allconnect (Formerly Whitefence), Houston, TX — April 2011 to October 2015
Java Web Developer
- Worked on completely redesigning and developing company's websites infrastructure.
- Worked on integrating two different web platforms Hybris and Endeca to serve a single website.
- Worked on project Streaming serviceability where packages/products from different providers are updated on the page dynamically based on provider responses.
- Trained and supported offshore development team.

Hooduku Inc, Houston, TX — February 2010 to March 2011
Web Developer
- Developed an e-commerce website that simplified buying cloud space and pre-installing databases.
- Developed a shopping cart experience from scratch using jQuery and PHP.
- Integrated Rackspace API, cPanel API, Recurly billing API.
- Built a Role based access control system and built a forum for users.

EDUCATION
Master of Science, Computer Science — University of Houston, Houston, TX (December 2009)
B. Tech, Computer Science — Jawaharlal Nehru University (JNTU), Hyderabad, India (May 2007)

TARGET ROLES: Senior Software Engineer, Staff Software Engineer, Principal Engineer
`.trim();

// ── Build the analysis prompt ────────────────────────────────────────────────
function buildAnalysisPrompt(resumeText, jobText, jobTitle, company) {
  return `You are an expert technical recruiter and career coach specializing in evaluating senior and staff engineering candidates.
Analyze the fit between the candidate's profile and the job description below.

<resume>
${resumeText}
</resume>

<job_description>
${jobText.substring(0, 6000)}
</job_description>

Job Title Context: ${jobTitle || 'Not specified'}
Company Context: ${company || 'Not specified'}

Perform a comprehensive, nuanced analysis that goes beyond simple keyword matching. Consider the candidate's actual depth of experience, leadership trajectory, system scale, and business impact — not just whether a technology name appears.

KEYWORD MATCHING RULES (apply strictly):
- Matching is CASE-INSENSITIVE. "TypeScript", "Typescript", and "typescript" are the same skill.
- Treat common spelling/format variants as the same skill: "TypeScript" ↔ "Typescript" ↔ "TS"; "Node.js" ↔ "NodeJS" ↔ "Node"; "Spring" ↔ "Spring Boot" ↔ "Spring Framework"; "K8s" ↔ "Kubernetes"; "JS" ↔ "JavaScript"; "Postgres" ↔ "PostgreSQL"; "GenAI" ↔ "Generative AI"; "LLM" ↔ "Large Language Model"; "RAG" ↔ "Retrieval-Augmented Generation"; "MCP" ↔ "Model Context Protocol"; "DDD" ↔ "Domain-Driven Design"; "EDA" ↔ "Event-Driven Architecture"; "CI/CD" ↔ "Continuous Integration".
- Surface EVERY important skill, technology, framework, or methodology mentioned in the JD that is present in the resume — do not arbitrarily cap the found list.
- For missing keywords, classify each one as either MUST-HAVE or NICE-TO-HAVE based on how the JD frames it. Treat as must-have if the JD uses words like "required", "must have", "must-have", "minimum qualifications", "qualifications", "requirements", or lists the skill under a "Required Skills"/"Must-Have Skills" heading. Treat as nice-to-have if the JD frames it under "preferred", "nice to have", "bonus", "plus", "ideally", "would be a plus", "preferred qualifications", or similar.
- When the JD is ambiguous, default to must-have for core technical skills named in the role description and nice-to-have for adjacent/optional tooling.

SCORING RULES (must-have skills weigh heavily):
- Missing must-have skills MUST pull both the relevant category score AND the overall match down. Do not give a generous score just because nice-to-haves and adjacent skills are strong.
- For the Technical Skills category specifically: subtract roughly 8–15 points per missing must-have skill bucket (e.g., entire "Frontend / Angular" stack absent = one big bucket, not one small deduction). If an entire must-have skill bucket is missing (e.g., the role requires Angular and the resume has zero frontend framework experience), CAP the Technical Skills score at 60.
- For the overall match: if any must-have skill bucket is entirely missing, the overall match score CANNOT exceed 85. If two or more must-have buckets are entirely missing, the overall match CANNOT exceed 72. If three or more, cannot exceed 60.
- Strong matches in nice-to-have or adjacent areas do NOT cancel out a missing must-have. They can lift the score within the cap, but cannot bypass it.
- Populate the scoreReasoning field with a clear, plain-English explanation of WHY the overall score landed where it did — specifically calling out any must-have gaps that pulled it down and any standout strengths that lifted it. This is what the user sees to understand the score.

ATS SCREENING SIMULATION (the "ats" object — separate from the nuanced overallMatch):
The overallMatch above is a smart, human-recruiter-style judgment. The "ats" object instead simulates how an automated Applicant Tracking System (Workday, Greenhouse, Lever, iCIMS) and a first-pass keyword/qualification screen would score THIS resume against THIS job — a much more literal, mechanical pass. Produce it as follows:
- ats.score (0-100): drive it PRIMARILY by required ("must-have") keyword and qualification coverage — i.e. of the must-have keywords/skills the JD names, what fraction appear (case-insensitive, with the variant rules above) in the resume. Then adjust: if the resume's titles/summary don't align with the JD's job title, dock points; if the candidate's years of experience are below a stated minimum, dock points; if a HARD requirement that an ATS or screen would auto-filter on is explicitly required and unmet — a specific degree, an active security clearance, a mandatory onsite location/relocation, or work authorization without sponsorship — cap ats.score at 40 or below. Do NOT let strong nice-to-have coverage inflate this score; ATS keyword screens are literal.
- ats.verdict: exactly one of "Likely passes ATS" (score >= 75), "Borderline" (50-74), or "Likely filtered out" (< 50).
- ats.requiredCoverage: a short human string like "6 of 8 required keywords present".
- ats.checks: 3-5 objects, each { "label", "status" ("pass" | "warn" | "fail"), "detail" (one short clause) }. Always include these labels: "Required keyword coverage", "Job title alignment", "Years of experience", "Hard requirements" (degree / clearance / location / work authorization — mark "pass" if none are blocking).
- ats.tips: 1-4 short, concrete edits that would improve ATS pass-through for THIS job. CRITICAL: only ever suggest adding a keyword or phrasing the candidate TRUTHFULLY has experience with based on the resume (e.g. surfacing a skill already implied by a bullet). Never suggest fabricating a skill, title, degree, or clearance the resume does not support.

Return ONLY valid JSON in this exact structure (no markdown, no explanation outside the JSON):

{
  "role": {
    "title": "<extracted job title>",
    "company": "<extracted company name>",
    "level": "<inferred level: Junior/Mid/Senior/Staff/Principal/Director>"
  },
  "overallMatch": <integer 0-100>,
  "summary": "<2-3 sentence honest assessment of fit, highlighting the strongest reasons to apply and any notable gaps>",
  "scoreReasoning": "<1-3 sentences explaining WHY the overall score is what it is. MUST explicitly call out any missing must-have skills that pulled the score down (e.g., 'Score capped at 78 because Angular and GraphQL — both must-haves — are absent from the resume') and the standout strengths that lifted it. This is shown directly under the overall score so the user understands what's driving it.>",
  "categories": [
    {
      "name": "Technical Skills",
      "score": <integer 0-100>,
      "icon": "⚙️",
      "matched": ["<skill matched with context, e.g. 'Kafka — 6+ years of production event processing at Expeditors'>"],
      "gaps": ["<missing or weak skill with context>"],
      "insight": "<1 sentence nuanced observation>"
    },
    {
      "name": "Experience Level & Scale",
      "score": <integer 0-100>,
      "icon": "📈",
      "matched": ["<matched experience points>"],
      "gaps": ["<gaps or concerns>"],
      "insight": "<1 sentence nuanced observation>"
    },
    {
      "name": "Architecture & Systems Design",
      "score": <integer 0-100>,
      "icon": "🏗️",
      "matched": ["<matched architectural patterns>"],
      "gaps": ["<gaps>"],
      "insight": "<1 sentence nuanced observation>"
    },
    {
      "name": "AI & Innovation",
      "score": <integer 0-100>,
      "icon": "🤖",
      "matched": ["<matched AI/ML/innovation points>"],
      "gaps": ["<gaps>"],
      "insight": "<1 sentence nuanced observation>"
    },
    {
      "name": "Leadership & Collaboration",
      "score": <integer 0-100>,
      "icon": "🤝",
      "matched": ["<matched leadership points>"],
      "gaps": ["<gaps>"],
      "insight": "<1 sentence nuanced observation>"
    },
    {
      "name": "Domain & Industry Fit",
      "score": <integer 0-100>,
      "icon": "🏢",
      "matched": ["<matched domain experience>"],
      "gaps": ["<domain gaps or transferable strengths>"],
      "insight": "<1 sentence nuanced observation>"
    }
  ],
  "keywordsFound": ["<every important keyword from JD that appears in resume — apply case-insensitive + variant matching rules above>"],
  "keywordsMissingMustHave": ["<must-have keyword from JD that is NOT in resume — these are mandatory requirements the candidate lacks>"],
  "keywordsMissingNiceToHave": ["<nice-to-have / preferred keyword from JD that is NOT in resume>"],
  "ats": {
    "score": <integer 0-100 — literal ATS keyword/qualification match for this resume vs this JD, per the ATS SCREENING SIMULATION rules above>,
    "verdict": "<'Likely passes ATS' | 'Borderline' | 'Likely filtered out'>",
    "requiredCoverage": "<short string e.g. '6 of 8 required keywords present'>",
    "checks": [
      { "label": "Required keyword coverage", "status": "<pass|warn|fail>", "detail": "<short clause>" },
      { "label": "Job title alignment", "status": "<pass|warn|fail>", "detail": "<short clause>" },
      { "label": "Years of experience", "status": "<pass|warn|fail>", "detail": "<short clause>" },
      { "label": "Hard requirements", "status": "<pass|warn|fail>", "detail": "<degree / clearance / location / work authorization>" }
    ],
    "tips": ["<concrete, truthful edit to improve ATS pass-through for this job>"]
  },
  "applicationAdvice": "<1-2 sentences on how to position this application or what to emphasize>",
  "generateCoverLetter": <true if overallMatch >= 70, else false>,
  "visaSponsorship": "<one of: 'yes' | 'no' | 'unknown'>. Set 'yes' if the JD explicitly states H1B or visa sponsorship is available (e.g. 'we sponsor H1B', 'visa sponsorship provided', 'will sponsor work authorization'). Set 'no' if the JD explicitly states sponsorship is NOT available (e.g. 'must be authorized to work in the US', 'no sponsorship', 'cannot sponsor', 'US citizen or green card holder only', 'must have existing work authorization'). Set 'unknown' if the JD does not mention visa sponsorship at all."
}`;
}

function buildCoverLetterPrompt(resumeText, jobText, analysisResult) {
  const role = analysisResult.role || {};
  return `You are an expert career coach writing a compelling cover letter for a senior engineering candidate.

<resume>
${resumeText}
</resume>

<job_description>
${jobText.substring(0, 4000)}
</job_description>

Match Analysis Summary: ${analysisResult.summary || ''}
Top matched skills: ${(analysisResult.keywordsFound || []).slice(0, 8).join(', ')}

Write a professional, genuine cover letter for Kartheek Mannepalli applying for the ${role.title || 'role'} at ${role.company || 'the company'}.

Guidelines:
- 3-4 paragraphs, confident but not arrogant tone
- Opening: express genuine interest and mention 1 specific thing about the company/role
- Body paragraph 1: highlight the most relevant technical experience with a specific achievement (numbers/impact)
- Body paragraph 2: highlight AI/architecture leadership and cross-functional impact
- Closing: express enthusiasm, mention availability for a conversation
- Do NOT use generic phrases like "I am writing to express my interest"
- Personalize based on what the JD emphasizes most
- Keep it under 350 words
- Return ONLY the cover letter text, no subject line, no JSON`;
}

// ── Core API call ────────────────────────────────────────────────────────────
async function callClaude(apiKey, messages, maxTokens = 2000) {
  // Abort the request if the network stalls so the popup never spins forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000); // 45s per call

  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // fastest available model
        max_tokens: maxTokens,
        messages,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out after 45s. Check your connection and try again.');
    }
    throw new Error(`Network error contacting Claude: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error('Unexpected response from Claude (no text content).');
  }
  return text;
}

// ── Fast visa pre-check (no API call — keyword scan) ─────────────────────────
function checkVisaSponsorship(jobText) {
  const text = jobText.toLowerCase();

  const noSponsorshipPhrases = [
    'no visa sponsorship',
    'will not sponsor',
    'cannot sponsor',
    'unable to sponsor',
    'sponsorship is not available',
    'sponsorship not available',
    'does not offer sponsorship',
    'not able to sponsor',
    'must be authorized to work in the u.s',
    'must be authorized to work in the us',
    'must have authorization to work',
    'must have work authorization',
    'must have existing work authorization',
    'eligible to work in the us without',
    'eligible to work in the u.s. without',
    'work authorization without sponsorship',
    'authorized to work without sponsorship',
    'us citizen or permanent resident',
    'u.s. citizen or permanent resident',
    'citizen or permanent resident only',
    'must be a us citizen',
    'must be a u.s. citizen',
    'green card holder',
    'no h1b',
    'h1b sponsorship is not',
    'h-1b sponsorship is not',
  ];

  const yesSponsorshipPhrases = [
    'will sponsor',
    'visa sponsorship available',
    'visa sponsorship provided',
    'h1b sponsorship',
    'h-1b sponsorship',
    'sponsor work authorization',
    'sponsorship for qualified',
    'we sponsor',
    'open to sponsoring',
  ];

  for (const phrase of noSponsorshipPhrases) {
    if (text.includes(phrase)) return 'no';
  }
  for (const phrase of yesSponsorshipPhrases) {
    if (text.includes(phrase)) return 'yes';
  }
  return 'unknown';
}

// ── Main analysis handler ─────────────────────────────────────────────────────
async function analyzeJob(jobText, jobTitle, company) {
  const stored = await chrome.storage.local.get(['apiKey', 'resumeText']);
  const apiKey = stored.apiKey || '';
  const resumeText = stored.resumeText || DEFAULT_RESUME;

  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  // ── Visa pre-check: bail immediately if no sponsorship, no API call needed ──
  const visaStatus = checkVisaSponsorship(jobText);
  if (visaStatus === 'no') {
    return {
      blocked: true,
      reason: 'no_sponsorship',
      visaSponsorship: 'no',
      role: {
        title: jobTitle || 'This role',
        company: company || 'This company',
      },
    };
  }

  // Step 1: Get match analysis
  // Use assistant prefill ({ ) to force a pure JSON response — eliminates parse failures
  const analysisPrompt = buildAnalysisPrompt(resumeText, jobText, jobTitle, company);
  const rawAnalysis = await callClaude(
    apiKey,
    [
      { role: 'user', content: analysisPrompt },
      { role: 'assistant', content: '{' },
    ],
    3800
  );

  let analysis;
  try {
    // Prepend the prefill character and extract the JSON block
    const full = '{' + rawAnalysis;
    // Find outermost JSON object robustly
    const start = full.indexOf('{');
    const end = full.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found');
    const jsonStr = full.slice(start, end + 1);
    analysis = JSON.parse(jsonStr);
    // Override visa status with our fast pre-check if it found 'yes' (more reliable than Claude for known phrases)
    if (visaStatus === 'yes') analysis.visaSponsorship = 'yes';
    else if (!analysis.visaSponsorship) analysis.visaSponsorship = 'unknown';
  } catch (e) {
    throw new Error('Failed to parse analysis response. Please try again.');
  }

  // Step 2: Generate cover letter if match >= 60%
  let coverLetter = null;
  if (analysis.overallMatch >= 60) {
    const coverLetterPrompt = buildCoverLetterPrompt(resumeText, jobText, analysis);
    coverLetter = await callClaude(
      apiKey,
      [{ role: 'user', content: coverLetterPrompt }],
      800
    );
  }

  return { analysis, coverLetter };
}

// ════════════════════════════════════════════════════════════════════════════
// AUTO-ANALYSIS — background analysis triggered by content.js page detection
// ════════════════════════════════════════════════════════════════════════════

const MAX_HISTORY = 15;
const autoInFlight = new Set(); // URLs currently being auto-analyzed (dedup guard)

async function getHistory() {
  const stored = await chrome.storage.local.get('jobHistory');
  return stored.jobHistory || [];
}

// Mirrors popup.js saveToHistory so background-initiated analyses land in the
// same history list the popup reads.
async function saveToHistory(url, pageTitle, analysis, coverLetter) {
  const history = await getHistory();
  const filtered = history.filter((h) => h.url !== url);
  filtered.unshift({ url, pageTitle, analysis, coverLetter, timestamp: Date.now() });
  await chrome.storage.local.set({ jobHistory: filtered.slice(0, MAX_HISTORY) });
}

// ── Toolbar badge ─────────────────────────────────────────────────────────────
function badgeColorForScore(score) {
  if (score >= 70) return '#22c55e'; // green
  if (score >= 50) return '#f59e0b'; // amber
  return '#ef4444';                  // red
}

async function setBadge(tabId, text, color) {
  if (tabId == null) return;
  try {
    await chrome.action.setBadgeText({ tabId, text: text || '' });
    if (color) await chrome.action.setBadgeBackgroundColor({ tabId, color });
  } catch (_) { /* tab closed or navigated away — ignore */ }
}

function applyBadge(tabId, analysis) {
  if (!analysis) return;
  if (analysis.blocked) { setBadge(tabId, '✕', '#ef4444'); return; }
  const score = Math.round(analysis.overallMatch || 0);
  setBadge(tabId, String(score), badgeColorForScore(score));
}

// ── Auto-analyze handler ──────────────────────────────────────────────────────
async function handleAutoAnalyze(message, tabId) {
  const url = message.url;
  if (!url) return;

  const settings = await chrome.storage.local.get(['autoAnalyze', 'apiKey']);
  // Toggle defaults to ON — only an explicit `false` disables auto-analysis.
  if (settings.autoAnalyze === false) return;
  // No API key configured: stay silent and let the user analyze manually.
  if (!settings.apiKey) { setBadge(tabId, '', null); return; }

  // Dedup: this URL was already analyzed — just restore the badge from cache,
  // no API call.
  const history = await getHistory();
  const cached = history.find((h) => h.url === url);
  if (cached) { applyBadge(tabId, cached.analysis); return; }

  // Guard against double-firing while an analysis for this URL is in progress.
  if (autoInFlight.has(url)) return;
  autoInFlight.add(url);
  await setBadge(tabId, '…', '#6c63ff'); // loading

  try {
    const result = await analyzeJob(message.jobText, message.jobTitle, message.company);
    if (result.blocked) {
      await saveToHistory(url, message.jobTitle, {
        blocked: true,
        reason: 'no_sponsorship',
        visaSponsorship: 'no',
        role: result.role,
      }, '');
      await setBadge(tabId, '✕', '#ef4444');
    } else {
      await saveToHistory(url, message.jobTitle, result.analysis, result.coverLetter);
      applyBadge(tabId, result.analysis);
    }
  } catch (_) {
    // Background work fails silently — clear the loading badge.
    await setBadge(tabId, '', null);
  } finally {
    autoInFlight.delete(url);
  }
}

// ── Message listener ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_JOB') {
    const { jobText, jobTitle, company } = message;
    analyzeJob(jobText, jobTitle, company)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) =>
        sendResponse({ success: false, error: err.message })
      );
    return true; // async
  }

  if (message.type === 'AUTO_ANALYZE') {
    handleAutoAnalyze(message, sender.tab?.id);
    return false; // fire-and-forget
  }

  if (message.type === 'CLEAR_BADGE') {
    setBadge(sender.tab?.id, '', null);
    return false;
  }
});
