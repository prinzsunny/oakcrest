// Sticker album: winning a skill's quest (half or more right) gives that skill a sticker, once per skill.
// Each island (subject) has its own page of 10 stickers; a full page adds a golden sticker.
// Every sticker is also a soroban key 🔑: the soroban spends 3 keys to open a new world.
// Stored per learner in "oc-stickers": { learner: { skillId: { at, subject } } }.
(() => {
  const KEY = "oc-stickers";
  const PER_PAGE = 10;
  const WORLD_COST = 3;
  const read = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };
  const who = () => (window.OC && OC.current()) || "Learner";

  // One page per skill-map island, with the island's look.
  const PAGES = [
    { subject: "Mathematics", name: "Number Mountain", icon: "🏔️", tint: "#3b5bdb", golden: ["🏔️", "Summit"],
      set: [["🦙", "Llama"], ["🐐", "Goat"], ["🦅", "Eagle"], ["⛰️", "Peak"], ["🧗", "Climber"], ["🏕️", "Tent"], ["🦫", "Marmot"], ["❄️", "Snowflake"], ["🐆", "Snow Leopard"], ["🚡", "Cable Car"]] },
    { subject: "English", name: "Story Forest", icon: "🌳", tint: "#d6336c", golden: ["📖", "Storybook"],
      set: [["🐇", "Rabbit"], ["🦊", "Fox"], ["🐻", "Bear"], ["🧚", "Fairy"], ["🍄", "Toadstool"], ["🦔", "Hedgehog"], ["🐸", "Frog Prince"], ["🪄", "Magic Wand"], ["🐺", "Wolf"], ["🦉", "Owl"]] },
    { subject: "Science", name: "Discovery Island", icon: "🔬", tint: "#0c8599", golden: ["🚀", "Rocket"],
      set: [["🦋", "Butterfly"], ["🐞", "Ladybug"], ["🧲", "Magnet"], ["🌋", "Volcano"], ["🦎", "Lizard"], ["🔭", "Telescope"], ["🧪", "Potion"], ["🐝", "Bee"], ["🪐", "Planet"], ["🦠", "Microbe"]] },
    { subject: "History", name: "Time Castle", icon: "🏰", tint: "#e67700", golden: ["🏰", "Castle"],
      set: [["🏺", "Vase"], ["🗿", "Stone Head"], ["👑", "Crown"], ["🛡️", "Shield"], ["⚔️", "Swords"], ["🐫", "Camel"], ["🏛️", "Temple"], ["📜", "Scroll"], ["🦣", "Mammoth"], ["⛵", "Ship"]] },
    { subject: "Personal & Social Development", name: "Friendship Village", icon: "🏡", tint: "#e03131", golden: ["💖", "Big Heart"],
      set: [["🤝", "Friends"], ["🎈", "Balloon"], ["🌻", "Sunflower"], ["🐶", "Puppy"], ["🐱", "Kitten"], ["🧸", "Teddy"], ["💌", "Letter"], ["🍰", "Cake"], ["🎁", "Gift"], ["🌈", "Rainbow"]] },
    { subject: "Life Skills", name: "Market Town", icon: "🛒", tint: "#9c36b5", golden: ["🏪", "Shop"],
      set: [["🍎", "Apple"], ["🥕", "Carrot"], ["🧺", "Basket"], ["🪙", "Coin"], ["🍞", "Bread"], ["🧀", "Cheese"], ["🍋", "Lemon"], ["🛒", "Cart"], ["🧁", "Cupcake"], ["🍉", "Melon"]] },
    { subject: "Computing", name: "Robot Factory", icon: "🤖", tint: "#1098ad", golden: ["👾", "Pixel Pal"],
      set: [["🤖", "Robot"], ["⚙️", "Gear"], ["💡", "Bulb"], ["🔋", "Battery"], ["🕹️", "Joystick"], ["📡", "Antenna"], ["🛸", "UFO"], ["💾", "Disk"], ["🔌", "Plug"], ["🦾", "Robot Arm"]] },
    { subject: "Learning to Learn", name: "Brain Gym", icon: "🧠", tint: "#f76707", golden: ["🏆", "Trophy"],
      set: [["🧠", "Brain"], ["💪", "Muscle"], ["🏅", "Medal"], ["🎯", "Target"], ["🧩", "Puzzle"], ["⏱️", "Timer"], ["🪁", "Kite"], ["🏃", "Runner"], ["🎒", "Backpack"], ["🌟", "Glow Star"]] },
  ];
  const PAGE = Object.fromEntries(PAGES.map((p) => [p.subject, p]));

  const mine = (name = who()) => read(KEY, {})[name] || {};
  // The nth sticker on an island: the set repeats, and from the second page on it is sparkly.
  const nth = (page, n) => {
    const [emoji, label] = page.set[n % PER_PAGE];
    return n < PER_PAGE ? [emoji, label] : [emoji, `Sparkly ${label}`, true];
  };
  // Stickers on one island, oldest first.
  function onPage(subject, name = who()) {
    const page = PAGE[subject];
    if (!page) return [];
    return Object.entries(mine(name))
      .filter(([, s]) => s.subject === subject)
      .sort((a, b) => a[1].at - b[1].at)
      .map(([id], n) => ({ id, sticker: nth(page, n) }));
  }
  const count = (name = who()) => Object.values(mine(name)).filter((s) => PAGE[s.subject]).length;
  const goldens = (name = who()) => PAGES.reduce((sum, p) => sum + Math.floor(onPage(p.subject, name).length / PER_PAGE), 0);

  // Keys: one per sticker, less the ones the soroban spent opening worlds.
  function keys(name = who()) {
    const opened = read("oc-soroban-adv", {})[name]?.opened || [];
    const earned = count(name);
    return { earned, spent: opened.length * WORLD_COST, left: Math.max(0, earned - opened.length * WORLD_COST), cost: WORLD_COST };
  }

  // Called when a quest is won. Returns the new sticker (and a golden one for a full page), or null if it was already won.
  function earn(topic, name = who()) {
    const page = PAGE[topic.subject];
    if (!page) return null;
    const all = read(KEY, {});
    const me = all[name] || {};
    if (me[topic.id]) return null;
    me[topic.id] = { at: Date.now(), subject: topic.subject };
    all[name] = me;
    write(KEY, all);
    const n = onPage(topic.subject, name).length;
    return { page, sticker: nth(page, n - 1), golden: n % PER_PAGE === 0 ? page.golden : null, keys: keys(name) };
  }
  const has = (id, name = who()) => !!mine(name)[id];

  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const html = ([emoji, label, shiny], { golden = false, tilt = 0 } = {}) =>
    `<span class="st-sticker${golden ? " golden" : ""}${shiny ? " shiny" : ""}" style="--tilt:${tilt}deg"><span class="st-emoji">${emoji}</span><small>${esc(label)}</small></span>`;
  const empty = (label = "?", golden = false) => `<span class="st-sticker empty${golden ? " golden" : ""}"><span class="st-emoji">?</span><small>${esc(label)}</small></span>`;

  const css = document.createElement("style");
  css.textContent = `
.st-sticker{display:inline-flex;flex-direction:column;align-items:center;gap:2px;min-width:86px;padding:8px 10px 6px;border-radius:20px;background:#fff;box-shadow:0 0 0 3px #fff,0 4px 12px rgba(60,35,15,.25);transform:rotate(var(--tilt,0deg));font-family:"Nunito",ui-rounded,system-ui,sans-serif}
.st-emoji{font-size:38px;line-height:1.1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.15))}
.st-sticker small{font-size:12px;font-weight:800;color:#5a4130;white-space:nowrap}
.st-sticker.shiny{background:linear-gradient(135deg,#fdf0ff,#e7f3ff 50%,#fff6d1);box-shadow:0 0 0 3px #d8c4f2,0 4px 12px rgba(80,50,120,.25)}
.st-sticker.golden{background:linear-gradient(135deg,#fff6d1,#f3d77a 50%,#fff3c4);box-shadow:0 0 0 3px #e2b33c,0 5px 16px rgba(160,110,10,.4);animation:st-shine 2.4s ease-in-out infinite}
.st-sticker.empty{background:rgba(255,255,255,.5);box-shadow:none;outline:2px dashed #c9b8a1;outline-offset:-2px;transform:none;animation:none}
.st-sticker.empty .st-emoji{color:#c9b8a1;font-weight:900;filter:none}
.st-sticker.empty.golden{outline-color:#e2b33c}
.st-reveal{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;margin:4px 0 12px}
.st-reveal>div{display:flex;flex-direction:column;align-items:center;gap:6px;animation:st-flip .8s cubic-bezier(.32,.72,0,1) both}
.st-reveal p{margin:0!important;font-size:15px!important;color:#7a4520!important}
@keyframes st-flip{0%{opacity:0;transform:rotateY(90deg) scale(.4)}100%{opacity:1;transform:none}}
@keyframes st-shine{50%{filter:brightness(1.12) drop-shadow(0 0 8px rgba(242,176,30,.6))}}
@media (prefers-reduced-motion:reduce){.st-sticker.golden,.st-reveal>div{animation:none}}`;
  document.head.append(css);

  window.STICKERS = { KEY, PAGES, PAGE, PER_PAGE, WORLD_COST, mine, onPage, count, goldens, keys, earn, has, html, empty };
})();
