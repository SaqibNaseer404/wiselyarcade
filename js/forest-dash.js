/* Forest Dash 3D — real-time 3D endless runner (Three.js).
   Run through a living forest toward the mountain: switch lanes,
   jump fallen logs, slide under branches, dodge rock walls,
   grab fireflies. Lesson: keep going — every obstacle passes. */
(function () {
  'use strict';

  var canvas = document.getElementById('dash');
  var elScore = document.getElementById('f-score');
  var elFlies = document.getElementById('f-flies');
  var elBest = document.getElementById('f-best');
  var elMtn = document.getElementById('f-mtn');
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

  /* ---------------- Renderer / scene / camera ---------------- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  } catch (e) {
    startBox.querySelector('p').textContent = 'Sorry — 3D could not start on this device.';
    document.getElementById('f-play').style.display = 'none';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  var SKY = 0xcfe8f7;
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 40, 210);

  var camera = new THREE.PerspectiveCamera(58, 2, 0.1, 400);
  camera.position.set(0, 4.4, 8.2);
  camera.lookAt(0, 1.4, -10);

  var hemi = new THREE.HemisphereLight(0xeaf6ff, 0x9fd6a4, 0.95);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff2d9, 0.95);
  sun.position.set(14, 26, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -30;
  sun.shadow.camera.far = 90;
  scene.add(sun);

  function resize() {
    var w = canvas.clientWidth || 420;
    var h = canvas.clientHeight || Math.round(w * 1.52);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  /* ---------------- Shared materials / geometries ---------------- */
  var M = {
    grass: new THREE.MeshLambertMaterial({ color: 0x8fd694 }),
    path: new THREE.MeshLambertMaterial({ color: 0xe9cb92 }),
    trunk: new THREE.MeshLambertMaterial({ color: 0x8a5a3b }),
    pine: new THREE.MeshLambertMaterial({ color: 0x3f9e63 }),
    pine2: new THREE.MeshLambertMaterial({ color: 0x55b774 }),
    leaf: new THREE.MeshLambertMaterial({ color: 0x63c76f }),
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
  var G = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(0.5, 14, 12),
    cone: new THREE.ConeGeometry(0.5, 1, 10),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10)
  };
  function mesh(geo, mat, sx, sy, sz) {
    var m = new THREE.Mesh(geo, mat);
    m.scale.set(sx || 1, sy || 1, sz || 1);
    m.castShadow = true;
    return m;
  }

  /* ---------------- Ground, path, sun, clouds ---------------- */
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), M.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -80;
  ground.receiveShadow = true;
  scene.add(ground);

  var path = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 260), M.path);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.02, -80);
  path.receiveShadow = true;
  scene.add(path);

  var sunDisc = new THREE.Mesh(new THREE.CircleGeometry(7, 24), M.sunDisc);
  sunDisc.position.set(38, 34, -150);
  scene.add(sunDisc);

  var clouds = [];
  for (var ci = 0; ci < 7; ci++) {
    var cg = new THREE.Group();
    for (var cj = 0; cj < 3; cj++) {
      var puff = new THREE.Mesh(G.sphere, M.cloud);
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
  var mBase = mesh(G.cone, M.rock, 56, 74, 56); mBase.position.y = 37; mountain.add(mBase);
  var mSnow = mesh(G.cone, M.snow, 20, 26, 20); mSnow.position.y = 68; mountain.add(mSnow);
  var mBase2 = mesh(G.cone, M.rockDark, 30, 44, 30); mBase2.position.set(30, 22, 6); mountain.add(mBase2);
  var mSnow2 = mesh(G.cone, M.snow, 11, 15, 11); mSnow2.position.set(30, 40, 6); mountain.add(mSnow2);
  var MTN_FAR = -150, MTN_NEAR = -34, MTN_LEG = 1500;
  mountain.position.set(-6, 0, MTN_FAR);
  scene.add(mountain);

  /* ---------------- Trees ---------------- */
  var trees = [];
  function makeTree() {
    var g = new THREE.Group();
    var trunk = mesh(G.cyl, M.trunk, 0.5, 1.6, 0.5);
    trunk.position.y = 0.8;
    g.add(trunk);
    if (Math.random() < 0.55) { // pine
      var mat = Math.random() < 0.5 ? M.pine : M.pine2;
      for (var i = 0; i < 3; i++) {
        var c = mesh(G.cone, mat, 3.4 - i * 0.8, 2.6, 3.4 - i * 0.8);
        c.position.y = 2.2 + i * 1.5;
        g.add(c);
      }
    } else { // leafy
      var blob = mesh(G.sphere, M.leaf, 3.2, 2.8, 3.2);
      blob.position.y = 3.2;
      g.add(blob);
      var blob2 = mesh(G.sphere, M.leaf, 2.0, 1.8, 2.0);
      blob2.position.set(0.9, 4.2, 0.4);
      g.add(blob2);
    }
    var s = 0.8 + Math.random() * 0.7;
    g.scale.set(s, s, s);
    g.rotation.y = Math.random() * Math.PI * 2;
    return g;
  }
  function treeLaneX() {
    var side = Math.random() < 0.5 ? -1 : 1;
    return side * (5.6 + Math.random() * 8);
  }
  for (var ti = 0; ti < 30; ti++) {
    var t = makeTree();
    t.position.set(treeLaneX(), 0, -75 + Math.random() * 85);
    scene.add(t);
    trees.push(t);
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

  /* ---------------- Hurdles ---------------- */
  var LANES = [-2.2, 0, 2.2];
  var SPAWN_Z = -72, KILL_Z = 12;

  function makeLog() {
    var g = new THREE.Group();
    var log = mesh(G.cyl, M.wood, 0.62, 2.1, 0.62);
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.34;
    g.add(log);
    for (var i = -1; i <= 1; i += 2) {
      var ring = mesh(G.cyl, M.trunk, 0.64, 0.08, 0.64);
      ring.rotation.z = Math.PI / 2;
      ring.position.set(i * 1.02, 0.34, 0);
      g.add(ring);
    }
    g.userData = { type: 'log' };
    return g;
  }
  function makeBranch() {
    var g = new THREE.Group();
    for (var i = -1; i <= 1; i += 2) {
      var post = mesh(G.cyl, M.trunk, 0.22, 1.9, 0.22);
      post.position.set(i * 1.05, 0.95, 0);
      g.add(post);
    }
    var plank = mesh(G.box, M.branch, 2.4, 0.34, 0.3);
    plank.position.y = 1.62;
    g.add(plank);
    for (var j = 0; j < 4; j++) {
      var leaf = mesh(G.sphere, M.leaf, 0.7, 0.55, 0.7);
      leaf.position.set(-0.9 + j * 0.6, 1.95, (Math.random() - 0.5) * 0.3);
      g.add(leaf);
    }
    g.userData = { type: 'branch' };
    return g;
  }
  function makeWall() {
    var g = new THREE.Group();
    var wall = mesh(G.box, M.rock, 2.1, 1.9, 0.9);
    wall.position.y = 0.95;
    g.add(wall);
    var cap = mesh(G.box, M.rockDark, 2.25, 0.3, 1.0);
    cap.position.y = 1.95;
    g.add(cap);
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
    f.scale.set(0.28, 0.28, 0.28);
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
  var dist = 0, flyCount = 0, score = 0;
  var speed = 9;
  var runT = 0;
  var nextRowAt = 30, nextFliesAt = 14;
  var toastTimer = null;
  var lastLeg = 0;

  function toast(msg) {
    var t = document.getElementById('f-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function resetWorld() {
    for (var i = 0; i < hurdles.length; i++) hurdles[i].visible = false;
    for (var j = 0; j < flies.length; j++) { flies[j].active = false; flies[j].m.visible = false; }
    for (var k = 0; k < trees.length; k++) trees[k].position.z = -75 + Math.random() * 85;
    mountain.position.z = MTN_FAR;
    lastLeg = 0;
  }

  function startGame() {
    state = 'playing';
    laneIdx = 1; targetX = 0;
    player.position.set(0, 0, 0);
    py = 0; vy = 0; grounded = true; sliding = 0;
    dist = 0; flyCount = 0; score = 0; speed = 9; runT = 0;
    nextRowAt = 34; nextFliesAt = 16;
    resetWorld();
    overBox.classList.add('hidden');
    startBox.classList.add('hidden');
    elScore.textContent = '0';
    elFlies.textContent = '0';
    elMtn.textContent = '0%';
  }

  function endGame() {
    state = 'over';
    if (score > best) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
      showBest(best);
    }
    overStats.innerHTML = 'You dashed <strong>' + Math.floor(dist) + ' m</strong> toward the mountain and caught <strong>' + flyCount + '</strong> fireflies.<br>Score: <strong>' + score + '</strong> · Best: <strong>' + best + '</strong>';
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
      speed = Math.min(24, speed + dt * 0.22);
      var prevDist = dist;
      dist += speed * dt;
      score = Math.floor(dist) + flyCount * 25;

      // spawners
      if (dist > nextRowAt) { spawnRow(); nextRowAt = dist + 26 - Math.min(12, dist / 160); }
      if (dist > nextFliesAt) { spawnFlies(); nextFliesAt = dist + 34 + Math.random() * 20; }

      // mountain approach — every 1500 m you reach it, then a new peak awaits
      var leg = (dist % MTN_LEG) / MTN_LEG;
      mountain.position.z = MTN_FAR + (MTN_NEAR - MTN_FAR) * leg;
      elMtn.textContent = Math.floor(leg * 100) + '%';
      if (Math.floor(dist / MTN_LEG) > Math.floor(prevDist / MTN_LEG)) {
        score += 250;
        toast('🏔 You reached the mountain! +250 — onward to the next peak!');
      }

      // move world
      var dz = speed * dt;
      var i, o;
      for (i = 0; i < trees.length; i++) {
        o = trees[i];
        o.position.z += dz;
        if (o.position.z > KILL_Z) {
          o.position.z -= 88;
          o.position.x = treeLaneX();
          var s = 0.8 + Math.random() * 0.7;
          o.scale.set(s, s, s);
        }
      }
      for (i = 0; i < clouds.length; i++) {
        o = clouds[i];
        o.position.z += dz * 0.25;
        o.position.x += dt * 0.4;
        if (o.position.z > 20) { o.position.z = -130; o.position.x = (Math.random() - 0.5) * 90; }
      }
      for (i = 0; i < hurdles.length; i++) {
        o = hurdles[i];
        if (!o.visible) continue;
        o.position.z += dz;
        if (o.position.z > KILL_Z) { o.visible = false; continue; }
        if (checkHit(o)) { endGame(); }
      }
      for (i = 0; i < flies.length; i++) {
        var fl = flies[i];
        if (!fl.active) continue;
        fl.m.position.z += dz;
        fl.ph += dt * 5;
        fl.m.position.y += Math.sin(fl.ph) * dt * 0.6;
        var s2 = 0.28 + Math.sin(fl.ph * 1.7) * 0.05;
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

  resize();
  setTimeout(resize, 60);
  frame();
})();
