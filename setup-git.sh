#!/bin/bash
# Run this once from inside the job-match-extension folder to create the GitHub repo and push.
# Usage: GITHUB_USER=<your-github-username> bash setup-git.sh
GITHUB_USER="${GITHUB_USER:-$(gh api user -q .login)}"

set -e

cd "$(dirname "$0")"

echo "🧹 Cleaning up any stale git state..."
rm -rf .git

echo "🔧 Initializing git repo..."
git init
git branch -M main

echo "📦 Staging all files..."
git add .

echo "💾 Creating initial commit..."
git commit -m "Initial commit: Job Match AI Chrome extension

- Analyzes job descriptions against resume using Claude AI (Haiku model)
- 6-category match scoring: Technical Skills, Experience Level, Architecture,
  AI & Innovation, Leadership, Domain Fit
- Visa/H1B sponsorship pre-check — stops immediately if no sponsorship found
- Auto-generates cover letter for matches >= 60%
- Per-URL history (last 15 analyses cached in chrome.storage.local)
- Works on LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday, and more
- Settings page for API key + resume management
- API key stored locally only, never hardcoded"

echo "🚀 Creating GitHub repo and pushing..."
gh repo create "$GITHUB_USER/job-match-extension" \
  --public \
  --description "Chrome extension: AI-powered job match analyzer using Claude — score + cover letter" \
  --source=. \
  --remote=origin \
  --push

echo ""
echo "✅ Done! Your repo is live at:"
echo "   https://github.com/$GITHUB_USER/job-match-extension"
