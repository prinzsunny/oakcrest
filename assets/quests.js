// Quests: a short playable exercise for every skill on the skill map (five questions each).
// The exercises live in assets/quests/<subject>.js and load one subject at a time.
// Item types: pick (choose one), tf (true or false), type (type a short answer), sort (put things in groups),
// order (put steps in order), match (pair things up) and do (a mission away from the screen, not scored).
// A finished quest saves a skill check from "quest": 4 or 5 right is Almost, fewer is Practicing.
// A grown-up's own check always wins: a quest never overwrites it.
(() => {
  const base = new URL("quests/", document.currentScript.src);
  const SLUGS = { Mathematics: "math", English: "english", Science: "science", History: "history", "Personal & Social Development": "social", "Life Skills": "life", Computing: "computing", "Learning to Learn": "learning" };
  const all = new Map();
  const loading = new Map();
  const add = (data) => Object.entries(data).forEach(([id, q]) => all.set(id, q));
  function load(subject) {
    const slug = SLUGS[subject];
    if (!slug) return Promise.resolve();
    if (!loading.has(slug))
      loading.set(slug, new Promise((resolve) => {
        const tag = document.createElement("script");
        tag.src = new URL(`${slug}.js`, base);
        tag.onload = tag.onerror = resolve;
        document.head.append(tag);
      }));
    return loading.get(slug);
  }
  async function get(topic) {
    await load(topic.subject);
    const q = all.get(topic.id);
    return q ? { ...q, items: q.items.map((i) => (window.SKILLS ? usItem(i) : i)) } : null;
  }
  // Same American English pass the skill text gets.
  const usItem = (i) => JSON.parse(JSON.stringify(i), (k, v) => (typeof v === "string" && k !== "t" ? SKILLS.us(v) : v));

  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const shuffle = (list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  // Shuffle so the result is never the answer order (when it can differ).
  const mixed = (list) => {
    if (list.length < 2) return [...list];
    for (let n = 0; n < 8; n++) {
      const a = shuffle(list);
      if (a.some((x, i) => x !== list[i])) return a;
    }
    return [...list].reverse();
  };
  const norm = (s) => String(s).toLowerCase().replace(/[\s,]+/g, " ").replace(/\.$/, "").trim().replace(/^\$/, "");
  const speak = (text) => window.VOICE && VOICE.speak(esc(text));
  const PRAISE = ["Yes! 🎉", "Great job! ⭐", "You got it! 🌟", "Brilliant! ✨", "Super! 🙌"];
  const KIND = ["Not quite.", "Almost!", "Good try!"];
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const SAVE = { quest: true };

  // ---------- the player ----------
  // play(topic, host, {tint, onClose, onSaved}) fills host with the quest and runs it.
  async function play(topic, host, opts = {}) {
    host.innerHTML = `<div class="qz"><p class="qz-wait">Getting your quest ready…</p></div>`;
    const quest = await get(topic);
    if (!quest) {
      host.innerHTML = `<div class="qz"><p class="qz-wait">This quest is still being made. Try another stone!</p><div class="qz-row"><button type="button" class="kq-btn" data-qz-close>⬅ Back</button></div></div>`;
      host.querySelector("[data-qz-close]").onclick = () => opts.onClose?.();
      return;
    }
    const items = quest.items;
    const scored = items.filter((i) => i.t !== "do").length;
    let at = -1;
    let right = 0;
    let tries = 0; // wrong tries on this item
    let answered = false;

    const dots = () => items.map((_, i) => `<span class="${i < at ? "on" : i === at ? "now" : ""}"></span>`).join("");
    const shell = (inner, foot = "") => {
      host.innerHTML = `<div class="qz" style="--tint:${opts.tint || "#3b5bdb"}">
        <div class="qz-top"><button type="button" class="kq-x qz-x" data-qz-close aria-label="Stop the quest">✕</button><div class="qz-dots" aria-label="Question ${at + 1} of ${items.length}">${dots()}</div></div>
        ${inner}<div class="qz-why" data-why aria-live="polite"></div><div class="qz-row" data-foot>${foot}</div></div>`;
      host.querySelector("[data-qz-close]").onclick = () => opts.onClose?.();
      host.scrollTop = 0;
    };
    const head = (i) => `<div class="qz-q"><button type="button" class="qz-say" data-say aria-label="Read it to me">🔊</button><h3>${esc(i.q)}</h3></div>`;

    function intro() {
      host.innerHTML = `<div class="qz qz-hello" style="--tint:${opts.tint || "#3b5bdb"}">
        <div class="qz-top"><button type="button" class="kq-x qz-x" data-qz-close aria-label="Close">✕</button></div>
        <div class="qz-big">${opts.icon || "⭐"}</div><small class="qz-where">Quest</small><h3>${esc(topic.name)}</h3>
        <p>${esc(quest.intro)}</p><p class="qz-n">${items.length} challenges · earn a star for each one right on the first try</p>
        <div class="qz-row"><button type="button" class="kq-btn go" data-go>▶ Let's go!</button></div></div>`;
      host.querySelector("[data-qz-close]").onclick = () => opts.onClose?.();
      host.querySelector("[data-go]").onclick = next;
      speak(`${topic.name}. ${quest.intro}`);
    }

    function next() {
      at++;
      tries = 0;
      answered = false;
      if (at >= items.length) return finish();
      const i = items[at];
      (VIEWS[i.t] || VIEWS.pick)(i);
      host.querySelector("[data-say]")?.addEventListener("click", () => speak(i.q));
      speak(i.q);
    }
    // After an answer: say so, show why, then offer Next.
    function settle(ok, i, reveal = "") {
      answered = true;
      if (ok && !tries) right++;
      const why = host.querySelector("[data-why]");
      why.className = `qz-why ${ok ? "good" : "bad"}`;
      why.innerHTML = `<b>${ok ? pick(PRAISE) : `${pick(KIND)}${reveal ? ` ${esc(reveal)}` : ""}`}</b>${i.why ? ` ${esc(i.why)}` : ""}`;
      if (ok) window.MUSIC?.chime?.();
      else window.MUSIC?.oops?.();
      speak(`${ok ? "" : reveal} ${i.why || ""}`.trim());
      host.querySelector("[data-foot]").innerHTML = `<button type="button" class="kq-btn go" data-next>${at === items.length - 1 ? "Finish 🏁" : "Next ➜"}</button>`;
      host.querySelector("[data-next]").onclick = next;
      host.querySelector("[data-next]").focus({ preventScroll: true });
      host.querySelector("[data-why]").scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    // A wrong first try gets one more go; the second wrong try shows the answer.
    function miss(i, reveal) {
      tries++;
      if (tries >= 2) return settle(false, i, reveal), true;
      const why = host.querySelector("[data-why]");
      why.className = "qz-why bad";
      why.innerHTML = `<b>${pick(KIND)}</b> Have another try!`;
      window.MUSIC?.oops?.();
      return false;
    }

    const VIEWS = {
      pick(i) {
        const opts = i.t === "tf" ? [["👍 True", true], ["👎 False", false]] : mixed(i.opts).map((o) => [o, o === i.opts[0]]);
        shell(`${head(i)}<div class="qz-opts ${i.t === "tf" ? "two" : ""}">${opts.map(([o], k) => `<button type="button" class="qz-opt" data-k="${k}">${esc(o)}</button>`).join("")}</div>`);
        host.querySelectorAll(".qz-opt").forEach((b) =>
          b.addEventListener("click", () => {
            if (answered || b.disabled) return;
            const ok = opts[Number(b.dataset.k)][1];
            if (ok) {
              b.classList.add("good");
              host.querySelectorAll(".qz-opt").forEach((x) => (x.disabled = true));
              return settle(true, i);
            }
            b.classList.add("bad");
            b.disabled = true;
            const answer = i.t === "tf" ? `It's ${i.a ? "true" : "false"}.` : `It's "${i.opts[0]}".`;
            if (miss(i, answer)) {
              host.querySelectorAll(".qz-opt").forEach((x) => {
                x.disabled = true;
                if (opts[Number(x.dataset.k)][1]) x.classList.add("good");
              });
            }
          }),
        );
      },
      tf(i) {
        VIEWS.pick({ ...i, opts: null, t: "tf" });
      },
      type(i) {
        const numeric = i.a.every((a) => /^-?[\d.,/ ]+$/.test(String(a)));
        shell(`${head(i)}<form class="qz-type" data-form><input data-in ${numeric ? 'inputmode="decimal"' : ""} autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your answer" placeholder="${numeric ? "Type the number" : "Type your answer"}"><button type="submit" class="kq-btn go">Check ✓</button></form>`);
        const input = host.querySelector("[data-in]");
        setTimeout(() => input.focus({ preventScroll: true }), 60);
        host.querySelector("[data-form]").addEventListener("submit", (e) => {
          e.preventDefault();
          if (answered || !input.value.trim()) return;
          const ok = i.a.some((a) => norm(a) === norm(input.value));
          if (ok) {
            input.classList.add("good");
            input.disabled = true;
            return settle(true, i);
          }
          input.classList.add("bad");
          if (miss(i, `The answer is ${i.a[0]}.`)) input.disabled = true;
          else setTimeout(() => (input.classList.remove("bad"), input.select()), 500);
        });
      },
      sort(i) {
        const rows = mixed(i.items.map((x, k) => k));
        const choice = new Map();
        shell(
          `${head(i)}<p class="qz-tip">Tap a group for each one.</p><div class="qz-sort">${rows
            .map((k) => `<div class="qz-srow" data-row="${k}"><span>${esc(i.items[k][0])}</span><div class="qz-seg">${i.bins.map((b, n) => `<button type="button" data-bin="${n}" aria-pressed="false">${esc(b)}</button>`).join("")}</div></div>`)
            .join("")}</div>`,
          `<button type="button" class="kq-btn go" data-check disabled>Check ✓</button>`,
        );
        const check = host.querySelector("[data-check]");
        host.querySelectorAll(".qz-srow").forEach((row) =>
          row.addEventListener("click", (e) => {
            const b = e.target.closest("[data-bin]");
            if (!b || answered) return;
            row.querySelectorAll("[data-bin]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            row.classList.remove("bad");
            choice.set(Number(row.dataset.row), Number(b.dataset.bin));
            check.disabled = choice.size < i.items.length;
          }),
        );
        check.addEventListener("click", () => {
          const wrong = i.items.map((x, k) => k).filter((k) => choice.get(k) !== i.items[k][1]);
          host.querySelectorAll(".qz-srow").forEach((row) => row.classList.toggle("bad", wrong.includes(Number(row.dataset.row))));
          if (!wrong.length) {
            host.querySelectorAll(".qz-srow").forEach((row) => row.classList.add("good"));
            return settle(true, i);
          }
          if (miss(i, "Look at the right groups now.")) {
            host.querySelectorAll(".qz-srow").forEach((row) => {
              const k = Number(row.dataset.row);
              row.classList.remove("bad");
              row.classList.add("good");
              row.querySelectorAll("[data-bin]").forEach((x) => x.setAttribute("aria-pressed", String(Number(x.dataset.bin) === i.items[k][1])));
            });
          } else host.querySelector("[data-why]").innerHTML += ` Fix the ones in red.`;
        });
      },
      order(i) {
        const pool = mixed(i.steps.map((s, k) => k));
        let built = [];
        const draw = () => {
          host.querySelector("[data-built]").innerHTML = built.length
            ? built.map((k, n) => `<button type="button" class="qz-step on" data-undo="${n}"><b>${n + 1}</b>${esc(i.steps[k])}</button>`).join("")
            : `<p class="qz-tip">Tap the steps below, first one first.</p>`;
          host.querySelector("[data-pool]").innerHTML = pool.filter((k) => !built.includes(k)).map((k) => `<button type="button" class="qz-step" data-add="${k}">${esc(i.steps[k])}</button>`).join("");
          host.querySelector("[data-check]").disabled = built.length < i.steps.length;
        };
        shell(`${head(i)}<div class="qz-built" data-built></div><div class="qz-pool" data-pool></div>`, `<button type="button" class="kq-btn" data-reset>↺ Start over</button><button type="button" class="kq-btn go" data-check disabled>Check ✓</button>`);
        host.querySelector(".qz").addEventListener("click", (e) => {
          if (answered) return;
          const a = e.target.closest("[data-add]");
          const u = e.target.closest("[data-undo]");
          if (a) built.push(Number(a.dataset.add));
          else if (u) built = built.slice(0, Number(u.dataset.undo));
          else if (e.target.closest("[data-reset]")) built = [];
          else return;
          draw();
        });
        host.querySelector("[data-check]").addEventListener("click", () => {
          const ok = built.every((k, n) => k === n);
          if (ok) {
            host.querySelector("[data-built]").classList.add("good");
            return settle(true, i);
          }
          if (miss(i, "Here is the right order.")) {
            built = i.steps.map((s, k) => k);
            draw();
            host.querySelector("[data-built]").classList.add("good");
            host.querySelector("[data-reset]")?.remove();
          } else {
            const first = built.findIndex((k, n) => k !== n);
            built = built.slice(0, first);
            draw();
            host.querySelector("[data-why]").innerHTML += ` The first ${first || "step"}${first ? ` step${first === 1 ? " was" : "s were"} right` : " was not right"}; keep going from there.`;
          }
        });
        draw();
      },
      match(i) {
        const rights = mixed(i.pairs.map((p, k) => k));
        const link = new Map(); // left index -> right index
        let sel = null;
        const COLORS = ["#ffd43b", "#74c0fc", "#b2f2bb", "#fcc2d7", "#d0bfff"];
        const draw = () => {
          host.querySelectorAll("[data-l]").forEach((b) => {
            const l = Number(b.dataset.l);
            b.classList.toggle("sel", sel === l);
            b.style.background = link.has(l) ? COLORS[l] : "";
          });
          host.querySelectorAll("[data-r]").forEach((b) => {
            const r = Number(b.dataset.r);
            const l = [...link].find(([, x]) => x === r)?.[0];
            b.style.background = l !== undefined ? COLORS[l] : "";
          });
          host.querySelector("[data-check]").disabled = link.size < i.pairs.length;
        };
        shell(
          `${head(i)}<p class="qz-tip">Tap one on the left, then its partner on the right.</p><div class="qz-match"><div>${i.pairs.map((p, l) => `<button type="button" class="qz-m" data-l="${l}">${esc(p[0])}</button>`).join("")}</div><div>${rights.map((r) => `<button type="button" class="qz-m" data-r="${r}">${esc(i.pairs[r][1])}</button>`).join("")}</div></div>`,
          `<button type="button" class="kq-btn go" data-check disabled>Check ✓</button>`,
        );
        host.querySelector(".qz-match").addEventListener("click", (e) => {
          if (answered) return;
          const l = e.target.closest("[data-l]");
          const r = e.target.closest("[data-r]");
          if (l) sel = Number(l.dataset.l);
          if (r) {
            const rv = Number(r.dataset.r);
            if (sel === null) {
              // Tapping a right first: unpair it.
              for (const [k, v] of link) if (v === rv) link.delete(k);
            } else {
              for (const [k, v] of link) if (v === rv) link.delete(k);
              link.set(sel, rv);
              sel = [...i.pairs.keys()].find((k) => !link.has(k)) ?? null;
            }
          }
          draw();
        });
        host.querySelector("[data-check]").addEventListener("click", () => {
          const wrong = [...link].filter(([l, r]) => l !== r).map(([l]) => l);
          if (!wrong.length) return settle(true, i);
          if (miss(i, "Here are the right pairs.")) {
            i.pairs.forEach((p, k) => link.set(k, k));
            sel = null;
            draw();
          } else {
            wrong.forEach((l) => link.delete(l));
            sel = wrong[0];
            draw();
            host.querySelector("[data-why]").innerHTML += ` I took back the ones that didn't match.`;
          }
        });
        draw();
      },
      do(i) {
        shell(`<div class="qz-mission"><span>🧭</span>${head(i)}</div>`, `<button type="button" class="kq-btn" data-later>Maybe later</button><button type="button" class="kq-btn go" data-did>✅ I did it!</button>`);
        host.querySelector("[data-later]").onclick = next;
        host.querySelector("[data-did]").onclick = () => {
          window.MUSIC?.chime?.();
          next();
        };
      },
    };

    function finish() {
      const pct = scored ? right / scored : 1;
      const status = pct >= 0.8 ? "almost" : "learning";
      const mine = window.SKILLS?.checks()[topic.id];
      // Save unless a grown-up has already checked this skill.
      if (window.SKILLS && (!mine?.s || mine.src === "quest")) SKILLS.check(topic.id, status, { src: "quest", note: `${right}/${scored}` });
      const stars = "⭐".repeat(right) + `<span class="qz-dim">${"☆".repeat(Math.max(0, scored - right))}</span>`;
      const line = pct === 1 ? "Perfect! Every one on the first try!" : pct >= 0.8 ? "Amazing work! Ask a grown-up to check it for your big star." : pct >= 0.5 ? "Good going! Play again to grow this skill." : "That was tricky. Every try makes your brain stronger. Want another go?";
      host.innerHTML = `<div class="qz qz-hello" style="--tint:${opts.tint || "#3b5bdb"}">
        <div class="qz-big">${pct >= 0.8 ? "🏆" : "🌱"}</div><h3>${right} out of ${scored}!</h3><p class="qz-stars">${stars}</p><p>${line}</p>
        <div class="qz-row"><button type="button" class="kq-btn" data-again>↺ Play again</button><button type="button" class="kq-btn go" data-qz-close>Done ✓</button></div></div>`;
      host.querySelector("[data-again]").onclick = () => play(topic, host, opts);
      host.querySelector("[data-qz-close]").onclick = () => opts.onClose?.();
      speak(`${right} out of ${scored}! ${line}`);
      if (pct >= 0.8) opts.onWin?.();
      opts.onSaved?.(status);
    }
    intro();
  }

  window.QUESTS = { add, load, get, has: (id) => all.has(id), play, SLUGS, SAVE };
})();
