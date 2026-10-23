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
var humanColor = 'red', gameMode = 'ai'; // 'ai' = you vs 1 computer | 2 | 3 | 4 humans
var humanCount = 1;
var OPP = { red: 'yellow', yellow: 'red', green: 'blue', blue: 'green' };

function aiTotal() { return players.filter(function (p) { return p.ai; }).length; }
function pname(pl) { // display name for messages
  if (pl.ai) return aiTotal() > 1 ? 'Computer (' + CNAME[pl.color] + ')' : 'Computer';
  if (humanCount === 1) return 'You';
  return 'Player ' + (pl.seat + 1);
}
function humanTurnMsg() {
  var pl = cur();
  return (humanCount === 1 ? 'Your turn' : pname(pl) + "'s turn") + ' — roll the dice!';
}

function newGame() {
  var humans, total;
  if (gameMode === 'ai') { humans = 1; total = 2; }
  else { humans = total = parseInt(gameMode, 10) || 2; }
  humanCount = humans;
  // seat order: your color first, then the opposite color, then the rest
  var order = [humanColor, OPP[humanColor]].concat(
    COLORS.filter(function (c) { return c !== humanColor && c !== OPP[humanColor]; })
  ).slice(0, total);
  players = order.map(function (c, i) {
    return { color: c, seat: i, ai: i >= humans, tokens: [-1, -1, -1, -1] };
  });
  turn = 0; sixes = 0; movable = []; phase = 'roll'; finishes = [];
  buildPdots();
  renderAll();
  setMsg(humanTurnMsg());
  updateDiceBtn();
}

function buildPdots() {
  var bar = document.getElementById('players-bar');
  bar.innerHTML = '';
  players.forEach(function (pl) {
    var d = document.createElement('div');
    d.className = 'pdot';
    d.dataset.color = pl.color;
    d.innerHTML = '<span class="swatch" style="background:' + HEX[pl.color] + '"></span>' +
      '<span class="pname"></span><span class="phome">0/4</span>';
    bar.appendChild(d);
  });
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
    setMsg(pname(cur()) + ' rolled three 6s — turn skipped!');
    sixes = 0;
    setTimeout(nextTurn, 1200);
    return;
  }
  movable = legalMoves(cur(), dice);
  if (!movable.length) {
    setMsg(pname(cur()) + ' rolled ' + dice + ' — no move possible.');
    setTimeout(nextTurn, 1100);
    return;
  }
  phase = 'move';
  if (cur().ai) {
    setMsg(pname(cur()) + ' rolled ' + dice + '…');
    setTimeout(function () {
      var mv = aiChoose(cur(), dice, movable);
      applyMove(cur(), mv.ti, dice);
    }, 900);
  } else {
    setMsg(pname(cur()) + ' rolled ' + dice + ' — tap a glowing token.');
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
    setMsg(pname(pl) + (pl.ai ? ' goes again!' : ' — roll again!'));
    if (pl.ai) setTimeout(doRoll, 900); else updateDiceBtn();
  } else {
    nextTurn();
  }
}

