// Note: ambience.js (the synthesised room tone — fan, tubelight, rain) is no
// longer wired in. It competed with the music rather than sitting under it. The
// module is still in the repo and works; re-import it here to bring it back.
import { createPlayer } from './player.js';
import { TRACKS, LINES, PLAYLIST_LINKS, PRESENCE_ENDPOINT } from './tracks.js';

const $ = (id) => document.getElementById(id);

/* ---------- artwork ---------- */
// The vector room is a placeholder; these replace it. See ART.md.
//
// Declared explicitly by orientation rather than probed by file extension. The
// earlier version tried .avif/.webp/.jpg/.png in order and picked whichever
// existed first — which meant a portrait file named .jpg beat the landscape
// .png, and desktop got a portrait image cropped to a letterbox slice.
// Extension was never the thing that mattered; shape is.
// Within an orientation the list is a FORMAT fallback, best first — that is
// safe, because every entry is the same picture at the same shape. What is not
// safe is falling back across orientations, which is what the old
// probe-by-extension version did.
// AVIF then WebP. The source PNGs are deliberately NOT shipped — they are 4.4 MB
// between them and live in parked/art-sources/. Every browser in use supports
// WebP, so the pair below is a complete fallback chain.
const ARTWORK = {
  landscape: ['./assets/room.avif', './assets/room.webp'],
  portrait:  ['./assets/room-portrait.avif', './assets/room-portrait.webp']
};

// A decodable file is not the same as a usable one. `sips` will happily emit an
// AVIF that is entirely black — valid container, correct dimensions, fires
// `onload` — and the page then shows nothing with no error anywhere. (Cause, for
// the record: an odd pixel width breaks chroma subsampling in the AV1 encoder.
// Re-encode at an even width.) So sample the decoded pixels before accepting it.
function looksBlank(img) {
  try {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 32;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, 32, 32);
    const d = g.getImageData(0, 0, 32, 32).data;
    let max = 0;
    for (let i = 0; i < d.length; i += 4) {
      const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (v > max) max = v;
    }
    return max < 8;              // the room is dark, but never *this* dark
  } catch {
    return false;                // canvas unavailable: trust the decode
  }
}

(function loadArtwork() {
  const img = $('roomPhoto');
  const portraitQ = matchMedia('(orientation: portrait)');
  let currentSrc = null;

  function pick() {
    const list = portraitQ.matches ? ARTWORK.portrait : ARTWORK.landscape;
    let i = 0;

    (function attempt() {
      if (i >= list.length) {
        console.warn('[artwork] no usable file; keeping the vector placeholder');
        return;
      }
      const src = list[i++];
      if (src === currentSrc) return;              // already showing it
      const probe = new Image();
      probe.onload = () => {
        if (looksBlank(probe)) {
          console.warn(`[artwork] ${src} decoded to a blank image — skipping`);
          attempt();
          return;
        }
        currentSrc = src;
        img.src = src;
        img.hidden = false;
        $('roomVector').style.display = 'none';
      };
      probe.onerror = attempt;
      probe.src = src;
    })();
  }

  pick();
  portraitQ.addEventListener('change', pick);
})();

/* ---------- clock ---------- */

function tickClock() {
  const d = new Date();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h < 12 ? 'am' : 'pm';
  h = h % 12 || 12;
  $('clock').textContent = `${h}:${m} ${ap}`;
}
tickClock();
setInterval(tickClock, 10000);

/* ---------- the rotating line ---------- */
// Slow. If it changes while you're reading it, it's nagging you.

let lineIndex = Math.floor(Math.random() * LINES.length);
let lineLockedUntil = 0;
$('line').textContent = LINES[lineIndex];

// `lockMs` holds a message in place against the rotation. Without it the timer's
// closing line would be silently replaced within 45 seconds — often before the
// person has looked back at the screen.
function setLine(text, lockMs = 0) {
  const el = $('line');
  if (lockMs) lineLockedUntil = Date.now() + lockMs;
  el.style.transition = 'opacity 1.2s';
  el.style.opacity = '0';
  setTimeout(() => { el.textContent = text; el.style.opacity = '1'; }, 1200);
}

setInterval(() => {
  if (Date.now() < lineLockedUntil) return;
  lineIndex = (lineIndex + 1) % LINES.length;
  setLine(LINES[lineIndex]);
}, 45000);

/* ---------- peace timer ---------- */
//
// What happens when it ends: nothing loud. The chip clears, the countdown is
// replaced by "हो गया" for a few seconds, and the line under the title changes
// to "बस। अब जो मन करे।" — that's it. No alarm, no chime, no "time's up, get
// back to work". Finishing a rest should not feel like being caught.
//
// The music keeps playing. Cutting it at the buzzer would be the single most
// jarring thing this page could do.

let timerEnd = null, timerHandle = null, activeBtn = null, finishHideHandle = null;

