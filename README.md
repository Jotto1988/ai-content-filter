# AI Content Filter

A browser extension that hides AI-labelled content on Facebook, Instagram,
Google Search/Images and LinkedIn by detecting the platforms' own AI
labels — no custom detection model needed for v1. Reddit was deliberately
left out — see Status below for why.

## How it works

Meta, Google and LinkedIn already label a lot of AI-generated media they
detect (built from C2PA metadata embedded by the generating tool).
`content.js` watches the page for that label's text and hides the post or
result it belongs to, replacing it with a small "AI-labelled post hidden —
Show anyway" placeholder. Same script, same logic on all four sites — just
text/aria-label matching, no site-specific selectors.

This is a v1, honest-about-its-limits approach: it only catches what Meta
itself has already flagged. Content without embedded metadata, or from
platforms that don't label it, won't be caught yet.

## Loading it locally (unpacked, for testing)

1. Go to `chrome://extensions`
2. Turn on "Developer mode" (top right)
3. Click "Load unpacked"
4. Select this folder

## Status

v0.4.0 — added LinkedIn. Researched (not guessed) what each platform
actually does before building this round:

- **Meta**: confirmed "AI info" is right, but Meta now hides that label
  inside the post's three-dot menu for content that was only AI-*edited*
  (not fully generated) — the label may not exist in the DOM until that
  menu is opened, so this script can't catch those without auto-opening
  menus (too fragile/intrusive to attempt). Fully AI-generated content
  still shows the label prominently and is still caught.
- **Google Images**: confirmed real, overlay badge reads "AI Generated" —
  already matches the existing patterns. Still untested live.
- **LinkedIn**: confirmed real, but it's icon-first — a small icon on the
  image rather than inline text, revealing a "Content Credentials" panel
  on click. Detection likely needs the icon's aria-label/tooltip text,
  which hasn't been inspected live. Needs the same verify-and-adjust pass
  FB/IG got: open a post you know is AI-labelled, check if it's caught,
  inspect the icon's accessible name if not.
- **Reddit**: deliberately skipped. No platform-wide AI-content label
  exists — what's there is per-subreddit moderator rules and flair with
  no consistent text to match on. Revisit only if Reddit ships something
  structured platform-wide.

v0.2.0 — matching now ignores image alt-text/accessibility descriptions
(which quote text visibly printed on an image and caused false positives,
e.g. an anti-AI meme that literally said "AI GENERATED IMAGES" getting
hidden) and only matches short, label-like text rather than a whole
post's aggregated content. Still only catches what the platform itself
labels or categorizes (e.g. a page tagged "AI content") — genuinely
AI-looking content with no label anywhere in the post/result won't be
caught by this v1 approach. That's the known ceiling until a real
detection model is worth building — worth watching for actual user
interest (the feedback channel below) before investing in ML/OCR and
turning this into something with a paid tier.

## Feedback

The popup writes feedback straight to Firestore (`forge-vertical` project,
`extension_feedback` collection) via the REST API — no SDK bundling needed.

Rules are live in the `forge-vertical` project — see the `extension_feedback`
block in that project's Firestore rules (write-only, create-only, one
collection, field-validated). Confirmed working as of v0.2.0.

`SUPPORT_URL` in `popup.js` points to buymeacoffee.com/Prinymity.

Built by [Forge Vertical](https://forgevertical.com).
