/* 2048 Merge — clean-room sliding-tile puzzle for Wisely Arcade.
   Vanilla JS, no libraries. Slide tiles with arrows/WASD or swipe;
   equal tiles merge once per move, score grows with every merge.
   Two modes: CAMPAIGN — 100 levels, each level = build a target tile
   (128 at L1–10 … 2048 at L56–100), move pars from L21, 1–3 stars,
   progress in wa_2048_* keys; FREE PLAY — the original endless game,
   best score in wisely_2048_best, exactly as before. */
(function () {
  'use strict';

  var SIZE = 4;
  var BEST_KEY = 'wisely_2048_best';
  var MOVE_MS = 130;

  /* ---------- campaign state ---------- */
  var MAX_LEVEL = 100;
  var MODE_KEY = 'wa_2048_mode';
  var CUR_KEY = 'wa_2048_current';
  var UNLOCK_KEY = 'wa_2048_unlocked';
  var STARS_KEY = 'wa_2048_stars';

  var mode = 'campaign';
  var cur = 1, unlocked = 1, starMap = {};
  try {
    mode = localStorage.getItem(MODE_KEY) || 'campaign';
    cur = parseInt(localStorage.getItem(CUR_KEY) || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem(UNLOCK_KEY) || '1', 10) || 1;
    starMap = JSON.parse(localStorage.getItem(STARS_KEY) || '{}') || {};
  } catch (e) {}
  if (mode !== 'free') mode = 'campaign';
  if (cur < 1) cur = 1; if (cur > MAX_LEVEL) cur = MAX_LEVEL;
  if (unlocked < cur) unlocked = cur; if (unlocked > MAX_LEVEL) unlocked = MAX_LEVEL;
  if (unlocked < 1) unlocked = 1;

  function saveCampaign() {
    try {
      localStorage.setItem(CUR_KEY, String(cur));
      localStorage.setItem(UNLOCK_KEY, String(unlocked));
      localStorage.setItem(STARS_KEY, JSON.stringify(starMap));
    } catch (e) {}
  }
  function totalStars() { var t = 0; for (var k in starMap) t += starMap[k]; return t; }

  /* Target tile per level: gentle start, the real climb late. */
  function targetFor(l) {
    return l <= 10 ? 128 : l <= 20 ? 256 : l <= 35 ? 512 : l <= 55 ? 1024 : 2048;
  }
  /* Move par per level (0 = no par, L1–20). Par only sets the stars —
     reaching the target always completes the level. Pars sit well
     above the mathematical floor (a tile of value T needs at least
     ~T/2.2 moves of spawned tiles) and shrink as levels rise. */
  function parFor(l) {
    if (l < 21) return 0;
    if (l <= 35) return 540 - (l - 21) * 6;    // 512 band:  540 → 456
    if (l <= 55) return 950 - (l - 36) * 10;   // 1024 band: 950 → 760
    return 1650 - (l - 56) * 10;               // 2048 band: 1650 → 1210
  }
  function starsForMoves(m, l) {
    var p = parFor(l);
    if (!p) return 3;
    if (m <= p) return 3;
    if (m <= Math.floor(p * 1.5)) return 2;
    return 1;
  }

  var boardEl = document.getElementById('b2048-board');
  var scoreEl = document.getElementById('m-score');
  var bestEl = document.getElementById('m-best');
  var movesEl = document.getElementById('m-moves');
  var winEl = document.getElementById('m-win');
  var overEl = document.getElementById('m-over');
  var winStatsEl = document.getElementById('m-win-stats');
  var overStatsEl = document.getElementById('m-over-stats');
  var doneEl = document.getElementById('m-done');
  var doneTitleEl = document.getElementById('m-done-title');
  var doneStatsEl = document.getElementById('m-done-stats');
  var areaEl = document.getElementById('m-area');
  var mapEl = document.getElementById('m-map');
  var levelNowEl = document.getElementById('m-level-now');
  var targetNowEl = document.getElementById('m-target-now');
  var parNoteEl = document.getElementById('m-par-note');
  var progressNoteEl = document.getElementById('m-progress-note');
  var modeCampBtn = document.getElementById('m-mode-campaign');
  var modeFreeBtn = document.getElementById('m-mode-free');

  // Premium jewel palette (v3 visual overhaul): {l: light bevel, b: base,
  // d: dark bevel, t: text}. The classic warm 2048 progression, deepened —
  // ivory and pale gold warm up through amber, orange and red, then the
  // high tiers turn to radiant gold.
  var TILE_STYLE = {
    2:    { l: '#FFFBF0', b: '#F8ECD2', d: '#E2CC9C', t: '#7A5A10' },
    4:    { l: '#FFF6DC', b: '#F6DC9F', d: '#D9B264', t: '#7A5A10' },
    8:    { l: '#FFE9BC', b: '#F9BC60', d: '#DE951F', t: '#FFFFFF' },
    16:   { l: '#FFDCAB', b: '#F79E4B', d: '#D6720F', t: '#FFFFFF' },
    32:   { l: '#FFCFA8', b: '#F2704C', d: '#C94F27', t: '#FFFFFF' },
    64:   { l: '#FFBFA6', b: '#F65E3B', d: '#C23A14', t: '#FFFFFF' },
    128:  { l: '#FFF3C2', b: '#EECF6E', d: '#C49A28', t: '#FFFFFF' },
    256:  { l: '#FFF0B4', b: '#EDCC61', d: '#B8931F', t: '#FFFFFF' },
    512:  { l: '#FFEB9E', b: '#EDC850', d: '#AC861A', t: '#FFFFFF' },
    1024: { l: '#FFE98C', b: '#EDC53F', d: '#9C7D12', t: '#FFFFFF' },
    2048: { l: '#FFE873', b: '#EDC22E', d: '#8F7008', t: '#FFFFFF' }
  };

  var grid;        // SIZE x SIZE array of tile objects or null
  var tileEls = {}; // tile id -> DOM element
  var cellEls = []; // background cells
  var nextId = 1;
  var score = 0;
  var best = 0;
  var moves = 0;        // moves used in the current run
  var over = false;
  var won = false;      // 2048 reached this run (free-play overlay shown once)
  var levelWon = false; // campaign target reached this run
  var cellPx = 0, gapPx = 0;

  function tileColors(value) {
    if (TILE_STYLE[value]) return TILE_STYLE[value];
    return { l: '#FFE98A', b: '#E9B921', d: '#8A6D03', t: '#FFFFFF' }; // super tiles beyond 2048
  }

  // Warm radiant glow for the gold tiers (visual only)
  function tierGlow(v) {
    if (v >= 2048) return '0 0 28px rgba(255,200,50,.95)';
    if (v >= 1024) return '0 0 21px rgba(255,208,80,.80)';
    if (v >= 512) return '0 0 16px rgba(255,196,90,.55)';
    if (v >= 256) return '0 0 13px rgba(255,180,70,.45)';
    if (v >= 128) return '0 0 11px rgba(255,170,60,.40)';
    return null;
  }

  // Jewel surface: white specular bloom top-left over a rich
  // light-to-dark diagonal bevel gradient.
  function tileGloss(style) {
    return 'radial-gradient(120% 90% at 28% 16%, rgba(255,255,255,.70) 0%, rgba(255,255,255,0) 52%),' +
      'linear-gradient(160deg,' + style.l + ' 0%,' + style.b + ' 42%,' + style.d + ' 100%)';
  }

  // 3D relief shadows: light top edge, deep warm bottom edge, soft drop
  // shadow tuned for the dark-glass board. Optional extra glow (128+)
  // is layered in front.
  function tileShadow(glow) {
    var base = 'inset 0 2px 3px rgba(255,255,255,.60),inset 0 -5px 8px rgba(74,42,0,.30),0 6px 12px rgba(3,8,20,.42)';
    return glow ? glow + ',' + base : base;
  }

  /* ---------- layout ---------- */
  function layout() {
    var w = boardEl.clientWidth;
    if (!w) return;
    gapPx = Math.max(8, Math.round(w * 0.028));
    cellPx = (w - gapPx * (SIZE + 1)) / SIZE;
    cellEls.forEach(function (el) {
      var r = +el.dataset.r, c = +el.dataset.c;
      el.style.width = cellPx + 'px';
      el.style.height = cellPx + 'px';
      el.style.left = (gapPx + c * (cellPx + gapPx)) + 'px';
      el.style.top = (gapPx + r * (cellPx + gapPx)) + 'px';
    });
    Object.keys(tileEls).forEach(function (id) {
      placeTile(tileEls[id], tileEls[id]._tile);
    });
  }

  function placeTile(el, tile) {
    el.style.width = cellPx + 'px';
    el.style.height = cellPx + 'px';
    el.style.left = (gapPx + tile.x * (cellPx + gapPx)) + 'px';
    el.style.top = (gapPx + tile.y * (cellPx + gapPx)) + 'px';
    var digits = String(tile.value).length;
    el.style.fontSize = Math.round(cellPx * (digits <= 2 ? 0.44 : digits === 3 ? 0.38 : 0.31)) + 'px';
  }

  function createTileEl(tile, pop, mergePop) {
    var el = document.createElement('div');
    el.className = 'b2048-tile';
    var colors = tileColors(tile.value);
    el.style.background = tileGloss(colors);
    el.style.color = colors.t;
    el.style.textShadow = colors.t === '#FFFFFF' ?
      '0 2px 4px rgba(0,0,0,.35)' : '0 1px 0 rgba(255,255,255,.55)';
    el.textContent = tile.value;
    el.style.boxShadow = tileShadow(tierGlow(tile.value));
    el._tile = tile;
    placeTile(el, tile);
    if (pop) {
      var animClass = mergePop ? 'merge-pop' : 'pop';
      var animMs = mergePop ? 520 : 200; // Round 1: let the ring flash finish
      el.classList.add(animClass);
      setTimeout(function () { el.classList.remove(animClass); }, animMs);
    }
    boardEl.appendChild(el);
    tileEls[tile.id] = el;
    return el;
  }

  /* ---------- game state ---------- */
  function emptyGrid() {
    var g = [];
    for (var y = 0; y < SIZE; y++) { g.push([null, null, null, null]); }
    return g;
  }

  function emptyCells() {
    var out = [];
    for (var y = 0; y < SIZE; y++)
      for (var x = 0; x < SIZE; x++)
        if (!grid[y][x]) out.push({ x: x, y: y });
    return out;
  }

  function maxTile() {
    var m = 0;
    for (var y = 0; y < SIZE; y++)
      for (var x = 0; x < SIZE; x++)
        if (grid[y][x] && grid[y][x].value > m) m = grid[y][x].value;
    return m;
  }

  function spawnRandom() {
    var cells = emptyCells();
    if (!cells.length) return;
    var spot = cells[Math.floor(Math.random() * cells.length)];
    var tile = {
      id: nextId++,
      value: Math.random() < 0.9 ? 2 : 4,
      x: spot.x, y: spot.y
    };
    grid[spot.y][spot.x] = tile;
    createTileEl(tile, true);
  }

  function updateScores() {
    scoreEl.textContent = score;
    if (score > 0) { // Round 1: tick-up bump on score gain (visual only)
      scoreEl.classList.remove('tick-bump');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('tick-bump');
    }
    // Best is the free-play record: campaign runs display it but
    // never write it, so wisely_2048_best stays purely free play.
    if (score > best && mode === 'free') {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
    }
    bestEl.textContent = best > 0 ? best : '—';
  }

  function updateMoves() {
    if (movesEl) movesEl.textContent = moves;
  }

  function newGame() {
    Object.keys(tileEls).forEach(function (id) {
      var el = tileEls[id];
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    tileEls = {};
    grid = emptyGrid();
    score = 0; moves = 0; over = false; won = false; levelWon = false;
    winEl.classList.add('hidden');
    overEl.classList.add('hidden');
    if (doneEl) doneEl.classList.add('hidden');
    spawnRandom();
    spawnRandom();
    updateScores();
    updateMoves();
  }

  /* ---------- campaign UI ---------- */
  function buildMap() {
    if (!mapEl) return;
    mapEl.innerHTML = '';
    for (var l = 1; l <= MAX_LEVEL; l++) {
      (function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        if (l === cur) { b.className = 'm-lvl m-cur'; b.textContent = l; }
        else if (starMap[l] != null) { b.className = 'm-lvl m-done'; b.textContent = l + (starMap[l] >= 3 ? ' ⭐' : ''); }
        else if (l <= unlocked) { b.className = 'm-lvl'; b.textContent = l; }
        else { b.className = 'm-lvl m-lock'; b.textContent = '🔒'; }
        b.disabled = l > unlocked;
        b.setAttribute('aria-label', 'Level ' + l);
        b.addEventListener('click', function () { if (l <= unlocked) { cur = l; saveCampaign(); startLevel(); } });
        mapEl.appendChild(b);
      })(l);
    }
    updateLevelBar();
  }

  function updateLevelBar() {
    if (!levelNowEl) return;
    levelNowEl.textContent = cur;
    targetNowEl.textContent = targetFor(cur);
    var p = parFor(cur);
    parNoteEl.textContent = p ? ' · Par: ' + p + ' moves for 3★' : '';
    var doneCount = 0; for (var k in starMap) doneCount++;
    progressNoteEl.textContent = doneCount + ' of 100 levels completed · ' + totalStars() + ' ⭐ total';
  }

  function startLevel() {
    buildMap();
    newGame();
  }

  function finishLevel() {
    over = true; // freeze the board behind the overlay
    var target = targetFor(cur), p = parFor(cur);
    var s = starsForMoves(moves, cur);
    if (starMap[cur] == null || s > starMap[cur]) starMap[cur] = s;
    if (cur === unlocked && unlocked < MAX_LEVEL) unlocked++;
    saveCampaign();
    buildMap();
    var starStr = '⭐'.repeat(s) + '☆'.repeat(3 - s);
    doneTitleEl.textContent = cur >= MAX_LEVEL ? '🏆 Campaign Complete!' : '🎉 Level ' + cur + ' Complete!';
    doneStatsEl.textContent = 'You built the ' + target + ' tile in ' + moves + ' moves' +
      (p ? ' (par ' + p + ')' : '') + ' — ' + starStr +
      (cur < MAX_LEVEL ? ' Level ' + (cur + 1) + ' is now unlocked — keep climbing!' :
        ' You finished all 100 levels — amazing!');
    doneEl.classList.remove('hidden');
  }

  function setMode(m) {
    mode = m === 'free' ? 'free' : 'campaign';
    try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
    if (modeCampBtn) modeCampBtn.classList.toggle('mode-sel', mode === 'campaign');
    if (modeFreeBtn) modeFreeBtn.classList.toggle('mode-sel', mode === 'free');
    if (areaEl) areaEl.classList.toggle('free-mode', mode === 'free');
    if (mode === 'campaign') startLevel();
    else newGame();
  }

  /* ---------- movement ---------- */
  // Lines of cells ordered in the direction of travel.
  function getLines(dir) {
    var lines = [];
    for (var i = 0; i < SIZE; i++) {
      var line = [];
      for (var j = 0; j < SIZE; j++) {
        var x, y;
        if (dir === 'left') { x = j; y = i; }
        else if (dir === 'right') { x = SIZE - 1 - j; y = i; }
        else if (dir === 'up') { x = i; y = j; }
        else { x = i; y = SIZE - 1 - j; }
        line.push({ x: x, y: y, tile: grid[y][x] });
      }
      lines.push(line);
    }
    return lines;
  }

  // Slide + merge one ordered line. Returns new cell contents,
  // score gained, tiles removed (with their merge target), and
  // whether anything changed.
  function mergeLine(cells, state) {
    var tiles = [];
    cells.forEach(function (c) { if (c.tile) tiles.push(c.tile); });
    var out = [], gained = 0, i = 0;
    while (i < tiles.length) {
      if (i + 1 < tiles.length && tiles[i + 1].value === tiles[i].value) {
        var nt = { id: nextId++, value: tiles[i].value * 2, x: 0, y: 0 };
        out.push(nt);
        gained += nt.value;
        state.removed.push({ id: tiles[i].id, x: cells[out.length - 1].x, y: cells[out.length - 1].y });
        state.removed.push({ id: tiles[i + 1].id, x: cells[out.length - 1].x, y: cells[out.length - 1].y });
        if (nt.value === 2048 && !won) { won = true; state.hit2048 = true; }
        i += 2;
      } else {
        out.push(tiles[i]);
        i += 1;
      }
    }
    var moved = false;
    var result = [];
    for (var k = 0; k < SIZE; k++) {
      var t = out[k] || null;
      if (t) { t.x = cells[k].x; t.y = cells[k].y; }
      result.push(t);
      var beforeId = cells[k].tile ? cells[k].tile.id : 0;
      var afterId = t ? t.id : 0;
      if (beforeId !== afterId) moved = true;
    }
    return { cells: result, gained: gained, moved: moved };
  }

  function doMove(dir) {
    if (over) return;
    var state = { removed: [], hit2048: false };
    var anyMoved = false, gained = 0, results = [];
    getLines(dir).forEach(function (cells) {
      var r = mergeLine(cells, state);
      results.push(r);
      if (r.moved) anyMoved = true;
      gained += r.gained;
    });
    if (!anyMoved) return; // invalid move: nothing spawns, not counted

    // Rebuild grid from merged lines.
    grid = emptyGrid();
    results.forEach(function (r) {
      r.cells.forEach(function (t) {
        if (t) grid[t.y][t.x] = t;
      });
    });

    // Animate: slide removed tiles onto their merge target, then delete.
    state.removed.forEach(function (rt) {
      var el = tileEls[rt.id];
      if (!el) return;
      el.style.left = (gapPx + rt.x * (cellPx + gapPx)) + 'px';
      el.style.top = (gapPx + rt.y * (cellPx + gapPx)) + 'px';
      el.style.zIndex = 1;
      (function (id) {
        setTimeout(function () {
          var e = tileEls[id];
          if (e && e.parentNode) e.parentNode.removeChild(e);
          delete tileEls[id];
        }, MOVE_MS + 20);
      })(rt.id);
    });

    // Move surviving tiles; create newly merged ones with a pop.
    results.forEach(function (r) {
      r.cells.forEach(function (t) {
        if (!t) return;
        var el = tileEls[t.id];
        if (el) {
          el._tile = t;
          placeTile(el, t);
        } else {
          createTileEl(t, true, true);
        }
      });
    });

    score += gained;
    updateScores();
    spawnRandom();
    moves++;
    updateMoves();

    if (mode === 'campaign' && !levelWon && maxTile() >= targetFor(cur)) {
      levelWon = true;
      setTimeout(finishLevel, MOVE_MS + 120);
    } else if (state.hit2048 && mode === 'free') {
      winStatsEl.textContent = 'Score: ' + score + ' — can you go further?';
      setTimeout(function () { winEl.classList.remove('hidden'); }, MOVE_MS + 120);
    } else if (!movesAvailable()) {
      setTimeout(gameOver, MOVE_MS + 120);
    }
  }

  function movesAvailable() {
    if (emptyCells().length) return true;
    for (var y = 0; y < SIZE; y++)
      for (var x = 0; x < SIZE; x++) {
        var v = grid[y][x].value;
        if (x + 1 < SIZE && grid[y][x + 1].value === v) return true;
        if (y + 1 < SIZE && grid[y + 1][x].value === v) return true;
      }
    return false;
  }

  function gameOver() {
    over = true;
    if (mode === 'campaign') {
      overStatsEl.textContent = 'Level ' + cur + ': the board filled up before you reached the ' +
        targetFor(cur) + ' tile. Score: ' + score + ' — try the level again!';
    } else {
      overStatsEl.textContent = 'Final score: ' + score + ' · Best: ' + (best > 0 ? best : score);
    }
    overEl.classList.remove('hidden');
  }

  /* ---------- input ---------- */
  var keyMap = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };
  document.addEventListener('keydown', function (e) {
    var dir = keyMap[e.key];
    if (dir) {
      e.preventDefault();
      doMove(dir);
    }
  });

  var touchX = 0, touchY = 0;
  boardEl.addEventListener('touchstart', function (e) {
    var t = e.changedTouches[0];
    touchX = t.clientX; touchY = t.clientY;
  }, { passive: true });
  boardEl.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0];
    var dx = t.clientX - touchX, dy = t.clientY - touchY;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left');
    else doMove(dy > 0 ? 'down' : 'up');
  }, { passive: true });

  /* ---------- buttons ---------- */
  document.getElementById('m-restart').addEventListener('click', newGame);
  document.getElementById('m-again').addEventListener('click', newGame);
  document.getElementById('m-again-win').addEventListener('click', newGame);
  document.getElementById('m-keep').addEventListener('click', function () {
    winEl.classList.add('hidden');
  });
  document.getElementById('m-next').addEventListener('click', function () {
    if (cur < MAX_LEVEL) { cur++; saveCampaign(); }
    startLevel();
  });
  document.getElementById('m-replay').addEventListener('click', startLevel);
  modeCampBtn.addEventListener('click', function () { if (mode !== 'campaign') setMode('campaign'); });
  modeFreeBtn.addEventListener('click', function () { if (mode !== 'free') setMode('free'); });

  /* ---------- visual add-on: floating merge-score popups ----------
     Render layer only: watches the score readout the game already
     updates and floats a "+N" chip over the board when it rises.
     Reads nothing from game state and changes nothing. */
  var lastShownScore = 0;
  function spawnScorePopup(amount) {
    if (!boardEl || amount <= 0) return;
    var el = document.createElement('div');
    el.className = 'b2048-float' + (amount >= 128 ? ' big' : '');
    el.textContent = '+' + amount;
    boardEl.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1000);
  }
  if (window.MutationObserver && scoreEl) {
    new MutationObserver(function () {
      var v = parseInt(scoreEl.textContent, 10) || 0;
      if (v > lastShownScore) spawnScorePopup(v - lastShownScore);
      lastShownScore = v;
    }).observe(scoreEl, { childList: true, characterData: true, subtree: true });
  }

  /* ---------- test hook (house pattern, cf. window.__mm) ---------- */
  window.__m2048 = {
    targetFor: targetFor,
    parFor: parFor,
    starsForMoves: starsForMoves,
    state: function () {
      return {
        mode: mode, cur: cur, unlocked: unlocked,
        stars: JSON.parse(JSON.stringify(starMap)),
        moves: moves, score: score, over: over, levelWon: levelWon,
        maxTile: grid ? maxTile() : 0
      };
    },
    // Replace the board with 16 row-major values (0 = empty) and
    // reset the run — used by automated play-tests to reach win/lose
    // states without hundreds of random moves.
    setup: function (vals) {
      Object.keys(tileEls).forEach(function (id) {
        var el = tileEls[id];
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      tileEls = {};
      grid = emptyGrid();
      score = 0; moves = 0; over = false; won = false; levelWon = false;
      winEl.classList.add('hidden');
      overEl.classList.add('hidden');
      if (doneEl) doneEl.classList.add('hidden');
      for (var i = 0; i < 16; i++) {
        var v = vals[i] || 0;
        if (!v) continue;
        var t = { id: nextId++, value: v, x: i % SIZE, y: Math.floor(i / SIZE) };
        grid[t.y][t.x] = t;
        createTileEl(t, false);
      }
      updateScores();
      updateMoves();
      layout();
    }
  };

  /* ---------- init ---------- */
  try { best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (e) { best = 0; }
  for (var r = 0; r < SIZE; r++)
    for (var c = 0; c < SIZE; c++) {
      var cell = document.createElement('div');
      cell.className = 'b2048-cell';
      cell.dataset.r = r; cell.dataset.c = c;
      boardEl.appendChild(cell);
      cellEls.push(cell);
    }
  buildMap();
  setMode(mode);
  layout();
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 150);
  });
  // Board width is known after CSS applies; re-layout on next frame too.
  requestAnimationFrame(layout);
})();
