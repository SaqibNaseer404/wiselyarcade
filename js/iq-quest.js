// Wisely Arcade — IQ Quest (patterns, sequences, odd-one-out, analogies, riddles, grids — 5 levels)
(function () {
  'use strict';

  var LEVELS = {
    toddler: { label: 'Toddler', sub: 'picture puzzles', rounds: 6, choices: 3 },
    kids:    { label: 'Kids', sub: 'ages 5–9 · first patterns', rounds: 10, choices: 3 },
    teen:    { label: 'Teen', sub: 'codes & tricky patterns', rounds: 10, choices: 4 },
    adults:  { label: 'Adults', sub: 'analogies & riddles', rounds: 10, choices: 4 },
    expert:  { label: 'Expert', sub: 'grids & two-rule puzzles', rounds: 10, choices: 4 }
  };
  var ORDER = ['toddler', 'kids', 'teen', 'adults', 'expert'];

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
  var levelsEl = document.getElementById('iq-levels');

  var levelKey = 'kids';
  try { levelKey = localStorage.getItem('wa_iq_level') || 'kids'; } catch (e) {}
  if (!LEVELS[levelKey]) levelKey = 'kids';
  var L = LEVELS[levelKey];

  var round = 0, score = 0, locked = false, qMistake = false;
  var usedRiddles = {}, usedAnalogies = {}, usedOdd = {};

  function ri(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function shuffle(a) { return a.slice().sort(function () { return Math.random() - 0.5; }); }
  function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }

  // ---------- puzzle builders: each returns {kind, visual, prompt, options[], answer, why, style} ----------

  var PAT_SETS = [['🍎','🍌'],['🚗','🚌'],['⭐','🌙'],['🐶','🐱'],['🔴','🔵'],['⚽','🏀'],['🍓','🍇'],['🦁','🐯'],['✈️','🚀']];
  function emojiPattern(hard) {
    var set = pickOne(PAT_SETS);
    var A = set[0], B = set[1];
    var seq, ans, why;
    var mode = hard ? ri(0, 2) : ri(0, 1);
    if (mode === 0) { seq = [A, B, A, B, A]; ans = B; why = 'The pattern swaps ' + A + ' ' + B + ' ' + A + ' ' + B + ' — so ' + B + ' comes next.'; }
    else if (mode === 1) { seq = [A, A, B, A, A]; ans = B; why = 'Two ' + A + ', then one ' + B + ', repeating — so ' + B + ' comes next.'; }
    else { var C = pickOne(['🎈','🔔','🍀','🐠','🎁'].filter(function (x) { return x !== A && x !== B; }));
           seq = [A, B, C, A, B]; ans = C; why = 'The pattern is ' + A + ' ' + B + ' ' + C + ' repeating — so ' + C + ' comes next.'; }
    var others = ['🎈','🔔','🍀','🐠','🎁','🧩'].filter(function (x) { return seq.indexOf(x) === -1 && x !== ans; });
    var opts = shuffle([ans, A === ans ? B : A].concat(shuffle(others).slice(0, L.choices - 2)));
    var visual = seq.join(' ') + ' <span class="iq-qmark">?</span>';
    return { kind: 'Pattern', visual: visual, prompt: 'What comes next in the pattern?', options: opts, answer: ans, why: why, style: 'emoji' };
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
    { items: ['Shirt','Trousers','Jacket'], odd: 'Necklace', why: 'The others are clothes you wear on your body — a necklace is jewellery.' },
    { items: ['Eagle','Sparrow','Penguin'], odd: 'Bat', why: 'The others are birds — a bat is a mammal.' }
  ];
  function oddOne(words) {
    var bank = words ? ODD_WORDS : ODD_EMOJI;
    var idx = ri(0, bank.length - 1), guard = 0;
    while (usedOdd[bank[idx].odd] && guard < 12) { idx = ri(0, bank.length - 1); guard++; }
    var g = bank[idx]; usedOdd[g.odd] = 1;
    var shown = g.items.slice(0, L.choices - 1).concat([g.odd]);
    return { kind: 'Odd One Out', visual: words ? '' : '', prompt: 'Which one does not belong?', options: shuffle(shown), answer: g.odd, why: g.why, style: words ? 'word' : 'emoji' };
  }

  function numSeq() {
    var mode, terms = [], ans, why, step;
    if (levelKey === 'kids') {
      step = pickOne([2, 5, 10, -2, 3]);
      var start = step > 0 ? ri(1, 12) : ri(15, 30);
      for (var i = 0; i < 4; i++) terms.push(start + step * i);
      ans = start + step * 4;
      why = 'Each number ' + (step > 0 ? 'grows' : 'shrinks') + ' by ' + Math.abs(step) + ': ' + terms.join(', ') + ' → ' + ans + '.';
    } else if (levelKey === 'teen') {
      mode = ri(0, 2);
      if (mode === 0) { step = pickOne([-9, -7, -4, 6, 7, 9, 11]); var s2 = step > 0 ? ri(2, 20) : ri(60, 99);
        for (var j = 0; j < 4; j++) terms.push(s2 + step * j); ans = s2 + step * 4;
        why = 'Each number ' + (step > 0 ? 'grows' : 'shrinks') + ' by ' + Math.abs(step) + ' → ' + ans + '.'; }
      else if (mode === 1) { var s3 = ri(1, 4); for (var k = 0; k < 4; k++) terms.push(s3 * Math.pow(2, k)); ans = s3 * 16;
        why = 'Each number doubles: ×2 every step → ' + ans + '.'; }
      else { terms = [1, 4, 9, 16]; ans = 25; why = 'These are square numbers: 1×1, 2×2, 3×3, 4×4 — next is 5×5 = 25.'; }
    } else if (levelKey === 'adults') {
      mode = ri(0, 2);
      if (mode === 0) { var s4 = ri(1, 5); for (var m = 0; m < 4; m++) terms.push(m === 0 ? s4 : terms[m - 1] * 2 + 1); ans = terms[3] * 2 + 1;
        why = 'The rule is ×2 then +1 each step → ' + ans + '.'; }
      else if (mode === 1) { var s5 = ri(10, 20); terms = [s5, s5 + 5, s5 + 3, s5 + 8]; ans = s5 + 6;
        why = 'The steps alternate +5, −2, +5, then −2 again → ' + ans + '.'; }
      else { var s6 = ri(2, 6); for (var n = 0; n < 4; n++) terms.push(s6 * Math.pow(3, n)); ans = s6 * 81;
        why = 'Each number triples: ×3 every step → ' + ans + '.'; }
    } else { // expert
      mode = ri(0, 2);
      if (mode === 0) { var a = ri(1, 3), b = ri(2, 5); terms = [a, b];
        while (terms.length < 5) terms.push(terms[terms.length - 1] + terms[terms.length - 2]);
        ans = terms[4] + terms[3]; terms = terms.slice(0, 5);
        why = 'Each number is the sum of the two before it → ' + ans + '.'; }
      else if (mode === 1) { var s7 = ri(2, 5); for (var p = 0; p < 4; p++) terms.push(p === 0 ? s7 : terms[p - 1] * 2 - 1); ans = terms[3] * 2 - 1;
        why = 'The rule is ×2 then −1 each step → ' + ans + '.'; }
      else { terms = [2, 3, 5, 7, 11]; ans = 13; why = 'These are prime numbers — divisible only by 1 and themselves. Next prime after 11 is 13.'; }
    }
    var opts = [ans];
    var near = [1, -1, 2, -2, 5, -5, 10, -10, 3, -3];
    var gi = 0;
    while (opts.length < L.choices && gi < 40) { var c = ans + near[Math.floor(Math.random() * near.length)]; if (opts.indexOf(c) === -1) opts.push(c); gi++; }
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
    var opts = shuffle([m.ans].concat(shuffle(pool.filter(function (x) { return x !== m.ans; })).slice(0, L.choices - 1)));
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
    return { kind: 'Analogy', visual: '', prompt: a.q, options: shuffle(a.opts), answer: a.ans, why: a.why, style: 'word' };
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
    return { kind: 'Riddle', visual: '❓', prompt: r.q, options: shuffle(r.opts), answer: r.ans, why: r.why, style: 'word' };
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
    return { kind: 'Puzzle Grid', visual: html, prompt: 'Which piece completes the grid?', options: shuffle([t[0], t[1], t[2], outsider].slice(0, L.choices)), answer: ans, why: 'Every row and column holds the same three symbols, just in a different order. The last row is missing ' + ans + '.', style: 'emoji', isGrid: true };
  }

  function makePuzzle() {
    var pool;
    if (levelKey === 'toddler') pool = ['pattern', 'odd'];
    else if (levelKey === 'kids') pool = ['pattern', 'odd', 'num', 'pattern', 'odd'];
    else if (levelKey === 'teen') pool = ['patternH', 'num', 'letter', 'oddW', 'num'];
    else if (levelKey === 'adults') pool = ['num', 'analogy', 'riddle', 'letter', 'oddW'];
    else pool = ['grid', 'num', 'riddle', 'analogy', 'grid'];
    var t = pickOne(pool);
    if (t === 'pattern') return emojiPattern(false);
    if (t === 'patternH') return emojiPattern(true);
    if (t === 'odd') return oddOne(false);
    if (t === 'oddW') return oddOne(true);
    if (t === 'num') return numSeq();
    if (t === 'letter') return letterSeq();
    if (t === 'analogy') return analogy();
    if (t === 'riddle') return riddle();
    return gridPuzzle();
  }

  // ---------- game flow (same shape as the other learning games) ----------

  function bestKey() { return 'wa_iq_best_' + levelKey; }
  function loadBest() { try { return parseInt(localStorage.getItem(bestKey()) || '0', 10) || 0; } catch (e) { return 0; } }
  function showBest() { var b = loadBest(); bestEl.textContent = b > 0 ? b + ' ⭐' : '—'; }
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
        try { localStorage.setItem('wa_iq_level', k); } catch (e) {}
        buildLevelButtons();
        start();
      });
      levelsEl.appendChild(b);
    });
  }

  function nextRound() {
    locked = false; qMistake = false;
    roundEl.textContent = (round + 1) + ' / ' + L.rounds;
    var q = makePuzzle();
    kindEl.textContent = q.kind;
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
        if (round >= L.rounds) finish(); else nextRound();
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
    var b = loadBest();
    if (score > b) { try { localStorage.setItem(bestKey(), String(score)); } catch (e) {} }
    showBest();
    doneStats.textContent = 'You solved ' + score + ' of ' + L.rounds + ' puzzles first try on ' + L.label + '. ' +
      (score === L.rounds ? 'Perfect brain — every puzzle cracked first try!'
        : score >= L.rounds * 0.7 ? 'Sharp mind! Ready to climb a level?'
        : score >= L.rounds * 0.4 ? 'Good thinking — patterns get easier with practice.'
        : 'Good start! Every puzzle master began by looking a little longer.');
    doneEl.classList.remove('hidden');
  }

  function start() {
    round = 0; score = 0;
    usedRiddles = {}; usedAnalogies = {}; usedOdd = {};
    scoreEl.textContent = '0';
    doneEl.classList.add('hidden');
    drawStars();
    showBest();
    nextRound();
  }

  document.getElementById('iq-restart').addEventListener('click', start);
  document.getElementById('iq-again').addEventListener('click', start);
  buildLevelButtons();
  start();
})();
