// Music, via a hidden YouTube iframe driven by the IFrame Player API.
//
// This is the same approach saloon.wtf uses: no audio hosting, no licensing
// bill, and the whole catalogue available. The player chrome is ours; YouTube
// is only the transport.
//
// Known limits, all real:
//   • iOS Safari pauses iframe audio when the tab backgrounds, so this alone
//     will not survive a locked phone. The ambience layer covers that case.
//   • The API script is a network request, so music needs a connection even
//     though the room itself does not.
//   • See the ToS note in tracks.js.

const API_SRC = 'https://www.youtube.com/iframe_api';

function loadAPI() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (window.__ytApiPromise) return window.__ytApiPromise;

  window.__ytApiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = API_SRC;
    s.async = true;
    s.onerror = () => reject(new Error('YouTube API unavailable'));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error('YouTube API timed out')), 12000);
  });
  return window.__ytApiPromise;
}

export function createPlayer({ hostId, tracks, onChange }) {
  let yt = null, index = 0, ready = false, playing = false, failed = false;
  // `tracks` is reassigned by setTracks() when the mood changes, so everything
  // below reads it through the closure rather than capturing a snapshot.

  const current = () => tracks[index] || null;
  // A track may declare `start` (seconds) to skip an intro. Everything the UI
  // sees is relative to that, so a song beginning at 3:35 shows an empty
  // progress bar rather than one already two-thirds full.
  const emit = () => {
    const t = current();
    const from = t?.start || 0;
    const rawDur = ready && yt?.getDuration ? yt.getDuration() : 0;
    const rawPos = ready && yt?.getCurrentTime ? yt.getCurrentTime() : 0;
    onChange?.({
      track: t, index, ready, playing, failed,
      duration: Math.max(0, rawDur - from),
      position: Math.max(0, rawPos - from)
    });
  };

  async function init() {
    if (!tracks.length) { failed = true; emit(); return; }
    try {
      const API = await loadAPI();
      yt = new API.Player(hostId, {
        height: '1', width: '1',
        videoId: tracks[0].id,
        // Matches the reference: no chrome, no keyboard, no related videos.
        playerVars: {
          controls: 0, disablekb: 1, playsinline: 1,
          rel: 0, modestbranding: 1, iv_load_policy: 3,
          ...(tracks[0].start ? { start: tracks[0].start } : {})
        },
        events: {
          onReady: () => { ready = true; emit(); },
          onError: () => { next(); },
          onStateChange: (e) => {
            playing = e.data === API.PlayerState.PLAYING;
            if (e.data === API.PlayerState.ENDED) next();
            emit();
          }
        }
      });
    } catch {
      failed = true;
      emit();
    }
  }

  function load(i, autoplay) {
    if (!ready || !tracks.length) return;
    index = (i + tracks.length) % tracks.length;
    const t = tracks[index];
    const args = t.start ? { videoId: t.id, startSeconds: t.start } : { videoId: t.id };
    yt[autoplay ? 'loadVideoById' : 'cueVideoById'](args);
    emit();
  }

  const next = () => load(index + 1, true);
  const prev = () => load(index - 1, true);
  const playIndex = (i) => load(i, true);

  return {
    init,
    next, prev, playIndex,
    get index() { return index; },
    get tracks() { return tracks; },

    // Swap playlists in place. Keeps playing if it already was, so changing
    // mood mid-session doesn't dump you into silence — it just changes what
    // comes next.
    setTracks(list) {
      if (!list || !list.length) return;
      const wasPlaying = playing;
      tracks = list;
      index = 0;
      failed = false;
      if (ready) {
        const t = tracks[0];
        const args = t.start ? { videoId: t.id, startSeconds: t.start } : { videoId: t.id };
        yt[wasPlaying ? 'loadVideoById' : 'cueVideoById'](args);
      }
      emit();
    },
    toggle() {
      if (!ready) return;
      playing ? yt.pauseVideo() : yt.playVideo();
    },
    play() { if (ready) yt.playVideo(); },
    pause() { if (ready) yt.pauseVideo(); },

    // Scrub to a fraction (0–1) of the track.
    seek(fraction) {
      if (!ready || !yt.getDuration) return;
      const d = yt.getDuration();
      if (!d) return;
      const from = current()?.start || 0;
      const f = Math.max(0, Math.min(1, fraction));
      yt.seekTo(from + f * (d - from), true);
      emit();
    },

    // The URL of what is playing, for the "watch on YouTube" link.
    currentUrl() {
      const t = current();
      if (!t) return null;
      return t.start
        ? `https://www.youtube.com/watch?v=${t.id}&t=${t.start}s`
        : `https://www.youtube.com/watch?v=${t.id}`;
    },
    // YouTube starts a player muted in some autoplay paths, and setVolume on a
    // muted player changes a number nobody can hear. Unmute alongside it.
    setVolume(v) {
      if (!ready) return;
      yt.setVolume(Math.round(v * 100));
      if (v > 0 && yt.isMuted && yt.isMuted()) yt.unMute();
    },
    // Exposed so the actual player volume can be read back rather than assumed.
    getVolume() { return ready && yt.getVolume ? yt.getVolume() : null; },
    isMuted() { return ready && yt.isMuted ? yt.isMuted() : null; },
    poll() { if (ready) emit(); },
    get failed() { return failed; },
    get ready() { return ready; }
  };
}
