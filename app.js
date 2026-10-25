(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);

  // Spielfeld
  const COLS = 48, ROWS = 28;
  const BINS = 5, PER_BIN = 4;
  const TEMPERS = ['WO', 'FC', 'DR', 'MA'];
  const FILES = ['Cold Harbor', 'Siena', 'Tumwater', 'Dranesville', 'Allentown', 'Jesup',
    'Coleman', 'Narva', 'Eminence', 'Labrador', 'Yakima', 'Moonbeam'];
  const FG = '#9eefff';
  const FAM = "'IBM Plex Mono', ui-monospace, Menlo, monospace";

  const field = $('#field'), cv = $('#grid'), ctx = cv.getContext('2d');
  const fx = $('#fx'), fctx = fx.getContext('2d');
  const binsEl = $('#bins'), coordsEl = $('#coords');

  const S = { cells: [], groups: [], bins: [], file: '', fileIdx: Math.random() * FILES.length | 0, hx: 0, hy: 0, done: false };
  const view = { x: 0, y: 0, tx: 0, ty: 0 };
  const mouse = { x: -1e4, y: -1e4, in: false };
  const pointers = new Map();
  const particles = [];
  const binEls = [];
  let W = 0, H = 0, DPR = 1, CS = 46, FS = 21;
  let drag = null, pan = null;

  // ---------- Daten ----------

  function mkCell() {
    return { d: Math.random() * 10 | 0, ph: Math.random() * 6.283, sp: .6 + Math.random() * .9,
      g: -1, sel: false, hidden: false, born: 0, shake: 0 };
  }

  const idx = (c, r) => r * COLS + c;

  function nearOther(c, r, rad, self) {
    for (let y = r - rad; y <= r + rad; y++) {
      for (let x = c - rad; x <= c + rad; x++) {
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
        const g = S.cells[idx(x, y)].g;
        if (g !== -1 && g !== self) return true;
      }
    }
    return false;
  }

  function makeGroups() {
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const want = BINS * PER_BIN;
    let tries = 0;
    while (S.groups.length < want && tries++ < 8000) {
      const c0 = 1 + (Math.random() * (COLS - 2) | 0), r0 = 1 + (Math.random() * (ROWS - 2) | 0);
      if (nearOther(c0, r0, 3, -1)) continue;
      const gi = S.groups.length;
      const set = [idx(c0, r0)];
      S.cells[set[0]].g = gi;
      const size = 6 + (Math.random() * 9 | 0);
      let guard = 0;
      while (set.length < size && guard++ < 300) {
        const base = set[Math.random() * set.length | 0];
        const [dc, dr] = DIRS[Math.random() * 4 | 0];
        const nc = base % COLS + dc, nr = (base / COLS | 0) + dr;
        if (nc < 1 || nr < 1 || nc >= COLS - 1 || nr >= ROWS - 1) continue;
        const ni = idx(nc, nr);
        if (S.cells[ni].g !== -1 || nearOther(nc, nr, 1, gi)) continue;
        S.cells[ni].g = gi;
        set.push(ni);
      }
      for (const i of set) S.cells[i].sp *= 1.7;
      S.groups.push({ cells: set, temper: TEMPERS[Math.random() * 4 | 0], alive: true, agit: 0 });
    }
  }

  function newFile() {
    S.file = FILES[S.fileIdx++ % FILES.length];
    S.cells = Array.from({ length: COLS * ROWS }, mkCell);
    S.groups = [];
    makeGroups();
    S.bins = Array.from({ length: BINS }, () => ({ n: 0, pending: 0, t: { WO: 0, FC: 0, DR: 0, MA: 0 }, timer: 0 }));
    S.hx = 0x100000 + (Math.random() * 0xD00000 | 0);
    S.hy = 0x100000 + (Math.random() * 0xD00000 | 0);
    S.done = false;
    view.tx = (COLS - W / CS) / 2;
    view.ty = (ROWS - H / CS) / 2;
    clampView();
    view.x = view.tx; view.y = view.ty;
    binEls.forEach((el) => el.classList.remove('open', 'full'));
    renderBins();
    renderHeader();
  }

  // ---------- Behälter & Kopfzeile ----------

  function buildBins() {
    for (let i = 0; i < BINS; i++) {
      const n = String(i + 1).padStart(2, '0');
      const el = document.createElement('div');
      el.className = 'bin';
      el.innerHTML =
        `<div class="panel"><div class="ph">${n}</div>` +
        TEMPERS.map((t) => `<div class="row"><span>${t}</span><div class="track"><i data-t="${t}"></i></div></div>`).join('') +
        `</div><div class="box"><div class="lid l"></div><div class="lid r"></div><span>${n}</span></div>` +
        `<div class="bbar"><i></i><span>0%</span></div>`;
      el.addEventListener('click', () => refine(i));
      binsEl.appendChild(el);
      binEls.push(el);
    }
  }

  function renderBins() {
    S.bins.forEach((b, i) => {
      const el = binEls[i];
      const p = b.n / PER_BIN;
      el.querySelector('.bbar i').style.width = p * 100 + '%';
      el.querySelector('.bbar span').textContent = Math.round(p * 100) + '%';
      for (const t of TEMPERS) el.querySelector(`.track i[data-t="${t}"]`).style.width = b.t[t] / PER_BIN * 100 + '%';
      el.classList.toggle('full', b.n >= PER_BIN);
    });
  }

  function total() {
    return S.bins.reduce((s, b) => s + b.n, 0) / (BINS * PER_BIN);
  }

  function renderHeader() {
    const p = Math.round(total() * 100);
    $('.fname').textContent = S.file;
    $('.hpct').textContent = p + '% Complete';
    $('.hfill').style.width = p + '%';
    document.title = `${S.file} – ${p}% Complete`;
  }

  function openBin(i) {
    const b = S.bins[i];
    clearTimeout(b.timer);
    binEls[i].classList.add('open');
  }

  function closeBinLater(i) {
    const b = S.bins[i];
    clearTimeout(b.timer);
    b.timer = setTimeout(() => { if (!b.pending) binEls[i].classList.remove('open'); }, 1700);
  }

  function pulse(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  // ---------- Einsortieren ----------

  function clearSel() {
    for (const c of S.cells) c.sel = false;
  }

  function refine(bi) {
    if (S.done) return;
    const sel = [];
    S.cells.forEach((c, i) => { if (c.sel && !c.hidden) sel.push(i); });
    const binEl = binEls[bi], bin = S.bins[bi];
    if (!sel.length) { pulse(binEl, 'flash'); return; }

    const counts = new Map();
    for (const i of sel) {
      const g = S.cells[i].g;
      if (g >= 0) counts.set(g, (counts.get(g) || 0) + 1);
    }
    let hits = [...counts]
      .filter(([g, n]) => S.groups[g].alive && n / S.groups[g].cells.length >= .6)
      .map(([g]) => g);
    clearSel();

    if (!hits.length) {
      for (const i of sel) S.cells[i].shake = 1;
      sfx('err');
      return;
    }
    const room = PER_BIN - bin.n - bin.pending;
    if (room <= 0) { pulse(binEl, 'shake'); sfx('err'); return; }
    hits = hits.slice(0, room);
    bin.pending += hits.length;
    openBin(bi);

    const r = cv.getBoundingClientRect();
    const br = binEl.querySelector('.box').getBoundingClientRect();
    const now = performance.now();
    let k = 0, end = 0;
    for (const g of hits) {
      const G = S.groups[g];
      G.alive = false;
      for (const i of G.cells) {
        const cell = S.cells[i];
        const c = i % COLS, rr = i / COLS | 0;
        const start = now + 250 + k++ * 22, dur = 800 + Math.random() * 300;
        particles.push({
          d: cell.d,
          x0: r.left + (c - view.x + .5) * CS, y0: r.top + (rr - view.y + .5) * CS,
          x1: br.left + br.width * (.3 + Math.random() * .4), y1: br.top + 4,
          start, dur,
        });
        end = Math.max(end, start + dur - now);
        cell.hidden = true;
        cell.g = -1;
        setTimeout(() => {
          cell.d = Math.random() * 10 | 0;
          cell.sp = .6 + Math.random() * .9;
          cell.hidden = false;
          cell.born = performance.now();
        }, end + 400 + Math.random() * 900);
      }
    }
    sfx('whoosh');
    setTimeout(() => {
      bin.pending -= hits.length;
      bin.n += hits.length;
      for (const g of hits) bin.t[S.groups[g].temper]++;
      renderBins();
      renderHeader();
      sfx('chime');
      closeBinLater(bi);
      if (total() >= 1 && !S.done) {
        S.done = true;
        setTimeout(showDone, 1900);
      }
    }, end + 40);
  }

  function showDone() {
    sfx('done');
    $('#done .dname').textContent = S.file;
    $('#done').classList.add('show');
  }

  // ---------- Ansicht ----------

  function clampView() {
    const mx = COLS - W / CS, my = ROWS - H / CS;
    view.tx = mx < 0 ? mx / 2 : Math.max(0, Math.min(mx, view.tx));
    view.ty = my < 0 ? my / 2 : Math.max(0, Math.min(my, view.ty));
  }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    const r = field.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    fx.width = Math.round(innerWidth * DPR); fx.height = Math.round(innerHeight * DPR);
    CS = innerWidth < 700 ? 36 : innerWidth > 1700 ? 54 : 46;
    FS = Math.round(CS * .46);
    clampView();
  }

  const hex = (n) => '0x' + (n & 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
  let lastCoords = '';
  function updateCoords() {
    const s = `${hex(S.hx + Math.round(view.x * 0x1A3))} : ${hex(S.hy + Math.round(view.y * 0x2F1))}`;
    if (s !== lastCoords) coordsEl.textContent = lastCoords = s;
  }

  // ---------- Zeichnen ----------

  function updateAgitation() {
    for (const g of S.groups) {
      if (!g.alive) { g.agit *= .9; continue; }
      let target = 0;
      if (mouse.in) {
        let dmin = Infinity;
        for (const i of g.cells) {
          const dx = (i % COLS - view.x + .5) * CS - mouse.x;
          const dy = ((i / COLS | 0) - view.y + .5) * CS - mouse.y;
          dmin = Math.min(dmin, dx * dx + dy * dy);
        }
        target = Math.max(0, Math.min(1, 1 - (Math.sqrt(dmin) - CS * .5) / (CS * 2.6)));
      }
      g.agit += (target - g.agit) * (target > g.agit ? .1 : .035);
    }
  }

  function drawGrid(t, now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = `500 ${FS}px ${FAM}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const c0 = Math.max(0, Math.floor(view.x) - 1), c1 = Math.min(COLS - 1, Math.ceil(view.x + W / CS) + 1);
    const r0 = Math.max(0, Math.floor(view.y) - 1), r1 = Math.min(ROWS - 1, Math.ceil(view.y + H / CS) + 1);
    const s2 = 2 * (CS * 1.6) ** 2;

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = S.cells[idx(c, r)];
        if (cell.hidden) continue;
        let x = (c - view.x + .5) * CS, y = (r - view.y + .5) * CS;
        x += Math.cos(t * cell.sp * .8 + cell.ph * 1.3) * CS * .025;
        y += Math.sin(t * cell.sp + cell.ph) * CS * .04;
        let s = 1, a = .74;
        if (mouse.in) {
          const dx = x - mouse.x, dy = y - mouse.y;
          const f = Math.exp(-(dx * dx + dy * dy) / s2);
          s += f * 1.15; a += f * .26;
        }
        if (cell.g >= 0) {
          const ag = S.groups[cell.g].agit;
          if (ag > .01) {
            s += ag * .65 * (1 + .18 * Math.sin(t * 9 + cell.ph * 3));
            x += Math.sin(t * 21 + cell.ph * 7) * ag * CS * .07;
            y += Math.cos(t * 17 + cell.ph * 5) * ag * CS * .07;
            a += ag * .2;
          }
        }
        if (cell.shake > 0) {
          x += Math.sin(now * .07) * cell.shake * CS * .12;
          cell.shake = Math.max(0, cell.shake - .025);
        }
        if (cell.born) {
          const k = (now - cell.born) / 800;
          if (k < 1) { a *= k; s *= .5 + .5 * k; } else cell.born = 0;
        }
        if (cell.sel) {
          ctx.globalAlpha = .16;
          ctx.fillStyle = FG;
          ctx.fillRect((c - view.x) * CS + 2, (r - view.y) * CS + 2, CS - 4, CS - 4);
          s = Math.max(s, 1.3);
          a = 1;
        }
        ctx.globalAlpha = Math.min(1, a);
        ctx.fillStyle = cell.sel ? '#ffffff' : FG;
        ctx.setTransform(DPR * s, 0, 0, DPR * s, DPR * x, DPR * y);
        ctx.fillText(cell.d, 0, 0);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
    }
    ctx.globalAlpha = 1;

    if (drag && drag.moved) {
      const x0 = (Math.min(drag.w0.x, drag.w1.x) - view.x) * CS, y0 = (Math.min(drag.w0.y, drag.w1.y) - view.y) * CS;
      const x1 = (Math.max(drag.w0.x, drag.w1.x) - view.x) * CS, y1 = (Math.max(drag.w0.y, drag.w1.y) - view.y) * CS;
      ctx.strokeStyle = FG;
      ctx.globalAlpha = .7;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  function drawFx(now) {
    fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fctx.clearRect(0, 0, innerWidth, innerHeight);
    if (!particles.length) return;
    fctx.font = `500 ${FS}px ${FAM}`;
    fctx.textAlign = 'center';
    fctx.textBaseline = 'middle';
    fctx.fillStyle = FG;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const k = (now - p.start) / p.dur;
      if (k >= 1) { particles.splice(i, 1); continue; }
      let x = p.x0, y = p.y0, s = 1.35, a = 1;
      if (k > 0) {
        const e = k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
        const cx = p.x0 + (p.x1 - p.x0) * .15, cy = p.y0 - 70;
        x = (1 - e) ** 2 * p.x0 + 2 * (1 - e) * e * cx + e * e * p.x1;
        y = (1 - e) ** 2 * p.y0 + 2 * (1 - e) * e * cy + e * e * p.y1;
        s = 1.35 * (1 - e) + .5 * e;
        a = k > .85 ? (1 - k) / .15 : 1;
      } else {
        x += Math.sin(now * .05 + i) * 2;
      }
      fctx.globalAlpha = a;
      fctx.setTransform(DPR * s, 0, 0, DPR * s, DPR * x, DPR * y);
      fctx.fillText(p.d, 0, 0);
    }
    fctx.globalAlpha = 1;
  }

  function frame(now) {
    view.x += (view.tx - view.x) * .2;
    view.y += (view.ty - view.y) * .2;
    updateAgitation();
    drawGrid(now / 1000, now);
    drawFx(now);
    updateCoords();
    requestAnimationFrame(frame);
  }

  // ---------- Eingabe ----------

  const local = (e) => {
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toWorld = (p) => ({ x: p.x / CS + view.x, y: p.y / CS + view.y });

  function avgPointer() {
    let x = 0, y = 0;
    for (const p of pointers.values()) { x += p.x; y += p.y; }
    return { x: x / pointers.size, y: y / pointers.size };
  }

  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    ac();
    if (pointers.size >= 2) { drag = null; pan = avgPointer(); return; }
    if (e.button === 2) { clearSel(); return; }
    const p = local(e);
    Object.assign(mouse, p, { in: true });
    const w = toWorld(p);
    drag = { id: e.pointerId, sx: p.x, sy: p.y, w0: w, w1: w, moved: false };
  });

  cv.addEventListener('pointermove', (e) => {
    const p = local(e);
    if (e.pointerType === 'mouse' || pointers.has(e.pointerId)) Object.assign(mouse, p, { in: true });
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pan && pointers.size >= 2) {
      const a = avgPointer();
      view.tx -= (a.x - pan.x) / CS;
      view.ty -= (a.y - pan.y) / CS;
      clampView();
      view.x = view.tx; view.y = view.ty;
      pan = a;
      return;
    }
    if (drag && drag.id === e.pointerId) {
      if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 8) drag.moved = true;
      drag.w1 = toWorld(p);
    }
  });

  function pointerEnd(e) {
    pointers.delete(e.pointerId);
    if (pan) { if (!pointers.size) pan = null; return; }
    if (drag && drag.id === e.pointerId) {
      if (drag.moved) {
        const x0 = Math.min(drag.w0.x, drag.w1.x), x1 = Math.max(drag.w0.x, drag.w1.x);
        const y0 = Math.min(drag.w0.y, drag.w1.y), y1 = Math.max(drag.w0.y, drag.w1.y);
        let any = false;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (c + .5 >= x0 && c + .5 <= x1 && r + .5 >= y0 && r + .5 <= y1) {
              const cell = S.cells[idx(c, r)];
              if (!cell.hidden) { cell.sel = true; any = true; }
            }
          }
        }
        if (any) sfx('tick');
      } else if (e.type === 'pointerup') {
        const w = toWorld(local(e));
        const c = Math.floor(w.x), r = Math.floor(w.y);
        if (c >= 0 && r >= 0 && c < COLS && r < ROWS) {
          const cell = S.cells[idx(c, r)];
          if (!cell.hidden) { cell.sel = !cell.sel; sfx('tick'); }
        }
      }
      drag = null;
    }
    if (e.pointerType !== 'mouse') setTimeout(() => { if (!pointers.size) mouse.in = false; }, 400);
  }
  cv.addEventListener('pointerup', pointerEnd);
  cv.addEventListener('pointercancel', pointerEnd);
  cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !drag) mouse.in = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const m = e.deltaMode === 1 ? 20 : e.deltaMode === 2 ? H : 1;
    let dx = e.deltaX * m, dy = e.deltaY * m;
    if (e.shiftKey && !dx) { dx = dy; dy = 0; }
    view.tx += dx / CS;
    view.ty += dy / CS;
    clampView();
  }, { passive: false });

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const help = $('#help');
    if (help.classList.contains('show')) {
      if (e.key === 'Escape' || e.key === '?' || e.key === 'Enter') help.classList.remove('show');
      return;
    }
    if ($('#done').classList.contains('show')) {
      if (e.key === 'Enter') $('#nextBtn').click();
      return;
    }
    const k = e.key;
    if (k >= '1' && k <= String(BINS)) refine(+k - 1);
    else if (k === 'Escape') clearSel();
    else if (k === 'ArrowLeft') view.tx -= 3;
    else if (k === 'ArrowRight') view.tx += 3;
    else if (k === 'ArrowUp') view.ty -= 3;
    else if (k === 'ArrowDown') view.ty += 3;
    else if (k === 'm' || k === 'M') { muted = !muted; toast(muted ? 'Ton aus' : 'Ton an', 1400); }
    else if (k === '?' || k === 'h' || k === 'H') help.classList.add('show');
    else return;
    clampView();
    e.preventDefault();
  });

  $('#helpBtn').addEventListener('click', () => $('#help').classList.add('show'));
  $('#help [data-close]').addEventListener('click', () => $('#help').classList.remove('show'));
  $('#help').addEventListener('click', (e) => { if (e.target.id === 'help') e.currentTarget.classList.remove('show'); });
  $('#nextBtn').addEventListener('click', () => {
    $('#done').classList.remove('show');
    newFile();
  });

  let toastTimer = 0;
  function toast(text, ms) {
    const el = $('#toast');
    if (text) el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  // ---------- Ton ----------

  let AC = null, muted = false;
  function ac() {
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (err) { AC = null; }
    }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  }

  function tone(f, d, { type = 'sine', vol = .03, to = 0, delay = 0 } = {}) {
    if (muted) return;
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + .01);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + d + .05);
  }

  function sfx(name) {
    switch (name) {
      case 'tick': tone(1800, .03, { vol: .012 }); break;
      case 'err': tone(150, .16, { type: 'square', vol: .015 }); tone(118, .2, { type: 'square', vol: .015, delay: .12 }); break;
      case 'whoosh': tone(880, .7, { type: 'triangle', vol: .018, to: 160 }); break;
      case 'chime': tone(660, .5, { vol: .028 }); tone(990, .7, { vol: .02, delay: .09 }); break;
      case 'done': [523, 659, 784, 1046].forEach((f, i) => tone(f, 1, { vol: .028, delay: i * .15 })); break;
    }
  }

  // ---------- Start ----------

  buildBins();
  window.addEventListener('resize', resize);
  resize();
  newFile();
  requestAnimationFrame(frame);

  const splash = $('#splash');
  let started = false;
  function hideSplash() {
    if (started) return;
    started = true;
    splash.classList.add('hide');
    setTimeout(() => toast(null, 7000), 700);
  }
  splash.addEventListener('pointerdown', hideSplash);
  const fontReady = document.fonts ? document.fonts.load(`500 20px 'IBM Plex Mono'`).catch(() => {}) : Promise.resolve();
  Promise.race([fontReady, new Promise((r) => setTimeout(r, 1500))])
    .then(() => setTimeout(hideSplash, 2200));
})();
