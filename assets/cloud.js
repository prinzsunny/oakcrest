// OakCrest cloud sync: a parent signs in with Google, and the family's learners, progress,
// log and plans are kept in Firestore under families/{uid}/state/{key}.
// Pages keep reading and writing localStorage as before; this file mirrors chosen keys both ways.
// With no Firebase config (window.OC_FIREBASE unset) everything stays on this device.
(() => {
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const SYNCED = ["oc-learners", "oc-profiles", "oc-music", "oc-log", "oc-plan-done", "oc-plan-start", "oc-plan-track", "oc-year", "oc-soroban-adv", "oc-log-removed", "oc-skills", "oc-stickers", "oc-portfolio"];
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
    if (key === "oc-music" || key === "oc-plan-done" || key === "oc-year" || key === "oc-profiles" || key === "oc-skills" || key === "oc-stickers" || key === "oc-portfolio") {
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
#oc-gate .fun{text-align:center}
#oc-gate .stage{position:relative;height:170px;max-width:340px;margin:0 auto;overflow:hidden;border-radius:22px;background:linear-gradient(#cfe8ff,#eaf6ff 70%,#bfe3a8 70%)}
#oc-gate .stage span{position:absolute;display:block;line-height:1}
#oc-gate .hero{font-size:64px;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none}
#oc-gate .hero.tickled{animation:ocg-spin .8s ease-in-out!important}
#oc-gate .giggle{left:50%;top:8px;transform:translateX(-50%);background:#fff;color:#23324a;font:800 16px/1 system-ui,sans-serif;padding:7px 12px;border-radius:14px;box-shadow:0 2px 6px #0002;animation:ocg-pop 1s ease-out forwards}
#oc-gate .confetti{left:50%;top:60%;font-size:22px;animation:ocg-burst 1s ease-out forwards}
/* juggle: x and y move on different clocks, so each ball flies in an arc */
#oc-gate .s-juggle .hero{left:calc(50% - 32px);bottom:14px;animation:ocg-wobble 1.2s ease-in-out infinite}
#oc-gate .s-juggle .bx{left:calc(50% - 50px);top:18px;animation:ocg-jx 1.4s linear infinite alternate}
#oc-gate .s-juggle .bx span{position:relative;font-size:30px;animation:ocg-jy .7s cubic-bezier(.3,0,.7,1) infinite alternate}
#oc-gate .s-juggle .bx:nth-of-type(2),#oc-gate .s-juggle .bx:nth-of-type(2) span{animation-delay:-.47s}
#oc-gate .s-juggle .bx:nth-of-type(3),#oc-gate .s-juggle .bx:nth-of-type(3) span{animation-delay:-.93s}
/* chase: runs after a bouncing ball, turns round, runs back */
#oc-gate .s-chase .run{left:0;bottom:14px;width:120px;height:80px;animation:ocg-run 5s linear infinite}
#oc-gate .s-chase .hero{right:0;bottom:0;animation:ocg-trot .3s ease-in-out infinite alternate}
#oc-gate .s-chase .ball{left:0;bottom:0;font-size:30px;animation:ocg-boing .5s cubic-bezier(.3,0,.7,1) infinite alternate}
/* peek-a-boo behind a book pile */
#oc-gate .s-peek .hero{left:calc(50% - 32px);bottom:14px;animation:ocg-peek 3s ease-in-out infinite}
#oc-gate .s-peek .pile{left:calc(50% - 50px);bottom:6px;font-size:84px;z-index:1}
#oc-gate .s-peek .eyes{left:calc(50% + 46px);bottom:70px;font-size:28px;animation:ocg-blink 3s steps(1) infinite}
/* rocket ride */
#oc-gate .s-rocket .ride{left:calc(50% - 50px);top:34px;width:110px;height:110px;animation:ocg-rattle .15s linear infinite alternate}
#oc-gate .s-rocket .ship{left:0;top:20px;font-size:76px;transform:rotate(45deg)}
#oc-gate .s-rocket .hero{left:30px;top:12px;font-size:40px;animation:ocg-wobble .6s ease-in-out infinite}
#oc-gate .s-rocket .star{font-size:20px;animation:ocg-zoom 1.2s linear infinite}
#oc-gate .s-rocket .star:nth-of-type(2){top:30px;animation-delay:-.4s}#oc-gate .s-rocket .star:nth-of-type(3){top:110px;animation-delay:-.8s}#oc-gate .s-rocket .star:nth-of-type(4){top:70px;animation-delay:-.2s}
#oc-gate .s-rocket .stage,#oc-gate .stage.s-rocket{background:linear-gradient(#1b2a5a,#3b4fa0)}
/* disco dance with floating notes */
#oc-gate .s-dance .hero{left:calc(50% - 32px);bottom:16px;animation:ocg-dance .8s ease-in-out infinite}
#oc-gate .s-dance .ball{left:calc(50% - 16px);top:4px;font-size:30px;animation:ocg-spinslow 2s linear infinite}
#oc-gate .s-dance .note{bottom:30px;font-size:24px;animation:ocg-float 2.4s ease-out infinite}
#oc-gate .s-dance .note:nth-of-type(3){left:22%;animation-delay:-.8s}#oc-gate .s-dance .note:nth-of-type(4){left:70%;animation-delay:-1.6s}#oc-gate .s-dance .note:nth-of-type(5){left:35%;animation-delay:-1.2s}
#oc-gate .msg{font-size:22px;font-weight:800;margin:14px 0 0;color:inherit;min-height:1.5em;transition:opacity .25s}
#oc-gate .tap{margin:4px 0 0;font-size:14px;opacity:.7}
#oc-gate .dots i{display:inline-block;width:10px;height:10px;margin:10px 4px 0;border-radius:50%;background:#2f6fdf;animation:ocg-dot 1.2s ease-in-out infinite}
#oc-gate .dots i:nth-child(2){background:#f08a24;animation-delay:.2s}#oc-gate .dots i:nth-child(3){background:#16a34a;animation-delay:.4s}
@keyframes ocg-wobble{0%,100%{transform:rotate(-8deg) scaleY(1)}50%{transform:rotate(8deg) scaleY(.92)}}
@keyframes ocg-jx{from{transform:translateX(0)}to{transform:translateX(100px)}}
@keyframes ocg-jy{from{transform:translateY(60px) rotate(0)}to{transform:translateY(0) rotate(180deg)}}
@keyframes ocg-run{0%{transform:translateX(-130px) scaleX(-1)}45%{transform:translateX(330px) scaleX(-1)}50%{transform:translateX(330px) scaleX(1)}95%{transform:translateX(-130px) scaleX(1)}100%{transform:translateX(-130px) scaleX(-1)}}
@keyframes ocg-trot{from{transform:translateY(0) rotate(-6deg)}to{transform:translateY(-10px) rotate(6deg)}}
@keyframes ocg-boing{from{transform:translateY(0) scale(1.1,.85)}to{transform:translateY(-45px)}}
@keyframes ocg-peek{0%,15%{transform:translateY(90px)}30%,45%{transform:translateY(0) rotate(-10deg)}55%{transform:translateY(0) rotate(10deg) scale(1.1)}65%,100%{transform:translateY(90px)}}
@keyframes ocg-blink{0%,65%{opacity:0}70%,80%{opacity:1}82%{opacity:0}86%,95%{opacity:1}100%{opacity:0}}
@keyframes ocg-rattle{from{transform:translate(-2px,1px) rotate(-2deg)}to{transform:translate(2px,-1px) rotate(2deg)}}
@keyframes ocg-zoom{from{transform:translateX(360px)}to{transform:translateX(-40px)}}
@keyframes ocg-dance{0%,100%{transform:rotate(-15deg) translateX(-12px)}25%{transform:scale(1.1,.85)}50%{transform:rotate(15deg) translateX(12px)}75%{transform:translateY(-14px)}}
@keyframes ocg-spinslow{to{transform:rotate(360deg)}}
@keyframes ocg-float{0%{transform:translateY(0) rotate(0);opacity:0}20%{opacity:1}100%{transform:translateY(-120px) rotate(40deg);opacity:0}}
@keyframes ocg-spin{0%{transform:rotate(0) scale(1)}50%{transform:rotate(200deg) scale(1.35)}100%{transform:rotate(360deg) scale(1)}}
@keyframes ocg-pop{0%{transform:translateX(-50%) scale(.3);opacity:0}25%{transform:translateX(-50%) scale(1.1);opacity:1}80%{opacity:1}100%{transform:translateX(-50%) translateY(-10px);opacity:0}}
@keyframes ocg-burst{from{transform:translate(0,0) scale(.5);opacity:1}to{transform:translate(var(--x),var(--y)) scale(1.2) rotate(300deg);opacity:0}}
@keyframes ocg-dot{0%,100%{transform:scale(.6);opacity:.4}50%{transform:scale(1.2);opacity:1}}
@media (prefers-reduced-motion:reduce){#oc-gate .stage *,#oc-gate .dots i{animation:none!important}#oc-gate .s-peek .hero{transform:none}#oc-gate .s-chase .run{transform:translateX(100px)}}
@media (prefers-color-scheme:dark){#oc-gate{background:linear-gradient(160deg,#1d2433,#14202e);color:#e8edf6}#oc-gate .card{background:#232c3d}#oc-gate p,#oc-gate small{color:#b6c0d3}}`;
    document.head.appendChild(css);
    let box = null;
    // While sign-in loads (a moment on every page), children see a silly little cartoon instead of "Loading…".
    // One of five scenes is picked each time, and tapping the animal makes it spin and giggle.
    const HELPERS = ["🦉", "🐿️", "🦊", "🐢", "🐰", "🐼", "🦔", "🐸", "🐶", "🐱", "🐵", "🐧", "🐷", "🦁"];
    const THINGS = ["📚", "🔢", "🎨", "🔬", "🎵", "🚀", "🧮", "🌍", "✏️", "🧩", "🍎", "⚽"];
    const SAYINGS = ["Waking up the owls…", "Sharpening the pencils…", "Counting the acorns…", "Polishing the stars…", "Opening the treasure chest…", "Finding your crayons…", "Tuning the piano…", "Warming up the rocket…", "Stacking the books…", "Shaking the abacus beads…", "Tickling the numbers…", "Feeding the dinosaurs…", "Untangling the spaghetti…", "Teaching the fish to count…", "Looking for a lost sock…", "Giving the moon a bath…"];
    const GIGGLES = ["Hee hee!", "That tickles!", "Wheee!", "Boing!", "Ha ha!", "Again!", "Oopsie!"];
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const few = (list, n) => [...list].sort(() => Math.random() - 0.5).slice(0, n);
    let sayTimer = 0;
    const SCENES = {
      juggle: (h) => few(THINGS, 3).map((t) => `<span class="bx"><span>${t}</span></span>`).join("") + `<span class="hero">${h}</span>`,
      chase: (h) => `<span class="run"><span class="hero">${h}</span><span class="ball">${pick(["⚽", "🎈", "⭐", "🦋", "🍩"])}</span></span>`,
      peek: (h) => `<span class="hero">${h}</span><span class="pile">📚</span><span class="eyes">👀</span>`,
      rocket: (h) => `<span class="star">✨</span><span class="star">⭐</span><span class="star">✨</span><span class="star">🌟</span><span class="ride"><span class="ship">🚀</span><span class="hero">${h}</span></span>`,
      dance: (h) => `<span class="ball">🪩</span><span class="note">🎵</span><span class="note">🎶</span><span class="note">🎵</span><span class="note">🎶</span><span class="hero">${h}</span>`,
    };
    const funLoading = () => {
      const scene = pick(Object.keys(SCENES));
      return `<div class="fun" role="status" aria-live="polite"><div class="stage s-${scene}" aria-hidden="true">${SCENES[scene](pick(HELPERS))}</div>` +
        `<p class="msg" data-say>${pick(SAYINGS)}</p><p class="tap">Tap the animal!</p><div class="dots" aria-hidden="true"><i></i><i></i><i></i></div></div>`;
    };
    const tickle = (hero) => {
      const stage = hero.closest(".stage");
      hero.classList.remove("tickled");
      void hero.offsetWidth;
      hero.classList.add("tickled");
      stage.querySelector(".giggle")?.remove();
      stage.insertAdjacentHTML("beforeend", `<span class="giggle">${pick(GIGGLES)}</span>`);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const bit = document.createElement("span");
        bit.className = "confetti";
        bit.textContent = pick(["🎉", "⭐", "💖", "✨", "🌈", "🍬"]);
        bit.style.cssText = `--x:${Math.round(Math.cos(a) * 110)}px;--y:${Math.round(Math.sin(a) * 70)}px`;
        stage.appendChild(bit);
        setTimeout(() => bit.remove(), 1000);
      }
      setTimeout(() => stage.querySelector(".giggle")?.remove(), 1000);
    };
    const showGate = (cloud) => {
      if (!document.body) return document.addEventListener("DOMContentLoaded", () => showGate(state), { once: true });
      if (cloud.ready && cloud.user) {
        clearInterval(sayTimer);
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
          const hero = event.target.closest(".hero");
          if (hero) return tickle(hero);
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
      if (!cloud.ready) {
        // Keep the same helper while waiting, so the animation does not restart.
        if (box.dataset.view === "loading") return;
        box.dataset.view = "loading";
        box.innerHTML = `<div class="card">${funLoading()}</div>`;
        sayTimer = setInterval(() => {
          const el = box?.querySelector("[data-say]");
          if (!el) return clearInterval(sayTimer);
          el.style.opacity = 0;
          setTimeout(() => (el.textContent = pick(SAYINGS.filter((x) => x !== el.textContent)), (el.style.opacity = 1)), 250);
        }, 1600);
        return;
      }
      clearInterval(sayTimer);
      box.dataset.view = "";
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

  // Offline support (see /sw.js): pages and lessons opened once keep working without internet.
  // Not under automated tests, so smoke tests always see the real files.
  if ("serviceWorker" in navigator && window.top === window.self && !navigator.webdriver && /^https?:$/.test(location.protocol)) {
    const sw = new URL("../sw.js", document.currentScript?.src || location.href);
    addEventListener("load", () => navigator.serviceWorker.register(sw, { scope: new URL("./", sw).pathname }).catch(() => {}));
  }

  start();
})();
