// Shared engine for the "Big ideas" math pages (Calculus Ideas, Triangles & Waves, Data Detective).
// Each page has a See it lesson, hands-on labs that lead into question sets, and a mixed puzzle set.
// Questions come at three levels: 🐣 Gentle (grades 1–2), 🦊 Explorer (grades 3–5), 🦁 Challenge (grades 6–8).
(() => {
  const { $, el, svg: makeSvg, text, panel, say, pick, wait, confetti, choices, numpad, shuffle } = KIT;
  const W = 1000;
  const H = 560;
  const INK = "#5a4130";
  const LEVELS = [["easy", "🐣 Gentle"], ["medium", "🦊 Explorer"], ["hard", "🦁 Challenge"]];

  const css = document.createElement("style");
  css.textContent = `
.bi-ans .kt-choices button{min-height:52px;min-width:80px;font-size:20px;border-radius:18px}
.bi-tools button[data-pulse],.bi-lab button[data-pulse]{animation:ap-pulse 1.4s ease-in-out infinite}
.bi-lab{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.bi-lab button{min-height:50px;padding:0 18px;border:0;border-radius:18px;background:#fff;box-shadow:0 4px 0 #e2d6c4;color:var(--ink);font:800 17px/1 var(--sans);cursor:pointer}
.bi-lab button.primary{background:var(--accent);color:#fff;box-shadow:0 4px 0 var(--accent-dark)}
.bi-lab button:disabled{opacity:.4;cursor:default}
.bi-lab button:active{transform:translateY(3px);box-shadow:0 1px 0 #e2d6c4}
.bi-real{position:absolute;inset:0;z-index:7;display:grid;place-items:center;padding:10px;background:rgba(245,239,228,.93)}
.bi-real-card{max-width:620px;width:100%;max-height:100%;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 22px;border-radius:28px;background:#fff;box-shadow:0 8px 0 #ece3d6,0 18px 40px rgba(70,40,15,.14);animation:ap-rise .4s cubic-bezier(.32,.72,0,1) both}
.bi-real-head{display:flex;align-items:center;gap:12px}
.bi-real-head span{display:grid;place-items:center;width:58px;height:58px;border-radius:50%;background:var(--accent-soft);font-size:32px}
.bi-real-card h2{margin:0;color:#2b1d12;font:900 clamp(20px,3vw,27px)/1.15 var(--sans)}
.bi-real-card ol{margin:0;padding-left:1.4em;display:grid;gap:4px;text-align:left;width:100%;color:#2b1d12;font:700 clamp(15px,2vw,19px)/1.35 var(--sans)}
.bi-need{margin:0;color:#4d3c2e;font:700 clamp(15px,2vw,18px)/1.35 var(--sans)}
.bi-tip{margin:0;padding:6px 12px;border-radius:12px;background:#fff4dc;color:#7a4a10;font:800 clamp(14px,1.8vw,16px)/1.3 var(--sans)}
.bi-hit{cursor:pointer}
.ap-panel .ap-say{flex-shrink:0}
@media (max-width:600px){.bi-lab-txt{display:none}}
@media (max-height:460px),(max-width:420px) and (max-height:720px){
 .bi-ans .kt-choices button{min-height:40px;min-width:58px;font-size:16px;padding:0 10px}
 .bi-tools button,.bi-lab button{min-height:36px;font-size:13px;padding:0 10px}
 .bi-real-card{padding:10px 14px;gap:5px}
 .bi-lab-txt{display:none}
}`;
  document.head.appendChild(css);

  window.IDEAS = function ideas({ title, counter, explainPrompts = {} }) {
    const stage = $("[data-stage]");
    // `token` changes whenever a game stops, so timers and animations from an old game end quietly.
    const S = { token: 0, view: null, shell: null };
    const alive = (my) => () => my === S.token;

    const fresh = () => {
      stage.innerHTML = "";
      S.view = makeSvg(`0 0 ${W} ${H}`, stage);
      return S.view;
    };
    const tween = (ms, fn, isAlive = () => true) =>
      new Promise((resolve) => {
        if (KIT.still.matches) {
          fn(1);
          return resolve(true);
        }
        const t0 = performance.now();
        const frame = (now) => {
          if (!isAlive()) return resolve(false);
          const t = Math.min(1, (now - t0) / ms);
          fn(t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
          if (t < 1) requestAnimationFrame(frame);
          else resolve(true);
        };
        requestAnimationFrame(frame);
      });

    function para(parent, x, y, str, { size = 30, width = 900, lh = 1.32, fill = "#2b1d12", weight = 700, anchor = "start" } = {}) {
      const maxChars = Math.max(8, Math.floor(width / (size * 0.53)));
      const lines = [];
      for (const block of String(str).split("\n")) {
        let line = "";
        for (const word of block.split(" ")) {
          if (line && (line + " " + word).length > maxChars) {
            lines.push(line);
            line = word;
          } else line = line ? `${line} ${word}` : word;
        }
        lines.push(line);
      }
      if (parent) lines.forEach((ln, i) => text(parent, x, y + i * size * lh, ln, { "font-size": size, fill, "font-weight": weight, "text-anchor": anchor }));
      return lines.length;
    }
    const fitSize = (str, width, maxH, start = 32, min = 20) => {
      let size = start;
      while (size > min && para(null, 0, 0, str, { size, width }) * size * 1.32 > maxH) size -= 2;
      return size;
    };

    // Starting level from the learner's age: grades 1–2 Gentle, 3–4 Explorer, 5+ Challenge.
    const defaultLevel = () => {
      const lv = window.OC ? OC.levelOf(OC.current()) : "";
      return lv === "Level 3" || lv === "Level 4" ? "medium" : lv === "Level 5" ? "hard" : "easy";
    };
    const levelOf = (id) => S.shell.progress()[id]?.level || defaultLevel();

    function card({ icon, title: head, need = [], steps = [], note = "", button = "✓ Done" }) {
      return new Promise((resolve) => {
        stage.querySelector(".bi-real")?.remove();
        const box = document.createElement("div");
        box.className = "bi-real";
        box.innerHTML = `<div class="bi-real-card" role="dialog" aria-label="${head}"><div class="bi-real-head"><span aria-hidden="true">${icon}</span><h2>${head}</h2></div>${need.length ? `<p class="bi-need"><b>You need:</b> ${need.join(" · ")}</p>` : ""}<ol>${steps.map((s) => `<li>${s}</li>`).join("")}</ol>${note ? `<p class="bi-tip">💡 ${note}</p>` : ""}<div class="ap-buttons"><button type="button" class="primary kt-go">${button}</button></div></div>`;
        stage.appendChild(box);
        VOICE.speak(`${head}. ${need.length ? `You need: ${need.join(", ")}. ` : ""}${steps.join(" ")} ${note}`);
        box.querySelector(".kt-go").addEventListener("click", () => {
          VOICE.hush();
          box.remove();
          window.OC?.touch();
          resolve();
        });
      });
    }

    async function finishGame(id, my, message, real) {
      confetti();
      MUSIC.chime();
      S.shell.mark(id, { done: true });
      say(message);
      await wait(2600);
      if (my !== S.token) return;
      if (explainPrompts[id]) {
        await card({
          icon: "🗣️",
          title: "Explain it",
          steps: [explainPrompts[id], "Say it aloud to a grown-up, or draw it in your notebook."],
          note: "Explaining an idea in your own words is how you really own it.",
        });
        if (my !== S.token) return;
      }
      if (real) await card(real);
    }

    function drawProblem(p, tag) {
      const view = fresh();
      el("rect", { x: 14, y: 14, width: 972, height: 532, rx: 26, fill: "#fffaf2", stroke: "#eadfcd", "stroke-width": 3 }, view);
      text(view, 44, 60, tag, { "text-anchor": "start", "font-size": 24, fill: "var(--accent-dark)" });
      const width = p.pic ? 470 : 912;
      const size = fitSize(p.q, width, 400, p.pic ? 31 : 36, 21);
      para(view, 44, 112, p.q, { size, width });
      if (p.pic) p.pic(el("g", { transform: "translate(552 110)" }, view));
    }
    function drawSolution(p, answerLine) {
      const view = fresh();
      el("rect", { x: 14, y: 14, width: 972, height: 532, rx: 26, fill: "#fff", stroke: "var(--accent)", "stroke-width": 4 }, view);
      const ideaText = `Key idea: ${p.idea}`;
      el("rect", { x: 40, y: 32, width: Math.min(900, ideaText.length * 14.5 + 60), height: 52, rx: 26, fill: "var(--accent-soft)" }, view);
      text(view, 64, 67, `🔑 ${ideaText}`, { "text-anchor": "start", "font-size": 27, fill: "var(--accent-dark)" });
      const width = p.pic ? 500 : 860;
      let size = 28;
      const total = (s) => p.sol.reduce((h, st) => h + para(null, 0, 0, st, { size: s, width }) * s * 1.3 + 14, 0);
      while (size > 20 && total(size) > 330) size -= 1;
      let y = 128;
      p.sol.forEach((st, i) => {
        el("circle", { cx: 60, cy: y - size * 0.35, r: 17, fill: "var(--accent)" }, view);
        text(view, 60, y - size * 0.35 + 7, i + 1, { "font-size": 20, fill: "#fff" });
        y += para(view, 92, y, st, { size, width, lh: 1.3 }) * size * 1.3 + 14;
      });
      if (p.pic) p.pic(el("g", { transform: "translate(600 110) scale(0.9)" }, view), true);
      el("rect", { x: 40, y: 474, width: 920, height: 56, rx: 16, fill: "#fff4dc" }, view);
      text(view, 500, 510, answerLine, { "font-size": 24, fill: "#7a4a10" });
    }

    const levelRow = (cur) =>
      `<div class="ap-row"><div class="ap-chips" data-levels>${LEVELS.map(([k, l]) => `<button type="button" data-lv="${k}" aria-pressed="${k === cur}">${l}</button>`).join("")}</div><span class="ap-status" data-status></span></div>`;

    // Eight questions from a bank of generators. A 💡 hint opens after one attempt, the 📖 worked solution after two.
    // Each generator returns { q, ans, opts?, idea, hints[], sol[], pic?(g, solved), why? }; pictures fit a 400 × 400 box.
    function runPuzzles(id, level, gens, { label = title, onLevel, real } = {}) {
      const my = S.token;
      const live = alive(my);
      const list = [];
      const order = shuffle(gens);
      for (let k = 0; list.length < 8 && k < 120; k++) {
        const p = order[k % order.length]();
        if (!list.some((q) => q.q === p.q)) list.push(p);
      }
      let i = 0;
      let firstTry = 0;
      const tag = () => `${label} · ${LEVELS.find(([k]) => k === level)[1]} · ${i + 1} of ${list.length}`;
      const show = () => {
        if (!live()) return;
        const p = list[i];
        let tries = 0;
        let hint = 0;
        let done = false;
        let showing = "problem";
        let pad = null;
        panel(`${levelRow(level)}<div class="ap-row bi-ans" data-answer></div><div class="ap-chips bi-tools" data-tools><button type="button" data-t="read" aria-label="Read it to me">🔊</button><button type="button" data-t="hint" aria-label="Hint">💡<span class="bi-lab-txt"> Hint</span></button><button type="button" data-t="sol" aria-label="Solution">📖<span class="bi-lab-txt"> Solution</span></button><button type="button" data-t="next">Next ▶</button></div>`);
        $("[data-levels]").addEventListener("click", (event) => {
          const b = event.target.closest("[data-lv]");
          if (!b) return;
          S.shell.mark(id, { level: b.dataset.lv });
          window.OC?.touch();
          S.token += 1;
          VOICE.hush();
          onLevel(b.dataset.lv);
        });
        $("[data-status]").textContent = `Question ${i + 1} of ${list.length}`;
        drawProblem(p, tag());
        const ansText = String(p.ans);
        const pulse = (t) => {
          document.querySelectorAll("[data-tools] [data-pulse]").forEach((b) => b.removeAttribute("data-pulse"));
          if (t) $(`[data-t="${t}"]`)?.setAttribute("data-pulse", "");
        };
        const solve = () => {
          showing = "sol";
          drawSolution(p, done ? `Answer: ${ansText}. Can you say why in your own words?` : `The answer is ${ansText}. Look at each step.`);
          $('[data-t="sol"]').innerHTML = `🧩<span class="bi-lab-txt"> Question</span>`;
          say(`<b>${p.idea}.</b> ${p.sol.join(" ")}`);
        };
        const answer = (v, button) => {
          if (!live() || done) return;
          window.OC?.touch();
          tries += 1;
          if (String(v) === ansText) {
            done = true;
            if (tries === 1) firstTry += 1;
            button?.classList.add("right");
            MUSIC.chime();
            window.OC?.count(counter);
            say(`${pick(KIT.PRAISE)} ${p.why || ""} Press 📖 to see the steps, or Next ▶.`);
            pulse("next");
          } else {
            button?.classList.add("wrong");
            MUSIC.oops();
            pad?.clear();
            if (tries === 1) {
              say(`${pick(KIT.KIND)} Mistakes help us learn. Look at the picture again, or press 💡 for a hint.`);
              pulse("hint");
            } else {
              done = true;
              pulse("sol");
              say(`The answer is ${ansText}. Let's look at why.`);
              setTimeout(() => live() && list[i] === p && solve(), 1600);
            }
          }
        };
        const host = $("[data-answer]");
        if (p.opts) choices(host, p.opts.map((o) => ({ label: String(o), v: o })), (c, b) => answer(c.v, b));
        else pad = numpad(host, { onEnter: (v) => answer(v), max: 5 });
        $("[data-tools]").addEventListener("click", (event) => {
          const b = event.target.closest("[data-t]");
          if (!b || !live()) return;
          window.OC?.touch();
          const t = b.dataset.t;
          if (t === "read") VOICE.speak(`${p.q} ${p.opts ? `The choices are ${p.opts.join(", ")}.` : ""}`);
          else if (t === "hint") {
            if (!tries) return say("Have a go first. Even a guess makes the hint more useful.");
            if (hint >= p.hints.length) return say(`💡 That was the last hint: ${p.hints[p.hints.length - 1]}`);
            say(`💡 ${p.hints[hint++]}`);
            pulse("");
          } else if (t === "sol") {
            if (showing === "sol") {
              showing = "problem";
              drawProblem(p, tag());
              b.innerHTML = `📖<span class="bi-lab-txt"> Solution</span>`;
              return;
            }
            if (!done && tries < 2) return say(tries ? "Try once more first. A 💡 hint may help." : "Have a go first. The steps open after two tries.");
            solve();
          } else if (t === "next") {
            if (!done && !tries) return say("Give this one a try before moving on.");
            VOICE.hush();
            i += 1;
            if (i < list.length) show();
            else
              finishGame(id, my, `That's eight questions, ${firstTry} right first time! Pick a level for a fresh set.`, real).then(() => live() && runPuzzles(id, level, gens, { label, onLevel, real }));
          }
        });
        say(p.opts ? "Choose the answer." : "Type the answer, then press ✓.", { voice: false });
        VOICE.speak(`${p.q} ${p.opts ? `The choices are ${p.opts.join(", ")}.` : ""}`);
      };
      show();
    }

    // Question set for one unit: bank = { easy: [...], medium: [...], hard: [...] }.
    function questions(id, bank, { label, real } = {}) {
      const start = (lv) => runPuzzles(id, lv, bank[lv], { label, onLevel: start, real });
      start(levelOf(id));
    }

    // A lab panel: a row of buttons plus a "Questions ▶" button that moves on to the unit's questions.
    function labPanel(buttons, { onPress, onQuestions, questionsLabel = "Questions ▶" }) {
      panel(`<div class="bi-lab" data-lab>${buttons.map(([k, l, extra = ""]) => `<button type="button" data-b="${k}" ${extra}>${l}</button>`).join("")}<button type="button" class="primary" data-b="__q">${questionsLabel}</button></div>`);
      $("[data-lab]").addEventListener("click", (event) => {
        const b = event.target.closest("[data-b]");
        if (!b || b.disabled) return;
        window.OC?.touch();
        if (b.dataset.b === "__q") onQuestions();
        else onPress(b.dataset.b, b);
      });
      return {
        btn: (k) => $(`[data-lab] [data-b="${k}"]`),
        pulse: (k) => {
          document.querySelectorAll("[data-lab] [data-pulse]").forEach((b) => b.removeAttribute("data-pulse"));
          if (k) $(`[data-lab] [data-b="${k}"]`)?.setAttribute("data-pulse", "");
        },
      };
    }

    // Multiple-choice options: the answer plus distinct distractors, shuffled or sorted.
    const opts = (ans, cands, { sort = false } = {}) => {
      const out = [ans];
      for (const c of cands) if (out.length < 4 && !out.some((o) => String(o) === String(c))) out.push(c);
      return sort ? out.sort((a, b) => a - b) : shuffle(out);
    };
    const numOpts = (ans, cands) => {
      const out = [ans];
      for (const c of cands) if (out.length < 4 && c >= 0 && !out.includes(c)) out.push(c);
      let k = 1;
      while (out.length < 4) {
        if (!out.includes(ans + k)) out.push(ans + k);
        k += 1;
      }
      return out.sort((a, b) => a - b);
    };

    return { S, W, H, INK, LEVELS, stage, alive, fresh, tween, para, fitSize, card, finishGame, runPuzzles, questions, labPanel, opts, numOpts, levelOf };
  };
})();
