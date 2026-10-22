/* Forest Dash 3D v6 — real-time 3D endless runner (Three.js).
   v6 "grown-up graphics" pass (Apex GP treatment): photo textures from
   ambientCG (CC0) — dirt trail, bark, grass — ACES tone mapping + sRGB,
   pines rebuilt from layered foliage blobs (no more cones), a two-segment
   runner with knees/elbows, per-level sky grading from golden morning to
   deep dusk, dust puffs at the runner's feet, dark-glass pro UI.
   VISUALS ONLY: gameplay, hitboxes, scoring and speed curve are
   byte-identical to v5.
   Levels: each mountain reached unlocks a deeper, darker, faster forest.
   Fog is kept light so hurdles stay readable even at full speed.
   Lesson: keep going — every obstacle passes. */
(function () {
  'use strict';

  var canvas = document.getElementById('dash');
  var elScore = document.getElementById('f-score');
  var elFlies = document.getElementById('f-flies');
  var elBest = document.getElementById('f-best');
  var elMtn = document.getElementById('f-mtn');
  var elLevel = document.getElementById('f-level');
  var overBox = document.getElementById('f-over');
  var overStats = document.getElementById('f-over-stats');
  var startBox = document.getElementById('f-start');
  var BEST_KEY = 'fd3d_best';

  function showBest(v) { elBest.textContent = v > 0 ? v : '—'; }

  var best = 0;
  try { best = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) {}
  showBest(best);

  /* ---------------- v5: auto quality scaling — weak phones stay smooth ----------------
     High-graphics look comes from art direction (lighting, color, texture), not
     raw GPU power. The pipeline stays light: we scale pixel ratio, shadow
     resolution and particle counts to the device. No post-processing anywhere. */
  var IS_MOBILE = /Mobi|Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '') ||
                  (window.innerWidth || 420) < 700;
  var CORES = navigator.hardwareConcurrency || 4;
  var QT = (IS_MOBILE || CORES <= 2) ? 'low' : ((window.devicePixelRatio || 1) > 2 && CORES >= 8 ? 'high' : 'med');
  var Q_PIXEL_RATIO = QT === 'high' ? Math.min(window.devicePixelRatio || 1, 2)
                    : QT === 'med'  ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;
  var Q_SHADOW = QT === 'high' ? 2048 : QT === 'med' ? 1024 : 512;
  var Q_AA = QT !== 'low';
  var Q_DUST = QT === 'high' ? 130 : QT === 'med' ? 90 : 50;
  var Q_FLIES = QT === 'high' ? 26 : QT === 'med' ? 18 : 10;
  var Q_LEAVES = QT === 'high' ? 42 : QT === 'med' ? 24 : 0;

  if (!window.THREE) {
    startBox.querySelector('p').textContent = 'Sorry — your browser could not load the 3D engine. Try a recent Chrome, Safari, or Firefox.';
    document.getElementById('f-play').style.display = 'none';
    return;
  }

  /* ---------------- Levels: light haze only, hurdles always readable ---------------- */
  var LEVELS = [
    { name: 'Sunny Grove',    leg: 800,  speed: 9,  max: 16, near: 26, far: 20, bushes: 16, tufts: 26, fog: 0xd4e9f5, fogNear: 55, fogFar: 240, grass: 0x69b45e, gap: 26 },
    { name: 'Deep Woods',     leg: 900,  speed: 13, max: 20, near: 34, far: 26, bushes: 24, tufts: 38, fog: 0xc6dfee, fogNear: 48, fogFar: 215, grass: 0x5aa855, gap: 22 },
    { name: 'Misty Pines',    leg: 1000, speed: 16, max: 24, near: 40, far: 30, bushes: 30, tufts: 48, fog: 0xc2d2dc, fogNear: 42, fogFar: 195, grass: 0x4f9c50, gap: 19 },
    { name: 'Thunder Forest', leg: 1100, speed: 19, max: 28, near: 46, far: 34, bushes: 36, tufts: 56, fog: 0xb4c3d4, fogNear: 38, fogFar: 180, grass: 0x47924c, gap: 16 }
  ];
  function levelConfig(n) { // n = 1-based; scales endlessly past the named levels
    var i = Math.min(n, LEVELS.length) - 1;
    var c = LEVELS[i];
    if (n <= LEVELS.length) return c;
    var extra = n - LEVELS.length;
    return {
      name: c.name + ' +' + extra, leg: c.leg,
      speed: Math.min(30, c.speed + extra * 2), max: Math.min(34, c.max + extra * 2),
      near: c.near, far: c.far, bushes: c.bushes, tufts: c.tufts,
      fog: c.fog, fogNear: c.fogNear, fogFar: c.fogFar, grass: c.grass,
      gap: Math.max(12, c.gap - extra)
    };
  }

  /* ---------------- Renderer / scene / camera ---------------- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: Q_AA });
  } catch (e) {
    startBox.querySelector('p').textContent = 'Sorry — 3D could not start on this device.';
    document.getElementById('f-play').style.display = 'none';
    return;
  }
  renderer.setPixelRatio(Q_PIXEL_RATIO);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // v6: cinematic output — sRGB + ACES filmic tone mapping (Apex treatment)
  if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
  if (THREE.ACESFilmicToneMapping !== undefined) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
  }

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd4e9f5);
  scene.fog = new THREE.Fog(0xd4e9f5, 55, 240);

  /* ---- Round 1: gradient sky dome (pastel dawn) + glow texture helper ---- */
  function makeGlowTexture(inner, outer) {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  /* v5: subtle speckle texture — flat colors become "dirt" and "grass".
     One 256x256 canvas, tiled; far cheaper than real textures. */
  function makeNoiseTexture(base, speckA, speckB, count) {
    var c = document.createElement('canvas');
    c.width = c.height = 256;
    var x = c.getContext('2d');
    x.fillStyle = base;
    x.fillRect(0, 0, 256, 256);
    for (var i = 0; i < (count || 900); i++) {
      x.fillStyle = Math.random() < 0.5 ? speckA : speckB;
      x.globalAlpha = 0.22 + Math.random() * 0.3;
      var s = 1 + Math.random() * 3;
      x.fillRect(Math.random() * 256, Math.random() * 256, s, s);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  /* v6: per-level sky gradients — the run arcs from golden morning to deep
     dusk. One small canvas texture per level, swapped in applyTheme. */
  function makeSkyTexture(stops) {
    var sc = document.createElement('canvas');
    sc.width = 2; sc.height = 256;
    var sx = sc.getContext('2d');
    var g = sx.createLinearGradient(0, 0, 0, 256);
    for (var si = 0; si < stops.length; si++) g.addColorStop(stops[si][0], stops[si][1]);
    sx.fillStyle = g;
    sx.fillRect(0, 0, 2, 256);
    var t = new THREE.CanvasTexture(sc);
    if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  var SKY_TEX = [
    makeSkyTexture([[0, '#3E74C4'], [0.42, '#79A9E4'], [0.7, '#BCD9F2'], [0.88, '#FFE2AC'], [1, '#FFF0D0']]),
    makeSkyTexture([[0, '#3363B4'], [0.42, '#6C97D8'], [0.7, '#AECBEC'], [0.88, '#FFD9A0'], [1, '#FFE9C4']]),
    makeSkyTexture([[0, '#2C4E8C'], [0.4, '#5E7CB0'], [0.68, '#C08F6E'], [0.88, '#FFAA5C'], [1, '#FFC98C']]),
    makeSkyTexture([[0, '#1C2A50'], [0.4, '#3C4E78'], [0.68, '#6B5A74'], [0.88, '#D97E46'], [1, '#F2A35E']])
  ];
  /* v6: sun / light grade per level (visual only; index matches LEVELS) */
  var SKY_GRADE = [
    { sun: 0xffe9bb, sunI: 1.05, hemiI: 0.9,  disc: 0xffe9a3, flyGlow: 1.0 },
    { sun: 0xffdf9e, sunI: 1.0,  hemiI: 0.85, disc: 0xffdf94, flyGlow: 1.15 },
    { sun: 0xffb066, sunI: 0.95, hemiI: 0.72, disc: 0xffa64d, flyGlow: 1.5 },
    { sun: 0xff8f52, sunI: 0.85, hemiI: 0.6,  disc: 0xff8a3d, flyGlow: 1.9 }
  ];
  var flyGlow = 1;
  var skyDomeMat = new THREE.MeshBasicMaterial({
    map: SKY_TEX[0],
    side: THREE.BackSide, fog: false, depthWrite: false
  });
  var skyDome = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 16), skyDomeMat);
  skyDome.renderOrder = -10;
  skyDome.frustumCulled = false;
  scene.add(skyDome);

  var camera = new THREE.PerspectiveCamera(58, 2, 0.1, 500);
  camera.position.set(0, 4.4, 8.2);
  camera.lookAt(0, 1.4, -10);

  // warm, realistic forest light
  var hemi = new THREE.HemisphereLight(0xd8ecff, 0x3f7a3f, 0.85);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xffecc8, 1.0);
  sun.position.set(16, 30, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(Q_SHADOW, Q_SHADOW);
  sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -32;
  sun.shadow.camera.far = 100;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target); // v6: shadow camera tracks the runner
  var fill = new THREE.DirectionalLight(0xbcd8ff, 0.25); // cool bounce from the sky
  fill.position.set(-12, 18, -6);
  scene.add(fill);
  // v5: soft rim light from behind-left — gives the runner and trees edge
  // definition (the "high-graphics" look) for almost zero GPU cost
  var rim = new THREE.DirectionalLight(0xa8ccff, 0.35);
  rim.position.set(-8, 10, -20);
  scene.add(rim);

  function resize() {
    var w = canvas.clientWidth || 420;
    var h = canvas.clientHeight || Math.round(w * 1.52);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  /* ---------------- Rich, realistic materials ---------------- */
  // v5: ground and path get subtle canvas speckle textures (tiled) instead of
  // flat colors — the single biggest "high graphics" win for ~zero GPU cost.
  // Grass texture is luminance-only (near-white) so the per-level color tint
  // in applyTheme keeps working exactly as before.
  var grassTex = makeNoiseTexture('#ffffff', '#dfe8df', '#f4faf4', 1100);
  grassTex.repeat.set(30, 30);
  var pathTex = makeNoiseTexture('#d9b47c', '#c49a63', '#e8c78f', 800);
  pathTex.repeat.set(2, 42);
  if (THREE.sRGBEncoding !== undefined) { grassTex.encoding = THREE.sRGBEncoding; pathTex.encoding = THREE.sRGBEncoding; }
  /* v6: authored hex colors are sRGB — convert them to linear so the sRGB
     output pass reproduces them faithfully instead of washing them out */
  function std(o) {
    if (o && typeof o.color === 'number') o.color = new THREE.Color(o.color).convertSRGBToLinear();
    return new THREE.MeshStandardMaterial(o);
  }
  function lam(o) {
    if (o && typeof o.color === 'number') o.color = new THREE.Color(o.color).convertSRGBToLinear();
    return new THREE.MeshLambertMaterial(o);
  }
  var M = {
    grass: std({ color: 0xffffff, map: grassTex, roughness: 1, metalness: 0 }),
    grassDark: std({ color: 0x3f7d38, roughness: 1, metalness: 0 }),
    path: std({ color: 0xffffff, map: pathTex, roughness: 1, metalness: 0 }),
    pathEdge: std({ color: 0x9a7d58, map: pathTex, roughness: 1, metalness: 0 }),
    trunk: std({ color: 0xffffff, roughness: 1, metalness: 0 }),
    trunkDark: std({ color: 0xbcae9f, roughness: 1, metalness: 0 }),
    pine: std({ color: 0x2c7a44, roughness: 1, metalness: 0, flatShading: true }),
    pine2: std({ color: 0x35994e, roughness: 1, metalness: 0, flatShading: true }),
    pine3: std({ color: 0x256b3a, roughness: 1, metalness: 0, flatShading: true }),
    pineTip: std({ color: 0x45ad5b, roughness: 1, metalness: 0, flatShading: true }),
    leaf: std({ color: 0x3f9e4f, roughness: 1, metalness: 0, flatShading: true }),
    leaf2: std({ color: 0x2f8a42, roughness: 1, metalness: 0, flatShading: true }),
    leafLit: std({ color: 0x55b95e, roughness: 1, metalness: 0, flatShading: true }),
    bush: std({ color: 0x3a8f47, roughness: 1, metalness: 0, flatShading: true }),
    tuft: std({ color: 0x4da856, roughness: 1, metalness: 0 }),
    fern: std({ color: 0x35853f, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
    treeline: std({ color: 0x3d6e52, roughness: 1, metalness: 0, flatShading: true }),
    rock: std({ color: 0x8d99a8, roughness: 0.95, metalness: 0, flatShading: true }),
    rockDark: std({ color: 0x646e7e, roughness: 0.95, metalness: 0, flatShading: true }),
    snow: std({ color: 0xffffff, roughness: 0.55, metalness: 0 }),
    wood: std({ color: 0xd8c6b2, roughness: 1, metalness: 0 }),
    branch: std({ color: 0xa08b76, roughness: 1, metalness: 0 }),
    cloud: lam({ color: 0xffffff, transparent: true, opacity: 0.92 }),
    sunDisc: new THREE.MeshBasicMaterial({ color: 0xffe9a3, fog: false }),
    fly: new THREE.MeshBasicMaterial({ color: 0xffe066 }),
    skin: std({ color: 0xf2c49b, roughness: 0.75, metalness: 0 }),
    shirt: std({ color: 0x2fbfae, roughness: 0.85, metalness: 0 }),
    shirtDark: std({ color: 0x25a292, roughness: 0.85, metalness: 0 }),
    shorts: std({ color: 0x3b4a6b, roughness: 0.9, metalness: 0 }),
    cap: std({ color: 0xf2789f, roughness: 0.7, metalness: 0 }),
    hair: std({ color: 0x4a3423, roughness: 0.95, metalness: 0 }),
    shoe: std({ color: 0xf5f5f5, roughness: 0.6, metalness: 0 }),
    shoeAccent: std({ color: 0x2fbfae, roughness: 0.6, metalness: 0 }),
    pack: std({ color: 0xff9f43, roughness: 0.85, metalness: 0 }),
    packDark: std({ color: 0xe07b28, roughness: 0.85, metalness: 0 }),
    shroomCap: std({ color: 0xd64541, roughness: 0.55, metalness: 0 }),
    shroomStem: std({ color: 0xf3e6cf, roughness: 0.9, metalness: 0 }),
    warn: new THREE.MeshBasicMaterial({ color: 0xffd23f })
  };
  /* v6: photo textures (ambientCG, CC0) swapped onto materials when loaded;
     the canvas textures above stay as the instant fallback if a file 404s.
     Grass reuses Apex GP's already-live grass textures. */
  var _texLoader = new THREE.TextureLoader();
  function loadPhoto(mat, colorFile, normalFile, rx, ry) {
    _texLoader.load('../images/textures/' + colorFile, function (ctex) {
      ctex.wrapS = ctex.wrapT = THREE.RepeatWrapping;
      ctex.repeat.set(rx, ry); ctex.anisotropy = 4;
      if (THREE.sRGBEncoding !== undefined) ctex.encoding = THREE.sRGBEncoding;
      mat.map = ctex; mat.needsUpdate = true;
      if (normalFile) _texLoader.load('../images/textures/' + normalFile, function (ntex) {
        ntex.wrapS = ntex.wrapT = THREE.RepeatWrapping;
        ntex.repeat.set(rx, ry); ntex.anisotropy = 4;
        mat.normalMap = ntex;
        mat.normalScale = new THREE.Vector2(1.0, 1.0);
        mat.needsUpdate = true;
      });
    });
  }
  loadPhoto(M.grass, 'grass-color.jpg', 'grass-normal.jpg', 30, 30);
  loadPhoto(M.path, 'forest-floor-color.jpg', 'forest-floor-normal.jpg', 2, 42);
  loadPhoto(M.pathEdge, 'forest-floor-color.jpg', 'forest-floor-normal.jpg', 1, 42);
  loadPhoto(M.trunk, 'bark-color.jpg', 'bark-normal.jpg', 1, 2);
  loadPhoto(M.trunkDark, 'bark-color.jpg', 'bark-normal.jpg', 1, 2);
  loadPhoto(M.wood, 'bark-color.jpg', 'bark-normal.jpg', 2, 1);
  loadPhoto(M.branch, 'bark-color.jpg', 'bark-normal.jpg', 1, 1);
  var PINES = [M.pine, M.pine2, M.pine3];
  var LEAVES = [M.leaf, M.leaf2, M.leafLit];
  var G = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(0.5, 12, 10),
    cone: new THREE.ConeGeometry(0.5, 1, 9),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 9),
    circle: new THREE.CircleGeometry(0.5, 12),
    ico: new THREE.IcosahedronGeometry(0.5, 1),
    dodec: new THREE.DodecahedronGeometry(0.5, 0),
    trunkGeo: new THREE.CylinderGeometry(0.3, 0.5, 1, 7),
    plane: new THREE.PlaneGeometry(1, 1)
  };
  function mesh(geo, mat, sx, sy, sz, shadow) {
    var m = new THREE.Mesh(geo, mat);
    m.scale.set(sx || 1, sy || 1, sz || 1);
    m.castShadow = shadow !== false;
    return m;
  }

  /* ---------------- Ground, path, sun, clouds ---------------- */
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(280, 280), M.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -80;
  ground.receiveShadow = true;
  scene.add(ground);

  var path = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 280), M.path);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.02, -80);
  path.receiveShadow = true;
  scene.add(path);
  // soft worn edges along the path
  [-4.1, 4.1].forEach(function (x) {
    var edge = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 280), M.pathEdge);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(x, 0.015, -80);
    edge.receiveShadow = true;
    scene.add(edge);
  });

  var sunDisc = new THREE.Mesh(new THREE.CircleGeometry(7, 24), M.sunDisc);
  sunDisc.position.set(38, 34, -160);
  scene.add(sunDisc);
  // Round 1: additive sun glow sprite (skipped on low tier — one less overdraw)
  if (QT !== 'low') {
    var sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture('rgba(255,240,200,1)', 'rgba(255,240,200,0)'),
      blending: THREE.AdditiveBlending, fog: false, depthWrite: false,
      transparent: true, opacity: 0.9
    }));
    sunGlow.position.copy(sunDisc.position);
    sunGlow.scale.set(52, 52, 1);
    scene.add(sunGlow);
  }

  var clouds = [];
  for (var ci = 0; ci < 7; ci++) {
    var cg = new THREE.Group();
    for (var cj = 0; cj < 4; cj++) {
      var puff = new THREE.Mesh(G.sphere, M.cloud);
      puff.castShadow = false;
      puff.scale.set(2.6 + Math.random() * 2, 1.5 + Math.random(), 1.6);
      puff.position.set(cj * 2.1 - 3.1 + Math.random(), Math.random() * 0.6, Math.random());
      cg.add(puff);
    }
    cg.position.set((Math.random() - 0.5) * 90, 15 + Math.random() * 9, -40 - Math.random() * 90);
    scene.add(cg);
    clouds.push(cg);
  }

  /* ---------------- The mountain (the goal) ---------------- */
  var mountain = new THREE.Group();
  var mBase = mesh(G.cone, M.rock, 62, 82, 62); mBase.position.y = 41; mountain.add(mBase);
  var mSnow = mesh(G.cone, M.snow, 22, 28, 22); mSnow.position.y = 76; mountain.add(mSnow);
  var mBase2 = mesh(G.cone, M.rockDark, 34, 48, 34); mBase2.position.set(34, 24, 8); mountain.add(mBase2);
  var mSnow2 = mesh(G.cone, M.snow, 12, 16, 12); mSnow2.position.set(34, 44, 8); mountain.add(mSnow2);
  var mBase3 = mesh(G.cone, M.rockDark, 26, 36, 26); mBase3.position.set(-32, 18, 10); mountain.add(mBase3);
  // v5: rock strata bands — layered look, two extra cones, zero animation cost
  var mStrata = mesh(G.cone, M.rockDark, 44, 9, 44, false); mStrata.position.y = 52; mountain.add(mStrata);
  var mStrata2 = mesh(G.cone, M.rock, 52, 7, 52, false); mStrata2.position.y = 34; mountain.add(mStrata2);
  var MTN_FAR = -170, MTN_NEAR = -36;
  mountain.position.set(-6, 0, MTN_FAR);
  scene.add(mountain);

  /* ---------------- Distant treeline (horizon depth) ---------------- */
  var treeline = [];
  for (var di = 0; di < 26; di++) {
    var dt2 = mesh(G.ico, M.treeline, 7 + Math.random() * 6, 16 + Math.random() * 14, 7 + Math.random() * 6, false);
    dt2.position.set(-70 + di * 5.6 + (Math.random() - 0.5) * 4, 6, -125 - Math.random() * 25);
    scene.add(dt2);
    treeline.push(dt2);
  }

  /* ---------------- Forest walls: near detail + far depth ---------------- */
  var nearTrees = [], farTrees = [], bushes = [], tufts = [], canopy = [], patches = [];

  /* v6: pines rebuilt — no more cones. Layered, drooping foliage tiers of
     flat-shaded icosahedron blobs around a tapered bark trunk. */
  function makePine(detail) {
    var g = new THREE.Group();
    var flare = mesh(G.cyl, M.trunkDark, 0.95, 0.55, 0.95, detail);
    flare.position.y = 0.27;
    g.add(flare);
    var trunk = mesh(G.trunkGeo, Math.random() < 0.5 ? M.trunk : M.trunkDark, 0.72, 2.6, 0.72, detail);
    trunk.position.y = 1.3;
    g.add(trunk);
    var pm = PINES[(Math.random() * PINES.length) | 0];
    var pm2 = PINES[(Math.random() * PINES.length) | 0];
    var tiers = detail ? 4 : 3;
    var perTier = detail ? 3 : 1;
    for (var t = 0; t < tiers; t++) {
      var ty = 2.5 + t * 1.28;
      var tr = 2.5 - t * 0.42;
      var tm = t % 2 ? pm2 : pm;
      var center = mesh(G.ico, tm, tr * 1.7, tr * 0.78, tr * 1.7, detail);
      center.position.y = ty;
      center.rotation.y = Math.random() * 3;
      g.add(center);
      for (var b = 0; b < perTier; b++) {
        var ang = (b / perTier) * Math.PI * 2 + t * 1.1 + Math.random() * 0.7;
        var sat = mesh(G.ico, tm, tr * 1.05, tr * 0.62, tr * 1.05, detail);
        sat.position.set(Math.cos(ang) * tr * 0.62, ty - 0.22, Math.sin(ang) * tr * 0.62);
        sat.rotation.y = Math.random() * 3;
        g.add(sat);
      }
    }
    var tipB = mesh(G.ico, M.pineTip, 1.15, 1.5, 1.15, detail);
    tipB.position.y = 2.5 + tiers * 1.28 + 0.35;
    g.add(tipB);
    g.rotation.y = Math.random() * Math.PI * 2;
    return g;
  }
  function makeLeafy(detail) {
    var g = new THREE.Group();
    var flare = mesh(G.cyl, M.trunkDark, 0.85, 0.5, 0.85, detail);
    flare.position.y = 0.25;
    g.add(flare);
    var trunk = mesh(G.trunkGeo, Math.random() < 0.5 ? M.trunk : M.trunkDark, 0.66, 2.4, 0.66, detail);
    trunk.position.y = 1.2;
    g.add(trunk);
    // v6: organic canopy — overlapping flat-shaded blobs with per-blob hue picks
    var main = mesh(G.ico, LEAVES[(Math.random() * LEAVES.length) | 0], 3.9, 3.3, 3.9, detail);
    main.position.y = 3.9;
    main.rotation.y = Math.random() * 3;
    g.add(main);
    var blobs = detail ? 5 : 2;
    for (var b = 0; b < blobs; b++) {
      var ang = Math.random() * Math.PI * 2;
      var rad = 1.1 + Math.random() * 0.9;
      var bl = mesh(G.ico, LEAVES[(Math.random() * LEAVES.length) | 0], 1.6 + Math.random() * 1.1, 1.4 + Math.random() * 0.9, 1.6 + Math.random() * 1.1, detail);
      bl.position.set(Math.cos(ang) * rad, 3.4 + Math.random() * 1.9, Math.sin(ang) * rad);
      bl.rotation.y = Math.random() * 3;
      g.add(bl);
    }
    g.rotation.y = Math.random() * Math.PI * 2;
    return g;
  }
  function makeTree(detail) {
    var t = Math.random() < 0.55 ? makePine(detail) : makeLeafy(detail);
    var s = detail ? 0.95 + Math.random() * 0.75 : 1.1 + Math.random() * 0.9;
    t.scale.set(s, s, s);
    return t;
  }
  function forestX(min, max) {
    var side = Math.random() < 0.5 ? -1 : 1;
    return side * (min + Math.random() * (max - min));
  }
  var MAX_NEAR = 48, MAX_FAR = 36;
  var i;
  for (i = 0; i < MAX_NEAR; i++) {
    var nt = makeTree(true);
    nt.position.set(forestX(4.6, 9.5), 0, -90 + Math.random() * 102);
    scene.add(nt);
    nearTrees.push(nt);
  }
  for (i = 0; i < MAX_FAR; i++) {
    var ft = makeTree(false);
    ft.position.set(forestX(9.5, 17), 0, -90 + Math.random() * 102);
    scene.add(ft);
    farTrees.push(ft);
  }
  // bushes — v6: clusters of foliage blobs, not single spheres
  function makeBush() {
    var g = new THREE.Group();
    var n = 2 + ((Math.random() * 2) | 0);
    for (var b = 0; b < n; b++) {
      var bl = mesh(G.ico, Math.random() < 0.5 ? M.bush : M.leaf2, 1.5, 1.05, 1.5, false);
      bl.position.set((Math.random() - 0.5) * 1.1, 0.45 + Math.random() * 0.25, (Math.random() - 0.5) * 1.1);
      bl.rotation.y = Math.random() * 3;
      g.add(bl);
    }
    var bs = 0.8 + Math.random() * 1.0;
    g.scale.set(bs, bs, bs);
    return g;
  }
  for (i = 0; i < 40; i++) {
    var bu = makeBush();
    bu.position.set(forestX(4.0, 10.5), 0, -90 + Math.random() * 102);
    scene.add(bu);
    bushes.push(bu);
  }
  /* v6: scattered rocks, fallen leaves on the path, mushrooms (pure decor —
     recycled with the same scroll as the rest of the flora) */
  var rocks = [], litter = [], shrooms = [];
  for (i = 0; i < 22; i++) {
    var rk = mesh(G.dodec, Math.random() < 0.5 ? M.rock : M.rockDark, 1, 0.8, 1, false);
    var rs = 0.35 + Math.random() * 1.0;
    rk.scale.set(rs, rs * 0.8, rs);
    rk.position.set(forestX(3.9, 13), rs * 0.3, -90 + Math.random() * 102);
    rk.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    scene.add(rk);
    rocks.push(rk);
  }
  var LITTER_MATS = [0xd98e4a, 0xc96f35, 0xe0b34e, 0xb85c33].map(function (cc) { return lam({ color: cc }); });
  for (i = 0; i < 30; i++) {
    var lf = new THREE.Mesh(G.plane, LITTER_MATS[i % 4]);
    var ls = 0.2 + Math.random() * 0.22;
    lf.scale.set(ls, ls, 1);
    lf.rotation.x = -Math.PI / 2;
    lf.rotation.z = Math.random() * 3;
    lf.position.set((Math.random() - 0.5) * 6.2, 0.035, -90 + Math.random() * 102);
    scene.add(lf);
    litter.push(lf);
  }
  for (i = 0; i < 12; i++) {
    var sh = new THREE.Group();
    var stem = mesh(G.cyl, M.shroomStem, 0.16, 0.3, 0.16, false);
    stem.position.y = 0.15;
    sh.add(stem);
    var capM = mesh(G.sphere, M.shroomCap, 0.42, 0.26, 0.42, false);
    capM.position.y = 0.32;
    sh.add(capM);
    sh.position.set(forestX(3.8, 9), 0, -90 + Math.random() * 102);
    scene.add(sh);
    shrooms.push(sh);
  }
  // grass tufts + ferns — v6: ferns are crossed leaf planes; tufts get flower pops
  var FLOWER_MATS = [0xffd166, 0xff8fab, 0xffffff].map(function (cc) { return lam({ color: cc }); });
  for (i = 0; i < 60; i++) {
    var tg = new THREE.Group();
    if (Math.random() < 0.4) {
      for (var fp2 = 0; fp2 < 3; fp2++) {
        var frond = new THREE.Mesh(G.plane, M.fern);
        frond.scale.set(1.15, 0.85, 1);
        frond.position.y = 0.36;
        frond.rotation.set(-0.55, fp2 * Math.PI / 3, 0);
        tg.add(frond);
      }
    } else {
      for (var k = 0; k < 3; k++) {
        var blade = mesh(G.cone, M.tuft, 0.36, 1.0 + Math.random() * 0.6, 0.36, false);
        blade.position.set((Math.random() - 0.5) * 0.6, 0.45, (Math.random() - 0.5) * 0.6);
        blade.rotation.z = (Math.random() - 0.5) * 0.45;
        tg.add(blade);
      }
      if (Math.random() < 0.3) {
        for (var fw = 0; fw < 2; fw++) {
          var fl2 = new THREE.Mesh(G.sphere, FLOWER_MATS[(Math.random() * 3) | 0]);
          fl2.scale.set(0.11, 0.11, 0.11);
          fl2.position.set((Math.random() - 0.5) * 0.5, 0.55 + Math.random() * 0.3, (Math.random() - 0.5) * 0.5);
          tg.add(fl2);
        }
      }
    }
    tg.position.set(forestX(3.6, 12), 0, -90 + Math.random() * 102);
    scene.add(tg);
    tufts.push(tg);
  }
  // dark ground patches for texture
  for (i = 0; i < 44; i++) {
    var pa = new THREE.Mesh(G.circle, M.grassDark);
    pa.rotation.x = -Math.PI / 2;
    var ps = 1.5 + Math.random() * 3.5;
    pa.scale.set(ps, ps, 1);
    pa.position.set(forestX(3.5, 14), 0.012, -90 + Math.random() * 102);
    pa.receiveShadow = true;
    scene.add(pa);
    patches.push(pa);
  }
  // canopy clusters hanging over the track edges
  for (i = 0; i < 10; i++) {
    var cg2 = new THREE.Group();
    var cm = LEAVES[(Math.random() * LEAVES.length) | 0];
    for (var q2 = 0; q2 < 3; q2++) {
      var cl = mesh(G.ico, cm, 2.6, 1.8, 2.6, false);
      cl.rotation.y = Math.random() * 3;
      cl.position.set((Math.random() - 0.5) * 3.4, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 3);
      cg2.add(cl);
    }
    cg2.position.set(forestX(2.5, 6.5), 8.6 + Math.random() * 2.4, -90 + Math.random() * 102);
    scene.add(cg2);
    canopy.push(cg2);
  }

  /* ---------------- Dust motes drifting in the light ---------------- */
  var DUST_N = Q_DUST;
  var dustGeo = new THREE.BufferGeometry();
  var dustPos = new Float32Array(DUST_N * 3);
  var dustSeed = [];
  for (i = 0; i < DUST_N; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 24;
    dustPos[i * 3 + 1] = 0.5 + Math.random() * 6.5;
    dustPos[i * 3 + 2] = -60 + Math.random() * 70;
    dustSeed.push(Math.random() * 6.28);
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xfff6d8, size: 0.16, transparent: true, opacity: 0.65,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  scene.add(dust);

  /* ---- Round 1: ambient glow fireflies (additive points, gentle sine drift) ---- */
  var FLY_N = Q_FLIES;
  var flyGeo = new THREE.BufferGeometry();
  var flyPos = new Float32Array(FLY_N * 3);
  var flySeed = [];
  for (var ffi = 0; ffi < FLY_N; ffi++) {
    flyPos[ffi * 3] = (Math.random() - 0.5) * 18;
    flyPos[ffi * 3 + 1] = 0.8 + Math.random() * 4.5;
    flyPos[ffi * 3 + 2] = -55 + Math.random() * 60;
    flySeed.push(Math.random() * 6.28);
  }
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  var flyPts = new THREE.Points(flyGeo, new THREE.PointsMaterial({
    color: 0xffe27a, size: 0.42, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
    map: makeGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)')
  }));
  flyPts.frustumCulled = false;
  scene.add(flyPts);

  /* ---- v5: falling leaves — pooled points drifting down through the light ----
     Skipped entirely on low tier (Q_LEAVES = 0): one less system for weak GPUs. */
  var LEAF_N = Q_LEAVES, leafGeo = null, leafPts = null, leafSeed = [];
  if (LEAF_N > 0) {
    leafGeo = new THREE.BufferGeometry();
    var leafPos = new Float32Array(LEAF_N * 3);
    for (var li = 0; li < LEAF_N; li++) {
      leafPos[li * 3] = (Math.random() - 0.5) * 22;
      leafPos[li * 3 + 1] = Math.random() * 9;
      leafPos[li * 3 + 2] = -60 + Math.random() * 70;
      leafSeed.push(Math.random() * 6.28);
    }
    leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPos, 3));
    leafPts = new THREE.Points(leafGeo, new THREE.PointsMaterial({
      color: 0x86c96b, size: 0.34, transparent: true, opacity: 0.9, depthWrite: false
    }));
    leafPts.frustumCulled = false;
    scene.add(leafPts);
  }

  function applyTheme(cfg) {
    scene.fog.color.setHex(cfg.fog);
    scene.fog.near = cfg.fogNear;
    scene.fog.far = cfg.fogFar;
    scene.background.setHex(cfg.fog);
    // v6: swap in the level's sky gradient + light grade (golden -> deep dusk)
    var ti = 0;
    for (var li3 = 0; li3 < LEVELS.length; li3++) if (LEVELS[li3].fog === cfg.fog) ti = li3;
    skyDomeMat.map = SKY_TEX[ti];
    skyDomeMat.color.setHex(0xffffff);
    skyDomeMat.needsUpdate = true;
    var gr = SKY_GRADE[ti];
    sun.color.setHex(gr.sun).convertSRGBToLinear();
    sun.intensity = gr.sunI;
    hemi.intensity = gr.hemiI;
    M.sunDisc.color.setHex(gr.disc).convertSRGBToLinear();
    flyGlow = gr.flyGlow;
    flyPts.material.size = 0.42 + 0.12 * (flyGlow - 1);
    // photo grass takes the level tint gently — lerped toward white so the
    // photographic texture does not go muddy
    M.grass.color.setHex(cfg.grass).lerp(new THREE.Color(0xffffff), 0.62);
    M.grass.color.convertSRGBToLinear();
    for (var n = 0; n < nearTrees.length; n++) nearTrees[n].visible = n < cfg.near;
    for (var f = 0; f < farTrees.length; f++) farTrees[f].visible = f < cfg.far;
    for (var b = 0; b < bushes.length; b++) bushes[b].visible = b < cfg.bushes;
    for (var t = 0; t < tufts.length; t++) tufts[t].visible = t < cfg.tufts;
  }
  var scrollDz = 0;
  function recycleFlora(list, min, max) {
    for (var r = 0; r < list.length; r++) {
      var o = list[r];
      if (!o.visible) continue;
      o.position.z += scrollDz;
      if (o.position.z > KILL_Z) {
        o.position.z -= 102;
        o.position.x = forestX(min, max);
      }
    }
  }

  /* ---------------- The runner ---------------- */
  var player = new THREE.Group();
  var legL, legR, armL, armR, torsoG, shinL, shinR, foreL, foreR;
  (function buildRunner() {
    var hipY = 0.78;
    /* v6: two-segment legs — thigh (shorts) + shin (skin) with a real knee;
       chunky sneakers ride on the shins so they swing with the run cycle */
    function buildLeg(sideX) {
      var leg = new THREE.Group();
      leg.position.set(sideX, hipY, 0);
      var thigh = mesh(G.box, M.shorts, 0.25, 0.42, 0.27);
      thigh.position.y = -0.21;
      leg.add(thigh);
      var shin = new THREE.Group();
      shin.position.y = -0.42;
      var shinM = mesh(G.box, M.skin, 0.2, 0.36, 0.22);
      shinM.position.y = -0.18;
      shin.add(shinM);
      var sock = mesh(G.box, M.shoe, 0.21, 0.1, 0.23);
      sock.position.y = -0.33;
      shin.add(sock);
      var shoe = mesh(G.box, M.shoe, 0.27, 0.15, 0.46);
      shoe.position.set(0, -0.4, 0.06);
      shin.add(shoe);
      var sole = mesh(G.box, M.shoeAccent, 0.28, 0.05, 0.47);
      sole.position.set(0, -0.47, 0.06);
      shin.add(sole);
      leg.add(shin);
      player.add(leg);
      return { leg: leg, shin: shin };
    }
    var bl = buildLeg(-0.16); legL = bl.leg; shinL = bl.shin;
    var br = buildLeg(0.16); legR = br.leg; shinR = br.shin;

    torsoG = new THREE.Group();
    var torso = mesh(G.box, M.shirt, 0.6, 0.68, 0.34); torso.position.y = 0.34;
    torsoG.add(torso);
    var chest = mesh(G.box, M.shirtDark, 0.62, 0.2, 0.36); chest.position.y = 0.52;
    torsoG.add(chest);
    // backpack: body, lid, bedroll, pocket and compression straps
    var pack = mesh(G.box, M.pack, 0.44, 0.52, 0.24);
    pack.position.set(0, 0.38, -0.3);
    torsoG.add(pack);
    var packTop = mesh(G.box, M.packDark, 0.46, 0.13, 0.26);
    packTop.position.set(0, 0.66, -0.3);
    torsoG.add(packTop);
    var roll = mesh(G.cyl, M.packDark, 0.2, 0.5, 0.2);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.79, -0.3);
    torsoG.add(roll);
    var pocket = mesh(G.box, M.packDark, 0.3, 0.26, 0.06);
    pocket.position.set(0, 0.3, -0.44);
    torsoG.add(pocket);
    [-0.13, 0.13].forEach(function (sx2) {
      var strap = mesh(G.box, M.packDark, 0.09, 0.56, 0.27);
      strap.position.set(sx2, 0.38, -0.3);
      torsoG.add(strap);
    });
    torsoG.position.y = hipY;
    player.add(torsoG);

    /* v6: two-segment arms — sleeve + forearm + hand, elbows bent to run */
    function buildArm(sideX) {
      var arm = new THREE.Group();
      arm.position.set(sideX, hipY + 0.58, 0);
      var upper = mesh(G.box, M.shirt, 0.19, 0.34, 0.2);
      upper.position.y = -0.17;
      arm.add(upper);
      var fore = new THREE.Group();
      fore.position.y = -0.34;
      var foreM = mesh(G.box, M.skin, 0.16, 0.3, 0.17);
      foreM.position.y = -0.15;
      fore.add(foreM);
      var hand = mesh(G.sphere, M.skin, 0.17, 0.17, 0.17);
      hand.position.y = -0.34;
      fore.add(hand);
      fore.rotation.x = -0.65;
      arm.add(fore);
      player.add(arm);
      return { arm: arm, fore: fore };
    }
    var ba = buildArm(-0.41); armL = ba.arm; foreL = ba.fore;
    var bb = buildArm(0.41); armR = bb.arm; foreR = bb.fore;

    var neck = mesh(G.cyl, M.skin, 0.16, 0.14, 0.16); neck.position.y = hipY + 0.72;
    player.add(neck);
    var head = mesh(G.sphere, M.skin, 0.56, 0.6, 0.56); head.position.y = hipY + 1.02;
    player.add(head);
    // hair mass under the cap + ponytail out the back (the camera's view)
    var hair = mesh(G.sphere, M.hair, 0.58, 0.5, 0.58); hair.position.set(0, hipY + 1.1, -0.05);
    player.add(hair);
    var tail = mesh(G.cone, M.hair, 0.2, 0.5, 0.2); tail.position.set(0, hipY + 0.84, -0.3); tail.rotation.x = 0.5;
    player.add(tail);
    [-0.29, 0.29].forEach(function (ex) {
      var ear = mesh(G.sphere, M.skin, 0.11, 0.13, 0.11);
      ear.position.set(ex, hipY + 1.02, 0);
      player.add(ear);
    });
    var capTop = mesh(G.cyl, M.cap, 0.6, 0.22, 0.6); capTop.position.y = hipY + 1.3;
    player.add(capTop);
    var capBtn = mesh(G.sphere, M.cap, 0.1, 0.08, 0.1); capBtn.position.y = hipY + 1.43;
    player.add(capBtn);
    var brim = mesh(G.box, M.cap, 0.5, 0.08, 0.4); brim.position.set(0, hipY + 1.22, 0.42);
    player.add(brim);

    player.rotation.y = Math.PI; // face away from camera (running into the forest)
  })();
  scene.add(player);

  /* ---------------- Hurdles: bold, readable at speed ---------------- */
  var LANES = [-2.2, 0, 2.2];
  var SPAWN_Z = -72, KILL_Z = 12;

  function makeLog() {
    var g = new THREE.Group();
    var log = mesh(G.cyl, M.wood, 0.66, 2.2, 0.66);
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.36;
    g.add(log);
    for (var i = -1; i <= 1; i += 2) {
      var ring = mesh(G.cyl, M.trunk, 0.68, 0.1, 0.68);
      ring.rotation.z = Math.PI / 2;
      ring.position.set(i * 1.06, 0.36, 0);
      g.add(ring);
    }
    // v6: cut end caps on the log
    [-1.11, 1.11].forEach(function (ex) {
      var cap2 = new THREE.Mesh(G.circle, M.trunkDark);
      cap2.scale.set(0.66, 0.66, 1);
      cap2.position.set(ex, 0.36, 0);
      cap2.rotation.y = ex > 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(cap2);
    });
    // v5: unlit warning stripes — stay bright and readable at full speed
    var stripe = mesh(G.box, M.warn, 0.18, 0.7, 0.7);
    stripe.position.y = 0.36;
    stripe.castShadow = false;
    g.add(stripe);
    g.userData = { type: 'log' };
    return g;
  }
  function makeBranch() {
    var g = new THREE.Group();
    for (var i = -1; i <= 1; i += 2) {
      var post = mesh(G.cyl, M.trunk, 0.24, 2.0, 0.24);
      post.position.set(i * 1.1, 1.0, 0);
      g.add(post);
    }
    var plank = mesh(G.box, M.branch, 2.5, 0.36, 0.32);
    plank.position.y = 1.68;
    g.add(plank);
    for (var j = 0; j < 5; j++) {
      var leaf = mesh(G.ico, M.leaf, 0.75, 0.6, 0.75);
      leaf.position.set(-1.0 + j * 0.5, 2.02, (Math.random() - 0.5) * 0.3);
      g.add(leaf);
    }
    g.userData = { type: 'branch' };
    return g;
  }
  function makeWall() {
    var g = new THREE.Group();
    var wall = mesh(G.box, M.rock, 2.2, 2.0, 0.9);
    wall.position.y = 1.0;
    g.add(wall);
    var cap = mesh(G.box, M.rockDark, 2.35, 0.32, 1.0);
    cap.position.y = 2.1;
    g.add(cap);
    // moss on top so it belongs to the forest
    var moss = mesh(G.ico, M.bush, 1.6, 0.5, 0.8, false);
    moss.position.y = 2.3;
    g.add(moss);
    // v5: warning stripe across the wall face — readable at speed
    var wStripe = mesh(G.box, M.warn, 2.24, 0.28, 0.06);
    wStripe.position.set(0, 1.0, 0.46);
    wStripe.castShadow = false;
    g.add(wStripe);
    g.userData = { type: 'wall' };
    return g;
  }
  var hurdleMakers = [makeLog, makeBranch, makeWall];
  var hurdles = [];
  for (var hi = 0; hi < 18; hi++) {
    var h = hurdleMakers[hi % 3]();
    h.visible = false;
    scene.add(h);
    hurdles.push(h);
  }
  function freeHurdle() {
    for (var i = 0; i < hurdles.length; i++) if (!hurdles[i].visible) return hurdles[i];
    return null;
  }
  function spawnRow() {
    var lanes = [0, 1, 2].sort(function () { return Math.random() - 0.5; });
    var count = Math.random() < 0.45 ? 2 : 1;
    var usedWall = false;
    for (var i = 0; i < count; i++) {
      var h = freeHurdle();
      if (!h) return;
      if (h.userData.type === 'wall') {
        if (usedWall) continue;
        usedWall = true;
      }
      h.position.set(LANES[lanes[i]], 0, SPAWN_Z);
      h.visible = true;
    }
  }

  /* ---------------- Fireflies ---------------- */
  // v5: shared halo sprite — collectibles glow like premium pickups
  var flyHaloMat = new THREE.SpriteMaterial({
    map: makeGlowTexture('rgba(255,235,150,1)', 'rgba(255,235,150,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false,
    transparent: true, opacity: 0.85
  });
  var flies = [];
  for (var fi = 0; fi < 14; fi++) {
    var f = new THREE.Mesh(G.sphere, M.fly);
    f.castShadow = false;
    f.scale.set(0.3, 0.3, 0.3);
    f.visible = false;
    var halo = new THREE.Sprite(flyHaloMat);
    halo.scale.set(1.5, 1.5, 1);
    f.add(halo);
    scene.add(f);
    flies.push({ m: f, active: false, ph: Math.random() * 6 });
  }
  function spawnFlies() {
    var lane = LANES[(Math.random() * 3) | 0];
    var n = 3 + ((Math.random() * 3) | 0);
    var placed = 0;
    for (var i = 0; i < flies.length && placed < n; i++) {
      if (flies[i].active) continue;
      flies[i].active = true;
      flies[i].m.visible = true;
      flies[i].m.position.set(lane, 1.1 + Math.random() * 0.7, SPAWN_Z - placed * 3.2);
      placed++;
    }
  }

  /* ---- v6: dust puffs at the runner's feet (soft sprites, pooled) ---- */
  var PUFF_N = QT === 'high' ? 36 : QT === 'med' ? 24 : 0;
  var puffs = [], puffTimer = 0;
  if (PUFF_N > 0) {
    var puffTex = makeGlowTexture('rgba(219,196,158,0.85)', 'rgba(219,196,158,0)');
    for (var pi = 0; pi < PUFF_N; pi++) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: puffTex, transparent: true, opacity: 0, depthWrite: false
      }));
      sp.visible = false;
      scene.add(sp);
      puffs.push({ s: sp, life: 0, max: 1, vx: 0, vy: 0, vz: 0 });
    }
  }
  function spawnPuff(x, y, z, big) {
    for (var i2 = 0; i2 < puffs.length; i2++) {
      var p = puffs[i2];
      if (p.life > 0) continue;
      p.life = p.max = big ? 0.7 : 0.45 + Math.random() * 0.2;
      p.s.visible = true;
      p.s.position.set(x + (Math.random() - 0.5) * 0.3, y, z + (Math.random() - 0.5) * 0.2);
      var sc = big ? 0.55 : 0.3;
      p.s.scale.set(sc, sc, 1);
      p.vx = (Math.random() - 0.5) * 0.5;
      p.vy = 0.7 + Math.random() * 0.5;
      p.vz = 1.2 + Math.random() * 0.8;
      return;
    }
  }
  function puffBurst() {
    for (var i3 = 0; i3 < 6; i3++) spawnPuff(player.position.x, 0.18, 0.25, true);
  }
  function updatePuffs(dt) {
    if (!puffs.length) return;
    if (state === 'playing' && grounded && sliding <= 0) {
      puffTimer -= dt;
      if (puffTimer <= 0) {
        puffTimer = 0.07;
        spawnPuff(player.position.x, 0.14, 0.3, false);
      }
    }
    for (var i4 = 0; i4 < puffs.length; i4++) {
      var p = puffs[i4];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.s.visible = false; p.s.material.opacity = 0; continue; }
      var k = 1 - p.life / p.max;
      p.s.position.x += p.vx * dt;
      p.s.position.y += p.vy * dt;
      p.s.position.z += p.vz * dt;
      var sc2 = p.s.scale.x + dt * 1.1;
      p.s.scale.set(sc2, sc2, 1);
      p.s.material.opacity = 0.34 * (1 - k);
    }
  }

  /* ---------------- Game state ---------------- */
  var state = 'ready'; // ready | playing | over
  var laneIdx = 1, targetX = 0;
  var py = 0, vy = 0, grounded = true;
  var sliding = 0;
  var dist = 0, flyCount = 0, score = 0, bonus = 0;
  var levelStart = 0;
  var speed = 9;
  var runT = 0;
  var nextRowAt = 30, nextFliesAt = 14;
  var toastTimer = null;
  var level = 1, cfg = levelConfig(1);

  function toast(msg) {
    var t = document.getElementById('f-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  function resetWorld() {
    var i;
    for (i = 0; i < hurdles.length; i++) hurdles[i].visible = false;
    for (i = 0; i < flies.length; i++) { flies[i].active = false; flies[i].m.visible = false; }
    var lists = [[nearTrees, 4.6, 9.5], [farTrees, 9.5, 17], [bushes, 4.0, 10.5], [tufts, 3.6, 12], [canopy, 2.5, 6.5], [patches, 3.5, 14], [rocks, 3.9, 13], [litter, 0.2, 3.2], [shrooms, 3.8, 9]];
    for (var l = 0; l < lists.length; l++) {
      var arr = lists[l][0];
      for (i = 0; i < arr.length; i++) {
        arr[i].position.z = -90 + Math.random() * 102;
        arr[i].position.x = forestX(lists[l][1], lists[l][2]);
      }
    }
    mountain.position.z = MTN_FAR;
    level = 1;
    cfg = levelConfig(1);
    applyTheme(cfg);
  }

  function startGame() {
    state = 'playing';
    laneIdx = 1; targetX = 0;
    player.position.set(0, 0, 0);
    py = 0; vy = 0; grounded = true; sliding = 0;
    dist = 0; flyCount = 0; score = 0; bonus = 0; runT = 0; levelStart = 0;
    level = 1;
    cfg = levelConfig(1);
    speed = cfg.speed;
    nextRowAt = 34; nextFliesAt = 16;
    resetWorld();
    overBox.classList.add('hidden');
    startBox.classList.add('hidden');
    elScore.textContent = '0';
    elFlies.textContent = '0';
    elMtn.textContent = '0%';
    elLevel.textContent = '1';
  }

  function levelUp() {
    level++;
    levelStart = dist;
    cfg = levelConfig(level);
    speed = cfg.speed;
    applyTheme(cfg);
    bonus += 250;
    elLevel.textContent = level;
    toast('🏔 Level ' + level + ': ' + cfg.name + '! +250');
  }

  function endGame() {
    state = 'over';
    if (score > best) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
      showBest(best);
    }
    overStats.innerHTML = 'You reached <strong>Level ' + level + '</strong>, dashed <strong>' + Math.floor(dist) + ' m</strong> and caught <strong>' + flyCount + '</strong> fireflies.<br>Score: <strong>' + score + '</strong> · Best: <strong>' + best + '</strong>';
    overBox.classList.remove('hidden');
  }

  /* ---------------- Input ---------------- */
  function doLeft() { if (state === 'playing' && laneIdx > 0) { laneIdx--; targetX = LANES[laneIdx]; } }
  function doRight() { if (state === 'playing' && laneIdx < 2) { laneIdx++; targetX = LANES[laneIdx]; } }
  function doJump() {
    if (state === 'ready') { startGame(); return; }
    if (state !== 'playing' || !grounded) return;
    grounded = false; vy = 8.2; sliding = 0;
  }
  function doSlide() {
    if (state !== 'playing' || !grounded || sliding > 0) return;
    sliding = 0.68;
  }
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { doLeft(); e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { doRight(); e.preventDefault(); }
    else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') { doJump(); e.preventDefault(); }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { doSlide(); e.preventDefault(); }
  });

  var tsX = 0, tsY = 0;
  canvas.addEventListener('touchstart', function (e) {
    var t = e.changedTouches[0];
    tsX = t.clientX; tsY = t.clientY;
  }, { passive: true });
  canvas.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0];
    var dx = t.clientX - tsX, dy = t.clientY - tsY;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) { doJump(); return; } // tap = jump
    if (Math.abs(dx) > Math.abs(dy)) { if (dx > 0) doRight(); else doLeft(); }
    else { if (dy < 0) doJump(); else doSlide(); }
    e.preventDefault();
  }, { passive: false });

  document.getElementById('f-play').addEventListener('click', startGame);
  document.getElementById('f-again').addEventListener('click', startGame);
  document.getElementById('f-restart').addEventListener('click', startGame);

  /* ---------------- Animation ---------------- */
  var clock = new THREE.Clock();

  var landDip = 0;
  function animateRunner(dt) {
    runT += dt * (5 + speed * 0.45);
    var s = Math.sin(runT), c = Math.cos(runT);
    if (!grounded) { // tuck legs in the air
      legL.rotation.x = -0.9; legR.rotation.x = 0.5;
      armL.rotation.x = -2.2; armR.rotation.x = -2.2;
      shinL.rotation.x = 1.0; shinR.rotation.x = 0.7; // v6: knees tuck in the air
      foreL.rotation.x = -0.4; foreR.rotation.x = -0.4;
    } else if (sliding > 0) {
      legL.rotation.x = -1.2; legR.rotation.x = -1.2;
      armL.rotation.x = 0.6; armR.rotation.x = 0.6;
      shinL.rotation.x = 0.15; shinR.rotation.x = 0.15;
      foreL.rotation.x = -0.3; foreR.rotation.x = -0.3;
    } else {
      legL.rotation.x = s * 0.95; legR.rotation.x = -s * 0.95;
      armL.rotation.x = -s * 0.8; armR.rotation.x = s * 0.8;
      // v6: knees bend as each leg swings back; forearms pump against the swing
      shinL.rotation.x = Math.max(0, -s) * 0.95;
      shinR.rotation.x = Math.max(0, s) * 0.95;
      foreL.rotation.x = -0.65 - Math.max(0, s) * 0.35;
      foreR.rotation.x = -0.65 - Math.max(0, -s) * 0.35;
    }
    // lane glide
    var px = player.position.x;
    player.position.x = px + (targetX - px) * Math.min(1, dt * 11);
    // vertical
    if (!grounded) {
      vy -= 26 * dt;
      py += vy * dt;
      if (py <= 0) { py = 0; vy = 0; grounded = true; landDip = 1; puffBurst(); }
    }
    if (sliding > 0) sliding -= dt;
    if (landDip > 0) landDip = Math.max(0, landDip - dt * 5);
    var squash = 1 - landDip * 0.1;
    player.scale.set(1, (sliding > 0 ? 0.62 : 1) * squash, 1);
    player.position.y = py + (grounded && sliding <= 0 ? Math.abs(c) * 0.07 : 0) - landDip * 0.06;
    torsoG.rotation.x = sliding > 0 ? -0.5 : 0.1 + Math.min(0.1, speed * 0.004);
    torsoG.rotation.z = (grounded && sliding <= 0) ? s * 0.045 : 0;
    // v6: camera — gentle follow + sway; the shadow sun tracks the runner
    camera.position.x = player.position.x * 0.38 + Math.sin(runT * 0.32) * 0.05;
    camera.position.y = 4.4 + Math.sin(runT * 0.47) * 0.05 - landDip * 0.12;
    camera.lookAt(player.position.x * 0.55, 1.4, -10);
    sun.position.x = 16 + player.position.x;
    sun.target.position.set(player.position.x, 0, -6);
  }

  function checkHit(h) {
    var dx = Math.abs(h.position.x - player.position.x);
    if (dx > 1.0) return false;
    if (Math.abs(h.position.z) > 0.75) return false;
    var type = h.userData.type;
    if (type === 'log') return py < 0.85;
    if (type === 'branch') return !(sliding > 0 && py < 0.3);
    return true; // wall: any touch = crash
  }

  function frame() {
    requestAnimationFrame(frame);
    var dt = Math.min(clock.getDelta(), 0.05);

    if (state === 'playing') {
      speed = Math.min(cfg.max, speed + dt * 0.22);
      var prevDist = dist;
      dist += speed * dt;
      score = Math.floor(dist) + flyCount * 25 + bonus;

      // subtle FOV kick with speed — sense of speed, hurdles stay readable
      var targetFov = 58 + (speed - 9) * 0.55;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 2);
        camera.updateProjectionMatrix();
      }

      // spawners
      if (dist > nextRowAt) { spawnRow(); nextRowAt = dist + cfg.gap - Math.min(6, dist / 300); }
      if (dist > nextFliesAt) { spawnFlies(); nextFliesAt = dist + 34 + Math.random() * 20; }

      // mountain approach — reaching it completes the level
      var intoLeg = dist - levelStart;
      var leg = intoLeg / cfg.leg;
      mountain.position.z = MTN_FAR + (MTN_NEAR - MTN_FAR) * Math.min(1, leg);
      elMtn.textContent = Math.floor(Math.min(1, leg) * 100) + '%';
      if (intoLeg >= cfg.leg) {
        levelUp();
      }

      // move world
      scrollDz = speed * dt;
      recycleFlora(nearTrees, 4.6, 9.5);
      recycleFlora(farTrees, 9.5, 17);
      recycleFlora(bushes, 4.0, 10.5);
      recycleFlora(tufts, 3.6, 12);
      recycleFlora(canopy, 2.5, 6.5);
      recycleFlora(patches, 3.5, 14);
      recycleFlora(rocks, 3.9, 13);
      recycleFlora(litter, 0.2, 3.2);
      recycleFlora(shrooms, 3.8, 9);
      var i, o;
      for (i = 0; i < clouds.length; i++) {
        o = clouds[i];
        o.position.z += scrollDz * 0.25;
        o.position.x += dt * 0.4;
        if (o.position.z > 20) { o.position.z = -130; o.position.x = (Math.random() - 0.5) * 90; }
      }
      // dust motes drift + scroll
      var dp = dustGeo.attributes.position.array;
      for (i = 0; i < DUST_N; i++) {
        var j3 = i * 3;
        dp[j3] += Math.sin(dustSeed[i] + runT * 0.4) * dt * 0.35;
        dp[j3 + 1] -= dt * 0.25;
        dp[j3 + 2] += scrollDz * 0.9;
        if (dp[j3 + 2] > 10) { dp[j3 + 2] = -60; dp[j3] = (Math.random() - 0.5) * 24; dp[j3 + 1] = 0.5 + Math.random() * 6.5; }
        if (dp[j3 + 1] < 0.3) dp[j3 + 1] = 7;
      }
      dustGeo.attributes.position.needsUpdate = true;
      // Round 1: ambient fireflies — gentle sine drift + scroll with the world
      var fp = flyGeo.attributes.position.array;
      for (i = 0; i < FLY_N; i++) {
        var f3 = i * 3;
        fp[f3] += Math.sin(flySeed[i] + runT * 0.9) * dt * 0.5;
        fp[f3 + 1] += Math.cos(flySeed[i] * 1.3 + runT * 0.7) * dt * 0.3;
        fp[f3 + 2] += scrollDz * 0.85;
        if (fp[f3 + 2] > 10) { fp[f3 + 2] = -55; fp[f3] = (Math.random() - 0.5) * 18; fp[f3 + 1] = 0.8 + Math.random() * 4.5; }
      }
      flyGeo.attributes.position.needsUpdate = true;
      flyPts.material.opacity = Math.min(1, (0.6 + 0.3 * Math.sin(runT * 2.2)) * flyGlow);
      // v5: falling leaves — drift down, sway, scroll with the world
      if (leafPts) {
        var lp = leafGeo.attributes.position.array;
        for (i = 0; i < LEAF_N; i++) {
          var l3 = i * 3;
          lp[l3] += Math.sin(leafSeed[i] + runT * 1.4) * dt * 0.9;
          lp[l3 + 1] -= dt * (0.9 + 0.5 * Math.sin(leafSeed[i] * 2.0));
          lp[l3 + 2] += scrollDz * 0.9;
          if (lp[l3 + 1] < 0.2 || lp[l3 + 2] > 10) {
            lp[l3] = (Math.random() - 0.5) * 22;
            lp[l3 + 1] = 7 + Math.random() * 2.5;
            lp[l3 + 2] = -60 + Math.random() * 20;
          }
        }
        leafGeo.attributes.position.needsUpdate = true;
      }

      for (i = 0; i < hurdles.length; i++) {
        o = hurdles[i];
        if (!o.visible) continue;
        o.position.z += scrollDz;
        if (o.position.z > KILL_Z) { o.visible = false; continue; }
        if (checkHit(o)) { endGame(); }
      }
      for (i = 0; i < flies.length; i++) {
        var fl = flies[i];
        if (!fl.active) continue;
        fl.m.position.z += scrollDz;
        fl.ph += dt * 5;
        fl.m.position.y += Math.sin(fl.ph) * dt * 0.6;
        var s2 = 0.3 + Math.sin(fl.ph * 1.7) * 0.05;
        fl.m.scale.set(s2, s2, s2);
        if (fl.m.position.z > KILL_Z) { fl.active = false; fl.m.visible = false; continue; }
        if (Math.abs(fl.m.position.z) < 0.9 &&
            Math.abs(fl.m.position.x - player.position.x) < 1.0 &&
            Math.abs(fl.m.position.y - (py + 1.2)) < 1.1) {
          fl.active = false; fl.m.visible = false;
          flyCount++;
          elFlies.textContent = flyCount;
        }
      }

      elScore.textContent = score;
    } else {
      // idle: gentle cloud drift behind the overlays
      for (var k = 0; k < clouds.length; k++) {
        clouds[k].position.z += 2.2 * dt * 0.25;
        if (clouds[k].position.z > 20) clouds[k].position.z = -130;
      }
    }

    updatePuffs(dt);
    animateRunner(dt);
    renderer.render(scene, camera);
  }

  applyTheme(cfg);
  resize();
  setTimeout(resize, 60);
  frame();
})();
