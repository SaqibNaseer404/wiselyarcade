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
    /* Glossy 3D frame around the grid */
    '.sboard{border:none;border-radius:16px;padding:10px;gap:2px;' +
      'background:linear-gradient(150deg,#2b4fb8 0%,#1e3a8a 45%,#152a66 100%);' +
      'box-shadow:0 18px 36px rgba(21,42,102,.45),0 4px 10px rgba(21,42,102,.35),' +
      'inset 0 2px 2px rgba(255,255,255,.35),inset 0 -3px 6px rgba(0,0,0,.35);}' +
    /* 3D beveled tiles: light top-left edge, dark bottom-right edge */
    '.scell{border:none;margin:0;border-radius:7px;' +
      'background:linear-gradient(145deg,#ffffff 0%,#f2f6fd 55%,#dfe8f8 100%);' +
      'box-shadow:inset 2px 2px 0 rgba(255,255,255,.9),inset -2px -2px 3px rgba(30,58,138,.22),' +
      '0 1px 2px rgba(21,42,102,.25);' +
      'text-shadow:0 1px 0 rgba(255,255,255,.65);}' +
    /* Thicker 3x3 box separators (inset shadows: no layout shift) */
    '.scell.br{box-shadow:inset 2px 2px 0 rgba(255,255,255,.9),inset -2px -2px 3px rgba(30,58,138,.22),' +
      '0 1px 2px rgba(21,42,102,.25),inset -4px 0 0 0 rgba(21,42,102,.85)}' +
    '.scell.bb{box-shadow:inset 2px 2px 0 rgba(255,255,255,.9),inset -2px -2px 3px rgba(30,58,138,.22),' +
      '0 1px 2px rgba(21,42,102,.25),inset 0 -4px 0 0 rgba(21,42,102,.85)}' +
    '.scell.br.bb{box-shadow:inset 2px 2px 0 rgba(255,255,255,.9),inset -2px -2px 3px rgba(30,58,138,.22),' +
      '0 1px 2px rgba(21,42,102,.25),inset -4px 0 0 0 rgba(21,42,102,.85),' +
      'inset 0 -4px 0 0 rgba(21,42,102,.85)}' +
    /* Given numbers: glossy embossed dark navy */
    '.scell.given{color:#0f2743;font-weight:900;' +
      'text-shadow:0 2px 0 rgba(255,255,255,.85),0 -1px 1px rgba(0,0,0,.28);}' +
    /* Player digits: clean blue with soft depth */
    '.scell:not(.given){color:#1d4ed8;font-weight:900;' +
      'text-shadow:0 2px 0 rgba(255,255,255,.6),0 3px 4px rgba(29,78,216,.22);}' +
    /* Selected cell: glowing 3D highlight ring */
    '.scell.sel{background:linear-gradient(145deg,#f8fcff 0%,#e3edfd 60%,#cfe0fb 100%);' +
      'box-shadow:inset 0 0 0 3px #1d4ed8,inset 2px 2px 0 rgba(255,255,255,.9),' +
      '0 0 14px 3px rgba(29,78,216,.55),0 1px 3px rgba(21,42,102,.4);}' +
    /* Same row/column/box: soft tint */
    '.scell.peer{background:linear-gradient(145deg,#fdf6e8 0%,#fbf0d8 55%,#f5e3b8 100%);}' +
    /* Cells with the same value: stronger glossy tint */
    '.scell.same{background:linear-gradient(145deg,#fff3d1 0%,#ffe8a8 55%,#ffd97a 100%);' +
      'box-shadow:inset 2px 2px 0 rgba(255,255,255,.9),inset -2px -2px 3px rgba(180,120,20,.3),' +
      '0 0 8px rgba(255,190,60,.55);}' +
    /* Wrong-entry flash: glossy red */
    '.scell.err{background:linear-gradient(145deg,#fecaca 0%,#fca5a5 60%,#f87171 100%)!important;' +
      'box-shadow:inset 2px 2px 0 rgba(255,255,255,.7),inset 0 0 0 2px #b91c1c,' +
      '0 0 12px rgba(185,28,28,.5);}' +
    /* Number pad: chunky glossy 3D buttons */
    '.pad{gap:10px}' +
    '.pad button{border:none;border-radius:14px;padding:11px 0;position:relative;' +
      'background:radial-gradient(circle at 30% 18%,#ffffff 0%,#eaf1fd 45%,#c9d8f5 100%);' +
      'box-shadow:0 5px 0 #8fa6d4,0 10px 16px rgba(30,60,120,.30),' +
      'inset 0 2px 2px rgba(255,255,255,.95),inset 0 -3px 5px rgba(90,120,190,.25);' +
      'color:#16295e;font-weight:900;font-size:1.25rem;' +
      'text-shadow:0 1px 0 rgba(255,255,255,.7);cursor:pointer;' +
      'transition:transform .06s ease,box-shadow .06s ease;}' +
    '.pad button:hover{filter:brightness(1.04)}' +
    '.pad button:active{transform:translateY(4px);' +
      'box-shadow:0 1px 0 #8fa6d4,0 3px 6px rgba(30,60,120,.28),' +
      'inset 0 2px 2px rgba(255,255,255,.95),inset 0 -2px 4px rgba(90,120,190,.25);}' +
    /* Erase tool button: coral gloss */
    '.pad button.tool{' +
      'background:radial-gradient(circle at 30% 18%,#ffd9c9 0%,#ffb49a 45%,#ff8f6b 100%);' +
      'box-shadow:0 5px 0 #c96a4b,0 10px 16px rgba(190,90,50,.32),' +
      'inset 0 2px 2px rgba(255,255,255,.85),inset 0 -3px 5px rgba(150,70,40,.28);' +
      'color:#5f2210;}' +
    '.pad button.tool:active{transform:translateY(4px);' +
      'box-shadow:0 1px 0 #c96a4b,0 3px 6px rgba(190,90,50,.3),' +
      'inset 0 2px 2px rgba(255,255,255,.85),inset 0 -2px 4px rgba(150,70,40,.28);}' +
    /* Pencil notes stay small and quiet */
    '.scell .notes{inset:3px}' +
    '.scell .notes span{color:#7c8db0;text-shadow:0 1px 0 rgba(255,255,255,.7)}';
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
