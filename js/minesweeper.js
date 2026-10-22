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
  var NUM_COLS = ['', '#57a8ff', '#3ddc74', '#ff5252', '#b388ff',
                  '#ffb020', '#2dd4bf', '#ff5da2', '#c7cede'];
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
    confetti.length = 0; // Round 1: clear win confetti on new board
    var d = DIFFS[diff];    rows = d.rows; cols = d.cols; mineCount = d.mines; T = d.tile;
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
    if (cell.f) flagPops.push({ r: r, c: c, t0: nowMs }); // Round 1: flag bounce
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
    // Round 1: pastel confetti burst on win
    var CONF_COLS = ['#C2A9F2', '#9ADCD6', '#F6B3C2', '#FFDF9E', '#BFE3FA'];
    for (var cf = 0; cf < 90; cf++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 140,
        vx: (Math.random() - 0.5) * 70,
        vy: 90 + Math.random() * 170,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 9,
        life: 2.2 + Math.random() * 1.4,
        c: CONF_COLS[cf % CONF_COLS.length],
        w: 5 + Math.random() * 5
      });
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
    // v5 premium: machined dark-metal plate — brushed body, machined
    // bevel, top sheen, corner rivets (visual only)
    // contact shadow
    ctx.fillStyle = 'rgba(2,5,12,0.45)';
    rr(x + 1, y + 3, s - 2, s - 2, 6); ctx.fill();
    // brushed metal body
    var g = ctx.createLinearGradient(x, y, x + s * 0.35, y + s);
    g.addColorStop(0, '#5b6a86');
    g.addColorStop(0.45, '#424e66');
    g.addColorStop(1, '#2b3349');
    ctx.fillStyle = g;
    rr(x, y, s, s, 6); ctx.fill();
    // brushed streaks — deterministic hash of position, never flickers
    var h = (x * 73 + y * 149) % 97, li;
    ctx.save();
    rr(x + 2, y + 2, s - 4, s - 4, 5); ctx.clip();
    for (li = 0; li < 4; li++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.028 + ((h + li * 29) % 10) * 0.004) + ')';
      ctx.fillRect(x + 1, y + 3 + ((h + li * 37) % Math.max(6, s - 8)), s - 2, 1.1);
    }
    ctx.restore();
    // machined bevel: bright top + left, dark bottom + right
    ctx.fillStyle = 'rgba(214,228,255,0.55)';
    rr(x + 2.5, y + 2, s - 5, 2.4, 1.2); ctx.fill();
    rr(x + 2, y + 2.5, 2.4, s - 5, 1.2); ctx.fill();
    ctx.fillStyle = 'rgba(5,8,16,0.65)';
    rr(x + 2.5, y + s - 4.6, s - 5, 2.4, 1.2); ctx.fill();
    rr(x + s - 4.6, y + 2.5, 2.4, s - 5, 1.2); ctx.fill();
    // top sheen
    var sg = ctx.createLinearGradient(0, y, 0, y + s * 0.5);
    sg.addColorStop(0, 'rgba(255,255,255,0.20)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    rr(x + 1.5, y + 1.5, s - 3, s * 0.5, 5); ctx.fill();
    // corner rivets
    var ro = s * 0.16, rj;
    var riv = [[x + ro, y + ro], [x + s - ro, y + ro], [x + ro, y + s - ro], [x + s - ro, y + s - ro]];
    for (rj = 0; rj < 4; rj++) {
      ctx.fillStyle = 'rgba(8,11,20,0.55)';
      ctx.beginPath(); ctx.arc(riv[rj][0], riv[rj][1] + 0.7, Math.max(1.1, s * 0.045), 0, 6.29); ctx.fill();
      ctx.fillStyle = 'rgba(205,220,248,0.75)';
      ctx.beginPath(); ctx.arc(riv[rj][0] - 0.4, riv[rj][1] - 0.4, Math.max(0.8, s * 0.032), 0, 6.29); ctx.fill();
    }
  }

  function tilePressed(x, y, s) {
    // v5 premium: deep carved well — dark inset, lit lower lip
    var g = ctx.createLinearGradient(0, y, 0, y + s);
    g.addColorStop(0, '#141a2c');
    g.addColorStop(0.5, '#1a2238');
    g.addColorStop(1, '#202a44');
    ctx.fillStyle = g;
    rr(x + 1, y + 1, s - 2, s - 2, 5); ctx.fill();
    // inner shadow: top + left
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    rr(x + 2.5, y + 2, s - 5, 3, 1.5); ctx.fill();
    rr(x + 2, y + 2.5, 3, s - 5, 1.5); ctx.fill();
    // soft glow on the well floor
    var fg = ctx.createRadialGradient(x + s / 2, y + s * 0.62, 1, x + s / 2, y + s * 0.62, s * 0.55);
    fg.addColorStop(0, 'rgba(120,150,220,0.10)');
    fg.addColorStop(1, 'rgba(120,150,220,0)');
    ctx.fillStyle = fg;
    rr(x + 1, y + 1, s - 2, s - 2, 5); ctx.fill();
    // light catching the bottom + right lip
    ctx.fillStyle = 'rgba(190,208,245,0.20)';
    rr(x + 3, y + s - 4.2, s - 6, 1.8, 0.9); ctx.fill();
    rr(x + s - 4.2, y + 3, 1.8, s - 6, 0.9); ctx.fill();
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
    ctx.font = '700 ' + Math.floor(s * 0.58) + 'px "Barlow Condensed", Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // v5 premium: luminous numeral — soft glow pass under a crisp core
    ctx.shadowColor = NUM_COLS[board[r][c].n];
    ctx.shadowBlur = s * 0.34;
    ctx.fillText(String(board[r][c].n), 0, s * 0.03);
    ctx.shadowBlur = 0;
    ctx.fillText(String(board[r][c].n), 0, s * 0.03);
    ctx.restore();
  }

  function drawFlag(x, y, s) {
    var cx = x + s / 2;
    var baseY = y + s * 0.80, topY = y + s * 0.20;
    var wave = Math.sin(nowMs / 170 + x * 0.05) * s * 0.05;
    // v5 premium: planting shadow under the flag base
    ctx.fillStyle = 'rgba(3,6,14,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, baseY + s * 0.045, s * 0.20, s * 0.05, 0, 0, 6.29);
    ctx.fill();
    // pole
    ctx.strokeStyle = '#6e5626';
    ctx.lineWidth = Math.max(2, s * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, baseY); ctx.lineTo(cx, topY); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,235,190,0.6)';
    ctx.lineWidth = Math.max(1, s * 0.025);
    ctx.beginPath(); ctx.moveTo(cx - s * 0.015, baseY); ctx.lineTo(cx - s * 0.015, topY + s * 0.03); ctx.stroke();
    // golden finial ball
    ctx.fillStyle = '#f5a623';
    ctx.beginPath(); ctx.arc(cx, topY - s * 0.015, Math.max(1.4, s * 0.05), 0, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.85)';
    ctx.beginPath(); ctx.arc(cx - s * 0.015, topY - s * 0.03, Math.max(0.7, s * 0.02), 0, 6.29); ctx.fill();
    // waving cloth — v5 premium: shaded red-to-crimson pennant
    var fw = s * 0.36, fh = s * 0.24;
    var cg = ctx.createLinearGradient(cx, topY, cx + fw, topY + fh);
    cg.addColorStop(0, '#ff6b5e');
    cg.addColorStop(0.55, '#e63946');
    cg.addColorStop(1, '#b3122e');
    ctx.fillStyle = cg;
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
      // v5 premium: radial detonation burst in the cell
      var bg = ctx.createRadialGradient(x + s / 2, y + s / 2, 1, x + s / 2, y + s / 2, s * 0.72);
      bg.addColorStop(0, 'rgba(255,120,90,0.85)');
      bg.addColorStop(0.45, 'rgba(230,57,70,0.55)');
      bg.addColorStop(1, 'rgba(230,57,70,0)');
      ctx.fillStyle = bg;
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
    g.addColorStop(0, '#7d7d8c');
    g.addColorStop(0.55, '#363642');
    g.addColorStop(1, '#101014');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.29); ctx.fill();
    // specular highlight
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(cx - r * 0.34, cy - r * 0.38, r * 0.20, 0, 6.29); ctx.fill();
    // v5 premium: fuse spark — a hot glint flickering at the crown
    var flick = 0.75 + 0.25 * Math.sin(nowMs / 90 + x * 0.7);
    ctx.save();
    ctx.shadowColor = 'rgba(255,90,60,0.95)';
    ctx.shadowBlur = 7 * flick;
    ctx.fillStyle = 'rgba(255,' + Math.floor(140 + 60 * flick) + ',70,0.95)';
    ctx.beginPath(); ctx.arc(cx + r * 0.52, cy - r * 0.78, Math.max(1.1, r * 0.13), 0, 6.29); ctx.fill();
    ctx.restore();
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

  // v5 premium render-layer state (visual only — no game logic reads these)
  var revealFx = {};          // cellKey -> reveal-cascade start time
  var fxState = '', fxT0 = 0; // end-of-game transition stamp for win/lose flourishes

  function draw() {
    var bw = cols * T, bh = rows * T, r, c, x, y, cell;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // v5 premium: deep aura behind a dark-glass slab frame
    var pa = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 40, canvas.width / 2, canvas.height / 2, canvas.width * 0.72);
    pa.addColorStop(0, 'rgba(90,120,200,0.20)');
    pa.addColorStop(1, 'rgba(90,120,200,0)');
    ctx.fillStyle = pa;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // slab: drop shadow + halo, charcoal-navy glass
    ctx.save();
    ctx.shadowColor = 'rgba(3,6,16,0.55)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 10;
    var pg = ctx.createLinearGradient(0, PAD - 7, 0, PAD + bh + 7);
    pg.addColorStop(0, '#27324e');
    pg.addColorStop(0.5, '#1a2338');
    pg.addColorStop(1, '#121a2c');
    ctx.fillStyle = pg;
    rr(PAD - 7, PAD - 7, bw + 14, bh + 14, 14); ctx.fill();
    ctx.restore();
    // warm centre glow inside the slab
    var wg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 10, canvas.width / 2, canvas.height / 2, canvas.width * 0.55);
    wg.addColorStop(0, 'rgba(245,166,35,0.07)');
    wg.addColorStop(1, 'rgba(245,166,35,0)');
    ctx.fillStyle = wg;
    rr(PAD - 7, PAD - 7, bw + 14, bh + 14, 14); ctx.fill();
    // top sheen + hairline border
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    rr(PAD - 4, PAD - 5, bw + 8, 2, 1); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    rr(PAD - 7, PAD - 7, bw + 14, bh + 14, 14); ctx.stroke();
    // end-of-game transition stamp (render layer only)
    if (fxState !== state) { fxState = state; fxT0 = nowMs; }
    var freshN = 0;

    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        x = PAD + c * T; y = PAD + r * T;
        cell = board[r][c];
        if (!cell.r) {
          if (revealFx[r * 64 + c] !== undefined) delete revealFx[r * 64 + c];
          tile3D(x, y, T);
          // Round 1: hovered tile — brightened bevel + warm glow (v5 recolor)
          if (hoverCell && hoverCell.r === r && hoverCell.c === c && state === 'playing') {
            ctx.save();
            ctx.shadowColor = 'rgba(255,214,130,0.85)';
            ctx.shadowBlur = 14;
            ctx.fillStyle = 'rgba(255,255,255,0.20)';
            rr(x, y, T, T, 6); ctx.fill();
            ctx.restore();
          }
          // v5 premium: pressed tile dips into shadow while held
          if (pDown && pDown.r === r && pDown.c === c && state !== 'won' && state !== 'lost') {
            ctx.fillStyle = 'rgba(6,9,18,0.30)';
            rr(x + 1.5, y + 1.5, T - 3, T - 3, 5); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            rr(x + 2.5, y + 2, T - 5, 2.4, 1.2); ctx.fill();
          }
          if (cell.f) {
            // Round 1: tiny bounce when a flag is placed
            var bScale = 1, fi;
            for (fi = flagPops.length - 1; fi >= 0; fi--) {
              var fp = flagPops[fi];
              if (fp.r === r && fp.c === c) {
                var fk = (nowMs - fp.t0) / 240;
                if (fk >= 1) flagPops.splice(fi, 1);
                else bScale = 1 + 0.35 * Math.sin(fk * Math.PI);
                break;
              }
            }
            ctx.save();
            ctx.translate(x + T / 2, y + T / 2);
            ctx.scale(bScale, bScale);
            ctx.translate(-(x + T / 2), -(y + T / 2));
            drawFlag(x, y, T);
            ctx.restore();
          }
        } else {
          tilePressed(x, y, T);
          // v5 premium: stamp freshly revealed cells for the cascade wash
          var fxKey = r * 64 + c;
          if (revealFx[fxKey] === undefined) revealFx[fxKey] = nowMs + (freshN++) * 14;
          if (cell.m) {
            var isBoom = !!(exploded && exploded.r === r && exploded.c === c);
            if (state === 'lost' && !isBoom) {
              // v5 premium: surviving mines fade in, rippling out from the blast
              var dist = exploded ? (Math.abs(r - exploded.r) + Math.abs(c - exploded.c)) : 0;
              var ma = (nowMs - fxT0 - dist * 45) / 220;
              if (ma >= 1) drawMine(x, y, T, false);
              else if (ma > 0) {
                ctx.save(); ctx.globalAlpha = ma;
                drawMine(x, y, T, false);
                ctx.restore();
              }
            } else drawMine(x, y, T, isBoom);
          }
          else if (cell.x) drawWrong(x, y, T);
          else if (cell.n > 0) drawNumber(r, c, x, y, T);
          // v5 premium: a soft light washes through freshly opened cells
          if (!cell.m) {
            var ck = (nowMs - revealFx[fxKey]) / 280;
            if (ck >= 0 && ck < 1) {
              ctx.fillStyle = 'rgba(190,215,255,' + (0.30 * (1 - ck)).toFixed(3) + ')';
              rr(x + 1, y + 1, T - 2, T - 2, 5); ctx.fill();
            }
          }
        }
      }
    }
    // v5 premium: golden victory sweep gliding across a won board
    if (state === 'won') {
      var swp = ((nowMs - fxT0) % 2600) / 2600;
      var sx = PAD - 20 + swp * (bw + 40);
      var sgr = ctx.createLinearGradient(sx - bw * 0.28, 0, sx + bw * 0.28, 0);
      sgr.addColorStop(0, 'rgba(255,205,90,0)');
      sgr.addColorStop(0.5, 'rgba(255,205,90,0.13)');
      sgr.addColorStop(1, 'rgba(255,205,90,0)');
      ctx.save();
      rr(PAD - 7, PAD - 7, bw + 14, bh + 14, 14); ctx.clip();
      ctx.fillStyle = sgr;
      ctx.fillRect(PAD - 7, PAD - 7, bw + 14, bh + 14);
      ctx.restore();
    }
    // Round 1: win confetti (pastel, over the board)
    for (var cfi = 0; cfi < confetti.length; cfi++) {
      var cfp = confetti[cfi];
      ctx.save();
      ctx.translate(cfp.x, cfp.y);
      ctx.rotate(cfp.rot);
      ctx.globalAlpha = Math.min(1, cfp.life);
      ctx.fillStyle = cfp.c;
      ctx.fillRect(-cfp.w / 2, -cfp.w / 4, cfp.w, cfp.w / 2);
      ctx.restore();
    }
  }

  // ---------- main loop ----------
  var lastFrameT = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    nowMs = ts || 0;
    var fdt = lastFrameT ? Math.min(0.05, (nowMs - lastFrameT) / 1000) : 0.016;
    lastFrameT = nowMs;
    // Round 1: win-confetti physics
    for (var ci = confetti.length - 1; ci >= 0; ci--) {
      var cp = confetti[ci];
      cp.life -= fdt;
      if (cp.life <= 0) { confetti.splice(ci, 1); continue; }
      cp.x += cp.vx * fdt;
      cp.y += cp.vy * fdt;
      cp.vy += 60 * fdt;
      cp.rot += cp.vr * fdt;
    }
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
  // Round 1: hover + flag-bounce + confetti state (visual only)
  var hoverCell = null;
  var flagPops = [];
  var confetti = [];

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

  // Round 1: hover highlight for tiles (desktop mouse only; visual)
  canvas.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse') hoverCell = cellFromEvent(e);
  });
  canvas.addEventListener('pointerleave', function () { hoverCell = null; });

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
