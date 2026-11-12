// OakCrest cloud sync: a parent signs in with Google, and the family's learners, progress,
// log and plans are kept in Firestore under families/{uid}/state/{key}.
// Pages keep reading and writing localStorage as before; this file mirrors chosen keys both ways.
// With no Firebase config (window.OC_FIREBASE unset) everything stays on this device.
(() => {
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const SYNCED = ["oc-learners", "oc-profiles", "oc-music", "oc-log", "oc-plan-done", "oc-plan-start", "oc-plan-track", "oc-year", "oc-soroban-adv", "oc-log-removed", "oc-skills", "oc-stickers"];
  const META = "oc-sync-meta"; // { key: last local change time }
  const raw = Storage.prototype.setItem;
  const readJson = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  };
  const meta = () => readJson(META, {});
  const setMeta = (key, at) => raw.call(localStorage, META, JSON.stringify({ ...meta(), [key]: at }));

  const state = { user: null, ready: false, backend: null, pending: new Set(), timer: 0, listeners: new Set(), error: "" };
  const emit = () => state.listeners.forEach((fn) => fn(state));

  // Merge rules: the log is a set of entries (union by id); progress maps merge per learner and unit by time;
  // everything else takes whichever side changed last.
  function merge(key, local, remote, localAt, remoteAt) {
    if (remote === undefined) return local;
    if (local === undefined || local === null) return remote;
    if (key === "oc-log") {
      const byId = new Map();
      for (const entry of [...remote, ...local]) {
        const have = byId.get(entry.id);
        if (!have || (entry.endedAt || 0) > (have.endedAt || 0)) byId.set(entry.id, entry);
      }
      const removed = new Set([...(readJson("oc-log-removed", []) || [])]);
      return [...byId.values()].filter((entry) => !removed.has(entry.id)).sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
    }
    if (key === "oc-music" || key === "oc-plan-done" || key === "oc-year" || key === "oc-profiles" || key === "oc-skills" || key === "oc-stickers") {
      const out = { ...remote };
      for (const [who, mine] of Object.entries(local)) {
        if (typeof mine !== "object" || mine === null || Array.isArray(mine)) {
          out[who] = localAt >= remoteAt ? mine : out[who] ?? mine;
          continue;
        }
        const theirs = out[who] && typeof out[who] === "object" ? out[who] : {};
        const both = { ...theirs };
        for (const [k, v] of Object.entries(mine)) {
          const t = theirs[k];
          const vAt = v && typeof v === "object" ? v.at || 0 : localAt;
          const tAt = t && typeof t === "object" ? t.at || 0 : remoteAt;
          both[k] = t === undefined || vAt >= tAt ? v : t;
        }
        out[who] = both;
      }
      return out;
    }
    return localAt >= remoteAt ? local : remote;
  }

  // Firestore backend; tests can swap in window.__ocFakeBackend with the same shape.
  async function firebaseBackend(config) {
    const [{ initializeApp }, auth, store] = await Promise.all([
      import(`${SDK}firebase-app.js`),
      import(`${SDK}firebase-auth.js`),
      import(`${SDK}firebase-firestore.js`),
    ]);
    const app = initializeApp(config);
    const a = auth.getAuth(app);
    const db = store.getFirestore(app);
    const ref = (uid, key) => store.doc(db, "families", uid, "state", key);
    return {
      onUser: (fn) => auth.onAuthStateChanged(a, (u) => fn(u ? { uid: u.uid, name: u.displayName || "", email: u.email || "", photo: u.photoURL || "" } : null)),
      signIn: () => auth.signInWithPopup(a, new auth.GoogleAuthProvider()),
      signOut: () => auth.signOut(a),
      async pull(uid) {
        const snap = await store.getDocs(store.collection(db, "families", uid, "state"));
        const out = {};
        snap.forEach((d) => (out[d.id] = d.data()));
        return out;
      },
      push: (uid, key, json, at) => store.setDoc(ref(uid, key), { json, at }),
      profile: (uid, data) => store.setDoc(store.doc(db, "families", uid), data, { merge: true }),
    };
  }

  // The log can grow for years, so it is stored one document per year.
  const docsOf = (key, value) => {
    if (key !== "oc-log") return { [key]: value };
    const out = {};
    for (const entry of value || []) (out[`oc-log-${String(entry.date || "").slice(0, 4) || "x"}`] ||= []).push(entry);
    return out;
  };

  async function pullAll() {
    const { backend, user } = state;
    const remote = await backend.pull(user.uid);
    const logs = Object.entries(remote).filter(([id]) => id.startsWith("oc-log-"));
    if (logs.length) remote["oc-log"] = { json: JSON.stringify(logs.flatMap(([, d]) => JSON.parse(d.json || "[]"))), at: Math.max(...logs.map(([, d]) => d.at || 0)) };
    let changed = false;
    for (const key of SYNCED) {
      const doc = remote[key];
      const local = readJson(key, undefined);
      const localAt = meta()[key] || 0;
      const remoteValue = doc ? JSON.parse(doc.json) : undefined;
      const merged = merge(key, local, remoteValue, localAt, doc?.at || 0);
      const before = localStorage.getItem(key);
      const after = merged === undefined ? null : JSON.stringify(merged);
      if (after !== null && after !== before) {
        raw.call(localStorage, key, after);
        changed = true;
      }
      if (after !== null && after !== doc?.json) state.pending.add(key);
    }
    return changed;
  }

  async function flush() {
    clearTimeout(state.timer);
    const { backend, user } = state;
    if (!backend || !user) return;
    const keys = [...state.pending];
    state.pending.clear();
    for (const key of keys) {
      const value = readJson(key, undefined);
      if (value === undefined) continue;
      const at = meta()[key] || Date.now();
      try {
        for (const [id, part] of Object.entries(docsOf(key, value))) await backend.push(user.uid, id, JSON.stringify(part), at);
      } catch (error) {
        state.error = "Could not save to the cloud. It will try again.";
        state.pending.add(key);
        emit();
      }
    }
  }
  const schedule = (key) => {
    state.pending.add(key);
    clearTimeout(state.timer);
    state.timer = setTimeout(flush, 1500);
  };

  // Mirror every write of a synced key.
  Storage.prototype.setItem = function (key, value) {
    raw.call(this, key, value);
    if (this === localStorage && SYNCED.includes(key)) {
      setMeta(key, Date.now());
      if (state.user) schedule(key);
    }
  };
  const flushSoon = () => state.user && state.pending.size && flush();
  addEventListener("pagehide", flushSoon);
  document.addEventListener("visibilitychange", () => document.hidden && flushSoon());

  async function start() {
    const config = window.OC_FIREBASE;
    if (!config && !window.__ocFakeBackend) {
      state.ready = true;
      return emit();
    }
    try {
      state.backend = window.__ocFakeBackend || (await firebaseBackend(config));
    } catch (error) {
      state.error = "Cloud sign-in is not available right now.";
      state.ready = true;
      return emit();
    }
    state.backend.onUser(async (user) => {
      state.user = user;
      if (user) {
        try {
          const changed = await pullAll();
          await state.backend.profile?.(user.uid, { name: user.name, email: user.email, lastSeen: Date.now() });
          await flush();
          // Pages read localStorage when they load, so show the synced data once.
          if (changed && !sessionStorage.getItem("oc-synced")) {
            sessionStorage.setItem("oc-synced", "1");
            location.reload();
            return;
          }
        } catch (error) {
          state.error = "Could not load your family's data.";
        }
      }
      state.ready = true;
      emit();
    });
  }

  window.OCLOUD = {
    state,
    enabled: () => !!(window.OC_FIREBASE || window.__ocFakeBackend),
    onChange: (fn) => (state.listeners.add(fn), fn(state)),
    signIn: () => state.backend?.signIn(),
    async signOut() {
      await flush();
      await state.backend?.signOut();
      sessionStorage.removeItem("oc-synced");
    },
    flush,
    merge,
  };
  // Sign-in gate: with cloud sign-in set up, pages stay hidden until a parent is signed in.
  // This only hides the page in the browser; the files themselves are still public on the web.
  const gated = !!(window.OC_FIREBASE || window.__ocFakeBackend) && window.top === window.self;
  if (gated) {
    document.documentElement.classList.add("oc-locked");
    const css = document.createElement("style");
    css.textContent = `html.oc-locked body > *:not(#oc-gate){display:none!important}
#oc-gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:16px;background:linear-gradient(160deg,#fff6e0,#e3f1ff);font:17px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#23324a}
#oc-gate .card{max-width:420px;width:100%;background:#fff;border-radius:24px;padding:32px 28px;text-align:center;box-shadow:0 12px 40px #23324a22}
#oc-gate .logo{font-size:56px;line-height:1}
#oc-gate h1{margin:12px 0 6px;font-size:28px}
#oc-gate p{margin:0 0 20px;color:#4a5872}
#oc-gate button{display:inline-flex;align-items:center;gap:10px;border:0;border-radius:999px;padding:14px 26px;font:inherit;font-weight:700;background:#2f6fdf;color:#fff;cursor:pointer}
#oc-gate button:disabled{opacity:.6;cursor:wait}
#oc-gate .g{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#fff;color:#2f6fdf;font-weight:800}
#oc-gate .err{margin:16px 0 0;color:#b3261e;font-size:15px}
#oc-gate small{display:block;margin-top:18px;color:#6b7891;font-size:14px}
@media (prefers-color-scheme:dark){#oc-gate{background:linear-gradient(160deg,#1d2433,#14202e);color:#e8edf6}#oc-gate .card{background:#232c3d}#oc-gate p,#oc-gate small{color:#b6c0d3}}`;
    document.head.appendChild(css);
    let box = null;
    const showGate = (cloud) => {
      if (!document.body) return document.addEventListener("DOMContentLoaded", () => showGate(state), { once: true });
      if (cloud.ready && cloud.user) {
        document.documentElement.classList.remove("oc-locked");
        box?.remove();
        box = null;
        return;
      }
      document.documentElement.classList.add("oc-locked");
      if (!box) {
        box = document.createElement("div");
        box.id = "oc-gate";
        box.setAttribute("role", "dialog");
        box.setAttribute("aria-modal", "true");
        box.setAttribute("aria-labelledby", "oc-gate-title");
        document.body.appendChild(box);
        box.addEventListener("click", async (event) => {
          const button = event.target.closest("button");
          if (!button) return;
          if (button.dataset.retry !== undefined) return location.reload();
          button.disabled = true;
          try {
            await window.OCLOUD.signIn();
          } catch (error) {
            if (!/popup-closed|cancelled-popup/.test(error?.code || "")) state.error = "Sign-in did not finish. Please try again.";
            button.disabled = false;
            showGate(state);
          }
        });
      }
      const failed = cloud.ready && !cloud.backend;
      box.innerHTML = `<div class="card"><div class="logo" aria-hidden="true">🌳</div><h1 id="oc-gate-title">OakCrest Academy</h1>` +
        (!cloud.ready
          ? `<p>Loading…</p>`
          : failed
          ? `<p>Sign-in could not load. Check the internet connection and try again.</p><button type="button" data-retry>Try again</button>`
          : `<p>Parents, please sign in to open your family's lessons and progress.</p><button type="button"><span class="g" aria-hidden="true">G</span> Sign in with Google</button>`) +
        (cloud.error && !failed ? `<p class="err">${cloud.error}</p>` : "") +
        `<small>Children do not need an email. A grown-up signs in once on each device.</small></div>`;
    };
    state.listeners.add(showGate);
    showGate(state);
  }

  start();
})();
