// Note: ambience.js (the synthesised room tone — fan, tubelight, rain) is no
// longer wired in. It competed with the music rather than sitting under it. The
// module is still in the repo and works; re-import it here to bring it back.
import { createPlayer } from './player.js';
import { MOODS, LINES, PLAYLIST_LINKS, PRESENCE_ENDPOINT, SUGGEST_EMAIL } from './tracks.js';
import { THEMES, READY } from './themes.js';

const $ = (id) => document.getElementById(id);

/* ---------- artwork ---------- */
//
// There is no <img> any more: the room is a CSS background chosen by
// [data-theme], set by the inline script in index.html before first paint. That
// is what keeps exactly one image downloaded and no wrong-image flash.
//
// The old runtime "is this AVIF actually black?" guard went with it — you cannot
// sample a background's pixels without fetching the file a second time. The
// failure it caught is real but belongs at encode time, so it is documented in
// ART.md instead: encode at an EVEN pixel width or sips emits a valid, entirely
// black AVIF.

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

const savedMood = (() => {
  try { return localStorage.getItem('sankalp.mood'); } catch { return null; }
})();
let mood = MOODS[savedMood] ? savedMood : 'josh';
let wasPlaying = false;

const player = createPlayer({
  hostId: 'ytHost',
  tracks: MOODS[mood].tracks,
  onChange({ track, ready, playing, failed, duration, position }) {
    if (failed || !track) {
      const n = MOODS[mood].tracks.length;
      $('trackTitle').textContent = n ? 'चल नहीं पाया' : 'कुछ नहीं चल रहा';
      $('trackArtist').textContent = n
        ? 'YouTube तक नहीं पहुँच पाए'
        : 'add track IDs in tracks.js';
      $('play').disabled = true;
      $('playerPill').style.opacity = '0.55';
      return;
    }
    $('trackTitle').textContent = track.title || '—';
    $('trackArtist').textContent = track.artist || '';
    // Close the list when playback STARTS — on the false→true edge only.
    // Testing `playing` alone closed it on every poll tick, so opening the list
    // while music was already running shut it again a second later: a blink.
    if (playing && !wasPlaying && !$('tracklist').hidden) toggleList(false);
    wasPlaying = playing;

    $('play').textContent = playing ? '❚❚' : '▶';
    $('play').disabled = !ready;
    if (track.id) {
      const cover = $('cover');
      cover.src = `https://i.ytimg.com/vi/${track.id}/mqdefault.jpg`;
      cover.hidden = false;
    }
    $('progress').style.width = duration ? `${(position / duration) * 100}%` : '0%';

    if (!$('tracklist').hidden) {
      $('tracklist').querySelectorAll('button[data-i]').forEach((b) => {
        b.setAttribute('aria-selected', String(+b.dataset.i === player.index));
      });
    }

    // Top-right link opens whatever is playing, the way saloon.wtf links out to
    // its playlist. Pointing at the current track rather than a playlist means
    // there is nothing to maintain and it is never out of date.
    const url = player.currentUrl();
    if (url && !$('ytLink').dataset.pinned) {
      $('ytLink').href = url;
      $('ytLink').hidden = false;
    }
  }
});

player.init();
setInterval(() => player.poll(), 1000);

// Scrub by clicking or dragging the progress bar. The bar itself is only 3px,
// so the hit target is its wrapper, which is padded out in CSS.
const barWrap = document.querySelector('.bar-wrap');
function seekFromEvent(e) {
  const r = barWrap.getBoundingClientRect();
  player.seek((e.clientX - r.left) / r.width);
}
barWrap.addEventListener('pointerdown', (e) => {
  barWrap.setPointerCapture(e.pointerId);
  seekFromEvent(e);
});
barWrap.addEventListener('pointermove', (e) => {
  if (barWrap.hasPointerCapture(e.pointerId)) seekFromEvent(e);
});

/* ---------- the playlist ---------- */
// Only the current track was ever visible, so there was no way to know what
// else was in the set. Hidden by default — 23 rows permanently on screen would
// swamp the photograph.

function renderList() {
  const list = $('tracklist');
  const tracks = MOODS[mood].tracks;
  list.innerHTML = tracks.map((t, i) => `
    <button role="option" data-i="${i}" aria-selected="${i === player.index}">
      <span class="n">${i + 1}</span>
      <span class="t">${t.title}</span>
      <span class="a">${t.artist || ''}</span>
    </button>`).join('');
}

function toggleList(force) {
  const list = $('tracklist');
  const open = force !== undefined ? force : list.hidden;
  if (open) renderList();
  list.hidden = !open;
  $('listToggle').setAttribute('aria-expanded', String(open));
  if (open) list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}

$('listToggle').addEventListener('click', () => toggleList());
$('tracklist').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-i]');
  if (!b) return;
  player.playIndex(+b.dataset.i);
  toggleList(false);
});

$('play').addEventListener('click', () => player.toggle());
$('next').addEventListener('click', () => player.next());
$('prev').addEventListener('click', () => player.prev());

