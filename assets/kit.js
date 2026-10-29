(() => {
  const NS = "http://www.w3.org/2000/svg";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const pickInt = (low, high) => low + Math.floor(Math.random() * (high - low + 1));
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const shuffle = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  // Older and advanced learners (Level 3 and up) get precise, academic feedback instead of cheers.
  const mature = (() => {
    try {
      const at = window.OC ? OC.LEVELS.indexOf(OC.levelOf(OC.current())) : -1;
      return at >= 2;
    } catch {
      return false;
    }
  })();
  const PRAISE = mature ? ["Correct.", "Correct, and well reasoned.", "Exactly right.", "Precisely.", "Correct. Good method."] : ["Yes!", "Great!", "Well done!", "Brilliant!", "Super!", "You got it!", "Fantastic!"];
  const KIND = mature ? ["Not quite.", "Not yet.", "Close. Reconsider.", "Check that again."] : ["Good try!", "Almost!", "Not quite!", "Nearly!"];
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  function svg(viewBox, parent) {
    const node = document.createElementNS(NS, "svg");
    node.setAttribute("viewBox", viewBox);
    if (parent) parent.appendChild(node);
    return node;
  }
  function el(name, attrs = {}, parent) {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) if (value !== undefined && value !== null) node.setAttribute(key, value);
    if (parent) parent.appendChild(node);
    return node;
  }
  function text(parent, x, y, content, attrs = {}) {
    const node = el("text", { x, y, "text-anchor": "middle", "font-family": "ui-rounded, ui-sans-serif, system-ui, sans-serif", "font-weight": 700, ...attrs }, parent);
    node.textContent = content;
    return node;
  }

  function panel(html) {
    const host = $("[data-panel]");
    host.innerHTML = `<p class="ap-say" data-say aria-live="polite"></p>${html}`;
    return host;
  }
  function say(html, { voice = true } = {}) {
    const box = $("[data-say]");
    if (box) box.innerHTML = html;
    if (voice) VOICE.speak(html);
  }
  function sayAsync(html) {
    const box = $("[data-say]");
    if (box) box.innerHTML = html;
    return VOICE.speakAsync(html);
  }

  function confettiBurst(host) {
    const box = document.createElement("div");
    box.className = "kt-confetti";
    const colors = ["#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa", "#ec407a", "#c98c58"];
    for (let i = 0; i < 70; i++) {
      const piece = document.createElement("span");
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      piece.style.animationDuration = `${1.5 + Math.random() * 1.2}s`;
      piece.style.setProperty("--spin", `${Math.random() * 720 - 360}deg`);
      piece.style.setProperty("--drift", `${Math.random() * 160 - 80}px`);
      box.appendChild(piece);
    }
    host.appendChild(box);
    setTimeout(() => box.remove(), 3200);
  }

  // ---------- Surprises: a different celebration each time a young learner achieves something ----------
  const RAINBOW = ["#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa"];
  const layer = (host, kind, ms) => {
    const box = document.createElement("div");
    box.className = `kt-surprise kt-${kind}`;
    box.setAttribute("aria-hidden", "true");
    host.appendChild(box);
    setTimeout(() => box.remove(), ms);
    return box;
  };
  const glyph = (box, char, css = {}) => {
    const span = document.createElement("span");
    span.textContent = char;
    Object.assign(span.style, css);
    box.appendChild(span);
    return span;
  };
  // Blobs thrown up in an arc from a point (lava, splashes): --x is the sideways throw, --h the height.
  const throwBlobs = (box, n, colors, delay, spread = 0) => {
    for (let i = 0; i < n; i++) {
      const b = document.createElement("i");
      const size = 9 + Math.random() * 16;
      Object.assign(b.style, { width: `${size}px`, height: `${size}px`, background: pick(colors), animationDelay: `${delay + Math.random() * spread}s` });
      b.style.setProperty("--x", `${Math.random() * 340 - 170}px`);
      b.style.setProperty("--h", `${120 + Math.random() * 200}px`);
      box.appendChild(b);
    }
  };
  // Real star pictures, drawn dot to dot: [name, stars (x, y out of 100), lines joining them].
  const SKY = [
    ["The Big Dipper", [[6, 30], [20, 26], [33, 32], [46, 42], [50, 64], [74, 70], [80, 46]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]]],
    ["Cassiopeia, the Queen", [[8, 36], [28, 64], [50, 40], [70, 66], [92, 32]], [[0, 1], [1, 2], [2, 3], [3, 4]]],
    ["Orion, the Hunter", [[28, 12], [72, 18], [42, 50], [50, 47], [58, 44], [30, 88], [72, 84]], [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]]],
    ["The Southern Cross", [[50, 8], [52, 90], [24, 46], [78, 54], [64, 66]], [[0, 1], [2, 3]]],
  ];
  const SURPRISES = {
    rocket(host) {
      const box = layer(host, "rocket", 3800);
      [3, 2, 1].forEach((n, i) => (glyph(box, n, { animationDelay: `${i * 0.32}s` }).className = "kt-count"));
      for (let i = 0; i < 16; i++) {
        const puff = document.createElement("i");
        puff.style.setProperty("--dx", `${(i % 2 ? 1 : -1) * (20 + Math.random() * 130)}px`);
        puff.style.animationDelay = `${0.9 + Math.random() * 0.5}s`;
        box.appendChild(puff);
      }
      glyph(box, "🚀").className = "kt-ship";
    },
    constellation(host) {
      const box = layer(host, "sky", 4600);
      const [name, stars, lines] = pick(SKY);
      const specks = Array.from({ length: 40 }, () => `<i style="left:${Math.random() * 100}%;top:${Math.random() * 100}%"></i>`).join("");
      const join = lines.map(([a, b], i) => `<line x1="${stars[a][0]}" y1="${stars[a][1]}" x2="${stars[b][0]}" y2="${stars[b][1]}" pathLength="100" style="animation-delay:${0.8 + i * 0.25}s"/>`).join("");
      const dots = stars.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2.2" style="animation-delay:${0.3 + i * 0.1}s"/>`).join("");
      box.innerHTML = `${specks}<svg viewBox="0 0 100 100">${join}${dots}</svg><b style="animation-delay:${1 + lines.length * 0.25}s">✨ ${name}</b>`;
    },
    volcano(host) {
      const box = layer(host, "volcano", 4000);
      box.innerHTML = `<div class="kt-mount"><svg viewBox="0 0 200 100"><path d="M0 100 L76 20 Q100 6 124 20 L200 100Z"/><path class="kt-glow" d="M80 18 Q100 8 120 18 L113 34 Q105 25 100 42 Q94 27 87 34Z"/></svg><div class="kt-crater"></div></div>`;
      throwBlobs($(".kt-crater", box), 28, ["#ff5722", "#ff9800", "#ffc107", "#e53935"], 0.6, 1.4);
    },
    whale(host) {
      const box = layer(host, "whale", 3800);
      box.style.setProperty("--run", `${-host.clientWidth * 0.42}px`);
      box.innerHTML = `<div class="kt-sea"></div><div class="kt-splash"></div>`;
      glyph(box, "🐳").className = "kt-jumper";
      throwBlobs($(".kt-splash", box), 18, ["#b3e5fc", "#4fc3f7", "#ffffff"], 1.55, 0.2);
    },
    dino(host) {
      const box = layer(host, "dino", 3800);
      for (let i = 0; i < 7; i++) glyph(box, "🐾", { left: `${4 + i * 14}%`, animationDelay: `${0.3 + i * 0.3}s` }).className = "kt-print";
      glyph(box, "ROAR!").className = "kt-roar";
      glyph(box, "🦖").className = "kt-stomper";
    },
    magic(host) {
      const box = layer(host, "magic", 3900);
      glyph(box, pick(["🐇", "🕊️", "🐉", "🦉", "🐢", "🦊", "🐙", "🦕"])).className = "kt-popper";
      glyph(box, "🎩").className = "kt-hat";
      for (let i = 0; i < 12; i++) glyph(box, i % 2 ? "✦" : "★", { color: RAINBOW[i % RAINBOW.length] }).style.setProperty("--a", `${i * 30}deg`);
    },
    balloons(host) {
      const box = layer(host, "balloons", 4200);
      for (let i = 0; i < 11; i++) {
        const b = document.createElement("i");
        b.style.left = `${4 + i * 8.6 + Math.random() * 3}%`;
        b.style.background = RAINBOW[i % RAINBOW.length];
        b.style.animationDelay = `${Math.random() * 0.7}s`;
        b.style.animationDuration = `${2.6 + Math.random() * 1.2}s`;
        box.appendChild(b);
      }
    },
    fireworks(host) {
      const box = layer(host, "fireworks", 3000);
      for (let k = 0; k < 4; k++) {
        const burst = document.createElement("div");
        burst.className = "kt-burst";
        burst.style.left = `${15 + Math.random() * 70}%`;
        burst.style.top = `${15 + Math.random() * 45}%`;
        burst.style.animationDelay = `${k * 0.45}s`;
        for (let i = 0; i < 16; i++) {
          const p = document.createElement("i");
          p.style.setProperty("--a", `${i * 22.5}deg`);
          p.style.background = RAINBOW[(i + k) % RAINBOW.length];
          p.style.animationDelay = `${k * 0.45}s`;
          burst.appendChild(p);
        }
        box.appendChild(burst);
      }
    },
    bubbles(host) {
      const box = layer(host, "bubbles", 4000);
      for (let i = 0; i < 18; i++) {
        const b = document.createElement("i");
        const size = 24 + Math.random() * 46;
        Object.assign(b.style, { left: `${Math.random() * 94}%`, width: `${size}px`, height: `${size}px`, animationDelay: `${Math.random() * 1}s`, animationDuration: `${2.2 + Math.random() * 1.4}s` });
        box.appendChild(b);
      }
    },
    stars(host) {
      const box = layer(host, "stars", 4000);
      for (let i = 0; i < 3; i++) glyph(box, "⭐", { top: `${6 + i * 16}%`, animationDelay: `${i * 0.55}s` }).className = "kt-shoot";
      for (let i = 0; i < 24; i++) glyph(box, i % 2 ? "⭐" : "🌟", { left: `${Math.random() * 92}%`, top: `${8 + Math.random() * 80}%`, fontSize: `${28 + Math.random() * 26}px`, animationDelay: `${0.2 + Math.random() * 2.2}s` }).className = "kt-twinkle";
    },
    butterflies(host) {
      const box = layer(host, "butterflies", 4200);
      for (let i = 0; i < 7; i++) glyph(box, "🦋", { top: `${10 + Math.random() * 65}%`, animationDelay: `${Math.random() * 1.2}s`, animationDuration: `${2.6 + Math.random() * 1.2}s`, fontSize: `${30 + Math.random() * 30}px` });
    },
    confetti: confettiBurst,
  };
  let deck = [];
  // A different surprise each time: deal from a shuffled deck so none repeats until all have been seen.
  function surprise(kind, host = $("[data-stage]")) {
    if (still.matches || !host) return;
    if (!SURPRISES[kind]) {
      if (!deck.length) deck = shuffle(Object.keys(SURPRISES));
      kind = deck.pop();
    }
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    SURPRISES[kind](host);
    return kind;
  }
  // A small burst of stars where something good just happened (an element or the stage centre).
  function sparkle(target) {
    if (still.matches) return;
    const host = $("[data-stage]");
    if (!host) return;
    const h = host.getBoundingClientRect();
    const r = target?.getBoundingClientRect?.() || h;
    const box = layer(host, "sparkle", 1100);
    box.style.left = `${r.left - h.left + r.width / 2}px`;
    box.style.top = `${r.top - h.top + r.height / 2}px`;
    for (let i = 0; i < 10; i++) {
      const p = document.createElement("i");
      p.textContent = i % 3 ? "✦" : "★";
      p.style.setProperty("--a", `${i * 36}deg`);
      p.style.color = RAINBOW[i % RAINBOW.length];
      box.appendChild(p);
    }
  }
  // Young learners get a surprise; older learners keep the calm confetti.
  function confetti(host = $("[data-stage]")) {
    if (still.matches || !host) return;
    if (mature) return confettiBurst(host);
    surprise(null, host);
  }

  function numpad(host, { onEnter, max = 4 } = {}) {
    host.innerHTML = `<div class="kt-pad"><output class="kt-entry" data-entry>?</output><div class="kt-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫", 0, "✓"]
      .map((k) => `<button type="button" data-k="${k}"${k === "✓" ? ' class="ok"' : ""} aria-label="${k === "⌫" ? "Delete" : k === "✓" ? "Enter" : k}">${k}</button>`)
      .join("")}</div></div>`;
    let value = "";
    const out = $("[data-entry]", host);
    const show = () => (out.textContent = value || "?");
    const press = (k) => {
      if (k === "⌫") value = value.slice(0, -1);
      else if (k === "✓") {
        if (value) onEnter?.(Number(value));
        return;
      } else if (value.length < max) value = value === "0" ? String(k) : value + k;
      show();
    };
    host.onclick = (event) => {
      const key = event.target.closest("[data-k]");
      if (key) press(key.dataset.k);
    };
    if (host._padKeys) removeEventListener("keydown", host._padKeys);
    const onKey = (event) => {
      if (!host.isConnected || !host.contains(out)) return removeEventListener("keydown", onKey);
      if (event.target.closest?.("input, select, textarea")) return;
      if (/^[0-9]$/.test(event.key)) press(event.key);
      else if (event.key === "Backspace") press("⌫");
      else if (event.key === "Enter") {
        event.preventDefault();
        press("✓");
      }
    };
    host._padKeys = onKey;
    addEventListener("keydown", onKey);
    return {
      clear() {
        value = "";
        show();
      },
      set(v) {
        value = String(v);
        show();
      },
    };
  }

  function choices(host, options, onPick) {
    host.innerHTML = `<div class="ap-chips kt-choices">${options.map((o, i) => `<button type="button" data-c="${i}">${o.label ?? o}</button>`).join("")}</div>`;
    host.onclick = (event) => {
      const button = event.target.closest("[data-c]");
      if (button) onPick(options[Number(button.dataset.c)], button);
    };
  }

  function howTo({ icon, title, steps }, host = $("[data-stage]")) {
    return new Promise((resolve) => {
      host.querySelector(".kt-how")?.remove();
      const box = document.createElement("div");
      box.className = "kt-how";
      box.innerHTML = `<div class="kt-how-card" role="dialog" aria-label="How to play"><div class="kt-how-icon" aria-hidden="true">${icon}</div><h2>${title}</h2><ol>${steps.map((s) => `<li>${s}</li>`).join("")}</ol><button type="button" class="kt-go">▶ Let's go!</button></div>`;
      host.appendChild(box);
      VOICE.speak(`${title}. ${steps.join(" ")}`);
      box.querySelector(".kt-go").addEventListener("click", () => {
        VOICE.hush();
        box.remove();
        resolve();
      });
    });
  }

  // A "See it" lesson: scenes drawn in the stage, read aloud, stepped with big Back / Next buttons.
  // scenes: [{ say: "html", draw(view, api) }]. api: { alive(), wait(ms), tween(ms, fn(t)), W, H }.
  function explain(scenes, { alive = () => true, onDone, doneLabel = "🎮 Let's play!", title = "" } = {}) {
    const stage = $("[data-stage]");
    let index = 0;
    let gen = 0;
    const host = panel(`<div class="kt-steps"><button type="button" class="kt-step-btn" data-back aria-label="Back">◀</button><span class="kt-step-dots" data-dots></span><button type="button" class="kt-step-btn kt-step-next" data-next>Next ▶</button></div>`);
    const live = (g) => g === gen && alive() && stage.isConnected;
    const show = () => {
      const g = ++gen;
      const scene = scenes[index];
      stage.innerHTML = "";
      const view = svg("0 0 1000 560", stage);
      view.classList.add("kt-scene");
      say(`${title && index === 0 ? `<b>${title}</b> ` : ""}${scene.say}`);
      $("[data-dots]", host).innerHTML = scenes.map((_, i) => `<i class="${i === index ? "on" : i < index ? "seen" : ""}"></i>`).join("") + `<small>${index + 1} of ${scenes.length}</small>`;
      $("[data-back]", host).disabled = index === 0;
      const last = index === scenes.length - 1;
      const next = $("[data-next]", host);
      next.textContent = last ? doneLabel : "Next ▶";
      next.classList.toggle("kt-step-play", last);
      const api = {
        W: 1000,
        H: 560,
        alive: () => live(g),
        wait: (ms) => new Promise((resolve, reject) => setTimeout(() => (live(g) ? resolve() : reject(STOP)), still.matches ? Math.min(ms, 200) : ms)),
        tween: (ms, fn, ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)) =>
          new Promise((resolve, reject) => {
            if (still.matches) {
              fn(1);
              return resolve();
            }
            const t0 = performance.now();
            const frame = (now) => {
              if (!live(g)) return reject(STOP);
              const t = Math.min(1, (now - t0) / ms);
              fn(ease(t));
              if (t < 1) requestAnimationFrame(frame);
              else resolve();
            };
            requestAnimationFrame(frame);
          }),
      };
      Promise.resolve()
        .then(() => scene.draw(view, api))
        .catch((error) => {
          if (error !== STOP) console.error(error);
        });
    };
    host.onclick = (event) => {
      if (event.target.closest("[data-back]") && index > 0) {
        index -= 1;
        show();
      } else if (event.target.closest("[data-next]")) {
        if (index < scenes.length - 1) {
          index += 1;
          show();
        } else {
          gen += 1;
          VOICE.hush();
          onDone?.();
        }
      }
    };
    show();
    return { stop: () => (gen += 1), again: () => ((index = 0), show()) };
  }
  const STOP = Symbol("stop");

  // Big emoji picture inside an SVG scene.
  function emoji(parent, x, y, glyph, size = 80, attrs = {}) {
    return text(parent, x, y + size * 0.35, glyph, { "font-size": size, "font-family": "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif", "font-weight": 400, ...attrs });
  }

  // "Where do we use it?" scene: up to 4 everyday picture cards that pop in one by one.
  function everyday(items) {
    return async (view, api) => {
      const n = items.length;
      const w = Math.min(230, 900 / n - 20);
      const x0 = 500 - (n * (w + 20) - 20) / 2;
      for (let i = 0; i < n; i++) {
        const [glyph, label] = items[i];
        const g = el("g", { transform: `translate(${x0 + i * (w + 20)} 120)`, opacity: 0 }, view);
        el("rect", { width: w, height: 300, rx: 28, fill: "#fff", stroke: "var(--accent)", "stroke-width": 4 }, g);
        el("circle", { cx: w / 2, cy: 115, r: 78, fill: "var(--accent-soft)" }, g);
        emoji(g, w / 2, 112, glyph, 92);
        const words = label.split(" ");
        const lines = [];
        for (const word of words) {
          const lastLine = lines[lines.length - 1];
          if (lastLine && (lastLine + " " + word).length <= 14) lines[lines.length - 1] = lastLine + " " + word;
          else lines.push(word);
        }
        lines.slice(0, 3).forEach((line, j) => text(g, w / 2, 236 + j * 30 - (lines.length - 1) * 8, line, { "font-size": 25, fill: "#2b1d12", "font-weight": 800 }));
        await api.tween(450, (t) => {
          g.setAttribute("opacity", t);
          g.setAttribute("transform", `translate(${x0 + i * (w + 20)} ${120 + (1 - t) * 40})`);
        });
        await api.wait(500);
      }
    };
  }

  const style = document.createElement("style");
  style.textContent = `
.kt-steps{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
.kt-step-btn{min-width:64px;min-height:56px;padding:0 20px;border:0;border-radius:20px;background:#fff;color:var(--ink);box-shadow:0 4px 0 #e2d6c4;font:900 20px/1 var(--sans);cursor:pointer;touch-action:manipulation}
.kt-step-btn:disabled{opacity:.35;cursor:default}
.kt-step-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #e2d6c4}
.kt-step-next{min-width:150px;background:var(--accent);color:#fff;box-shadow:0 4px 0 var(--accent-dark)}
.kt-step-play{animation:ap-pulse 1.4s ease-in-out infinite}
.kt-step-dots{display:flex;align-items:center;gap:6px}
.kt-step-dots i{width:12px;height:12px;border-radius:50%;background:#e6dccd}
.kt-step-dots i.seen{background:var(--accent-soft);box-shadow:inset 0 0 0 2px var(--accent)}
.kt-step-dots i.on{width:26px;border-radius:6px;background:var(--accent)}
.kt-step-dots small{margin-left:6px;color:var(--muted);font:800 13px var(--sans)}
@media (max-height:460px){.kt-step-btn{min-height:42px;font-size:17px}}
.kt-surprise{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:7}
.kt-count{position:absolute;left:50%;top:40%;color:#ff7043;font:900 128px/1 var(--sans);text-shadow:0 6px 0 rgba(0,0,0,.15);opacity:0;animation:kt-count .32s ease-out forwards}
.kt-ship{position:absolute;left:50%;bottom:-6px;margin-left:-42px;font-size:84px;line-height:1;transform:rotate(-45deg);animation:kt-shake .12s linear .5s 4,kt-launch 1.7s cubic-bezier(.55,0,.85,.35) .98s forwards}
.kt-rocket i{position:absolute;left:50%;bottom:-30px;width:70px;height:70px;margin-left:-35px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,#ddd5ca);opacity:0;animation:kt-puff 1.6s ease-out forwards}
.kt-sky{background:radial-gradient(ellipse at 50% 40%,#24366f,#0a1030 75%);animation:kt-night 4.6s ease forwards}
.kt-sky>i{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;opacity:.55}
.kt-sky svg{position:absolute;left:50%;top:46%;width:min(80%,440px);max-height:70%;transform:translate(-50%,-50%);overflow:visible}
.kt-sky circle{fill:#fff8d6;opacity:0;transform-box:fill-box;transform-origin:center;animation:kt-star .5s ease-out forwards}
.kt-sky line{stroke:#9fc2ff;stroke-width:.8;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:100;animation:kt-draw .4s ease-out forwards}
.kt-sky b{position:absolute;left:0;right:0;bottom:7%;text-align:center;color:#fff;font:900 clamp(22px,4vw,34px)/1.2 var(--sans);opacity:0;animation:kt-in .5s ease forwards}
.kt-mount{position:absolute;left:50%;bottom:0;width:min(60%,360px);aspect-ratio:2/1;transform:translate(-50%,100%);animation:kt-mount 4s ease forwards}
.kt-mount svg{position:absolute;inset:0;width:100%;height:100%}
.kt-mount path{fill:#795548;stroke:#4e342e;stroke-width:2}
.kt-mount .kt-glow{fill:#ff7043;stroke:none}
.kt-crater{position:absolute;left:50%;top:12%}
.kt-crater i,.kt-splash i{position:absolute;left:-8px;top:-8px;border-radius:50%;opacity:0;animation:kt-arc 1.4s linear forwards}
.kt-sea{position:absolute;left:0;right:0;bottom:0;z-index:2;height:80px;background:linear-gradient(#4fc3f7,#0277bd);border-radius:50% 50% 0 0/24px 24px 0 0;transform:translateY(100%);animation:kt-sea 3.8s ease forwards}
.kt-jumper{position:absolute;right:16%;bottom:10px;z-index:1;font-size:90px;line-height:1;animation:kt-jump 1.6s .4s ease-in-out both}
.kt-splash{position:absolute;right:58%;bottom:60px;z-index:3}
.kt-stomper{position:absolute;left:-100px;bottom:6%;font-size:96px;line-height:1;transform:scaleX(-1);animation:kt-run 2.8s linear forwards,kt-bob .35s ease-in-out infinite}
.kt-print{position:absolute;bottom:4%;font-size:30px;opacity:0;animation:kt-print 3.2s ease forwards}
.kt-roar{position:absolute;left:50%;top:22%;color:#2e7d32;font:900 clamp(40px,8vw,72px)/1 var(--sans);transform:translateX(-50%);opacity:0;animation:kt-roar 1.4s 1.1s ease-out forwards}
.kt-popper{position:absolute;left:50%;bottom:calc(8% + 30px);font-size:80px;line-height:1;opacity:0;animation:kt-pop 2.6s 1.2s ease-out forwards}
.kt-hat{position:absolute;left:50%;bottom:8%;font-size:100px;line-height:1;opacity:0;animation:kt-hat 3.9s ease forwards}
.kt-magic>span:not([class]){position:absolute;left:50%;bottom:calc(8% + 90px);font:900 24px/1 sans-serif;opacity:0;animation:kt-spark 1s 1.2s ease-out forwards}
@keyframes kt-count{0%{opacity:0;transform:translate(-50%,-50%) scale(1.8)}30%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(.7)}}
@keyframes kt-shake{0%,100%{transform:rotate(-45deg) translate(0,0)}50%{transform:rotate(-45deg) translate(3px,-3px)}}
@keyframes kt-launch{from{transform:translate(0,0) rotate(-45deg)}to{transform:translate(0,-140vh) rotate(-45deg)}}
@keyframes kt-puff{0%{opacity:.95;transform:translate(0,0) scale(.3)}100%{opacity:0;transform:translate(var(--dx),-70px) scale(1.9)}}
@keyframes kt-night{0%{opacity:0}12%,82%{opacity:.95}100%{opacity:0}}
@keyframes kt-star{0%{opacity:0;transform:scale(0)}60%{opacity:1;transform:scale(1.9)}100%{opacity:1;transform:scale(1)}}
@keyframes kt-mount{0%{transform:translate(-50%,100%)}12%,85%{transform:translate(-50%,0)}100%{transform:translate(-50%,100%)}}
@keyframes kt-arc{0%{opacity:1;transform:translate(0,0)}25%{transform:translate(calc(var(--x)*.25),calc(var(--h)*-.75))}50%{transform:translate(calc(var(--x)*.5),calc(var(--h)*-1))}75%{transform:translate(calc(var(--x)*.75),calc(var(--h)*-.75))}100%{opacity:.8;transform:translate(var(--x),calc(var(--h)*.3))}}
@keyframes kt-jump{0%{transform:translate(0,40px) rotate(30deg)}25%{transform:translate(calc(var(--run)*.25),-170px) rotate(18deg)}50%{transform:translate(calc(var(--run)*.5),-230px) rotate(0)}75%{transform:translate(calc(var(--run)*.75),-170px) rotate(-18deg)}100%{transform:translate(var(--run),60px) rotate(-35deg)}}
@keyframes kt-bob{0%,100%{margin-bottom:0}50%{margin-bottom:16px}}
@keyframes kt-print{0%{opacity:0;transform:scale(.4)}10%,80%{opacity:.75;transform:scale(1)}100%{opacity:0}}
@keyframes kt-roar{0%{opacity:0;transform:translateX(-50%) scale(.3) rotate(-8deg)}35%{opacity:1;transform:translateX(-50%) scale(1.25) rotate(4deg)}70%{opacity:1;transform:translateX(-50%) scale(1) rotate(-2deg)}100%{opacity:0;transform:translateX(-50%) scale(1.1)}}
@keyframes kt-hat{0%{opacity:0;transform:translateX(-50%) scale(.3)}10%{opacity:1;transform:translateX(-50%) scale(1)}16%,24%{transform:translateX(-50%) rotate(-10deg)}20%,28%{transform:translateX(-50%) rotate(10deg)}32%,85%{opacity:1;transform:translateX(-50%) rotate(0)}100%{opacity:0;transform:translateX(-50%)}}
@keyframes kt-pop{0%{opacity:0;transform:translate(-50%,0) scale(.4)}30%{opacity:1;transform:translate(-50%,-170px) scale(1.3)}45%,85%{opacity:1;transform:translate(-50%,-150px) scale(1)}100%{opacity:0;transform:translate(-50%,-150px) scale(1)}}
.kt-balloons i{position:absolute;bottom:-120px;width:56px;height:70px;border-radius:50% 50% 48% 48%;box-shadow:inset -8px -10px 0 rgba(0,0,0,.12),inset 8px 8px 0 rgba(255,255,255,.35);animation:kt-rise linear forwards}
.kt-balloons i::after{content:"";position:absolute;left:50%;top:100%;width:2px;height:60px;background:rgba(0,0,0,.25)}
.kt-burst{position:absolute;width:0;height:0}
.kt-burst i{position:absolute;left:-5px;top:-5px;width:10px;height:10px;border-radius:50%;opacity:0;animation:kt-boom 1.1s ease-out forwards}
.kt-bubbles i{position:absolute;bottom:-80px;border-radius:50%;background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.95),rgba(255,255,255,.2) 32%,rgba(120,200,255,.25) 60%,rgba(255,120,220,.35));box-shadow:inset 0 0 0 2px rgba(255,255,255,.7);animation:kt-bubble ease-in forwards}
.kt-shoot{position:absolute;left:-60px;font-size:50px;line-height:1;opacity:0;animation:kt-shoot 1.5s ease-in forwards}
.kt-shoot::before{content:"";position:absolute;right:70%;top:45%;width:160px;height:8px;border-radius:4px;background:linear-gradient(90deg,transparent,#ffe082);transform:rotate(-10deg);transform-origin:right center}
.kt-twinkle{position:absolute;opacity:0;animation:kt-twink 1.6s ease-in-out forwards}
.kt-butterflies span{position:absolute;left:-60px;animation:kt-flutter ease-in-out forwards}
.kt-sparkle{position:absolute;inset:auto;width:0;height:0;overflow:visible}
.kt-sparkle i{position:absolute;left:-10px;top:-12px;font:900 22px/1 sans-serif;font-style:normal;animation:kt-spark 1s ease-out forwards}
@keyframes kt-draw{to{stroke-dashoffset:0}}
@keyframes kt-in{to{opacity:1}}
@keyframes kt-fadeout{0%,75%{opacity:1}100%{opacity:0}}
@keyframes kt-twink{0%{opacity:0;transform:scale(.3) rotate(0)}40%{opacity:1;transform:scale(1.2) rotate(20deg)}100%{opacity:0;transform:scale(.6) rotate(40deg)}}
@keyframes kt-sea{0%{transform:translateY(100%)}12%,85%{transform:none}100%{transform:translateY(100%)}}
@keyframes kt-run{to{left:calc(100% + 10px)}}
@keyframes kt-rise{0%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-55vh) rotate(5deg)}100%{transform:translateY(-115vh) rotate(-4deg)}}
@keyframes kt-boom{0%{opacity:1;transform:rotate(var(--a)) translateX(0) scale(1.2)}100%{opacity:0;transform:rotate(var(--a)) translateX(110px) scale(.4)}}
@keyframes kt-bubble{0%{transform:translateY(0) translateX(0)}50%{transform:translateY(-50vh) translateX(18px)}92%{opacity:1}100%{transform:translateY(-95vh) translateX(-10px) scale(1.4);opacity:0}}
@keyframes kt-shoot{0%{transform:translate(0,0) rotate(-10deg);opacity:1}10%{opacity:1}100%{transform:translate(120vw,30vh) rotate(-10deg);opacity:0}}
@keyframes kt-flutter{0%{transform:translate(0,0) rotate(-10deg)}25%{transform:translate(30vw,-40px) rotate(10deg)}50%{transform:translate(60vw,30px) rotate(-10deg)}75%{transform:translate(90vw,-30px) rotate(10deg)}100%{transform:translate(120vw,0) rotate(-10deg)}}
@keyframes kt-spark{0%{opacity:1;transform:rotate(var(--a)) translateX(0) scale(.6)}100%{opacity:0;transform:rotate(var(--a)) translateX(70px) scale(1.2)}}
.kt-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:6}
.kt-confetti span{position:absolute;top:-16px;width:9px;height:14px;border-radius:2px;animation:kt-fall linear forwards}
@keyframes kt-fall{to{transform:translate(var(--drift),760px) rotate(var(--spin));opacity:.9}}
.kt-how{position:absolute;inset:0;z-index:8;display:grid;place-items:center;padding:12px;background:rgba(245,239,228,.92)}
.kt-how-card{max-width:560px;width:100%;max-height:100%;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px 24px;border-radius:28px;background:#fff;box-shadow:0 8px 0 #ece3d6,0 18px 40px rgba(70,40,15,.18);text-align:center}
.kt-how-icon{display:grid;place-items:center;width:clamp(76px,12vw,104px);height:clamp(76px,12vw,104px);border-radius:50%;background:var(--accent-soft);font-size:clamp(42px,7vw,60px);line-height:1}
.kt-how-card h2{margin:0;color:#2b1d12;font:900 clamp(22px,3.2vw,30px)/1.15 var(--sans)}
.kt-how-card ol{margin:0;padding:0;list-style:none;counter-reset:s;display:grid;gap:8px;text-align:left;width:100%}
.kt-how-card li{counter-increment:s;display:grid;grid-template-columns:38px 1fr;align-items:center;gap:12px;color:#2b1d12;font:700 clamp(17px,2.3vw,21px)/1.35 var(--sans)}
.kt-how-card li::before{content:counter(s);display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--accent);color:#fff;font-weight:900}
.kt-go{min-height:60px;min-width:220px;margin-top:8px;border:0;border-radius:20px;background:var(--accent);color:#fff;font:900 23px/1 var(--sans);cursor:pointer;box-shadow:0 5px 0 var(--accent-dark)}
.kt-go:active{transform:translateY(3px);box-shadow:0 2px 0 var(--accent-dark)}
@media (max-height:460px){.kt-how-card{padding:10px 14px;gap:5px}.kt-how-icon{font-size:36px}.kt-how-card li{font-size:15px}.kt-go{min-height:46px;font-size:18px}}
.kt-pad{display:flex;flex-direction:column;align-items:center;gap:6px}
.kt-entry{min-width:4.2em;min-height:52px;padding:4px 14px;border-radius:16px;background:#fff;box-shadow:0 0 0 3px var(--accent);color:var(--ink);font:800 30px/40px ui-rounded,system-ui,sans-serif;text-align:center}
.kt-keys{display:grid;grid-template-columns:repeat(6,minmax(44px,1fr));gap:5px}
.kt-keys button{min-height:48px;border:0;border-radius:14px;background:#fff;box-shadow:0 3px 0 #e2d6c4;color:var(--ink);font:900 21px/1 var(--sans);cursor:pointer;touch-action:manipulation}
.kt-keys button.ok{background:var(--accent);color:#fff;box-shadow:0 3px 0 var(--accent-dark)}
.kt-keys button:active{transform:translateY(1px)}
.kt-choices button{min-height:48px;padding:0 18px;font-size:18px}
.kt-choices button.right{background:#22a05a;color:#fff;box-shadow:0 3px 0 #157a40}
.kt-choices button.wrong{background:#f6dcd4;box-shadow:0 0 0 1px #d9822b}
@media (max-height:460px),(max-width:420px) and (max-height:720px){.kt-keys button{min-height:36px;font-size:17px}.kt-entry{min-height:38px;font-size:24px;line-height:32px}.kt-keys{grid-template-columns:repeat(6,minmax(38px,1fr))}}
`;
  document.head.appendChild(style);

  window.KIT = { explain, emoji, everyday, howTo, NS, $, $$, pick, pickInt, wait, shuffle, PRAISE, KIND, still, svg, el, text, panel, say, sayAsync, confetti, surprise, sparkle, SURPRISES, numpad, choices };
})();
