// Nitro GP — Wisely Arcade
// Original 3D motorcycle Grand Prix racer. Own name, own art, own code.
// Career: 15 levels — 1-10 neon night circuits (3 laps), 11-15 daylight
// point-to-point sprints with jump ramps and river gaps. Earn points by
// finishing position, spend them on Engine / Tires / Nitro upgrades in
// the garage. Progress in localStorage.
(function () {
  'use strict';
  if (!window.THREE) return;

  /* ================= Config & persistence ================= */
  var LEVELS = 15, LAPS = 3, RIDERS = 6;
  var POINTS = [100, 75, 60, 45, 30, 20]; // by finishing position
  var UPS = {
    engine: { name: 'Engine', desc: '+7% top speed per stage. Pure straight-line fury.', costs: [60, 120, 200, 300, 450] },
    tires:  { name: 'Tires',  desc: '+12% grip per stage. Lean harder, run wide less.', costs: [50, 100, 170, 260, 380] },
    nitro:  { name: 'Nitro',  desc: '+25% boost power and longer burn per stage.',       costs: [50, 100, 170, 260, 380] }
  };
  function loadNum(k, d) { try { var v = parseInt(localStorage.getItem(k), 10); return isNaN(v) ? d : v; } catch (e) { return d; } }
  function saveNum(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  var store = {
    level: Math.min(Math.max(loadNum('nitrogp_level', 1), 1), LEVELS),
    points: loadNum('nitrogp_points', 0),
    up: { engine: loadNum('nitrogp_up_e', 0), tires: loadNum('nitrogp_up_t', 0), nitro: loadNum('nitrogp_up_n', 0) }
  };
  function saveStore() {
    saveNum('nitrogp_level', store.level); saveNum('nitrogp_points', store.points);
    saveNum('nitrogp_up_e', store.up.engine); saveNum('nitrogp_up_t', store.up.tires); saveNum('nitrogp_up_n', store.up.nitro);
  }
  function carStats() {
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
  if (THREE.ACESFilmicToneMapping !== undefined) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; }
  renderer.shadowMap.enabled = true;
  if (THREE.PCFSoftShadowMap !== undefined) renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e24);
  scene.fog = new THREE.Fog(0x0a0e24, 170, 720);

  var camera = new THREE.PerspectiveCamera(62, 960 / 600, 0.5, 2500);

  var hemi = new THREE.HemisphereLight(0x3a4a7a, 0x0c0e18, 0.62);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0x8fb4ff, 0.5);
  sun.position.set(180, 260, 120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -95; sun.shadow.camera.right = 95;
  sun.shadow.camera.top = 95; sun.shadow.camera.bottom = -95;
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 700;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  /* ================= Track ================= */
  var ROAD_HALF = 7;
  var SAMPLES = 900;
  var BASE_CTRL = [
    [0, -200], [110, -195], [190, -150], [215, -70], [170, -10], [180, 70],
    [120, 130], [30, 110], [-50, 140], [-90, 80], [-160, 90], [-200, 20],
    [-160, -60], [-170, -140], [-90, -170]
  ];
  // deterministic per-level randomness: each level's map is the same on every visit
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // every level is its own city: own layout, own night theme
  var THEMES = [
    { name: 'Midnight City',    sky: 0x0a0e24, hemi: 0x3a4a7a, accent: '#22d3ee', bld: [0x2a2f45, 0x353a55, 0x232838, 0x3d3350] },
    { name: 'Sunset Strip',     sky: 0x2b1030, hemi: 0x7a4a3a, accent: '#fb923c', bld: [0x453034, 0x553a3a, 0x38232e, 0x504035] },
    { name: 'Emerald Nights',   sky: 0x06231c, hemi: 0x2a6a4a, accent: '#34d399', bld: [0x1f3830, 0x27443a, 0x1a2e28, 0x2f4a3a] },
    { name: 'Crimson District', sky: 0x240a12, hemi: 0x6a2a3a, accent: '#f87171', bld: [0x402228, 0x4a2a30, 0x331a20, 0x503038] },
    { name: 'Royal Violet',     sky: 0x170a2e, hemi: 0x5a3a8a, accent: '#a78bfa', bld: [0x322448, 0x3d2f58, 0x281c40, 0x453560] },
    { name: 'Golden Hour',      sky: 0x2e1f08, hemi: 0x8a6a2a, accent: '#fbbf24', bld: [0x443a22, 0x52462a, 0x382e1a, 0x5c4c30] },
    { name: 'Arctic Run',       sky: 0x0a1c2e, hemi: 0x4a7a9a, accent: '#7dd3fc', bld: [0x27384a, 0x30445a, 0x1f3042, 0x3a5068] },
    { name: 'Neon Rose',        sky: 0x2a0a24, hemi: 0x7a2a5e, accent: '#f472b6', bld: [0x42223a, 0x4e2a46, 0x361c30, 0x583452] },
    { name: 'Toxic City',       sky: 0x14240a, hemi: 0x5e7a2a, accent: '#a3e635', bld: [0x2f4020, 0x3a4c28, 0x26331a, 0x46582f] },
    { name: "Champion's Gold",  sky: 0x1c1503, hemi: 0x8a7433, accent: '#ffd700', bld: [0x40381e, 0x4c4226, 0x342c16, 0x584c2e] },
    // levels 11-15: daytime sprint themes (day flag lifts light + fog in buildWorld)
    { name: 'Desert Sprint',       sky: 0x8fc7ee, hemi: 0xcfe4ff, accent: '#f59e0b', bld: [0xd9b380, 0xc7a06a, 0xe4c48e, 0xbb955e], day: true, ground: '#c8a468', veg: 0x5d7d3a, rock: 0xa9805a, rocky: 0.5 },
    { name: 'River Rush',           sky: 0x8fd2f4, hemi: 0xd6ecff, accent: '#38bdf8', bld: [0x9db98a, 0x87a878, 0xadc79a, 0x79936c], day: true, ground: '#69a854', veg: 0x3e7d34, rock: 0x8a8f7a, rocky: 0.25 },
    { name: 'Canyon Run',           sky: 0xa9c9ee, hemi: 0xffe0bd, accent: '#fb923c', bld: [0xc98a5a, 0xb57a4e, 0xdaa06c, 0xa06a42], day: true, ground: '#b57a4e', veg: 0x6d8148, rock: 0x9c5f3d, rocky: 0.65 },
    { name: 'Coastal Dash',         sky: 0x7ec9f7, hemi: 0xd8f2ff, accent: '#0ea5b7', bld: [0xa8c8b0, 0x94b8a4, 0xbcd2ba, 0x86ac98], day: true, ground: '#5fae62', veg: 0x2f7d4f, rock: 0x9aa48e, rocky: 0.3 },
    { name: "Champion's Straight",  sky: 0xa8c2ee, hemi: 0xffe9bb, accent: '#ffd700', bld: [0xcbb26a, 0xbfa458, 0xdbc87e, 0xb0963f], day: true, ground: '#7fae56', veg: 0x477a38, rock: 0x8f8578, rocky: 0.35 }
  ];
  function layoutFor(lv) {
    // level 1 keeps the original hand-tuned circuit
    if (lv === 1) return BASE_CTRL.map(function (p) { return new THREE.Vector3(p[0], 0, p[1]); });
    var rand = rng(lv * 7919 + 101);
    var rot = rand() * Math.PI * 2, cos = Math.cos(rot), sin = Math.sin(rot);
    var mirror = (lv % 2 === 0) ? -1 : 1; // mirrored levels run the corners the other way round
    var raw = BASE_CTRL.map(function (p) {
      var x = p[0] * (0.84 + rand() * 0.36) * mirror;
      var z = p[1] * (0.84 + rand() * 0.36);
      return [x * cos - z * sin, x * sin + z * cos];
    });
    // one light smoothing pass over the control points: kills jitter kinks,
    // keeps each layout's shape (validated: max curvature in L1's range)
    var n = raw.length;
    return raw.map(function (p, i) {
      var a = raw[(i + n - 1) % n], b = raw[(i + 1) % n];
      return new THREE.Vector3(p[0] * 0.7 + (a[0] + b[0]) * 0.15, 0, p[1] * 0.7 + (a[1] + b[1]) * 0.15);
    });
  }
  /* ============ Sprint levels 11-15: straight, daytime, point-to-point ============
     A sprint spec replaces the closed circuit with an open straight line:
     sampled distance runs [0 .. start .. finish .. total] — a run-up behind
     the start line and a run-out past the finish, so grid/finish handling
     never wraps. Rivers are gaps in the road ribbon (see gapSeg); every
     river has a launch ramp just before its near bank, plus standalone
     ramps for pure air. Circuit levels never touch any of this. */
  var SPRINTS = [
    { len: 2100, roadHalf: 5.6, traffic: 10, aiPace: 1.03, rivers: [{ at: 700, w: 26 }, { at: 1450, w: 26 }], ramps: [{ at: 1080 }] },
    { len: 2400, roadHalf: 5.4, traffic: 11, aiPace: 1.04, rivers: [{ at: 600, w: 28 }, { at: 1250, w: 28 }, { at: 1900, w: 30 }], ramps: [{ at: 950 }] },
    { len: 2600, roadHalf: 5.3, traffic: 12, aiPace: 1.05, rivers: [{ at: 700, w: 28 }, { at: 1500, w: 30 }, { at: 2150, w: 30 }], ramps: [{ at: 1100 }, { at: 1800 }] },
    { len: 2900, roadHalf: 5.2, traffic: 13, aiPace: 1.06, rivers: [{ at: 650, w: 30 }, { at: 1350, w: 30 }, { at: 2050, w: 32 }, { at: 2550, w: 32 }], ramps: [{ at: 1000 }] },
    { len: 3200, roadHalf: 5.1, traffic: 14, aiPace: 1.07, rivers: [{ at: 700, w: 30 }, { at: 1400, w: 32 }, { at: 2100, w: 32 }, { at: 2750, w: 34 }], ramps: [{ at: 1050 }, { at: 1750 }, { at: 2400 }] }
  ];
  var curSpec = { sprint: false };
  var gapSeg = null; // per-sample "road missing" flags for sprint river gaps
  function specFor(lv) {
    if (lv > 10 && lv <= LEVELS) {
      var base = SPRINTS[lv - 11], sp = { sprint: true, lv: lv };
      for (var k in base) sp[k] = base[k];
      return sp;
    }
    return { sprint: false };
  }
  function computeSprintTrack(sp) {
    var RUNUP = 80, RUNOUT = 140;
    sp.start = RUNUP; sp.finish = RUNUP + sp.len;
    var total = RUNUP + sp.len + RUNOUT;
    trackLen = total; segLen = total / SAMPLES;
    curve = null;
    pts = []; tans = []; curvs = [];
    for (var i = 0; i <= SAMPLES; i++) {
      pts.push(new THREE.Vector3(0, 0, RUNUP - i * segLen));
      if (i < SAMPLES) { tans.push(new THREE.Vector3(0, 0, -1)); curvs.push(0); }
    }
    // river gaps snapped to sample boundaries so the ribbon hole is clean;
    // each gap's launch ramp sits 5 m before its near bank
    sp.gaps = sp.rivers.map(function (rv) {
      var i0 = Math.round((RUNUP + rv.at) / segLen), i1 = Math.round((RUNUP + rv.at + rv.w) / segLen);
      return { s0: i0 * segLen, s1: i1 * segLen, i0: i0, i1: i1, rampS: i0 * segLen - 5 };
    });
    sp.launchers = sp.gaps.map(function (g) { return { s: g.rampS, gap: g }; })
      .concat(sp.ramps.map(function (rp) { return { s: RUNUP + rp.at, gap: null }; }));
    sp.launchers.sort(function (a, b) { return a.s - b.s; });
    gapSeg = [];
    for (var gi = 0; gi < SAMPLES; gi++) gapSeg.push(false);
    sp.gaps.forEach(function (g) { for (var k2 = g.i0; k2 < g.i1 && k2 < SAMPLES; k2++) gapSeg[k2] = true; });
  }

  var curve = null, pts = [], tans = [], curvs = [], trackLen = 0, segLen = 1;
  function computeTrack(ctrl) {
    curve = new THREE.CatmullRomCurve3(ctrl, true, 'catmullrom', 0.6);
    pts = curve.getSpacedPoints(SAMPLES); // SAMPLES+1 pts, last == first
    trackLen = curve.getLength();
    segLen = trackLen / SAMPLES;
    // per-sample tangent + curvature (signed, + = turning left)
    tans = []; curvs = [];
    for (var i = 0; i < SAMPLES; i++) {
      var a = pts[i], b = pts[(i + 1) % SAMPLES], c = pts[(i + 2) % SAMPLES];
      var t1 = new THREE.Vector3().subVectors(b, a).normalize();
      var t2 = new THREE.Vector3().subVectors(c, b).normalize();
      tans.push(t1.clone());
      var cross = t1.x * t2.z - t1.z * t2.x; // y of cross product (t1 x t2)
      var dot = Math.max(-1, Math.min(1, t1.dot(t2)));
      curvs.push(Math.atan2(cross, dot) / segLen); // signed curvature
    }
  }
  function trackPoint(s, lat, out) {
    out = out || new THREE.Vector3();
    if (curSpec.sprint) {
      // open line: clamp instead of wrap; narrower road via spec halfwidth
      var sc = Math.max(0, Math.min(trackLen - 0.001, s));
      var sf = sc / segLen, si0 = Math.floor(sf);
      if (si0 > SAMPLES - 1) si0 = SAMPLES - 1;
      out.lerpVectors(pts[si0], pts[si0 + 1], sf - si0);
      var st2 = tans[si0];
      out.x += -st2.z * lat * curSpec.roadHalf;
      out.z += st2.x * lat * curSpec.roadHalf;
      return out;
    }
    // s = arclength along track, lat = lateral in road-halfwidth units
    s = ((s % trackLen) + trackLen) % trackLen;
    var f = s / segLen, i0 = Math.floor(f) % SAMPLES, fr = f - Math.floor(f);
    var p0 = pts[i0], p1 = pts[(i0 + 1) % SAMPLES];
    out.lerpVectors(p0, p1, fr);
    var t = tans[i0];
    // left normal in XZ plane: (-tz, 0, tx)
    out.x += -t.z * lat * ROAD_HALF;
    out.z += t.x * lat * ROAD_HALF;
    return out;
  }
  function trackTangent(s, out) {
    out = out || new THREE.Vector3();
    if (curSpec.sprint) {
      var sc2 = Math.max(0, Math.min(trackLen - 0.001, s));
      var ti0 = Math.floor(sc2 / segLen);
      if (ti0 > SAMPLES - 1) ti0 = SAMPLES - 1;
      return out.copy(tans[ti0]);
    }
    s = ((s % trackLen) + trackLen) % trackLen;
    var i0 = Math.floor(s / segLen) % SAMPLES;
    return out.copy(tans[i0]);
  }
  function trackCurve(s) {
    if (curSpec.sprint) return 0; // straights have no curvature
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


  /* ============ v5 visual helpers: night env reflections, glow sprites, photo road ============ */
  function radialTex(inner, outer) {
    var c = document.createElement('canvas'); c.width = 128; c.height = 128;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  var GLOW_TEX = radialTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  var SMOKE_TEX = radialTex('rgba(200,205,220,.85)', 'rgba(200,205,220,0)');
  function makeGlow(color, sx, sy, opacity) {
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: GLOW_TEX, color: color, transparent: true, opacity: opacity,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    sp.scale.set(sx, sy, 1);
    return sp;
  }
  var NIGHT_CUBE = (function () {
    function cnv(draw) { var c = document.createElement('canvas'); c.width = 64; c.height = 64; draw(c.getContext('2d')); return c; }
    function side(x) {
      var g = x.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, '#0a1230'); g.addColorStop(0.5, '#1b2f5e');
      g.addColorStop(0.6, '#ff9a3c'); g.addColorStop(0.67, '#22d3ee');
      g.addColorStop(0.74, '#0a0e1e'); g.addColorStop(1, '#05070f');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      x.fillStyle = 'rgba(255,220,150,.95)';
      for (var i = 0; i < 26; i++) x.fillRect(Math.random() * 64, 46 + Math.random() * 14, 1.6, 1.6);
    }
    function top(x) {
      x.fillStyle = '#0a1230'; x.fillRect(0, 0, 64, 64);
      x.fillStyle = '#dfe9ff';
      for (var i = 0; i < 30; i++) x.fillRect(Math.random() * 64, Math.random() * 64, 1.2, 1.2);
    }
    function bot(x) { x.fillStyle = '#04050a'; x.fillRect(0, 0, 64, 64); }
    var t = new THREE.CubeTexture([cnv(side), cnv(side), cnv(top), cnv(bot), cnv(side), cnv(side)]);
    t.needsUpdate = true;
    return t;
  })();
  // photographic asphalt (ambientCG, CC0 — already deployed for Apex GP):
  // swapped onto the road material when loaded; canvas texture stays as fallback
  var PHOTO = { color: null, normal: null };
  function applyRoadPhoto(mat, reps) {
    function use() {
      if (PHOTO.color) { PHOTO.color.repeat.set(1, reps); mat.map = PHOTO.color; }
      if (PHOTO.normal) {
        PHOTO.normal.repeat.set(1, reps);
        mat.normalMap = PHOTO.normal;
        mat.normalScale = new THREE.Vector2(0.55, 0.55);
      }
      mat.needsUpdate = true;
    }
    if (PHOTO.color && PHOTO.normal) { use(); return; }
    var loader = new THREE.TextureLoader();
    loader.load('../images/textures/asphalt-color.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
      PHOTO.color = t; use();
    });
    loader.load('../images/textures/asphalt-normal.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      PHOTO.normal = t; use();
    });
  }

  // Road ribbon
  function buildRoad(grp, th) {
    var pos = [], uv = [], idx = [];
    var reps = Math.round(trackLen / 26);
    for (var i = 0; i <= SAMPLES; i++) {
      var s = (i % SAMPLES) * segLen;
      var pL = trackPoint(s, -1.06), pR = trackPoint(s, 1.06);
      pos.push(pL.x, 0.02, pL.z, pR.x, 0.02, pR.z);
      var v = (i / SAMPLES) * reps;
      uv.push(0, v, 1, v);
      if (i < SAMPLES && !(gapSeg && gapSeg[i])) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    var tex = canvasTex(128, 128, function (x, w, h) {
      x.fillStyle = '#232329'; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,.05)';
      for (var n = 0; n < 40; n++) x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }, 1, 1);
    var roadMat = new THREE.MeshPhongMaterial({ map: tex, shininess: 85, specular: 0x8fa3c7, envMap: NIGHT_CUBE, reflectivity: 0.38 });
    applyRoadPhoto(roadMat, reps);
    var m = new THREE.Mesh(g, roadMat);
    m.receiveShadow = true;
    grp.add(m);
    // reflective edge lines in the theme accent + dashed centre line
    [-1, 1].forEach(function (side) {
      var ep = [], ei = [];
      for (var j2 = 0; j2 <= SAMPLES; j2++) {
        var s3 = (j2 % SAMPLES) * segLen;
        var e0 = trackPoint(s3, side * 0.965), e1 = trackPoint(s3, side * 1.045);
        ep.push(e0.x, 0.035, e0.z, e1.x, 0.035, e1.z);
        if (j2 < SAMPLES && !(gapSeg && gapSeg[j2])) { var eb = j2 * 2; ei.push(eb, eb + 1, eb + 2, eb + 1, eb + 3, eb + 2); }
      }
      var eg = new THREE.BufferGeometry();
      eg.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
      eg.setIndex(ei); eg.computeVertexNormals();
      grp.add(new THREE.Mesh(eg, new THREE.MeshBasicMaterial({ color: new THREE.Color(th.accent) })));
    });
    (function () {
      var cp = [], cuv = [], ci = [];
      var dreps = Math.round(trackLen / 11);
      for (var j3 = 0; j3 <= SAMPLES; j3++) {
        var s4 = (j3 % SAMPLES) * segLen;
        var c0 = trackPoint(s4, -0.021), c1 = trackPoint(s4, 0.021);
        cp.push(c0.x, 0.033, c0.z, c1.x, 0.033, c1.z);
        var cv = (j3 / SAMPLES) * dreps;
        cuv.push(0, cv, 1, cv);
        if (j3 < SAMPLES && !(gapSeg && gapSeg[j3])) { var cb = j3 * 2; ci.push(cb, cb + 1, cb + 2, cb + 1, cb + 3, cb + 2); }
      }
      var cg = new THREE.BufferGeometry();
      cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
      cg.setAttribute('uv', new THREE.Float32BufferAttribute(cuv, 2));
      cg.setIndex(ci); cg.computeVertexNormals();
      var ctex = canvasTex(16, 64, function (x, w, h) {
        x.clearRect(0, 0, w, h);
        x.fillStyle = 'rgba(255,233,168,.92)'; x.fillRect(0, 6, w, 34);
      });
      grp.add(new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: ctex, transparent: true, depthWrite: false })));
    })();
    // Curbs: red/white striped ribbons just outside the road
    [-1, 1].forEach(function (side) {
      var p2 = [], u2 = [], ix2 = [];
      for (var j = 0; j <= SAMPLES; j++) {
        var s2 = (j % SAMPLES) * segLen;
        var q0 = trackPoint(s2, side * 1.06), q1 = trackPoint(s2, side * 1.45);
        p2.push(q0.x, 0.015, q0.z, q1.x, 0.015, q1.z);
        var vv = (j / SAMPLES) * Math.round(trackLen / 8);
        u2.push(0, vv, 1, vv);
        if (j < SAMPLES && !(gapSeg && gapSeg[j])) { var b = j * 2; ix2.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
      }
      var g2 = new THREE.BufferGeometry();
      g2.setAttribute('position', new THREE.Float32BufferAttribute(p2, 3));
      g2.setAttribute('uv', new THREE.Float32BufferAttribute(u2, 2));
      g2.setIndex(ix2); g2.computeVertexNormals();
      var t2 = canvasTex(32, 32, function (x, w, h) {
        x.fillStyle = '#d63b3b'; x.fillRect(0, 0, w, h / 2);
        x.fillStyle = '#f2f2f2'; x.fillRect(0, h / 2, w, h / 2);
      });
      grp.add(new THREE.Mesh(g2, new THREE.MeshLambertMaterial({ map: t2 })));
    });
  }

  // Grass
  function buildGrass(grp) {
    var tex = canvasTex(256, 256, function (x, w, h) {
      x.fillStyle = '#22252f'; x.fillRect(0, 0, w, h);
      for (var n = 0; n < 900; n++) {
        x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.25)' : 'rgba(140,160,255,.05)';
        x.fillRect(Math.random() * w, Math.random() * h, 3, 5);
      }
    }, 60, 60);
    var g = new THREE.Mesh(new THREE.CircleGeometry(900, 40),
      new THREE.MeshLambertMaterial({ map: tex }));
    g.rotation.x = -Math.PI / 2; g.position.y = -0.05;
    g.receiveShadow = true;
    grp.add(g);
  }

  // Start/finish gantry + checkered line (sOff: sprint start/finish distance)
  function buildStart(grp, sOff) {
    var S0 = sOff || 0;
    var p0 = trackPoint(S0, -1.06), p1 = trackPoint(S0, 1.06);
    var line = new THREE.Mesh(new THREE.PlaneGeometry(2.2, ROAD_HALF * 2.12),
      new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, function (x, w, h) {
        for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
          x.fillStyle = (r + c) % 2 ? '#111' : '#f5f5f5'; x.fillRect(c * 8, r * 8, 8, 8);
        }
      }) }));
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = Math.atan2(p1.x - p0.x, p1.z - p0.z) + Math.PI / 2;
    var mid = trackPoint(S0, 0); line.position.set(mid.x, 0.03, mid.z);
    grp.add(line);
    var t = trackTangent(S0, new THREE.Vector3());
    var n = new THREE.Vector3(-t.z, 0, t.x);
    var poleG = new THREE.CylinderGeometry(0.5, 0.5, 12, 10);
    var poleM = new THREE.MeshLambertMaterial({ color: 0x39415a });
    [-1.5, 1.5].forEach(function (s) {
      var pole = new THREE.Mesh(poleG, poleM);
      pole.position.set(mid.x + n.x * ROAD_HALF * s, 6, mid.z + n.z * ROAD_HALF * s);
      grp.add(pole);
    });
    var banner = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF * 3.4, 2.6, 0.6),
      new THREE.MeshLambertMaterial({ map: canvasTex(512, 64, function (x, w, h) {
        x.fillStyle = '#1c2136'; x.fillRect(0, 0, w, h);
        x.fillStyle = '#ffd166'; x.font = '600 46px "Barlow Condensed", sans-serif';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('NITRO GP  •  WISELY ARCADE', w / 2, h / 2);
      }) }));
    banner.position.set(mid.x, 11, mid.z);
    banner.rotation.y = Math.atan2(t.x, t.z);
    grp.add(banner);
  }

  /* ============ Sprint scenery: ground with river cuts, ramps, daytime env ============ */
  function buildSprintGround(grp, th, sp) {
    var gtex = canvasTex(256, 256, function (x, w, h) {
      x.fillStyle = th.ground; x.fillRect(0, 0, w, h);
      for (var n = 0; n < 1000; n++) {
        x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.13)' : 'rgba(255,255,255,.10)';
        x.fillRect(Math.random() * w, Math.random() * h, 3, 4);
      }
    }, 1, 1);
    function groundSpan(a, b) {
      if (b - a < 4) return;
      var len = b - a;
      var t = gtex.clone(); t.needsUpdate = true; t.repeat.set(26, Math.max(1, Math.round(len / 22)));
      var m = new THREE.Mesh(new THREE.PlaneGeometry(620, len),
        new THREE.MeshLambertMaterial({ map: t }));
      m.rotation.x = -Math.PI / 2;
      var c = trackPoint((a + b) / 2, 0);
      m.position.set(c.x, -0.05, c.z);
      m.receiveShadow = true;
      grp.add(m);
    }
    // ground runs in spans between river cuts; each cut gets a depressed
    // river bed + water surface flowing across the whole world width
    var bedM = new THREE.MeshLambertMaterial({ color: 0x54452e });
    var watM = new THREE.MeshPhongMaterial({ color: 0x1f6fd0, shininess: 140, specular: 0xbfe2ff, transparent: true, opacity: 0.94, envMap: NIGHT_CUBE, reflectivity: 0.45 });
    var foamM = new THREE.MeshBasicMaterial({ color: 0xeaf7ff, transparent: true, opacity: 0.75 });
    var prev = 0;
    sp.gaps.forEach(function (g) {
      groundSpan(prev, g.s0 - 9);
      var glen = g.s1 - g.s0, mid = (g.s0 + g.s1) / 2, c = trackPoint(mid, 0);
      var bed = new THREE.Mesh(new THREE.BoxGeometry(620, 0.5, glen + 18), bedM);
      bed.position.set(c.x, -1.02, c.z); grp.add(bed);
      var wat = new THREE.Mesh(new THREE.PlaneGeometry(620, glen + 16), watM);
      wat.rotation.x = -Math.PI / 2; wat.position.set(c.x, -0.68, c.z); grp.add(wat);
      [g.s0 - 1.2, g.s1 + 1.2].forEach(function (fs) {
        var fp = trackPoint(fs, 0);
        var foam = new THREE.Mesh(new THREE.PlaneGeometry(sp.roadHalf * 2 + 10, 2.2), foamM);
        foam.rotation.x = -Math.PI / 2; foam.position.set(fp.x, -0.6, fp.z); grp.add(foam);
      });
      prev = g.s1 + 9;
    });
    groundSpan(prev, trackLen);
  }

  // jump ramp wedges: chevron-striped, lip exactly at the launcher distance
  function buildRamps(grp, sp) {
    var W = sp.roadHalf * 2 * 1.04, L = 7, H = 1.5;
    var pos = [
      // top slope (low edge A/B at z=-L/2, lip C/D at z=+L/2)
      -W / 2, 0, -L / 2, W / 2, 0, -L / 2, W / 2, H, L / 2,
      -W / 2, 0, -L / 2, W / 2, H, L / 2, -W / 2, H, L / 2,
      // back face
      W / 2, 0, L / 2, -W / 2, 0, L / 2, -W / 2, H, L / 2,
      W / 2, 0, L / 2, -W / 2, H, L / 2, W / 2, H, L / 2,
      // sides
      -W / 2, 0, -L / 2, -W / 2, 0, L / 2, -W / 2, H, L / 2,
      W / 2, 0, -L / 2, W / 2, H, L / 2, W / 2, 0, L / 2
    ];
    var uvA = [];
    for (var ui = 0; ui < pos.length / 3; ui++) uvA.push((ui % 3) / 2, (ui % 2));
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvA, 2));
    geo.computeVertexNormals();
    var tex = canvasTex(128, 128, function (x, w, h) {
      x.fillStyle = '#f7b500'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#191d26';
      for (var b = -2; b < 6; b++) {
        x.save(); x.translate(b * 32, 0); x.rotate(0.6); x.fillRect(0, -40, 15, 220); x.restore();
      }
    }, 1, 1);
    var mat = new THREE.MeshPhongMaterial({ map: tex, shininess: 24, specular: 0x666666 });
    sp.launchers.forEach(function (Ln) {
      var g = new THREE.Group();
      var m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      g.add(m);
      var p = trackPoint(Ln.s - L / 2, 0);
      var t = trackTangent(Ln.s, new THREE.Vector3());
      g.position.set(p.x, 0.02, p.z);
      g.rotation.y = Math.atan2(t.x, t.z);
      grp.add(g);
    });
  }

  function buildSprintEnv(grp, th, rand) {
    var tan0 = trackTangent(0, new THREE.Vector3());
    // sun + halo high over the course
    var sunP = trackPoint(trackLen * 0.45, 0);
    var sunSp = makeGlow(0xfff3b0, 150, 150, 0.95);
    sunSp.position.set(sunP.x - 430, 330, sunP.z - 260); grp.add(sunSp);
    var halo = makeGlow(0xfff8dd, 380, 380, 0.22);
    halo.position.copy(sunSp.position); grp.add(halo);
    // soft clouds
    for (var c = 0; c < 14; c++) {
      var cp = trackPoint(rand() * trackLen, 0);
      var cl = makeGlow(0xffffff, 130 + rand() * 130, 26 + rand() * 18, 0.32 + rand() * 0.2);
      cl.position.set(cp.x + (rand() - 0.5) * 700, 95 + rand() * 70, cp.z + (rand() - 0.5) * 300);
      grp.add(cl);
    }
    // grandstand by the start line
    var standM = new THREE.MeshLambertMaterial({ color: 0xb9c0cf });
    var seatCols = [0xef4444, 0xf5f5f5, 0x3b82f6, 0xf5f5f5];
    var sb = trackPoint(curSpec.start + 24, 0);
    for (var s = 0; s < 3; s++) {
      var tier = new THREE.Mesh(new THREE.BoxGeometry(52, 2.2, 5), standM);
      tier.position.set(sb.x - (24 + s * 5.4), 1.5 + s * 2.4, sb.z);
      tier.rotation.y = Math.atan2(tan0.x, tan0.z) + Math.PI / 2;
      grp.add(tier);
      var seats = new THREE.Mesh(new THREE.BoxGeometry(50, 1.1, 4.2),
        new THREE.MeshLambertMaterial({ color: seatCols[s % 4] }));
      seats.position.set(sb.x - (24 + s * 5.4), 2.9 + s * 2.4, sb.z);
      seats.rotation.y = tier.rotation.y;
      grp.add(seats);
    }
    // scattered trees + rocks, well clear of the road
    var trunkM = new THREE.MeshLambertMaterial({ color: 0x6b4a2e });
    var leafM = new THREE.MeshLambertMaterial({ color: th.veg });
    var rockM = new THREE.MeshLambertMaterial({ color: th.rock });
    for (var k = 0; k < 110; k++) {
      var sK = 30 + rand() * (trackLen - 60);
      var sideK = rand() < 0.5 ? -1 : 1;
      var latK = (2.3 + rand() * 5.2) * sideK;
      var kp = trackPoint(sK, latK);
      if (rand() < th.rocky) {
        var rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 + rand() * 1.9), rockM);
        rk.position.set(kp.x, 0.5, kp.z);
        rk.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        rk.castShadow = true;
        grp.add(rk);
      } else {
        var tr = new THREE.Group();
        var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 2.2, 6), trunkM);
        trunk.position.y = 1.1; tr.add(trunk);
        var cone = new THREE.Mesh(new THREE.ConeGeometry(1.7 + rand() * 1.1, 4.6 + rand() * 2.4, 7), leafM);
        cone.position.y = 4.4; cone.castShadow = true; tr.add(cone);
        tr.position.set(kp.x, 0, kp.z);
        grp.add(tr);
      }
    }
    // distant mesas / hills on the horizon
    var mesaM = new THREE.MeshLambertMaterial({ color: th.rock });
    for (var ms = 0; ms < 9; ms++) {
      var mp = trackPoint((ms / 9) * trackLen + rand() * 120, 0);
      var sideM = ms % 2 ? 1 : -1;
      var mesa = new THREE.Mesh(new THREE.BoxGeometry(120 + rand() * 130, 16 + rand() * 26, 60 + rand() * 60), mesaM);
      mesa.position.set(mp.x + sideM * (170 + rand() * 90), 7, mp.z);
      grp.add(mesa);
    }
    // roadside boards in the theme accent (original words only)
    (function () {
      var WORDS = ['SPRINT', 'RUSH', 'JUMP', 'RIVER', 'APEX', 'TURBO'];
      function boardTex(word) {
        var cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
        var x = cv.getContext('2d');
        x.fillStyle = '#14202e'; x.fillRect(0, 0, 512, 128);
        x.strokeStyle = th.accent; x.lineWidth = 5; x.strokeRect(12, 12, 488, 104);
        x.font = '600 62px "Barlow Condensed", "Arial Narrow", sans-serif';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillStyle = th.accent; x.fillText(word, 256, 68);
        var t = new THREE.CanvasTexture(cv);
        if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
        return t;
      }
      var poleM = new THREE.MeshLambertMaterial({ color: 0x3a4152 });
      for (var sg = 0; sg < 9; sg++) {
        var sS = ((sg + 0.5) / 9) * trackLen;
        var sideS = (sg % 2) ? 1 : -1;
        var spp = trackPoint(sS, sideS * 2.9);
        var stn = trackTangent(sS, new THREE.Vector3());
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 7.5, 6), poleM);
        pole.position.set(spp.x, 3.75, spp.z); grp.add(pole);
        var board = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.75),
          new THREE.MeshBasicMaterial({ map: boardTex(WORDS[sg % WORDS.length]), side: THREE.DoubleSide }));
        board.position.set(spp.x, 7.4, spp.z);
        board.rotation.y = Math.atan2(stn.x, stn.z) + Math.PI / 2 + (sideS < 0 ? Math.PI : 0);
        grp.add(board);
      }
    })();
  }

  // Grandstand, floodlights, trees, clouds
  function buildEnv(grp, th, rand) {
    var t0 = trackTangent(trackLen * 0.06, new THREE.Vector3());
    var n0 = new THREE.Vector3(-t0.z, 0, t0.x);
    var base = trackPoint(trackLen * 0.06, 0);
    // grandstand: stepped boxes
    var standM = new THREE.MeshLambertMaterial({ color: 0x9aa2ba });
    var seatCols = [0xef4444, 0xf5f5f5, 0x3b82f6, 0xf5f5f5];
    for (var s = 0; s < 4; s++) {
      var tier = new THREE.Mesh(new THREE.BoxGeometry(60, 2.2, 5), standM);
      var bx = base.x + n0.x * (26 + s * 5.4) + t0.x * (s - 1.5) * 2;
      var bz = base.z + n0.z * (26 + s * 5.4) + t0.z * (s - 1.5) * 2;
      tier.position.set(bx, 1.5 + s * 2.4, bz);
      tier.rotation.y = Math.atan2(t0.x, t0.z) + Math.PI / 2;
      grp.add(tier);
      var seats = new THREE.Mesh(new THREE.BoxGeometry(58, 1.1, 4.2),
        new THREE.MeshLambertMaterial({ color: seatCols[s % 4] }));
      seats.position.set(bx, 2.9 + s * 2.4, bz);
      seats.rotation.y = tier.rotation.y;
      grp.add(seats);
    }
    var roof = new THREE.Mesh(new THREE.BoxGeometry(64, 1, 26),
      new THREE.MeshLambertMaterial({ color: 0x4a4470 }));
    roof.position.set(base.x + n0.x * 42, 13.5, base.z + n0.z * 42);
    roof.rotation.y = Math.atan2(t0.x, t0.z) + Math.PI / 2;
    grp.add(roof);
    // floodlights
    var poleM = new THREE.MeshLambertMaterial({ color: 0x4a5268 });
    for (var f = 0; f < 8; f++) {
      var sF = (f / 8) * trackLen;
      var side = f % 2 ? 1 : -1;
      var fp = trackPoint(sF, side * 4.2);
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 22, 8), poleM);
      pole.position.set(fp.x, 11, fp.z); grp.add(pole);
      var head = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.6, 0.8),
        new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
      head.position.set(fp.x, 22.4, fp.z); grp.add(head);
      var fglow = makeGlow(0xfff2c8, 10, 5, 0.5);
      fglow.position.set(fp.x, 22.4, fp.z); grp.add(fglow);
    }
    // buildings with lit windows: layered facades — a structural colour map
    // plus a separate emissive layer carrying only the lit windows, so towers
    // read as real night buildings instead of flat slabs with dot windows
    function facadePair(cols, rows) {
      var W = 128, H = 256, cw = W / cols, rh = H / rows;
      var base = document.createElement('canvas'); base.width = W; base.height = H;
      var lit = document.createElement('canvas'); lit.width = W; lit.height = H;
      var bx = base.getContext('2d'), lx = lit.getContext('2d');
      bx.fillStyle = '#78839c'; bx.fillRect(0, 0, W, H);
      lx.fillStyle = '#000'; lx.fillRect(0, 0, W, H);
      for (var r2 = 0; r2 < rows; r2++) {
        bx.fillStyle = 'rgba(0,0,0,.16)'; bx.fillRect(0, r2 * rh, W, 1.5); // floor banding
        for (var c2 = 0; c2 < cols; c2++) {
          var wx = c2 * cw + cw * 0.22, wy = r2 * rh + rh * 0.24, ww = cw * 0.56, wh = rh * 0.5;
          if (Math.random() < 0.35) {
            var warm = Math.random() < 0.62;
            lx.fillStyle = warm ? '#ffd9a0' : '#bfe0ff'; lx.fillRect(wx, wy, ww, wh);
            lx.fillStyle = 'rgba(0,0,0,.3)'; lx.fillRect(wx, wy + wh * 0.55, ww, wh * 0.45);
            bx.fillStyle = warm ? '#8a7452' : '#5a6d80'; bx.fillRect(wx, wy, ww, wh);
          } else {
            bx.fillStyle = Math.random() < 0.5 ? '#39415a' : '#454e68'; bx.fillRect(wx, wy, ww, wh);
          }
        }
      }
      function toTex(cnv) {
        var t = new THREE.CanvasTexture(cnv);
        if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
        return t;
      }
      return { map: toTex(base), lit: toTex(lit) };
    }
    var facadeSets = [facadePair(6, 12), facadePair(8, 20), facadePair(10, 30)];
    var roofMat = new THREE.MeshLambertMaterial({ color: 0x14161f });
    var bColors = th.bld;
    var facadeMats = facadeSets.map(function (f) {
      return bColors.map(function (bc) {
        return new THREE.MeshLambertMaterial({ color: bc, map: f.map, emissive: 0xffffff, emissiveMap: f.lit });
      });
    });
    for (var k = 0; k < 64; k++) {
      var sB = (k / 64) * trackLen;
      var sideB = (k % 2) ? 1 : -1;
      var latB = 5.4 + rand() * 2.8, bp = null;
      // keep buildings clear of the track's other arm where the loop passes near itself:
      // pull the building in until it is 18 m+ from every far-away part of the road
      while (latB >= 4.4) {
        var cand = trackPoint(sB, sideB * latB);
        var own = Math.round(sB / segLen) % SAMPLES, clear = true;
        for (var si = 0; si < SAMPLES; si += 4) {
          var cd2 = Math.abs(si - own); cd2 = Math.min(cd2, SAMPLES - cd2);
          if (cd2 < 110) continue;
          var dx2 = pts[si].x - cand.x, dz2 = pts[si].z - cand.z;
          if (dx2 * dx2 + dz2 * dz2 < 324) { clear = false; break; }
        }
        if (clear) { bp = cand; break; }
        latB -= 0.6;
      }
      if (!bp) continue;
      var bw = 14 + rand() * 16, bd = 14 + rand() * 16, bh = 18 + rand() * 42;
      var fi = bh < 30 ? 0 : (bh < 46 ? 1 : 2);
      var sideMat = facadeMats[fi][k % 4];
      var bld = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd),
        [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat]);
      bld.position.set(bp.x, bh / 2 - 0.1, bp.z);
      grp.add(bld);
    }
    // neon signs beside the road (original words only), theme accent + glow halo
    (function () {
      var WORDS = ['NITRO', 'TURBO', 'APEX', 'HOTEL', '24H', 'GARAGE'];
      var cache = {};
      function signTex(word) {
        if (cache[word]) return cache[word];
        var c = document.createElement('canvas'); c.width = 512; c.height = 128;
        var x = c.getContext('2d');
        x.clearRect(0, 0, 512, 128);
        x.strokeStyle = th.accent; x.lineWidth = 5;
        x.shadowColor = th.accent; x.shadowBlur = 20;
        x.strokeRect(14, 14, 484, 100);
        x.font = '600 62px "Barlow Condensed", "Arial Narrow", sans-serif';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.shadowBlur = 26;
        x.fillStyle = th.accent; x.fillText(word, 256, 68);
        x.shadowBlur = 8; x.fillStyle = '#ffffff'; x.fillText(word, 256, 68);
        var t = new THREE.CanvasTexture(c);
        if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
        cache[word] = t; return t;
      }
      var poleM2 = new THREE.MeshLambertMaterial({ color: 0x2c3247 });
      for (var sg = 0; sg < 12; sg++) {
        var sS = ((sg + 0.5) / 12) * trackLen;
        var sideS = (sg % 2) ? 1 : -1;
        var sp = trackPoint(sS, sideS * 3.1);
        var stn = trackTangent(sS, new THREE.Vector3());
        var pole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 7.5, 6), poleM2);
        pole2.position.set(sp.x, 3.75, sp.z); grp.add(pole2);
        var board = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.75),
          new THREE.MeshBasicMaterial({ map: signTex(WORDS[sg % WORDS.length]), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
        board.position.set(sp.x, 7.4, sp.z);
        board.rotation.y = Math.atan2(stn.x, stn.z) + Math.PI / 2 + (sideS < 0 ? Math.PI : 0);
        grp.add(board);
        var sglow = makeGlow(new THREE.Color(th.accent), 17, 6, 0.32);
        sglow.position.set(sp.x, 7.4, sp.z); grp.add(sglow);
      }
    })();
    // moon + halo
    (function () {
      var moon = makeGlow(0xe8efff, 46, 46, 0.95);
      moon.position.set(-520, 430, -760); grp.add(moon);
      var halo = makeGlow(0x8fb4ff, 190, 190, 0.16);
      halo.position.copy(moon.position); grp.add(halo);
    })();
    // stars
    (function stars() {
      var n = 400, pos = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) {
        var th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.45;
        pos[i * 3] = Math.cos(th) * Math.cos(ph) * 1400;
        pos[i * 3 + 1] = Math.sin(ph) * 1400 + 40;
        pos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * 1400;
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      grp.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false })));
    })();
    // streetlights
    var lampM = new THREE.MeshLambertMaterial({ color: 0x39415a });
    var glowM = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    for (var l = 0; l < 26; l++) {
      var sL = (l / 26) * trackLen;
      var sideL = (l % 2) ? 1 : -1;
      var lp = trackPoint(sL, sideL * 2.35);
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 10, 6), lampM);
      pole.position.set(lp.x, 5, lp.z); grp.add(pole);
      var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), glowM);
      lamp.position.set(lp.x, 10.2, lp.z); grp.add(lamp);
      var lglow = makeGlow(0xffe9a8, 5, 5, 0.8);
      lglow.position.set(lp.x, 10.2, lp.z); grp.add(lglow);
      var poolP = trackPoint(sL, sideL * 1.95);
      var pool = new THREE.Mesh(new THREE.CircleGeometry(6.4, 20),
        new THREE.MeshBasicMaterial({ map: GLOW_TEX, color: 0xffdf9e, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(poolP.x, 0.032, poolP.z); grp.add(pool);
    }
  }

  /* ================= Cars ================= */
  // shared geometry/material caches: 15 detailed cars stay cheap to build
  var _geoCache = {};
  function geoBox(w, h, d) {
    var k = 'b' + w + '_' + h + '_' + d;
    if (!_geoCache[k]) _geoCache[k] = new THREE.BoxGeometry(w, h, d);
    return _geoCache[k];
  }
  function geoCyl(rt, rb, h, seg) {
    var k = 'c' + rt + '_' + rb + '_' + h + '_' + seg;
    if (!_geoCache[k]) _geoCache[k] = new THREE.CylinderGeometry(rt, rb, h, seg);
    return _geoCache[k];
  }
  var SPOKE_TEX = (function () {
    var c = document.createElement('canvas'); c.width = 64; c.height = 64;
    var x = c.getContext('2d');
    x.fillStyle = '#15171d'; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = '#c7d0e2'; x.lineWidth = 5; x.lineCap = 'round';
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2;
      x.beginPath(); x.moveTo(32, 32);
      x.lineTo(32 + Math.cos(a) * 25, 32 + Math.sin(a) * 25); x.stroke();
    }
    x.fillStyle = '#e6ecf7'; x.beginPath(); x.arc(32, 32, 6, 0, 7); x.fill();
    var t = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    return t;
  })();
  var carMats = {
    glass: new THREE.MeshPhongMaterial({ color: 0x0d1626, shininess: 120, specular: 0xcfe2ff, envMap: NIGHT_CUBE, reflectivity: 1.0 }),
    chrome: new THREE.MeshPhongMaterial({ color: 0xd7dde8, shininess: 140, specular: 0xffffff, envMap: NIGHT_CUBE, reflectivity: 1.0 }),
    dark: new THREE.MeshPhongMaterial({ color: 0x14161c, shininess: 24, specular: 0x445066 }),
    carbon: new THREE.MeshPhongMaterial({ color: 0x1a1d24, shininess: 60, specular: 0x8899bb }),
    rubber: new THREE.MeshPhongMaterial({ color: 0x0b0b0e, shininess: 8, specular: 0x222228 }),
    rimFace: new THREE.MeshPhongMaterial({ map: SPOKE_TEX, shininess: 80, specular: 0xbbbbcc, envMap: NIGHT_CUBE, reflectivity: 0.55 }),
    headlight: new THREE.MeshBasicMaterial({ color: 0xfff3c4 }),
    taillight: new THREE.MeshBasicMaterial({ color: 0xff2438 }),
    plate: new THREE.MeshBasicMaterial({ color: 0xe8ecf4 })
  };
  var _paintCache = {};
  function paintMat(color) {
    if (!_paintCache[color]) _paintCache[color] = new THREE.MeshPhongMaterial({
      color: color, shininess: 95, specular: 0xaac4e0, envMap: NIGHT_CUBE, reflectivity: 0.65
    });
    return _paintCache[color];
  }
  function makeCar(color, glowColor, glowOpacity) {
    var g = new THREE.Group();
    var paint = paintMat(color), M = carMats;
    function box(w, h, d, m, x, y, z, cast) {
      var b = new THREE.Mesh(geoBox(w, h, d), m);
      b.position.set(x, y, z);
      if (cast !== false) b.castShadow = true;
      g.add(b); return b;
    }
    // sculpted body (nose points +Z)
    box(1.9, 0.5, 4.6, paint, 0, 0.62, 0);                       // main body
    var hood = box(1.75, 0.34, 1.5, paint, 0, 0.86, 1.55); hood.rotation.x = -0.06;
    var nose = box(1.6, 0.3, 0.7, paint, 0, 0.55, 2.45); nose.rotation.x = 0.12;
    box(1.95, 0.34, 0.5, M.carbon, 0, 0.38, 2.35);               // front bumper
    box(1.9, 0.08, 0.6, M.carbon, 0, 0.16, 2.5);                 // splitter
    box(1.2, 0.2, 0.06, M.dark, 0, 0.52, 2.62);                  // grill
    box(1.55, 0.52, 2.0, M.glass, 0, 1.12, -0.25);               // tinted cabin
    box(1.4, 0.08, 1.1, paint, 0, 1.4, -0.35);                   // roof panel
    [-0.72, 0.72].forEach(function (px) {                        // A-pillars
      var pil = box(0.09, 0.6, 0.09, paint, px, 1.14, 0.68); pil.rotation.x = 0.42;
    });
    box(1.8, 0.3, 1.1, paint, 0, 0.92, -1.75);                   // rear deck
    box(1.7, 0.07, 0.3, M.carbon, 0, 1.1, -2.2);                 // trunk lip
    box(1.95, 0.36, 0.45, M.carbon, 0, 0.4, -2.3);               // rear bumper
    box(1.6, 0.18, 0.3, M.dark, 0, 0.2, -2.45);                  // diffuser
    [-0.98, 0.98].forEach(function (px) { box(0.1, 0.22, 2.6, M.carbon, px, 0.32, 0); }); // side skirts
    [-0.96, 0.96].forEach(function (px) { box(0.04, 0.42, 1.7, paint, px, 0.68, -0.1); }); // door panels
    [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]].forEach(function (fp) {
      box(0.24, 0.3, 1.15, paint, fp[0], 0.72, fp[1]);           // fenders
    });
    [-1, 1].forEach(function (sd) {                              // mirrors
      box(0.16, 0.05, 0.05, M.dark, sd * 1.0, 1.18, 0.62);
      box(0.2, 0.12, 0.1, paint, sd * 1.12, 1.22, 0.62);
    });
    // rear spoiler
    box(0.1, 0.42, 0.24, M.carbon, -0.62, 1.28, -2.15);
    box(0.1, 0.42, 0.24, M.carbon, 0.62, 1.28, -2.15);
    var wing = box(2.05, 0.07, 0.5, M.carbon, 0, 1.52, -2.15); wing.rotation.x = 0.08;
    box(0.05, 0.26, 0.52, paint, -1.03, 1.48, -2.15);
    box(0.05, 0.26, 0.52, paint, 1.03, 1.48, -2.15);
    box(0.05, 0.16, 0.3, paint, 0, 1.5, -1.15);                  // antenna fin
    // lights
    box(0.42, 0.13, 0.06, M.headlight, -0.58, 0.72, 2.66, false);
    box(0.42, 0.13, 0.06, M.headlight, 0.58, 0.72, 2.66, false);
    box(1.5, 0.05, 0.05, M.headlight, 0, 0.58, 2.67, false);     // LED strip
    box(1.7, 0.11, 0.06, M.taillight, 0, 0.82, -2.53, false);    // taillight bar
    box(0.55, 0.16, 0.03, M.plate, 0, 0.5, -2.54, false);
    // chrome exhaust tips
    [-0.55, 0.55].forEach(function (px) {
      var ex = new THREE.Mesh(geoCyl(0.055, 0.055, 0.25, 10), M.chrome);
      ex.rotation.x = Math.PI / 2; ex.position.set(px, 0.28, -2.55); g.add(ex);
    });
    // nitro flame (player boost visual; toggled from effects update)
    var flame = new THREE.Mesh(new THREE.ConeGeometry(0.17, 1.0, 10),
      new THREE.MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.rotation.x = Math.PI / 2;
    flame.position.set(0, 0.28, -3.0);
    flame.visible = false;
    g.add(flame);
    g.userData.flame = flame;
    // headlight cones (fake volumetrics)
    [-0.58, 0.58].forEach(function (px) {
      var cone = new THREE.Mesh(new THREE.ConeGeometry(1.05, 7.5, 18, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffeec2, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      cone.rotation.x = -Math.PI / 2;
      cone.position.set(px, 0.62, 6.3);
      g.add(cone);
    });
    // neon underglow
    var glow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.8),
      new THREE.MeshBasicMaterial({ map: GLOW_TEX, color: glowColor, transparent: true, opacity: glowOpacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.06;
    g.add(glow);
    // wheels that spin: spinner groups with tyre + spoked faces + brake disc
    var wheels = [];
    [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]].forEach(function (wp) {
      var wg = new THREE.Group(); wg.position.set(wp[0], 0.48, wp[1]);
      var spinner = new THREE.Group();
      var tyre = new THREE.Mesh(geoCyl(0.48, 0.48, 0.4, 16), [M.rubber, M.rimFace, M.rimFace]);
      tyre.rotation.z = Math.PI / 2; tyre.castShadow = true;
      spinner.add(tyre);
      var disc = new THREE.Mesh(geoCyl(0.22, 0.22, 0.42, 12), M.chrome);
      disc.rotation.z = Math.PI / 2;
      spinner.add(disc);
      wg.add(spinner); g.add(wg);
      wheels.push(spinner);
    });
    g.userData.wheels = wheels;
    return g;
  }

  /* ================= Riders & physics ================= */
  var RIDER_COLORS = [0xe63946, 0x1d3557, 0xf4a261, 0x9b5de5, 0x06d6a0, 0xffd166];
  var riders = [];
  var stats = carStats();
  var level = 1;
  var finishCount = 0; // sprint finish-order counter (reset per race)

  function resetRiders(lv) {
    level = lv; stats = carStats();
    finishCount = 0;
    riders.forEach(function (r) { scene.remove(r.mesh); });
    riders = [];
    // grid: player at the back, AI ahead in rows of two
    for (var i = 0; i < RIDERS; i++) {
      var isPlayer = (i === 0);
      var accCol = new THREE.Color(THEMES[lv - 1].accent);
      var mesh = makeCar(isPlayer ? 0xe63946 : RIDER_COLORS[(i - 1) % RIDER_COLORS.length],
        isPlayer ? accCol : RIDER_COLORS[(i - 1) % RIDER_COLORS.length], isPlayer ? 0.55 : 0.4);
      scene.add(mesh);
      if (isPlayer) {
        [-0.58, 0.58].forEach(function (lx2) {
          var spot = new THREE.SpotLight(0xd8ecff, 1.35, 95, 0.46, 0.55, 1);
          spot.position.set(lx2, 0.85, 2.4);
          spot.target.position.set(lx2 * 1.6, 0, 34);
          mesh.add(spot); mesh.add(spot.target);
        });
      }
      var row = Math.floor(i / 2), col = (i % 2) ? 0.45 : -0.45;
      riders.push({
        mesh: mesh, isPlayer: isPlayer,
        s: curSpec.sprint ? curSpec.start - (2 - row) * 9 : -(2 - row) * 9, lat: col, speed: 0,
        lap: 1, done: false, finishTime: 0, finishOrder: 0,
        y: 0, vy: 0, air: false, // sprint jump physics (stays 0 on circuits)
        wob: Math.random() * 10, skill: 0.9 + Math.random() * 0.2,
        nitro: 1, // 0..1 meter
        lean: 0, wheelSpin: 0
      });
    }
    resetTraffic();
  }

  function aiLevel() { return 0.8 + (level - 1) * 0.022; } // rivals get faster

  var _p = new THREE.Vector3(), _t = new THREE.Vector3(), _p2 = new THREE.Vector3();
  function placeRider(r, dt) {
    trackPoint(r.s, r.lat, _p);
    trackTangent(r.s, _t);
    r.mesh.position.set(_p.x, r.y || 0, _p.z);
    var yaw = Math.atan2(_t.x, _t.z);
    r.mesh.rotation.y = yaw + (r.driftYaw || 0);
    r.mesh.rotation.x = r.air ? Math.max(-0.3, Math.min(0.22, -(r.vy || 0) * 0.014)) : 0;
    r.mesh.rotation.z = -r.lean * 0.4; // body roll
    r.wheelSpin += r.speed * dt * 1.4;
    var ws = r.mesh.userData.wheels;
    if (ws) for (var wi = 0; wi < ws.length; wi++) ws[wi].rotation.x = r.wheelSpin;
  }

  function stepPlayer(r, dt, input) {
    var st = stats;
    var prevS = r.s;
    var nitroOn = input.nitro && r.nitro > 0.05 && r.speed > 8;
    r.boosting = nitroOn; // visual hook only (flame / FOV / shake)
    var top = st.topSpeed * (nitroOn ? (1 + 0.15 * st.nitroPower) : 1);
    if (input.gas) r.speed += st.accel * (nitroOn ? 1.35 * st.nitroPower : 1) * dt;
    if (input.brake) r.speed -= 55 * dt;
    r.speed -= r.speed * 0.28 * dt; // drag
    if (nitroOn) r.nitro = Math.max(0, r.nitro - dt / (5 + st.nitroPower));
    else r.nitro = Math.min(1, r.nitro + dt / 9);
    // steering
    var steerT = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    r.steerSm = (r.steerSm || 0) + (steerT - (r.steerSm || 0)) * Math.min(1, dt * 7);
    var steer = r.steerSm;
    var hb = input.handbrake && r.speed > 12;
    r.latV = (r.latV || 0) + steer * 2.7 * (hb ? 1.7 : 1) * dt * Math.min(1, r.speed / 20) * (r.air ? 0.35 : 1); // steering bites less mid-air
    r.latV *= Math.pow(0.12, dt); // damping
    // centrifugal push
    var curv = trackCurve(r.s + r.speed * 0.45);
    var gripNow = st.grip * (hb ? 0.45 : 1);
    var push = curv * r.speed * r.speed * 0.0035 / gripNow;
    r.lat += (r.latV - push) * dt * (0.55 + 0.45 * Math.min(1, r.speed / 40));
    // off track (no grass drag while airborne over it)
    if (!r.air) {
      var aLat = Math.abs(r.lat);
      if (aLat > 1) {
        var grassDrag = (14 - 1.6 * gripNow);
        r.speed = Math.max(6, r.speed - grassDrag * dt);
        if (Math.random() < dt * 8) toast('Off track! Get back on the asphalt.');
      }
      if (aLat > 1.7) { r.lat = 1.7 * Math.sign(r.lat); r.speed *= (1 - 1.6 * dt); }
    }
    r.speed = Math.max(0, Math.min(top, r.speed));
    r.lean += ((steer * 0.16 + Math.max(-0.4, Math.min(0.4, -push * 1.6))) - r.lean) * Math.min(1, dt * 8);
    r.driftYaw = (r.driftYaw || 0) + ((hb && steer !== 0 ? steer * 0.22 : 0) - (r.driftYaw || 0)) * Math.min(1, dt * 6);
    if (hb && steer !== 0 && r.speed > 30) {
      r.driftT = (r.driftT || 0) + dt;
      if (r.driftT > 0.9) { r.driftT = 0; toast('DRIFT! 🔥'); }
    } else r.driftT = 0;
    r.s += r.speed * dt;
    stepVertical(r, dt, prevS, false);
  }

  function stepAI(r, dt, elapsed) {
    var st = stats;
    var prevS = r.s;
    var aiTop = st.topSpeed * aiLevel() * r.skill;
    if (curSpec.sprint) aiTop *= curSpec.aiPace; // sprint rivals run hotter, scaling with level
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
    for (var ti = 0; ti < traffic.length; ti++) {
      var tc = traffic[ti];
      var tds = tc.s - r.s; if (tds < 0) tds += trackLen;
      if (tds < 9 && tds > 0 && Math.abs(tc.lat - r.lat) < 0.35) { line = tc.lat > 0 ? -0.65 : 0.65; }
    }
    var prevLat = r.lat;
    r.lat += (line - r.lat) * Math.min(1, dt * 2.2);
    var curv = trackCurve(r.s);
    r.lat -= curv * r.speed * r.speed * 0.0032 * dt;
    r.lat = Math.max(-1.55, Math.min(1.55, r.lat));
    r.lean += ((-(r.lat - prevLat) * 4 + Math.max(-0.4, Math.min(0.4, -curv * r.speed * 0.05))) - r.lean) * Math.min(1, dt * 6);
    r.s += r.speed * dt;
    stepVertical(r, dt, prevS, false);
  }

  /* ============ Sprint vertical physics: ramps, rivers, splashes ============
     Inert on circuits (curSpec.sprint is false → stepVertical returns at once).
     A car crossing a launcher line on the ground (|lat| <= 1.08, i.e. on the
     road) goes airborne with vy from its speed; gravity pulls it back; if it
     comes down inside a river gap — or drives into one on the ground — it
     splashes: riders respawn before the ramp for another run at it (the
     game's crash language: speed cut + put back), ambient traffic is
     placed past the gap so it never blocks the river. */
  var GRAV = 20;
  function gapAt(s) {
    if (!curSpec.gaps) return null;
    for (var i = 0; i < curSpec.gaps.length; i++) {
      var g = curSpec.gaps[i];
      if (s > g.s0 + 0.5 && s < g.s1 - 0.5) return g;
    }
    return null;
  }
  function launchVy(r, L, isTraffic) {
    var vy = Math.max(6.5, Math.min(19, r.speed * 0.30));
    if (isTraffic && L.gap) {
      // ambient traffic always clears the water: give it the arc it needs
      var dist = (L.gap.s1 - L.s) + 8;
      var need = (dist / Math.max(8, r.speed)) * GRAV / 2;
      vy = Math.max(vy, Math.min(26, need));
    }
    return vy;
  }
  function stepVertical(r, dt, prevS, isTraffic) {
    if (!curSpec.sprint) return;
    if (!r.air) {
      for (var i = 0; i < curSpec.launchers.length; i++) {
        var L = curSpec.launchers[i];
        if (prevS < L.s && r.s >= L.s && Math.abs(r.lat) <= 1.08) {
          r.air = true;
          r.vy = launchVy(r, L, isTraffic);
          if (r.isPlayer) beep(740, 0.12);
          break;
        }
      }
    }
    if (r.air) {
      r.vy -= GRAV * dt;
      r.y += r.vy * dt;
      if (r.y <= 0) {
        r.y = 0; r.air = false; r.vy = 0;
        if (gapAt(r.s)) { doSplash(r, isTraffic); return; }
        r.speed *= 0.96; // landing scrub
      }
    } else if (gapAt(r.s)) {
      doSplash(r, isTraffic);
    }
  }
  function doSplash(r, isTraffic) {
    var g = gapAt(r.s);
    spawnSplash(r.mesh.position.x, r.mesh.position.z);
    r.air = false; r.y = 0; r.vy = 0;
    if (isTraffic) { r.s = (g ? g.s1 : r.s) + 12; return; }
    r.s = (g ? g.rampS : r.s) - 16;
    r.speed = Math.min(r.speed, 12);
    r.lat = Math.max(-0.5, Math.min(0.5, r.lat));
    if (r.isPlayer) { toast('Splash! 💦 Too slow — hit the ramp with speed!'); beep(196, 0.3); }
  }

  /* ================= City traffic ================= */
  var traffic = [];
  var TRAFFIC_COLORS = [0x5a6270, 0x3d4454, 0x6e5a7e, 0x4a5a6a, 0x707070];
  function resetTraffic() {
    traffic.forEach(function (t) { scene.remove(t.mesh); });
    traffic = [];
    var nT = curSpec.sprint ? curSpec.traffic : 9; // sprint roads are busier
    for (var i = 0; i < nT; i++) {
      var mesh = makeCar(TRAFFIC_COLORS[i % TRAFFIC_COLORS.length], 0x8899bb, 0.2);
      // dim the headlights on traffic: swap bright mats is overkill; keep as is
      scene.add(mesh);
      traffic.push({
        mesh: mesh, s: (i / nT) * trackLen + Math.random() * 60,
        lat: (Math.random() - 0.5) * 1.1, speed: 15 + Math.random() * 8,
        y: 0, vy: 0, air: false,
        lean: 0, wheelSpin: 0, driftYaw: 0, wob: Math.random() * 10
      });
    }
  }
  function stepTraffic(dt, elapsed) {
    traffic.forEach(function (t) {
      var prevS = t.s;
      t.lat += Math.sin(elapsed * 0.35 + t.wob) * 0.12 * dt;
      t.lat = Math.max(-0.85, Math.min(0.85, t.lat));
      t.s = (t.s + t.speed * dt) % trackLen;
      stepVertical(t, dt, prevS, true);
      trackPoint(t.s, t.lat, _p);
      trackTangent(t.s, _t);
      t.mesh.position.set(_p.x, t.y || 0, _p.z);
      t.mesh.rotation.y = Math.atan2(_t.x, _t.z);
      t.wheelSpin += t.speed * dt * 1.4;
      var tws = t.mesh.userData.wheels;
      if (tws) for (var tw = 0; tw < tws.length; tw++) tws[tw].rotation.x = t.wheelSpin;
    });
  }
  function trafficCollide() {
    for (var i = 0; i < riders.length; i++) {
      var r = riders[i];
      if (r.done) continue;
      for (var j = 0; j < traffic.length; j++) {
        var t = traffic[j];
        var ds = t.s - r.s; if (ds < 0) ds += trackLen;
        if (ds < 5.5 && ds > -1.5) {
          var dsAbs = Math.min(ds < 0 ? -ds : ds, 5.5);
          var dl = Math.abs(t.lat - r.lat);
          if (dl < 0.42) {
            r.speed *= (1 - 2.2 * 0.016);
            r.lat += (r.lat > t.lat ? 0.06 : -0.06);
            if (r.isPlayer && Math.random() < 0.06) toast('Traffic! Watch out! 🚗');
          }
        }
      }
    }
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

  /* ================= Visual effects: drift smoke, wind streaks, nitro flame ================= */
  var fxGroup = new THREE.Group(); scene.add(fxGroup);
  var smokePool = [], smokeT = 0;
  function spawnSmoke(x, y, z, tint, size) {
    var s = null;
    for (var i = 0; i < smokePool.length; i++) if (smokePool[i].life <= 0) { s = smokePool[i]; break; }
    if (!s) {
      if (smokePool.length >= 26) return;
      s = { sp: new THREE.Sprite(new THREE.SpriteMaterial({ map: SMOKE_TEX, transparent: true, opacity: 0, depthWrite: false })), life: 0 };
      fxGroup.add(s.sp); smokePool.push(s);
    }
    s.life = 0.85;
    s.sp.material.color.set(tint || 0xffffff);
    s.sp.position.set(x, y, z);
    s.sp.scale.set(size || 1.2, size || 1.2, 1);
  }
  function spawnSplash(x, z) {
    for (var k = 0; k < 5; k++) {
      spawnSmoke(x + (Math.random() - 0.5) * 2.6, 0.7 + Math.random() * 0.6, z + (Math.random() - 0.5) * 2.6, 0x7cc4ff, 2.3);
    }
  }
  function clearEffects() {
    smokePool.forEach(function (s) { s.life = 0; s.sp.material.opacity = 0; });
  }
  var STREAKS = 44;
  var streakPos = new Float32Array(STREAKS * 6);
  var streakDat = [];
  for (var si2 = 0; si2 < STREAKS; si2++) streakDat.push({ side: 0, h: 0, along: -999 });
  var streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  var streakMat = new THREE.LineBasicMaterial({ color: 0xbfd9ff, transparent: true, opacity: 0 });
  var streakLines = new THREE.LineSegments(streakGeo, streakMat);
  streakLines.frustumCulled = false;
  fxGroup.add(streakLines);
  var _n = new THREE.Vector3();
  function updateEffects(dt) {
    if (!player) return;
    // nitro flame
    var fl = player.mesh.userData.flame;
    if (fl) {
      fl.visible = !!player.boosting;
      if (fl.visible) { var fs = 0.8 + Math.random() * 0.5; fl.scale.set(fs, fs, 0.8 + Math.random() * 0.9); }
    }
    // drift smoke at the rear tyres
    smokeT += dt;
    if (input.handbrake && player.speed > 16 && Math.abs(player.steerSm || 0) > 0.2) {
      if (smokeT > 0.03) {
        smokeT = 0;
        trackTangent(player.s, _t);
        spawnSmoke(player.mesh.position.x - _t.x * 2.1, 0.4, player.mesh.position.z - _t.z * 2.1);
      }
    }
    for (var i = 0; i < smokePool.length; i++) {
      var s = smokePool[i];
      if (s.life <= 0) continue;
      s.life -= dt;
      var k = Math.max(0, s.life / 0.85);
      s.sp.material.opacity = 0.32 * k;
      var sc = 1.2 + (1 - k) * 2.4;
      s.sp.scale.set(sc, sc, 1);
      s.sp.position.y += dt * 1.1;
    }
    // wind streaks above ~180 km/h
    var kmh = player.speed * 3.6;
    streakMat.opacity = Math.max(0, Math.min(0.5, (kmh - 180) / 130));
    if (streakMat.opacity > 0.01) {
      trackPoint(player.s, player.lat, _p);
      trackTangent(player.s, _t);
      _n.set(-_t.z, 0, _t.x);
      var len = 1.5 + player.speed * 0.06;
      for (var j = 0; j < STREAKS; j++) {
        var d = streakDat[j];
        d.along -= player.speed * dt * 1.15;
        if (d.along < -12) {
          d.along = 80 + Math.random() * 50;
          d.side = (Math.random() - 0.5) * 30;
          d.h = 0.5 + Math.random() * 6.5;
          if (Math.abs(d.side) < 3.5) d.side = 3.5 + Math.random() * 8;
        }
        var bx = _p.x + _t.x * d.along + _n.x * d.side;
        var bz = _p.z + _t.z * d.along + _n.z * d.side;
        streakPos[j * 6] = bx; streakPos[j * 6 + 1] = d.h; streakPos[j * 6 + 2] = bz;
        streakPos[j * 6 + 3] = bx - _t.x * len; streakPos[j * 6 + 4] = d.h; streakPos[j * 6 + 5] = bz - _t.z * len;
      }
      streakGeo.attributes.position.needsUpdate = true;
    }
  }

  /* ================= Camera ================= */
  var camPos = new THREE.Vector3(0, 60, -120);
  function updateCamera(r, dt) {
    trackPoint(r.s, r.lat, _p);
    trackTangent(r.s, _t);
    // shadow-casting sun follows the player so shadows stay crisp nearby
    sun.position.set(_p.x + 130, 190, _p.z + 90);
    sun.target.position.set(_p.x, 0, _p.z);
    sun.target.updateMatrixWorld();
    _p2.copy(_p).addScaledVector(_t, -15).add(new THREE.Vector3(0, 7, 0));
    _p2.y += (r.y || 0) * 0.45; // chase cam rises with jump airtime
    // pull camera slightly to outside of lean
    _p2.x += -_t.z * r.lean * 3; _p2.z += _t.x * r.lean * 3;
    camPos.lerp(_p2, Math.min(1, dt * 5));
    camera.position.copy(camPos);
    if (r.boosting) {
      camera.position.x += (Math.random() - 0.5) * 0.14;
      camera.position.y += (Math.random() - 0.5) * 0.1;
    }
    _p.addScaledVector(_t, 24); _p.y = 3 + (r.y || 0) * 0.6;
    camera.lookAt(_p);
    var targetFov = 62 + Math.min(1, r.speed / 75) * 14 + (r.boosting ? 4 : 0);
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
  // minimap track outline (rebuilt per level)
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
    mmPts.sprint = !!curSpec.sprint;
  }

  /* ================= World builder (one city per level) ================= */
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
    curSpec = specFor(lv);
    gapSeg = null;
    if (curSpec.sprint) computeSprintTrack(curSpec); else computeTrack(layoutFor(lv));
    scene.background.set(th.sky);
    scene.fog.color.set(th.sky);
    hemi.color.set(th.hemi);
    if (th.day) {
      // bright daylight: stronger sun + hemisphere, fog pushed far down the straight
      hemi.intensity = 1.3; sun.intensity = 1.3; sun.color.set(0xfff1d6);
      scene.fog.near = 300; scene.fog.far = 1700;
    } else {
      hemi.intensity = 0.62; sun.intensity = 0.5; sun.color.set(0x8fb4ff);
      scene.fog.near = 170; scene.fog.far = 720;
    }
    worldGroup = new THREE.Group();
    buildRoad(worldGroup, th);
    if (curSpec.sprint) {
      buildSprintGround(worldGroup, th, curSpec);
      buildStart(worldGroup, curSpec.start);
      buildStart(worldGroup, curSpec.finish);
      buildRamps(worldGroup, curSpec);
      buildSprintEnv(worldGroup, th, rng(lv * 104729 + 7));
    } else {
      buildGrass(worldGroup);
      buildStart(worldGroup);
      buildEnv(worldGroup, th, rng(lv * 104729 + 7));
    }
    scene.add(worldGroup);
    buildMinimap();
    builtLevel = lv;
  }
  function drawMinimap() {
    var W = mm.width, H = mm.height;
    if (mmPts.sprint) {
      // sprint: straight progress line, rivers as blue ticks, riders by progress
      mmx.clearRect(0, 0, W, H);
      var y0 = H / 2;
      mmx.strokeStyle = 'rgba(255,255,255,.75)'; mmx.lineWidth = 5;
      mmx.beginPath(); mmx.moveTo(12, y0); mmx.lineTo(W - 12, y0); mmx.stroke();
      mmx.strokeStyle = '#57b6ff'; mmx.lineWidth = 3;
      curSpec.gaps.forEach(function (g) {
        var gx = 12 + ((g.s0 - curSpec.start) / curSpec.len) * (W - 24);
        mmx.beginPath(); mmx.moveTo(gx, y0 - 9); mmx.lineTo(gx, y0 + 9); mmx.stroke();
      });
      riders.forEach(function (r) {
        var px = 12 + Math.max(0, Math.min(1, (r.s - curSpec.start) / curSpec.len)) * (W - 24);
        mmx.fillStyle = r.isPlayer ? '#ffd166' : '#a78bfa';
        mmx.beginPath(); mmx.arc(px, y0, r.isPlayer ? 4.5 : 3, 0, 7); mmx.fill();
      });
      return;
    }
    var bb = mmPts.bbox;
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
  // sprint ranking: finishers by finish order, the rest by distance covered
  function sprintRank() {
    return riders.slice().sort(function (a, b) {
      if (a.done && b.done) return a.finishOrder - b.finishOrder;
      if (a.done) return -1;
      if (b.done) return 1;
      return b.s - a.s;
    });
  }
  function updateHUD(player, elapsed) {
    var pos;
    if (curSpec.sprint) {
      pos = sprintRank().indexOf(player) + 1;
    } else {
      var prog = riders.map(function (r) { return { r: r, p: (r.lap - 1) * trackLen + r.s }; });
      prog.sort(function (a, b) { return b.p - a.p; });
      pos = 1;
      prog.forEach(function (e, i) { if (e.r === player) pos = i + 1; });
    }
    elPos.textContent = ORD[pos - 1] || pos + 'th';
    elLap.textContent = curSpec.sprint ? 'SPRINT' : Math.min(player.lap, LAPS) + '/' + LAPS;
    elTime.textContent = fmtTime(elapsed);
    elSpeed.textContent = Math.round(player.speed * 3.6);
    elNitro.style.width = Math.round(player.nitro * 100) + '%';
    drawMinimap();
    return pos;
  }

  /* ================= Input ================= */
  var input = { gas: false, brake: false, left: false, right: false, nitro: false, handbrake: false };
  var KEYMAP = { ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake',
                 ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
                 ShiftLeft: 'nitro', ShiftRight: 'nitro', Space: 'handbrake' };
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
  bindTouch('t-drift', 'handbrake');

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
    // guard: the sub-line innerHTML set below replaces #ag-menu-level on the
    // first call, so it is null on every later call (pre-existing live bug:
    // the throw also broke the garage Back button — menu never reappeared)
    var ml = el('ag-menu-level'); if (ml) ml.textContent = store.level;
    el('ag-menu-sub').innerHTML = (specFor(store.level).sprint
      ? 'Daylight sprint · point-to-point · jump ramps & rivers · Level <b>' + store.level + '</b> of ' + LEVELS + ' — <b>' + THEMES[store.level - 1].name + '</b>'
      : '3 laps · 5 rivals · Level <b>' + store.level + '</b> of ' + LEVELS + ' — <b>' + THEMES[store.level - 1].name + '</b>') +
      '<br>Finish well to earn points, then spend them in the garage.<br>💰 You have <b>' + store.points + '</b> points.';
  }
  function startRace(lv) {
    initAudio();
    if (AC && AC.state === 'suspended') AC.resume();
    if (lv !== builtLevel) buildWorld(lv);
    resetRiders(lv);
    player = null;
    for (var pi2 = 0; pi2 < riders.length; pi2++) if (riders[pi2].isPlayer) player = riders[pi2];
    raceTime = 0; state = 'countdown'; countT = 0;
    clearEffects();
    show(null); hud.style.display = 'flex';
    countEl.classList.remove('hidden');
    toast(curSpec.sprint
      ? 'Level ' + lv + ' — ' + THEMES[lv - 1].name + ' · Sprint! Hit the ramps FAST to clear the rivers! 🏁'
      : 'Level ' + lv + ' — ' + THEMES[lv - 1].name + ' · 3 laps. Good luck!');
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
      if (curSpec.sprint) {
        // point-to-point: crossing the finish distance ends the race
        if (!r.done && r.s >= curSpec.finish) {
          r.done = true; r.finishTime = raceTime; r.finishOrder = ++finishCount;
          if (r.isPlayer) finishRace(r);
        }
      } else {
        // lap counting: s wraps past multiples of trackLen
        var lapNow = Math.floor(r.s / trackLen) + 1;
        if (lapNow > r.lap) {
          r.lap = lapNow;
          if (r.isPlayer) {
            if (r.lap <= LAPS) { toast(r.lap === LAPS ? 'Final lap — send it!' : 'Lap ' + r.lap + '/' + LAPS); beep(660, 0.15); }
            else finishRace(r);
          } else if (lapNow > LAPS && !r.done) { r.done = true; r.finishTime = raceTime; }
        }
      }
    });
    collide();
    trafficCollide();
    stepTraffic(dt, raceTime);
    playerPos = updateHUD(player, raceTime);
    engineSound(player.speed, true);
    updateCamera(player, dt);
    updateEffects(dt);
  }
  function finishRace(p) {
    p.done = true; p.finishTime = raceTime;
    state = 'done';
    engineSound(0, false);
    // let AI finish: positions by progress (sprint: by finish order, then distance)
    var pos = 1;
    if (curSpec.sprint) {
      pos = sprintRank().indexOf(p) + 1;
    } else {
      var prog = riders.map(function (r) {
        return { r: r, p: (Math.min(r.lap, LAPS + 1) - 1) * trackLen + (r.s % trackLen) };
      });
      prog.sort(function (a, b) { return b.p - a.p; });
      prog.forEach(function (e, i) { if (e.r === p) pos = i + 1; });
    }
    var earned = POINTS[pos - 1] || 20;
    store.points += earned;
    var unlocked = false;
    if (pos <= 3 && store.level < LEVELS) { store.level++; unlocked = true; }
    saveStore();
    var titles = ['🏆 Victory! Champion of the track!', '🥈 So close — P2!', '🥉 Podium! P3!', '🏁 P4 — points in the bag!', '🏁 P5 — keep pushing!', '🏁 P6 — the bike forgives, the track remembers.'];
    el('ag-res-title').textContent = titles[pos - 1];
    el('ag-res-sub').innerHTML = 'Level ' + level + (curSpec.sprint ? ' · Sprint' : '') + ' · Time ' + fmtTime(raceTime) +
      '<br>💰 <b>+' + earned + ' points</b> (total ' + store.points + ')' +
      (unlocked ? '<br>🔓 <b>Level ' + store.level + ' unlocked!</b>' : (store.level >= LEVELS && pos <= 3 ? '<br>👑 You conquered all ' + LEVELS + ' levels — legend!' : ''));
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
  buildWorld(store.level);
  resetRiders(store.level);
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

  // read-only QA hook (same pattern as Bubble Pop's __bp): lets tests drive
  // races and observe state without touching gameplay code paths
  window.__ngp = {
    riders: function () { return riders; },
    traffic: function () { return traffic; },
    spec: function () { return curSpec; },
    state: function () { return state; },
    store: function () { return store; },
    trackLen: function () { return trackLen; },
    start: function (lv) { startRace(lv); }
  };

  window.addEventListener('resize', function () {
    var w = canvas.clientWidth || 960;
    // keep 16:10 aspect
  });
})();
