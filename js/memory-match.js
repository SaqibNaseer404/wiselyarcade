// Animal Memory Match — 4x4 flip-card matching game (Ages 5-9).
// Tracks moves + time; best score (fewest moves) saved in localStorage.
(function () {
  'use strict';

  var ANIMALS = ['🐶', '🐱', '🦊', '🐼', '🐸', '🦁', '🐵', '🐯'];
  var BEST_KEY = 'wisely_memory_best';

  var board = document.getElementById('mboard');
  var movesEl = document.getElementById('m-moves');
  var timeEl = document.getElementById('m-time');
  var bestEl = document.getElementById('m-best');
  var overlay = document.getElementById('m-win');
  var winStats = document.getElementById('m-win-stats');
  var restartBtn = document.getElementById('m-restart');
  var againBtn = document.getElementById('m-again');

  var firstCard = null;   // the first flipped (unmatched) card element
  var lock = false;       // true while two cards are being compared
  var matchedPairs = 0;
  var moves = 0;
  var seconds = 0;
  var timerId = null;
  var started = false;

  function fmt(s) {
    var m = Math.floor(s / 60), sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function getBest() {
    try {
      var raw = localStorage.getItem(BEST_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function renderBest() {
    var b = getBest();
    bestEl.textContent = b ? (b.moves + ' moves · ' + fmt(b.time)) : '—';
  }

  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function startTimer() {
    if (started) return;
    started = true;
    timerId = setInterval(function () {
      seconds++;
      timeEl.textContent = fmt(seconds);
    }, 1000);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function onCardClick(card) {
    if (lock) return;
    if (card.classList.contains('flipped') || card.classList.contains('matched')) return;

    startTimer();
    card.classList.add('flipped');

    if (!firstCard) {
      firstCard = card;
      return;
    }

    // Second card flipped — count the move.
    moves++;
    movesEl.textContent = moves;

    if (firstCard.dataset.animal === card.dataset.animal) {
      // Match!
      firstCard.classList.add('matched');
      card.classList.add('matched');
      firstCard = null;
      matchedPairs++;
      if (matchedPairs === ANIMALS.length) win();
    } else {
      // Not a match — flip both back after a short look.
      lock = true;
      var a = firstCard, b = card;
      firstCard = null;
      setTimeout(function () {
        a.classList.remove('flipped');
        b.classList.remove('flipped');
        lock = false;
      }, 750);
    }
  }

  function win() {
    stopTimer();
    var b = getBest();
    var isBest = !b || moves < b.moves;
    if (isBest) {
      try { localStorage.setItem(BEST_KEY, JSON.stringify({ moves: moves, time: seconds })); } catch (e) {}
    }
    renderBest();
    winStats.innerHTML =
      'You found all 8 pairs in <strong>' + moves + ' moves</strong> ' +
      'and <strong>' + fmt(seconds) + '</strong>.' +
      (isBest ? '<br><strong>That\'s a new best score!</strong>' : '');
    overlay.classList.remove('hidden');
  }

  function newGame() {
    stopTimer();
    firstCard = null;
    lock = false;
    matchedPairs = 0;
    moves = 0;
    seconds = 0;
    started = false;
    movesEl.textContent = '0';
    timeEl.textContent = '0:00';
    overlay.classList.add('hidden');
    renderBest();

    // Build a shuffled deck of 8 pairs.
    var deck = shuffled(ANIMALS.concat(ANIMALS));
    board.innerHTML = '';
    deck.forEach(function (animal) {
      var card = document.createElement('div');
      card.className = 'mcard';
      card.dataset.animal = animal;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', 'Memory card');
      card.innerHTML =
        '<div class="inner">' +
          '<div class="mface back">?</div>' +
          '<div class="mface front">' + animal + '</div>' +
        '</div>';
      card.addEventListener('click', function () { onCardClick(card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(card); }
      });
      board.appendChild(card);
    });
  }

  restartBtn.addEventListener('click', newGame);
  againBtn.addEventListener('click', newGame);
  newGame();
})();
