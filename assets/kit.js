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
  const PRAISE = ["Yes!", "Great!", "Well done!", "Brilliant!", "Super!", "You got it!", "Fantastic!"];
  const KIND = ["Good try!", "Almost!", "Not quite!", "Nearly!"];
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

  const style = document.createElement("style");
  style.textContent = `
.kt-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:6}
.kt-confetti span{position:absolute;top:-16px;width:9px;height:14px;border-radius:2px;animation:kt-fall linear forwards}
@keyframes kt-fall{to{transform:translate(var(--drift),760px) rotate(var(--spin));opacity:.9}}
.kt-how{position:absolute;inset:0;z-index:8;display:grid;place-items:center;padding:12px;background:rgba(245,239,228,.92)}
.kt-how-card{max-width:560px;width:100%;max-height:100%;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 22px;border-radius:22px;background:#fffcf6;box-shadow:0 0 0 1px #e3d6c2,0 14px 34px rgba(70,40,15,.18);text-align:center}
.kt-how-icon{font-size:clamp(44px,8vw,72px);line-height:1}
.kt-how-card h2{margin:0;color:#2b1d12;font:700 clamp(21px,3vw,28px)/1.15 Georgia,serif}
.kt-how-card ol{margin:0;padding:0;list-style:none;counter-reset:s;display:grid;gap:8px;text-align:left;width:100%}
.kt-how-card li{counter-increment:s;display:grid;grid-template-columns:34px 1fr;align-items:center;gap:10px;color:#2b1d12;font-size:clamp(16px,2.2vw,20px);line-height:1.35}
.kt-how-card li::before{content:counter(s);display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#7a4520;color:#fff;font-weight:800}
.kt-go{min-height:58px;min-width:200px;margin-top:6px;border:0;border-radius:16px;background:#7a4520;color:#fff;font:800 22px/1 ui-rounded,system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 0 #4f2a10}
.kt-go:active{transform:translateY(2px);box-shadow:0 2px 0 #4f2a10}
@media (max-height:460px){.kt-how-card{padding:10px 14px;gap:5px}.kt-how-icon{font-size:36px}.kt-how-card li{font-size:15px}.kt-go{min-height:46px;font-size:18px}}
.kt-pad{display:flex;flex-direction:column;align-items:center;gap:6px}
.kt-entry{min-width:4.2em;min-height:48px;padding:4px 14px;border-radius:12px;background:#fffcf6;box-shadow:0 0 0 2px var(--brown);color:var(--ink);font:800 30px/40px ui-rounded,system-ui,sans-serif;text-align:center}
.kt-keys{display:grid;grid-template-columns:repeat(6,minmax(44px,1fr));gap:5px}
.kt-keys button{min-height:44px;border:0;border-radius:11px;background:var(--card);box-shadow:0 0 0 1px #c9b8a1;color:var(--ink);font:700 20px/1 ui-rounded,system-ui,sans-serif;cursor:pointer;touch-action:manipulation}
.kt-keys button.ok{background:var(--brown);color:#fff;box-shadow:none}
.kt-keys button:active{transform:translateY(1px)}
.kt-choices button{min-height:48px;padding:0 18px;font-size:18px}
.kt-choices button.right{background:#3f7d4e;color:#fff;box-shadow:none}
.kt-choices button.wrong{background:#f6dcd4;box-shadow:0 0 0 1px #d9822b}
@media (max-height:460px),(max-width:420px) and (max-height:720px){.kt-keys button{min-height:36px;font-size:17px}.kt-entry{min-height:38px;font-size:24px;line-height:32px}.kt-keys{grid-template-columns:repeat(6,minmax(38px,1fr))}}
`;
  document.head.appendChild(style);

  window.KIT = { howTo, NS, $, $$, pick, pickInt, wait, shuffle, PRAISE, KIND, still, svg, el, text, panel, say, sayAsync, confetti, numpad, choices };
})();
