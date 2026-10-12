// The Year plan engine: turns YEAR1 weeks into day-by-day lessons on the family's school days.
// Order follows the family plan: math first, screens later, read-aloud every day, short screen tasks only.
(() => {
  const DATA = window.YEAR1;
  const read = (key, fallback) => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateOf = (s) => new Date(`${s}T00:00:00`);

  // One big question a week, for discussion (philosophy for children: reasons, not right answers).
  const QUESTIONS = [
    "What makes someone a good friend?", "Is it ever OK to tell a lie?", "What is fair? Is fair always the same for everyone?", "Why do we keep promises?",
    "Can you be brave and scared at the same time?", "What makes something beautiful?", "Is it OK to keep a secret?", "What are you thankful for that you can't see?",
    "Why do people make rules?", "Can animals be kind?", "What is a mind?", "If no one would ever know, would you still be honest?",
    "Is it better to be smart or to be kind?", "What makes a home a home?", "Why do we say sorry?", "Is a robot alive?",
    "What would you do if you saw someone left out?", "Can you be happy and sad at once?", "What does it mean to be patient?", "Who is a hero?",
    "Why do we share?", "Is it OK to break a rule to help someone?", "What makes a good question?", "Why do people disagree?",
    "What is the most important thing to learn?", "Do you have to like someone to be kind to them?", "What is a mistake? Is it bad?", "Where do ideas come from?",
    "Why do we remember people from long ago?", "What does it mean to forgive?", "Can something be true even if you can't see it?", "What makes a promise strong?",
    "What would the world be like without numbers?", "Why do stories have heroes and villains?", "Is it brave to say 'I don't know'?", "What makes a team work well?",
    "Is it fair if everyone gets the same?", "Why should we take care of animals and nature?", "What is wisdom?", "Who decides what is right?",
    "What would you invent to help people?", "What does it mean to grow up?", "Is it OK to change your mind?", "Why do we wonder?",
    "What makes you you?", "Can a word hurt? Can a word heal?", "What is something hard that is worth doing?", "Why do we celebrate?",
    "What do you owe your family?", "What makes learning fun?", "Why is the truth important?", "What will you be proud of next year?",
  ];

  // Subject lanes: [field, label, icon, minutes, times per week (0 = every school day), group for the CA record]
  const LANES = [
    ["math", "Math (Beast Academy book)", "🔢", 45, 0, "Math"],
    ["mental", "Mental math", "🧠", 10, 0, "Math"],
    ["phonics", "Phonics (Explode the Code)", "🔤", 20, 0, "Reading & Writing"],
    ["writing", "Writing: copywork, sentences, grammar", "✍️", 20, 0, "Reading & Writing"],
    ["words", "Word Roots and Latin", "🏛️", 15, 2, "Languages"],
    ["science", "Science", "🔬", 30, 2, "Science"],
    ["history", "History and geography", "🌍", 30, 2, "History & Social Studies"],
    ["logic", "Logic", "🧩", 15, 3, "Math"],
    ["readAloud", "Read-aloud and narration", "📖", 40, 0, "Reading & Writing"],
    ["art", "Art", "🎨", 20, 2, "Arts"],
    ["music", "Piano", "🎹", 15, 0, "Music"],
    ["chess", "Chess", "♟️", 15, 0, "Other"],
    ["virtue", "Character", "🌟", 5, 0, "Life Skills"],
    ["extra", "This week's special", "✨", 20, 1, "Other"],
  ];

  const APPS = {
    "math/place/": "Place Value", "math/addsub/": "Add & Subtract", "math/numbers/": "Number Fun", "math/games/": "Math Games", "math/patterns/": "Patterns & Puzzles",
    "math/measure/": "Measure & Graphs", "math/timemoney/": "Clocks & Coins", "math/times/": "Times Tables", "math/fractions/": "Fraction Kitchen", "math/shapes/": "Shapes & Angles",
    "math/soroban/": "Soroban", "reading/phonics/": "Phonics Lab", "reading/words/": "Words & Sentences", "reading/latin/": "Latin Lab", "tech/logic/": "Logic Lab",
    "tech/chess/": "Chess School", "tech/code/": "Code the Robot", "science/physics/": "Physics Lab", "science/chemistry/": "Chemistry Lab", "science/flying/": "Flying Creatures",
    "history/world/": "World & Ancient Times", "arts/drawing/": "Drawing Lab", "arts/artists/": "Famous Artists", "arts/tangram/": "Tangram Puzzles", "arts/symmetry/": "Symmetry Studio",
    "music/theory/": "Music Theory", "music/rhythm/": "Rhythm Studio", "music/ear/": "Ear Training", "character/think/": "Big Questions",
  };
  // The part of a week's note that matches the practice app (e.g. the "Lab:" sentence for Chemistry Lab).
  const HINT = { "science/physics/": /Lab/, "science/chemistry/": /Lab/, "science/flying/": /Zoology/, "music/ear/": /Ear Training/, "music/rhythm/": /Rhythm/, "music/theory/": /Music Theory|theory/i, "arts/artists/": /Famous Artists/, "reading/latin/": /Latin/, "reading/words/": /Sentence Composing|First Language|sentences/, "tech/logic/": /Building Thinking|Mind Benders|Logic Lab/, "tech/chess/": /[Cc]hess/ };
  const topicOf = (what, path) => {
    const parts = what.split(/(?<=\.) (?=[A-Z])/);
    const pick = (HINT[path] && parts.find((p) => HINT[path].test(p))) || parts[0];
    return pick.replace(/^[^:]*?(Beast Academy \d\w|Explode the Code Book [\d½]+|Story of the World|Zoology|Building Thinking Skills|Mind Benders|Word Roots Beginning|Drawing with Children|Famous Artists|Ear Training|Rhythm Studio|Music Theory|Latin|Lab|Logic Lab)[^:]*:\s*/, "").replace(/\.$/, "");
  };
  // ───────────── Year 1 courses (course/<id>/, 32 lessons each) ─────────────
  // Each course was written against the 32 school weeks of the family plan (weeks 1–35 without the breaks),
  // so lesson N belongs to school week N: math follows Beast Academy's order, history Story of the World,
  // character the year's virtue order, science alternates zoology and labs. Coding starts in January, as the
  // family plan says, and spreads its 32 lessons over the weeks from then to the end of the year.
  const COURSE_DATA = window.OCCOURSES || {};
  const BUILT = new Set(window.OCAPPS || []);
  const built = (path) => BUILT.has(path.replace(/\/$/, ""));
  // [course id, lane it sits beside, record group]; the order is the screen priority within the budget.
  const COURSES = [
    ["math", "math", "Math"], ["reading", "readAloud", "Reading & Writing"], ["writing", "writing", "Reading & Writing"],
    ["history", "history", "History & Social Studies"], ["science", "science", "Science"], ["words", "words", "Languages"],
    ["logic", "logic", "Math"], ["rhetoric", "readAloud", "Reading & Writing"], ["character", "virtue", "Life Skills"],
    ["music", "music", "Music"], ["coding", "scratch", "Tech"],
  ].filter(([id]) => COURSE_DATA[id]);
  const SCHOOL = DATA.weeks.map((wk, i) => (i < 35 && ["learn", "review", "light"].includes(wk.type) ? i : -1)).filter((i) => i >= 0);
  const spread = (slots, n) => {
    const at = new Map();
    for (let k = 0; k < n; k++) {
      const w = slots[Math.min(slots.length - 1, Math.floor((k * slots.length) / n))];
      at.set(w, [...(at.get(w) || []), k]);
    }
    return at;
  };
  const SCHEDULE = Object.fromEntries(
    COURSES.map(([id]) => {
      const n = COURSE_DATA[id].lessons.length;
      const slots = id === "coding" ? DATA.weeks.map((wk, i) => (i >= 12 && wk.type !== "break" ? i : -1)).filter((i) => i >= 0) : SCHOOL;
      return [id, spread(slots, n)];
    }),
  );
  // Course lessons due in week w: [{ id, n (1-based), title, lane, group }].
  const lessonsOf = (w) =>
    COURSES.flatMap(([id, lane, group]) => (SCHEDULE[id].get(w) || []).map((k) => ({ id, n: k + 1, title: COURSE_DATA[id].lessons[k], lane, group, course: COURSE_DATA[id] })));
  // The week in which a course lesson is planned (0-based week index), for the curriculum and checks.
  const weekOfLesson = (id, n) => {
    for (const [w, ks] of SCHEDULE[id] || []) if (ks.includes(n - 1)) return w;
    return -1;
  };

  // Advanced apps: optional practice that fits the week's subject. Optional items never use the screen budget.
  const ADVANCED = [
    ["mental", "math/mastery/", "Times Tables Mastery", "Today's spaced retrieval set and one strategy (about 10 minutes).", (w) => w >= 12],
    ["math", "math/geometry/", "Geometry Pro", "Measurement, area and perimeter at the next level (about 10 minutes).", (w, wk) => /Measurement|area|perimeter|shape/i.test(wk.math?.[0] || "")],
    ["phonics", "reading/spelling/", "Spelling & Cursive", "One spelling rule and a line of joined handwriting (about 10 minutes).", (w) => w >= 8],
    ["chess", "tech/tactics/", "Chess Tactics", "Three tactics puzzles: find the fork, pin or mate before moving (about 10 minutes).", (w) => w >= 12],
    ["logic", "tech/logicpro/", "Logic Pro", "One deduction grid or knights-and-knaves puzzle, reasoned aloud (about 10 minutes).", (w) => w >= 12],
    ["music", "music/grades/", "Theory Grades 1–2", "One theory topic: keys, intervals or time signatures (about 10 minutes).", (w) => w >= 12],
    ["history", "history/geography/", "World Geography", "Find this week's places: latitude, longitude and the map (about 10 minutes).", (w, wk) => /map|Nile|Africa|India|China|Greece|Rome|Persia|Americas/i.test(wk.history?.[0] || "")],
    ["science", "science/earth/", "Earth Science", "Connect this week's science to the Earth itself (about 10 minutes).", (w, wk) => /Earth|crystal|compass/i.test(wk.science?.[0] || "")],
    ["extra", "history/middleages/", "The Middle Ages", "A first look at the Middle Ages, alongside Story of the World Vol. 2 (about 10 minutes).", (w) => w >= 45],
  ];
  const ADV_PER_WEEK = 3;

  const settings = (learner) => {
    const s = read("oc-year", {})[learner]?.settings || {};
    return { start: s.start || DATA.start, days: s.days || [2, 4, 6, 0], screen: s.screen ?? 30, soroban: s.soroban ?? true };
  };
  const setSettings = (learner, patch) => {
    const all = read("oc-year", {});
    const mine = (all[learner] ||= {});
    mine.settings = { ...settings(learner), ...patch, at: Date.now() };
    write("oc-year", all);
  };
  const ticks = (learner) => read("oc-year", {})[learner] || {};
  const setTick = (learner, key, value) => {
    const all = read("oc-year", {});
    const mine = (all[learner] ||= {});
    if (value === null) delete mine[key];
    else mine[key] = { ...(typeof value === "object" ? value : { done: value }), at: Date.now() };
    write("oc-year", all);
  };

  const weekStart = (learner, w) => {
    const d = dateOf(settings(learner).start);
    d.setDate(d.getDate() + 7 * w);
    return d;
  };
  const weekIndexOf = (learner, date = new Date()) => {
    const start = dateOf(settings(learner).start);
    const diff = Math.floor((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86400000);
    return Math.floor(diff / 7);
  };

  // Everything planned for a week, before it is spread over days.
  function itemsOf(learner, w) {
    const week = DATA.weeks[w];
    if (!week) return [];
    const quiet = week.type === "break" || week.type === "summer";
    const items = [];
    const push = (it) => items.push({ screen: false, ...it });
    const due = lessonsOf(w);
    const covered = new Set(due.map((l) => l.lane));
    if (!quiet) push({ key: "devotion", lane: "family", icon: "🙏", label: "Family time", what: "Morning prayer or quiet reflection, in your family's own way (5–10 min).", minutes: 10, times: 0, group: "Life Skills", optional: true });
    for (const [field, label, icon, minutes, times, group] of LANES) {
      const v = week[field];
      if (!v) continue;
      const [what, path] = v;
      // In quiet weeks everything is light: once or twice, never daily book work.
      // The read-aloud links to the reading log (an off-screen book, logged in a minute).
      const own = field === "readAloud" && built("reading/booklog/") ? "reading/booklog/" : "";
      push({ key: field, lane: field, icon, label, what, minutes: quiet ? Math.min(minutes, 20) : minutes, times: quiet && field !== "readAloud" ? (field === "music" ? 0 : 1) : times, group, path: own });
      // Website practice for that subject: short, later in the day, counts toward the screen budget.
      // When a course lesson covers the subject this week, the lesson is the screen work instead.
      if (path && !quiet && covered.has(field)) continue;
      if (path && !quiet) push({ key: `${field}-site`, lane: field, icon: "💻", label: `Practice: ${APPS[path] || label.split(" (")[0]}`, what: `On OakCrest, about 10 minutes. This week: ${topicOf(what, path)}.`, minutes: 10, times: field === "math" || field === "phonics" ? 2 : 1, group, path, screen: true });
      else if (path && quiet && field === "mental") push({ key: `${field}-site`, lane: field, icon: "💻", label: "Practice: math games", what: "Math games on OakCrest (about 10 minutes).", minutes: 10, times: 1, group, path, screen: true });
    }
    if (!quiet) {
      if (w >= 4) push({ key: "zaccaro", lane: "math", icon: "🏔️", label: "Challenge problems", what: "Primary Grade Challenge Math (Zaccaro): 2–3 challenge problems on this week's topic. Struggle first; write the best one in the Solution Notebook.", minutes: 20, times: 1, group: "Math" });
      if (settings(learner).soroban) push({ key: "soroban", lane: "math", icon: "🧮", label: "Soroban", what: "Soroban practice for her class: the next level (10 minutes).", minutes: 10, times: 3, group: "Math", path: "math/soroban/", screen: true });
      push({ key: "think", lane: "character", icon: "💭", label: "Big question", what: `Talk it through together: “${QUESTIONS[w % QUESTIONS.length]}” She answers with “I think… because…”, then considers another view.`, minutes: 15, times: 1, group: "Life Skills", path: "character/think/" });
      // Weekly habits from the family plan (master guide and year-by-year guide).
      if (w >= 4) push({ key: "storysci", lane: "science", icon: "📜", label: "Story of Science", what: "Read a chapter of The Story of Science: Aristotle Leads the Way aloud, and talk about the scientist's big question.", minutes: 20, times: 1, group: "Science" });
      if (w >= 8) push({ key: "fred", lane: "math", icon: "🍎", label: "Life of Fred (math story)", what: "Read a chapter of Life of Fred: Apples together, a funny story with math inside. Do its little questions out loud.", minutes: 15, times: 2, group: "Math", evening: true });
      if (w >= 12) push({ key: "freewrite", lane: "writing", icon: "📝", label: "Freewrite", what: "10 minutes: she writes (or tells you to write) anything she likes. No corrections. Writing is for expression.", minutes: 10, times: 1, group: "Reading & Writing" });
      if (w >= 4) push({ key: "nature", lane: "science", icon: "🍃", label: "Nature journal", what: "On a walk, find one living thing. Draw it in the nature journal and write (or dictate) one sentence.", minutes: 20, times: 1, group: "Science", evening: true });
      push({ key: "heritage", lane: "languages", icon: "🗣️", label: "Home language", what: "Heritage-language lesson with the tutor (about 30 minutes). Video calls with grandparents in the home language count too.", minutes: 30, times: 1, group: "Languages", evening: true });
      if (w >= 27) push({ key: "money", lane: "life", icon: "🫙", label: "Money jars", what: "Sort this week's allowance into three jars: give, save, spend. Talk about one choice.", minutes: 10, times: 1, group: "Life Skills", evening: true });
      if (week.type === "review") push({ key: "poetry", lane: "reading", icon: "🫖", label: "Poetry teatime", what: "Tea at a special table: read poems aloud together. She recites the poem she is learning.", minutes: 20, times: 1, group: "Reading & Writing", evening: true });
      if (w >= 12 && !covered.has("scratch")) push({ key: "scratch", lane: "tech", icon: "🐱", label: "Coding (exploring)", what: "Scratch or Code the Robot, just exploring (30 minutes a week, no pressure).", minutes: 30, times: 1, group: "Tech", path: "tech/code/", screen: true });
    }
    // This week's course lessons: one lesson of each course, screen time, beside its subject.
    for (const l of due)
      push({ key: `course-${l.id}${l.n}`, lane: l.lane, with: l.lane, icon: l.course.icon, label: `Lesson ${l.n}: ${l.title}`, what: `${l.course.title} course, lesson ${l.n} of ${l.course.lessons.length}: slides, practice and the challenge set. Then explain the main idea aloud in 2–4 sentences.`, minutes: 15, times: 1, group: l.group, path: `course/${l.id}/#l${l.n}`, screen: true, course: l.id, lesson: l.n });
    // Summer and the first weeks of Year 2: time to finish any course lesson that was left for later.
    if (w >= 35 && COURSES.length)
      push({ key: "catchup", lane: "courses", icon: "🎓", label: "Course catch-up", what: "Finish one Year 1 course lesson that was left for later, or redo the one you found hardest. Explain its main idea aloud afterwards.", minutes: 15, times: quiet ? 3 : 1, group: "Other", path: "curriculum/#courses", screen: true });
    // Optional advanced practice that matches the week (at most three, never counted in the screen budget).
    if (!quiet) {
      let n = 0;
      const codingLesson = due.find((l) => l.id === "coding")?.n || 0;
      const adv = [...ADVANCED];
      if (w >= 12) adv.splice(5, 0, ["scratch", codingLesson >= 18 ? "tech/python/" : "tech/blocks/", codingLesson >= 18 ? "First Python" : "Block Coding Studio", codingLesson >= 18 ? "Type and run a short Python program from this week's coding lesson (about 10 minutes)." : "Build one small program with loops and conditions (about 10 minutes).", () => true]);
      for (const [field, path, name, what, fits] of adv) {
        if (n >= ADV_PER_WEEK) break;
        if (!built(path) || !(field === "scratch" || field === "extra" || week[field]) || !fits(w, week)) continue;
        n += 1;
        push({ key: `adv-${path.split("/")[1]}`, lane: field, icon: "🚀", label: `Advanced: ${name}`, what, minutes: 10, times: 1, group: "Other", path, screen: true, optional: true, adv: true });
      }
    }
    push({ key: "pe", lane: "pe", icon: "🤸", label: "Move and play outside", what: "At least 30 minutes outdoors, plus ballet or swimming on lesson days.", minutes: 30, times: 0, group: "PE & Movement" });
    if (!quiet) push({ key: "review", lane: "life", icon: "🌙", label: "Day review", what: "Before bed: what I did, what I learned, what I will do tomorrow. She says it; you write it in her journal.", minutes: 5, times: 0, group: "Life Skills" });
    // How it works: this week's machine (an interactive figure once it is built).
    const how = (window.HOWWORKS || [])[w];
    if (how) {
      const built = (window.HOWBUILT || []).includes(how.slug);
      push({ key: "how", lane: "science", icon: how.icon, label: `How it works: ${how.title.replace(/^(A|An) /, "a ").replace(/^a /, "A ")}`, what: `${how.blurb}${built ? " Explore the moving picture, then explain it back in your own words." : " (Interactive picture coming soon: look at a real one together, or find it in a book.)"}`, minutes: 20, times: 1, group: "Science", path: built ? `how/${how.slug}/` : "", screen: built });
    }
    // One practice item per page each week (e.g. two math lanes that use the same page).
    const seen = new Set();
    return items.filter((it) => !it.screen || !it.path || it.key === "how" || (seen.has(it.path) ? false : seen.add(it.path)));
  }

  // Order in the day: family time, math first, then language, then knowledge, read-aloud, afternoon practice, screens last.
  const ORDER = ["devotion", "math", "zaccaro", "mental", "phonics", "writing", "freewrite", "words", "science", "storysci", "how", "history", "logic", "readAloud", "think", "art", "music", "chess", "heritage", "nature", "virtue", "extra", "pe", "poetry", "money", "fred", "review", "soroban", "scratch"];
  const SCREEN_FIRST = ["how", "soroban"];
  // Screens last in the day: the machine, soroban, course lessons (in priority order), app practice, catch-up, optional advanced.
  const rank = (it) => {
    if (!it.screen) return ORDER.indexOf(it.key);
    if (SCREEN_FIRST.includes(it.key)) return 100 + SCREEN_FIRST.indexOf(it.key);
    if (it.course) return 110 + COURSES.findIndex(([id]) => id === it.course);
    if (it.adv) return 300;
    if (it.key === "catchup") return 250;
    return 150 + ORDER.indexOf(it.key.replace("-site", ""));
  };

  // Spread a week's items over its school days: daily items every day, the rest balanced by minutes.
  function daysOf(learner, w) {
    const s = settings(learner);
    const start = weekStart(learner, w);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (s.days.includes(d.getDay())) dates.push(d);
    }
    const days = dates.map((date) => ({ date, iso: iso(date), items: [], minutes: 0, screen: 0 }));
    if (!days.length) return days;
    const all = itemsOf(learner, w);
    for (const it of all.filter((i) => i.times === 0)) for (const d of days) d.items.push(it);
    // Spread the rest: most frequent first, each copy to the least-loaded day that doesn't have it yet.
    // Screen items are placed after the rest, in priority order, so the most important ones fit the budget first.
    const rest = all.filter((i) => i.times > 0).sort((a, b) => a.screen - b.screen || (a.screen ? rank(a) - rank(b) : b.times - a.times || b.minutes - a.minutes));
    const load = (d) => d.items.reduce((m, i) => m + i.minutes, 0);
    for (const it of rest) {
      const copies = Math.min(it.times, days.length);
      for (let c = 0; c < copies; c++) {
        const free = days.filter((d) => !d.items.includes(it));
        // A course lesson goes on a day that already has its subject, when there is one.
        const beside = it.with ? free.filter((d) => d.items.some((i) => i.key === it.with)) : [];
        const options = beside.length ? beside : free;
        const screenOf = (d) => d.items.filter((i) => i.screen && !i.adv).reduce((m, i) => m + i.minutes, 0);
        options.sort((a, b) => (it.screen ? screenOf(a) - screenOf(b) : 0) || load(a) - load(b));
        options[0]?.items.push(it);
      }
    }
    const AFTER = ["devotion", "music", "chess", "virtue", "pe", "heritage", "nature", "money", "poetry", "fred", "review"];
    for (const d of days) {
      d.items.sort((a, b) => rank(a) - rank(b));
      d.items = d.items.map((it) => (AFTER.includes(it.key) ? { ...it, after: true } : it));
      // Keep screens inside the budget: extra screen items become optional for that day.
      let used = 0;
      d.items = d.items.map((it) => {
        if (!it.screen || it.adv) return it;
        if (used + it.minutes > s.screen) return { ...it, optional: true, over: true };
        used += it.minutes;
        return it;
      });
      d.minutes = d.items.filter((i) => !i.optional && !i.after).reduce((m, i) => m + i.minutes, 0);
      d.afterMinutes = d.items.filter((i) => !i.optional && i.after).reduce((m, i) => m + i.minutes, 0);
      d.screen = d.items.filter((i) => i.screen && !i.optional).reduce((m, i) => m + i.minutes, 0);
    }
    return days;
  }

  const tickKey = (w, dayIso, item) => `${w}:${dayIso}:${item.key}`;
  const checkKey = (w) => `check:${w}`;

  window.YEAR = { DATA, QUESTIONS, LANES, COURSES, SCHEDULE, SCHOOL, lessonsOf, weekOfLesson, settings, setSettings, ticks, setTick, weekStart, weekIndexOf, itemsOf, daysOf, tickKey, checkKey, iso };
})();
