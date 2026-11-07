/**
 * AI Content Filter — content script
 *
 * v1 approach: Facebook, Instagram, Google Search/Images and LinkedIn
 * already badge a lot of AI-generated media themselves ("AI info" on Meta,
 * "AI-generated" overlay on Google Images, a small icon + Content
 * Credentials panel on LinkedIn), mostly built from C2PA metadata the
 * generating tool embedded. Instead of running our own detection model,
 * this script looks for that existing label/category text and hides the
 * post or result it belongs to. Same logic runs on all four sites — no
 * site-specific code, just text/aria-label matching.
 *
 * Known gaps, confirmed by research rather than guessed:
 * - Meta now hides the "AI info" label inside the post's three-dot menu
 *   for AI-EDITED (not fully AI-generated) content — the label text may
 *   not exist in the DOM at all until that menu is opened, so this script
 *   can't catch those without auto-opening menus (too intrusive/fragile
 *   to attempt). Fully AI-generated content still gets the prominent
 *   label and is still caught.
 * - LinkedIn's AI signal is icon-first, not a text label in the feed —
 *   detection likely has to key off that icon's aria-label/tooltip text,
 *   which hasn't been inspected live yet. Untested, needs the same
 *   verify-and-adjust pass FB/IG got: open a post you know is AI-labelled,
 *   check if it's caught, inspect the icon's accessible name if not.
 * - Google Images is also untested live yet, though the label wording
 *   ("AI Generated") is confirmed and already matches LABEL_PATTERNS.
 * - Reddit has no platform-wide AI-content label and was deliberately
 *   left out — what exists is per-subreddit moderator rules/flair with
 *   no consistent text to match on.
 *
 * NOTE: Meta's DOM uses obfuscated, auto-generated class names that change
 * often, so this matches on visible TEXT / aria-label content instead of
 * CSS classes — more brittle to exact layout, but far more stable across
 * Meta's frequent markup changes. If matching breaks, this is the file to
 * revisit: open devtools on a post you know is AI-labelled and check what
 * the badge's text/aria-label actually says now.
 */

(() => {
  const LABEL_PATTERNS = [
    /\bAI info\b/i,
    /\bMade with AI\b/i,
    /\bAI[- ]generated\b/i,
    /\bAI content\b/i,
  ];

  // Meta's real "AI info" badge is 2-3 words. Facebook's auto-generated
  // accessibility descriptions of image content ("May be an image of
  // text that says '...'") are full sentences and can end up QUOTING
  // text that's visibly printed on the image itself — including memes
  // that are explicitly anti-AI. A short length cap filters those out
  // structurally: real labels are short, image-content descriptions
  // aren't.
  const MAX_MATCH_LENGTH = 40;

  // How many ancestor levels to walk up from a matched label to find
  // the enclosing post/container to hide. Tuned loosely — err on the
  // side of hiding too much of the post rather than too little.
  const MAX_WALK_UP = 12;

  let hiddenCount = 0;

  function ownText(el) {
    // Direct text of this element only — NOT el.textContent, which
    // aggregates every descendant's text too. Using textContent means
    // a huge post container matches just because a caption buried deep
    // inside it happens to contain a trigger phrase; ownText() only
    // matches the specific small element that actually carries the text.
    let text = "";
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) text += child.textContent;
    }
    return text;
  }

  function matchesAiLabel(el) {
    // Images and image-role elements carry Facebook's auto-generated
    // content description in aria-label/alt — that describes what's
    // VISIBLE in the picture (including OCR'd text), not whether Meta
    // flagged it as AI-generated. Skip them entirely.
    const tag = el.tagName?.toLowerCase();
    if (tag === "img" || el.getAttribute?.("role") === "img") return false;

    const ariaLabel = el.getAttribute?.("aria-label") || "";
    const text = ownText(el);
    const candidates = [ariaLabel, text].filter(
      (s) => s && s.trim().length > 0 && s.length <= MAX_MATCH_LENGTH
    );
    return candidates.some((s) => LABEL_PATTERNS.some((re) => re.test(s)));
  }

  function looksLikePostContainer(el) {
    // Heuristic: a post container is a reasonably large block-level
    // element, usually a <div> or <article>, with a nontrivial amount
    // of content (more than just the label itself).
    if (!el || !el.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    return rect.height > 150 && rect.width > 200;
  }

  function findPostContainer(labelEl) {
    let node = labelEl;
    for (let i = 0; i < MAX_WALK_UP && node; i++) {
      if (looksLikePostContainer(node)) return node;
      node = node.parentElement;
    }
    return labelEl.parentElement || labelEl;
  }

  function hidePost(container) {
    if (container.dataset.aiFilterHidden === "true") return;
    container.dataset.aiFilterHidden = "true";

    const placeholder = document.createElement("div");
    placeholder.style.cssText =
      "padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;" +
      "font-size:13px;color:#65676b;display:flex;justify-content:space-between;align-items:center;";
    placeholder.innerHTML = `<span>AI-labelled post hidden</span>`;

    const showBtn = document.createElement("button");
    showBtn.textContent = "Show anyway";
    showBtn.style.cssText =
      "background:none;border:none;color:#1877f2;cursor:pointer;font-size:13px;";
    showBtn.addEventListener("click", () => {
      container.style.display = "";
      placeholder.remove();
    });
    placeholder.appendChild(showBtn);

    container.style.display = "none";
    container.insertAdjacentElement("beforebegin", placeholder);

    hiddenCount++;
    chrome.storage.local.set({ hiddenCount });
  }

  function scan(root = document.body) {
    // Walk all elements under root; cheap enough at idle/mutation scale
    // since we only do substring/regex checks, no heavy computation.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.currentNode;
    while (node) {
      if (matchesAiLabel(node)) {
        const container = findPostContainer(node);
        hidePost(container);
      }
      node = walker.nextNode();
    }
  }

  // Initial pass once the page has settled.
  scan();

  // Facebook/Instagram are infinite-scroll SPAs — new posts stream in
  // via JS, not page loads, so watch for DOM mutations and re-scan
  // just the added nodes.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const added of mutation.addedNodes) {
        if (added.nodeType === Node.ELEMENT_NODE) {
          scan(added);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Restore the running count on load so the popup has something
  // meaningful even right after a page refresh.
  chrome.storage.local.get("hiddenCount", (data) => {
    if (typeof data.hiddenCount === "number") hiddenCount = data.hiddenCount;
  });
})();
