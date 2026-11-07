// TODO: swap this for your real support/donate link once you have one
// (a Stripe payment link or Buy Me a Coffee page both work fine).
const SUPPORT_URL = "https://forgevertical.com";

// Firebase web config isn't a secret — it just identifies the project.
// What actually protects this is the Firestore security rules (create-only,
// no reads, field validation) — see README for the exact rules to paste
// into the Firebase console before this goes live anywhere public.
const FIREBASE_PROJECT_ID = "forge-vertical";
const FIREBASE_API_KEY = "AIzaSyBTilhnShlJ5SyOeBOOrlLalDPjtNs2TJs";
const FEEDBACK_COLLECTION = "extension_feedback";

document.getElementById("supportLink").href = SUPPORT_URL;

chrome.storage.local.get(["hiddenCount", "enabled"], (data) => {
  document.getElementById("count").textContent = data.hiddenCount || 0;
  document.getElementById("enabledToggle").checked = data.enabled !== false;
});

document.getElementById("enabledToggle").addEventListener("change", (e) => {
  chrome.storage.local.set({ enabled: e.target.checked });
});

async function sendFeedback(message) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}` +
    `/databases/(default)/documents/${FEEDBACK_COLLECTION}?key=${FIREBASE_API_KEY}`;

  const body = {
    fields: {
      message: { stringValue: message.slice(0, 1000) },
      createdAt: { timestampValue: new Date().toISOString() },
      extensionVersion: {
        stringValue: chrome.runtime.getManifest().version,
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Firestore write failed: ${res.status}`);
  }
}

const submitBtn = document.getElementById("feedbackSubmit");
const statusEl = document.getElementById("feedbackStatus");
const textEl = document.getElementById("feedbackText");

submitBtn.addEventListener("click", async () => {
  const message = textEl.value.trim();
  if (!message) {
    statusEl.textContent = "Write something first.";
    return;
  }

  submitBtn.disabled = true;
  statusEl.textContent = "Sending...";

  try {
    await sendFeedback(message);
    statusEl.textContent = "Thanks — got it.";
    textEl.value = "";
  } catch (err) {
    statusEl.textContent = "Couldn't send — try again later.";
    console.error(err);
  } finally {
    submitBtn.disabled = false;
  }
});
