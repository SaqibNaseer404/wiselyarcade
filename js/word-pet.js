// Wisely Arcade — Word Pet v1 (100 levels — finish the word, feed the pet, watch him grow)
// Mechanic: tap the shuffled letter tiles IN ORDER to build the word shown by the picture.
// Every finished word feeds/plays with Biscuit the puppy — and he grows, level by level,
// from a tiny egg all the way to a crowned Champion at Level 100.
// The pet is a real 3D scene (Three.js). If the CDN or WebGL fails, a big emoji pet
// grows instead — the game never breaks.
(function () {
  'use strict';

  var MAX_LEVEL = 100;
  var WORDS_PER_LEVEL = 6;

  var BANKS = {
    t1: [ // L1-20: 3-4 letters
      { word: 'CAT', emoji: '🐱' }, { word: 'DOG', emoji: '🐶' }, { word: 'PIG', emoji: '🐷' },
      { word: 'COW', emoji: '🐮' }, { word: 'EGG', emoji: '🥚' }, { word: 'BUS', emoji: '🚌' },
      { word: 'SUN', emoji: '🌞' }, { word: 'HEN', emoji: '🐔' }, { word: 'BEE', emoji: '🐝' },
      { word: 'ANT', emoji: '🐜' }, { word: 'FOX', emoji: '🦊' }, { word: 'BAT', emoji: '🦇' },
      { word: 'FISH', emoji: '🐟' }, { word: 'BIRD', emoji: '🐦' }, { word: 'DUCK', emoji: '🦆' },
      { word: 'FROG', emoji: '🐸' }, { word: 'LION', emoji: '🦁' }, { word: 'BEAR', emoji: '🐻' },
      { word: 'CAKE', emoji: '🎂' }, { word: 'BOOK', emoji: '📕' }, { word: 'TREE', emoji: '🌳' },
      { word: 'MILK', emoji: '🥛' }, { word: 'BALL', emoji: '⚽' }, { word: 'BOAT', emoji: '⛵' },
      { word: 'STAR', emoji: '⭐' }, { word: 'MOON', emoji: '🌙' }, { word: 'CRAB', emoji: '🦀' },
      { word: 'CORN', emoji: '🌽' }
    ],
    t2: [ // L21-50: 5-6 letters
      { word: 'APPLE', emoji: '🍎' }, { word: 'BANANA', emoji: '🍌' }, { word: 'ORANGE', emoji: '🍊' },
      { word: 'HORSE', emoji: '🐴' }, { word: 'TIGER', emoji: '🐯' }, { word: 'ZEBRA', emoji: '🦓' },
      { word: 'CAMEL', emoji: '🐪' }, { word: 'MONKEY', emoji: '🐵' }, { word: 'RABBIT', emoji: '🐰' },
      { word: 'TURTLE', emoji: '🐢' }, { word: 'KITTEN', emoji: '🐱' }, { word: 'PUPPY', emoji: '🐶' },
      { word: 'GARDEN', emoji: '🌻' }, { word: 'CASTLE', emoji: '🏰' }, { word: 'BRIDGE', emoji: '🌉' },
      { word: 'PENCIL', emoji: '✏️' }, { word: 'SCHOOL', emoji: '🏫' }, { word: 'PLANET', emoji: '🪐' },
      { word: 'ROCKET', emoji: '🚀' }, { word: 'CHEESE', emoji: '🧀' }, { word: 'PIZZA', emoji: '🍕' },
      { word: 'GRAPES', emoji: '🍇' }, { word: 'LEMON', emoji: '🍋' }, { word: 'MANGO', emoji: '🥭' },
      { word: 'PEACH', emoji: '🍑' }, { word: 'MELON', emoji: '🍈' }, { word: 'DONKEY', emoji: '🫏' }
    ],
    t3: [ // L51-80: 7-8 letters
      { word: 'DOLPHIN', emoji: '🐬' }, { word: 'PENGUIN', emoji: '🐧' }, { word: 'OCTOPUS', emoji: '🐙' },
      { word: 'GIRAFFE', emoji: '🦒' }, { word: 'ELEPHANT', emoji: '🐘' }, { word: 'KANGAROO', emoji: '🦘' },
      { word: 'LADYBUG', emoji: '🐞' }, { word: 'POPCORN', emoji: '🍿' }, { word: 'CUPCAKE', emoji: '🧁' },
      { word: 'PANCAKE', emoji: '🥞' }, { word: 'SANDWICH', emoji: '🥪' }, { word: 'BROCCOLI', emoji: '🥦' },
      { word: 'CUCUMBER', emoji: '🥒' }, { word: 'PUMPKIN', emoji: '🎃' }, { word: 'RAINBOW', emoji: '🌈' },
      { word: 'VOLCANO', emoji: '🌋' }, { word: 'DIAMOND', emoji: '💎' }, { word: 'LANTERN', emoji: '🏮' },
      { word: 'COMPASS', emoji: '🧭' }, { word: 'BALLOON', emoji: '🎈' }, { word: 'BICYCLE', emoji: '🚲' },
      { word: 'TRACTOR', emoji: '🚜' }, { word: 'AIRPLANE', emoji: '✈️' }, { word: 'FOOTBALL', emoji: '⚽' }
    ],
    t4: [ // L81-100: 9-12 letters
      { word: 'STRAWBERRY', emoji: '🍓' }, { word: 'PINEAPPLE', emoji: '🍍' }, { word: 'HELICOPTER', emoji: '🚁' },
      { word: 'CROCODILE', emoji: '🐊' }, { word: 'BUTTERFLY', emoji: '🦋' }, { word: 'ALLIGATOR', emoji: '🐊' },
      { word: 'RHINOCEROS', emoji: '🦏' }, { word: 'HIPPOPOTAMUS', emoji: '🦛' }, { word: 'CHOCOLATE', emoji: '🍫' },
      { word: 'WATERMELON', emoji: '🍉' }, { word: 'BASKETBALL', emoji: '🏀' }, { word: 'SKATEBOARD', emoji: '🛹' },
      { word: 'TOOTHBRUSH', emoji: '🪥' }, { word: 'FLASHLIGHT', emoji: '🔦' }, { word: 'MICROSCOPE', emoji: '🔬' },
      { word: 'TELESCOPE', emoji: '🔭' }, { word: 'VEGETABLES', emoji: '🥕' }, { word: 'BLACKBERRY', emoji: '🫐' },
      { word: 'SAXOPHONE', emoji: '🎷' }, { word: 'TRAMPOLINE', emoji: '🤸' }
    ]
  };
  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Collection: Biscuit from the start, a new friend every 10 levels.
  var PETS = [
    { emoji: '🐶', name: 'Biscuit', at: 0 }, { emoji: '🐕', name: 'Coco', at: 10 },
    { emoji: '🐩', name: 'Snowy', at: 20 }, { emoji: '🦮', name: 'Goldie', at: 30 },
    { emoji: '🐕‍🦺', name: 'Hero', at: 40 }, { emoji: '🐶', name: 'Peanut', at: 50 },
    { emoji: '🐕', name: 'Rusty', at: 60 }, { emoji: '🐩', name: 'Pearl', at: 70 },
    { emoji: '🦮', name: 'Shadow', at: 80 }, { emoji: '🐶', name: 'Champion', at: 90 }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var hintEl = $('wp-hint'), hintLabelEl = $('wp-hintlabel');
  var wordEl = $('wp-word'), tilesEl = $('wp-tiles'), msgEl = $('wp-msg');
  var roundEl = $('wp-round'), scoreEl = $('wp-score'), bestEl = $('wp-best');
  var starsEl = $('wp-stars'), doneEl = $('wp-done'), doneStats = $('wp-done-stats'), doneTitle = $('wp-done-title');
  var againBtn = $('wp-again'), mapEl = $('wp-map'), levelNowEl = $('wp-level-now'), noteEl = $('wp-progress-note');
  var stageEl = $('wp-stage-name'), petsEl = $('wp-pets'), petsCountEl = $('wp-pets-count');
  var sceneEl = $('wp-scene'), fallbackEl = $('wp-fallback'), fallbackPetEl = $('wp-fallback-pet'), burstEl = $('wp-burst');

  var level = 1, unlocked = 1, starsMap = {};
  try {
    level = parseInt(localStorage.getItem('wa_wp_current') || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem('wa_wp_unlocked') || '1', 10) || 1;
    starsMap = JSON.parse(localStorage.getItem('wa_wp_stars') || '{}') || {};
  } catch (e) {}
  if (level < 1) level = 1;
  if (level > MAX_LEVEL) level = MAX_LEVEL;
  if (unlocked < 1) unlocked = 1;
  if (unlocked > MAX_LEVEL) unlocked = MAX_LEVEL;
  if (level > unlocked) level = unlocked;

  var queue = [], round = 0, score = 0, wordsDone = 0, locked = false;
  var placed = 0, wordMistake = false, currentItem = null, tiles = [];

  function save() {
    try {
      localStorage.setItem('wa_wp_current', String(level));
      localStorage.setItem('wa_wp_unlocked', String(unlocked));
      localStorage.setItem('wa_wp_stars', JSON.stringify(starsMap));
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
    if (n <= 20) return 'Tiny words';
    if (n <= 50) return 'Growing words';
    if (n <= 80) return 'Big words';
    return 'Champion words';
  }
  function bankFor(n) {
    if (n <= 20) return BANKS.t1;
    if (n <= 50) return BANKS.t2;
    if (n <= 80) return BANKS.t3;
    return BANKS.t4;
  }
  function trapsFor(n) {
    if (n <= 20) return 0;
    if (n <= 50) return 2;
    if (n <= 80) return 3;
    return 4;
  }
  function hintMode(n) { // 'show', 'after-first', 'at-end'
    if (n <= 50) return 'show';
    if (n <= 80) return 'after-first';
    return 'at-end';
  }
  function maxCompleted() {
    var m = unlocked - 1;
    Object.keys(starsMap).forEach(function (k) { var n = parseInt(k, 10); if (n > m) m = n; });
    return m;
  }

  /* ---------------- growth + stage ---------------- */
  function petScaleValue() {
    var base = 0.5 + (level - 1) * (0.85 / 99);
    return base + (wordsDone / WORDS_PER_LEVEL) * 0.15;
  }
  function stageName() {
    if (level >= 100) return 'Champion 👑';
    if (level >= 60) return 'Big';
    if (level >= 30) return 'Young';
    if (level >= 10) return 'Pup';
    if (level >= 2 || wordsDone >= 3) return 'Baby';
    return 'Egg';
  }
  function updateGrowth() {
    var s = stageName();
    stageEl.textContent = s;
    petSetStage(s, petScaleValue());
    if (fallbackMode) {
      fallbackPetEl.style.fontSize = Math.round(56 + petScaleValue() * 62) + 'px';
      fallbackPetEl.textContent = s === 'Egg' ? '🥚' : '🐶';
    }
  }
  function renderPets() {
    var mc = maxCompleted();
    var count = 0;
    petsEl.innerHTML = '';
    PETS.forEach(function (p) {
      var got = mc >= p.at;
      if (got) count++;
      var d = document.createElement('div');
      d.className = 'wp-pet' + (got ? '' : ' wp-pet-lock');
      d.title = got ? p.name + ' — your friend!' : p.name + ' — finish level ' + p.at + ' to meet ' + p.name;
      d.innerHTML = '<span>' + (got ? p.emoji : '❔') + '</span><small>' + (got ? p.name : 'Level ' + p.at) + '</small>';
      petsEl.appendChild(d);
    });
    petsCountEl.textContent = count + ' / ' + PETS.length + ' pets';
  }

  /* ---------------- level map ---------------- */
  function buildMap() {
    mapEl.innerHTML = '';
    for (var n = 1; n <= MAX_LEVEL; n++) {
      (function (n) {
        var b = document.createElement('button');
        b.type = 'button';
        var st = starsMap[n] || 0;
        b.className = 'wp-lvl' + (n === level ? ' wp-cur' : '') + (st > 0 ? ' wp-done' : '');
        b.textContent = st > 0 ? n + ' ⭐' : String(n);
        b.title = 'Level ' + n + ' — ' + tierName(n) + (st > 0 ? ' · best ' + st + '/6 stars' : '');
        if (n > unlocked) { b.disabled = true; b.classList.add('wp-lock'); b.textContent = '🔒'; b.title = 'Level ' + n + ' — finish level ' + (n - 1) + ' to unlock'; }
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

  /* ---------------- the word round ---------------- */
  function setHint(reveal) {
    var mode = hintMode(level);
    if (mode === 'show' || reveal) {
      hintEl.textContent = currentItem.emoji;
      hintLabelEl.textContent = 'Biscuit is thinking of this — spell it!';
    } else if (mode === 'after-first') {
      hintEl.textContent = '❓';
      hintLabelEl.textContent = 'The picture is hiding — place one letter to peek!';
    } else {
      hintEl.textContent = '❓';
      hintLabelEl.textContent = 'A mystery word! The picture appears when you finish it.';
    }
  }
  function nextRound() {
    locked = false; wordMistake = false; placed = 0;
    currentItem = queue[round];
    var item = currentItem;
    roundEl.textContent = (round + 1) + ' / ' + WORDS_PER_LEVEL;
    setHint(false);

    wordEl.innerHTML = '';
    item.word.split('').forEach(function () {
      var t = document.createElement('div');
      t.className = 'wp-tile wp-slot';
      t.textContent = '·';
      wordEl.appendChild(t);
    });

    var letters = item.word.split('');
    var nTraps = trapsFor(level);
    for (var i = 0; i < nTraps; i++) letters.push(ALPHABET.charAt(Math.floor(Math.random() * 26)));
    tiles = shuffle(letters).map(function (letter) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wp-choice';
      b.textContent = letter;
      b.dataset.letter = letter;
      b.addEventListener('click', function () { choose(b); });
      tilesEl.appendChild(b);
      return { el: b, letter: letter, used: false };
    });
    msgEl.textContent = 'Tap the letters in order to spell the word.';
  }

  function choose(btn) {
    if (locked) return;
    var tile = null;
    for (var i = 0; i < tiles.length; i++) if (tiles[i].el === btn) { tile = tiles[i]; break; }
    if (!tile || tile.used) return;
    var expected = currentItem.word.charAt(placed);
    if (tile.letter === expected) {
      tile.used = true;
      btn.classList.add('wp-used');
      btn.disabled = true;
      var slot = wordEl.children[placed];
      slot.textContent = tile.letter;
      slot.classList.add('wp-filled');
      placed++;
      petReact('letter');
      if (hintMode(level) === 'after-first' && placed === 1) setHint(true);
      if (placed >= currentItem.word.length) completeWord();
      else msgEl.textContent = 'Yes! ' + placed + ' of ' + currentItem.word.length + ' letters — keep going.';
    } else {
      wordMistake = true;
      btn.classList.add('wp-wrong');
      btn.disabled = true;
      msgEl.textContent = 'Not that letter — Biscuit believes in you. Try another!';
      setTimeout(function () { btn.classList.remove('wp-wrong'); }, 350);
    }
  }

  function completeWord() {
    locked = true;
    if (!wordMistake) { score++; scoreEl.textContent = score; drawStars(); }
    wordsDone++;
    if (hintMode(level) === 'at-end') setHint(true);
    updateGrowth();
    burst();
    petReact('word');
    msgEl.textContent = '🎉 ' + currentItem.word + '! Biscuit loved that!' + (wordMistake ? '' : ' ⭐ First try!') + ' Watch him grow!';
    setTimeout(function () {
      round++;
      tilesEl.innerHTML = ''; tiles = [];
      if (round >= WORDS_PER_LEVEL) finish(); else nextRound();
    }, 1500);
  }

  function burst() {
    if (!burstEl) return;
    var bits = ['❤️', '✨', '⭐', '🫧', '❤️', '✨'];
    bits.forEach(function (b, i) {
      var s = document.createElement('span');
      s.className = 'wp-bit';
      s.textContent = b;
      s.style.left = (38 + Math.random() * 24) + '%';
      s.style.animationDelay = (i * 0.07) + 's';
      burstEl.appendChild(s);
      setTimeout(function () { s.remove(); }, 1600);
    });
  }

  function finish() {
    var prev = starsMap[level] || 0;
    if (score > prev) starsMap[level] = score;
    var wasLast = level >= MAX_LEVEL;
    if (!wasLast && level + 1 > unlocked) unlocked = level + 1;
    save();
    showBest();
    buildMap();
    renderPets();
    if (doneTitle) doneTitle.textContent = wasLast ? '👑 Level 100 — Biscuit is a CHAMPION!' : '🎉 Level ' + level + ' Complete!';
    doneStats.textContent = 'You earned ' + score + ' of ' + WORDS_PER_LEVEL + ' stars on Level ' + level + ' (' + tierName(level) + '). Biscuit is now: ' + stageName() + '. ' +
      (wasLast ? 'You climbed all 100 levels — Biscuit wears the golden crown. Every pet friend collected!'
        : score === WORDS_PER_LEVEL ? 'Perfect level! Level ' + (level + 1) + ' is unlocked.'
        : 'Level complete — Level ' + (level + 1) + ' is unlocked. Replay any level to earn more stars.');
    againBtn.textContent = wasLast ? 'Play again' : 'Next level →';
    doneEl.classList.remove('hidden');
  }

  function start() {
    queue = shuffle(bankFor(level)).slice(0, WORDS_PER_LEVEL);
    round = 0; score = 0; wordsDone = 0;
    scoreEl.textContent = '0';
    tilesEl.innerHTML = ''; tiles = [];
    doneEl.classList.add('hidden');
    buildMap();
    drawStars();
    showBest();
    renderPets();
    updateGrowth();
    nextRound();
  }

  /* ---------------- 3D pet (Three.js) with emoji fallback ---------------- */
  var fallbackMode = true;
  var petGroup = null, petParts = {}, eggMesh = null, collarMat = null, crownGroup = null;
  var curScale = 0.5, targetScale = 0.5, hopStart = -1, spinStart = -1, threeOK = false;

  function petSetStage(stage, scale) {
    targetScale = scale * (stage === 'Egg' ? 0.75 : 1);
    if (eggMesh) eggMesh.visible = stage === 'Egg';
    if (crownGroup) crownGroup.visible = stage.indexOf('Champion') !== -1;
    if (collarMat) collarMat.color.setHex(stage.indexOf('Champion') !== -1 ? 0xf5b301 : 0xe14b4b);
  }
  function petReact(kind) {
    var now = performance.now();
    if (kind === 'word') { hopStart = now; spinStart = now; }
    else if (hopStart < 0 || now - hopStart > 350) hopStart = now;
    if (fallbackMode) {
      fallbackPetEl.classList.remove('wp-hop');
      void fallbackPetEl.offsetWidth;
      fallbackPetEl.classList.add('wp-hop');
    }
  }

  function initThree() {
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var w = sceneEl.clientWidth || 880, h = sceneEl.clientHeight || 360;
    renderer.setSize(w, h);
    sceneEl.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    camera.position.set(0, 2.6, 8.2);
    camera.lookAt(0, 1.1, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a9a5b, 0.95));
    var sun = new THREE.DirectionalLight(0xfff2d9, 0.9);
    sun.position.set(4, 7, 5);
    scene.add(sun);

    var ground = new THREE.Mesh(
      new THREE.CircleGeometry(4.6, 40),
      new THREE.MeshStandardMaterial({ color: 0x8fd07a, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    var path = new THREE.Mesh(
      new THREE.CircleGeometry(1.7, 32),
      new THREE.MeshStandardMaterial({ color: 0xf7e3b0, roughness: 1 })
    );
    path.rotation.x = -Math.PI / 2; path.position.y = 0.01;
    scene.add(path);

    function tree(x, z, s) {
      var g = new THREE.Group();
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.7, 8),
        new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 1 }));
      trunk.position.y = 0.35; g.add(trunk);
      var top = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.5, 10),
        new THREE.MeshStandardMaterial({ color: 0x3f9e4d, roughness: 1 }));
      top.position.y = 1.35; g.add(top);
      var top2 = new THREE.Mesh(new THREE.ConeGeometry(0.44, 1.1, 10),
        new THREE.MeshStandardMaterial({ color: 0x4cb85e, roughness: 1 }));
      top2.position.y = 1.95; g.add(top2);
      g.position.set(x, 0, z); g.scale.setScalar(s);
      scene.add(g);
    }
    tree(-3.4, -1.4, 1.15); tree(3.5, -1.7, 0.95); tree(-2.7, -2.4, 0.8);
    function ball(x, z, r, color) {
      var b = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16),
        new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 }));
      b.position.set(x, r, z); scene.add(b);
    }
    ball(-2.3, 1.3, 0.26, 0xe14b4b); ball(2.5, 0.9, 0.2, 0x3f8fe1); ball(2.9, 1.6, 0.15, 0xffc93f);

    /* --- Biscuit, built from soft primitives --- */
    var fur = new THREE.MeshStandardMaterial({ color: 0xd99a55, roughness: 0.9 });
    var cream = new THREE.MeshStandardMaterial({ color: 0xf7e3c0, roughness: 0.95 });
    var dark = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9 });
    var black = new THREE.MeshStandardMaterial({ color: 0x26221f, roughness: 0.6 });
    petGroup = new THREE.Group();

    var body = new THREE.Mesh(new THREE.SphereGeometry(0.78, 28, 22), fur);
    body.scale.set(1, 0.85, 1.12); body.position.y = 0.92;
    petGroup.add(body);
    var belly = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18), cream);
    belly.scale.set(0.85, 0.8, 0.6); belly.position.set(0, 0.82, 0.38);
    petGroup.add(belly);

    var headG = new THREE.Group(); headG.position.set(0, 1.62, 0.62);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 28, 22), fur);
    headG.add(head);
    var snout = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 16), cream);
    snout.scale.set(1.05, 0.75, 0.9); snout.position.set(0, -0.1, 0.42);
    headG.add(snout);
    var nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), black);
    nose.position.set(0, -0.03, 0.66);
    headG.add(nose);
    var eyeGeo = new THREE.SphereGeometry(0.055, 12, 10);
    var eyeL = new THREE.Mesh(eyeGeo, black); eyeL.position.set(-0.19, 0.13, 0.46); headG.add(eyeL);
    var eyeR = new THREE.Mesh(eyeGeo, black); eyeR.position.set(0.19, 0.13, 0.46); headG.add(eyeR);
    function ear(side) {
      var e = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 14), dark);
      e.scale.set(0.55, 1.25, 0.8); e.position.set(0.46 * side, 0.12, 0.02); e.rotation.z = 0.25 * side;
      headG.add(e);
    }
    ear(-1); ear(1);
    crownGroup = new THREE.Group();
    var gold = new THREE.MeshStandardMaterial({ color: 0xf5b301, roughness: 0.35, metalness: 0.55 });
    var crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.2, 6), gold);
    crownBase.position.y = 0.1; crownGroup.add(crownBase);
    for (var ci = 0; ci < 5; ci++) {
      var spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), gold);
      var ang = (ci / 5) * Math.PI * 2;
      spike.position.set(Math.cos(ang) * 0.27, 0.28, Math.sin(ang) * 0.27);
      crownGroup.add(spike);
    }
    crownGroup.position.set(0, 0.5, 0); crownGroup.visible = false;
    headG.add(crownGroup);
    petGroup.add(headG);

    collarMat = new THREE.MeshStandardMaterial({ color: 0xe14b4b, roughness: 0.5 });
    var collar = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 10, 24), collarMat);
    collar.position.set(0, 1.32, 0.5); collar.rotation.x = 1.15;
    petGroup.add(collar);

    var legGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.5, 10);
    [[-0.36, 0.34], [0.36, 0.34], [-0.36, -0.36], [0.36, -0.36]].forEach(function (p) {
      var leg = new THREE.Mesh(legGeo, fur);
      leg.position.set(p[0], 0.26, p[1]);
      petGroup.add(leg);
      var paw = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), cream);
      paw.scale.set(1, 0.6, 1.25); paw.position.set(p[0], 0.06, p[1] + 0.05);
      petGroup.add(paw);
    });

    var tailPivot = new THREE.Group(); tailPivot.position.set(0, 1.2, -0.8);
    var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.62, 10), dark);
    tail.position.y = 0.28; tailPivot.add(tail);
    tailPivot.rotation.x = -0.5;
    petGroup.add(tailPivot);

    var eggMat = new THREE.MeshStandardMaterial({ color: 0xfff6e6, roughness: 0.7 });
    eggMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), eggMat);
    eggMesh.scale.set(1, 1.25, 1); eggMesh.position.set(1.9, 0.52, 0.9);
    scene.add(eggMesh);

    petGroup.position.y = 0;
    scene.add(petGroup);
    petParts = { head: headG, tail: tailPivot, eyeL: eyeL, eyeR: eyeR, body: body };
    curScale = targetScale;
    petGroup.scale.setScalar(curScale);

    window.addEventListener('resize', function () {
      var nw = sceneEl.clientWidth || 880, nh = sceneEl.clientHeight || 360;
      camera.aspect = nw / nh; camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });

    var clock = new THREE.Clock();
    var blinkAt = 2.5, blinking = 0;
    (function animate() {
      requestAnimationFrame(animate);
      var t = clock.getElapsedTime();
      var now = performance.now();
      // growth (smooth)
      curScale += (targetScale - curScale) * 0.07;
      petGroup.scale.setScalar(curScale);
      // idle: breathing + gentle bob
      var bobY = Math.sin(t * 2) * 0.04;
      petParts.body.scale.y = 0.85 + Math.sin(t * 2.4) * 0.02;
      // hop / spin reactions
      var hopY = 0;
      if (hopStart > 0) {
        var hp = (now - hopStart) / 550;
        if (hp >= 1) hopStart = -1; else hopY = Math.abs(Math.sin(hp * Math.PI)) * 0.42;
      }
      petGroup.position.y = bobY + hopY;
      if (spinStart > 0) {
        var sp = (now - spinStart) / 650;
        if (sp >= 1) { spinStart = -1; petGroup.rotation.y = 0; }
        else petGroup.rotation.y = sp * Math.PI * 2;
      }
      petParts.tail.rotation.y = Math.sin(t * (hopStart > 0 ? 14 : 6)) * 0.55;
      petParts.head.rotation.z = Math.sin(t * 1.3) * 0.05;
      petParts.head.position.y = 1.62 + Math.sin(t * 2.4) * 0.02;
      // blink
      if (t > blinkAt) { blinking = 0.13; blinkAt = t + 2.4 + Math.random() * 1.8; }
      if (blinking > 0) { blinking -= 0.016; petParts.eyeL.scale.y = 0.12; petParts.eyeR.scale.y = 0.12; }
      else { petParts.eyeL.scale.y = 1; petParts.eyeR.scale.y = 1; }
      if (eggMesh && eggMesh.visible) eggMesh.rotation.z = Math.sin(t * 3) * 0.08;
      renderer.render(scene, camera);
    })();
    threeOK = true;
  }

  try {
    if (window.THREE) { initThree(); fallbackMode = false; }
  } catch (e) { fallbackMode = true; threeOK = false; }
  if (fallbackMode) {
    fallbackEl.classList.remove('hidden');
    sceneEl.classList.add('wp-scene-fallback');
  }
  updateGrowth();

  /* ---------------- controls + test hook ---------------- */
  $('wp-restart').addEventListener('click', start);
  againBtn.addEventListener('click', function () {
    if (level < MAX_LEVEL) { level = level + 1; save(); }
    start();
  });

  window.__wp = {
    state: function () {
      return {
        level: level, round: round, score: score, wordsDone: wordsDone,
        placed: placed, word: currentItem ? currentItem.word : null,
        stage: stageName(), scale: petScaleValue(), fallback: fallbackMode,
        threeOK: threeOK, unlocked: unlocked
      };
    },
    setLevel: function (n) {
      n = parseInt(n, 10) || 1;
      if (n < 1) n = 1; if (n > MAX_LEVEL) n = MAX_LEVEL;
      level = n; if (n > unlocked) unlocked = n;
      save(); start();
    },
    start: start,
    placeNext: function () {
      if (!currentItem || locked) return false;
      var expected = currentItem.word.charAt(placed);
      for (var i = 0; i < tiles.length; i++) {
        if (!tiles[i].used && tiles[i].letter === expected) { choose(tiles[i].el); return true; }
      }
      return false;
    },
    word: function () { return currentItem ? currentItem.word : null; },
    petScale: function () { return petScaleValue(); }
  };

  start();
})();
