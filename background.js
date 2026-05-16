/**
 * background.js — Service Worker
 * Handles Claude API calls for job match analysis and cover letter generation.
 *
 * SETUP: Enter your Claude API key in the extension's Settings page (⚙️ icon),
 * or set CLAUDE_API_KEY below for local development only (never commit a real key).
 */

// ── Config — set via Settings page; fallback for local dev only ───────────────
const CLAUDE_API_KEY = ''; // Leave empty — enter your key via the Settings page

// ── Default resume ────────────────────────────────────────────────────────────
const DEFAULT_RESUME = `
Kartheek Mannepalli
Email: kartheekmannepalli@gmail.com | Phone: 408-348-4539

SUMMARY
Senior Software Engineer with 15 years of experience specializing in high-scale microservices (1M TPS) and AI orchestration. Proven track record of driving ~$150M+ in annual revenue through architectural convergence and pioneering MCP-based AI frameworks.

TECHNICAL SKILLS
Languages & Frameworks: Kotlin, Java, Scala, Python, JavaScript, Spring, AWS, NodeJS
Data & Infrastructure: Kafka, Docker, Kubernetes, PostgreSQL, SQL Server, Redis, MongoDB, DynamoDB, Apache Airflow
Back-End & Architecture: Microservices, Event-Driven Architecture, CQRS, Domain-Driven Design
AI & LLM Infrastructure: MCP, RAG Architecture, LLM Integration, LangChain, GenAI and Prompt Engineering

WORK EXPERIENCE

Expedia Inc., Seattle, WA — July 2022 to May 2026
Role: Senior Software Development Engineer | Project: Pricing
- Managed a mission-critical suite of services in a complex gRPC-based microservice architecture, overseeing technical delivery and system health for high-traffic environments reaching ~1M TPS maintaining 99.99% uptime during peak.
- Led cross-functional projects involving multiple services, closely collaborating with the product team to gather requirements and plan project deliveries for features like XLR and IPM TSF resulting in ~$100M in annual revenue.
- Pioneered the design and deployment of standardized Model Context Protocol (MCP) tools within the team, establishing a framework for AI agents to interface with complex backend services. This initiative eliminated manual data discovery bottlenecks reducing debugging time from 2-3 hours to 10 minutes.
- Spearheaded organization-wide AI hackathons and training programs, successfully upskilling ~200 engineers on RAG-based application development, directly leading to the launch of ~40 internal AI initiatives.
- Designed and deployed RAG-based agents to streamline internal documentation search, resulting in a 50% increase in knowledge discovery speed and reducing repetitive support tickets by 20%.
- Championed an inner-source model for Pricing services, enabling 6 engineers from external teams to contribute code independently, reducing core team dependency.
- Orchestrated critical architectural convergence initiatives within the vacation rental domain, unifying disparate legacy systems to enable high-impact promotion capabilities that drove a ~$50M increase in annual revenue.
- Independently engineered an organization-wide automated testing and debugging suite used by 6 teams, reducing manual investigation time by 60% and ensuring zero-discrepancy transitions.
- Mentored engineers by providing technical guidance, sharing best practices, and facilitating their professional growth resulting in 20% increase in team story-point velocity.

Expeditors International of Washington, Inc., Seattle, WA — November 2015 to July 2022
Role: Senior Software Developer

Project: Delivery & Pickup (October 2021 to July 2022)
- Led the design of a next-generation logistics platform utilizing Domain-Driven Design (DDD) and microservices to accelerate global operations.

Project: Warehousing (December 2017 to October 2021)
- Architected Zero Downtime deployment strategies; 24/7 availability for international branches.
- CI/CD pipeline via GitLab, Docker, Kubernetes with concurrent execution and automated testing.
- Kafka event processing (millions of events) using CQRS and event-driven architecture.
- 200% latency improvement through performance bottleneck remediation.
- Supported global branch expansion.

Project: Customs (November 2015 to December 2017)
- Designed features expanding application to European branches.
- Pioneered Kafka adoption for inter-application communication.
- Built data-flow APIs. Led Agile transformation.

Allconnect (Formerly Whitefence), Houston, TX — April 2011 to October 2015
Position: Java Web Developer
- Redesigned company website infrastructure; integrated Hybris and Endeca platforms.
- Streaming serviceability project (dynamic provider responses). Managed offshore team.

Hooduku Inc, Houston, TX — February 2010 to March 2011
Position: Web Developer
- E-commerce site for cloud space purchasing. Shopping cart (jQuery/PHP).
- Integrated Rackspace, cPanel, Recurly APIs. Built RBAC system and user forum.

EDUCATION
Master of Science, Computer Science — University of Houston, Houston, TX (December 2009)
B. Tech, Computer Science — Jawaharlal Nehru University (JNTU), Hyderabad, India (May 2007)

TARGET ROLES: Senior Software Engineer, Staff Software Engineer, Principal Engineer
`.trim();

