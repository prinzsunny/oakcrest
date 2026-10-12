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
    if (!quiet) push({ key: "devotion", lane: "family", icon: "🙏", label: "Family time", what: "Morning prayer or quiet reflection, in your family's own way (5–10 min).", minutes: 10, times: 0, group: "Life Skills", optional: true });
    for (const [field, label, icon, minutes, times, group] of LANES) {
      const v = week[field];
      if (!v) continue;
      const [what, path] = v;
      // In quiet weeks everything is light: once or twice, never daily book work.
      push({ key: field, lane: field, icon, label, what, minutes: quiet ? Math.min(minutes, 20) : minutes, times: quiet && field !== "readAloud" ? (field === "music" ? 0 : 1) : times, group, path: "" });
      // Website practice for that subject: short, later in the day, counts toward the screen budget.
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
      if (w >= 12) push({ key: "scratch", lane: "tech", icon: "🐱", label: "Coding (exploring)", what: "Scratch or Code the Robot, just exploring (30 minutes a week, no pressure).", minutes: 30, times: 1, group: "Tech", path: "tech/code/", screen: true });
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
  const rank = (it) => (it.screen ? 100 + (SCREEN_FIRST.includes(it.key) ? SCREEN_FIRST.indexOf(it.key) : 10 + ORDER.indexOf(it.key.replace("-site", ""))) : ORDER.indexOf(it.key));

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
    const rest = all.filter((i) => i.times > 0).sort((a, b) => b.times - a.times || b.minutes - a.minutes);
    const load = (d) => d.items.reduce((m, i) => m + i.minutes, 0);
    for (const it of rest) {
      const copies = Math.min(it.times, days.length);
      for (let c = 0; c < copies; c++) {
        const options = days.filter((d) => !d.items.includes(it));
        options.sort((a, b) => (it.screen ? a.items.filter((i) => i.screen).length - b.items.filter((i) => i.screen).length : 0) || load(a) - load(b));
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
        if (!it.screen) return it;
        used += it.minutes;
        return used > s.screen ? { ...it, optional: true, over: true } : it;
      });
      d.minutes = d.items.filter((i) => !i.optional && !i.after).reduce((m, i) => m + i.minutes, 0);
      d.afterMinutes = d.items.filter((i) => !i.optional && i.after).reduce((m, i) => m + i.minutes, 0);
      d.screen = d.items.filter((i) => i.screen && !i.optional).reduce((m, i) => m + i.minutes, 0);
    }
    return days;
  }

  const tickKey = (w, dayIso, item) => `${w}:${dayIso}:${item.key}`;
  const checkKey = (w) => `check:${w}`;

  window.YEAR = { DATA, QUESTIONS, LANES, settings, setSettings, ticks, setTick, weekStart, weekIndexOf, itemsOf, daysOf, tickKey, checkKey, iso };
})();
