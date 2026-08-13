// Presence counter — a Cloudflare Worker + Durable Object.
//
// Answers one question: how many people have this page open right now.
//
// Deliberately heartbeat-based rather than WebSocket-based. A WebSocket gives an
// exact live count, but it also means a persistent connection per visitor and a
// lot more that can go wrong. Here each client says "still here" every 20s, the
// object forgets anyone unheard-from for 60s, and that is close enough for a
// number that exists to make someone feel less alone.
//
// Why a Durable Object at all: a plain Worker has no shared memory between
// invocations, so there is nowhere to keep the count. A Durable Object is a
// single instance all requests route to, which is exactly what a counter needs.

const STALE_MS = 60_000;   // unheard-from this long → assumed gone
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'cache-control': 'no-store'
};

export class Presence {
  constructor(state) {
    this.state = state;
    // In-memory only. If the object hibernates the count resets, which is
    // correct — everyone reconnects within one heartbeat anyway.
    this.seen = new Map();   // sessionId → last-seen timestamp
  }

  async fetch(request) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const now = Date.now();

    if (id) this.seen.set(id, now);

    // Prune the departed.
    for (const [key, at] of this.seen) {
      if (now - at > STALE_MS) this.seen.delete(key);
    }

    return new Response(
      JSON.stringify({ count: this.seen.size }),
      { headers: { 'content-type': 'application/json', ...CORS } }
    );
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }
    // One room, so one fixed object name. If you ever want per-page counts,
    // derive the name from the path instead.
    const stub = env.PRESENCE.get(env.PRESENCE.idFromName('sankalp'));
    return stub.fetch(request);
  }
};
