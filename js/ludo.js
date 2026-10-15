/* Wisely Ludo — classic Ludo vs 3 computer opponents.
   Lesson: "You can't control the dice — only how you play the roll." */
(function () {
'use strict';

/* ---------- board geometry (15x15 grid) ---------- */
var TRACK = [
  [0,6],[1,6],[2,6],[3,6],[4,6],[5,6],
  [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
  [7,0],[8,0],
  [8,1],[8,2],[8,3],[8,4],[8,5],
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
  [14,7],
  [14,8],[13,8],[12,8],[11,8],[10,8],[9,8],
  [8,9],[8,10],[8,11],[8,12],[8,13],[8,14],
  [7,14],[6,14],
  [6,13],[6,12],[6,11],[6,10],[6,9],
  [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
  [0,7]
];
var COLORS = ['red', 'green', 'yellow', 'blue'];
var CNAME = { red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue' };
var START = { red: 0, green: 14, yellow: 27, blue: 40 };
var HOME_STRETCH = {
  red:    [[1,7],[2,7],[3,7],[4,7],[5,7]],
  green:  [[7,1],[7,2],[7,3],[7,4],[7,5]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7]],
  blue:   [[7,13],[7,12],[7,11],[7,10],[7,9]]
};
var SAFE = [0, 8, 14, 21, 27, 34, 40, 47];
var BASE_POS = {
  red:    [[1.7,1.7],[3.3,1.7],[1.7,3.3],[3.3,3.3]],
  green:  [[10.7,1.7],[12.3,1.7],[10.7,3.3],[12.3,3.3]],
  yellow: [[10.7,10.7],[12.3,10.7],[10.7,12.3],[12.3,12.3]],
  blue:   [[1.7,10.7],[3.3,10.7],[1.7,12.3],[3.3,12.3]]
};
var HEX = { red: '#ef4444', green: '#22c55e', yellow: '#eab308', blue: '#3b82f6' };

// steps: -1 = base, 0..50 = track, 51..55 = home stretch, 56 = home
function trackIdx(color, steps) { return (START[color] + steps) % 52; }
function cellOf(color, steps, ti) {
  if (steps <= 50) { var t = TRACK[trackIdx(color, steps)]; return [t[0], t[1]]; }
  var h = HOME_STRETCH[color][steps - 51]; return [h[0], h[1]];
}
function isSafe(color, steps) {
  return steps <= 50 && SAFE.indexOf(trackIdx(color, steps)) !== -1;
}

/* ---------- state ---------- */
var players, turn, dice, sixes, movable, phase, finishes;
var humanColor = 'red';

function newGame() {
  players = COLORS.map(function (c) {
    return { color: c, ai: c !== humanColor, tokens: [-1, -1, -1, -1] };
  });
  // human first
  players.sort(function (a, b) { return (a.color === humanColor ? 0 : 1) - (b.color === humanColor ? 0 : 1); });
  turn = 0; sixes = 0; movable = []; phase = 'roll'; finishes = [];
  renderAll();
  setMsg('Your turn — roll the dice!');
  updateDiceBtn();
}

function cur() { return players[turn]; }

function setMsg(t) { document.getElementById('msg').textContent = t; }

function rollDice() {
  if (phase !== 'roll' || cur().ai) return;
  doRoll();
}
function doRoll() {
  dice = 1 + Math.floor(Math.random() * 6);
  drawDice(dice);
  if (dice === 6) sixes++; else sixes = 0;
  if (sixes === 3) {
    setMsg(CNAME[cur().color] + ' rolled three 6s — turn skipped!');
    sixes = 0;
    setTimeout(nextTurn, 1200);
    return;
  }
  movable = legalMoves(cur(), dice);
  if (!movable.length) {
    setMsg(CNAME[cur().color] + ' rolled ' + dice + ' — no move possible.');
    setTimeout(nextTurn, 1100);
    return;
  }
  phase = 'move';
  if (cur().ai) {
    setMsg(CNAME[cur().color] + ' rolled ' + dice + '…');
    setTimeout(function () {
      var mv = aiChoose(cur(), dice, movable);
      applyMove(cur(), mv.ti, dice);
    }, 900);
  } else {
    setMsg('You rolled ' + dice + ' — tap a glowing token.');
    highlightMovable();
  }
  updateDiceBtn();
}

function legalMoves(pl, d) {
  var out = [];
  for (var i = 0; i < 4; i++) {
    var s = pl.tokens[i];
    if (s === 56) continue;
    if (s === -1) { if (d === 6) out.push({ ti: i, to: 0 }); continue; }
    var to = s + d;
    if (to > 56) continue;
    out.push({ ti: i, to: to });
  }
  return out;
}

function applyMove(pl, ti, d) {
  var from = pl.tokens[ti];
  var mv = null;
  for (var k = 0; k < movable.length; k++) if (movable[k].ti === ti) mv = movable[k];
  if (!mv) return;
  pl.tokens[ti] = mv.to;
  var extra = (d === 6);
  var captured = false;
  // captures
  if (mv.to <= 50 && !isSafe(pl.color, mv.to)) {
    var sq = trackIdx(pl.color, mv.to);
    players.forEach(function (q) {
      if (q === pl) return;
      for (var j = 0; j < 4; j++) {
        var qs = q.tokens[j];
        if (qs >= 0 && qs <= 50 && trackIdx(q.color, qs) === sq) {
          q.tokens[j] = -1; captured = true;
        }
      }
    });
  }
  if (captured) extra = true;
  if (mv.to === 56) {
    extra = true;
    if (pl.tokens.every(function (t) { return t === 56; }) && finishes.indexOf(pl.color) === -1) {
      finishes.push(pl.color);
      renderAll();
      if (finishes.length === 1) {
        endGame(pl.color);
        return;
      }
    }
  }
  renderAll();
  movable = [];
  if (extra) {
    phase = 'roll';
    setMsg(CNAME[pl.color] + (pl.ai ? ' goes again!' : ' — roll again!'));
    if (pl.ai) setTimeout(doRoll, 900); else updateDiceBtn();
  } else {
    nextTurn();
  }
}

function nextTurn() {
  movable = []; phase = 'roll'; sixes = 0;
  // skip finished players
  var guard = 0;
  do { turn = (turn + 1) % 4; guard++; }
  while (finishes.indexOf(players[turn].color) !== -1 && guard < 8);
  renderAll();
  updateDiceBtn();
  if (cur().ai) {
    setMsg(CNAME[cur().color] + "'s turn…");
    setTimeout(doRoll, 900);
  } else {
    setMsg('Your turn — roll the dice!');
  }
}

function aiChoose(pl, d, moves) {
  var best = moves[0], bs = -1e9;
  for (var i = 0; i < moves.length; i++) {
    var m = moves[i], s = Math.random() * 6;
    var from = pl.tokens[m.ti];
    if (from === -1) s += 60;                       // get out of base
    if (m.to === 56) s += 55;                       // bring home
    else if (m.to >= 51) s += 30 + (m.to - 51) * 4; // home stretch
    if (m.to <= 50) {
      var sq = trackIdx(pl.color, m.to);
      var danger = false, prey = false;
      players.forEach(function (q) {
        if (q === pl) return;
        for (var j = 0; j < 4; j++) {
          var qs = q.tokens[j];
          if (qs >= 0 && qs <= 50 && trackIdx(q.color, qs) === sq) {
            if (SAFE.indexOf(sq) === -1) prey = true;
          }
        }
      });
      if (prey) s += 45;
      if (isSafe(pl.color, m.to)) s += 18;
      // leaving a safe square into danger?
      if (from >= 0 && from <= 50 && isSafe(pl.color, from) && !isSafe(pl.color, m.to)) s -= 12;
      // landing where an enemy sits 1-6 behind (rough danger)
      for (var back = 1; back <= 6; back++) {
        var bsq = (sq - back + 52) % 52;
        var threat = false;
        players.forEach(function (q) {
          if (q === pl || threat) return;
          for (var j = 0; j < 4; j++) {
            var qs = q.tokens[j];
            if (qs >= 0 && qs <= 50 && trackIdx(q.color, qs) === bsq && SAFE.indexOf(sq) === -1) threat = true;
          }
        });
        if (threat) { s -= 8; break; }
      }
      s += m.to * 0.35; // prefer advanced tokens
    }
    if (s > bs) { bs = s; best = m; }
  }
  return best;
}

function endGame(winnerColor) {
  phase = 'over';
  var you = winnerColor === humanColor;
  document.getElementById('end-title').textContent = you ? '🏆 You win!' : CNAME[winnerColor] + ' wins';
  document.getElementById('end-msg').textContent = you
    ? 'All four tokens home — beautifully played!'
    : 'The ' + winnerColor + ' player got all four tokens home first. Rematch?';
  document.getElementById('gameover').classList.add('show');
}

/* ---------- rendering ---------- */
var boardEl = document.getElementById('ludo-board');

function buildBoard() {
  boardEl.innerHTML = '';
  // 15x15 cells
  for (var r = 0; r < 15; r++) for (var c = 0; c < 15; c++) {
    var d = document.createElement('div');
    d.className = 'lcell';
    d.dataset.c = c; d.dataset.r = r;
    boardEl.appendChild(d);
  }
  paintStatic();
  // token layer
  var layer = document.createElement('div');
  layer.id = 'tokens';
  boardEl.appendChild(layer);
}
function cellAt(c, r) {
  return boardEl.querySelector('.lcell[data-c="' + c + '"][data-r="' + r + '"]');
}
function paintStatic() {
  // home bases
  var bases = { red: [0, 0], green: [9, 0], yellow: [9, 9], blue: [0, 9] };
  COLORS.forEach(function (col) {
    var bx = bases[col][0], by = bases[col][1];
    for (var r = 0; r < 6; r++) for (var c = 0; c < 6; c++) {
      var cell = cellAt(bx + c, by + r);
      cell.classList.add('base-' + col);
    }
    var inner = cellAt(bx + 1, by + 1);
    // white inner panel via box: paint inner 4x4 white-ish
    for (var r2 = 1; r2 < 5; r2++) for (var c2 = 1; c2 < 5; c2++) {
      cellAt(bx + c2, by + r2).classList.add('base-inner');
    }
  });
  // track cells white
  TRACK.forEach(function (t) { cellAt(t[0], t[1]).classList.add('track'); });
  // start squares colored
  COLORS.forEach(function (col) {
    var t = TRACK[START[col]];
    cellAt(t[0], t[1]).classList.add('start-' + col);
    cellAt(t[0], t[1]).textContent = '★';
  });
  // safe stars
  SAFE.forEach(function (si) {
    var t = TRACK[si], cell = cellAt(t[0], t[1]);
    if (!cell.textContent) { cell.classList.add('safe'); cell.textContent = '☆'; }
  });
  // home stretches
  COLORS.forEach(function (col) {
    HOME_STRETCH[col].forEach(function (h) {
      cellAt(h[0], h[1]).classList.add('stretch-' + col);
    });
  });
  // center
  for (var r = 6; r < 9; r++) for (var c = 6; c < 9; c++) cellAt(c, r).classList.add('center-c');
}

function renderAll() {
  var layer = document.getElementById('tokens');
  layer.innerHTML = '';
  // count tokens per square for offsets
  var occ = {};
  players.forEach(function (pl) {
    for (var i = 0; i < 4; i++) {
      var key = pl.color + ':' + pl.tokens[i];
      occ[key] = (occ[key] || 0) + 1;
    }
  });
  var seen = {};
  players.forEach(function (pl) {
    for (var i = 0; i < 4; i++) {
      var s = pl.tokens[i], x, y;
      if (s === -1) { var bp = BASE_POS[pl.color][i]; x = bp[0]; y = bp[1]; }
      else if (s === 56) { x = 7; y = 7; }
      else { var cc = cellOf(pl.color, s); x = cc[0]; y = cc[1]; }
      var key = pl.color + ':' + s;
      seen[key] = (seen[key] || 0) + 1;
      var n = occ[key] || 1, k = seen[key] - 1;
      var ox = 0, oy = 0;
      if (n > 1) { ox = (k % 2 ? 0.22 : -0.22); oy = (k < 2 ? -0.22 : 0.22); if (n === 2) oy = 0; }
      var t = document.createElement('div');
      t.className = 'token tok-' + pl.color;
      t.style.left = ((x + 0.5 + ox) / 15 * 100) + '%';
      t.style.top = ((y + 0.5 + oy) / 15 * 100) + '%';
      t.dataset.pi = players.indexOf(pl);
      t.dataset.ti = i;
      if (phase === 'move' && !pl.ai && movable.some(function (m) { return m.ti === i; })) {
        t.classList.add('movable');
        t.addEventListener('click', onToken);
      }
      layer.appendChild(t);
    }
  });
  // turn banner dots
  var dots = document.querySelectorAll('.pdot');
  for (var d = 0; d < dots.length; d++) {
    dots[d].classList.toggle('active', players[turn] && dots[d].dataset.color === players[turn].color);
    var pl = null;
    for (var q = 0; q < players.length; q++) if (players[q].color === dots[d].dataset.color) pl = players[q];
    if (pl) dots[d].querySelector('.phome').textContent = pl.tokens.filter(function (t) { return t === 56; }).length + '/4';
  }
}

function onToken(e) {
  var pi = +e.currentTarget.dataset.pi, ti = +e.currentTarget.dataset.ti;
  if (phase !== 'move' || players[pi].ai) return;
  applyMove(players[pi], ti, dice);
}

function highlightMovable() { renderAll(); }

function drawDice(v) {
  var el = document.getElementById('dice');
  el.textContent = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][v - 1];
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}
function updateDiceBtn() {
  var b = document.getElementById('roll-btn');
  var mine = phase === 'roll' && !cur().ai;
  b.disabled = !mine;
  b.classList.toggle('ready', mine);
}

/* ---------- setup ---------- */
document.getElementById('roll-btn').addEventListener('click', rollDice);
document.getElementById('start-btn').addEventListener('click', function () {
  humanColor = document.querySelector('input[name="lcolor"]:checked').value;
  document.getElementById('setup').classList.remove('show');
  newGame();
});
document.getElementById('new-btn').addEventListener('click', function () {
  document.getElementById('gameover').classList.remove('show');
  document.getElementById('setup').classList.add('show');
});
document.getElementById('panel-new').addEventListener('click', function () {
  document.getElementById('setup').classList.add('show');
});

buildBoard();
drawDice(6);
})();
