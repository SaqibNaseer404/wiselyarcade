// Daily Sudoku — one puzzle per day, picked by day-of-year from SUDOKU_PUZZLES.
// Number pad input, pencil (notes) mode, 3-mistake limit, timer, win state.
// Best daily time saved in localStorage.
(function () {
  'use strict';

  // ---- Glossy 3D "candy tile" visual theme (visuals only — no game logic) ----
  // Injected after style.css, so these rules override the flat board look with
  // beveled 3D tiles, specular highlights, embossed givens and chunky buttons.
  (function injectSudokuGloss() {
    var css =
    /* Premium machined board: dark walnut frame, warm paper cells (visuals only) */
    '.sboard{border:none;border-radius:16px;padding:10px;gap:2px;' +
      'background:linear-gradient(155deg,#3a3128 0%,#241d16 55%,#171209 100%);' +
      'box-shadow:0 22px 44px rgba(23,16,6,.45),0 4px 10px rgba(23,16,6,.30),' +
      'inset 0 2px 2px rgba(255,235,190,.25),inset 0 -3px 6px rgba(0,0,0,.50);}' +
    /* Paper cells: warm ivory, hairline ring, soft depth */
    '.scell{border:none;margin:0;border-radius:5px;' +
      'font-family:"Barlow Condensed",sans-serif;font-weight:600;' +
      'font-size:clamp(1.15rem,5vw,1.7rem);' +
      'background:linear-gradient(150deg,#fffdf4 0%,#faf3e0 60%,#f1e7cd 100%);' +
      'box-shadow:inset 0 0 0 1px rgba(120,100,60,.18),inset 2px 2px 0 rgba(255,255,255,.85),inset -2px -2px 3px rgba(120,95,40,.15),0 1px 2px rgba(20,14,4,.30);' +
      'text-shadow:0 1px 0 rgba(255,255,255,.55);}' +
    /* Strong 3x3 box separators (inset shadows: no layout shift) */
    '.scell.br{box-shadow:inset 0 0 0 1px rgba(120,100,60,.18),inset 2px 2px 0 rgba(255,255,255,.85),inset -2px -2px 3px rgba(120,95,40,.15),0 1px 2px rgba(20,14,4,.30),inset -4px 0 0 0 rgba(30,22,10,.88)}' +
    '.scell.bb{box-shadow:inset 0 0 0 1px rgba(120,100,60,.18),inset 2px 2px 0 rgba(255,255,255,.85),inset -2px -2px 3px rgba(120,95,40,.15),0 1px 2px rgba(20,14,4,.30),inset 0 -4px 0 0 rgba(30,22,10,.88)}' +
    '.scell.br.bb{box-shadow:inset 0 0 0 1px rgba(120,100,60,.18),inset 2px 2px 0 rgba(255,255,255,.85),inset -2px -2px 3px rgba(120,95,40,.15),0 1px 2px rgba(20,14,4,.30),inset -4px 0 0 0 rgba(30,22,10,.88),' +
      'inset 0 -4px 0 0 rgba(30,22,10,.88)}' +
    /* Given numbers: deep engraved ink */
    '.scell.given{color:#22262d;font-weight:700;' +
      'text-shadow:0 1px 0 rgba(255,255,255,.9),0 -1px 1px rgba(0,0,0,.20);}' +
    /* Player digits: rich indigo ink */
    '.scell:not(.given){color:#2f3fb4;font-weight:600;' +
      'text-shadow:0 1px 0 rgba(255,255,255,.55),0 2px 3px rgba(47,63,180,.18);}' +
    /* Selected cell: warm amber ring */
    '.scell.sel{background:linear-gradient(150deg,#fff6da 0%,#ffeec0 60%,#ffe49a 100%);' +
      'box-shadow:inset 0 0 0 3px #d9930d,inset 2px 2px 0 rgba(255,255,255,.9),' +
      '0 0 16px 4px rgba(217,147,13,.50),0 1px 3px rgba(20,14,4,.35);}' +
    /* Same row/column/box: soft warm wash */
    '.scell.peer{background:linear-gradient(150deg,#fbf2d9 0%,#f6ead0 60%,#efe0ba 100%);}' +
    /* Cells with the same value: gentle gold glow */
    '.scell.same{background:linear-gradient(150deg,#ffedb5 0%,#ffe28f 55%,#ffd766 100%);' +
      'box-shadow:inset 2px 2px 0 rgba(255,255,255,.9),inset -2px -2px 3px rgba(180,120,20,.30),' +
      '0 0 9px rgba(230,170,40,.55);}' +
    /* Wrong-entry flash: classy crimson */
    '.scell.err{background:linear-gradient(150deg,#f9d7d2 0%,#f2b3ab 60%,#e88a80 100%)!important;' +
      'color:#8f1d17;' +
      'box-shadow:inset 0 0 0 2px #b3261e,inset 2px 2px 0 rgba(255,255,255,.6),' +
      '0 0 12px rgba(179,38,30,.45);}' +
    /* Number pad: chunky dark key tiles */
    '.pad{gap:10px}' +
    '.pad button{border:none;border-radius:13px;padding:11px 0;position:relative;' +
      'font-family:"Barlow Condensed",sans-serif;' +
      'background:linear-gradient(165deg,#3a4152 0%,#262b36 55%,#1b1f27 100%);' +
      'box-shadow:0 5px 0 #0d0f13,0 10px 16px rgba(15,12,4,.35),' +
      'inset 0 2px 2px rgba(255,255,255,.28),inset 0 -3px 5px rgba(0,0,0,.40);' +
      'color:#f5edd8;font-weight:700;font-size:1.45rem;letter-spacing:.02em;' +
      'text-shadow:0 1px 2px rgba(0,0,0,.5);cursor:pointer;' +
      'transition:transform .06s ease,box-shadow .06s ease;}' +
    '.pad button:hover{filter:brightness(1.08)}' +
    '.pad button:active{transform:translateY(4px);' +
      'box-shadow:0 1px 0 #0d0f13,0 3px 6px rgba(15,12,4,.32),' +
      'inset 0 2px 2px rgba(255,255,255,.28),inset 0 -2px 4px rgba(0,0,0,.4);}' +
    /* Pad key for the selected cell's number lights amber (.lit set by a page script) */
    '.pad button.lit{background:linear-gradient(165deg,#ffd97a 0%,#f2b544 55%,#dd9413 100%);' +
      'color:#33240a;text-shadow:0 1px 0 rgba(255,255,255,.5);' +
      'box-shadow:0 5px 0 #9a6a12,0 10px 18px rgba(217,147,13,.45),' +
      'inset 0 2px 2px rgba(255,255,255,.65),inset 0 -3px 5px rgba(150,95,10,.35);}' +
    /* Erase tool: warm amber tile */
    '.pad button.tool{' +
      'background:linear-gradient(165deg,#f3d9a4 0%,#e5b95f 55%,#d29a35 100%);' +
      'box-shadow:0 5px 0 #8a5f14,0 10px 16px rgba(150,100,20,.32),' +
      'inset 0 2px 2px rgba(255,255,255,.7),inset 0 -3px 5px rgba(140,95,20,.3);' +
      'color:#4a3208;font-size:1.05rem;}' +
    '.pad button.tool:active{transform:translateY(4px);' +
      'box-shadow:0 1px 0 #8a5f14,0 3px 6px rgba(150,100,20,.3),' +
      'inset 0 2px 2px rgba(255,255,255,.7),inset 0 -2px 4px rgba(140,95,20,.3);}' +
    /* Pencil notes: small slate digits */
    '.scell .notes{inset:3px}' +
    '.scell .notes span{font-family:"Barlow Condensed",sans-serif;font-weight:600;' +
      'color:#68707e;text-shadow:0 1px 0 rgba(255,255,255,.7)}' +
    /* Selected cell: calm amber breathing pulse */
    '.scell.sel{animation:sudoku-sel-pulse 1.8s ease-in-out infinite}' +
    '@keyframes sudoku-sel-pulse{' +
      '0%,100%{box-shadow:inset 0 0 0 3px #d9930d,inset 2px 2px 0 rgba(255,255,255,.9),' +
        '0 0 14px 3px rgba(217,147,13,.45),0 1px 3px rgba(20,14,4,.35)}' +
      '50%{box-shadow:inset 0 0 0 3px #e8a33d,inset 2px 2px 0 rgba(255,255,255,.9),' +
        '0 0 22px 6px rgba(232,163,61,.65),0 1px 3px rgba(20,14,4,.35)}}' +
    /* Same-number cells: soft shimmer sweep */
    '.scell.same{position:relative;overflow:hidden}' +
    '.scell.same::after{content:"";position:absolute;top:0;bottom:0;width:45%;left:-60%;' +
      'background:linear-gradient(100deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.45) 50%,rgba(255,255,255,0) 100%);' +
      'animation:sudoku-shimmer 2.2s ease-in-out infinite;pointer-events:none}' +
    '@keyframes sudoku-shimmer{0%{left:-60%}60%,100%{left:130%}}' +
    /* Completed row/column/box: one-shot golden sweep */
    '.scell.unit-done{animation:sudoku-unit-done .9s ease}' +
    '@keyframes sudoku-unit-done{' +
      '0%{box-shadow:inset 2px 2px 0 rgba(255,255,255,.85),inset -2px -2px 3px rgba(120,95,40,.15),0 0 0 rgba(233,180,60,0)}' +
      '40%{box-shadow:inset 2px 2px 0 rgba(255,255,255,.85),inset -2px -2px 3px rgba(120,95,40,.15),0 0 18px 4px rgba(233,180,60,.85)}' +
      '100%{box-shadow:inset 2px 2px 0 rgba(255,255,255,.85),inset -2px -2px 3px rgba(120,95,40,.15),0 0 0 rgba(233,180,60,0)}}';
    var style = document.createElement('style');
    style.id = 'sudoku-3d-theme';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  })();

  var BEST_KEY = 'wisely_sudoku_best';

  var boardEl = document.getElementById('sboard');
  var padEl = document.getElementById('spad');
  var timeEl = document.getElementById('d-time');
  var mistakesEl = document.getElementById('d-mistakes');
  var bestEl = document.getElementById('d-best');
  var metaEl = document.getElementById('d-meta');
  var winOverlay = document.getElementById('d-win');
  var winStats = document.getElementById('d-win-stats');
  var overOverlay = document.getElementById('d-over');
  var notesBtn = document.getElementById('d-notes');
  var restartBtn = document.getElementById('d-restart');
  var againBtn = document.getElementById('d-again');
  var retryBtn = document.getElementById('d-retry');

  // ---- Pick today's puzzle ----
  var now = new Date();
  var startOfYear = new Date(now.getFullYear(), 0, 0);
  var dayOfYear = Math.floor((now - startOfYear) / 864e5);
  var puzzleIndex = dayOfYear % SUDOKU_PUZZLES.length;
  var PUZZLE = SUDOKU_PUZZLES[puzzleIndex].puzzle;
  var SOLUTION = SUDOKU_PUZZLES[puzzleIndex].solution;

  var given = [];    // true where the puzzle has a pre-filled number
  var value = [];    // player's entries (0 = empty)
  var notes = [];    // Set of pencil marks per cell
  var selected = -1;
  var mistakes = 0;
  var pencil = false;
  var seconds = 0;
  var timerId = null;
  var timerOn = false;
  var done = false;

  var MONTHS = ['January','February','March','April','May','June','July',
                'August','September','October','November','December'];

  function fmt(s) {
    var m = Math.floor(s / 60), sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function getBest() {
    try {
      var raw = localStorage.getItem(BEST_KEY);
      return raw ? parseInt(raw, 10) : null;
    } catch (e) { return null; }
  }
  function renderBest() {
    var b = getBest();
    bestEl.textContent = b != null ? fmt(b) : '—';
  }

  function startTimer() {
    if (timerOn || done) return;
    timerOn = true;
    timerId = setInterval(function () {
      seconds++;
      timeEl.textContent = fmt(seconds);
    }, 1000);
  }
  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    timerOn = false;
  }

  function rowOf(i) { return Math.floor(i / 9); }
  function colOf(i) { return i % 9; }
  function boxOf(i) { return Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3); }
  function isPeer(a, b) {
    return a !== b && (rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b));
  }

  function buildBoard() {
    boardEl.innerHTML = '';
    for (var i = 0; i < 81; i++) {
      (function (idx) {
        var cell = document.createElement('div');
        cell.className = 'scell';
        cell.id = 'sc' + idx;
        if (colOf(idx) === 2 || colOf(idx) === 5) cell.classList.add('br');
        if (rowOf(idx) === 2 || rowOf(idx) === 5) cell.classList.add('bb');
        if (given[idx]) {
          cell.classList.add('given');
          cell.textContent = PUZZLE[idx];
        } else {
          cell.innerHTML = '<div class="notes"></div>';
        }
        cell.addEventListener('click', function () { select(idx); });
        boardEl.appendChild(cell);
      })(i);
    }
  }

  function cellEl(i) { return document.getElementById('sc' + i); }

  function renderNotes(i) {
    var cell = cellEl(i);
    var holder = cell.querySelector('.notes');
    if (!holder) return;
    var html = '';
    for (var n = 1; n <= 9; n++) {
      html += '<span>' + (notes[i].has(n) ? n : '') + '</span>';
    }
    holder.innerHTML = html;
  }

  function paint() {
    for (var i = 0; i < 81; i++) {
      var cell = cellEl(i);
      cell.classList.remove('sel', 'peer', 'same');
      if (!given[i]) {
        // Show the player's value (or their pencil notes).
        var v = value[i];
        var holder = cell.querySelector('.notes');
        if (v !== 0) {
          cell.textContent = v;
        } else {
          if (!holder) cell.innerHTML = '<div class="notes"></div>';
          renderNotes(i);
        }
      }
      // Highlights apply to given cells too.
      if (selected >= 0) {
        if (i === selected) cell.classList.add('sel');
        else if (isPeer(i, selected)) cell.classList.add('peer');
        var sv = selectedValue();
        if (sv !== 0 && shownValue(i) === sv) cell.classList.add('same');
      }
    }
  }

  function shownValue(i) { return given[i] ? parseInt(PUZZLE[i], 10) : value[i]; }
  function selectedValue() { return selected >= 0 ? shownValue(selected) : 0; }

  function select(i) {
    if (done) return;
    selected = (selected === i) ? -1 : i;
    paint();
  }

  function renderMistakes() {
    var dots = '';
    for (var i = 0; i < 3; i++) dots += i < mistakes ? '●' : '○';
    mistakesEl.innerHTML = '<span class="mistakes">' + dots + '</span>';
  }

  function flashError(i) {
    var cell = cellEl(i);
    cell.classList.add('err');
    setTimeout(function () { cell.classList.remove('err'); }, 350);
  }

  // ---- Round 1: one-shot celebration glow when a row/column/box completes ----
  function cellCorrect(k) {
    return given[k] ? true : (value[k] !== 0 && SOLUTION[k] === String(value[k]));
  }
  function unitCells(kind, i) {
    var r = Math.floor(i / 9), c = i % 9, cells = [], k, dr, dc;
    if (kind === 'row') { for (k = 0; k < 9; k++) cells.push(r * 9 + k); }
    else if (kind === 'col') { for (k = 0; k < 9; k++) cells.push(k * 9 + c); }
    else {
      var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (dr = 0; dr < 3; dr++) for (dc = 0; dc < 3; dc++) cells.push((br + dr) * 9 + bc + dc);
    }
    return cells;
  }
  function celebrateUnits(i) {
    ['row', 'col', 'box'].forEach(function (kind) {
      var cells = unitCells(kind, i);
      var complete = cells.every(function (k) { return cellCorrect(k); });
      if (!complete) return;
      cells.forEach(function (k, idx) {
        var cell = cellEl(k);
        cell.classList.add('unit-done');
        cell.style.animationDelay = (idx * 45) + 'ms'; // ripple across the unit
      });
      setTimeout(function () {
        cells.forEach(function (k) {
          var cell = cellEl(k);
          cell.classList.remove('unit-done');
          cell.style.animationDelay = '';
        });
      }, 1300);
    });
  }

  // Remove note `n` from all peers of cell i (standard Sudoku helper).
  function clearPeerNotes(i, n) {
    for (var k = 0; k < 81; k++) {
      if (k !== i && !given[k] && value[k] === 0 && notes[k].has(n)) {
        notes[k].delete(n);
      }
    }
  }

  function enterNumber(n) {
    if (done || selected < 0 || given[selected]) return;
    startTimer();
    var i = selected;

    if (pencil) {
      if (value[i] !== 0) return;
      if (notes[i].has(n)) notes[i].delete(n); else notes[i].add(n);
      paint();
      return;
    }

    if (value[i] === n) {
      value[i] = 0; // tapping the same number clears it (no penalty)
      paint();
      return;
    }

    if (SOLUTION[i] === String(n)) {
      value[i] = n;
      notes[i].clear();
      clearPeerNotes(i, n);
      paint();
      celebrateUnits(i); // Round 1: celebration glow on completed row/col/box
      checkWin();
    } else {
      mistakes++;
      renderMistakes();
      flashError(i);
      if (mistakes >= 3) gameOver();
    }
  }

  function erase() {
    if (done || selected < 0 || given[selected]) return;
    startTimer();
    value[selected] = 0;
    notes[selected].clear();
    paint();
  }

  function checkWin() {
    for (var i = 0; i < 81; i++) {
      if (given[i]) continue;
      if (value[i] === 0 || SOLUTION[i] !== String(value[i])) return;
    }
    done = true;
    stopTimer();
    var b = getBest();
    var isBest = (b == null || seconds < b);
    if (isBest) {
      try { localStorage.setItem(BEST_KEY, String(seconds)); } catch (e) {}
    }
    renderBest();
    winStats.innerHTML =
      'Puzzle #' + (puzzleIndex + 1) + ' solved in <strong>' + fmt(seconds) + '</strong>' +
      ' with <strong>' + mistakes + '</strong> mistake' + (mistakes === 1 ? '' : 's') + '.' +
      (isBest ? '<br><strong>New best time!</strong>' : '<br>Come back tomorrow for a fresh puzzle.');
    winOverlay.classList.remove('hidden');
  }

  function gameOver() {
    done = true;
    stopTimer();
    overOverlay.classList.remove('hidden');
  }

  function newDay() {
    for (var i = 0; i < 81; i++) {
      given[i] = PUZZLE[i] !== '0';
      value[i] = 0;
      notes[i] = new Set();
    }
    selected = -1;
    mistakes = 0;
    pencil = false;
    seconds = 0;
    done = false;
    stopTimer();
    notesBtn.classList.remove('on');
    notesBtn.textContent = '✎ Notes: Off';
    winOverlay.classList.add('hidden');
    overOverlay.classList.add('hidden');
    timeEl.textContent = '0:00';
    renderMistakes();
    renderBest();
    metaEl.textContent = 'Puzzle #' + (puzzleIndex + 1) + ' · ' +
      MONTHS[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
    buildBoard();
    paint();
    // Pre-select the first empty cell so the number pad works immediately.
    for (var k = 0; k < 81; k++) {
      if (!given[k]) { select(k); break; }
    }
  }

  // ---- Number pad ----
  for (var n = 1; n <= 9; n++) {
    (function (num) {
      var b = document.createElement('button');
      b.textContent = num;
      b.setAttribute('aria-label', 'Enter ' + num);
      b.addEventListener('click', function () { enterNumber(num); });
      padEl.appendChild(b);
    })(n);
  }
  // Second row: erase, notes toggle, restart.
  var eraseB = document.createElement('button');
  eraseB.textContent = '⌫';
  eraseB.className = 'tool';
  eraseB.id = 'd-erase';
  eraseB.setAttribute('aria-label', 'Erase');
  eraseB.addEventListener('click', erase);
  padEl.appendChild(eraseB);

  // (notesBtn, restartBtn already exist in the page markup)
  notesBtn.addEventListener('click', function () {
    pencil = !pencil;
    notesBtn.classList.toggle('on', pencil);
    notesBtn.textContent = '✎ Notes: ' + (pencil ? 'On' : 'Off');
  });
  restartBtn.addEventListener('click', function () {
    if (confirm('Restart today\'s puzzle? Your current progress will be cleared.')) newDay();
  });
  againBtn.addEventListener('click', newDay);
  retryBtn.addEventListener('click', newDay);

  // Keyboard: 1-9 to enter, Backspace/Delete to erase, N for notes.
  document.addEventListener('keydown', function (e) {
    if (done) return;
    if (e.key >= '1' && e.key <= '9') enterNumber(parseInt(e.key, 10));
    else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); erase(); }
    else if (e.key === 'n' || e.key === 'N') notesBtn.click();
  });

  newDay();
})();
