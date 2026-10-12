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

  function confetti(host = $("[data-stage]")) {
    if (still.matches || !host) return;
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

  window.KIT = { explain, emoji, everyday, howTo, NS, $, $$, pick, pickInt, wait, shuffle, PRAISE, KIND, still, svg, el, text, panel, say, sayAsync, confetti, numpad, choices };
})();
