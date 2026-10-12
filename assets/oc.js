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
    SUBJECTS: ["Math", "Music", "Arts", "Science", "Tech", "Reading & Writing", "Languages", "History & Social Studies", "PE & Movement", "Life Skills", "Other"],
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
      for (const key of ["oc-profiles", "oc-music", "oc-plan-done", "oc-plan-track", "oc-year"]) {
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
})();
