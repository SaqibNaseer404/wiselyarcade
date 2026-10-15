/* Wisely Arcade ambient background — endless auto-playing game scenes (watermark).
   Scenes cycle: Snake (self-playing) -> Sudoku (self-solving) -> Runner (endless).
   Subtle, pointer-transparent, pauses when tab hidden. Skipped for reduced-motion. */
(function () {
  'use strict';
  var cv = document.getElementById('ambient');
  if (!cv) return;
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch (e) {}
  var ctx = cv.getContext('2d');
  if (!ctx) return;

  var W = 0, H = 0, DPR = 1;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.max(1, Math.round(W * DPR));
    cv.height = Math.max(1, Math.round(H * DPR));
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  var PAL = {
    snake: '#2dd4bf', snakeHead: '#0d9488', food: '#f472b6',
    grid: 'rgba(124,58,237,.45)', num: 'rgba(109,40,217,.75)',
    board: 'rgba(255,255,255,.5)',
    hillFar: 'rgba(167,243,208,.55)', hillNear: 'rgba(110,231,183,.6)',
    runner: '#f472b6', obstacle: 'rgba(124,58,237,.65)',
    ground: 'rgba(109,40,217,.35)'
  };

  /* ---------------- Snake (self-playing) ---------------- */
  function SnakeScene() {
    var N = 24, snake, dir, food, alive, deadT, stepT, ox, oy, cell;
    function layout() {
      cell = Math.max(16, Math.min(W, H * 0.8) / N);
      ox = (W - cell * N) / 2; oy = (H - cell * N) / 2;
    }
    function dropFood() {
      for (var tries = 0; tries < 200; tries++) {
        var f = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 };
        var ok = true;
        for (var i = 0; i < snake.length; i++) {
          if (snake[i].x === f.x && snake[i].y === f.y) { ok = false; break; }
        }
        if (ok) { food = f; return; }
      }
      food = { x: N - 2, y: N - 2 };
    }
    function safe(x, y) {
      if (x < 0 || y < 0 || x >= N || y >= N) return false;
      for (var i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === x && snake[i].y === y) return false;
      }
      return true;
    }
    function reset() {
      layout();
      var cy = (N / 2) | 0;
      snake = [{ x: 12, y: cy }, { x: 11, y: cy }, { x: 10, y: cy }];
      dir = { x: 1, y: 0 }; alive = true; deadT = 0; stepT = 0;
      dropFood();
    }
    reset();
    var DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    return {
      reset: reset,
      update: function (dt) {
        if (!alive) { deadT += dt; if (deadT > 1.4) reset(); return; }
        stepT += dt;
        if (stepT < 0.085) return;
        stepT = 0;
        var h = snake[0], best = null, bestD = 1e9;
        for (var i = 0; i < 4; i++) {
          var o = DIRS[i];
          if (o.x === -dir.x && o.y === -dir.y) continue;
          var nx = h.x + o.x, ny = h.y + o.y;
          if (!safe(nx, ny)) continue;
          var d = Math.abs(nx - food.x) + Math.abs(ny - food.y);
          var free = 0;
          for (var j = 0; j < 4; j++) if (safe(nx + DIRS[j].x, ny + DIRS[j].y)) free++;
          d += (4 - free) * 3;
          if (d < bestD) { bestD = d; best = o; }
        }
        if (!best) { alive = false; return; }
        dir = best;
        snake.unshift({ x: h.x + dir.x, y: h.y + dir.y });
        var nh = snake[0];
        if (nh.x === food.x && nh.y === food.y) {
          dropFood();
          if (snake.length > 70) reset();
        } else snake.pop();
      },
      draw: function () {
        layout();
        ctx.fillStyle = PAL.board;
        rr(ox, oy, cell * N, cell * N, 20); ctx.fill();
        var t = performance.now() / 280;
        var fr = cell * 0.34 * (1 + 0.14 * Math.sin(t));
        ctx.fillStyle = PAL.food;
        ctx.beginPath();
        ctx.arc(ox + (food.x + 0.5) * cell, oy + (food.y + 0.5) * cell, fr, 0, 6.3);
        ctx.fill();
        for (var i = snake.length - 1; i >= 0; i--) {
          var s = snake[i], pad = cell * 0.14;
          ctx.fillStyle = i === 0 ? PAL.snakeHead : PAL.snake;
          rr(ox + s.x * cell + pad, oy + s.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.32);
          ctx.fill();
        }
      }
    };
  }

  /* ---------------- Sudoku (self-solving) ---------------- */
  var SOLVED = [
    5,3,4,6,7,8,9,1,2, 6,7,2,1,9,5,3,4,8, 1,9,8,3,4,2,5,6,7,
    8,5,9,7,6,1,4,2,3, 4,2,6,8,5,3,7,9,1, 7,1,3,9,2,4,8,5,6,
    9,6,1,5,3,7,2,8,4, 2,8,7,4,1,9,6,3,5, 3,4,5,2,8,6,1,7,9
  ];
  function SudokuScene() {
    var order, shown, t, doneT, size, ox, oy, cell;
    function reset() {
      order = [];
      for (var i = 0; i < 81; i++) order.push(i);
      for (var i = 80; i > 0; i--) {
        var j = (Math.random() * (i + 1)) | 0;
        var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
      }
      shown = 0; t = 0; doneT = 0;
    }
    reset();
    return {
      reset: reset,
      update: function (dt) {
        if (shown < 81) {
          t += dt;
          if (t > 0.09) { t = 0; shown = Math.min(81, shown + 2); }
        } else { doneT += dt; if (doneT > 2.2) reset(); }
      },
      draw: function () {
        size = Math.min(W * 0.7, H * 0.72, 460);
        cell = size / 9;
        ox = (W - size) / 2; oy = (H - size) / 2;
        ctx.fillStyle = PAL.board;
        rr(ox - 8, oy - 8, size + 16, size + 16, 20); ctx.fill();
        ctx.fillStyle = PAL.num;
        ctx.font = '700 ' + Math.round(cell * 0.52) + 'px Nunito, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (var k = 0; k < shown; k++) {
          var idx = order[k], r = (idx / 9) | 0, c = idx % 9;
          ctx.fillText(String(SOLVED[idx]), ox + (c + 0.5) * cell, oy + (r + 0.52) * cell);
        }
        ctx.strokeStyle = PAL.grid; ctx.lineWidth = 1;
        for (var i = 0; i <= 9; i++) {
          var p = ox + i * cell;
          ctx.beginPath(); ctx.moveTo(p, oy); ctx.lineTo(p, oy + size); ctx.stroke();
          var q = oy + i * cell;
          ctx.beginPath(); ctx.moveTo(ox, q); ctx.lineTo(ox + size, q); ctx.stroke();
        }
        ctx.lineWidth = 3;
        for (var b = 0; b <= 3; b++) {
          var bp = ox + b * cell * 3;
          ctx.beginPath(); ctx.moveTo(bp, oy); ctx.lineTo(bp, oy + size); ctx.stroke();
          var bq = oy + b * cell * 3;
          ctx.beginPath(); ctx.moveTo(ox, bq); ctx.lineTo(ox + size, bq); ctx.stroke();
        }
      }
    };
  }

  /* ---------------- Runner (endless) ---------------- */
  function RunnerScene() {
    var px, py, vy, onGround, obstacles, dist, speed, groundY, t;
    function reset() {
      groundY = H * 0.74;
      px = W * 0.32; py = groundY; vy = 0; onGround = true;
      obstacles = []; dist = 0; speed = W * 0.28; t = 0;
    }
    reset();
    function jump() { if (onGround) { vy = -H * 0.62; onGround = false; } }
    return {
      reset: reset,
      update: function (dt) {
        t += dt;
        dist += speed * dt;
        // spawn obstacles
        if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < W - W * 0.45 - Math.random() * W * 0.2) {
          obstacles.push({ x: W + 40, w: 26 + Math.random() * 22, h: 44 + Math.random() * 30 });
        }
        for (var i = obstacles.length - 1; i >= 0; i--) {
          var o = obstacles[i];
          o.x -= speed * dt;
          // auto-jump when close
          if (onGround && o.x - px < H * 0.22 && o.x - px > 0) jump();
          if (o.x + o.w < -60) obstacles.splice(i, 1);
          // pass through on hit (endless demo — never stops)
        }
        if (!onGround) {
          vy += H * 1.9 * dt;
          py += vy * dt;
          if (py >= groundY) { py = groundY; vy = 0; onGround = true; }
        }
      },
      draw: function () {
        groundY = H * 0.74; px = W * 0.32;
        // hills (two parallax sine layers)
        for (var L = 0; L < 2; L++) {
          ctx.fillStyle = L === 0 ? PAL.hillFar : PAL.hillNear;
          ctx.beginPath();
          ctx.moveTo(0, H);
          var baseY = groundY - H * (L === 0 ? 0.16 : 0.07);
          var amp = H * (L === 0 ? 0.06 : 0.035);
          var spd = dist * (L === 0 ? 0.25 : 0.55);
          for (var x = 0; x <= W; x += 14) {
            var y = baseY + Math.sin((x + spd) * 0.012 + L * 2.4) * amp
                          + Math.sin((x + spd) * 0.03 + L) * amp * 0.4;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        }
        // ground line
        ctx.strokeStyle = PAL.ground; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, groundY + 2); ctx.lineTo(W, groundY + 2); ctx.stroke();
        // obstacles
        for (var i = 0; i < obstacles.length; i++) {
          var o = obstacles[i];
          ctx.fillStyle = PAL.obstacle;
          rr(o.x, groundY - o.h, o.w, o.h, 8); ctx.fill();
        }
        // runner (bouncy circle)
        var squash = onGround ? 1 + 0.08 * Math.sin(t * 14) : 1;
        ctx.fillStyle = PAL.runner;
        ctx.beginPath();
        ctx.ellipse(px, py - 20 * squash, 20, 20 * (2 - squash) / 1.0, 0, 0, 6.3);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.arc(px + 7, py - 26 * squash, 5, 0, 6.3); ctx.fill();
      }
    };
  }

  /* ---------------- Scene cycler ---------------- */
  var scenes = [SnakeScene(), SudokuScene(), RunnerScene()];
  var SCENE_LEN = 16, FADE = 1.4;
  var cur = 0, elapsed = 0, last = performance.now(), running = true;

  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    last = performance.now();
  });

  function frame(now) {
    requestAnimationFrame(frame);
    if (!running) { last = now; return; }
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    if (elapsed >= SCENE_LEN) {
      elapsed = 0; cur = (cur + 1) % scenes.length;
      scenes[cur].reset();
    }
    scenes[cur].update(dt);
    ctx.clearRect(0, 0, W, H);
    var a = 1;
    if (elapsed < FADE) a = elapsed / FADE;
    else if (elapsed > SCENE_LEN - FADE) a = (SCENE_LEN - elapsed) / FADE;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    scenes[cur].draw();
    ctx.restore();
  }
  requestAnimationFrame(frame);
})();
