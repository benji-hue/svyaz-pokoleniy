/* ==========================================================
   Основные анимации: первый экран, красная нить, сцены
   ========================================================== */
(function () {
  'use strict';
  const S = window.Stitch;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const COLORS = { red: '#a8142a', ink: '#22262b', green: '#36603a', ash: '#d3cfc5', redGlow: '#c92a3f' };

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- плавная прокрутка ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 3), smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  window.__lenis = lenis;

  // Якорные ссылки — плавно, с учётом шапки
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const el = id.length > 1 ? document.querySelector(id) : null;
      if (!el && id !== '#top') return;
      e.preventDefault();
      closeMenu();
      const target = el || document.body;
      if (lenis) lenis.scrollTo(target, { offset: -10 });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---------- меню на телефоне ---------- */
  const menuBtn = document.getElementById('menuBtn');
  const nav = document.getElementById('nav');
  function closeMenu() { nav.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  /* ---------- статичные знаки и монограммы ---------- */
  document.querySelectorAll('canvas[data-motif]').forEach((c) => {
    const grid = S.patternToGrid(c.dataset.motif);
    if (c.hasAttribute('data-big')) {
      // знак года: берегиня в рамке-ромбах
      const N = 21, g = Array.from({ length: N }, () => Array(N).fill(false));
      for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) if (grid[y][x]) g[y + 3][x + 3] = c.dataset.color;
      for (let i = 0; i < N; i++) {
        if (i % 2 === 0) { g[0][i] = COLORS.red; g[N - 1][i] = COLORS.red; g[i][0] = COLORS.red; g[i][N - 1] = COLORS.red; }
      }
      S.drawGrid(c, g, c.dataset.color);
    } else {
      S.drawGrid(c, grid, c.dataset.color);
    }
  });

  function monogramGrid(text) {
    const N = 20;
    let rows = 10, tg;
    do { tg = S.textToGrid(text, rows, '700 {px} Golos, sans-serif'); rows--; } while (tg[0].length > N - 5 && rows > 5);
    const g = Array.from({ length: N }, () => Array(N).fill(false));
    const oy = Math.floor((N - tg.length) / 2), ox = Math.floor((N - tg[0].length) / 2);
    tg.forEach((row, y) => row.forEach((v, x) => { if (v) g[oy + y][ox + x] = COLORS.ink; }));
    for (let i = 0; i < N; i++) {
      if (i % 2 === 0) { g[0][i] = COLORS.red; g[N - 1][i] = COLORS.red; g[i][0] = COLORS.red; g[i][N - 1] = COLORS.red; }
    }
    return g;
  }
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => {
    document.querySelectorAll('canvas[data-letter]').forEach((c) => S.drawGrid(c, monogramGrid(c.dataset.letter), COLORS.ink));
  });

  /* ---------- 1. Первый экран: вышиваем «ПАМЯТАЕМ» ---------- */
  const hero = document.getElementById('heroStitch');
  let heroCells = [];
  function buildHero() {
    const w = hero.clientWidth;
    const narrow = w < 640;
    const R = 27;
    const h = narrow ? w / 2.4 : w / 5.2;
    hero.style.aspectRatio = narrow ? '2.4 / 1' : '5.2 / 1';
    const ctx = S.fit(hero, w, h);
    const s = h / R;
    const C = Math.floor(w / s);
    const cells = [];
    // орнаментальные полосы сверху и снизу — цепочка ромбов
    const band = (y0, color) => {
      for (let y = 0; y < 5; y++) for (let x = 0; x < C; x++) {
        const dx = Math.abs((x % 6) - 3), dy = Math.abs(y - 2);
        if (dx + dy === 2 || (dx === 0 && dy === 0) || (dx === 3 && dy === 0)) cells.push({ x, y: y0 + y, color });
      }
    };
    band(0, COLORS.ink);
    band(R - 5, COLORS.ink);
    // слово
    let rows = 13, tg;
    do { tg = S.textToGrid('ПАМЯТАЕМ', rows, '600 {px} Golos, sans-serif'); rows--; } while (tg[0].length > C - 4 && rows > 6);
    const oy = 7 + Math.floor((13 - tg.length) / 2);
    const ox = Math.floor((C - tg[0].length) / 2);
    tg.forEach((row, y) => row.forEach((v, x) => { if (v) cells.push({ x: ox + x, y: oy + y, color: COLORS.red }); }));
    const offX = (w - C * s) / 2;
    heroCells = cells.map((c) => ({ px: offX + c.x * s, py: c.y * s, color: c.color, k: c.x + Math.random() * 3 }));
    heroCells.sort((a, b) => a.k - b.k);
    return { ctx, s };
  }
  function drawHeroStatic() {
    const { ctx, s } = buildHero();
    heroCells.forEach((c) => S.cross(ctx, c.px, c.py, s, c.color));
  }
  function animateHero() {
    const { ctx, s } = buildHero();
    const n = heroCells.length;
    const pass1 = 1300, pass2 = 1000, start = performance.now();
    let i1 = 0, i2 = 0;
    // как настоящая вышивальщица: сначала все «/» слева направо, затем «\» обратно
    function frame(now) {
      const t = now - start;
      const a = Math.min(n, Math.floor((t / pass1) * n));
      for (; i1 < a; i1++) { const c = heroCells[i1]; S.halfStitch(ctx, c.px, c.py, s, c.color, 0, 1); }
      if (t > pass1) {
        const b = Math.min(n, Math.floor(((t - pass1) / pass2) * n));
        for (; i2 < b; i2++) { const c = heroCells[n - 1 - i2]; S.halfStitch(ctx, c.px, c.py, s, c.color, 1, 1); }
      }
      if (i2 < n) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  fontsReady.then(() => {
    if (reduce || !hasGsap) { drawHeroStatic(); return; }
    animateHero();
    gsap.from('.hero h1 .line > span', { yPercent: 110, duration: 1.1, ease: 'power3.out', stagger: 0.14, delay: 0.5 });
    gsap.from('.hero-foot', { opacity: 0, duration: 1, delay: 1.6 });
  });
  let heroW = 0;
  window.addEventListener('resize', () => {
    if (Math.abs(hero.clientWidth - heroW) > 40) { heroW = hero.clientWidth; drawHeroStatic(); }
  });
  heroW = hero.clientWidth;

  /* ---------- 2. Красная нить через весь сайт ---------- */
  const svg = document.getElementById('thread');
  const pShadow = svg.querySelector('.thread-shadow');
  const pMain = svg.querySelector('.thread-main');
  const pTwist = svg.querySelector('.thread-twist');
  const needle = svg.querySelector('.thread-needle');
  const clipRect = svg.querySelector('#threadClip rect');
  let samples = [], pathLen = 0;

  function knotPoint(el) {
    const r = (el.querySelector('.knot') || el).getBoundingClientRect();
    const sy = window.scrollY;
    if (el.dataset.knot && el.dataset.knot !== '') {
      // для холста/заголовка — точка на заданной доле ширины, у верхнего края
      const f = parseFloat(el.dataset.knot);
      return { x: r.left + r.width * f, y: r.top + sy + (el.tagName === 'H2' ? -40 : r.height * 0.5) };
    }
    return { x: r.left + r.width / 2, y: r.top + sy + r.height / 2 };
  }

  function buildThread() {
    const docH = document.documentElement.scrollHeight;
    const W = document.documentElement.clientWidth;
    svg.setAttribute('width', W);
    svg.setAttribute('height', docH);
    svg.style.height = docH + 'px';
    svg.setAttribute('viewBox', `0 0 ${W} ${docH}`);

    const rail = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail')) || 60;
    const gutter = Math.max(16, Math.min(56, W * 0.04));
    const railX = W < 700 ? 9 : gutter + rail * 0.42;

    const knots = Array.from(document.querySelectorAll('[data-knot]')).filter((el) => el.offsetParent !== null).map(knotPoint);
    knots.sort((a, b) => a.y - b.y);
    const pts = [{ x: railX, y: 70 }].concat(knots);
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dy = b.y - a.y;
      if (dy < 260) { d += ` C ${a.x} ${a.y + dy * 0.5}, ${b.x} ${b.y - dy * 0.5}, ${b.x} ${b.y}`; continue; }
      // от узла нить уходит в левое поле, свободно провисает вдоль него и возвращается к следующему узлу
      const y0 = a.y + 90, y1 = b.y - 90;
      d += ` C ${a.x} ${a.y + 50}, ${railX} ${a.y + 40}, ${railX} ${y0}`;
      const waves = Math.max(1, Math.round((y1 - y0) / 420));
      const h = (y1 - y0) / waves;
      for (let k = 0; k < waves; k++) {
        const amp = (k % 2 ? -1 : 1) * (W < 700 ? 4 : Math.min(14, rail * 0.18));
        const ys = y0 + h * k;
        d += ` C ${railX + amp} ${ys + h * 0.33}, ${railX + amp} ${ys + h * 0.66}, ${railX} ${ys + h}`;
      }
      d += ` C ${railX} ${b.y - 40}, ${b.x} ${b.y - 50}, ${b.x} ${b.y}`;
    }
    [pShadow, pMain, pTwist].forEach((p) => p.setAttribute('d', d));
    pathLen = pMain.getTotalLength();
    [pShadow, pMain].forEach((p) => { p.style.strokeDasharray = pathLen; });
    clipRect.setAttribute('width', W);
    // выборка точек для быстрого поиска «где сейчас голова нити»
    samples = [];
    const N = 600;
    for (let i = 0; i <= N; i++) {
      const l = (i / N) * pathLen;
      const p = pMain.getPointAtLength(l);
      samples.push({ l, x: p.x, y: p.y });
    }
    updateThread();
  }

  function updateThread() {
    if (!samples.length) return;
    if (reduce) {
      [pShadow, pMain].forEach((p) => (p.style.strokeDashoffset = 0));
      clipRect.setAttribute('height', 1e6); needle.style.display = 'none';
      return;
    }
    const headY = window.scrollY + window.innerHeight * 0.62;
    let best = 0;
    // находим последнюю точку пути, которая выше «головы»
    for (let i = 0; i < samples.length; i++) { if (samples[i].y <= headY) best = i; else if (samples[i].y > headY + 400) break; }
    const s = samples[best];
    const off = pathLen - s.l;
    pShadow.style.strokeDashoffset = off;
    pMain.style.strokeDashoffset = off;
    // скручивание нити видно только на уже «вышитом» участке
    clipRect.setAttribute('height', Math.max(0, s.y));
    needle.setAttribute('cx', s.x);
    needle.setAttribute('cy', s.y);
  }

  window.addEventListener('scroll', updateThread, { passive: true });

  /* ---------- 3. Каждый третий ---------- */
  const figWrap = document.getElementById('thirdFigures');
  const FIG = [
    '...XXX...', '..XXXXX..', '...XXX...', '....X....', '.XXXXXXX.', 'X.XXXXX.X', 'X.XXXXX.X',
    '..XXXXX..', '..XXXXX..', '..XX.XX..', '..X...X..', '..X...X..', '.XX...XX.'
  ].map((r) => Array.from(r).map((ch) => ch === 'X'));
  const figs = [];
  for (let i = 0; i < 30; i++) {
    const c = document.createElement('canvas');
    c.width = 90; c.height = 130;
    S.drawGrid(c, FIG, COLORS.ink);
    if (i % 3 === 2) c.classList.add('lost');
    figWrap.appendChild(c);
    figs.push(c);
  }

  /* ---------- 5. Хатынь: 149 крестиков ---------- */
  const kc = document.getElementById('khatynCanvas');
  const KCOLS = 13, KROWS = 12, KTOTAL = 149;
  // дети и взрослые вперемешку — как семьи одной деревни
  const kind = [];
  (function () {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const arr = Array(75).fill('c').concat(Array(74).fill('a'));
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    kind.push(...arr);
  })();
  let kShown = -1;
  function drawKhatyn(count) {
    count = Math.round(count);
    if (count === kShown) return;
    kShown = count;
    const w = kc.clientWidth || 500;
    const s = w / KCOLS;
    const ctx = S.fit(kc, w, s * KROWS);
    for (let i = 0; i < KCOLS * KROWS; i++) {
      const x = (i % KCOLS) * s, y = Math.floor(i / KCOLS) * s;
      if (i < KTOTAL && i < count) {
        S.cross(ctx, x + s * 0.18, y + s * 0.18, s * 0.64, kind[i] === 'c' ? COLORS.redGlow : COLORS.ash);
      } else if (i < KTOTAL) {
        // непрошитая клетка канвы — четыре дырочки
        ctx.fillStyle = 'rgba(211, 207, 197, 0.16)';
        [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(x + s * a, y + s * b, Math.max(1, s * 0.035), 0, 7); ctx.fill(); });
      }
    }
  }
  drawKhatyn(reduce || !hasGsap ? KTOTAL : 0);

  // колокол каждые 30 секунд
  const bell = document.getElementById('bell');
  const bellCount = document.getElementById('bellCount');
  let sec = 30;
  setInterval(() => {
    sec -= 1;
    if (sec <= 0) {
      sec = 30;
      bell.classList.remove('is-ringing'); void bell.offsetWidth; bell.classList.add('is-ringing');
    }
    bellCount.textContent = sec;
  }, 1000);

  /* ---------- 10. Рушник в финале ---------- */
  const rush = document.getElementById('rushnik');
  let rushCells = [];
  function buildRushnik() {
    const w = rush.clientWidth;
    const s = Math.max(5, Math.min(9, w / 150));
    const R = 25;
    const C = Math.floor(w / s);
    const ctx = S.fit(rush, w, R * s);
    const cells = [];
    const star = S.patternToGrid('ruzha');
    const ber = S.patternToGrid('bereginya');
    // каймы
    for (let x = 0; x < C; x++) {
      if (x % 2 === 0) { cells.push({ x, y: 0, c: COLORS.ink }); cells.push({ x, y: R - 1, c: COLORS.ink }); }
      const dx = Math.abs((x % 4) - 2);
      if (dx <= 1) { cells.push({ x, y: 2 + dx, c: COLORS.red }); cells.push({ x, y: R - 3 - dx, c: COLORS.red }); }
    }
    // чередуем ружу и берегиню
    const step = 19;
    const count = Math.floor((C - 2) / step);
    const ox = Math.floor((C - count * step) / 2) + 2;
    for (let k = 0; k < count; k++) {
      const m = k % 2 ? ber : star;
      const col = k % 2 ? COLORS.ink : COLORS.red;
      for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) if (m[y][x]) cells.push({ x: ox + k * step + x, y: 5 + y, c: col });
    }
    rushCells = cells.map((c) => ({ px: c.x * s + (w - C * s) / 2, py: c.y * s, c: c.c, k: c.x }));
    rushCells.sort((a, b) => a.k - b.k);
    return { ctx, s };
  }
  function drawRushnik(progress) {
    const { ctx, s } = buildRushnik();
    const n = Math.floor(rushCells.length * progress);
    for (let i = 0; i < n; i++) S.cross(ctx, rushCells[i].px, rushCells[i].py, s, rushCells[i].c);
  }

  /* ---------- сцены на GSAP ---------- */
  if (hasGsap && !reduce) {
    // хроника: горизонтальная лента на широких экранах
    gsap.matchMedia().add('(min-width: 861px)', () => {
        const track = document.getElementById('chronTrack');
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 40);
        gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: '#chronPin', start: 'center center', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 }
        });
        gsap.fromTo('.chron-progress', { scaleX: 0 }, {
          scaleX: 1, ease: 'none',
          scrollTrigger: { trigger: '#chronPin', start: 'center center', end: () => '+=' + dist(), scrub: true }
        });
    });

    // шапка
    ScrollTrigger.create({ start: 40, onUpdate: (st) => document.getElementById('topbar').classList.toggle('is-solid', st.scroll() > 40) });
    ScrollTrigger.create({
      trigger: '#khatyn', start: 'top 60px', end: 'bottom 60px',
      toggleClass: { targets: '#topbar', className: 'on-dark' }
    });

    // мягкое появление текста — один раз
    ScrollTrigger.batch('.reveal', {
      start: 'top 88%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out', stagger: 0.08 })
    });

    // каждый третий исчезает по мере прокрутки
    gsap.to('#thirdFigures canvas.lost', {
      opacity: 0.1, y: 10, ease: 'none', stagger: 0.06,
      scrollTrigger: { trigger: '#thirdFigures', start: 'top 70%', end: 'bottom 35%', scrub: 0.6 }
    });

    // Хатынь: крестики вышиваются при прокрутке
    const kState = { n: 0 };
    gsap.to(kState, {
      n: KTOTAL, ease: 'none',
      scrollTrigger: { trigger: '#khatynCanvas', start: 'top 80%', end: 'bottom 45%', scrub: 0.5 },
      onUpdate: () => drawKhatyn(kState.n)
    });

    // рушник вышивается один раз, когда показался
    const rState = { p: 0 };
    drawRushnik(0);
    ScrollTrigger.create({
      trigger: '#rushnik', start: 'top 90%', once: true,
      onEnter: () => gsap.to(rState, { p: 1, duration: 2.6, ease: 'power1.inOut', onUpdate: () => drawRushnik(rState.p) })
    });
    window.addEventListener('resize', () => drawRushnik(rState.p));

    // активный пункт меню
    document.querySelectorAll('.nav a').forEach((a) => {
      const sec = document.querySelector(a.getAttribute('href'));
      if (!sec) return;
      ScrollTrigger.create({ trigger: sec, start: 'top 45%', end: 'bottom 45%', toggleClass: { targets: a, className: 'is-active' } });
    });

    ScrollTrigger.addEventListener('refresh', buildThread);
  } else {
    drawRushnik(1);
    document.querySelectorAll('#thirdFigures canvas.lost').forEach((c) => (c.style.opacity = 0.1));
    window.addEventListener('resize', () => drawRushnik(1));
    window.addEventListener('scroll', () => document.getElementById('topbar').classList.toggle('is-solid', window.scrollY > 40), { passive: true });
  }

  window.addEventListener('resize', () => { const k = kShown; kShown = -1; drawKhatyn(k); });

  // нить строим, когда загрузились шрифты и раскладка устоялась
  fontsReady.then(() => {
    if (hasGsap) ScrollTrigger.refresh(); else buildThread();
    setTimeout(() => (hasGsap ? ScrollTrigger.refresh() : buildThread()), 600);
  });
  window.addEventListener('load', () => (hasGsap ? ScrollTrigger.refresh() : buildThread()));
  if (!hasGsap) window.addEventListener('resize', buildThread);

  window.__rebuildThread = () => (hasGsap ? ScrollTrigger.refresh() : buildThread());
})();
