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

  // ---- Round 1 cinematic polish: eat-spark particle pool (fixed size, reused) ----
  var sparks = [];
  var sparkCursor = 0;
  (function initSparks() {
    for (var i = 0; i < 72; i++) {
      sparks.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, c: '#F6B3C2' });
    }
  })();
  var SPARK_COLORS = ['#F6B3C2', '#C2A9F2', '#FFDF9E', '#9ADCD6'];
  function spawnSparks(x, y) {
    for (var n = 0; n < 10; n++) {
      var p = sparks[sparkCursor];
      sparkCursor = (sparkCursor + 1) % sparks.length;
      var a = Math.random() * Math.PI * 2;
      var sp = 50 + Math.random() * 130;
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.max = p.life = 0.45 + Math.random() * 0.45;
      p.c = SPARK_COLORS[n % SPARK_COLORS.length];
    }
  }
  var lastDrawT = 0;

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
      spawnSparks(head.x * CELL + CELL / 2, head.y * CELL + CELL / 2);
      if (score > best) { best = score; setBest(best); }
      renderScores();
      placeFood();
    } else {
      snake.pop();
    }
    draw();
    timerId = setTimeout(tick, stepMs());
  }

  // ---- v3 visual overhaul: glossy ribbon snake with interpolated motion,
  // deep neon arena, rich food + eat effects (visuals only; logic untouched) ----

  // Ambient star field (render-only; positions fixed at load).
  var stars = [];
  (function initStars() {
    for (var i = 0; i < 46; i++) {
      stars.push({
        x: Math.random() * SIZE, y: Math.random() * SIZE,
        r: 0.6 + Math.random() * 1.3,
        ph: Math.random() * Math.PI * 2,
        sp: 0.4 + Math.random() * 0.9
      });
    }
  })();

  // Interpolated (visual) snake positions in pixel space + eat FX state.
  var visPts = null;      // [{x,y}] smoothed segment centres
  var lastCells = null;   // grid snapshot from the previous draw
  var lastScoreSeen = 0;
  var eatWaveAt = -1;     // timestamp of last eat (travelling highlight)
  var eatFx = [];         // expanding eat rings {x,y,t0}
  var popups = [];        // floating score popups {x,y,t0,txt}

  function cellCenter(c) { return { x: c.x * CELL + CELL / 2, y: c.y * CELL + CELL / 2 }; }

  function snapVis() {
    visPts = [];
    lastCells = [];
    for (var i = 0; i < snake.length; i++) {
      visPts.push(cellCenter(snake[i]));
      lastCells.push({ x: snake[i].x, y: snake[i].y });
    }
  }

  // Advance the smoothed positions by one frame. A logic tick is detected by
  // comparing the head cell against the previous draw's snapshot: on a normal
  // move (or a grow) every new body cell equals the previous cell of the
  // segment ahead of it, so we unshift a copy of the old head point and let
  // each point chase the cell ahead — the classic slither. Anything else
  // (reset, first frame) snaps straight to the grid. Logic state untouched.
  function updateVis(dt) {
    if (!visPts || !lastCells || visPts.length !== lastCells.length) { snapVis(); return; }
    var i;
    var headMoved = snake[0].x !== lastCells[0].x || snake[0].y !== lastCells[0].y;
    if (headMoved) {
      var shifted = snake.length === lastCells.length || snake.length === lastCells.length + 1;
      if (shifted) {
        for (i = 1; i < lastCells.length && i < snake.length; i++) {
          if (snake[i].x !== lastCells[i - 1].x || snake[i].y !== lastCells[i - 1].y) { shifted = false; break; }
        }
      }
      if (shifted) {
        visPts.unshift({ x: visPts[0].x, y: visPts[0].y });
        while (visPts.length > snake.length) visPts.pop();
      } else {
        snapVis();
      }
    } else if (snake.length !== lastCells.length) {
      snapVis();
    }
    lastCells = [];
    for (i = 0; i < snake.length; i++) lastCells.push({ x: snake[i].x, y: snake[i].y });
    var k = 1 - Math.exp(-dt * 30);
    for (i = 0; i < snake.length; i++) {
      var t = cellCenter(snake[i]);
      visPts[i].x += (t.x - visPts[i].x) * k;
      visPts[i].y += (t.y - visPts[i].y) * k;
    }
  }

  // Densify the smoothed segment centres into a smooth ribbon path
  // (Catmull-Rom sampling, 2 samples per cell step). f: 0 head -> 1 tail.
  function ribbonPoints() {
    var pts = [];
    var n = visPts.length;
    if (n === 1) { pts.push({ x: visPts[0].x, y: visPts[0].y, f: 0 }); return pts; }
    for (var i = 0; i < n - 1; i++) {
      var p0 = visPts[Math.max(0, i - 1)], p1 = visPts[i];
      var p2 = visPts[i + 1], p3 = visPts[Math.min(n - 1, i + 2)];
      for (var s = 0; s < 2; s++) {
        var t = s / 2, t2 = t * t, t3 = t2 * t;
        pts.push({
          x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
          f: (i + t) / (n - 1)
        });
      }
    }
    pts.push({ x: visPts[n - 1].x, y: visPts[n - 1].y, f: 1 });
    return pts;
  }

  function mix(a, b, f) { return Math.round(a + (b - a) * f); }

  // Body palette drifts cyan (head) -> deep blue (tail).
  function bodyColors(f) {
    return {
      light: 'rgb(' + mix(214, 191, f) + ',' + mix(246, 219, f) + ',' + mix(255, 254, f) + ')',
      mid: 'rgb(' + mix(34, 37, f) + ',' + mix(211, 99, f) + ',' + mix(238, 235, f) + ')',
      dark: 'rgb(' + mix(14, 30, f) + ',' + mix(116, 58, f) + ',' + mix(144, 138, f) + ')'
    };
  }

  // Lightweight glossy scale orb for the ribbon (gradient sphere + glint).
  function drawScaleOrb(x, y, r, c) {
    var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, c.light);
    g.addColorStop(0.45, c.mid);
    g.addColorStop(1, c.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.34, y - r * 0.42, r * 0.3, r * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Board backdrop: deep radial gradient, drifting twinkling stars, a grid
  // that glows brighter toward the centre, a soft vignette pulse, and a
  // neon frame with magenta corner accents.
  function drawBoard(now) {
    var g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.05,
                                     SIZE / 2, SIZE / 2, SIZE * 0.72);
    g.addColorStop(0, '#161d38');
    g.addColorStop(0.6, '#0c1226');
    g.addColorStop(1, '#05070f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Ambient stars: slow drift + twinkle.
    ctx.save();
    ctx.fillStyle = '#cfe4ff';
    for (var si = 0; si < stars.length; si++) {
      var st = stars[si];
      var sx = (st.x + now * 0.004 * st.sp) % SIZE;
      ctx.globalAlpha = 0.14 + 0.26 * (0.5 + 0.5 * Math.sin(now / 700 + st.ph));
      ctx.beginPath();
      ctx.arc(sx, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Grid lines, brighter near the centre for a sense of depth.
    ctx.save();
    ctx.lineWidth = 1;
    for (var gl = 1; gl < CELLS; gl++) {
      var gd = Math.abs(gl - CELLS / 2) / (CELLS / 2);
      ctx.strokeStyle = 'rgba(110,150,255,' + (0.09 - 0.05 * gd).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(gl * CELL + 0.5, 0); ctx.lineTo(gl * CELL + 0.5, SIZE);
      ctx.moveTo(0, gl * CELL + 0.5); ctx.lineTo(SIZE, gl * CELL + 0.5);
      ctx.stroke();
    }
    ctx.restore();

    // Slow pastel vignette pulse (keeps the dark board, softens the edge).
    var vt = now / 1600;
    var va = 0.10 + 0.05 * Math.sin(vt);
    var vg = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.34,
                                      SIZE / 2, SIZE / 2, SIZE * 0.74);
    vg.addColorStop(0, 'rgba(194,169,242,0)');
    vg.addColorStop(1, 'rgba(194,169,242,' + va.toFixed(3) + ')');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Neon frame + corner accents.
    ctx.save();
    ctx.strokeStyle = 'rgba(34,211,238,0.55)';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, SIZE - 2, SIZE - 2);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(240,171,252,0.9)';
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    var L = 22, m = 4;
    ctx.beginPath();
    ctx.moveTo(m, m + L); ctx.lineTo(m, m); ctx.lineTo(m + L, m);
    ctx.moveTo(SIZE - m - L, m); ctx.lineTo(SIZE - m, m); ctx.lineTo(SIZE - m, m + L);
    ctx.moveTo(SIZE - m, SIZE - m - L); ctx.lineTo(SIZE - m, SIZE - m); ctx.lineTo(SIZE - m - L, SIZE - m);
    ctx.moveTo(m + L, SIZE - m); ctx.lineTo(m, SIZE - m); ctx.lineTo(m, SIZE - m - L);
    ctx.stroke();
    ctx.restore();
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

  // Glossy 3D eyeball: white sphere, dark pupil that looks toward the
  // travel direction (lx, ly), tiny glint.
  function drawEye(x, y, r, lx, ly) {
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
    ctx.arc(x + r * 0.12 + lx * r * 0.3, y + r * 0.1 + ly * r * 0.3, r * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(x - r * 0.16 + lx * r * 0.3, y - r * 0.2 + ly * r * 0.3, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Forked tongue: flicks out briefly every ~2.8s (render-only cycle).
  function drawTongue(hx, hy, hr, now) {
    var phase = now % 2800;
    if (phase > 340) return;
    var ext = Math.sin((phase / 340) * Math.PI);
    var len = hr * 1.05 * ext;
    if (len < 2) return;
    var bx = hx + dir.x * hr * 0.82, by = hy + dir.y * hr * 0.82;
    var tx = bx + dir.x * len, ty = by + dir.y * len;
    var px = -dir.y, py = dir.x;
    var fl = hr * 0.34;
    ctx.save();
    ctx.strokeStyle = '#ff5e7a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#ff5e7a';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(bx, by); ctx.lineTo(tx, ty);
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + (dir.x * 0.7 + px * 0.5) * fl, ty + (dir.y * 0.7 + py * 0.5) * fl);
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + (dir.x * 0.7 - px * 0.5) * fl, ty + (dir.y * 0.7 - py * 0.5) * fl);
    ctx.stroke();
    ctx.restore();
  }

  // Four-point sparkle star (food glint).
  function drawSparkle(x, y, r, rot, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#fff7d6';
    ctx.shadowColor = '#ffe9a8';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.18, -r * 0.18, r, 0);
    ctx.quadraticCurveTo(r * 0.18, r * 0.18, 0, r);
    ctx.quadraticCurveTo(-r * 0.18, r * 0.18, -r, 0);
    ctx.quadraticCurveTo(-r * 0.18, -r * 0.18, 0, -r);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    if (!snake || !food) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    var now = performance.now();
    var dt = lastDrawT ? Math.min(0.05, (now - lastDrawT) / 1000) : 0.016;
    lastDrawT = now;

    updateVis(dt);

    // Eat detection (render-only): the score changed since the last draw.
    if (score !== lastScoreSeen) {
      if (score > lastScoreSeen && visPts && visPts.length) {
        eatWaveAt = now;
        eatFx.push({ x: visPts[0].x, y: visPts[0].y, t0: now });
        popups.push({ x: visPts[0].x, y: visPts[0].y - CELL * 0.7, t0: now, txt: '+' + (score - lastScoreSeen) });
      }
      lastScoreSeen = score;
    }

    drawBoard(now);

    // Food: juicy glowing orb with a soft halo, a gentle pulse, an
    // expanding pulse ring and a slow sparkle.
    var fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2;
    var pulse = 1 + 0.16 * Math.sin(now / 300);
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
    var ringPh = (now % 1200) / 1200;
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - ringPh);
    ctx.strokeStyle = '#ff8a7a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx, fy, fr * (1.15 + ringPh * 0.9), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawGlossyOrb(fx, fy, fr, '#ffd9d2', '#ff6b5e', '#b81f14', '#ff6b5e', 22);
    drawSparkle(fx + fr * 0.85, fy - fr * 0.8, 5 + 1.6 * Math.sin(now / 260),
                now / 900, 0.55 + 0.4 * Math.sin(now / 340));

    // ---- Snake: glossy ribbon over the interpolated positions ----
    var pts = ribbonPoints();
    var hx = visPts[0].x, hy = visPts[0].y;
    var hr = CELL * 0.52;
    var i, bp;

    // Soft glow pooled on the floor under the head.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, CELL * 1.6);
    hg.addColorStop(0, 'rgba(74,222,128,0.20)');
    hg.addColorStop(1, 'rgba(74,222,128,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(hx, hy, CELL * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Neon under-glow stroke along the whole ribbon.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(34,211,238,0.13)';
    ctx.lineWidth = CELL * 1.02;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();

    // Body scales, tail first, tapering toward the tail.
    for (i = pts.length - 1; i >= 0; i--) {
      bp = pts[i];
      if (bp.f < 0.02) continue; // head drawn separately below
      drawScaleOrb(bp.x, bp.y, CELL * (0.47 - 0.17 * bp.f), bodyColors(bp.f));
    }

    // Bright glossy spine along the body.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(215,250,255,0.38)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();

    // Eat highlight: a bright wave travelling head -> tail.
    if (eatWaveAt > 0) {
      var age = (now - eatWaveAt) / 550;
      if (age >= 1) {
        eatWaveAt = -1;
      } else {
        var front = age * (pts.length + 4);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#d9fbff';
        for (i = 0; i < pts.length; i++) {
          var inten = 1 - Math.abs(i - front) / 3;
          if (inten <= 0) continue;
          ctx.globalAlpha = 0.38 * inten;
          ctx.beginPath();
          ctx.arc(pts[i].x, pts[i].y, CELL * (0.47 - 0.17 * pts[i].f) * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Tongue (base tucked under the head), head, and looking eyes.
    drawTongue(hx, hy, hr, now);
    var headGlow = 18 + Math.min(16, (150 - stepMs()) * 0.2);
    drawGlossyOrb(hx, hy, hr, '#cfffb0', '#4ade80', '#15803d', '#4ade80', headGlow);
    var px = -dir.y, py = dir.x; // perpendicular to travel direction
    var fwd = hr * 0.5, side = hr * 0.42, er = hr * 0.34;
    drawEye(hx + dir.x * fwd + px * side, hy + dir.y * fwd + py * side, er, dir.x, dir.y);
    drawEye(hx + dir.x * fwd - px * side, hy + dir.y * fwd - py * side, er, dir.x, dir.y);

    // Trail glow: fading pastel-cyan glow dots over the last 6 body segments.
    var n = visPts.length;
    var glowN = Math.min(6, n - 1);
    if (glowN > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var gi = 1; gi <= glowN; gi++) {
        var gs = visPts[gi];
        var ga = 0.20 * (1 - gi / (glowN + 1));
        var gr = CELL * 0.62;
        var gg = ctx.createRadialGradient(gs.x, gs.y, 0, gs.x, gs.y, gr);
        gg.addColorStop(0, 'rgba(154,220,214,' + ga.toFixed(3) + ')');
        gg.addColorStop(1, 'rgba(154,220,214,0)');
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(gs.x, gs.y, gr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Eat rings: one expanding ring per eat.
    if (eatFx.length) {
      ctx.save();
      ctx.strokeStyle = '#ffb3ab';
      ctx.lineWidth = 2;
      var keepFx = [];
      for (i = 0; i < eatFx.length; i++) {
        var ef = eatFx[i];
        var ea = (now - ef.t0) / 450;
        if (ea >= 1) continue;
        keepFx.push(ef);
        ctx.globalAlpha = 0.7 * (1 - ea);
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, CELL * 0.4 + ea * CELL * 1.3, 0, Math.PI * 2);
        ctx.stroke();
      }
      eatFx = keepFx;
      ctx.restore();
    }

    // Eat sparks: drift + fade (gravity-free), additive.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var si = 0; si < sparks.length; si++) {
      var sp = sparks[si];
      if (sp.life <= 0) continue;
      sp.life -= dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vx *= (1 - 1.6 * dt);
      sp.vy *= (1 - 1.6 * dt);
      var sa = Math.max(0, sp.life / sp.max);
      ctx.globalAlpha = sa;
      ctx.fillStyle = sp.c;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 1.2 + 2.4 * sa, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // Score popups: rise + fade in Barlow Condensed.
    if (popups.length) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '700 17px "Barlow Condensed","Nunito",sans-serif';
      ctx.shadowColor = 'rgba(245,166,35,0.8)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#FFE9A8';
      var keepP = [];
      for (i = 0; i < popups.length; i++) {
        var pp = popups[i];
        var pa = (now - pp.t0) / 900;
        if (pa >= 1) continue;
        keepP.push(pp);
        ctx.globalAlpha = 1 - pa;
        ctx.fillText(pp.txt, pp.x, pp.y - pa * 26);
      }
      popups = keepP;
      ctx.restore();
      ctx.globalAlpha = 1;
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
