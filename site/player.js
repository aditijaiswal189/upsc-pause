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
  const emit = () => onChange?.({
    track: current(), index, ready, playing, failed,
    duration: ready && yt?.getDuration ? yt.getDuration() : 0,
    position: ready && yt?.getCurrentTime ? yt.getCurrentTime() : 0
  });

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
          rel: 0, modestbranding: 1, iv_load_policy: 3
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
    yt[autoplay ? 'loadVideoById' : 'cueVideoById'](tracks[index].id);
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
        yt[wasPlaying ? 'loadVideoById' : 'cueVideoById'](tracks[0].id);
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
      yt.seekTo(Math.max(0, Math.min(1, fraction)) * d, true);
      emit();
    },

    // The URL of what is playing, for the "watch on YouTube" link.
    currentUrl() {
      const t = current();
      return t ? `https://www.youtube.com/watch?v=${t.id}` : null;
    },
    setVolume(v) { if (ready) yt.setVolume(Math.round(v * 100)); },
    poll() { if (ready) emit(); },
    get failed() { return failed; },
    get ready() { return ready; }
  };
}
