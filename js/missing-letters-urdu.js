// Wisely Arcade — Missing Letters URDU edition (100 levels). Cloned from the English engine; Urdu word banks, Urdu UI, separate progress (wa_mlu_*).
(function () {
  'use strict';

  var MAX_LEVEL = 100;
  var WORDS_PER_LEVEL = 5;

  var BANKS = {
    t1: [
      { word: 'بلی', emoji: '🐱' }, { word: 'کتا', emoji: '🐶' }, { word: 'سیب', emoji: '🍎' },
      { word: 'گھر', emoji: '🏠' }, { word: 'بطخ', emoji: '🦆' }, { word: 'شیر', emoji: '🦁' },
      { word: 'ناک', emoji: '👃' }, { word: 'قلم', emoji: '🖊️' }, { word: 'میز', emoji: '🪑' },
      { word: 'رنگ', emoji: '🎨' }, { word: 'خوش', emoji: '😊' }, { word: 'برف', emoji: '❄️' },
      { word: 'رات', emoji: '🌙' }, { word: 'آم', emoji: '🥭' }, { word: 'آگ', emoji: '🔥' },
      { word: 'دن', emoji: '🌞' }
    ],
    t2: [
      { word: 'کیلا', emoji: '🍌' }, { word: 'کتاب', emoji: '📖' }, { word: 'چاند', emoji: '🌙' },
      { word: 'پھول', emoji: '🌸' }, { word: 'دودھ', emoji: '🥛' }, { word: 'روٹی', emoji: '🍞' },
      { word: 'گاڑی', emoji: '🚗' }, { word: 'انڈا', emoji: '🥚' }, { word: 'گیند', emoji: '⚽' },
      { word: 'سورج', emoji: '☀️' }, { word: 'چڑیا', emoji: '🐦' }, { word: 'تتلی', emoji: '🦋' },
      { word: 'مکھی', emoji: '🐝' }, { word: 'بندر', emoji: '🐵' }, { word: 'اونٹ', emoji: '🐪' },
      { word: 'بکری', emoji: '🐐' }, { word: 'گائے', emoji: '🐮' }, { word: 'مرغی', emoji: '🐔' },
      { word: 'طوطا', emoji: '🦜' }, { word: 'آنکھ', emoji: '👁️' }, { word: 'ہاتھ', emoji: '✋' },
      { word: 'پانی', emoji: '💧' }, { word: 'سکول', emoji: '🏫' }, { word: 'کرسی', emoji: '🪑' },
      { word: 'بادل', emoji: '☁️' }, { word: 'بارش', emoji: '🌧️' }, { word: 'درخت', emoji: '🌳' },
      { word: 'پہاڑ', emoji: '⛰️' }, { word: 'دریا', emoji: '🌊' }, { word: 'زمین', emoji: '🌍' },
      { word: 'دوست', emoji: '👫' }, { word: 'کھیل', emoji: '🎮' }, { word: 'گانا', emoji: '🎵' },
      { word: 'اچھا', emoji: '👍' }
    ],
    t3: [
      { word: 'ستارہ', emoji: '⭐' }, { word: 'گھوڑا', emoji: '🐴' }, { word: 'ہاتھی', emoji: '🐘' },
      { word: 'انگور', emoji: '🍇' }, { word: 'مچھلی', emoji: '🐟' }, { word: 'خرگوش', emoji: '🐰' },
      { word: 'کبوتر', emoji: '🕊️' }, { word: 'کھڑکی', emoji: '🪟' }, { word: 'سمندر', emoji: '🌊' },
      { word: 'آسمان', emoji: '🌌' }, { word: 'استاد', emoji: '👩‍🏫' }, { word: 'کہانی', emoji: '📖' },
      { word: 'تصویر', emoji: '🖼️' }
    ],
    t4: [
      { word: 'دروازہ', emoji: '🚪' }, { word: 'سائیکل', emoji: '🚲' }, { word: 'موبائل', emoji: '📱' },
      { word: 'ستارہ', emoji: '⭐' }, { word: 'گھوڑا', emoji: '🐴' }, { word: 'ہاتھی', emoji: '🐘' },
      { word: 'انگور', emoji: '🍇' }, { word: 'مچھلی', emoji: '🐟' }, { word: 'خرگوش', emoji: '🐰' },
      { word: 'کبوتر', emoji: '🕊️' }, { word: 'کھڑکی', emoji: '🪟' }, { word: 'سمندر', emoji: '🌊' },
      { word: 'آسمان', emoji: '🌌' }, { word: 'استاد', emoji: '👩‍🏫' }, { word: 'کہانی', emoji: '📖' },
      { word: 'تصویر', emoji: '🖼️' }
    ],
    t5: [
      { word: 'کمپیوٹر', emoji: '💻' }, { word: 'ٹیلیفون', emoji: '☎️' }, { word: 'دروازہ', emoji: '🚪' },
      { word: 'سائیکل', emoji: '🚲' }, { word: 'موبائل', emoji: '📱' }, { word: 'مچھلی', emoji: '🐟' },
      { word: 'خرگوش', emoji: '🐰' }, { word: 'سمندر', emoji: '🌊' }, { word: 'کہانی', emoji: '📖' }
    ]
  };
  var ALPHABET = 'ابپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنوہھءیے';

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
    level = parseInt(localStorage.getItem('wa_mlu_current') || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem('wa_mlu_unlocked') || '1', 10) || 1;
    starsMap = JSON.parse(localStorage.getItem('wa_mlu_stars') || '{}') || {};
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
      localStorage.setItem('wa_mlu_current', String(level));
      localStorage.setItem('wa_mlu_unlocked', String(unlocked));
      localStorage.setItem('wa_mlu_stars', JSON.stringify(starsMap));
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
    if (n <= 10) return 'پہلے حروف';
    if (n <= 25) return 'لفظ کھوجی';
    if (n <= 45) return 'لفظ سوار';
    if (n <= 65) return 'لفظ مفکر';
    if (n <= 80) return 'لفظ ماہر';
    return 'لفظ جادوگر';
  }
  function bankFor(n) {
    if (n <= 10) return BANKS.t1;
    if (n <= 25) return BANKS.t2;
    if (n <= 45) return BANKS.t3;
    if (n <= 60) return BANKS.t4;                    // was <= 65
    if (n <= 80) return BANKS.t4.concat(BANKS.t5);
    return BANKS.t5;
  }
  function blanksFor(n) { return n >= 81 ? 3 : n >= 46 ? 2 : 1; }   // 2 blanks from L46 (was L66); 3 at L81
  function choicesFor(n) { return n >= 66 ? 5 : n >= 26 ? 4 : 3; }   // 5 choices from L66

  function buildMap() {
    mapEl.innerHTML = '';
    for (var n = 1; n <= MAX_LEVEL; n++) {
      (function (n) {
        var b = document.createElement('button');
        b.type = 'button';
        var st = starsMap[n] || 0;
        b.className = 'ml-lvl' + (n === level ? ' ml-cur' : '') + (st > 0 ? ' ml-done' : '');
        b.textContent = st > 0 ? n + ' ⭐' : String(n);
        b.title = 'درجہ ' + n + ' — ' + tierName(n) + (st > 0 ? ' · بہترین ' + st + '/5 ستارے' : '');
        if (n > unlocked) { b.disabled = true; b.classList.add('ml-lock'); b.textContent = '🔒'; b.title = 'درجہ ' + n + ' — کھولنے کے لیے درجہ ' + (n - 1) + ' مکمل کریں'; }
        b.addEventListener('click', function () { if (n <= unlocked && n !== level) { level = n; save(); start(); } });
        mapEl.appendChild(b);
      })(n);
    }
    levelNowEl.textContent = level;
    var doneCount = Object.keys(starsMap).length;
    noteEl.textContent = tierName(level) + ' · 100 میں سے ' + doneCount + ' درجے مکمل';
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
    msgEl.textContent = nb > 1 ? nb + ' حروف بھاگ گئے! پہلا حرف ڈھونڈیں۔' : 'کون سا حرف غائب ہے؟';
  }

  function renderChoices() {
    var answer = blanks[blankIdx].letter;
    var count = choicesFor(level);
    var picks = [answer];
    while (picks.length < count) {
      var c = ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
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
        msgEl.textContent = 'شاباش! اب اگلا حرف۔';
        renderChoices();
        return;
      }
      locked = true;
      choicesEl.querySelectorAll('.ml-choice').forEach(function (x) { x.disabled = true; });
      btn.classList.add('ml-right');
      if (!wordMistake) { score++; scoreEl.textContent = score; drawStars(); }
      msgEl.textContent = 'مل گیا — ' + currentItem.word + '!' + (wordMistake ? '' : ' ⭐ پہلی کوشش میں!');
      setTimeout(function () {
        round++;
        if (round >= WORDS_PER_LEVEL) finish(); else nextRound();
      }, 1100);
    } else {
      wordMistake = true;
      btn.classList.add('ml-wrong');
      btn.disabled = true;
      msgEl.textContent = 'یہ نہیں — تصویر دیکھ کر دوبارہ کوشش کریں۔';
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
    if (doneTitle) doneTitle.textContent = wasLast ? '👑 درجہ 100 — لفظ جادوگر اعلیٰ!' : '🎉 درجہ ' + level + ' مکمل!';
    doneStats.textContent = 'آپ نے درجہ ' + level + ' پر ' + WORDS_PER_LEVEL + ' میں سے ' + score + ' ستارے حاصل کیے (' + tierName(level) + ')۔ ' +
      (wasLast ? 'آپ نے تمام 100 درجے چڑھ لیے — ہر لفظ مل گیا!'
        : score === WORDS_PER_LEVEL ? 'کامل درجہ! درجہ ' + (level + 1) + ' کھل گیا ہے۔'
        : 'درجہ مکمل — درجہ ' + (level + 1) + ' کھل گیا ہے۔ مزید ستاروں کے لیے کوئی بھی درجہ دوبارہ کھیلیں۔');
    againBtn.textContent = wasLast ? 'دوبارہ کھیلیں' : 'اگلا درجہ ←';
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
