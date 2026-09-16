# Brand assets

| File | Use |
| --- | --- |
| `marketing-banner.png` | 2000×1125 — README header, GitHub social preview, link previews |
| `banner.source.html` | How the banner is built. Re-render it with headless Chrome at 2400×1350 after a UI change, so the phone in it is never a stale screenshot |
| `wordmark-card.png` | The original mark-and-tagline card, kept for square or text-only placements |
| `mark.svg` | The mark alone, on the near-black background |

The same mark ships as the app icon at `../apps/frontend/public/icon.svg` (PWA, maskable,
favicon). Colour tokens, voice and usage rules: [`../docs/05-brand.md`](../docs/05-brand.md).

Tagline: **I/O for creators on the move.**

> Set the social preview manually once: repo → Settings → General → Social preview → upload
> `marketing-banner.png`. GitHub has no API for it.
