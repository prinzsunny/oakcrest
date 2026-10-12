(() => {
  const NOVELTY = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Ralph|Kathy|Grandma|Grandpa|Rocko|Shelley|Flo\b|Eddy|Reed|Sandy/;
  const ready = "speechSynthesis" in window;
  const voice = { on: true, gen: 0, pick: null, list: [], unlocked: false };

  const read = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  };

  function rank(v) {
    if (!v.lang.toLowerCase().startsWith("en") || NOVELTY.test(v.name)) return -1;
    let score = 0;
    if (/Premium/i.test(v.name)) score += 60;
    if (/Natural|Neural|Enhanced/i.test(v.name)) score += 50;
    if (/Google US English|Google UK English Female/.test(v.name)) score += 30;
    if (/Ava|Zoe|Samantha|Allison|Susan|Evan|Nicky|Aria|Jenny|Libby|Sonia|Karen|Moira|Serena|Tessa/.test(v.name)) score += 20;
    if (v.lang.replace("_", "-") === "en-US") score += 5;
    return score;
  }

  function load() {
    if (!ready) return;
    voice.list = speechSynthesis.getVoices().filter((v) => rank(v) >= 0).sort((a, b) => rank(b) - rank(a));
    const saved = read("sb-voice");
    voice.pick = voice.list.find((v) => v.name === saved) || (voice.list.includes(voice.pick) ? voice.pick : voice.list[0]) || null;
    document.querySelectorAll("[data-voice-pick]").forEach((menu) => {
      menu.innerHTML =
        `<optgroup label="Natural voices (best)">${NEURAL.map(([id, label]) => `<option value="neural:${id}"${neural.id === id ? " selected" : ""}>${label}</option>`).join("")}</optgroup>` +
        `<optgroup label="Device voices">${voice.list
          .slice(0, 14)
          .map((v) => `<option value="device:${v.name}"${!neural.id && v === voice.pick ? " selected" : ""}>${v.name.replace(/^Microsoft /, "").replace(/ Online \(Natural\).*/, "")}</option>`)
          .join("")}</optgroup>`;
    });
  }

  const FRACTION_NAMES = { 2: ["half", "halves"], 3: ["third", "thirds"], 4: ["quarter", "quarters"], 5: ["fifth", "fifths"], 6: ["sixth", "sixths"], 8: ["eighth", "eighths"], 10: ["tenth", "tenths"], 12: ["twelfth", "twelfths"] };
  const fractionWords = (n, d) => {
    const name = FRACTION_NAMES[d];
    if (!name) return `${n} over ${d}`;
    return `${n === 1 ? "one" : n} ${n === 1 ? name[0] : name[1]}`;
  };
  const plain = (html) =>
    html
      .replace(/<span class="fr"><sup>(\d+)<\/sup><sub>(\d+)<\/sub><\/span>/g, (_, n, d) => ` ${fractionWords(Number(n), Number(d))} `)
      .replace(/\b(\d+)\/(\d+)\b(?!\s*(?:time|beat))/g, (_, n, d) => fractionWords(Number(n), Number(d)))
      .replace(/\b(\d+)\/(\d+)(?=\s*(?:time|beat))/g, "$1 $2")
      .replace(/<br>/g, ". ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[✓↻▶◀]/gu, "")
      .replace(/\p{Extended_Pictographic}(\u200d\p{Extended_Pictographic})*\ufe0f?/gu, "")
      .replace(/(\d)\s*−\s*(\d)/g, "$1 minus $2")
      .replace(/(\d)\s*\+\s*(\d)/g, "$1 plus $2")
      .replace(/\s*×\s*/g, " times ")
      .replace(/\s*÷\s*/g, " divided by ")
      .replace(/=/g, " equals ")
      .replace(/·/g, ".")
      .replace(/\b([A-G])♯/g, "$1 sharp")
      .replace(/\b([A-G])♭/g, "$1 flat")
      .replace(/\s+/g, " ")
      .trim();

  // ── Natural voice: Piper neural text-to-speech running in the browser (free, open source, no server).
  // The voice model downloads once (about 60 MB) and is cached by the browser; then each sentence takes a moment.
  const NEURAL = [
    ["en_US-hfc_female-medium", "Hope (natural)"],
    ["en_US-kristin-medium", "Kristin (natural)"],
    ["en_US-amy-medium", "Amy (natural)"],
    ["en_US-lessac-medium", "Lessac (natural)"],
    ["en_GB-alba-medium", "Alba, British (natural)"],
    ["en_US-ryan-medium", "Ryan (natural)"],
  ];
  const TTS_URL = "https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm";
  const neural = { id: null, mod: null, loading: null, ready: new Set(), failed: false, ctx: null, source: null, cache: new Map() };
  {
    const saved = read("oc-voice-engine");
    if (saved === null || saved.startsWith("neural:")) neural.id = saved ? saved.slice(7) : NEURAL[0][0];
  }
  const audioCtx = () => {
    if (!neural.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      neural.ctx = new C();
    }
    if (neural.ctx.state === "suspended") neural.ctx.resume();
    return neural.ctx;
  };
  function toast(message) {
    let box = document.querySelector(".vx-toast");
    if (!message) return box && box.remove();
    if (!box) {
      box = document.createElement("div");
      box.className = "vx-toast";
      box.style.cssText = "position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:60;padding:8px 14px;border-radius:16px;background:#2b1d12;color:#fff;font:800 14px/1.3 system-ui,sans-serif;box-shadow:0 8px 20px rgba(0,0,0,.2);max-width:90vw;text-align:center";
      document.body.appendChild(box);
    }
    box.textContent = message;
  }
  // Load the model for a voice (first time downloads it). Resolves true when ready.
  function prepare(id = neural.id) {
    if (!id || neural.failed) return Promise.resolve(false);
    if (neural.ready.has(id)) return Promise.resolve(true);
    if (neural.loading && neural.loading.id === id) return neural.loading.job;
    const job = (async () => {
      try {
        neural.mod = neural.mod || (await import(TTS_URL));
        const t = setTimeout(() => toast("🎙️ Getting the natural reading voice ready. This happens only once."), 1500);
        await neural.mod.predict({ text: "Hi.", voiceId: id });
        clearTimeout(t);
        toast("");
        neural.ready.add(id);
        return true;
      } catch (error) {
        console.warn("Natural voice unavailable, using the device voice.", error);
        toast("");
        neural.failed = true;
        return false;
      }
    })();
    neural.loading = { id, job };
    return job;
  }
  async function bufferOf(id, sentence) {
    const key = id + "|" + sentence;
    if (neural.cache.has(key)) return neural.cache.get(key);
    const job = (async () => {
      const wav = await neural.mod.predict({ text: sentence, voiceId: id });
      return audioCtx().decodeAudioData(await wav.arrayBuffer());
    })();
    neural.cache.set(key, job);
    if (neural.cache.size > 120) neural.cache.delete(neural.cache.keys().next().value);
    job.catch(() => neural.cache.delete(key));
    return job;
  }
  function play(buffer, gen) {
    return new Promise((resolve) => {
      if (gen !== voice.gen) return resolve();
      const ctx = audioCtx();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 1;
      source.connect(gain).connect(ctx.destination);
      let over = false;
      const end = () => {
        if (over) return;
        over = true;
        resolve();
      };
      source.onended = end;
      // If audio is blocked (no tap yet) the clip never "ends"; a timer keeps lessons moving.
      setTimeout(end, buffer.duration * 1000 + 400);
      neural.source = source;
      source.start();
    });
  }
  async function speakNeural(parts, gen) {
    const id = neural.id;
    let next = bufferOf(id, parts[0]);
    for (let i = 0; i < parts.length; i++) {
      if (gen !== voice.gen) return;
      const buffer = await next;
      if (i + 1 < parts.length) next = bufferOf(id, parts[i + 1]); // make the next sentence while this one plays
      if (gen !== voice.gen) return;
      await play(buffer, gen);
      if (gen !== voice.gen) return;
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  function hush() {
    voice.gen += 1;
    if (ready) speechSynthesis.cancel();
    try {
      neural.source?.stop();
    } catch {}
    neural.source = null;
  }

  function unlock() {
    if (voice.unlocked || !ready) return;
    voice.unlocked = true;
    if (neural.id) audioCtx();
    const line = new SpeechSynthesisUtterance(" ");
    line.volume = 0;
    speechSynthesis.speak(line);
    if (!voice.list.length) load();
  }

  function speakAsync(html) {
    hush();
    const gen = voice.gen;
    const text = plain(html);
    const parts = text.split(/(?<=[.!?:])\s+/).map((part) => part.trim()).filter(Boolean);
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve(gen === voice.gen);
      };
      if (!voice.on || !parts.length) {
        setTimeout(finish, 300 + text.length * 45);
        return;
      }
      // Natural voice when it is ready; the device voice meanwhile (first download) or if it can't load.
      if (neural.id && !neural.failed) {
        const ctx = neural.ready.has(neural.id) && audioCtx();
        if (ctx && ctx.state === "running") {
          speakNeural(parts, gen).then(finish, finish);
          return;
        }
        prepare();
      }
      if (!ready) {
        setTimeout(finish, 300 + text.length * 45);
        return;
      }
      let index = 0;
      const next = () => {
        if (gen !== voice.gen || index >= parts.length) return finish();
        const line = new SpeechSynthesisUtterance(parts[index++]);
        if (voice.pick) {
          line.voice = voice.pick;
          line.lang = voice.pick.lang;
        }
        line.rate = 0.9;
        line.onend = () => setTimeout(next, 130);
        line.onerror = () => setTimeout(next, 130);
        speechSynthesis.speak(line);
      };
      setTimeout(next, 90);
      setTimeout(finish, 2500 + text.length * 120);
    });
  }

  function toggle(button) {
    voice.on = !voice.on;
    write("sb-voice-on", voice.on ? "1" : "0");
    if (button) {
      button.textContent = voice.on ? "🔊" : "🔇";
      button.setAttribute("aria-pressed", String(voice.on));
      button.setAttribute("aria-label", voice.on ? "Voice on" : "Voice off");
    }
    if (!voice.on) hush();
    else speakAsync("Voice is on.");
  }

  function choose(value) {
    if (String(value).startsWith("neural:")) {
      neural.id = value.slice(7);
      neural.failed = false;
      write("oc-voice-engine", value);
      if (voice.on) prepare().then((ok) => ok && speakAsync("Hello! This is my natural voice."));
      return;
    }
    const name = String(value).replace(/^device:/, "");
    neural.id = null;
    write("oc-voice-engine", "device:" + name);
    voice.pick = voice.list.find((v) => v.name === name) || voice.pick;
    if (voice.pick) write("sb-voice", voice.pick.name);
    if (voice.on) speakAsync("Hello! Let's learn.");
  }

  if (read("sb-voice-on") === "0") voice.on = false;
  if (ready) {
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
  }
  addEventListener("pointerdown", unlock, { capture: true });
  // Get the natural voice ready in the background so the first sentence is quick.
  if (neural.id && voice.on) setTimeout(() => prepare(), 1500);
  addEventListener("keydown", unlock, { capture: true });
  addEventListener("pagehide", hush);
  document.addEventListener("visibilitychange", () => document.hidden && hush());

  window.VOICE = { state: voice, speak: (html) => void speakAsync(html), speakAsync, hush, toggle, choose, load, prepare, neural, plain };
})();
