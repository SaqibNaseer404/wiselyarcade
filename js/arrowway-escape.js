// Arrowway Escape — original arrow-escape puzzle for Wisely Arcade.
// A board of arrow tiles: tap an arrow and it slides off the board IF its
// path to the edge is clear. A blocked tap costs one of 3 hearts.
// 100 levels, every one generated in reverse escape order, so each board is
// solvable by construction — and re-proven by an independent solver in tests.
// Vanilla JS + canvas only. Core logic is DOM-free and exported for node tests.
(function () {
  'use strict';

  // ---------------------------------------------------------------- RNG
  function makeRng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed() {
    var h = 2166136261;
    for (var i = 0; i < arguments.length; i++) {
      h ^= (arguments[i] * 16777619) & 0xffffff;
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // ---------------------------------------------------------------- board model
  // cells is a flat array, index = r * size + c.
  // 0 = empty, 1..4 = arrow (direction = value - 1), 5 = stone (fixed blocker).
  var EMPTY = 0, STONE = 5;
  var DIRS = [
    { dr: -1, dc: 0, name: 'up' },
    { dr: 0, dc: 1, name: 'right' },
    { dr: 1, dc: 0, name: 'down' },
    { dr: 0, dc: -1, name: 'left' }
  ];
  function isArrow(v) { return v >= 1 && v <= 4; }
  function idxOf(size, r, c) { return r * size + c; }
  function inBounds(size, r, c) { return r >= 0 && c >= 0 && r < size && c < size; }
  function emptyCells(size) {
    var cells = new Array(size * size);
    for (var i = 0; i < cells.length; i++) cells[i] = EMPTY;
    return cells;
  }
  function cloneCells(cells) { return cells.slice(); }
  function arrowCount(size, cells) {
    var n = 0;
    for (var i = 0; i < cells.length; i++) if (isArrow(cells[i])) n++;
    return n;
  }
  // Walk from (r,c) along direction d. Returns {dist} = number of steps to the
  // board edge (0 when already on the edge pointing out), with blocker = index
  // of the first non-empty cell in the way, or -1 when the way is clear.
  function rayInfo(size, cells, r, c, d) {
    var dir = DIRS[d], dist = 0, nr = r + dir.dr, nc = c + dir.dc;
    while (inBounds(size, nr, nc)) {
      if (cells[idxOf(size, nr, nc)] !== EMPTY) {
        return { clear: false, blocker: idxOf(size, nr, nc), dist: dist };
      }
      dist++; nr += dir.dr; nc += dir.dc;
    }
    return { clear: true, blocker: -1, dist: dist };
  }
  function canEscape(size, cells, r, c) {
    var v = cells[idxOf(size, r, c)];
    if (!isArrow(v)) return { ok: false, blocker: -1 };
    var info = rayInfo(size, cells, r, c, v - 1);
    return { ok: info.clear, blocker: info.blocker, dist: info.dist };
  }
  function escapableArrows(size, cells) {
    var out = [], r, c;
    for (r = 0; r < size; r++) for (c = 0; c < size; c++) {
      if (isArrow(cells[idxOf(size, r, c)]) && canEscape(size, cells, r, c).ok) out.push(idxOf(size, r, c));
    }
    return out;
  }

  // ---------------------------------------------------------------- solver
  // Removing an escapable arrow can never make another arrow less escapable,
  // so "repeatedly remove any escapable arrow" is a COMPLETE solver: it clears
  // the board iff a clearing order exists. Two scan strategies are exported so
  // tests can cross-check every level with independent orders.
  function solveWith(size, cellsIn, pickLast) {
    var cells = cloneCells(cellsIn), order = [];
    while (true) {
      var esc = escapableArrows(size, cells);
      if (esc.length === 0) break;
      var pick = pickLast ? esc[esc.length - 1] : esc[0];
      cells[pick] = EMPTY;
      order.push(pick);
    }
    return arrowCount(size, cells) === 0 ? order : null;
  }
  function solve(size, cells) { return solveWith(size, cells, false); }
  function solveReverse(size, cells) { return solveWith(size, cells, true); }

  // ---------------------------------------------------------------- levels
  function levelParams(level) {
    var L = Math.max(1, Math.min(100, level | 0));
    var size = 4 + Math.floor((L - 1) * 6 / 99);              // 4x4 -> 10x10
    var density = 0.42 + 0.33 * (L - 1) / 99;                 // boards fill up
    var stones = L < 51 ? 0 : Math.min(6, 1 + Math.floor((L - 51) / 10));
    var arrows = Math.max(4, Math.round(size * size * density));
    return { level: L, size: size, arrows: arrows, stones: stones, hearts: 3 };
  }
  // Generation by REVERSE construction: arrows are placed one by one, and an
  // arrow may only be placed where its escape ray is clear of everything
  // already placed (stones + earlier arrows). Reading the placement list
  // backwards gives a valid escape order, so the finished board is solvable
  // by construction — the last arrow placed is always escapable at the start.
  // Longer rays are preferred, so arrows tend to sit behind other arrows:
  // that is where the blocking chains (the actual puzzle) come from.
  function tryBuild(rng, p) {
    var size = p.size, cells = emptyCells(size), i, placed = 0;
    var guard = 0;
    while (placed < p.stones && guard++ < 500) {
      i = Math.floor(rng() * cells.length);
      if (cells[i] === EMPTY) { cells[i] = STONE; placed++; }
    }
    // Each step considers EVERY currently placeable (cell, direction) pair and
    // picks one weighted by ray length squared — no wasted retries, and the
    // build only stops early when the arrangement is truly maximal.
    var arrows = 0;
    while (arrows < p.arrows) {
      var cands = [], total = 0, r, c, d, info;
      for (i = 0; i < cells.length; i++) {
        if (cells[i] !== EMPTY) continue;
        r = Math.floor(i / size); c = i % size;
        for (d = 0; d < 4; d++) {
          info = rayInfo(size, cells, r, c, d);
          if (info.clear) {
            var w = (info.dist + 1) * (info.dist + 1);
            cands.push({ i: i, d: d, w: w });
            total += w;
          }
        }
      }
      if (cands.length === 0) break;
      var roll = rng() * total, k = 0;
      while (roll >= cands[k].w) { roll -= cands[k].w; k++; }
      cells[cands[k].i] = cands[k].d + 1;
      arrows++;
    }
    return { cells: cells, arrows: arrows };
  }
  function genLevel(level) {
    var p = levelParams(level);
    var best = null, attempt;
    for (attempt = 1; attempt <= 90; attempt++) {
      var built = tryBuild(makeRng(hashSeed(778899, p.level, attempt)), p);
      if (!best || built.arrows > best.arrows) {
        best = { cells: built.cells, arrows: built.arrows };
      }
      if (built.arrows >= p.arrows) break;
    }
    return {
      params: p, size: p.size, cells: best.cells, arrowCount: best.arrows
    };
  }

  // ---------------------------------------------------------------- game state
  function starsFor(mistakes) {
    if (mistakes <= 0) return 3;
    if (mistakes === 1) return 2;
    return 1;
  }
  function newGame(level) {
    var gen = genLevel(level);
    return {
      level: gen.params.level, size: gen.size, cells: gen.cells,
      hearts: gen.params.hearts, mistakes: 0,
      left: gen.arrowCount, total: gen.arrowCount, status: 'playing', stars: 0
    };
  }
  // One tap. Result: 'escaped' | 'blocked' | 'noop' | 'ignored'.
  function tapArrow(st, r, c) {
    if (st.status !== 'playing') return { result: 'ignored' };
    if (!inBounds(st.size, r, c)) return { result: 'noop' };
    var i = idxOf(st.size, r, c), v = st.cells[i];
    if (!isArrow(v)) return { result: 'noop', index: i };
    var chk = canEscape(st.size, st.cells, r, c);
    if (chk.ok) {
      st.cells[i] = EMPTY;
      st.left--;
      if (st.left === 0) { st.status = 'won'; st.stars = starsFor(st.mistakes); }
      return { result: 'escaped', index: i, dir: v - 1, dist: chk.dist };
    }
    st.mistakes++;
    st.hearts--;
    if (st.hearts <= 0) { st.hearts = 0; st.status = 'failed'; }
    return { result: 'blocked', index: i, dir: v - 1, blocker: chk.blocker };
  }

  // ---------------------------------------------------------------- campaign progress (pure, testable)
  function emptyProgress() { return { unlocked: 1, current: 1, stars: {} }; }
  function recordClear(progress, level, stars) {
    var p = {
      unlocked: progress.unlocked, current: progress.current,
      stars: Object.assign({}, progress.stars)
    };
    var key = String(level);
    if (!p.stars[key] || p.stars[key] < stars) p.stars[key] = stars;
    if (level === p.unlocked && level < 100) p.unlocked = level + 1;
    p.current = level < 100 ? level + 1 : level;
    return p;
  }

  var Core = {
    EMPTY: EMPTY, STONE: STONE, DIRS: DIRS,
    makeRng: makeRng, hashSeed: hashSeed,
    isArrow: isArrow, idxOf: idxOf, inBounds: inBounds, emptyCells: emptyCells,
    cloneCells: cloneCells, arrowCount: arrowCount, rayInfo: rayInfo,
    canEscape: canEscape, escapableArrows: escapableArrows,
    solve: solve, solveReverse: solveReverse,
    levelParams: levelParams, genLevel: genLevel,
    starsFor: starsFor, newGame: newGame, tapArrow: tapArrow,
    emptyProgress: emptyProgress, recordClear: recordClear
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Core; }
  if (typeof document === 'undefined') return;

  // ================================================================ BROWSER
  var LS_KEY = 'wisely-arrowway-escape';
  var progress = emptyProgress();
  try {
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved) {
      progress.unlocked = Math.max(1, Math.min(100, saved.unlocked || 1));
      progress.current = Math.max(1, Math.min(100, saved.current || progress.unlocked));
      progress.stars = saved.stars || {};
    }
  } catch (e) { /* private mode: play without saving */ }
  function saveProgress() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(progress)); } catch (e) {}
  }

  var cv = document.getElementById('arrowway');
  var ctx = cv.getContext('2d');
  var elLeft = document.getElementById('aw-left');
  var elLevel = document.getElementById('aw-level');
  var elHearts = document.getElementById('aw-hearts');
  var elStatus = document.getElementById('aw-status');
  var over = document.getElementById('aw-over');
  var overTitle = document.getElementById('aw-over-title');
  var overStats = document.getElementById('aw-over-stats');
  var btnMain = document.getElementById('aw-ov-main');
  var btnAlt = document.getElementById('aw-ov-alt');
  var picker = document.getElementById('aw-picker');
  var pickerGrid = document.getElementById('aw-picker-grid');

  // Canvas layout (internal resolution 440x440, CSS scales it).
  var CW = 440, BX = 20, BY = 20, BOARD_PX = 400;

  var G = null;        // core game state (from newGame)
  var anim = null;     // {kind:'escape'|'bump', index, dir, blocker, t0}
  var lockUntil = 0;
  var started = false; // true once a level has actually been entered
  var statusMsg = '';
  function cellPx() { return BOARD_PX / G.size; }

  function startLevel(level) {
    started = true;
    G = newGame(level);
    anim = null; lockUntil = 0;
    progress.current = G.level; saveProgress();
    statusMsg = 'Tap an arrow with a clear path to the edge — it slides free. Blocked taps cost a heart.';
    hideOverlay(); hidePicker(); updateHud();
  }

  function heartsStr() {
    var s = '';
    for (var i = 0; i < 3; i++) s += i < G.hearts ? '♥' : '♡';
    return s;
  }
  function updateHud() {
    if (!G) { elLeft.textContent = '—'; elLevel.textContent = '—'; elHearts.textContent = '♥♥♥'; return; }
    elLeft.textContent = G.left;
    elLevel.textContent = G.level;
    elHearts.textContent = heartsStr();
    elStatus.textContent = statusMsg;
  }

  var mainFn = null, altFn = null;
  function showOverlay(o) {
    overTitle.textContent = o.title;
    overStats.textContent = o.stats || '';
    btnMain.textContent = o.mainLabel;
    btnAlt.textContent = o.altLabel;
    mainFn = o.mainFn; altFn = o.altFn;
    over.classList.remove('hidden');
  }
  function hideOverlay() { over.classList.add('hidden'); }
  btnMain.addEventListener('click', function () { if (mainFn) mainFn(); });
  btnAlt.addEventListener('click', function () { if (altFn) altFn(); });

  function showMenu() {
    showOverlay({
      title: 'Ready to escape?',
      stats: 'Free every arrow from the tray — but only arrows with a clear path can leave. 100 levels, 3 hearts each.',
      mainLabel: '▶ Level ' + progress.current,
      mainFn: function () { startLevel(progress.current); },
      altLabel: 'All levels',
      altFn: openPicker
    });
  }
  function openPicker() {
    hideOverlay();
    pickerGrid.innerHTML = '';
    for (var lv = 1; lv <= 100; lv++) {
      (function (n) {
        var b = document.createElement('button');
        b.className = 'lvl-btn' + (n > progress.unlocked ? ' locked' : '');
        var st = progress.stars[String(n)] || 0;
        b.innerHTML = n + (st ? '<span>' + '★'.repeat(st) + '</span>' : '');
        b.disabled = n > progress.unlocked;
        b.addEventListener('click', function () { startLevel(n); });
        pickerGrid.appendChild(b);
      })(lv);
    }
    picker.classList.remove('hidden');
  }
  function hidePicker() { picker.classList.add('hidden'); }
  document.getElementById('aw-picker-close').addEventListener('click', function () {
    hidePicker();
    if (!started || !G || G.status !== 'playing') showMenu();
  });
  document.getElementById('aw-levels').addEventListener('click', openPicker);
  document.getElementById('aw-restart').addEventListener('click', function () {
    if (G) startLevel(G.level);
  });

  function onWon() {
    progress = recordClear(progress, G.level, G.stars);
    saveProgress();
    var starStr = '★'.repeat(G.stars) + '☆'.repeat(3 - G.stars);
    showOverlay({
      title: 'Level ' + G.level + ' cleared! ' + starStr,
      stats: 'Every arrow escaped · ' + G.mistakes + (G.mistakes === 1 ? ' mistake' : ' mistakes') +
        ' · Hearts left ' + G.hearts + ' of 3',
      mainLabel: G.level < 100 ? 'Next level ▶' : 'Play level 100 again',
      mainFn: function () { startLevel(G.level < 100 ? G.level + 1 : 100); },
      altLabel: 'All levels',
      altFn: openPicker
    });
  }
  function onFailed() {
    showOverlay({
      title: 'Level ' + G.level + ' — out of hearts',
      stats: 'Three blocked taps. Look for the arrows that free the others — order matters. ' +
        G.left + ' of ' + G.total + ' arrows were still trapped.',
      mainLabel: 'Try again',
      mainFn: function () { startLevel(G.level); },
      altLabel: 'All levels',
      altFn: openPicker
    });
  }

  function handleTap(r, c) {
    if (!G || G.status !== 'playing' || Date.now() < lockUntil) return;
    var res = tapArrow(G, r, c);
    if (res.result === 'escaped') {
      anim = { kind: 'escape', index: res.index, dir: res.dir, dist: res.dist, t0: performance.now(), value: res.dir + 1 };
      lockUntil = Date.now() + 230;
      statusMsg = G.left === 0 ? 'Board clear!' :
        G.left + (G.left === 1 ? ' arrow' : ' arrows') + ' left · ' +
        escapableArrows(G.size, G.cells).length + ' can escape right now.';
      setTimeout(function () { if (G && G.status === 'won') onWon(); }, 260);
    } else if (res.result === 'blocked') {
      anim = { kind: 'bump', index: res.index, dir: res.dir, blocker: res.blocker, t0: performance.now() };
      lockUntil = Date.now() + 190;
      statusMsg = G.status === 'failed' ? 'That path was blocked — no hearts left.' :
        'Blocked! That arrow\'s path is not clear. −1 heart.';
      setTimeout(function () { if (G && G.status === 'failed') onFailed(); }, 220);
    }
    updateHud();
  }

  // ---------------------------------------------------------------- rendering
  // Arrow tile colours by direction: up amber, right sapphire, down emerald, left rose.
  var DIRCOLORS = [
    ['#ffe08a', '#f5a623', '#9a6204'],
    ['#93ccff', '#2e86de', '#123f67'],
    ['#93f2b6', '#27ae60', '#14532d'],
    ['#ffb9d6', '#e84393', '#751c47']
  ];
  function rr(x, y, w, h, rad) {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
  function drawArrowGlyph(cx, cy, s, dir, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate(dir * Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -0.34 * s);
    ctx.lineTo(0.30 * s, 0.04 * s);
    ctx.lineTo(0.13 * s, 0.04 * s);
    ctx.lineTo(0.13 * s, 0.32 * s);
    ctx.lineTo(-0.13 * s, 0.32 * s);
    ctx.lineTo(-0.13 * s, 0.04 * s);
    ctx.lineTo(-0.30 * s, 0.04 * s);
    ctx.closePath();
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = s * 0.06;
    ctx.shadowOffsetY = s * 0.04;
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }
  function drawTile(x, y, s, value, scale, alpha) {
    var inset = s * 0.045;
    var w = s - inset * 2, ox = x + inset + (s - inset * 2 - w * scale) / 2, oy = y + inset;
    ox = x + (s - w * scale) / 2; oy = y + (s - w * scale) / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (value === STONE) {
      var sg = ctx.createLinearGradient(ox, oy, ox, oy + w * scale);
      sg.addColorStop(0, '#9aa3ad'); sg.addColorStop(0.5, '#5d6672'); sg.addColorStop(1, '#39404a');
      rr(ox, oy, w * scale, w * scale, s * 0.16);
      ctx.fillStyle = sg; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      [[0.24, 0.24], [0.76, 0.24], [0.24, 0.76], [0.76, 0.76]].forEach(function (pt) {
        ctx.beginPath();
        ctx.arc(ox + w * scale * pt[0], oy + w * scale * pt[1], s * 0.045, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
      return;
    }
    var p = DIRCOLORS[value - 1];
    ctx.shadowColor = 'rgba(0,0,0,.38)';
    ctx.shadowBlur = s * 0.12;
    ctx.shadowOffsetY = s * 0.06;
    var g = ctx.createLinearGradient(ox, oy, ox, oy + w * scale);
    g.addColorStop(0, p[0]); g.addColorStop(0.45, p[1]); g.addColorStop(1, p[2]);
    rr(ox, oy, w * scale, w * scale, s * 0.18);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    var hg = ctx.createLinearGradient(ox, oy, ox, oy + w * scale * 0.55);
    hg.addColorStop(0, 'rgba(255,255,255,.5)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    rr(ox + w * scale * 0.09, oy + w * scale * 0.07, w * scale * 0.82, w * scale * 0.5, s * 0.14);
    ctx.fillStyle = hg;
    ctx.fill();
    rr(ox, oy, w * scale, w * scale, s * 0.18);
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
    drawArrowGlyph(x + s / 2, y + s / 2, s * 0.92 * scale, value - 1, alpha);
  }
  function draw() {
    var now = performance.now();
    var bg = ctx.createLinearGradient(0, 0, 0, CW);
    bg.addColorStop(0, '#1a2a38'); bg.addColorStop(1, '#0a141c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CW, CW);
    if (!G) { requestAnimationFrame(draw); return; }
    var cell = cellPx();

    // machined metal tray
    var tg = ctx.createLinearGradient(BX - 14, BY - 14, BX - 14, BY + BOARD_PX + 14);
    tg.addColorStop(0, '#5b6b7a'); tg.addColorStop(0.5, '#3c4a58'); tg.addColorStop(1, '#232e39');
    rr(BX - 14, BY - 14, BOARD_PX + 28, BOARD_PX + 28, 18);
    ctx.fillStyle = tg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    [[BX - 7, BY - 7], [BX + BOARD_PX + 7, BY - 7], [BX - 7, BY + BOARD_PX + 7], [BX + BOARD_PX + 7, BY + BOARD_PX + 7]].forEach(function (pt) {
      ctx.beginPath(); ctx.arc(pt[0], pt[1], 2.6, 0, Math.PI * 2); ctx.fill();
    });
    rr(BX - 4, BY - 4, BOARD_PX + 8, BOARD_PX + 8, 10);
    ctx.fillStyle = '#101d28'; ctx.fill();

    var animActive = anim && now - anim.t0 < (anim.kind === 'escape' ? 240 : 190);
    if (anim && !animActive) anim = null;

    var r, c, i;
    for (r = 0; r < G.size; r++) {
      for (c = 0; c < G.size; c++) {
        var x = BX + c * cell, y = BY + r * cell;
        rr(x + 2, y + 2, cell - 4, cell - 4, cell * 0.14);
        ctx.fillStyle = 'rgba(255,255,255,.045)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.06)';
        ctx.lineWidth = 1; ctx.stroke();
        i = idxOf(G.size, r, c);
        var v = G.cells[i];
        if (v === EMPTY) continue;
        if (animActive && anim.kind === 'escape' && anim.index === i) continue; // drawn sliding below
        var dx = 0, dy = 0, flash = false;
        if (animActive && anim.kind === 'bump' && anim.index === i) {
          var bp = Math.sin(Math.min(1, (now - anim.t0) / 190) * Math.PI);
          dx = DIRS[anim.dir].dc * bp * cell * 0.14;
          dy = DIRS[anim.dir].dr * bp * cell * 0.14;
        }
        if (animActive && anim.kind === 'bump' && anim.blocker === i) flash = true;
        drawTile(x + dx, y + dy, cell, v, 1, 1);
        if (flash) {
          rr(x + 2, y + 2, cell - 4, cell - 4, cell * 0.14);
          ctx.strokeStyle = 'rgba(255,70,70,.95)';
          ctx.lineWidth = 2.6; ctx.stroke();
        }
      }
    }
    // sliding escapee
    if (animActive && anim.kind === 'escape') {
      var er = Math.floor(anim.index / G.size), ec = anim.index % G.size;
      var t = Math.min(1, (now - anim.t0) / 240);
      var ease = t * t * (3 - 2 * t);
      var travel = (anim.dist + 1.3) * cell * ease;
      var ex = BX + ec * cell + DIRS[anim.dir].dc * travel;
      var ey = BY + er * cell + DIRS[anim.dir].dr * travel;
      ctx.save();
      ctx.beginPath();
      ctx.rect(BX - 16, BY - 16, BOARD_PX + 32, BOARD_PX + 32);
      ctx.clip();
      drawTile(ex, ey, cell, anim.value, 1, t > 0.75 ? 1 - (t - 0.75) * 4 : 1);
      ctx.restore();
    }
    requestAnimationFrame(draw);
  }

  // ---------------------------------------------------------------- input
  function canvasPos(e) {
    var rect = cv.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (cv.width / rect.width),
      y: (e.clientY - rect.top) * (cv.height / rect.height)
    };
  }
  function boardCellAt(x, y) {
    if (!G || x < BX || y < BY || x >= BX + BOARD_PX || y >= BY + BOARD_PX) return null;
    var cell = cellPx();
    return { r: Math.floor((y - BY) / cell), c: Math.floor((x - BX) / cell) };
  }
  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    var pos = canvasPos(e), cellAt = boardCellAt(pos.x, pos.y);
    if (cellAt) handleTap(cellAt.r, cellAt.c);
  });

  // ---------------------------------------------------------------- go
  G = newGame(progress.current);
  statusMsg = 'Tap an arrow with a clear path to the edge — it slides free. Blocked taps cost a heart.';
  updateHud();
  showMenu();
  requestAnimationFrame(draw);
})();
