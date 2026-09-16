# Roadmap

The phase names in the README (Viewer → Connected → Control → Context → Agentic) are the
product story; the versions below are the build order.

Each version must leave the system fully working. Nothing later than V1 is built yet.

## V1 — Stream Monitor (in progress)

Backend collector + REST/WS + PWA dashboard.
Shows: state (LIVE/CONNECTING/OFFLINE), bitrate, FPS, dropped frames, upload speed, latency,
uplink in use, phone battery (if the Shortcut is installed), thermal state (`unknown` without a
native app), stream duration, estimated data usage, and the last outage with its duration.

Done when: the dashboard survives a 60-second uplink loss and correctly reports the outage
afterwards, on a phone screen, installed as a PWA.

## V2 — Network Monitor

`nomadio-agent`: a small Node process on the bonding machine that shells out to `speedify_cli`
and POSTs adapter stats. Dashboard gains connection A/B status, per-link latency, loss, upload,
active link and a derived failover event log.
Prerequisite: bonding must run on a machine with a CLI, not on the iPhone.

## V3 — Home OBS integration

`ObsOverlayProvider` over obs-websocket v5, reached through Tailscale or a Cloudflare tunnel.
Scenes: iPhone, GoPro, Starting, BRB / connection problem, Ending. Adds scene control, OBS
stats (encoder drops, render lag), audio levels, and the YouTube broadcast transition.
The provider interface is chosen so a cloud OBS is a swap, not a rewrite.

## V4 — Hiking overlay

Browser-source overlay page served by the backend: distance, elevation gain, altitude, speed,
elapsed time, battery, network state — fed by device telemetry.
Exact GPS is **off by default**; `privacy.exposeLocation` has three levels: `off`,
`coarse` (region/place name only) and `precise`. `off` is the shipped default and the overlay
must be correct and useful at `off`. `coarse` is implemented: coordinates are rounded to one
decimal degree, roughly eleven kilometres, and the accuracy figure is dropped so the rounding
cannot be undone.

## V5 — Reliability automation

Health rules move from warn-only to optionally actuating: 1080p60 → 1080p30 → 720p30.
Gated behind `autoQualityLadder.enabled=false` and blocked until the phone-side control path
from `03-control-surface.md` is actually verified. Until then the ladder is advice on screen.

## Explicitly out of scope

Re-implementing bonding, any DJI Mini 4 telemetry, audio processing, chat moderation logic
(chat is displayed, not moderated), and cloud transcoding.
