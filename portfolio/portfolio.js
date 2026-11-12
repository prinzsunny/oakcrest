// Learning portfolio: one printable page of dated evidence for a learner, built from what OakCrest already records.
// Reads: oc-skills (via SKILLS.statusMap), oc-soroban-adv, oc-log, oc-stickers, oc-drawing-gallery.
// Writes: oc-portfolio { learner: { noteId: { at, date, subject, text } | { at, gone: true } } } (synced by cloud.js).
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = OC.escapeHtml;
  const NOTES = "oc-portfolio";
  const read = (key, fallback) => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "null");
      return v ?? fallback;
    } catch {
      return fallback;
    }
  };
  const fmt = (t) => (t ? new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "");
  const hours = (min) => (min >= 60 ? `${Math.round(min / 6) / 10} h` : `${Math.round(min)} min`);

  // Soroban worlds in order (5 levels each), copied from math/soroban/index.html.
  const WORLDS = ["Bead Garden", "Counting Forest", "Little Friends Island", "Big Friends Mountain", "Mixed Friends Volcano", "Two-Digit Castle", "Speed Sky", "Hundreds Harbor", "Crystal Caves", "Number Ninja Dojo", "Thousand Peaks", "Long Sum Lagoon", "Comet Run", "Ten-Thousand Temple", "Galaxy of Rows", "Lightning Lab", "Million Mountains", "Dragon's Den", "Champion Arena", "Grandmaster Summit", "Zero Zoo", "Carry Canyon", "Hop Hill", "Flash Falls", "Echo Valley", "Double Dome", "Ten-Million Sea", "Take-Away Swamp", "Row Tower", "Thunder Flash", "Billion Bay", "Palindrome Palace", "Moon Maze", "Echo Storm", "Rocket Relay", "Puzzle Pyramid", "Giant Glacier", "Phoenix Peak", "Super Flash Stadium", "Legend Castle", "Times Table Tower"];
  const SORO_SKILLS = { "five+": "Five-friends adding", "five-": "Five-friends taking away", "ten+": "Carrying with ten-friends", "ten-": "Borrowing with ten-friends", "combo+": "Both friends adding", "combo-": "Both friends taking away", "ripple+": "Domino carries", "ripple-": "Domino borrows" };
  for (let t = 2; t <= 9; t++) SORO_SKILLS[`x${t}`] = `The ${t} times table`;

  const learner = () => $("[data-learner]").value || OC.current() || "Learner";

  function fillLearners() {
    const sel = $("[data-learner]");
    const names = OC.learners();
    const want = sel.value || OC.current();
    sel.innerHTML = (names.length ? names : ["Learner"]).map((n) => `<option${n === want ? " selected" : ""}>${esc(n)}</option>`).join("");
  }

  // ---------- skills ----------
  function skillRows(name) {
    const status = SKILLS.statusMap(name);
    const checks = SKILLS.checks(name);
    const age = OC.ageOf(name) ?? SKILLS.ageOf(name);
    const rows = [];
    for (const [id, s] of status) {
      if (s !== "yes") continue;
      const t = SKILLS.topics.get(id);
      if (!t) continue;
      const c = checks[id];
      rows.push({ t, ahead: t.ageStart > age, by: c?.s === "yes" ? (c.src === "check" ? "Grown-up check" : "Lesson, app or quest") : "Lesson, app or quest", at: c?.s === "yes" ? c.at : 0 });
    }
    rows.sort((a, b) => b.t.ageStart - a.t.ageStart || a.t.subject.localeCompare(b.t.subject));
    return { rows, age };
  }
  const band = (t) => (t.ageEnd && t.ageEnd !== t.ageStart ? `${t.ageStart}–${t.ageEnd}` : `${t.ageStart}`);

  function renderAhead(rows, age) {
    const ahead = rows.filter((r) => r.ahead);
    $("[data-ahead-note]").textContent = age === null || age === undefined ? "Add a birthday on the learner's profile so skills can be compared with their age." : `Skills shown that children usually learn after age ${age}.`;
    if (!ahead.length) return ($("[data-ahead]").innerHTML = `<p class="pf-empty">None recorded yet. Finish lessons, or tick "Got it" on the Learning Adventure, to add evidence here.</p>`);
    $("[data-ahead]").innerHTML = `<table class="pf-table"><thead><tr><th>Skill</th><th>Subject</th><th>Typical age</th><th>Shown by</th><th>Date</th></tr></thead><tbody>${ahead
      .map(({ t, by, at }) => `<tr><td><b>${esc(t.name)}</b>${t.description ? `<br><small>${esc(t.description)}</small>` : ""}</td><td>${esc(t.subject)}<br><small>${esc(t.domain || "")}</small></td><td class="num"><span class="pf-tag ahead">${band(t)}</span></td><td>${by}</td><td class="num">${fmt(at)}</td></tr>`)
      .join("")}</tbody></table>`;
  }

  function renderSubjects(rows) {
    if (!rows.length) return ($("[data-subjects]").innerHTML = `<p class="pf-empty">No skills recorded yet.</p>`);
    const by = new Map();
    for (const r of rows) (by.get(r.t.subject) || by.set(r.t.subject, []).get(r.t.subject)).push(r);
    $("[data-subjects]").innerHTML = [...by]
      .map(([subject, list]) => `<h3 class="pf-sub">${esc(subject)} · ${list.length}${list.some((r) => r.ahead) ? ` <span class="pf-tag ahead">${list.filter((r) => r.ahead).length} ahead</span>` : ""}</h3><ul class="pf-list">${list
        .slice(0, 40)
        .map((r) => `<li>${esc(r.t.name)} <small>(age ${band(r.t)})</small></li>`)
        .join("")}${list.length > 40 ? `<li><small>…and ${list.length - 40} more</small></li>` : ""}</ul>`)
      .join("");
  }

  // ---------- soroban ----------
  function soroban(name) {
    const data = read("oc-soroban-adv", {})[name] || {};
    const levels = data.levels || {};
    const done = Object.entries(levels)
      .filter(([, v]) => v && v.stars > 0)
      .map(([id, v]) => {
        const [, w, l] = id.match(/^w(\d+)l(\d+)$/) || [];
        return { w: Number(w), l: Number(l), no: Number(w) * 5 + Number(l) + 1, ...v };
      })
      .filter((x) => Number.isFinite(x.no))
      .sort((a, b) => a.no - b.no);
    return { data, done };
  }
  function renderSoroban(name) {
    const { data, done } = soroban(name);
    if (!done.length) return { top: 0, html: `<p class="pf-empty">No Soroban levels beaten yet.</p>` };
    const top = done[done.length - 1];
    const three = done.filter((x) => x.stars === 3).length;
    const total = WORLDS.length * 5;
    const strong = Object.entries(data.skills || {})
      .filter(([k, s]) => SORO_SKILLS[k] && s.n >= 5 && !s.weak && s.err < 0.15)
      .map(([k, s]) => `${SORO_SKILLS[k]} <small>(${s.n} problems)</small>`);
    const practicing = Object.entries(data.skills || {})
      .filter(([k, s]) => SORO_SKILLS[k] && s.weak)
      .map(([k]) => SORO_SKILLS[k]);
    // Milestones: each world completed (all 5 levels), with the date its last level was first beaten when known.
    const worlds = [];
    WORLDS.forEach((wname, w) => {
      const lv = done.filter((x) => x.w === w);
      if (lv.length === 5) {
        const at = Math.max(...lv.map((x) => x.at || 0));
        worlds.push(`<tr><td>${w + 1}</td><td>${esc(wname)}</td><td class="num">Levels ${w * 5 + 1}–${w * 5 + 5}</td><td class="num">${lv.reduce((s, x) => s + x.stars, 0)} / 15 ⭐</td><td class="num">${fmt(at) || "—"}</td></tr>`);
      }
    });
    const best = done.filter((x) => x.best && Number.isFinite(x.best)).slice(-3);
    const html = `<ul class="pf-list">
      <li>Highest level beaten: <b>Level ${top.no} of ${total}</b> (${esc(WORLDS[top.w] || "")})${top.at ? `, ${fmt(top.at)}` : ""}</li>
      <li>${done.length} levels beaten, ${three} with 3 stars (no hints, at most one slip)</li>
      ${data.warm ? `<li>Daily warm-up: best run ${data.warm.best} days in a row</li>` : ""}
      ${best.length ? `<li>Recent timed bests: ${best.map((x) => `Level ${x.no} in ${x.best}s`).join(", ")}</li>` : ""}
      ${strong.length ? `<li>Strong skills: ${strong.join("; ")}</li>` : ""}
      ${practicing.length ? `<li>Still practicing: ${practicing.map(esc).join(", ")}</li>` : ""}
    </ul>${worlds.length ? `<h3 class="pf-sub">Worlds completed</h3><table class="pf-table"><thead><tr><th>#</th><th>World</th><th>Levels</th><th>Stars</th><th>Finished</th></tr></thead><tbody>${worlds.join("")}</tbody></table>` : ""}`;
    return { top: top.no, html };
  }

  // ---------- time ----------
  function renderTime(name) {
    const entries = OC.log().filter((e) => (e.learner || "Learner") === name);
    const since = Date.now() - 365 * 86400000;
    const recent = entries.filter((e) => new Date(e.date).getTime() >= since);
    const by = {};
    for (const e of recent) by[e.subject || "Other"] = (by[e.subject || "Other"] || 0) + (Number(e.minutes) || 0);
    const total = Object.values(by).reduce((a, b) => a + b, 0);
    const days = new Set(recent.map((e) => e.date)).size;
    const max = Math.max(1, ...Object.values(by));
    $("[data-time]").innerHTML = total
      ? `<p class="pf-note">Last 12 months: ${hours(total)} over ${days} ${days === 1 ? "day" : "days"}.</p><div class="pf-bars">${Object.entries(by)
          .sort((a, b) => b[1] - a[1])
          .map(([s, m]) => `<div class="pf-bar"><span>${esc(s)}</span><i><b style="width:${(m / max) * 100}%"></b></i><span>${hours(m)}</span></div>`)
          .join("")}</div>`
      : `<p class="pf-empty">Nothing in the learning log yet.</p>`;
    return { total, days, first: entries[0]?.date };
  }

  // ---------- progress report: doing well, needs work, next steps ----------
  const yearOf = (name) => (OC.levelOf?.(name) === "Foundations" ? window.LYEAR : window.YEAR);
  // Planned steps over the last 4 weeks (before today), and how many were ticked done, by subject group and by step.
  function planReport(name) {
    const E = yearOf(name);
    if (!E) return null;
    const t = E.ticks(name);
    const today = E.iso(new Date());
    const from = new Date();
    from.setDate(from.getDate() - 28);
    const fromIso = E.iso(from);
    const now = E.weekIndexOf(name);
    const groups = {}, steps = {};
    let planned = 0, done = 0, days = 0, fullDays = 0;
    for (let w = Math.max(0, E.weekIndexOf(name, from)); w <= Math.min(51, now); w++)
      for (const day of E.daysOf(name, w)) {
        if (day.iso < fromIso || day.iso >= today) continue;
        const items = day.items.filter((it) => !it.optional && !it.after);
        if (!items.length) continue;
        days += 1;
        let got = 0;
        for (const it of items) {
          const ok = !!t[E.tickKey(w, day.iso, it)]?.done;
          const g = (groups[it.group || "Other"] ||= { planned: 0, done: 0 });
          const s = (steps[it.label.split(":")[0]] ||= { planned: 0, done: 0, icon: it.icon });
          g.planned += 1; s.planned += 1; planned += 1;
          if (ok) { g.done += 1; s.done += 1; done += 1; got += 1; }
        }
        if (got === items.length) fullDays += 1;
      }
    return { planned, done, days, fullDays, groups, steps };
  }
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const meter = (p) => `<span class="pf-meter" aria-hidden="true"><b class="${p < 60 ? "low" : ""}" style="width:${p}%"></b></span>`;
  function renderReport(name, rows, age) {
    const good = [], work = [];
    const loaded = SKILLS.topics.size > 0;
    if (rows.length) {
      const by = {};
      for (const r of rows) by[r.t.subject] = (by[r.t.subject] || 0) + 1;
      const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 2);
      good.push(`Most skills shown in <b>${top.map(([s, n]) => `${esc(s)} (${n})`).join("</b> and <b>")}</b>`);
      const ahead = rows.filter((r) => r.ahead);
      if (ahead.length) good.push(`${ahead.length} ${ahead.length === 1 ? "skill" : "skills"} ahead of age, such as <b>${ahead.slice(0, 3).map((r) => esc(r.t.name)).join(", ")}</b>`);
    }
    // Grown-up checks that said "almost" or "not yet", and skills started but not yet secure.
    if (loaded) {
      const status = SKILLS.statusMap(name);
      const by = { almost: [], notyet: [], learning: [] };
      for (const [id, s] of status) if (by[s]) { const tp = SKILLS.topics.get(id); if (tp) by[s].push(tp.name); }
      const more = (list) => (list.length > 4 ? ` and ${list.length - 4} more` : "");
      if (by.notyet.length) work.push(`Not yet, from grown-up checks: <b>${by.notyet.slice(0, 4).map(esc).join(", ")}</b>${more(by.notyet)}`);
      if (by.almost.length) work.push(`Almost there: <b>${by.almost.slice(0, 4).map(esc).join(", ")}</b>${more(by.almost)}`);
      if (by.learning.length) work.push(`Started but not yet secure: ${by.learning.slice(0, 4).map(esc).join(", ")}${more(by.learning)}`);
    }
    const sk = (read("oc-soroban-adv", {})[name] || {}).skills || {};
    const strong = Object.entries(sk).filter(([k, s]) => SORO_SKILLS[k] && s.n >= 5 && !s.weak && s.err < 0.15).map(([k]) => SORO_SKILLS[k]);
    const weak = Object.entries(sk).filter(([k, s]) => SORO_SKILLS[k] && (s.weak || (s.n >= 5 && s.err >= 0.3))).map(([k, s]) => `${esc(SORO_SKILLS[k])} <small>(${Math.round((1 - s.err) * 100)}% right)</small>`);
    if (strong.length) good.push(`Soroban: accurate at ${strong.slice(0, 3).map(esc).join(", ")}`);
    if (weak.length) work.push(`Soroban: ${weak.slice(0, 3).join(", ")}`);
    const plan = planReport(name);
    let planHtml = `<p class="pf-empty">No plan days in the last 4 weeks.</p>`;
    if (plan && plan.planned) {
      const overall = pct(plan.done, plan.planned);
      if (overall >= 80) good.push(`Finishes the daily plan: ${overall}% of steps done over the last 4 weeks`);
      else if (overall < 60) work.push(`Daily plan: only ${overall}% of steps done over the last 4 weeks (${plan.fullDays} of ${plan.days} days fully finished)`);
      const groups = Object.entries(plan.groups).map(([g, v]) => [g, pct(v.done, v.planned), v]).sort((a, b) => a[1] - b[1]);
      const skipped = Object.entries(plan.steps).filter(([, v]) => v.planned >= 2 && pct(v.done, v.planned) < 50).sort((a, b) => pct(a[1].done, a[1].planned) - pct(b[1].done, b[1].planned)).slice(0, 4);
      if (skipped.length) work.push(`Plan steps most often skipped: ${skipped.map(([l, v]) => `<b>${esc(v.icon || "")} ${esc(l)}</b> (${v.done} of ${v.planned})`).join(", ")}`);
      const best = groups.filter(([, p, v]) => p >= 85 && v.planned >= 3).slice(-2);
      if (best.length) good.push(`Keeps up with ${best.map(([g, p]) => `<b>${esc(g)}</b> (${p}%)`).join(" and ")} in the plan`);
      planHtml = `<p class="pf-note">${plan.done} of ${plan.planned} steps done (${overall}%), ${plan.fullDays} of ${plan.days} lesson days fully finished.</p><table class="pf-table"><thead><tr><th>Subject</th><th>Done</th><th class="num">Steps</th></tr></thead><tbody>${groups
        .map(([g, p, v]) => `<tr><td>${esc(g)}</td><td>${meter(p)}${p}%</td><td class="num">${v.done} / ${v.planned}</td></tr>`)
        .join("")}</tbody></table>`;
    }
    $("[data-plan-report]").innerHTML = planHtml;
    $("[data-good]").innerHTML = (good.length ? good : ["Not enough records yet. Finish lessons, Soroban levels and plan steps to build this up."]).map((x) => `<li>${x}</li>`).join("");
    $("[data-work]").innerHTML = (work.length ? work : [loaded ? "Nothing flagged. Keep going!" : "Loading skills…"]).map((x) => `<li>${x}</li>`).join("");
    // Next steps: skills she is ready for (prerequisites known), with where to practice them on the site.
    const next = loaded && age !== null && age !== undefined ? SKILLS.next({ name, count: 6 }) : [];
    $("[data-next]").innerHTML = next.length
      ? next.map((tp) => { const where = SKILLS.practice(tp.id)[0]; return `<li><b>${esc(tp.name)}</b> <small>(${esc(tp.subject)}, age ${band(tp)})</small>${where ? ` · practice: <a href="../${esc(where.href)}">${esc(where.label)}</a>` : ""}</li>`; }).join("")
      : `<li>${loaded ? "Add a birthday on the learner's profile to get suggestions." : "Loading…"}</li>`;
    $("[data-report-note]").textContent = `Written from the site's records on ${fmt(Date.now())}: skills shown in lessons, apps and grown-up checks, Soroban accuracy, and which daily-plan steps were ticked done.`;
  }

  // ---------- notes ----------
  const allNotes = () => read(NOTES, {});
  const notesOf = (name) =>
    Object.entries(allNotes()[name] || {})
      .filter(([, n]) => n && !n.gone && n.text)
      .map(([id, n]) => ({ id, ...n }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  function saveNote(name, id, value) {
    const all = allNotes();
    (all[name] ||= {})[id] = { ...value, at: Date.now() };
    localStorage.setItem(NOTES, JSON.stringify(all));
  }
  function renderNotes(name) {
    const list = notesOf(name);
    $("[data-notes]").innerHTML = list.length
      ? `<table class="pf-table"><thead><tr><th>Date</th><th>Subject</th><th>Observation</th><th class="no-print"></th></tr></thead><tbody>${list
          .map((n) => `<tr><td class="num">${esc(n.date)}</td><td>${esc(n.subject || "")}</td><td>${esc(n.text).replace(/\n/g, "<br>")}</td><td class="no-print"><button type="button" class="pf-del" data-del="${esc(n.id)}" aria-label="Remove note">✕</button></td></tr>`)
          .join("")}</tbody></table>`
      : `<p class="pf-empty">No notes yet.</p>`;
  }

  function renderArt() {
    const items = read("oc-drawing-gallery", []);
    const ok = Array.isArray(items) ? items.filter((x) => x && typeof x.src === "string" && x.src.startsWith("data:image/")) : [];
    $("[data-art-sec]").hidden = !ok.length;
    $("[data-art]").innerHTML = ok.map((x) => `<figure><img src="${x.src}" alt="${esc(x.title || "Drawing")}"><figcaption>${esc(x.title || "Drawing")}${x.at ? ` · ${fmt(x.at)}` : ""}</figcaption></figure>`).join("");
  }

  function render() {
    const name = learner();
    const age = OC.ageOf(name);
    $("[data-title]").textContent = `${name === "Learner" ? "Learning" : `${name}'s learning`} portfolio`;
    document.title = `${name} · Learning portfolio · OakCrest Academy`;
    const { rows, age: skillAge } = skillRows(name);
    renderAhead(rows, age ?? skillAge);
    renderSubjects(rows);
    renderReport(name, rows, age ?? skillAge);
    const soro = renderSoroban(name);
    $("[data-soroban]").innerHTML = soro.html;
    const time = renderTime(name);
    renderNotes(name);
    renderArt();
    const stickers = Object.keys(read("oc-stickers", {})[name] || {}).length;
    const ahead = rows.filter((r) => r.ahead).length;
    $("[data-sub]").textContent = [age !== null ? `Age ${age}` : "", time.first ? `Records from ${fmt(time.first)} to ${fmt(Date.now())}` : `Printed ${fmt(Date.now())}`].filter(Boolean).join(" · ");
    const tile = (n, label) => `<div class="pf-tile"><b>${n}</b><small>${label}</small></div>`;
    $("[data-tiles]").innerHTML = [tile(rows.length, "skills shown"), tile(ahead, "ahead of age"), tile(soro.top ? `L${soro.top}` : "—", "top Soroban level"), tile(time.total ? hours(time.total) : "—", "learning, past year"), tile(time.days || "—", "learning days, past year"), tile(stickers, "quest stickers")].join("");
    $("[data-foot]").textContent = `Made from OakCrest Academy records on ${fmt(Date.now())}. Typical ages and skill descriptions come from the Marble Skill Taxonomy. "Lesson, app or quest" means the skill was shown by finishing a tagged lesson, app or skill quest with strong first-try accuracy; "Grown-up check" means a parent watched the skill and marked it Got it.`;
  }

  // ---------- wiring ----------
  OC.chip($("[data-chip]"), { onSwitch: () => { $("[data-learner]").value = OC.current(); render(); } });
  fillLearners();
  const form = $("[data-note-form]");
  form.subject.innerHTML = OC.SUBJECTS.map((s) => `<option>${esc(s)}</option>`).join("");
  form.date.value = OC.dayOf(new Date());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = form.text.value.trim();
    if (!text) return;
    saveNote(learner(), `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, { date: form.date.value, subject: form.subject.value, text });
    form.text.value = "";
    renderNotes(learner());
  });
  $("[data-notes]").addEventListener("click", (event) => {
    const id = event.target.closest("[data-del]")?.dataset.del;
    if (!id || !confirm("Remove this note?")) return;
    saveNote(learner(), id, { gone: true });
    renderNotes(learner());
  });
  $("[data-learner]").addEventListener("change", render);
  $("[data-print]").addEventListener("click", () => print());
  OC.onChange(() => { fillLearners(); render(); });
  window.OCLOUD?.onChange?.(render);
  render(); // soroban, log and notes show at once; skills fill in once the taxonomy has loaded
  SKILLS.load().then(render, () => ($("[data-ahead]").innerHTML = `<p class="pf-empty">Skills couldn't load. Check the connection and reload.</p>`));
})();
