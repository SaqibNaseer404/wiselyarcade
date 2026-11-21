/* Alphabet Tracing (Urdu) — trace each letter with your finger or mouse.
   The letter IS the lesson: its shape, its name, and a word it starts.
   Ink targets are sampled live from the rendered Nastaliq glyph, so every
   letter's real shape becomes the path. 100 levels, tougher as you climb. */
(function () {
  'use strict';

  var LETTERS = [
    { ch: 'ا', name: 'الف', ex: 'آم 🥭' }, { ch: 'ب', name: 'بے', ex: 'بلی 🐱' },
    { ch: 'پ', name: 'پے', ex: 'پھول 🌸' }, { ch: 'ت', name: 'تے', ex: 'تتلی 🦋' },
    { ch: 'ٹ', name: 'ٹے', ex: 'ٹماٹر 🍅' }, { ch: 'ث', name: 'ثے', ex: '' },
    { ch: 'ج', name: 'جیم', ex: 'جہاز ✈️' }, { ch: 'چ', name: 'چے', ex: 'چاند 🌙' },
    { ch: 'ح', name: 'حے', ex: '' }, { ch: 'خ', name: 'خے', ex: 'خرگوش 🐰' },
    { ch: 'د', name: 'دال', ex: 'دروازہ 🚪' }, { ch: 'ڈ', name: 'ڈال', ex: '' },
    { ch: 'ذ', name: 'ذال', ex: '' }, { ch: 'ر', name: 'رے', ex: '' },
    { ch: 'ڑ', name: 'ڑے', ex: '' }, { ch: 'ز', name: 'زے', ex: '' },
    { ch: 'ژ', name: 'ژے', ex: '' }, { ch: 'س', name: 'سین', ex: 'سیب 🍎' },
    { ch: 'ش', name: 'شین', ex: 'شیر 🦁' }, { ch: 'ص', name: 'صواد', ex: '' },
    { ch: 'ض', name: 'ضواد', ex: '' }, { ch: 'ط', name: 'طوے', ex: '' },
    { ch: 'ظ', name: 'ظوے', ex: '' }, { ch: 'ع', name: 'عین', ex: '' },
    { ch: 'غ', name: 'غین', ex: '' }, { ch: 'ف', name: 'فے', ex: '' },
    { ch: 'ق', name: 'قاف', ex: '' }, { ch: 'ک', name: 'کاف', ex: 'کتاب 📖' },
    { ch: 'گ', name: 'گاف', ex: 'گاڑی 🚗' }, { ch: 'ل', name: 'لام', ex: '' },
    { ch: 'م', name: 'میم', ex: 'مچھلی 🐟' }, { ch: 'ن', name: 'نون', ex: '' },
    { ch: 'و', name: 'واؤ', ex: '' }, { ch: 'ہ', name: 'ھے', ex: 'ہاتھی 🐘' },
    { ch: 'ء', name: 'ہمزہ', ex: '' }, { ch: 'ی', name: 'چھوٹی یے', ex: '' },
    { ch: 'ے', name: 'بڑی یے', ex: '' }
  ];
  var MAX_LEVEL = 100;
  var SIZE = 340;               // logical canvas space
  var SAMPLE = 300;             // offscreen render size

  var canvas = document.getElementById('at-canvas');
  var ctx = canvas.getContext('2d');
  var nameEl = document.getElementById('at-name');
  var wordEl = document.getElementById('at-word');
  var msgEl = document.getElementById('at-msg');
  var roundEl = document.getElementById('at-round');
  var scoreEl = document.getElementById('at-score');
  var bestEl = document.getElementById('at-best');
  var barEl = document.getElementById('at-bar');
  var doneEl = document.getElementById('at-done');
  var doneTitle = document.getElementById('at-done-title');
  var doneStats = document.getElementById('at-done-stats');
  var againBtn = document.getElementById('at-again');
  var mapEl = document.getElementById('at-map');
  var levelNowEl = document.getElementById('at-level-now');
  var noteEl = document.getElementById('at-progress-note');

  var level = 1, unlocked = 1, starsMap = {};
  try {
    level = parseInt(localStorage.getItem('wa_at_current') || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem('wa_at_unlocked') || '1', 10) || 1;
    starsMap = JSON.parse(localStorage.getItem('wa_at_stars') || '{}') || {};
  } catch (e) { /* private mode: play without saving */ }
  if (level > MAX_LEVEL) level = MAX_LEVEL;
  if (unlocked > MAX_LEVEL) unlocked = MAX_LEVEL;
  if (level > unlocked) level = unlocked;

  function save() {
    try {
      localStorage.setItem('wa_at_current', String(level));
      localStorage.setItem('wa_at_unlocked', String(unlocked));
      localStorage.setItem('wa_at_stars', JSON.stringify(starsMap));
    } catch (e) { /* ignore */ }
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function tierName(n) {
    if (n <= 10) return 'پہلے حروف';
    if (n <= 25) return 'حرف کھوجی';
    if (n <= 45) return 'حرف سوار';
    if (n <= 65) return 'حرف مفکر';
    if (n <= 80) return 'حرف ماہر';
    return 'حرف جادوگر';
  }
  function lettersPerLevel(n) { return n >= 61 ? 4 : 3; }
  function poolFor(n) { return n <= 20 ? LETTERS.slice(0, 14) : LETTERS; }
  function thresholdFor(n) { return n >= 61 ? 0.86 : n >= 21 ? 0.80 : 0.72; }
  function radiusFor(n) { return n >= 61 ? 21 : n >= 21 ? 25 : 29; }
  function guideAlphaFor(n) { return n >= 61 ? 0.10 : n >= 21 ? 0.14 : 0.18; }
  function showDotsFor(n) { return n < 61; }

  function lettersForLevel(n) {
    var rnd = mulberry32(n * 7919 + 29);
    var pool = poolFor(n).slice();
    var count = lettersPerLevel(n);
    var out = [];
    // walk the alphabet in order, seeded offset, so tracing follows teaching order
    var start = Math.floor(rnd() * pool.length);
    for (var i = 0; i < count; i++) out.push(pool[(start + i * 3) % pool.length]);
    return out;
  }

  /* ---------- ink sampling: the glyph itself becomes the path ---------- */
  var off = document.createElement('canvas');
  off.width = SAMPLE; off.height = SAMPLE;
  var offCtx = off.getContext('2d');

  function sampleTargets(ch) {
    offCtx.clearRect(0, 0, SAMPLE, SAMPLE);
    offCtx.fillStyle = '#000';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.font = '200px "Noto Nastaliq Urdu", serif';
    offCtx.fillText(ch, SAMPLE / 2, SAMPLE / 2 + 10);
    var img;
    try { img = offCtx.getImageData(0, 0, SAMPLE, SAMPLE).data; }
    catch (e) { img = null; }
    var pts = [];
    if (img) {
      var step = 7;
      for (var y = step; y < SAMPLE; y += step) {
        for (var x = step; x < SAMPLE; x += step) {
          if (img[(y * SAMPLE + x) * 4 + 3] > 40) pts.push({ x: x, y: y, hit: false });
        }
      }
    }
    if (pts.length < 8) {           // font not ready / glyph missing: simple fallback path
      pts = [];
      for (var k = 0; k <= 10; k++) pts.push({ x: 200 - k * 6, y: 70 + k * 16, hit: false });
    }
    // recentre the ink on the play canvas
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, i, p;
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    var dx = SIZE / 2 - (minX + maxX) / 2, dy = SIZE / 2 - (minY + maxY) / 2;
    for (i = 0; i < pts.length; i++) { pts[i].x += dx; pts[i].y += dy; }
    return { pts: pts, dx: dx, dy: dy };
  }

  /* ---------- run state ---------- */
  var run = null;   // {letters, idx, targets, covered, lifts, trail, drawing, done}

  function buildMap() {
    mapEl.innerHTML = '';
    for (var n = 1; n <= MAX_LEVEL; n++) {
      (function (n) {
        var b = document.createElement('button');
        b.type = 'button';
        var st = starsMap[n] || 0;
        b.className = 'ml-lvl' + (n === level ? ' ml-cur' : '') + (st > 0 ? ' ml-done' : '');
        b.textContent = st > 0 ? n + ' ⭐' : String(n);
        b.title = 'درجہ ' + n + ' — ' + tierName(n) + (st > 0 ? ' · بہترین ' + st + '/3 ستارے' : '');
        if (n > unlocked) { b.disabled = true; b.classList.add('ml-lock'); b.textContent = '🔒'; b.title = 'درجہ ' + n + ' — کھولنے کے لیے درجہ ' + (n - 1) + ' مکمل کریں'; }
        b.addEventListener('click', function () { if (n <= unlocked && n !== level) { level = n; save(); start(); } });
        mapEl.appendChild(b);
      })(n);
    }
    levelNowEl.textContent = level;
    var doneCount = Object.keys(starsMap).length;
    noteEl.textContent = tierName(level) + ' · 100 میں سے ' + doneCount + ' درجے مکمل';
  }

  function showBest() {
    var b = starsMap[level] || 0;
    bestEl.textContent = b > 0 ? b + ' / 3 ⭐' : '—';
  }

  function setupCanvas() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startLetter() {
    var L = run.letters[run.idx];
    var s = sampleTargets(L.ch);
    run.targets = s.pts; run.dx = s.dx; run.dy = s.dy;
    run.covered = 0; run.lifts = 0; run.trail = []; run.drawing = false; run.done = false; run.touched = false;
    nameEl.textContent = L.ch + ' — ' + L.name;
    wordEl.textContent = L.ex ? 'جیسے: ' + L.ex : '';
    roundEl.textContent = (run.idx + 1) + ' / ' + run.letters.length;
    msgEl.textContent = 'حرف کے اوپر انگلی یا ماؤس گھمائیں — جہاں سے نشان شروع ہوتا ہے وہاں سے آغاز کریں۔';
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    // faint guide: the glyph itself
    ctx.save();
    ctx.globalAlpha = run.done ? 0.9 : guideAlphaFor(level);
    ctx.translate(run.dx, run.dy);
    ctx.drawImage(off, 0, 0);
    ctx.restore();
    var i, p;
    // target dots
    if (showDotsFor(level) || run.done) {
      for (i = 0; i < run.targets.length; i++) {
        p = run.targets[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.hit ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = p.hit ? '#0f766e' : 'rgba(15,118,110,.35)';
        ctx.fill();
      }
    }
    // start hint: rightmost-top target pulses as a ring until first touch
    if (!run.touched && run.targets.length) {
      var sp = run.targets[0];
      for (i = 0; i < run.targets.length; i++) {
        p = run.targets[i];
        if (p.x > sp.x || (p.x === sp.x && p.y < sp.y)) sp = p;
      }
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 11, 0, Math.PI * 2);
      ctx.strokeStyle = '#d97706'; ctx.lineWidth = 3; ctx.stroke();
    }
    // trail
    if (run.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(run.trail[0].x, run.trail[0].y);
      for (i = 1; i < run.trail.length; i++) ctx.lineTo(run.trail[i].x, run.trail[i].y);
      ctx.strokeStyle = 'rgba(13,148,136,.75)';
      ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.stroke();
    }
    var pct = run.targets.length ? Math.round((run.covered / run.targets.length) * 100) : 0;
    barEl.style.width = pct + '%';
  }

  function coverAt(x, y) {
    var r = radiusFor(level), r2 = r * r, newly = 0;
    for (var i = 0; i < run.targets.length; i++) {
      var p = run.targets[i];
      if (!p.hit) {
        var ddx = p.x - x, ddy = p.y - y;
        if (ddx * ddx + ddy * ddy <= r2) { p.hit = true; newly++; }
      }
    }
    if (newly) {
      run.covered += newly;
      var pct = run.covered / run.targets.length;
      msgEl.textContent = 'حرف ' + Math.round(pct * 100) + '% مکمل — جاری رکھیں!';
      if (pct >= thresholdFor(level) && !run.done) { letterDone(); return; }
    }
    draw();
  }

  function letterDone() {
    run.done = true;
    draw();
    msgEl.textContent = 'شاباش! حرف "' + run.letters[run.idx].name + '" مکمل!';
    run.totalLifts += run.lifts;
    scoreEl.textContent = run.idx + 1;
    setTimeout(function () {
      run.idx++;
      if (run.idx >= run.letters.length) finishLevel();
      else startLetter();
    }, 750);
  }

  function finishLevel() {
    var per = lettersPerLevel(level);
    var stars = run.totalLifts <= per ? 3 : run.totalLifts <= per * 2 ? 2 : 1;
    if (!starsMap[level] || starsMap[level] < stars) starsMap[level] = stars;
    if (level >= unlocked && level < MAX_LEVEL) unlocked = level + 1;
    save();
    buildMap(); showBest();
    doneTitle.textContent = level >= 81 ? '⭐ حرف جادوگر!' : '⭐ شاباش!';
    doneStats.textContent = 'آپ نے درجہ ' + level + ' میں ' + per + ' حروف بنائے — ' + stars + ' ستارے! (' + tierName(level) + ')۔' +
      (level < MAX_LEVEL ? ' درجہ ' + (level + 1) + ' کھل گیا ہے۔' : ' آپ نے تمام 100 درجے مکمل کر لیے!');
    againBtn.textContent = level < MAX_LEVEL ? 'اگلا درجہ ←' : 'دوبارہ کھیلیں';
    doneEl.classList.remove('hidden');
  }

  function start() {
    doneEl.classList.add('hidden');
    run = { letters: lettersForLevel(level), idx: 0, targets: [], covered: 0, lifts: 0, totalLifts: 0, trail: [], drawing: false, done: false, touched: false, dx: 0, dy: 0 };
    scoreEl.textContent = '0';
    buildMap(); showBest();
    startLetter();
  }

  /* ---------- pointer handling ---------- */
  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * SIZE, y: (e.clientY - r.top) / r.height * SIZE };
  }
  canvas.addEventListener('pointerdown', function (e) {
    if (!run || run.done) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    if (run.touched) run.lifts++;
    run.touched = true;
    run.drawing = true;
    var p = pos(e);
    run.trail = [p];
    coverAt(p.x, p.y);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!run || !run.drawing || run.done) return;
    e.preventDefault();
    var p = pos(e);
    var last = run.trail[run.trail.length - 1];
    if (last) {
      var dist = Math.hypot(p.x - last.x, p.y - last.y);
      var steps = Math.max(1, Math.floor(dist / 4));
      for (var i = 1; i <= steps; i++) {
        coverAt(last.x + (p.x - last.x) * i / steps, last.y + (p.y - last.y) * i / steps);
        if (!run || run.done) return;
      }
    }
    run.trail.push(p);
    draw();
  });
  function endStroke() { if (run) run.drawing = false; }
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);

  document.getElementById('at-clear').addEventListener('click', function () {
    if (!run || run.done) return;
    for (var i = 0; i < run.targets.length; i++) run.targets[i].hit = false;
    run.covered = 0; run.trail = []; run.touched = false; run.lifts = 0;
    msgEl.textContent = 'صاف ہو گیا — دوبارہ کوشش کریں۔';
    draw();
  });
  document.getElementById('at-restart').addEventListener('click', function () { start(); });
  againBtn.addEventListener('click', function () {
    if (level < MAX_LEVEL) { level = level + 1; save(); }
    start();
  });
  window.addEventListener('resize', function () { setupCanvas(); if (run) draw(); });

  /* ---------- go: wait briefly for the Urdu font so sampling is real ---------- */
  setupCanvas();
  var started = false;
  function go() { if (!started) { started = true; start(); } }
  if (document.fonts && document.fonts.load) {
    var p = document.fonts.load('200px "Noto Nastaliq Urdu"');
    if (p && p.then) { p.then(go); setTimeout(go, 900); } else go();
  } else go();
})();
