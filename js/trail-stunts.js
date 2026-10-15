// Trail Stunts — Wisely Arcade
// Original physics bike-stunt game (own name, own art, own code).
// Side-view stunt bike on procedural rolling-hill terrain. 3 trails.
// Features: launch ramps, hurdle barriers, spike strips, flip bonuses,
// gradient-shaded 3D-style rendering, particles, dynamic shadows.
(function () {
  'use strict';

  var canvas = document.getElementById('trail');
  if (!canvas) return;
  // Bigger playfield: set backing store here (CSS keeps it responsive).
  canvas.width = 960;
  canvas.height = 600;
  var ctx = canvas.getContext('2d');
  var W = 960, H = 600;

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

  // ---------- Obstacles: launch ramps, hurdles, spike strips ----------
  // Ramps: wedge {x, w, h} — ride up, launch off the lip.
  // Hurdles: barrier {x, w, h} placed after a ramp; clear it for +100.
  // Spikes: strip {x, w} on the ground; touching = wipeout.
  var OBSTACLES = {
    1: {
      ramps:   [{ x: 700, w: 110, h: 60 }, { x: 1500, w: 110, h: 60 }],
      hurdles: [{ x: 845, w: 26, h: 30 }, { x: 1645, w: 26, h: 30 }],
      spikes:  []
    },
    2: {
      ramps:   [{ x: 800, w: 110, h: 60 }, { x: 1650, w: 110, h: 60 }, { x: 2500, w: 110, h: 60 }],
      hurdles: [{ x: 945, w: 26, h: 30 }, { x: 1795, w: 26, h: 30 }, { x: 2645, w: 26, h: 30 }],
      spikes:  []
    },
    3: {
      ramps:   [{ x: 700, w: 110, h: 60 }, { x: 1600, w: 110, h: 60 }, { x: 2500, w: 110, h: 60 }, { x: 3400, w: 110, h: 60 }],
      hurdles: [{ x: 845, w: 28, h: 30 }, { x: 1745, w: 28, h: 30 }],
      // spike sits under the 4th ramp's flight path near the lip: any jump
      // flies over, but rolling through without jumping is a wipeout
      spikes:  [{ x: 3560, w: 34 }]
    }
  };

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

  // Ramp wedge height above the terrain at world x (0 when not on a ramp).
  function rampH(x) {
    var ob = OBSTACLES[cur];
    if (!ob) return 0;
    var h = 0;
    for (var i = 0; i < ob.ramps.length; i++) {
      var r = ob.ramps[i];
      if (x >= r.x && x <= r.x + r.w) {
        var rh = r.h * (x - r.x) / r.w;
        if (rh > h) h = rh;
      }
    }
    return h;
  }
  // Effective ridable surface = terrain plus ramp wedges. Ramps are real
  // collision; the face runs from the entry terrain up to h above it,
  // matching the visual. Returns the surface y at world x.
  function effGroundY(x) {
    var base = terrainY(x, L);
    var ob = OBSTACLES[cur];
    if (!ob) return base;
    for (var i = 0; i < ob.ramps.length; i++) {
      var r = ob.ramps[i];
      if (x >= r.x && x <= r.x + r.w) {
        var rampY = terrainY(r.x, L) - r.h * (x - r.x) / r.w;
        if (rampY < base) base = rampY;
      }
    }
    return base;
  }
  function effSlope(x) { return (effGroundY(x + 6) - effGroundY(x - 6)) / 12; }


  // ---------- State ----------
  var cur = 1;               // current trail (1..3), session-unlocked in order
  var state = 'play';        // 'play' | 'crashed' | 'finished'
  var L = LEVELS[0];
  var bike, startT, elapsed, popups, parts, hintT, trailHintT, hintShown;
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
    var ob = OBSTACLES[n];
    for (var i = 0; i < ob.hurdles.length; i++) ob.hurdles[i].cleared = false;
    hintShown = false;
    resetBike();
    state = 'play';
    elapsed = 0;
    startT = performance.now();
    popups = [];
    parts = [];
    hintT = 3.5;
    trailHintT = 0;
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
    { id: 'brake', x: 8,   w: 130, label: '◀ BRAKE' },
    { id: 'leanB', x: 146, w: 130, label: '⟲ LEAN' },
    { id: 'leanF', x: 684, w: 130, label: 'LEAN ⟳' },
    { id: 'gas',   x: 822, w: 130, label: 'GAS ▶' }
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
  function hash(n) {
    var x = Math.sin(n * 127.1) * 43758.5453;
    return x - Math.floor(x);
  }
  function popup(text, x, y, color) {
    popups.push({ text: text, x: x, y: y, ttl: 1.6, color: color || '#FFD23F' });
  }
  function spawnPart(x, y, vx, vy, ttl, color, r, grav) {
    if (parts.length > 170) return;
    parts.push({ x: x, y: y, vx: vx, vy: vy, ttl: ttl, max: ttl, color: color, r: r, grav: grav || 0 });
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

    // Wheel contacts (ramps are part of effGroundY). On a ramp face the
    // wheel is railed: snapped to the surface and velocity forced along
    // the tangent, so the boost can't make it bounce or sink.
    var wheels = [wheelPos(-20, 12), wheelPos(20, 12)];
    var contacts = 0;
    var avgSlope = 0;
    for (var i = 0; i < wheels.length; i++) {
      var w = wheels[i];
      var ground = effGroundY(w.x);
      var pen = (w.y + WR) - ground; // >0 means wheel is in the ground
      if (pen > 0) {
        contacts++;
        var slope = effSlope(w.x);
        avgSlope += slope;
        var nl = Math.hypot(slope, 1);
        var nx = slope / nl, ny = -1 / nl; // surface normal (points up; perpendicular to tangent)
        // positional correction
        bike.x += nx * pen * 0.55;
        bike.y += ny * pen * 0.55;
        // kill velocity into the ground (normal points up, so into-ground is vn < 0)
        var vn = bike.vx * nx + bike.vy * ny;
        if (vn < 0) { bike.vx -= nx * vn; bike.vy -= ny * vn; }
      }
    }
    bike.onGround = contacts > 0;

    // Lip-pop: crossing a ramp lip fires a vertical kick (arcade launch).
    // The pop flag resets once the bike leaves the lip zone.
    if (state === 'play') {
      var ob2 = OBSTACLES[cur];
      if (ob2) {
        for (var li = 0; li < ob2.ramps.length; li++) {
          var lr = ob2.ramps[li];
          var lipX = lr.x + lr.w;
          var nearLipGround = Math.abs((bike.y + 30) - effGroundY(bike.x)) < 30;
          if (!lr.popped && bike.x >= lipX - 6 && bike.x <= lipX + 12 && bike.vx > 60 && nearLipGround) {
            lr.popped = true;
            bike.vy -= 150 + bike.vx * 0.15;
            bike.vx *= 1.02;
            // stabilize takeoff: kill rotation and set a slight nose-up for a clean flight
            bike.ang = -0.26;
            bike.angV = 0;
            bike.rot = 0;
            for (var pp = 0; pp < 6; pp++) spawnPart(lipX, effGroundY(lipX) - 4, -60 - hash(lipX + pp) * 120, -40 - hash(lipX * 2 + pp) * 80, '#FFD23F', 22, 3);
          }
          if (bike.x < lr.x - 20 || bike.x > lipX + 60) lr.popped = false;
        }
      }
    }

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
        } else {
          if (Math.abs(bike.rot) > 5.2) {
            var flips = Math.round(Math.abs(bike.rot) / (Math.PI * 2));
            var pts = flips * 250;
            bike.bonus += pts;
            popup('+' + pts + (bike.rot < 0 ? ' BACKFLIP!' : ' FRONTFLIP!'), bike.x, bike.y - 60);
          }
          if (preVy > 220) {
            landDip = 0.12; // Round 1: subtle camera dip on firm landings
            for (var d = 0; d < 10; d++) {
              spawnPart(bike.x + (hash(d * 3.1) - 0.5) * 40, effGroundY(bike.x),
                (hash(d * 7.7) - 0.5) * 220, -hash(d * 5.3) * 160,
                0.5 + hash(d) * 0.3, '210,180,140', 3 + hash(d * 9.1) * 3, 500);
            }
          }
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

    // ---- obstacle collisions: hurdles & spike strips ----
    if (state === 'play') {
      var ob = OBSTACLES[cur];
      var fW = wheels[1], rW = wheels[0];
      var hr = rot(6, -30, bike.ang);
      var headX = bike.x + hr.x, headY = bike.y + hr.y;
      var hi, hu, hx0, hx1, gy, inRect;
      for (hi = 0; hi < ob.hurdles.length; hi++) {
        hu = ob.hurdles[hi];
        if (hu.cleared) continue; // already cleared: can't crash into it again
        hx0 = hu.x; hx1 = hu.x + hu.w;
        gy = terrainY(hu.x + hu.w / 2, L);
        inRect = function (px, py) { return px > hx0 - 2 && px < hx1 + 2 && py > gy - hu.h && py < gy + 6; };
        if (inRect(fW.x, fW.y) || inRect(rW.x, rW.y) || inRect(headX, headY)) {
          doCrash('Clipped the hurdle — hit the ramp and fly over it!');
          break;
        }
        if (bike.x > hx1 + 4) {
          hu.cleared = true;
          bike.bonus += 100;
          popup('+100 Cleared!', hu.x + hu.w / 2, gy - hu.h - 26, '#7CFC9A');
          for (var sp = 0; sp < 8; sp++) {
            spawnPart(hu.x + hu.w / 2 + (hash(sp * 3.7) - 0.5) * 30, gy - hu.h,
              (hash(sp * 6.1) - 0.5) * 160, -60 - hash(sp * 8.3) * 120,
              0.6, '255,215,63', 3, 300);
          }
        }
      }
      if (state === 'play' && bike.onGround) {
        for (var si = 0; si < ob.spikes.length; si++) {
          var spk = ob.spikes[si];
          if ((fW.x > spk.x - 4 && fW.x < spk.x + spk.w + 4) ||
              (rW.x > spk.x - 4 && rW.x < spk.x + spk.w + 4)) {
            doCrash('Spike strip! Watch the track ahead.');
            break;
          }
        }
      }
    }

    // head-hit crash (family-safe: comical wipeout, no gore)
    var hr2 = rot(6, -30, bike.ang);
    var hx2 = bike.x + hr2.x, hy2 = bike.y + hr2.y;
    if (hy2 > terrainY(hx2, L) + 4) {
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

    // first-hurdle hint toast
    if (!hintShown && state === 'play') {
      var ob2 = OBSTACLES[cur];
      for (var qi = 0; qi < ob2.hurdles.length; qi++) {
        if (ob2.hurdles[qi].x - camX < W + 80 && ob2.hurdles[qi].x > camX) {
          hintShown = true;
          trailHintT = 4;
          break;
        }
      }
    }

    // finish
    if (bike.x >= L.len) doFinish();
  }

  // ---------- Render ----------
  var clouds = [];
  for (var ci = 0; ci < 9; ci++) {
    clouds.push({ x: hash(ci * 13.7) * 4000, y: 40 + hash(ci * 7.3) * 150, s: 0.6 + hash(ci * 3.1) * 0.9, v: ci % 2 === 0 ? 0.12 : 0.3 });
  }

  function draw(cam) {
    // Round 1: landing camera dip — subtle 120ms vertical dip (visual only)
    var dipY = 0;
    if (landDip > 0) dipY = Math.sin((1 - landDip / 0.12) * Math.PI) * 7;
    ctx.save();
    ctx.translate(0, dipY);

    // sky with warm horizon (Round 1: deepened, still pastel)
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#4F9FDE');
    sky.addColorStop(0.55, '#AED8F7');
    sky.addColorStop(0.8, '#F6DCB6');
    sky.addColorStop(1, '#F3CD9E');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // sun with glow
    var sg = ctx.createRadialGradient(W - 110, 82, 8, W - 110, 82, 90);
    sg.addColorStop(0, 'rgba(255,236,140,0.9)');
    sg.addColorStop(0.4, 'rgba(255,230,109,0.55)');
    sg.addColorStop(1, 'rgba(255,230,109,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(W - 110, 82, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE66D';
    ctx.beginPath();
    ctx.arc(W - 110, 82, 32, 0, Math.PI * 2);
    ctx.fill();

    // clouds (two parallax speeds)
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      var cx = (((cl.x - cam * cl.v) % (W + 500)) + W + 500) % (W + 500) - 250;
      var cy = cl.y, cs = cl.s;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(cx, cy, 24 * cs, 0, Math.PI * 2);
      ctx.arc(cx + 24 * cs, cy + 5 * cs, 17 * cs, 0, Math.PI * 2);
      ctx.arc(cx - 24 * cs, cy + 6 * cs, 16 * cs, 0, Math.PI * 2);
      ctx.fill();
    }

    // far mountain silhouettes (three layers — Round 1 adds the farthest, lightest)
    mountainLayer(cam, 0.06, 262, '#C7DBEF');
    mountainLayer(cam, 0.12, 300, '#A9C4DE');
    mountainLayer(cam, 0.25, 345, '#8CAED2');

    // mid hills
    ctx.fillStyle = '#A9DFAE';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var hx = 0; hx <= W; hx += 14) {
      var wx = hx + cam * 0.45;
      ctx.lineTo(hx, 352 - 42 * Math.sin(wx * 0.004 + 2) - 18 * Math.sin(wx * 0.011));
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    drawTerrain(cam);

    // obstacles
    var ob = OBSTACLES[cur];
    for (var ri = 0; ri < ob.ramps.length; ri++) drawRamp(ob.ramps[ri], cam);
    for (var si2 = 0; si2 < ob.spikes.length; si2++) drawSpike(ob.spikes[si2], cam);
    for (var hi2 = 0; hi2 < ob.hurdles.length; hi2++) drawHurdle(ob.hurdles[hi2], cam);

    // start banner
    drawFlagPole(40 - cam, 'START', '#0EA5A4');
    // finish flag
    drawFinishFlag(L.len - cam);

    // particles (world space)
    for (var pi2 = parts.length - 1; pi2 >= 0; pi2--) {
      var pt = parts[pi2];
      ctx.globalAlpha = Math.max(0, pt.ttl / pt.max) * 0.55;
      ctx.fillStyle = 'rgb(' + pt.color + ')';
      ctx.beginPath();
      ctx.arc(pt.x - cam, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

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

    // speed lines at high velocity
    var spd = Math.abs(bike.vx);
    if (spd > L.maxSpeed * 0.72 && state === 'play') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      var tt = performance.now() / 90;
      for (var li = 0; li < 7; li++) {
        var ly = hash(li * 17.3 + Math.floor(tt)) * H * 0.7 + 20;
        var lx = W - hash(li * 5.9 + Math.floor(tt) * 3.3) * (W * 0.5);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - 110 - spd * 0.15, ly);
        ctx.stroke();
      }
    }

    drawBike(cam);

    // hints
    ctx.textAlign = 'center';
    if (hintT > 0 && state === 'play') {
      ctx.font = '800 22px Nunito, sans-serif';
      ctx.fillStyle = 'rgba(20,40,60,0.85)';
      ctx.fillText('Hold ↑ (or GAS) to ride!', W / 2, 60);
    }
    if (trailHintT > 0 && state === 'play') {
      ctx.font = '900 24px Nunito, sans-serif';
      ctx.fillStyle = 'rgba(120,60,0,0.92)';
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 4;
      ctx.strokeText('Hit the ramp to clear the hurdle!', W / 2, 96);
      ctx.fillText('Hit the ramp to clear the hurdle!', W / 2, 96);
    }

    // touch buttons
    for (var zi = 0; zi < ZONES.length; zi++) {
      var z = ZONES[zi];
      var active = touch[z.id] > 0;
      var zg = ctx.createLinearGradient(0, ZONE_Y, 0, ZONE_Y + ZONE_H);
      if (active) { zg.addColorStop(0, 'rgba(14,165,164,0.75)'); zg.addColorStop(1, 'rgba(10,120,118,0.75)'); }
      else { zg.addColorStop(0, 'rgba(20,40,60,0.38)'); zg.addColorStop(1, 'rgba(20,40,60,0.22)'); }
      ctx.fillStyle = zg;
      roundRect(z.x, ZONE_Y, z.w, ZONE_H, 12);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '800 17px Nunito, sans-serif';
      ctx.fillText(z.label, z.x + z.w / 2, ZONE_Y + 35);
    }
    ctx.restore(); // Round 1: end landing-dip transform
  }

  function mountainLayer(cam, par, baseY, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 16) {
      var wx = x + cam * par;
      var y = baseY - 55 * Math.abs(Math.sin(wx * 0.0035 + par * 9)) - 25 * Math.sin(wx * 0.009 + 1);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  function drawTerrain(cam) {
    var x0 = Math.max(0, cam - 40), x1 = cam + W + 40;
    // dirt body with vertical gradient
    var dg = ctx.createLinearGradient(0, BASE_Y - 130, 0, H);
    dg.addColorStop(0, '#A8703A');
    dg.addColorStop(0.35, '#8A5427');
    dg.addColorStop(1, '#5E3A1C');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(x0 - cam, H);
    for (var gx = x0; gx <= x1; gx += 8) ctx.lineTo(gx - cam, terrainY(gx, L));
    ctx.lineTo(x1 - cam, H);
    ctx.closePath();
    ctx.fill();
    // dirt speckles (deterministic, no flicker)
    ctx.fillStyle = 'rgba(60,35,15,0.35)';
    for (var sx = x0; sx <= x1; sx += 22) {
      var ty = terrainY(sx, L);
      for (var k = 0; k < 2; k++) {
        var sy = ty + 14 + hash(sx * 3.3 + k * 11.7) * 70;
        if (sy < H - 4) {
          ctx.beginPath();
          ctx.arc(sx - cam + (hash(sx + k) - 0.5) * 14, sy, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // grass lip: thick base + individual blades
    ctx.strokeStyle = '#3FA34D';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var gx2 = x0; gx2 <= x1; gx2 += 8) {
      var px = gx2 - cam, py = terrainY(gx2, L);
      if (gx2 === x0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    for (var bx = x0; bx <= x1; bx += 15) {
      var bty = terrainY(bx, L);
      var bh = 7 + hash(bx * 1.71) * 8;
      var lean = (hash(bx * 2.33) - 0.5) * 8;
      ctx.fillStyle = hash(bx * 4.7) > 0.5 ? '#2F9E44' : '#5CC46E';
      ctx.beginPath();
      ctx.moveTo(bx - cam - 3, bty - 2);
      ctx.lineTo(bx - cam + lean, bty - bh);
      ctx.lineTo(bx - cam + 3, bty - 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawRamp(r, cam) {
    var x0 = r.x - cam, x1 = r.x + r.w - cam;
    if (x1 < -80 || x0 > W + 80) return;
    var y0 = terrainY(r.x, L), y1 = terrainY(r.x + r.w, L);
    var lipY = y0 - r.h; // lip is always h above the entry, whatever the terrain does
    // wooden wedge body
    var wg = ctx.createLinearGradient(0, lipY, 0, Math.max(y0, y1) + 6);
    wg.addColorStop(0, '#C08A4A');
    wg.addColorStop(1, '#7A4E22');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, lipY);
    ctx.lineTo(x1, y1 + 4);
    ctx.closePath();
    ctx.fill();
    // plank seams along the slope
    ctx.strokeStyle = 'rgba(70,45,20,0.5)';
    ctx.lineWidth = 2;
    for (var p = 1; p < 4; p++) {
      var fx = x0 + (x1 - x0) * p / 4, fy = y0 + (lipY - y0) * p / 4;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + 3, fy + (Math.max(y0, y1) - fy) * 0.9);
      ctx.stroke();
    }
    // hazard-striped launch face
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#2E2E2E';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(x0, y0 - 7);
    ctx.lineTo(x1, lipY - 7);
    ctx.stroke();
    ctx.strokeStyle = '#FFD23F';
    ctx.lineWidth = 15;
    ctx.setLineDash([16, 16]);
    ctx.beginPath();
    ctx.moveTo(x0, y0 - 7);
    ctx.lineTo(x1, lipY - 7);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawHurdle(hu, cam) {
    var x = hu.x - cam;
    if (x + hu.w < -40 || x > W + 40) return;
    var gy = terrainY(hu.x + hu.w / 2, L);
    var top = gy - hu.h;
    // posts with wood gradient
    var pg = ctx.createLinearGradient(x, 0, x + hu.w, 0);
    pg.addColorStop(0, '#6E4A26');
    pg.addColorStop(0.5, '#A9763F');
    pg.addColorStop(1, '#6E4A26');
    ctx.fillStyle = pg;
    ctx.fillRect(x, top, 9, hu.h);
    ctx.fillRect(x + hu.w - 9, top, 9, hu.h);
    // cross bars
    var bg = ctx.createLinearGradient(0, top, 0, gy);
    bg.addColorStop(0, '#D8A75C');
    bg.addColorStop(1, '#8A5A2A');
    ctx.fillStyle = bg;
    ctx.fillRect(x, top + 4, hu.w, 10);
    ctx.fillRect(x, top + hu.h * 0.55, hu.w, 10);
    // white top edge for visibility
    ctx.fillStyle = '#FFF6E8';
    ctx.fillRect(x, top + 4, hu.w, 3);
    // feet
    ctx.fillStyle = '#5E3A1C';
    ctx.fillRect(x - 4, gy - 5, 17, 6);
    ctx.fillRect(x + hu.w - 13, gy - 5, 17, 6);
  }

  function drawSpike(sp, cam) {
    var x = sp.x - cam;
    if (x + sp.w < -40 || x > W + 40) return;
    var gy = terrainY(sp.x + sp.w / 2, L);
    // dark base strip
    var bg2 = ctx.createLinearGradient(0, gy - 8, 0, gy + 2);
    bg2.addColorStop(0, '#3A4048');
    bg2.addColorStop(1, '#1E2228');
    ctx.fillStyle = bg2;
    ctx.fillRect(x, gy - 8, sp.w, 10);
    // metal spikes
    for (var sx = x + 4; sx < x + sp.w - 4; sx += 13) {
      var tg = ctx.createLinearGradient(sx, gy - 26, sx, gy - 6);
      tg.addColorStop(0, '#E8EDF2');
      tg.addColorStop(1, '#7A828C');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(sx - 5, gy - 6);
      ctx.lineTo(sx, gy - 26);
      ctx.lineTo(sx + 5, gy - 6);
      ctx.closePath();
      ctx.fill();
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
    var pg = ctx.createLinearGradient(sx - 4, 0, sx + 4, 0);
    pg.addColorStop(0, '#4A3A2C');
    pg.addColorStop(0.5, '#7A6248');
    pg.addColorStop(1, '#4A3A2C');
    ctx.fillStyle = pg;
    ctx.fillRect(sx - 3, gy - 110, 7, 110);
    ctx.fillStyle = color;
    ctx.fillRect(sx + 4, gy - 110, 64, 34);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(sx + 4, gy - 110, 64, 8);
    ctx.fillStyle = '#fff';
    ctx.font = '800 16px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, sx + 36, gy - 87);
  }

  var camX = 0;
  function drawFinishFlag(sx) {
    if (sx < -80 || sx > W + 80) return;
    var gy = terrainY(sx + camX, L);
    var pg = ctx.createLinearGradient(sx - 4, 0, sx + 4, 0);
    pg.addColorStop(0, '#2A2A2A');
    pg.addColorStop(0.5, '#5A5A5A');
    pg.addColorStop(1, '#2A2A2A');
    ctx.fillStyle = pg;
    ctx.fillRect(sx - 4, gy - 130, 8, 130);
    // waving checkered flag
    var fw = 70, fh = 44, rows = 4, cols = 6;
    var t = performance.now() / 300;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var wave = Math.sin(t + c * 0.7 + r * 0.4) * 3;
        ctx.fillStyle = (r + c) % 2 === 0 ? '#222' : '#fff';
        ctx.fillRect(sx + 4 + c * (fw / cols), gy - 130 + r * (fh / rows) + wave * (c / cols), fw / cols + 1, fh / rows + 1);
      }
    }
  }

  function drawWheelShadow(cam) {
    var pts = [wheelPos(-20, 12), wheelPos(20, 12)];
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var gy = effGroundY(p.x);
      var hgt = gy - (p.y + WR);
      if (hgt < 0) hgt = 0;
      if (hgt > 160) continue;
      var k = 1 - hgt / 160;
      ctx.fillStyle = 'rgba(20,12,6,' + (0.34 * k).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(p.x - cam, gy + 5, 15 * (0.5 + 0.5 * k), 5 * (0.5 + 0.5 * k), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBike(cam) {
    drawWheelShadow(cam);
    var bx = bike.x - cam, by = bike.y;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(bike.ang);

    // wheels: radial-gradient tires, bright hubs, spinning spokes
    var wheelPts = [[-20, 12], [20, 12]];
    for (var i = 0; i < wheelPts.length; i++) {
      var wx = wheelPts[i][0], wy = wheelPts[i][1];
      var tg = ctx.createRadialGradient(wx - 4, wy - 4, 2, wx, wy, WR);
      tg.addColorStop(0, '#4A4A4A');
      tg.addColorStop(0.75, '#262626');
      tg.addColorStop(1, '#141414');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.arc(wx, wy, WR, 0, Math.PI * 2);
      ctx.fill();
      // rim highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wx, wy, WR - 2, Math.PI * 1.1, Math.PI * 1.6);
      ctx.stroke();
      // hub
      var hg = ctx.createRadialGradient(wx - 1, wy - 1, 1, wx, wy, 6);
      hg.addColorStop(0, '#E8EDF2');
      hg.addColorStop(1, '#8A94A0');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(wx, wy, 5, 0, Math.PI * 2);
      ctx.fill();
      // spokes
      ctx.strokeStyle = '#B9C2CC';
      ctx.lineWidth = 2;
      var spin = (bike.x * 0.05) % (Math.PI * 2);
      for (var s = 0; s < 3; s++) {
        var a = spin + s * Math.PI / 3;
        ctx.beginPath();
        ctx.moveTo(wx - Math.cos(a) * 10, wy - Math.sin(a) * 10);
        ctx.lineTo(wx + Math.cos(a) * 10, wy + Math.sin(a) * 10);
        ctx.stroke();
      }
      // Round 1: motion-blur arc on fast wheel spin
      var wSpd = Math.abs(bike.vx);
      if (wSpd > 220) {
        ctx.strokeStyle = 'rgba(200,208,218,' + Math.min(0.45, (wSpd - 220) / 700).toFixed(3) + ')';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(wx, wy, WR - 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // frame with gradient + highlight
    var fg = ctx.createLinearGradient(-20, -10, 20, 12);
    fg.addColorStop(0, '#F4703C');
    fg.addColorStop(1, '#C7431F');
    ctx.strokeStyle = fg;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-20, 12); ctx.lineTo(-2, -8); ctx.lineTo(20, 12);
    ctx.moveTo(-2, -8); ctx.lineTo(14, -10);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 9); ctx.lineTo(-3, -9);
    ctx.stroke();
    // seat + handlebar
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-12, -12); ctx.lineTo(-2, -12);
    ctx.moveTo(14, -10); ctx.lineTo(20, -18);
    ctx.stroke();

    // rider: gradient jersey torso, legs, arms
    var jg = ctx.createLinearGradient(0, -26, 0, -10);
    jg.addColorStop(0, '#4B8BF5');
    jg.addColorStop(1, '#1D4ED8');
    ctx.strokeStyle = jg;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-6, -12); ctx.lineTo(6, -24);                    // torso
    ctx.stroke();
    ctx.strokeStyle = '#173A8F';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-6, -12); ctx.lineTo(2, 2); ctx.lineTo(14, 4);   // legs
    ctx.stroke();
    var ag = ctx.createLinearGradient(6, -26, 20, -16);
    ag.addColorStop(0, '#F7B267');
    ag.addColorStop(1, '#E08A3C');
    ctx.strokeStyle = ag;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(6, -24); ctx.lineTo(18, -18);                   // arms to handlebar
    ctx.stroke();
    // head with shaded helmet
    ctx.fillStyle = '#FFD9B3';
    ctx.beginPath();
    ctx.arc(6, -32, 8, 0, Math.PI * 2);
    ctx.fill();
    var hgl = ctx.createLinearGradient(6, -41, 6, -25);
    hgl.addColorStop(0, '#2DD4BF');
    hgl.addColorStop(1, '#0B7C72');
    ctx.fillStyle = hgl;
    ctx.beginPath();
    ctx.arc(6, -33, 8, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(6, -33, 5.5, Math.PI * 1.15, Math.PI * 1.55);
    ctx.stroke();

    ctx.restore();
  }

  // ---------- Main loop ----------
  var last = performance.now();
  var dustT = 0, exhT = 0;
  var landDip = 0; // Round 1: landing camera-dip timer (visual only, seconds)
  function frame(now) {
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    if (state === 'play') {
      elapsed = (now - startT) / 1000;
      step(dt, input());
      if (hintT > 0) hintT -= dt;
      if (trailHintT > 0) trailHintT -= dt;
      elTime.textContent = fmtTime(elapsed);
      for (var i = popups.length - 1; i >= 0; i--) {
        popups[i].ttl -= dt;
        if (popups[i].ttl <= 0) popups.splice(i, 1);
      }
      // wheel dust + exhaust while riding
      var spd = Math.abs(bike.vx);
      if (bike.onGround && spd > 150) {
        dustT -= dt;
        if (dustT <= 0) {
          dustT = 0.05;
          var rw = wheelPos(-20, 12);
          spawnPart(rw.x - 6, effGroundY(rw.x) - 2, -spd * 0.25 - 40, -40 - hash(now) * 60,
            0.45, '210,180,140', 3.5, 260);
        }
      }
      if (input().gas && bike.onGround) {
        exhT -= dt;
        if (exhT <= 0) {
          exhT = 0.14;
          var er = rot(-26, 4, bike.ang);
          spawnPart(bike.x + er.x, bike.y + er.y, -60, -30, 0.5, '150,150,155', 3, -40);
        }
      }
    }

    // particles update
    for (var pi3 = parts.length - 1; pi3 >= 0; pi3--) {
      var pt = parts[pi3];
      pt.ttl -= dt;
      if (pt.ttl <= 0) { parts.splice(pi3, 1); continue; }
      pt.vy += (pt.grav || 0) * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }
    if (landDip > 0) landDip -= dt;

    camX = bike.x - 260;
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

  // Debug hook for automated testing (invisible to players).
  window.__tsDebug = {
    state: function () { return state; },
    level: function () { return cur; },
    bike: function () { return bike; },
    bikeAngN: function () { return normAng(bike.ang); },
    obstacles: function () {
      var ob = OBSTACLES[cur];
      return {
        hurdles: ob.hurdles.map(function (h) { return { x: h.x, cleared: !!h.cleared }; }),
        ramps: ob.ramps.map(function (r) { return { x: r.x, w: r.w, h: r.h }; }),
        spikes: ob.spikes.map(function (s) { return { x: s.x, w: s.w }; })
      };
    },
    startLevel: startLevel
  };

  // go
  startLevel(1);
  requestAnimationFrame(frame);
})();
