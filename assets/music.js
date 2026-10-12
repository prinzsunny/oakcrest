(() => {
  const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const PRETTY = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
  const WHITE = [0, 2, 4, 5, 7, 9, 11];
  const span = (low, high) => Array.from({ length: high - low + 1 }, (_, i) => low + i);
  const ORCH = [60, 64, 67, 72, 76, 79];
  const SAMPLES = {
    piano: span(36, 84),
    xylophone: span(72, 96),
    woodblock: [72, 79],
    violin: ORCH,
    flute: ORCH,
    trumpet: ORCH,
    clarinet: ORCH,
    horn: ORCH,
    harp: ORCH,
    cello: [48, 55, ...ORCH],
    timpani: [48, 55, 60],
  };
  const SOUNDS = new URL("sounds/", document.currentScript.src);

  const midiOf = (name) => {
    const match = /^([A-G])([b#♭♯]?)(-?\d)$/.exec(name);
    if (!match) return null;
    const shift = match[2] === "#" || match[2] === "♯" ? 1 : match[2] ? -1 : 0;
    return (Number(match[3]) + 1) * 12 + [0, 2, 4, 5, 7, 9, 11][LETTERS.indexOf(match[1])] + shift;
  };
  const fileOf = (midi) => `${FLATS[midi % 12]}${Math.floor(midi / 12) - 1}`;
  const prettyOf = (midi) => PRETTY[midi % 12];
  const isWhite = (midi) => WHITE.includes(midi % 12);
  const letterOf = (midi) => (isWhite(midi) ? LETTERS[WHITE.indexOf(midi % 12)] : null);
  const stepOf = (midi) => (Math.floor(midi / 12) - 1) * 7 + WHITE.indexOf(midi % 12);
  const midiOfStep = (step) => (Math.floor(step / 7) + 1) * 12 + WHITE[((step % 7) + 7) % 7];

  const read = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const audio = { ctx: null, master: null, buffers: new Map(), pending: new Map(), on: read("sb-sound-on") !== "0" };

  function context() {
    if (!audio.ctx) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return null;
      audio.ctx = new Context();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.9;
      const squeeze = audio.ctx.createDynamicsCompressor();
      squeeze.threshold.value = -10;
      squeeze.ratio.value = 3;
      audio.master.connect(squeeze).connect(audio.ctx.destination);
    }
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    return audio.ctx;
  }

  function sampleFor(instrument, midi) {
    if (instrument === "woodblock") return midi >= 76 ? 79 : 72;
    const list = SAMPLES[instrument] || SAMPLES.piano;
    let best = list[0];
    for (const m of list) if (Math.abs(m - midi) < Math.abs(best - midi)) best = m;
    return best;
  }

  function fetchSample(instrument, midi) {
    const key = `${instrument}:${midi}`;
    if (audio.buffers.has(key)) return Promise.resolve(audio.buffers.get(key));
    if (audio.pending.has(key)) return audio.pending.get(key);
    const ctx = context();
    if (!ctx) return Promise.resolve(null);
    const job = fetch(new URL(`${instrument}/${fileOf(midi)}.mp3`, SOUNDS))
      .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(response.status))))
      .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
      .then((buffer) => {
        audio.buffers.set(key, buffer);
        return buffer;
      })
      .catch(() => null);
    audio.pending.set(key, job);
    return job;
  }

  function preload(instrument, midis) {
    return Promise.all([...new Set(midis.map((midi) => sampleFor(instrument, midi)))].map((midi) => fetchSample(instrument, midi)));
  }

  function fallback(ctx, midi, at, gain) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(0.25 * gain, at + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);
    osc.connect(amp).connect(audio.master);
    osc.start(at);
    osc.stop(at + 0.65);
  }

  function play(instrument, midi, { gain = 0.9, at = 0, length = 0 } = {}) {
    if (!audio.on) return;
    const ctx = context();
    if (!ctx) return;
    const when = Math.max(ctx.currentTime, at || ctx.currentTime);
    const base = sampleFor(instrument, midi);
    const buffer = audio.buffers.get(`${instrument}:${base}`);
    if (!buffer) {
      fetchSample(instrument, base);
      fallback(ctx, midi, when, gain);
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (instrument !== "woodblock") source.playbackRate.value = 2 ** ((midi - base) / 12);
    const amp = ctx.createGain();
    amp.gain.value = gain;
    source.connect(amp).connect(audio.master);
    source.start(when);
    if (length > 0) {
      amp.gain.setValueAtTime(gain, when + length);
      amp.gain.exponentialRampToValueAtTime(0.0001, when + length + 0.25);
      source.stop(when + length + 0.3);
    }
  }

  // The soroban bead click: a short wooden tick plus the ring of a hard bead (same as the Soroban app).
  let beadNoise = null;
  let beadLast = 0;
  function bead(strength = 1) {
    const ctx = context();
    if (!ctx || !audio.on || performance.now() - beadLast < 28) return;
    beadLast = performance.now();
    if (!beadNoise) {
      const length = Math.floor(ctx.sampleRate * 0.03);
      beadNoise = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = beadNoise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 4);
    }
    const t = ctx.currentTime + 0.002;
    const out = ctx.createGain();
    out.gain.value = 0.9 * strength;
    const air = ctx.createBiquadFilter();
    air.type = "highpass";
    air.frequency.value = 180;
    out.connect(air).connect(audio.master);
    const tick = ctx.createBufferSource();
    tick.buffer = beadNoise;
    tick.playbackRate.value = 0.9 + Math.random() * 0.3;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 3800 + Math.random() * 1400;
    band.Q.value = 1.4;
    const tickGain = ctx.createGain();
    tickGain.gain.setValueAtTime(0.5, t);
    tickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
    tick.connect(band).connect(tickGain).connect(out);
    tick.start(t);
    tick.stop(t + 0.02);
    const base = 1550 + Math.random() * 350;
    for (const [ratio, level, decay] of [[1, 0.34, 0.045], [2.32, 0.2, 0.024], [4.25, 0.11, 0.013], [6.63, 0.05, 0.008]]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = base * ratio * (0.985 + Math.random() * 0.03);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(level, t + 0.0006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + decay * 4);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + decay * 4 + 0.01);
    }
    const knock = ctx.createOscillator();
    knock.frequency.setValueAtTime(260 + Math.random() * 40, t);
    knock.frequency.exponentialRampToValueAtTime(190, t + 0.03);
    const knockGain = ctx.createGain();
    knockGain.gain.setValueAtTime(0.0001, t);
    knockGain.gain.exponentialRampToValueAtTime(0.09, t + 0.001);
    knockGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    knock.connect(knockGain).connect(out);
    knock.start(t);
    knock.stop(t + 0.06);
  }

  const now = () => context()?.currentTime || 0;
  const tick = (accent = false, at = 0) => play("woodblock", accent ? 79 : 72, { gain: accent ? 0.75 : 0.55, at });
  function chime() {
    const t = now() + 0.02;
    [84, 88, 91, 96].forEach((midi, i) => play("xylophone", midi, { gain: 0.45, at: t + i * 0.09 }));
  }
  function oops() {
    const t = now() + 0.02;
    play("piano", 67, { gain: 0.28, at: t, length: 0.25 });
    play("piano", 64, { gain: 0.26, at: t + 0.22, length: 0.4 });
  }

  function toggle(button) {
    audio.on = !audio.on;
    try {
      localStorage.setItem("sb-sound-on", audio.on ? "1" : "0");
    } catch {}
    if (button) {
      button.textContent = audio.on ? "🔔" : "🔕";
      button.setAttribute("aria-pressed", String(audio.on));
      button.setAttribute("aria-label", audio.on ? "Sounds on" : "Sounds off");
    }
    if (audio.on) chime();
  }

  addEventListener("pointerdown", () => context(), { capture: true });

  const progressKey = "oc-music";
  const progress = {
    all() {
      try {
        return JSON.parse(read(progressKey) || "{}");
      } catch {
        return {};
      }
    },
    of(learner) {
      return this.all()[learner || "Learner"] || {};
    },
    mark(learner, unit, data) {
      const all = this.all();
      const mine = (all[learner || "Learner"] ||= {});
      mine[unit] = { ...(mine[unit] || {}), ...data, at: Date.now() };
      try {
        localStorage.setItem(progressKey, JSON.stringify(all));
      } catch {}
    },
  };

  window.MUSIC = { SAMPLES, audio, context, preload, play, tick, bead, chime, oops, toggle, now, midiOf, fileOf, prettyOf, letterOf, isWhite, stepOf, midiOfStep, LETTERS, progress };
})();
