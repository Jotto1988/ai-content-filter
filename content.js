/**
 * AI Content Filter — content script
 *
 * v1 approach: Facebook and Instagram already badge a lot of AI-generated
 * media themselves ("AI info" labels, built from C2PA metadata on images
 * uploaded from tools that embed it). Instead of running our own detection
 * model, this script looks for that existing label and hides the post it
 * belongs to.
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
  ];

  // How many ancestor levels to walk up from a matched label to find
  // the enclosing post/container to hide. Tuned loosely — err on the
  // side of hiding too much of the post rather than too little.
  const MAX_WALK_UP = 12;

  let hiddenCount = 0;

  function matchesAiLabel(el) {
    const text = (el.getAttribute?.("aria-label") || "") + " " + (el.textContent || "");
    return LABEL_PATTERNS.some((re) => re.test(text));
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
