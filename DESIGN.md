---
name: NomadIO
description: Design system for the NomadIO dashboard. Dark, three hues, squircle corners.
seeded-from: https://coss.com/ui (extracted with Dembrandt, then rebuilt)
---

# DESIGN.md

Field system for a phone held outdoors, at night, for hours. Every pair below is contrast-checked
against the surface it actually sits on.

## Colour

```css
--bg: #0a0a0a;          /* page */
--surface: #141414;     /* cards, app bar */
--surface-2: #1f1f1f;   /* rows, pressed */
--text: #fafafa;        /* 18.97:1 on bg */
--muted: #a1a1a1;       /* labels — 7.66:1 */
--idle: #8a8a8a;        /* unknown data — 5.73:1 */
--ok: #9d8cff;          /* LIVE, link up, primary action — 7.19:1 */
--warn: #ff9f43;        /* degraded, still streaming — 9.70:1 */
--crit: #ff5f33;        /* down — 6.54:1 */
--accent: #9d8cff;      /* same violet as --ok */
--border: #3d3d3d;      /* decorative separators */
--border-strong: #6e6e6e; /* interactive edges, ≥3:1 per WCAG 1.4.11 */
```

**Three hues, no more.** Violet is good *and* actionable — one idea, one colour. Orange warns:
degraded, still up. Red-orange is an error: down. No green anywhere; green is the default "fine"
of every dashboard and stops being read after an hour, while violet keeps registering. Orange and
red-orange are adjacent on purpose — one escalating signal.

Every text token clears WCAG AA (4.5:1); all but `--idle` and the hues clear AAA. Fills carry
black text. Dark only: this is read in the dark for hours, and a light theme is a second surface
to keep correct for no operational gain.

## Shape

```css
--r-sm: 3px;   /* anything you press or type into */
--r-md: 7px;   /* anything that holds content */
corner-shape: squircle;   /* Chrome 139+; elsewhere the plain radius, which is correct too */
```

## Type

System sans. Scale 32 / 24 / 16 / 14 / 12, weights 400 · 500 · 700.

| Token | Spec | Use |
| --- | --- | --- |
| display | 32 / 700 / 1.1 | Stream state banner |
| h1 | 24 / 700 / 1.33 | View titles |
| value | 24 / 500 / 1.2, tabular | Metric figures |
| body | 16 / 400 / 1.5 | Prose |
| meta | 14 / 400 / 1.43 | Rows |
| label | 12 / 500, 0.08em caps | Metric labels |

Tabular numerals on every metric, so digits do not jitter at 1 Hz.

## Space and layout

4px grid: `4 8 12 16 24 32 48`. Gutter and card padding 16px, grid gap 8px.

Mobile first, one column, bottom tab bar, 44px minimum touch targets. From 720px the tabs become
a sidebar; from 1100px the content is two columns with the chart and banner spanning; from 1700px
three columns and a wider rail; past 2400px the type scales up. Nothing is hidden on the phone.

## Rules

- **Grey means unknown, never zero.** A metric with no source renders `—` in `--idle`.
- **One accent.** Violet is OK and action. Orange and red-orange are state only, never chrome.
- **Focus is visible.** 2px `--accent` outline, 2px offset, never removed.
- **Cut words before shrinking type.** A glance should be enough to know where you are.

## Components

Base UI (`@base-ui-components/react`) for behaviour — tabs, checkbox, select — with every pixel
from the tokens above. No Tailwind, so shadcn/ui would drag one in; Radix is the earlier
generation of the same idea; Base UI is what coss.com/ui itself is built on. Icons are Heroicons
24/outline at 20px, stroke 1.6. Wrappers live in `apps/frontend/src/components/ui/`.

Full rationale and the extraction it was seeded from: [docs/07-design-system.md](docs/07-design-system.md).
