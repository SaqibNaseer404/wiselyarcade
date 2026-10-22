// Bubble Pop — Wisely Arcade
// Classic bubble shooter: aim the cannon, match 3+ to pop, drop orphans for bonus,
// survive the descending rows. Glossy 3D visuals, juicy pops. Vanilla JS + canvas only.
// Original code and art.
(function () {
  'use strict';

  var canvas = document.getElementById('bpop');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 420, H = 640;
  var R = 18, D = R * 2, ROW_H = D * 0.8660254;
  var COLS = 11;
  var GX = 12, GY = 16, TOP_Y = 4;
  var DANGER_Y = 498;
  var CX = W / 2, CY = 588;
  var SHOT_SPEED = 580;
  var SHOTS_PER_ROW = 6;

  var PALETTE = [
    { base: '#ef4444', light: '#fecaca', dark: '#7f1d1d' }, // red
    { base: '#3b82f6', light: '#bfdbfe', dark: '#1e3a8a' }, // blue
    { base: '#22c55e', light: '#bbf7d0', dark: '#14532d' }, // green
    { base: '#facc15', light: '#fef08a', dark: '#713f12' }, // yellow
    { base: '#a855f7', light: '#e9d5ff', dark: '#581c87' }, // purple
    { base: '#fb923c', light: '#fed7aa', dark: '#7c2d12' }  // orange (level 2+)
  ];

  var state = 'ready'; // ready | playing | paused | over
  var grid = [];       // rows of arrays; cell = -1 empty, else palette index
  var pShift = 0;      // flips each time a row is added (keeps screen-space parity)
  var level = 1, score = 0, shots = 0;
  var aim = -Math.PI / 2;
  var cur = 0, nxt = 1;
  var shot = null;     // {x,y,vx,vy,color}
  var parts = [], popups = [], fallers = [], rings = [];
  var bgBubs = [];
  var levelBanner = 0, bannerText = '';
  var newBest = false;
  var tGlobal = 0;
  var lastTouch = 0, touchArmed = false;

  var best = 0;
  try { best = parseInt(localStorage.getItem('wisely_bubble_pop_best') || '0', 10) || 0; } catch (e) {}

  var elScore = document.getElementById('b-score');
  var elLevel = document.getElementById('b-level');
  var elBest = document.getElementById('b-best');
  var overlay = document.getElementById('b-over');
  var overTitle = document.getElementById('b-over-title');
  var overStats = document.getElementById('b-over-stats');
  var btnAgain = document.getElementById('b-again');
  var btnRestart = document.getElementById('b-restart');

  // ---------- helpers ----------
  function rand(a, b) { return a + Math.random() * (b - a); }
  function ri(a, b) { return Math.floor(rand(a, b + 1)); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function oddRow(r) { return ((r + pShift) % 2) === 1; }
  function rowLen(r) { return oddRow(r) ? COLS - 1 : COLS; }
  function cellX(r, c) { return GX + R + c * D + (oddRow(r) ? R : 0); }
  function cellY(r) { return GY + R + r * ROW_H; }

  // -2 = out of bounds, -1 = empty, >= 0 = palette index
  function getCell(r, c) {
    if (r < 0 || c < 0 || c >= rowLen(r)) return -2;
    if (r >= grid.length) return -1;
    return grid[r][c];
  }
  function ensureRow(r) {
    while (grid.length <= r) {
      var len = rowLen(grid.length), row = [], i;
      for (i = 0; i < len; i++) row.push(-1);
      grid.push(row);
    }
  }

  function neighbors(r, c) {
    var odd = oddRow(r);
    var d = odd
      ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]]
      : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
    var out = [], i, nr, nc;
    for (i = 0; i < d.length; i++) {
      nr = r + d[i][0]; nc = c + d[i][1];
      if (nr >= 0 && nc >= 0 && nc < rowLen(nr)) out.push([nr, nc]);
    }
    return out;
  }

  function flood(sr, sc) {
    var color = getCell(sr, sc);
    if (color < 0) return [];
    var seen = {}, stack = [[sr, sc]], out = [], k, cell, nbs, i;
    seen[sr + ':' + sc] = 1;
    while (stack.length) {
      cell = stack.pop();
      out.push(cell);
      nbs = neighbors(cell[0], cell[1]);
      for (i = 0; i < nbs.length; i++) {
        k = nbs[i][0] + ':' + nbs[i][1];
        if (!seen[k] && getCell(nbs[i][0], nbs[i][1]) === color) {
          seen[k] = 1;
          stack.push(nbs[i]);
        }
      }
    }
    return out;
  }

  function findAnyCluster() {
    var seen = {}, r, c, k, cl, i;
    for (r = 0; r < grid.length; r++) {
      for (c = 0; c < rowLen(r); c++) {
        if (getCell(r, c) < 0) continue;
        k = r + ':' + c;
        if (seen[k]) continue;
        cl = flood(r, c);
        for (i = 0; i < cl.length; i++) seen[cl[i][0] + ':' + cl[i][1]] = 1;
        if (cl.length >= 3) return cl;
      }
    }
    return null;
  }

  function boardColors() {
    var set = {}, r, c, arr = [], k;
    for (r = 0; r < grid.length; r++)
      for (c = 0; c < rowLen(r); c++) {
        var v = getCell(r, c);
        if (v >= 0) set[v] = 1;
      }
    for (k in set) if (set.hasOwnProperty(k)) arr.push(parseInt(k, 10));
    return arr.length ? arr : [0];
  }
  function pickColor() {
    var arr = boardColors();
    return arr[ri(0, arr.length - 1)];
  }
  function boardEmpty() {
    for (var r = 0; r < grid.length; r++)
      for (var c = 0; c < rowLen(r); c++)
        if (getCell(r, c) >= 0) return false;
    return true;
  }
  function dangerHit() {
    for (var r = 0; r < grid.length; r++)
      for (var c = 0; c < rowLen(r); c++)
        if (getCell(r, c) >= 0 && cellY(r) + R > DANGER_Y) return true;
    return false;
  }
  function trimRows() {
    var r = grid.length - 1, c, empty;
    while (r >= 0) {
      empty = true;
      for (c = 0; c < rowLen(r); c++) if (grid[r][c] >= 0) { empty = false; break; }
      if (!empty) break;
      grid.pop(); r--;
    }
  }

  // ---------- board setup ----------
  function newBoard() {
    grid = []; pShift = 0;
    var rows = 5, nColors = level === 1 ? 5 : 6;
    if (level > 1) rows = Math.min(5 + Math.floor((level - 1) / 2), 8);
    var r, c;
    for (r = 0; r < rows; r++) {
      ensureRow(r);
      for (c = 0; c < rowLen(r); c++) grid[r][c] = ri(0, nColors - 1);
    }
    // dissolve accidental starting matches so level 1 never auto-pops
    var guard = 0, cl, cell, old, nc;
    while (guard++ < 80) {
      cl = findAnyCluster();
      if (!cl) break;
      cell = cl[ri(0, cl.length - 1)];
      old = grid[cell[0]][cell[1]];
      nc = ri(0, nColors - 1);
      grid[cell[0]][cell[1]] = (nc === old) ? (nc + 1) % nColors : nc;
    }
  }

  function addRow() {
    pShift = 1 - pShift; // keep screen-space offset pattern fixed
    var nColors = level === 1 ? 5 : 6;
    var row = [], c;
    for (c = 0; c < rowLen(0); c++) row.push(ri(0, nColors - 1));
    grid.unshift(row);
  }

  // ---------- effects ----------
  function hexA(hex, a) { // Round 1: hex color + alpha -> rgba()
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')';
  }
  function burst(x, y, ci) {
    var P = PALETTE[ci], i, a, sp;
    for (i = 0; i < 18; i++) {
      a = Math.random() * 6.283; sp = rand(60, 260);
      parts.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: 0, max: rand(0.4, 0.8), r: rand(2, 5),
        col: Math.random() < 0.3 ? '#ffffff' : P.base
      });
    }
    // Round 1: color-matched glow flash on every pop
    rings.push({ x: x, y: y, life: 0, max: 0.32, col: P.base, flash: true });
  }

  function dropFloaters() {
    var seen = {}, stack = [], r, c, k, i, cell, nbs;
    for (c = 0; c < rowLen(0); c++)
      if (getCell(0, c) >= 0) { stack.push([0, c]); seen['0:' + c] = 1; }
    while (stack.length) {
      cell = stack.pop();
      nbs = neighbors(cell[0], cell[1]);
      for (i = 0; i < nbs.length; i++) {
        k = nbs[i][0] + ':' + nbs[i][1];
        if (!seen[k] && getCell(nbs[i][0], nbs[i][1]) >= 0) {
          seen[k] = 1; stack.push(nbs[i]);
        }
      }
    }
    var dropped = 0;
    for (r = 0; r < grid.length; r++)
      for (c = 0; c < rowLen(r); c++) {
        var v = getCell(r, c);
        if (v >= 0 && !seen[r + ':' + c]) {
          fallers.push({
            x: cellX(r, c), y: cellY(r),
            vx: rand(-60, 60), vy: rand(-50, 0),
            vr: rand(-4, 4), rot: 0, color: v
          });
          grid[r][c] = -1;
          dropped++;
        }
      }
    if (dropped > 0) {
      var bonus = dropped * 20;
      score += bonus;
      popups.push({ x: W / 2, y: DANGER_Y - 70, text: 'Drop bonus +' + bonus, life: 0, max: 1.1 });
    }
  }

  // ---------- core resolution ----------
  function resolveBoard(pr, pc) {
    var cl = flood(pr, pc);
    if (cl.length >= 3) {
      var cx = 0, cy = 0, i;
      var popCi = grid[cl[0][0]][cl[0][1]]; // Round 1: capture cluster color before clearing
      for (i = 0; i < cl.length; i++) {
        var bx = cellX(cl[i][0], cl[i][1]), by = cellY(cl[i][0]);
        cx += bx; cy += by;
        burst(bx, by, grid[cl[i][0]][cl[i][1]]);
        grid[cl[i][0]][cl[i][1]] = -1;
      }
      cx /= cl.length; cy /= cl.length;
      var gained = cl.length * 10;
      score += gained;
      popups.push({ x: cx, y: cy, text: '+' + gained, life: 0, max: 0.9 });
      rings.push({ x: cx, y: cy, life: 0, max: 0.35, col: PALETTE[popCi].base });
      dropFloaters();
    }
    trimRows();
    if (boardEmpty()) { levelClear(); return; }
    if (dangerHit()) { gameOver(); return; }
    updateStats();
  }

  function snapShot() {
    var bestR = -1, bestC = -1, bestD = 1e12;
    var seen = {}, r, c, i, nbs;
    function consider(rr, cc) {
      if (rr < 0 || cc < 0 || cc >= rowLen(rr)) return;
      var k = rr + ':' + cc;
      if (seen[k]) return; seen[k] = 1;
      if (getCell(rr, cc) !== -1) return;
      var dx = cellX(rr, cc) - shot.x, dy = cellY(rr) - shot.y;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; bestR = rr; bestC = cc; }
    }
    for (r = 0; r < grid.length; r++)
      for (c = 0; c < rowLen(r); c++)
        if (getCell(r, c) >= 0) {
          nbs = neighbors(r, c);
          for (i = 0; i < nbs.length; i++) consider(nbs[i][0], nbs[i][1]);
        }
    for (c = 0; c < rowLen(0); c++) consider(0, c);
    if (bestR < 0) { bestR = 0; bestC = 0; }
    ensureRow(bestR);
    var color = shot.color;
    grid[bestR][bestC] = color;
    shot = null;
    resolveBoard(bestR, bestC);
  }

  function shoot() {
    if (state !== 'playing' || shot) return;
    shot = {
      x: CX + Math.cos(aim) * 52, y: CY + Math.sin(aim) * 52,
      vx: Math.cos(aim) * SHOT_SPEED, vy: Math.sin(aim) * SHOT_SPEED,
      color: cur, trail: []
    };
    cur = nxt;
    nxt = pickColor();
    shots++;
    if (shots % SHOTS_PER_ROW === 0) {
      addRow();
      if (dangerHit()) { gameOver(); return; }
    }
    updateStats();
  }

  function levelClear() {
    var bonus = 200 * level;
    score += bonus;
    popups.push({ x: W / 2, y: H / 2 - 40, text: 'Level clear! +' + bonus, life: 0, max: 1.5 });
    level++;
    levelBanner = 1.8; bannerText = 'Level ' + level;
    shots = 0;
    newBoard();
    cur = pickColor(); nxt = pickColor();
    updateStats();
  }

  // ---------- state ----------
  function updateStats() {
    elScore.textContent = score;
    elLevel.textContent = level;
    elBest.textContent = best === 0 ? '—' : best;
  }

  function reset(toReady) {
    grid = []; pShift = 0;
    parts = []; popups = []; fallers = []; rings = [];
    shot = null;
    level = 1; score = 0; shots = 0; newBest = false;
    aim = -Math.PI / 2;
    levelBanner = 0;
    newBoard();
    cur = ri(0, 4); nxt = pickColor();
    btnAgain.textContent = 'Pop again';
    overlay.classList.add('hidden');
    updateStats();
    state = toReady ? 'ready' : 'playing';
    if (!toReady) { bannerText = 'Level 1'; levelBanner = 1.6; }
  }

  function gameOver() {
    state = 'over';
    shot = null;
    newBest = score > best;
    if (newBest) {
      best = score;
      try { localStorage.setItem('wisely_bubble_pop_best', String(best)); } catch (e) {}
    }
    updateStats();
    overTitle.textContent = 'Game over!';
    overStats.textContent = 'Score ' + score + ' · Reached level ' + level +
      (newBest ? ' — new best!' : ' · Best ' + best);
    btnAgain.textContent = 'Pop again';
    overlay.classList.remove('hidden');
  }

  function pauseGame() {
    if (state !== 'playing') return;
    state = 'paused';
    overTitle.textContent = 'Paused';
    overStats.textContent = 'Take a breath. Tap below to keep popping.';
    btnAgain.textContent = 'Resume';
    overlay.classList.remove('hidden');
  }

  // ---------- update ----------
  function updateShot(dt) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.trail.push({ x: shot.x, y: shot.y, life: 0 });
    if (shot.trail.length > 8) shot.trail.shift();
    if (shot.x - R < GX) { shot.x = GX + R; shot.vx = Math.abs(shot.vx); }
    if (shot.x + R > W - GX) { shot.x = W - GX - R; shot.vx = -Math.abs(shot.vx); }
    if (shot.y - R <= TOP_Y) { snapShot(); return; }
    var rr2 = (D - 3) * (D - 3);
    for (var r = 0; r < grid.length; r++) {
      for (var c = 0; c < rowLen(r); c++) {
        if (getCell(r, c) < 0) continue;
        var dx = cellX(r, c) - shot.x, dy = cellY(r) - shot.y;
        if (dx * dx + dy * dy < rr2) { snapShot(); return; }
      }
    }
  }

  function update(dt) {
    tGlobal += dt;
    var i;
    for (i = 0; i < bgBubs.length; i++) {
      var b = bgBubs[i];
      b.y += b.vy * dt; b.x += b.vx * dt;
      if (b.y < -70) { b.y = H + 60; b.x = rand(0, W); }
    }
    if (levelBanner > 0) levelBanner -= dt;

    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life += dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt;
      if (p.life >= p.max) parts.splice(i, 1);
    }
    for (i = popups.length - 1; i >= 0; i--) {
      popups[i].life += dt; popups[i].y -= 42 * dt;
      if (popups[i].life >= popups[i].max) popups.splice(i, 1);
    }
    for (i = rings.length - 1; i >= 0; i--) {
      rings[i].life += dt;
      if (rings[i].life >= rings[i].max) rings.splice(i, 1);
    }
    for (i = fallers.length - 1; i >= 0; i--) {
      var f = fallers[i];
      f.vy += 900 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
      if (f.y > H + 50) fallers.splice(i, 1);
    }

    if (state !== 'playing') return;
    if (shot) updateShot(dt);
  }

  // ---------- visual polish helpers (Round 2: render-only, no game state) ----------
  var visPrevShot = false, visRecoilAt = -9;
  var sparkField = null;
  function perfT() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; }
  function hexRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  function mixHex(h1, h2, t) {
    var a = hexRgb(h1), b = hexRgb(h2);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
      Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
      Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }
  function buildSparkField() {
    sparkField = [];
    var s = 1234567, i;
    function lcg() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
    for (i = 0; i < 30; i++) {
      sparkField.push({ x: lcg() * W, y: lcg() * H, r: 0.8 + lcg() * 1.6, ph: lcg() * 6.283, sp: 0.6 + lcg() * 1.4 });
    }
  }
  // scale pulse for settled bubbles sitting next to a fresh pop (render offset only)
  function popPulse(x, y) {
    var s = 0, i, rg, dx, dy, d2, k;
    for (i = 0; i < rings.length; i++) {
      rg = rings[i];
      if (rg.flash || rg.life >= rg.max) continue;
      dx = rg.x - x; dy = rg.y - y; d2 = dx * dx + dy * dy;
      if (d2 < 70 * 70) {
        k = 1 - rg.life / rg.max;
        s = Math.max(s, 0.09 * k * Math.sin(k * Math.PI));
      }
    }
    return s;
  }
  function spawnMuzzleSparks(ci) {
    var P = PALETTE[ci], mx = CX + Math.cos(aim) * 58, my = CY + Math.sin(aim) * 58, i, a, sp;
    for (i = 0; i < 9; i++) {
      a = aim + rand(-0.35, 0.35); sp = rand(90, 250);
      parts.push({
        x: mx, y: my,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0, max: rand(0.3, 0.55), r: rand(1.4, 3),
        col: Math.random() < 0.45 ? '#ffffff' : (Math.random() < 0.5 ? '#ffd166' : P.light)
      });
    }
  }
  function drawCeiling() {
    var g = ctx.createLinearGradient(0, 0, 0, 12);
    g.addColorStop(0, '#57648a');
    g.addColorStop(0.45, '#333f5e');
    g.addColorStop(1, '#1c2338');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(0, 0, W, 1.5);
    ctx.fillStyle = 'rgba(245,166,35,0.40)';
    ctx.fillRect(0, 10.5, W, 1.5);
    // rivets
    for (var x = 20; x < W; x += 38) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.arc(x, 6, 2.4, 0, 6.29); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(x - 0.7, 5.3, 0.9, 0, 6.29); ctx.fill();
    }
    // soft shadow the bar casts onto the field
    var sh = ctx.createLinearGradient(0, 12, 0, 30);
    sh.addColorStop(0, 'rgba(0,0,0,0.25)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, 12, W, 18);
  }
  function drawFrame() {
    // glass side edges of the playfield
    var sides = [[3, 1], [W - 9, -1]], i, x0, g;
    for (i = 0; i < 2; i++) {
      x0 = sides[i][0];
      g = ctx.createLinearGradient(x0, 0, x0 + 6, 0);
      if (sides[i][1] > 0) {
        g.addColorStop(0, 'rgba(170,210,255,0)');
        g.addColorStop(0.6, 'rgba(170,210,255,0.10)');
        g.addColorStop(1, 'rgba(170,210,255,0.02)');
      } else {
        g.addColorStop(0, 'rgba(170,210,255,0.02)');
        g.addColorStop(0.4, 'rgba(170,210,255,0.10)');
        g.addColorStop(1, 'rgba(170,210,255,0)');
      }
      ctx.fillStyle = g;
      ctx.fillRect(x0, 12, 6, DANGER_Y + 26);
    }
    // corner brackets
    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 30); ctx.lineTo(8, 14); ctx.lineTo(24, 14);
    ctx.moveTo(W - 24, 14); ctx.lineTo(W - 8, 14); ctx.lineTo(W - 8, 30);
    ctx.stroke();
  }

  // ---------- drawing ----------
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

  function drawBubble(x, y, ci, scale, alpha) {
    var r = R * (scale || 1);
    var P = PALETTE[ci];
    if (alpha !== undefined && alpha < 1) ctx.globalAlpha = alpha;
    // soft drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.10, y + r * 0.52, r * 0.92, r * 0.40, 0, 0, 6.29);
    ctx.fill();
    // glossy sphere body — luminous core, deep edge (Round 2: 5-stop shade)
    var g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.06, x, y, r);
    g.addColorStop(0, mixHex(P.light, '#ffffff', 0.35));
    g.addColorStop(0.34, mixHex(P.light, P.base, 0.45));
    g.addColorStop(0.62, P.base);
    g.addColorStop(0.86, mixHex(P.base, P.dark, 0.55));
    g.addColorStop(1, P.dark);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
    // inner depth: dark crescent low inside the sphere
    ctx.strokeStyle = 'rgba(0,0,0,0.20)';
    ctx.lineWidth = r * 0.20;
    ctx.beginPath(); ctx.arc(x, y, r * 0.84, Math.PI * 0.18, Math.PI * 0.82); ctx.stroke();
    // rim light, upper-left (key light)
    ctx.strokeStyle = hexA(P.light, 0.85);
    ctx.lineWidth = Math.max(1.4, 1.8 * (scale || 1));
    ctx.beginPath(); ctx.arc(x, y, r - 1.2, Math.PI * 1.04, Math.PI * 1.46); ctx.stroke();
    // bottom bounce-light rim
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(1.5, 2 * (scale || 1));
    ctx.beginPath(); ctx.arc(x, y, r - 2, Math.PI * 0.28, Math.PI * 0.72); ctx.stroke();
    // specular highlight + crisp core
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.36, y - r * 0.44, r * 0.30, r * 0.19, -0.5, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(x - r * 0.38, y - r * 0.46, r * 0.085, 0, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(x + r * 0.30, y - r * 0.52, r * 0.10, 0, 6.29); ctx.fill();
    // faint reflection streak, lower-right
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.40, y + r * 0.44, r * 0.34, r * 0.10, 0.6, 0, 6.29);
    ctx.fill();
    if (alpha !== undefined && alpha < 1) ctx.globalAlpha = 1;
  }

  function drawBG() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2E2054');
    g.addColorStop(0.55, '#181237');
    g.addColorStop(1, '#0D0A26');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Round 1: soft pastel nebula glows (deep-plum base keeps bubble contrast)
    var nebs = [
      [W * 0.22, H * 0.24, 150, '194,169,242', 0.16],
      [W * 0.82, H * 0.52, 170, '154,220,214', 0.13],
      [W * 0.48, H * 0.82, 150, '246,179,194', 0.12]
    ];
    for (var ni = 0; ni < nebs.length; ni++) {
      var nb = nebs[ni];
      var ng = ctx.createRadialGradient(nb[0], nb[1], 0, nb[0], nb[1], nb[2]);
      ng.addColorStop(0, 'rgba(' + nb[3] + ',' + nb[4] + ')');
      ng.addColorStop(1, 'rgba(' + nb[3] + ',0)');
      ctx.fillStyle = ng;
      ctx.beginPath(); ctx.arc(nb[0], nb[1], nb[2], 0, 6.29); ctx.fill();
    }
    var i, b, bg;
    for (i = 0; i < bgBubs.length; i++) {
      b = bgBubs[i];
      bg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      bg.addColorStop(0, b.col);
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = b.a;
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.29); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Round 2: gentle twinkling sparkles in the deep backdrop
    if (!sparkField) buildSparkField();
    var st = perfT();
    for (i = 0; i < sparkField.length; i++) {
      var sp = sparkField[i];
      var tw = 0.5 + 0.5 * Math.sin(st * sp.sp + sp.ph);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.10 + 0.30 * tw).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, 6.29); ctx.fill();
    }
    var v = ctx.createRadialGradient(W / 2, H / 2, 170, W / 2, H / 2, 470);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function drawDanger() {
    var pulse = 0.45 + 0.30 * Math.sin(tGlobal * 4);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,92,92,' + pulse.toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(GX, DANGER_Y); ctx.lineTo(W - GX, DANGER_Y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,120,120,' + (pulse + 0.25).toFixed(3) + ')';
    ctx.font = '600 12px "Barlow Condensed", Nunito, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('DANGER', W - GX - 4, DANGER_Y - 6);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function nearBubble(x, y) {
    var lim = (D * 1.2) * (D * 1.2);
    for (var r = 0; r < grid.length; r++)
      for (var c = 0; c < rowLen(r); c++) {
        if (getCell(r, c) < 0) continue;
        var dx = cellX(r, c) - x, dy = cellY(r) - y;
        if (dx * dx + dy * dy < lim) return true;
      }
    return false;
  }

  function drawGuide() {
    if (state !== 'playing' || shot) return;
    var x = CX + Math.cos(aim) * 54, y = CY + Math.sin(aim) * 54;
    var dx = Math.cos(aim), dy = Math.sin(aim);
    var travelled = 0, guard = 0;
    while (travelled < 330 && guard++ < 70) {
      x += dx * 10; y += dy * 10; travelled += 10;
      if (x - R < GX) { x = GX + R; dx = Math.abs(dx); }
      else if (x + R > W - GX) { x = W - GX - R; dx = -Math.abs(dx); }
      if (y < GY) break;
      if (nearBubble(x, y)) break;
      // Round 2: elegant fading dotted arc — soft halo + bright core, tapering with distance
      var fade = 1 - travelled / 380;
      var shimmer = (0.30 + 0.22 * Math.sin(tGlobal * 6 + travelled * 0.045)) * fade;
      ctx.fillStyle = 'rgba(160,210,255,' + (shimmer * 0.45).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, 5.2 * fade + 1.2, 0, 6.29); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.95, shimmer + 0.28 * fade).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, 1.5 + 1.7 * fade, 0, 6.29); ctx.fill();
    }
  }

  function drawCannon() {
    // glow pad under cannon (Round 1: pastel lavender, breathing)
    var gpulse = 0.26 + 0.10 * Math.sin(tGlobal * 2.4);
    var gl = ctx.createRadialGradient(CX, CY, 8, CX, CY, 78);
    gl.addColorStop(0, 'rgba(194,169,242,' + gpulse.toFixed(3) + ')');
    gl.addColorStop(1, 'rgba(194,169,242,0)');
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(CX, CY, 78, 0, 6.29); ctx.fill();
    // Round 2: recoil kick (visual only) — decays over ~0.16s after a shot spawns
    var rk = Math.max(0, 1 - (perfT() - visRecoilAt) / 0.16);
    rk = rk * rk;
    var rox = -Math.cos(aim) * 4.5 * rk, roy = -Math.sin(aim) * 4.5 * rk;
    // rotating barrel
    ctx.save();
    ctx.translate(CX + rox, CY + roy);
    ctx.rotate(aim + Math.PI / 2);
    var bw = 30, bl = 54;
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    rr(-bw / 2 + 3, -bl + 4, bw, bl, 10); ctx.fill();
    var grd = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    grd.addColorStop(0, '#333c52');
    grd.addColorStop(0.5, '#a7b4cc');
    grd.addColorStop(1, '#2b3242');
    ctx.fillStyle = grd;
    rr(-bw / 2, -bl, bw, bl, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    rr(-bw / 2 + 5, -bl + 6, 6, bl - 12, 3); ctx.fill();
    // barrel bands + muzzle ring
    ctx.fillStyle = 'rgba(20,26,40,0.45)';
    ctx.fillRect(-bw / 2, -bl + 14, bw, 5);
    ctx.fillRect(-bw / 2, -bl + 30, bw, 5);
    ctx.fillStyle = '#8e9cb8';
    rr(-bw / 2 - 2, -bl, bw + 4, 9, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    rr(-bw / 2 + 3, -bl + 2, 6, 5, 2); ctx.fill();
    ctx.restore();
    // base dome
    var bg2 = ctx.createRadialGradient(CX - 12, CY - 14, 6, CX, CY, 44);
    bg2.addColorStop(0, '#aeb9d0');
    bg2.addColorStop(0.55, '#556079');
    bg2.addColorStop(1, '#232a3a');
    ctx.fillStyle = bg2;
    ctx.beginPath(); ctx.arc(CX, CY, 42, 0, 6.29); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(CX, CY, 40.5, 0, 6.29); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(CX - 12, CY - 14, 10, 0, 6.29); ctx.fill();
    // plinth bolts
    for (var bi = 0; bi < 4; bi++) {
      var ba = Math.PI * 0.25 + bi * Math.PI / 2;
      var bx2 = CX + Math.cos(ba) * 33, by2 = CY + Math.sin(ba) * 33;
      ctx.fillStyle = 'rgba(10,14,24,0.55)';
      ctx.beginPath(); ctx.arc(bx2, by2, 2.6, 0, 6.29); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(bx2 - 0.8, by2 - 0.8, 1, 0, 6.29); ctx.fill();
    }
    // pivot cap the barrel turns on
    var pg = ctx.createRadialGradient(CX - 4, CY - 5, 2, CX, CY, 14);
    pg.addColorStop(0, '#c7d2e6');
    pg.addColorStop(0.6, '#67748f');
    pg.addColorStop(1, '#2a3247');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(CX, CY, 13, 0, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(15,20,32,0.7)';
    ctx.beginPath(); ctx.arc(CX, CY, 3.4, 0, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath(); ctx.arc(CX - 1.2, CY - 1.2, 1.2, 0, 6.29); ctx.fill();
    // loaded bubble at the muzzle
    drawBubble(CX + Math.cos(aim) * 56 + rox, CY + Math.sin(aim) * 56 + roy, cur, 1);
    // next-bubble preview
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '600 12px "Barlow Condensed", Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', CX - 74, CY + 26);
    drawBubble(CX - 74, CY - 2, nxt, 0.55);
    ctx.textAlign = 'left';
  }

  function draw() {
    // Round 2: detect a fresh shot (render-side) → recoil + muzzle sparkle
    if (shot && !visPrevShot) { visRecoilAt = perfT(); spawnMuzzleSparks(shot.color); }
    visPrevShot = !!shot;
    drawBG();
    drawCeiling();
    drawFrame();
    drawDanger();
    var r, c, i;
    for (r = 0; r < grid.length; r++)
      for (c = 0; c < rowLen(r); c++) {
        var v = getCell(r, c);
        if (v >= 0) {
          var bx3 = cellX(r, c), by3 = cellY(r);
          drawBubble(bx3, by3, v, 1 + popPulse(bx3, by3));
        }
      }
    drawGuide();
    drawCannon();
    if (shot) {
      for (i = 0; i < shot.trail.length; i++) {
        var t = shot.trail[i], k = i / shot.trail.length;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * k).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(t.x, t.y, 3 + 5 * k, 0, 6.29); ctx.fill();
      }
      // glow halo around the flying bubble
      var sg = ctx.createRadialGradient(shot.x, shot.y, 0, shot.x, shot.y, R * 2.0);
      sg.addColorStop(0, hexA(PALETTE[shot.color].base, 0.30));
      sg.addColorStop(1, hexA(PALETTE[shot.color].base, 0));
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(shot.x, shot.y, R * 2.0, 0, 6.29); ctx.fill();
      drawBubble(shot.x, shot.y, shot.color, 1);
    }
    for (i = 0; i < fallers.length; i++) {
      var f = fallers[i];
      // glow trail so big chain drops read bigger
      var fg2 = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R * 1.9);
      fg2.addColorStop(0, hexA(PALETTE[f.color].base, 0.22));
      fg2.addColorStop(1, hexA(PALETTE[f.color].base, 0));
      ctx.fillStyle = fg2;
      ctx.beginPath(); ctx.arc(f.x, f.y, R * 1.9, 0, 6.29); ctx.fill();
      ctx.save();
      ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      ctx.translate(-f.x, -f.y);
      drawBubble(f.x, f.y, f.color, 1);
      ctx.restore();
    }
    for (i = 0; i < parts.length; i++) {
      var p = parts[i], pk = 1 - p.life / p.max;
      ctx.fillStyle = p.col;
      ctx.globalAlpha = pk;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * pk + 0.6, 0, 6.29); ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (i = 0; i < rings.length; i++) {
      var rg = rings[i], rk = 1 - rg.life / rg.max;
      var rcol = rg.col || '#ffffff';
      if (rg.flash) {
        // Round 1: expanding color-matched glow flash (additive)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var frad = 24 + 52 * (1 - rk);
        var fg = ctx.createRadialGradient(rg.x, rg.y, 0, rg.x, rg.y, frad);
        fg.addColorStop(0, hexA(rcol, 0.55 * rk));
        fg.addColorStop(1, hexA(rcol, 0));
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(rg.x, rg.y, frad, 0, 6.29); ctx.fill();
        ctx.restore();
      } else {
        ctx.strokeStyle = hexA(rcol, 0.8 * rk);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(rg.x, rg.y, 10 + 56 * (1 - rk), 0, 6.29); ctx.stroke();
      }
    }
    ctx.textAlign = 'center';
    for (i = 0; i < popups.length; i++) {
      var pu = popups[i], puk = 1 - pu.life / pu.max;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * puk).toFixed(3) + ')';
      ctx.font = '700 22px "Barlow Condensed", Nunito, sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,' + (0.5 * puk).toFixed(3) + ')';
      ctx.lineWidth = 4;
      ctx.strokeText(pu.text, pu.x, pu.y);
      ctx.fillText(pu.text, pu.x, pu.y);
    }
    ctx.textAlign = 'left';

    if (levelBanner > 0) {
      var bk = Math.min(1, levelBanner / 0.5);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * bk).toFixed(3) + ')';
      ctx.font = '700 48px "Barlow Condensed", Nunito, sans-serif';
      ctx.strokeStyle = 'rgba(20,10,60,' + (0.7 * bk).toFixed(3) + ')';
      ctx.lineWidth = 8;
      ctx.strokeText(bannerText, W / 2, H / 2);
      ctx.fillText(bannerText, W / 2, H / 2);
      ctx.textAlign = 'left';
    }

    if (state === 'ready') {
      ctx.fillStyle = 'rgba(10,12,35,0.62)';
      rr(W / 2 - 178, H / 2 - 118, 356, 122, 16); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '700 30px "Barlow Condensed", Nunito, sans-serif';
      ctx.fillText('Ready to pop?', W / 2, H / 2 - 74);
      ctx.font = '700 15px Nunito, sans-serif';
      ctx.fillText('Aim with mouse or finger — tap to shoot', W / 2, H / 2 - 42);
      ctx.fillText('Match 3+ bubbles · every 6 shots a new row', W / 2, H / 2 - 18);
      ctx.textAlign = 'left';
    }
  }

  // ---------- main loop ----------
  var last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    update(dt);
    draw();
  }

  // ---------- input ----------
  function toGame(e) {
    var rect = canvas.getBoundingClientRect();
    return [
      (e.clientX - rect.left) * (W / rect.width),
      (e.clientY - rect.top) * (H / rect.height)
    ];
  }
  function setAim(x, y) {
    aim = clamp(Math.atan2(y - CY, x - CX), -Math.PI + 0.16, -0.16);
  }

  canvas.addEventListener('mousemove', function (e) {
    var p = toGame(e);
    setAim(p[0], p[1]);
  });
  canvas.addEventListener('mousedown', function (e) {
    if (Date.now() - lastTouch < 600) return; // ignore synthetic mouse after touch
    if (state === 'ready') { reset(false); return; }
    if (state !== 'playing') return;
    var p = toGame(e);
    setAim(p[0], p[1]);
    shoot();
  });

  canvas.addEventListener('touchstart', function (e) {
    lastTouch = Date.now();
    touchArmed = (state === 'playing');
    var p = toGame(e.changedTouches[0]);
    setAim(p[0], p[1]);
    if (state === 'ready') reset(false);
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    lastTouch = Date.now();
    var p = toGame(e.changedTouches[0]);
    setAim(p[0], p[1]);
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', function (e) {
    lastTouch = Date.now();
    if (touchArmed && state === 'playing') shoot();
    touchArmed = false;
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pauseGame();
  });

  btnAgain.addEventListener('click', function () {
    if (state === 'paused') {
      state = 'playing';
      btnAgain.textContent = 'Pop again';
      overlay.classList.add('hidden');
    } else {
      reset(false);
    }
  });
  btnRestart.addEventListener('click', function () { reset(true); });

  // test hook: activated only when window.__BUBBLE_POP_TEST__ is set (headless QA)
  try {
    if (typeof window !== 'undefined' && window.__BUBBLE_POP_TEST__) {
      window.__bp = {
        newBoard: newBoard, addRow: addRow, flood: flood,
        dropFloaters: dropFloaters, getCell: getCell,
        cellX: cellX, cellY: cellY, rowLen: rowLen,
        boardEmpty: boardEmpty, dangerHit: dangerHit,
        resolveAt: function (r, c, color) { ensureRow(r); grid[r][c] = color; resolveBoard(r, c); },
        forceLevelClear: levelClear,
        grid: function () { return grid; },
        pShift: function () { return pShift; },
        state: function () { return state; },
        score: function () { return score; },
        level: function () { return level; },
        geom: { W: W, H: H, R: R, GX: GX, DANGER_Y: DANGER_Y }
      };
    }
  } catch (e) {}

  // ---------- go ----------
  (function initBG() {
    var cols = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#a855f7', '#fb923c'];
    for (var i = 0; i < 14; i++) {
      bgBubs.push({
        x: rand(0, W), y: rand(0, H), r: rand(22, 62),
        vx: rand(-8, 8), vy: rand(-16, -6),
        col: cols[i % cols.length], a: rand(0.04, 0.09)
      });
    }
  })();

  reset(true);
  requestAnimationFrame(frame);
})();
