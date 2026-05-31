# Job Match AI — Chrome Extension

A Chrome extension that instantly analyzes any job description against your resume and gives you a detailed match score — powered by Claude AI.

## What It Does

- **Smart match scoring** — goes beyond keyword matching; Claude evaluates your actual experience, seniority, scale, and impact against the role
- **6-category breakdown** — Technical Skills, Experience Level & Scale, Architecture & Systems Design, AI & Innovation, Leadership & Collaboration, Domain & Industry Fit
- **Visa sponsorship check** — scans the job description for H1B/sponsorship language *before* making any API call; stops immediately if no sponsorship is available
- **Auto cover letter** — generates a tailored cover letter for roles where you match ≥ 60%
- **Per-URL history** — remembers the last 15 jobs you analyzed; reopening the popup on the same page shows the cached result instantly
- **Works everywhere** — LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday, and any company careers page

## Setup

### 1. Get a Claude API Key

Go to [console.anthropic.com](https://console.anthropic.com) → API Keys → Create key.

> **Note:** This extension uses the Claude API directly (not your Claude.ai subscription). API usage is billed separately and is very affordable — roughly $0.002–0.01 per analysis using claude-haiku.

### 2. Install the Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select this folder (`job-match-extension/`)

### 3. Enter Your API Key

Click the extension icon (🎯) in the toolbar → click ⚙️ Settings → paste your API key and click **Save Settings**.

Your resume is pre-loaded. You can edit it in the Settings page anytime.

## How to Use

1. Navigate to any job listing page
2. Click the 🎯 extension icon in the toolbar
3. Click **Analyze This Job**
4. In ~5–10 seconds you'll see:
   - Overall match percentage (with animated score ring)
   - Breakdown across 6 categories (click any to expand matched skills and gaps)
   - Keyword match summary
   - Application tip
   - Cover letter (if match ≥ 60%) with one-click copy

## File Structure

```
job-match-extension/
├── manifest.json       # Extension config (Manifest V3)
├── background.js       # Service worker — Claude API calls, visa pre-check
├── content.js          # Content script — job description extraction
├── popup.html          # Extension popup UI
├── popup.js            # Popup controller — rendering, history, clipboard
├── options.html        # Settings page UI
├── options.js          # Settings page controller — API key + resume storage
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Configuration

| Setting | Where | Default |
|---------|-------|---------|
| Claude API Key | Settings page (⚙️) | *(empty — required)* |
| Resume text | Settings page (⚙️) | Pre-loaded with your profile |
| AI model | `background.js` → `callClaude()` | `claude-haiku-4-5-20251001` |
| Cover letter threshold | `background.js` → `analyzeJob()` | 60% match |
| History size | `popup.js` → `MAX_HISTORY` | 15 entries |

## Privacy

- Your API key and resume are stored locally using `chrome.storage.local` — they never leave your browser except when sent directly to Anthropic's API (`api.anthropic.com`).
- No data is stored on any external server.
- Job descriptions are sent to Anthropic's API for analysis and are subject to [Anthropic's privacy policy](https://www.anthropic.com/privacy).

## Development

To modify and reload:
1. Edit any file
2. Go to `chrome://extensions`
3. Click the refresh icon on the extension card
4. Re-open the popup

To change the AI model, edit the `model` field in `background.js` → `callClaude()`.

## Troubleshooting

**"API Key Required"** — Open Settings (⚙️) and enter your Claude API key from [console.anthropic.com](https://console.anthropic.com).

**"Could not read this page"** — The extension can't access `chrome://` pages. Navigate to the actual job listing URL.

**"No job description found"** — Navigate directly to the individual job posting page (not a search results page).

**Analysis seems wrong** — The extension extracts visible page text. If the page uses heavy JavaScript rendering, try scrolling down to load all content before analyzing.
