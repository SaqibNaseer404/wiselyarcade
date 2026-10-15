/* 2048 Merge — clean-room sliding-tile puzzle for Wisely Arcade.
   Vanilla JS, no libraries. Slide tiles with arrows/WASD or swipe;
   equal tiles merge once per move, score grows with every merge. */
(function () {
  'use strict';

  var SIZE = 4;
  var BEST_KEY = 'wisely_2048_best';
  var MOVE_MS = 130;

  var boardEl = document.getElementById('b2048-board');
  var scoreEl = document.getElementById('m-score');
  var bestEl = document.getElementById('m-best');
  var winEl = document.getElementById('m-win');
  var overEl = document.getElementById('m-over');
  var winStatsEl = document.getElementById('m-win-stats');
  var overStatsEl = document.getElementById('m-over-stats');

  // Glossy candy-3D palette: {l: light bevel, b: base, d: dark bevel, t: text}.
  // Low values ramp through teal; 128+ ramp through orange, echoing the
  // game's candy-gloss thumbnail.
  var TILE_STYLE = {
    2:    { l: '#F4FEFD', b: '#DFF8F6', d: '#A9E3E0', t: '#0B3B39' },
    4:    { l: '#E9FBF9', b: '#C6F1EE', d: '#8BD9D5', t: '#0B3B39' },
    8:    { l: '#D8F8F5', b: '#A5E8E4', d: '#5FCFC9', t: '#0B3B39' },
    16:   { l: '#C4F2EF', b: '#83DED9', d: '#38BCB7', t: '#0B3B39' },
    32:   { l: '#A9EAE6', b: '#5BD2CC', d: '#1FA8A3', t: '#FFFFFF' },
    64:   { l: '#8AE0DA', b: '#38C3BC', d: '#0E7F7A', t: '#FFFFFF' },
    128:  { l: '#FFEBCC', b: '#FFC46E', d: '#EE931E', t: '#FFFFFF' },
    256:  { l: '#FFDFB0', b: '#FFAE45', d: '#E07F10', t: '#FFFFFF' },
    512:  { l: '#FFD69C', b: '#FF9C2E', d: '#D06E0B', t: '#FFFFFF' },
    1024: { l: '#FCC489', b: '#FB8B1E', d: '#C05F06', t: '#FFFFFF' },
    2048: { l: '#FDB45C', b: '#F8770A', d: '#A84E03', t: '#FFFFFF' }
  };

  var grid;        // SIZE x SIZE array of tile objects or null
  var tileEls = {}; // tile id -> DOM element
  var cellEls = []; // background cells
  var nextId = 1;
  var score = 0;
  var best = 0;
  var over = false;
  var won = false;  // 2048 reached this run (overlay shown once)
  var cellPx = 0, gapPx = 0;

  function tileColors(value) {
    if (TILE_STYLE[value]) return TILE_STYLE[value];
    return { l: '#F2A93B', b: '#D98A12', d: '#8A5604', t: '#FFFFFF' }; // super tiles beyond 2048
  }

  // Round 1: pastel outer glow per high tier (visual only)
  function tierGlow(v) {
    if (v >= 2048) return '0 0 22px rgba(255,170,60,.90)';
    if (v >= 1024) return '0 0 18px rgba(255,223,158,.70)';
    if (v >= 512) return '0 0 16px rgba(246,179,194,.60)';
    if (v >= 256) return '0 0 14px rgba(154,220,214,.55)';
    if (v >= 128) return '0 0 12px rgba(194,169,242,.55)';
    return null;
  }

  // Glossy candy-3D surface: white specular bloom top-left over a
  // light-to-dark diagonal bevel gradient.
  function tileGloss(style) {
    return 'radial-gradient(120% 90% at 28% 16%, rgba(255,255,255,.65) 0%, rgba(255,255,255,0) 52%),' +
      'linear-gradient(160deg,' + style.l + ' 0%,' + style.b + ' 45%,' + style.d + ' 100%)';
  }

  // 3D relief shadows: light top edge, dark bottom edge, soft drop shadow.
  // Optional extra glow (2048+) is layered in front.
  function tileShadow(glow) {
    var base = 'inset 0 2px 3px rgba(255,255,255,.55),inset 0 -4px 7px rgba(0,0,0,.20),0 5px 10px rgba(11,59,57,.24)';
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
    if (score > best) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
    }
    bestEl.textContent = best > 0 ? best : '—';
  }

  function newGame() {
    Object.keys(tileEls).forEach(function (id) {
      var el = tileEls[id];
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    tileEls = {};
    grid = emptyGrid();
    score = 0; over = false; won = false;
    winEl.classList.add('hidden');
    overEl.classList.add('hidden');
    spawnRandom();
    spawnRandom();
    updateScores();
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
    if (!anyMoved) return; // invalid move: nothing spawns

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

    if (state.hit2048) {
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
    overStatsEl.textContent = 'Final score: ' + score + ' · Best: ' + (best > 0 ? best : score);
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
  newGame();
  layout();
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 150);
  });
  // Board width is known after CSS applies; re-layout on next frame too.
  requestAnimationFrame(layout);
})();
