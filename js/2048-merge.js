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

  // Teal-family palette: soft board, tiles deepen as values grow.
  var TILE_STYLE = {
    2:    ['#EDFAF9', '#0B3B39'],
    4:    ['#D7F3F1', '#0B3B39'],
    8:    ['#ABE6E3', '#0B3B39'],
    16:   ['#7CD7D4', '#0B3B39'],
    32:   ['#4CC6C2', '#FFFFFF'],
    64:   ['#1FB3AF', '#FFFFFF'],
    128:  ['#0EA5A4', '#FFFFFF'],
    256:  ['#0C8F8E', '#FFFFFF'],
    512:  ['#0A7A79', '#FFFFFF'],
    1024: ['#086463', '#FFFFFF'],
    2048: ['#064E4D', '#FFFFFF']
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
    return ['#053D3C', '#FFFFFF']; // super tiles beyond 2048
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

  function createTileEl(tile, pop) {
    var el = document.createElement('div');
    el.className = 'b2048-tile';
    var colors = tileColors(tile.value);
    el.style.background = colors[0];
    el.style.color = colors[1];
    el.textContent = tile.value;
    if (tile.value >= 2048) el.style.boxShadow = '0 0 18px rgba(14,165,164,.85)';
    el._tile = tile;
    placeTile(el, tile);
    if (pop) {
      el.classList.add('pop');
      setTimeout(function () { el.classList.remove('pop'); }, 220);
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
          createTileEl(t, true);
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