function nextTurn() {
  movable = []; phase = 'roll'; sixes = 0;
  // skip finished players
  var guard = 0;
  do { turn = (turn + 1) % players.length; guard++; }
  while (finishes.indexOf(players[turn].color) !== -1 && guard <= players.length);
  renderAll();
  updateDiceBtn();
  if (cur().ai) {
    setMsg(pname(cur()) + "'s turn…");
    setTimeout(doRoll, 900);
  } else {
    setMsg(humanTurnMsg());
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
  var w = null;
  players.forEach(function (p) { if (p.color === winnerColor) w = p; });
  var humanWon = w && !w.ai;
  document.getElementById('end-title').textContent =
    humanWon ? ('🏆 ' + (humanCount === 1 ? 'You win!' : pname(w) + ' wins!')) : '🤖 Computer wins';
  document.getElementById('end-msg').textContent = humanWon
    ? 'All four tokens home — beautifully played!'
    : 'The computer got all four tokens home first. Rematch?';
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

/* render-only fx memory: the steps each token had at the previous render.
   Used solely to animate movement (glide) and captures (burst); never read
   by any game rule. */
var fxPrevSteps = {};

function renderAll() {
  var layer = document.getElementById('tokens');
  // remember where each token was drawn last time (render layer only)
  var prevPos = {};
  var oldToks = layer.querySelectorAll('.token');
  for (var oi = 0; oi < oldToks.length; oi++) {
    prevPos[oldToks[oi].dataset.pi + ':' + oldToks[oi].dataset.ti] =
      { left: oldToks[oi].style.left, top: oldToks[oi].style.top };
  }
  var fxOn = (phase === 'move');
  var bursts = [];
  layer.innerHTML = '';
  boardEl.setAttribute('data-turn', players[turn] ? players[turn].color : '');
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
      var lx = ((x + 0.5 + ox) / 15 * 100) + '%';
      var ly = ((y + 0.5 + oy) / 15 * 100) + '%';
      t.style.left = lx;
      t.style.top = ly;
      t.dataset.pi = players.indexOf(pl);
      t.dataset.ti = i;
      if (phase === 'move' && pl === cur() && movable.some(function (m) { return m.ti === i; })) {
        t.classList.add('movable');
        t.addEventListener('click', onToken);
      }
      layer.appendChild(t);
      // visual-only movement fx: glide from the previously drawn position,
      // pop-in when a capture sends this token back to base
      if (fxOn) {
        var pk = t.dataset.pi + ':' + i;
        var pp = prevPos[pk], ps = fxPrevSteps[pk];
        if (ps !== undefined && ps >= 0 && s === -1) {
          if (pp) bursts.push(pp);
          t.classList.add('spawn');
        } else if (pp && ps !== undefined && ps !== s) {
          var dx = Math.abs(parseFloat(lx) - parseFloat(pp.left));
          var dy = Math.abs(parseFloat(ly) - parseFloat(pp.top));
          if ((dx > 0.01 || dy > 0.01) && dx <= 57 && dy <= 57) {
            t.style.transition = 'none';
            t.style.left = pp.left; t.style.top = pp.top;
            void t.offsetWidth;
            t.style.transition = 'left .45s cubic-bezier(.25,.8,.35,1), top .45s cubic-bezier(.25,.8,.35,1)';
            t.style.left = lx; t.style.top = ly;
            t.classList.add('hop');
          }
        }
      }
    }
  });
  // capture bursts ride on the board itself so the next render cannot wipe them
  bursts.forEach(function (bp) {
    var b = document.createElement('div');
    b.className = 'fx-burst';
    b.style.left = bp.left; b.style.top = bp.top;
    boardEl.appendChild(b);
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 700);
  });
  // sync fx memory with the state just drawn
  fxPrevSteps = {};
  players.forEach(function (pl, pi) {
    for (var i = 0; i < 4; i++) fxPrevSteps[pi + ':' + i] = pl.tokens[i];
  });
  // turn banner dots
  var dots = document.querySelectorAll('.pdot');
  for (var d = 0; d < dots.length; d++) {
    dots[d].classList.toggle('active', players[turn] && dots[d].dataset.color === players[turn].color);
    var pl = null;
    for (var q = 0; q < players.length; q++) if (players[q].color === dots[d].dataset.color) pl = players[q];
    if (pl) {
      dots[d].querySelector('.phome').textContent = pl.tokens.filter(function (t) { return t === 56; }).length + '/4';
      var nm = dots[d].querySelector('.pname');
      if (nm) nm.textContent = (pl.ai ? '🤖 Computer' : (humanCount === 1 ? 'You' : 'P' + (pl.seat + 1))) + ' · ' + CNAME[pl.color];
    }
  }
}

function onToken(e) {
  var pi = +e.currentTarget.dataset.pi, ti = +e.currentTarget.dataset.ti;
  if (phase !== 'move' || pi !== turn || players[pi].ai) return;
  applyMove(players[pi], ti, dice);
}

function highlightMovable() { renderAll(); }

/* pip layouts on a 3x3 grid for the die face (render only — the rolled
   value still comes from doRoll exactly as before) */
var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function drawDice(v) {
  var el = document.getElementById('dice');
  var on = PIPS[v] || PIPS[1];
  var html = '';
  for (var i = 0; i < 9; i++) {
    var cls = 'pip';
    if (on.indexOf(i) !== -1) { cls += ' on'; if (v === 1) cls += ' mid'; }
    html += '<span class="' + cls + '"></span>';
  }
  el.innerHTML = html;
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
  gameMode = document.querySelector('input[name="pmode"]:checked').value;
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
