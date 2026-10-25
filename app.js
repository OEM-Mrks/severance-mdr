(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);

  // Spielfeld
  const COLS = 48, ROWS = 28;
  const BINS = 5, PER_BIN = 3;
  const TEMPERS = ['WO', 'FC', 'DR', 'MA'];
  const FILES = ['Cold Harbor', 'Siena', 'Tumwater', 'Dranesville', 'Allentown', 'Jesup',
    'Coleman', 'Narva', 'Eminence', 'Labrador', 'Yakima', 'Moonbeam'];
  const FG = '#9eefff';
  const FAM = "'IBM Plex Mono', ui-monospace, Menlo, monospace";

  // Belohnungen, eine pro abgeschlossener Datei, reihum
  const ICONS = {
    trap: '<svg viewBox="0 0 130 44"><rect x="4" y="8" width="122" height="28" rx="14"/>' +
      '<path d="M18 8l14 28M34 8l14 28M50 8l14 28M66 8l14 28M82 8l14 28M98 8l14 28M32 8L18 36M48 8L34 36M64 8L50 36M80 8L66 36M96 8L82 36M112 8L98 36"/></svg>',
    eraser: '<svg viewBox="0 0 120 64"><path d="M34 8h80L92 52H12z"/><path d="M56 8L34 52"/><path d="M8 58h104"/></svg>',
    melon: '<svg viewBox="0 0 120 70"><path d="M6 10a54 54 0 0 0 108 0z"/><path d="M16 10a44 44 0 0 0 88 0"/>' +
      '<ellipse class="f" cx="40" cy="22" rx="2.2" ry="3.6"/><ellipse class="f" cx="60" cy="30" rx="2.2" ry="3.6"/>' +
      '<ellipse class="f" cx="80" cy="22" rx="2.2" ry="3.6"/><ellipse class="f" cx="50" cy="40" rx="2.2" ry="3.6"/>' +
      '<ellipse class="f" cx="70" cy="40" rx="2.2" ry="3.6"/></svg>',
    mde: '<svg viewBox="0 0 80 80"><path d="M30 62V16l36-8v46M30 28l36-8"/>' +
      '<ellipse class="f" cx="22" cy="62" rx="9" ry="7"/><ellipse class="f" cx="58" cy="54" rx="9" ry="7"/></svg>',
    waffle: '<svg viewBox="0 0 80 80"><rect x="8" y="8" width="64" height="64" rx="12"/>' +
      '<path d="M24 8v64M40 8v64M56 8v64M8 24h64M8 40h64M8 56h64"/></svg>',
  };
  const REWARDS = [
    { id: 'trap', name: 'Fingerfalle', desc: 'Geflochten. Je mehr du ziehst, desto fester hält sie.' },
    { id: 'mde', name: 'Music Dance Experience', desc: 'Wähle ein Genre. Die Zahlen tanzen mit.', party: 'mde' },
    { id: 'eraser', name: 'Radiergummi', desc: 'In Lumon-Blau. Nur für den Dienstgebrauch.' },
    { id: 'melon', name: 'Melonen-Bar', desc: 'Frisch aufgeschnittene Melone für die ganze Abteilung.' },
    { id: 'waffle', name: 'Waffelparty', desc: 'Die höchste Ehre. Die Waffeln sind schon unterwegs.', party: 'waffle' },
  ];
  const PRAISE = ['Kier wäre stolz.', 'Vorbildliche Verfeinerung.', 'Der Vorstand ist erfreut.',
    'Deine Gründlichkeit wurde notiert.', 'Sehr gut. Weiter so.', 'Die Zahlen sind jetzt in Sicherheit.'];

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privates Fenster */ } },
  };
  const progress = store.get('mdr.progress', { files: 0, rewards: {} });

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
      const bx = br.left + br.width / 2, by = br.top + br.height / 2;
      if (bin.n >= PER_BIN) {
        burst(bx, by, 36, 1);
        pulse(binEl, 'glow');
        sfx('binfull');
        toast(`Behälter ${String(bi + 1).padStart(2, '0')} voll. ${PRAISE[Math.random() * PRAISE.length | 0]}`, 2600);
      } else {
        burst(bx, by, 8 + hits.length * 4, .6);
        sfx('chime');
      }
      closeBinLater(bi);
      if (total() >= 1 && !S.done) {
        S.done = true;
        setTimeout(showDone, 1900);
      }
    }, end + 40);
  }

  function showDone() {
    sfx('done');
    progress.files++;
    const rw = REWARDS[(progress.files - 1) % REWARDS.length];
    const upcoming = REWARDS[progress.files % REWARDS.length];
    progress.rewards[rw.id] = (progress.rewards[rw.id] || 0) + 1;
    store.set('mdr.progress', progress);

    const d = $('#done');
    d.querySelector('.dname').textContent = S.file;
    d.querySelector('.ricon').innerHTML = ICONS[rw.id];
    d.querySelector('.rname').textContent = rw.name;
    d.querySelector('.rdesc').textContent = rw.desc;
    d.querySelector('.genres').hidden = rw.party !== 'mde';
    const next = $('#nextBtn');
    next.textContent = rw.party === 'waffle' ? 'Party starten' : rw.party === 'mde' ? 'Überspringen' : 'Nächste Datei';
    next.dataset.party = rw.party === 'waffle' ? 'waffle' : '';
    d.querySelector('.rnext').textContent =
      `Dateien abgeschlossen: ${progress.files} · Nächste Belohnung: ${upcoming.name}`;
    d.querySelector('.shelf').innerHTML = REWARDS.filter((r) => progress.rewards[r.id])
      .map((r) => `<div class="item" title="${r.name}">${ICONS[r.id]}<span>×${progress.rewards[r.id]}</span></div>`)
      .join('');
    d.classList.add('show');
    setTimeout(() => burst(innerWidth / 2, innerHeight * .45, 60, 1.3), 500);
  }

  // ---------- Party (Music Dance Experience, Waffelparty) ----------

  const partyEl = $('#party'), pcv = partyEl.querySelector('canvas'), pctx = pcv.getContext('2d');
  const GENRES = { jazz: { name: 'Defiant Jazz', bpm: 150 }, techno: { name: 'Techno', bpm: 128 }, chill: { name: 'Chillwave', bpm: 92 } };
  let P = null;

  function startParty(kind, genre) {
    $('#done').classList.remove('show');
    const g = genre || 'jazz';
    const a = muted ? null : ac();
    P = { kind, genre: g, bpm: GENRES[g].bpm, dur: kind === 'mde' ? 22 : 15,
      start: performance.now() + 120, waffles: [], lastSpawn: 0, master: null, timer: 0 };
    if (a) {
      P.master = a.createGain();
      P.master.connect(a.destination);
      scheduleMusic(a, a.currentTime + .12, P);
    }
    partyEl.querySelector('.ptitle').innerHTML = kind === 'mde'
      ? `Music Dance Experience<small>${GENRES[g].name}</small>`
      : 'Waffelparty<small>Lumon dankt dir</small>';
    pcv.width = Math.round(innerWidth * DPR);
    pcv.height = Math.round(innerHeight * DPR);
    partyEl.classList.add('show');
    P.timer = setTimeout(endParty, P.dur * 1000);
  }

  function endParty() {
    if (!P) return;
    clearTimeout(P.timer);
    if (P.master && AC) {
      const m = P.master;
      m.gain.setTargetAtTime(0, AC.currentTime, .15);
      setTimeout(() => m.disconnect(), 1000);
    }
    P = null;
    partyEl.classList.remove('show');
    newFile();
  }

  function drawParty(now) {
    const w = innerWidth, h = innerHeight;
    pctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    pctx.clearRect(0, 0, w, h);
    const beat = Math.max(0, (now - P.start) / 1000 * P.bpm / 60);
    const hit = Math.exp(-(beat % 1) * 5);
    const bar = Math.floor(beat);
    const cs = w < 700 ? 36 : 50;
    const cols = Math.ceil(w / cs), rows = Math.ceil(h / cs);
    pctx.font = `600 ${Math.round(cs * .5)}px ${FAM}`;
    pctx.textAlign = 'center';
    pctx.textBaseline = 'middle';
    pctx.fillStyle = FG;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wave = Math.sin(c * .45 + r * .3 - beat * Math.PI);
        let x = (c + .5) * cs, y = (r + .5) * cs, s = 1, a = .35 + .45 * (wave * .5 + .5);
        if (P.genre === 'techno') {
          s += hit * .6 * ((c + r + bar) % 2 ? 1 : .2);
          if ((r + bar) % 4 === 0) a = Math.min(1, a + hit * .6);
        } else if (P.genre === 'chill') {
          x += Math.sin(beat * Math.PI / 2 + r * .5) * cs * .3;
          y += wave * cs * .2;
          s += hit * .15;
        } else {
          x += Math.sin(beat * Math.PI + r * .7) * cs * .22;
          y += wave * cs * .28 * (.4 + hit);
          s += hit * .35 * (wave > 0 ? 1 : .3);
        }
        pctx.globalAlpha = a;
        pctx.setTransform(DPR * s, 0, 0, DPR * s, DPR * x, DPR * y);
        pctx.fillText(((c * 73856093 ^ r * 19349663 ^ (bar >> 1) * 83492791) >>> 0) % 10, 0, 0);
      }
    }
    pctx.globalAlpha = 1;
    pctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    if (P.kind === 'waffle') {
      if (!P.lastSpawn || now - P.lastSpawn > 2000) P.lastSpawn = now;
      while (now - P.lastSpawn > 140) {
        P.lastSpawn += 140;
        P.waffles.push({ x: Math.random() * w, y: -50, vy: 90 + Math.random() * 140, rot: Math.random() * 6, vr: (Math.random() - .5) * 3, size: 30 + Math.random() * 34, t: P.lastSpawn });
      }
      pctx.lineWidth = 2;
      pctx.strokeStyle = FG;
      for (let i = P.waffles.length - 1; i >= 0; i--) {
        const wf = P.waffles[i];
        const tt = (now - wf.t) / 1000;
        const y = wf.y + wf.vy * tt;
        if (y > h + 60) { P.waffles.splice(i, 1); continue; }
        const z = wf.size, q = z / 4;
        pctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        pctx.translate(wf.x, y);
        pctx.rotate(wf.rot + wf.vr * tt);
        pctx.fillStyle = 'rgba(1, 12, 23, .9)';
        pctx.beginPath();
        pctx.roundRect(-z / 2, -z / 2, z, z, z * .18);
        pctx.fill();
        pctx.stroke();
        pctx.beginPath();
        for (let k = 1; k < 4; k++) {
          pctx.moveTo(-z / 2 + k * q, -z / 2); pctx.lineTo(-z / 2 + k * q, z / 2);
          pctx.moveTo(-z / 2, -z / 2 + k * q); pctx.lineTo(z / 2, -z / 2 + k * q);
        }
        pctx.stroke();
      }
      pctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
  }

  function burst(x, y, n, power) {
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, v = (100 + Math.random() * 260) * power;
      particles.push({ burst: true, d: Math.random() * 10 | 0, x0: x, y0: y,
        vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 200 * power, start: now, dur: 900 + Math.random() * 600 });
    }
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
      if (p.burst) {
        const tt = (now - p.start) / 1000;
        x += p.vx * tt;
        y += p.vy * tt + 450 * tt * tt;
        s = 1.2 - k * .6;
        a = 1 - k * k;
      } else if (k > 0) {
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
    if (P) {
      drawParty(now);
    } else {
      updateAgitation();
      drawGrid(now / 1000, now);
    }
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
    if (P) {
      if (e.key === 'Escape') endParty();
      return;
    }
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
  $('#nextBtn').addEventListener('click', (e) => {
    if (e.currentTarget.dataset.party) { startParty('waffle', 'jazz'); return; }
    $('#done').classList.remove('show');
    newFile();
  });
  document.querySelectorAll('[data-genre]').forEach((b) =>
    b.addEventListener('click', () => startParty('mde', b.dataset.genre)));
  $('#partyStop').addEventListener('click', endParty);

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

  function voice(a, t0, f, d, { type = 'sine', vol = .03, to = 0, dest = null } = {}) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + .01);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g).connect(dest || a.destination);
    o.start(t0);
    o.stop(t0 + d + .05);
  }

  function tone(f, d, opts = {}) {
    if (muted) return;
    const a = ac();
    if (a) voice(a, a.currentTime + (opts.delay || 0), f, d, opts);
  }

  let NOISE = null;
  function noise(a, t0, d, vol, hp, dest) {
    if (!NOISE) {
      NOISE = a.createBuffer(1, a.sampleRate / 2, a.sampleRate);
      const ch = NOISE.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = NOISE;
    f.type = 'highpass';
    f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    s.connect(f).connect(g).connect(dest);
    s.start(t0);
    s.stop(t0 + d + .02);
  }

  function kick(a, t0, dest, vol) {
    voice(a, t0, 150, .28, { vol, to: 42, dest });
  }

  const hz = (n) => 440 * 2 ** ((n - 69) / 12);
  const pick = (arr) => arr[Math.random() * arr.length | 0];

  function scheduleMusic(a, t0, p) {
    const spb = 60 / p.bpm, end = t0 + p.dur, m = p.master;
    if (p.genre === 'jazz') {
      // Walking Bass über Dm7 G7 Cmaj7 A7, geswingte Ride, Akkord-Stabs auf 2 und 4
      const prog = [[38, 41, 45, 48], [43, 47, 50, 53], [36, 40, 43, 47], [33, 37, 40, 43]];
      const scale = [62, 64, 65, 67, 69, 71, 72, 74, 77];
      for (let b = 0, t = t0; t < end; b++, t += spb) {
        const ch = prog[(b >> 2) % 4];
        voice(a, t, hz(ch[b % 4]), spb * .9, { type: 'triangle', vol: .14, dest: m });
        noise(a, t, .14, .05, 7000, m);
        if (b % 2) {
          noise(a, t + spb * 2 / 3, .08, .035, 7000, m);
          ch.forEach((n) => voice(a, t, hz(n + 24), .16, { type: 'square', vol: .016, dest: m }));
        } else {
          kick(a, t, m, .22);
        }
        if (b >= 8 && Math.random() < .7) {
          voice(a, t + (Math.random() < .5 ? 0 : spb * 2 / 3), hz(pick(scale)), spb * .55, { type: 'sawtooth', vol: .018, dest: m });
        }
      }
    } else if (p.genre === 'techno') {
      const bass = [45, 45, 57, 45, 48, 45, 57, 52];
      const arp = [69, 72, 76, 79, 76, 72];
      for (let s = 0, t = t0; t < end; s++, t += spb / 4) {
        if (s % 4 === 0) kick(a, t, m, .42);
        if (s % 4 === 2) noise(a, t, .05, .05, 9000, m);
        if (s % 8 === 4) noise(a, t, .16, .07, 1500, m);
        voice(a, t, hz(bass[s % 8]), spb / 4 * .8, { type: 'sawtooth', vol: .03, dest: m });
        if (s >= 32) voice(a, t, hz(arp[s % 6]), spb / 4 * .7, { type: 'square', vol: .012, dest: m });
      }
    } else {
      const pads = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]];
      const penta = [69, 72, 74, 76, 79, 81];
      for (let e = 0, t = t0; t < end; e++, t += spb / 2) {
        if (e % 8 === 0) pads[(e >> 3) % 4].forEach((n) => voice(a, t, hz(n), spb * 4, { type: 'triangle', vol: .026, dest: m }));
        if (e % 4 === 0) kick(a, t, m, .26);
        if (e % 2) noise(a, t, .06, .02, 8000, m);
        if (e >= 8 && Math.random() < .4) voice(a, t, hz(pick(penta)), spb * .9, { vol: .035, dest: m });
      }
    }
  }

  function sfx(name) {
    switch (name) {
      case 'tick': tone(1800, .03, { vol: .012 }); break;
      case 'err': tone(150, .16, { type: 'square', vol: .015 }); tone(118, .2, { type: 'square', vol: .015, delay: .12 }); break;
      case 'whoosh': tone(880, .7, { type: 'triangle', vol: .018, to: 160 }); break;
      case 'chime': tone(660, .5, { vol: .028 }); tone(990, .7, { vol: .02, delay: .09 }); break;
      case 'binfull': [660, 830, 990, 1320].forEach((f, i) => tone(f, .6, { vol: .028, delay: i * .07 })); break;
      case 'done': [523, 659, 784, 1046].forEach((f, i) => tone(f, 1, { vol: .028, delay: i * .15 })); break;
    }
  }

  // ---------- Start ----------

  // Testzugang: index.html#test
  if (location.hash === '#test') window.mdr = { showDone, startParty, progress };

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
