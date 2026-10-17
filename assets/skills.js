// Skills: what each child knows, and what they are ready to learn next.
// Built on the Marble Skill Taxonomy (see assets/marble/ and /credits/): 1,590 small skills linked by prerequisites.
// A skill's status comes from, in order: a grown-up's check (Got it / Almost / Not yet), course and app results
// tagged with that skill (assets/skill-tags.js), and otherwise the child's age (skills for much younger children
// are taken as probably known, so "ready next" starts at the right place; a grown-up can mark any of them Not yet).
(() => {
  const KEY = "oc-skills";
  const here = document.currentScript.src;
  const base = new URL("marble/", here);
  const topics = new Map();
  const pre = new Map();
  const post = new Map();
  const loaded = new Set();
  const loading = new Map();

  window.MARBLE = {
    add(data) {
      for (const [id, domain, name, type, ageStart, ageEnd, description, evidence, prompt, standards, centrality] of data.topics)
        topics.set(id, { id, subject: data.subject, domain, name, type, ageStart, ageEnd, description, evidence, prompt, standards, centrality });
      for (const [topic, need, hard, reason] of data.deps) {
        (pre.get(topic) || pre.set(topic, []).get(topic)).push({ id: need, hard: !!hard, reason });
        (post.get(need) || post.set(need, []).get(need)).push({ id: topic, hard: !!hard, reason });
      }
      loaded.add(data.subject);
    },
  };
  const script = (url) =>
    new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = url;
      tag.onload = resolve;
      tag.onerror = reject;
      document.head.appendChild(tag);
    });
  const SLUGS = { Mathematics: "math", English: "english", Science: "science", History: "history", "Personal & Social Development": "social", "Life Skills": "life", Computing: "computing", "Learning to Learn": "learning" };
  const SUBJECTS = Object.keys(SLUGS);
  async function loadIndex() {
    if (!window.MARBLE_INDEX) await (loading.get("index") || loading.set("index", script(new URL("index.js", base))).get("index"));
    return window.MARBLE_INDEX;
  }
  // Load the skills of some subjects (all by default). Safe to call many times.
  async function load(subjects = SUBJECTS) {
    await loadIndex();
    await Promise.all(
      subjects
        .filter((s) => !loaded.has(s))
        .map((s) => loading.get(s) || loading.set(s, script(new URL(`${SLUGS[s]}.js`, base))).get(s)),
    );
  }

  // ---------- the child ----------
  const learner = () => (window.OC ? OC.current() : "") || "Learner";
  const AGE_OF_LEVEL = { Foundations: 4, "Level 2": 6, "Level 3": 8, "Level 4": 10, "Level 5": 11 };
  function ageOf(name = learner()) {
    const real = window.OC?.ageOf(name);
    const level = window.OC?.levelOf(name);
    // A child who works above or below their age is placed by the level they work at.
    const p = window.OC?.profile(name) || {};
    if (p.level && p.level !== "auto" && AGE_OF_LEVEL[p.level]) return AGE_OF_LEVEL[p.level];
    if (real !== null && real !== undefined) return real;
    return AGE_OF_LEVEL[level] ?? 6;
  }

  // ---------- checks a grown-up makes ----------
  const readAll = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    } catch {
      return {};
    }
  };
  const checks = (name = learner()) => readAll()[name] || {};
  const listeners = new Set();
  function check(id, status, { name = learner(), src = "check", note } = {}) {
    const all = readAll();
    const mine = (all[name] ||= {});
    if (status) mine[id] = { s: status, src, at: Date.now(), ...(note ? { note } : {}) };
    else delete mine[id];
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {}
    listeners.forEach((fn) => fn(id, status));
  }

  // ---------- evidence from courses and apps ----------
  // window.SKILL_TAGS: { courses: {id: {lesson: [ids]}}, apps: {path: {unit|"*": [ids]}}, weeks: {...}, activities: {path: activity name} }
  function fromWork(name = learner()) {
    const tags = window.SKILL_TAGS;
    const out = new Map();
    if (!tags) return out;
    let progress = {};
    try {
      progress = window.MUSIC ? MUSIC.progress.of(name) : JSON.parse(localStorage.getItem("oc-music") || "{}")[name] || {};
    } catch {}
    const bump = (id, status) => {
      const was = out.get(id);
      if (!was || (status === "yes" && was !== "yes")) out.set(id, status);
    };
    for (const [course, lessons] of Object.entries(tags.courses || {})) {
      const activity = window.OCCOURSES?.[course]?.activity;
      if (!activity) continue;
      for (const [n, ids] of Object.entries(lessons)) {
        const p = progress[`${activity}:l${Number(n) + 1}`]; // lesson units are l1…l32; tags count lessons from 0
        if (!p?.done) continue;
        const strong = p.of ? p.first / p.of >= 0.85 : false;
        ids.forEach((id) => bump(id, strong ? "yes" : "learning"));
      }
    }
    for (const [path, units] of Object.entries(tags.apps || {})) {
      const activity = tags.activities?.[path];
      if (!activity) continue;
      for (const [unit, ids] of Object.entries(units)) {
        const keys = unit === "*" ? Object.keys(progress).filter((k) => k.startsWith(`${activity}:`)) : [`${activity}:${unit}`];
        if (keys.some((k) => progress[k]?.done)) ids.forEach((id) => bump(id, "learning"));
      }
    }
    return out;
  }

  // Status of every skill: yes (mastered), almost, notyet, learning (practised in an app or lesson),
  // assumed (for a much younger child, so probably known), new.
  function statusMap(name = learner()) {
    const age = ageOf(name);
    const mine = checks(name);
    const work = fromWork(name);
    const map = new Map();
    for (const t of topics.values()) {
      const c = mine[t.id];
      if (c) map.set(t.id, c.s);
      else if (work.has(t.id)) map.set(t.id, work.get(t.id));
      else if (t.ageEnd < age) map.set(t.id, "assumed");
      else map.set(t.id, "new");
    }
    return map;
  }
  const known = (s) => s === "yes" || s === "assumed";
  // Ready: not yet known, and every hard prerequisite is known.
  function isReady(id, status) {
    const s = status.get(id);
    if (known(s)) return false;
    return (pre.get(id) || []).filter((p) => p.hard && topics.has(p.id)).every((p) => known(status.get(p.id)));
  }
  // What to learn next: skills already being practised first, then ready skills closest to the child's age,
  // the most connected (most other skills build on them) first.
  function next({ name = learner(), subjects = SUBJECTS, count = 6, status = statusMap(name) } = {}) {
    const age = ageOf(name);
    const ranked = [...topics.values()]
      .filter((t) => subjects.includes(t.subject) && t.ageStart <= age + 1 && isReady(t.id, status))
      .sort((a, b) => {
        const busy = (t) => ["learning", "almost", "notyet"].includes(status.get(t.id));
        const far = (t) => Math.abs(t.ageStart - (age - 0.5));
        return busy(b) - busy(a) || far(a) - far(b) || b.centrality - a.centrality;
      })
      .reduce((lanes, t) => (lanes.get(t.subject) || lanes.set(t.subject, []).get(t.subject)).push(t) && lanes, new Map());
    // Take turns across subjects (math, then English, then science…) so one subject does not fill the list.
    const order = SUBJECTS.map((s) => ranked.get(s)).filter(Boolean);
    const out = [];
    for (let i = 0; out.length < count && order.some((list) => list[i]); i++) for (const list of order) if (list[i] && out.length < count) out.push(list[i]);
    return out;
  }
  // Where on the site a skill is practised.
  function practice(id) {
    const tags = window.SKILL_TAGS;
    const out = [];
    if (!tags) return out;
    for (const [course, lessons] of Object.entries(tags.courses || {}))
      for (const [n, ids] of Object.entries(lessons))
        if (ids.includes(id)) {
          const c = window.OCCOURSES?.[course];
          out.push({ href: `course/${course}/#l${Number(n) + 1}`, label: `${c?.icon || "📘"} ${c?.title || course}: ${c?.lessons?.[n] || `lesson ${Number(n) + 1}`}` });
        }
    for (const [path, units] of Object.entries(tags.apps || {}))
      if (Object.values(units).some((ids) => ids.includes(id))) out.push({ href: path, label: `🎮 ${tags.names?.[path] || path}` });
    return out;
  }
  const prompt = (t, name = learner()) => (t.prompt || "").replace(/\{\{name\}\}/g, name === "Learner" ? "your child" : name);
  // Parent summaries for a subject at the child's age band.
  async function summaries(subjects, name = learner()) {
    const index = await loadIndex();
    const age = ageOf(name);
    const out = [];
    for (const subject of subjects) {
      const rows = index.clusters.filter((c) => c[0] === subject);
      const byDomain = new Map();
      for (const c of rows) {
        const have = byDomain.get(c[1]);
        // The band that starts at or just below the child's age; otherwise the youngest band.
        const fits = c[2] <= Math.max(age, 5);
        if (!have || (fits && (!have.fits || c[2] > have.c[2])) || (!fits && !have.fits && c[2] < have.c[2])) byDomain.set(c[1], { c, fits });
      }
      for (const { c } of byDomain.values()) out.push({ subject: c[0], domain: c[1], age: c[2], summary: c[3] });
    }
    return out;
  }

  // Subject pages: <section data-learning="Mathematics|…"> gets short parent summaries for the child's age.
  async function mountSummaries(root = document) {
    const boxes = [...root.querySelectorAll("[data-learning]")];
    if (!boxes.length) return;
    const who = learner();
    const name = who === "Learner" ? "your child" : who;
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    for (const box of boxes) {
      const rows = await summaries(box.dataset.learning.split("|"), who);
      if (!rows.length) continue;
      const line = (c) => `<p><b>${esc(c.domain)}.</b> ${esc(c.summary.replace(/^Your child/, name === "your child" ? "Your child" : name))}</p>`;
      box.innerHTML = `<h2>🧭 What ${esc(name)} is learning</h2><p class="oc-note">Around age ${ageOf(who)}, from the open Marble skill map. <a href="${box.dataset.skills || "../skills/"}">See ${esc(name)}'s skill map →</a></p>${rows.slice(0, 3).map(line).join("")}${rows.length > 3 ? `<details><summary>${rows.length - 3} more areas</summary>${rows.slice(3).map(line).join("")}</details>` : ""}`;
      box.hidden = false;
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => mountSummaries());
  else setTimeout(() => mountSummaries());

  window.SKILLS = { mountSummaries, load, loadIndex, topics, pre, post, SUBJECTS, learner, ageOf, checks, check, statusMap, known, isReady, next, practice, prompt, summaries, onChange: (fn) => listeners.add(fn) };
})();