// PLAYLIST_LINKS is still honoured, but only as an override — if you make a
// real YT Music playlist, that wins over the per-track link.
if (PLAYLIST_LINKS.ytMusic) {
  const a = $('ytLink');
  a.href = PLAYLIST_LINKS.ytMusic;
  a.textContent = 'YT Music ↗';
  a.hidden = false;
  a.dataset.pinned = 'true';
}

/* ---------- song suggestions ---------- */
// A footer link rather than something inside the playlist panel. Buried in the
// list it needed two interactions to find, and nobody opens a track list in
// order to suggest a track — the thought arrives on its own.

if (SUGGEST_EMAIL) {
  const a = $('suggest');
  const subject = encodeURIComponent('संकल्प — गाना सुझाव');
  // Prefilled, because a bare "add this song" with no link and no reason is
  // not actionable.
  const body = encodeURIComponent('ये गाना डाल दीजिए:\n\nYouTube link: \n\nक्यों: \n');
  a.href = `mailto:${SUGGEST_EMAIL}?subject=${subject}&body=${body}`;
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

    // The count includes you. Showing "1 साथ में" to someone sitting alone at
    // 3am says "you are the only one here" — the exact opposite of the point.
    // Below two people, say nothing at all; silence is kinder than a 1.
    if (count < 2) {
      $('presence').hidden = true;
      return;
    }
    $('onlineCount').textContent = count;
    $('presence').hidden = false;
  } catch {
    $('presence').hidden = true;    // never guess a number
  }
}
pollPresence();
// Must be comfortably under the server's 150s staleness window, or people get
// dropped from the count between their own heartbeats. Kept at 60s rather than
// anything tighter because every beat costs a Durable Object request against a
// 1M/month free tier — see the note in presence-server/presence-worker.js.
setInterval(pollPresence, 60000);

/* ---------- mood ---------- */

function paintMood() {
  document.querySelectorAll('#moods .segbtn').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.mood === mood));
  });
}

document.getElementById('moods').addEventListener('click', (e) => {
  const btn = e.target.closest('.segbtn');
  if (!btn || btn.dataset.mood === mood) return;
  mood = btn.dataset.mood;
  try { localStorage.setItem('sankalp.mood', mood); } catch {}
  paintMood();
  player.setTracks(MOODS[mood].tracks);
  if (!$('tracklist').hidden) renderList();
});
paintMood();

/* ---------- theme ---------- */
//
// The inline script in index.html has already applied a theme before first
// paint. This only builds the picker.
//
// It lists THEMES marked `ready` rather than probing for the files. Probing
// meant three or four 404s on every single load, and it could not help the
// initial pick anyway — that has to happen synchronously before paint.

const SCRIM = Object.fromEntries(THEMES.map((t) => [t.id, t.scrim]));

const PLACE = Object.fromEntries(THEMES.map((t) => [t.id, t.place || 'लाइब्रेरी']));

function applyTheme(id, remember) {
  document.documentElement.dataset.theme = id;
  document.documentElement.dataset.scrim = SCRIM[id] || 'dark';
  // The second line of the title is the place, not part of the name. "संकल्प
  // लाइब्रेरी" over a photograph of a park is the kind of small wrongness people
  // notice without being able to say why, so the park calls itself संकल्प पार्क.
  $('place').textContent = PLACE[id] || 'लाइब्रेरी';
  if (remember) { try { localStorage.setItem('sankalp.theme', id); } catch {} }
  document.querySelectorAll('#themes .segbtn').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.theme === id));
  });
}

$('place').textContent = PLACE[document.documentElement.dataset.theme] || 'लाइब्रेरी';

(function buildThemeMenu() {
  // One theme is just the current state of things — nothing to switch between.
  if (READY.length < 2) return;

  const btn = $('themeCycle');
  const menu = $('themeMenu');

  const paint = () => {
    const id = document.documentElement.dataset.theme;
    const cur = READY.find((t) => t.id === id) || READY[0];
    btn.textContent = cur.label;
    menu.querySelectorAll('button').forEach((b) => {
      b.setAttribute('aria-selected', String(b.dataset.theme === id));
    });
  };

  menu.innerHTML = READY.map((t) =>
    `<button role="option" data-theme="${t.id}">${t.label}</button>`).join('');
  btn.hidden = false;
  paint();

  const open = (yes) => {
    menu.hidden = !yes;
    btn.setAttribute('aria-expanded', String(yes));
  };

  btn.addEventListener('click', (e) => { e.stopPropagation(); open(menu.hidden); });
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-theme]');
    if (!b) return;
    applyTheme(b.dataset.theme, true);
    paint();
    open(false);
  });
  // Tapping anywhere else closes it — a popover you cannot dismiss by looking
  // away is worse than no popover.
  document.addEventListener('click', () => { if (!menu.hidden) open(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') open(false); });
})();

// Test hook, same pattern as the flight prototype.
window.__room = { player, startTimer, stopTimer, finishTimer, setLine, applyTheme, get mood() { return mood; } };
