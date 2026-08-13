# संकल्प लाइब्रेरी

A study room you can sit in, for UPSC aspirants. One illustration, a playlist, a
timer.

```
site/               ← the deployable static site. Nothing else goes to the CDN.
presence-server/    ← Cloudflare Worker + Durable Object for the online count
parked/             ← kept, not shipped: art sources, the unused ambience engine
serve.mjs           ← dev server
```

## Run locally

```bash
node serve.mjs
```

http://localhost:5180

## Deploy the site

Deploy **`site/` only**. It is ~444 KB total, and it is plain static files — no
build step, no framework, no bundler.

```bash
npx wrangler@latest pages deploy site --project-name=sankalp --branch=main
```

`--branch=main` matters: any other branch name produces a preview deploy at a
hashed, per-deploy URL.

Netlify works the same way:

```bash
npx netlify-cli deploy --dir site --prod
```

## Deploy the online counter

Separate deploy, because it is a Worker rather than a static file — and because
its source must never be served publicly.

```bash
cd presence-server && npx wrangler deploy
```

Paste the printed `*.workers.dev` URL into `PRESENCE_ENDPOINT` in
`site/tracks.js`, then redeploy the site. Until then the counter stays hidden —
there is no fake number.

## Editing

| Want to change | File |
|---|---|
| Songs | `site/tracks.js` → `TRACKS` |
| The rotating lines | `site/tracks.js` → `LINES` |
| The artwork | `site/assets/` — read `site/ART.md` first |
| Layout, scrims, dock | `site/styles.css` |

## Share card & analytics

**The share card is the SEO that matters here.** Nobody searches for this — it
travels by someone pasting the link into a WhatsApp group or on X, and the
preview decides whether anyone taps it. `site/assets/og.jpg` (1200×630) plus the
Open Graph and Twitter tags in `index.html` handle that.

After the first deploy, check the card actually renders:

- paste `https://upsc-pause.wtf` into a WhatsApp chat with yourself
- <https://www.opengraph.xyz/> for X / LinkedIn / Facebook previews at once

Caches are aggressive — if you change `og.jpg`, rename it (`og-2.jpg`) and update
the tags, or the old one keeps showing for days.

**Analytics is Vercel Web Analytics**, wired via two script tags in
`index.html`. It is cookieless, so no consent banner — which matters on a page
whose whole promise is that it asks nothing of you.

> ⚠ It only works once you **enable Analytics in the Vercel dashboard**
> (Project → Analytics → Enable). Until then `/_vercel/insights/script.js`
> 404s and no data is collected.

Two different numbers, easy to confuse:

| | |
|---|---|
| **Vercel Analytics** | how many people *have* visited — totals, over time |
| **The presence counter** | how many are on the page *right now* — that's `presence-server/`, and it's what "N साथ में" shows |

## What this costs

Nothing, at the scale it starts at.

| | Free tier | What we use |
|---|---|---|
| Vercel Hobby | static hosting, 100 GB bandwidth/mo | `site/` is 444 KB + a 187 KB card |
| Vercel Web Analytics | included on Hobby | 1.1 KB script |
| Cloudflare Workers | 100k requests/day | 1 per heartbeat |
| Cloudflare Durable Objects | **1M requests/mo**, 400k GB-s | 1 per heartbeat |
| DO SQLite storage | not billed on free plan | none — the count is in memory |

**The Durable Object cap is the one that binds**, at roughly 33k requests/day.
Each open tab sends one heartbeat a minute, so a 30-minute session costs ~30
requests → about **1,100 sessions/day** before the monthly cap.

That is the whole reason the heartbeat is 60s and not 20s. At 20s the ceiling
was ~370 sessions/day, which a single decent tweet would blow through.

If it outgrows that, Workers Paid is $5/month and lifts the cap enormously —
and at that point you have thousands of aspirants using it, which is the good
version of this problem. Nothing breaks silently in the meantime: if the counter
is rate-limited the fetch fails and the indicator just hides itself.

## Before it goes public

- [ ] Decide the YouTube ToS question — see the note in `site/tracks.js`
- [ ] Spot-check that the videos are embeddable from India (they were all
      verified embeddable, but from a US IP)
- [ ] An aspirant has read every line of copy and not winced
- [ ] Web Analytics enabled in the Vercel dashboard
- [ ] Share card checked in WhatsApp and on opengraph.xyz
- [ ] No ads, no email capture, no upsell. This audience is under enough pressure
