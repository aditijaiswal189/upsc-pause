// The room's own sound — synthesised, no audio files.
//
// Ported from the flight prototype's mixer. Same reasoning: zero payload, zero
// licensing risk, never loops, and unlike a YouTube iframe it keeps working on
// a phone with the screen off.
//
// This is the layer that makes it a room rather than a playlist. The music can
// come and go; the fan stays on.

function fillWhite(d) { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

function fillBrown(d) {
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    d[i] = last * 3.5;
  }
}

function fillPink(d) {
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
    b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
    b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
    d[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) * 0.11;
    b6 = w * 0.115926;
  }
}

const FILLERS = { white: fillWhite, brown: fillBrown, pink: fillPink };

function noiseBuffer(ctx, seconds, type) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  FILLERS[type](buf.getChannelData(0));
  return buf;
}

// Exported separately so the graph can be rendered into an OfflineAudioContext
// and measured — no speakers and no user gesture required.
export function buildGraph(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  master.connect(analyser);
  master.connect(ctx.destination);

  const bq = (type, freq, Q = 1) => {
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = Q;
    return f;
  };

  const brown = noiseBuffer(ctx, 6, 'brown');
  const pink  = noiseBuffer(ctx, 6, 'pink');
  const white = noiseBuffer(ctx, 4, 'white');

  const layer = (buf, filters, gainValue) => {
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    let tail = src;
    for (const f of filters) { tail.connect(f); tail = f; }
    tail.connect(gain);
    gain.connect(master);
    src.start();
    return { src, gain };
  };

  const lfo = (freq, depth, target) => {
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = freq;
    const amt = ctx.createGain();
    amt.gain.value = depth;
    o.connect(amt); amt.connect(target);
    o.start();
    return o;
  };

  // 1 — Ceiling fan. The wobble is the whole identity: a 250 rpm fan turns
  // ~4.2 times a second, and that slow pulsing in the air noise is what your
  // ear recognises as "fan" rather than "hiss".
  const fanAir = layer(pink, [bq('lowpass', 900, 0.7)], 0.20);
  lfo(4.2, 0.055, fanAir.gain.gain);
  const fanRumble = layer(brown, [bq('lowpass', 95, 0.8)], 0.34);

  // 2 — Tubelight. Mains hum is 50 Hz in India and the choke buzzes at twice
  // that. Barely audible on purpose; you notice it only when it stops.
  const tube = ctx.createGain();
  tube.gain.value = 0.014;
  tube.connect(master);
  [50, 100, 150].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 1 ? 'sawtooth' : 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = i === 1 ? 0.5 : (i === 2 ? 0.12 : 1);
    o.connect(g); g.connect(tube);
    o.start();
  });

  // 3 — The city outside, swelling and receding.
  const traffic = layer(brown, [bq('lowpass', 320, 0.6)], 0.10);
  lfo(0.045, 0.045, traffic.gain.gain);

  // 4 — Rain on the window. Off unless asked for.
  const rain = layer(white, [bq('bandpass', 1800, 0.45), bq('lowpass', 5000, 0.7)], 0);
  const rainLow = layer(brown, [bq('bandpass', 400, 0.6)], 0);

  // 5 — General room tone, so silence never feels like a dead line.
  const room = layer(pink, [bq('lowpass', 3200, 0.6), bq('highpass', 180, 0.5)], 0.035);

  return {
    ctx, master, analyser,
    layers: { fanAir, fanRumble, traffic, rain, rainLow, room },
    tube
  };
}

/* ---------- occasional sounds ---------- */

const rnd = (a, b) => a + Math.random() * (b - a);

// A page turning two desks away.
export function pageTurn(g, when = 0) {
  const { ctx, master } = g;
  const t = ctx.currentTime + when;
  const len = Math.floor(ctx.sampleRate * 0.4);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    // Two brushes: the lift, then the settle.
    const env = Math.exp(-p * 9) * (1 + 0.7 * Math.sin(p * 22));
    d[i] = (Math.random() * 2 - 1) * env * 0.5;
  }
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.7;
  // The 2.6 kHz bandpass discards most of the burst's energy and the room bed is
  // loud, so this needs a gain far above 1 to be heard at all. Calibrated by
  // measurement to sit ~3 dB over the bed in its window: present, not startling.
  const gn = ctx.createGain(); gn.gain.value = 1.75;
  src.connect(f); f.connect(gn); gn.connect(master);
  src.start(t);
}

// Someone shifting in a plastic chair.
export function chairCreak(g, when = 0) {
  const { ctx, master } = g;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(rnd(110, 160), t);
  o.frequency.exponentialRampToValueAtTime(rnd(60, 90), t + 0.45);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 3;
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(0.68, t + 0.05);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(f); f.connect(gn); gn.connect(master);
  o.start(t); o.stop(t + 0.6);
}

// A horn, far enough away to be part of the quiet.
export function distantHorn(g, when = 0) {
  const { ctx, master } = g;
  const t = ctx.currentTime + when;
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, t);
  bus.gain.exponentialRampToValueAtTime(0.48, t + 0.08);
  bus.gain.setValueAtTime(0.48, t + 0.3);
  bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.7;
  f.connect(bus); bus.connect(master);
  [330, 415].forEach((hz) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = hz * rnd(0.97, 1.03);
    const g2 = ctx.createGain(); g2.gain.value = 0.5;
    o.connect(g2); g2.connect(f);
    o.start(t); o.stop(t + 0.8);
  });
}

/* ---------- controller ---------- */

export function createAmbience() {
  let g = null, volume = 0.62, enabled = false, rainOn = false;
  let nextEvent = rnd(25, 70);

  const ramp = (param, value, seconds = 0.4) => {
    if (!g) return;
    const t = g.ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setTargetAtTime(value, t, Math.max(0.01, seconds / 3));
  };

  return {
    get ready() { return !!g; },
    get enabled() { return enabled; },
    get graph() { return g; },
    get raining() { return rainOn; },

    async enable() {
      if (!g) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        g = buildGraph(new AC());
      }
      if (g.ctx.state !== 'running') await g.ctx.resume();
      enabled = true;
      ramp(g.master.gain, volume, 2.4);      // long fade — nothing here starts abruptly
      return g.ctx.state === 'running';
    },

    async disable() {
      if (!g) return;
      enabled = false;
      ramp(g.master.gain, 0, 1.2);
    },

    setVolume(v) { volume = v; if (g && enabled) ramp(g.master.gain, v, 0.3); },

    setRain(on) {
      rainOn = on;
      if (!g) return;
      ramp(g.layers.rain.gain.gain, on ? 0.13 : 0, 2.5);
      ramp(g.layers.rainLow.gain.gain, on ? 0.06 : 0, 2.5);
    },

    // Sparse on purpose. A busy room is not restful.
    tick(dt) {
      if (!g || !enabled) return;
      nextEvent -= dt;
      if (nextEvent > 0) return;
      const r = Math.random();
      if (r < 0.45) pageTurn(g);
      else if (r < 0.75) chairCreak(g);
      else distantHorn(g);
      nextEvent = rnd(30, 95);
    },

    async setHidden(hidden) {
      if (!g) return;
      // Deliberately NOT suspended when hidden: the whole point is that it keeps
      // playing while you study in another tab.
      if (!hidden && enabled && g.ctx.state === 'suspended') await g.ctx.resume();
    },

    level() {
      if (!g) return 0;
      const buf = new Float32Array(g.analyser.fftSize);
      g.analyser.getFloatTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      return Math.sqrt(s / buf.length);
    }
  };
}
