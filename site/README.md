# संकल्प लाइब्रेरी — study-room prototype

A room to sit in for a while, between revisions. Built in the shape of
[saloon.wtf](https://saloon.wtf): one illustration, a hidden YouTube player, a
custom UI over the top.

```bash
node serve.mjs
```

## What's here

| File | |
|---|---|
| `index.html` | The room (vector placeholder) + all UI |
| `styles.css` | Everything visual. Motion is deliberately slow — fast movement in a rest space reads as urgency |
| `player.js` | Hidden YouTube iframe via the IFrame Player API |
| `tracks.js` | Playlist, copy lines, presence endpoint — **the file you edit** |
| `ART.md` | The artwork brief. Read this first; the illustration is the product |
| `main.js` | Wiring: clock, timer, player, presence |

Outside this folder, and **deliberately not deployed**:

| | |
|---|---|
| `../presence-server/` | The Worker + Durable Object behind the online count. Deployed separately — if it sat inside `site/` its source would be served as a public static file |
| `../parked/ambience.js` | Synthesised room tone (fan, tubelight, rain). Unwired: it competed with the music rather than sitting under it. Move it back into `site/` and re-import in `main.js` to revive it |
| `../parked/art-sources/` | The original PNG/JPG renders, 4.4 MB. Only the AVIF/WebP conversions ship |

## Status

**Done and verified**

- Artwork, both orientations, 102 KB / 90 KB AVIF. See `ART.md`.
- 21 tracks loaded, titles pulled from YouTube's oEmbed API rather than guessed,
  and **all 21 verified embeddable** by running each through the real IFrame
  player and watching for error codes 101/150.
- Peace timer (15/25 min). Tapping the running chip cancels it. Ends quietly —
  the chip clears, "हो गया" shows for six seconds, the line becomes
  *बस। अब जो मन करे।* and holds for 90s so the rotation can't wipe it. **The
  music keeps playing**; cutting it at the buzzer would be the most jarring
  thing this page could do.
- Rotating lines, 45-second cycle, with a lock so timed messages stick.
- Player UI, degrading honestly when there are no tracks or no network.

**Deliberately not done**

- **The artwork.** The vector room is a placeholder and looks like one. See
  `ART.md` — this is the single highest-value thing left.
- **The playlist.** `tracks.js` is empty on purpose; guessing YouTube IDs points
  the page at whatever happens to live there, and this is a site for people
  having a hard year.
- **The presence counter is built but not deployed.** The server exists in
  `server/`; the UI stays hidden until `PRESENCE_ENDPOINT` in `tracks.js` points
  at it. Showing an invented number to someone who is lonely is the worst thing
  this page could do, so there is no fallback and no fake.

  ```bash
  cd presence-server && npx wrangler deploy
  ```

  Paste the printed `*.workers.dev` URL into `PRESENCE_ENDPOINT` and reload.

## Tone rules

The audience is under sustained pressure and a high chance of failure. Tone is
less forgiving here than with nostalgia.

- **Rest, never motivation.** No "you will clear it", no countdown to the exam,
  no topper quotes. That content exists in enormous supply; this is the other
  thing.
- **Never instruct.** Every line should sound like a friend, not a coach.
- **No ads, no upsell, no email capture.** Monetising this audience in this
  moment would read as exploitation, and correctly.
- Get one real aspirant to read every line before it ships.

## Before launch

- [ ] Real illustration in `assets/room.avif` (see `ART.md`)
- [ ] 8–15 tracks you have actually listened to at 1am
- [ ] Someone has listened to the playlist end-to-end on phone speakers
- [ ] An aspirant has read the copy and not winced
- [ ] Presence endpoint live, or the counter stays hidden
- [ ] Decide on the YouTube ToS question (see the note in `tracks.js`)
