(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const mouse = { x: innerWidth / 2, y: innerHeight / 2, active: false };
  addEventListener("pointermove", (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  }, { passive: true });

  /* ---------------- smooth scroll ---------------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    if (hasGsap) {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  } else if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
  }

  const scrollToTarget = (hash) => {
    const target = hash === "#top" ? 0 : $(hash);
    if (target === null) return;
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: "smooth" });
    else target.scrollIntoView({ behavior: "smooth" });
  };
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const hash = a.getAttribute("href");
      if (hash.length < 2) return;
      e.preventDefault();
      if (document.body.classList.contains("menu-open")) closeMenu();
      scrollToTarget(hash);
    });
  });

  /* ---------------- starfield ---------------- */
  (() => {
    const c = $("#stars"), ctx = c.getContext("2d");
    let w, h, stars = [];
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const resize = () => {
      w = c.width = innerWidth * dpr; h = c.height = innerHeight * dpr;
      const n = Math.round((innerWidth * innerHeight) / 9000);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: (Math.random() * 0.9 + 0.2) * dpr, a: Math.random(), s: Math.random() * 0.015 + 0.003,
        vy: (Math.random() * 0.08 + 0.02) * dpr,
      }));
    };
    resize(); addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const light = document.documentElement.dataset.theme === "light";
      ctx.fillStyle = `rgb(${getComputedStyle(document.documentElement).getPropertyValue("--star")})`;
      for (const s of stars) {
        s.a += s.s; s.y -= reduce ? 0 : s.vy;
        if (s.y < 0) s.y = h;
        const px = s.x + (mouse.x / innerWidth - 0.5) * 12 * s.r;
        ctx.globalAlpha = (0.25 + Math.abs(Math.sin(s.a)) * 0.55) * (light ? 0.45 : 1);
        ctx.beginPath(); ctx.arc(px, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    draw();
  })();

  /* ---------------- ghost cursor (smoky ember trail) ---------------- */
  if (finePointer && !reduce) (() => {
    const c = $("#ghost"), ctx = c.getContext("2d");
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let w, h;
    const resize = () => { w = c.width = innerWidth * dpr; h = c.height = innerHeight * dpr; };
    resize(); addEventListener("resize", resize);
    const pts = Array.from({ length: 22 }, () => ({ x: mouse.x, y: mouse.y }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      pts[0].x += (mouse.x - pts[0].x) * 0.35;
      pts[0].y += (mouse.y - pts[0].y) * 0.35;
      for (let i = 1; i < pts.length; i++) {
        pts[i].x += (pts[i - 1].x - pts[i].x) * 0.38;
        pts[i].y += (pts[i - 1].y - pts[i].y) * 0.38;
      }
      if (mouse.active) {
        for (let i = pts.length - 1; i >= 0; i--) {
          const p = pts[i], t = 1 - i / pts.length;
          const r = (10 + t * 34) * dpr;
          const g = ctx.createRadialGradient(p.x * dpr, p.y * dpr, 0, p.x * dpr, p.y * dpr, r);
          g.addColorStop(0, `rgba(239, 98, 80, ${0.16 * t})`);
          g.addColorStop(1, "rgba(216, 72, 58, 0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x * dpr, p.y * dpr, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = "rgba(216,72,58,0.95)";
        ctx.beginPath(); ctx.arc(pts[0].x * dpr, pts[0].y * dpr, 2.2 * dpr, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    draw();
  })();

  /* ---------------- theme toggle ---------------- */
  $("#themeBtn").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    $('meta[name="theme-color"]').setAttribute("content", next === "light" ? "#f5f3ef" : "#050505");
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  /* ---------------- portrait parallax ---------------- */
  if (finePointer && !reduce && hasGsap) {
    const portrait = $("#portrait");
    const rx = gsap.quickTo(portrait, "rotationX", { duration: 0.9, ease: "power3.out" });
    const ry = gsap.quickTo(portrait, "rotationY", { duration: 0.9, ease: "power3.out" });
    $(".hero").addEventListener("pointermove", (e) => {
      const r = portrait.getBoundingClientRect();
      ry(((e.clientX - (r.left + r.width / 2)) / innerWidth) * 18);
      rx(-((e.clientY - (r.top + r.height / 2)) / innerHeight) * 14);
    });
    $(".hero").addEventListener("pointerleave", () => { rx(0); ry(0); });
  }

  /* ---------------- philosophy: split into words ---------------- */
  const philoWords = (() => {
    const el = $("#philoText"), out = [];
    const wrap = (text, hl) => text.split(/(\s+)/).map((t) => {
      if (!t.trim()) return document.createTextNode(t);
      const w = document.createElement("span");
      w.className = hl ? "w hl" : "w"; w.textContent = t; out.push(w); return w;
    });
    [...el.childNodes].forEach((n) => {
      const parts = wrap(n.textContent, n.nodeType === 1 && n.classList.contains("hl"));
      n.replaceWith(...parts);
    });
    return out;
  })();

  /* ---------------- split titles ---------------- */
  $$(".split").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) =>
      `<span class="word">${[...w].map((c) => `<span class="char">${c}</span>`).join("")}</span>`
    ).join(" ");
  });

  /* ---------------- loader + intro ---------------- */
  const heroCounters = $$(".hero [data-count]");
  const fmt = (el, v) => (el.textContent = (el.dataset.prefix || "") + Math.round(v).toLocaleString("en-IN") + (el.dataset.suffix || ""));
  const intro = () => {
    if (!hasGsap || reduce) return;
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(".nav", { opacity: 0, y: -20, duration: 1 }, 0)
      .from(".hero__title .ln > span", { yPercent: 110, duration: 1.3, stagger: 0.1 }, 0.1)
      .from(".hero .h-in", { opacity: 0, y: 28, duration: 1.1, stagger: 0.08 }, 0.2)
      .from(".tile", { opacity: 0, y: 30, duration: 1, stagger: 0.07, clearProps: "transform,translate" }, 0.55)
      // portrait: curtain reveal, image settles, ring + chips arrive
      .fromTo("#portraitFrame", { clipPath: "inset(100% 0% 0% 0% round 32px)" }, { clipPath: "inset(0% 0% 0% 0% round 32px)", duration: 1.5, ease: "expo.inOut" }, 0.1)
      .from("#portraitFrame img, .portrait__mono", { scale: 1.35, duration: 1.8 }, 0.35)
      .from(".portrait__ring", { scale: 0.7, opacity: 0, duration: 1.6 }, 0.6)
      .from(".portrait__glow", { opacity: 0, duration: 1.6 }, 0.6)
      .from(".portrait__chip", { opacity: 0, scale: 0.7, y: 20, duration: 0.9, stagger: 0.12, ease: "back.out(1.7)" }, 1.1)
      .fromTo(".portrait__shine", { xPercent: -120 }, { xPercent: 120, duration: 1.4, ease: "power2.inOut", repeat: -1, repeatDelay: 5 }, 1.4);
    heroCounters.forEach((el) => {
      const o = { v: 0 };
      tl.to(o, { v: Number(el.dataset.count), duration: 2, ease: "power3.out", onUpdate: () => fmt(el, o.v) }, 0.6);
    });
  };

  const loader = $("#loader");
  document.body.classList.add("is-loading");
  const finishLoad = () => {
    document.body.classList.remove("is-loading");
    if (hasGsap && !reduce) {
      gsap.to(loader, { yPercent: -100, duration: 1.1, ease: "expo.inOut", onComplete: () => loader.remove() });
      gsap.delayedCall(0.45, intro);
    } else { loader.remove(); intro(); }
  };
  if (reduce || !hasGsap) {
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(finishLoad);
  } else {
    // progress walks the product loop: Discover → Define → Prioritise → Build → Ship
    const counter = { v: 0 };
    const reel = $("#loaderReel"), nodes = $$(".loader__track i"), steps = $$(".loader__steps span");
    let step = -1;
    const render = () => {
      $("#loaderBar").style.width = `${counter.v}%`;
      const s = Math.min(4, Math.floor(counter.v / 25 + 0.001));
      nodes.forEach((n, i) => n.classList.toggle("on", counter.v >= i * 25));
      if (s !== step) {
        step = s;
        reel.style.transform = `translateY(${-s * 1.05}em)`;
        steps.forEach((el, i) => el.classList.toggle("on", i <= s));
      }
    };
    render();
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const tween = gsap.to(counter, { v: 80, duration: 1.3, ease: "power1.inOut", onUpdate: render });
    Promise.all([fontsReady, new Promise((r) => tween.eventCallback("onComplete", r))]).then(() => {
      gsap.to(counter, { v: 100, duration: 0.4, ease: "power1.out", onUpdate: render, onComplete: () => gsap.delayedCall(0.25, finishLoad) });
    });
  }

  /* ---------------- menu ---------------- */
  const menu = $("#menu"), menuBtn = $("#menuBtn"), menuLabel = $(".dive__label");
  let menuTl = null;
  if (hasGsap) {
    menuTl = gsap.timeline({ paused: true })
      .set(menu, { visibility: "visible" })
      .to(menu, { clipPath: "circle(150% at calc(100% - 9vw) 40px)", duration: 0.9, ease: "expo.inOut" })
      .from(".menu__links a", { yPercent: 110, duration: 0.8, stagger: 0.06, ease: "expo.out" }, "-=0.45")
      .from(".menu__foot", { opacity: 0, y: 20, duration: 0.6 }, "-=0.5");
  }
  function openMenu() {
    document.body.classList.add("menu-open");
    menuBtn.setAttribute("aria-expanded", "true"); menu.setAttribute("aria-hidden", "false");
    menuLabel.textContent = "Close";
    lenis && lenis.stop();
    if (menuTl) menuTl.timeScale(1).play(); else { menu.style.visibility = "visible"; menu.style.clipPath = "none"; }
  }
  function closeMenu() {
    document.body.classList.remove("menu-open");
    menuBtn.setAttribute("aria-expanded", "false"); menu.setAttribute("aria-hidden", "true");
    menuLabel.textContent = "Dive In";
    lenis && lenis.start();
    if (menuTl) menuTl.timeScale(1.6).reverse(); else menu.style.visibility = "hidden";
  }
  menuBtn.addEventListener("click", () => document.body.classList.contains("menu-open") ? closeMenu() : openMenu());
  addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("menu-open")) closeMenu(); });

  /* ---------------- magnetic ---------------- */
  if (finePointer && !reduce && hasGsap) {
    $$("[data-magnetic]").forEach((el) => {
      const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.3);
      });
      el.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
    });
  }

  /* ---------------- tilt + spotlight ---------------- */
  if (finePointer && !reduce) {
    $$("[data-tilt]").forEach((el) => {
      const strength = el.classList.contains("card") ? 5 : 9;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        el.style.transform = `perspective(1200px) rotateX(${(0.5 - py) * strength}deg) rotateY(${(px - 0.5) * strength}deg)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform .8s cubic-bezier(.22,1,.36,1)";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 800);
      });
    });
  }

  /* ---------------- philosophy bridge canvas ---------------- */
  const bridge = (() => {
    const c = $("#bridge"), ctx = c.getContext("2d");
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let w, h, visible = false, t = 0;
    const parts = Array.from({ length: 90 }, () => ({ p: Math.random(), s: 0.002 + Math.random() * 0.004, o: (Math.random() - 0.5) * 2 }));
    const resize = () => { w = c.width = c.clientWidth * dpr; h = c.height = c.clientHeight * dpr; };
    const orb = (x, y, r, a) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255, 170, 150, ${a})`);
      g.addColorStop(0.25, `rgba(216, 72, 58, ${a * 0.8})`);
      g.addColorStop(1, "rgba(216, 72, 58, 0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    };
    const draw = () => {
      if (!visible) return;
      t += 0.016;
      if (c.clientWidth * dpr !== w || c.clientHeight * dpr !== h) resize();
      ctx.clearRect(0, 0, w, h);
      const ax = w * 0.14, bx = w * 0.86, y = h * 0.4, s = Math.min(w, h);
      const lift = h * 0.18;
      const pt = (p, off) => {
        const x = ax + (bx - ax) * p;
        const yy = y - Math.sin(p * Math.PI) * lift + off * Math.sin(p * Math.PI) * s * 0.05;
        return [x, yy];
      };
      ctx.strokeStyle = "rgba(216,72,58,0.18)"; ctx.lineWidth = 1 * dpr;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        for (let p = 0; p <= 1.001; p += 0.02) { const [x, yy] = pt(p, k * 0.8); p === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
        ctx.stroke();
      }
      for (const q of parts) {
        q.p += q.s; if (q.p > 1) q.p = 0;
        const [x, yy] = pt(q.p, q.o + Math.sin(t * 2 + q.p * 8) * 0.2);
        ctx.globalAlpha = Math.sin(q.p * Math.PI);
        ctx.fillStyle = "#ffb4a6";
        ctx.beginPath(); ctx.arc(x, yy, 1.6 * dpr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const pulse = 1 + Math.sin(t * 2) * 0.06;
      orb(ax, y, s * 0.14 * pulse, 0.8);
      orb(bx, y, s * 0.14 * (2 - pulse), 0.8);
      const [mx, my] = pt(0.5, 0);
      orb(mx, my, s * 0.07 * (1 + Math.sin(t * 5) * 0.2), 0.9);
      requestAnimationFrame(draw);
    };
    new IntersectionObserver(([e]) => {
      const was = visible; visible = e.isIntersecting;
      if (visible && !was) { resize(); requestAnimationFrame(draw); }
    }).observe(c);
  })();

  /* ---------------- teardown tabs ---------------- */
  const brands = {
    zepto: { name: "Zepto", b: "#7b2cf5", t: "#ffffff" },
    blinkit: { name: "blinkit", b: "#f8cb46", t: "#1a1a1a" },
    uc: { name: "Urban Company", b: "#f2f2f2", t: "#111111" },
    toing: { name: "Toing", b: "#d8483a", t: "#ffffff" },
    more: { name: "15+ more", b: "#3b3b41", t: "#ffffff" },
  };
  const phone = $("#tearPhone"), brandEl = $("#tearBrand");
  const setBrand = (key, animate) => {
    const br = brands[key];
    const apply = () => {
      phone.style.setProperty("--b", br.b); phone.style.setProperty("--t", br.t);
      brandEl.textContent = br.name;
    };
    if (animate && hasGsap && !reduce) {
      gsap.timeline()
        .to(phone, { rotateY: 90, duration: 0.3, ease: "power2.in", onComplete: apply })
        .to(phone, { rotateY: 0, duration: 0.6, ease: "back.out(1.6)" });
      gsap.fromTo(".tear__lens li", { opacity: 0.3, x: 16 }, { opacity: 1, x: 0, stagger: 0.08, duration: 0.6, ease: "expo.out", clearProps: "transform,translate,rotate,scale" });
    } else apply();
  };
  $$(".tear__tabs button").forEach((btn) => {
    const br = brands[btn.dataset.brand];
    btn.style.setProperty("--b", br.b); btn.style.setProperty("--t", br.t);
    btn.addEventListener("click", () => {
      if (btn.classList.contains("is-on")) return;
      $$(".tear__tabs button").forEach((b) => { b.classList.remove("is-on"); b.setAttribute("aria-selected", "false"); });
      btn.classList.add("is-on"); btn.setAttribute("aria-selected", "true");
      setBrand(btn.dataset.brand, true);
    });
  });
  setBrand("zepto", false);

  /* ---------------- segmentation dots ---------------- */
  (() => {
    const svg = $(".seg");
    const ns = "http://www.w3.org/2000/svg";
    const centers = [[45, 70, "#d8483a"], [100, 40, "#f2efea"], [155, 80, "#8d8a86"]];
    const dots = Array.from({ length: 27 }, (_, i) => {
      const c = document.createElementNS(ns, "circle");
      const rx = 15 + Math.random() * 170, ry = 15 + Math.random() * 100;
      const [cx, cy, col] = centers[i % 3];
      const a = Math.random() * Math.PI * 2, d = Math.random() * 20;
      c.setAttribute("r", 3.2);
      c.dataset.rx = rx; c.dataset.ry = ry;
      c.dataset.cx = cx + Math.cos(a) * d; c.dataset.cy = cy + Math.sin(a) * d; c.dataset.col = col;
      c.setAttribute("cx", rx); c.setAttribute("cy", ry); c.setAttribute("fill", "rgba(255,255,255,0.35)");
      svg.appendChild(c); return c;
    });
    const host = svg.closest(".fw");
    const cluster = (on) => dots.forEach((c) => {
      c.setAttribute("cx", on ? c.dataset.cx : c.dataset.rx);
      c.setAttribute("cy", on ? c.dataset.cy : c.dataset.ry);
      c.setAttribute("fill", on ? c.dataset.col : "rgba(255,255,255,0.35)");
    });
    host.addEventListener("pointerenter", () => cluster(true));
    host.addEventListener("pointerleave", () => cluster(false));
    if (!finePointer) new IntersectionObserver(([e]) => cluster(e.isIntersecting), { threshold: 0.6 }).observe(host);
  })();

  /* ---------------- marquee loop ---------------- */
  (() => {
    const track = $("#marquee");
    $$("img", track).forEach((img) => img.addEventListener("error", () => img.remove()));
    track.innerHTML += track.innerHTML;
    $$("img", track).forEach((img) => img.addEventListener("error", () => img.remove()));
  })();

  /* ---------------- touch: auto-play hover visuals ---------------- */
  const fwIo = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); fwIo.unobserve(e.target); }
  }), { threshold: 0.6 });
  $$(".fw").forEach((el) => fwIo.observe(el));

  /* ---------------- contact form -> mail ---------------- */
  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.currentTarget, note = $("#formNote");
    let ok = true;
    ["name", "email", "message"].forEach((n) => {
      const el = f.elements[n];
      const valid = el.value.trim() && (n !== "email" || /^\S+@\S+\.\S+$/.test(el.value.trim()));
      el.classList.toggle("invalid", !valid);
      if (!valid) ok = false;
    });
    if (!ok) { note.textContent = "Please fill in all fields with a valid email."; note.style.color = "var(--ember-bright)"; return; }
    const subject = `Portfolio enquiry from ${f.elements.name.value.trim()}`;
    const body = `${f.elements.message.value.trim()}\n\n— ${f.elements.name.value.trim()} (${f.elements.email.value.trim()})`;
    window.location.href = `mailto:vedaantchopra01@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.textContent = "Your email app should open now — hit send there. ✓";
    note.style.color = "var(--green)";
  });

  /* ---------------- scroll animations ---------------- */
  if (!hasGsap || reduce) {
    $$("[data-count]").forEach((el) => (el.textContent = (el.dataset.prefix || "") + Number(el.dataset.count).toLocaleString("en-IN") + (el.dataset.suffix || "")));
    philoWords.forEach((w) => (w.style.opacity = 1));
    $$(".tl").forEach((t) => t.classList.add("on"));
    return;
  }

  // philosophy: words light up as the paragraph scrolls by (no pinning, nothing to wait for)
  gsap.to(philoWords, {
    opacity: 1, stagger: 0.12, ease: "none",
    scrollTrigger: { trigger: "#philoText", start: "top 85%", end: "bottom 50%", scrub: 0.6 },
  });
  gsap.from(".principles div, .philo__screen", { opacity: 0, y: 40, duration: 1.1, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: ".philo__grid", start: "top 80%" } });
  gsap.from(".brief", { opacity: 0, y: 40, duration: 1.1, stagger: 0.08, ease: "expo.out", clearProps: "transform,translate", scrollTrigger: { trigger: ".brief__grid", start: "top 88%" } });

  // split titles
  $$(".split").forEach((el) => {
    gsap.from($$(".char", el), {
      yPercent: 110, opacity: 0, rotate: 6, duration: 1.1, ease: "expo.out", stagger: 0.025,
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });
  $$(".section-head .eyebrow, .section-head .muted").forEach((el) =>
    gsap.from(el, { opacity: 0, y: 24, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } })
  );

  // counters
  $$("[data-count]").filter((el) => !el.closest(".hero")).forEach((el) => {
    const end = Number(el.dataset.count), o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 2, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => (el.textContent = (el.dataset.prefix || "") + Math.round(o.v).toLocaleString("en-IN") + (el.dataset.suffix || "")),
    });
  });

  // cards
  $$(".card").forEach((card) => {
    gsap.from(card, { opacity: 0, y: 90, scale: 0.96, duration: 1.3, ease: "expo.out", clearProps: "transform,translate,rotate,scale", scrollTrigger: { trigger: card, start: "top 88%" } });
    gsap.from($$(".card__body > *", card), { opacity: 0, y: 24, stagger: 0.07, duration: 1, ease: "expo.out", scrollTrigger: { trigger: card, start: "top 75%" } });
    gsap.fromTo($(".card__visual", card), { y: 40 }, { y: -40, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // teardown / toolkit / certs
  gsap.from(".tear__tabs button", { opacity: 0, y: 20, stagger: 0.06, duration: 0.8, ease: "expo.out", clearProps: "transform,translate,rotate,scale", scrollTrigger: { trigger: ".tear__tabs", start: "top 88%" } });
  gsap.from("#tearPhone", { opacity: 0, y: 80, rotate: -6, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".tear__stage", start: "top 80%" } });
  gsap.from(".tear__lens li", { opacity: 0, x: 60, stagger: 0.12, duration: 1.1, ease: "expo.out", clearProps: "transform,translate,rotate,scale", scrollTrigger: { trigger: ".tear__lens", start: "top 85%" } });
  gsap.from(".fw", { opacity: 0, y: 60, stagger: 0.1, duration: 1.1, ease: "expo.out", clearProps: "transform,translate,rotate,scale", scrollTrigger: { trigger: ".kit__grid", start: "top 85%" } });
  gsap.from(".skills__group", { opacity: 0, y: 40, stagger: 0.12, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".skills", start: "top 88%" } });
  gsap.from(".cert", { opacity: 0, y: 40, stagger: 0.08, duration: 1, ease: "expo.out", clearProps: "transform,translate,rotate,scale", scrollTrigger: { trigger: ".certs", start: "top 88%" } });

  // timeline line + items
  gsap.to("#tlFill", { height: "100%", ease: "none", scrollTrigger: { trigger: ".timeline", start: "top 70%", end: "bottom 60%", scrub: true } });
  $$(".tl").forEach((tl) => {
    ScrollTrigger.create({ trigger: tl, start: "top 65%", onEnter: () => tl.classList.add("on"), onLeaveBack: () => tl.classList.remove("on") });
    gsap.from($$(".tl__when, .tl__what > *", tl), { opacity: 0, y: 30, stagger: 0.06, duration: 1, ease: "expo.out", scrollTrigger: { trigger: tl, start: "top 82%" } });
  });

  // contact
  gsap.from(".contact .panel", { opacity: 0, y: 60, stagger: 0.12, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".contact__grid", start: "top 85%" } });

  // hero drifts back as you scroll on
  gsap.to(".hero__visual", { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  // highlight the nav link of the section in view
  const navLinks = $$(".nav__links a");
  navLinks.forEach((link) => {
    const sec = document.getElementById(link.dataset.section);
    ScrollTrigger.create({
      trigger: sec, start: "top 50%", end: "bottom 50%",
      onToggle: (st) => st.isActive && navLinks.forEach((l) => l.classList.toggle("is-active", l === link)),
      onLeaveBack: () => link === navLinks[0] && link.classList.remove("is-active"),
    });
  });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
