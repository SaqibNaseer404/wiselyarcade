// Neon Snake — canvas snake with a neon glow look (Ages 10-17).
// Keyboard (arrows/WASD) + touch swipe. Speed rises as you eat.
// Best score saved in localStorage.
(function () {
  'use strict';

  var canvas = document.getElementById('snakeCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('s-score');
  var bestEl = document.getElementById('s-best');
  var startOverlay = document.getElementById('s-start');
  var overOverlay = document.getElementById('s-over');
  var overStats = document.getElementById('s-over-stats');
  var startBtn = document.getElementById('s-start-btn');
  var againBtn = document.getElementById('s-again-btn');

  var BEST_KEY = 'wisely_snake_best';
  var SIZE = 400;          // canvas pixels (square)
  var CELLS = 20;          // grid is CELLS x CELLS
  var CELL = SIZE / CELLS;

  var snake, dir, queuedDir, food, score, best, timerId, running, dead;

  function getBest() {
    try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; }
    catch (e) { return 0; }
  }
  function setBest(v) {
    try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) {}
  }

  function renderScores() {
    scoreEl.textContent = score;
    bestEl.textContent = best;
  }

  // Speed: starts relaxed, gets faster the more you eat (min 70ms per step).
  function stepMs() {
    return Math.max(70, 150 - score * 4);
  }

  function reset() {
    var mid = Math.floor(CELLS / 2);
    snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid }
    ];
    dir = { x: 1, y: 0 };
    queuedDir = dir;
    score = 0;
    dead = false;
    placeFood();
    renderScores();
    draw();
  }

  function placeFood() {
    while (true) {
      var f = {
        x: Math.floor(Math.random() * CELLS),
        y: Math.floor(Math.random() * CELLS)
      };
      var onSnake = snake.some(function (s) { return s.x === f.x && s.y === f.y; });
      if (!onSnake) { food = f; return; }
    }
  }

  function tick() {
    if (!running || dead) return;
    dir = queuedDir;
    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wall collision.
    if (head.x < 0 || head.y < 0 || head.x >= CELLS || head.y >= CELLS) return gameOver();
    // Self collision (check against body; tail moves away unless growing).
    var eating = (head.x === food.x && head.y === food.y);
    var body = eating ? snake : snake.slice(0, -1);
    for (var i = 0; i < body.length; i++) {
      if (body[i].x === head.x && body[i].y === head.y) return gameOver();
    }

    snake.unshift(head);
    if (eating) {
      score++;
      if (score > best) { best = score; setBest(best); }
      renderScores();
      placeFood();
    } else {
      snake.pop();
    }
    draw();
    timerId = setTimeout(tick, stepMs());
  }

  // ---- Glossy 3D candy look (visuals only; game logic untouched) ----

  // Board backdrop: deep radial gradient for depth, vignette edges,
  // and a faint dot grid for texture.
  function drawBoard() {
    var g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.05,
                                     SIZE / 2, SIZE / 2, SIZE * 0.72);
    g.addColorStop(0, '#161d38');
    g.addColorStop(0.6, '#0c1226');
    g.addColorStop(1, '#05070f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = 'rgba(120,160,255,0.07)';
    var gx, gy;
    for (gx = 0; gx < CELLS; gx++) {
      for (gy = 0; gy < CELLS; gy++) {
        ctx.beginPath();
        ctx.arc(gx * CELL + CELL / 2, gy * CELL + CELL / 2, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // One glossy candy orb: soft grounding shadow, neon glow, radial-gradient
  // sphere shading (light source upper-left), dark bottom rim for volume,
  // and a white specular highlight like a candy wrapper.
  function drawGlossyOrb(x, y, r, light, mid, dark, glowColor, glowBlur) {
    // Soft drop shadow beneath the orb.
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.55, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sphere body with neon glow.
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
    var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, light);
    g.addColorStop(0.45, mid);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Dark crescent along the bottom for volume.
    ctx.save();
    var shade = ctx.createRadialGradient(x, y + r * 0.3, r * 0.2, x, y, r * 1.2);
    shade.addColorStop(0, 'rgba(0,0,20,0)');
    shade.addColorStop(1, 'rgba(0,0,20,0.38)');
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // White specular highlight (upper-left).
    ctx.save();
    ctx.globalAlpha = 0.9;
    var hi = ctx.createRadialGradient(x - r * 0.36, y - r * 0.42, 0,
                                      x - r * 0.36, y - r * 0.42, r * 0.42);
    hi.addColorStop(0, 'rgba(255,255,255,0.95)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.ellipse(x - r * 0.36, y - r * 0.42, r * 0.42, r * 0.28, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Glossy 3D eyeball: white sphere, dark pupil, tiny glint.
  function drawEye(x, y, r) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#c7d2e6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#0b1020';
    ctx.beginPath();
    ctx.arc(x + r * 0.12, y + r * 0.1, r * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(x - r * 0.16, y - r * 0.2, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    if (!snake || !food) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    drawBoard();

    var now = performance.now();

    // Food: juicy glowing orb with a soft halo and a gentle pulse.
    var fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2;
    var pulse = 1 + 0.09 * Math.sin(now / 300);
    var fr = CELL * 0.36 * pulse;
    ctx.save();
    var halo = ctx.createRadialGradient(fx, fy, fr * 0.4, fx, fy, fr * 2.1);
    halo.addColorStop(0, 'rgba(255,107,94,0.55)');
    halo.addColorStop(1, 'rgba(255,107,94,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(fx, fy, fr * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawGlossyOrb(fx, fy, fr, '#ffd9d2', '#ff6b5e', '#b81f14', '#ff6b5e', 22);

    // Snake: glossy orbs, neon green head + cyan body, tapering to the tail.
    var n = snake.length;
    for (var i = n - 1; i >= 0; i--) {
      var s = snake[i];
      var x = s.x * CELL + CELL / 2, y = s.y * CELL + CELL / 2;
      if (i === 0) {
        // Head: bigger glossy orb + directional 3D eyes.
        var hr = CELL * 0.52;
        drawGlossyOrb(x, y, hr, '#cfffb0', '#4ade80', '#15803d', '#4ade80', 18);
        var px = -dir.y, py = dir.x; // perpendicular to travel direction
        var fwd = hr * 0.5, side = hr * 0.42, er = hr * 0.34;
        drawEye(x + dir.x * fwd + px * side, y + dir.y * fwd + py * side, er);
        drawEye(x + dir.x * fwd - px * side, y + dir.y * fwd - py * side, er);
      } else {
        var taper = n > 1 ? i / n : 0;
        var r = CELL * 0.48 - taper * CELL * 0.14;
        drawGlossyOrb(x, y, r, '#d6f6ff', '#22d3ee', '#0e7490', '#22d3ee', 12);
      }
    }
  }

  function start() {
    reset();
    running = true;
    startOverlay.classList.add('hidden');
    overOverlay.classList.add('hidden');
    clearTimeout(timerId);
    timerId = setTimeout(tick, stepMs());
  }

  function gameOver() {
    dead = true;
    running = false;
    clearTimeout(timerId);
    overStats.innerHTML = 'Score: <strong>' + score + '</strong><br>Best: <strong>' + best + '</strong>';
    overOverlay.classList.remove('hidden');
  }

  function pause() {
    if (running && !dead) {
      running = false;
      clearTimeout(timerId);
      startOverlay.classList.remove('hidden');
      startOverlay.querySelector('h2').textContent = 'Paused';
      startBtn.textContent = 'Resume';
    }
  }

  var DIRS = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
  };

  function steer(name) {
    var nd = DIRS[name];
    if (!nd) return;
    // No 180-degree turns (prevents instant self-collision).
    if (nd.x === -dir.x && nd.y === -dir.y) return;
    queuedDir = nd;
    // First input also starts the game.
    if (!running && !dead && startOverlay && !startOverlay.classList.contains('hidden')) start();
  }

  document.addEventListener('keydown', function (e) {
    var k = e.key;
    var map = {
      ArrowUp: 'up', w: 'up', W: 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right'
    };
    if (map[k]) {
      e.preventDefault(); // stop page scrolling on arrows/space
      steer(map[k]);
    } else if (k === ' ') {
      e.preventDefault();
      if (!running && !dead) start();
    } else if (k === 'p' || k === 'P' || k === 'Escape') {
      pause();
    }
  });

  // Touch swipe controls.
  var touchStart = null;
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    var t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault(); // keep the page from scrolling while swiping
  }, { passive: false });
  canvas.addEventListener('touchend', function (e) {
    if (!touchStart) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
      // Treat a tap as start/resume.
      if (!running && !dead) start();
      return;
    }
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });

  // Pause when the tab loses focus so the snake doesn't die while away.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
  });

  startBtn.addEventListener('click', start);
  againBtn.addEventListener('click', function () {
    startOverlay.querySelector('h2').textContent = 'Neon Snake';
    startBtn.textContent = 'Start';
    start();
  });

  // Cosmetic-only animation loop (food pulse / highlight shimmer).
  // draw() never changes game state, so this is purely visual.
  (function visualLoop() {
    if (!document.hidden) draw();
    requestAnimationFrame(visualLoop);
  })();

  best = getBest();
  reset();
  renderScores();
})();
