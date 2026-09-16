# Architecture

## V1 data flow

```
  iPhone 16 (Larix / Moblin / native app)
        │  RTMP or SRT over 5G
        ▼
  ┌──────────────┐          ┌───────────────────────────────┐
  │ Ingest @ home│  poll    │ Nomadio backend               │
  │ SRT-Live-Srv │◄─────────┤  StreamProvider               │
  │ or nginx-rtmp│  stats   │  NetworkProvider  (stub V1)   │
  │ or YouTube   │          │  CameraProvider   (stub V1)   │
  └──────────────┘          │  OverlayProvider  (stub V1)   │
                            │                               │
  iPhone Shortcut ─POST────►│  DeviceTelemetry ingest        │
  (battery, uplink)         │                               │
                            │  SessionTracker ─ duration,    │
                            │    data usage, outage log      │
                            │  HealthEngine   ─ rules → alerts│
                            └───────┬───────────────┬────────┘
                                    │ WS /ws        │ REST /api/v1
                                    ▼               ▼
                            ┌───────────────────────────────┐
                            │ Next.js dashboard (phone-first)│
                            └───────────────────────────────┘
```

## Layers

**Providers** — the only code that knows about a vendor.

```ts
interface StreamProvider  { id; poll(): Promise<StreamSnapshot> }
interface NetworkProvider { id; poll(): Promise<NetworkSnapshot> }
interface CameraProvider  { id; list(): Promise<CameraInfo[]> }
interface OverlayProvider { id; getState(): Promise<OverlayState>; setScene(id): Promise<void> }
```

Each returns a normalised snapshot with a `fields` map marking which values are real,
so the UI can render `unknown` instead of `0`. Implementations are selected by env var
(`STREAM_PROVIDER=mock|srt|nginx-rtmp|youtube`), so swapping Speedify for another bonder or
YouTube for Twitch is a config change plus one file.

**Core** — vendor-free.

- `Collector` polls all registered providers on a fixed interval, never in lockstep with the UI.
- `SessionTracker` derives stream duration, estimated data consumption (integrated bitrate),
  and the outage log (start, end, duration) from the snapshot stream.
- `HealthEngine` applies threshold rules to a rolling window and emits `HealthAlert[]`.
  V1 evaluates and warns only; V5 adds the opt-in actuator.
- `Hub` fans the merged `DashboardState` out to WebSocket clients and caches the last state
  for late joiners and for `GET /api/v1/state`.

**Transport** — WebSocket for the ~1 Hz telemetry stream, REST for settings, history and
health checks. A dashboard that loses the socket falls back to polling REST, because the
dashboard itself often rides the same bad link it is monitoring.

## Why the ingest side, not the phone

A phone encoder reports the bitrate it *tried* to send. When the uplink degrades, that number
stays optimistic while the viewer sees nothing. The ingest server reports what actually
arrived. Nomadio therefore treats ingest stats as primary and phone telemetry as context
(battery, thermals, which SIM).

## Extension seams reserved in V1

| Version | Seam already present |
| --- | --- |
| V2 network | `NetworkProvider` interface + `network` block in `DashboardState`, populated by a stub |
| V3 home OBS | `OverlayProvider` interface + `POST /api/v1/overlay/scene`, returns 501 in V1 |
| V4 hiking overlay | `DeviceTelemetry` accepts an optional `location` block; `privacy.exposeLocation` defaults to `false` |
| V5 reliability | `HealthEngine` rules are data; `autoQualityLadder.enabled` defaults to `false` and is unimplemented |

## Where each piece runs (V1 → V3)

```
   iPhone 16 ──5G──► home router ──► [ home PC ]
                                      ├─ SRT/RTMP ingest
                                      ├─ OBS + obs-websocket v5
                                      └─ Nomadio backend  (Docker)
                                             ▲ WSS / HTTPS over Tailscale or a
                                             │ Cloudflare tunnel
                                      [ Vercel ] Nomadio dashboard PWA
```

The home PC is a single point of failure for the *production*, not for the *monitoring*:
if the backend also dies, the dashboard shows a hard `BACKEND UNREACHABLE` state rather than
stale numbers. Moving the backend to AWS later is an env-var change plus a tunnel from the
home OBS, because only the `OverlayProvider` needs LAN access.
