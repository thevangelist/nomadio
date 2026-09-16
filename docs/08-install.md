# Installing it for real

Three pieces, and you can stop after any of them.

```
iPhone ──SRT──► ingest + backend (a machine you own) ──► dashboard (anywhere)
                        │
                       OBS
```

## 1. The machine that receives the stream

Anything always-on that the phone can reach: the home PC next to OBS, a mini PC, a Pi 5, or a
small VPS. It runs two containers and, if you do not already have an ingest, a third.

```bash
git clone https://github.com/thevangelist/nomadio && cd nomadio
cp .env.example .env
openssl rand -hex 24          # paste into API_TOKEN, and again for TELEMETRY_TOKEN
docker compose up -d --build  # or: podman compose up -d --build
```

That gives you MediaMTX on SRT `:8890` and RTMP `:1935`, the backend reading its stats API, and
the dashboard on `:3000`.

Point the phone at it. In Larix Broadcaster or Moblin, add a connection:

```
srt://<host>:8890?streamid=publish:live:<INGEST_USER>:<INGEST_PASS>
```

In OBS, add a Media Source with `srt://<host>:8890?streamid=read:live` and push to YouTube from
there. Or skip OBS entirely and let MediaMTX republish.

**Verify the numbers before trusting them.** MediaMTX has renamed stats fields between releases:

```bash
curl -s localhost:9997/v3/paths/get/live | jq
curl -s localhost:9997/v3/srtconns/list  | jq '.items[0]'
```

If `mbpsReceiveRate`, `msRTT` or `packetsReceivedLoss` are missing or spelled differently, the
dashboard shows `—` rather than a wrong number — fix the names in
`apps/backend/src/providers/stream/mediamtx.ts` and add a case to its test.

## 2. Reaching it from outside the house

The API must not sit on a port-forward. Use a tunnel:

```bash
tailscale up                    # then use the tailnet name as the host
# or
cloudflared tunnel --url http://localhost:4000
```

`API_TOKEN` is required as soon as anything outside the LAN can reach the backend. It is accepted
as `Authorization: Bearer <token>`, and as `?token=` on the WebSocket, which cannot carry headers.
Without it the backend starts but logs a warning on every boot.

### Logging in with GitHub instead of a token

Worth doing, and worth not writing yourself. Two managed options give you a GitHub login without
a line of auth code in this repo:

- **Cloudflare Access** in front of the tunnel, with GitHub as the identity provider. It protects
  the API, the WebSocket and the dashboard, and only your GitHub account gets through.
- **Vercel Authentication** on the dashboard project, which gates it behind the Vercel account you
  already log into with GitHub. This covers the page, not the API, so pair it with Access or the
  token on the backend.

The shared token stays regardless, because the phone's Shortcut is a machine and cannot complete
an OAuth flow. Treat it as the device credential and the GitHub login as the human one.

Rolling our own GitHub OAuth would mean sessions, cookies, a callback route and a refresh path in
a service whose whole job is to keep working on a bad link — more moving parts than the thing it
protects. If it ever ships, it belongs behind the same `createAuthHook` seam that the token uses.

## 3. The dashboard

Any static host — it is a plain Vite bundle that reads its API address at runtime.

```bash
vercel --prod                  # repo root; vercel.json already points at apps/frontend/dist
```

Then edit `public/config.json` (or a Vercel rewrite) to point at the tunnel:

```json
{ "apiBase": "https://nomadio.your-tunnel.example" }
```

**Vercel's own SSO breaks PWA install.** Deployment Protection redirects every request to
`vercel.com/sso-api`, which is a different origin, so the browser's `manifest.webmanifest` and
service-worker fetches fail CORS and the page cannot be installed to the home screen. The login
itself works; only the PWA parts do not. Put the dashboard behind **Cloudflare Access** on your
own hostname instead — the session cookie is first-party there, so the manifest loads and the app
installs. Or keep Vercel for a desktop tab and use the collector's own nginx for the phone.

On Vercel Pro, two things are worth doing: put the project behind **Vercel Authentication** so the
dashboard is not public, and add a **rewrite** from `/api/:path*` to the tunnel host. That makes
the dashboard same-origin with its API, so `apiBase` stays empty, no CORS is involved and the
token never has to travel in a query string.

Self-hosting instead: `docker compose up` already serves the bundle from nginx with `/api` proxied
to the backend, so the same single-origin setup works with no Vercel at all.

## 4. The phone

Open the dashboard, Share, Add to Home Screen. For battery, build the Shortcut described in the
Setup tab: Battery Level, then Get Contents of URL POSTing to `/api/v1/telemetry` with the
telemetry token.

## What is still missing

Nothing persists across a backend restart: session, outage log and markers are in memory. There
are no push notifications, so warnings are only visible with the screen on. Both are on the list
before this is a tool rather than an instrument.
