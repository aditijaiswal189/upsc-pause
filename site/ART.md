# The artwork

**This is the product.** Everything else in this folder is about 400 lines of
plumbing. The illustration is what makes someone stop and send the link.

The vector room currently on screen is a **placeholder**. It's flat SVG, and flat
SVG reads as a diagram no matter how much is piled onto it — every edge is equally
sharp, every surface is a solid fill. Saloon.wtf doesn't do this. Its entire visual
is a single raster illustration, `bg.avif`, 365 KB, with painterly texture and real
lighting. That's why it feels like a place.

## Two images, not one

A single image cannot serve both shapes. A landscape picture on a phone crops to a
narrow vertical slot; a portrait picture on a desktop crops to a letterbox band with
the desk pushed off the bottom. So the page loads **artwork by orientation**,
declared in `main.js`:

```
landscape (desktop)   assets/room.avif  →  .webp  →  .png
portrait  (phones)    assets/room-portrait.avif  →  .webp  →  assets/room.jpg
```

Within an orientation the list is a *format* fallback — same picture, same shape,
best format first. It never falls back across orientations, which is the mistake the
first version made: it probed by file extension, so a portrait `.jpg` beat the
landscape `.png` and desktop got a letterboxed slice.

The page applies its own vignette, title scrim and bottom gradient, so don't bake
those in — a raw generated image is almost always too bright and too evenly lit for
text to sit on.

## Specs

| | |
|---|---|
| Landscape | 3:2 (1536×1024 or better) |
| Portrait | 2:3 (1024×1536 or better) |
| Crop safety | `object-fit: cover` at `50% 62%`. Keep the desk and its objects centred and low |
| Empty zone | Upper middle must stay dark and uncluttered; the title sits there |
| Weight | Under ~150 KB each once converted |
| Mood | Night. Dark. Warm pools of light, deep blue shadows |

## Compressing

`sips` (built into macOS) and `cwebp` both work; the PNG straight out of a model is
typically 2 MB+, which is 6× saloon.wtf's entire background.

```bash
sips -s format avif -s formatOptions 65 room.png --out room.avif
cwebp -q 72 room.png -o room.webp
```

Measured: 2197 KB PNG → **102 KB AVIF** landscape, 2005 KB → **90 KB** portrait,
both visually identical to the source.

### ⚠ Encode at an EVEN pixel width

`sips` will silently emit an **entirely black AVIF** if the source width is odd —
1023 px did it here. The file is a valid container with the right dimensions, so the
browser decodes it happily and fires `onload`; the page just shows nothing, with no
error in the console. It cost a while to find.

Resize to an even width first:

```bash
sips -z 1536 1022 potrait.png --out even.png
sips -s format avif -s formatOptions 65 even.png --out room-portrait.avif
```

The loader now samples the decoded pixels and rejects anything that comes back
blank, falling through to the next format — so this can't ship silently again. But
check the console for `[artwork] … decoded to a blank image` after any re-encode.

## The spare files

`assets/room.jpg` is an earlier portrait render that carries a visible **"Grok"
watermark** bottom-right. It is no longer referenced by the loader. Delete it, or
keep it as a spare — but never promote it back into `ARTWORK` without cropping the
watermark out first.

## The prompt

Written for a photorealistic-illustration model. Adjust the last line for whichever
you use.

> Cinematic interior of a small Indian self-study library at night, viewed from a
> student's own desk in first person. Foreground: a worn dark wooden desk edge with
> an open ruled notebook, a stack of thick used textbooks, steel-rimmed spectacles
> folded on the desk, a glass tumbler of chai with faint steam, a pen lying across
> the page. A metal gooseneck desk lamp on the right throws a warm amber pool of
> light across the notebook. Middle ground: rows of numbered wooden study cubicles
> receding into darkness, two or three still occupied by hunched silhouetted
> figures, each lit by its own small lamp. Background: a barred window with monsoon
> rain streaking down the glass, blurred orange sodium city lights of Delhi beyond,
> a slow ceiling fan overhead, a flickering tubelight on the far wall. Muted palette
> of deep blues and warm amber, strong chiaroscuro, shallow depth of field, heavy
> film grain, painterly, quiet, melancholy, lived-in, no text, faces not visible.

**Negative / avoid:** cartoon, anime, vector, flat illustration, clean, bright,
modern, minimalist, corporate, text, watermark, logos, readable book titles,
identifiable faces.

### Variants worth generating

Generate several and pick by feel, then consider shipping two or three that rotate
by time of day — cheap variety, and the reference does something similar with its
track art.

- **11pm** — the default above. Deepest, most alone.
- **4am** — the tubelight is the only light left, the window is going grey-blue,
  one other desk still occupied.
- **Monsoon evening** — heavier rain, the window fogged, the room warmer.

### Recognition details to insist on

These are the things that make an aspirant say *someone actually knows*. They matter
more than the render quality:

- **Numbered seat plate** on the desk or partition (सीट १४)
- **Other desks still occupied** — this is the loneliness the presence counter
  speaks to, and it's the emotional centre of the picture
- **Thick used textbooks**, spines cracked, not neat new hardbacks
- **Glass tumbler** of chai, not a mug
- **Ceiling fan and tubelight** — not recessed downlights
- **Barred window** — Indian, not a Scandinavian study nook

If the image comes back looking like a Pinterest study desk, it has failed, however
beautiful it is. The point is a specific room in Old Rajinder Nagar at 11pm, not an
aesthetic.

## If you commission instead

An illustrator will do better than a model on the recognition details, because they
can be told about ORN. Budget for one image and iterate on lighting; the composition
above is already blocked out in the SVG placeholder if they want a reference.
