const View = {
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,

  els: {
    screens: {},
    menuItems: [],
    wipe: document.getElementById("wipe"),
    sfx: document.getElementById("sfx-select"),
    cursor: document.getElementById("cursor"),
    clock: document.getElementById("clock")
  },

  init() {
    document.querySelectorAll(".screen").forEach(screen => {
      this.els.screens[screen.id.replace("screen-", "")] = screen;
    });

    this.els.menuItems = [...document.querySelectorAll(".menu-item")];

    document.querySelectorAll("[data-ransom]").forEach(el => {
      this.ransomize(el);
    });

    if (this.els.sfx) this.els.sfx.volume = 0.45;

    this.renderScrapbook();
    this.startClock();
    this.startParallax();
    this.startCursor();

    document.body.classList.add("loaded");
  },

  hash(str) {
    let h = 9;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 387420489);
    }
    return (h ^ h >>> 9) >>> 0;
  },

  ransomize(el) {
    const text = el.dataset.ransom || el.textContent;
    el.textContent = "";

    [...text].forEach((character, i) => {
      const span = document.createElement("span");
      span.className = "ch display";
      span.textContent = character;

      const h = this.hash(text + i);
      const rot = (h % 17) - 8;
      const scale = 0.86 + ((h >> 3) % 30) / 100;
      const dy = ((h >> 5) % 9) - 4;
      const transform = `rotate(${rot}deg) scale(${scale}) translateY(${dy}px)`;

      span.style.setProperty("--t", transform);
      span.style.transform = transform;

      const variant = (h >> 7) % 10;
      if (variant === 0) span.classList.add("box");
      else if (variant === 1) span.classList.add("boxw");

      el.appendChild(span);
    });
  },

  showScreen(name) {
    const screen = this.els.screens[name];
    if (!screen) {
      console.warn(`Screen "${name}" was not found.`);
      return;
    }

    Object.values(this.els.screens).forEach(item => {
      item.classList.remove("active");
    });

    screen.classList.add("active");
    screen.scrollTop = 0;
    document.body.dataset.screen = name;
  },

  setMenuSelection(index) {
    this.els.menuItems.forEach((item, i) => {
      item.classList.toggle("sel", i === index);
    });
  },

  wipe(swap, done) {
    if (!this.els.wipe || this.reducedMotion) {
      swap();
      done();
      return;
    }

    const wipe = this.els.wipe;
    wipe.classList.remove("go");
    void wipe.offsetWidth;
    wipe.classList.add("go");

    setTimeout(swap, 340);
    setTimeout(done, 720);
  },

  playSelect() {
    if (!this.els.sfx) return;

    try {
      this.els.sfx.currentTime = 0;
      const playback = this.els.sfx.play();
      if (playback?.catch) playback.catch(() => {});
    } catch {}
  },

  /* ---------- Scrapbook rendering ---------- */

  makeCard(className, title, text, index = 0) {
    const card = document.createElement("article");
    card.className = `scrap-card ${className}`;

    const rotation = ((this.hash(title + index) % 7) - 3) * 0.8;
    card.style.setProperty("--tilt", `${rotation}deg`);
    card.style.setProperty("--delay", `${index * 70}ms`);

    const heading = document.createElement("h3");
    heading.textContent = title;

    const paragraph = document.createElement("p");
    paragraph.textContent = text;

    card.append(heading, paragraph);
    return card;
  },

  renderCollection(container, items, type) {
    if (!container) return;

    container.replaceChildren();

    items.forEach((item, index) => {
      let title;
      let text;
      let author = "";

      if (type === "letters") {
        title = item.title;
        text = item.message;
        author = item.author;
      } else if (type === "friends") {
        title = item.name;
        text = item.note;
      } else {
        title = item.title;
        text = item.text;
      }

      const card = this.makeCard(
        `paper-${item.color || ["sage", "cream", "butter"][index % 3]}`,
        title,
        text,
        index
      );

      if (type === "letters") {
        const pin = document.createElement("span");
        pin.className = "scrap-pin";
        pin.setAttribute("aria-hidden", "true");
        card.appendChild(pin);

        const signature = document.createElement("small");
        signature.className = "letter-signature";
        signature.textContent = `— ${author}`;
        card.appendChild(signature);

        if (item.date) {
          const date = document.createElement("span");
          date.className = "letter-date";
          date.textContent = item.date;
          card.appendChild(date);
        }
      }

      container.appendChild(card);
    });
  },

  renderScrapbook() {
    this.renderCollection(
      document.getElementById("storytime-grid"),
      Model.storytime,
      "storytime"
    );

    this.renderCollection(
      document.getElementById("funtime-grid"),
      Model.funTime,
      "funtime"
    );

    this.renderCollection(
      document.getElementById("friends-grid"),
      Model.friends,
      "friends"
    );

    this.renderCollection(
      document.getElementById("letters-grid"),
      Model.letters,
      "letters"
    );
  },

  startClock() {
    const update = () => {
      if (this.els.clock) {
        this.els.clock.textContent =
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          });
      }
    };

    update();
    setInterval(update, 1000);
  },

  startParallax() {
    if (this.reducedMotion) return;

    const stripes = document.getElementById("bg-stripes");
    const halftone = document.getElementById("bg-halftone");

    let tx = 0, ty = 0, cx = 0, cy = 0;

    addEventListener("mousemove", event => {
      tx = event.clientX / innerWidth - 0.5;
      ty = event.clientY / innerHeight - 0.5;
    }, { passive: true });

    const loop = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;

      if (stripes) {
        stripes.style.transform =
          `translate(${cx * 22}px, ${cy * 14}px)`;
      }

      if (halftone) {
        halftone.style.transform =
          `translate(${cx * -34}px, ${cy * -22}px)`;
      }

      requestAnimationFrame(loop);
    };

    loop();
  },

  startCursor() {
    if (!matchMedia("(pointer:fine)").matches || this.reducedMotion) return;

    const cursor = this.els.cursor;
    if (!cursor) return;

    document.body.classList.add("cursor-on");

    let x = -100, y = -100, frame = 0, last = 0, visible = false;

    addEventListener("mousemove", event => {
      x = event.clientX;
      y = event.clientY;

      if (!visible) {
        cursor.style.display = "block";
        visible = true;
      }

      const target = event.target;
      const overLink = target.closest &&
        target.closest("a,button,.scrap-card,.menu-item,.back-hint,#big-name");

      cursor.classList.toggle("link", !!overLink);
    }, { passive: true });

    document.documentElement.addEventListener("mouseleave", () => {
      cursor.style.display = "none";
      visible = false;
    });

    const tick = timestamp => {
      if (timestamp - last >= 50) {
        frame = (frame + 1) % 30;
        last = timestamp;
        cursor.style.backgroundPosition = `${-frame * 48}px 0`;
      }

      cursor.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }
};
