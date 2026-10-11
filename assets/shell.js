(() => {
  const $ = (selector) => document.querySelector(selector);

  function shell({ units, start, onUnit, subject, activity }) {
    const select = $("[data-units]");
    const learner = () => (window.OC ? OC.current() : "") || "Learner";
    const progress = () => MUSIC.progress.of(learner());
    const render = () => {
      const done = progress();
      select.innerHTML = units
        .map((unit) => `<option value="${unit.id}"${unit.soon ? " disabled" : ""}>${unit.label}${unit.soon ? " (coming soon)" : done[unit.id]?.done ? " ✓" : ""}</option>`)
        .join("");
      select.value = current;
    };
    let current = start || units.find((unit) => !unit.soon).id;
    const go = (id) => {
      current = id;
      render();
      VOICE.hush();
      const unit = units.find((item) => item.id === id);
      window.OC?.begin(subject, activity, unit.label.replace(/^\d+\.\s*/, ""));
      onUnit(id, unit);
    };
    select.addEventListener("change", () => go(select.value));

    const voiceButton = $("[data-voice]");
    voiceButton.textContent = VOICE.state.on ? "🔊" : "🔇";
    voiceButton.setAttribute("aria-pressed", String(VOICE.state.on));
    voiceButton.addEventListener("click", () => VOICE.toggle(voiceButton));
    const soundButton = $("[data-sound]");
    soundButton.textContent = MUSIC.audio.on ? "🔔" : "🔕";
    soundButton.setAttribute("aria-pressed", String(MUSIC.audio.on));
    soundButton.addEventListener("click", () => MUSIC.toggle(soundButton));
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
    return {
      go,
      learner,
      progress,
      mark: (id, data) => {
        MUSIC.progress.mark(learner(), id, data);
        render();
      },
      current: () => current,
    };
  }

  window.SHELL = shell;
})();
