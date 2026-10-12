// Animal Memory Match — 4x4 flip-card matching game (Ages 5-9).
// Tracks moves + time; best score (fewest moves) saved in localStorage.
// VISUALS: glossy candy-3D style overrides are injected below (3D-STYLE block).
// Game logic is unchanged.
(function () {
  'use strict';

  /* ================= 3D-STYLE: glossy candy-3D card visuals =================
     Injected here (not in css/style.css) so the upgrade is self-contained.
     Beveled tiles, radial gloss, white specular highlights, soft shadows. */
  (function inject3DStyle() {
    if (document.getElementById('m3d-style')) return;
    var css = [
      /* Deeper perspective + soft floating shadow under every card */
      '.mcard{perspective:1100px;filter:drop-shadow(0 12px 14px rgba(46,32,120,.32))}',
      /* Springier flip */
      '.mcard .inner{transition:transform .5s cubic-bezier(.3,1.35,.5,1)}',
      '.mcard.flipped .inner{transform:rotateY(180deg)}',
      /* Press-down feel on unflipped cards */
      '.mcard:not(.flipped):active .inner{transform:scale(.93)}',

      /* Shared face: rounded tile, clip the sheen inside */
      '.mface{border-radius:20px;overflow:hidden}',

      /* ---- Card BACK: glossy beveled purple tile ---- */
      '.mface.back{',
      '  background:',
      '    radial-gradient(circle at 32% 20%, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 46%),',
      '    radial-gradient(circle at 72% 88%, rgba(20,8,60,.35) 0%, rgba(20,8,60,0) 58%),',
      '    linear-gradient(145deg,#b39dff 0%,#7c5cf0 48%,#4f33c4 100%);',
      '  border:none;',
      '  box-shadow:',
      '    inset 3px 3px 0 rgba(255,255,255,.6),',     /* bevel light top-left */
      '    inset -5px -5px 0 rgba(28,14,88,.42),',     /* bevel shade bottom-right */
      '    inset 0 0 0 2px rgba(255,255,255,.22);',
      '}',
      /* White specular highlight spot on the back */
      '.mface.back::before{',
      '  content:"";position:absolute;top:7%;left:9%;width:56%;height:30%;',
      '  border-radius:50%;transform:rotate(-16deg);pointer-events:none;',
      '  background:radial-gradient(ellipse at center, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 70%);',
      '}',
      /* Paw print: embossed glossy look */
      '.mface.back .paw{',
      '  font-size:clamp(1.8rem,10vw,2.6rem);line-height:1;',
      '  filter:drop-shadow(0 3px 2px rgba(20,8,60,.45)) brightness(1.12);',
      '}',

      /* ---- Card FRONT: glossy warm-cream tile ---- */
      '.mface.front{',
      '  background:',
      '    radial-gradient(circle at 32% 20%, rgba(255,255,255,.7) 0%, rgba(255,255,255,0) 46%),',
      '    linear-gradient(150deg,#fffdf6 0%,#fff1c9 55%,#ffd166 100%);',
      '  border:none;transform:rotateY(180deg);',
      '  box-shadow:',
      '    inset 3px 3px 0 rgba(255,255,255,.85),',
      '    inset -5px -5px 0 rgba(150,95,10,.32),',
      '    inset 0 0 0 2px rgba(255,255,255,.45);',
      '}',
      '.mface.front::before{',
      '  content:"";position:absolute;top:7%;left:9%;width:56%;height:30%;',
      '  border-radius:50%;transform:rotate(-16deg);pointer-events:none;',
      '  background:radial-gradient(ellipse at center, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 70%);',
      '}',
      /* Animal pops off the tile with a soft 3D shadow */
      '.mface.front .critter{',
      '  font-size:clamp(2.1rem,12vw,3.1rem);line-height:1;',
      '  filter:drop-shadow(0 6px 4px rgba(120,70,0,.32));',
      '}',

      /* ---- MATCHED pair: candy-green glow + pop ---- */
      '.mcard.matched{cursor:default}',
      '.mcard.matched .mface.front{',
      '  background:',
      '    radial-gradient(circle at 32% 20%, rgba(255,255,255,.7) 0%, rgba(255,255,255,0) 46%),',
      '    linear-gradient(150deg,#f4ffec 0%,#c4f5ae 55%,#6fe08a 100%);',
      '  box-shadow:',
      '    inset 3px 3px 0 rgba(255,255,255,.85),',
      '    inset -5px -5px 0 rgba(18,105,44,.38),',
      '    inset 0 0 0 3px rgba(46,204,113,.8),',
      '    0 0 24px rgba(46,204,113,.55);',
      '}',
      '.mcard.matched .inner{animation:m3d-pop .55s cubic-bezier(.3,1.4,.5,1)}',
      '@keyframes m3d-pop{',
      '  0%{transform:rotateY(180deg) scale(1)}',
      '  40%{transform:rotateY(180deg) scale(1.15)}',
      '  70%{transform:rotateY(180deg) scale(.97)}',
      '  100%{transform:rotateY(180deg) scale(1)}',
      '}',
      /* Gloss sweep across matched cards */
      '.mcard.matched .mface.front::after{',
      '  content:"";position:absolute;top:-25%;bottom:-25%;left:-50%;width:45%;',
      '  transform:skewX(-18deg);pointer-events:none;',
      '  background:linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,.9), rgba(255,255,255,0));',
      '  animation:m3d-sheen .7s ease .05s;',
      '}',
      '@keyframes m3d-sheen{from{left:-50%}to{left:135%}}',

      /* Respect reduced motion */
      '@media (prefers-reduced-motion:reduce){',
      '  .mcard .inner{transition-duration:.2s}',
      '  .mcard.matched .inner{animation:none}',
      '  .mcard.matched .mface.front::after{animation:none;display:none}',
      '}'
    ].join('\n');
    var el = document.createElement('style');
    el.id = 'm3d-style';
    el.textContent = css;
    document.head.appendChild(el);
  })();
  /* ================= end 3D-STYLE ================= */

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
          '<div class="mface back"><span class="paw">🐾</span></div>' +
          '<div class="mface front"><span class="critter">' + animal + '</span></div>' +
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
