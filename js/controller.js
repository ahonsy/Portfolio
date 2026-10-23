const Controller = {
  transitioning: false,
  audioUnlocked: false,

  init() {
    View.init();
    this.bindMenu();
    this.bindKeyboard();
    this.bindAudioUnlock();
    this.bindBackgroundMusic();
  },

  goTo(screen) {
    if (this.transitioning || screen === Model.state.screen) return;
    if (!View.els.screens[screen]) return;

    this.transitioning = true;
    this.play();

    View.wipe(
      () => {
        Model.state.screen = screen;
        View.showScreen(screen);
      },
      () => {
        this.transitioning = false;
      }
    );
  },

  select(index) {
    const count = View.els.menuItems.length;
    if (!count) return;

    const next = (index + count) % count;

    if (next !== Model.state.menuIndex) this.play();

    Model.state.menuIndex = next;
    View.setMenuSelection(next);
  },

  play() {
    if (this.audioUnlocked) View.playSelect();
  },

  bindAudioUnlock() {
    const unlock = () => {
      this.audioUnlocked = true;
    };

    addEventListener("pointerdown", unlock, {
      once: true,
      capture: true
    });

    addEventListener("keydown", unlock, {
      once: true,
      capture: true
    });
  },

  bindBackgroundMusic() {
    const music = document.getElementById("bg-music");
    const toggle = document.getElementById("music-toggle");

    if (!music) return;

    music.volume = 0.35;
    music.loop = true;

    const updateButton = () => {
      if (!toggle) return;

      const playing = !music.paused && !music.ended;
      toggle.textContent = playing ? "♫ MUSIC: ON" : "♫ MUSIC: OFF";
      toggle.setAttribute("aria-label",
        playing ? "Pause background music" : "Play background music");
      toggle.setAttribute("aria-pressed", String(playing));
    };

    const startMusic = async () => {
      if (!music.paused) return;

      try {
        await music.play();
      } catch (error) {
        console.warn("Music playback was blocked or failed.", error);
      }

      updateButton();
    };

    if (toggle) {
      toggle.addEventListener("click", async () => {
        if (!music.paused) {
          music.pause();
        } else {
          await startMusic();
        }

        updateButton();
      });
    }

    music.addEventListener("play", updateButton);
    music.addEventListener("pause", updateButton);
    music.addEventListener("ended", updateButton);

    updateButton();
  },

  bindMenu() {
    View.els.menuItems.forEach((item, index) => {
      item.addEventListener("mouseenter", () => this.select(index));

      item.addEventListener("click", () => {
        this.goTo(item.dataset.target);
      });
    });

    document.querySelectorAll("[data-back]").forEach(button => {
      button.addEventListener("click", () => this.goTo("home"));
    });

    const bigName = document.getElementById("big-name");

    if (bigName) {
      bigName.addEventListener("click", () => {
        if (Model.state.screen !== "home") {
          this.goTo("home");
        } else {
          this.play();
        }
      });
    }
  },

  bindKeyboard() {
    addEventListener("keydown", event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (Model.state.screen === "home") {
        if (event.key === "ArrowDown") {
          this.select(Model.state.menuIndex + 1);
          event.preventDefault();
        } else if (event.key === "ArrowUp") {
          this.select(Model.state.menuIndex - 1);
          event.preventDefault();
        } else if (event.key === "Enter") {
          const item = View.els.menuItems[Model.state.menuIndex];

          if (item) this.goTo(item.dataset.target);
        }
      } else if (event.key === "Escape") {
        this.goTo("home");
      }
    });
  }
};

Controller.init();
