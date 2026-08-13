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

## Before it goes public

- [ ] Decide the YouTube ToS question — see the note in `site/tracks.js`
- [ ] Spot-check that the videos are embeddable from India (they were all
      verified embeddable, but from a US IP)
- [ ] An aspirant has read every line of copy and not winced
- [ ] No ads, no email capture, no upsell. This audience is under enough pressure
