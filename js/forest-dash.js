// Forest Dash — Wisely Arcade
// 3-lane endless runner: dodge logs, duck branches, grab fireflies, keep going.
// Pseudo-3D perspective renderer. Original theme and art. Vanilla JS + canvas only.
(function () {
  'use strict';

  var canvas = document.getElementById('dash');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 420, H = 640;
  var LANES = [100, 210, 320];   // logical lane anchors (game logic uses lane index only)
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
  var parts = [];     // sparkles / dust / trails {x,y,vx,vy,life,max,...}
  var trees = [];     // {x, y, s, pine, f}  f = parallax factor
  var clouds = [];    // {x, y, s, v}
  var stars = [];     // {x, y, r, tw}
  // --- cosmetic-only systems (do not affect gameplay) ---
  var leaves = [];    // drifting leaves {x,y,vx,vy,rot,vr,s,col,seed}
  var tufts = [];     // near grass tufts at track edges {side,t,x01,seed,s}
  var texMarks = [];  // scrolling ground texture {t, x01}
  var flashes = [];   // expanding collect rings {x,y,life,max}
  var mtnOff = 0, dashOff = 0, trailT = 0, slidePuffT = 0;
  var prevJumpT = -1, prevLane = 1;
  var LEAF_COLS = ['#e8a13d', '#d97b2e', '#c96f2b', '#a9bd5a', '#b7c454'];

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
  function perspX(xl, y) { return 210 + (xl - 210) * scaleAt(y); }
  function trackHalf(s) { return 64 + (200 - 64) * s; }

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
  function drawShadow(x, y, w, a) {
    ctx.fillStyle = 'rgba(0,0,0,' + a.toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(x, y, w / 2, w / 7, 0, 0, 6.29); ctx.fill();
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
    leaves = []; tufts = []; texMarks = [];
    var i;
    for (i = 0; i < 18; i++) {
      var side = i % 2 === 0 ? -1 : 1;
      var far = (i % 3 === 0);
      trees.push({
        x: side < 0 ? rand(4, 58) : rand(W - 58, W - 4),
        y: far ? rand(VP_Y + 6, VP_Y + 110) : rand(VP_Y + 60, H + 40),
        s: rand(0.7, 1.25) * (far ? 0.62 : 1),
        pine: Math.random() < 0.7,
        f: far ? 0.42 : 0.95
      });
    }
    for (i = 0; i < 4; i++) clouds.push({ x: rand(0, W), y: rand(30, 140), s: rand(0.7, 1.3), v: rand(6, 14) });
    for (i = 0; i < 46; i++) stars.push({ x: rand(0, W), y: rand(0, 300), r: rand(0.8, 2), tw: rand(0, 6.28) });
    for (i = 0; i < 22; i++) leaves.push({
      x: rand(0, W), y: rand(-40, H), vx: rand(-18, 18), vy: rand(14, 34),
      rot: rand(0, 6.28), vr: rand(-2.5, 2.5), s: rand(0.6, 1.2),
      col: LEAF_COLS[ri(0, LEAF_COLS.length - 1)], seed: rand(0, 6.28)
    });
    for (i = 0; i < 14; i++) tufts.push({
      side: i % 2 === 0 ? -1 : 1, t: rand(0, 1), x01: rand(0, 1),
      seed: rand(0, 6.28), s: rand(0.7, 1.3)
    });
    for (i = 0; i < 46; i++) texMarks.push({ t: rand(0, 1), x01: rand(0, 1) });
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
    for (i = 0; i < 12; i++) {
      parts.push({
        x: x, y: y,
        vx: rand(-140, 140), vy: rand(-170, -30),
        life: 0, max: rand(0.35, 0.7)
      });
    }
    flashes.push({ x: x, y: y, life: 0, max: 0.38 });
  }
  function puff(x, y, n) {
    for (var i = 0; i < n; i++) {
      parts.push({
        dust: true, x: x + rand(-14, 14), y: y + rand(-6, 2),
        vx: rand(-46, 46), vy: rand(-72, -18),
        life: 0, max: rand(0.4, 0.85), r0: rand(3, 6.5)
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
    obstacles = []; flies = []; parts = []; flashes = [];
    lane = 1; laneX = LANES[1];
    jumpT = -1; slideT = -1; runPhase = 0;
    dist = 0; score = 0; caught = 0; runTime = 0;
    speed = 260; spawnT = 1.1; newBest = false;
    mtnOff = 0; dashOff = 0; trailT = 0; slidePuffT = 0;
    prevJumpT = -1; prevLane = 1;
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

  // ---------- update (game logic unchanged; cosmetic systems marked) ----------
  function update(dt) {
    dayT += dt;
    var i, o;

    // clouds always drift
    for (i = 0; i < clouds.length; i++) {
      clouds[i].x += clouds[i].v * dt;
      if (clouds[i].x > W + 70) clouds[i].x = -70;
    }
    // cosmetic: leaves drift even on the ready screen
    for (i = 0; i < leaves.length; i++) {
      o = leaves[i];
      if (state === 'playing') {
        o.y += (o.vy + speed * 0.22) * dt;
        o.x += (o.vx + Math.sin(runPhase * 0.8 + o.seed) * 16) * dt;
        if (o.y > H + 24) { o.y = rand(-40, -10); o.x = rand(0, W); }
        if (o.x < -20) o.x = W + 18; else if (o.x > W + 20) o.x = -18;
      }
      o.rot += o.vr * dt * (state === 'playing' ? 1 : 0.3);
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
      trees[i].y += speed * dt * trees[i].f;
      if (trees[i].y > H + 60) {
        var far = trees[i].f < 0.6;
        trees[i].y = far ? VP_Y + rand(0, 60) : VP_Y + rand(0, 40);
        trees[i].x = Math.random() < 0.5 ? rand(4, 58) : rand(W - 58, W - 4);
      }
    }
    // cosmetic: ground texture + tufts scroll with the world
    for (i = 0; i < texMarks.length; i++) {
      texMarks[i].t += speed * dt / 900;
      if (texMarks[i].t > 1.06) { texMarks[i].t -= 1.06; texMarks[i].x01 = rand(0, 1); }
    }
    for (i = 0; i < tufts.length; i++) {
      tufts[i].t += speed * dt / 700;
      if (tufts[i].t > 1.08) { tufts[i].t -= 1.08; tufts[i].x01 = rand(0, 1); }
    }
    mtnOff = (mtnOff + speed * dt * 0.045) % 480;
    dashOff = (dashOff + speed * dt / 1500) % 1;

    for (i = parts.length - 1; i >= 0; i--) {
      o = parts[i];
      o.life += dt;
      if (o.dust) {
        o.x += o.vx * dt; o.y += o.vy * dt;
        o.vy -= 34 * dt; o.vx *= (1 - dt * 2.2);
      } else if (o.trail) {
        o.x += o.vx * dt; o.y += o.vy * dt;
      } else {
        o.x += o.vx * dt; o.y += o.vy * dt; o.vy += 320 * dt;
      }
      if (o.life >= o.max) parts.splice(i, 1);
    }
    for (i = flashes.length - 1; i >= 0; i--) {
      flashes[i].life += dt;
      if (flashes[i].life >= flashes[i].max) flashes.splice(i, 1);
    }

    // cosmetic: landing dust + lane-change dust
    var px = perspX(laneX, PLAYER_Y);
    if (prevJumpT >= 0 && jumpT < 0) puff(px, PLAYER_Y + 2, 9);
    prevJumpT = jumpT;
    if (lane !== prevLane) { puff(px, PLAYER_Y + 4, 5); prevLane = lane; }
    // cosmetic: slide dust trail
    if (slideT >= 0) {
      slidePuffT -= dt;
      if (slidePuffT <= 0) { slidePuffT = 0.07; puff(px - 20, PLAYER_Y - 4, 2); }
    }
    // cosmetic: firefly motion trails (capped)
    trailT -= dt;
    if (trailT <= 0) {
      trailT = 0.1;
      if (parts.length < 200) {
        var n = 0;
        for (var fi = 0; fi < flies.length && n < 3; fi++) {
          var f = flies[fi];
          if (!f.taken && f.y > VP_Y && f.y < H) {
            n++;
            parts.push({
              trail: true, x: laneXat(f.lane, f.y), y: f.y - 30 * scaleAt(f.y),
              vx: rand(-12, 12), vy: rand(8, 30), life: 0, max: rand(0.3, 0.5)
            });
          }
        }
      }
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

  // ---------- drawing: pseudo-3D forest ----------
  function drawSky(sky, nightK) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, sky.top); g.addColorStop(1, sky.bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    if (nightK > 0.15) {
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        ctx.fillStyle = 'rgba(255,255,255,' + (nightK * (0.4 + 0.6 * Math.abs(Math.sin(runPhase * 0.5 + st.tw)))) + ')';
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.29); ctx.fill();
      }
    }

    var sunX = 330, sunY = 90 + nightK * 40;
    if (sky.glow > 0.25) {
      var sg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 60);
      var sunCol = nightK > 0.5 ? '255,214,150' : '255,236,170';
      sg.addColorStop(0, 'rgba(' + sunCol + ',0.95)');
      sg.addColorStop(1, 'rgba(' + sunCol + ',0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(sunX, sunY, 60, 0, 6.29); ctx.fill();
      ctx.fillStyle = nightK > 0.5 ? '#ffd996' : '#fff3b0';
      ctx.beginPath(); ctx.arc(sunX, sunY, 24, 0, 6.29); ctx.fill();
    } else {
      ctx.fillStyle = '#f4f1de';
      ctx.beginPath(); ctx.arc(sunX, sunY, 22, 0, 6.29); ctx.fill();
      ctx.fillStyle = sky.top;
      ctx.beginPath(); ctx.arc(sunX + 9, sunY - 6, 18, 0, 6.29); ctx.fill();
    }

    if (sky.glow > 0.4) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.75 * sky.glow) + ')';
      for (var c = 0; c < clouds.length; c++) {
        var cl = clouds[c], cs = cl.s;
        ctx.beginPath(); ctx.arc(cl.x, cl.y, 18 * cs, 0, 6.29); ctx.fill();
        ctx.beginPath(); ctx.arc(cl.x + 20 * cs, cl.y + 4 * cs, 14 * cs, 0, 6.29); ctx.fill();
        ctx.beginPath(); ctx.arc(cl.x - 20 * cs, cl.y + 5 * cs, 12 * cs, 0, 6.29); ctx.fill();
        ctx.beginPath(); ctx.arc(cl.x + 6 * cs, cl.y - 8 * cs, 12 * cs, 0, 6.29); ctx.fill();
      }
    }
  }

  // parallax mountain ridges; off = scroll offset, step = peak spacing
  function drawRidge(baseY, amp, step, off, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-step, baseY + 40);
    ctx.lineTo(-step, baseY);
    var x;
    for (x = -step; x <= W + step; x += step) {
      var px = x - (off % step);
      var hgt = amp * (0.55 + 0.45 * Math.abs(Math.sin(x * 1.93 + step)));
      ctx.lineTo(px + step / 2, baseY - hgt);
      ctx.lineTo(px + step, baseY - amp * 0.25 * Math.abs(Math.sin(x * 3.1)));
    }
    ctx.lineTo(W + step, baseY + 40);
    ctx.closePath(); ctx.fill();
  }

  function drawTreeline(sky) {
    ctx.fillStyle = sky.tree;
    ctx.beginPath();
    ctx.moveTo(0, VP_Y + 2);
    for (var i = 0; i <= 21; i++) {
      var hx = i * 20;
      var hh = 14 + 10 * Math.abs(Math.sin(i * 2.7));
      ctx.lineTo(hx, VP_Y - hh);
      ctx.lineTo(hx + 10, VP_Y + 2);
    }
    ctx.lineTo(W, VP_Y + 2); ctx.lineTo(W, VP_Y + 8); ctx.lineTo(0, VP_Y + 8);
    ctx.closePath(); ctx.fill();
  }

  function drawGround(sky) {
    // grass with depth gradient (hazy far, rich near)
    var gg = ctx.createLinearGradient(0, VP_Y, 0, H);
    gg.addColorStop(0, mix(sky.grass, sky.bot, 0.45));
    gg.addColorStop(0.45, sky.grass);
    gg.addColorStop(1, mix(sky.grass, '#1c3a24', 0.25));
    ctx.fillStyle = gg;
    ctx.fillRect(0, VP_Y, W, H - VP_Y);

    // dirt track trapezoid with depth gradient
    var tg = ctx.createLinearGradient(0, VP_Y, 0, H);
    tg.addColorStop(0, mix(sky.track, sky.bot, 0.4));
    tg.addColorStop(1, sky.track);
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(210 - 64, VP_Y); ctx.lineTo(210 + 64, VP_Y);
    ctx.lineTo(210 + 200, H); ctx.lineTo(210 - 200, H);
    ctx.closePath(); ctx.fill();

    // glowing track edges converging to the vanishing point
    ctx.strokeStyle = 'rgba(255,255,255,0.38)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(210 - 64, VP_Y); ctx.lineTo(210 - 200, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(210 + 64, VP_Y); ctx.lineTo(210 + 200, H); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(210 - 70, VP_Y); ctx.lineTo(210 - 208, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(210 + 70, VP_Y); ctx.lineTo(210 + 208, H); ctx.stroke();

    // scrolling ground texture: pebbles on track, grass blades off track
    var i, m, y, s, hw, x;
    for (i = 0; i < texMarks.length; i++) {
      m = texMarks[i];
      y = VP_Y + m.t * (H - VP_Y);
      s = scaleAt(y);
      hw = trackHalf(s);
      x = 210 + (m.x01 - 0.5) * 2 * hw * 1.45;
      if (Math.abs(x - 210) < hw) {
        ctx.fillStyle = 'rgba(60,40,25,' + (0.10 + 0.10 * s) + ')';
        ctx.beginPath(); ctx.ellipse(x, y, (2 + 5 * s), (1.5 + 3 * s), 0, 0, 6.29); ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(30,70,40,' + (0.25 + 0.3 * s) + ')';
        ctx.lineWidth = 1 + 2 * s;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x - 3 * s, y - 7 * s);
        ctx.moveTo(x + 3 * s, y); ctx.lineTo(x + 5 * s, y - 6 * s);
        ctx.stroke();
      }
    }

    // scrolling lane-divider dashes
    for (var d = 0; d < 2; d++) {
      var div = (LANES[d] + LANES[d + 1]) / 2;
      for (var k = 0; k < 10; k++) {
        var t0 = (k / 10 + dashOff) % 1;
        var t1 = Math.min(1, t0 + 0.035);
        var y0 = VP_Y + t0 * (H - VP_Y), y1 = VP_Y + t1 * (H - VP_Y);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.18 + 0.35 * t0) + ')';
        ctx.lineWidth = 2 + 5 * t0;
        ctx.beginPath();
        ctx.moveTo(perspX(div, y0), y0);
        ctx.lineTo(perspX(div, y1), y1);
        ctx.stroke();
      }
    }
  }

  function drawTuft(tf, sky) {
    var y = VP_Y + tf.t * (H - VP_Y);
    var s = scaleAt(y) * tf.s;
    var hw = trackHalf(scaleAt(y));
    var x = 210 + tf.side * (hw + 26 * s);
    var sway = Math.sin(runPhase * 0.6 + tf.seed) * 4 * s;
    ctx.strokeStyle = mix(sky.tree, '#0e2a16', 0.35);
    ctx.lineWidth = 2.5 * s; ctx.lineCap = 'round';
    for (var b = -2; b <= 2; b++) {
      ctx.beginPath();
      ctx.moveTo(x + b * 5 * s, y);
      ctx.quadraticCurveTo(x + b * 6 * s + sway, y - 12 * s, x + b * 7 * s + sway * 1.6, y - (16 + Math.abs(b)) * s);
      ctx.stroke();
    }
  }

  function drawTree(t, sky) {
    var s = scaleAt(t.y) * t.s;
    if (s < 0.05) return;
    var x = t.x, y = t.y;
    var sway = Math.sin(runPhase * 0.7 + t.x) * 2 * s;
    // trunk with highlight
    ctx.fillStyle = '#5d3d24';
    ctx.fillRect(x - 4 * s, y - 18 * s, 8 * s, 18 * s);
    ctx.fillStyle = 'rgba(255,220,170,0.25)';
    ctx.fillRect(x - 4 * s, y - 18 * s, 2.5 * s, 18 * s);
    if (t.pine) {
      for (var k = 0; k < 3; k++) {
        var w = (36 - k * 9) * s;
        var ty = y - 14 * s - k * 20 * s;
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.moveTo(x - w / 2 - 3 * s, ty + 2 * s);
        ctx.lineTo(x + w / 2 - 3 * s, ty + 2 * s);
        ctx.lineTo(x - 3 * s, ty - 26 * s);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = k === 0 ? mix(sky.tree, '#0e2a16', 0.25) : sky.tree;
        ctx.beginPath();
        ctx.moveTo(x - w / 2 + sway * (k + 1) * 0.3, ty);
        ctx.lineTo(x + w / 2 + sway * (k + 1) * 0.3, ty);
        ctx.lineTo(x + sway * (k + 1) * 0.3, ty - 26 * s);
        ctx.closePath(); ctx.fill();
        // sunlit edge
        ctx.fillStyle = 'rgba(255,255,200,0.14)';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.12, ty - 2 * s);
        ctx.lineTo(x + w / 2, ty - 2 * s);
        ctx.lineTo(x + w * 0.12, ty - 20 * s);
        ctx.closePath(); ctx.fill();
      }
    } else {
      var blobs = [[0, -36, 20], [-15, -25, 13], [15, -25, 13], [0, -48, 12]];
      for (var bi = 0; bi < blobs.length; bi++) {
        var bx = x + blobs[bi][0] * s + sway, by = y + blobs[bi][1] * s, br = blobs[bi][2] * s;
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.arc(bx - 3 * s, by + 3 * s, br, 0, 6.29); ctx.fill();
        ctx.fillStyle = bi === 3 ? mix(sky.tree, '#e8f5c0', 0.18) : sky.tree;
        ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.29); ctx.fill();
      }
    }
  }

  function drawFly(f, nightK) {
    if (f.taken) return;
    var s = scaleAt(f.y);
    var x = laneXat(f.lane, f.y) + Math.sin(runPhase * 0.7 + f.seed) * 8 * s;
    var y = f.y - 30 * s + Math.cos(runPhase * 0.9 + f.seed) * 6 * s;
    var r = 7 * s;
    // motion trail dots
    for (var j = 3; j >= 1; j--) {
      ctx.fillStyle = 'rgba(255,244,160,' + (0.10 * j * nightK + 0.05) + ')';
      ctx.beginPath();
      ctx.arc(x - j * 7 * s, y + j * 5 * s, r * 0.5, 0, 6.29); ctx.fill();
    }
    var glowA = 0.35 + 0.55 * nightK;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, 'rgba(255,246,170,' + (0.85 * glowA + 0.15) + ')');
    g.addColorStop(1, 'rgba(255,246,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 4, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#fff3a0';
    ctx.beginPath(); ctx.arc(x, y, r * (0.8 + 0.2 * Math.sin(runPhase * 3 + f.seed)), 0, 6.29); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.3, 0, 6.29); ctx.fill();
  }

  function drawLog(x, y, s, lanesWide) {
    var w = 104 * s * lanesWide, h = 26 * s;
    drawShadow(x, y + 5 * s, w * 1.02, 0.20);
    // body
    var bg = ctx.createLinearGradient(0, y - h, 0, y);
    bg.addColorStop(0, '#b98a5a'); bg.addColorStop(0.55, '#8a5a33'); bg.addColorStop(1, '#5f3c20');
    ctx.fillStyle = bg;
    rr(x - w / 2, y - h, w, h, 10 * s); ctx.fill();
    // bark grooves
    ctx.strokeStyle = 'rgba(60,35,18,0.5)'; ctx.lineWidth = 2 * s;
    for (var bx = -w / 2 + 14 * s; bx < w / 2 - 8 * s; bx += 22 * s) {
      ctx.beginPath(); ctx.moveTo(bx, y - h + 3 * s); ctx.lineTo(bx + 4 * s, y - 3 * s); ctx.stroke();
    }
    // moss patch
    ctx.fillStyle = 'rgba(90,160,80,0.55)';
    ctx.beginPath(); ctx.ellipse(x + w * 0.18, y - h + 4 * s, 16 * s, 5 * s, 0, 0, 6.29); ctx.fill();
    // end rings
    var er = 8.5 * s;
    ctx.fillStyle = '#d9b98c';
    ctx.beginPath(); ctx.arc(x - w / 2 + 7 * s, y - h / 2, er, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w / 2 - 7 * s, y - h / 2, er, 0, 6.29); ctx.fill();
    ctx.strokeStyle = '#8a5a33'; ctx.lineWidth = 1.6 * s;
    ctx.beginPath(); ctx.arc(x - w / 2 + 7 * s, y - h / 2, er * 0.62, 0, 6.29); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + w / 2 - 7 * s, y - h / 2, er * 0.62, 0, 6.29); ctx.stroke();
    ctx.fillStyle = '#6b4423';
    ctx.beginPath(); ctx.arc(x - w / 2 + 7 * s, y - h / 2, 2.6 * s, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w / 2 - 7 * s, y - h / 2, 2.6 * s, 0, 6.29); ctx.fill();
  }

  function drawBranch(x, y, s) {
    var w = 104 * s, barY = y - 68 * s;
    drawShadow(x, y + 5 * s, w * 0.9, 0.13);
    // hanging vines at the ends (outside the slide path)
    ctx.strokeStyle = '#3f7a3f'; ctx.lineWidth = 3 * s;
    var vx;
    for (vx = -1; vx <= 1; vx += 2) {
      var vxx = x + vx * (w / 2 - 4 * s);
      ctx.beginPath(); ctx.moveTo(vxx, barY);
      ctx.quadraticCurveTo(vxx + vx * 6 * s, barY + 26 * s, vxx + vx * 2 * s, barY + 44 * s);
      ctx.stroke();
      ctx.fillStyle = '#4d9e57';
      ctx.beginPath(); ctx.arc(vxx + vx * 2 * s, barY + 46 * s, 5 * s, 0, 6.29); ctx.fill();
    }
    // branch bar with depth
    var bg = ctx.createLinearGradient(0, barY - 8 * s, 0, barY + 8 * s);
    bg.addColorStop(0, '#96683c'); bg.addColorStop(1, '#5f3c20');
    ctx.fillStyle = bg;
    rr(x - w / 2, barY - 8 * s, w, 16 * s, 8 * s); ctx.fill();
    // leaf canopy
    var lx = [-38, -18, 2, 22, 40];
    for (var i = 0; i < lx.length; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.arc(x + (lx[i] - 3) * s, barY - 14 * s, 13 * s, 0, 6.29); ctx.fill();
      ctx.fillStyle = i % 2 ? '#4d9e57' : '#5fae67';
      ctx.beginPath(); ctx.arc(x + lx[i] * s, barY - 17 * s, 13 * s, 0, 6.29); ctx.fill();
    }
    ctx.fillStyle = '#8fd49a';
    ctx.beginPath(); ctx.arc(x - 10 * s, barY - 24 * s, 7 * s, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 26 * s, barY - 22 * s, 6 * s, 0, 6.29); ctx.fill();
    // dangling leaf hint so players read "duck under"
    ctx.fillStyle = '#4d9e57';
    ctx.beginPath(); ctx.arc(x + 8 * s, barY + 16 * s, 6 * s, 0, 6.29); ctx.fill();
  }

  function drawRock(x, y, s) {
    var w = 78 * s, h = 136 * s;
    drawShadow(x, y + 5 * s, w * 1.15, 0.22);
    var bg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    bg.addColorStop(0, '#6f6f7a'); bg.addColorStop(0.45, '#a5a5b1'); bg.addColorStop(1, '#7c7c88');
    ctx.fillStyle = bg;
    rr(x - w / 2, y - h, w, h, 20 * s); ctx.fill();
    // sunlit facet
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    rr(x - w / 2 + 8 * s, y - h + 8 * s, w * 0.34, h * 0.55, 12 * s); ctx.fill();
    // cracks
    ctx.strokeStyle = 'rgba(70,70,80,0.7)'; ctx.lineWidth = 2.6 * s;
    ctx.beginPath(); ctx.moveTo(x - w * 0.18, y - h * 0.78); ctx.lineTo(x + w * 0.12, y - h * 0.52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w * 0.28, y - h * 0.92); ctx.lineTo(x + w * 0.06, y - h * 0.60); ctx.stroke();
    // mossy cap
    ctx.fillStyle = 'rgba(95,165,85,0.7)';
    ctx.beginPath(); ctx.ellipse(x, y - h + 2 * s, w * 0.42, 9 * s, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#7c7c88';
    ctx.beginPath(); ctx.arc(x - w * 0.3, y - h - 4 * s, 15 * s, 0, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(x - w * 0.34, y - h - 8 * s, 6 * s, 0, 6.29); ctx.fill();
  }

  function drawPile(cx, y, s) {
    drawLog(cx, y, s, 2);
    // second log stacked on top, slightly offset
    var w = 132 * s, h = 24 * s, y2 = y - 26 * s;
    drawShadow(cx + 6 * s, y2 + 4 * s, w, 0.12);
    var bg = ctx.createLinearGradient(0, y2 - h, 0, y2);
    bg.addColorStop(0, '#b98a5a'); bg.addColorStop(1, '#6b4423');
    ctx.fillStyle = bg;
    rr(cx - w / 2 + 6 * s, y2 - h, w, h, 10 * s); ctx.fill();
    ctx.fillStyle = '#d9b98c';
    ctx.beginPath(); ctx.arc(cx - w / 2 + 13 * s, y2 - h / 2, 8 * s, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#6b4423';
    ctx.beginPath(); ctx.arc(cx - w / 2 + 13 * s, y2 - h / 2, 3 * s, 0, 6.29); ctx.fill();
  }

  function drawPlayer() {
    var s = scaleAt(PLAYER_Y);
    var px = perspX(laneX, PLAYER_Y);
    var jh = jumpH();
    var y = PLAYER_Y - jh;
    // shadow shrinks + fades with height
    var shS = 1 - (jh / JUMP_H) * 0.55;
    drawShadow(px, PLAYER_Y + 7 * s, 52 * s * shS, 0.06 + 0.20 * shS);

    var lean = clamp((LANES[lane] - laneX) / 70, -1, 1);
    ctx.save();
    ctx.translate(px, y);
    ctx.rotate(lean * 0.16);
    ctx.scale(s, s); // unit space: feet at (0,0), up is -y
    ctx.lineCap = 'round';

    if (slideT >= 0) {
      // low power-slide: horizontal body, motion streaks, dust handled in update
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3;
      for (var sl = 0; sl < 3; sl++) {
        var sy = -8 - sl * 9;
        ctx.beginPath(); ctx.moveTo(-34, sy); ctx.lineTo(-58 - sl * 6, sy); ctx.stroke();
      }
      ctx.fillStyle = '#14b8a6';           // torso, leaned back low
      rr(-28, -30, 44, 20, 9); ctx.fill();
      ctx.fillStyle = '#0d9488';
      rr(-28, -18, 44, 8, 4); ctx.fill();
      ctx.fillStyle = '#f59e0b';           // backpack dragging behind
      rr(-36, -26, 10, 16, 4); ctx.fill();
      ctx.strokeStyle = '#3b4a5a'; ctx.lineWidth = 9;  // legs stretched forward
      ctx.beginPath(); ctx.moveTo(12, -16); ctx.lineTo(34, -10); ctx.stroke();
      ctx.strokeStyle = '#f6c793'; ctx.lineWidth = 7;  // arm sweeping back
      ctx.beginPath(); ctx.moveTo(-6, -24); ctx.lineTo(-24, -14); ctx.stroke();
      ctx.fillStyle = '#f6c793';           // head low and forward
      ctx.beginPath(); ctx.arc(22, -26, 11, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#5b3a29';
      ctx.beginPath(); ctx.arc(22, -29, 11, 3.35, 6.05); ctx.fill();
      ctx.fillStyle = '#14b8a6';           // sporty headband
      ctx.fillRect(11, -30, 22, 4);
      ctx.restore();
      return;
    }

    var running = (state === 'playing');
    var p = runPhase;
    var sw = Math.sin(p) * (running ? 1 : 0.12);
    var bob = running ? Math.abs(Math.sin(p)) * -3 : 0;
    ctx.translate(0, bob);

    if (jumpT >= 0) {
      // tucked jump: knees up, arms thrown up
      ctx.strokeStyle = '#3b4a5a'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(-10, -16); ctx.lineTo(6, -12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(10, -18); ctx.lineTo(-4, -10); ctx.stroke();
      ctx.fillStyle = '#14b8a6';
      rr(-13, -64, 26, 34, 9); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      rr(-13, -64, 10, 34, 6); ctx.fill();
      ctx.fillStyle = '#f59e0b';
      rr(-21, -58, 9, 20, 4); ctx.fill();
      ctx.strokeStyle = '#f6c793'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(-17, -72); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(17, -72); ctx.stroke();
    } else {
      // run cycle: alternating two-segment legs, pumping arms
      for (var leg = 0; leg < 2; leg++) {
        var ph = p + leg * Math.PI;
        var fwd = Math.sin(ph);
        var lift = Math.max(0, Math.cos(ph));
        var fx = fwd * 17, fy = -2 - lift * 13;
        var kx = fwd * 8 + 5, ky = -17 - lift * 4;
        ctx.strokeStyle = '#3b4a5a'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.fillStyle = '#22303c';           // shoe
        ctx.beginPath(); ctx.arc(fx + 3, fy, 5.5, 0, 6.29); ctx.fill();
      }
      ctx.fillStyle = '#14b8a6';             // torso
      rr(-13, -64, 26, 34, 9); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      rr(-13, -64, 10, 34, 6); ctx.fill();
      ctx.fillStyle = '#f59e0b';             // backpack
      rr(-21, -58, 9, 20, 4); ctx.fill();
      ctx.fillStyle = '#d97706';
      rr(-21, -50, 9, 4, 2); ctx.fill();
      ctx.strokeStyle = '#f6c793'; ctx.lineWidth = 7;  // arms pump opposite to legs
      ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(-sw * 13 - 4, -36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(sw * 13 + 4, -36); ctx.stroke();
    }
    // head (shared)
    ctx.fillStyle = '#f6c793';
    ctx.beginPath(); ctx.arc(2, -76, 13, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#5b3a29';
    ctx.beginPath(); ctx.arc(2, -79, 13, 3.35, 6.05); ctx.fill();
    ctx.fillStyle = '#14b8a6';
    ctx.fillRect(-11, -80, 26, 4.5);
    ctx.fillStyle = '#22303c';
    ctx.beginPath(); ctx.arc(8, -75, 2.2, 0, 6.29); ctx.fill();
    ctx.strokeStyle = '#22303c'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(8, -70, 3.5, 0.3, 2.8); ctx.stroke();
    ctx.restore();
  }

  function drawLeaves() {
    for (var i = 0; i < leaves.length; i++) {
      var l = leaves[i];
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = l.col;
      ctx.beginPath(); ctx.ellipse(0, 0, 7 * l.s, 4 * l.s, 0, 0, 6.29); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  function drawParts() {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], k = 1 - p.life / p.max;
      if (p.dust) {
        ctx.fillStyle = 'rgba(214,203,182,' + (0.5 * k) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r0 * (0.6 + 1.4 * (1 - k)), 0, 6.29); ctx.fill();
      } else if (p.trail) {
        ctx.fillStyle = 'rgba(255,243,160,' + (0.65 * k) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, 6.29); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255,243,160,' + (k * 0.95) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, 4 * k + 1, 0, 6.29); ctx.fill();
      }
    }
    for (var fi = 0; fi < flashes.length; fi++) {
      var f = flashes[fi], fk = 1 - f.life / f.max;
      ctx.strokeStyle = 'rgba(255,250,200,' + (0.8 * fk) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x, f.y, 8 + 30 * (1 - fk), 0, 6.29); ctx.stroke();
    }
  }

  function drawLighting(nightK, t) {
    var day = ((t % DAY_LEN) + DAY_LEN) % DAY_LEN;
    var dSun = Math.min(Math.abs(day - 55), DAY_LEN - Math.abs(day - 55));
    var warm = Math.max(0, 1 - dSun / 30);
    if (warm > 0.02) {
      ctx.fillStyle = 'rgba(255,110,45,' + (0.10 * warm).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (nightK > 0.02) {
      ctx.fillStyle = 'rgba(8,16,58,' + (0.20 * nightK).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    var vg = ctx.createRadialGradient(W / 2, H * 0.55, 190, W / 2, H * 0.55, 470);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.20)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function draw() {
    var sky = skyAt(dayT);
    var nightK = 1 - sky.glow;
    var i;

    drawSky(sky, nightK);

    // parallax mountains behind the treeline
    drawRidge(VP_Y + 2, 74, 170, mtnOff * 0.5, mix(sky.top, '#ffffff', 0.30));
    drawRidge(VP_Y + 4, 48, 115, mtnOff, mix(sky.tree, sky.top, 0.38));
    drawTreeline(sky);

    drawGround(sky);

    // near grass tufts at the track edges
    for (i = 0; i < tufts.length; i++) drawTuft(tufts[i], sky);

    // trees (sorted far -> near)
    var order = trees.slice().sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < order.length; i++) drawTree(order[i], sky);

    drawLeaves();

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

    drawPlayer();
    drawParts();
    drawLighting(nightK, dayT);

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
