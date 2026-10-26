// Wisely Arcade — Math Quest (addition, subtraction, multiplication, division — 5 levels)
(function () {
  'use strict';

  var LEVELS = {
    toddler: { label: 'Toddler', sub: 'count to 5', rounds: 8, choices: 3 },
    kids:    { label: 'Kids', sub: 'ages 5–9 · the four sums', rounds: 10, choices: 3 },
    teen:    { label: 'Teen', sub: 'tables to 12 · hundreds', rounds: 10, choices: 4 },
    adults:  { label: 'Adults', sub: '3-digit · missing numbers', rounds: 10, choices: 4 },
    expert:  { label: 'Expert', sub: 'two-step problems', rounds: 10, choices: 4 }
  };
  var ORDER = ['toddler', 'kids', 'teen', 'adults', 'expert'];
  var OPS = [
    { key: 'mix', label: '🔀 Mixed' },
    { key: 'add', label: '➕ Add' },
    { key: 'sub', label: '➖ Subtract' },
    { key: 'mul', label: '✖️ Multiply' },
    { key: 'div', label: '➗ Divide' }
  ];
  var SYM = { add: '+', sub: '−', mul: '×', div: '÷' };

  var qEl = document.getElementById('mq-q');
  var picsEl = document.getElementById('mq-pics');
  var choicesEl = document.getElementById('mq-choices');
  var msgEl = document.getElementById('mq-msg');
  var roundEl = document.getElementById('mq-round');
  var scoreEl = document.getElementById('mq-score');
  var bestEl = document.getElementById('mq-best');
  var starsEl = document.getElementById('mq-stars');
  var doneEl = document.getElementById('mq-done');
  var doneStats = document.getElementById('mq-done-stats');
  var levelsEl = document.getElementById('mq-levels');
  var opsEl = document.getElementById('mq-ops');

  var levelKey = 'kids', opKey = 'mix';
  try {
    levelKey = localStorage.getItem('wa_mq_level') || 'kids';
    opKey = localStorage.getItem('wa_mq_op') || 'mix';
  } catch (e) {}
  if (!LEVELS[levelKey]) levelKey = 'kids';
  var L = LEVELS[levelKey];

  var round = 0, score = 0, answer = 0, locked = false, qMistake = false;

  function ri(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function pickOp() {
    if (opKey !== 'mix') return opKey;
    if (levelKey === 'toddler') return Math.random() < 0.6 ? 'add' : 'sub';
    var all = ['add', 'sub', 'mul', 'div'];
    return all[Math.floor(Math.random() * all.length)];
  }

  function makeQuestion() {
    var op = pickOp();
    var a, b, text, pics = '';
    if (levelKey === 'toddler') {
      if (op === 'add') {
        a = ri(1, 4); b = ri(1, 5 - a);
        pics = '🍎'.repeat(a) + ' ➕ ' + '🍎'.repeat(b);
        text = a + ' + ' + b + ' = ?'; answer = a + b;
      } else {
        a = ri(2, 5); b = ri(1, a);
        pics = '🍎'.repeat(a - b) + '<span class="mq-away">' + '🍎'.repeat(b) + '</span>';
        text = a + ' − ' + b + ' = ?'; answer = a - b;
      }
    } else if (levelKey === 'kids') {
      if (op === 'add') { a = ri(3, 20); b = ri(3, 20); answer = a + b; }
      else if (op === 'sub') { a = ri(8, 30); b = ri(2, a); answer = a - b; }
      else if (op === 'mul') { a = ri(2, 5); b = Math.random() < 0.2 ? 10 : ri(2, 5); answer = a * b; }
      else { b = ri(2, 5); answer = ri(2, 5); a = b * answer; }
      text = a + ' ' + SYM[op] + ' ' + b + ' = ?';
    } else if (levelKey === 'teen') {
      if (op === 'add') { a = ri(25, 200); b = ri(25, 200); answer = a + b; }
      else if (op === 'sub') { a = ri(60, 250); b = ri(15, a); answer = a - b; }
      else if (op === 'mul') { a = ri(3, 12); b = ri(3, 12); answer = a * b; }
      else { b = ri(3, 12); answer = ri(3, 12); a = b * answer; }
      text = a + ' ' + SYM[op] + ' ' + b + ' = ?';
    } else if (levelKey === 'adults') {
      if (Math.random() < 0.35) {
        // missing number: a ? b = c, find the middle or the start
        var kind = Math.random() < 0.5 ? 'add' : 'mul';
        if (kind === 'add') {
          a = ri(40, 400); answer = ri(30, 400);
          text = a + ' + ? = ' + (a + answer);
        } else {
          b = ri(3, 12); answer = ri(3, 15);
          text = '? × ' + b + ' = ' + (b * answer);
        }
        return { text: text, pics: '' };
      }
      if (op === 'add') { a = ri(120, 999); b = ri(120, 999); answer = a + b; }
      else if (op === 'sub') { a = ri(200, 999); b = ri(60, a); answer = a - b; }
      else if (op === 'mul') { a = ri(12, 99); b = ri(3, 9); answer = a * b; }
      else { b = ri(6, 12); answer = ri(12, 25); a = b * answer; }
      text = a + ' ' + SYM[op] + ' ' + b + ' = ?';
    } else {
      // expert: two-step problems
      var style = Math.random();
      if (style < 0.4) {
        a = ri(5, 60); b = ri(3, 12); var c = ri(3, 12);
        answer = a + b * c;
        text = a + ' + ' + b + ' × ' + c + ' = ?';
      } else if (style < 0.7) {
        a = ri(4, 12); b = ri(4, 12); var c2 = ri(5, a * b - 1);
        answer = a * b - c2;
        text = a + ' × ' + b + ' − ' + c2 + ' = ?';
      } else if (style < 0.85) {
        b = ri(6, 15); answer = ri(11, 30);
        text = '? × ' + b + ' = ' + (b * answer);
      } else {
        a = ri(1500, 9000); b = ri(1200, a - 100);
        answer = a - b;
        text = a + ' − ' + b + ' = ?';
      }
    }
    return { text: text, pics: pics };
  }

  function makeChoices() {
    var set = [answer];
    var near = [1, -1, 2, -2, 10, -10, 5, -5, 3, -3, 11, -11, 20, -20];
    var i = 0;
    while (set.length < L.choices && i < 60) {
      var cand = answer + near[Math.floor(Math.random() * near.length)];
      if (cand >= 0 && set.indexOf(cand) === -1) set.push(cand);
      i++;
    }
    while (set.length < L.choices) set.push(answer + set.length * 7 + 3);
    return set.sort(function () { return Math.random() - 0.5; });
  }

  function bestKey() { return 'wa_mq_best_' + levelKey; }
  function loadBest() {
    try { return parseInt(localStorage.getItem(bestKey()) || '0', 10) || 0; } catch (e) { return 0; }
  }
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
        try { localStorage.setItem('wa_mq_level', k); } catch (e) {}
        buildLevelButtons();
        start();
      });
      levelsEl.appendChild(b);
    });
  }
  function buildOpButtons() {
    opsEl.innerHTML = '';
    OPS.forEach(function (o) {
      if (levelKey === 'toddler' && (o.key === 'mul' || o.key === 'div')) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'op-btn' + (o.key === opKey ? ' op-sel' : '');
      b.textContent = o.label;
      b.addEventListener('click', function () {
        if (o.key === opKey) return;
        opKey = o.key;
        try { localStorage.setItem('wa_mq_op', opKey); } catch (e) {}
        buildOpButtons();
        start();
      });
      opsEl.appendChild(b);
    });
  }

  function nextRound() {
    locked = false; qMistake = false;
    roundEl.textContent = (round + 1) + ' / ' + L.rounds;
    var q = makeQuestion();
    qEl.textContent = q.text;
    picsEl.innerHTML = q.pics || '';
    picsEl.style.display = q.pics ? '' : 'none';
    choicesEl.innerHTML = '';
    makeChoices().forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mq-choice';
      b.textContent = v;
      b.addEventListener('click', function () { choose(b, v, q.text); });
      choicesEl.appendChild(b);
    });
    msgEl.textContent = 'Tap the right answer!';
  }

  function choose(btn, value, qtext) {
    if (locked) return;
    if (value === answer) {
      locked = true;
      btn.classList.add('mq-right');
      choicesEl.querySelectorAll('.mq-choice').forEach(function (x) { x.disabled = true; });
      if (!qMistake) { score++; scoreEl.textContent = score; drawStars(); }
      msgEl.textContent = 'Correct! ' + qtext.replace('?', String(answer)) + (qMistake ? '' : ' ⭐ First try!');
      setTimeout(function () {
        round++;
        if (round >= L.rounds) finish(); else nextRound();
      }, 1200);
    } else {
      qMistake = true;
      btn.classList.add('mq-wrong');
      btn.disabled = true;
      msgEl.textContent = 'Not quite — take your time and try again.';
      setTimeout(function () { btn.classList.remove('mq-wrong'); }, 350);
    }
  }

  function finish() {
    var b = loadBest();
    if (score > b) { try { localStorage.setItem(bestKey(), String(score)); } catch (e) {} }
    showBest();
    doneStats.textContent = 'You earned ' + score + ' of ' + L.rounds + ' stars on ' + L.label + '. ' +
      (score === L.rounds ? 'Perfect quest — every answer first try!'
        : score >= L.rounds * 0.7 ? 'Strong maths! Ready to climb a level?'
        : score >= L.rounds * 0.4 ? 'Good climbing — small steps add up.'
        : 'Good start! Every mathematician began with 1 + 1.');
    doneEl.classList.remove('hidden');
  }

  function start() {
    buildOpButtons();
    round = 0; score = 0;
    scoreEl.textContent = '0';
    doneEl.classList.add('hidden');
    drawStars();
    showBest();
    nextRound();
  }

  document.getElementById('mq-restart').addEventListener('click', start);
  document.getElementById('mq-again').addEventListener('click', start);
  buildLevelButtons();
  start();
})();
