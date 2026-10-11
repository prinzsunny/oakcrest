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
      menu.innerHTML = voice.list
        .slice(0, 14)
        .map((v) => `<option value="${v.name}"${v === voice.pick ? " selected" : ""}>${v.name.replace(/^Microsoft /, "").replace(/ Online \(Natural\).*/, " (natural)")}</option>`)
        .join("");
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
      .replace(/[✓🎉⭐🌟👍☝️↻▶◀🐦🐟🔊]/gu, "")
      .replace(/(\d)\s*−\s*(\d)/g, "$1 minus $2")
      .replace(/(\d)\s*\+\s*(\d)/g, "$1 plus $2")
      .replace(/=/g, " equals ")
      .replace(/·/g, ".")
      .replace(/\b([A-G])♯/g, "$1 sharp")
      .replace(/\b([A-G])♭/g, "$1 flat")
      .replace(/\s+/g, " ")
      .trim();

  function hush() {
    voice.gen += 1;
    if (ready) speechSynthesis.cancel();
  }

  function unlock() {
    if (voice.unlocked || !ready) return;
    voice.unlocked = true;
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
      if (!voice.on || !ready || !parts.length) {
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

  function choose(name) {
    voice.pick = voice.list.find((v) => v.name === name) || voice.pick;
    if (voice.pick) write("sb-voice", voice.pick.name);
    if (voice.on) speakAsync("Hello! Let's make music.");
  }

  if (read("sb-voice-on") === "0") voice.on = false;
  if (ready) {
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
  }
  addEventListener("pointerdown", unlock, { capture: true });
  addEventListener("keydown", unlock, { capture: true });
  addEventListener("pagehide", hush);
  document.addEventListener("visibilitychange", () => document.hidden && hush());

  window.VOICE = { state: voice, speak: (html) => void speakAsync(html), speakAsync, hush, toggle, choose, load };
})();
