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
  if (THREE.ACESFilmicToneMapping !== undefined) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xc7dcee, 260, 1150);

  var camera = new THREE.PerspectiveCamera(62, 960 / 600, 0.5, 2600);

  // gradient sky dome (deep blue zenith -> pale horizon)
  (function buildSky() {
    var c = document.createElement('canvas'); c.width = 32; c.height = 512;
    var x = c.getContext('2d');
    var gr = x.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0.0, '#2b6ac2');
    gr.addColorStop(0.42, '#5f9bd8');
    gr.addColorStop(0.72, '#a9cdec');
    gr.addColorStop(0.92, '#dcecf8');
    gr.addColorStop(1.0, '#eef5fb');
    x.fillStyle = gr; x.fillRect(0, 0, 32, 512);
    var t = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    var sky = new THREE.Mesh(new THREE.SphereGeometry(2350, 28, 14),
      new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -10;
    scene.add(sky);
  })();

  var hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3f6d33, 0.8);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff1d8, 1.2);
  sun.position.set(180, 260, 120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -115; sun.shadow.camera.right = 115;
  sun.shadow.camera.top = 115; sun.shadow.camera.bottom = -115;
  sun.shadow.camera.near = 20; sun.shadow.camera.far = 800;
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  if (sun.shadow.normalBias !== undefined) sun.shadow.normalBias = 0.9;
  scene.add(sun);
  scene.add(sun.target);

  /* shared environment map: tiny canvas cube -> real reflections on paint/chrome */
  function makeEnvMap() {
    function face(stops) {
      var c = document.createElement('canvas'); c.width = 64; c.height = 64;
      var x = c.getContext('2d');
      var gr = x.createLinearGradient(0, 0, 0, 64);
      stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      return c;
    }
    function side() { return face([[0, '#3a74c4'], [0.52, '#9cc3e8'], [0.62, '#d9e9f6'], [0.74, '#5c7355'], [1, '#33402e']]); }
    var imgs = [side(), side(),
      face([[0, '#4a86d6'], [1, '#8ab8e8']]),
      face([[0, '#3a3f35'], [1, '#22261f']]),
      side(), side()];
    var ct = new THREE.CubeTexture(imgs);
    if (THREE.sRGBEncoding !== undefined) ct.encoding = THREE.sRGBEncoding;
    ct.needsUpdate = true;
    return ct;
  }
  var ENV = makeEnvMap();

  /* Photo textures (ambientCG, CC0): swapped onto materials when loaded;
     the canvas textures remain as the instant fallback if a file is missing. */
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
    var tex = canvasTex(256, 256, function (x, w, h) {
      // fallback asphalt: layered noise, cracks, rubbered-in wear bands
      x.fillStyle = '#33363c'; x.fillRect(0, 0, w, h);
      for (var n = 0; n < 2600; n++) {
        var g1 = 40 + Math.random() * 40;
        x.fillStyle = 'rgba(' + g1 + ',' + g1 + ',' + (g1 + 6) + ',.25)';
        x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      x.fillStyle = 'rgba(0,0,0,.16)';
      x.fillRect(w * 0.20, 0, w * 0.16, h); x.fillRect(w * 0.64, 0, w * 0.16, h);
      x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 1;
      for (var cr = 0; cr < 7; cr++) {
        x.beginPath(); var cxp = Math.random() * w, cyp = Math.random() * h;
        x.moveTo(cxp, cyp);
        for (var cs = 0; cs < 4; cs++) { cxp += (Math.random() - 0.5) * 26; cyp += Math.random() * 18; x.lineTo(cxp, cyp); }
        x.stroke();
      }
    }, 1, 1);
    var roadMat = new THREE.MeshPhongMaterial({ map: tex, shininess: 16, specular: 0x14161a });
    var m = new THREE.Mesh(g, roadMat);
    m.receiveShadow = true;
    scene.add(m);
    loadPhoto(roadMat, 'asphalt-color.jpg', 'asphalt-normal.jpg', 2, 3);
    // painted white edge lines (geometry, so the photo texture stays clean)
    [-1, 1].forEach(function (sd) {
      var lp = [], lix = [];
      for (var li = 0; li <= SAMPLES; li++) {
        var ls = (li % SAMPLES) * segLen;
        var l0 = trackPoint(ls, sd * 0.97), l1 = trackPoint(ls, sd * 1.03);
        lp.push(l0.x, 0.032, l0.z, l1.x, 0.032, l1.z);
        if (li < SAMPLES) { var la = li * 2; lix.push(la, la + 1, la + 2, la + 1, la + 3, la + 2); }
      }
      var lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
      lg.setIndex(lix); lg.computeVertexNormals();
      var lm = new THREE.Mesh(lg, new THREE.MeshLambertMaterial({ color: 0xe9edf2 }));
      lm.receiveShadow = true;
      scene.add(lm);
    });
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
        x.fillStyle = '#b02330'; x.fillRect(0, 0, w, h / 2);
        x.fillStyle = '#e8e9eb'; x.fillRect(0, h / 2, w, h / 2);
      });
      var curbMesh = new THREE.Mesh(g2, new THREE.MeshLambertMaterial({ map: t2 }));
      curbMesh.receiveShadow = true;
      scene.add(curbMesh);
    });
  })();

  // Grass
  (function buildGrass() {
    var tex = canvasTex(256, 256, function (x, w, h) {
      // fallback grass: deep green, multi-octave speckle + dry patches
      x.fillStyle = '#39682e'; x.fillRect(0, 0, w, h);
      for (var n = 0; n < 2400; n++) {
        x.fillStyle = Math.random() < 0.55 ? 'rgba(10,50,8,.20)' : 'rgba(140,190,90,.13)';
        x.fillRect(Math.random() * w, Math.random() * h, 2, 4);
      }
      for (var p = 0; p < 8; p++) {
        x.fillStyle = 'rgba(150,140,80,.07)';
        x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 14 + Math.random() * 30, 0, 7); x.fill();
      }
    }, 60, 60);
    var grassMat = new THREE.MeshPhongMaterial({ map: tex, shininess: 4, specular: 0x0a0c0a });
    var g = new THREE.Mesh(new THREE.CircleGeometry(950, 40), grassMat);
    g.rotation.x = -Math.PI / 2; g.position.y = -0.05;
    g.receiveShadow = true;
    scene.add(g);
    loadPhoto(grassMat, 'grass-color.jpg', 'grass-normal.jpg', 170, 170);
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
    var poleM = new THREE.MeshPhongMaterial({ color: 0xd4d9e0, shininess: 70, specular: 0xbbbbcc, envMap: ENV, reflectivity: 0.5 });
    loadPhoto(poleM, 'metal-color.jpg', null, 1, 2);
    [-1.5, 1.5].forEach(function (s) {
      var pole = new THREE.Mesh(poleG, poleM);
      pole.position.set(mid.x + n.x * ROAD_HALF * s, 6, mid.z + n.z * ROAD_HALF * s);
      pole.castShadow = true;
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
    banner.castShadow = true;
    scene.add(banner);
  })();

  // Grandstands, pit building, floodlights, trees, boards, tire stacks, hills, clouds
  (function buildEnv() {
    var metalMat = new THREE.MeshPhongMaterial({ color: 0xd4d9e0, shininess: 60, specular: 0x99a2b2, envMap: ENV, reflectivity: 0.4 });
    loadPhoto(metalMat, 'metal-color.jpg', null, 2, 1);
    var concreteMat = new THREE.MeshLambertMaterial({ color: 0x8f959d });

    // seat rows seen from the track: coloured seats, some empty
    var seatTex = canvasTex(256, 128, function (x, w, h) {
      x.fillStyle = '#4c5258'; x.fillRect(0, 0, w, h);
      var cols = ['#c62f3b', '#e8e9eb', '#2456a6', '#e8e9eb', '#d8a022'];
      for (var r = 0; r < 8; r++) for (var cq = 0; cq < 32; cq++) {
        if (Math.random() < 0.22) continue;
        x.fillStyle = cols[(r + (Math.random() * 2 | 0)) % cols.length];
        x.fillRect(cq * 8 + 1, r * 16 + 4, 6, 9);
      }
    });
    var seatMat = new THREE.MeshLambertMaterial({ map: seatTex });
    var plainMat = new THREE.MeshLambertMaterial({ color: 0x646a71 });

    function buildStand(sFrac, side) {
      var t = trackTangent(trackLen * sFrac, new THREE.Vector3());
      var n = new THREE.Vector3(-t.z, 0, t.x);
      var base = trackPoint(trackLen * sFrac, 0);
      var yaw = Math.atan2(t.x, t.z) + Math.PI / 2;
      for (var s = 0; s < 5; s++) {
        var d = side * (27 + s * 5.6);
        var tier = new THREE.Mesh(new THREE.BoxGeometry(64, 2.4, 5.2),
          [plainMat, plainMat, plainMat, plainMat, seatMat, seatMat]);
        tier.position.set(base.x + n.x * d, 1.6 + s * 2.5, base.z + n.z * d);
        tier.rotation.y = yaw;
        tier.castShadow = true; tier.receiveShadow = true;
        scene.add(tier);
      }
      var rd = side * 42;
      var roof = new THREE.Mesh(new THREE.BoxGeometry(68, 0.8, 30), metalMat);
      roof.position.set(base.x + n.x * rd, 16.5, base.z + n.z * rd);
      roof.rotation.y = yaw; roof.castShadow = true;
      scene.add(roof);
      [-26, 0, 26].forEach(function (off) {
        var cd = side * 53;
        var col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 16.5, 8), metalMat);
        col.position.set(base.x + n.x * cd + t.x * off, 8.25, base.z + n.z * cd + t.z * off);
        col.castShadow = true;
        scene.add(col);
      });
    }
    buildStand(0.06, 1);
    buildStand(0.55, -1);

    // pit building near the start, opposite the main stand
    (function buildPits() {
      var t = trackTangent(trackLen * 0.015, new THREE.Vector3());
      var n = new THREE.Vector3(-t.z, 0, t.x);
      var base = trackPoint(trackLen * 0.015, 0);
      var facadeTex = canvasTex(512, 96, function (x, w, h) {
        x.fillStyle = '#2c313a'; x.fillRect(0, 0, w, h);
        for (var wi = 0; wi < 10; wi++) { x.fillStyle = '#a8c4de'; x.fillRect(wi * 51 + 8, h * 0.12, 34, h * 0.2); }
        x.fillStyle = '#ffb02e'; x.font = '900 21px sans-serif'; x.textAlign = 'center';
        x.fillText('PIT LANE', w / 2, h * 0.5);
        x.fillStyle = '#171b21'; x.fillRect(0, h * 0.56, w, h * 0.4);
        for (var di = 0; di < 8; di++) {
          x.fillStyle = '#23272f'; x.fillRect(di * 64 + 6, h * 0.56, 52, h * 0.4);
          x.fillStyle = '#3d434e'; x.fillRect(di * 64 + 6, h * 0.56, 52, 4);
        }
      });
      var facade = new THREE.MeshLambertMaterial({ map: facadeTex });
      var pit = new THREE.Mesh(new THREE.BoxGeometry(56, 10, 13),
        [concreteMat, concreteMat, concreteMat, concreteMat, facade, facade]);
      var d = -31;
      pit.position.set(base.x + n.x * d, 5, base.z + n.z * d);
      pit.rotation.y = Math.atan2(t.x, t.z) + Math.PI / 2;
      pit.castShadow = true; pit.receiveShadow = true;
      scene.add(pit);
    })();

    // floodlights
    for (var f = 0; f < 8; f++) {
      var sF = (f / 8) * trackLen;
      var sideF = f % 2 ? 1 : -1;
      var fp = trackPoint(sF, sideF * 3.2);
      var pole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 22, 8), metalMat);
      pole2.position.set(fp.x, 11, fp.z); pole2.castShadow = true; scene.add(pole2);
      var head = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.6, 0.8),
        new THREE.MeshBasicMaterial({ color: 0xf4f7fb }));
      head.position.set(fp.x, 22.4, fp.z); scene.add(head);
    }

    // trees: real greens, two-tier canopies
    var trunkM = new THREE.MeshLambertMaterial({ color: 0x6b4a2c });
    var leafMats = [0x2c6e2e, 0x35793a, 0x275e2a, 0x3d8140].map(function (cc) {
      return new THREE.MeshLambertMaterial({ color: cc });
    });
    for (var k = 0; k < 80; k++) {
      var ang = Math.random() * Math.PI * 2, rad = 265 + Math.random() * 430;
      var tx = Math.cos(ang) * rad, tz = Math.sin(ang) * rad;
      var sc = 0.85 + Math.random() * 1.3;
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * sc, 0.85 * sc, 5.5 * sc, 6), trunkM);
      trunk.position.set(tx, 2.75 * sc, tz); trunk.castShadow = true; scene.add(trunk);
      var lm = leafMats[k % leafMats.length];
      var c1 = new THREE.Mesh(new THREE.ConeGeometry(4.4 * sc, 8.5 * sc, 8), lm);
      c1.position.set(tx, 9.1 * sc, tz); c1.castShadow = true; scene.add(c1);
      var c2 = new THREE.Mesh(new THREE.ConeGeometry(3.1 * sc, 6 * sc, 8), lm);
      c2.position.set(tx, 12.9 * sc, tz); c2.castShadow = true; scene.add(c2);
    }

    // tire-stack barriers on the outside of the big corners
    var stackTex = canvasTex(128, 128, function (x, w, h) {
      var bands = ['#191b1f', '#c8c9cc', '#191b1f', '#a31f2b', '#191b1f', '#c8c9cc'];
      for (var bnd = 0; bnd < 6; bnd++) {
        x.fillStyle = bands[bnd]; x.fillRect(0, bnd * h / 6, w, h / 6);
        x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, bnd * h / 6, w, 2);
      }
    });
    var stackMat = new THREE.MeshLambertMaterial({ map: stackTex });
    var stackGeo = new THREE.CylinderGeometry(1.05, 1.05, 2.6, 12);
    var placedStacks = 0;
    for (var ci = 30; ci < SAMPLES - 30 && placedStacks < 42; ci += 6) {
      var cv = Math.abs(curvs[ci]);
      if (cv < 0.0105) continue;
      if (cv < Math.abs(curvs[ci - 6]) || cv < Math.abs(curvs[ci + 6])) continue;
      var sideC = curvs[ci] > 0 ? -1 : 1; // outside of the turn
      var sp = trackPoint(ci * segLen, sideC * 2.15);
      var stack = new THREE.Mesh(stackGeo, stackMat);
      stack.position.set(sp.x, 1.3, sp.z);
      stack.castShadow = true; stack.receiveShadow = true;
      scene.add(stack);
      placedStacks++;
    }

    // sponsor boards (original generic words only)
    var boardWords = [['APEX', '#10151d', '#ffb02e'], ['TURBO', '#7a1622', '#ffffff'], ['GRIP', '#12325e', '#ffffff'],
                      ['VELOCITY', '#10151d', '#7dd3fc'], ['PODIUM', '#7a1622', '#ffd166'], ['SWIFT', '#12325e', '#ffffff']];
    var boardMats = boardWords.map(function (bw) {
      var txx = canvasTex(256, 48, function (x, w, h) {
        x.fillStyle = bw[1]; x.fillRect(0, 0, w, h);
        x.fillStyle = bw[2]; x.font = '900 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(bw[0], w / 2, h / 2 + 1);
      });
      return new THREE.MeshLambertMaterial({ map: txx });
    });
    var boardSide = new THREE.MeshLambertMaterial({ color: 0x22262d });
    for (var bd = 0; bd < 16; bd++) {
      var bs = (bd / 16) * trackLen + trackLen * 0.03;
      var bSide = bd % 2 ? 1 : -1;
      var bp = trackPoint(bs, bSide * 2.35);
      var bt = trackTangent(bs, new THREE.Vector3());
      var bm = boardMats[bd % boardMats.length];
      var board = new THREE.Mesh(new THREE.BoxGeometry(11, 2.3, 0.35),
        [boardSide, boardSide, boardSide, boardSide, bm, bm]);
      board.position.set(bp.x, 1.7, bp.z);
      board.rotation.y = Math.atan2(bt.x, bt.z) + Math.PI / 2;
      board.castShadow = true;
      scene.add(board);
      [-4, 4].forEach(function (off) {
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), boardSide);
        post.position.set(bp.x + bt.x * off, 0.55, bp.z + bt.z * off);
        scene.add(post);
      });
    }

    // distant hill ring, hazed by fog
    var hillMats = [0x2e4d31, 0x294236, 0x33512f].map(function (cc) {
      return new THREE.MeshLambertMaterial({ color: cc });
    });
    for (var hi = 0; hi < 18; hi++) {
      var ha = (hi / 18) * Math.PI * 2 + Math.random() * 0.2;
      var hr = 800 + Math.random() * 90;
      var hh = 80 + Math.random() * 90;
      var hill = new THREE.Mesh(new THREE.ConeGeometry(150 + Math.random() * 110, hh, 7), hillMats[hi % 3]);
      hill.position.set(Math.cos(ha) * hr, hh / 2 - 8, Math.sin(ha) * hr);
      scene.add(hill);
    }

    // soft cloud sprites
    var cloudTex = (function () {
      var c = document.createElement('canvas'); c.width = 256; c.height = 128;
      var x = c.getContext('2d');
      for (var pu = 0; pu < 9; pu++) {
        var px = 40 + Math.random() * 176, py = 50 + Math.random() * 30, pr = 22 + Math.random() * 30;
        var rg = x.createRadialGradient(px, py, 2, px, py, pr);
        rg.addColorStop(0, 'rgba(255,255,255,.55)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = rg; x.beginPath(); x.arc(px, py, pr, 0, 7); x.fill();
      }
      var t = new THREE.CanvasTexture(c);
      if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
      return t;
    })();
    for (var ci2 = 0; ci2 < 14; ci2++) {
      var sm = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.5 + Math.random() * 0.3, depthWrite: false, fog: false });
      var spr = new THREE.Sprite(sm);
      var scw = 200 + Math.random() * 220;
      spr.scale.set(scw, scw * 0.38, 1);
      spr.position.set((Math.random() - 0.5) * 2600, 210 + Math.random() * 170, (Math.random() - 0.5) * 2600);
      scene.add(spr);
    }
  })();

  /* ================= Bikes ================= */
  var _geoCache = {};
  function boxGeo(w, h, d) { var k = 'b' + w + '|' + h + '|' + d; return _geoCache[k] || (_geoCache[k] = new THREE.BoxGeometry(w, h, d)); }
  function cylGeo(rt, rb, h, s) { var k = 'c' + rt + '|' + rb + '|' + h + '|' + s; return _geoCache[k] || (_geoCache[k] = new THREE.CylinderGeometry(rt, rb, h, s || 10)); }
  function sphGeo(r, w, h) { var k = 's' + r + '|' + w + '|' + h; return _geoCache[k] || (_geoCache[k] = new THREE.SphereGeometry(r, w || 14, h || 10)); }

  var MAT = {
    chrome: new THREE.MeshPhongMaterial({ color: 0xd9dfe8, shininess: 130, specular: 0xffffff, envMap: ENV, reflectivity: 1.0 }),
    darkMetal: new THREE.MeshPhongMaterial({ color: 0x23262d, shininess: 55, specular: 0x707a88, envMap: ENV, reflectivity: 0.35 }),
    rubber: new THREE.MeshPhongMaterial({ color: 0x121317, shininess: 10, specular: 0x181a1c }),
    rimM: new THREE.MeshPhongMaterial({ color: 0x3a3f47, shininess: 90, specular: 0x99a2b2, envMap: ENV, reflectivity: 0.6 }),
    screen: new THREE.MeshPhongMaterial({ color: 0x10161f, shininess: 150, specular: 0xcfe4ff, envMap: ENV, reflectivity: 0.95, transparent: true, opacity: 0.78, side: THREE.DoubleSide }),
    headlight: new THREE.MeshBasicMaterial({ color: 0xeaf6ff }),
    taillight: new THREE.MeshBasicMaterial({ color: 0xff2438 }),
    flame: new THREE.MeshBasicMaterial({ color: 0xff8f2a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  };
  var _paintCache = {}, _suitCache = {};
  function paintMat(color) {
    return _paintCache[color] || (_paintCache[color] = new THREE.MeshPhongMaterial({
      color: color, shininess: 95, specular: 0xb9c6d8, envMap: ENV, reflectivity: 0.55 }));
  }
  function suitMat(color) {
    return _suitCache[color] || (_suitCache[color] = new THREE.MeshPhongMaterial({
      color: new THREE.Color(color).multiplyScalar(0.5), shininess: 32, specular: 0x39404a }));
  }

  function makeBike(color) {
    var g = new THREE.Group();
    var paint = paintMat(color), suit = suitMat(color);
    var dark = MAT.darkMetal, chrome = MAT.chrome;
    function part(geo, m, x, y, z, rx, ry, rz, shadow) {
      var b = new THREE.Mesh(geo, m);
      b.position.set(x, y, z);
      if (rx) b.rotation.x = rx; if (ry) b.rotation.y = ry; if (rz) b.rotation.z = rz;
      if (shadow) b.castShadow = true;
      g.add(b); return b;
    }
    function box(w, h, d, m, x, y, z, rx, ry, rz, shadow) { return part(boxGeo(w, h, d), m, x, y, z, rx, ry, rz, shadow); }
    function cyl(rt, rb, h, m, x, y, z, rx, ry, rz, s) { return part(cylGeo(rt, rb, h, s || 10), m, x, y, z, rx, ry, rz); }

    /* wheels: spin groups so the wheels actually roll */
    var tireG = new THREE.TorusGeometry(0.44, 0.185, 10, 22);
    var rimG = cylGeo(0.40, 0.40, 0.16, 14);
    var discG = cylGeo(0.21, 0.21, 0.05, 14);
    var spokeG = boxGeo(0.07, 0.76, 0.045);
    function makeWheel(z) {
      var spin = new THREE.Group();
      spin.position.set(0, 0.625, z);
      var tire = new THREE.Mesh(tireG, MAT.rubber); tire.rotation.y = Math.PI / 2; tire.castShadow = true; spin.add(tire);
      var rim = new THREE.Mesh(rimG, MAT.rimM); rim.rotation.z = Math.PI / 2; spin.add(rim);
      var disc = new THREE.Mesh(discG, chrome); disc.rotation.z = Math.PI / 2; disc.position.x = 0.09; spin.add(disc);
      for (var sp = 0; sp < 3; sp++) {
        var spoke = new THREE.Mesh(spokeG, MAT.rimM);
        spoke.rotation.x = sp * Math.PI / 3;
        spin.add(spoke);
      }
      g.add(spin);
      return spin;
    }
    var spinF = makeWheel(1.55), spinR = makeWheel(-1.55);

    /* front: forks, axle, fender */
    [-0.21, 0.21].forEach(function (fx) {
      cyl(0.05, 0.05, 1.35, chrome, fx, 1.02, 1.42, 0.42);
      cyl(0.075, 0.075, 0.62, dark, fx, 0.62, 1.60, 0.42);
    });
    cyl(0.05, 0.05, 0.52, dark, 0, 0.625, 1.55, 0, 0, Math.PI / 2);
    box(0.34, 0.05, 0.8, paint, 0, 1.2, 1.66, -0.5);
    box(0.34, 0.05, 0.62, paint, 0, 1.3, -1.32, 0.45); // rear hugger

    /* fairings: main, nose, intake, headlight, side panels */
    box(0.95, 0.5, 1.15, paint, 0, 1.02, 0.72, -0.10, 0, 0, true);
    box(0.62, 0.62, 0.95, paint, 0, 1.22, 1.42, -0.38, 0, 0, true);
    box(0.4, 0.3, 0.3, dark, 0, 0.98, 1.78, -0.3);
    box(0.44, 0.07, 0.06, MAT.headlight, 0, 1.32, 1.86, -0.38);
    [-1, 1].forEach(function (sd) {
      box(0.08, 0.42, 1.25, paint, sd * 0.47, 0.98, 0.6, -0.08, 0, sd * 0.1, true);
      box(0.06, 0.3, 0.9, dark, sd * 0.44, 0.6, 0.35);
    });

    /* windscreen: tinted, glossy, reflective */
    part(new THREE.PlaneGeometry(0.58, 0.55), MAT.screen, 0, 1.78, 1.58, -0.52);

    /* cockpit: bars, grips, mirrors */
    cyl(0.045, 0.045, 0.86, dark, 0, 1.64, 1.18, 0, 0, Math.PI / 2);
    [-1, 1].forEach(function (sd) {
      cyl(0.055, 0.055, 0.22, MAT.rubber, sd * 0.48, 1.64, 1.18, 0, 0, Math.PI / 2);
      cyl(0.03, 0.03, 0.34, dark, sd * 0.34, 1.86, 1.3, -0.4, 0, sd * 0.5);
      box(0.2, 0.11, 0.05, dark, sd * 0.44, 1.98, 1.24);
    });

    /* tank, seat, tail */
    var tank = part(sphGeo(0.5, 14, 10), paint, 0, 1.38, 0.28);
    tank.scale.set(0.78, 0.52, 1.25); tank.castShadow = true;
    box(0.6, 0.16, 0.85, MAT.rubber, 0, 1.42, -0.62, 0.06);
    box(0.72, 0.42, 1.0, paint, 0, 1.06, -0.85, 0.1, 0, 0, true);
    box(0.5, 0.3, 0.55, paint, 0, 1.3, -1.28, 0.28);
    box(0.56, 0.05, 0.22, dark, 0, 1.52, -1.42, 0.1);
    box(0.3, 0.06, 0.05, MAT.taillight, 0, 1.28, -1.58, 0.28);

    /* engine, belly, swingarm, pegs */
    box(0.62, 0.5, 1.0, dark, 0, 0.62, 0.25, 0, 0, 0, true);
    box(0.7, 0.22, 1.5, dark, 0, 0.42, 0.15);
    [-1, 1].forEach(function (sd) {
      box(0.07, 0.14, 1.1, MAT.rimM, sd * 0.3, 0.86, -0.85, 0.12);
      box(0.16, 0.05, 0.3, dark, sd * 0.42, 0.78, -0.15);
    });

    /* exhaust: header, chrome muffler, dark tip, boost flame */
    cyl(0.07, 0.07, 0.8, chrome, 0.3, 0.5, 0.55, 1.1);
    cyl(0.11, 0.13, 1.05, chrome, 0.36, 0.72, -0.95, Math.PI / 2 - 0.1);
    cyl(0.12, 0.12, 0.16, dark, 0.36, 0.77, -1.5, Math.PI / 2 - 0.1);
    var flame = part(new THREE.ConeGeometry(0.13, 0.85, 8), MAT.flame, 0.36, 0.78, -1.95, -Math.PI / 2);
    flame.visible = false;

    /* rider: leathers in team colour, crouched over the tank */
    box(0.6, 0.72, 0.46, suit, 0, 1.82, 0.32, 0.58, 0, 0, true);
    box(0.44, 0.3, 0.34, suit, 0, 1.98, -0.02, 0.3);
    [-1, 1].forEach(function (sd) {
      var sh = part(sphGeo(0.17, 10, 8), suit, sd * 0.33, 1.98, 0.52); sh.scale.set(1, 0.85, 1.15);
      cyl(0.085, 0.075, 0.5, suit, sd * 0.4, 1.8, 0.78, 1.05, 0, sd * 0.15);
      cyl(0.07, 0.06, 0.48, suit, sd * 0.42, 1.62, 1.08, 1.35);
      part(sphGeo(0.09, 8, 8), MAT.rubber, sd * 0.44, 1.62, 1.2);
      cyl(0.12, 0.1, 0.55, suit, sd * 0.36, 1.28, -0.28, -0.75, 0, sd * 0.1);
      cyl(0.09, 0.08, 0.52, suit, sd * 0.42, 0.98, -0.02, 0.55);
      box(0.13, 0.09, 0.34, MAT.rubber, sd * 0.43, 0.74, -0.18, 0.2);
      part(sphGeo(0.07, 8, 6), paint, sd * 0.47, 1.08, -0.3);
    });

    /* helmet: glossy shell + dark visor band */
    var helm = part(sphGeo(0.31, 16, 12), paint, 0, 2.06, 0.92);
    helm.castShadow = true;
    part(new THREE.CylinderGeometry(0.315, 0.315, 0.15, 14, 1, true, -0.65, 1.3), MAT.screen, 0, 2.08, 0.92, 0.12);

    g.userData.spinF = spinF;
    g.userData.spinR = spinR;
    g.userData.flame = flame;
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
    if (r.mesh.userData.spinF) {
      r.mesh.userData.spinF.rotation.x = r.wheelSpin;
      r.mesh.userData.spinR.rotation.x = r.wheelSpin;
    }
    var fl = r.mesh.userData.flame;
    if (fl) {
      fl.visible = !!r.boosting;
      if (fl.visible) fl.scale.set(1, 0.65 + Math.random() * 0.8, 1);
    }
  }

  function stepPlayer(r, dt, input) {
    var st = stats;
    var nitroOn = input.nitro && r.nitro > 0.05 && r.speed > 8;
    r.boosting = nitroOn; // visual only (exhaust flame / FOV kick)
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

  /* ================= Wind streaks (speed feel) ================= */
  var STREAK_N = 70;
  var streakPos = new Float32Array(STREAK_N * 6);
  var streakDat = [];
  for (var si = 0; si < STREAK_N; si++) streakDat.push({ off: Math.random() * 130 - 10, lat: (Math.random() * 2 - 1) * 1.9, alt: 0.4 + Math.random() * 3.6 });
  var streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  var streakMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  var streakLines = new THREE.LineSegments(streakGeo, streakMat);
  streakLines.frustumCulled = false;
  scene.add(streakLines);
  var _sp = new THREE.Vector3(), _st = new THREE.Vector3();
  function updateStreaks(r, dt) {
    var kmh = r.speed * 3.6;
    streakMat.opacity = kmh > 170 ? Math.min(0.38, (kmh - 170) / 220) : 0;
    if (streakMat.opacity <= 0) return;
    var len = 1.1 + r.speed * 0.028;
    for (var i2 = 0; i2 < STREAK_N; i2++) {
      var d = streakDat[i2];
      d.off -= (r.speed * 1.12 + 26) * dt;
      if (d.off < -8) { d.off = 55 + Math.random() * 85; d.lat = (Math.random() * 2 - 1) * 1.9; d.alt = 0.4 + Math.random() * 3.6; }
      trackPoint(r.s + d.off, d.lat, _sp);
      trackTangent(r.s + d.off, _st);
      var o = i2 * 6;
      streakPos[o] = _sp.x; streakPos[o + 1] = _sp.y + d.alt; streakPos[o + 2] = _sp.z;
      streakPos[o + 3] = _sp.x - _st.x * len; streakPos[o + 4] = _sp.y + d.alt; streakPos[o + 5] = _sp.z - _st.z * len;
    }
    streakGeo.attributes.position.needsUpdate = true;
  }

  /* ================= Camera ================= */
  var camPos = new THREE.Vector3(0, 60, -120);
  function updateCamera(r, dt) {
    trackPoint(r.s, r.lat, _p);
    trackTangent(r.s, _t);
    // shadow-casting sun follows the player so shadows stay crisp nearby
    sun.position.set(_p.x + 150, 250, _p.z + 100);
    sun.target.position.set(_p.x, 0, _p.z);
    sun.target.updateMatrixWorld();
    _p2.copy(_p).addScaledVector(_t, -13).add(new THREE.Vector3(0, 6.2, 0));
    // pull camera slightly to outside of lean
    _p2.x += -_t.z * r.lean * 3; _p2.z += _t.x * r.lean * 3;
    camPos.lerp(_p2, Math.min(1, dt * 5));
    camera.position.copy(camPos);
    var kmh = r.speed * 3.6;
    if (kmh > 200) { // subtle high-speed shake
      var shk = Math.min(0.09, (kmh - 200) * 0.0016);
      camera.position.x += (Math.random() - 0.5) * shk;
      camera.position.y += (Math.random() - 0.5) * shk * 0.7;
    }
    _p.addScaledVector(_t, 22); _p.y = 2.5;
    camera.lookAt(_p);
    var targetFov = 62 + Math.min(1, r.speed / 62) * 12 + (r.boosting ? 2 : 0);
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3);
    camera.updateProjectionMatrix();
    updateStreaks(r, dt);
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
      mmx.fillStyle = r.isPlayer ? '#ffb02e' : '#cbd5e1';
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
      streakMat.opacity = 0;
    } else {
      // menu/garage: cinematic pan over the grid
      idleT += dt * 0.12;
      trackPoint(-20, 0, _p); trackTangent(-20, _t);
      camera.position.set(_p.x - _t.x * 26 + Math.cos(idleT) * 8, 9, _p.z - _t.z * 26 + Math.sin(idleT) * 8);
      camera.lookAt(_p.x + _t.x * 14, 2, _p.z + _t.z * 14);
      if (camera.fov !== 58) { camera.fov = 58; camera.updateProjectionMatrix(); }
      streakMat.opacity = 0;
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  window.addEventListener('resize', function () {
    var w = canvas.clientWidth || 960;
    // keep 16:10 aspect
  });
})();