// ── Build the analysis prompt ──────────────────────────────────────────────────
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

Perform a comprehensive, nuanced analysis that goes beyond simple keyword matching. Consider the candidate's actual depth of experience, leadership trajectory, system scale, and business impact.

Return ONLY valid JSON in this exact structure (no markdown, no explanation outside the JSON):

{
  "role": {
    "title": "<extracted job title>",
    "company": "<extracted company name>",
    "level": "<inferred level: Junior/Mid/Senior/Staff/Principal/Director>"
  },
  "overallMatch": <integer 0-100>,
  "summary": "<2-3 sentence honest assessment of fit>",
  "categories": [
    {
      "name": "Technical Skills",
      "score": <integer 0-100>,
      "icon": "⚙️",
      "matched": ["<skill matched with context>"],
      "gaps": ["<missing or weak skill>"],
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
  "keywordsFound": ["<important keyword from JD that appears in resume>"],
  "keywordsMissing": ["<important keyword from JD NOT in resume>"],
  "applicationAdvice": "<1-2 sentences on how to position this application>",
  "generateCoverLetter": <true if overallMatch >= 60, else false>,
  "visaSponsorship": "<one of: 'yes' | 'no' | 'unknown'>. 'yes' if JD explicitly offers H1B/visa sponsorship. 'no' if JD explicitly says no sponsorship or requires existing work authorization. 'unknown' if not mentioned."
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
- Opening: express genuine interest, mention 1 specific thing about the company/role
- Body paragraph 1: highlight most relevant technical experience with numbers/impact
- Body paragraph 2: highlight AI/architecture leadership and cross-functional impact
- Closing: express enthusiasm, mention availability for a conversation
- Do NOT open with "I am writing to express my interest"
- Keep it under 350 words
- Return ONLY the cover letter text, no subject line, no JSON`;
}

// ── Core API call ──────────────────────────────────────────────────────────────
async function callClaude(apiKey, messages, maxTokens = 2000) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ── Fast visa pre-check (keyword scan — no API call needed) ───────────────────
function checkVisaSponsorship(jobText) {
  const text = jobText.toLowerCase();

  const noSponsorshipPhrases = [
    'no visa sponsorship', 'will not sponsor', 'cannot sponsor', 'unable to sponsor',
    'sponsorship is not available', 'sponsorship not available', 'does not offer sponsorship',
    'not able to sponsor', 'must be authorized to work in the u.s', 'must be authorized to work in the us',
    'must have authorization to work', 'must have work authorization', 'must have existing work authorization',
    'eligible to work in the us without', 'eligible to work in the u.s. without',
    'work authorization without sponsorship', 'authorized to work without sponsorship',
    'us citizen or permanent resident', 'u.s. citizen or permanent resident',
    'citizen or permanent resident only', 'must be a us citizen', 'must be a u.s. citizen',
    'green card holder', 'no h1b', 'h1b sponsorship is not', 'h-1b sponsorship is not',
  ];

  const yesSponsorshipPhrases = [
    'will sponsor', 'visa sponsorship available', 'visa sponsorship provided',
    'h1b sponsorship', 'h-1b sponsorship', 'sponsor work authorization',
    'sponsorship for qualified', 'we sponsor', 'open to sponsoring',
  ];

  for (const phrase of noSponsorshipPhrases) {
    if (text.includes(phrase)) return 'no';
  }
  for (const phrase of yesSponsorshipPhrases) {
    if (text.includes(phrase)) return 'yes';
  }
  return 'unknown';
}

// ── Main analysis handler ──────────────────────────────────────────────────────
async function analyzeJob(jobText, jobTitle, company) {
  const stored = await chrome.storage.local.get(['apiKey', 'resumeText']);
  const apiKey = stored.apiKey || CLAUDE_API_KEY;
  const resumeText = stored.resumeText || DEFAULT_RESUME;

  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  // Visa pre-check: bail immediately if no sponsorship — no API call needed
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

  // Step 1: Match analysis with JSON prefill to prevent parse failures
  const analysisPrompt = buildAnalysisPrompt(resumeText, jobText, jobTitle, company);
  const rawAnalysis = await callClaude(
    apiKey,
    [
      { role: 'user', content: analysisPrompt },
      { role: 'assistant', content: '{' },
    ],
    3000
  );

  let analysis;
  try {
    const full = '{' + rawAnalysis;
    const start = full.indexOf('{');
    const end = full.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found');
    analysis = JSON.parse(full.slice(start, end + 1));
    if (visaStatus === 'yes') analysis.visaSponsorship = 'yes';
    else if (!analysis.visaSponsorship) analysis.visaSponsorship = 'unknown';
  } catch (e) {
    throw new Error('Failed to parse analysis response. Please try again.');
  }

  // Step 2: Cover letter if match >= 60%
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

// ── Message listener ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ANALYZE_JOB') {
    const { jobText, jobTitle, company } = message;
    analyzeJob(jobText, jobTitle, company)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
