/* Math Quest — Wisely Arcade: 100 levels, 8 sums per level.
   Finish a level to unlock the next. Numbers grow as you climb.
   Missing numbers from L46; two-step problems from L66; master sums to L100. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var MAX_LEVEL = 100, PER_LEVEL = 8;

  var OPS = [
    { k: 'add', label: '➕ Add' },
    { k: 'sub', label: '➖ Take away' },
    { k: 'mul', label: '✖️ Times' },
    { k: 'div', label: '➗ Share' },
    { k: 'mix', label: '🎲 Mixed' }
  ];
  var TIERS = [
    { to: 10, name: 'Counting steps' }, { to: 25, name: 'Number explorer' },
    { to: 45, name: 'Number climber' }, { to: 65, name: 'Number thinker' },
    { to: 80, name: 'Number master' }, { to: 100, name: 'Number wizard' }
  ];
  function tierName(l) { for (var i = 0; i < TIERS.length; i++) if (l <= TIERS[i].to) return TIERS[i].name; return TIERS[5].name; }
  function band(l) { return l <= 10 ? 1 : l <= 25 ? 2 : l <= 45 ? 3 : l <= 65 ? 4 : l <= 80 ? 5 : 6; }

  var cur = 1, unlocked = 1, starMap = {};
  var opKey = 'mix';
  try {
    cur = parseInt(localStorage.getItem('wa_mq_current') || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem('wa_mq_unlocked') || '1', 10) || 1;
    starMap = JSON.parse(localStorage.getItem('wa_mq_stars') || '{}') || {};
    opKey = localStorage.getItem('wa_mq_op') || 'mix';
  } catch (e) {}
  if (cur < 1) cur = 1; if (cur > MAX_LEVEL) cur = MAX_LEVEL;
  if (unlocked < cur) unlocked = cur; if (unlocked > MAX_LEVEL) unlocked = MAX_LEVEL;
  if (!OPS.some(function (o) { return o.k === opKey; })) opKey = 'mix';

  var round = 0, score = 0, wrongOnce = false, locked = false, currentQ = null, seen = [];
  function save() {
    try {
      localStorage.setItem('wa_mq_current', String(cur));
      localStorage.setItem('wa_mq_unlocked', String(unlocked));
      localStorage.setItem('wa_mq_stars', JSON.stringify(starMap));
      localStorage.setItem('wa_mq_op', opKey);
    } catch (e) {}
  }
  function totalStars() { var t = 0; for (var k in starMap) t += starMap[k]; return t; }

  /* ---------- question factory ---------- */
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pickOp() {
    if (opKey !== 'mix') return opKey;
    var pool = ['add', 'sub'];
    if (cur >= 11) pool.push('mul');
    if (cur >= 16) pool.push('div');
    return pool[rnd(0, pool.length - 1)];
  }
  function makeQ() {
    var op = pickOp(), bd = band(cur), q = '', a = 0, pics = '';
    var i;
    if (op === 'add') {
      var x, y;
      if (bd === 1) { x = rnd(1, 7); y = rnd(1, 9 - x); pics = '🍎'.repeat(x) + ' &nbsp;+&nbsp; ' + '🍏'.repeat(y); }
      else if (bd === 2) { x = rnd(6, 40); y = rnd(5, 35); }
      else if (bd === 3) { x = rnd(25, 160); y = rnd(20, 140); }
      else if (bd === 4) { x = rnd(120, 700); y = rnd(110, 650); }
      else if (bd === 5) { if (rnd(0, 1)) { x = rnd(40, 300); y = rnd(40, 300); q = '? + ' + y + ' = ' + (x + y); a = x; } else { x = rnd(150, 900); y = rnd(150, 900); } }
      else { if (rnd(0, 1)) { x = rnd(200, 1500); y = rnd(200, 1500); q = x + ' + ' + y + ' − ' + rnd(10, 99) + ' = ?'; a = x + y - parseInt(q.split('− ')[1], 10); q = q; } else { x = rnd(300, 2000); y = rnd(300, 2000); } }
      if (!q) { q = x + ' + ' + y + ' = ?'; a = x + y; }
    } else if (op === 'sub') {
      var m, n;
      if (bd === 1) { m = rnd(4, 10); n = rnd(1, m - 1); pics = '🎈'.repeat(m); }
      else if (bd === 2) { m = rnd(15, 60); n = rnd(5, m - 5); }
      else if (bd === 3) { m = rnd(60, 300); n = rnd(30, m - 20); }
      else if (bd === 4) { m = rnd(300, 950); n = rnd(120, m - 100); }
      else if (bd === 5) { if (rnd(0, 1)) { m = rnd(100, 500); n = rnd(40, m - 30); q = m + ' − ? = ' + (m - n); a = n; } else { m = rnd(400, 1200); n = rnd(200, m - 150); } }
      else { m = rnd(800, 3000); n = rnd(300, m - 250); }
      if (!q) { q = m + ' − ' + n + ' = ?'; a = m - n; }
    } else if (op === 'mul') {
      var f, g;
      if (bd <= 2) { f = rnd(2, 5); g = rnd(2, 6); }
      else if (bd === 3) { f = rnd(3, 9); g = rnd(3, 9); }
      else if (bd === 4) { f = rnd(11, 40); g = rnd(2, 6); }
      else if (bd === 5) { f = rnd(12, 60); g = rnd(3, 9); }
      else { f = rnd(15, 99); g = rnd(4, 9); if (rnd(0, 1)) { q = f + ' × ' + g + ' + ' + rnd(2, 20) + ' = ?'; a = f * g + parseInt(q.split('+ ')[1], 10); } }
      if (!q) { q = f + ' × ' + g + ' = ?'; a = f * g; }
    } else { /* div */
      var d, qt;
      if (bd <= 2) { d = rnd(2, 5); qt = rnd(2, 6); }
      else if (bd === 3) { d = rnd(3, 9); qt = rnd(3, 9); }
      else if (bd === 4) { d = rnd(4, 12); qt = rnd(4, 12); }
      else if (bd === 5) { d = rnd(6, 15); qt = rnd(6, 15); }
      else { d = rnd(7, 19); qt = rnd(7, 19); if (rnd(0, 1)) { q = '? ÷ ' + d + ' = ' + qt; a = d * qt; } }
      if (!q) { q = (d * qt) + ' ÷ ' + d + ' = ?'; a = qt; }
    }
    /* distractors */
    var nChoices = cur < 26 ? 3 : 4;
    var opts = [a], guard = 0;
    while (opts.length < nChoices && guard++ < 60) {
      var delta = [1, -1, 2, -2, 10, -10, 5, -5, 3, -3][rnd(0, 9)];
      var c = a + delta;
      if (c >= 0 && opts.indexOf(c) === -1) opts.push(c);
    }
    while (opts.length < nChoices) opts.push(a + opts.length + 3);
    for (i = opts.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = opts[i]; opts[i] = opts[j]; opts[j] = t; }
    var key = q + '|' + a;
    if (seen.indexOf(key) !== -1 && rnd(0, 2)) return makeQ();
    seen.push(key);
    return { q: q, a: a, opts: opts, pics: pics };
  }

  /* ---------- render ---------- */
  function buildOps() {
    var box = $('mq-ops'); if (!box) return;
    box.innerHTML = '';
    OPS.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'op-btn' + (o.k === opKey ? ' op-sel' : '');
      b.textContent = o.label;
      b.addEventListener('click', function () { opKey = o.k; save(); buildOps(); });
      box.appendChild(b);
    });
  }
  function buildMap() {
    var map = $('mq-map'); if (!map) return;
    map.innerHTML = '';
    for (var l = 1; l <= MAX_LEVEL; l++) {
      (function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        if (l < cur && starMap[l] != null) { b.className = 'mq-lvl mq-done'; b.textContent = l + (starMap[l] >= 6 ? ' ⭐' : ''); }
        else if (l === cur) { b.className = 'mq-lvl mq-cur'; b.textContent = l; }
        else if (l <= unlocked) { b.className = 'mq-lvl'; b.textContent = l; }
        else { b.className = 'mq-lvl mq-lock'; b.textContent = '🔒'; }
        b.disabled = l > unlocked;
        b.setAttribute('aria-label', 'Level ' + l);
        b.addEventListener('click', function () { if (l <= unlocked) { cur = l; save(); startLevel(); } });
        map.appendChild(b);
      })(l);
    }
    $('mq-level-now').textContent = cur;
    var doneCount = 0; for (var k in starMap) doneCount++;
    $('mq-progress-note').textContent = tierName(cur) + ' · ' + doneCount + ' of 100 levels completed';
  }
  function stars() {
    var s = '', i;
    for (i = 0; i < PER_LEVEL; i++) s += (i < score ? '⭐' : '☆') + ' ';
    $('mq-stars').textContent = s.trim();
  }
  function startLevel() {
    round = 0; score = 0; seen = [];
    $('mq-done').classList.add('hidden');
    buildMap();
    next();
  }
  function next() {
    locked = false; wrongOnce = false;
    currentQ = makeQ();
    $('mq-pics').innerHTML = currentQ.pics || '';
    $('mq-q').textContent = currentQ.q;
    $('mq-round').textContent = (round + 1) + ' / ' + PER_LEVEL;
    $('mq-score').textContent = score;
    $('mq-best').textContent = totalStars() + ' ⭐';
    stars();
    $('mq-msg').textContent = 'Tap the right answer!';
    $('mq-msg').style.color = '';
    var box = $('mq-choices'); box.innerHTML = '';
    currentQ.opts.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mq-choice';
      b.textContent = o;
      b.addEventListener('click', function () { answer(b, o); });
      box.appendChild(b);
    });
  }
  function answer(btn, val) {
    if (locked) return;
    if (val === currentQ.a) {
      locked = true;
      btn.classList.add('mq-right');
      if (!wrongOnce) { score++; stars(); }
      $('mq-score').textContent = score;
      $('mq-msg').textContent = ['Brilliant! 🎉', 'Exactly right! 🌟', 'Number power! 💪'][rnd(0, 2)];
      $('mq-msg').style.color = '#15803d';
      round++;
      setTimeout(function () { if (round >= PER_LEVEL) finish(); else next(); }, 800);
    } else {
      btn.classList.add('mq-wrong');
      btn.disabled = true;
      wrongOnce = true;
      $('mq-msg').textContent = 'Not quite — try another one!';
      $('mq-msg').style.color = '#b91c1c';
    }
  }
  function finish() {
    if (starMap[cur] == null || score > starMap[cur]) starMap[cur] = score;
    if (cur === unlocked && unlocked < MAX_LEVEL) unlocked++;
    save();
    buildMap();
    $('mq-done-title').textContent = score >= 7 ? '🏆 Number Wizard!' : score >= 4 ? '🎉 Level ' + cur + ' Complete!' : '🌱 Level ' + cur + ' Done!';
    $('mq-done-stats').textContent = 'You earned ' + score + ' of ' + PER_LEVEL + ' stars on Level ' + cur + '.' +
      (cur < MAX_LEVEL ? ' Level ' + (cur + 1) + ' is now unlocked — keep climbing!' : ' You reached the top of Math Quest!');
    $('mq-best').textContent = totalStars() + ' ⭐';
    $('mq-done').classList.remove('hidden');
  }
  $('mq-again').addEventListener('click', function () {
    if (cur < MAX_LEVEL) { cur++; save(); }
    startLevel();
  });
  $('mq-restart').addEventListener('click', startLevel);
  buildOps();
  startLevel();
})();