function startTimer(minutes, btn) {
  // Tapping the running chip again cancels it. This used to test for a
  // `was-active` class that was never set anywhere, so a timer could be
  // restarted but never stopped.
  if (activeBtn === btn) { stopTimer(); return; }

  stopTimer();
  timerEnd = Date.now() + minutes * 60000;
  activeBtn = btn;
  btn.classList.add('active');
  $('timer').hidden = false;
  timerHandle = setInterval(paintTimer, 1000);
  paintTimer();
}

function stopTimer() {
  timerEnd = null;
  clearInterval(timerHandle);
  timerHandle = null;
  clearTimeout(finishHideHandle);
  $('timer').hidden = true;
  activeBtn = null;
  document.querySelectorAll('#t15, #t25').forEach((b) => b.classList.remove('active'));
}

function finishTimer() {
  clearInterval(timerHandle);
  timerHandle = null;
  timerEnd = null;
  activeBtn = null;
  document.querySelectorAll('#t15, #t25').forEach((b) => b.classList.remove('active'));

  // Un-hide explicitly rather than assuming the countdown was already on screen —
  // otherwise "हो गया" is set on a hidden element and nobody ever sees it.
  $('timer').textContent = 'हो गया';
  $('timer').hidden = false;
  clearTimeout(finishHideHandle);
  finishHideHandle = setTimeout(() => { $('timer').hidden = true; }, 6000);

  setLine('बस। अब जो मन करे।', 90000);   // "That's it. Now whatever you feel like."
}

function paintTimer() {
  if (!timerEnd) return;
  const left = Math.max(0, timerEnd - Date.now());
  if (left === 0) { finishTimer(); return; }
  const m = Math.floor(left / 60000);
  const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  $('timer').textContent = `${m}:${s}`;
}

$('t15').addEventListener('click', (e) => startTimer(15, e.currentTarget));
$('t25').addEventListener('click', (e) => startTimer(25, e.currentTarget));

/* ---------- music ---------- */

const player = createPlayer({
  hostId: 'ytHost',
  tracks: TRACKS,
  onChange({ track, ready, playing, failed, duration, position }) {
    if (failed || !track) {
      $('trackTitle').textContent = TRACKS.length ? 'चल नहीं पाया' : 'कुछ नहीं चल रहा';
      $('trackArtist').textContent = TRACKS.length
        ? 'YouTube तक नहीं पहुँच पाए'
        : 'add track IDs in tracks.js';
      $('play').disabled = true;
      $('playerPill').style.opacity = '0.55';
      return;
    }
    $('trackTitle').textContent = track.title || '—';
    $('trackArtist').textContent = track.artist || '';
    $('play').textContent = playing ? '❚❚' : '▶';
    $('play').disabled = !ready;
    if (track.id) {
      const cover = $('cover');
      cover.src = `https://i.ytimg.com/vi/${track.id}/mqdefault.jpg`;
      cover.hidden = false;
    }
    $('progress').style.width = duration ? `${(position / duration) * 100}%` : '0%';
  }
});

player.init();
setInterval(() => player.poll(), 1000);

$('play').addEventListener('click', () => player.toggle());
$('next').addEventListener('click', () => player.next());
$('prev').addEventListener('click', () => player.prev());

if (PLAYLIST_LINKS.ytMusic) {
  const a = $('ytLink');
  a.href = PLAYLIST_LINKS.ytMusic;
  a.hidden = false;
}

/* ---------- presence ---------- */
// Stays hidden unless a real endpoint is configured. See tracks.js for why.

// Per-tab id, so a reload doesn't briefly count you twice. Two tabs open does
// count as two — a tab left open is a person sitting here, which is the thing
// being measured.
function sessionId() {
  let id = sessionStorage.getItem('sankalp.sid');
  if (!id) {
    id = (crypto.randomUUID?.() || String(Math.random()).slice(2));
    sessionStorage.setItem('sankalp.sid', id);
  }
  return id;
}

async function pollPresence() {
  if (!PRESENCE_ENDPOINT) return;
  try {
    const url = PRESENCE_ENDPOINT + (PRESENCE_ENDPOINT.includes('?') ? '&' : '?')
              + 'id=' + encodeURIComponent(sessionId());
    const res = await fetch(url, { cache: 'no-store' });
    const { count } = await res.json();
    if (typeof count !== 'number') return;
    $('onlineCount').textContent = count;
    $('presence').hidden = false;
  } catch {
    $('presence').hidden = true;    // never guess a number
  }
}
pollPresence();
// Must be comfortably under the server's 60s staleness window, or people get
// dropped from the count between their own heartbeats.
setInterval(pollPresence, 20000);

// Test hook, same pattern as the flight prototype.
window.__room = { player, startTimer, stopTimer, finishTimer, setLine };
