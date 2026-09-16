# Nomadio — IRL Livestream Control & Monitoring

Nomadio is a modular monitoring and control plane for a one-person IRL livestream rig.
It is deliberately **not** an encoder, **not** a bonding engine, and **not** a mixer.
It observes those systems, normalises their telemetry into one model, and shows it on a
phone-friendly dashboard.

## Hardware in scope

| Device | Role | Telemetry available to Nomadio |
| --- | --- | --- |
| iPhone 16 | Primary camera + encoder | Only what a companion Shortcut or native app pushes (see `02-data-availability.md`) |
| GoPro HERO12 Black | Secondary / backup camera | None in V1. Open GoPro HTTP/BLE API exists but needs Wi-Fi proximity (V3) |
| DJI Mini 4 (drone) | Aerial camera | None in V1. No public SDK for Mini-series telemetry; HDMI/feed capture at the OBS machine only (V3) |
| NEEWER GP26 | Neck mount | None |
| DJI Mic Mini 2 | Audio | None. No public API |
| 10 000 mAh powerbank | Power | None. Inferred from phone battery slope |
| Apple Watch | Companion | Optional HR/GPS via Shortcuts or HealthKit app (V4) |
| PH eSIM | Uplink A | Carrier/signal only via a native app or Shortcut |
| 2nd modem (later) | Uplink B | Via Speedify agent (V2) |
| Home PC running OBS | Production / mixing | obs-websocket v5 on the LAN, reachable remotely over a VPN or tunnel (V3) |

## Design rules

1. **Reliable → simple → modular → extensible.** V1 must keep working when every optional
   source is absent; missing data renders as `unknown`, never as a fake number.
2. **Ingest is the source of truth.** Bitrate, FPS, dropped frames and latency are read from
   the receiving end (SRT/RTMP ingest or platform API), not from the phone. The phone cannot
   be trusted to report on a link that is failing.
3. **Every external system sits behind a provider interface.** Speedify, the cloud OBS, and
   the streaming platform are each one swappable implementation.
4. **No invented APIs.** Anything that needs an SDK, a companion app or a sidecar agent is
   named as such in `02-data-availability.md` before it is designed.
5. **Nothing changes the stream automatically** unless an explicit opt-in flag is set.

## Layout

```
apps/backend    Node + TypeScript collector, REST + WebSocket
apps/frontend   React + Vite dashboard PWA (mobile-first)
packages/shared Types + zod schemas shared by both
docs            This documentation
```

## Operator profile

The operator builds and runs Vercel/AWS services, frontends and PWAs. Nomadio leans on that:
the dashboard is a **PWA** (installable, offline shell, works on a flaky link) and the backend
is a plain Node service that runs equally well on a home PC next to OBS, on an AWS box, or in
a container. Vercel hosts the frontend; the backend is *not* put on serverless in V1 because it
holds a long-lived poll loop and WebSocket fan-out, which a small always-on container does better.

## Production topology (given OBS runs at home)

The mixer is a **home PC running OBS**, not a cloud OBS. That makes the home PC the natural
place for both the ingest endpoint and the Nomadio backend, and it changes V3 from "integrate a
cloud OBS vendor" to "reach my own OBS over a tunnel". The `OverlayProvider` abstraction is
unchanged — a cloud OBS stays a drop-in alternative if the home uplink ever proves too weak.
