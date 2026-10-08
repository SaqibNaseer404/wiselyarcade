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

  function draw() {
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Food: glowing orb.
    var fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2;
    ctx.save();
    ctx.shadowColor = '#FF6B5E';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#FF6B5E';
    ctx.beginPath();
    ctx.arc(fx, fy, CELL * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Snake: neon green body, brighter head.
    for (var i = snake.length - 1; i >= 0; i--) {
      var s = snake[i];
      var isHead = (i === 0);
      ctx.save();
      ctx.shadowColor = isHead ? '#4ADE80' : '#22D3EE';
      ctx.shadowBlur = 14;
      ctx.fillStyle = isHead ? '#4ADE80' : '#22D3EE';
      var pad = 1.5;
      var r = 5;
      var x = s.x * CELL + pad, y = s.y * CELL + pad;
      var w = CELL - pad * 2, h = CELL - pad * 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
      ctx.fill();
      ctx.restore();
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

  best = getBest();
  reset();
  renderScores();
})();
