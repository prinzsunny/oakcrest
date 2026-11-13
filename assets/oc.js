(() => {
  const KEY_LOG = "oc-log";
  const KEY_LEARNERS = "oc-learners";
  const KEY_CURRENT = "oc-current";
  const IDLE = 120000;
  const MERGE = 15 * 60000;

  const read = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };
  const pad = (n) => String(n).padStart(2, "0");
  const dayOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timeOf = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  let session = null;
  const listeners = new Set();

  const OC = {
    SUBJECTS: ["Math", "Music", "Arts", "Science", "Tech", "Reading & Writing", "Languages", "History & Social Studies", "PE & Movement", "Life Skills", "Thinking Skills", "Other"],
    escapeHtml,
    dayOf,
    log: () => read(KEY_LOG, []),
    saveLog(entries) {
      write(KEY_LOG, entries);
      listeners.forEach((fn) => fn());
    },
    onChange(fn) {
      listeners.add(fn);
    },
    learners: () => read(KEY_LEARNERS, []),
    // Child profiles: birth month ("2020-07") and the level the child works at ("auto" follows age).
    LEVELS: ["Foundations", "Level 2", "Level 3", "Level 4", "Level 5"],
    profiles: () => read("oc-profiles", {}),
    profile: (name = OC.current()) => OC.profiles()[name] || {},
    saveProfile(name, data) {
      const all = OC.profiles();
      all[name] = { ...(all[name] || {}), ...data, at: Date.now() };
      write("oc-profiles", all);
      listeners.forEach((fn) => fn());
    },
    // Renaming moves the child's profile, progress, plans and log entries to the new name.
    renameLearner(from, to) {
      if (!from || !to || from === to) return;
      for (const key of ["oc-profiles", "oc-music", "oc-plan-done", "oc-plan-track", "oc-year", "oc-skills", "oc-stickers", "oc-soroban-adv"]) {
        const all = read(key, {});
        if (all && all[from] !== undefined) {
          all[to] = all[from];
          delete all[from];
          write(key, all);
        }
      }
      const entries = OC.log();
      if (entries.some((e) => e.learner === from)) OC.saveLog(entries.map((e) => (e.learner === from ? { ...e, learner: to } : e)));
      if (read(KEY_CURRENT, "") === from) write(KEY_CURRENT, to);
    },
    ageOf(name = OC.current()) {
      const birth = OC.profile(name).birth;
      if (!birth) return null;
      const [y, m] = birth.split("-").map(Number);
      const now = new Date();
      return now.getFullYear() - y - (now.getMonth() + 1 < m ? 1 : 0);
    },
    levelOf(name = OC.current()) {
      const p = OC.profile(name);
      if (p.level && p.level !== "auto") return p.level;
      const age = OC.ageOf(name);
      if (age === null) return "";
      return age <= 5 ? "Foundations" : age <= 7 ? "Level 2" : age <= 9 ? "Level 3" : age <= 10 ? "Level 4" : "Level 5";
    },
    saveLearners(list) {
      write(KEY_LEARNERS, list);
      if (!list.includes(OC.current())) OC.setCurrent(list[0] || "");
      listeners.forEach((fn) => fn());
    },
    current() {
      const name = read(KEY_CURRENT, "");
      return OC.learners().includes(name) ? name : OC.learners()[0] || "";
    },
    setCurrent(name) {
      if (session) OC.end();
      write(KEY_CURRENT, name);
      listeners.forEach((fn) => fn());
      if (OC._last) OC.begin(...OC._last);
    },
    add(entry) {
      const entries = OC.log();
      entries.push({ id: uid(), source: "manual", ...entry });
      OC.saveLog(entries);
    },
    remove(id) {
      // Remember removals so cloud sync does not bring the entry back from another device.
      write("oc-log-removed", [...read("oc-log-removed", []), id].slice(-2000));
      OC.saveLog(OC.log().filter((entry) => entry.id !== id));
    },
    begin(subject, activity, part = "") {
      OC.end();
      OC._last = [subject, activity, part];
      const now = Date.now();
      session = { subject, activity, part, start: now, last: now, active: 0, counts: {}, notes: {} };
    },
    touch() {
      if (!session) return;
      const now = Date.now();
      const gap = now - session.last;
      if (gap <= IDLE) session.active += gap;
      session.last = now;
    },
    count(key, n = 1) {
      if (!session) return;
      OC.touch();
      session.counts[key] = (session.counts[key] || 0) + n;
    },
    note(key, value) {
      if (!session) return;
      OC.touch();
      session.notes[key] = value;
    },
    end() {
      if (!session) return;
      OC.touch();
      const s = session;
      session = null;
      const minutes = Math.round(s.active / 6000) / 10;
      const hasWork = Object.keys(s.counts).length || Object.keys(s.notes).length;
      if (minutes < 0.5 && !hasWork) return;
      const learner = OC.current() || "Learner";
      const started = new Date(s.start);
      const entries = OC.log();
      const last = [...entries].reverse().find((entry) => entry.source === "app" && entry.learner === learner);
      if (last && last.date === dayOf(started) && last.subject === s.subject && last.activity === s.activity && last.part === s.part && s.start - (last.endedAt || 0) < MERGE) {
        last.minutes = Math.round((last.minutes + minutes) * 10) / 10;
        for (const [key, n] of Object.entries(s.counts)) last.counts[key] = (last.counts[key] || 0) + n;
        Object.assign(last.notes, s.notes);
        last.endedAt = Date.now();
        last.detail = OC.detailOf(last);
      } else {
        const entry = { id: uid(), source: "app", learner, date: dayOf(started), time: timeOf(started), minutes, subject: s.subject, activity: s.activity, part: s.part, counts: s.counts, notes: s.notes, endedAt: Date.now() };
        entry.detail = OC.detailOf(entry);
        entries.push(entry);
      }
      OC.saveLog(entries);
    },
    detailOf(entry) {
      const bits = [];
      if (entry.part) bits.push(entry.part);
      for (const [key, n] of Object.entries(entry.counts || {})) bits.push(`${n} ${n === 1 ? key.replace(/^(\w+?)s\b/, "$1") : key}`);
      for (const [key, value] of Object.entries(entry.notes || {})) bits.push(`${key}: ${value}`);
      return bits.join(" · ");
    },
    minutesToday(learner = OC.current()) {
      const today = dayOf(new Date());
      return OC.log()
        .filter((entry) => entry.date === today && (!learner || entry.learner === learner))
        .reduce((sum, entry) => sum + (Number(entry.minutes) || 0), 0);
    },
    chip(container, { onSwitch } = {}) {
      const render = () => {
        const list = OC.learners();
        const current = OC.current();
        container.innerHTML = list.length
          ? `<label class="oc-chip"><span aria-hidden="true">👤</span><select aria-label="Who is learning">${list.map((name) => `<option${name === current ? " selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select></label>`
          : `<a class="oc-chip oc-chip-add" href="${container.dataset.home || "/oakcrest/"}">👤 Add learners</a>`;
        const select = container.querySelector("select");
        if (select)
          select.addEventListener("change", () => {
            OC.setCurrent(select.value);
            onSwitch?.(select.value);
          });
      };
      render();
      OC.onChange(render);
    },
  };

  addEventListener("pagehide", () => OC.end());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) OC.end();
    else if (OC._last && !session) OC.begin(...OC._last);
  });
  addEventListener("pointerdown", () => OC.touch(), { capture: true, passive: true });
  addEventListener("keydown", () => OC.touch(), { capture: true });
  addEventListener("storage", () => listeners.forEach((fn) => fn()));

  window.OC = OC;

  // ---------- Plan first ----------
  // The home page writes today's steps to "oc-daily". Here, on every page: time spent on the current step's page
  // ticks it off; later steps stay locked until the steps before them are done; Soroban gets a 5-minute warm-up and
  // then waits for the plan. A grown-up can unlock today, or switch this off on the plan page.
  const ROOT = (() => {
    try {
      return new URL("..", document.currentScript.src).pathname;
    } catch {
      return "/";
    }
  })();
  const here = () => decodeURIComponent(location.pathname).slice(ROOT.length).replace(/index\.html$/, "");
  const onPath = (p) => !!p && here().startsWith(p);
  const SOROBAN = "math/soroban/";
  const WARMUP = 5;
  let lastPoke = Date.now();
  addEventListener("pointerdown", () => (lastPoke = Date.now()), { capture: true, passive: true });
  addEventListener("keydown", () => (lastPoke = Date.now()), { capture: true });
  const timeKey = "oc-daily-time";
  const minutesOn = (who, path) => {
    const t = read(timeKey, {});
    if (t.date !== dayOf(new Date())) return 0;
    return Object.entries(t[who] || {}).reduce((m, [p, sec]) => (p.startsWith(path) ? m + sec / 60 : m), 0);
  };
  function planState() {
    const who = OC.current();
    const today = dayOf(new Date());
    const d = who && read("oc-daily", {})[who];
    if (!d || d.date !== today || !d.steps?.length) return null;
    const mine = read("oc-year", {})[who] || {};
    if (mine.settings?.planFirst === false) return null;
    const steps = d.steps.map((st) => ({ ...st, done: !!mine[st.tick]?.done }));
    return { who, steps, at: steps.findIndex((st) => !st.done), unlock: mine.settings?.unlockDay === today, lockAll: !!mine.settings?.lockAll };
  }
  const css = `#oc-pf{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:linear-gradient(160deg,#fff6e0,#e8f1ff);font:18px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#23324a;text-align:center}
#oc-pf .c{max-width:420px;width:100%;background:#fff;border-radius:24px;padding:26px 22px;box-shadow:0 10px 30px #23324a22}
#oc-pf .big{font-size:64px;line-height:1;display:inline-block;animation:ocpf-w 1.4s ease-in-out infinite}
#oc-pf h2{margin:10px 0 6px;font-size:24px}#oc-pf p{margin:0 0 16px;color:#4b5a73}
#oc-pf a,#oc-pf button{display:block;width:100%;box-sizing:border-box;margin:8px 0 0;padding:14px;border:0;border-radius:16px;font:inherit;font-weight:800;text-decoration:none;cursor:pointer}
#oc-pf .go{background:#2f6fdf;color:#fff}#oc-pf .home{background:#eef4ff;color:#2f6fdf}#oc-pf .gu{background:none;color:#8a96ab;font-size:14px;font-weight:600;padding:8px}
#oc-pf-toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483000;max-width:calc(100% - 32px);background:#16a34a;color:#fff;border-radius:18px;padding:12px 16px;font:700 17px/1.35 system-ui,sans-serif;box-shadow:0 8px 24px #0003;display:flex;gap:12px;align-items:center}
#oc-pf-toast a{background:#fff;color:#16a34a;border-radius:12px;padding:8px 12px;text-decoration:none;white-space:nowrap}
@keyframes ocpf-w{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg) scale(1.08)}}
@media (prefers-reduced-motion:reduce){#oc-pf .big{animation:none}}
@media (prefers-color-scheme:dark){#oc-pf{background:linear-gradient(160deg,#1d2433,#14202e);color:#e8edf6}#oc-pf .c{background:#232c3d}#oc-pf p{color:#b6c0d3}#oc-pf .home{background:#2b3a55;color:#cfe0ff}}`;
  const addCss = () => {
    if (document.getElementById("oc-pf-css")) return;
    const el = document.createElement("style");
    el.id = "oc-pf-css";
    el.textContent = css;
    document.head.appendChild(el);
  };
  const stepLink = (st) => ROOT + (st.path || "");
  // ---------- Parent PIN ----------
  // A 4-digit PIN (stored hashed in "oc-parent", synced with the family account) guards unlocks, plan ticks and
  // plan settings. Once entered it is remembered in this tab for 10 minutes.
  const PIN_KEY = "oc-parent";
  const hashPin = async (pin) => {
    const data = new TextEncoder().encode(`oakcrest:${pin}`);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
  };
  const pinCss = `#oc-pin{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:16px;background:#0008;font:17px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
#oc-pin form{width:100%;max-width:340px;background:#fff;color:#23324a;border-radius:20px;padding:22px;box-shadow:0 12px 40px #0004;text-align:center}
#oc-pin h2{margin:0 0 4px;font-size:21px}#oc-pin p{margin:0 0 12px;color:#5b6880;font-size:15px}
#oc-pin input{width:100%;box-sizing:border-box;font:700 28px/1 system-ui,sans-serif;letter-spacing:10px;text-align:center;padding:10px;border:2px solid #cfd8e6;border-radius:14px;margin:6px 0}
#oc-pin .row{display:flex;gap:8px;margin-top:10px}#oc-pin button{flex:1;padding:12px;border:0;border-radius:14px;font:inherit;font-weight:800;cursor:pointer}
#oc-pin .ok{background:#2f6fdf;color:#fff}#oc-pin .no{background:#eef1f6;color:#23324a}#oc-pin .err{color:#b3261e;min-height:1.3em;margin:4px 0 0}
#oc-pin .forgot{background:none;color:#7a879c;font-size:13px;font-weight:600;padding:8px 0 0;flex:none;width:100%}
@media (prefers-color-scheme:dark){#oc-pin form{background:#232c3d;color:#e8edf6}#oc-pin p{color:#b6c0d3}#oc-pin input{background:#1b2230;color:#fff;border-color:#3b4760}#oc-pin .no{background:#2f3a50;color:#e8edf6}}`;
  OC.parent = (why = "") =>
    new Promise((resolve) => {
      try {
        if (Date.now() - Number(sessionStorage.getItem("oc-parent-ok") || 0) < 600000) return resolve(true);
      } catch {}
      if (!document.getElementById("oc-pin-css")) {
        const st = document.createElement("style");
        st.id = "oc-pin-css";
        st.textContent = pinCss;
        document.head.appendChild(st);
      }
      document.getElementById("oc-pin")?.remove();
      const saved = read(PIN_KEY, {}).pin;
      const box = document.createElement("div");
      box.id = "oc-pin";
      box.innerHTML = `<form role="dialog" aria-modal="true" aria-labelledby="oc-pin-h"><h2 id="oc-pin-h">🔐 ${saved ? "Grown-ups only" : "Make a parent PIN"}</h2><p>${saved ? escapeHtml(why || "Enter the parent PIN.") : "Choose 4 digits only grown-ups know. You'll use it to unlock games, tick plan steps and change the plan."}</p>` +
        `<input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" aria-label="PIN" data-a>${saved ? "" : `<input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" aria-label="PIN again" placeholder="again" data-b>`}` +
        `<p class="err" data-err></p><div class="row"><button type="button" class="no">Cancel</button><button class="ok">${saved ? "OK" : "Save PIN"}</button></div>${saved && window.OCLOUD?.enabled?.() ? `<button type="button" class="forgot">Forgot the PIN? Reset it with the parent Google sign-in</button>` : ""}</form>`;
      document.body.appendChild(box);
      const $ = (q) => box.querySelector(q);
      const done = (ok) => {
        box.remove();
        if (ok) try { sessionStorage.setItem("oc-parent-ok", String(Date.now())); } catch {}
        resolve(ok);
      };
      $("[data-a]").focus();
      $(".no").addEventListener("click", () => done(false));
      $(".forgot")?.addEventListener("click", async () => {
        try {
          await window.OCLOUD.signIn();
          write(PIN_KEY, { pin: "", at: Date.now() });
          box.remove();
          resolve(OC.parent(why));
        } catch {
          $("[data-err]").textContent = "Sign-in did not finish.";
        }
      });
      $("form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const a = $("[data-a]").value.trim();
        if (!/^\d{4,6}$/.test(a)) return ($("[data-err]").textContent = "Use 4 to 6 digits.");
        if (!saved) {
          if (a !== $("[data-b]").value.trim()) return ($("[data-err]").textContent = "The two PINs don't match.");
          write(PIN_KEY, { pin: await hashPin(a), at: Date.now() });
          listeners.forEach((fn) => fn());
          return done(true);
        }
        if ((await hashPin(a)) === saved) return done(true);
        $("[data-err]").textContent = "That's not it. Try again.";
        $("[data-a]").value = "";
      });
    });
  // A page can say "this plan step is finished" (for example after today's brain teasers).
  OC.planDone = (path) => {
    const st = planState();
    const cur = st && st.at >= 0 ? st.steps[st.at] : null;
    if (!cur || !cur.path || !path.startsWith(cur.path)) return false;
    const all = read("oc-year", {});
    (all[st.who] ||= {})[cur.tick] = { done: true, auto: true, at: Date.now() };
    write("oc-year", all);
    listeners.forEach((fn) => fn());
    toast(planState() || { steps: [], at: -1 });
    return true;
  };
  // Pages that never lock: home, the plan, the log, the portfolio and the sticker album.
  const FREE = ["plan/", "log/", "portfolio/", "album/", "skills/"];
  function block(st, why) {
    if (document.getElementById("oc-pf") || !document.body) return;
    addCss();
    const cur = st.steps[st.at];
    const left = st.steps.length - st.at;
    const box = document.createElement("div");
    box.id = "oc-pf";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML = `<div class="c"><div class="big" aria-hidden="true">${why === "soroban" ? "🧮" : "🔒"}</div><h2>${why === "soroban" ? "Great warm-up!" : why === "all" ? "Plan first!" : "Not yet!"}</h2>` +
      `<p>${why === "soroban" ? "Soroban opens again when today's plan is finished." : why === "all" ? "Games open when today's plan is finished." : "Do the steps in order."} First: <b>${escapeHtml(cur.icon || "")} ${escapeHtml(cur.label)}</b>. ${left === 1 ? "That's the last one!" : `${left} steps to go.`}</p>` +
      `<a class="go" href="${escapeHtml(cur.path ? stepLink(cur) : ROOT + "#today")}">${cur.path ? "Let's go! 🚀" : "Show me today's plan"}</a><a class="home" href="${escapeHtml(ROOT)}">🏠 Home</a><button type="button" class="gu">Grown-up: unlock for today</button></div>`;
    box.querySelector(".gu").addEventListener("click", async () => {
      if (!(await OC.parent("Unlock everything for today?"))) return;
      const all = read("oc-year", {});
      const mine = (all[st.who] ||= {});
      mine.settings = { ...(mine.settings || {}), unlockDay: dayOf(new Date()), at: Date.now() };
      write("oc-year", all);
      box.remove();
    });
    document.body.appendChild(box);
    document.querySelectorAll("audio,video").forEach((m) => m.pause?.());
  }
  function toast(st) {
    if (!document.body) return;
    addCss();
    document.getElementById("oc-pf-toast")?.remove();
    const next = st.steps[st.at];
    const el = document.createElement("div");
    el.id = "oc-pf-toast";
    el.setAttribute("role", "status");
    el.innerHTML = next
      ? `<span>⭐ Step done! Next: ${escapeHtml(next.icon || "")} ${escapeHtml(next.label)}</span><a href="${escapeHtml(next.path ? stepLink(next) : ROOT + "#today")}">Next ➜</a>`
      : `<span>🏆 You finished today's plan! Soroban and everything else are open.</span><a href="${escapeHtml(ROOT)}">Yay!</a>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 9000);
  }
  function planCheck() {
    const st = planState();
    if (!st || st.at < 0) return;
    const cur = st.steps[st.at];
    if (cur.path && onPath(cur.path)) {
      const need = Math.max(3, Math.round(0.6 * (cur.minutes || 8)));
      if (minutesOn(st.who, cur.path) >= need) {
        const all = read("oc-year", {});
        (all[st.who] ||= {})[cur.tick] = { done: true, auto: true, at: Date.now() };
        write("oc-year", all);
        listeners.forEach((fn) => fn());
        toast(planState() || { steps: [], at: -1 });
      }
      return;
    }
    if (st.unlock) return;
    if (onPath(SOROBAN)) return minutesOn(st.who, SOROBAN) >= WARMUP ? block(st, "soroban") : undefined;
    if (st.steps.slice(st.at + 1).some((x) => onPath(x.path)) && !st.steps.slice(0, st.at).some((x) => onPath(x.path))) return block(st, "later");
    // "Lock other games too": everything except finished steps and the free pages waits for the plan.
    if (st.lockAll && here() && !FREE.some((p) => here().startsWith(p)) && !st.steps.some((x) => x.done && onPath(x.path))) block(st, "all");
  }
  // Count active time (a tap or key in the last 2 minutes, page visible) on this page, for today.
  setInterval(() => {
    if (document.hidden || Date.now() - lastPoke > IDLE) return;
    const who = OC.current();
    if (!who || !here()) return;
    const t = read(timeKey, {});
    const today = dayOf(new Date());
    const fresh = t.date === today ? t : { date: today };
    const mine = (fresh[who] ||= {});
    mine[here()] = (mine[here()] || 0) + 10;
    write(timeKey, fresh);
    planCheck();
  }, 10000);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", planCheck, { once: true });
  else planCheck();
  OC.planCheck = planCheck;
})();
