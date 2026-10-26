// Wisely Arcade — Missing Letters v2 (5 levels: Toddler, Kids, Teen, Adults, Expert)
(function () {
  'use strict';

  var LEVELS = {
    toddler: {
      label: 'Toddler', sub: 'ages 3–4 · 3-letter words', rounds: 5, choices: 3, blanks: 1,
      bank: [
        { word: 'CAT', emoji: '🐱' }, { word: 'DOG', emoji: '🐶' }, { word: 'PIG', emoji: '🐷' },
        { word: 'COW', emoji: '🐮' }, { word: 'EGG', emoji: '🥚' }, { word: 'BUS', emoji: '🚌' },
        { word: 'SUN', emoji: '🌞' }, { word: 'HEN', emoji: '🐔' }, { word: 'BEE', emoji: '🐝' },
        { word: 'ANT', emoji: '🐜' }, { word: 'FOX', emoji: '🦊' }, { word: 'BAT', emoji: '🦇' }
      ]
    },
    kids: {
      label: 'Kids', sub: 'ages 5–9 · first words', rounds: 10, choices: 3, blanks: 1,
      bank: [
        { word: 'CAT', emoji: '🐱' }, { word: 'DOG', emoji: '🐶' }, { word: 'PIG', emoji: '🐷' },
        { word: 'COW', emoji: '🐮' }, { word: 'EGG', emoji: '🥚' }, { word: 'BUS', emoji: '🚌' },
        { word: 'SUN', emoji: '🌞' }, { word: 'FISH', emoji: '🐟' }, { word: 'BIRD', emoji: '🐦' },
        { word: 'DUCK', emoji: '🦆' }, { word: 'FROG', emoji: '🐸' }, { word: 'LION', emoji: '🦁' },
        { word: 'BEAR', emoji: '🐻' }, { word: 'CAKE', emoji: '🎂' }, { word: 'BOOK', emoji: '📕' },
        { word: 'TREE', emoji: '🌳' }, { word: 'MILK', emoji: '🥛' }, { word: 'BALL', emoji: '⚽' },
        { word: 'BOAT', emoji: '⛵' }, { word: 'STAR', emoji: '⭐' }, { word: 'MOON', emoji: '🌙' },
        { word: 'APPLE', emoji: '🍎' }, { word: 'CRAB', emoji: '🦀' }, { word: 'CORN', emoji: '🌽' }
      ]
    },
    teen: {
      label: 'Teen', sub: 'ages 10–17 · longer words', rounds: 10, choices: 4, blanks: 1,
      bank: [
        { word: 'PLANET', emoji: '🪐' }, { word: 'ROCKET', emoji: '🚀' }, { word: 'SCHOOL', emoji: '🏫' },
        { word: 'PENCIL', emoji: '✏️' }, { word: 'ORANGE', emoji: '🍊' }, { word: 'BANANA', emoji: '🍌' },
        { word: 'GARDEN', emoji: '🌻' }, { word: 'CASTLE', emoji: '🏰' }, { word: 'BRIDGE', emoji: '🌉' },
        { word: 'KITTEN', emoji: '🐱' }, { word: 'PUPPY', emoji: '🐶' }, { word: 'RABBIT', emoji: '🐰' },
        { word: 'TURTLE', emoji: '🐢' }, { word: 'DOLPHIN', emoji: '🐬' }, { word: 'POPCORN', emoji: '🍿' },
        { word: 'CUPCAKE', emoji: '🧁' }, { word: 'RAINBOW', emoji: '🌈' }, { word: 'VOLCANO', emoji: '🌋' },
        { word: 'DIAMOND', emoji: '💎' }, { word: 'FRIEND', emoji: '👫' }
      ]
    },
    adults: {
      label: 'Adults', sub: 'words worth living by', rounds: 10, choices: 4, blanks: 1,
      bank: [
        { word: 'FREEDOM', emoji: '🕊️' }, { word: 'BALANCE', emoji: '⚖️' }, { word: 'PATIENCE', emoji: '⏳' },
        { word: 'WISDOM', emoji: '🦉' }, { word: 'HARVEST', emoji: '🌾' }, { word: 'FORTUNE', emoji: '🍀' },
        { word: 'LANTERN', emoji: '🏮' }, { word: 'COMPASS', emoji: '🧭' }, { word: 'PYRAMID', emoji: '🔺' },
        { word: 'GLACIER', emoji: '🧊' }, { word: 'DESERT', emoji: '🏜️' }, { word: 'COURAGE', emoji: '🦁' },
        { word: 'JOURNEY', emoji: '🧳' }, { word: 'SILENCE', emoji: '🤫' }, { word: 'VICTORY', emoji: '🏆' },
        { word: 'JUSTICE', emoji: '⚖️' }, { word: 'HONESTY', emoji: '👐' }, { word: 'TRUST', emoji: '🤝' }
      ]
    },
    expert: {
      label: 'Expert', sub: '2 missing letters · long words', rounds: 8, choices: 4, blanks: 2,
      bank: [
        { word: 'PERSEVERANCE', emoji: '🏆' }, { word: 'GRATITUDE', emoji: '🙏' },
        { word: 'DISCIPLINE', emoji: '🎯' }, { word: 'CONFIDENCE', emoji: '💪' },
        { word: 'LEADERSHIP', emoji: '👑' }, { word: 'CREATIVITY', emoji: '🎨' },
        { word: 'KNOWLEDGE', emoji: '📚' }, { word: 'ADVENTURE', emoji: '🗺️' },
        { word: 'BUTTERFLY', emoji: '🦋' }, { word: 'STRAWBERRY', emoji: '🍓' },
        { word: 'PINEAPPLE', emoji: '🍍' }, { word: 'HELICOPTER', emoji: '🚁' },
        { word: 'CROCODILE', emoji: '🐊' }
      ]
    }
  };
  var ORDER = ['toddler', 'kids', 'teen', 'adults', 'expert'];
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
  var levelsEl = document.getElementById('ml-levels');

  var levelKey = 'kids';
  try { levelKey = localStorage.getItem('wa_ml_level') || 'kids'; } catch (e) {}
  if (!LEVELS[levelKey]) levelKey = 'kids';
  var L = LEVELS[levelKey];

  var queue = [], round = 0, score = 0, locked = false;
  var blanks = [], blankIdx = 0, wordMistake = false, currentItem = null;

  function shuffle(a) {
    var x = a.slice();
    for (var i = x.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = x[i]; x[i] = x[j]; x[j] = t;
    }
    return x;
  }
  function bestKey() { return 'wa_ml_best_' + levelKey; }
  function loadBest() {
    try { return parseInt(localStorage.getItem(bestKey()) || '0', 10) || 0; } catch (e) { return 0; }
  }
  function saveBest(v) { try { localStorage.setItem(bestKey(), String(v)); } catch (e) {} }
  function showBest() {
    var b = loadBest();
    bestEl.textContent = b > 0 ? b + ' ⭐' : '—';
  }
  function drawStars() {
    var s = '';
    for (var i = 0; i < L.rounds; i++) s += i < score ? '⭐' : '☆';
    starsEl.textContent = s;
  }

  function buildLevelButtons() {
    levelsEl.innerHTML = '';
    ORDER.forEach(function (k) {
      var lv = LEVELS[k];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lvl-btn' + (k === levelKey ? ' lvl-sel' : '');
      b.innerHTML = lv.label + '<small>' + lv.sub + '</small>';
      b.addEventListener('click', function () {
        if (k === levelKey) return;
        levelKey = k; L = LEVELS[k];
        try { localStorage.setItem('wa_ml_level', k); } catch (e) {}
        buildLevelButtons();
        start();
      });
      levelsEl.appendChild(b);
    });
  }

  function nextRound() {
    locked = false; wordMistake = false; blankIdx = 0;
    currentItem = queue[round];
    var item = currentItem;
    roundEl.textContent = (round + 1) + ' / ' + L.rounds;
    emojiEl.textContent = item.emoji;

    var positions = shuffle(item.word.split('').map(function (_, i) { return i; })).slice(0, L.blanks).sort();
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
    msgEl.textContent = L.blanks > 1 ? 'Two letters ran away! Find the first one.' : 'Which letter is missing?';
  }

  function renderChoices() {
    var answer = blanks[blankIdx].letter;
    var picks = [answer];
    while (picks.length < L.choices) {
      var c = ALPHABET.charAt(Math.floor(Math.random() * 26));
      if (picks.indexOf(c) === -1 && currentItem.word.indexOf(c) === -1) picks.push(c);
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
    var cur = blanks[blankIdx];
    if (letter === cur.letter) {
      btn.classList.add('ml-right');
      choicesEl.querySelectorAll('.ml-choice').forEach(function (x) { x.disabled = true; });
      cur.tile.textContent = cur.letter;
      cur.tile.classList.remove('ml-blank');
      cur.tile.classList.add('ml-filled');
      blankIdx++;
      if (blankIdx < blanks.length) {
        msgEl.textContent = 'That\'s one! Now find the next missing letter.';
        setTimeout(renderChoices, 450);
        return;
      }
      locked = true;
      if (!wordMistake) { score++; scoreEl.textContent = score; drawStars(); }
      msgEl.textContent = 'Yes! ' + currentItem.word.split('').join('-') + ' spells ' + currentItem.word + '!' +
        (wordMistake ? '' : ' ⭐ First try!');
      setTimeout(function () {
        round++;
        if (round >= L.rounds) finish(); else nextRound();
      }, 1300);
    } else {
      wordMistake = true;
      btn.classList.add('ml-wrong');
      btn.disabled = true;
      msgEl.textContent = 'Good try! That letter doesn\'t fit. Look at the picture and try again.';
      setTimeout(function () { btn.classList.remove('ml-wrong'); }, 350);
    }
  }

  function finish() {
    var b = loadBest();
    if (score > b) { saveBest(score); }
    showBest();
    doneStats.textContent = 'You collected ' + score + ' of ' + L.rounds + ' stars on ' + L.label + '. ' +
      (score === L.rounds ? 'Perfect — every word on the first try!'
        : score >= L.rounds * 0.7 ? 'Wonderful reading!'
        : score >= L.rounds * 0.4 ? 'Good job — keep practising, one letter at a time!'
        : 'Good trying! Every try makes you a stronger reader.');
    doneEl.classList.remove('hidden');
  }

  function start() {
    queue = shuffle(L.bank).slice(0, L.rounds);
    round = 0; score = 0;
    scoreEl.textContent = '0';
    doneEl.classList.add('hidden');
    drawStars();
    showBest();
    nextRound();
  }

  document.getElementById('ml-restart').addEventListener('click', start);
  document.getElementById('ml-again').addEventListener('click', start);
  buildLevelButtons();
  start();
})();
