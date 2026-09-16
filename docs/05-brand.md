# Brand

## The name

**Nomadio** = *nomad* + *-io*. `Nomad` is a genuine old root (Greek *nomás*, νομάς — a moving
herder, a wanderer; from *némein*, to graze, to allot). `-io` is not a classical suffix here.
Read it as **I/O**: input and output, the only thing that matters once someone is out there —
what gets in, what gets out. The root is real, the name is new.

**Tagline: I/O for creators on the move.** Written **NomadIO** where the name leads (README
heading, app bar), so the I/O reading is visible; plain `nomadio` in code, packages and URLs.

The useful consequence: **the name does not lock the product to streaming.** Nomadio can grow
into the whole IRL/nomad digital system — route, gear, power, connectivity, footage — and the
name still fits. That is why the codebase calls things `DeviceTelemetry` and `LinkSnapshot`
rather than `StreamerPhone` and `SpeedifyLink`.

## Positioning

Not "a streaming app". **A telemetry and control layer** that sits beside the encoder, the
network and the cameras and tells one person, on one screen, whether the thing they cannot see
is working. The product's core signal is trust in the number: a value with no real source is
shown as `—`, never as a plausible-looking zero. Everything else is negotiable.

## Voice

Terse, factual, operator-to-operator. Status words are the interface: `LIVE`, `CONNECTING`,
`OFFLINE`, `BACKEND UNREACHABLE`. No exclamation marks, no "Oops". A person reading this screen
is walking down a road in the rain with a phone on their chest.

## Visual language

| Token | Value | Why |
| --- | --- | --- |
| Background | `#0a0a0a` | Near-black, readable outdoors at low brightness, easy on battery on OLED |
| Surface | `#141414` / `#1f1f1f` | Two steps of elevation only |
| Text / muted | `#fafafa` / `#a1a1a1` | Muted is reserved for labels and for "no data" |
| OK / action | `#9d8cff` | LIVE, link up, primary button |
| Warning | `#ff9f43` | Degraded but streaming |
| Error | `#ff5f33` | Offline, loss, overheating |
| Idle | `#8a8a8a` | **Unknown** — deliberately grey, never green |
| Radius | 3px controls / 7px surfaces, squircle | Tool-like, not playful |

Dark-only by design: this UI is looked at in the dark, on a phone, for hours, and a light theme
would be a second surface to keep correct for no operational gain.

## Mark

A monoline **N** whose diagonal overshoots both stems and is split by a hairline — one stroke
that will not stay inside the letter. It reads as movement, and as a signal crossing a frame.
Pure black and white; the status colours belong to the data, never to the logo.

- `brand/marketing-banner.png` — 1280×720, mark + tagline, README header and social preview
- `brand/logo.pdf` — vector original, black on white
- `brand/mark.svg` — the mark alone
- `apps/frontend/public/icon.svg` — same mark as the PWA / maskable icon and favicon

The mark is transparent everywhere and inherits its colour from the surface it sits on. The one
exception is the installed app icon: iOS composites a transparent PNG onto white, where a white
mark would vanish, so those keep a black plate.

Reads down to 16px on a tab. Never recoloured, never outlined, never set on a busy photo.
