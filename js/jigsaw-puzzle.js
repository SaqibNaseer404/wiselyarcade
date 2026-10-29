/* Jigsaw Puzzle — Wisely Arcade: 100 levels.
   Twelve pictures — arcade posters, storybook scenes and real NASA photos — sliced into growing grids.
   Drag pieces from the tray; drop near home to snap. Patience wins. */
(function () {
  'use strict';
  var MAX_LEVEL = 100;
  var PICS = [
    { src: '../images/thumbs/forest-dash.jpg', name: 'Forest Dash' },
    { src: '../images/thumbs/bubble-pop.jpg', name: 'Bubble Pop' },
    { src: '../images/thumbs/memory-match.jpg', name: 'Animal Memory Match' },
    { src: '../images/thumbs/neon-snake.jpg', name: 'Neon Snake' },
    { src: '../images/thumbs/tower-stack.jpg', name: 'Tower Stack' },
    { src: '../images/thumbs/ludo.jpg', name: 'Ludo' },
    { src: '../images/thumbs/jigsaw-ocean.jpg', name: 'Ocean World' },
    { src: '../images/thumbs/jigsaw-earth.jpg', name: 'Planet Earth' },
    { src: '../images/thumbs/jigsaw-robot.jpg', name: 'Robot Friend' },
    { src: '../images/thumbs/jigsaw-nebula.jpg', name: 'Starry Nebula' },
    { src: '../images/thumbs/jigsaw-cars.jpg', name: 'Super Cars' },
    { src: '../images/thumbs/jigsaw-balloons.jpg', name: 'Balloon Valley' }
  ];
  function gridFor(l) {
    if (l <= 10) return { c: 3, r: 3 };
    if (l <= 25) return { c: 4, r: 3 };
    if (l <= 40) return { c: 4, r: 4 };
    if (l <= 55) return { c: 5, r: 4 };
    if (l <= 70) return { c: 6, r: 4 };
    if (l <= 85) return { c: 6, r: 5 };
    return { c: 7, r: 5 };
  }
  function picFor(l) { return PICS[(l - 1) % PICS.length]; }
  function parFor(n) { return n + Math.ceil(n / 2); }
  function seeded(seed) { var t = seed * 2654435761 % 4294967296; return function () { t = (t * 1664525 + 1013904223) % 4294967296; return t / 4294967296; }; }
  function fmt(s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  var playEl = document.getElementById('jg-play');
  var boardBox = document.getElementById('jg-boardbox');
  var boardEl = document.getElementById('jg-board');
  var ghostEl = document.getElementById('jg-ghost');
  var peekImg = document.getElementById('jg-peekimg');
  var trayEl = document.getElementById('jg-tray');
  var placedEl = document.getElementById('jg-placed');
  var movesEl = document.getElementById('jg-moves');
  var timeEl = document.getElementById('jg-time');
  var msgEl = document.getElementById('jg-msg');
  var winEl = document.getElementById('jg-win');
  var winStats = document.getElementById('jg-win-stats');
  var nextBtn = document.getElementById('jg-next');

  var cur = 1, unlocked = 1, starMap = {}, bestMap = {};
  try {
    cur = parseInt(localStorage.getItem('jg_current') || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem('jg_unlocked') || '1', 10) || 1;
    starMap = JSON.parse(localStorage.getItem('jg_stars') || '{}') || {};
    bestMap = JSON.parse(localStorage.getItem('jg_best') || '{}') || {};
  } catch (e) {}
  if (cur < 1) cur = 1; if (cur > MAX_LEVEL) cur = MAX_LEVEL;
  if (unlocked < cur) unlocked = cur;

  var pieces = [], grid = { c: 3, r: 3 }, total = 9;
  var placedCount = 0, moves = 0, seconds = 0, timer = null, started = false;
  var peeked = false, won = false, zTop = 10, lastM = null, drag = null;

  function save() {
    try {
      localStorage.setItem('jg_current', String(cur));
      localStorage.setItem('jg_unlocked', String(unlocked));
      localStorage.setItem('jg_stars', JSON.stringify(starMap));
      localStorage.setItem('jg_best', JSON.stringify(bestMap));
    } catch (e) {}
  }

  /* ---------- sound: a tiny soft pop, no audio files ---------- */
  var actx = null;
  function pop(freq) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = 'sine';
      o.frequency.setValueAtTime(freq || 520, t);
      o.frequency.exponentialRampToValueAtTime((freq || 520) * 1.7, t + 0.08);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + 0.14);
    } catch (e) {}
  }

  /* ---------- geometry ---------- */
  function metrics() {
    var pr = playEl.getBoundingClientRect();
    var br = boardEl.getBoundingClientRect();
    var tr = trayEl.getBoundingClientRect();
    return {
      bx: br.left - pr.left, by: br.top - pr.top, bw: br.width, bh: br.height,
      tx: tr.left - pr.left, ty: tr.top - pr.top, tw: tr.width, th: tr.height
    };
  }
  function cellW(m) { return m.bw / grid.c; }
  function cellH(m) { return m.bh / grid.r; }

  function setPos(p) {
    p.el.style.left = p.x + 'px';
    p.el.style.top = p.y + 'px';
  }
  function placeEl(p, m) {
    var cw = cellW(m), ch = cellH(m);
    p.el.style.width = cw + 'px';
    p.el.style.height = ch + 'px';
    p.el.style.backgroundImage = 'url("' + picFor(cur).src + '")';
    p.el.style.backgroundSize = m.bw + 'px ' + m.bh + 'px';
    p.el.style.backgroundPosition = (-p.col * cw) + 'px ' + (-p.row * ch) + 'px';
    setPos(p);
  }

  function relayout() {
    if (!pieces.length) { lastM = metrics(); return; }
    var m = metrics();
    pieces.forEach(function (p) {
      if (p.placed) {
        p.x = m.bx + p.col * cellW(m); p.y = m.by + p.row * cellH(m);
      } else if (lastM && p.fx != null) {
        p.x = m.tx + p.fx * m.tw; p.y = m.ty + p.fy * m.th;
      }
      placeEl(p, m);
    });
    lastM = m;
  }

  /* ---------- level map ---------- */
  function buildMap() {
    var map = document.getElementById('jg-map');
    map.innerHTML = '';
    for (var l = 1; l <= MAX_LEVEL; l++) {
      (function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        if (starMap[l] != null && l !== cur) { b.className = 'jg-lvl jg-done'; b.textContent = l + (starMap[l] >= 3 ? ' ⭐' : ''); }
        else if (l === cur) { b.className = 'jg-lvl jg-cur'; b.textContent = l; }
        else if (l <= unlocked) { b.className = 'jg-lvl'; b.textContent = l; }
        else { b.className = 'jg-lvl jg-lock'; b.textContent = '🔒'; }
        b.disabled = l > unlocked;
        b.setAttribute('aria-label', 'Level ' + l);
        b.addEventListener('click', function () { if (l <= unlocked) { cur = l; save(); buildLevel(); } });
        map.appendChild(b);
      })(l);
    }
    document.getElementById('jg-level-now').textContent = cur;
    var done = 0; for (var k in starMap) done++;
    var pic = picFor(cur);
    document.getElementById('jg-progress-note').textContent =
      pic.name + ' · picture ' + ((cur - 1) % PICS.length + 1) + ' of ' + PICS.length +
      ' · ' + done + ' of 100 levels completed';
  }

  /* ---------- timer / stats ---------- */
  function startTimer() {
    if (timer) return;
    timer = setInterval(function () { seconds++; timeEl.textContent = fmt(seconds); }, 1000);
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function refreshStats() {
    placedEl.textContent = placedCount + ' / ' + total;
    movesEl.textContent = moves;
    timeEl.textContent = fmt(seconds);
  }

  /* ---------- build a level ---------- */
  function buildLevel() {
    stopTimer();
    pieces.forEach(function (p) { p.el.remove(); });
    pieces = [];
    placedCount = 0; moves = 0; seconds = 0; started = false;
    peeked = false; won = false; drag = null;
    winEl.classList.add('hidden');

    grid = gridFor(cur);
    total = grid.c * grid.r;
    var pic = picFor(cur);

    boardBox.style.width = Math.min(620, grid.c * 150) + 'px';
    ghostEl.style.backgroundImage = 'url("' + pic.src + '")';
    ghostEl.style.backgroundSize = '100% 100%';
    peekImg.style.backgroundImage = 'url("' + pic.src + '")';
    peekImg.style.backgroundSize = '100% 100%';
    peekImg.classList.remove('on');

    /* create pieces */
    var flat = [];
    for (var r = 0; r < grid.r; r++) for (var c = 0; c < grid.c; c++) flat.push({ col: c, row: r });
    flat.forEach(function (f) {
      var el = document.createElement('div');
      el.className = 'jg-piece';
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', 'Puzzle piece ' + (f.row * grid.c + f.col + 1));
      var p = { el: el, col: f.col, row: f.row, x: 0, y: 0, fx: null, fy: null, placed: false };
      el.addEventListener('pointerdown', function (e) { onDown(e, p); });
      playEl.appendChild(el);
      pieces.push(p);
    });

    /* tray slots: seeded shuffle — every piece starts in the tray, none pre-solved */
    var m = metrics();
    var cw = cellW(m), ch = cellH(m);
    var perRow = Math.max(1, Math.floor(m.tw / cw));
    var slotRows = Math.ceil(total / perRow);
    trayEl.style.height = (slotRows * ch + 16) + 'px';
    m = metrics();
    var order = pieces.map(function (_, i) { return i; });
    var rng = seeded(cur * 131 + 7);
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    pieces.forEach(function (p, idx) {
      var slot = order[idx];
      var sx = (slot % perRow) * cw, sy = Math.floor(slot / perRow) * ch;
      var jx = Math.max(-4, Math.min(4, (rng() - 0.5) * 8));
      var jy = Math.max(-4, Math.min(4, (rng() - 0.5) * 8));
      p.x = m.tx + sx + jx; p.y = m.ty + 8 + sy + jy;
      p.fx = (p.x - m.tx) / m.tw; p.fy = (p.y - m.ty) / m.th;
      placeEl(p, m);
    });
    lastM = m;
    refreshStats();
    buildMap();
    msgEl.textContent = 'Drag a piece onto the picture. Drop it near its home and it snaps in!';
  }

  /* ---------- dragging (pointer events: mouse + touch) ---------- */
  function onDown(e, p) {
    if (p.placed || won) return;
    e.preventDefault();
    if (!started) { started = true; startTimer(); }
    try { p.el.setPointerCapture(e.pointerId); } catch (err) {}
    drag = { p: p, id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, moved: false };
    if (zTop > 40) { pieces.forEach(function (q) { if (!q.placed) q.el.style.zIndex = 5; }); zTop = 10; }
    p.el.style.zIndex = ++zTop;
    p.el.classList.add('drag');
    p.el.addEventListener('pointermove', onMove);
    p.el.addEventListener('pointerup', onUp);
    p.el.addEventListener('pointercancel', onUp);
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    drag.p.x = drag.ox + dx;
    drag.p.y = drag.oy + dy;
    setPos(drag.p);
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var p = drag.p, wasMoved = drag.moved;
    p.el.removeEventListener('pointermove', onMove);
    p.el.removeEventListener('pointerup', onUp);
    p.el.removeEventListener('pointercancel', onUp);
    p.el.classList.remove('drag');
    drag = null;
    if (wasMoved) moves++;
    var m = metrics();
    var hx = m.bx + p.col * cellW(m), hy = m.by + p.row * cellH(m);
    var snapR = cellW(m) * 0.35;
    var dist = Math.hypot(p.x - hx, p.y - hy);
    if (dist <= snapR) {
      p.x = hx; p.y = hy; p.placed = true;
      p.el.classList.add('locked');
      p.el.style.zIndex = 2;
      setPos(p);
      pop(520);
      p.el.classList.remove('pop'); void p.el.offsetWidth; p.el.classList.add('pop');
      placedCount++;
      if (placedCount === total) { refreshStats(); win(); return; }
      msgEl.textContent = 'Pop! ' + (total - placedCount) + (total - placedCount === 1 ? ' piece' : ' pieces') + ' to go. You can do it!';
    } else {
      p.fx = (p.x - m.tx) / m.tw; p.fy = (p.y - m.ty) / m.th;
      if (wasMoved) msgEl.textContent = 'Not quite its home — look at the ghost picture and try again!';
    }
    refreshStats();
  }

  /* ---------- win ---------- */
  function win() {
    won = true;
    stopTimer();
    pieces.forEach(function (p) { p.el.style.zIndex = 1; });
    var par = parFor(total);
    var stars = 1;
    if (moves <= par * 1.5) stars = 2;
    if (!peeked && moves <= par) stars = 3;
    if (starMap[cur] == null || stars > starMap[cur]) starMap[cur] = stars;
    if (bestMap[cur] == null || seconds < bestMap[cur]) bestMap[cur] = seconds;
    if (cur === unlocked && unlocked < MAX_LEVEL) unlocked++;
    save();
    buildMap();
    pop(523); setTimeout(function () { pop(659); }, 120); setTimeout(function () { pop(784); }, 240);
    var starStr = stars === 3 ? '⭐⭐⭐' : stars === 2 ? '⭐⭐' : '⭐';
    winStats.innerHTML = 'Level ' + cur + ' complete — <strong>' + starStr + '</strong><br>' +
      'You rebuilt <strong>' + picFor(cur).name + '</strong> in <strong>' + fmt(seconds) + '</strong> with <strong>' + moves + ' moves</strong>.' +
      (peeked ? '<br>You peeked this time — finish without peeking for 3 stars!' : '') +
      (cur < MAX_LEVEL ? '<br>Level ' + (cur + 1) + ' is unlocked — a new puzzle awaits!' : '<br>🏆 You finished all 100 levels. Master puzzler!');
    nextBtn.style.display = cur >= MAX_LEVEL ? 'none' : '';
    msgEl.textContent = 'You did it! Patience wins again. 🧩';
    setTimeout(function () { winEl.classList.remove('hidden'); }, 400);
  }

  /* ---------- controls ---------- */
  var peekBtn = document.getElementById('jg-peek');
  function peekOn(e) { if (e) e.preventDefault(); peeked = true; peekImg.classList.add('on'); }
  function peekOff() { peekImg.classList.remove('on'); }
  peekBtn.addEventListener('pointerdown', peekOn);
  peekBtn.addEventListener('pointerup', peekOff);
  peekBtn.addEventListener('pointerleave', peekOff);
  peekBtn.addEventListener('pointercancel', peekOff);
  peekBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  document.getElementById('jg-restart').addEventListener('click', function () { buildLevel(); });
  document.getElementById('jg-again').addEventListener('click', function () { buildLevel(); });
  nextBtn.addEventListener('click', function () {
    if (cur < MAX_LEVEL) { cur++; save(); buildLevel(); }
  });

  var rzT = null;
  window.addEventListener('resize', function () {
    clearTimeout(rzT);
    rzT = setTimeout(relayout, 120);
  });

  /* ---------- read-only QA hook (used by automated play-tests) ---------- */
  window.__jg = {
    level: function () { return cur; },
    unlocked: function () { return unlocked; },
    grid: function () { return { cols: grid.c, rows: grid.r, count: total }; },
    picIndex: function () { return (cur - 1) % PICS.length; },
    pieces: function (m) {
      m = m || metrics();
      var cw = cellW(m), ch = cellH(m);
      return pieces.map(function (p) {
        return {
          col: p.col, row: p.row, placed: p.placed,
          pos: { x: p.x, y: p.y }, home: { x: m.bx + p.col * cw, y: m.by + p.row * ch },
          w: cw, h: ch
        };
      });
    },
    playRect: function () { var r = playEl.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; },
    state: function () { return { placed: placedCount, total: total, moves: moves, seconds: seconds, peeked: peeked, won: won }; },
    stars: function () { return starMap; },
    setLevel: function (l) { if (l >= 1 && l <= MAX_LEVEL) { cur = l; if (unlocked < cur) unlocked = cur; save(); buildLevel(); } },
    peekOn: peekOn, peekOff: peekOff
  };

  requestAnimationFrame(buildLevel);
})();
