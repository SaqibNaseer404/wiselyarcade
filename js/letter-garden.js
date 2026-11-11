// Wisely Arcade — Letter Garden v1 (100 levels — complete the word, grow the plant)
(function () {
  'use strict';

  var MAX_LEVEL = 100;
  var WORDS_PER_LEVEL = 6;

  var BANKS = {
    b1: [ // L1-20: 3-4 letters
      { word: 'SUN', emoji: '🌞' }, { word: 'BEE', emoji: '🐝' }, { word: 'EGG', emoji: '🥚' },
      { word: 'CAT', emoji: '🐱' }, { word: 'DOG', emoji: '🐶' }, { word: 'ANT', emoji: '🐜' },
      { word: 'SEED', emoji: '🌰' }, { word: 'LEAF', emoji: '🍃' }, { word: 'ROSE', emoji: '🌹' },
      { word: 'RAIN', emoji: '🌧️' }, { word: 'FISH', emoji: '🐟' }, { word: 'BIRD', emoji: '🐦' },
      { word: 'TREE', emoji: '🌳' }, { word: 'CORN', emoji: '🌽' }, { word: 'CAKE', emoji: '🎂' },
      { word: 'MOON', emoji: '🌙' }
    ],
    b2: [ // L21-50: 5-6 letters
      { word: 'APPLE', emoji: '🍎' }, { word: 'LEMON', emoji: '🍋' }, { word: 'TULIP', emoji: '🌷' },
      { word: 'GRAPE', emoji: '🍇' }, { word: 'PLANT', emoji: '🪴' }, { word: 'WATER', emoji: '💧' },
      { word: 'BLOOM', emoji: '🌸' }, { word: 'HONEY', emoji: '🍯' }, { word: 'MELON', emoji: '🍈' },
      { word: 'PEACH', emoji: '🍑' }, { word: 'FLOWER', emoji: '🌼' }, { word: 'GARDEN', emoji: '🌻' },
      { word: 'FOREST', emoji: '🌲' }, { word: 'PUMPKIN', emoji: '🎃' }, { word: 'CARROT', emoji: '🥕' },
      { word: 'BANANA', emoji: '🍌' }
    ],
    b3: [ // L51-80: 7-8 letters
      { word: 'RAINBOW', emoji: '🌈' }, { word: 'SUNSHINE', emoji: '☀️' }, { word: 'BLOSSOM', emoji: '🌸' },
      { word: 'HARVEST', emoji: '🌾' }, { word: 'MEADOW', emoji: '🏞️' }, { word: 'SPROUT', emoji: '🌱' },
      { word: 'COCONUT', emoji: '🥥' }, { word: 'AVOCADO', emoji: '🥑' }, { word: 'CUCUMBER', emoji: '🥒' },
      { word: 'PINEAPPLE', emoji: '🍍' }, { word: 'DAFFODIL', emoji: '🌼' }, { word: 'BUTTERFLY', emoji: '🦋' },
      { word: 'EGGPLANT', emoji: '🍆' }, { word: 'ORCHARD', emoji: '🌳' }
    ],
    b4: [ // L81-100: 9-12 letters
      { word: 'STRAWBERRY', emoji: '🍓' }, { word: 'BLACKBERRY', emoji: '🫐' },
      { word: 'CAULIFLOWER', emoji: '🥦' }, { word: 'CHAMPION', emoji: '🏆' },
      { word: 'ADVENTURE', emoji: '🗺️' }, { word: 'KNOWLEDGE', emoji: '📚' },
      { word: 'GRATITUDE', emoji: '🙏' }, { word: 'CONFIDENCE', emoji: '💪' },
      { word: 'CREATIVITY', emoji: '🎨' }, { word: 'FRIENDSHIP', emoji: '🤝' },
      { word: 'HELICOPTER', emoji: '🚁' }, { word: 'CROCODILE', emoji: '🐊' },
      { word: 'PERSEVERANCE', emoji: '🏆' }
    ]
  };

  var PLANTS = [
    { name: 'Sunflower', bud: '🌻', bloom: '🌻' }, { name: 'Tulip', bud: '🌷', bloom: '🌷' },
    { name: 'Rose', bud: '🌹', bloom: '🌹' }, { name: 'Daisy', bud: '🌼', bloom: '🌼' },
    { name: 'Blossom', bud: '🌸', bloom: '🌸' }, { name: 'Lavender', bud: '🪻', bloom: '🪻' },
    { name: 'Pumpkin', bud: '🌼', bloom: '🎃' }, { name: 'Lemon Tree', bud: '🌿', bloom: '🍋' },
    { name: 'Cherry Tree', bud: '🌸', bloom: '🍒' }, { name: 'Pine Tree', bud: '🌲', bloom: '🌲' },
    { name: 'Palm Tree', bud: '🌴', bloom: '🌴' }, { name: 'Cactus', bud: '🌵', bloom: '🌵' },
    { name: 'Grape Vine', bud: '🌿', bloom: '🍇' }, { name: 'Strawberry', bud: '🌼', bloom: '🍓' },
    { name: 'Watermelon', bud: '🌼', bloom: '🍉' }, { name: 'Corn', bud: '🌿', bloom: '🌽' },
    { name: 'Wheat', bud: '🌿', bloom: '🌾' }, { name: 'Mushroom', bud: '🌱', bloom: '🍄' },
    { name: 'Oak Tree', bud: '🌿', bloom: '🌳' }, { name: 'Hibiscus', bud: '🌺', bloom: '🌺' }
  ];
  var STAGE_NAMES = ['Seed', 'Sprout', 'Stem', 'Leaves', 'Buds', 'Full bloom'];
  var STAGE_SIZES = [2.8, 3.6, 4.4, 5.2, 6.0, 6.8];
  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function plantFor(n) {
    if (n === 100) return { name: 'Golden Tree', bud: '🌟', bloom: '🌟🌳' };
    if (n === 10) return { name: 'Apple Tree', bud: '🌿', bloom: '🍎' };
    if (n === 50) return { name: 'Great Oak', bud: '🌿', bloom: '🌳' };
    return PLANTS[(n - 1) % PLANTS.length];
  }
  function stageEmoji(plant, stage) {
    if (stage === 0) return '🌰';
    if (stage === 1) return '🌱';
    if (stage === 2) return '🌿';
    if (stage === 3) return '🪴';
    if (stage === 4) return plant.bud;
    return plant.bloom;
  }
  function bankFor(n) {
    if (n <= 20) return BANKS.b1;
    if (n <= 50) return BANKS.b2;
    if (n <= 80) return BANKS.b3;
    return BANKS.b4;
  }
  function trapsFor(n) { return n >= 21 ? 2 : 0; }
  function hintMode(n) { // 0 = always shown, 1 = hidden until first letter, 2 = hidden until word complete
    if (n <= 50) return 0;
    if (n <= 80) return 1;
    return 2;
  }
  function tierName(n) {
    if (n <= 20) return 'Seed planter';
    if (n <= 50) return 'Garden grower';
    if (n <= 80) return 'Garden keeper';
    return 'Master gardener';
  }

  var hintEl = document.getElementById('lg-hint');
  var plantEl = document.getElementById('lg-plant');
  var plantNameEl = document.getElementById('lg-plant-name');
  var stageLabelEl = document.getElementById('lg-stage-label');
  var fxEl = document.getElementById('lg-fx');
  var slotsEl = document.getElementById('lg-slots');
  var tilesEl = document.getElementById('lg-tiles');
  var msgEl = document.getElementById('lg-msg');
  var roundEl = document.getElementById('lg-round');
  var scoreEl = document.getElementById('lg-score');
  var bestEl = document.getElementById('lg-best');
  var starsEl = document.getElementById('lg-stars');
  var doneEl = document.getElementById('lg-done');
  var doneStats = document.getElementById('lg-done-stats');
  var doneTitle = document.getElementById('lg-done-title');
  var againBtn = document.getElementById('lg-again');
  var mapEl = document.getElementById('lg-map');
  var levelNowEl = document.getElementById('lg-level-now');
  var noteEl = document.getElementById('lg-progress-note');
  var gardenEl = document.getElementById('lg-garden');
  var gardenCountEl = document.getElementById('lg-garden-count');

  var level = 1, unlocked = 1, starsMap = {};
  try {
    level = parseInt(localStorage.getItem('wa_lg_current') || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem('wa_lg_unlocked') || '1', 10) || 1;
    starsMap = JSON.parse(localStorage.getItem('wa_lg_stars') || '{}') || {};
  } catch (e) {}
  if (level < 1) level = 1;
  if (level > MAX_LEVEL) level = MAX_LEVEL;
  if (unlocked < 1) unlocked = 1;
  if (unlocked > MAX_LEVEL) unlocked = MAX_LEVEL;
  if (level > unlocked) level = unlocked;

  var queue = [], round = 0, score = 0, locked = false;
  var currentItem = null, placed = 0, wordMistake = false, stage = 0, hintShown = true;

  function save() {
    try {
      localStorage.setItem('wa_lg_current', String(level));
      localStorage.setItem('wa_lg_unlocked', String(unlocked));
      localStorage.setItem('wa_lg_stars', JSON.stringify(starsMap));
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

  function buildMap() {
    mapEl.innerHTML = '';
    for (var n = 1; n <= MAX_LEVEL; n++) {
      (function (n) {
        var b = document.createElement('button');
        b.type = 'button';
        var st = starsMap[n] || 0;
        b.className = 'lg-lvl' + (n === level ? ' lg-cur' : '') + (st > 0 ? ' lg-done' : '');
        b.textContent = st > 0 ? n + ' ⭐' : String(n);
        b.title = 'Level ' + n + ' — ' + tierName(n) + ' · ' + plantFor(n).name + (st > 0 ? ' · best ' + st + '/6 stars' : '');
        if (n > unlocked) { b.disabled = true; b.classList.add('lg-lock'); b.textContent = '🔒'; b.title = 'Level ' + n + ' — finish level ' + (n - 1) + ' to unlock'; }
        b.addEventListener('click', function () { if (n <= unlocked && n !== level) { level = n; save(); start(); } });
        mapEl.appendChild(b);
      })(n);
    }
    levelNowEl.textContent = level;
    noteEl.textContent = tierName(level) + ' · ' + Object.keys(starsMap).length + ' of 100 levels completed';
  }
  function buildGarden() {
    var done = Object.keys(starsMap).map(Number).sort(function (a, b) { return a - b; });
    gardenEl.innerHTML = '';
    if (!done.length) {
      var s = document.createElement('span');
      s.className = 'lg-garden-empty';
      s.textContent = 'Your garden is waiting for its first plant… 🌱';
      gardenEl.appendChild(s);
    } else {
      done.forEach(function (n) {
        var s = document.createElement('span');
        s.className = 'lg-garden-plant';
        s.textContent = plantFor(n).bloom;
        s.title = 'Level ' + n + ' — ' + plantFor(n).name;
        gardenEl.appendChild(s);
      });
    }
    gardenCountEl.textContent = done.length + ' of 100 plants grown';
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
  function drawPlant(animate) {
    var plant = plantFor(level);
    plantEl.textContent = stageEmoji(plant, stage);
    plantEl.style.fontSize = STAGE_SIZES[stage] + 'rem';
    plantNameEl.textContent = plant.name;
    stageLabelEl.textContent = 'Stage: ' + STAGE_NAMES[stage];
    if (animate) {
      plantEl.classList.remove('lg-grow');
      void plantEl.offsetWidth;
      plantEl.classList.add('lg-grow');
    }
  }
  function spawnFx(symbol) {
    if (!fxEl) return;
    var d = document.createElement('span');
    d.className = 'lg-fx-drop';
    d.textContent = symbol;
    d.style.left = (30 + Math.random() * 40) + '%';
    fxEl.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 950);
  }
  function drawHint() {
    var mode = hintMode(level);
    hintShown = mode === 0 || (mode === 1 && placed > 0);
    if (mode === 2) hintShown = false;
    hintEl.textContent = hintShown ? currentItem.emoji : '❓';
  }

  function nextRound() {
    locked = false; wordMistake = false; placed = 0;
    currentItem = queue[round];
    roundEl.textContent = (round + 1) + ' / ' + WORDS_PER_LEVEL;
    drawHint();

    slotsEl.innerHTML = '';
    currentItem.word.split('').forEach(function () {
      var t = document.createElement('div');
      t.className = 'lg-tile lg-blank';
      t.textContent = '·';
      slotsEl.appendChild(t);
    });

    var letters = currentItem.word.split('');
    var traps = trapsFor(level);
    for (var i = 0; i < traps; i++) {
      letters.push(ALPHABET.charAt(Math.floor(Math.random() * 26)));
    }
    var shuffled = shuffle(letters);
    if (traps === 0 && shuffled.join('') === currentItem.word && currentItem.word.length > 1) {
      shuffled = shuffle(letters);
    }
    tilesEl.innerHTML = '';
    shuffled.forEach(function (letter) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lg-choice';
      b.textContent = letter;
      b.setAttribute('data-letter', letter);
      b.addEventListener('click', function () { tapTile(b, letter); });
      tilesEl.appendChild(b);
    });
    msgEl.textContent = hintMode(level) === 2
      ? 'Mystery word! Tap the letters in order — the picture is your reward.'
      : 'Tap the letters in order to build the word.';
  }

  function tapTile(btn, letter) {
    if (locked || btn.disabled) return;
    var want = currentItem.word.charAt(placed);
    if (letter === want) {
      btn.disabled = true;
      btn.classList.add('lg-used');
      var slot = slotsEl.children[placed];
      slot.textContent = letter;
      slot.classList.remove('lg-blank');
      slot.classList.add('lg-filled');
      placed++;
      spawnFx(placed % 2 ? '💧' : '☀️');
      if (hintMode(level) === 1 && placed === 1) drawHint();
      if (placed >= currentItem.word.length) completeWord();
      else msgEl.textContent = 'Good! What letter comes next?';
    } else {
      wordMistake = true;
      btn.classList.add('lg-wrong');
      msgEl.textContent = 'Not that letter — no problem, look at the word and try again.';
      setTimeout(function () { btn.classList.remove('lg-wrong'); }, 350);
    }
  }

  function completeWord() {
    locked = true;
    tilesEl.querySelectorAll('.lg-choice').forEach(function (x) { x.disabled = true; });
    if (!wordMistake) { score++; scoreEl.textContent = score; drawStars(); }
    if (hintMode(level) === 2) { hintEl.textContent = currentItem.emoji; hintShown = true; }
    // words 1-5 advance stages 1-5; word 6 celebrates the full bloom
    stage = Math.min(5, round + 1);
    drawPlant(true);
    spawnFx('✨'); spawnFx('💧'); spawnFx('☀️');
    msgEl.textContent = 'You grew it — ' + currentItem.word + '!' + (wordMistake ? '' : ' ⭐ First try!') +
      (round + 1 >= WORDS_PER_LEVEL ? ' Your ' + plantFor(level).name + ' is fully grown!' : ' Your plant grew!');
    setTimeout(function () {
      round++;
      if (round >= WORDS_PER_LEVEL) finish(); else nextRound();
    }, 1300);
  }

  function finish() {
    var prev = starsMap[level] || 0;
    if (score > prev) starsMap[level] = score;
    var wasLast = level >= MAX_LEVEL;
    if (!wasLast && level + 1 > unlocked) unlocked = level + 1;
    save();
    showBest();
    buildMap();
    buildGarden();
    if (wasLast) {
      doneTitle.textContent = '🌟 The Golden Tree is yours!';
      doneStats.textContent = 'You earned ' + score + ' of ' + WORDS_PER_LEVEL + ' stars on Level 100 and grew all 100 plants — finishing with the one-and-only Golden Tree 🌟🌳. Small steps every day made a whole garden grow. You are a Master Gardener!';
    } else {
      doneTitle.textContent = '🎉 Level ' + level + ' Complete — ' + plantFor(level).name + ' grown!';
      doneStats.textContent = 'You earned ' + score + ' of ' + WORDS_PER_LEVEL + ' stars on Level ' + level + ' (' + tierName(level) + '). Your ' + plantFor(level).name +
        ' joined your garden. Level ' + (level + 1) + ' is unlocked.' + (score === WORDS_PER_LEVEL ? ' Perfect level!' : ' Replay any level to earn more stars.');
    }
    againBtn.textContent = wasLast ? 'Play again' : 'Next level →';
    doneEl.classList.remove('hidden');
  }

  function start() {
    queue = shuffle(bankFor(level)).slice(0, WORDS_PER_LEVEL);
    round = 0; score = 0; stage = 0;
    scoreEl.textContent = '0';
    doneEl.classList.add('hidden');
    buildMap();
    buildGarden();
    drawStars();
    showBest();
    drawPlant(false);
    nextRound();
  }

  document.getElementById('lg-restart').addEventListener('click', start);
  againBtn.addEventListener('click', function () {
    if (level < MAX_LEVEL) { level = level + 1; save(); }
    start();
  });

  window.__lg = {
    state: function () {
      return { level: level, unlocked: unlocked, round: round + 1, score: score, placed: placed, stage: stage, stars: JSON.parse(JSON.stringify(starsMap)) };
    },
    setLevel: function (n) {
      n = Math.max(1, Math.min(MAX_LEVEL, parseInt(n, 10) || 1));
      level = n;
      if (n > unlocked) unlocked = n;
      save();
      start();
    },
    start: start,
    tap: function (letter) {
      var btns = tilesEl.querySelectorAll('.lg-choice');
      for (var i = 0; i < btns.length; i++) {
        if (!btns[i].disabled && btns[i].getAttribute('data-letter') === letter) { tapTile(btns[i], letter); return true; }
      }
      return false;
    },
    placeNext: function () {
      if (!currentItem || locked) return false;
      return window.__lg.tap(currentItem.word.charAt(placed));
    },
    word: function () { return currentItem ? currentItem.word : null; },
    stage: function () { return stage; }
  };

  start();
})();
