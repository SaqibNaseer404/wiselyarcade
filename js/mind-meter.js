/* Mind Meter — IQ Challenge.
   12 questions per run drawn from a bank of 24, 30 seconds each.
   Score feeds an estimated IQ with rank titles. Best kept in localStorage.
   Lesson: a sharp mind is built, not born — every rep counts. */
(function () {
  'use strict';

  var BEST_KEY = 'mm_best_iq';

  /* ---------------- Question bank (original, family-safe) ----------------
     q: question text, opts: 4 options, a: index of correct, cat: category */
  var BANK = [
    { cat: '🔢 Number Logic', q: 'What comes next? 2, 6, 12, 20, 30, …', opts: ['36', '40', '42', '44'], a: 2 },
    { cat: '🧩 Patterns', q: 'What comes next? 1, 11, 21, 1211, 111221, …', opts: ['312211', '123111', '211312', '311221'], a: 0 },
    { cat: '🧩 Patterns', q: 'What comes next? A, C, F, J, O, …', opts: ['S', 'T', 'U', 'V'], a: 2 },
    { cat: '🗣️ Verbal', q: 'Odd one out: Apple, Banana, Carrot, Grape', opts: ['Apple', 'Banana', 'Carrot', 'Grape'], a: 2 },
    { cat: '🗣️ Verbal', q: 'Book is to Reading as Fork is to …', opts: ['Cooking', 'Eating', 'Kitchen', 'Plate'], a: 1 },
    { cat: '🧩 Patterns', q: 'All Zips are Zaps, and all Zaps are Zops. Are all Zips Zops?', opts: ['Yes', 'No', 'Only some', 'Cannot tell'], a: 0 },
    { cat: '➗ Math Puzzles', q: 'A bat and a ball cost $1.10 together. The bat costs $1.00 more than the ball. How much is the ball?', opts: ['$0.10', '$0.05', '$0.01', '$0.15'], a: 1 },
    { cat: '➗ Math Puzzles', q: '3 machines make 3 gadgets in 3 minutes. How long for 100 machines to make 100 gadgets?', opts: ['100 minutes', '3 minutes', '33 minutes', '300 minutes'], a: 1 },
    { cat: '🔢 Number Logic', q: 'What comes next? 7, 14, 28, 56, …', opts: ['84', '102', '108', '112'], a: 3 },
    { cat: '🔢 Number Logic', q: 'Which number does NOT belong? 3, 7, 11, 15, 19', opts: ['3', '11', '15', '19'], a: 2 },
    { cat: '🧩 Patterns', q: 'If yesterday was Wednesday, what day is the day after tomorrow?', opts: ['Friday', 'Saturday', 'Sunday', 'Monday'], a: 1 },
    { cat: '🗣️ Verbal', q: 'Hot is to Cold as Day is to …', opts: ['Sun', 'Night', 'Light', 'Morning'], a: 1 },
    { cat: '➗ Math Puzzles', q: 'A farmer has 17 sheep. All but 9 run away. How many are left?', opts: ['8', '9', '0', '17'], a: 1 },
    { cat: '🔢 Number Logic', q: 'What comes next? 1, 4, 9, 16, 25, …', opts: ['30', '35', '36', '49'], a: 2 },
    { cat: '🧩 Patterns', q: 'Some Bloops are Razzies, and all Razzies are Lazzies. Are some Bloops Lazzies?', opts: ['Yes', 'No', 'Cannot tell', 'Only if all Bloops are Razzies'], a: 0 },
    { cat: '🗣️ Verbal', q: 'Water is to Ice as Milk is to …', opts: ['Coffee', 'Cheese', 'Bread', 'Juice'], a: 1 },
    { cat: '🔢 Number Logic', q: 'What comes next? 2, 3, 5, 9, 17, …', opts: ['26', '31', '33', '34'], a: 2 },
    { cat: '🧩 Patterns', q: 'Which weighs more — a pound of feathers or a pound of bricks?', opts: ['Feathers', 'Bricks', 'They weigh the same', 'Depends on the scale'], a: 2 },
    { cat: '🧩 Patterns', q: 'How many months have at least 28 days?', opts: ['1', '2', '11', '12'], a: 3 },
    { cat: '🗣️ Verbal', q: "Mary's father has five daughters: Nana, Nene, Nini and Nono. Who is the fifth?", opts: ['Nunu', 'Nina', 'Mary', 'Nana Jr.'], a: 2 },
    { cat: '🗣️ Verbal', q: 'Rearrange "CIFAIPC" and you get the name of a …', opts: ['City', 'Ocean', 'Animal', 'Planet'], a: 1 },
    { cat: '🔢 Number Logic', q: 'What comes next? 81, 27, 9, 3, …', opts: ['0', '1', '2', '9'], a: 1 },
    { cat: '🧩 Patterns', q: 'A man builds a house with all four walls facing south. A bear walks past. What color is the bear?', opts: ['Brown', 'Black', 'White', 'There are no bears there'], a: 2 },
    { cat: '🧩 Patterns', q: 'What comes next? O, T, T, F, F, S, S, …', opts: ['N', 'E', 'T', 'O'], a: 1 }
  ];

  var PER_RUN = 12, TIME_PER_Q = 30;

  var $ = function (id) { return document.getElementById(id); };
  var elQ = $('mm-q'), elOpts = $('mm-opts'), elCat = $('mm-cat'),
      elNum = $('mm-num'), elScore = $('mm-score'), elStreak = $('mm-streak'),
      elRing = $('mm-ring-fg'), elTime = $('mm-time'),
      scrStart = $('mm-start'), scrQuiz = $('mm-quiz'), scrDone = $('mm-done');

  var best = 0;
  try { best = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) {}
  function showBest() { $('mm-best').textContent = best > 0 ? best : '—'; }
  showBest();

  var questions, qi, score, streak, maxScore, timerId, timeLeft, answered, correctCount;

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function startGame() {
    questions = shuffle(BANK).slice(0, PER_RUN).map(function (q) {
      var order = shuffle([0, 1, 2, 3]);
      return {
        cat: q.cat, q: q.q,
        opts: order.map(function (i) { return q.opts[i]; }),
        a: order.indexOf(q.a)
      };
    });
    qi = 0; score = 0; streak = 0; correctCount = 0;
    maxScore = PER_RUN * 300;
    scrStart.classList.add('hidden');
    scrDone.classList.add('hidden');
    scrQuiz.classList.remove('hidden');
    showQuestion();
  }

  function ringSet(frac) {
    // 2πr, r=26 → 163.36
    elRing.style.strokeDashoffset = String(163.36 * (1 - frac));
  }

  function showQuestion() {
    answered = false;
    var q = questions[qi];
    elCat.textContent = q.cat;
    elNum.textContent = 'Question ' + (qi + 1) + ' of ' + PER_RUN;
    elQ.textContent = q.q;
    elOpts.innerHTML = '';
    var letters = ['A', 'B', 'C', 'D'];
    q.opts.forEach(function (opt, i) {
      var b = document.createElement('button');
      b.className = 'mm-opt';
      b.innerHTML = '<span class="mm-letter">' + letters[i] + '</span><span>' + opt + '</span>';
      b.addEventListener('click', function () { answer(i, b); });
      elOpts.appendChild(b);
    });
    // timer
    timeLeft = TIME_PER_Q;
    elTime.textContent = timeLeft;
    ringSet(1);
    if (timerId) clearInterval(timerId);
    timerId = setInterval(function () {
      timeLeft--;
      elTime.textContent = Math.max(0, timeLeft);
      ringSet(timeLeft / TIME_PER_Q);
      if (timeLeft <= 0) {
        clearInterval(timerId);
        answer(-1, null); // time out
      }
    }, 1000);
    // little 3D pop on the card
    var card = $('mm-card');
    card.classList.remove('mm-pop');
    void card.offsetWidth;
    card.classList.add('mm-pop');
  }

  function answer(pick, btn) {
    if (answered) return;
    answered = true;
    clearInterval(timerId);
    var q = questions[qi];
    var kids = elOpts.children;
    var k;
    if (pick === q.a) {
      correctCount++;
      streak++;
      var timeBonus = Math.round(100 * (timeLeft / TIME_PER_Q));
      var streakBonus = Math.min(100, 25 * (streak - 1));
      var pts = 100 + timeBonus + streakBonus;
      score += pts;
      btn.classList.add('correct');
      popup('+' + pts, true);
    } else {
      streak = 0;
      if (btn) btn.classList.add('wrong');
      if (pick === -1) popup('Time!', false);
      else popup('✕', false);
    }
    // reveal the right answer
    for (k = 0; k < kids.length; k++) {
      kids[k].disabled = true;
      if (k === q.a) kids[k].classList.add('correct');
    }
    elScore.textContent = score;
    var s2 = document.getElementById('mm-score2');
    if (s2) s2.textContent = score;
    elStreak.textContent = streak > 1 ? '🔥 ×' + streak : '';
    setTimeout(function () {
      qi++;
      if (qi < PER_RUN) showQuestion();
      else finish();
    }, 1100);
  }

  function popup(text, good) {
    var p = document.createElement('div');
    p.className = 'mm-popup' + (good ? ' good' : ' bad');
    p.textContent = text;
    $('mm-stage').appendChild(p);
    setTimeout(function () { p.remove(); }, 900);
  }

  function iqFromScore() {
    var frac = Math.max(0, Math.min(1, score / maxScore));
    return Math.round(85 + 60 * frac);
  }

  function rankFor(iq) {
    if (iq >= 130) return ['Certified Genius', '🧠'];
    if (iq >= 115) return ['Sharp Thinker', '⚡'];
    if (iq >= 100) return ['Solid Mind', '💪'];
    if (iq >= 90) return ['Curious Mind', '🔍'];
    return ['Warming Up', '🌱'];
  }

  function finish() {
    var iq = iqFromScore();
    var rank = rankFor(iq);
    var isBest = iq > best;
    if (isBest) {
      best = iq;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
    }
    $('mm-iq').textContent = iq;
    $('mm-rank').textContent = rank[1] + ' ' + rank[0];
    $('mm-acc').textContent = correctCount + ' / ' + PER_RUN + ' correct';
    $('mm-best-line').textContent = isBest
      ? '🎉 New personal best!'
      : 'Personal best: ' + best;
    showBest();
    scrQuiz.classList.add('hidden');
    scrDone.classList.remove('hidden');
    // animate the IQ number counting up
    var target = iq, shown = 0, el = $('mm-iq');
    var iv = setInterval(function () {
      shown += Math.ceil((target - shown) / 6);
      if (shown >= target) { shown = target; clearInterval(iv); }
      el.textContent = shown;
    }, 40);
  }

  $('mm-play').addEventListener('click', startGame);
  $('mm-again').addEventListener('click', startGame);
  $('mm-restart').addEventListener('click', startGame);
})();
