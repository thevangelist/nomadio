# What can actually be read, and what cannot

This file is the honesty ledger. Nothing gets designed into the UI before it appears here.
Items marked **VERIFY** are plausible from vendor docs but must be confirmed against the real
device/app version before being built.

## Stream health

| Value | Source that really provides it | Notes |
| --- | --- | --- |
| Bitrate in | SRT Live Server `/stats`, nginx-rtmp `stat.xml`, MediaMTX API | Authoritative. Measured at the receiver |
| FPS | nginx-rtmp `stat.xml`, MediaMTX, OBS via obs-websocket | Ingest FPS is the published frame rate; OBS gives render/output FPS |
| Dropped frames | OBS `GetStats` (obs-websocket v5) | The *encoder's* drops. Ingest servers report lost packets, not frames |
| SRT packet loss / RTT | SRT ingest stats (`pktRcvLoss`, `msRTT`) | Only with SRT. RTMP exposes neither |
| Upload speed | Derived from ingest bitrate | Not a link capacity measurement |
| Latency | SRT RTT, or configured SRT latency | RTMP: not available |
| Stream state LIVE/OFFLINE | Ingest publisher presence + platform API | Two sources; disagreement is itself a warning |
| YouTube health | YouTube Live Streaming API `liveStreams.status.healthStatus` (`good/ok/bad/noData`) + `configurationIssues` | Coarse, quota-limited. Poll ~every 15–30 s, not 1 Hz |

**Not available:** per-viewer quality, true available uplink bandwidth, anything from inside
Larix/Moblin over HTTP. Mobile encoder apps do not expose a local stats API.

## MediaMTX (verified against v1.21.0, 2026-09-16)

Confirmed live against a real iPhone publisher over SRT, so these are not doc-derived guesses:

- `GET /v3/paths/get/live` → `ready`, `readyTime`, `bytesReceived`, `inboundBytes`,
  `inboundFramesInError`. No frame rate anywhere, so FPS stays `—` with this provider.
- `GET /v3/srtconns/list` → `mbpsReceiveRate`, `msRTT`, `packetsReceived`, `packetsReceivedLoss`,
  `packetsReceivedLossRate`, `packetsReceivedDrop`, `msReceiveTsbPdDelay`, `mbpsLinkCapacity`.
- Connections appear with `state: idle` and an empty `path` before publishing starts; their
  counters are all zero, so the provider matches on `path` **and** `state === 'publish'`.
- The API refuses requests from outside localhost unless `authInternalUsers` grants the `api`
  action.

An RTMP publisher produces none of the SRT fields. Bitrate is then integrated from the byte
counter and RTT and loss stay `—`, which is the honest answer rather than a zero.

## iPhone 16

| Value | Reality |
| --- | --- |
| Battery % | Not readable by a web page. Requires an **Apple Shortcuts automation** posting `Battery Level` to Nomadio, or a native app. Shortcuts can run on a schedule/charge-state trigger, not truly continuously |
| Thermal state | Only `ProcessInfo.thermalState` inside a **native app**. Not in Shortcuts, not on the web |
| Cellular signal / carrier | Native app only, and iOS gives `CTTelephonyNetworkInfo` carrier + radio tech, **not** dBm. Signal bars are private API |
| Which SIM/eSIM is active | Native app, coarse (carrier name) |
| GPS / altitude / distance | Shortcuts can post current location; continuous tracking needs a native app with background location |
| Remote start of the encoder | Not possible from a web dashboard. Larix Broadcaster advertises MQTT-based remote control — **VERIFY** before relying on it |

## Speedify (V2)

- There is **no cloud/public REST API**. The only programmatic surface is the local
  **`speedify_cli`** on the machine running Speedify (`state`, `stats`, `show adapters`,
  `show currentserver`), plus a local daemon socket. That means a **Nomadio agent process must
  run on the bonding machine** and push to the backend.
- **Speedify on iOS has no CLI.** If bonding runs on the iPhone itself, Nomadio can read
  *nothing* about it. Bonding that Nomadio can observe means a laptop, a mini PC, a Raspberry Pi,
  or a Speedify-capable router acting as the hotspot.
- Readable per adapter via CLI: adapter name/type, connected state, and rolling send/receive
  throughput and loss/latency statistics. **VERIFY** the exact field names against the installed
  version; they have changed between releases.
- Failover events are **not** an event feed. They must be derived by diffing consecutive
  `state`/adapter samples and logging the transitions ourselves.

## GoPro HERO12 Black (V3)

Open GoPro HTTP API over USB or Wi-Fi gives state, battery and control. It requires the
controlling machine to be on the camera's Wi-Fi, which conflicts with the phone's uplink.
Realistic use: the **home PC** talks to the GoPro, or the GoPro is treated as an offline B-roll
camera with no telemetry.

## DJI Mini 4 (V3+)

No public SDK exposes Mini-series flight/battery telemetry to a third-party service; the
Mobile SDK does not cover the Mini line. Treat the drone as a **video source only** — its feed
reaches OBS via HDMI capture or a screen-capture of DJI Fly. Any "drone battery on the overlay"
feature would have to be typed in by hand, so it is out of scope.

## DJI Mic Mini 2, NEEWER GP26, power banks

No API. Audio presence can be inferred at OBS (audio levels via obs-websocket) — that is the
only honest audio indicator. Power bank charge is not readable; the phone's battery slope is
the proxy.

## Apple Watch

Only through an iOS app with HealthKit, or a Shortcut running on the watch. Low value for
stream health, real value for V4 hiking stats (heart rate, workout distance). Kept **optional**
— nothing in the system may depend on it.
