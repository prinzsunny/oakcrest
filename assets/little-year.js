// The little learner's year (Foundations level): LITTLE1 weeks turned into day-by-day lessons on the same
// family calendar, start date, school days and tick storage as the Year plan (YEAR), so both children share one
// week. Mostly off-screen: sounds, numbers, picture books, rhymes, play outside. Screens are short and shared
// with a grown-up (20 minutes by default). Same interface as YEAR, so the plan page renders either.
(() => {
  const DATA = window.LITTLE1;
  const Y = window.YEAR;
  if (!DATA || !Y) return;

  // [field, label, icon, minutes, times per week (0 = every school day), group for the CA record]
  const LANES = [
    ["sound", "Letter sounds", "🔤", 10, 0, "Reading & Writing"],
    ["number", "Numbers", "🔢", 10, 0, "Math"],
    ["shapes", "Shapes, colours and patterns", "🔺", 10, 2, "Math"],
    ["readAloud", "Picture books", "📖", 20, 0, "Reading & Writing"],
    ["rhyme", "Rhyme of the week", "🎵", 5, 0, "Reading & Writing"],
    ["story", "Bible story", "🙏", 10, 2, "Life Skills"],
    ["music", "Music and singing", "🎶", 10, 3, "Music"],
    ["art", "Art and little hands", "🎨", 15, 2, "Arts"],
    ["science", "Wonder and nature", "🍃", 15, 2, "Science"],
    ["move", "Move and play outside", "🤸", 45, 0, "PE & Movement"],
    ["life", "Little jobs", "🧺", 5, 0, "Life Skills"],
    ["virtue", "Virtue word", "🌟", 5, 0, "Life Skills"],
  ];
  // How often each subject's site practice comes up in a week (10 minutes, with a grown-up).
  const SITE_TIMES = { sound: 3, number: 2 };
  const NAMES = { "reading/little/": "Little Letters", "math/numbers/": "Number Fun", "math/addsub/": "Add & Subtract", "math/patterns/": "Patterns & Puzzles", "math/measure/": "Measure & Graphs", "math/shapes/": "Shapes & Angles", "math/timemoney/": "Clocks & Coins", "arts/colours/": "Colour Mixing", "arts/symmetry/": "Symmetry Studio", "arts/drawing/": "Drawing Lab", "music/little/": "Little Musicians", "music/rhythm/": "Rhythm Studio", "music/orchestra/": "Orchestra & Sound", "character/bible/": "Bible Stories" };
  const BUILT = new Set(window.OCAPPS || []);
  const built = (path) => !BUILT.size || BUILT.has(path.replace(/\/$/, ""));

  const settings = (learner) => {
    const s = Y.settings(learner);
    return { ...s, screen: s.screenSet ? s.screen : 20 };
  };

  // The rhyme of the week: the newest rhyme named in this or an earlier week's rhyme line; it stays the
  // rhyme to learn until the next new one (weeks without a line, or "revisit" lines, keep it going).
  const newRhymeIn = (w) => {
    const line = DATA.weeks[w]?.rhyme?.[0] || "";
    if (/^Revisit/i.test(line)) return null;
    return (DATA.rhymes || []).filter((x) => x.title && line.includes(x.title)).sort((a, b) => b.title.length - a.title.length)[0] || null;
  };
  const rhymeOf = (w) => {
    let from = w;
    while (from >= 0 && !newRhymeIn(from)) from -= 1;
    if (from < 0) return null;
    const r = newRhymeIn(from);
    let to = w;
    while (to < DATA.weeks.length - 1 && !newRhymeIn(to + 1) && !["break", "summer"].includes(DATA.weeks[to + 1].type)) to += 1;
    return { author: "Traditional", why: "Say it together a few times a day, with actions, until it can be said alone.", ...r, from, to };
  };

  function itemsOf(learner, w) {
    const week = DATA.weeks[w];
    if (!week) return [];
    const quiet = week.type === "break" || week.type === "summer";
    const items = [];
    const push = (it) => items.push({ screen: false, ...it });
    if (!quiet) push({ key: "devotion", lane: "family", icon: "🙏", label: "Family time", what: "Morning prayer or a quiet moment together, in your family's own way (5 min).", minutes: 5, times: 0, group: "Life Skills", optional: true });
    for (const [field, label, icon, minutes, times, group] of LANES) {
      const v = week[field];
      if (!v) continue;
      const [what, path] = v;
      push({ key: field, lane: field, icon, label, what, minutes: quiet ? Math.min(minutes, 15) : minutes, times: quiet && !["readAloud", "move"].includes(field) ? 1 : times, group });
      if (path && !quiet && built(path))
        push({ key: `${field}-site`, lane: field, icon: "💻", label: `Practice: ${NAMES[path] || label}`, what: "On OakCrest with a grown-up, about 10 minutes.", minutes: 10, times: SITE_TIMES[field] || 1, group, path, screen: true });
    }
    // Weeks without their own rhyme line keep saying the current rhyme.
    const rhyme = rhymeOf(w);
    if (!quiet && !week.rhyme && rhyme) push({ key: "rhyme", lane: "rhyme", icon: "🎵", label: "Rhyme of the week", what: `Keep saying "${rhyme.title}" together, with actions.`, minutes: 5, times: 0, group: "Reading & Writing" });
    return items;
  }

  const ORDER = ["devotion", "sound", "number", "shapes", "readAloud", "rhyme", "story", "science", "art", "music", "life", "virtue", "move"];
  const AFTER = ["devotion", "music", "move", "life", "virtue"];
  const rank = (it) => (it.screen ? 100 + ORDER.indexOf(it.key.replace("-site", "")) : ORDER.indexOf(it.key));

  // Same spreading as the Year plan: daily items every day, the rest balanced; screens kept to the budget.
  function daysOf(learner, w) {
    const s = settings(learner);
    const start = Y.weekStart(learner, w);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      if (s.days.includes(date.getDay())) days.push({ date, iso: Y.iso(date), items: [], minutes: 0, screen: 0 });
    }
    if (!days.length) return days;
    const all = itemsOf(learner, w);
    for (const it of all.filter((i) => i.times === 0)) for (const d of days) d.items.push(it);
    const load = (d) => d.items.reduce((m, i) => m + i.minutes, 0);
    const screenOf = (d) => d.items.filter((i) => i.screen).reduce((m, i) => m + i.minutes, 0);
    const rest = all.filter((i) => i.times > 0).sort((a, b) => a.screen - b.screen || b.times - a.times || b.minutes - a.minutes);
    for (const it of rest)
      for (let c = 0; c < Math.min(it.times, days.length); c++) {
        const free = days.filter((d) => !d.items.includes(it));
        free.sort((a, b) => (it.screen ? screenOf(a) - screenOf(b) : 0) || load(a) - load(b));
        free[0]?.items.push(it);
      }
    for (const d of days) {
      d.items.sort((a, b) => rank(a) - rank(b));
      let used = 0;
      d.items = d.items.map((it) => {
        const out = AFTER.includes(it.key) ? { ...it, after: true } : it;
        if (!it.screen) return out;
        if (used + it.minutes > s.screen) return { ...out, optional: true, over: true };
        used += it.minutes;
        return out;
      });
      d.minutes = d.items.filter((i) => !i.optional && !i.after).reduce((m, i) => m + i.minutes, 0);
      d.afterMinutes = d.items.filter((i) => !i.optional && i.after).reduce((m, i) => m + i.minutes, 0);
      d.screen = d.items.filter((i) => i.screen && !i.optional).reduce((m, i) => m + i.minutes, 0);
    }
    return days;
  }

  window.LYEAR = {
    kind: "little",
    DATA,
    LANES,
    settings,
    setSettings: Y.setSettings,
    ticks: Y.ticks,
    setTick: Y.setTick,
    weekStart: Y.weekStart,
    weekIndexOf: Y.weekIndexOf,
    tickKey: Y.tickKey,
    checkKey: Y.checkKey,
    iso: Y.iso,
    itemsOf,
    daysOf,
    lessonsOf: () => [],
    memoryOf: rhymeOf,
    GLANCE: LANES.map(([k, l, i]) => [k, `${i} ${l}`]),
  };
})();
