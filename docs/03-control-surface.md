# Control surface — what the PWA can actually control

The dashboard is an installable **PWA**: one responsive UI that shows everything and, where the
underlying system allows it, controls it. Control is added strictly per verified capability.

## Reliable control (V3, via the home PC)

| Action | Mechanism |
| --- | --- |
| Switch scene (iPhone / GoPro / Starting / BRB / Ending) | obs-websocket v5 `SetCurrentProgramScene` |
| Start/stop OBS streaming & recording | obs-websocket v5 `StartStream` / `StopStream` |
| Mute/unmute a source, read audio levels | obs-websocket v5 |
| Start/stop the YouTube broadcast, flip privacy | YouTube Live Streaming API `liveBroadcasts.transition` |
| Mark a moment / write a marker to the session log | Nomadio itself |

## Control that does NOT exist

- Starting or stopping the **iPhone encoder** from the web. The phone must be started by hand,
  or by a Shortcut on the phone, or possibly by Larix's MQTT remote control (**VERIFY**).
- Changing the phone's bitrate or resolution remotely — same constraint.
- Anything on the DJI Mini 4 or the DJI Mic.
- Forcing Speedify onto a specific link from a phone. `speedify_cli` can do it, but only on
  the bonding machine, so it needs the Nomadio agent (V2).

Because of this split, the PWA shows two kinds of buttons and never mixes them: **Control**
(acts on OBS/YouTube) and **Checklist** (tells the operator to do something on the phone).

## Go-live sequence in the PWA

The "start the stream" flow is a guided checklist rather than a single button, because half the
steps are physical:

1. Phone charged, power bank connected, mic paired — *manual, ticked by the operator*
2. Uplink check — *automatic, from the network block*
3. Start encoder on phone — *manual (or Larix MQTT if verified)*
4. Ingest sees the publisher — *automatic, turns green by itself*
5. OBS scene = Starting — *button*
6. Go live on YouTube — *button*

Steps 4–6 become one **Go Live** button once each has been verified in isolation. Nomadio never
auto-starts a stream.

## Apple Watch

Treated as a possible thin remote later (scene switch + "I'm in trouble" flag) through a
Shortcut hitting the REST API. Explicitly optional; the roadmap does not depend on it.

## A dedicated streaming phone (later)

If a second phone becomes the dedicated encoder, nothing in the architecture changes: it is
another publisher to the same ingest, and it posts device telemetry with a different `deviceId`.
`DeviceTelemetry` is therefore keyed by device from day one, and the dashboard renders a list of
devices rather than a single hardcoded phone.
