/* Forest Dash 3D — real-time 3D endless runner (Three.js).
   A dense, realistic green forest: layered tree walls, canopy overhead,
   light dust in the air, ferns and undergrowth, distant treeline.
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
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  } catch (e) {
    startBox.querySelector('p').textContent = 'Sorry — 3D could not start on this device.';
    document.getElementById('f-play').style.display = 'none';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd4e9f5);
  scene.fog = new THREE.Fog(0xd4e9f5, 55, 240);

  var camera = new THREE.PerspectiveCamera(58, 2, 0.1, 500);
  camera.position.set(0, 4.4, 8.2);
  camera.lookAt(0, 1.4, -10);

  // warm, realistic forest light
  var hemi = new THREE.HemisphereLight(0xd8ecff, 0x3f7a3f, 0.85);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xffecc8, 1.0);
  sun.position.set(16, 30, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -32;
  sun.shadow.camera.far = 100;
  scene.add(sun);
  var fill = new THREE.DirectionalLight(0xbcd8ff, 0.25); // cool bounce from the sky
  fill.position.set(-12, 18, -6);
  scene.add(fill);

  function resize() {
    var w = canvas.clientWidth || 420;
    var h = canvas.clientHeight || Math.round(w * 1.52);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  /* ---------------- Rich, realistic materials ---------------- */
  var M = {
    grass: new THREE.MeshLambertMaterial({ color: 0x69b45e }),
    grassDark: new THREE.MeshLambertMaterial({ color: 0x4c8f43 }),
    path: new THREE.MeshLambertMaterial({ color: 0xd9b47c }),
    pathEdge: new THREE.MeshLambertMaterial({ color: 0xc49a63 }),
    trunk: new THREE.MeshLambertMaterial({ color: 0x7a5233 }),
    trunkDark: new THREE.MeshLambertMaterial({ color: 0x5d3d24 }),
    pine: new THREE.MeshLambertMaterial({ color: 0x2c7a44 }),
    pine2: new THREE.MeshLambertMaterial({ color: 0x35994e }),
    pine3: new THREE.MeshLambertMaterial({ color: 0x256b3a }),
    pineTip: new THREE.MeshLambertMaterial({ color: 0x45ad5b }),
    leaf: new THREE.MeshLambertMaterial({ color: 0x3f9e4f }),
    leaf2: new THREE.MeshLambertMaterial({ color: 0x2f8a42 }),
    leafLit: new THREE.MeshLambertMaterial({ color: 0x55b95e }),
    bush: new THREE.MeshLambertMaterial({ color: 0x3a8f47 }),
    tuft: new THREE.MeshLambertMaterial({ color: 0x4da856 }),
    fern: new THREE.MeshLambertMaterial({ color: 0x35853f }),
    treeline: new THREE.MeshLambertMaterial({ color: 0x3d6e52 }),
    rock: new THREE.MeshLambertMaterial({ color: 0x8d99a8 }),
    rockDark: new THREE.MeshLambertMaterial({ color: 0x6f7a8c }),
    snow: new THREE.MeshLambertMaterial({ color: 0xffffff }),
    wood: new THREE.MeshLambertMaterial({ color: 0x9c6b43 }),
    branch: new THREE.MeshLambertMaterial({ color: 0x7c4f30 }),
    cloud: new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 }),
    sunDisc: new THREE.MeshBasicMaterial({ color: 0xffe9a3, fog: false }),
    fly: new THREE.MeshBasicMaterial({ color: 0xffe066 }),
    skin: new THREE.MeshLambertMaterial({ color: 0xf2c49b }),
    shirt: new THREE.MeshLambertMaterial({ color: 0x2fbfae }),
    shorts: new THREE.MeshLambertMaterial({ color: 0x3b4a6b }),
    cap: new THREE.MeshLambertMaterial({ color: 0xf2789f })
  };
  var PINES = [M.pine, M.pine2, M.pine3];
  var LEAVES = [M.leaf, M.leaf2, M.leafLit];
  var G = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(0.5, 12, 10),
    cone: new THREE.ConeGeometry(0.5, 1, 9),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 9),
    circle: new THREE.CircleGeometry(0.5, 12)
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

  var clouds = [];
  for (var ci = 0; ci < 7; ci++) {
    var cg = new THREE.Group();
    for (var cj = 0; cj < 3; cj++) {
      var puff = new THREE.Mesh(G.sphere, M.cloud);
      puff.castShadow = false;
      puff.scale.set(2.6 + Math.random() * 2, 1.5 + Math.random(), 1.6);
      puff.position.set(cj * 2.4 - 2.4 + Math.random(), Math.random() * 0.6, Math.random());
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
  var MTN_FAR = -170, MTN_NEAR = -36;
  mountain.position.set(-6, 0, MTN_FAR);
  scene.add(mountain);

  /* ---------------- Distant treeline (horizon depth) ---------------- */
  var treeline = [];
  for (var di = 0; di < 26; di++) {
    var dt2 = mesh(G.cone, M.treeline, 7 + Math.random() * 6, 16 + Math.random() * 14, 7 + Math.random() * 6, false);
    dt2.position.set(-70 + di * 5.6 + (Math.random() - 0.5) * 4, 6, -125 - Math.random() * 25);
    scene.add(dt2);
    treeline.push(dt2);
  }

  /* ---------------- Forest walls: near detail + far depth ---------------- */
  var nearTrees = [], farTrees = [], bushes = [], tufts = [], canopy = [], patches = [];

  function makePine(detail) {
    var g = new THREE.Group();
    var trunk = mesh(G.cyl, Math.random() < 0.5 ? M.trunk : M.trunkDark, 0.6, 2.0, 0.6, detail);
    trunk.position.y = 1.0;
    g.add(trunk);
    var pm = PINES[(Math.random() * PINES.length) | 0];
    var c1 = mesh(G.cone, pm, 3.6, 3.2, 3.6, detail); c1.position.y = 3.1; g.add(c1);
    var c2 = mesh(G.cone, pm, 2.7, 2.7, 2.7, detail); c2.position.y = 4.9; g.add(c2);
    if (detail) {
      var c3 = mesh(G.cone, M.pineTip, 1.7, 2.1, 1.7, true); c3.position.y = 6.5; g.add(c3);
    }
    g.rotation.y = Math.random() * Math.PI * 2;
    return g;
  }
  function makeLeafy(detail) {
    var g = new THREE.Group();
    var trunk = mesh(G.cyl, Math.random() < 0.5 ? M.trunk : M.trunkDark, 0.55, 2.2, 0.55, detail);
    trunk.position.y = 1.1;
    g.add(trunk);
    var lm = LEAVES[(Math.random() * LEAVES.length) | 0];
    var b1 = mesh(G.sphere, lm, 3.8, 3.2, 3.8, detail); b1.position.y = 3.6; g.add(b1);
    var b2 = mesh(G.sphere, lm, 2.4, 2.1, 2.4, detail); b2.position.set(1.1, 4.9, 0.6); g.add(b2);
    if (detail) {
      var b3 = mesh(G.sphere, M.leafLit, 1.7, 1.5, 1.7, true); b3.position.set(-1.0, 5.3, -0.4); g.add(b3);
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
  // bushes
  for (i = 0; i < 40; i++) {
    var bu = mesh(G.sphere, Math.random() < 0.5 ? M.bush : M.leaf2, 1.7, 1.15, 1.7, false);
    bu.position.set(forestX(4.0, 10.5), 0.5, -90 + Math.random() * 102);
    var bs = 0.8 + Math.random() * 1.0;
    bu.scale.set(bs * 1.7, bs * 1.15, bs * 1.7);
    scene.add(bu);
    bushes.push(bu);
  }
  // grass tufts + ferns
  for (i = 0; i < 60; i++) {
    var tg = new THREE.Group();
    var tm = Math.random() < 0.6 ? M.tuft : M.fern;
    for (var k = 0; k < 2; k++) {
      var blade = mesh(G.cone, tm, 0.4, 1.0 + Math.random() * 0.6, 0.4, false);
      blade.position.set((Math.random() - 0.5) * 0.6, 0.45, (Math.random() - 0.5) * 0.6);
      blade.rotation.z = (Math.random() - 0.5) * 0.4;
      tg.add(blade);
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
      var cl = mesh(G.sphere, cm, 2.6, 1.8, 2.6, false);
      cl.position.set((Math.random() - 0.5) * 3.4, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 3);
      cg2.add(cl);
    }
    cg2.position.set(forestX(2.5, 6.5), 8.6 + Math.random() * 2.4, -90 + Math.random() * 102);
    scene.add(cg2);
    canopy.push(cg2);
  }

  /* ---------------- Dust motes drifting in the light ---------------- */
  var DUST_N = 130;
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

  function applyTheme(cfg) {
    scene.fog.color.setHex(cfg.fog);
    scene.fog.near = cfg.fogNear;
    scene.fog.far = cfg.fogFar;
    scene.background.setHex(cfg.fog);
    M.grass.color.setHex(cfg.grass);
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
  var legL, legR, armL, armR, torsoG;
  (function buildRunner() {
    var hipY = 0.78;
    var legGeo = new THREE.BoxGeometry(0.24, 0.78, 0.26);
    legGeo.translate(0, -0.39, 0);
    legL = new THREE.Mesh(legGeo, M.shorts); legL.position.set(-0.16, hipY, 0); legL.castShadow = true;
    legR = new THREE.Mesh(legGeo, M.shorts); legR.position.set(0.16, hipY, 0); legR.castShadow = true;
    player.add(legL); player.add(legR);

    torsoG = new THREE.Group();
    var torso = mesh(G.box, M.shirt, 0.6, 0.68, 0.34); torso.position.y = 0.34;
    torsoG.add(torso);
    torsoG.position.y = hipY;
    player.add(torsoG);

    var armGeo = new THREE.BoxGeometry(0.19, 0.62, 0.2);
    armGeo.translate(0, -0.31, 0);
    armL = new THREE.Mesh(armGeo, M.shirt); armL.position.set(-0.41, hipY + 0.58, 0); armL.castShadow = true;
    armR = new THREE.Mesh(armGeo, M.shirt); armR.position.set(0.41, hipY + 0.58, 0); armR.castShadow = true;
    player.add(armL); player.add(armR);

    var head = mesh(G.sphere, M.skin, 0.56, 0.6, 0.56); head.position.y = hipY + 1.02;
    player.add(head);
    var capTop = mesh(G.cyl, M.cap, 0.6, 0.22, 0.6); capTop.position.y = hipY + 1.28;
    player.add(capTop);
    var brim = mesh(G.box, M.cap, 0.5, 0.08, 0.4); brim.position.set(0, hipY + 1.2, 0.42);
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
    // warning stripes so it reads at speed
    var stripe = mesh(G.box, M.cap, 0.18, 0.7, 0.7);
    stripe.position.y = 0.36;
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
      var leaf = mesh(G.sphere, M.leaf, 0.75, 0.6, 0.75);
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
    var moss = mesh(G.sphere, M.bush, 1.6, 0.5, 0.8, false);
    moss.position.y = 2.3;
    g.add(moss);
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
  var flies = [];
  for (var fi = 0; fi < 14; fi++) {
    var f = new THREE.Mesh(G.sphere, M.fly);
    f.castShadow = false;
    f.scale.set(0.3, 0.3, 0.3);
    f.visible = false;
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
    var lists = [[nearTrees, 4.6, 9.5], [farTrees, 9.5, 17], [bushes, 4.0, 10.5], [tufts, 3.6, 12], [canopy, 2.5, 6.5], [patches, 3.5, 14]];
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

  function animateRunner(dt) {
    runT += dt * (5 + speed * 0.45);
    var s = Math.sin(runT), c = Math.cos(runT);
    if (!grounded) { // tuck legs in the air
      legL.rotation.x = -0.9; legR.rotation.x = 0.5;
      armL.rotation.x = -2.2; armR.rotation.x = -2.2;
    } else if (sliding > 0) {
      legL.rotation.x = -1.2; legR.rotation.x = -1.2;
      armL.rotation.x = 0.6; armR.rotation.x = 0.6;
    } else {
      legL.rotation.x = s * 0.95; legR.rotation.x = -s * 0.95;
      armL.rotation.x = -s * 0.8; armR.rotation.x = s * 0.8;
    }
    // lane glide
    var px = player.position.x;
    player.position.x = px + (targetX - px) * Math.min(1, dt * 11);
    // vertical
    if (!grounded) {
      vy -= 26 * dt;
      py += vy * dt;
      if (py <= 0) { py = 0; vy = 0; grounded = true; }
    }
    if (sliding > 0) sliding -= dt;
    player.scale.set(1, sliding > 0 ? 0.62 : 1, 1);
    player.position.y = py + (grounded && sliding <= 0 ? Math.abs(c) * 0.07 : 0);
    torsoG.rotation.x = sliding > 0 ? -0.5 : 0.1;
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
      var targetFov = 58 + (speed - 9) * 0.4;
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

    animateRunner(dt);
    renderer.render(scene, camera);
  }

  applyTheme(cfg);
  resize();
  setTimeout(resize, 60);
  frame();
})();
