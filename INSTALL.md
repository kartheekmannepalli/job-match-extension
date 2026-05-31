# Job Match AI — Chrome Extension

A Chrome extension that compares any job description against your resume using Claude AI, giving you a detailed match score with categories and an auto-generated cover letter when you're a strong fit.

---

## 🚀 Local Install (Developer Mode)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `job-match-extension` folder (the folder containing `manifest.json`)
5. The 🎯 icon will appear in your Chrome toolbar

---

## ⚙️ First-Time Setup

1. Click the 🎯 icon → click the ⚙️ gear icon (top right of popup)
2. Enter your **Claude API Key** (get one at https://console.anthropic.com)
3. Your resume is pre-loaded — edit it if needed
4. Click **Save Settings**

---

## 🎯 How to Use

1. Navigate to any job listing (LinkedIn, Indeed, Glassdoor, Greenhouse, Workday, company sites, etc.)
2. Click the 🎯 **Job Match AI** icon in your toolbar
3. Click **"Analyze This Job"**
4. Wait ~5-10 seconds for Claude to analyze
5. View your match breakdown:
   - **Overall Match %** — holistic fit score
   - **Technical Skills** — language, framework, and tool overlap
   - **Experience Level & Scale** — seniority and scope match
   - **Architecture & Systems Design** — patterns and design principles
   - **AI & Innovation** — ML/AI/LLM experience fit
   - **Leadership & Collaboration** — mentorship, cross-functional work
   - **Domain & Industry Fit** — industry/vertical alignment
6. If match ≥ 70%, a **cover letter is auto-generated** — click "Copy to Clipboard"

---

## 📦 Publishing to the Chrome Web Store

### Prerequisites
- A Google Developer account ($5 one-time fee at https://chrome.google.com/webstore/devconsole)
- A privacy policy URL (can be a simple GitHub Gist or web page)

### Steps

1. **Zip the extension folder:**
   ```
   # From inside the job-match-extension folder's parent:
   zip -r job-match-extension.zip job-match-extension/ --exclude "*.DS_Store" --exclude "*/__pycache__/*"
   ```

2. **Go to the Chrome Web Store Developer Dashboard:**
   https://chrome.google.com/webstore/devconsole

3. **Click "New Item"** and upload `job-match-extension.zip`

4. **Fill in the store listing:**
   - Name: `Job Match AI`
   - Summary: `Compare any job description to your resume instantly. Get match scores, category breakdowns, and auto-generated cover letters powered by Claude AI.`
   - Category: `Productivity`
   - Add screenshots (1280×800 or 640×400)

5. **Privacy policy** (required): Create a simple page stating:
   - The extension stores your API key and resume text locally in Chrome storage
   - Job description text is sent to Anthropic's API for analysis
   - No data is stored on any third-party servers by this extension

6. **Submit for review** — typically takes 1-3 business days

---

## 💡 Tips

- Works best when you're on the direct job listing page (not search results)
- If extraction fails, try clicking "Analyze" after the full page loads
- Update your resume in Settings to match the level/role you're targeting
- The extension uses `claude-sonnet-4-6` — roughly $0.002–0.01 per analysis

---

## 🔒 Privacy

- Your API key and resume are stored **only in Chrome's local storage** (`chrome.storage.sync`)
- Job descriptions are sent to Anthropic's API for analysis — no data is stored by this extension
- Nothing is collected, logged, or shared by the extension itself
