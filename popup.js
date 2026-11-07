// TODO: swap these two placeholders for real links once you have them
// (a Google Form works fine for feedback; a Stripe payment link or
// Buy Me a Coffee page works fine for support).
const FEEDBACK_URL = "https://forms.gle/REPLACE_ME";
const SUPPORT_URL = "https://forgevertical.com";

document.getElementById("feedbackLink").href = FEEDBACK_URL;
document.getElementById("supportLink").href = SUPPORT_URL;

chrome.storage.local.get(["hiddenCount", "enabled"], (data) => {
  document.getElementById("count").textContent = data.hiddenCount || 0;
  document.getElementById("enabledToggle").checked = data.enabled !== false;
});

document.getElementById("enabledToggle").addEventListener("change", (e) => {
  chrome.storage.local.set({ enabled: e.target.checked });
});
