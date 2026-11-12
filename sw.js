// OakCrest offline support. Network first, so updates show at once when online; every page, script, sound and
// picture the learner has opened is kept, and comes from the cache when the tablet is offline.
// Progress is in localStorage either way, and cloud sync catches up when the connection is back.
// The Firebase sign-in SDK is kept too, so a parent who signed in before stays signed in offline.
const CACHE = "oakcrest-v1";
const KEEP_OTHER = [/^https:\/\/www\.gstatic\.com\/firebasejs\//, /^https:\/\/fonts\.(googleapis|gstatic)\.com\//];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("oakcrest-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  const mine = url.origin === self.location.origin;
  if (!mine && !KEEP_OTHER.some((re) => re.test(req.url))) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (res.type === "basic" || res.type === "cors")) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: mine });
        if (hit) return hit;
        if (req.mode === "navigate") {
          return new Response(
            `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font:18px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;padding:16px;text-align:center;background:#fff6e0;color:#2b1d12"><div><div style="font-size:56px">🌳</div><h1>No internet right now</h1><p>This lesson hasn't been opened on this tablet before, so it isn't saved yet.<br>Lessons you have already opened still work. <a href="javascript:history.back()">Go back</a></p></div>`,
            { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
          );
        }
        return Response.error();
      }),
  );
});
