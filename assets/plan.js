// The month plan: 4 weeks of Tuesday, Thursday, Saturday and Sunday lessons, in two tracks.
// Each item: [path from the site root, what to do, minutes].
(() => {
  const BIG = [
    {
      theme: "Numbers and first code",
      days: [
        [["math/soroban/", "Soroban: play the next 2 levels", 10], ["math/place/", "Place Value: See it, then build numbers", 15], ["tech/code/", "Code the Robot: See it, then First steps", 15], ["music/theory/", "Music Theory: treble clef notes", 10]],
        [["math/soroban/", "Soroban: next level", 10], ["math/place/", "Place Value: expanded form and rounding", 15], ["tech/code/", "Code the Robot: Sequences", 15], ["music/rhythm/", "Rhythm Studio: See it, keep the beat", 10]],
        [["math/addsub/", "Add & Subtract: See it, then column adding", 15], ["arts/colours/", "Colour Mixing: See it, mix paints", 15], ["music/orchestra/", "Orchestra & Sound: See it, meet the families", 15]],
        [["math/patterns/", "Patterns & Puzzles: See it, finish the pattern", 15], ["arts/artists/", "Famous Artists: See it, then Mondrian", 20], ["music/ear/", "Ear Training: higher or lower", 10]],
      ],
    },
    {
      theme: "Adding, shapes and bugs",
      days: [
        [["math/soroban/", "Soroban: next level", 10], ["math/addsub/", "Add & Subtract: carrying in columns", 15], ["tech/code/", "Code the Robot: Debug it", 15], ["music/theory/", "Music Theory: rhythm and time signatures", 10]],
        [["math/soroban/", "Soroban: next level", 10], ["math/addsub/", "Add & Subtract: borrowing in columns", 15], ["math/shapes/", "Shapes & Angles: See it, shape hunt", 15], ["music/rhythm/", "Rhythm Studio: copy my rhythm", 10]],
        [["math/shapes/", "Shapes & Angles: solid shapes, faces and edges", 15], ["arts/drawing/", "Drawing Lab: See it, draw with shapes", 20], ["music/orchestra/", "Orchestra & Sound: guess the instrument", 10]],
        [["math/timemoney/", "Clocks & Coins: See it, what time is it?", 15], ["arts/artists/", "Famous Artists: Kandinsky and Seurat", 20], ["music/ear/", "Ear Training: steps or skips", 10]],
      ],
    },
    {
      theme: "Times tables, time and loops",
      days: [
        [["math/soroban/", "Soroban: next level", 10], ["math/times/", "Times Tables: See it, arrays", 15], ["tech/code/", "Code the Robot: Loops", 15], ["music/theory/", "Music Theory: scales and keys", 10]],
        [["math/soroban/", "Soroban: next level", 10], ["math/times/", "Times Tables: beat the clock", 15], ["math/timemoney/", "Clocks & Coins: set the clock, how long until", 15], ["music/rhythm/", "Rhythm Studio: make a beat", 10]],
        [["math/measure/", "Measure & Graphs: See it, measure with a ruler", 15], ["arts/symmetry/", "Symmetry Studio: mirror painting", 15], ["music/theory/", "Music Theory: intervals", 10]],
        [["math/timemoney/", "Clocks & Coins: the coin shop", 15], ["arts/artists/", "Famous Artists: Matisse and Van Gogh", 20], ["music/ear/", "Ear Training: happy or sad chords", 10]],
      ],
    },
    {
      theme: "Fractions, graphs and if-then",
      days: [
        [["math/soroban/", "Soroban: next level", 10], ["math/fractions/", "Fraction Kitchen: See it, cut the pizza", 15], ["tech/code/", "Code the Robot: turn left, turn right", 15], ["music/theory/", "Music Theory: chords", 10]],
        [["math/soroban/", "Soroban: next level", 10], ["math/fractions/", "Fraction Kitchen: equal fractions", 15], ["math/measure/", "Measure & Graphs: bar graphs", 15], ["tech/code/", "Code the Robot: If-then", 15]],
        [["math/patterns/", "Patterns & Puzzles: balance the scale", 15], ["arts/tangram/", "Tangram Puzzles: make the shapes", 20], ["music/rhythm/", "Rhythm Studio: fill the bar", 10]],
        [["math/soroban/", "Soroban: timed worksheet, beat your score", 10], ["arts/artists/", "Famous Artists: who made this? quiz", 15], ["arts/drawing/", "Drawing Lab: draw a picture for someone", 15], ["log/", "Look at the learning log together", 5]],
      ],
    },
  ];

  const LITTLE = [
    {
      theme: "Counting and colours",
      days: [
        [["math/numbers/", "Number Fun: See it, count to 20", 10], ["music/little/", "Little Musicians: See it, colours", 10], ["tech/code/", "Code the Robot: First steps, with a grown-up", 10]],
        [["math/place/", "Place Value: See it, ones and tens", 10], ["music/little/", "Little Musicians: loud or soft", 10], ["arts/colours/", "Colour Mixing: mix paints", 10]],
        [["math/shapes/", "Shapes & Angles: See it, shape hunt", 10], ["music/rhythm/", "Rhythm Studio: See it, keep the beat", 10], ["arts/drawing/", "Drawing Lab: trace the lines", 10]],
        [["math/patterns/", "Patterns & Puzzles: colour patterns", 10], ["music/orchestra/", "Orchestra & Sound: See it", 10], ["arts/artists/", "Famous Artists: dot painting", 10]],
      ],
    },
    {
      theme: "Adding and shapes",
      days: [
        [["math/numbers/", "Number Fun: make 10", 10], ["music/little/", "Little Musicians: higher or lower", 10], ["tech/code/", "Code the Robot: First steps", 10]],
        [["math/addsub/", "Add & Subtract: See it, counters", 10], ["music/ear/", "Ear Training: See it", 10], ["arts/symmetry/", "Symmetry Studio: mirror painting", 10]],
        [["math/shapes/", "Shapes & Angles: count sides and corners", 10], ["music/rhythm/", "Rhythm Studio: tap the rhythm", 10], ["arts/drawing/", "Drawing Lab: pixel art", 10]],
        [["math/measure/", "Measure & Graphs: longer or shorter", 10], ["music/orchestra/", "Orchestra & Sound: high or low", 10], ["arts/artists/", "Famous Artists: Matisse cut-outs", 10]],
      ],
    },
    {
      theme: "Clocks and beats",
      days: [
        [["math/timemoney/", "Clocks & Coins: See it, o'clock", 10], ["music/little/", "Little Musicians: copy me", 10], ["tech/code/", "Code the Robot: First steps", 10]],
        [["math/numbers/", "Number Fun: frog jumps", 10], ["music/little/", "Little Musicians: clap the beat", 10], ["arts/colours/", "Colour Mixing: colour wheel", 10]],
        [["math/patterns/", "Patterns & Puzzles: odd or even socks", 10], ["music/rhythm/", "Rhythm Studio: make a beat", 10], ["arts/drawing/", "Drawing Lab: draw with shapes", 10]],
        [["math/timemoney/", "Clocks & Coins: count the coins", 10], ["music/orchestra/", "Orchestra & Sound: meet the families", 10], ["arts/artists/", "Famous Artists: Mondrian", 10]],
      ],
    },
    {
      theme: "Measuring and making",
      days: [
        [["math/measure/", "Measure & Graphs: which is heavier?", 10], ["music/little/", "Little Musicians: first songs", 10], ["tech/code/", "Code the Robot: First steps", 10]],
        [["math/numbers/", "Number Fun: bigger or smaller", 10], ["music/ear/", "Ear Training: higher or lower", 10], ["arts/tangram/", "Tangram Puzzles: with a grown-up", 10]],
        [["math/addsub/", "Add & Subtract: number bonds to 10", 10], ["music/rhythm/", "Rhythm Studio: keep the beat", 10], ["arts/symmetry/", "Symmetry Studio: kaleidoscope", 10]],
        [["math/soroban/", "Soroban: Little hands", 10], ["arts/drawing/", "Drawing Lab: a picture for someone", 10], ["log/", "Look at the learning log together", 5]],
      ],
    },
  ];

  const WEEKDAYS = [2, 4, 6, 0]; // Tuesday, Thursday, Saturday, Sunday
  const OFFSETS = [0, 2, 4, 5];
  const SUBJECT_OF = { math: "🔢", music: "🎵", arts: "🎨", tech: "🤖", log: "📒" };

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
    } catch {}
  };
  const midnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const tuesdayOf = (date) => {
    const d = midnight(date);
    const back = (d.getDay() - 2 + 7) % 7;
    d.setDate(d.getDate() - back);
    return d;
  };
  const nextTuesday = (date) => {
    const d = midnight(date);
    d.setDate(d.getDate() + ((2 - d.getDay() + 7) % 7));
    return d;
  };
  const start = () => {
    const saved = read("oc-plan-start", null);
    return saved ? tuesdayOf(new Date(`${saved}T00:00:00`)) : nextTuesday(new Date());
  };
  const setStart = (iso) => write("oc-plan-start", OC.dayOf(tuesdayOf(new Date(`${iso}T00:00:00`))));
  const trackOf = (learner) => read("oc-plan-track", {})[learner] || "big";
  const setTrack = (learner, track) => write("oc-plan-track", { ...read("oc-plan-track", {}), [learner]: track });
  const doneOf = (learner) => read("oc-plan-done", {})[learner] || {};
  const setDone = (learner, key, value) => {
    const all = read("oc-plan-done", {});
    all[learner] = { ...(all[learner] || {}), [key]: value };
    if (!value) delete all[learner][key];
    write("oc-plan-done", all);
  };

  // Every school day with its date, items and key.
  function days(track) {
    const first = start();
    const weeks = track === "little" ? LITTLE : BIG;
    const out = [];
    weeks.forEach((week, w) =>
      week.days.forEach((items, d) => {
        const date = new Date(first);
        date.setDate(first.getDate() + w * 7 + OFFSETS[d]);
        out.push({ week: w + 1, theme: week.theme, date, iso: OC.dayOf(date), items, key: `${w}-${d}` });
      }),
    );
    return out;
  }
  // Today's lesson day, or the next one (null when the month is over).
  function upcoming(track) {
    const today = OC.dayOf(new Date());
    return days(track).find((day) => day.iso >= today) || null;
  }

  window.PLAN = { WEEKDAYS, SUBJECT_OF, days, upcoming, start, setStart, trackOf, setTrack, doneOf, setDone };
})();
