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
      /* Premium card table: deeper perspective + soft table shadow */
      '.mcard{perspective:1200px;filter:drop-shadow(0 10px 12px rgba(4,26,20,.5))}',
      '.mcard:not(.flipped):hover{filter:drop-shadow(0 12px 14px rgba(4,26,20,.55)) brightness(1.08)}',
      '.mcard:focus-visible{outline:3px solid #f5a623;outline-offset:3px;border-radius:18px}',
      /* Smooth 3D flip (same class-driven timing model as before) */
      '.mcard .inner{transition:transform .5s cubic-bezier(.3,1.3,.5,1)}',
      '.mcard.flipped .inner{transform:rotateY(180deg)}',
      '.mcard:not(.flipped):active .inner{transform:scale(.94)}',

      /* Shared face: rounded playing-card tile, clip sheen inside */
      '.mface{border-radius:18px;overflow:hidden}',

      /* ---- Card BACK: deep teal-to-indigo woven tile with gold rim ---- */
      '.mface.back{',
      '  background:',
      '    radial-gradient(circle at 32% 18%, rgba(255,255,255,.34) 0%, rgba(255,255,255,0) 46%),',
      '    repeating-linear-gradient(45deg, rgba(255,255,255,.05) 0 2px, rgba(255,255,255,0) 2px 6px),',
      '    repeating-linear-gradient(-45deg, rgba(0,0,0,.07) 0 2px, rgba(0,0,0,0) 2px 6px),',
      '    radial-gradient(circle at 74% 90%, rgba(8,20,50,.4) 0%, rgba(8,20,50,0) 58%),',
      '    linear-gradient(150deg,#177d74 0%,#0f766e 34%,#134e6a 68%,#2b2a6e 100%);',
      '  border:none;',
      '  box-shadow:',
      '    inset 3px 3px 0 rgba(255,255,255,.35),',
      '    inset -5px -5px 0 rgba(4,16,44,.45),',
      '    inset 0 0 0 3px rgba(216,178,90,.95),',
      '    inset 0 0 0 5px rgba(90,60,8,.35),',
      '    inset 0 0 26px rgba(6,30,50,.35);',
      '}',
      /* Soft sheen spot on the back */
      '.mface.back::before{',
      '  content:"";position:absolute;top:6%;left:8%;width:54%;height:28%;',
      '  border-radius:50%;transform:rotate(-16deg);pointer-events:none;',
      '  background:radial-gradient(ellipse at center, rgba(255,255,255,.75) 0%, rgba(255,255,255,0) 70%);',
      '}',
      /* Paw print inside a gold-ring medallion */
      '.mface.back .paw{',
      '  display:flex;align-items:center;justify-content:center;',
      '  width:58%;aspect-ratio:1;border-radius:50%;',
      '  font-size:clamp(2rem,10.5vw,2.8rem);line-height:1;',
      '  background:radial-gradient(circle at 50% 36%, rgba(255,236,170,.28) 0%, rgba(255,214,110,.12) 58%, rgba(0,0,0,.12) 100%);',
      '  box-shadow:inset 0 0 0 2px rgba(240,199,102,.85), inset 0 3px 8px rgba(255,255,255,.25), inset 0 -6px 10px rgba(0,0,0,.3), 0 4px 10px rgba(2,12,30,.4);',
      '  filter:drop-shadow(0 2px 2px rgba(2,12,30,.5));',
      '}',

      /* ---- Card FRONT: clean ivory face ---- */
      '.mface.front{',
      '  background:',
      '    radial-gradient(circle at 50% 42%, #ffffff 0%, #fffaf0 52%, #f7ead0 100%);',
      '  border:none;transform:rotateY(180deg);',
      '  box-shadow:',
      '    inset 3px 3px 0 rgba(255,255,255,.9),',
      '    inset -5px -5px 0 rgba(146,104,32,.22),',
      '    inset 0 0 0 2px rgba(190,150,60,.5);',
      '}',
      '.mface.front::before{',
      '  content:"";position:absolute;top:6%;left:8%;width:54%;height:28%;',
      '  border-radius:50%;transform:rotate(-16deg);pointer-events:none;',
      '  background:radial-gradient(ellipse at center, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 70%);',
      '}',
      /* Animal in a soft spotlight disc, larger and crisper */
      '.mface.front .critter{',
      '  display:flex;align-items:center;justify-content:center;',
      '  width:74%;aspect-ratio:1;border-radius:50%;',
      '  font-size:clamp(2.3rem,12.5vw,3.3rem);line-height:1;',
      '  background:radial-gradient(circle at 50% 36%, #ffffff 0%, #fff6dc 56%, #ffe9ae 100%);',
      '  box-shadow:inset 0 2px 7px rgba(255,255,255,.95), inset 0 -7px 11px rgba(180,120,20,.2), 0 9px 15px rgba(96,64,4,.24);',
      '  filter:drop-shadow(0 4px 3px rgba(120,70,0,.25));',
      '}',

      /* ---- MATCHED pair: warm gold glow + celebratory pop ---- */
      '.mcard.matched{cursor:default}',
      '.mcard.matched .mface.front{',
      '  background:',
      '    radial-gradient(circle at 50% 42%, #fffef8 0%, #fff3cf 55%, #ffd873 100%);',
      '  box-shadow:',
      '    inset 3px 3px 0 rgba(255,255,255,.9),',
      '    inset -5px -5px 0 rgba(160,100,6,.3),',
      '    inset 0 0 0 3px rgba(245,166,35,.95),',
      '    0 0 26px rgba(245,180,40,.65);',
      '}',
      '.mcard.matched .mface.front .critter{',
      '  background:radial-gradient(circle at 50% 36%, #ffffff 0%, #ffedb8 55%, #ffd35e 100%);',
      '  box-shadow:inset 0 2px 7px rgba(255,255,255,.95), inset 0 -7px 11px rgba(180,110,10,.3), 0 9px 15px rgba(120,70,0,.3);',
      '}',
      '.mcard.matched .inner{animation:m3d-pop .55s cubic-bezier(.3,1.4,.5,1)}',
      '@keyframes m3d-pop{',
      '  0%{transform:rotateY(180deg) scale(1)}',
      '  40%{transform:rotateY(180deg) scale(1.15)}',
      '  70%{transform:rotateY(180deg) scale(.97)}',
      '  100%{transform:rotateY(180deg) scale(1)}',
      '}',
      /* Sparkle sweep across a just-matched pair */
      '.mcard.matched .mface.front::after{',
      '  content:"";position:absolute;top:-25%;bottom:-25%;left:-50%;width:45%;',
      '  transform:skewX(-18deg);pointer-events:none;',
      '  background:linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,.95), rgba(255,255,255,0));',
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
