# Privacy Policy — Job Match AI Chrome Extension

**Last updated: June 5, 2026**

Job Match AI ("the extension") helps you compare job descriptions against your resume using Anthropic's Claude API. This policy explains what data the extension handles and where it goes.

## What data the extension stores

The extension stores the following **only in your browser's local storage** (`chrome.storage.local`), on your device:

- **Your Claude API key** — entered by you in the Settings page
- **Your resume text** — pasted by you in the Settings page
- **Analysis history** — the last 15 job match results, cached so revisiting a job shows the previous score

This data never leaves your browser except as described below. It is not synced, not uploaded to any server operated by the extension, and is deleted if you remove the extension.

## What data is sent, and to whom

When you click **Analyze** (or select tabs for multi-tab analysis), the extension sends the following **directly to Anthropic's API** (`api.anthropic.com`), authenticated with your own API key:

- The visible job description text from the page(s) you chose to analyze
- Your resume text

This is the only network destination. Data sent to Anthropic is governed by [Anthropic's Privacy Policy](https://www.anthropic.com/privacy).

## What the extension does NOT do

- No analytics, tracking, or telemetry of any kind
- No data is sent to the developer or any third party (other than Anthropic, at your explicit request)
- No browsing history is collected — the extension reads a page only when you explicitly trigger an analysis
- No background or automatic page scanning — nothing runs until you click
- No ads, no sale of data, no sharing of data

## Permissions explained

- **activeTab / scripting** — read the job description from the page you're viewing, only when you click Analyze
- **tabs** — list your open tabs for the optional multi-tab analysis feature you trigger manually
- **storage** — save your settings and analysis history locally
- **clipboardWrite** — the "Copy to Clipboard" button for generated cover letters
- **Host access** — used only to inject the text extractor into tabs you explicitly select for analysis, and to call `api.anthropic.com`

## Data removal

Uninstalling the extension permanently deletes all stored data (API key, resume, history). You can also clear history any time from the popup, or overwrite your resume/API key in Settings.

## Changes

Any future changes to this policy will be published at this URL with an updated date.

## Contact

Questions? Open an issue on this repository.
