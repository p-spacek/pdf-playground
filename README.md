# PDF Playground

Live preview for the Jigx Forms PDF template. Edit JSON data on the left, see rendered HTML on the right.

**GitHub Pages:** https://p-spacek.github.io/pdf-playground

## File mapping

| This repo | Source in `jigx-sdk` |
| --- | --- |
| `index.html` | `packages/expert-sdk/src/expert-form/scripts/pdf-playground.html` |
| `pdf.js` | `packages/expert-sdk/src/expert-form/scripts/pdf.js` |
| `pdf.d.ts` | `packages/expert-sdk/src/expert-form/scripts/pdf.d.ts` |

## Syncing changes

The source of truth is `jigx-sdk`. This repo is a mirror for GitHub Pages hosting.

### After changing `pdf.js`

1. The playground (`pdf-playground.html`) inlines a copy of the `create()` function. Update both files in `jigx-sdk` to stay in sync.
2. Copy the updated files to this repo and push:

```bash
cp packages/expert-sdk/src/expert-form/scripts/pdf-playground.html /tmp/pdf-playground/index.html
cp packages/expert-sdk/src/expert-form/scripts/pdf.js /tmp/pdf-playground/pdf.js
cp packages/expert-sdk/src/expert-form/scripts/pdf.d.ts /tmp/pdf-playground/pdf.d.ts
cd /tmp/pdf-playground
git add -A && git commit -m "sync with jigx-sdk" && git push origin main
```

### After changing `pdf-playground.html`

1. If you changed the inlined `create()` function, back-port those changes to `pdf.js` as well.
2. Copy and push using the same commands above.

### First-time setup

If `/tmp/pdf-playground` doesn't exist (e.g. after a reboot):

```bash
cd /tmp
git clone https://github.com/p-spacek/pdf-playground.git
```

### Quick Claude prompt

> Sync the pdf-playground repo with the latest pdf.js and playground changes.
