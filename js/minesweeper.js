// Minesweeper — Wisely Arcade
// Classic minesweeper with glossy HD 3D tiles. Flood fill, flagging,
// first-click safety, two difficulties, best times. Vanilla JS + canvas only.
(function () {
  'use strict';

  var canvas = document.getElementById('sweep');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var DIFFS = {
    easy:   { rows: 9,  cols: 9,  mines: 10, tile: 36 },
    medium: { rows: 16, cols: 16, mines: 40, tile: 27 }
  };
  var NUM_COLS = ['', '#1976d2', '#388e3c', '#d32f2f', '#7b1fa2',
                  '#e65100', '#0097a7', '#455a64', '#5d4037'];
  var PAD = 14;
  var LONG_MS = 500;

  var diff = 'easy';
  var rows = 9, cols = 9, mineCount = 10, T = 36;
  var board = [];            // [r][c] -> {m:mine, r:revealed, f:flagged, n:adjacent, x:wrongFlag}
  var state = 'ready';       // ready | playing | won | lost
  var minesPlaced = false;
  var revealedCount = 0, flagCount = 0;
  var timerOn = false, startStamp = 0, elapsed = 0;
  var flagMode = false;
  var exploded = null;       // {r,c} of the mine that ended the game
  var pops = [];             // reveal pop animations {r,c,t0}
  var nowMs = 0;

  var best = { easy: 0, medium: 0 };
  try {
    best.easy = parseInt(localStorage.getItem('wisely_minesweeper_best_easy') || '0', 10) || 0;
    best.medium = parseInt(localStorage.getItem('wisely_minesweeper_best_medium') || '0', 10) || 0;
  } catch (e) {}

  var elMines = document.getElementById('m-mines');
  var elTime = document.getElementById('m-time');
  var elBest = document.getElementById('m-best');
  var overlay = document.getElementById('m-over');
  var overTitle = document.getElementById('m-over-title');
  var overStats = document.getElementById('m-over-stats');
  var btnAgain = document.getElementById('m-again');
  var btnRestart = document.getElementById('m-restart');
  var btnEasy = document.getElementById('m-diff-easy');
  var btnMedium = document.getElementById('m-diff-medium');
  var btnFlagMode = document.getElementById('m-flagmode');

  // ---------- helpers ----------
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fmt(s) { return Math.floor(s) + 's'; }

  function neigh(r, c) {
    var out = [], dr, dc, nr, nc;
    for (dr = -1; dr <= 1; dr++) {
      for (dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        nr = r + dr; nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push([nr, nc]);
      }
    }
    return out;
  }

  // ---------- game state ----------
  function updateHUD() {
    elMines.textContent = mineCount - flagCount;
    elTime.textContent = fmt(elapsed);
    elBest.textContent = best[diff] ? fmt(best[diff]) : '—';
  }

  function syncDiffButtons() {
    btnEasy.classList.toggle('ghost', diff !== 'easy');
    btnMedium.classList.toggle('ghost', diff !== 'medium');
  }

  function newBoard() {
    var d = DIFFS[diff];
    rows = d.rows; cols = d.cols; mineCount = d.mines; T = d.tile;
    canvas.width = cols * T + PAD * 2;
    canvas.height = rows * T + PAD * 2;
    board = [];
    var r, c;
    for (r = 0; r < rows; r++) {
      var row = [];
      for (c = 0; c < cols; c++) row.push({ m: false, r: false, f: false, n: 0, x: false });
      board.push(row);
    }
    state = 'ready';
    minesPlaced = false;
    revealedCount = 0; flagCount = 0;
    timerOn = false; elapsed = 0;
    exploded = null; pops = [];
    overlay.classList.add('hidden');
    updateHUD();
  }

  function placeMines(sr, sc) {
    var placed = 0, guard = 0, r, c;
    while (placed < mineCount && guard < 20000) {
      guard++;
      r = ri(0, rows - 1); c = ri(0, cols - 1);
      if ((r === sr && c === sc) || board[r][c].m) continue;
      board[r][c].m = true;
      placed++;
    }
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        if (board[r][c].m) continue;
        var n = 0, nb = neigh(r, c), i;
        for (i = 0; i < nb.length; i++) {
          if (board[nb[i][0]][nb[i][1]].m) n++;
        }
        board[r][c].n = n;
      }
    }
  }

  function flood(sr, sc) {
    var stack = [[sr, sc]], p, r, c, cell, nb, i, ncell;
    while (stack.length) {
      p = stack.pop(); r = p[0]; c = p[1];
      cell = board[r][c];
      if (cell.r || cell.f || cell.m) continue;
      cell.r = true;
      revealedCount++;
      pops.push({ r: r, c: c, t0: nowMs });
      if (pops.length > 400) pops.splice(0, pops.length - 400);
      if (cell.n === 0) {
        nb = neigh(r, c);
        for (i = 0; i < nb.length; i++) {
          ncell = board[nb[i][0]][nb[i][1]];
          if (!ncell.r && !ncell.f && !ncell.m) stack.push([nb[i][0], nb[i][1]]);
        }
      }
    }
  }

  function startTimer() {
    timerOn = true;
    startStamp = nowMs;
  }
  function stopTimer() {
    if (timerOn) {
      elapsed = (nowMs - startStamp) / 1000;
      timerOn = false;
    }
  }

  function reveal(r, c) {
    if (state === 'won' || state === 'lost') return;
    var cell = board[r][c];
    if (cell.r || cell.f) return;
    if (!minesPlaced) {
      placeMines(r, c);          // first click is always safe
      minesPlaced = true;
      state = 'playing';
      startTimer();
    }
    if (cell.m) { lose(r, c); return; }
    flood(r, c);
    updateHUD();
    if (revealedCount === rows * cols - mineCount) win();
  }

  function toggleFlag(r, c) {
    if (state === 'won' || state === 'lost') return;
    var cell = board[r][c];
    if (cell.r) return;
    cell.f = !cell.f;
    flagCount += cell.f ? 1 : -1;
    updateHUD();
  }

  function win() {
    state = 'won';
    stopTimer();
    // auto-flag every remaining mine for a clean board
    var r, c;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        if (board[r][c].m && !board[r][c].f) {
          board[r][c].f = true;
          flagCount++;
        }
      }
    }
    var isBest = false;
    if (!best[diff] || elapsed < best[diff]) {
      best[diff] = elapsed;
      isBest = true;
      try { localStorage.setItem('wisely_minesweeper_best_' + diff, String(elapsed)); } catch (e) {}
    }
    updateHUD();
    overTitle.textContent = 'You win!';
    overStats.textContent = 'Board cleared in ' + fmt(elapsed) +
      (isBest ? ' — new best time!' : ' · Best ' + fmt(best[diff]));
    overlay.classList.remove('hidden');
  }

  function lose(r, c) {
    state = 'lost';
    stopTimer();
    exploded = { r: r, c: c };
    var rr2, cc;
    for (rr2 = 0; rr2 < rows; rr2++) {
      for (cc = 0; cc < cols; cc++) {
        var cell = board[rr2][cc];
        if (cell.m) { cell.r = true; cell.f = false; }
        else if (cell.f) { cell.x = true; }  // wrong flag
      }
    }
    updateHUD();
    overTitle.textContent = 'Boom!';
    overStats.textContent = 'You hit a mine after ' + fmt(elapsed) +
      '. Think it through — then try again.';
    overlay.classList.remove('hidden');
  }

  // ---------- drawing: glossy HD 3D tiles ----------
  function tile3D(x, y, s) {
    // soft drop shadow
    ctx.fillStyle = 'rgba(10,16,34,0.30)';
    rr(x + 1, y + 3, s - 2, s - 2, 6); ctx.fill();
    // base gradient
    var g = ctx.createLinearGradient(0, y, 0, y + s);
    g.addColorStop(0, '#d6def2');
    g.addColorStop(0.55, '#bcc7e4');
    g.addColorStop(1, '#a2aed2');
    ctx.fillStyle = g;
    rr(x, y, s, s, 6); ctx.fill();
    // light bevel: top + left
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    rr(x + 2.5, y + 2.5, s - 5, 3, 1.5); ctx.fill();
    rr(x + 2.5, y + 2.5, 3, s - 5, 1.5); ctx.fill();
    // dark bevel: bottom + right
    ctx.fillStyle = 'rgba(66,78,112,0.9)';
    rr(x + 2.5, y + s - 5.5, s - 5, 3, 1.5); ctx.fill();
    rr(x + s - 5.5, y + 2.5, 3, s - 5, 1.5); ctx.fill();
    // glossy highlight
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.beginPath();
    ctx.ellipse(x + s / 2, y + s * 0.27, s * 0.30, s * 0.13, 0, 0, 6.29);
    ctx.fill();
  }

  function tilePressed(x, y, s) {
    ctx.fillStyle = '#c6ccdf';
    rr(x + 1, y + 1, s - 2, s - 2, 5); ctx.fill();
    // inset shadow: top + left
    ctx.fillStyle = 'rgba(58,68,100,0.30)';
    rr(x + 2.5, y + 2.5, s - 5, 3, 1.5); ctx.fill();
    rr(x + 2.5, y + 2.5, 3, s - 5, 1.5); ctx.fill();
  }

  function drawNumber(r, c, x, y, s) {
    var scale = 1, i;
    for (i = pops.length - 1; i >= 0; i--) {
      var p = pops[i];
      if (p.r === r && p.c === c) {
        var k = (nowMs - p.t0) / 180;
        if (k >= 1) pops.splice(i, 1);
        else scale = 1 + 0.45 * (1 - k);
        break;
      }
    }
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2);
    ctx.scale(scale, scale);
    ctx.fillStyle = NUM_COLS[board[r][c].n];
    ctx.font = '800 ' + Math.floor(s * 0.54) + 'px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(board[r][c].n), 0, s * 0.04);
    ctx.restore();
  }

  function drawFlag(x, y, s) {
    var cx = x + s / 2;
    var baseY = y + s * 0.80, topY = y + s * 0.20;
    var wave = Math.sin(nowMs / 170 + x * 0.05) * s * 0.05;
    // pole
    ctx.strokeStyle = '#6e5626';
    ctx.lineWidth = Math.max(2, s * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, baseY); ctx.lineTo(cx, topY); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,235,190,0.6)';
    ctx.lineWidth = Math.max(1, s * 0.025);
    ctx.beginPath(); ctx.moveTo(cx - s * 0.015, baseY); ctx.lineTo(cx - s * 0.015, topY + s * 0.03); ctx.stroke();
    // waving cloth
    var fw = s * 0.36, fh = s * 0.24;
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.quadraticCurveTo(cx + fw * 0.6, topY + wave, cx + fw, topY + fh * 0.45 + wave);
    ctx.lineTo(cx, topY + fh);
    ctx.closePath(); ctx.fill();
    // cloth shading + gloss
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(cx, topY + fh * 0.12);
    ctx.quadraticCurveTo(cx + fw * 0.5, topY + fh * 0.12 + wave, cx + fw * 0.8, topY + fh * 0.4 + wave);
    ctx.lineTo(cx, topY + fh * 0.42);
    ctx.closePath(); ctx.fill();
    // base knob
    ctx.fillStyle = '#4e3d1e';
    rr(cx - s * 0.15, baseY - s * 0.02, s * 0.30, s * 0.09, 2); ctx.fill();
  }

  function drawMine(x, y, s, boom) {
    if (boom) {
      ctx.fillStyle = 'rgba(230,57,70,0.40)';
      rr(x + 1, y + 1, s - 2, s - 2, 5); ctx.fill();
    }
    var cx = x + s / 2, cy = y + s / 2, r = s * 0.30, i, a;
    // spikes
    ctx.strokeStyle = '#2b2b34';
    ctx.lineWidth = Math.max(2, s * 0.075);
    ctx.lineCap = 'round';
    for (i = 0; i < 8; i++) {
      a = i * Math.PI / 4 + Math.PI / 8;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(a) * r * 0.55, cy - Math.sin(a) * r * 0.55);
      ctx.lineTo(cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 1.3);
      ctx.stroke();
    }
    // glossy body
    var g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.38, r * 0.08, cx, cy, r);
    g.addColorStop(0, '#71717f');
    g.addColorStop(0.55, '#34343e');
    g.addColorStop(1, '#131318');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.29); ctx.fill();
    // specular highlight
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(cx - r * 0.34, cy - r * 0.38, r * 0.20, 0, 6.29); ctx.fill();
  }

  function drawWrong(x, y, s) {
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = Math.max(2.5, s * 0.1);
    ctx.lineCap = 'round';
    var m = s * 0.28, cx = x + s / 2, cy = y + s / 2;
    ctx.beginPath();
    ctx.moveTo(cx - m, cy - m); ctx.lineTo(cx + m, cy + m);
    ctx.moveTo(cx + m, cy - m); ctx.lineTo(cx - m, cy + m);
    ctx.stroke();
  }

  function draw() {
    var bw = cols * T, bh = rows * T, r, c, x, y, cell;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // board panel
    var pg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    pg.addColorStop(0, '#35436a');
    pg.addColorStop(1, '#222b48');
    ctx.fillStyle = pg;
    rr(PAD - 7, PAD - 7, bw + 14, bh + 14, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    rr(PAD - 7, PAD - 7, bw + 14, bh + 14, 14); ctx.stroke();

    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        x = PAD + c * T; y = PAD + r * T;
        cell = board[r][c];
        if (!cell.r) {
          tile3D(x, y, T);
          if (cell.f) drawFlag(x, y, T);
        } else {
          tilePressed(x, y, T);
          if (cell.m) drawMine(x, y, T, !!(exploded && exploded.r === r && exploded.c === c));
          else if (cell.x) drawWrong(x, y, T);
          else if (cell.n > 0) drawNumber(r, c, x, y, T);
        }
      }
    }
  }

  // ---------- main loop ----------
  function frame(ts) {
    requestAnimationFrame(frame);
    nowMs = ts || 0;
    if (timerOn) elTime.textContent = fmt((nowMs - startStamp) / 1000);
    draw();
  }

  // ---------- input ----------
  function cellFromEvent(e) {
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (canvas.width / rect.width);
    var y = (e.clientY - rect.top) * (canvas.height / rect.height);
    var c = Math.floor((x - PAD) / T);
    var r = Math.floor((y - PAD) / T);
    if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
    return { r: r, c: c };
  }

  var pDown = null, pTimer = null, pHandled = false, pStartX = 0, pStartY = 0;

  canvas.addEventListener('pointerdown', function (e) {
    var cell = cellFromEvent(e);
    if (!cell) return;
    pDown = cell;
    pHandled = false;
    pStartX = e.clientX; pStartY = e.clientY;
    pTimer = setTimeout(function () {
      if (pDown) {
        toggleFlag(pDown.r, pDown.c);
        pHandled = true;
      }
    }, LONG_MS);
    e.preventDefault();
  });

  // dragging off the pressed tile cancels the long-press
  canvas.addEventListener('pointermove', function (e) {
    if (!pDown || pHandled) return;
    if (Math.abs(e.clientX - pStartX) > 12 || Math.abs(e.clientY - pStartY) > 12) {
      if (pTimer) { clearTimeout(pTimer); pTimer = null; }
      pDown = null;
    }
  });

  function endPress(e) {
    if (pTimer) { clearTimeout(pTimer); pTimer = null; }
    if (pDown && !pHandled && e) {
      var cell = cellFromEvent(e);
      if (cell && cell.r === pDown.r && cell.c === pDown.c) {
        if (flagMode) toggleFlag(cell.r, cell.c);
        else reveal(cell.r, cell.c);
      }
    }
    pDown = null;
  }
  canvas.addEventListener('pointerup', endPress);
  canvas.addEventListener('pointercancel', function () { endPress(null); });
  canvas.addEventListener('pointerleave', function () { endPress(null); });

  canvas.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    var cell = cellFromEvent(e);
    if (cell) toggleFlag(cell.r, cell.c);
  });

  // ---------- buttons ----------
  function setDiff(d) {
    if (diff === d && minesPlaced) return;
    diff = d;
    syncDiffButtons();
    newBoard();
  }
  btnEasy.addEventListener('click', function () { setDiff('easy'); });
  btnMedium.addEventListener('click', function () { setDiff('medium'); });

  btnFlagMode.addEventListener('click', function () {
    flagMode = !flagMode;
    btnFlagMode.classList.toggle('ghost', !flagMode);
    btnFlagMode.setAttribute('aria-pressed', flagMode ? 'true' : 'false');
    btnFlagMode.textContent = 'Flag mode: ' + (flagMode ? 'ON' : 'OFF');
  });

  btnAgain.addEventListener('click', function () { newBoard(); });
  btnRestart.addEventListener('click', function () { newBoard(); });

  // go
  syncDiffButtons();
  newBoard();
  requestAnimationFrame(frame);
})();
