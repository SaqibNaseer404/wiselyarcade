// Wisely Arcade — Word Town v1 (100 levels — complete the word, build the town in 3D)
(function () {
  'use strict';

  var MAX_LEVEL = 100;
  var WORDS_PER_LEVEL = 6;

  var BANKS = {
    t1: [ // L1-20: 3-4 letters
      { word: 'CAT', emoji: '🐱' }, { word: 'DOG', emoji: '🐶' }, { word: 'HOME', emoji: '🏠' },
      { word: 'DOOR', emoji: '🚪' }, { word: 'WALL', emoji: '🧱' }, { word: 'ROOM', emoji: '🛋️' },
      { word: 'BED', emoji: '🛏️' }, { word: 'BATH', emoji: '🛁' }, { word: 'TREE', emoji: '🌳' },
      { word: 'PARK', emoji: '🏞️' }, { word: 'ROAD', emoji: '🛣️' }, { word: 'SHOP', emoji: '🏪' },
      { word: 'BUS', emoji: '🚌' }, { word: 'CAKE', emoji: '🎂' }
    ],
    t2: [ // L21-50: 5-6 letters
      { word: 'HOUSE', emoji: '🏠' }, { word: 'SCHOOL', emoji: '🏫' }, { word: 'STREET', emoji: '🛣️' },
      { word: 'WINDOW', emoji: '🪟' }, { word: 'GARDEN', emoji: '🌻' }, { word: 'MARKET', emoji: '🏪' },
      { word: 'BRIDGE', emoji: '🌉' }, { word: 'TOWER', emoji: '🗼' }, { word: 'CHURCH', emoji: '⛪' },
      { word: 'FAMILY', emoji: '👨‍👩‍👧' }, { word: 'FRIEND', emoji: '👫' }, { word: 'BAKERY', emoji: '🥐' },
      { word: 'CASTLE', emoji: '🏰' }, { word: 'PICNIC', emoji: '🧺' }
    ],
    t3: [ // L51-80: 7-8 letters
      { word: 'LIBRARY', emoji: '📚' }, { word: 'STATION', emoji: '🚉' }, { word: 'HOSPITAL', emoji: '🏥' },
      { word: 'TRAFFIC', emoji: '🚦' }, { word: 'SIDEWALK', emoji: '🚶' }, { word: 'BUILDER', emoji: '👷' },
      { word: 'TEACHER', emoji: '👩‍🏫' }, { word: 'NEIGHBOR', emoji: '🏘️' }, { word: 'FIREMAN', emoji: '👨‍🚒' },
      { word: 'MAILBOX', emoji: '📬' }, { word: 'BICYCLE', emoji: '🚲' }, { word: 'FOUNTAIN', emoji: '⛲' },
      { word: 'VILLAGE', emoji: '🏘️' }, { word: 'AIRPORT', emoji: '✈️' }
    ],
    t4: [ // L81-100: 9-11 letters
      { word: 'APARTMENT', emoji: '🏢' }, { word: 'CLASSROOM', emoji: '🏫' }, { word: 'PLAYGROUND', emoji: '🛝' },
      { word: 'BOOKSTORE', emoji: '📚' }, { word: 'SUPERMARKET', emoji: '🛒' }, { word: 'RESTAURANT', emoji: '🍽️' },
      { word: 'SKYSCRAPER', emoji: '🏙️' }, { word: 'HELICOPTER', emoji: '🚁' }, { word: 'STRAWBERRY', emoji: '🍓' },
      { word: 'BASKETBALL', emoji: '🏀' }, { word: 'COMMUNITY', emoji: '🤝' }, { word: 'EDUCATION', emoji: '🎓' },
      { word: 'ADVENTURE', emoji: '🗺️' }
    ]
  };
  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var KINDS = ['house', 'house', 'shop', 'park', 'school', 'tower'];
  var KIND_EMOJI = { house: '🏠', shop: '🏪', park: '🌳', school: '🏫', tower: '🏙️', goldtower: '🌟🏙️' };

  var emojiEl = document.getElementById('wt-emoji');
  var clueEl = document.getElementById('wt-clue');
  var slotsEl = document.getElementById('wt-slots');
  var tilesEl = document.getElementById('wt-tiles');
  var msgEl = document.getElementById('wt-msg');
  var roundEl = document.getElementById('wt-round');
  var scoreEl = document.getElementById('wt-score');
  var bestEl = document.getElementById('wt-best');
  var starsEl = document.getElementById('wt-stars');
  var doneEl = document.getElementById('wt-done');
  var doneStats = document.getElementById('wt-done-stats');
  var doneTitle = document.getElementById('wt-done-title');
  var againBtn = document.getElementById('wt-again');
  var mapEl = document.getElementById('wt-map');
  var levelNowEl = document.getElementById('wt-level-now');
  var noteEl = document.getElementById('wt-progress-note');
  var sceneEl = document.getElementById('wt-scene');
  var stripEl = document.getElementById('wt-strip');
  var sparkEl = document.getElementById('wt-spark');

  var level = 1, unlocked = 1, starsMap = {};
  try {
    level = parseInt(localStorage.getItem('wa_wt_current') || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem('wa_wt_unlocked') || '1', 10) || 1;
    starsMap = JSON.parse(localStorage.getItem('wa_wt_stars') || '{}') || {};
  } catch (e) {}
  if (level < 1) level = 1;
  if (level > MAX_LEVEL) level = MAX_LEVEL;
  if (unlocked < 1) unlocked = 1;
  if (unlocked > MAX_LEVEL) unlocked = MAX_LEVEL;
  if (level > unlocked) level = unlocked;

  var queue = [], round = 0, score = 0, locked = false;
  var placed = 0, wordMistake = false, currentItem = null, tiles = [], slotEls = [];
  var builtThisLevel = 0, basePieces = 0, renderedCount = 0;

  function save() {
    try {
      localStorage.setItem('wa_wt_current', String(level));
      localStorage.setItem('wa_wt_unlocked', String(unlocked));
      localStorage.setItem('wa_wt_stars', JSON.stringify(starsMap));
    } catch (e) {}
  }
  function shuffle(a) {
    var x = a.slice();
    for (var i = x.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = x[i]; x[i] = x[j]; x[j] = t;
    }
    return x;
  }
  function tierName(n) {
    if (n <= 20) return 'First streets';
    if (n <= 50) return 'Town builder';
    if (n <= 80) return 'City planner';
    return 'Master architect';
  }
  function bankFor(n) {
    if (n <= 20) return BANKS.t1;
    if (n <= 50) return BANKS.t2;
    if (n <= 80) return BANKS.t3;
    return BANKS.t4;
  }
  function trapsFor(n) {
    if (n <= 20) return 0;
    if (n <= 80) return 2;
    return 3;
  }
  function hintMode(n) { // 'show' | 'afterFirst' | 'atEnd'
    if (n <= 50) return 'show';
    if (n <= 80) return 'afterFirst';
    return 'atEnd';
  }
  function completedCount(exceptLevel) {
    var c = 0;
    for (var k in starsMap) if (Object.prototype.hasOwnProperty.call(starsMap, k) && Number(k) !== exceptLevel) c++;
    return c;
  }

  /* ================= 3D TOWN (Three.js, with emoji fallback) ================= */
  var use3D = false, THREE_ = null, renderer = null, scene = null, camera = null, townGroup = null;
  var rising = [], orbitAngle = Math.PI / 4, lastTime = 0;
  var matCache = {}, boxGeo = null, cone4Geo = null, coneTreeGeo = null, trunkGeo = null, discGeo = null;
  var BODY_COLORS = [0xffb4a2, 0xffd6a5, 0xcaffbf, 0x9bf6ff, 0xa0c4ff, 0xffc6ff, 0xfdffb6, 0xffadad];
  var ROOF_COLORS = [0xef476f, 0xf78c6b, 0x845ec2, 0x2c73d2, 0x008f7a, 0xd90429];

  var PLOTS = (function () {
    var pts = [];
    for (var x = -25; x <= 25; x += 5) {
      for (var z = -25; z <= 25; z += 5) {
        if (z === 0) continue; // the road runs here
        pts.push({ x: x, z: z, d: Math.abs(x) + Math.abs(z) });
      }
    }
    pts.sort(function (a, b) { return a.d - b.d || a.x - b.x || a.z - b.z; });
    return pts;
  })();

  function mat(color) {
    if (!matCache[color]) matCache[color] = new THREE_.MeshLambertMaterial({ color: color });
    return matCache[color];
  }
  function addBox(parent, w, h, d, x, y, z, color) {
    var m = new THREE_.Mesh(boxGeo, mat(color));
    m.scale.set(w, h, d);
    m.position.set(x, y + h / 2, z);
    parent.add(m);
    return m;
  }
  function addPyramid(parent, w, h, x, y, z, color) {
    var m = new THREE_.Mesh(cone4Geo, mat(color));
    m.scale.set(w * 0.78, h, w * 0.78);
    m.rotation.y = Math.PI / 4;
    m.position.set(x, y + h / 2, z);
    parent.add(m);
    return m;
  }
  function addTree(parent, x, z, s) {
    var trunk = new THREE_.Mesh(trunkGeo, mat(0x8a5a2b));
    trunk.scale.set(0.35 * s, 1.1 * s, 0.35 * s);
    trunk.position.set(x, 0.55 * s, z);
    parent.add(trunk);
    var top = new THREE_.Mesh(coneTreeGeo, mat(0x2e9e4f));
    top.scale.set(1.15 * s, 2.4 * s, 1.15 * s);
    top.position.set(x, 1.1 * s + 1.2 * s, z);
    parent.add(top);
  }
  function makePiece(kind, idx) {
    var g = new THREE_.Group();
    var body = BODY_COLORS[(idx * 3 + 1) % BODY_COLORS.length];
    var roof = ROOF_COLORS[(idx * 5 + 2) % ROOF_COLORS.length];
    var tall = ((idx * 13) % 3) * 0.45;
    if (kind === 'house') {
      addBox(g, 3, 2.2 + tall, 3, 0, 0, 0, body);
      addPyramid(g, 3.4, 1.5, 0, 2.2 + tall, 0, roof);
      addBox(g, 0.7, 1.2, 0.15, 0, 0, 1.53, 0x7a4a21);
    } else if (kind === 'shop') {
      addBox(g, 4, 2.5, 3.4, 0, 0, 0, body);
      addBox(g, 4.4, 0.35, 3.8, 0, 2.5, 0, roof);
      addBox(g, 3.6, 0.18, 1, 0, 1.65, 2, 0xffd166);
      addBox(g, 1, 1.5, 0.15, -1, 0, 1.73, 0x33526e);
      addBox(g, 1, 1.5, 0.15, 1, 0, 1.73, 0x33526e);
    } else if (kind === 'park') {
      var disc = new THREE_.Mesh(discGeo, mat(0x5dbb63));
      disc.scale.set(2.1, 0.16, 2.1);
      disc.position.set(0, 0.08, 0);
      g.add(disc);
      addTree(g, -1, -0.8, 1);
      addTree(g, 1.1, 0.4, 1.25);
      addTree(g, 0.1, 1.2, 0.85);
    } else if (kind === 'school') {
      addBox(g, 4.4, 3, 3.6, 0, 0, 0, body);
      addPyramid(g, 4.8, 1.7, 0, 3, 0, roof);
      addBox(g, 0.9, 1.7, 0.15, 0, 0, 1.83, 0x7a4a21);
      addBox(g, 0.12, 1.6, 0.12, 1.6, 3.9, 0, 0xdddddd);
      addBox(g, 0.85, 0.55, 0.06, 2.02, 5, 0, 0xef476f);
    } else if (kind === 'goldtower') {
      var gold = new THREE_.MeshLambertMaterial({ color: 0xf6c453, emissive: 0x7a5b12 });
      var gm = new THREE_.Mesh(boxGeo, gold);
      gm.scale.set(3, 9, 3); gm.position.set(0, 4.5, 0); g.add(gm);
      var gr = new THREE_.Mesh(cone4Geo, gold);
      gr.scale.set(2.6, 2.4, 2.6); gr.rotation.y = Math.PI / 4; gr.position.set(0, 10.2, 0); g.add(gr);
    } else { // tower
      var h = 5.6 + tall * 2;
      addBox(g, 2.7, h, 2.7, 0, 0, 0, body);
      addPyramid(g, 3.1, 1.8, 0, h, 0, roof);
      addBox(g, 0.5, h * 0.7, 0.12, -0.7, h * 0.15, 1.36, 0xfff3b0);
      addBox(g, 0.5, h * 0.7, 0.12, 0.7, h * 0.15, 1.36, 0xfff3b0);
    }
    return g;
  }

  function init3D() {
    if (typeof THREE === 'undefined' || !sceneEl) return false;
    try {
      THREE_ = THREE;
      renderer = new THREE_.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      scene = new THREE_.Scene();
      scene.background = new THREE_.Color(0xaee3f7);
      scene.fog = new THREE_.Fog(0xaee3f7, 95, 160);
      camera = new THREE_.PerspectiveCamera(36, 2, 0.1, 300);
      scene.add(new THREE_.AmbientLight(0xffffff, 0.8));
      var sun = new THREE_.DirectionalLight(0xffffff, 0.65);
      sun.position.set(25, 38, 14);
      scene.add(sun);
      boxGeo = new THREE_.BoxGeometry(1, 1, 1);
      cone4Geo = new THREE_.ConeGeometry(1, 1, 4);
      coneTreeGeo = new THREE_.ConeGeometry(1, 1, 8);
      trunkGeo = new THREE_.CylinderGeometry(0.5, 0.5, 1, 6);
      discGeo = new THREE_.CylinderGeometry(1, 1, 1, 20);

      var ground = new THREE_.Mesh(boxGeo, mat(0x79c25f));
      ground.scale.set(64, 1, 64); ground.position.y = -0.5;
      scene.add(ground);
      var road = new THREE_.Mesh(boxGeo, mat(0x4a4a55));
      road.scale.set(64, 0.1, 5); road.position.y = 0.05;
      scene.add(road);
      for (var i = -30; i <= 30; i += 4) {
        var dash = new THREE_.Mesh(boxGeo, mat(0xfffbe6));
        dash.scale.set(1.8, 0.06, 0.35); dash.position.set(i, 0.12, 0);
        scene.add(dash);
      }
      townGroup = new THREE_.Group();
      scene.add(townGroup);
      sceneEl.appendChild(renderer.domElement);
      resize3D();
      window.addEventListener('resize', resize3D);
      requestAnimationFrame(animate3D);
      return true;
    } catch (e) {
      renderer = null; scene = null; townGroup = null;
      return false;
    }
  }
  function resize3D() {
    if (!renderer || !sceneEl) return;
    var w = sceneEl.clientWidth || 880;
    var h = sceneEl.clientHeight || 360;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  function animate3D(t) {
    requestAnimationFrame(animate3D);
    if (!renderer) return;
    var dt = lastTime ? Math.min(50, t - lastTime) : 16;
    lastTime = t;
    orbitAngle += dt * 0.000045; // very slow orbit — about one full turn in 2+ minutes
    var r = 47;
    camera.position.set(Math.cos(orbitAngle) * r, 30, Math.sin(orbitAngle) * r);
    camera.lookAt(0, 1, 0);
    for (var i = rising.length - 1; i >= 0; i--) {
      var g = rising[i];
      g.userData.riseP += dt / 650;
      var p = Math.min(1, g.userData.riseP);
      var e = 1 - Math.pow(1 - p, 3);
      g.position.y = -5 * (1 - e);
      if (p >= 1) { g.position.y = 0; rising.splice(i, 1); }
    }
    renderer.render(scene, camera);
  }

  function clearTown() {
    renderedCount = 0;
    if (use3D && townGroup) {
      while (townGroup.children.length) townGroup.remove(townGroup.children[0]);
      rising = [];
    }
    if (stripEl) stripEl.innerHTML = '';
  }
  function placePiece(kind, idx, animate) {
    if (renderedCount >= MAX_LEVEL) return;
    if (use3D && townGroup) {
      var g = makePiece(kind, idx);
      if (kind === 'goldtower') {
        g.position.set(0, 0, 10);
      } else {
        var plot = PLOTS[renderedCount % PLOTS.length];
        g.position.set(plot.x, 0, plot.z);
      }
      if (animate) { g.userData.riseP = 0; g.position.y = -5; rising.push(g); }
      townGroup.add(g);
    } else if (stripEl) {
      var s = document.createElement('span');
      s.textContent = KIND_EMOJI[kind] || '🏠';
      stripEl.appendChild(s);
    }
    renderedCount++;
  }
  function renderBaseTown() {
    clearTown();
    basePieces = Math.min(completedCount(level), MAX_LEVEL);
    for (var i = 0; i < basePieces; i++) placePiece(KINDS[i % KINDS.length], i, false);
  }
  function buildNextPiece() {
    var kind = KINDS[builtThisLevel % KINDS.length];
    if (level >= MAX_LEVEL && builtThisLevel === WORDS_PER_LEVEL - 1) kind = 'goldtower';
    builtThisLevel++;
    placePiece(kind, basePieces + builtThisLevel - 1, true);
    if (sparkEl) {
      sparkEl.classList.remove('wt-pop');
      void sparkEl.offsetWidth;
      sparkEl.classList.add('wt-pop');
    }
  }

  /* ================= GAME FLOW ================= */
  function buildMap() {
    mapEl.innerHTML = '';
    for (var n = 1; n <= MAX_LEVEL; n++) {
      (function (n) {
        var b = document.createElement('button');
        b.type = 'button';
        var st = starsMap[n] || 0;
        b.className = 'wt-lvl' + (n === level ? ' wt-cur' : '') + (st > 0 ? ' wt-done' : '');
        b.textContent = st > 0 ? n + ' ⭐' : String(n);
        b.title = 'Level ' + n + ' — ' + tierName(n) + (st > 0 ? ' · best ' + st + '/6 stars' : '');
        if (n > unlocked) { b.disabled = true; b.classList.add('wt-lock'); b.textContent = '🔒'; b.title = 'Level ' + n + ' — finish level ' + (n - 1) + ' to unlock'; }
        b.addEventListener('click', function () { if (n <= unlocked && n !== level) { level = n; save(); start(); } });
        mapEl.appendChild(b);
      })(n);
    }
    levelNowEl.textContent = level;
    var doneCount = Object.keys(starsMap).length;
    noteEl.textContent = tierName(level) + ' · ' + doneCount + ' of 100 levels completed';
  }
  function showBest() {
    var b = starsMap[level] || 0;
    bestEl.textContent = b > 0 ? b + ' / 6 ⭐' : '—';
  }
  function drawStars() {
    var s = '';
    for (var i = 0; i < WORDS_PER_LEVEL; i++) s += i < score ? '⭐' : '☆';
    starsEl.textContent = s;
  }

  function nextRound() {
    locked = false; wordMistake = false; placed = 0;
    currentItem = queue[round];
    var item = currentItem;
    var mode = hintMode(level);
    roundEl.textContent = (round + 1) + ' / ' + WORDS_PER_LEVEL;
    if (mode === 'show') {
      emojiEl.textContent = item.emoji;
      clueEl.textContent = 'What is this? Build the word!';
    } else {
      emojiEl.textContent = '❓';
      clueEl.textContent = mode === 'afterFirst'
        ? 'The picture is hiding! Place the first letter to peek.'
        : 'No picture this time — sound out the word from its letters!';
    }

    slotEls = [];
    slotsEl.innerHTML = '';
    item.word.split('').forEach(function () {
      var t = document.createElement('div');
      t.className = 'wt-slot';
      t.textContent = '·';
      slotsEl.appendChild(t);
      slotEls.push(t);
    });

    var letters = item.word.split('');
    var traps = trapsFor(level);
    for (var i = 0; i < traps; i++) {
      var c = ALPHABET.charAt(Math.floor(Math.random() * 26));
      letters.push(c);
    }
    tiles = shuffle(letters).map(function (letter) { return { letter: letter, used: false, btn: null }; });
    tilesEl.innerHTML = '';
    tiles.forEach(function (tile) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wt-tile';
      b.textContent = tile.letter;
      tile.btn = b;
      b.addEventListener('click', function () { choose(tile); });
      tilesEl.appendChild(b);
    });
    msgEl.textContent = 'Tap the letter tiles in order to build the word.';
  }

  function choose(tile) {
    if (locked || tile.used) return;
    var item = currentItem;
    var expected = item.word.charAt(placed);
    if (tile.letter === expected) {
      tile.used = true;
      tile.btn.disabled = true;
      tile.btn.classList.add('wt-right');
      slotEls[placed].textContent = tile.letter;
      slotEls[placed].classList.add('wt-filled');
      placed++;
      if (placed === 1 && hintMode(level) === 'afterFirst') {
        emojiEl.textContent = item.emoji;
        clueEl.textContent = 'There it is! Keep building.';
      }
      if (placed >= item.word.length) {
        locked = true;
        tiles.forEach(function (t) { t.btn.disabled = true; });
        if (hintMode(level) === 'atEnd') {
          emojiEl.textContent = item.emoji;
          clueEl.textContent = 'It was a ' + item.word + '!';
        }
        if (!wordMistake) { score++; scoreEl.textContent = score; drawStars(); }
        msgEl.textContent = 'You built ' + item.word + '! 🔨' + (wordMistake ? '' : ' ⭐ First try!');
        buildNextPiece();
        setTimeout(function () {
          round++;
          if (round >= WORDS_PER_LEVEL) finish(); else nextRound();
        }, 1250);
      } else {
        msgEl.textContent = 'Yes! What letter comes next?';
      }
    } else {
      wordMistake = true;
      tile.btn.classList.add('wt-wrong');
      tile.btn.disabled = true;
      msgEl.textContent = 'Not that letter — look at the word so far and try another tile.';
      setTimeout(function () { tile.btn.classList.remove('wt-wrong'); }, 350);
    }
  }

  function finish() {
    var prev = starsMap[level] || 0;
    if (score > prev) starsMap[level] = score;
    var wasLast = level >= MAX_LEVEL;
    if (!wasLast && level + 1 > unlocked) unlocked = level + 1;
    save();
    showBest();
    buildMap();
    if (doneTitle) doneTitle.textContent = wasLast ? '👑 Level 100 — Your Town Is Complete!' : '🎉 Level ' + level + ' Complete!';
    doneStats.textContent = 'You earned ' + score + ' of ' + WORDS_PER_LEVEL + ' stars on Level ' + level + ' (' + tierName(level) + '). ' +
      (wasLast ? 'You built all 100 levels — and the golden tower shines over your finished town! 🏙️✨'
        : score === WORDS_PER_LEVEL ? 'Perfect level — six new buildings rise! Level ' + (level + 1) + ' is unlocked.'
        : 'Your town grew by six pieces — Level ' + (level + 1) + ' is unlocked. Replay any level to earn more stars.');
    againBtn.textContent = wasLast ? 'Play again' : 'Next level →';
    doneEl.classList.remove('hidden');
  }

  function start() {
    queue = shuffle(bankFor(level)).slice(0, WORDS_PER_LEVEL);
    round = 0; score = 0; builtThisLevel = 0;
    scoreEl.textContent = '0';
    doneEl.classList.add('hidden');
    renderBaseTown();
    buildMap();
    drawStars();
    showBest();
    nextRound();
  }

  document.getElementById('wt-restart').addEventListener('click', start);
  againBtn.addEventListener('click', function () {
    if (level < MAX_LEVEL) { level = level + 1; save(); }
    start();
  });

  /* ================= INIT + TEST HOOK ================= */
  use3D = init3D();
  if (!use3D) {
    if (sceneEl) sceneEl.style.display = 'none';
    if (stripEl) stripEl.classList.add('wt-on');
  }

  window.__wt = {
    state: function () {
      return {
        level: level, unlocked: unlocked, round: round + 1, placed: placed,
        word: currentItem ? currentItem.word : null,
        score: score, builtThisLevel: builtThisLevel,
        buildings: renderedCount, fallback: !use3D,
        stars: starsMap[level] || 0
      };
    },
    setLevel: function (n) {
      n = parseInt(n, 10) || 1;
      if (n < 1) n = 1; if (n > MAX_LEVEL) n = MAX_LEVEL;
      level = n;
      if (n > unlocked) unlocked = n;
      save();
      start();
    },
    start: function () { start(); },
    placeNext: function () {
      if (!currentItem || locked) return false;
      var expected = currentItem.word.charAt(placed);
      for (var i = 0; i < tiles.length; i++) {
        if (!tiles[i].used && tiles[i].letter === expected) { choose(tiles[i]); return true; }
      }
      return false;
    },
    word: function () { return currentItem ? currentItem.word : null; },
    buildings: function () { return renderedCount; }
  };

  start();
})();
