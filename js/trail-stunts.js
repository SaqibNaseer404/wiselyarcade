// Trail Stunts — Wisely Arcade
// Original physics bike-stunt game (own name, own art, own code).
// Side-view stunt bike on procedural rolling-hill terrain. 3 trails.
(function () {
  'use strict';

  var canvas = document.getElementById('trail');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 720, H = 480;

  var elLevel = document.getElementById('ts-level');
  var elTime = document.getElementById('ts-time');
  var elBest = document.getElementById('ts-best');
  var overlay = document.getElementById('ts-over');
  var overTitle = document.getElementById('ts-over-title');
  var overStats = document.getElementById('ts-over-stats');
  var btnAgain = document.getElementById('ts-again');
  var btnNext = document.getElementById('ts-next');
  var btnRestart = document.getElementById('ts-restart');

  // ---------- Trails (sine-based heightmap) ----------
  var BASE_Y = 380;
  var LEVELS = [
    { n: 1, len: 2600, a1: 42,  f1: 0.0042, a2: 18, f2: 0.0115, flat: 280, maxSpeed: 330 },
    { n: 2, len: 3400, a1: 72,  f1: 0.0052, a2: 30, f2: 0.0135, flat: 240, maxSpeed: 360 },
    { n: 3, len: 4300, a1: 102, f1: 0.0062, a2: 46, f2: 0.0155, flat: 210, maxSpeed: 390 }
  ];
  var PHASE = 1.7;

  function terrainY(x, L) {
    if (x <= 0) x = 0;
    if (x < L.flat) return BASE_Y;
    var t = Math.min(1, (x - L.flat) / 220);
    var s = t * t * (3 - 2 * t); // smoothstep blend from the flat start
    var ph = L.n * 2.13;
    return BASE_Y - s * (L.a1 * Math.sin(x * L.f1 + ph) + L.a2 * Math.sin(x * L.f2 + PHASE + ph));
  }
  function terrainSlope(x, L) {
    return (terrainY(x + 6, L) - terrainY(x - 6, L)) / 12;
  }

  // ---------- State ----------
  var cur = 1;               // current trail (1..3), session-unlocked in order
  var state = 'play';        // 'play' | 'crashed' | 'finished'
  var L = LEVELS[0];
  var bike, startT, elapsed, popups, hintT;
  var crashReason = '';

  function bestKey(n) { return 'wisely_trail_stunts_best_' + n; }
  function getBest(n) {
    try {
      var v = parseFloat(localStorage.getItem(bestKey(n)));
      return isFinite(v) && v > 0 ? v : null;
    } catch (e) { return null; }
  }
  function setBest(n, v) {
    try { localStorage.setItem(bestKey(n), String(v)); } catch (e) {}
  }
  function fmtTime(s) {
    var m = Math.floor(s / 60), sec = s - m * 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec.toFixed(1);
  }

  function resetBike() {
    bike = {
      x: 70, y: terrainY(70, L) - 30, vx: 0, vy: 0,
      ang: 0, angV: 0,
      onGround: true, airTime: 0, rot: 0,
      bonus: 0
    };
  }

  function startLevel(n) {
    cur = n;
    L = LEVELS[n - 1];
    resetBike();
    state = 'play';
    elapsed = 0;
    startT = performance.now();
    popups = [];
    hintT = 3.5;
    crashReason = '';
    overlay.classList.add('hidden');
    btnNext.classList.add('hidden');
    elLevel.textContent = n + ' / 3';
    refreshBest();
    elTime.textContent = '0:00.0';
  }

  function refreshBest() {
    var b = getBest(cur);
    elBest.textContent = b === null ? '—' : fmtTime(b);
  }

  // ---------- Input ----------
  var keys = {};
  var touch = { gas: 0, brake: 0, leanB: 0, leanF: 0 }; // counts of active touches per zone
  var GAME_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '];

  window.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (GAME_KEYS.indexOf(k) !== -1) e.preventDefault();
    keys[k] = true;
    if (k === 'r') startLevel(cur);
  });
  window.addEventListener('keyup', function (e) {
    keys[e.key.toLowerCase()] = false;
  });

  // Touch zones (canvas coords): brake | lean-back || lean-fwd | gas
  var ZONES = [
    { id: 'brake', x: 8,   w: 120, label: '◀ BRAKE' },
    { id: 'leanB', x: 136, w: 120, label: '⟲ LEAN' },
    { id: 'leanF', x: 464, w: 120, label: 'LEAN ⟳' },
    { id: 'gas',   x: 592, w: 120, label: 'GAS ▶' }
  ];
  var ZONE_Y = H - 64, ZONE_H = 56;
  var activeTouches = {}; // pointerId -> zone id

  function zoneAt(cx, cy) {
    if (cy < ZONE_Y || cy > ZONE_Y + ZONE_H) return null;
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      if (cx >= z.x && cx <= z.x + z.w) return z.id;
    }
    return null;
  }
  function canvasPos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    var p = canvasPos(e);
    var z = zoneAt(p.x, p.y);
    if (z) {
      activeTouches[e.pointerId] = z;
      touch[z] = (touch[z] || 0) + 1;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
  });
  function releasePointer(e) {
    var z = activeTouches[e.pointerId];
    if (z) {
      touch[z] = Math.max(0, (touch[z] || 1) - 1);
      delete activeTouches[e.pointerId];
    }
  }
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);

  function input() {
    return {
      gas: !!(keys['arrowup'] || keys['w'] || touch.gas),
      brake: !!(keys['arrowdown'] || keys['s'] || keys['brake']),
      leanB: !!(keys['arrowleft'] || keys['a'] || touch.leanB),
      leanF: !!(keys['arrowright'] || keys['d'] || touch.leanF)
    };
  }

  // ---------- Helpers ----------
  function rot(px, py, ang) {
    var c = Math.cos(ang), s = Math.sin(ang);
    return { x: c * px - s * py, y: s * px + c * py };
  }
  function normAng(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  function popup(text, x, y, color) {
    popups.push({ text: text, x: x, y: y, ttl: 1.6, color: color || '#FFD23F' });
  }

  function doCrash(reason) {
    if (state !== 'play') return;
    state = 'crashed';
    crashReason = reason;
    overTitle.textContent = 'Wipeout!';
    overStats.textContent = reason + '  ·  Trail ' + cur + ' of 3  ·  Time ' + fmtTime(elapsed);
    btnAgain.textContent = 'Ride again';
    btnNext.classList.add('hidden');
    overlay.classList.remove('hidden');
  }

  function doFinish() {
    if (state !== 'play') return;
    state = 'finished';
    var prev = getBest(cur);
    var isBest = prev === null || elapsed < prev;
    if (isBest) setBest(cur, elapsed);
    refreshBest();
    if (cur < 3) {
      overTitle.textContent = 'Trail ' + cur + ' complete!';
      btnNext.classList.remove('hidden');
      btnAgain.textContent = 'Ride again';
    } else {
      overTitle.textContent = 'You conquered all 3 trails!';
      btnNext.classList.add('hidden');
      btnAgain.textContent = 'Ride trail 3 again';
    }
    var stats = 'Time ' + fmtTime(elapsed) + '  ·  Best ' + fmtTime(getBest(cur));
    if (isBest) stats += '  ·  New best!';
    if (bike.bonus > 0) stats += '  ·  Flip bonus +' + bike.bonus;
    overStats.textContent = stats;
    overlay.classList.remove('hidden');
  }

  // ---------- Physics ----------
  var GRAV = 980, WR = 13; // wheel radius

  function wheelPos(ox, oy) {
    var r = rot(ox, oy, bike.ang);
    return { x: bike.x + r.x, y: bike.y + r.y };
  }

  function step(dt, inp) {
    var wasGround = bike.onGround;
    var preVy = bike.vy;

    // Gravity
    bike.vy += GRAV * dt;
    if (bike.vy > 1500) bike.vy = 1500;

    // Integrate
    bike.x += bike.vx * dt;
    bike.y += bike.vy * dt;
    bike.ang += bike.angV * dt;

    if (bike.x < 30) { bike.x = 30; if (bike.vx < 0) bike.vx = 0; }

    // Wheel contacts
    var wheels = [wheelPos(-20, 12), wheelPos(20, 12)];
    var contacts = 0;
    var avgSlope = 0;
    for (var i = 0; i < wheels.length; i++) {
      var w = wheels[i];
      var ground = terrainY(w.x, L);
      var pen = (w.y + WR) - ground; // >0 means wheel is in the ground
      if (pen > 0) {
        contacts++;
        var slope = terrainSlope(w.x, L);
        avgSlope += slope;
        var nl = Math.hypot(slope, 1);
        var nx = -slope / nl, ny = -1 / nl; // surface normal (points up)
        // positional correction
        bike.x += nx * pen * 0.55;
        bike.y += ny * pen * 0.55;
        // kill velocity into the ground (normal points up, so into-ground is vn < 0)
        var vn = bike.vx * nx + bike.vy * ny;
        if (vn < 0) { bike.vx -= nx * vn; bike.vy -= ny * vn; }
      }
    }
    bike.onGround = contacts > 0;

    if (bike.onGround) {
      avgSlope /= contacts;
      var tl = Math.hypot(1, avgSlope);
      var tx = 1 / tl, ty = avgSlope / tl; // tangent along the ground

      if (inp.gas) {
        var vt = bike.vx * tx + bike.vy * ty;
        if (vt < L.maxSpeed) {
          var push = 760 * dt;
          bike.vx += tx * push;
          bike.vy += ty * push;
        }
      }
      if (inp.brake) {
        bike.vx *= Math.max(0, 1 - 4.5 * dt);
        bike.vy *= Math.max(0, 1 - 1.5 * dt);
        // gentle reverse when nearly stopped
        var vt2 = bike.vx * tx + bike.vy * ty;
        if (vt2 > -60) { bike.vx -= tx * 220 * dt; bike.vy -= ty * 220 * dt; }
      }
      // rolling resistance
      bike.vx *= Math.max(0, 1 - 0.25 * dt);

      // align bike with the slope
      var target = Math.atan(avgSlope);
      bike.ang += normAng(target - bike.ang) * Math.min(1, 9 * dt);
      bike.angV *= Math.max(0, 1 - 6 * dt);

      // tilt keys give a little rotational nudge on the ground too
      if (inp.leanB) bike.angV -= 1.6 * dt;
      if (inp.leanF) bike.angV += 1.6 * dt;

      // landing evaluation
      if (!wasGround) {
        var diff = Math.abs(normAng(bike.ang - target));
        if (diff > 1.25) {
          doCrash('Landed sideways — level the bike before touchdown.');
        } else if (preVy > 640) {
          doCrash('Too hard a landing — ease off before the drop.');
        } else if (Math.abs(bike.rot) > 5.2) {
          var flips = Math.round(Math.abs(bike.rot) / (Math.PI * 2));
          var pts = flips * 250;
          bike.bonus += pts;
          popup('+' + pts + (bike.rot < 0 ? ' BACKFLIP!' : ' FRONTFLIP!'), bike.x, bike.y - 60);
        }
        bike.rot = 0;
        bike.airTime = 0;
      }
    } else {
      // airborne: tilt controls rotate the bike
      if (inp.leanB) bike.angV -= 3.6 * dt;
      if (inp.leanF) bike.angV += 3.6 * dt;
      bike.angV *= Math.max(0, 1 - 0.5 * dt);
      bike.airTime += dt;
      bike.rot += bike.angV * dt;
      // slight air drag
      bike.vx *= Math.max(0, 1 - 0.05 * dt);
    }

    // head-hit crash (family-safe: comical wipeout, no gore)
    var hr = rot(6, -30, bike.ang);
    var hx = bike.x + hr.x, hy = bike.y + hr.y;
    if (hy > terrainY(hx, L) + 4) {
      doCrash('Helmet met the dirt — keep the rider upright!');
      return;
    }
    // buried failsafe
    if (bike.y - 40 > terrainY(bike.x, L)) {
      doCrash('Buried! The trail wins this round.');
      return;
    }
    // fell off the world
    if (bike.y > 900) { doCrash('Off the trail!'); return; }

    // finish
    if (bike.x >= L.len) doFinish();
  }

  // ---------- Render ----------
  var clouds = [];
  for (var ci = 0; ci < 7; ci++) {
    clouds.push({ x: Math.random() * 3000, y: 40 + Math.random() * 120, s: 0.6 + Math.random() * 0.9 });
  }

  function draw(cam) {
    // sky
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#7EC8F2');
    sky.addColorStop(1, '#E8F9FF');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // sun
    ctx.fillStyle = '#FFE66D';
    ctx.beginPath();
    ctx.arc(W - 90, 70, 34, 0, Math.PI * 2);
    ctx.fill();

    // clouds (parallax)
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      var cx = ((cl.x - cam * 0.25) % (W + 400) + W + 400) % (W + 400) - 200;
      var cy = cl.y, cs = cl.s;
      ctx.beginPath();
      ctx.arc(cx, cy, 22 * cs, 0, Math.PI * 2);
      ctx.arc(cx + 22 * cs, cy + 4 * cs, 16 * cs, 0, Math.PI * 2);
      ctx.arc(cx - 22 * cs, cy + 5 * cs, 15 * cs, 0, Math.PI * 2);
      ctx.fill();
    }

    // far hills (parallax)
    ctx.fillStyle = '#B5E3B8';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var hx = 0; hx <= W; hx += 12) {
      var wx = hx + cam * 0.45;
      ctx.lineTo(hx, 330 - 40 * Math.sin(wx * 0.004 + 2) - 18 * Math.sin(wx * 0.011));
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // terrain
    var x0 = Math.max(0, cam - 40), x1 = cam + W + 40;
    ctx.fillStyle = '#8B5A2B';
    ctx.beginPath();
    ctx.moveTo(x0 - cam, H);
    for (var gx = x0; gx <= x1; gx += 8) ctx.lineTo(gx - cam, terrainY(gx, L));
    ctx.lineTo(x1 - cam, H);
    ctx.closePath();
    ctx.fill();
    // grass lip
    ctx.strokeStyle = '#3FA34D';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var gx2 = x0; gx2 <= x1; gx2 += 8) {
      var px = gx2 - cam, py = terrainY(gx2, L);
      if (gx2 === x0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // start banner
    drawFlagPole(40 - cam, 'START', '#0EA5A4');
    // finish flag
    drawFinishFlag(L.len - cam);

    // popups
    for (var pi = popups.length - 1; pi >= 0; pi--) {
      var pp = popups[pi];
      ctx.font = '900 26px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = pp.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 4;
      var py2 = pp.y - (1.6 - pp.ttl) * 50;
      ctx.strokeText(pp.text, pp.x - cam, py2);
      ctx.fillText(pp.text, pp.x - cam, py2);
    }

    drawBike(cam);

    // hint
    if (hintT > 0 && state === 'play') {
      ctx.font = '800 22px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(20,40,60,0.85)';
      ctx.fillText('Hold ↑ (or GAS) to ride!', W / 2, 60);
    }

    // touch buttons
    ctx.textAlign = 'center';
    for (var zi = 0; zi < ZONES.length; zi++) {
      var z = ZONES[zi];
      var active = touch[z.id] > 0;
      ctx.fillStyle = active ? 'rgba(14,165,164,0.55)' : 'rgba(20,40,60,0.30)';
      roundRect(z.x, ZONE_Y, z.w, ZONE_H, 10);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '800 17px Nunito, sans-serif';
      ctx.fillText(z.label, z.x + z.w / 2, ZONE_Y + 35);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawFlagPole(sx, label, color) {
    if (sx < -60 || sx > W + 60) return;
    var gy = terrainY(sx + camX, L);
    ctx.strokeStyle = '#5B4A3F';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(sx, gy);
    ctx.lineTo(sx, gy - 110);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(sx, gy - 110, 64, 34);
    ctx.fillStyle = '#fff';
    ctx.font = '800 16px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, sx + 32, gy - 87);
  }

  var camX = 0;
  function drawFinishFlag(sx) {
    if (sx < -80 || sx > W + 80) return;
    var gy = terrainY(sx + camX, L);
    ctx.strokeStyle = '#3A3A3A';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(sx, gy);
    ctx.lineTo(sx, gy - 130);
    ctx.stroke();
    // waving checkered flag
    var fw = 70, fh = 44, rows = 4, cols = 6;
    var t = performance.now() / 300;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var wave = Math.sin(t + c * 0.7 + r * 0.4) * 3;
        ctx.fillStyle = (r + c) % 2 === 0 ? '#222' : '#fff';
        ctx.fillRect(sx + c * (fw / cols), gy - 130 + r * (fh / rows) + wave * (c / cols), fw / cols + 1, fh / rows + 1);
      }
    }
  }

  function drawBike(cam) {
    var bx = bike.x - cam, by = bike.y;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(bike.ang);

    // wheels
    var wheelPts = [[-20, 12], [20, 12]];
    for (var i = 0; i < wheelPts.length; i++) {
      var wx = wheelPts[i][0], wy = wheelPts[i][1];
      ctx.fillStyle = '#2B2B2B';
      ctx.beginPath();
      ctx.arc(wx, wy, WR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9AA5B1';
      ctx.beginPath();
      ctx.arc(wx, wy, 5, 0, Math.PI * 2);
      ctx.fill();
      // spokes
      ctx.strokeStyle = '#9AA5B1';
      ctx.lineWidth = 2;
      var spin = (bike.x * 0.05) % (Math.PI * 2);
      for (var s = 0; s < 3; s++) {
        var a = spin + s * Math.PI / 3;
        ctx.beginPath();
        ctx.moveTo(wx - Math.cos(a) * 10, wy - Math.sin(a) * 10);
        ctx.lineTo(wx + Math.cos(a) * 10, wy + Math.sin(a) * 10);
        ctx.stroke();
      }
    }

    // frame
    ctx.strokeStyle = '#E4572E';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-20, 12); ctx.lineTo(-2, -8); ctx.lineTo(20, 12);
    ctx.moveTo(-2, -8); ctx.lineTo(14, -10);
    ctx.stroke();
    // seat + handlebar
    ctx.strokeStyle = '#3A3A3A';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-12, -12); ctx.lineTo(-2, -12);
    ctx.moveTo(14, -10); ctx.lineTo(20, -18);
    ctx.stroke();

    // rider: legs, torso, arms, helmet head
    ctx.strokeStyle = '#1D4ED8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-6, -12); ctx.lineTo(2, 2); ctx.lineTo(14, 4);   // legs
    ctx.moveTo(-6, -12); ctx.lineTo(6, -24);                    // torso
    ctx.stroke();
    ctx.strokeStyle = '#F4A259';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(6, -24); ctx.lineTo(18, -18);                   // arms to handlebar
    ctx.stroke();
    // head with helmet
    ctx.fillStyle = '#FFD9B3';
    ctx.beginPath();
    ctx.arc(6, -32, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0EA5A4';
    ctx.beginPath();
    ctx.arc(6, -33, 8, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ---------- Main loop ----------
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    if (state === 'play') {
      elapsed = (now - startT) / 1000;
      step(dt, input());
      if (hintT > 0) hintT -= dt;
      elTime.textContent = fmtTime(elapsed);
      for (var i = popups.length - 1; i >= 0; i--) {
        popups[i].ttl -= dt;
        if (popups[i].ttl <= 0) popups.splice(i, 1);
      }
    }

    camX = bike.x - 220;
    var maxCam = L.len + 320 - W;
    if (camX < 0) camX = 0;
    if (camX > maxCam) camX = maxCam;

    draw(camX);
    requestAnimationFrame(frame);
  }

  // ---------- UI wiring ----------
  btnAgain.addEventListener('click', function () { startLevel(cur); });
  btnNext.addEventListener('click', function () { if (cur < 3) startLevel(cur + 1); });
  btnRestart.addEventListener('click', function () { startLevel(cur); });
  canvas.addEventListener('mousedown', function () { canvas.focus(); });

  // go
  startLevel(1);
  requestAnimationFrame(frame);
})();
