// Forest Dash — Wisely Arcade
// 3-lane endless runner: dodge logs, duck branches, grab fireflies, keep going.
// Original theme and art. Vanilla JS + canvas only.
(function () {
  'use strict';

  var canvas = document.getElementById('dash');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 420, H = 640;
  var LANES = [100, 210, 320];   // lane centers at full scale
  var VP_Y = 170;                // vanishing point (horizon)
  var PLAYER_Y = 516;
  var JUMP_DUR = 0.62, JUMP_H = 120;
  var SLIDE_DUR = 0.55;
  var DAY_LEN = 160;             // seconds for a full day cycle

  var state = 'ready'; // ready | playing | over
  var lane = 1, laneX = LANES[1];
  var jumpT = -1, slideT = -1;   // -1 = inactive, else seconds elapsed
  var runPhase = 0;

  var obstacles = []; // {kind:'log'|'branch'|'rock'|'pile', lanes:[..], y}
  var flies = [];     // {lane, y, taken, seed}
  var parts = [];     // sparkles {x,y,vx,vy,life,max}
  var trees = [];     // {x, y, s, pine}
  var clouds = [];    // {x, y, s, v}
  var stars = [];     // {x, y, r, tw}

  var dist = 0, score = 0, caught = 0, runTime = 0;
  var speed = 260;
  var dayT = 18;      // start mid-morning
  var spawnT = 1.1;
  var newBest = false;

  var best = 0;
  try { best = parseInt(localStorage.getItem('wisely_forest_dash_best') || '0', 10) || 0; } catch (e) {}

  var elScore = document.getElementById('f-score');
  var elFlies = document.getElementById('f-flies');
  var elBest = document.getElementById('f-best');
  var overlay = document.getElementById('f-over');
  var overStats = document.getElementById('f-over-stats');
  var btnAgain = document.getElementById('f-again');
  var btnRestart = document.getElementById('f-restart');

  // ---------- helpers ----------
  function rand(a, b) { return a + Math.random() * (b - a); }
  function ri(a, b) { return Math.floor(rand(a, b + 1)); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function hexRgb(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function mix(h1, h2, k) {
    var a = hexRgb(h1), b = hexRgb(h2);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * k) + ',' +
      Math.round(a[1] + (b[1] - a[1]) * k) + ',' +
      Math.round(a[2] + (b[2] - a[2]) * k) + ')';
  }
  // pseudo-3D: 0 at horizon, 1 at bottom
  function scaleAt(y) { return clamp((y - VP_Y) / (H - VP_Y), 0.02, 1.12); }
  function laneXat(i, y) { return 210 + (LANES[i] - 210) * scaleAt(y); }

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

  // ---------- sky palette (day -> sunset -> night -> dawn) ----------
  var SKY_KEYS = [
    { t: 0,   top: '#6ec1f5', bot: '#dff3ff', track: '#d9b382', grass: '#79c46b', tree: '#3f8f52', glow: 1 },
    { t: 55,  top: '#ff9e57', bot: '#ffe0ae', track: '#cfa06e', grass: '#6cab5d', tree: '#357a48', glow: 1 },
    { t: 100, top: '#0c1230', bot: '#28365e', track: '#6e5a44', grass: '#2f4c40', tree: '#1e3d31', glow: 0 },
    { t: 135, top: '#4a6ea0', bot: '#f6c489', track: '#c9a173', grass: '#64a25c', tree: '#35784a', glow: 1 }
  ];
  function skyAt(t) {
    t = ((t % DAY_LEN) + DAY_LEN) % DAY_LEN;
    var a = SKY_KEYS[SKY_KEYS.length - 1], b = SKY_KEYS[0], i;
    for (i = 0; i < SKY_KEYS.length; i++) {
      if (t < SKY_KEYS[i].t) {
        b = SKY_KEYS[i];
        a = SKY_KEYS[(i + SKY_KEYS.length - 1) % SKY_KEYS.length];
        break;
      }
      a = SKY_KEYS[i];
    }
    var span = (b.t - a.t + DAY_LEN) % DAY_LEN;
    if (span === 0) span = DAY_LEN;
    var k = ((t - a.t + DAY_LEN) % DAY_LEN) / span;
    return {
      top: mix(a.top, b.top, k), bot: mix(a.bot, b.bot, k),
      track: mix(a.track, b.track, k), grass: mix(a.grass, b.grass, k),
      tree: mix(a.tree, b.tree, k), glow: a.glow + (b.glow - a.glow) * k
    };
  }

  // ---------- world setup ----------
  function initScenery() {
    trees = []; clouds = []; stars = [];
    var i;
    for (i = 0; i < 16; i++) {
      var side = i % 2 === 0 ? -1 : 1;
      trees.push({
        x: side < 0 ? rand(8, 62) : rand(W - 62, W - 8),
        y: rand(VP_Y + 20, H + 40),
        s: rand(0.7, 1.25),
        pine: Math.random() < 0.7
      });
    }
    for (i = 0; i < 4; i++) clouds.push({ x: rand(0, W), y: rand(30, 140), s: rand(0.7, 1.3), v: rand(6, 14) });
    for (i = 0; i < 46; i++) stars.push({ x: rand(0, W), y: rand(0, 300), r: rand(0.8, 2), tw: rand(0, 6.28) });
  }

  function mkObs(kind, lanes) { return { kind: kind, lanes: lanes, y: -60 }; }

  function spawnPattern() {
    var r = Math.random(), l1, l2;
    if (r < 0.30) {
      // firefly trail, sometimes with an obstacle in another lane
      var fl = ri(0, 2), i;
      for (i = 0; i < 5; i++) flies.push({ lane: fl, y: -40 - i * 54, taken: false, seed: rand(0, 6.28) });
      if (Math.random() < 0.5) {
        var ol = (fl + ri(1, 2)) % 3;
        obstacles.push(mkObs(Math.random() < 0.5 ? 'log' : 'branch', [ol]));
      }
    } else if (r < 0.52) {
      obstacles.push(mkObs(Math.random() < 0.5 ? 'log' : 'branch', [ri(0, 2)]));
    } else if (r < 0.70) {
      obstacles.push(mkObs('rock', [ri(0, 2)]));
    } else if (r < 0.85) {
      var s0 = ri(0, 1);
      obstacles.push(mkObs('pile', [s0, s0 + 1])); // long log pile across 2 lanes
    } else {
      l1 = ri(0, 2); l2 = (l1 + ri(1, 2)) % 3;
      obstacles.push(mkObs('log', [l1]));
      obstacles.push(mkObs('branch', [l2]));
    }
  }

  function sparkle(x, y) {
    var i;
    for (i = 0; i < 10; i++) {
      parts.push({
        x: x, y: y,
        vx: rand(-130, 130), vy: rand(-160, -30),
        life: 0, max: rand(0.35, 0.7)
      });
    }
  }

  // ---------- state ----------
  function updateStats() {
    elScore.textContent = score;
    elFlies.textContent = caught;
    elBest.textContent = best === 0 ? '—' : best;
  }

  function reset(toReady) {
    obstacles = []; flies = []; parts = [];
    lane = 1; laneX = LANES[1];
    jumpT = -1; slideT = -1; runPhase = 0;
    dist = 0; score = 0; caught = 0; runTime = 0;
    speed = 260; spawnT = 1.1; newBest = false;
    initScenery();
    overlay.classList.add('hidden');
    updateStats();
    state = toReady ? 'ready' : 'playing';
  }

  function gameOver() {
    state = 'over';
    newBest = score > best;
    if (newBest) {
      best = score;
      try { localStorage.setItem('wisely_forest_dash_best', String(best)); } catch (e) {}
    }
    updateStats();
    overStats.textContent = 'Score ' + score + ' · Fireflies ' + caught +
      (newBest ? ' — new best!' : ' · Best ' + best);
    overlay.classList.remove('hidden');
  }

  function jumpH() {
    if (jumpT < 0) return 0;
    var k = jumpT / JUMP_DUR;
    return JUMP_H * 4 * k * (1 - k);
  }

  function doJump() {
    if (state !== 'playing' || jumpT >= 0) return;
    jumpT = 0; slideT = -1;
  }
  function doSlide() {
    if (state !== 'playing' || slideT >= 0) return;
    slideT = 0; jumpT = -1;
  }
  function moveLane(d) {
    if (state !== 'playing') return;
    lane = clamp(lane + d, 0, 2);
  }

  // ---------- update ----------
  function update(dt) {
    dayT += dt;
    var i, o;

    // clouds always drift
    for (i = 0; i < clouds.length; i++) {
      clouds[i].x += clouds[i].v * dt;
      if (clouds[i].x > W + 70) clouds[i].x = -70;
    }

    if (state !== 'playing') {
      // idle trees sway gently on the ready screen
      runPhase += dt * 2;
      return;
    }

    runTime += dt;
    speed = Math.min(660, 260 + runTime * 6.5);
    runPhase += dt * (4 + speed / 60);
    dist += speed * dt;
    score = Math.floor(dist / 12) + caught * 25;

    // smooth lane movement
    laneX += (LANES[lane] - laneX) * Math.min(1, dt * 14);

    // jump / slide timers
    if (jumpT >= 0) { jumpT += dt; if (jumpT >= JUMP_DUR) jumpT = -1; }
    if (slideT >= 0) { slideT += dt; if (slideT >= SLIDE_DUR) slideT = -1; }

    // spawn
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnPattern();
      spawnT = 260 / speed + rand(0, 0.35);
    }

    // move world down
    for (i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].y += speed * dt;
      if (obstacles[i].y > H + 90) obstacles.splice(i, 1);
    }
    for (i = flies.length - 1; i >= 0; i--) {
      flies[i].y += speed * dt;
      if (flies[i].y > H + 30) flies.splice(i, 1);
    }
    for (i = trees.length - 1; i >= 0; i--) {
      trees[i].y += speed * dt * 0.92;
      if (trees[i].y > H + 60) {
        trees[i].y = VP_Y + rand(0, 40);
        trees[i].x = Math.random() < 0.5 ? rand(8, 62) : rand(W - 62, W - 8);
      }
    }
    for (i = parts.length - 1; i >= 0; i--) {
      o = parts[i];
      o.life += dt;
      o.x += o.vx * dt; o.y += o.vy * dt; o.vy += 320 * dt;
      if (o.life >= o.max) parts.splice(i, 1);
    }

    // collisions
    var airborne = jumpT >= 0 && jumpH() > 42;
    var sliding = slideT >= 0;
    for (i = 0; i < obstacles.length; i++) {
      o = obstacles[i];
      if (Math.abs(o.y - PLAYER_Y) > 30) continue;
      if (o.lanes.indexOf(lane) === -1) continue;
      var crash = false;
      if (o.kind === 'log' || o.kind === 'pile') crash = !airborne;
      else if (o.kind === 'branch') crash = !sliding;
      else if (o.kind === 'rock') crash = true;
      if (crash) { gameOver(); return; }
    }

    // pickups
    for (i = 0; i < flies.length; i++) {
      o = flies[i];
      if (!o.taken && o.lane === lane && Math.abs(o.y - PLAYER_Y) < 42) {
        o.taken = true; caught++;
        sparkle(laneXat(o.lane, PLAYER_Y), PLAYER_Y - 40);
      }
    }

    updateStats();
  }

  // ---------- drawing ----------
  function drawTree(t, treeCol) {
    var s = scaleAt(t.y) * t.s;
    var x = t.x, y = t.y;
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(x - 4 * s, y - 18 * s, 8 * s, 18 * s);
    ctx.fillStyle = treeCol;
    if (t.pine) {
      var w;
      for (var k = 0; k < 3; k++) {
        w = (34 - k * 9) * s;
        var ty = y - 16 * s - k * 20 * s;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, ty);
        ctx.lineTo(x + w / 2, ty);
        ctx.lineTo(x, ty - 26 * s);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.beginPath(); ctx.arc(x, y - 34 * s, 20 * s, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.arc(x - 14 * s, y - 24 * s, 13 * s, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 14 * s, y - 24 * s, 13 * s, 0, 6.29); ctx.fill();
    }
  }

  function drawFly(f, nightK) {
    if (f.taken) return;
    var s = scaleAt(f.y);
    var x = laneXat(f.lane, f.y) + Math.sin(runPhase * 0.7 + f.seed) * 8 * s;
    var y = f.y - 30 * s + Math.cos(runPhase * 0.9 + f.seed) * 6 * s;
    var r = 7 * s;
    var glowA = 0.35 + 0.55 * nightK;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, 'rgba(255,246,170,' + (0.85 * glowA + 0.15) + ')');
    g.addColorStop(1, 'rgba(255,246,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#fff3a0';
    ctx.beginPath(); ctx.arc(x, y, r * (0.8 + 0.2 * Math.sin(runPhase * 3 + f.seed)), 0, 6.29); ctx.fill();
  }

  function drawLog(x, y, s, lanesWide) {
    var w = 104 * s * lanesWide, h = 26 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(x, y + 4 * s, w / 2, 7 * s, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#8a5a33';
    rr(x - w / 2, y - h, w, h, 10 * s); ctx.fill();
    ctx.fillStyle = '#a9764a';
    rr(x - w / 2, y - h, w, h * 0.45, 10 * s); ctx.fill();
    ctx.fillStyle = '#d9b98c';
    ctx.beginPath(); ctx.arc(x - w / 2 + 8 * s, y - h / 2, 8 * s, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w / 2 - 8 * s, y - h / 2, 8 * s, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#8a5a33';
    ctx.beginPath(); ctx.arc(x - w / 2 + 8 * s, y - h / 2, 4 * s, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w / 2 - 8 * s, y - h / 2, 4 * s, 0, 6.29); ctx.fill();
  }

  function drawBranch(x, y, s) {
    var w = 96 * s, barY = y - 66 * s;
    ctx.fillStyle = '#7a4f2b';
    rr(x - w / 2, barY - 7 * s, w, 14 * s, 7 * s); ctx.fill();
    ctx.fillStyle = '#4d9e57';
    var lx = [-30, -8, 16, 34];
    for (var i = 0; i < lx.length; i++) {
      ctx.beginPath(); ctx.arc(x + lx[i] * s, barY - 16 * s, 13 * s, 0, 6.29); ctx.fill();
    }
    ctx.fillStyle = '#67bd72';
    ctx.beginPath(); ctx.arc(x - 8 * s, barY - 22 * s, 8 * s, 0, 6.29); ctx.fill();
    // dangling leaf hint so players read "duck under"
    ctx.fillStyle = '#4d9e57';
    ctx.beginPath(); ctx.arc(x + 22 * s, barY + 2 * s, 6 * s, 0, 6.29); ctx.fill();
  }

  function drawRock(x, y, s) {
    var w = 74 * s, h = 132 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.beginPath(); ctx.ellipse(x, y + 4 * s, w / 2 + 4 * s, 8 * s, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#8d8d99';
    rr(x - w / 2, y - h, w, h, 18 * s); ctx.fill();
    ctx.fillStyle = '#a5a5b1';
    rr(x - w / 2, y - h, w * 0.55, h * 0.6, 14 * s); ctx.fill();
    ctx.strokeStyle = '#6f6f7a'; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(x - w * 0.2, y - h * 0.75); ctx.lineTo(x + w * 0.1, y - h * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w * 0.25, y - h * 0.9); ctx.lineTo(x + w * 0.05, y - h * 0.62); ctx.stroke();
    ctx.fillStyle = '#7c7c88';
    ctx.beginPath(); ctx.arc(x - w * 0.28, y - h - 6 * s, 16 * s, 0, 6.29); ctx.fill();
  }

  function drawPile(cx, y, s) {
    drawLog(cx, y, s, 2);
    ctx.fillStyle = '#8a5a33';
    var w = 150 * s, h = 24 * s;
    rr(cx - w / 2, y - 26 * s - h, w, h, 10 * s); ctx.fill();
    ctx.fillStyle = '#a9764a';
    rr(cx - w / 2, y - 26 * s - h, w, h * 0.45, 10 * s); ctx.fill();
  }

  function drawPlayer() {
    var s = scaleAt(PLAYER_Y);
    var x = laneX, y = PLAYER_Y - jumpH();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(x, PLAYER_Y + 6 * s, 24 * s, 7 * s, 0, 0, 6.29); ctx.fill();

    if (slideT >= 0) {
      // rolling tuck
      var br = 17 * s;
      ctx.fillStyle = '#14b8a6';
      ctx.beginPath(); ctx.arc(x, y - br, br, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#f6c793';
      ctx.beginPath(); ctx.arc(x + 8 * s, y - br - 6 * s, 9 * s, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#5b3a29';
      ctx.beginPath(); ctx.arc(x + 8 * s, y - br - 10 * s, 9 * s, 3.4, 6.0); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.moveTo(x - 30 * s, y - br); ctx.lineTo(x - 44 * s, y - br); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 24 * s, y - br - 12 * s); ctx.lineTo(x - 38 * s, y - br - 16 * s); ctx.stroke();
      return;
    }

    var sw = Math.sin(runPhase) * (state === 'playing' ? 1 : 0.15);
    var hipY = y - 34 * s;
    // legs
    ctx.strokeStyle = '#3b4a5a'; ctx.lineWidth = 9 * s; ctx.lineCap = 'round';
    var tuck = jumpT >= 0 ? 0.55 : 0;
    ctx.beginPath();
    ctx.moveTo(x, hipY);
    ctx.lineTo(x + sw * 16 * s, hipY + 26 * s - tuck * 14 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, hipY);
    ctx.lineTo(x - sw * 16 * s, hipY + 26 * s - tuck * 6 * s);
    ctx.stroke();
    // body
    ctx.fillStyle = '#14b8a6';
    rr(x - 13 * s, y - 64 * s, 26 * s, 34 * s, 9 * s); ctx.fill();
    // little backpack
    ctx.fillStyle = '#f59e0b';
    rr(x - 20 * s, y - 58 * s, 9 * s, 20 * s, 4 * s); ctx.fill();
    // arms
    ctx.strokeStyle = '#f6c793'; ctx.lineWidth = 7 * s;
    ctx.beginPath(); ctx.moveTo(x, y - 54 * s); ctx.lineTo(x - sw * 14 * s, y - 36 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 54 * s); ctx.lineTo(x + sw * 14 * s, y - 36 * s); ctx.stroke();
    // head
    ctx.fillStyle = '#f6c793';
    ctx.beginPath(); ctx.arc(x, y - 76 * s, 13 * s, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#5b3a29';
    ctx.beginPath(); ctx.arc(x, y - 79 * s, 13 * s, 3.35, 6.05); ctx.fill();
    ctx.fillStyle = '#22303c';
    ctx.beginPath(); ctx.arc(x + 6 * s, y - 76 * s, 2.2 * s, 0, 6.29); ctx.fill();
  }

  function draw() {
    var sky = skyAt(dayT);
    var nightK = 1 - sky.glow;
    var i;

    // sky
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, sky.top); g.addColorStop(1, sky.bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // stars
    if (nightK > 0.15) {
      for (i = 0; i < stars.length; i++) {
        var st = stars[i];
        ctx.fillStyle = 'rgba(255,255,255,' + (nightK * (0.4 + 0.6 * Math.abs(Math.sin(runPhase * 0.5 + st.tw)))) + ')';
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.29); ctx.fill();
      }
    }

    // sun / moon
    var sunX = 330, sunY = 90 + nightK * 40;
    if (sky.glow > 0.25) {
      var sg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 54);
      var sunCol = nightK > 0.5 ? '255,214,150' : '255,236,170';
      sg.addColorStop(0, 'rgba(' + sunCol + ',0.95)');
      sg.addColorStop(1, 'rgba(' + sunCol + ',0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(sunX, sunY, 54, 0, 6.29); ctx.fill();
      ctx.fillStyle = nightK > 0.5 ? '#ffd996' : '#fff3b0';
      ctx.beginPath(); ctx.arc(sunX, sunY, 24, 0, 6.29); ctx.fill();
    } else {
      ctx.fillStyle = '#f4f1de';
      ctx.beginPath(); ctx.arc(sunX, sunY, 22, 0, 6.29); ctx.fill();
      ctx.fillStyle = sky.top;
      ctx.beginPath(); ctx.arc(sunX + 9, sunY - 6, 18, 0, 6.29); ctx.fill();
    }

    // clouds
    if (sky.glow > 0.4) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.75 * sky.glow) + ')';
      for (i = 0; i < clouds.length; i++) {
        var c = clouds[i], cs = c.s;
        ctx.beginPath(); ctx.arc(c.x, c.y, 18 * cs, 0, 6.29); ctx.fill();
        ctx.beginPath(); ctx.arc(c.x + 20 * cs, c.y + 4 * cs, 14 * cs, 0, 6.29); ctx.fill();
        ctx.beginPath(); ctx.arc(c.x - 20 * cs, c.y + 5 * cs, 12 * cs, 0, 6.29); ctx.fill();
      }
    }

    // distant tree line at horizon
    ctx.fillStyle = sky.tree;
    ctx.beginPath();
    ctx.moveTo(0, VP_Y);
    for (i = 0; i <= 21; i++) {
      var hx = i * 20;
      var hh = 14 + 10 * Math.abs(Math.sin(i * 2.7));
      ctx.lineTo(hx, VP_Y - hh);
      ctx.lineTo(hx + 10, VP_Y);
    }
    ctx.lineTo(W, VP_Y); ctx.lineTo(W, VP_Y + 4); ctx.lineTo(0, VP_Y + 4);
    ctx.closePath(); ctx.fill();

    // grass sides
    ctx.fillStyle = sky.grass;
    ctx.fillRect(0, VP_Y, W, H - VP_Y);
    // track trapezoid
    ctx.fillStyle = sky.track;
    ctx.beginPath();
    ctx.moveTo(210 - 64, VP_Y); ctx.lineTo(210 + 64, VP_Y);
    ctx.lineTo(210 + 200, H); ctx.lineTo(210 - 200, H);
    ctx.closePath(); ctx.fill();
    // lane dashes
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 4;
    ctx.setLineDash([16, 18]);
    for (i = 0; i < 2; i++) {
      ctx.beginPath();
      for (var yy = VP_Y; yy <= H; yy += 24) {
        var bx = 210 + ((LANES[i] + LANES[i + 1]) / 2 - 210) * scaleAt(yy);
        if (yy === VP_Y) ctx.moveTo(bx, yy); else ctx.lineTo(bx, yy);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // trees (sorted far -> near)
    var order = trees.slice().sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < order.length; i++) drawTree(order[i], sky.tree);

    // fireflies
    for (i = 0; i < flies.length; i++) drawFly(flies[i], nightK);

    // obstacles (sorted far -> near)
    var oOrder = obstacles.slice().sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < oOrder.length; i++) {
      var o = oOrder[i], s = scaleAt(o.y);
      if (o.kind === 'log') drawLog(laneXat(o.lanes[0], o.y), o.y, s, 1);
      else if (o.kind === 'pile') {
        var cx = (laneXat(o.lanes[0], o.y) + laneXat(o.lanes[1], o.y)) / 2;
        drawPile(cx, o.y, s);
      }
      else if (o.kind === 'branch') drawBranch(laneXat(o.lanes[0], o.y), o.y, s);
      else if (o.kind === 'rock') drawRock(laneXat(o.lanes[0], o.y), o.y, s);
    }

    // player
    drawPlayer();

    // sparkles
    for (i = 0; i < parts.length; i++) {
      var p = parts[i], k = 1 - p.life / p.max;
      ctx.fillStyle = 'rgba(255,243,160,' + (k * 0.95) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, 4 * k + 1, 0, 6.29); ctx.fill();
    }

    // ready prompt
    if (state === 'ready') {
      ctx.fillStyle = 'rgba(10,25,20,0.55)';
      rr(W / 2 - 170, H / 2 - 118, 340, 118, 16); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '800 24px Nunito, sans-serif';
      ctx.fillText('Ready to dash?', W / 2, H / 2 - 76);
      ctx.font = '700 15px Nunito, sans-serif';
      ctx.fillText('Tap, click, or press any arrow key', W / 2, H / 2 - 44);
      ctx.fillText('← → move · ↑ jump · ↓ slide', W / 2, H / 2 - 20);
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
  function startIfReady() {
    if (state === 'ready') { reset(false); }
    else if (state === 'over') { reset(false); }
  }

  window.addEventListener('keydown', function (e) {
    var k = e.key;
    var handled = true;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { startIfReady(); moveLane(-1); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { startIfReady(); moveLane(1); }
    else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') { startIfReady(); doJump(); }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { startIfReady(); doSlide(); }
    else handled = false;
    if (handled) e.preventDefault();
  });

  var tsx = 0, tsy = 0, tst = 0;
  canvas.addEventListener('touchstart', function (e) {
    var t = e.changedTouches[0];
    tsx = t.clientX; tsy = t.clientY; tst = Date.now();
  }, { passive: true });
  canvas.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0];
    var dx = t.clientX - tsx, dy = t.clientY - tsy;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
      if (state === 'playing') doJump(); // tap = jump
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) moveLane(dx > 0 ? 1 : -1);
    else if (dy < 0) { startIfReady(); doJump(); }
    else { startIfReady(); doSlide(); }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('mousedown', function () {
    if (state === 'playing') doJump();
  });

  btnAgain.addEventListener('click', function () { reset(false); });
  btnRestart.addEventListener('click', function () { reset(true); });

  // go
  reset(true);
  requestAnimationFrame(frame);
})();
