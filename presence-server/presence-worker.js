// Presence counter — a Cloudflare Worker + Durable Object.
//
// Answers one question: how many people have this page open right now.
//
// Deliberately heartbeat-based rather than WebSocket-based. A WebSocket gives an
// exact live count, but it also means a persistent connection per visitor and a
// lot more that can go wrong. Here each client says "still here" every 60s, the
// object forgets anyone unheard-from for 150s, and that is close enough for a
// number that exists to make someone feel less alone.
//
// Why a Durable Object at all: a plain Worker has no shared memory between
// invocations, so there is nowhere to keep the count. A Durable Object is a
// single instance all requests route to, which is exactly what a counter needs.

// Unheard-from this long → assumed gone. Must be comfortably more than the
// client's heartbeat interval (60s) so a single dropped request doesn't evict
// someone who is still sitting there.
//
// Why 60s heartbeats and not 20s: the Durable Object free tier is 1M requests a
// month, and every heartbeat is one. At 20s a half-hour session costs 90
// requests and the cap arrives at ~370 sessions/day. At 60s it is 30 requests
// and ~1,100 sessions/day. The number on screen does not need to be accurate to
// the second — it needs to be roughly true and cheap.
const STALE_MS = 150_000;

const KEY = 'seen';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'cache-control': 'no-store'
};

export class Presence {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const now = Date.now();

    // MUST be durable storage, not an instance field.
    //
    // This was an in-memory Map, and it looked fine in testing because rapid
    // requests all land on the same live instance. In reality a Durable Object
    // hibernates after ~30s idle and loses everything in memory — and with a
    // 60s heartbeat it is idle between every single beat. The count read 1
    // forever regardless of how many people were actually present.
    //
    // Durable Object input gates defer other events while a storage operation
    // is in flight, so this read-modify-write is safe without extra locking.
    const seen = (await this.ctx.storage.get(KEY)) || {};

    if (id) seen[id] = now;

    for (const [key, at] of Object.entries(seen)) {
      if (now - at > STALE_MS) delete seen[key];
    }

    await this.ctx.storage.put(KEY, seen);

    return new Response(
      JSON.stringify({ count: Object.keys(seen).length }),
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
