// Wisely Arcade — IQ Quest v2 (100 levels — the higher you climb, the tougher it gets)
(function () {
  'use strict';

  var MAX_LEVEL = 100;
  var PUZZLES_PER_LEVEL = 5;

  var visualEl = document.getElementById('iq-visual');
  var promptEl = document.getElementById('iq-prompt');
  var kindEl = document.getElementById('iq-kind');
  var choicesEl = document.getElementById('iq-choices');
  var msgEl = document.getElementById('iq-msg');
  var whyEl = document.getElementById('iq-why');
  var roundEl = document.getElementById('iq-round');
  var scoreEl = document.getElementById('iq-score');
  var bestEl = document.getElementById('iq-best');
  var starsEl = document.getElementById('iq-stars');
  var doneEl = document.getElementById('iq-done');
  var doneStats = document.getElementById('iq-done-stats');
  var doneTitle = document.getElementById('iq-done-title');
  var againBtn = document.getElementById('iq-again');
  var mapEl = document.getElementById('iq-map');
  var levelNowEl = document.getElementById('iq-level-now');
  var noteEl = document.getElementById('iq-progress-note');

  var level = 1, unlocked = 1, starsMap = {};
  try {
    level = parseInt(localStorage.getItem('wa_iq_current') || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem('wa_iq_unlocked') || '1', 10) || 1;
    starsMap = JSON.parse(localStorage.getItem('wa_iq_stars') || '{}') || {};
  } catch (e) {}
  if (level < 1) level = 1;
  if (level > MAX_LEVEL) level = MAX_LEVEL;
  if (unlocked < 1) unlocked = 1;
  if (unlocked > MAX_LEVEL) unlocked = MAX_LEVEL;
  if (level > unlocked) level = unlocked;

  var choicesCount = 3; // 3 on low levels, 4 from level 21 up
  var round = 0, score = 0, locked = false, qMistake = false;
  var usedRiddles = {}, usedAnalogies = {}, usedOdd = {};

  function save() {
    try {
      localStorage.setItem('wa_iq_current', String(level));
      localStorage.setItem('wa_iq_unlocked', String(unlocked));
      localStorage.setItem('wa_iq_stars', JSON.stringify(starsMap));
    } catch (e) {}
  }
  function ri(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function shuffle(a) { return a.slice().sort(function () { return Math.random() - 0.5; }); }
  function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }

  function tierName(n) {
    if (n <= 10) return 'Warm-up';
    if (n <= 20) return 'Getting going';
    if (n <= 35) return 'Thinker';
    if (n <= 50) return 'Sharp mind';
    if (n <= 65) return 'Puzzle solver';
    if (n <= 80) return 'Brain athlete';
    return 'Mastermind';
  }

  // ---------- puzzle builders (difficulty scales with level n) ----------

  var PAT_SETS = [['🍎','🍌'],['🚗','🚌'],['⭐','🌙'],['🐶','🐱'],['🔴','🔵'],['⚽','🏀'],['🍓','🍇'],['🦁','🐯'],['✈️','🚀']];
  function emojiPattern(n) {
    var set = pickOne(PAT_SETS);
    var A = set[0], B = set[1];
    var seq, ans, why;
    var mode;
    if (n < 20) mode = ri(0, 1);
    else if (n < 70) mode = ri(0, 2);
    else mode = ri(0, 3);
    if (mode === 0) { seq = [A, B, A, B, A]; ans = B; why = 'The pattern swaps ' + A + ' ' + B + ' ' + A + ' ' + B + ' — so ' + B + ' comes next.'; }
    else if (mode === 1) { seq = [A, A, B, A, A]; ans = B; why = 'Two ' + A + ', then one ' + B + ', repeating — so ' + B + ' comes next.'; }
    else if (mode === 2) { var C = pickOne(['🎈','🔔','🍀','🐠','🎁'].filter(function (x) { return x !== A && x !== B; }));
      seq = [A, B, C, A, B]; ans = C; why = 'The pattern is ' + A + ' ' + B + ' ' + C + ' repeating — so ' + C + ' comes next.'; }
    else { seq = [A, B, B, A, B, B]; ans = A; why = 'The pattern is ' + A + ' then two ' + B + ', repeating — so ' + A + ' starts it again.'; }
    var others = ['🎈','🔔','🍀','🐠','🎁','🧩'].filter(function (x) { return seq.indexOf(x) === -1 && x !== ans; });
    var opts = shuffle([ans, A === ans ? B : A].concat(shuffle(others).slice(0, choicesCount - 2)));
    return { kind: 'Pattern', visual: seq.join(' ') + ' <span class="iq-qmark">?</span>', prompt: 'What comes next in the pattern?', options: opts, answer: ans, why: why, style: 'emoji' };
  }

  var ODD_EMOJI = [
    { items: ['🐶','🐱','🐰'], odd: '🚗', why: 'The others are animals — the car is a vehicle.' },
    { items: ['🍎','🍌','🍇'], odd: '⚽', why: 'The others are fruits — the ball is a toy.' },
    { items: ['🚗','🚌','🚲'], odd: '🐴', why: 'The others are vehicles — the horse is an animal.' },
    { items: ['⭐','🌙','☀️'], odd: '🍎', why: 'The others shine in the sky — the apple grows on a tree.' },
    { items: ['🐠','🐙','🦀'], odd: '🦁', why: 'The others live in the sea — the lion lives on land.' },
    { items: ['🎸','🥁','🎺'], odd: '📚', why: 'The others are musical instruments — the books are for reading.' }
  ];
  var ODD_WORDS = [
    { items: ['Apple','Banana','Mango'], odd: 'Carrot', why: 'The others are fruits — a carrot is a vegetable.' },
    { items: ['Gold','Silver','Copper'], odd: 'Wood', why: 'The others are metals.' },
    { items: ['River','Lake','Ocean'], odd: 'Desert', why: 'The others are water — a desert is dry land.' },
    { items: ['Monday','Friday','Sunday'], odd: 'January', why: 'The others are days of the week — January is a month.' },
    { items: ['Square','Circle','Triangle'], odd: 'Cube', why: 'The others are flat (2D) shapes — a cube is solid (3D).' },
    { items: ['Guitar','Piano','Violin'], odd: 'Paintbrush', why: 'The others are musical instruments.' },
    { items: ['Shirt','Trousers','Jacket'], odd: 'Necklace', why: 'The others are clothes — a necklace is jewellery.' },
    { items: ['Eagle','Sparrow','Penguin'], odd: 'Bat', why: 'The others are birds — a bat is a mammal.' }
  ];
  function oddOne(words) {
    var bank = words ? ODD_WORDS : ODD_EMOJI;
    var idx = ri(0, bank.length - 1), guard = 0;
    while (usedOdd[bank[idx].odd] && guard < 12) { idx = ri(0, bank.length - 1); guard++; }
    var g = bank[idx]; usedOdd[g.odd] = 1;
    var shown = g.items.slice(0, choicesCount - 1).concat([g.odd]);
    return { kind: 'Odd One Out', visual: '', prompt: 'Which one does not belong?', options: shuffle(shown), answer: g.odd, why: g.why, style: words ? 'word' : 'emoji' };
  }

  function numSeq(n) {
    var terms = [], ans, why, step, mode;
    if (n <= 10) {
      step = pickOne([1, 2, 5, 10]);
      var start = ri(1, 12);
      for (var i = 0; i < 4; i++) terms.push(start + step * i);
      ans = start + step * 4;
      why = 'Each number grows by ' + step + ' → ' + ans + '.';
    } else if (n <= 20) {
      step = pickOne([2, 3, 4, 5, -2, -5]);
      var st = step > 0 ? ri(2, 15) : ri(20, 40);
      for (var a = 0; a < 4; a++) terms.push(st + step * a);
      ans = st + step * 4;
      why = 'Each number ' + (step > 0 ? 'grows' : 'shrinks') + ' by ' + Math.abs(step) + ' → ' + ans + '.';
    } else if (n <= 35) {
      mode = ri(0, 2);
      if (mode === 0) { step = pickOne([-9, -7, -4, 6, 7, 9, 11, 12]); var s2 = step > 0 ? ri(2, 20) : ri(60, 99);
        for (var j = 0; j < 4; j++) terms.push(s2 + step * j); ans = s2 + step * 4;
        why = 'Each number ' + (step > 0 ? 'grows' : 'shrinks') + ' by ' + Math.abs(step) + ' → ' + ans + '.'; }
      else if (mode === 1) { var s3 = ri(1, 4); for (var k = 0; k < 4; k++) terms.push(s3 * Math.pow(2, k)); ans = s3 * 16;
        why = 'Each number doubles: ×2 every step → ' + ans + '.'; }
      else { terms = [1, 4, 9, 16]; ans = 25; why = 'Square numbers: 1×1, 2×2, 3×3, 4×4 — next is 5×5 = 25.'; }
    } else if (n <= 50) {
      mode = ri(0, 2);
      if (mode === 0) { step = pickOne([13, 15, 25, -11, -13, -15]); var s4 = step > 0 ? ri(5, 40) : ri(120, 200);
        for (var m = 0; m < 4; m++) terms.push(s4 + step * m); ans = s4 + step * 4;
        why = 'Each number moves by ' + step + ' → ' + ans + '.'; }
      else if (mode === 1) { var s5 = ri(2, 5); for (var q = 0; q < 4; q++) terms.push(s5 * Math.pow(3, q)); ans = s5 * 81;
        why = 'Each number triples: ×3 every step → ' + ans + '.'; }
      else { var b = ri(3, 8); terms = [b, b + 1, b + 3, b + 6]; ans = b + 10;
        why = 'The gaps grow: +1, +2, +3, then +4 → ' + ans + '.'; }
    } else if (n <= 65) {
      mode = ri(0, 1);
      if (mode === 0) { var s6 = ri(1, 5); for (var r = 0; r < 4; r++) terms.push(r === 0 ? s6 : terms[r - 1] * 2 + 1); ans = terms[3] * 2 + 1;
        why = 'The rule is ×2 then +1 each step → ' + ans + '.'; }
      else { var s7 = ri(10, 20); terms = [s7, s7 + 5, s7 + 3, s7 + 8]; ans = s7 + 6;
        why = 'The steps alternate +5, −2, +5, then −2 again → ' + ans + '.'; }
    } else if (n <= 80) {
      mode = ri(0, 1);
      if (mode === 0) { var s8 = ri(2, 5); for (var t = 0; t < 4; t++) terms.push(t === 0 ? s8 : terms[t - 1] * 2 - 1); ans = terms[3] * 2 - 1;
        why = 'The rule is ×2 then −1 each step → ' + ans + '.'; }
      else { terms = [2, 3, 5, 7, 11]; ans = 13; why = 'Prime numbers — divisible only by 1 and themselves. Next after 11 is 13.'; }
    } else {
      mode = ri(0, 2);
      if (mode === 0) { var fa = ri(1, 3), fb = ri(2, 5); terms = [fa, fb];
        while (terms.length < 5) terms.push(terms[terms.length - 1] + terms[terms.length - 2]);
        ans = terms[4] + terms[3];
        why = 'Each number is the sum of the two before it → ' + ans + '.'; }
      else if (mode === 1) { var s9 = ri(3, 6); for (var u = 0; u < 4; u++) terms.push(u === 0 ? s9 : terms[u - 1] * 3 - 2); ans = terms[3] * 3 - 2;
        why = 'The rule is ×3 then −2 each step → ' + ans + '.'; }
      else { terms = [1, 8, 27, 64]; ans = 125; why = 'Cube numbers: 1×1×1, 2×2×2, 3×3×3, 4×4×4 — next is 5×5×5 = 125.'; }
    }
    var opts = [ans];
    var near = [1, -1, 2, -2, 5, -5, 10, -10, 3, -3, 4, -4];
    var gi = 0;
    while (opts.length < choicesCount && gi < 40) { var c = ans + near[Math.floor(Math.random() * near.length)]; if (opts.indexOf(c) === -1) opts.push(c); gi++; }
    return { kind: 'Number Sequence', visual: terms.join(' , ') + ' , ?', prompt: 'What number comes next?', options: shuffle(opts).map(String), answer: String(ans), why: why, style: 'num' };
  }

  function letterSeq() {
    var modes = [
      { terms: ['A','C','E','G'], ans: 'I', why: 'Every second letter: A, skip B, C, skip D, E… next is I.' },
      { terms: ['Z','X','V','T'], ans: 'R', why: 'Going backwards by 2 letters: Z, X, V, T… next is R.' },
      { terms: ['B','D','G','K'], ans: 'P', why: 'The skips grow: +2, +3, +4 letters — next skip is +5: K → P.' },
      { terms: ['AB','DE','GH','JK'], ans: 'MN', why: 'Each pair jumps 3 letters forward: AB → DE → GH → JK → MN.' }
    ];
    var m = pickOne(modes);
    var pool = ['A','F','H','J','L','N','Q','S','U','W','XY','LM','OP','BC'];
    var opts = shuffle([m.ans].concat(shuffle(pool.filter(function (x) { return x !== m.ans; })).slice(0, choicesCount - 1)));
    return { kind: 'Letter Code', visual: m.terms.join(' , ') + ' , ?', prompt: 'What comes next?', options: opts, answer: m.ans, why: m.why, style: 'word' };
  }

  var ANALOGIES = [
    { q: 'Day is to Night as Summer is to ?', ans: 'Winter', opts: ['Winter','Rain','Hot','July'], why: 'Day and Night are opposites — the opposite season of Summer is Winter.' },
    { q: 'Book is to Read as Song is to ?', ans: 'Sing', opts: ['Sing','Dance','Paper','Loud'], why: 'You read a book; you sing a song.' },
    { q: 'Fish is to Water as Bird is to ?', ans: 'Sky', opts: ['Sky','Nest','Tree','Egg'], why: 'A fish moves through water; a bird moves through the sky.' },
    { q: 'Doctor is to Hospital as Teacher is to ?', ans: 'School', opts: ['School','Book','Student','Class'], why: 'A doctor works in a hospital; a teacher works in a school.' },
    { q: 'Wheel is to Car as Page is to ?', ans: 'Book', opts: ['Book','Pen','Story','Shelf'], why: 'A wheel is part of a car; a page is part of a book.' },
    { q: 'Hungry is to Eat as Thirsty is to ?', ans: 'Drink', opts: ['Drink','Sleep','Run','Cook'], why: 'When you are hungry you eat; when thirsty, you drink.' },
    { q: 'Puppy is to Dog as Kitten is to ?', ans: 'Cat', opts: ['Cat','Lion','Cub','Mouse'], why: 'A puppy grows into a dog; a kitten grows into a cat.' },
    { q: 'Fast is to Slow as Brave is to ?', ans: 'Afraid', opts: ['Afraid','Strong','Hero','Quick'], why: 'Fast and Slow are opposites — the opposite of Brave is Afraid.' }
  ];
  function analogy() {
    var idx = ri(0, ANALOGIES.length - 1), guard = 0;
    while (usedAnalogies[idx] && guard < 12) { idx = ri(0, ANALOGIES.length - 1); guard++; }
    usedAnalogies[idx] = 1;
    var a = ANALOGIES[idx];
    return { kind: 'Analogy', visual: '', prompt: a.q, options: shuffle(a.opts.slice(0, choicesCount)), answer: a.ans, why: a.why, style: 'word' };
  }

  var RIDDLES = [
    { q: 'I have keys but I open no locks. What am I?', ans: 'A piano', opts: ['A piano','A map','A clock','A book'], why: 'A piano has keys — musical keys, not door keys.' },
    { q: 'What has a face and two hands but no arms and no legs?', ans: 'A clock', opts: ['A clock','A doll','A coin','A mirror'], why: 'A clock has a face and hands that point to the time.' },
    { q: 'What gets wetter and wetter the more it dries?', ans: 'A towel', opts: ['A towel','A sponge','Rain','Soap'], why: 'A towel dries you by soaking up water — so it gets wetter.' },
    { q: 'What has many teeth but cannot bite?', ans: 'A comb', opts: ['A comb','A zipper','A saw','A gear'], why: 'A comb has teeth for your hair — it cannot bite. (A saw and zipper can "bite" — the comb is the classic answer.)' },
    { q: 'The more of me you take, the more you leave behind. What am I?', ans: 'Footsteps', opts: ['Footsteps','Memories','Photos','Breaths'], why: 'Every step you take leaves another footstep behind you.' },
    { q: 'What has one eye but cannot see?', ans: 'A needle', opts: ['A needle','A storm','A potato','A camera'], why: 'A needle has an eye — the hole the thread goes through.' },
    { q: 'What belongs to you, but other people use it more than you do?', ans: 'Your name', opts: ['Your name','Your car','Your phone','Your money'], why: 'Other people say your name far more often than you say it yourself.' },
    { q: 'What comes down but never goes up?', ans: 'Rain', opts: ['Rain','An elevator','A ball','Smoke'], why: 'Rain falls down from clouds — it never falls back up.' },
    { q: 'I am tall when I am young and short when I am old. What am I?', ans: 'A candle', opts: ['A candle','A tree','A shadow','A pencil'], why: 'A candle melts as it burns — tall at first, short at the end. (A pencil also shrinks — the candle is the classic.)' },
    { q: 'What runs but never walks, has a mouth but never talks?', ans: 'A river', opts: ['A river','A car','The wind','Time'], why: 'A river runs, and its opening is called a mouth — but it never talks.' }
  ];
  function riddle() {
    var idx = ri(0, RIDDLES.length - 1), guard = 0;
    while (usedRiddles[idx] && guard < 14) { idx = ri(0, RIDDLES.length - 1); guard++; }
    usedRiddles[idx] = 1;
    var r = RIDDLES[idx];
    return { kind: 'Riddle', visual: '❓', prompt: r.q, options: shuffle(r.opts.slice(0, choicesCount)), answer: r.ans, why: r.why, style: 'word' };
  }

  function gridPuzzle() {
    var triples = [['🔴','🟢','🔵'], ['⭐','🌙','☀️'], ['🍎','🍌','🍇'], ['🐶','🐱','🐰']];
    var t = pickOne(triples);
    var rows = [
      [t[0], t[1], t[2]],
      [t[1], t[2], t[0]],
      [t[2], t[0], null]
    ];
    var ans = t[1];
    var html = '<span class="iq-grid">' + rows.map(function (row) {
      return row.map(function (c) { return c ? '<span>' + c + '</span>' : '<span class="iq-qmark">?</span>'; }).join('');
    }).join('') + '</span>';
    var outsider = pickOne(['🎈','🔔','🍀','🧩'].filter(function (x) { return t.indexOf(x) === -1; }));
    return { kind: 'Puzzle Grid', visual: html, prompt: 'Which piece completes the grid?', options: shuffle([t[0], t[1], t[2], outsider].slice(0, choicesCount)), answer: ans, why: 'Every row and column holds the same three symbols, just in a different order. The last row is missing ' + ans + '.', style: 'emoji', isGrid: true };
  }

  function makePuzzle(n) {
    var pool;
    if (n <= 10) pool = ['pattern', 'odd'];
    else if (n <= 20) pool = ['pattern', 'odd', 'num'];
    else if (n <= 35) pool = ['pattern', 'oddW', 'num', 'odd'];
    else if (n <= 50) pool = ['num', 'letter', 'oddW', 'pattern'];
    else if (n <= 65) pool = ['num', 'analogy', 'letter', 'riddle'];
    else if (n <= 80) pool = ['riddle', 'num', 'analogy', 'grid'];
    else pool = ['grid', 'num', 'riddle', 'analogy'];
    var t = pickOne(pool);
    if (t === 'pattern') return emojiPattern(n);
    if (t === 'odd') return oddOne(false);
    if (t === 'oddW') return oddOne(true);
    if (t === 'num') return numSeq(n);
    if (t === 'letter') return letterSeq();
    if (t === 'analogy') return analogy();
    if (t === 'riddle') return riddle();
    return gridPuzzle();
  }

  // ---------- level map + flow ----------

  function buildMap() {
    mapEl.innerHTML = '';
    for (var n = 1; n <= MAX_LEVEL; n++) {
      (function (n) {
        var b = document.createElement('button');
        b.type = 'button';
        var st = starsMap[n] || 0;
        b.className = 'iq-lvl' + (n === level ? ' iq-cur' : '') + (st > 0 ? ' iq-done' : '');
        b.textContent = st > 0 ? n + ' ' + '⭐'.repeat(Math.min(st, 1)) : String(n);
        b.title = 'Level ' + n + ' — ' + tierName(n) + (st > 0 ? ' · best ' + st + '/5 stars' : '');
        if (n > unlocked) { b.disabled = true; b.classList.add('iq-lock'); b.textContent = '🔒'; b.title = 'Level ' + n + ' — finish level ' + (n - 1) + ' to unlock'; }
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
    for (var i = 0; i < PUZZLES_PER_LEVEL; i++) s += i < score ? '⭐' : '☆';
    starsEl.textContent = s;
  }

  function nextRound() {
    locked = false; qMistake = false;
    roundEl.textContent = (round + 1) + ' / ' + PUZZLES_PER_LEVEL;
    var q = makePuzzle(level);
    kindEl.textContent = q.kind + ' · Level ' + level;
    visualEl.innerHTML = q.visual || '';
    visualEl.style.display = q.visual ? '' : 'none';
    promptEl.textContent = q.prompt;
    whyEl.textContent = '';
    choicesEl.innerHTML = '';
    q.options.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'iq-choice' + (q.style === 'emoji' ? ' iq-emoji' : q.style === 'word' ? ' iq-word' : '');
      b.textContent = v;
      b.addEventListener('click', function () { choose(b, v, q); });
      choicesEl.appendChild(b);
    });
    msgEl.textContent = 'Think, then tap your answer.';
  }

  function choose(btn, value, q) {
    if (locked) return;
    if (value === q.answer) {
      locked = true;
      btn.classList.add('iq-right');
      choicesEl.querySelectorAll('.iq-choice').forEach(function (x) { x.disabled = true; });
      if (!qMistake) { score++; scoreEl.textContent = score; drawStars(); }
      msgEl.textContent = 'Solved it!' + (qMistake ? '' : ' ⭐ First try!');
      whyEl.textContent = '💡 ' + q.why;
      setTimeout(function () {
        round++;
        if (round >= PUZZLES_PER_LEVEL) finish(); else nextRound();
      }, 2100);
    } else {
      qMistake = true;
      btn.classList.add('iq-wrong');
      btn.disabled = true;
      msgEl.textContent = 'Not quite — look at the pattern again.';
      setTimeout(function () { btn.classList.remove('iq-wrong'); }, 350);
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
    if (doneTitle) doneTitle.textContent = wasLast ? '👑 Level 100 — You Finished the Whole Quest!' : '🧠 Level ' + level + ' Complete!';
    doneStats.textContent = 'You earned ' + score + ' of ' + PUZZLES_PER_LEVEL + ' stars on Level ' + level + ' (' + tierName(level) + '). ' +
      (wasLast ? 'All 100 levels climbed — a true mastermind!'
        : score === PUZZLES_PER_LEVEL ? 'Perfect level! Level ' + (level + 1) + ' is unlocked.'
        : score >= 3 ? 'Strong solving! Level ' + (level + 1) + ' is unlocked.'
        : 'Level complete — Level ' + (level + 1) + ' is unlocked. Replay any level to earn more stars.');
    againBtn.textContent = wasLast ? 'Play again' : 'Next level →';
    doneEl.classList.remove('hidden');
  }

  function start() {
    choicesCount = level >= 21 ? 4 : 3;
    round = 0; score = 0;
    usedRiddles = {}; usedAnalogies = {}; usedOdd = {};
    scoreEl.textContent = '0';
    doneEl.classList.add('hidden');
    buildMap();
    drawStars();
    showBest();
    nextRound();
  }

  document.getElementById('iq-restart').addEventListener('click', start);
  againBtn.addEventListener('click', function () {
    if (level < MAX_LEVEL) { level = level + 1; save(); }
    start();
  });
  start();
})();
