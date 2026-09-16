# Nomadio Field System

The visual system for the admin dashboard. Seeded by extracting [coss.com/ui](https://coss.com/ui)
with Dembrandt, then rebuilt as our own: the source is a light, neutral, near-black-on-white
system; Nomadio is the same restraint inverted for a phone held outdoors at night, with every
pair re-checked for contrast.

## What was kept, what changed

| From coss.com/ui | Nomadio |
| --- | --- |
| Pure neutral greyscale, one accent | Kept. Status colour is the only hue that carries meaning |
| `#262626` ink, `#686868` muted, `#fafafa` background | Inverted: `#fafafa` ink on `#0a0a0a`, `#a1a1a1` muted |
| Accent `#1447e6` | Dropped for `#9d8cff` — the original scores 2.1:1 on black and fails |
| Radius 2 / 4 / 6px | Two steps: `--r-sm: 3px` on controls, `--r-md: 7px` on surfaces, both drawn as a **squircle** where the browser supports `corner-shape` |
| Type scale 48 / 24 / 18 / 16 / 14 / 12, weights 400·500·700 | Kept as-is, one step added at 32px for the state banner |
| System sans stack | Kept |

## Tokens

Contrast measured against the surface each token actually appears on.

| Token | Value | On `--bg` | On `--surface` | Use |
| --- | --- | --- | --- | --- |
| `--bg` | `#0a0a0a` | — | — | Page |
| `--surface` | `#141414` | 1.07 | — | Cards, header |
| `--surface-2` | `#1f1f1f` | 1.17 | — | Rows, pressed states |
| `--text` | `#fafafa` | 18.97 | 17.65 | Values, headings |
| `--muted` | `#a1a1a1` | 7.66 | 7.13 | Labels, metadata |
| `--idle` | `#8a8a8a` | 5.73 | 5.34 | **Unknown data** (`—`) |
| `--ok` | `#9d8cff` | 7.19 | 6.69 | LIVE, link up, primary action |
| `--warn` | `#ff9f43` | 9.70 | 9.03 | Degraded but still streaming |
| `--crit` | `#ff5f33` | 6.54 | 6.09 | Offline, loss, overheating |
| `--accent` | `#9d8cff` | 7.19 | 6.69 | Same violet as `--ok` — good and actionable are one idea |
| `--border` | `#3d3d3d` | — | 1.70 | Decorative separators only |
| `--border-strong` | `#6e6e6e` | — | 3.61 | Interactive control edges (≥3:1, WCAG 1.4.11) |

Fills use black text: `--ok` 7.2:1, `--warn` 9.7:1, `--crit` 6.5:1.

**Three hues, no more.** Violet is good and is also the only action colour. Orange is a warning:
degraded, but the stream is still up. Bright red-orange is an error: something is down. Green is
deliberately absent — it is the default "fine" colour of every dashboard and stops being read
after an hour. Violet is not, so LIVE registers as information rather than decoration. Orange and
red-orange sit close on the wheel on purpose: they are one escalating signal, and neither is ever
used for chrome.

Every text token clears **WCAG AA (4.5:1)** and all but `--idle` and `--accent` clear **AAA (7:1)**.
`--idle` at 5.73 is deliberate: unknown data must be visible but must never compete with a real
number. It is never the only signal — the value itself reads `—`.

## Rules

- **Two radii, no more.** 3px on anything you press or type into, 7px on anything that holds
  content. `corner-shape: squircle` is a progressive enhancement: Chrome 139+ renders the
  superellipse, everything else gets the plain radius and looks correct.
- **One accent.** Violet is both the OK state and the action colour; orange and red-orange are
  state only.
- **Grey means unknown, never zero.** A metric with no source is `—` in `--idle`.
- **Tabular numerals** on every metric so digits do not jitter at 1 Hz.
- **Mobile first.** One column, 16px gutters, bottom tab bar, 44px minimum touch targets.
  Sidebar navigation appears at ≥720px; nothing is hidden on the small screen.
- **Focus is visible.** 2px `--accent` outline with a 2px offset, never removed.
- Dark only. This is read in the dark for hours; a second theme is a second surface to keep
  correct for no operational gain.

## Type scale

| Token | Size / weight / line-height | Use |
| --- | --- | --- |
| `--t-display` | 32 / 700 / 1.1 | Stream state banner |
| `--t-h1` | 24 / 700 / 1.33 | View titles |
| `--t-body` | 16 / 400 / 1.5 | Prose |
| `--t-value` | 24 / 500 / 1.2, tabular | Metric values |
| `--t-label` | 12 / 500 / 1.33, 0.08em caps | Metric labels |
| `--t-meta` | 14 / 400 / 1.43 | Rows, metadata |

## Spacing

4px grid: `4 8 12 16 24 32 48`. Gutter 16px, card padding 16px, grid gap 8px.

## Components

Interactive primitives come from **Base UI** (`@base-ui-components/react`) — headless, accessible,
unstyled, and the same foundation coss.com/ui is built on. It fits because this project has no
Tailwind: shadcn/ui would drag one in, and Radix is the older generation of the same idea.
Base UI supplies behaviour (roving focus in the tab bar, the select popup, checkbox state) and
`src/globals.css` supplies every pixel from the tokens above.

In use: `Tabs` for section navigation, `Checkbox` for the go-live checklist, `Select` for the
privacy setting. Wrappers live in `apps/frontend/src/components/ui/` so a swap stays local.
