// Skills: what each child knows, and what they are ready to learn next.
// Built on the Marble Skill Taxonomy (see assets/marble/ and /credits/): 1,590 small skills linked by prerequisites.
// A skill's status comes from, in order: a grown-up's check (Got it / Almost / Not yet), course and app results
// tagged with that skill (assets/skill-tags.js), and otherwise the child's age (skills for much younger children
// are taken as probably known, so "ready next" starts at the right place; a grown-up can mark any of them Not yet).
(() => {
  const KEY = "oc-skills";
  const here = document.currentScript.src;
  const base = new URL("marble/", here);
  // ---------- American English ----------
  // Marble was written for the US and the UK. OakCrest is a US school, so its text is shown in American English
  // (spelling, dollars and cents, school grades), England-only topics are left out, and only US standards are shown.
  // American English for Marble's text (it was written for the US and the UK).
  const US_WORDS = {
    maths: "math", mum: "mom", mums: "moms", sweets: "candy", biscuit: "cookie", biscuits: "cookies", torch: "flashlight", torches: "flashlights",
    grey: "gray", programme: "program", programmes: "programs", aluminium: "aluminum", defence: "defense", defences: "defenses", licence: "license", catalogue: "catalog",
    practise: "practice", practised: "practiced", practises: "practices", practising: "practicing", anticlockwise: "counterclockwise", lorry: "truck", lorries: "trucks",
    petrol: "gas", nappy: "diaper", nappies: "diapers", rubbish: "trash", pence: "cents", penny: "cent", pennies: "cents", "pocket money": "allowance", "full stop": "period", "full stops": "periods",
    "inverted commas": "quotation marks", "car park": "parking lot", "pounds and pence": "dollars and cents", "pound coin": "dollar coin", "football pitch": "soccer field", tyre: "tire", tyres: "tires",
    plough: "plow", ploughed: "plowed", jewellery: "jewelry", cheque: "check", mould: "mold", moulds: "molds", sceptical: "skeptical", "towards": "toward",
  };
  // -ise / -isation verbs that become -ize in American English (words like "precise" or "exercise" are not touched).
  const IZE = "recogn|organ|summar|general|special|civil|fertil|factor|capital|emphas|synthes|memor|categor|priorit|real|apolog|critic|visual|personal|standard|minim|maxim|symbol|harmon|sympath|util|fossil|colon|modern|industrial|normal|character|public|mobil|final|optim|theor|energ|sanit|ideal|alphabet|item|random|digit|magnet|steril|vapor|vapour|crystall|stabil|neutral|central|legal|total|social|vocal|verbal|agon|human|emphasis|hypothes|global|urban|familiar|polar|national|commercial|natural|external|internal|motor|scrutin|patron|terror|summar|author|custom|equal|individual|tantal|jeopard|merchand|categor|catalog|computer|economi|immun|ostrac|politic|western|vandal|mechan|plagiar|famil|item|stigmat|tranquil|rational|material|initial|serial|special";
  const IZE_RE = new RegExp(`\\b(${IZE})is(e|ed|es|ing|ation|ations|er|ers)\\b`, "gi");
  const LYSE_RE = /\b(ana|para|cata|dia)lys(e|ed|es|ing)\b/gi;
  const OUR = "colo|behavio|favo|neighbo|hono|labo|harbo|humo|flavo|rumo|odo|armo|savo|endeavo|parlo|vigo|rigo|valo|cando|clamo|splendo|tumo|vapo|ardo|fervo|glamo";
  const OUR_RE = new RegExp(`\\b(${OUR})ur(s|ed|ing|ite|ites|able|ful|fully|less|ly|ism|ist|ists|hood|hoods)?\\b`, "gi");
  const TRE_RE = /\b(cen|me|li|thea|fib|calib|lus|somb|kilome|centime|millime|millili|amphithea)tre(s|d)?\b/gi;
  const LL_RE = /\b(travel|label|model|cancel|counsel|fuel|signal|total|level|marvel|jewel|dial|equal|tunnel|channel|quarrel|shovel|pedal|snorkel|yodel)l(ed|ing|er|ers)\b/gi;
  const keepCase = (from, to) => (from[0] === from[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to);
  function us(text) {
    if (!text || typeof text !== "string") return text;
    let t = text
      .replace(/£\s?(\d+(?:\.\d+)?)/g, "$$$1")
      .replace(/\b(\d+)p\b/g, "$1¢")
      // A UK school year is one ahead of the US grade: Year 1 is kindergarten, Year 3 is 2nd grade.
      .replace(/\bYear ([1-6])(?:(\s*(?:and|-|–|to)\s*)([1-6]))?\b/g, (m, a, sep, b) => {
        const g = (n) => (Number(n) === 1 ? "kindergarten" : `${Number(n) - 1}`);
        return b ? `grade ${g(a)}${sep}${g(b)}` : Number(a) === 1 ? "kindergarten" : `grade ${g(a)}`;
      })
      .replace(IZE_RE, (m, stem, end) => keepCase(m, stem.toLowerCase() + "iz" + end.toLowerCase()))
      .replace(LYSE_RE, (m, pre, end) => keepCase(m, pre.toLowerCase() + "lyz" + end.toLowerCase()))
      .replace(OUR_RE, (m, stem, end = "") => keepCase(m, stem.toLowerCase() + "r" + end.toLowerCase()))
      .replace(TRE_RE, (m, stem, end = "") => keepCase(m, stem.toLowerCase() + "ter" + end.toLowerCase()))
      .replace(LL_RE, (m, stem, end) => keepCase(m, stem.toLowerCase() + end.toLowerCase()));
    for (const [uk, am] of Object.entries(US_WORDS)) t = t.replace(new RegExp(`\\b${uk}\\b`, "gi"), (m) => keepCase(m, am));
    return t;
  }

  const UK_ONLY = /\bBritain\b|Anglo-Saxon/;
  // Gentle history for young children: skills about war, conquest, slavery, killing or plague are left out,
  // and a few mentions in the skills that stay are softened.
  const HIDDEN = new Set(["mt_xAG0aMeAIN", "mt_NnlnxCx1DO", "mt_5qNMVZi3dQ", "mt_HZyUwycFvf", "mt_e1Yr6rhRNW", "mt_VP9yZJ1xeP", "mt_14F_x1Xwwp", "mt_MlD0gwLSw9", "mt_XMz_ohNjYO", "mt_H4bLNkDrGJ", "mt_c-F__Qe23X", "mt_EHiM4_qg1R", "mt_aXNlkbAeIk", "mt__o3TCmfomv", "mt_M_xcaRcvSo", "mt_X5fdB4haHf", "mt_OiDHqtLoln", "mt_CqzsM0BDFP", "mt_8oAzr0WxRb", "mt_Zy-CKUkq34", "mt_6XnezHOcM3"]);
  const GENTLE = [
    [/women, enslaved people, and foreigners/gi, "women and foreigners"],
    [/,? ?enslaved people,?/gi, ""],
    [/\(Roman conquest\)/g, "(when Rome took over)"],
    [/Athena \(wisdom, warfare\)/g, "Athena (wisdom, crafts)"],
    [/,? ?Ares \(war\)/g, ""],
  ];
  const gentle = (t) => (typeof t === "string" ? GENTLE.reduce((x, [re, to]) => x.replace(re, to), t) : t);
  const usStandard = (code) => !/^uk-nc/.test(code);

  const topics = new Map();
  const pre = new Map();
  const post = new Map();
  const loaded = new Set();
  const loading = new Map();

  window.MARBLE = {
    add(data) {
      for (const [id, domain, name, type, ageStart, ageEnd, description, evidence, prompt, standards, centrality] of data.topics) {
        if (UK_ONLY.test(name) || HIDDEN.has(id)) continue;
        topics.set(id, { id, subject: data.subject, domain, name: us(name), type, ageStart, ageEnd, description: us(gentle(description)), evidence: evidence.map((e) => us(gentle(e))), prompt: us(gentle(prompt)), standards: standards.filter(usStandard), centrality });
      }
      for (const [topic, need, hard, reason0] of data.deps) {
        const reason = us(reason0);
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
    const index = window.MARBLE_INDEX;
    if (!index.us) {
      index.clusters = index.clusters.map(([s, d, a, summary]) => [s, d, a, us(summary)]);
      index.us = true;
    }
    return index;
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
    // Clearing keeps an empty, dated entry, so family-account sync does not bring the old check back.
    mine[id] = { s: status || "", src, at: Date.now(), ...(note ? { note } : {}) };
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
      if (c?.s) map.set(t.id, c.s);
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

  // Goals: skills a grown-up picks to work toward. Saved with the checks as "goal:<id>".
  const goals = (name = learner()) =>
    Object.entries(checks(name))
      .filter(([k, v]) => k.startsWith("goal:") && v.s === "goal" && topics.has(k.slice(5)))
      .sort((a, b) => b[1].at - a[1].at)
      .map(([k]) => k.slice(5));
  const setGoal = (id, on, name = learner()) => check(`goal:${id}`, on ? "goal" : null, { name });
  // The steps to a skill: every skill that must come before it (hard prerequisites) and is not known yet, in an order that can be learned
  // (each step comes after the steps it needs).
  function pathTo(id, status = statusMap()) {
    const need = new Set();
    const stack = [id];
    while (stack.length)
      for (const p of pre.get(stack.pop()) || [])
        if (p.hard && topics.has(p.id) && !need.has(p.id) && !known(status.get(p.id))) (need.add(p.id), stack.push(p.id));
    const depth = new Map();
    const d = (x) => {
      if (depth.has(x)) return depth.get(x);
      depth.set(x, 0);
      const v = 1 + Math.max(-1, ...(pre.get(x) || []).filter((p) => need.has(p.id)).map((p) => d(p.id)));
      depth.set(x, v);
      return v;
    };
    return [...need].sort((a, b) => d(a) - d(b) || topics.get(a).ageStart - topics.get(b).ageStart);
  }

  window.SKILLS = { us, mountSummaries, goals, setGoal, pathTo, load, loadIndex, topics, pre, post, SUBJECTS, learner, ageOf, checks, check, statusMap, known, isReady, next, practice, prompt, summaries, onChange: (fn) => listeners.add(fn) };
})();
