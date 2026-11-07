# AI Content Filter

A browser extension that hides AI-generated posts on Facebook and Instagram
by detecting Meta's own "AI info" label — no custom detection model needed
for v1.

## How it works

Meta already labels a lot of AI-generated media it detects (built from
C2PA metadata embedded by the generating tool). `content.js` watches the
page for that label's text and hides the post it belongs to, replacing it
with a small "AI-labelled post hidden — Show anyway" placeholder.

This is a v1, honest-about-its-limits approach: it only catches what Meta
itself has already flagged. Content without embedded metadata, or from
platforms that don't label it, won't be caught yet.

## Loading it locally (unpacked, for testing)

1. Go to `chrome://extensions`
2. Turn on "Developer mode" (top right)
3. Click "Load unpacked"
4. Select this folder

## Status

v0.1.0 — early build. The DOM text matching in `content.js` is the most
likely thing to need tweaking if Facebook/Instagram changes their label
wording or you notice posts it misses.

## Feedback

Links in the extension popup point to a feedback form and to
[forgevertical.com](https://forgevertical.com) — update `popup.js` with
the real feedback form URL before publishing.

Built by [Forge Vertical](https://forgevertical.com).
