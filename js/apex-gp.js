// Apex GP — Wisely Arcade
// Original 3D motorcycle Grand Prix racer. Own name, own art, own code.
// Career: 10 levels. Earn points by finishing position, spend them on
// Engine / Tires / Nitro upgrades in the garage. Progress in localStorage.
(function () {
  'use strict';
  if (!window.THREE) return;

  /* ================= Config & persistence ================= */
  var LEVELS = 10, LAPS = 3, RIDERS = 6;
  var POINTS = [100, 75, 60, 45, 30, 20]; // by finishing position
  var UPS = {
    engine: { name: 'Engine', desc: '+7% top speed per stage. Pure straight-line fury.', costs: [60, 120, 200, 300, 450] },
    tires:  { name: 'Tires',  desc: '+12% grip per stage. Lean harder, run wide less.', costs: [50, 100, 170, 260, 380] },
    nitro:  { name: 'Nitro',  desc: '+25% boost power and longer burn per stage.',       costs: [50, 100, 170, 260, 380] }
  };
  function loadNum(k, d) { try { var v = parseInt(localStorage.getItem(k), 10); return isNaN(v) ? d : v; } catch (e) { return d; } }
  function saveNum(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  var store = {
    level: Math.min(Math.max(loadNum('apexgp_level', 1), 1), LEVELS),
    points: loadNum('apexgp_points', 0),
    up: { engine: loadNum('apexgp_up_e', 0), tires: loadNum('apexgp_up_t', 0), nitro: loadNum('apexgp_up_n', 0) }
  };
  function saveStore() {
    saveNum('apexgp_level', store.level); saveNum('apexgp_points', store.points);
    saveNum('apexgp_up_e', store.up.engine); saveNum('apexgp_up_t', store.up.tires); saveNum('apexgp_up_n', store.up.nitro);
  }
  function bikeStats() {
    return {
      topSpeed: 62 * (1 + 0.07 * store.up.engine),
      grip: 1 + 0.12 * store.up.tires,
      nitroPower: 1 + 0.25 * store.up.nitro,
      accel: 30 * (1 + 0.04 * store.up.engine)
    };
  }

  /* ================= Renderer / scene ================= */
  var canvas = document.getElementById('ag');
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(960, 600, false);
  if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b5e0);
  scene.fog = new THREE.Fog(0x9fc3e4, 220, 900);

  var camera = new THREE.PerspectiveCamera(62, 960 / 600, 0.5, 2500);

  var hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4a7c43, 0.95);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff4e0, 0.85);
  sun.position.set(180, 260, 120);
  scene.add(sun);

  /* ================= Track ================= */
  var ROAD_HALF = 7;
  var CTRL = [
    [0, -190], [120, -185], [205, -140], [235, -60], [195, 5], [205, 95],
    [150, 165], [60, 150], [-30, 175], [-120, 150], [-175, 80], [-155, -5],
    [-185, -85], [-110, -150]
  ].map(function (p) { return new THREE.Vector3(p[0], 0, p[1]); });
  var curve = new THREE.CatmullRomCurve3(CTRL, true, 'catmullrom', 0.6);
  var SAMPLES = 900;
  var pts = curve.getSpacedPoints(SAMPLES); // SAMPLES+1 pts, last == first
  var trackLen = curve.getLength();
  var segLen = trackLen / SAMPLES;
  // per-sample tangent + curvature (signed, + = turning left)
  var tans = [], curvs = [];
  for (var i = 0; i < SAMPLES; i++) {
    var a = pts[i], b = pts[(i + 1) % SAMPLES], c = pts[(i + 2) % SAMPLES];
    var t1 = new THREE.Vector3().subVectors(b, a).normalize();
    var t2 = new THREE.Vector3().subVectors(c, b).normalize();
    tans.push(t1.clone());
    var cross = t1.x * t2.z - t1.z * t2.x; // y of cross product (t1 x t2)
    var dot = Math.max(-1, Math.min(1, t1.dot(t2)));
    curvs.push(Math.atan2(cross, dot) / segLen); // signed curvature
  }
  function trackPoint(s, lat, out) {
    // s = arclength along track, lat = lateral in road-halfwidth units
    s = ((s % trackLen) + trackLen) % trackLen;
    var f = s / segLen, i0 = Math.floor(f) % SAMPLES, fr = f - Math.floor(f);
    var p0 = pts[i0], p1 = pts[(i0 + 1) % SAMPLES];
    out = out || new THREE.Vector3();
    out.lerpVectors(p0, p1, fr);
    var t = tans[i0];
    // left normal in XZ plane: (-tz, 0, tx)
    out.x += -t.z * lat * ROAD_HALF;
    out.z += t.x * lat * ROAD_HALF;
    return out;
  }
  function trackTangent(s, out) {
    s = ((s % trackLen) + trackLen) % trackLen;
    var i0 = Math.floor(s / segLen) % SAMPLES;
    out = out || new THREE.Vector3();
    return out.copy(tans[i0]);
  }
  function trackCurve(s) {
    s = ((s % trackLen) + trackLen) % trackLen;
    return curvs[Math.floor(s / segLen) % SAMPLES];
  }

  function canvasTex(w, h, draw, rx, ry) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rx) t.repeat.set(rx, ry || 1);
    if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    return t;
  }

  // Road ribbon
  (function buildRoad() {
    var pos = [], uv = [], idx = [];
    var reps = Math.round(trackLen / 26);
    for (var i = 0; i <= SAMPLES; i++) {
      var s = (i % SAMPLES) * segLen;
      var pL = trackPoint(s, -1.06), pR = trackPoint(s, 1.06);
      pos.push(pL.x, 0.02, pL.z, pR.x, 0.02, pR.z);
      var v = (i / SAMPLES) * reps;
      uv.push(0, v, 1, v);
      if (i < SAMPLES) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    var tex = canvasTex(128, 128, function (x, w, h) {
      x.fillStyle = '#3d4148'; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,.06)';
      for (var n = 0; n < 40; n++) x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, 6, h); x.fillRect(w - 6, 0, 6, h);
      x.fillStyle = '#f5d742'; x.fillRect(w / 2 - 3, 10, 6, 44);
    }, 1, 1);
    var m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex }));
    scene.add(m);
    // Curbs: red/white striped ribbons just outside the road
    [-1, 1].forEach(function (side) {
      var p2 = [], u2 = [], ix2 = [];
      for (var j = 0; j <= SAMPLES; j++) {
        var s2 = (j % SAMPLES) * segLen;
        var q0 = trackPoint(s2, side * 1.06), q1 = trackPoint(s2, side * 1.45);
        p2.push(q0.x, 0.015, q0.z, q1.x, 0.015, q1.z);
        var vv = (j / SAMPLES) * Math.round(trackLen / 8);
        u2.push(0, vv, 1, vv);
        if (j < SAMPLES) { var b = j * 2; ix2.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
      }
      var g2 = new THREE.BufferGeometry();
      g2.setAttribute('position', new THREE.Float32BufferAttribute(p2, 3));
      g2.setAttribute('uv', new THREE.Float32BufferAttribute(u2, 2));
      g2.setIndex(ix2); g2.computeVertexNormals();
      var t2 = canvasTex(32, 32, function (x, w, h) {
        x.fillStyle = '#d63b3b'; x.fillRect(0, 0, w, h / 2);
        x.fillStyle = '#f2f2f2'; x.fillRect(0, h / 2, w, h / 2);
      });
      scene.add(new THREE.Mesh(g2, new THREE.MeshLambertMaterial({ map: t2 })));
    });
  })();

  // Grass
  (function buildGrass() {
    var tex = canvasTex(256, 256, function (x, w, h) {
      x.fillStyle = '#5da24f'; x.fillRect(0, 0, w, h);
      for (var n = 0; n < 900; n++) {
        x.fillStyle = Math.random() < 0.5 ? 'rgba(0,60,0,.12)' : 'rgba(255,255,220,.08)';
        x.fillRect(Math.random() * w, Math.random() * h, 3, 5);
      }
    }, 60, 60);
    var g = new THREE.Mesh(new THREE.CircleGeometry(900, 40),
      new THREE.MeshLambertMaterial({ map: tex }));
    g.rotation.x = -Math.PI / 2; g.position.y = -0.05;
    scene.add(g);
  })();

  // Start/finish gantry + checkered line
  (function buildStart() {
    var p0 = trackPoint(0, -1.06), p1 = trackPoint(0, 1.06);
    var line = new THREE.Mesh(new THREE.PlaneGeometry(2.2, ROAD_HALF * 2.12),
      new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, function (x, w, h) {
        for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
          x.fillStyle = (r + c) % 2 ? '#111' : '#f5f5f5'; x.fillRect(c * 8, r * 8, 8, 8);
        }
      }) }));
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = Math.atan2(p1.x - p0.x, p1.z - p0.z) + Math.PI / 2;
    var mid = trackPoint(0, 0); line.position.set(mid.x, 0.03, mid.z);
    scene.add(line);
    var t = trackTangent(0, new THREE.Vector3());
    var n = new THREE.Vector3(-t.z, 0, t.x);
    var poleG = new THREE.CylinderGeometry(0.5, 0.5, 12, 10);
    var poleM = new THREE.MeshLambertMaterial({ color: 0x39415a });
    [-1.5, 1.5].forEach(function (s) {
      var pole = new THREE.Mesh(poleG, poleM);
      pole.position.set(mid.x + n.x * ROAD_HALF * s, 6, mid.z + n.z * ROAD_HALF * s);
      scene.add(pole);
    });
    var banner = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF * 3.4, 2.6, 0.6),
      new THREE.MeshLambertMaterial({ map: canvasTex(512, 64, function (x, w, h) {
        x.fillStyle = '#1c2136'; x.fillRect(0, 0, w, h);
        x.fillStyle = '#ffd166'; x.font = '900 40px Nunito, sans-serif';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('APEX GP  •  WISELY ARCADE', w / 2, h / 2);
      }) }));
    banner.position.set(mid.x, 11, mid.z);
    banner.rotation.y = Math.atan2(t.x, t.z);
    scene.add(banner);
  })();

  // Grandstand, floodlights, trees, clouds
  (function buildEnv() {
    var t0 = trackTangent(trackLen * 0.06, new THREE.Vector3());
    var n0 = new THREE.Vector3(-t0.z, 0, t0.x);
    var base = trackPoint(trackLen * 0.06, 0);
    // grandstand: stepped boxes
    var standM = new THREE.MeshLambertMaterial({ color: 0xe8e2f2 });
    var seatCols = [0xef4444, 0xf5f5f5, 0x3b82f6, 0xf5f5f5];
    for (var s = 0; s < 4; s++) {
      var tier = new THREE.Mesh(new THREE.BoxGeometry(60, 2.2, 5), standM);
      var bx = base.x + n0.x * (26 + s * 5.4) + t0.x * (s - 1.5) * 2;
      var bz = base.z + n0.z * (26 + s * 5.4) + t0.z * (s - 1.5) * 2;
      tier.position.set(bx, 1.5 + s * 2.4, bz);
      tier.rotation.y = Math.atan2(t0.x, t0.z) + Math.PI / 2;
      scene.add(tier);
      var seats = new THREE.Mesh(new THREE.BoxGeometry(58, 1.1, 4.2),
        new THREE.MeshLambertMaterial({ color: seatCols[s % 4] }));
      seats.position.set(bx, 2.9 + s * 2.4, bz);
      seats.rotation.y = tier.rotation.y;
      scene.add(seats);
    }
    var roof = new THREE.Mesh(new THREE.BoxGeometry(64, 1, 26),
      new THREE.MeshLambertMaterial({ color: 0x7c5cd6 }));
    roof.position.set(base.x + n0.x * 42, 13.5, base.z + n0.z * 42);
    roof.rotation.y = Math.atan2(t0.x, t0.z) + Math.PI / 2;
    scene.add(roof);
    // floodlights
    var poleM = new THREE.MeshLambertMaterial({ color: 0x4a5268 });
    for (var f = 0; f < 8; f++) {
      var sF = (f / 8) * trackLen;
      var side = f % 2 ? 1 : -1;
      var fp = trackPoint(sF, side * 3.2);
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 22, 8), poleM);
      pole.position.set(fp.x, 11, fp.z); scene.add(pole);
      var head = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.6, 0.8),
        new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
      head.position.set(fp.x, 22.4, fp.z); scene.add(head);
    }
    // trees
    var trunkM = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
    var leafM = new THREE.MeshLambertMaterial({ color: 0x3e7d3a });
    for (var k = 0; k < 90; k++) {
      var ang = Math.random() * Math.PI * 2, rad = 260 + Math.random() * 480;
      var tx = Math.cos(ang) * rad, tz = Math.sin(ang) * rad;
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1, 5, 6), trunkM);
      trunk.position.set(tx, 2.5, tz); scene.add(trunk);
      var sc = 0.8 + Math.random() * 1.4;
      var leaf = new THREE.Mesh(new THREE.ConeGeometry(4 * sc, 9 * sc, 7), leafM);
      leaf.position.set(tx, 5 + 4.5 * sc, tz); scene.add(leaf);
    }
    // clouds
    var cloudM = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (var c = 0; c < 10; c++) {
      var cl = new THREE.Group();
      for (var b = 0; b < 4; b++) {
        var puff = new THREE.Mesh(new THREE.SphereGeometry(9 + Math.random() * 8, 8, 6), cloudM);
        puff.position.set(b * 12 - 18 + Math.random() * 4, Math.random() * 3, Math.random() * 6);
        puff.scale.y = 0.55; cl.add(puff);
      }
      cl.position.set((Math.random() - 0.5) * 1400, 150 + Math.random() * 90, (Math.random() - 0.5) * 1400);
      scene.add(cl);
    }
  })();

  /* ================= Bikes ================= */
  function makeBike(color) {
    var g = new THREE.Group();
    var paint = new THREE.MeshLambertMaterial({ color: color });
    var dark = new THREE.MeshLambertMaterial({ color: 0x1a1d26 });
    var tireM = new THREE.MeshLambertMaterial({ color: 0x14161c });
    var metal = new THREE.MeshLambertMaterial({ color: 0x9aa2b5 });
    function box(w, h, d, m, x, y, z, rx) {
      var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z); if (rx) b.rotation.x = rx; g.add(b); return b;
    }
    // wheels
    var wheelG = new THREE.TorusGeometry(0.62, 0.24, 10, 20);
    var hubG = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 10);
    [[0, -1.55], [0, 1.55]].forEach(function (wpos) {
      var wh = new THREE.Mesh(wheelG, tireM);
      wh.position.set(wpos[0], 0.62, wpos[1]); wh.rotation.y = Math.PI / 2; g.add(wh);
      var hub = new THREE.Mesh(hubG, metal);
      hub.position.copy(wh.position); hub.rotation.z = Math.PI / 2; g.add(hub);
    });
    // chassis / fairings (nose points +Z)
    box(0.9, 0.55, 1.5, paint, 0, 1.05, 0.55, -0.12);          // main fairing
    box(0.7, 0.7, 0.9, paint, 0, 1.25, 1.35, -0.35);           // nose
    box(0.85, 0.5, 1.1, dark, 0, 0.95, -0.75);                 // tail unit
    box(0.5, 0.35, 0.5, dark, 0, 1.28, -1.35);                 // tail tip
    box(0.62, 0.28, 0.9, dark, 0, 1.32, -0.15);                // seat
    box(0.55, 0.42, 0.7, paint, 0, 1.42, 0.15);                // tank
    // windshield
    var shield = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.55 }));
    shield.position.set(0, 1.75, 1.62); shield.rotation.x = -0.5; g.add(shield);
    // fork + handlebar
    [[-0.22], [0.22]].forEach(function (fx) {
      var fork = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6), metal);
      fork.position.set(fx[0], 1.05, 1.45); fork.rotation.x = 0.42; g.add(fork);
    });
    var bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), dark);
    bar.position.set(0, 1.62, 1.15); bar.rotation.z = Math.PI / 2; g.add(bar);
    // exhaust
    var ex = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.1, 8), metal);
    ex.position.set(0.35, 0.75, -1.1); ex.rotation.x = Math.PI / 2 - 0.15; g.add(ex);
    // rider
    var suit = new THREE.MeshLambertMaterial({ color: 0x23262f });
    var torso = box(0.62, 0.75, 0.5, suit, 0, 1.85, 0.35, 0.55); // leaning forward
    var helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), paint);
    helmet.position.set(0, 2.05, 0.95); g.add(helmet);
    var visor = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0x0c0e14 }));
    visor.position.set(0, 2.06, 1.16); visor.scale.set(0.9, 0.6, 0.6); g.add(visor);
    [[-0.3], [0.3]].forEach(function (ax) {
      var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.85, 6), suit);
      arm.position.set(ax[0], 1.75, 0.85); arm.rotation.x = 1.0; g.add(arm);
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.8, 6), suit);
      leg.position.set(ax[0] * 1.15, 1.15, -0.35); leg.rotation.x = -0.7; g.add(leg);
    });
    // blob shadow
    var sh = new THREE.Mesh(new THREE.CircleGeometry(1.5, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.04; sh.scale.set(0.9, 1.6, 1); g.add(sh);
    g.userData.body = new THREE.Group();
    return g;
  }

  /* ================= Riders & physics ================= */
  var RIDER_COLORS = [0xe63946, 0x2a9d8f, 0xf4a261, 0x9b5de5, 0x00bbf9, 0xfee440];
  var riders = [];
  var stats = bikeStats();
  var level = 1;

  function resetRiders(lv) {
    level = lv; stats = bikeStats();
    riders.forEach(function (r) { scene.remove(r.mesh); });
    riders = [];
    // grid: player at the back, AI ahead in rows of two
    for (var i = 0; i < RIDERS; i++) {
      var isPlayer = (i === 0);
      var mesh = makeBike(isPlayer ? 0xe63946 : RIDER_COLORS[(i - 1) % RIDER_COLORS.length]);
      scene.add(mesh);
      var row = Math.floor(i / 2), col = (i % 2) ? 0.45 : -0.45;
      riders.push({
        mesh: mesh, isPlayer: isPlayer,
        s: -(2 - row) * 9, lat: col, speed: 0,
        lap: 1, done: false, finishTime: 0,
        wob: Math.random() * 10, skill: 0.9 + Math.random() * 0.2,
        nitro: 1, // 0..1 meter
        lean: 0, wheelSpin: 0
      });
    }
  }

  function aiLevel() { return 0.8 + (level - 1) * 0.022; } // rivals get faster

  var _p = new THREE.Vector3(), _t = new THREE.Vector3(), _p2 = new THREE.Vector3();
  function placeRider(r, dt) {
    trackPoint(r.s, r.lat, _p);
    trackTangent(r.s, _t);
    r.mesh.position.set(_p.x, 0, _p.z);
    var yaw = Math.atan2(_t.x, _t.z);
    r.mesh.rotation.y = yaw;
    r.mesh.rotation.z = -r.lean; // lean into corners
    r.wheelSpin += r.speed * dt * 1.4;
  }

  function stepPlayer(r, dt, input) {
    var st = stats;
    var nitroOn = input.nitro && r.nitro > 0.05 && r.speed > 8;
    var top = st.topSpeed * (nitroOn ? (1 + 0.15 * st.nitroPower) : 1);
    if (input.gas) r.speed += st.accel * (nitroOn ? 1.35 * st.nitroPower : 1) * dt;
    if (input.brake) r.speed -= 55 * dt;
    r.speed -= r.speed * 0.28 * dt; // drag
    if (nitroOn) r.nitro = Math.max(0, r.nitro - dt / (5 + st.nitroPower));
    else r.nitro = Math.min(1, r.nitro + dt / 9);
    // steering (smoothed: ramps like an analog stick, no more jerky taps)
    var steerT = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    r.steerSm = (r.steerSm || 0) + (steerT - (r.steerSm || 0)) * Math.min(1, dt * 7);
    var steer = r.steerSm;
    r.latV = (r.latV || 0) + steer * 3.0 * dt * Math.min(1, r.speed / 20);
    r.latV *= Math.pow(0.12, dt); // damping
    // centrifugal push
    var curv = trackCurve(r.s + r.speed * 0.45);
    var push = curv * r.speed * r.speed * 0.0035 / st.grip;
    r.lat += (r.latV - push) * dt * (0.55 + 0.45 * Math.min(1, r.speed / 40));
    // off track
    var aLat = Math.abs(r.lat);
    if (aLat > 1) {
      var grassDrag = (14 - 1.6 * st.grip);
      r.speed = Math.max(6, r.speed - grassDrag * dt);
      if (Math.random() < dt * 8) toast('Off track! Get back on the asphalt.');
    }
    if (aLat > 1.7) { r.lat = 1.7 * Math.sign(r.lat); r.speed *= (1 - 1.6 * dt); }
    r.speed = Math.max(0, Math.min(top, r.speed));
    r.lean += ((steer * 0.28 + Math.max(-0.5, Math.min(0.5, -push * 2.2))) - r.lean) * Math.min(1, dt * 8);
    r.s += r.speed * dt;
  }

  function stepAI(r, dt, elapsed) {
    var st = stats;
    var aiTop = st.topSpeed * aiLevel() * r.skill;
    var ahead = trackCurve(r.s + r.speed * 0.9);
    // corner speed: v = sqrt(aLat / |curv|)
    var cornerV = Math.abs(ahead) > 0.0004 ? Math.sqrt((26 * st.grip * 0) + 24 / Math.abs(ahead)) : aiTop;
    cornerV = Math.min(aiTop, cornerV);
    // rubber band vs player
    var pl = null;
    for (var pi = 0; pi < riders.length; pi++) if (riders[pi].isPlayer) pl = riders[pi];
    var gap = (pl.s + (pl.lap - 1) * trackLen) - (r.s + (r.lap - 1) * trackLen);
    var target = cornerV * (gap > 90 ? 1.06 : gap < -90 ? 0.95 : 1);
    if (r.speed < target) r.speed += 26 * dt; else r.speed -= 40 * dt;
    r.speed = Math.max(0, Math.min(aiTop * 1.05, r.speed));
    // racing line: cut to inside of upcoming corner
    var line = -Math.sign(ahead) * 0.55;
    if (Math.abs(ahead) < 0.002) line = Math.sin(elapsed * 0.4 + r.wob) * 0.35;
    // avoid slower rider ahead
    for (var i = 0; i < riders.length; i++) {
      var o = riders[i]; if (o === r) continue;
      var ds = o.s - r.s; if (ds < 0) ds += trackLen;
      if (ds < 7 && ds > 0 && Math.abs(o.lat - r.lat) < 0.3) { line = o.lat > 0 ? -0.6 : 0.6; break; }
    }
    var prevLat = r.lat;
    r.lat += (line - r.lat) * Math.min(1, dt * 2.2);
    var curv = trackCurve(r.s);
    r.lat -= curv * r.speed * r.speed * 0.0032 * dt;
    r.lat = Math.max(-1.55, Math.min(1.55, r.lat));
    r.lean += ((-(r.lat - prevLat) * 6 + Math.max(-0.5, Math.min(0.5, -curv * r.speed * 0.06))) - r.lean) * Math.min(1, dt * 6);
    r.s += r.speed * dt;
  }

  function collide() {
    for (var i = 0; i < riders.length; i++) for (var j = i + 1; j < riders.length; j++) {
      var a = riders[i], b = riders[j];
      var ds = Math.abs(a.s - b.s); if (ds > trackLen / 2) ds = trackLen - ds;
      var dl = a.lat - b.lat;
      if (ds < 4.2 && Math.abs(dl) < 0.32) {
        var push = (0.32 - Math.abs(dl)) * Math.sign(dl || (Math.random() - 0.5));
        a.lat += push * 0.5; b.lat -= push * 0.5;
        var avg = (a.speed + b.speed) / 2;
        a.speed += (avg - a.speed) * 0.3; b.speed += (avg - b.speed) * 0.3;
        if (a.isPlayer || b.isPlayer) { if (Math.random() < 0.1) toast('Bumped! Hold your line.'); }
      }
    }
  }

  /* ================= Camera ================= */
  var camPos = new THREE.Vector3(0, 60, -120);
  function updateCamera(r, dt) {
    trackPoint(r.s, r.lat, _p);
    trackTangent(r.s, _t);
    _p2.copy(_p).addScaledVector(_t, -13).add(new THREE.Vector3(0, 6.2, 0));
    // pull camera slightly to outside of lean
    _p2.x += -_t.z * r.lean * 3; _p2.z += _t.x * r.lean * 3;
    camPos.lerp(_p2, Math.min(1, dt * 5));
    camera.position.copy(camPos);
    _p.addScaledVector(_t, 22); _p.y = 2.5;
    camera.lookAt(_p);
    var targetFov = 62 + Math.min(1, r.speed / 75) * 14;
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3);
    camera.updateProjectionMatrix();
  }

  /* ================= HUD / minimap ================= */
  var el = function (id) { return document.getElementById(id); };
  var hud = el('ag-hud'), elPos = el('ag-pos'), elLap = el('ag-lap'),
      elTime = el('ag-time'), elSpeed = el('ag-speed'), elNitro = el('ag-nitrofill'),
      mm = el('ag-minimap'), mmx = mm.getContext('2d'),
      toastEl = el('ag-toast'), countEl = el('ag-count');
  var toastT = null;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    if (toastT) clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }
  var ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
  function fmtTime(t) {
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  // minimap track outline
  var mmPts = [];
  (function () {
    var minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (var i = 0; i < SAMPLES; i += 6) {
      var p = pts[i];
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
      mmPts.push(p);
    }
    mmPts.bbox = { minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ };
  })();
  function drawMinimap() {
    var W = mm.width, H = mm.height, bb = mmPts.bbox;
    mmx.clearRect(0, 0, W, H);
    function X(x) { return 10 + (x - bb.minX) / (bb.maxX - bb.minX) * (W - 20); }
    function Z(z) { return 10 + (z - bb.minZ) / (bb.maxZ - bb.minZ) * (H - 20); }
    mmx.strokeStyle = 'rgba(255,255,255,.75)'; mmx.lineWidth = 5; mmx.lineJoin = 'round';
    mmx.beginPath();
    mmPts.forEach(function (p, i) { if (i === 0) mmx.moveTo(X(p.x), Z(p.z)); else mmx.lineTo(X(p.x), Z(p.z)); });
    mmx.closePath(); mmx.stroke();
    riders.forEach(function (r) {
      trackPoint(r.s, r.lat, _p);
      mmx.fillStyle = r.isPlayer ? '#ffd166' : '#a78bfa';
      mmx.beginPath(); mmx.arc(X(_p.x), Z(_p.z), r.isPlayer ? 4.5 : 3, 0, 7); mmx.fill();
    });
  }
  function updateHUD(player, elapsed) {
    var prog = riders.map(function (r) { return { r: r, p: (r.lap - 1) * trackLen + r.s }; });
    prog.sort(function (a, b) { return b.p - a.p; });
    var pos = 1;
    prog.forEach(function (e, i) { if (e.r === player) pos = i + 1; });
    elPos.textContent = ORD[pos - 1] || pos + 'th';
    elLap.textContent = Math.min(player.lap, LAPS) + '/' + LAPS;
    elTime.textContent = fmtTime(elapsed);
    elSpeed.textContent = Math.round(player.speed * 3.6);
    elNitro.style.width = Math.round(player.nitro * 100) + '%';
    drawMinimap();
    return pos;
  }

  /* ================= Input ================= */
  var input = { gas: false, brake: false, left: false, right: false, nitro: false };
  var KEYMAP = { ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake',
                 ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
                 ShiftLeft: 'nitro', ShiftRight: 'nitro' };
  document.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.code];
    if (k) { input[k] = true; e.preventDefault(); }
  });
  document.addEventListener('keyup', function (e) {
    var k = KEYMAP[e.code];
    if (k) { input[k] = false; e.preventDefault(); }
  });
  function bindTouch(id, key) {
    var b = el(id);
    function on(e) { e.preventDefault(); input[key] = true; b.classList.add('on'); }
    function off(e) { e.preventDefault(); input[key] = false; b.classList.remove('on'); }
    b.addEventListener('touchstart', on, { passive: false });
    b.addEventListener('touchend', off); b.addEventListener('touchcancel', off);
    b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off);
  }
  bindTouch('t-gas', 'gas'); bindTouch('t-brake', 'brake');
  bindTouch('t-left', 'left'); bindTouch('t-right', 'right'); bindTouch('t-nitro', 'nitro');

  /* ================= Audio (tiny engine hum) ================= */
  var AC = null, engOsc = null, engGain = null, muted = false;
  function initAudio() {
    if (AC) return;
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      engOsc = AC.createOscillator(); engOsc.type = 'sawtooth';
      var filt = AC.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 420;
      engGain = AC.createGain(); engGain.gain.value = 0;
      engOsc.connect(filt); filt.connect(engGain); engGain.connect(AC.destination);
      engOsc.start();
    } catch (e) { AC = null; }
  }
  function engineSound(speed, on) {
    if (!AC || !engOsc) return;
    var t = AC.currentTime;
    engOsc.frequency.setTargetAtTime(55 + speed * 2.6, t, 0.06);
    engGain.gain.setTargetAtTime(!muted && on ? 0.05 + Math.min(0.05, speed / 1400) : 0, t, 0.1);
  }
  function beep(freq, dur) {
    if (!AC || muted) return;
    try {
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.18, AC.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
      o.connect(g); g.connect(AC.destination);
      o.start(); o.stop(AC.currentTime + dur);
    } catch (e) {}
  }

  /* ================= Game flow ================= */
  var menuEl = el('ag-menu'), garageEl = el('ag-garage'), resEl = el('ag-results');
  var state = 'menu'; // menu | garage | countdown | race | done
  var raceTime = 0, countT = 0, player = null, playerPos = 6;

  function show(elm) { [menuEl, garageEl, resEl].forEach(function (m) { m.classList.add('hidden'); }); if (elm) elm.classList.remove('hidden'); }
  function refreshMenu() {
    el('ag-menu-level').textContent = store.level;
    el('ag-menu-sub').innerHTML = '3 laps · 5 rivals · Level <b>' + store.level + '</b> of ' + LEVELS +
      '<br>Finish well to earn points, then spend them in the garage.<br>💰 You have <b>' + store.points + '</b> points.';
  }
  function startRace(lv) {
    initAudio();
    if (AC && AC.state === 'suspended') AC.resume();
    resetRiders(lv);
    player = null;
    for (var pi2 = 0; pi2 < riders.length; pi2++) if (riders[pi2].isPlayer) player = riders[pi2];
    raceTime = 0; state = 'countdown'; countT = 0;
    show(null); hud.style.display = 'flex';
    countEl.classList.remove('hidden');
    toast('Level ' + lv + ' — 3 laps. Good luck!');
  }
  function doCountdown(dt) {
    countT += dt;
    var n = Math.floor(countT);
    var label = n < 3 ? String(3 - n) : 'GO!';
    if (countEl.textContent !== label) {
      countEl.textContent = label;
      beep(n < 3 ? 440 : 880, n < 3 ? 0.18 : 0.5);
      countEl.style.transform = 'scale(1.25)';
      setTimeout(function () { countEl.style.transform = 'scale(1)'; }, 120);
    }
    if (countT >= 3.4) {
      countEl.classList.add('hidden'); state = 'race';
    }
  }
  function stepRace(dt) {
    raceTime += dt;
    riders.forEach(function (r) {
      if (r.done) return;
      if (r.isPlayer) stepPlayer(r, dt, input);
      else stepAI(r, dt, raceTime);
      placeRider(r, dt);
      // lap counting: s wraps past multiples of trackLen
      var lapNow = Math.floor(r.s / trackLen) + 1;
      if (lapNow > r.lap) {
        r.lap = lapNow;
        if (r.isPlayer) {
          if (r.lap <= LAPS) { toast(r.lap === LAPS ? 'Final lap — send it!' : 'Lap ' + r.lap + '/' + LAPS); beep(660, 0.15); }
          else finishRace(r);
        } else if (lapNow > LAPS && !r.done) { r.done = true; r.finishTime = raceTime; }
      }
    });
    collide();
    playerPos = updateHUD(player, raceTime);
    engineSound(player.speed, true);
    updateCamera(player, dt);
  }
  function finishRace(p) {
    p.done = true; p.finishTime = raceTime;
    state = 'done';
    engineSound(0, false);
    // let AI finish: positions by progress
    var prog = riders.map(function (r) {
      return { r: r, p: (Math.min(r.lap, LAPS + 1) - 1) * trackLen + (r.s % trackLen) };
    });
    prog.sort(function (a, b) { return b.p - a.p; });
    var pos = 1;
    prog.forEach(function (e, i) { if (e.r === p) pos = i + 1; });
    var earned = POINTS[pos - 1] || 20;
    store.points += earned;
    var unlocked = false;
    if (pos <= 3 && store.level < LEVELS) { store.level++; unlocked = true; }
    saveStore();
    var titles = ['🏆 Victory! Champion of the track!', '🥈 So close — P2!', '🥉 Podium! P3!', '🏁 P4 — points in the bag!', '🏁 P5 — keep pushing!', '🏁 P6 — the bike forgives, the track remembers.'];
    el('ag-res-title').textContent = titles[pos - 1];
    el('ag-res-sub').innerHTML = 'Level ' + level + ' · Time ' + fmtTime(raceTime) +
      '<br>💰 <b>+' + earned + ' points</b> (total ' + store.points + ')' +
      (unlocked ? '<br>🔓 <b>Level ' + store.level + ' unlocked!</b>' : (store.level >= LEVELS && pos <= 3 ? '<br>👑 You conquered all 10 levels — legend!' : ''));
    el('ag-next').style.display = (store.level > level || (unlocked)) ? '' : 'none';
    show(resEl);
    refreshMenu();
  }

  /* ================= Garage ================= */
  function renderGarage() {
    el('ag-points').textContent = store.points;
    el('ag-garage-level').textContent = store.level;
    var wrap = el('ag-upgrades'); wrap.innerHTML = '';
    Object.keys(UPS).forEach(function (key) {
      var u = UPS[key], lv = store.up[key], maxed = lv >= 5;
      var card = document.createElement('div'); card.className = 'up-card';
      var pips = '';
      for (var i = 0; i < 5; i++) pips += i < lv ? '●' : '○';
      var cost = maxed ? 'MAX' : u.costs[lv] + ' pts';
      card.innerHTML = '<h3>' + u.name + '</h3><div class="pips">' + pips + '</div><p>' + u.desc + '</p>';
      var btn = document.createElement('button');
      btn.className = 'btn' + (maxed || store.points < u.costs[lv] ? ' ghost' : '');
      btn.textContent = maxed ? 'Maxed out' : 'Upgrade — ' + cost;
      btn.disabled = maxed || store.points < u.costs[lv];
      btn.addEventListener('click', function () {
        if (store.points >= u.costs[lv] && store.up[key] < 5) {
          store.points -= u.costs[lv]; store.up[key]++; saveStore();
          beep(880, 0.2); renderGarage(); refreshMenu();
          toast(u.name + ' → stage ' + store.up[key] + '!');
        }
      });
      card.appendChild(btn); wrap.appendChild(card);
    });
  }

  el('ag-start').addEventListener('click', function () { startRace(store.level); });
  el('ag-garage-btn').addEventListener('click', function () { state = 'garage'; renderGarage(); show(garageEl); });
  el('ag-garage-back').addEventListener('click', function () { state = 'menu'; refreshMenu(); show(menuEl); });
  el('ag-garage-race').addEventListener('click', function () { startRace(store.level); });
  el('ag-next').addEventListener('click', function () { startRace(store.level); });
  el('ag-retry').addEventListener('click', function () { startRace(level); });
  el('ag-res-garage').addEventListener('click', function () { state = 'garage'; renderGarage(); show(garageEl); });

  /* ================= Main loop ================= */
  var last = performance.now(), idleT = 0;
  // idle attract: slow orbit around start line behind menu
  resetRiders(1);
  riders.forEach(function (r) { r.s = -30 - Math.random() * 40; r.lat = (Math.random() - 0.5); r.speed = 0; placeRider(r, 0.016); });
  refreshMenu();

  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (state === 'countdown') {
      riders.forEach(function (r) { placeRider(r, dt); });
      updateCamera(player, dt);
      doCountdown(dt);
    } else if (state === 'race') {
      stepRace(dt);
    } else if (state === 'done') {
      // slow-mo orbit of winner area
      idleT += dt * 0.3;
      var p = player || riders[riders.length - 1];
      trackPoint(p.s, p.lat, _p);
      camera.position.set(_p.x + Math.cos(idleT) * 30, 14, _p.z + Math.sin(idleT) * 30);
      camera.lookAt(_p.x, 2, _p.z);
      engineSound(0, false);
    } else {
      // menu/garage: cinematic pan over the grid
      idleT += dt * 0.12;
      trackPoint(-20, 0, _p); trackTangent(-20, _t);
      camera.position.set(_p.x - _t.x * 26 + Math.cos(idleT) * 8, 9, _p.z - _t.z * 26 + Math.sin(idleT) * 8);
      camera.lookAt(_p.x + _t.x * 14, 2, _p.z + _t.z * 14);
      if (camera.fov !== 58) { camera.fov = 58; camera.updateProjectionMatrix(); }
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  window.addEventListener('resize', function () {
    var w = canvas.clientWidth || 960;
    // keep 16:10 aspect
  });
})();
