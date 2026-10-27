// Wisely Arcade — Missing Letters v3 (100 levels — words grow longer, blanks grow bolder)
(function () {
  'use strict';

  var MAX_LEVEL = 100;
  var WORDS_PER_LEVEL = 5;

  var BANKS = {
    t1: [
      { word: 'CAT', emoji: '🐱' }, { word: 'DOG', emoji: '🐶' }, { word: 'PIG', emoji: '🐷' },
      { word: 'COW', emoji: '🐮' }, { word: 'EGG', emoji: '🥚' }, { word: 'BUS', emoji: '🚌' },
      { word: 'SUN', emoji: '🌞' }, { word: 'HEN', emoji: '🐔' }, { word: 'BEE', emoji: '🐝' },
      { word: 'ANT', emoji: '🐜' }, { word: 'FOX', emoji: '🦊' }, { word: 'BAT', emoji: '🦇' }
    ],
    t2: [
      { word: 'CAT', emoji: '🐱' }, { word: 'DOG', emoji: '🐶' }, { word: 'PIG', emoji: '🐷' },
      { word: 'COW', emoji: '🐮' }, { word: 'EGG', emoji: '🥚' }, { word: 'BUS', emoji: '🚌' },
      { word: 'SUN', emoji: '🌞' }, { word: 'FISH', emoji: '🐟' }, { word: 'BIRD', emoji: '🐦' },
      { word: 'DUCK', emoji: '🦆' }, { word: 'FROG', emoji: '🐸' }, { word: 'LION', emoji: '🦁' },
      { word: 'BEAR', emoji: '🐻' }, { word: 'CAKE', emoji: '🎂' }, { word: 'BOOK', emoji: '📕' },
      { word: 'TREE', emoji: '🌳' }, { word: 'MILK', emoji: '🥛' }, { word: 'BALL', emoji: '⚽' },
      { word: 'BOAT', emoji: '⛵' }, { word: 'STAR', emoji: '⭐' }, { word: 'MOON', emoji: '🌙' },
      { word: 'APPLE', emoji: '🍎' }, { word: 'CRAB', emoji: '🦀' }, { word: 'CORN', emoji: '🌽' }
    ],
    t3: [
      { word: 'PLANET', emoji: '🪐' }, { word: 'ROCKET', emoji: '🚀' }, { word: 'SCHOOL', emoji: '🏫' },
      { word: 'PENCIL', emoji: '✏️' }, { word: 'ORANGE', emoji: '🍊' }, { word: 'BANANA', emoji: '🍌' },
      { word: 'GARDEN', emoji: '🌻' }, { word: 'CASTLE', emoji: '🏰' }, { word: 'BRIDGE', emoji: '🌉' },
      { word: 'KITTEN', emoji: '🐱' }, { word: 'PUPPY', emoji: '🐶' }, { word: 'RABBIT', emoji: '🐰' },
      { word: 'TURTLE', emoji: '🐢' }, { word: 'DOLPHIN', emoji: '🐬' }, { word: 'POPCORN', emoji: '🍿' },
      { word: 'CUPCAKE', emoji: '🧁' }, { word: 'RAINBOW', emoji: '🌈' }, { word: 'VOLCANO', emoji: '🌋' },
      { word: 'DIAMOND', emoji: '💎' }, { word: 'FRIEND', emoji: '👫' }
    ],
    t4: [
      { word: 'FREEDOM', emoji: '🕊️' }, { word: 'BALANCE', emoji: '⚖️' }, { word: 'PATIENCE', emoji: '⏳' },
      { word: 'WISDOM', emoji: '🦉' }, { word: 'HARVEST', emoji: '🌾' }, { word: 'FORTUNE', emoji: '🍀' },
      { word: 'LANTERN', emoji: '🏮' }, { word: 'COMPASS', emoji: '🧭' }, { word: 'PYRAMID', emoji: '🔺' },
      { word: 'GLACIER', emoji: '🧊' }, { word: 'DESERT', emoji: '🏜️' }, { word: 'COURAGE', emoji: '🦁' },
      { word: 'JOURNEY', emoji: '🧳' }, { word: 'SILENCE', emoji: '🤫' }, { word: 'VICTORY', emoji: '🏆' },
      { word: 'JUSTICE', emoji: '⚖️' }, { word: 'HONESTY', emoji: '👐' }, { word: 'TRUST', emoji: '🤝' }
    ],
    t5: [
      { word: 'PERSEVERANCE', emoji: '🏆' }, { word: 'GRATITUDE', emoji: '🙏' },
      { word: 'DISCIPLINE', emoji: '🎯' }, { word: 'CONFIDENCE', emoji: '💪' },
      { word: 'LEADERSHIP', emoji: '👑' }, { word: 'CREATIVITY', emoji: '🎨' },
      { word: 'KNOWLEDGE', emoji: '📚' }, { word: 'ADVENTURE', emoji: '🗺️' },
      { word: 'BUTTERFLY', emoji: '🦋' }, { word: 'STRAWBERRY', emoji: '🍓' },
      { word: 'PINEAPPLE', emoji: '🍍' }, { word: 'HELICOPTER', emoji: '🚁' },
      { word: 'CROCODILE', emoji: '🐊' }
    ]
  };
  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  var emojiEl = document.getElementById('ml-emoji');
  var wordEl = document.getElementById('ml-word');
  var choicesEl = document.getElementById('ml-choices');
  var msgEl = document.getElementById('ml-msg');
  var roundEl = document.getElementById('ml-round');
  var scoreEl = document.getElementById('ml-score');
  var bestEl = document.getElementById('ml-best');
  var starsEl = document.getElementById('ml-stars');
  var doneEl = document.getElementById('ml-done');
  var doneStats = document.getElementById('ml-done-stats');
  var doneTitle = document.getElementById('ml-done-title');
  var againBtn = document.getElementById('ml-again');
  var mapEl = document.getElementById('ml-map');
  var levelNowEl = document.getElementById('ml-level-now');
  var noteEl = document.getElementById('ml-progress-note');

  var level = 1, unlocked = 1, starsMap = {};
  try {
    level = parseInt(localStorage.getItem('wa_ml_current') || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem('wa_ml_unlocked') || '1', 10) || 1;
    starsMap = JSON.parse(localStorage.getItem('wa_ml_stars') || '{}') || {};
  } catch (e) {}
  if (level < 1) level = 1;
  if (level > MAX_LEVEL) level = MAX_LEVEL;
  if (unlocked < 1) unlocked = 1;
  if (unlocked > MAX_LEVEL) unlocked = MAX_LEVEL;
  if (level > unlocked) level = unlocked;

  var queue = [], round = 0, score = 0, locked = false;
  var blanks = [], blankIdx = 0, wordMistake = false, currentItem = null;

  function save() {
    try {
      localStorage.setItem('wa_ml_current', String(level));
      localStorage.setItem('wa_ml_unlocked', String(unlocked));
      localStorage.setItem('wa_ml_stars', JSON.stringify(starsMap));
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
    if (n <= 10) return 'First letters';
    if (n <= 25) return 'Word explorer';
    if (n <= 45) return 'Word climber';
    if (n <= 65) return 'Word thinker';
    if (n <= 80) return 'Word master';
    return 'Word wizard';
  }
  function bankFor(n) {
    if (n <= 10) return BANKS.t1;
    if (n <= 25) return BANKS.t2;
    if (n <= 45) return BANKS.t3;
    if (n <= 65) return BANKS.t4;
    if (n <= 80) return BANKS.t4.concat(BANKS.t5);
    return BANKS.t5;
  }
  function blanksFor(n) { return n >= 66 ? 2 : 1; }
  function choicesFor(n) { return n >= 26 ? 4 : 3; }

  function buildMap() {
    mapEl.innerHTML = '';
    for (var n = 1; n <= MAX_LEVEL; n++) {
      (function (n) {
        var b = document.createElement('button');
        b.type = 'button';
        var st = starsMap[n] || 0;
        b.className = 'ml-lvl' + (n === level ? ' ml-cur' : '') + (st > 0 ? ' ml-done' : '');
        b.textContent = st > 0 ? n + ' ⭐' : String(n);
        b.title = 'Level ' + n + ' — ' + tierName(n) + (st > 0 ? ' · best ' + st + '/5 stars' : '');
        if (n > unlocked) { b.disabled = true; b.classList.add('ml-lock'); b.textContent = '🔒'; b.title = 'Level ' + n + ' — finish level ' + (n - 1) + ' to unlock'; }
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
    bestEl.textContent = b > 0 ? b + ' / 5 ⭐' : '—';
  }
  function drawStars() {
    var s = '';
    for (var i = 0; i < WORDS_PER_LEVEL; i++) s += i < score ? '⭐' : '☆';
    starsEl.textContent = s;
  }

  function nextRound() {
    locked = false; wordMistake = false; blankIdx = 0;
    currentItem = queue[round];
    var item = currentItem;
    var nb = blanksFor(level);
    roundEl.textContent = (round + 1) + ' / ' + WORDS_PER_LEVEL;
    emojiEl.textContent = item.emoji;

    var positions = shuffle(item.word.split('').map(function (_, i) { return i; })).slice(0, nb).sort();
    blanks = positions.map(function (pos) { return { pos: pos, letter: item.word.charAt(pos), tile: null }; });

    wordEl.innerHTML = '';
    item.word.split('').forEach(function (ch, i) {
      var t = document.createElement('div');
      var bi = positions.indexOf(i);
      if (bi !== -1) {
        t.className = 'ml-tile ml-blank';
        t.textContent = '?';
        blanks[bi].tile = t;
      } else {
        t.className = 'ml-tile';
        t.textContent = ch;
      }
      wordEl.appendChild(t);
    });
    renderChoices();
    msgEl.textContent = nb > 1 ? 'Two letters ran away! Find the first one.' : 'Which letter is missing?';
  }

  function renderChoices() {
    var answer = blanks[blankIdx].letter;
    var count = choicesFor(level);
    var picks = [answer];
    while (picks.length < count) {
      var c = ALPHABET.charAt(Math.floor(Math.random() * 26));
      if (picks.indexOf(c) === -1) picks.push(c);
    }
    choicesEl.innerHTML = '';
    shuffle(picks).forEach(function (letter) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ml-choice';
      b.textContent = letter;
      b.addEventListener('click', function () { choose(b, letter); });
      choicesEl.appendChild(b);
    });
  }

  function choose(btn, letter) {
    if (locked) return;
    var target = blanks[blankIdx];
    if (letter === target.letter) {
      target.tile.textContent = letter;
      target.tile.classList.remove('ml-blank');
      target.tile.classList.add('ml-filled');
      blankIdx++;
      if (blankIdx < blanks.length) {
        msgEl.textContent = 'Yes! Now the second letter.';
        renderChoices();
        return;
      }
      locked = true;
      choicesEl.querySelectorAll('.ml-choice').forEach(function (x) { x.disabled = true; });
      btn.classList.add('ml-right');
      if (!wordMistake) { score++; scoreEl.textContent = score; drawStars(); }
      msgEl.textContent = 'You found it — ' + currentItem.word + '!' + (wordMistake ? '' : ' ⭐ First try!');
      setTimeout(function () {
        round++;
        if (round >= WORDS_PER_LEVEL) finish(); else nextRound();
      }, 1100);
    } else {
      wordMistake = true;
      btn.classList.add('ml-wrong');
      btn.disabled = true;
      msgEl.textContent = 'Not that one — look at the picture and try again.';
      setTimeout(function () { btn.classList.remove('ml-wrong'); }, 350);
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
    if (doneTitle) doneTitle.textContent = wasLast ? '👑 Level 100 — Word Wizard Supreme!' : '🎉 Level ' + level + ' Complete!';
    doneStats.textContent = 'You earned ' + score + ' of ' + WORDS_PER_LEVEL + ' stars on Level ' + level + ' (' + tierName(level) + '). ' +
      (wasLast ? 'You climbed all 100 levels — every word found!'
        : score === WORDS_PER_LEVEL ? 'Perfect level! Level ' + (level + 1) + ' is unlocked.'
        : 'Level complete — Level ' + (level + 1) + ' is unlocked. Replay any level to earn more stars.');
    againBtn.textContent = wasLast ? 'Play again' : 'Next level →';
    doneEl.classList.remove('hidden');
  }

  function start() {
    queue = shuffle(bankFor(level)).slice(0, WORDS_PER_LEVEL);
    round = 0; score = 0;
    scoreEl.textContent = '0';
    doneEl.classList.add('hidden');
    buildMap();
    drawStars();
    showBest();
    nextRound();
  }

  document.getElementById('ml-restart').addEventListener('click', start);
  againBtn.addEventListener('click', function () {
    if (level < MAX_LEVEL) { level = level + 1; save(); }
    start();
  });
  start();
})();
