// Gem Grove Quest — original match-3 puzzle for Wisely Arcade.
// Swap neighbouring gems to match 3+, chain cascades, grow special gems,
// and climb 100 move-limited levels against rising score targets.
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
  // A board is an 8x8 grid of cells. A cell is null (only mid-resolution) or
  // { t: gemType, s: special } where special is 'n' (normal), 'lineH' (clears
  // its row when fired), 'lineV' (clears its column) or 'star'. A star gem has
  // t === STAR and never takes part in colour matches; swapping it with any
  // gem clears every gem of that gem's type.
  var N = 8;
  var STAR = -1;
  var MAX_TYPES = 7;

  function key(r, c) { return r * N + c; }
  function cloneBoard(b) {
    return b.map(function (row) {
      return row.map(function (cell) { return cell ? { t: cell.t, s: cell.s } : null; });
    });
  }
  function emptyBoard() {
    var b = [], r;
    for (r = 0; r < N; r++) b.push([null, null, null, null, null, null, null, null]);
    return b;
  }
  function matchable(cell) { return !!cell && cell.s !== 'star'; }

  // ------------------------------------------------------------- match finding
  // Returns { groups: [{type, dir:'h'|'v', cells:[{r,c}]}], cellSet: Set }
  function computeMatches(board) {
    var groups = [], cellSet = new Set(), r, c, i, len, t;
    for (r = 0; r < N; r++) {           // horizontal runs
      c = 0;
      while (c < N) {
        if (!matchable(board[r][c])) { c++; continue; }
        t = board[r][c].t; len = 1;
        while (c + len < N && matchable(board[r][c + len]) && board[r][c + len].t === t) len++;
        if (len >= 3) {
          var g = { type: t, dir: 'h', cells: [] };
          for (i = 0; i < len; i++) { g.cells.push({ r: r, c: c + i }); cellSet.add(key(r, c + i)); }
          groups.push(g);
        }
        c += len;
      }
    }
    for (c = 0; c < N; c++) {           // vertical runs
      r = 0;
      while (r < N) {
        if (!matchable(board[r][c])) { r++; continue; }
        t = board[r][c].t; len = 1;
        while (r + len < N && matchable(board[r + len][c]) && board[r + len][c].t === t) len++;
        if (len >= 3) {
          var g2 = { type: t, dir: 'v', cells: [] };
          for (i = 0; i < len; i++) { g2.cells.push({ r: r + i, c: c }); cellSet.add(key(r + i, c)); }
          groups.push(g2);
        }
        r += len;
      }
    }
    return { groups: groups, cellSet: cellSet };
  }

  // Every legal swap from this board. A swap is legal when it creates a match
  // or involves a star gem. Moves are {r1,c1,r2,c2,star}.
  function findMoves(board) {
    var moves = [], r, c;
    var dirs = [[0, 1], [1, 0]];
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
      var a = board[r][c];
      if (!a) continue;
      for (var d = 0; d < 2; d++) {
        var r2 = r + dirs[d][0], c2 = c + dirs[d][1];
        if (r2 >= N || c2 >= N) continue;
        var b = board[r2][c2];
        if (!b) continue;
        if (a.s === 'star' || b.s === 'star') {
          moves.push({ r1: r, c1: c, r2: r2, c2: c2, star: true });
          continue;
        }
        if (a.t === b.t) continue; // swapping identical types changes nothing
        board[r][c] = b; board[r2][c2] = a;
        var m = computeMatches(board);
        board[r][c] = a; board[r2][c2] = b;
        if (m.groups.length) moves.push({ r1: r, c1: c, r2: r2, c2: c2, star: false });
      }
    }
    return moves;
  }
  function hasMove(board) { return findMoves(board).length > 0; }

  // ------------------------------------------------------------ board building
  // Fill a fresh board that never starts with a ready-made match and always
  // offers at least one legal move. Retries continue on the same rng stream,
  // so a given seed always produces the same board.
  function genBoard(rng, types) {
    var board = emptyBoard(), attempt, r, c, i;
    for (attempt = 0; attempt < 1000; attempt++) {
      board = emptyBoard();
      for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
        var banned = {};
        if (c >= 2 && board[r][c - 1] && board[r][c - 2] && board[r][c - 1].t === board[r][c - 2].t) banned[board[r][c - 1].t] = 1;
        if (r >= 2 && board[r - 1][c] && board[r - 2][c] && board[r - 1][c].t === board[r - 2][c].t) banned[board[r - 1][c].t] = 1;
        var options = [];
        for (i = 0; i < types; i++) if (!banned[i]) options.push(i);
        board[r][c] = { t: options[Math.floor(rng() * options.length)], s: 'n' };
      }
      if (hasMove(board)) return board;
    }
    return board; // unreachable in practice (dead first boards are rare)
  }

  // Shuffle the gems already on the board until it has no ready-made match
  // and at least one legal move. Used when play strands the board.
  function reshuffle(board, rng, types) {
    var pieces = [], r, c, i, attempt;
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (board[r][c]) pieces.push(board[r][c]);
    for (attempt = 0; attempt < 500; attempt++) {
      var arr = pieces.slice();
      for (i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      var b = emptyBoard(), k = 0;
      for (r = 0; r < N; r++) for (c = 0; c < N; c++) b[r][c] = arr[k++] || null;
      if (computeMatches(b).groups.length === 0 && hasMove(b)) return b;
    }
    return genBoard(rng, types); // last resort: a fresh grove (specials lost)
  }

  // --------------------------------------------------------------- resolution
  // Line gems caught in a clear fire their row/column, and line gems caught
  // by that blast fire too. Expands the clear set in place.
  function blastExpand(board, set) {
    var queue = [], fired = {};
    set.forEach(function (k) {
      var cell = board[Math.floor(k / N)][k % N];
      if (cell && (cell.s === 'lineH' || cell.s === 'lineV')) queue.push(k);
    });
    while (queue.length) {
      var k = queue.pop();
      if (fired[k]) continue;
      fired[k] = 1;
      var r = Math.floor(k / N), c = k % N, cell = board[r][c];
      if (!cell) continue;
      var i;
      if (cell.s === 'lineH') {
        for (i = 0; i < N; i++) addToSet(r, i);
      } else if (cell.s === 'lineV') {
        for (i = 0; i < N; i++) addToSet(i, c);
      }
    }
    function addToSet(r, c) {
      var k2 = key(r, c);
      if (!set.has(k2)) {
        set.add(k2);
        var cl = board[r][c];
        if (cl && (cl.s === 'lineH' || cl.s === 'lineV')) queue.push(k2);
      }
    }
    return set;
  }

  function applyGravityRefill(board, rng, types) {
    var c, r, write;
    for (c = 0; c < N; c++) {
      write = N - 1;
      for (r = N - 1; r >= 0; r--) {
        if (board[r][c]) {
          board[write][c] = board[r][c];
          if (write !== r) board[r][c] = null;
          write--;
        }
      }
      for (r = write; r >= 0; r--) {
        board[r][c] = { t: Math.floor(rng() * types), s: 'n' };
      }
    }
  }

  // Decide whether a chain-1 match earns a special gem, and where. The gem
  // is born on a swapped cell: a run of 5 (or an L/T cross totalling 5+)
  // makes a star gem, a straight run of 4 makes a line gem.
  function pickCreation(board, matches, move) {
    var cand = [{ r: move.r2, c: move.c2 }, { r: move.r1, c: move.c1 }];
    var i, j;
    for (i = 0; i < cand.length; i++) {           // stars first, either cell
      var cell = board[cand[i].r][cand[i].c];
      if (!matchable(cell)) continue;
      var hL = 0, vL = 0;
      for (j = 0; j < matches.groups.length; j++) {
        var g = matches.groups[j];
        if (g.type !== cell.t) continue;
        var inside = g.cells.some(function (p) { return p.r === cand[i].r && p.c === cand[i].c; });
        if (!inside) continue;
        if (g.dir === 'h') hL = Math.max(hL, g.cells.length);
        else vL = Math.max(vL, g.cells.length);
      }
      var cross = (hL >= 3 && vL >= 3) ? hL + vL - 1 : 0;
      if (hL >= 5 || vL >= 5 || cross >= 5) return { r: cand[i].r, c: cand[i].c, s: 'star', type: cell.t };
    }
    for (i = 0; i < cand.length; i++) {           // then line gems
      var cell2 = board[cand[i].r][cand[i].c];
      if (!matchable(cell2)) continue;
      for (j = 0; j < matches.groups.length; j++) {
        var g2 = matches.groups[j];
        if (g2.type !== cell2.t || g2.cells.length !== 4) continue;
        var inside2 = g2.cells.some(function (p) { return p.r === cand[i].r && p.c === cand[i].c; });
        if (inside2) return { r: cand[i].r, c: cand[i].c, s: g2.dir === 'h' ? 'lineH' : 'lineV', type: cell2.t };
      }
    }
    return null;
  }

  // Resolve one legal swap completely: swap, clear, fall, refill, cascade.
  // Returns per-chain steps (for animation/tests) and the settled board,
  // which is guaranteed match-free. Score: 10 per gem x chain multiplier,
  // +20 when a line gem is born, +50 for a star gem.
  function resolveMove(board, move, rng, types) {
    var b = cloneBoard(board);
    var tmp = b[move.r1][move.c1];
    b[move.r1][move.c1] = b[move.r2][move.c2];
    b[move.r2][move.c2] = tmp;
    var boardAfterSwap = cloneBoard(b);
    var steps = [], totalScore = 0, chain = 0, r, c;

    function settle(set, gained) {
      var cleared = [];
      set.forEach(function (k) {
        var rr = Math.floor(k / N), cc = k % N, cell = b[rr][cc];
        cleared.push({ r: rr, c: cc, t: cell ? cell.t : 0, s: cell ? cell.s : 'n' });
        b[rr][cc] = null;
      });
      applyGravityRefill(b, rng, types);
      steps.push({ chain: chain, cleared: cleared, gained: gained, created: null, boardAfter: cloneBoard(b) });
      totalScore += gained;
    }

    if (move.star) {
      chain = 1;
      var sPos = b[move.r1][move.c1] && b[move.r1][move.c1].s === 'star' ? { r: move.r1, c: move.c1 } : { r: move.r2, c: move.c2 };
      var oPos = (sPos.r === move.r1 && sPos.c === move.c1) ? { r: move.r2, c: move.c2 } : { r: move.r1, c: move.c1 };
      var other = b[oPos.r][oPos.c];
      var set = new Set();
      set.add(key(sPos.r, sPos.c));
      if (!other || other.s === 'star') {
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) set.add(key(r, c)); // double star: whole board
      } else {
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
          if (b[r][c] && b[r][c].t === other.t && b[r][c].s !== 'star') set.add(key(r, c));
        }
        if (other.s === 'lineH' || other.s === 'lineV') blastExpand(b, set);
      }
      settle(set, set.size * 10 * chain);
    }

    for (;;) {
      var m = computeMatches(b);
      if (!m.groups.length) break;
      chain++;
      var clearSet = new Set(m.cellSet);
      var creation = null;
      if (chain === 1 && !move.star) {
        creation = pickCreation(b, m, move);
        if (creation) clearSet.delete(key(creation.r, creation.c));
      }
      blastExpand(b, clearSet);
      if (creation && clearSet.has(key(creation.r, creation.c))) creation = null; // blasted away instead
      var gained = clearSet.size * 10 * chain + (creation ? (creation.s === 'star' ? 50 : 20) : 0);
      var cleared = [];
      clearSet.forEach(function (k) {
        var rr = Math.floor(k / N), cc = k % N, cell = b[rr][cc];
        cleared.push({ r: rr, c: cc, t: cell ? cell.t : 0, s: cell ? cell.s : 'n' });
        b[rr][cc] = null;
      });
      if (creation) {
        b[creation.r][creation.c] = creation.s === 'star' ? { t: STAR, s: 'star' } : { t: creation.type, s: creation.s };
      }
      applyGravityRefill(b, rng, types);
      steps.push({ chain: chain, cleared: cleared, gained: gained, created: creation, boardAfter: cloneBoard(b) });
      totalScore += gained;
    }
    return { steps: steps, boardAfterSwap: boardAfterSwap, finalBoard: b, totalScore: totalScore, chains: chain };
  }

  // ------------------------------------------------------------------ levels
  function typesFor(level) {
    if (level <= 25) return 5;
    if (level <= 60) return 6;
    return 7;
  }
  function movesFor(level) {
    return 26 - Math.floor((level - 1) / 14);   // 26 moves early, 19 at the top
  }
  // Score targets, calibrated with random-move and greedy-move bots at build
  // time: a random player wins often on the early levels and fades as gem
  // types are added (levels 26 and 61), while a deliberate player can clear
  // every level. Anchors are interpolated, rounded to 5s, and forced
  // strictly upward (+5 minimum per level).
  var TARGET_ANCHORS = [[1, 1180], [26, 1330], [61, 1540], [100, 1735]];
  function targetFor(level) {
    var t = 0, prev = 0, l, i;
    for (l = 1; l <= level; l++) {
      var raw = TARGET_ANCHORS[TARGET_ANCHORS.length - 1][1];
      for (i = 0; i < TARGET_ANCHORS.length - 1; i++) {
        var a = TARGET_ANCHORS[i], b = TARGET_ANCHORS[i + 1];
        if (l >= a[0] && l <= b[0]) { raw = a[1] + (b[1] - a[1]) * (l - a[0]) / (b[0] - a[0]); break; }
      }
      t = Math.max(Math.round(raw / 5) * 5, prev + 5);
      prev = t;
    }
    return t;
  }
  function levelParams(level) {
    var L = Math.max(1, Math.min(100, level | 0));
    return { level: L, types: typesFor(L), moves: movesFor(L), target: targetFor(L) };
  }
  // Deterministic level: same level, same starting board and same refill
  // stream seed, every time. playSeed drives refills during an attempt.
  function genLevel(level) {
    var p = levelParams(level);
    var board = genBoard(makeRng(hashSeed(4242, p.level)), p.types);
    return { params: p, board: board, playSeed: hashSeed(977, p.level * 31 + 7) };
  }
  // Stars are earned by score over target: finish on target for 1 star,
  // 120% for 2 stars, 150% for 3 stars.
  function starsFor(params, score) {
    if (score >= Math.ceil(params.target * 1.5)) return 3;
    if (score >= Math.ceil(params.target * 1.2)) return 2;
    return 1;
  }
  function evaluateEnd(params, score, movesLeft) {
    if (score >= params.target) return 'win';
    if (movesLeft <= 0) return 'lose';
    return 'play';
  }

  var Core = {
    N: N, STAR: STAR, MAX_TYPES: MAX_TYPES,
    makeRng: makeRng, hashSeed: hashSeed,
    emptyBoard: emptyBoard, cloneBoard: cloneBoard, matchable: matchable,
    computeMatches: computeMatches, findMoves: findMoves, hasMove: hasMove,
    genBoard: genBoard, reshuffle: reshuffle,
    blastExpand: blastExpand, applyGravityRefill: applyGravityRefill,
    resolveMove: resolveMove,
    typesFor: typesFor, movesFor: movesFor, targetFor: targetFor,
    levelParams: levelParams, genLevel: genLevel, starsFor: starsFor,
    evaluateEnd: evaluateEnd
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Core; }
  if (typeof document === 'undefined') return;

  // ================================================================ BROWSER
  var LS_KEY = 'wisely-gem-grove-quest';
  var progress = { unlocked: 1, current: 1, stars: {}, bestScores: {} };
  try {
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved) {
      progress.unlocked = Math.max(1, Math.min(100, saved.unlocked || 1));
      progress.current = Math.max(1, Math.min(100, saved.current || progress.unlocked));
      progress.stars = saved.stars || {};
      progress.bestScores = saved.bestScores || {};
    }
  } catch (e) { /* private mode: play without saving */ }
  function saveProgress() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(progress)); } catch (e) {}
  }

  var cv = document.getElementById('ggrove');
  var ctx = cv.getContext('2d');
  var elScore = document.getElementById('gg-score');
  var elLevel = document.getElementById('gg-level');
  var elBest = document.getElementById('gg-best');
  var elStatus = document.getElementById('gg-status');
  var over = document.getElementById('gg-over');
  var overTitle = document.getElementById('gg-over-title');
  var overStats = document.getElementById('gg-over-stats');
  var btnMain = document.getElementById('gg-ov-main');
  var btnAlt = document.getElementById('gg-ov-alt');
  var picker = document.getElementById('gg-picker');
  var pickerGrid = document.getElementById('gg-picker-grid');

  // Canvas layout (internal resolution 440x440, CSS scales it).
  var CW = 440, BX = 20, BY = 20, CELL = 50, BOARD_PX = CELL * N;
  var SEASONS = [
    ['#2e5d3a', '#12291a', 'rgba(160,255,170,.14)'], ['#35704a', '#14301e', 'rgba(190,255,170,.15)'],
    ['#3f7a3a', '#18331a', 'rgba(255,240,150,.14)'], ['#6d7a2e', '#2c3312', 'rgba(255,220,120,.15)'],
    ['#7a5a2e', '#33230f', 'rgba(255,190,110,.15)'], ['#7a4526', '#331b0d', 'rgba(255,160,90,.15)'],
    ['#6d3a3a', '#2e1414', 'rgba(255,150,150,.13)'], ['#4a4a72', '#1a1a30', 'rgba(180,190,255,.14)'],
    ['#3a5a72', '#14242e', 'rgba(170,220,255,.15)'], ['#2e6d5a', '#123129', 'rgba(160,255,220,.14)']
  ];
  function seasonFor(level) { return SEASONS[Math.min(9, Math.floor((Math.max(1, level) - 1) / 10))]; }

  var G = null;
  function newState() {
    return {
      mode: 'menu', board: emptyBoard(), rng: makeRng(1), level: 0, params: null,
      score: 0, movesLeft: 0, over: true, selected: null,
      phase: 'idle', swapAnim: null, res: null, resIdx: 0, resT0: 0,
      ptr: null, floaters: [], statusFlashUntil: 0
    };
  }
  G = newState();

  function startLevel(level) {
    var gen = genLevel(level);
    G = newState();
    G.mode = 'level'; G.over = false;
    G.level = gen.params.level; G.params = gen.params;
    G.board = gen.board;
    G.rng = makeRng(gen.playSeed);
    G.movesLeft = gen.params.moves;
    progress.current = G.level; saveProgress();
    hideOverlay(); hidePicker(); updateHud();
    setStatus('Level ' + G.level + ' — reach ' + G.params.target + ' points in ' + G.params.moves + ' moves.');
  }

  function setStatus(msg, holdMs) {
    elStatus.textContent = msg;
    G.statusFlashUntil = holdMs ? Date.now() + holdMs : 0;
  }
  function updateHud() {
    elScore.textContent = G.score;
    elLevel.textContent = G.mode === 'level' ? G.level : '—';
    var b = G.mode === 'level' ? (progress.bestScores[String(G.level)] || 0) : 0;
    elBest.textContent = b > 0 ? b : '—';
    if (G.mode === 'level' && G.params && !G.statusFlashUntil) {
      elStatus.textContent = 'Target ' + G.params.target + ' · Moves left ' + G.movesLeft + ' · Score ' + G.score;
    }
  }

  function attemptSwap(r1, c1, r2, c2) {
    if (G.phase !== 'idle' || G.over) return;
    if (r2 < 0 || c2 < 0 || r2 >= N || c2 >= N) return;
    var moves = findMoves(G.board);
    var move = null, i;
    for (i = 0; i < moves.length; i++) {
      var m = moves[i];
      if ((m.r1 === r1 && m.c1 === c1 && m.r2 === r2 && m.c2 === c2) ||
          (m.r1 === r2 && m.c1 === c2 && m.r2 === r1 && m.c2 === c1)) { move = m; break; }
    }
    G.selected = null;
    G.swapAnim = { r1: r1, c1: c1, r2: r2, c2: c2, t0: performance.now(), dur: 130, valid: !!move, move: move };
    G.phase = 'swapping';
  }

  function onSwapAnimDone() {
    var anim = G.swapAnim;
    G.swapAnim = null;
    if (!anim.valid) { G.phase = 'idle'; return; }
    var result = resolveMove(G.board, anim.move, G.rng, G.params.types);
    G.movesLeft--;
    G.res = result; G.resIdx = 0; G.resT0 = performance.now();
    G.board = result.boardAfterSwap;
    G.phase = 'resolving';
    updateHud();
  }

  function onResolveDone() {
    var result = G.res;
    G.board = result.finalBoard;
    G.res = null;
    G.phase = 'idle';
    var end = evaluateEnd(G.params, G.score, G.movesLeft);
    if (end === 'win') { levelClear(); return; }
    if (end === 'lose') { levelFail(); return; }
    if (!hasMove(G.board)) {
      G.board = reshuffle(G.board, G.rng, G.params.types);
      setStatus('No moves left — the grove reshuffled the gems! 🍃', 2600);
      setTimeout(function () { G.statusFlashUntil = 0; updateHud(); }, 2650);
    }
    updateHud();
  }

  function levelClear() {
    G.over = true;
    var stars = starsFor(G.params, G.score);
    var key = String(G.level);
    if (!progress.stars[key] || progress.stars[key] < stars) progress.stars[key] = stars;
    if (!progress.bestScores[key] || progress.bestScores[key] < G.score) progress.bestScores[key] = G.score;
    if (G.level >= progress.unlocked && G.level < 100) progress.unlocked = G.level + 1;
    if (G.level < 100) progress.current = G.level + 1;
    saveProgress();
    var starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    showOverlay({
      title: 'Level ' + G.level + ' cleared! ' + starStr,
      stats: 'Score ' + G.score + ' (target ' + G.params.target + ') · Moves to spare: ' + G.movesLeft,
      mainLabel: G.level < 100 ? 'Next level ▶' : 'Play level 100 again',
      mainFn: function () { startLevel(G.level < 100 ? G.level + 1 : 100); },
      altLabel: 'All levels',
      altFn: openPicker
    });
    updateHud();
  }
  function levelFail() {
    if (G.over) return;
    G.over = true;
    var key = String(G.level);
    if (!progress.bestScores[key] || progress.bestScores[key] < G.score) { progress.bestScores[key] = G.score; saveProgress(); }
    showOverlay({
      title: 'Level ' + G.level + ' — not yet',
      stats: 'Out of moves. Score ' + G.score + ' of ' + G.params.target + ' — the chain was almost there. Small moves add up!',
      mainLabel: 'Try again',
      mainFn: function () { startLevel(G.level); },
      altLabel: 'All levels',
      altFn: openPicker
    });
    updateHud();
  }

  // ---------------------------------------------------------------- overlays
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
  document.getElementById('gg-picker-close').addEventListener('click', function () {
    hidePicker();
    if (G.mode === 'menu' || G.over) showMenu();
  });
  document.getElementById('gg-levels').addEventListener('click', openPicker);
  document.getElementById('gg-restart').addEventListener('click', function () {
    if (G.mode === 'level') startLevel(G.level);
  });

  function showMenu() {
    var gen = genLevel(progress.current);
    G.board = gen.board; G.level = gen.params.level; G.params = gen.params;
    showOverlay({
      title: 'Welcome to the grove!',
      stats: 'Swap gems, match 3 or more, and chain the cascades. 100 levels of rising targets — small moves add up.',
      mainLabel: '▶ Level ' + progress.current,
      mainFn: function () { startLevel(progress.current); },
      altLabel: 'All levels',
      altFn: openPicker
    });
  }

  // ---------------------------------------------------------------- rendering
  var PALETTE = [
    ['#ff9d85', '#e74c3c', '#8e2418'], // ruby
    ['#93ccff', '#2e86de', '#123f67'], // sapphire
    ['#93f7ee', '#12a594', '#0a4f45'], // aqua
    ['#ffe08a', '#f5a623', '#9a6204'], // amber
    ['#dfaaff', '#8e44ad', '#46205c'], // violet
    ['#93f2b6', '#27ae60', '#14532d'], // emerald
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
  function poly(cx, cy, sides, rad, rot) {
    ctx.beginPath();
    for (var i = 0; i < sides; i++) {
      var a = rot + i * 2 * Math.PI / sides;
      var x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  function gemPath(cx, cy, s, type) {
    ctx.beginPath();
    if (type === 0) {                    // circle
      ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
    } else if (type === 1) {             // diamond
      ctx.moveTo(cx, cy - s * 0.47); ctx.lineTo(cx + s * 0.36, cy);
      ctx.lineTo(cx, cy + s * 0.47); ctx.lineTo(cx - s * 0.36, cy);
      ctx.closePath();
    } else if (type === 2) {             // teardrop
      ctx.moveTo(cx, cy - s * 0.48);
      ctx.bezierCurveTo(cx + s * 0.42, cy - s * 0.02, cx + s * 0.34, cy + s * 0.30, cx, cy + s * 0.45);
      ctx.bezierCurveTo(cx - s * 0.34, cy + s * 0.30, cx - s * 0.42, cy - s * 0.02, cx, cy - s * 0.48);
    } else if (type === 3) {             // hexagon
      poly(cx, cy, 6, s * 0.45, -Math.PI / 2);
    } else if (type === 4) {             // pentagon
      poly(cx, cy, 5, s * 0.45, -Math.PI / 2);
    } else if (type === 5) {             // leaf
      ctx.moveTo(cx - s * 0.40, cy + s * 0.40);
      ctx.quadraticCurveTo(cx - s * 0.44, cy - s * 0.38, cx + s * 0.40, cy - s * 0.40);
      ctx.quadraticCurveTo(cx + s * 0.44, cy + s * 0.38, cx - s * 0.40, cy + s * 0.40);
    } else {                             // flower: five petals
      for (var i = 0; i < 5; i++) {
        var a = -Math.PI / 2 + i * 2 * Math.PI / 5;
        var px = cx + Math.cos(a) * s * 0.23, py = cy + Math.sin(a) * s * 0.23;
        ctx.moveTo(px + s * 0.18, py);
        ctx.arc(px, py, s * 0.18, 0, Math.PI * 2);
      }
    }
  }
  function drawGem(cx, cy, size, cell, scale, alpha, now) {
    var s = size * (scale || 1);
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    if (cell.s === 'star') {
      var pulse = 1 + 0.07 * Math.sin(now / 220);
      ctx.shadowColor = 'rgba(255,210,80,.85)'; ctx.shadowBlur = 16;
      poly(cx, cy, 5, s * 0.46 * pulse, -Math.PI / 2);
      // star polygon is 5 points; redraw as a true star shape:
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 5;
        var rad = (i % 2 === 0 ? s * 0.48 : s * 0.21) * pulse;
        var x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      var gg = ctx.createLinearGradient(cx, cy - s / 2, cx, cy + s / 2);
      gg.addColorStop(0, '#fff3b0'); gg.addColorStop(0.5, '#ffc93c'); gg.addColorStop(1, '#e08a00');
      ctx.fillStyle = gg; ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(120,70,0,.6)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
      return;
    }
    var p = PALETTE[cell.t];
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = s * 0.14;
    ctx.shadowOffsetY = s * 0.06;
    var g = ctx.createLinearGradient(cx, cy - s / 2, cx, cy + s / 2);
    g.addColorStop(0, p[0]); g.addColorStop(0.45, p[1]); g.addColorStop(1, p[2]);
    gemPath(cx, cy, s, cell.t);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1.4; ctx.stroke();
    // glossy highlight + sparkle
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.13, cy - s * 0.20, s * 0.13, s * 0.07, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - s * 0.16, cy - s * 0.22, s * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fill();
    if (cell.t === 6) { // flower centre
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe08a'; ctx.fill();
    }
    if (cell.s === 'lineH' || cell.s === 'lineV') {
      ctx.strokeStyle = 'rgba(255,255,255,.92)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (cell.s === 'lineH') {
        ctx.moveTo(cx - s * 0.30, cy); ctx.lineTo(cx + s * 0.30, cy);
        ctx.moveTo(cx + s * 0.30, cy); ctx.lineTo(cx + s * 0.18, cy - s * 0.10);
        ctx.moveTo(cx + s * 0.30, cy); ctx.lineTo(cx + s * 0.18, cy + s * 0.10);
        ctx.moveTo(cx - s * 0.30, cy); ctx.lineTo(cx - s * 0.18, cy - s * 0.10);
        ctx.moveTo(cx - s * 0.30, cy); ctx.lineTo(cx - s * 0.18, cy + s * 0.10);
      } else {
        ctx.moveTo(cx, cy - s * 0.30); ctx.lineTo(cx, cy + s * 0.30);
        ctx.moveTo(cx, cy + s * 0.30); ctx.lineTo(cx - s * 0.10, cy + s * 0.18);
        ctx.moveTo(cx, cy + s * 0.30); ctx.lineTo(cx + s * 0.10, cy + s * 0.18);
        ctx.moveTo(cx, cy - s * 0.30); ctx.lineTo(cx - s * 0.10, cy - s * 0.18);
        ctx.moveTo(cx, cy - s * 0.30); ctx.lineTo(cx + s * 0.10, cy - s * 0.18);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    var now = performance.now();
    var season = seasonFor(G.level || progress.current);
    var bg = ctx.createLinearGradient(0, 0, 0, CW);
    bg.addColorStop(0, season[0]); bg.addColorStop(1, season[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CW, CW);
    var glow = ctx.createRadialGradient(220, 200, 40, 220, 200, 320);
    glow.addColorStop(0, season[2]); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CW, CW);

    // grove frame + board well
    var wg = ctx.createLinearGradient(0, BY - 12, 0, BY + BOARD_PX + 12);
    wg.addColorStop(0, '#8a6134'); wg.addColorStop(0.5, '#6d4a22'); wg.addColorStop(1, '#472d0e');
    rr(BX - 12, BY - 12, BOARD_PX + 24, BOARD_PX + 24, 16);
    ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,150,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    rr(BX - 3, BY - 3, BOARD_PX + 6, BOARD_PX + 6, 10);
    ctx.fillStyle = 'rgba(8,20,12,.55)'; ctx.fill();

    // which board to draw, and which cells are mid-clear
    var boardToDraw = G.board;
    var clearing = null, clearP = 0;
    if (G.phase === 'resolving' && G.res) {
      var step = G.res.steps[G.resIdx];
      var elapsed = now - G.resT0;
      if (step && elapsed < 200) {
        boardToDraw = G.resIdx === 0 ? G.res.boardAfterSwap : G.res.steps[G.resIdx - 1].boardAfter;
        clearing = {};
        step.cleared.forEach(function (cl) { clearing[cl.r + ',' + cl.c] = cl; });
        clearP = elapsed / 200;
      }
    }

    var swapPos = null;
    if (G.phase === 'swapping' && G.swapAnim) {
      var p = Math.min(1, (now - G.swapAnim.t0) / G.swapAnim.dur);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      if (!G.swapAnim.valid && p > 0.5) e = 1 - e; // invalid: go and return
      swapPos = { a: G.swapAnim, e: e };
    }

    var r, c;
    for (r = 0; r < N; r++) {
      for (c = 0; c < N; c++) {
        var x = BX + c * CELL, y = BY + r * CELL;
        rr(x + 2, y + 2, CELL - 4, CELL - 4, 9);
        ctx.fillStyle = 'rgba(255,255,255,.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.07)';
        ctx.lineWidth = 1; ctx.stroke();
        var cell = boardToDraw[r][c];
        if (!cell) continue;
        var cxp = x + CELL / 2, cyp = y + CELL / 2;
        if (swapPos && ((r === swapPos.a.r1 && c === swapPos.a.c1) || (r === swapPos.a.r2 && c === swapPos.a.c2))) {
          var other = (r === swapPos.a.r1 && c === swapPos.a.c1) ? swapPos.a : null;
          var tx = BX + (other ? swapPos.a.c2 : swapPos.a.c1) * CELL;
          var ty = BY + (other ? swapPos.a.r2 : swapPos.a.r1) * CELL;
          cxp = cxp + (tx + CELL / 2 - cxp) * swapPos.e;
          cyp = cyp + (ty + CELL / 2 - cyp) * swapPos.e;
        }
        var scale = 1, alpha = 1;
        if (clearing && clearing[r + ',' + c]) {
          scale = 1 - clearP * 0.85;
          alpha = 1 - clearP * 0.6;
        }
        drawGem(cxp, cyp, CELL - 6, cell, scale, alpha, now);
        if (clearing && clearing[r + ',' + c]) {
          rr(x + 2, y + 2, CELL - 4, CELL - 4, 9);
          ctx.fillStyle = 'rgba(255,255,255,' + (clearP * 0.55) + ')';
          ctx.fill();
        }
      }
    }
    // selection ring
    if (G.selected && G.phase === 'idle') {
      var sx = BX + G.selected.c * CELL, sy = BY + G.selected.r * CELL;
      rr(sx + 1, sy + 1, CELL - 2, CELL - 2, 10);
      ctx.strokeStyle = 'rgba(255,200,80,.95)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // drag ghost: the dragged gem follows the pointer
    if (G.ptr && G.ptr.dragging && G.ptr.cell && G.phase === 'idle') {
      var dc = G.board[G.ptr.cell.r][G.ptr.cell.c];
      if (dc) drawGem(G.ptr.x, G.ptr.y, CELL - 6, dc, 1.05, 0.9, now);
    }
    // score floaters
    G.floaters = G.floaters.filter(function (f) { return now - f.t0 < 900; });
    G.floaters.forEach(function (f) {
      var fp = (now - f.t0) / 900;
      ctx.save();
      ctx.globalAlpha = 1 - fp;
      ctx.font = '900 22px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe08a';
      ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3;
      var fy = f.y - fp * 44;
      ctx.strokeText(f.text, f.x, fy);
      ctx.fillText(f.text, f.x, fy);
      ctx.restore();
    });
  }

  function advanceAnimations() {
    var now = performance.now();
    if (G.phase === 'swapping' && G.swapAnim && now - G.swapAnim.t0 >= G.swapAnim.dur) {
      onSwapAnimDone();
    } else if (G.phase === 'resolving' && G.res) {
      var stepDur = 360;
      if (now - G.resT0 >= stepDur) {
        var step = G.res.steps[G.resIdx];
        if (step) {
          G.score += step.gained;
          if (step.cleared.length) {
            var cxSum = 0, cySum = 0;
            step.cleared.forEach(function (cl) { cxSum += BX + cl.c * CELL + CELL / 2; cySum += BY + cl.r * CELL + CELL / 2; });
            G.floaters.push({ x: cxSum / step.cleared.length, y: cySum / step.cleared.length, text: '+' + step.gained, t0: now });
          }
        }
        G.resIdx++;
        G.resT0 = now;
        if (G.resIdx >= G.res.steps.length) {
          G.board = G.res.finalBoard;
          onResolveDone();
        }
        updateHud();
      }
    }
    if (G.statusFlashUntil && Date.now() > G.statusFlashUntil) {
      G.statusFlashUntil = 0;
      updateHud();
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
  cv.addEventListener('pointerdown', function (e) {
    if (G.over || G.phase !== 'idle') return;
    e.preventDefault();
    var pos = canvasPos(e);
    var cell = boardCellAt(pos.x, pos.y);
    G.ptr = { cell: cell, x: pos.x, y: pos.y, fired: false, dragging: false };
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  });
  cv.addEventListener('pointermove', function (e) {
    if (!G.ptr || G.over || G.phase !== 'idle') return;
    var pos = canvasPos(e);
    G.ptr.x = pos.x; G.ptr.y = pos.y;
    G.ptr.dragging = true;
    if (!G.ptr.cell || G.ptr.fired) return;
    var dx = pos.x - (BX + G.ptr.cell.c * CELL + CELL / 2);
    var dy = pos.y - (BY + G.ptr.cell.r * CELL + CELL / 2);
    if (Math.max(Math.abs(dx), Math.abs(dy)) > CELL * 0.45) {
      var sr = G.ptr.cell.r, sc = G.ptr.cell.c;
      var tr = sr, tc = sc;
      if (Math.abs(dx) > Math.abs(dy)) tc += dx > 0 ? 1 : -1;
      else tr += dy > 0 ? 1 : -1;
      G.ptr = null;
      attemptSwap(sr, sc, tr, tc);
    }
  });
  cv.addEventListener('pointerup', function (e) {
    if (!G.ptr) return;
    var ptr = G.ptr;
    G.ptr = null;
    if (G.over || G.phase !== 'idle' || ptr.fired || !ptr.cell) return;
    // a tap (no drag fired): select / swap with selected / deselect
    if (G.selected && G.selected.r === ptr.cell.r && G.selected.c === ptr.cell.c) {
      G.selected = null;
      return;
    }
    if (G.selected && Math.abs(G.selected.r - ptr.cell.r) + Math.abs(G.selected.c - ptr.cell.c) === 1) {
      attemptSwap(G.selected.r, G.selected.c, ptr.cell.r, ptr.cell.c);
      return;
    }
    G.selected = ptr.cell;
  });
  cv.addEventListener('pointercancel', function () { G.ptr = null; });

  // ---------------------------------------------------------------- go
  updateHud();
  showMenu();
  (function frame() { advanceAnimations(); draw(); requestAnimationFrame(frame); })();

  // Debug/testing handle (used by the automated browser check).
  window.GemGroveQuest = { Core: Core, state: function () { return G; }, startLevel: startLevel };
})();
