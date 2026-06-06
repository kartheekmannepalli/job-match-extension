/**
 * options.js — Settings page controller
 */

const DEFAULT_RESUME = '';

// Load saved settings on page open + wire up listeners.
// NOTE: MV3's Content Security Policy strips inline onclick= attributes, so
// every handler MUST be attached here via addEventListener — not in the HTML.
document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.local.get(['apiKey', 'resumeText']);
  if (stored.apiKey) {
    document.getElementById('apiKey').value = stored.apiKey;
  }
  document.getElementById('resumeText').value = stored.resumeText || DEFAULT_RESUME; // empty by default — user pastes their own resume

  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('toggleVisBtn').addEventListener('click', toggleVis);
});

function toggleVis() {
  const input = document.getElementById('apiKey');
  input.type = input.type === 'password' ? 'text' : 'password';
}

async function saveSettings() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const resumeText = document.getElementById('resumeText').value.trim();
  const btn = document.getElementById('saveBtn');

  try {
    await chrome.storage.local.set({ apiKey, resumeText });
    const toast = document.getElementById('toast');
    toast.textContent = '✅ Settings saved!';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  } catch (err) {
    const toast = document.getElementById('toast');
    toast.textContent = '⚠️ Save failed: ' + err.message;
    toast.style.borderColor = '#ef4444';
    toast.style.color = '#ef4444';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
  }
}
