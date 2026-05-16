/**
 * options.js — Settings page controller
 */

const DEFAULT_RESUME = `Kartheek Mannepalli
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

TARGET ROLES: Senior Software Engineer, Staff Software Engineer, Principal Engineer`;

// Load saved settings on page open
document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.local.get(['apiKey', 'resumeText']);
  if (stored.apiKey) {
    document.getElementById('apiKey').value = stored.apiKey;
  }
  document.getElementById('resumeText').value = stored.resumeText || DEFAULT_RESUME;
});

function toggleVis() {
  const input = document.getElementById('apiKey');
  input.type = input.type === 'password' ? 'text' : 'password';
}

async function saveSettings() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const resumeText = document.getElementById('resumeText').value.trim();

  try {
    await chrome.storage.local.set({ apiKey, resumeText });
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  } catch (err) {
    alert('Failed to save settings: ' + err.message);
  }
}
