# Design notes — reconciling the original vision with V1

The original sketch put a **Nomadio Cloud** at the centre with the iPhone and the browser as
edges. That is the right V3+ shape. V1 differs on three points, deliberately:

**1. The backend starts at home, not in the cloud.** OBS runs on the home PC, so the ingest and
the mixer are already there; putting the collector next to them removes a hop and a failure
domain. The code is a plain container with no host assumptions, so moving it to AWS later is a
deployment change. The dashboard PWA is the piece that goes on Vercel from day one, because it
must be reachable when the home link is the thing that is broken.

**2. No native iOS app in V1.** The sketch's V1 stack listed Swift. An iOS app is the *only* way
to get thermal state and continuous background telemetry, but it is also weeks of work and an
App Store dependency for a system whose core value — is the stream alive — comes from the
ingest server. V1 ships with an Apple Shortcut posting to `POST /api/v1/telemetry`; the endpoint
contract is identical for a native app later, so writing one is additive.

**3. No PostgreSQL in V1.** All state is in memory and derived from a live snapshot stream.
Adding a database before knowing which history is actually worth querying would be storing
noise. The seam is `SessionTracker` and `DeviceRegistry`: both already own their data behind a
class, so a store slots in under them when session history becomes a feature.

## Kept from the original sketch

- The provider abstraction over network / stream / camera / overlay, so Speedify, the OBS host
  and the platform are each swappable.
- The normalised `network` block with per-link state, so the UI does not change when bonding
  arrives.
- WebSocket for realtime, REST for everything else.
- The telemetry taxonomy (stream / network / device / trip) — it is the shape of
  `DashboardState`.

## Ideas worth keeping on the list

- **Session log + clip markers.** A button that writes a timestamp during the stream is trivial
  now and is the whole foundation for automatic highlights later.
- **Ring light / small tripod** from the gear list: no telemetry, but they belong in the go-live
  checklist in `03-control-surface.md` as physical steps.
- **Power budget view.** Phone battery slope + known power bank capacity gives an honest
  "hours of stream left" estimate without any new hardware API. Good V4 candidate.
- **A second, dedicated streaming phone.** Already supported: telemetry is keyed by `deviceId`.
