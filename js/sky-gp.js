// Sky GP — Wisely Arcade
// Original 3D flying-car Grand Prix. Own name, own art, own code.
// Career: 10 levels, 3 laps vs 5 AI flying cars through golden rings.
// Time Trial: solo against the clock — every ring adds +2 seconds.
// Points buy Engine / Wings / Boost upgrades in the garage.
// Progress in localStorage (skygp_*).
(function () {
  'use strict';
  if (!window.THREE) return;

  /* ================= Config & persistence ================= */
  var LEVELS = 10, LAPS = 3, RIDERS = 6;
  var POINTS = [100, 75, 60, 45, 30, 20]; // by finishing position
  var UPS = {
    engine: { name: 'Engine', desc: '+7% top speed per stage. Pure sky-straight fury.', costs: [60, 120, 200, 300, 450] },
    wings:  { name: 'Wings',  desc: '+12% handling and climb rate per stage. Carve the sky.', costs: [50, 100, 170, 260, 380] },
    boost:  { name: 'Boost',  desc: '+25% boost power per stage. Longer, stronger burn.', costs: [50, 100, 170, 260, 380] }
  };
  function loadNum(k, d) { try { var v = parseInt(localStorage.getItem(k), 10); return isNaN(v) ? d : v; } catch (e) { return d; } }
  function saveNum(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function loadUp() {
    try {
      var u = JSON.parse(localStorage.getItem('skygp_upg') || 'null');
      if (u) return { engine: u.engine | 0, wings: u.wings | 0, boost: u.boost | 0 };
    } catch (e) {}
    return { engine: 0, wings: 0, boost: 0 };
  }
  var store = {
    level: Math.min(Math.max(loadNum('skygp_level', 1), 1), LEVELS),
    points: loadNum('skygp_points', 0),
    best: loadNum('skygp_best', 0), // best time-trial ring count
    up: loadUp()
  };
  function saveStore() {
    saveNum('skygp_level', store.level); saveNum('skygp_points', store.points);
    saveNum('skygp_best', store.best);
    try { localStorage.setItem('skygp_upg', JSON.stringify(store.up)); } catch (e) {}
  }
  function carStats() {
    return {
      topSpeed: 56 * (1 + 0.07 * store.up.engine),
      accel: 27 * (1 + 0.04 * store.up.engine),
      latRate: 30 * (1 + 0.12 * store.up.wings),   // max lateral m/s
      climbRate: 11 * (1 + 0.12 * store.up.wings), // max climb m/s
      boostPower: 1 + 0.25 * store.up.boost
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
  scene.background = new THREE.Color(0x87bfe8);
  scene.fog = new THREE.Fog(0x87bfe8, 280, 1700);

  var camera = new THREE.PerspectiveCamera(62, 960 / 600, 0.5, 4500);

  var hemi = new THREE.HemisphereLight(0xbfdcff, 0x8a9a6a, 0.95);
  scene.add(hemi);
  var sunLight = new THREE.DirectionalLight(0xfff2d8, 0.95);
  sunLight.position.set(300, 420, 180);
  scene.add(sunLight);

  // visible sun disc + glow (fixed in the sky, fog-proof)
  (function buildSun() {
    var dir = new THREE.Vector3(0.42, 0.46, -0.72).normalize();
    var glow = new THREE.Mesh(new THREE.CircleGeometry(210, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff7cf, transparent: true, opacity: 0.35, fog: false }));
    glow.position.copy(dir).multiplyScalar(2600); glow.lookAt(0, 0, 0); scene.add(glow);
    var disc = new THREE.Mesh(new THREE.CircleGeometry(95, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false }));
    disc.position.copy(dir).multiplyScalar(2550); disc.lookAt(0, 0, 0); scene.add(disc);
  })();

  /* ================= Track (floating spline) ================= */
  var SAMPLES = 900;
  var BASE_CTRL = [ // [x, z, altitude] — a gentle sky circuit, y ≈ 62–92
    [0, -200, 78], [110, -195, 66], [190, -150, 84], [215, -70, 72], [170, -10, 90],
    [180, 70, 68], [120, 130, 82], [30, 110, 64], [-50, 140, 86], [-90, 80, 74],
    [-160, 90, 92], [-200, 20, 70], [-160, -60, 84], [-170, -140, 64], [-90, -170, 80]
  ];
  // deterministic per-level randomness: same map on every visit
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // every level is its own sky: own layout, own DAYTIME theme
  var THEMES = [
    { name: 'Morning Blue',      sky: 0x87bfe8, hemi: 0xbfdcff, accent: '#0284c7', accentN: 0x38bdf8 },
    { name: 'Dawn Glow',         sky: 0xf6cf9e, hemi: 0xffd9b0, accent: '#ea580c', accentN: 0xfb923c },
    { name: 'Fresh Sky',         sky: 0x8fd3e8, hemi: 0xc4ecf5, accent: '#0d9488', accentN: 0x2dd4bf },
    { name: 'Midday Bright',     sky: 0x5fb2ec, hemi: 0xbfe0ff, accent: '#2563eb', accentN: 0x60a5fa },
    { name: 'Azure Coast',       sky: 0x67c6de, hemi: 0xc2ecf2, accent: '#0891b2', accentN: 0x22d3ee },
    { name: 'Golden Afternoon',  sky: 0xf2cd8f, hemi: 0xffe3ae, accent: '#d97706', accentN: 0xfbbf24 },
    { name: 'Peach Sky',         sky: 0xf6c6c8, hemi: 0xffdfe0, accent: '#db2777', accentN: 0xf472b6 },
    { name: 'Crystal Clear',     sky: 0xa5dcf2, hemi: 0xd8f3ff, accent: '#0284c7', accentN: 0x38bdf8 },
    { name: 'Tropical Noon',     sky: 0x5fc9d9, hemi: 0xc0f2e8, accent: '#059669', accentN: 0x34d399 },
    { name: "Champion's Sunrise", sky: 0xffd9a0, hemi: 0xffe7bd, accent: '#b45309', accentN: 0xf59e0b }
  ];
  function layoutFor(lv) {
    if (lv === 1) return BASE_CTRL.map(function (p) { return new THREE.Vector3(p[0], p[2], p[1]); });
    var rand = rng(lv * 7919 + 101);
    var rot = rand() * Math.PI * 2, cos = Math.cos(rot), sin = Math.sin(rot);
    var mirror = (lv % 2 === 0) ? -1 : 1;
    var raw = BASE_CTRL.map(function (p, i) {
      var x = p[0] * (0.84 + rand() * 0.36) * mirror;
      var z = p[1] * (0.84 + rand() * 0.36);
      var y = 74 + Math.sin(i * 1.93 + lv * 2.7) * 11 + (rand() * 8 - 4);
      y = Math.max(56, Math.min(96, y));
      return [x * cos - z * sin, x * sin + z * cos, y];
    });
    var n = raw.length;
    return raw.map(function (p, i) {
      var a = raw[(i + n - 1) % n], b = raw[(i + 1) % n];
      return new THREE.Vector3(
        p[0] * 0.7 + (a[0] + b[0]) * 0.15,
        p[2] * 0.7 + (a[2] + b[2]) * 0.15,
        p[1] * 0.7 + (a[1] + b[1]) * 0.15);
    });
  }
  var curve = null, pts = [], tans = [], curvs = [], trackLen = 0, segLen = 1;
  function computeTrack(ctrl) {
    curve = new THREE.CatmullRomCurve3(ctrl, true, 'catmullrom', 0.6);
    pts = curve.getSpacedPoints(SAMPLES);
    trackLen = curve.getLength();
    segLen = trackLen / SAMPLES;
    tans = []; curvs = [];
    for (var i = 0; i < SAMPLES; i++) {
      var a = pts[i], b = pts[(i + 1) % SAMPLES], c = pts[(i + 2) % SAMPLES];
      var t1 = new THREE.Vector3().subVectors(b, a).normalize();
      var t2 = new THREE.Vector3().subVectors(c, b).normalize();
      tans.push(t1.clone());
      var cross = t1.x * t2.z - t1.z * t2.x;
      var dot = Math.max(-1, Math.min(1, t1.dot(t2)));
      curvs.push(Math.atan2(cross, dot) / segLen);
    }
  }
  // s = arclength, lat = lateral metres (left +), alt = metres above the spline
  function trackPoint(s, lat, alt, out) {
    s = ((s % trackLen) + trackLen) % trackLen;
    var f = s / segLen, i0 = Math.floor(f) % SAMPLES, fr = f - Math.floor(f);
    var p0 = pts[i0], p1 = pts[(i0 + 1) % SAMPLES];
    out = out || new THREE.Vector3();
    out.lerpVectors(p0, p1, fr);
    var t = tans[i0];
    var nx = -t.z, nz = t.x, nl = Math.sqrt(nx * nx + nz * nz) || 1;
    out.x += (nx / nl) * lat;
    out.z += (nz / nl) * lat;
    out.y += alt || 0;
    return out;
  }
  function trackTangent(s, out) {
    s = ((s % trackLen) + trackLen) % trackLen;
    out = out || new THREE.Vector3();
    return out.copy(tans[Math.floor(s / segLen) % SAMPLES]);
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

  /* ================= Sky-lane (faint holo ribbon + glow edges) ================= */
  function buildLane(grp, th) {
    function ribbon(lat0, lat1, yOff, mat) {
      var pos = [], idx = [];
      for (var i = 0; i <= SAMPLES; i++) {
        var s = (i % SAMPLES) * segLen;
        var pL = trackPoint(s, lat0, yOff), pR = trackPoint(s, lat1, yOff);
        pos.push(pL.x, pL.y, pL.z, pR.x, pR.y, pR.z);
        if (i < SAMPLES) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      grp.add(new THREE.Mesh(g, mat));
    }
    ribbon(-17, 17, -1.6, new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.10, depthWrite: false, side: THREE.DoubleSide }));
    var edgeMat = new THREE.MeshBasicMaterial({
      color: th.accentN, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
    ribbon(-17.6, -16.6, -1.6, edgeMat);
    ribbon(16.6, 17.6, -1.6, edgeMat);
  }

  // Start gate: floating pylons + banner + golden start ring
  function buildStart(grp, th) {
    var mid = trackPoint(0, 0, 0), t = trackTangent(0, new THREE.Vector3());
    var n = new THREE.Vector3(-t.z, 0, t.x).normalize();
    var poleM = new THREE.MeshLambertMaterial({ color: 0x5b7a99 });
    [-21, 21].forEach(function (lat) {
      var pole = new THREE.Mesh(new THREE.BoxGeometry(1.6, 26, 1.6), poleM);
      pole.position.set(mid.x + n.x * lat, mid.y + 3, mid.z + n.z * lat);
      pole.rotation.y = Math.atan2(t.x, t.z);
      grp.add(pole);
      var tip = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6),
        new THREE.MeshBasicMaterial({ color: th.accentN }));
      tip.position.set(pole.position.x, mid.y + 16.5, pole.position.z);
      grp.add(tip);
    });
    var banner = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF_BANNER, 2.6, 0.6),
      new THREE.MeshLambertMaterial({ map: canvasTex(512, 64, function (x, w, h) {
        x.fillStyle = '#0e4a75'; x.fillRect(0, 0, w, h);
        x.fillStyle = '#ffffff'; x.font = '900 38px Nunito, sans-serif';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('SKY GP  •  WISELY ARCADE', w / 2, h / 2);
      }) }));
    banner.position.set(mid.x, mid.y + 14.5, mid.z);
    banner.rotation.y = Math.atan2(t.x, t.z);
    grp.add(banner);
  }
  var ROAD_HALF_BANNER = 43;

  /* ================= Rings ================= */
  var RING_RADIUS = 7;
  var rings = []; // {s, lat, alt, mesh, mat, flashT}
  var nextRingIdx = 0, ringLapBase = 0, ringsHit = 0;
  function buildRings(grp, rand) {
    rings = [];
    var count = Math.max(6, Math.round(trackLen / 200));
    var spacing = trackLen / count;
    for (var i = 0; i < count; i++) {
      var s = (i + 0.5) * spacing + (rand() - 0.5) * 50;
      var lat = (rand() * 2 - 1) * 13;
      var alt = 2 + rand() * 15;
      var mat = new THREE.MeshBasicMaterial({ color: 0x9a7b24 });
      var mesh = new THREE.Mesh(new THREE.TorusGeometry(RING_RADIUS, 0.45, 10, 28), mat);
      var p = trackPoint(s, lat, alt), t = trackTangent(s, new THREE.Vector3());
      mesh.position.copy(p);
      mesh.lookAt(p.clone().add(t));
      grp.add(mesh);
      rings.push({ s: s, lat: lat, alt: alt, mesh: mesh, mat: mat, flashT: 0 });
    }
    nextRingIdx = 0; ringLapBase = 0; ringsHit = 0;
    highlightRings();
  }
  function highlightRings() {
    rings.forEach(function (r, i) {
      if (r.flashT > 0) return;
      r.mat.color.setHex(i === nextRingIdx ? 0xffd23c : 0x9a7b24);
    });
  }

  /* ================= Clouds ================= */
  var clouds = [];
  function buildClouds(grp, rand) {
    clouds = [];
    var mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, flatShading: true });
    for (var i = 0; i < 34; i++) {
      var cl = new THREE.Group();
      var puffs = 3 + Math.floor(rand() * 3);
      for (var j = 0; j < puffs; j++) {
        var r = 3.5 + rand() * 5.5;
        var b = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 6), mat);
        b.position.set((rand() - 0.5) * 11, (rand() - 0.5) * 2.4, (rand() - 0.5) * 6);
        b.scale.y = 0.55;
        cl.add(b);
      }
      var s = rand() * trackLen;
      var side = rand() < 0.5 ? -1 : 1;
      var lat = side * (30 + rand() * 110);
      var alt = -58 + rand() * 100; // some below the lane, some above
      var p = trackPoint(s, lat, alt);
      cl.position.copy(p);
      var sc = 0.8 + rand() * 1.3; cl.scale.set(sc, sc, sc);
      grp.add(cl);
      clouds.push({ g: cl, spd: 0.5 + rand() * 1.1 });
    }
  }
  function stepClouds(dt) {
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      c.g.position.x += c.spd * dt;
      if (c.g.position.x > 850) c.g.position.x = -850;
    }
  }

  /* ================= Ground far below ================= */
  function buildGround(grp, rand) {
    var tex = canvasTex(512, 512, function (x, w, h) {
      var greens = ['#79a85b', '#8ab56a', '#6d9c4f', '#a9bf74', '#c2b280', '#9db873'];
      var cell = 64;
      for (var r = 0; r < h / cell; r++) for (var c = 0; c < w / cell; c++) {
        x.fillStyle = greens[Math.floor(Math.random() * greens.length)];
        x.fillRect(c * cell, r * cell, cell, cell);
        if (Math.random() < 0.3) { // a field road / plot line
          x.fillStyle = 'rgba(120,100,70,.5)';
          x.fillRect(c * cell, r * cell + cell / 2 - 2, cell, 4);
        }
      }
    }, 7, 7);
    var g = new THREE.Mesh(new THREE.PlaneGeometry(4200, 4200),
      new THREE.MeshLambertMaterial({ map: tex }));
    g.rotation.x = -Math.PI / 2; g.position.y = -140;
    grp.add(g);
    // toy city cluster
    var cols = [0xb8bec9, 0xd8cfc0, 0x9fb4c8, 0xc9c2b4, 0xaebfd4];
    var mats = cols.map(function (c) { return new THREE.MeshLambertMaterial({ color: c }); });
    for (var i = 0; i < 140; i++) {
      var bw = 14 + rand() * 20, bd = 14 + rand() * 20, bh = 12 + rand() * 42;
      var b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mats[i % mats.length]);
      b.position.set(120 + (rand() - 0.5) * 320, -140 + bh / 2, 60 + (rand() - 0.5) * 320);
      grp.add(b);
    }
  }

  /* ================= Birds ================= */
  var flocks = [];
  function makeBird() {
    var g = new THREE.Group();
    var dark = new THREE.MeshLambertMaterial({ color: 0x37404d });
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 6, 5), dark);
    body.scale.set(0.8, 0.7, 2.3); g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), dark);
    head.position.set(0, 0.08, 0.75); g.add(head);
    var beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.4, 5),
      new THREE.MeshLambertMaterial({ color: 0xf59e0b }));
    beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.08, 1.05); g.add(beak);
    function wing(side) {
      var geo = new THREE.BoxGeometry(1.6, 0.06, 0.55);
      geo.translate(side * 0.8, 0, 0);
      var w = new THREE.Mesh(geo, dark);
      w.position.set(side * 0.15, 0.12, 0);
      g.add(w); return w;
    }
    g.userData.wl = wing(-1);
    g.userData.wr = wing(1);
    return g;
  }
  function buildBirds(grp, rand) {
    flocks = [];
    for (var f = 0; f < 3; f++) {
      var g = new THREE.Group();
      var birds = [];
      var offs = [[0, 0, 0]];
      for (var k = 1; k <= 3; k++) { offs.push([-1.7 * k, 0.25 * k, -1.5 * k]); offs.push([1.7 * k, 0.25 * k, -1.5 * k]); }
      for (var b = 0; b < offs.length; b++) {
        var bird = makeBird();
        bird.position.set(offs[b][0], offs[b][1], offs[b][2]);
        g.add(bird);
        birds.push({ g: bird, off: new THREE.Vector3(offs[b][0], offs[b][1], offs[b][2]), phase: rand() * 6.28 });
      }
      grp.add(g);
      var anchorS = (f / 3) * trackLen + rand() * 120;
      flocks.push({
        g: g, birds: birds,
        anchor: trackPoint(anchorS, (rand() - 0.5) * 10, 5),
        radius: 17 + rand() * 8, ang: rand() * 6.28,
        angSpd: (0.055 + rand() * 0.035) * (f % 2 ? -1 : 1),
        scatterT: 0, cooldown: 0
      });
    }
  }
  var _bv = new THREE.Vector3();
  function stepBirds(dt, t) {
    for (var f = 0; f < flocks.length; f++) {
      var fl = flocks[f];
      fl.ang += fl.angSpd * dt;
      var cx = fl.anchor.x + Math.cos(fl.ang) * fl.radius;
      var cz = fl.anchor.z + Math.sin(fl.ang) * fl.radius;
      var cy = fl.anchor.y + Math.sin(fl.ang * 0.9) * 3.5;
      fl.g.position.set(cx, cy, cz);
      var dirx = -Math.sin(fl.ang) * Math.sign(fl.angSpd), dirz = Math.cos(fl.ang) * Math.sign(fl.angSpd);
      fl.g.rotation.y = Math.atan2(dirx, dirz);
      if (fl.scatterT > 0) fl.scatterT = Math.max(0, fl.scatterT - dt * 0.8);
      if (fl.cooldown > 0) fl.cooldown -= dt;
      for (var b = 0; b < fl.birds.length; b++) {
        var bd = fl.birds[b];
        var sc = 1 + fl.scatterT * 0.9;
        bd.g.position.set(bd.off.x * sc, bd.off.y + fl.scatterT * 2.2, bd.off.z * sc);
        var flap = Math.sin(t * 9 + bd.phase) * 0.55;
        bd.g.userData.wl.rotation.z = -flap;
        bd.g.userData.wr.rotation.z = flap;
      }
    }
  }
  function birdHitCheck(p) {
    if (!p || p.done) return;
    for (var f = 0; f < flocks.length; f++) {
      var fl = flocks[f];
      if (fl.cooldown > 0) continue;
      for (var b = 0; b < fl.birds.length; b++) {
        fl.birds[b].g.getWorldPosition(_bv);
        if (_bv.distanceToSquared(p.mesh.position) < 17.6) { // ~4.2 m
          p.speed *= 0.55;
          fl.scatterT = 1; fl.cooldown = 2;
          toast('🪶 BIRDS! Watch the flock!');
          beep(196, 0.22);
          return;
        }
      }
    }
  }

  /* ================= Airplanes (ambient, no collision) ================= */
  var planes = [];
  function makePlane() {
    var g = new THREE.Group();
    var white = new THREE.MeshLambertMaterial({ color: 0xf4f7fa });
    var blue = new THREE.MeshLambertMaterial({ color: 0x2563eb });
    var fus = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 24, 12), white);
    fus.rotation.x = Math.PI / 2; g.add(fus);
    var nose = new THREE.Mesh(new THREE.SphereGeometry(2.0, 10, 8), white);
    nose.position.z = 12; nose.scale.z = 1.4; g.add(nose);
    var tail = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.0, 5, 10), white);
    tail.rotation.x = Math.PI / 2; tail.position.z = -14; g.add(tail);
    var wing = new THREE.Mesh(new THREE.BoxGeometry(27, 0.35, 4.6), white);
    wing.position.set(0, -0.4, 1); g.add(wing);
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.2, 3.6), blue);
    fin.position.set(0, 3.2, -14.5); g.add(fin);
    var hstab = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.3, 3), white);
    hstab.position.set(0, 1.2, -14.5); g.add(hstab);
    [-7.5, 7.5].forEach(function (x) {
      var eng = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 3.4, 8), blue);
      eng.rotation.x = Math.PI / 2; eng.position.set(x, -1.3, 1.6); g.add(eng);
    });
    var stripe = new THREE.Mesh(new THREE.BoxGeometry(4.06, 0.55, 19), blue);
    stripe.position.y = 0.45; g.add(stripe);
    // contrails: crossed ribbons with fading gradient, trailing behind
    var ctex = canvasTex(128, 16, function (x, w, h) {
      var gr = x.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(1, 'rgba(255,255,255,0.55)');
      x.fillStyle = gr; x.fillRect(0, 0, w, h);
    });
    var cmat = new THREE.MeshBasicMaterial({ map: ctex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
    // length runs along local X with the opaque (u=1) end at +X; rotate so +X
    // points forward (+Z of the jet) and park the ribbon behind the tail.
    var geoV = new THREE.PlaneGeometry(120, 2.8);
    var geoH = geoV.clone(); geoH.rotateX(-Math.PI / 2); // flat copy, seen from above/below
    [geoV, geoH].forEach(function (geo) {
      var rib = new THREE.Mesh(geo, cmat);
      rib.rotation.y = -Math.PI / 2;
      rib.position.z = -16 - 60;
      g.add(rib);
    });
    return g;
  }
  function buildPlanes() {
    planes = [];
    var defs = [
      { R: 500, alt: 215, spd: 52, phase: 0.4, dir: 1 },
      { R: 660, alt: 255, spd: 46, phase: 2.6, dir: -1 }
    ];
    defs.forEach(function (d) {
      var m = makePlane();
      m.scale.set(1.5, 1.5, 1.5);
      scene.add(m);
      planes.push({ mesh: m, R: d.R, alt: d.alt, spd: d.spd, ang: d.phase, dir: d.dir });
    });
  }
  buildPlanes();
  function stepPlanes(dt) {
    for (var i = 0; i < planes.length; i++) {
      var p = planes[i];
      p.ang += (p.spd / p.R) * p.dir * dt;
      var x = Math.cos(p.ang) * p.R, z = Math.sin(p.ang) * p.R;
      p.mesh.position.set(x, p.alt, z);
      var na = p.ang + 0.02 * p.dir;
      p.mesh.lookAt(Math.cos(na) * p.R, p.alt, Math.sin(na) * p.R);
    }
  }

  /* ================= Flying cars ================= */
  function makeFlyCar(color) {
    var g = new THREE.Group();
    var paint = new THREE.MeshLambertMaterial({ color: color });
    var dark = new THREE.MeshLambertMaterial({ color: 0x14161c });
    var glass = new THREE.MeshLambertMaterial({ color: 0x9fd4ea });
    var metal = new THREE.MeshLambertMaterial({ color: 0x9aa2b5 });
    function box(w, h, d, m, x, y, z) {
      var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z); g.add(b); return b;
    }
    // sleek car body (nose +Z)
    box(2.0, 0.55, 4.4, paint, 0, 0.75, 0);
    var nose = box(1.7, 0.42, 1.2, paint, 0, 0.68, 2.6); nose.rotation.x = 0.1;
    box(1.5, 0.52, 1.6, glass, 0, 1.18, -0.2);           // glass cabin
    box(1.7, 0.32, 1.0, paint, 0, 1.05, -1.6);           // rear deck
    box(0.5, 0.02, 4.42, new THREE.MeshLambertMaterial({ color: 0xffffff }), 0, 1.04, 0); // stripe
    // main wings + canard
    box(5.4, 0.13, 1.15, paint, 0, 0.62, -0.5);
    box(2.6, 0.1, 0.7, paint, 0, 0.66, 2.2);
    // wingtip nav lights (port red / starboard green)
    box(0.22, 0.22, 0.22, new THREE.MeshBasicMaterial({ color: 0xff3b30 }), -2.75, 0.62, -0.5);
    box(0.22, 0.22, 0.22, new THREE.MeshBasicMaterial({ color: 0x34e07a }), 2.75, 0.62, -0.5);
    // tail fin + rear wing
    box(0.14, 1.05, 0.9, paint, 0, 1.5, -2.0);
    box(2.2, 0.12, 0.55, paint, 0, 1.95, -2.05);
    // tucked wheels
    var wg = new THREE.CylinderGeometry(0.42, 0.42, 0.36, 12);
    [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]].forEach(function (wp) {
      var wh = new THREE.Mesh(wg, dark);
      wh.rotation.z = Math.PI / 2; wh.position.set(wp[0], 0.42, wp[1]); g.add(wh);
    });
    // headlights
    var hlM = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
    box(0.35, 0.18, 0.1, hlM, -0.6, 0.78, 3.18);
    box(0.35, 0.18, 0.1, hlM, 0.6, 0.78, 3.18);
    // glowing thrusters (rear underside) — pulse with speed
    var thM = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
    var thr = [];
    [-0.55, 0.55].forEach(function (x) {
      var disc = new THREE.Mesh(new THREE.CircleGeometry(0.34, 12), thM);
      disc.position.set(x, 0.62, -2.24); disc.rotation.y = Math.PI;
      g.add(disc); thr.push(disc);
    });
    g.userData.thrusters = thr;
    return g;
  }

  /* ================= Riders & flight physics ================= */
  var RIDER_COLORS = [0xe63946, 0x2563eb, 0xf59e0b, 0x8b5cf6, 0x10b981, 0xec4899];
  var riders = [];
  var stats = carStats();
  var level = 1, mode = 'career'; // 'career' | 'tt'

  function resetRiders(lv, solo) {
    level = lv; stats = carStats();
    riders.forEach(function (r) { scene.remove(r.mesh); });
    riders = [];
    var n = solo ? 1 : RIDERS;
    for (var i = 0; i < n; i++) {
      var isPlayer = (i === 0);
      var mesh = makeFlyCar(isPlayer ? 0xe63946 : RIDER_COLORS[i % RIDER_COLORS.length]);
      scene.add(mesh);
      var row = Math.floor(i / 2), col = (i % 2) ? 5 : -5;
      riders.push({
        mesh: mesh, isPlayer: isPlayer,
        s: -(2 - row) * 11, lat: col, alt: row * 3, speed: 0,
        latV: 0, altV: 0, steerSm: 0, altSm: 0, roll: 0, pitch: 0,
        lap: 1, done: false, finishTime: 0,
        wob: Math.random() * 10, skill: 0.9 + Math.random() * 0.2,
        boost: 1
      });
    }
  }
  function aiLevel() { return 0.8 + (level - 1) * 0.022; }

  var _p = new THREE.Vector3(), _t = new THREE.Vector3(), _p2 = new THREE.Vector3(), _look = new THREE.Vector3();
  function placeRider(r) {
    trackPoint(r.s, r.lat, r.alt, _p);
    trackTangent(r.s, _t);
    r.mesh.position.copy(_p);
    _look.copy(_p).add(_t);
    r.mesh.lookAt(_look);
    r.mesh.rotateZ(r.roll || 0);       // banking
    r.mesh.rotateX(r.pitch || 0);      // climb/dive visual
    var th = r.mesh.userData.thrusters;
    if (th) {
      var pulse = 0.8 + Math.min(1.6, r.speed / 40) + Math.sin(performance.now() * 0.03) * 0.12;
      th.forEach(function (d) { d.scale.set(pulse, pulse, 1); });
    }
  }

  function stepPlayer(r, dt, input) {
    var st = stats;
    var boosting = (input.boost && r.boost > 0.03 && r.speed > 5);
    var top = st.topSpeed * (boosting ? (1 + 0.16 * st.boostPower) : 1);
    if (r.speed < top) r.speed += st.accel * (boosting ? 1.5 * st.boostPower : 1) * dt;
    else r.speed = Math.max(top, r.speed - 34 * dt);
    r.speed -= r.speed * 0.06 * dt; // light air drag
    if (boosting) r.boost = Math.max(0, r.boost - dt / (4.5 + st.boostPower));
    else r.boost = Math.min(1, r.boost + dt / 9);
    // lateral (smoothed, like Nitro's steering fix)
    var steerT = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    r.steerSm += (steerT - r.steerSm) * Math.min(1, dt * 7);
    r.latV += ((r.steerSm * st.latRate) - r.latV) * Math.min(1, dt * 6);
    r.lat += r.latV * dt;
    if (r.lat > 16.5) { r.lat = 16.5; r.latV *= 0.3; }
    if (r.lat < -16.5) { r.lat = -16.5; r.latV *= 0.3; }
    // altitude (smoothed)
    var altT = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    r.altSm += (altT - r.altSm) * Math.min(1, dt * 7);
    r.altV += ((r.altSm * st.climbRate) - r.altV) * Math.min(1, dt * 6);
    r.alt += r.altV * dt;
    if (r.alt > 20) { r.alt = 20; r.altV = Math.min(0, r.altV); }
    if (r.alt < -6) { r.alt = -6; r.altV = Math.max(0, r.altV); }
    // visuals: bank into the move, nose follows the climb
    r.roll += ((r.steerSm * 0.55) - r.roll) * Math.min(1, dt * 8);
    r.pitch += ((-r.altV * 0.016) - r.pitch) * Math.min(1, dt * 8);
    r.s += r.speed * dt;
  }

  function stepAI(r, dt, elapsed) {
    var st = stats;
    var aiTop = st.topSpeed * aiLevel() * r.skill;
    var pl = riders[0];
    var gap = (pl.lap - 1) * trackLen + pl.s - ((r.lap - 1) * trackLen + r.s);
    var target = aiTop * (gap > 90 ? 1.06 : gap < -90 ? 0.95 : 1);
    if (r.speed < target) r.speed += 24 * dt; else r.speed -= 34 * dt;
    r.speed = Math.max(0, Math.min(aiTop * 1.05, r.speed));
    // wander the sky: slow sinusoidal line + altitude, avoid the car ahead
    var latT = Math.sin(elapsed * 0.35 + r.wob) * 9;
    var altT = 7 + Math.sin(elapsed * 0.27 + r.wob * 1.3) * 5.5;
    for (var i = 0; i < riders.length; i++) {
      var o = riders[i]; if (o === r) continue;
      var ds = o.s - r.s; if (ds < 0) ds += trackLen;
      if (ds < 9 && ds > 0 && Math.abs(o.lat - r.lat) < 5 && Math.abs(o.alt - r.alt) < 4) {
        latT = o.lat > r.lat ? o.lat - 8 : o.lat + 8; altT = o.alt + 5; break;
      }
    }
    var prevLat = r.lat;
    r.lat += Math.max(-st.latRate * 0.7 * dt, Math.min(st.latRate * 0.7 * dt, latT - r.lat));
    r.alt += Math.max(-st.climbRate * 0.8 * dt, Math.min(st.climbRate * 0.8 * dt, altT - r.alt));
    r.lat = Math.max(-15.5, Math.min(15.5, r.lat));
    r.alt = Math.max(-4, Math.min(19, r.alt));
    r.roll += ((-(r.lat - prevLat) * 2.2) - r.roll) * Math.min(1, dt * 6);
    r.pitch = 0;
    r.s += r.speed * dt;
  }

  function collide() {
    for (var i = 0; i < riders.length; i++) for (var j = i + 1; j < riders.length; j++) {
      var a = riders[i], b = riders[j];
      var ds = Math.abs(a.s - b.s); if (ds > trackLen / 2) ds = trackLen - ds;
      var dl = a.lat - b.lat, da = a.alt - b.alt;
      if (ds < 4.4 && Math.abs(dl) < 4.6 && Math.abs(da) < 2.6) {
        var push = (4.6 - Math.abs(dl)) * 0.14 * Math.sign(dl || (Math.random() - 0.5));
        a.lat += push; b.lat -= push;
        var avg = (a.speed + b.speed) / 2;
        a.speed += (avg - a.speed) * 0.3; b.speed += (avg - b.speed) * 0.3;
        if ((a.isPlayer || b.isPlayer) && Math.random() < 0.1) toast('Bumped! Hold your line.');
      }
    }
  }

  /* ================= Rings (player only) ================= */
  function checkRings(r) {
    if (!rings.length) return;
    var nextAbs = ringLapBase + rings[nextRingIdx].s;
    if (r.s < nextAbs) return;
    var ring = rings[nextRingIdx];
    var dl = r.lat - ring.lat, da = r.alt - ring.alt;
    if (Math.sqrt(dl * dl + da * da) < RING_RADIUS) {
      ringsHit++;
      ring.flashT = 0.6;
      ring.mat.color.setHex(0x37e08b);
      r.boost = Math.min(1, r.boost + 0.35);
      chime();
      if (mode === 'tt') { ttTime += 2; toast('⏱️ +2s — ring ' + ringsHit + '!'); }
      else if (ringsHit % 3 === 0) toast('💍 ' + ringsHit + ' rings!');
    }
    nextRingIdx++;
    if (nextRingIdx >= rings.length) { nextRingIdx = 0; ringLapBase += trackLen; }
    highlightRings();
  }

  /* ================= Camera ================= */
  var camPos = new THREE.Vector3(0, 90, -160);
  function updateCamera(r, dt) {
    trackPoint(r.s, r.lat, r.alt, _p);
    trackTangent(r.s, _t);
    _p2.copy(_p).addScaledVector(_t, -17); _p2.y += 6.5;
    _p2.x += -_t.z * r.roll * 4; _p2.z += _t.x * r.roll * 4;
    camPos.lerp(_p2, Math.min(1, dt * 5));
    camera.position.copy(camPos);
    _p.addScaledVector(_t, 24); _p.y += 1.5;
    camera.lookAt(_p);
    var targetFov = 62 + Math.min(1, r.speed / 78) * 13;
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3);
    camera.updateProjectionMatrix();
  }

  /* ================= HUD / minimap ================= */
  var el = function (id) { return document.getElementById(id); };
  var hud = el('ag-hud'), elPos = el('ag-pos'), elLap = el('ag-lap'),
      elTime = el('ag-time'), elSpeed = el('ag-speed'), elAlt = el('ag-alt'),
      elRings = el('ag-rings'), elBoost = el('ag-boostfill'),
      posChip = elPos.closest('.ag-chip'),
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
  var mmPts = [];
  function buildMinimap() {
    mmPts = [];
    var minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (var i = 0; i < SAMPLES; i += 6) {
      var p = pts[i];
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
      mmPts.push(p);
    }
    mmPts.bbox = { minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ };
  }
  function drawMinimap() {
    var W = mm.width, H = mm.height, bb = mmPts.bbox;
    mmx.clearRect(0, 0, W, H);
    function X(x) { return 10 + (x - bb.minX) / (bb.maxX - bb.minX) * (W - 20); }
    function Z(z) { return 10 + (z - bb.minZ) / (bb.maxZ - bb.minZ) * (H - 20); }
    mmx.strokeStyle = 'rgba(255,255,255,.8)'; mmx.lineWidth = 5; mmx.lineJoin = 'round';
    mmx.beginPath();
    mmPts.forEach(function (p, i) { if (i === 0) mmx.moveTo(X(p.x), Z(p.z)); else mmx.lineTo(X(p.x), Z(p.z)); });
    mmx.closePath(); mmx.stroke();
    // next ring marker
    if (rings.length) {
      var rp = trackPoint(rings[nextRingIdx].s, rings[nextRingIdx].lat, 0);
      mmx.fillStyle = '#ffd23c';
      mmx.beginPath(); mmx.arc(X(rp.x), Z(rp.z), 4, 0, 7); mmx.fill();
    }
    riders.forEach(function (r) {
      trackPoint(r.s, r.lat, r.alt, _p);
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
    elLap.textContent = mode === 'tt' ? ('LAP ' + player.lap) : (Math.min(player.lap, LAPS) + '/' + LAPS);
    elTime.textContent = mode === 'tt' ? fmtTime(Math.max(0, ttTime)) : fmtTime(elapsed);
    elTime.style.color = (mode === 'tt' && ttTime < 10) ? '#ff6b6b' : '';
    elSpeed.textContent = Math.round(player.speed * 3.6);
    trackPoint(player.s, 0, 0, _p);
    elAlt.textContent = Math.round(_p.y + player.alt);
    elRings.textContent = ringsHit;
    elBoost.style.width = Math.round(player.boost * 100) + '%';
    drawMinimap();
    return pos;
  }

  /* ================= World builder (one sky per level) ================= */
  var worldGroup = null, builtLevel = 0;
  function disposeWorld(o) {
    o.traverse(function (n) {
      if (n.geometry) n.geometry.dispose();
      if (n.material) {
        (Array.isArray(n.material) ? n.material : [n.material]).forEach(function (m) {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
  }
  function buildWorld(lv) {
    if (worldGroup) { scene.remove(worldGroup); disposeWorld(worldGroup); }
    var th = THEMES[lv - 1];
    computeTrack(layoutFor(lv));
    scene.background.set(th.sky);
    scene.fog.color.set(th.sky);
    hemi.color.set(th.hemi);
    worldGroup = new THREE.Group();
    var rand = rng(lv * 104729 + 7);
    buildLane(worldGroup, th);
    buildStart(worldGroup, th);
    buildRings(worldGroup, rand);
    buildClouds(worldGroup, rand);
    buildGround(worldGroup, rand);
    buildBirds(worldGroup, rand);
    scene.add(worldGroup);
    buildMinimap();
    builtLevel = lv;
  }

  /* ================= Input ================= */
  var input = { left: false, right: false, up: false, down: false, boost: false };
  var KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
                 ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
                 ShiftLeft: 'boost', ShiftRight: 'boost', Space: 'boost' };
  document.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.code];
    if (k) { input[k] = true; e.preventDefault(); }
    if ((e.code === 'KeyP' || e.code === 'Escape') && (state === 'race' || state === 'paused')) togglePause();
  });
  document.addEventListener('keyup', function (e) {
    var k = KEYMAP[e.code];
    if (k) { input[k] = false; e.preventDefault(); }
  });
  function bindTouch(id, key) {
    var b = el(id); if (!b) return;
    function on(e) { e.preventDefault(); input[key] = true; b.classList.add('on'); }
    function off(e) { e.preventDefault(); input[key] = false; b.classList.remove('on'); }
    b.addEventListener('touchstart', on, { passive: false });
    b.addEventListener('touchend', off); b.addEventListener('touchcancel', off);
    b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off);
  }
  bindTouch('t-left', 'left'); bindTouch('t-right', 'right');
  bindTouch('t-up', 'up'); bindTouch('t-down', 'down'); bindTouch('t-boost', 'boost');

  /* ================= Audio (engine hum + chimes) ================= */
  var AC = null, engOsc = null, engGain = null, muted = false;
  function initAudio() {
    if (AC) return;
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      engOsc = AC.createOscillator(); engOsc.type = 'sawtooth';
      var filt = AC.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 380;
      engGain = AC.createGain(); engGain.gain.value = 0;
      engOsc.connect(filt); filt.connect(engGain); engGain.connect(AC.destination);
      engOsc.start();
    } catch (e) { AC = null; }
  }
  function engineSound(speed, on) {
    if (!AC || !engOsc) return;
    var t = AC.currentTime;
    engOsc.frequency.setTargetAtTime(50 + speed * 2.4, t, 0.06);
    engGain.gain.setTargetAtTime(!muted && on ? 0.045 + Math.min(0.045, speed / 1500) : 0, t, 0.1);
  }
  function beep(freq, dur) {
    if (!AC || muted) return;
    try {
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.16, AC.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
      o.connect(g); g.connect(AC.destination);
      o.start(); o.stop(AC.currentTime + dur);
    } catch (e) {}
  }
  function chime() { beep(1046, 0.14); setTimeout(function () { beep(1568, 0.22); }, 90); }

  /* ================= Game flow ================= */
  var menuEl = el('ag-menu'), garageEl = el('ag-garage'), resEl = el('ag-results'),
      levelsEl = el('ag-levels'), pauseEl = el('ag-pause-ov');
  var state = 'menu'; // menu | garage | levels | countdown | race | paused | done
  var raceTime = 0, countT = 0, player = null, playerPos = 6;
  var ttTime = 0, TT_START = 50;

  function show(elm) {
    [menuEl, garageEl, resEl, levelsEl, pauseEl].forEach(function (m) { m.classList.add('hidden'); });
    if (elm) elm.classList.remove('hidden');
  }
  function refreshMenu() {
    el('ag-menu-level').textContent = store.level;
    el('ag-menu-sub').innerHTML =
      'Career Level <b>' + store.level + '</b> of ' + LEVELS + ' — <b>' + THEMES[store.level - 1].name + '</b> · 3 laps · 5 rivals · golden rings' +
      '<br>⏱️ Time Trial best: <b>' + store.best + ' rings</b> · 💰 You have <b>' + store.points + '</b> points.' +
      '<br>📖 The lesson: <b>Aim high, but fly calm — panic crashes, patience lands.</b>';
  }
  function startRace(lv, md) {
    initAudio();
    if (AC && AC.state === 'suspended') AC.resume();
    mode = md;
    if (lv !== builtLevel) buildWorld(lv);
    rings.forEach(function (r) { r.flashT = 0; r.mat.color.setHex(0x9a7b24); });
    nextRingIdx = 0; ringLapBase = 0; ringsHit = 0; highlightRings();
    resetRiders(lv, mode === 'tt');
    player = riders[0];
    raceTime = 0; ttTime = TT_START;
    state = 'countdown'; countT = 0;
    show(null); hud.style.display = 'flex';
    el('ag-pause-btn').style.display = 'block';
    posChip.style.display = mode === 'tt' ? 'none' : '';
    countEl.classList.remove('hidden');
    toast(mode === 'tt'
      ? 'Time Trial — every ring = +2s. Go!'
      : 'Level ' + lv + ' — ' + THEMES[lv - 1].name + ' · 3 laps. Fly calm!');
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
    if (countT >= 3.4) { countEl.classList.add('hidden'); state = 'race'; }
  }
  function stepRace(dt) {
    raceTime += dt;
    if (mode === 'tt') {
      ttTime -= dt;
      if (ttTime <= 0) { ttTime = 0; finishTT(); return; }
    }
    riders.forEach(function (r) {
      if (r.done) return;
      if (r.isPlayer) stepPlayer(r, dt, input);
      else stepAI(r, dt, raceTime);
      placeRider(r);
      var lapNow = Math.floor(r.s / trackLen) + 1;
      if (lapNow > r.lap) {
        r.lap = lapNow;
        if (r.isPlayer && mode === 'career') {
          if (r.lap <= LAPS) { toast(r.lap === LAPS ? 'Final lap — send it!' : 'Lap ' + r.lap + '/' + LAPS); beep(660, 0.15); }
          else finishRace(r);
        } else if (mode === 'career' && lapNow > LAPS && !r.done) { r.done = true; r.finishTime = raceTime; }
      }
    });
    collide();
    checkRings(player);
    birdHitCheck(player);
    playerPos = updateHUD(player, raceTime);
    engineSound(player.speed, true);
    updateCamera(player, dt);
  }
  function finishRace(p) {
    p.done = true; p.finishTime = raceTime;
    state = 'done';
    engineSound(0, false);
    el('ag-pause-btn').style.display = 'none';
    var prog = riders.map(function (r) {
      return { r: r, p: (Math.min(r.lap, LAPS + 1) - 1) * trackLen + (r.s % trackLen) };
    });
    prog.sort(function (a, b) { return b.p - a.p; });
    var pos = 1;
    prog.forEach(function (e, i) { if (e.r === p) pos = i + 1; });
    var earned = POINTS[pos - 1] || 20;
    store.points += earned;
    var unlocked = false;
    if (pos <= 3 && level === store.level && store.level < LEVELS) { store.level++; unlocked = true; }
    saveStore();
    var titles = ['🏆 Victory! King of the sky!', '🥈 So close — P2!', '🥉 Podium! P3!', '🏁 P4 — points in the bag!', '🏁 P5 — keep pushing!', '🏁 P6 — the sky forgives, the clock remembers.'];
    el('ag-res-title').textContent = titles[pos - 1];
    el('ag-res-sub').innerHTML = 'Level ' + level + ' (' + THEMES[level - 1].name + ') · Time ' + fmtTime(raceTime) +
      ' · 💍 ' + ringsHit + ' rings' +
      '<br>💰 <b>+' + earned + ' points</b> (total ' + store.points + ')' +
      (unlocked ? '<br>🔓 <b>Level ' + store.level + ' unlocked!</b>' : (store.level >= LEVELS && pos <= 3 ? '<br>👑 You conquered all 10 skies — legend!' : '')) +
      '<br>📖 Aim high, but fly calm — panic crashes, patience lands.';
    el('ag-next').style.display = unlocked ? '' : 'none';
    show(resEl);
    refreshMenu();
  }
  function finishTT() {
    state = 'done';
    engineSound(0, false);
    el('ag-pause-btn').style.display = 'none';
    var earned = ringsHit * 5;
    store.points += earned;
    var newBest = ringsHit > store.best;
    if (newBest) store.best = ringsHit;
    saveStore();
    el('ag-res-title').textContent = '⏱️ Time\'s up!';
    el('ag-res-sub').innerHTML = '💍 <b>' + ringsHit + ' rings</b> · ' + (player.s / 1000).toFixed(2) + ' km flown' +
      (newBest ? '<br>⭐ <b>New personal best!</b>' : '<br>Best: ' + store.best + ' rings') +
      '<br>💰 <b>+' + earned + ' points</b> (total ' + store.points + ')' +
      '<br>📖 Aim high, but fly calm — panic crashes, patience lands.';
    el('ag-next').style.display = 'none';
    show(resEl);
    refreshMenu();
  }
  function togglePause() {
    if (state === 'race') {
      state = 'paused'; engineSound(0, false); show(pauseEl);
    } else if (state === 'paused') {
      state = 'race'; show(null);
    }
  }
  function quitToMenu() {
    state = 'menu';
    engineSound(0, false);
    hud.style.display = 'none';
    el('ag-pause-btn').style.display = 'none';
    countEl.classList.add('hidden');
    buildWorld(store.level);
    resetRiders(store.level, false);
    riders.forEach(function (r) { placeRider(r); });
    refreshMenu(); show(menuEl);
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

  /* ================= Level select ================= */
  function renderLevels() {
    var wrap = el('ag-level-grid'); wrap.innerHTML = '';
    for (var lv = 1; lv <= LEVELS; lv++) {
      (function (lv) {
        var b = document.createElement('button');
        b.className = 'btn lvl-btn' + (lv <= store.level ? '' : ' ghost');
        b.disabled = lv > store.level;
        b.innerHTML = (lv <= store.level ? '☁️' : '🔒') + ' Level ' + lv + '<small>' + THEMES[lv - 1].name + '</small>';
        b.addEventListener('click', function () { startRace(lv, 'career'); });
        wrap.appendChild(b);
      })(lv);
    }
  }

  el('ag-start').addEventListener('click', function () { startRace(store.level, 'career'); });
  el('ag-tt-btn').addEventListener('click', function () { startRace(store.level, 'tt'); });
  el('ag-levels-btn').addEventListener('click', function () { state = 'levels'; renderLevels(); show(levelsEl); });
  el('ag-levels-back').addEventListener('click', function () { state = 'menu'; refreshMenu(); show(menuEl); });
  el('ag-garage-btn').addEventListener('click', function () { state = 'garage'; renderGarage(); show(garageEl); });
  el('ag-garage-back').addEventListener('click', function () { state = 'menu'; refreshMenu(); show(menuEl); });
  el('ag-garage-race').addEventListener('click', function () { startRace(store.level, 'career'); });
  el('ag-next').addEventListener('click', function () { startRace(store.level, 'career'); });
  el('ag-retry').addEventListener('click', function () { startRace(level, mode); });
  el('ag-res-garage').addEventListener('click', function () { state = 'garage'; renderGarage(); show(garageEl); });
  el('ag-res-menu').addEventListener('click', function () { quitToMenu(); });
  el('ag-pause-btn').addEventListener('click', function () { if (state === 'race' || state === 'paused') togglePause(); });
  el('ag-resume').addEventListener('click', function () { togglePause(); });
  el('ag-quit').addEventListener('click', function () { quitToMenu(); });

  /* ================= Main loop ================= */
  var last = performance.now(), idleT = 0;
  buildWorld(store.level);
  resetRiders(store.level, false);
  riders.forEach(function (r) { placeRider(r); });
  refreshMenu();

  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (state !== 'paused') {
      stepClouds(dt);
      stepBirds(dt, now / 1000);
      stepPlanes(dt);
      // ring feedback: pulse the next ring, decay hit flashes
      if (rings.length) {
        var nr = rings[nextRingIdx];
        if (nr) { var sc = 1 + Math.sin(now * 0.005) * 0.06; nr.mesh.scale.set(sc, sc, sc); }
        rings.forEach(function (r) {
          if (r.flashT > 0) {
            r.flashT -= dt;
            if (r.flashT <= 0) { r.flashT = 0; r.mat.color.setHex(r === nr ? 0xffd23c : 0x9a7b24); }
          }
        });
      }
    }
    if (state === 'countdown') {
      riders.forEach(function (r) { placeRider(r); });
      if (player) updateCamera(player, dt);
      doCountdown(dt);
    } else if (state === 'race') {
      stepRace(dt);
    } else if (state === 'done') {
      idleT += dt * 0.3;
      var p = player || riders[riders.length - 1];
      if (p) {
        trackPoint(p.s, p.lat, p.alt, _p);
        camera.position.set(_p.x + Math.cos(idleT) * 30, _p.y + 12, _p.z + Math.sin(idleT) * 30);
        camera.lookAt(_p.x, _p.y + 2, _p.z);
      }
      engineSound(0, false);
    } else if (state !== 'paused') {
      // menu / garage / levels: cinematic pan over the grid
      idleT += dt * 0.12;
      trackPoint(-24, 0, 6, _p); trackTangent(-24, _t);
      camera.position.set(_p.x - _t.x * 27 + Math.cos(idleT) * 8, _p.y + 8, _p.z - _t.z * 27 + Math.sin(idleT) * 8);
      camera.lookAt(_p.x + _t.x * 14, _p.y + 2, _p.z + _t.z * 14);
      if (camera.fov !== 58) { camera.fov = 58; camera.updateProjectionMatrix(); }
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // minimal hook for automated smoke tests
  window.SKYGP_DEBUG = {
    get state() { return state; },
    get mode() { return mode; },
    get player() { return player; },
    get riders() { return riders; },
    get rings() { return rings; },
    get ringsHit() { return ringsHit; },
    get nextRing() { return rings[nextRingIdx]; },
    get ttTime() { return ttTime; },
    get flocks() { return flocks; },
    get trackLen() { return trackLen; },
    get camera() { return camera; },
    startCareer: function (lv) { startRace(lv || store.level, 'career'); },
    startTT: function (lv) { startRace(lv || store.level, 'tt'); }
  };
})();
