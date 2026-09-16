<p align="center">
  <img src="brand/marketing-banner.png" alt="NomadIO — I/O for creators on the move" width="860">
</p>

# NomadIO

You can't watch your own stream while you're in it. NomadIO watches from the receiving end and
answers, on your phone: am I live, is it good, what broke.

## Documentation

* [Overview](docs/00-overview.md) — hardware in scope, and the rules everything follows
* [Architecture](docs/01-architecture.md) — where each piece runs
* [Data availability](docs/02-data-availability.md) — what each device and API really exposes
* [Control surface](docs/03-control-surface.md) — what the phone can control, and what it can't
* [Roadmap](docs/04-roadmap.md) — build order
* [Brand](docs/05-brand.md) — name, mark, voice
* [Design notes](docs/06-design-notes.md) — why this differs from the original sketch
* [Design system](docs/07-design-system.md) — tokens, contrast, components
* [Install](docs/08-install.md) — ingest, tunnel, login, phone
* [DESIGN.md](DESIGN.md) — the short version, at the root

## Why it's worth building

A dropped IRL stream costs you twice. The viewers who leave during the dead minutes don't come
back that session, and you keep walking and talking for ten more, because the phone is still
showing a camera preview and a green light. The gap between "my stream broke" and "I know my
stream broke" is the expensive part, and it's a monitoring problem, not a bandwidth one.

The alternatives are a four-figure bonding encoder, a laptop in a backpack, or a friend watching
and texting you. NomadIO is for the person with an iPhone, a mount, a mic and one SIM, and it
costs a container on a machine they already own.

It is not an encoder, a bonder or a mixer — those markets are served. It's the instrument panel
across all of them, which is also the natural place to later put the controls and the overlay.

## Install and run

Locally, on mock data:

```bash
cp .env.example .env && npm install && npm run dev    # API :4000, dashboard :3000
```

Against a real rig:

```bash
cp .env.example .env
openssl rand -hex 24          # into API_TOKEN, and again into TELEMETRY_TOKEN
docker compose up -d --build  # or podman compose
```

That gives you MediaMTX on SRT `:8890`, the collector reading its stats, and the dashboard on
`:3000`. Point Larix or Moblin at `srt://<host>:8890?streamid=publish:live:<user>:<pass>`; OBS
reads the same path.

From outside the house, use a Cloudflare or Tailscale tunnel — never a port-forward. `API_TOKEN`
is mandatory the moment anything off-LAN can reach the collector. For a GitHub login, use
Cloudflare Access rather than code in here.

Full walkthrough, including verifying the stats fields before trusting them:
[docs/08-install.md](docs/08-install.md).

## Roadmap

**1. Viewer** — where it is now. Live or not, bitrate, FPS, latency, loss, dropped frames, every
outage with its duration, data used, phone battery. A go-live checklist, and a button that
timestamps a moment worth cutting to later. It reads and warns; it never touches the stream.

**2. Connected** — two SIMs and a bonding box, so you can see which link is carrying the stream
and when it failed over. Alongside it, the home OBS: scenes, audio levels, encoder drops.

**3. Control** — switch scene, go BRB, start and stop the broadcast, from the phone on your
chest. Your own OBS or a hosted one; YouTube, Twitch or Kick. Swapping any of them is config.

**4. Context** — route, ascent, speed and altitude on the overlay. Precise location is off by
default: a live map of where you're standing is not something to enable by accident.

**5. Agentic** — the long one, and possibly nonsense. Quality stepped down before a drop rather
than after, markers cut into clips, descriptions drafted, uploads scheduled. Every layer under
it stands on its own.

Out of scope on purpose: reimplementing bonding, DJI Mini 4 telemetry, audio processing.

## Stack

React and Vite for the PWA, Node and Fastify for the collector, one zod contract shared by both,
and one provider per vendor so Speedify, OBS and YouTube are each swappable.

```bash
docker compose up --build     # or podman compose
npm test && npm run typecheck
```

## License

Source-available, not open source. Read and evaluate it freely; real use needs permission, so
[ask](https://github.com/thevangelist/nomadio/issues). See [LICENSE](LICENSE).

<sub>Greek <em>nomás</em> (νομάς), a herder who keeps moving, plus I/O.</sub>
