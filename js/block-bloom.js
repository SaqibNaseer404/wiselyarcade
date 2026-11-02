// Block Bloom — original block puzzle for Wisely Arcade.
// Drag (or tap-tap) pieces onto an 8x8 board; full rows AND columns clear.
// Two ways to play: Endless (best score) and a 100-level climb with targets.
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

  // ---------------------------------------------------------------- shapes
  // Every shape: list of [r,c] cells + bounding box. No shape is copied from
  // any other game — these are generic polyominoes drawn in our own style.
  function S(cells) {
    var h = 0, w = 0, i;
    for (i = 0; i < cells.length; i++) { h = Math.max(h, cells[i][0] + 1); w = Math.max(w, cells[i][1] + 1); }
    return { cells: cells, h: h, w: w, n: cells.length };
  }
  var SMALL = [
    S([[0, 0]]),                                   // single
    S([[0, 0], [0, 1]]), S([[0, 0], [1, 0]]),      // dominoes
    S([[0, 0], [0, 1], [0, 2]]), S([[0, 0], [1, 0], [2, 0]]), // triomino lines
    S([[0, 0], [0, 1], [1, 0]]), S([[0, 0], [0, 1], [1, 1]]),
    S([[0, 0], [1, 0], [1, 1]]), S([[0, 1], [1, 0], [1, 1]]), // corner trominoes
    S([[0, 0], [0, 1], [1, 0], [1, 1]])            // 2x2 square
  ];
  var MEDIUM = [
    S([[0, 0], [0, 1], [0, 2], [0, 3]]), S([[0, 0], [1, 0], [2, 0], [3, 0]]), // line 4
    S([[0, 0], [1, 0], [2, 0], [2, 1]]), S([[0, 0], [1, 0], [1, 1], [1, 2]]),
    S([[0, 0], [0, 1], [0, 2], [1, 0]]), S([[0, 0], [0, 1], [0, 2], [1, 2]]),
    S([[0, 1], [1, 1], [2, 0], [2, 1]]), S([[0, 0], [0, 1], [1, 1], [2, 1]]),
    S([[0, 0], [0, 1], [0, 2], [1, 1]]), S([[0, 1], [1, 0], [1, 1], [1, 2]]),
    S([[0, 1], [1, 0], [1, 1], [2, 1]]), S([[0, 0], [1, 0], [1, 1], [2, 0]]), // T tetrominoes
    S([[0, 1], [0, 2], [1, 0], [1, 1]]), S([[0, 0], [1, 0], [1, 1], [2, 1]])  // skew
  ];
  var LARGE = [
    S([[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]), S([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]), // line 5
    S([[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]]), S([[0, 0], [0, 1], [1, 0], [1, 1], [2, 1]]), // P pentominoes
    S([[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]]), S([[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]]), // T5 + plus
    S([[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]]),                                            // U
    S([[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]]), S([[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]]), // big corners
    S([[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]]),                                    // 2x3 slab
    S([[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]])                                     // 3x2 slab
  ];
  var COLORS = 7;

  // Pool mix by climb tier. Weights are [small, medium, large].
  function tierWeights(level) {
    if (level <= 0) return [3, 4, 1];        // endless: friendly mix
    if (level <= 20) return [5, 3, 0];
    if (level <= 45) return [4, 5, 1];
    if (level <= 75) return [3, 5, 3];
    return [3, 5, 2];
  }
  function pickShape(rng, level) {
    var w = tierWeights(level);
    var pools = [SMALL, MEDIUM, LARGE];
    var total = w[0] + w[1] + w[2], roll = rng() * total, pi = 0;
    while (roll >= w[pi]) { roll -= w[pi]; pi++; }
    var pool = pools[pi];
    return pool[Math.floor(rng() * pool.length)];
  }
  function dealSet(rng, level) {
    var out = [], i, larges = 0;
    for (i = 0; i < 3; i++) {
      var shape = pickShape(rng, level);
      if (shape.n >= 5) {
        larges++;
        if (larges > 1) { // fairness cap: never more than one big piece per set
          var guard = 0;
          while (shape.n >= 5 && guard < 12) { shape = pickShape(rng, level); guard++; }
          if (shape.n >= 5) shape = SMALL[Math.floor(rng() * SMALL.length)];
        }
      }
      out.push({ shape: shape, color: Math.floor(rng() * COLORS) });
    }
    return out;
  }
  // Fair dealing for live play: re-deal (on the same rng stream) until at
  // least one offered piece fits the current board, so a fresh set is never
  // dead on arrival. Stuck boards can still develop from the player's own
  // placements — that is the game.
  function dealPlayableSet(rng, level, board) {
    var filled = filledCount(board);
    var best = null, bestFits = -1, tries = 0;
    while (tries < 40) {
      var set = dealSet(rng, level);
      var fits = 0, i;
      for (i = 0; i < set.length; i++) if (fitsAnywhere(board, set[i].shape)) fits++;
      if (fits > bestFits) { best = set; bestFits = fits; }
      if (fits >= 2 || (filled <= 8 && fits >= 1) || fits === 3) return set;
      tries++;
    }
    return best;
  }

  // ---------------------------------------------------------------- board
  var N = 8;
  function emptyBoard() {
    var b = [], r, c;
    for (r = 0; r < N; r++) { b.push([]); for (c = 0; c < N; c++) b[r].push(-1); }
    return b;
  }
  function cloneBoard(b) { return b.map(function (row) { return row.slice(); }); }
  function canPlace(board, shape, br, bc) {
    var i, r, c;
    for (i = 0; i < shape.cells.length; i++) {
      r = br + shape.cells[i][0]; c = bc + shape.cells[i][1];
      if (r < 0 || c < 0 || r >= N || c >= N || board[r][c] !== -1) return false;
    }
    return true;
  }
  function fitsAnywhere(board, shape) {
    var r, c;
    for (r = 0; r <= N - shape.h; r++) for (c = 0; c <= N - shape.w; c++) {
      if (canPlace(board, shape, r, c)) return true;
    }
    return false;
  }
  function anyFit(board, pieces) {
    for (var i = 0; i < pieces.length; i++) {
      if (pieces[i] && fitsAnywhere(board, pieces[i].shape)) return true;
    }
    return false;
  }
  function findClears(board) {
    var rows = [], cols = [], r, c, full;
    for (r = 0; r < N; r++) {
      full = true;
      for (c = 0; c < N; c++) if (board[r][c] === -1) { full = false; break; }
      if (full) rows.push(r);
    }
    for (c = 0; c < N; c++) {
      full = true;
      for (r = 0; r < N; r++) if (board[r][c] === -1) { full = false; break; }
      if (full) cols.push(c);
    }
    return { rows: rows, cols: cols, count: rows.length + cols.length };
  }
  // Place a piece: returns {board, gained, lines} or null when illegal.
  function place(board, piece, br, bc) {
    if (!canPlace(board, piece.shape, br, bc)) return null;
    var b = cloneBoard(board), i;
    for (i = 0; i < piece.shape.cells.length; i++) {
      b[br + piece.shape.cells[i][0]][bc + piece.shape.cells[i][1]] = piece.color;
    }
    var cl = findClears(b);
    var gained = piece.shape.n + (cl.count > 0 ? cl.count * cl.count * 10 : 0);
    if (cl.count > 0) {
      cl.rows.forEach(function (r) { for (var c = 0; c < N; c++) b[r][c] = -1; });
      cl.cols.forEach(function (c) { for (var r = 0; r < N; r++) b[r][c] = -1; });
    }
    return { board: b, gained: gained, lines: cl.count, clears: cl };
  }
  function filledCount(board) {
    var n = 0, r, c;
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (board[r][c] !== -1) n++;
    return n;
  }

  // ---------------------------------------------------------------- levels
  function levelParams(level) {
    var L = Math.max(1, Math.min(100, level | 0));
    var prefill = L <= 10 ? 0 : Math.min(16, Math.floor((L - 10) * 16 / 90) + 2);
    var setsTotal = 6 + Math.ceil(L / 8) + (L >= 60 ? 1 : 0) + (L >= 85 ? 1 : 0);
    var targetScore = 30 + Math.round(1.5 * (L - 1)) + Math.floor((L - 1) * (L - 1) / 80);
    var targetLines = (L % 3 === 0) ? 1 + Math.floor(L / 9) : 0;
    return { level: L, prefill: prefill, setsTotal: setsTotal, targetScore: targetScore, targetLines: targetLines };
  }
  // Deterministic pre-filled board for a level. Invariants: exactly `prefill`
  // cells, no row or column over 5 filled, no full line, and at least one
  // piece from the level's first dealt set fits somewhere.
  // Three endgame levels drew deal streams that even a look-ahead test bot
  // could not survive (43-73 pts vs ~270 targets); their seeds are nudged by
  // these fixed offsets, found and verified with that same bot at build time.
  var SEED_TWEAKS = { 91: 1, 93: 2, 94: 1 };
  function genLevel(level) {
    var p = levelParams(level);
    var dealSeed = hashSeed(977, p.level * 31 + 7 + (SEED_TWEAKS[p.level] || 0));
    var firstSet = dealSet(makeRng(dealSeed), p.level);
    var board = emptyBoard(), tries = 0;
    while (tries < 400) {
      tries++;
      var rng = makeRng(hashSeed(31337, p.level, tries));
      board = emptyBoard();
      var rowFill = [0, 0, 0, 0, 0, 0, 0, 0], colFill = [0, 0, 0, 0, 0, 0, 0, 0];
      var placedCells = 0, guard = 0;
      while (placedCells < p.prefill && guard < 500) {
        guard++;
        var r = Math.floor(rng() * N), c = Math.floor(rng() * N);
        if (board[r][c] !== -1 || rowFill[r] >= 5 || colFill[c] >= 5) continue;
        board[r][c] = Math.floor(rng() * COLORS);
        rowFill[r]++; colFill[c]++; placedCells++;
      }
      if (placedCells < p.prefill) continue;
      if (findClears(board).count > 0) continue;
      if (p.prefill > 0 && !anyFit(board, firstSet)) continue;
      break;
    }
    return { params: p, board: board, dealSeed: dealSeed };
  }
  function starsFor(params, setsUsed) {
    if (setsUsed <= Math.ceil(params.setsTotal * 0.4)) return 3;
    if (setsUsed <= Math.ceil(params.setsTotal * 0.65)) return 2;
    return 1;
  }

  var Core = {
    N: N, COLORS: COLORS, SMALL: SMALL, MEDIUM: MEDIUM, LARGE: LARGE,
    makeRng: makeRng, hashSeed: hashSeed, dealSet: dealSet, dealPlayableSet: dealPlayableSet, pickShape: pickShape,
    emptyBoard: emptyBoard, cloneBoard: cloneBoard, canPlace: canPlace,
    fitsAnywhere: fitsAnywhere, anyFit: anyFit, findClears: findClears,
    place: place, filledCount: filledCount,
    levelParams: levelParams, genLevel: genLevel, starsFor: starsFor
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Core; }
  if (typeof document === 'undefined') return;

  // ================================================================ BROWSER
  var LS_KEY = 'wisely-block-bloom';
  var progress = { unlocked: 1, current: 1, stars: {}, best: 0 };
  try {
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved) {
      progress.unlocked = Math.max(1, Math.min(100, saved.unlocked || 1));
      progress.current = Math.max(1, Math.min(100, saved.current || progress.unlocked));
      progress.stars = saved.stars || {};
      progress.best = saved.best || 0;
    }
  } catch (e) { /* private mode: play without saving */ }
  function saveProgress() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(progress)); } catch (e) {}
  }

  var cv = document.getElementById('bbloom');
  var ctx = cv.getContext('2d');
  var elScore = document.getElementById('bb-score');
  var elLevel = document.getElementById('bb-level');
  var elBest = document.getElementById('bb-best');
  var elStatus = document.getElementById('bb-status');
  var over = document.getElementById('bb-over');
  var overTitle = document.getElementById('bb-over-title');
  var overStats = document.getElementById('bb-over-stats');
  var btnMain = document.getElementById('bb-ov-main');
  var btnAlt = document.getElementById('bb-ov-alt');
  var picker = document.getElementById('bb-picker');
  var pickerGrid = document.getElementById('bb-picker-grid');

  // Canvas layout (internal resolution 440x600, CSS scales it).
  var CW = 440, BX = 20, BY = 20, CELL = 50, BOARD_PX = CELL * N; // board: 20..420
  var TRAY_Y = 452, TRAY_H = 128, SLOT_W = CW / 3;

  var G = null; // game state
  function newState() {
    return {
      mode: 'menu', board: emptyBoard(), tray: [null, null, null],
      score: 0, lines: 0, rng: makeRng(1), level: 0, params: null,
      setsUsed: 0, over: true, selected: -1, drag: null, hover: null,
      anim: null, lockUntil: 0
    };
  }
  G = newState();

  function dealTray() {
    G.tray = dealPlayableSet(G.rng, G.mode === 'level' ? G.level : 0, G.board);
    if (G.mode === 'level') G.setsUsed++;
    G.selected = -1; G.drag = null;
  }
  function setsLeft() { return G.params ? G.params.setsTotal - G.setsUsed : 0; }

  function startEndless() {
    G = newState();
    G.mode = 'endless'; G.over = false;
    G.rng = makeRng((Date.now() % 2147483647) || 1);
    dealTray();
    hideOverlay(); updateHud();
  }
  function startLevel(level) {
    var gen = genLevel(level);
    G = newState();
    G.mode = 'level'; G.over = false;
    G.level = gen.params.level; G.params = gen.params;
    G.board = gen.board;
    G.rng = makeRng(gen.dealSeed);
    progress.current = G.level; saveProgress();
    dealTray();
    hideOverlay(); hidePicker(); updateHud();
  }

  function targetMet() {
    if (!G.params) return false;
    if (G.score < G.params.targetScore) return false;
    if (G.params.targetLines > 0 && G.lines < G.params.targetLines) return false;
    return true;
  }

  function afterTrayEmpty() {
    if (G.mode === 'endless') { dealTray(); checkStuck(); return; }
    if (G.setsUsed < G.params.setsTotal) { dealTray(); checkStuck(); return; }
    levelFail('Out of pieces — the target slipped away this time.');
  }
  function checkStuck() {
    var remaining = G.tray.filter(function (p) { return p; });
    if (remaining.length === 0) return;
    if (!anyFit(G.board, remaining)) {
      if (G.mode === 'endless') endlessOver();
      else levelFail('No piece fits anywhere — the grid filled up in the wrong places.');
    }
  }

  function tryPlace(idx, br, bc) {
    if (G.over || Date.now() < G.lockUntil) return false;
    var piece = G.tray[idx];
    if (!piece) return false;
    var pre = cloneBoard(G.board);
    var i, r, c;
    for (i = 0; i < piece.shape.cells.length; i++) {
      r = br + piece.shape.cells[i][0]; c = bc + piece.shape.cells[i][1];
      if (r < 0 || c < 0 || r >= N || c >= N) return false;
      pre[r][c] = piece.color;
    }
    var res = place(G.board, piece, br, bc);
    if (!res) return false;
    var placedCells = piece.shape.cells.map(function (cell) {
      return { r: br + cell[0], c: bc + cell[1], t0: performance.now() };
    });
    G.board = res.board;
    G.score += res.gained;
    G.lines += res.lines;
    G.tray[idx] = null;
    G.selected = -1; G.drag = null;
    if (res.lines > 0) {
      G.anim = { pre: pre, rows: res.clears.rows, cols: res.clears.cols, t0: performance.now(), placed: placedCells };
      G.lockUntil = Date.now() + 330;
    } else {
      G.anim = { pre: null, rows: [], cols: [], t0: performance.now(), placed: placedCells };
    }
    updateHud();
    if (G.mode === 'level' && targetMet()) { levelClear(); return true; }
    if (G.tray.every(function (p) { return !p; })) afterTrayEmpty();
    else checkStuck();
    updateHud();
    return true;
  }

  function levelClear() {
    G.over = true;
    var stars = starsFor(G.params, G.setsUsed);
    var key = String(G.level);
    if (!progress.stars[key] || progress.stars[key] < stars) progress.stars[key] = stars;
    if (G.level >= progress.unlocked && G.level < 100) progress.unlocked = G.level + 1;
    if (G.level < 100) progress.current = G.level + 1;
    saveProgress();
    var starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    showOverlay({
      title: 'Level ' + G.level + ' cleared! ' + starStr,
      stats: 'Score ' + G.score + ' · Lines ' + G.lines + ' · Sets used ' + G.setsUsed + ' of ' + G.params.setsTotal,
      mainLabel: G.level < 100 ? 'Next level ▶' : 'Play level 100 again',
      mainFn: function () { startLevel(G.level < 100 ? G.level + 1 : 100); },
      altLabel: 'All levels',
      altFn: openPicker
    });
  }
  function levelFail(reason) {
    if (G.over) return;
    G.over = true;
    showOverlay({
      title: 'Level ' + G.level + ' — not yet',
      stats: reason + ' Score ' + G.score + ' of ' + G.params.targetScore +
        (G.params.targetLines ? ' · Lines ' + G.lines + ' of ' + G.params.targetLines : ''),
      mainLabel: 'Try again',
      mainFn: function () { startLevel(G.level); },
      altLabel: 'All levels',
      altFn: openPicker
    });
  }
  function endlessOver() {
    if (G.over) return;
    G.over = true;
    var isBest = G.score > progress.best;
    if (isBest) { progress.best = G.score; saveProgress(); }
    showOverlay({
      title: isBest ? 'New best score! 🏆' : 'No more moves',
      stats: 'Score ' + G.score + ' · Lines cleared ' + G.lines + ' · Best ' + progress.best,
      mainLabel: 'Play again',
      mainFn: startEndless,
      altLabel: 'Level mode',
      altFn: function () { startLevel(progress.current); }
    });
  }

  // ---------------------------------------------------------------- HUD / overlays
  function updateHud() {
    elScore.textContent = G.score;
    elLevel.textContent = G.mode === 'level' ? G.level : (G.mode === 'endless' ? '∞' : '—');
    elBest.textContent = progress.best > 0 ? progress.best : '—';
    if (G.mode === 'level' && G.params) {
      elStatus.textContent = 'Target: ' + G.score + '/' + G.params.targetScore + ' pts' +
        (G.params.targetLines ? ' · Lines ' + G.lines + '/' + G.params.targetLines : '') +
        ' · Sets left: ' + setsLeft();
    } else if (G.mode === 'endless') {
      elStatus.textContent = 'Endless — lines cleared: ' + G.lines + ' · Best ' + progress.best;
    } else {
      elStatus.textContent = 'Pick a mode to start blooming.';
    }
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
  document.getElementById('bb-picker-close').addEventListener('click', function () {
    hidePicker();
    if (G.mode === 'menu' || G.over) showMenu();
  });
  document.getElementById('bb-levels').addEventListener('click', openPicker);
  document.getElementById('bb-restart').addEventListener('click', function () {
    if (G.mode === 'level') startLevel(G.level);
    else if (G.mode === 'endless') startEndless();
  });

  function showMenu() {
    showOverlay({
      title: 'Ready to bloom?',
      stats: 'Clear full rows and columns. 100 levels of rising targets — or endless play against your best score.',
      mainLabel: '▶ Level ' + progress.current,
      mainFn: function () { startLevel(progress.current); },
      altLabel: '∞ Endless mode',
      altFn: startEndless
    });
  }

  // ---------------------------------------------------------------- rendering
  var PALETTE = [
    ['#ff9d85', '#e74c3c', '#8e2418'], // ruby
    ['#ffe08a', '#f5a623', '#9a6204'], // amber
    ['#93f2b6', '#27ae60', '#14532d'], // emerald
    ['#93ccff', '#2e86de', '#123f67'], // sapphire
    ['#dfaaff', '#8e44ad', '#46205c'], // amethyst
    ['#93f7ee', '#12a594', '#0a4f45'], // teal
    ['#ffb9d6', '#e84393', '#751c47']  // rose
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
  function drawBlock(x, y, size, color, scale, alpha) {
    var p = PALETTE[color];
    var s = size * (scale || 1);
    var ox = x + (size - s) / 2, oy = y + (size - s) / 2;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.shadowColor = 'rgba(0,0,0,.38)';
    ctx.shadowBlur = size * 0.14;
    ctx.shadowOffsetY = size * 0.07;
    var g = ctx.createLinearGradient(ox, oy, ox, oy + s);
    g.addColorStop(0, p[0]); g.addColorStop(0.45, p[1]); g.addColorStop(1, p[2]);
    rr(ox, oy, s, s, s * 0.2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    var hg = ctx.createLinearGradient(ox, oy, ox, oy + s * 0.55);
    hg.addColorStop(0, 'rgba(255,255,255,.5)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    rr(ox + s * 0.09, oy + s * 0.07, s * 0.82, s * 0.5, s * 0.16);
    ctx.fillStyle = hg;
    ctx.fill();
    rr(ox, oy, s, s, s * 0.2);
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ox + s * 0.3, oy + s * 0.26, s * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fill();
    ctx.restore();
  }
  function trayGeom(i, shape) {
    var ts = Math.min(26, (SLOT_W - 40) / shape.w, (TRAY_H - 46) / shape.h);
    var cx = i * SLOT_W + SLOT_W / 2;
    var cy = TRAY_Y + TRAY_H / 2;
    return { ts: ts, ox: cx - (shape.w * ts) / 2, oy: cy - (shape.h * ts) / 2 };
  }
  function draw() {
    var now = performance.now();
    var bg = ctx.createLinearGradient(0, 0, 0, 600);
    bg.addColorStop(0, '#17404d'); bg.addColorStop(1, '#0a1f28');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CW, 600);
    var glow = ctx.createRadialGradient(220, 220, 40, 220, 220, 330);
    glow.addColorStop(0, 'rgba(120,220,200,.16)'); glow.addColorStop(1, 'rgba(120,220,200,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CW, 600);

    // polished wooden frame + board well
    var wg = ctx.createLinearGradient(BX - 12, BY - 12, BX - 12, BY + BOARD_PX + 12);
    wg.addColorStop(0, '#9c6b32'); wg.addColorStop(0.5, '#7a5224'); wg.addColorStop(1, '#54370f');
    rr(BX - 12, BY - 12, BOARD_PX + 24, BOARD_PX + 24, 16);
    ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,150,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    rr(BX - 3, BY - 3, BOARD_PX + 6, BOARD_PX + 6, 10);
    ctx.fillStyle = '#0e2733'; ctx.fill();

    var anim = (G.anim && now - G.anim.t0 < 340) ? G.anim : null;
    var boardToDraw = anim && anim.pre ? anim.pre : G.board;
    var placedMap = {};
    if (anim) anim.placed.forEach(function (pc) { placedMap[pc.r + ',' + pc.c] = pc.t0; });
    var r, c;
    for (r = 0; r < N; r++) {
      for (c = 0; c < N; c++) {
        var x = BX + c * CELL, y = BY + r * CELL;
        rr(x + 2, y + 2, CELL - 4, CELL - 4, 8);
        ctx.fillStyle = 'rgba(255,255,255,.045)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.07)';
        ctx.lineWidth = 1; ctx.stroke();
        var v = boardToDraw[r][c];
        if (v !== -1) {
          var scale = 1;
          var pt = placedMap[r + ',' + c];
          if (pt && now - pt < 200) { var k = (now - pt) / 200; scale = 0.72 + 0.28 * (1 - (1 - k) * (1 - k)); }
          drawBlock(x + 2, y + 2, CELL - 4, v, scale, 1);
        }
      }
    }
    // light sweep over cleared lines
    if (anim && (anim.rows.length || anim.cols.length)) {
      var p = Math.min(1, (now - anim.t0) / 330);
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.85;
      anim.rows.forEach(function (row) {
        var y0 = BY + row * CELL;
        var grad = ctx.createLinearGradient(BX + p * (BOARD_PX + 90) - 90, 0, BX + p * (BOARD_PX + 90), 0);
        grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(1, 'rgba(255,255,255,.9)');
        ctx.fillStyle = grad;
        ctx.fillRect(BX, y0, BOARD_PX, CELL);
      });
      anim.cols.forEach(function (col) {
        var x0 = BX + col * CELL;
        var grad2 = ctx.createLinearGradient(0, BY + p * (BOARD_PX + 90) - 90, 0, BY + p * (BOARD_PX + 90));
        grad2.addColorStop(0, 'rgba(255,255,255,0)'); grad2.addColorStop(1, 'rgba(255,255,255,.9)');
        ctx.fillStyle = grad2;
        ctx.fillRect(x0, BY, CELL, BOARD_PX);
      });
      ctx.restore();
    }
    // placement ghost (selected hover or drag)
    var ghost = null;
    if (!G.over && G.drag && G.drag.active) {
      var cell = boardCellAt(G.drag.x, G.drag.y);
      if (cell) ghost = { idx: G.drag.idx, br: cell.r - G.drag.grabR, bc: cell.c - G.drag.grabC };
    } else if (!G.over && G.selected >= 0 && G.hover && G.tray[G.selected]) {
      var sh = G.tray[G.selected].shape;
      ghost = { idx: G.selected, br: G.hover.r - Math.floor((sh.h - 1) / 2), bc: G.hover.c - Math.floor((sh.w - 1) / 2) };
    }
    if (ghost && G.tray[ghost.idx]) {
      var gsh = G.tray[ghost.idx].shape;
      var ok = canPlace(G.board, gsh, ghost.br, ghost.bc);
      gsh.cells.forEach(function (cell2) {
        var gx = BX + (ghost.bc + cell2[1]) * CELL, gy = BY + (ghost.br + cell2[0]) * CELL;
        if (gx < BX - CELL || gy < BY - CELL || gx > BX + BOARD_PX || gy > BY + BOARD_PX) return;
        drawBlock(gx + 2, gy + 2, CELL - 4, G.tray[ghost.idx].color, 1, 0.45);
        rr(gx + 2, gy + 2, CELL - 4, CELL - 4, 8);
        ctx.strokeStyle = ok ? 'rgba(120,255,170,.95)' : 'rgba(255,90,90,.95)';
        ctx.lineWidth = 2.4; ctx.stroke();
      });
    }
    // tray panel
    rr(8, TRAY_Y, CW - 16, TRAY_H, 14);
    ctx.fillStyle = 'rgba(10,24,32,.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1.2; ctx.stroke();
    for (var i = 0; i < 3; i++) {
      var piece = G.tray[i];
      var sx = i * SLOT_W;
      if (G.selected === i || (G.drag && G.drag.idx === i)) {
        rr(sx + 10, TRAY_Y + 10, SLOT_W - 20, TRAY_H - 20, 12);
        ctx.strokeStyle = 'rgba(245,166,35,.9)'; ctx.lineWidth = 2.4; ctx.stroke();
      }
      if (!piece) continue;
      var gm = trayGeom(i, piece.shape);
      var dim = G.drag && G.drag.idx === i && G.drag.active;
      piece.shape.cells.forEach(function (cell3) {
        drawBlock(gm.ox + cell3[1] * gm.ts, gm.oy + cell3[0] * gm.ts - (G.selected === i && !dim ? 3 : 0), gm.ts, piece.color, 1, dim ? 0.3 : 1);
      });
    }
    // floating drag piece under the finger/cursor
    if (G.drag && G.drag.active && G.tray[G.drag.idx]) {
      var dp = G.tray[G.drag.idx];
      var fx = G.drag.x - (G.drag.grabC + 0.5) * CELL;
      var fy = G.drag.y - (G.drag.grabR + 0.5) * CELL;
      dp.shape.cells.forEach(function (cell4) {
        drawBlock(fx + cell4[1] * CELL + 2, fy + cell4[0] * CELL + 2, CELL - 4, dp.color, 1, 0.96);
      });
    }
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
    if (x < BX || y < BY || x >= BX + BOARD_PX || y >= BY + BOARD_PX) return null;
    return { r: Math.floor((y - BY) / CELL), c: Math.floor((x - BX) / CELL) };
  }
  function traySlotAt(x, y) {
    if (y < TRAY_Y || y > TRAY_Y + TRAY_H) return -1;
    return Math.max(0, Math.min(2, Math.floor(x / SLOT_W)));
  }
  cv.addEventListener('pointerdown', function (e) {
    if (G.over) return;
    e.preventDefault();
    var pos = canvasPos(e);
    var slot = traySlotAt(pos.x, pos.y);
    if (slot >= 0 && G.tray[slot]) {
      G.selected = slot;
      var shape = G.tray[slot].shape;
      var gm = trayGeom(slot, shape);
      var gc = Math.floor((pos.x - gm.ox) / gm.ts), gr = Math.floor((pos.y - gm.oy) / gm.ts);
      if (gc < 0 || gr < 0 || gc >= shape.w || gr >= shape.h) {
        gr = Math.floor((shape.h - 1) / 2); gc = Math.floor((shape.w - 1) / 2);
      }
      G.drag = { idx: slot, grabR: gr, grabC: gc, x: pos.x, y: pos.y, active: false };
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      return;
    }
    var cell = boardCellAt(pos.x, pos.y);
    if (cell && G.selected >= 0 && G.tray[G.selected]) {
      var sh2 = G.tray[G.selected].shape;
      tryPlace(G.selected, cell.r - Math.floor((sh2.h - 1) / 2), cell.c - Math.floor((sh2.w - 1) / 2));
    }
  });
  cv.addEventListener('pointermove', function (e) {
    var pos = canvasPos(e);
    G.hover = boardCellAt(pos.x, pos.y);
    if (G.drag) {
      G.drag.x = pos.x; G.drag.y = pos.y;
      if (boardCellAt(pos.x, pos.y)) G.drag.active = true;
    }
  });
  cv.addEventListener('pointerup', function (e) {
    if (!G.drag) return;
    var drag = G.drag;
    if (drag.active) {
      var cell = boardCellAt(drag.x, drag.y);
      G.drag = null;
      if (cell) tryPlace(drag.idx, cell.r - drag.grabR, cell.c - drag.grabC);
    } else {
      G.drag = null; // simple tap on tray: piece stays selected for tap-tap play
    }
  });
  cv.addEventListener('pointercancel', function () { G.drag = null; });
  cv.addEventListener('pointerleave', function () { G.hover = null; });

  // ---------------------------------------------------------------- go
  updateHud();
  showMenu();
  (function frame() { draw(); requestAnimationFrame(frame); })();
})();
