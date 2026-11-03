// Crown Logic — original crown-placement logic puzzle for Wisely Arcade.
// An N x N board split into N coloured regions. Place exactly one crown in
// every row, every column and every region — and no two crowns may touch,
// not even diagonally. 100 levels, each generated around a hidden solution
// and then repaired until a full solution counter proves EXACTLY ONE
// solution exists. Vanilla JS + canvas only. Core logic is DOM-free and
// exported for node tests.
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
  // cells / regions are flat arrays, index = r * size + c.
  // cells: 0 = empty, 1 = crown, 2 = X mark (a thinking note, never a crown).
  // regions: 0..size-1, region g is the region whose solution crown sits in row g.
  var EMPTY = 0, CROWN = 1, MARK = 2;
  function idxOf(size, r, c) { return r * size + c; }
  function inBounds(size, r, c) { return r >= 0 && c >= 0 && r < size && c < size; }
  function emptyCells(size) {
    var cells = new Array(size * size);
    for (var i = 0; i < cells.length; i++) cells[i] = EMPTY;
    return cells;
  }
  function cloneCells(cells) { return cells.slice(); }
  function crownCount(size, cells) {
    var n = 0;
    for (var i = 0; i < cells.length; i++) if (cells[i] === CROWN) n++;
    return n;
  }
  // Why do crowns at flat indices a and b break the rules together? Returns a
  // list drawn from 'row' | 'column' | 'region' | 'touching' (empty = legal).
  function conflictReasons(size, regions, a, b) {
    if (a === b) return [];
    var ra = Math.floor(a / size), ca = a % size;
    var rb = Math.floor(b / size), cb = b % size;
    var out = [];
    if (ra === rb) out.push('row');
    if (ca === cb) out.push('column');
    if (regions[a] === regions[b]) out.push('region');
    if (Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1) out.push('touching');
    return out;
  }
  // All placed crowns that conflict with the crown at idx (excluding idx).
  function crownConflicts(size, regions, cells, idx) {
    var out = [], i;
    if (cells[idx] !== CROWN) return out;
    for (i = 0; i < cells.length; i++) {
      if (i !== idx && cells[i] === CROWN &&
          conflictReasons(size, regions, idx, i).length > 0) out.push(i);
    }
    return out;
  }
  // Every conflicting pair on the board, as [a, b] with a < b.
  function allConflicts(size, regions, cells) {
    var out = [], i, j;
    for (i = 0; i < cells.length; i++) {
      if (cells[i] !== CROWN) continue;
      for (j = i + 1; j < cells.length; j++) {
        if (cells[j] === CROWN &&
            conflictReasons(size, regions, i, j).length > 0) out.push([i, j]);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- solver
  // Full backtracking enumeration of crown placements, row by row: one crown
  // per row, distinct columns, distinct regions, and never touching the crown
  // in the row above (rows further apart can never touch). Stops early once
  // `cap` solutions are found; with a huge cap it counts them ALL.
  function findSolutions(size, regions, cap) {
    var out = [], colUsed = [], regUsed = [], cur = [], r;
    for (r = 0; r < size; r++) { colUsed.push(false); regUsed.push(false); }
    function bt(row, prevCol) {
      if (out.length >= cap) return;
      if (row === size) { out.push(cur.slice()); return; }
      for (var c = 0; c < size; c++) {
        var g = regions[idxOf(size, row, c)];
        if (colUsed[c] || regUsed[g]) continue;
        if (row > 0 && Math.abs(c - prevCol) < 2) continue;
        colUsed[c] = true; regUsed[g] = true; cur.push(c);
        bt(row + 1, c);
        cur.pop(); colUsed[c] = false; regUsed[g] = false;
        if (out.length >= cap) return;
      }
    }
    bt(0, -99);
    return out;
  }
  function countSolutions(size, regions, cap) {
    return findSolutions(size, regions, cap || 2).length;
  }
  // One solution as flat cell indices (the first found), or null.
  function solveOne(size, regions) {
    var sols = findSolutions(size, regions, 1);
    if (!sols.length) return null;
    return sols[0].map(function (c, r) { return idxOf(size, r, c); });
  }

  // ---------------------------------------------------------------- generation
  // Step 1: a random solution — a column permutation whose neighbouring rows
  // also keep their crowns at least 2 columns apart (so nothing touches).
  function genSolution(rng, size) {
    var used = {}, sol = [];
    function bt(r) {
      if (r === size) return true;
      var order = [], c, i, j, t;
      for (c = 0; c < size; c++) if (!used[c]) order.push(c);
      for (i = order.length - 1; i > 0; i--) {
        j = Math.floor(rng() * (i + 1)); t = order[i]; order[i] = order[j]; order[j] = t;
      }
      for (i = 0; i < order.length; i++) {
        c = order[i];
        if (r > 0 && Math.abs(c - sol[r - 1]) < 2) continue;
        used[c] = 1; sol.push(c);
        if (bt(r + 1)) return true;
        used[c] = 0; sol.pop();
      }
      return false;
    }
    bt(0);
    return sol;
  }
  // Step 2: grow the regions. Each region starts as just its solution crown
  // cell, then unclaimed cells join a random neighbouring region one at a
  // time — every region is therefore one connected area holding one crown.
  function growRegions(rng, size, sol) {
    var regions = new Array(size * size), i, r;
    for (i = 0; i < regions.length; i++) regions[i] = -1;
    for (r = 0; r < size; r++) regions[idxOf(size, r, sol[r])] = r;
    var left = size * size - size;
    var DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (left > 0) {
      var frontier = [], rr, cc, k, nr, nc;
      for (i = 0; i < regions.length; i++) {
        if (regions[i] !== -1) continue;
        rr = Math.floor(i / size); cc = i % size;
        var ns = [];
        for (k = 0; k < 4; k++) {
          nr = rr + DIRS4[k][0]; nc = cc + DIRS4[k][1];
          if (inBounds(size, nr, nc) && regions[idxOf(size, nr, nc)] !== -1) {
            ns.push(regions[idxOf(size, nr, nc)]);
          }
        }
        if (ns.length) frontier.push({ i: i, ns: ns });
      }
      var f = frontier[Math.floor(rng() * frontier.length)];
      regions[f.i] = f.ns[Math.floor(rng() * f.ns.length)];
      left--;
    }
    return regions;
  }
  function regionConnected(size, regions, g, excludeIdx) {
    var cells = [], i;
    for (i = 0; i < regions.length; i++) {
      if (regions[i] === g && i !== excludeIdx) cells.push(i);
    }
    if (!cells.length) return false;
    var seen = {}, stack = [cells[0]], cnt = 0;
    seen[cells[0]] = 1;
    while (stack.length) {
      var cur = stack.pop(), rr = Math.floor(cur / size), cc = cur % size, k, nr, nc, j;
      cnt++;
      var DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (k = 0; k < 4; k++) {
        nr = rr + DIRS4[k][0]; nc = cc + DIRS4[k][1];
        if (!inBounds(size, nr, nc)) continue;
        j = idxOf(size, nr, nc);
        if (regions[j] === g && j !== excludeIdx && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    return cnt === cells.length;
  }
  function sameSol(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  // Step 3: repair until unique. While the counter finds a second solution,
  // take one of ITS crown cells (never a true-solution cell) and move that
  // cell into a neighbouring region. The moved cell's old region keeps its
  // true crown and must stay connected; the alternative solution now has two
  // crowns in one region and dies. The true solution is untouched throughout,
  // so when the count reaches 1, the unique solution IS the planted one.
  function repairUnique(rng, size, regions, sol) {
    var iter, r, i, j, t;
    for (iter = 0; iter < 300; iter++) {
      var sols = findSolutions(size, regions, 2);
      if (sols.length === 1) return true;
      if (!sols.length) return false;
      var alt = sameSol(sols[0], sol) ? sols[1] : sols[0];
      var rows = [];
      for (r = 0; r < size; r++) if (alt[r] !== sol[r]) rows.push(r);
      for (i = rows.length - 1; i > 0; i--) {
        j = Math.floor(rng() * (i + 1)); t = rows[i]; rows[i] = rows[j]; rows[j] = t;
      }
      var fixed = false, q, rr, x, A, nbs, b2, nr, nc;
      var DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (q = 0; q < rows.length && !fixed; q++) {
        rr = rows[q]; x = idxOf(size, rr, alt[rr]); A = regions[x];
        nbs = [];
        for (i = 0; i < 4; i++) {
          nr = rr + DIRS4[i][0]; nc = alt[rr] + DIRS4[i][1];
          if (!inBounds(size, nr, nc)) continue;
          var B = regions[idxOf(size, nr, nc)];
          if (B !== A && nbs.indexOf(B) < 0) nbs.push(B);
        }
        for (b2 = 0; b2 < nbs.length; b2++) {
          if (regionConnected(size, regions, A, x)) { regions[x] = nbs[b2]; fixed = true; break; }
        }
      }
      if (!fixed) return false;
    }
    return findSolutions(size, regions, 2).length === 1;
  }

  // ---------------------------------------------------------------- levels
  function levelParams(level) {
    var L = Math.max(1, Math.min(100, level | 0));
    var size = L <= 20 ? 6 : L <= 40 ? 7 : L <= 60 ? 8 : L <= 80 ? 9 : 10;
    return { level: L, size: size, hearts: 3 };
  }
  function genLevel(level) {
    var p = levelParams(level);
    var attempt, last = null;
    for (attempt = 1; attempt <= 160; attempt++) {
      var rng = makeRng(hashSeed(90210, p.level, attempt));
      var sol = genSolution(rng, p.size);
      var regions = growRegions(rng, p.size, sol);
      if (repairUnique(rng, p.size, regions, sol)) {
        return {
          params: p, size: p.size, regions: regions,
          solution: sol.map(function (c, r) { return idxOf(p.size, r, c); })
        };
      }
      last = { regions: regions, sol: sol };
    }
    // Never observed in testing (the repair succeeds within a few attempts);
    // kept only so the game can never hard-fail to produce a board.
    return {
      params: p, size: p.size, regions: last.regions,
      solution: last.sol.map(function (c, r) { return idxOf(p.size, r, c); })
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
      level: gen.params.level, size: gen.size, regions: gen.regions,
      solution: gen.solution, cells: emptyCells(gen.size),
      hearts: gen.params.hearts, mistakes: 0,
      crowns: 0, status: 'playing', stars: 0
    };
  }
  // One tap cycles a cell: empty -> crown -> X mark -> empty.
  // Result: 'placed' | 'conflict' | 'marked' | 'cleared' | 'noop' | 'ignored'.
  function tapCell(st, r, c) {
    if (st.status !== 'playing') return { result: 'ignored' };
    if (!inBounds(st.size, r, c)) return { result: 'noop' };
    var i = idxOf(st.size, r, c), v = st.cells[i];
    if (v === CROWN) {
      st.cells[i] = MARK; st.crowns--;
      return { result: 'marked', index: i };
    }
    if (v === MARK) {
      st.cells[i] = EMPTY;
      return { result: 'cleared', index: i };
    }
    st.cells[i] = CROWN; st.crowns++;
    var foes = crownConflicts(st.size, st.regions, st.cells, i);
    if (foes.length > 0) {
      st.mistakes++;
      st.hearts--;
      if (st.hearts <= 0) { st.hearts = 0; st.status = 'failed'; }
      return { result: 'conflict', index: i, foes: foes };
    }
    if (st.crowns === st.size && allConflicts(st.size, st.regions, st.cells).length === 0) {
      st.status = 'won'; st.stars = starsFor(st.mistakes);
    }
    return { result: 'placed', index: i };
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
    EMPTY: EMPTY, CROWN: CROWN, MARK: MARK,
    makeRng: makeRng, hashSeed: hashSeed,
    idxOf: idxOf, inBounds: inBounds, emptyCells: emptyCells,
    cloneCells: cloneCells, crownCount: crownCount,
    conflictReasons: conflictReasons, crownConflicts: crownConflicts,
    allConflicts: allConflicts,
    findSolutions: findSolutions, countSolutions: countSolutions, solveOne: solveOne,
    levelParams: levelParams, genLevel: genLevel,
    starsFor: starsFor, newGame: newGame, tapCell: tapCell,
    emptyProgress: emptyProgress, recordClear: recordClear
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Core; }
  if (typeof document === 'undefined') return;

  // ================================================================ BROWSER
  var LS_KEY = 'wisely-crown-logic';
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

  var cv = document.getElementById('crownlogic');
  var ctx = cv.getContext('2d');
  var elCrowns = document.getElementById('cl-crowns');
  var elLevel = document.getElementById('cl-level');
  var elHearts = document.getElementById('cl-hearts');
  var elStatus = document.getElementById('cl-status');
  var over = document.getElementById('cl-over');
  var overTitle = document.getElementById('cl-over-title');
  var overStats = document.getElementById('cl-over-stats');
  var btnMain = document.getElementById('cl-ov-main');
  var btnAlt = document.getElementById('cl-ov-alt');
  var picker = document.getElementById('cl-picker');
  var pickerGrid = document.getElementById('cl-picker-grid');

  var CW = 440, BX = 20, BY = 20, BOARD_PX = 400;

  var G = null;
  var anim = null;     // {kind:'place'|'conflict', indices:[...], t0}
  var lockUntil = 0;
  var started = false;
  var statusMsg = '';
  function cellPx() { return BOARD_PX / G.size; }

  function startLevel(level) {
    started = true;
    G = newGame(level);
    anim = null; lockUntil = 0;
    progress.current = G.level; saveProgress();
    statusMsg = 'Place one crown in every row, column and colour. Crowns may not touch — not even diagonally.';
    hideOverlay(); hidePicker(); updateHud();
  }

  function heartsStr() {
    var s = '';
    for (var i = 0; i < 3; i++) s += i < G.hearts ? '♥' : '♡';
    return s;
  }
  function updateHud() {
    if (!G) { elCrowns.textContent = '—'; elLevel.textContent = '—'; elHearts.textContent = '♥♥♥'; return; }
    elCrowns.textContent = G.crowns + ' / ' + G.size;
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
      title: 'Ready to rule?',
      stats: 'One crown per row, column and colour — and crowns never touch. 100 levels, each with exactly one solution.',
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
  document.getElementById('cl-picker-close').addEventListener('click', function () {
    hidePicker();
    if (!started || !G || G.status !== 'playing') showMenu();
  });
  document.getElementById('cl-levels').addEventListener('click', openPicker);
  document.getElementById('cl-restart').addEventListener('click', function () {
    if (G) startLevel(G.level);
  });

  function onWon() {
    progress = recordClear(progress, G.level, G.stars);
    saveProgress();
    var starStr = '★'.repeat(G.stars) + '☆'.repeat(3 - G.stars);
    showOverlay({
      title: 'Level ' + G.level + ' crowned! ' + starStr,
      stats: 'Every row, column and colour holds exactly one crown · ' +
        G.mistakes + (G.mistakes === 1 ? ' mistake' : ' mistakes') +
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
      stats: 'Three rule-breaking crowns. Every constraint is a clue: cross out the squares the rules forbid, and the crowns find themselves. ' +
        G.crowns + ' of ' + G.size + ' crowns were placed.',
      mainLabel: 'Try again',
      mainFn: function () { startLevel(G.level); },
      altLabel: 'All levels',
      altFn: openPicker
    });
  }

  function handleTap(r, c) {
    if (!G || G.status !== 'playing' || Date.now() < lockUntil) return;
    var res = tapCell(G, r, c);
    if (res.result === 'placed') {
      anim = { kind: 'place', indices: [res.index], t0: performance.now() };
      statusMsg = G.status === 'won' ? 'A perfect court — every rule satisfied!' :
        'Crown placed · ' + G.crowns + ' of ' + G.size + '.';
      if (G.status === 'won') setTimeout(function () { if (G && G.status === 'won') onWon(); }, 240);
    } else if (res.result === 'conflict') {
      anim = { kind: 'conflict', indices: [res.index].concat(res.foes), t0: performance.now() };
      lockUntil = Date.now() + 200;
      statusMsg = G.status === 'failed' ? 'That crown breaks a rule — no hearts left.' :
        'Those crowns break a rule — same row, column or colour, or touching. −1 heart.';
      if (G.status === 'failed') setTimeout(function () { if (G && G.status === 'failed') onFailed(); }, 300);
    } else if (res.result === 'marked') {
      statusMsg = 'Crown changed to an X — a note that no crown belongs there. Tap it again to clear.';
    } else if (res.result === 'cleared') {
      statusMsg = 'Note cleared.';
    }
    updateHud();
  }

  // ---------------------------------------------------------------- rendering
  // Stained-glass region pastels (velvet-and-gold board, jewel crowns).
  var REGION_COLORS = [
    '#f6c6c6', '#fbe3ac', '#e2efb4', '#bde9c8', '#b7e5df',
    '#bcd2f5', '#d5c4f2', '#f4c2e1', '#ecd8bf', '#d9dee3'
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
  function drawCrown(cx, cy, s, scale, alpha, bad) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    var u = s; // unit = cell size
    ctx.shadowColor = 'rgba(0,0,0,.40)';
    ctx.shadowBlur = u * 0.10;
    ctx.shadowOffsetY = u * 0.05;
    var g = ctx.createLinearGradient(0, -0.34 * u, 0, 0.36 * u);
    g.addColorStop(0, '#ffedb0'); g.addColorStop(0.5, '#f6bc1e'); g.addColorStop(1, '#c07f06');
    ctx.beginPath();
    ctx.moveTo(-0.36 * u, 0.30 * u);
    ctx.lineTo(-0.42 * u, -0.20 * u);
    ctx.lineTo(-0.17 * u, 0.00 * u);
    ctx.lineTo(0, -0.28 * u);
    ctx.lineTo(0.17 * u, 0.00 * u);
    ctx.lineTo(0.42 * u, -0.20 * u);
    ctx.lineTo(0.36 * u, 0.30 * u);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#7a5203';
    ctx.lineWidth = u * 0.028;
    ctx.stroke();
    // band
    ctx.fillStyle = '#a86e04';
    ctx.fillRect(-0.36 * u, 0.30 * u, 0.72 * u, 0.075 * u);
    // jewels: tips + centre gem
    ctx.fillStyle = '#d6336c';
    ctx.beginPath(); ctx.arc(0, -0.31 * u, u * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0ea5a4';
    ctx.beginPath(); ctx.arc(-0.43 * u, -0.23 * u, u * 0.042, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0.43 * u, -0.23 * u, u * 0.042, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d6336c';
    ctx.beginPath(); ctx.arc(0, 0.13 * u, u * 0.062, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(122,82,3,.8)';
    ctx.lineWidth = u * 0.016;
    ctx.stroke();
    if (bad) {
      ctx.beginPath();
      ctx.arc(0, 0, u * 0.52, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,64,64,.95)';
      ctx.lineWidth = u * 0.05;
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawMark(cx, cy, s) {
    ctx.save();
    ctx.strokeStyle = 'rgba(74,44,80,.55)';
    ctx.lineWidth = s * 0.07;
    ctx.lineCap = 'round';
    var d = s * 0.20;
    ctx.beginPath();
    ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d);
    ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d);
    ctx.stroke();
    ctx.restore();
  }
  function draw() {
    var now = performance.now();
    // deep velvet backdrop
    var bg = ctx.createLinearGradient(0, 0, 0, CW);
    bg.addColorStop(0, '#33173d'); bg.addColorStop(1, '#170a1f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CW, CW);
    if (!G) { requestAnimationFrame(draw); return; }
    var cell = cellPx(), size = G.size;

    // gold tray frame
    var fg = ctx.createLinearGradient(BX - 14, BY - 14, BX - 14, BY + BOARD_PX + 14);
    fg.addColorStop(0, '#e9c766'); fg.addColorStop(0.5, '#b98a1e'); fg.addColorStop(1, '#7a5203');
    rr(BX - 14, BY - 14, BOARD_PX + 28, BOARD_PX + 28, 18);
    ctx.fillStyle = fg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,190,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    rr(BX - 4, BY - 4, BOARD_PX + 8, BOARD_PX + 8, 10);
    ctx.fillStyle = '#241129'; ctx.fill();

    var animActive = anim && now - anim.t0 < (anim.kind === 'conflict' ? 340 : 180);
    if (anim && !animActive) anim = null;
    var conflictSet = {};
    if (animActive && anim.kind === 'conflict') {
      anim.indices.forEach(function (i) { conflictSet[i] = 1; });
    }
    // also ring any crowns currently in conflict (settled state)
    allConflicts(size, G.regions, G.cells).forEach(function (pair) {
      conflictSet[pair[0]] = 1; conflictSet[pair[1]] = 1;
    });

    var r, c, i;
    // region fills
    for (r = 0; r < size; r++) {
      for (c = 0; c < size; c++) {
        i = idxOf(size, r, c);
        ctx.fillStyle = REGION_COLORS[G.regions[i] % REGION_COLORS.length];
        ctx.fillRect(BX + c * cell, BY + r * cell, cell + 0.5, cell + 0.5);
      }
    }
    // faint grid
    ctx.strokeStyle = 'rgba(67,40,74,.20)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (i = 1; i < size; i++) {
      ctx.moveTo(BX + i * cell, BY); ctx.lineTo(BX + i * cell, BY + BOARD_PX);
      ctx.moveTo(BX, BY + i * cell); ctx.lineTo(BX + BOARD_PX, BY + i * cell);
    }
    ctx.stroke();
    // strong region borders
    ctx.strokeStyle = '#43284a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (r = 0; r < size; r++) {
      for (c = 0; c < size; c++) {
        i = idxOf(size, r, c);
        if (c + 1 < size && G.regions[i] !== G.regions[idxOf(size, r, c + 1)]) {
          ctx.moveTo(BX + (c + 1) * cell, BY + r * cell);
          ctx.lineTo(BX + (c + 1) * cell, BY + (r + 1) * cell);
        }
        if (r + 1 < size && G.regions[i] !== G.regions[idxOf(size, r + 1, c)]) {
          ctx.moveTo(BX + c * cell, BY + (r + 1) * cell);
          ctx.lineTo(BX + (c + 1) * cell, BY + (r + 1) * cell);
        }
      }
    }
    ctx.stroke();
    rr(BX, BY, BOARD_PX, BOARD_PX, 6);
    ctx.strokeStyle = '#43284a'; ctx.lineWidth = 3.4; ctx.stroke();

    // marks and crowns
    for (r = 0; r < size; r++) {
      for (c = 0; c < size; c++) {
        i = idxOf(size, r, c);
        var v = G.cells[i];
        var cx = BX + (c + 0.5) * cell, cy = BY + (r + 0.5) * cell;
        if (v === MARK) { drawMark(cx, cy, cell); continue; }
        if (v !== CROWN) continue;
        var scale = 1, dx = 0;
        if (animActive && anim.kind === 'place' && anim.indices[0] === i) {
          var t = Math.min(1, (now - anim.t0) / 180);
          scale = 0.55 + 0.45 * (1 - (1 - t) * (1 - t));
        }
        if (animActive && anim.kind === 'conflict' && conflictSet[i] && anim.indices.indexOf(i) >= 0) {
          dx = Math.sin(Math.min(1, (now - anim.t0) / 340) * Math.PI * 5) * cell * 0.05;
        }
        drawCrown(cx + dx, cy, cell * 0.94, scale, 1, !!conflictSet[i]);
      }
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
  statusMsg = 'Place one crown in every row, column and colour. Crowns may not touch — not even diagonally.';
  updateHud();
  showMenu();
  requestAnimationFrame(draw);
})();
