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

The popup writes feedback straight to Firestore (`forge-vertical` project,
`extension_feedback` collection) via the REST API — no SDK bundling needed.

**Before this goes live anywhere public**, set these Firestore security
rules in the Firebase console (Firestore → Rules) so the extension can only
*create* documents in that one collection, never read or modify existing
ones, with basic field validation to block abuse/garbage writes:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /extension_feedback/{docId} {
      allow read, update, delete: if false;
      allow create: if
        request.resource.data.keys().hasAll(['message', 'createdAt', 'extensionVersion']) &&
        request.resource.data.message is string &&
        request.resource.data.message.size() <= 1000 &&
        request.resource.data.message.size() > 0;
    }
  }
}
```

Everything else in the project stays under your existing rules — this only
opens one narrow door, write-only, for this one collection.

Swap `SUPPORT_URL` in `popup.js` for a real donate link once you have one.

Built by [Forge Vertical](https://forgevertical.com).
