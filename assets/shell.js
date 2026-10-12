(() => {
  const $ = (selector) => document.querySelector(selector);
  const strip = (label) => label.replace(/^\d+\.\s*/, "");

  function shell({ units, start, onUnit, onStop, subject, activity, how = {}, unitWord = "Game" }) {
    const learner = () => (window.OC ? OC.current() : "") || "Learner";
    // Unit ids repeat across apps (c0, g1 ...), so progress outside Music is kept per activity.
    const scope = subject === "Music" ? "" : `${activity}:`;
    const progress = () => {
      const all = MUSIC.progress.of(learner());
      if (!scope) return all;
      const mine = all.gallery ? { gallery: all.gallery } : {};
      for (const [key, value] of Object.entries(all)) if (key.startsWith(scope)) mine[key.slice(scope.length)] = value;
      return mine;
    };
    const markUnit = (id, data) => MUSIC.progress.mark(learner(), scope + id, data);
    const pickButton = $("[data-pick]");
    const iconOf = (unit, index) => unit.icon || how[unit.id]?.icon || ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫"][index] || "🎯";
    let current = start || units.find((unit) => !unit.soon).id;

    const menu = document.createElement("div");
    menu.className = "ap-menu";
    menu.hidden = true;
    menu.setAttribute("role", "dialog");
    menu.setAttribute("aria-label", "Choose a game");
    document.body.appendChild(menu);

    const render = () => {
      const unit = units.find((u) => u.id === current);
      const index = units.indexOf(unit);
      if (pickButton) pickButton.innerHTML = `<span class="ap-pick-icon" aria-hidden="true">${iconOf(unit, index)}</span><span class="ap-pick-text"><small>${unitWord} ${index + 1} of ${units.length}</small><b>${strip(unit.label)}</b></span><span class="ap-pick-arrow" aria-hidden="true">▾</span>`;
      const done = progress();
      menu.innerHTML = `<div class="ap-menu-card"><div class="ap-menu-head"><h2>Choose a game</h2><button type="button" class="ap-menu-close" data-close aria-label="Close">✕</button></div><div class="ap-tiles">${units
        .map((u, i) => {
          const state = u.soon ? "soon" : done[u.id]?.done ? "done" : "";
          return `<button type="button" class="ap-tile${u.id === current ? " current" : ""}${state ? ` ${state}` : ""}" data-unit="${u.id}"${u.soon ? " disabled" : ""}><span class="ap-tile-icon" aria-hidden="true">${iconOf(u, i)}</span><span class="ap-tile-name">${strip(u.label)}</span>${state === "done" ? `<span class="ap-badge">✓ Done</span>` : u.soon ? `<span class="ap-badge soon">Soon</span>` : ""}</button>`;
        })
        .join("")}</div></div>`;
    };
    const openMenu = () => {
      render();
      menu.hidden = false;
      menu.querySelector(".ap-tile.current, .ap-tile")?.focus();
    };
    const closeMenu = () => (menu.hidden = true);
    pickButton?.addEventListener("click", openMenu);
    menu.addEventListener("click", (event) => {
      if (event.target === menu || event.target.closest("[data-close]")) return closeMenu();
      const tile = event.target.closest("[data-unit]");
      if (tile && !tile.disabled) {
        closeMenu();
        go(tile.dataset.unit);
      }
    });
    addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menu.hidden) closeMenu();
    });

    const go = (id) => {
      current = id;
      render();
      VOICE.hush();
      onStop?.();
      const unit = units.find((item) => item.id === id);
      window.OC?.begin(subject, activity, strip(unit.label));
      const card = how[id];
      const seen = progress()[id]?.seen;
      if (card && window.KIT && !seen && !/See it/.test(unit.label)) {
        const panel = $("[data-panel]");
        panel.onclick = null;
        panel.innerHTML = `<p class="ap-say">Read the steps, then press <b>Let's go!</b></p>`;
        KIT.howTo(card).then(() => {
          if (current !== id) return;
          markUnit(id, { seen: true });
          onUnit(id, unit);
        });
      } else onUnit(id, unit);
    };

    const helpButton = $("[data-help]");
    if (helpButton) {
      helpButton.hidden = !Object.keys(how).length;
      helpButton.addEventListener("click", () => {
        const card = how[current];
        if (!card || !window.KIT) return;
        VOICE.hush();
        onStop?.();
        KIT.howTo(card).then(() => go(current));
      });
    }

    const voiceButton = $("[data-voice]");
    voiceButton.textContent = VOICE.state.on ? "🔊" : "🔇";
    voiceButton.setAttribute("aria-pressed", String(VOICE.state.on));
    voiceButton.addEventListener("click", () => VOICE.toggle(voiceButton));
    const soundButton = $("[data-sound]");
    soundButton.textContent = MUSIC.audio.on ? "🔔 Sounds on" : "🔕 Sounds off";
    soundButton.addEventListener("click", () => {
      MUSIC.toggle(null);
      soundButton.textContent = MUSIC.audio.on ? "🔔 Sounds on" : "🔕 Sounds off";
    });
    $("[data-voice-pick]").addEventListener("change", (event) => VOICE.choose(event.target.value));
    $("[data-menu]").addEventListener("click", (event) => {
      event.stopPropagation();
      $("[data-pop]").hidden = !$("[data-pop]").hidden;
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".ap-tools")) $("[data-pop]").hidden = true;
    });
    if (window.OC) {
      OC.chip($("[data-chip]"), { onSwitch: () => go(current) });
      OC.onChange(render);
    }
    render();
    setTimeout(() => go(current), 0);
    const upright = matchMedia("(orientation: portrait) and (max-width: 600px)");
    if (upright.matches) {
      const tip = document.createElement("div");
      tip.className = "ap-turn";
      tip.innerHTML = `<span aria-hidden="true">📱↻</span> Turn sideways for bigger pictures`;
      document.body.appendChild(tip);
      setTimeout(() => tip.classList.add("gone"), 5000);
      setTimeout(() => tip.remove(), 6000);
      upright.addEventListener("change", () => tip.remove(), { once: true });
    }
    return {
      go,
      learner,
      progress,
      mark: (id, data) => {
        markUnit(id, data);
        render();
      },
      current: () => current,
    };
  }

  window.SHELL = shell;
})();
