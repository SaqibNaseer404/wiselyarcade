/* Wisely Chess — full-rules chess vs the computer.
   Lesson: "Every move has a consequence — think before you act." */
(function () {
'use strict';

/* ---------- board model ---------- */
// idx = r*8+c, r0 = rank 8 (top). piece = {t:'p n b r q k', c:'w'|'b'}
var VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// piece-square tables, from White's perspective (a1 = bottom-left => row 7)
var PST = {
p: [ 0, 0, 0, 0, 0, 0, 0, 0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10,
      5, 5,10,25,25,10, 5, 5,  0, 0, 0,20,20, 0, 0, 0,  5,-5,-10, 0, 0,-10,-5, 5,
      5,10,10,-20,-20,10,10, 5,  0, 0, 0, 0, 0, 0, 0, 0 ],
n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20, 0, 0, 0, 0,-20,-40, -30, 0,10,15,15,10, 0,-30,
    -30, 5,15,20,20,15, 5,-30, -30, 0,15,20,20,15, 0,-30, -30, 5,10,15,15,10, 5,-30,
    -40,-20, 0, 5, 5, 0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50 ],
b: [-20,-10,-10,-10,-10,-10,-10,-20, -10, 0, 0, 0, 0, 0, 0,-10, -10, 0, 5,10,10, 5, 0,-10,
    -10, 5, 5,10,10, 5, 5,-10, -10, 0,10,10,10,10, 0,-10, -10,10,10,10,10,10,10,-10,
    -10, 5, 0, 0, 0, 0, 5,-10, -20,-10,-10,-10,-10,-10,-10,-20 ],
r: [  0, 0, 0, 0, 0, 0, 0, 0,   5,10,10,10,10,10,10, 5,  -5, 0, 0, 0, 0, 0, 0,-5,
     -5, 0, 0, 0, 0, 0, 0,-5,  -5, 0, 0, 0, 0, 0, 0,-5,  -5, 0, 0, 0, 0, 0, 0,-5,
     -5, 0, 0, 0, 0, 0, 0,-5,   0, 0, 0, 5, 5, 0, 0, 0 ],
q: [-20,-10,-10, -5, -5,-10,-10,-20, -10, 0, 0, 0, 0, 0, 0,-10, -10, 0, 5, 5, 5, 5, 0,-10,
     -5, 0, 5, 5, 5, 5, 0, -5,   0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0,-10,
    -10, 0, 5, 0, 0, 0, 0,-10, -20,-10,-10, -5, -5,-10,-10,-20 ],
k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20, 0, 0, 0, 0, 20, 20,  20, 30,10, 0, 0,10,30,20 ]
};

var KN = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
var K8 = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
var DIAG = [[-1,-1],[-1,1],[1,-1],[1,1]];
var ORTH = [[-1,0],[1,0],[0,-1],[0,1]];

function G() { // fresh game state
  var b = new Array(64).fill(null);
  var back = ['r','n','b','q','k','b','n','r'];
  for (var c = 0; c < 8; c++) {
    b[c] = { t: back[c], c: 'b' }; b[8 + c] = { t: 'p', c: 'b' };
    b[48 + c] = { t: 'p', c: 'w' }; b[56 + c] = { t: back[c], c: 'w' };
  }
  return { board: b, turn: 'w', castle: { wk: true, wq: true, bk: true, bq: true },
           ep: -1, half: 0, reps: {} };
}
function opp(c) { return c === 'w' ? 'b' : 'w'; }
function rc(i) { return [Math.floor(i / 8), i % 8]; }
function at(b, r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? undefined : b[r * 8 + c]; }

function attacked(bd, sq, by) {
  var r = rc(sq)[0], c = rc(sq)[1], i, d, rr, cc, p;
  var pr = by === 'w' ? r + 1 : r - 1; // pawn attacks: white pawns sit one row below target
  for (i = 0; i < 2; i++) {
    p = at(bd, pr, c - 1 + i * 2);
    if (p && p.t === 'p' && p.c === by) return true;
  }
  for (i = 0; i < 8; i++) {
    p = at(bd, r + KN[i][0], c + KN[i][1]);
    if (p && p.t === 'n' && p.c === by) return true;
  }
  for (i = 0; i < 8; i++) {
    p = at(bd, r + K8[i][0], c + K8[i][1]);
    if (p && p.t === 'k' && p.c === by) return true;
  }
  var rays = [[DIAG, 'bq'], [ORTH, 'rq']];
  for (var k = 0; k < 2; k++) {
    var dirs = rays[k][0], ts = rays[k][1];
    for (i = 0; i < dirs.length; i++) {
      rr = r + dirs[i][0]; cc = c + dirs[i][1];
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        p = bd[rr * 8 + cc];
        if (p) { if (p.c === by && ts.indexOf(p.t) !== -1) return true; break; }
        rr += dirs[i][0]; cc += dirs[i][1];
      }
    }
  }
  return false;
}
function kingSq(bd, color) {
  for (var i = 0; i < 64; i++) { var p = bd[i]; if (p && p.t === 'k' && p.c === color) return i; }
  return -1;
}

// move = {from, to, promo, castle:'k'|'q', ep:bool}
function pseudoMoves(st, color, capsOnly) {
  var bd = st.board, moves = [];
  for (var i = 0; i < 64; i++) {
    var p = bd[i]; if (!p || p.c !== color) continue;
    var r = rc(i)[0], c = rc(i)[1];
    if (p.t === 'p') {
      var dir = color === 'w' ? -1 : 1, startR = color === 'w' ? 6 : 1, lastR = color === 'w' ? 0 : 7;
      var one = at(bd, r + dir, c);
      if (one === null && !capsOnly) {
        addPawn(i, (r + dir) * 8 + c, r + dir === lastR);
        if (r === startR && at(bd, r + 2 * dir, c) === null)
          moves.push({ from: i, to: (r + 2 * dir) * 8 + c });
      }
      for (var dc = -1; dc <= 1; dc += 2) {
        var t = at(bd, r + dir, c + dc), ti = (r + dir) * 8 + c + dc;
        if (t && t.c !== color) addPawn(i, ti, r + dir === lastR);
        else if (ti === st.ep && t === null) moves.push({ from: i, to: ti, ep: true });
      }
    } else if (p.t === 'n' || p.t === 'k') {
      var ds = p.t === 'n' ? KN : K8;
      for (var k = 0; k < ds.length; k++) {
        var t2 = at(bd, r + ds[k][0], c + ds[k][1]);
        if (t2 === undefined) continue;
        if (t2 === null) { if (!capsOnly) moves.push({ from: i, to: (r + ds[k][0]) * 8 + c + ds[k][1] }); }
        else if (t2.c !== color) moves.push({ from: i, to: (r + ds[k][0]) * 8 + c + ds[k][1] });
      }
      if (p.t === 'k' && !capsOnly) addCastles();
    } else {
      var dirs = p.t === 'b' ? DIAG : p.t === 'r' ? ORTH : K8;
      for (var d = 0; d < dirs.length; d++) {
        var rr = r + dirs[d][0], cc = c + dirs[d][1];
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          var q = bd[rr * 8 + cc];
          if (q === null) { moves.push({ from: i, to: rr * 8 + cc }); }
          else { if (q.c !== color) moves.push({ from: i, to: rr * 8 + cc }); break; }
          rr += dirs[d][0]; cc += dirs[d][1];
        }
      }
    }
  }
  function addPawn(f, t, prom) {
    if (prom) { ['q', 'r', 'b', 'n'].forEach(function (pp) { moves.push({ from: f, to: t, promo: pp }); }); }
    else moves.push({ from: f, to: t });
  }
  function addCastles() {
    var home = color === 'w' ? 7 : 0, ks = st.castle;
    var kOK = color === 'w' ? ks.wk : ks.bk, qOK = color === 'w' ? ks.wq : ks.bq;
    if (kOK && bd[home * 8 + 5] === null && bd[home * 8 + 6] === null &&
        !attacked(bd, home * 8 + 4, opp(color)) && !attacked(bd, home * 8 + 5, opp(color)))
      moves.push({ from: i, to: home * 8 + 6, castle: 'k' });
    if (qOK && bd[home * 8 + 3] === null && bd[home * 8 + 2] === null && bd[home * 8 + 1] === null &&
        !attacked(bd, home * 8 + 4, opp(color)) && !attacked(bd, home * 8 + 3, opp(color)))
      moves.push({ from: i, to: home * 8 + 2, castle: 'q' });
  }
  return moves;
}

function make(st, m) {
  var bd = st.board, p = bd[m.from];
  var undo = { m: m, captured: bd[m.to] || null, castle: Object.assign({}, st.castle),
               ep: st.ep, half: st.half, epCap: null };
  if (m.ep) { var tr = rc(m.to)[0], tc = rc(m.to)[1]; undo.epCap = bd[tr * 8 + tc + (p.c === 'w' ? 8 : -8)]; bd[tr * 8 + tc + (p.c === 'w' ? 8 : -8)] = null; }
  bd[m.to] = m.promo ? { t: m.promo, c: p.c } : p;
  bd[m.from] = null;
  if (m.castle === 'k') { var hr = p.c === 'w' ? 7 : 0; bd[hr * 8 + 5] = bd[hr * 8 + 7]; bd[hr * 8 + 7] = null; }
  if (m.castle === 'q') { var hr2 = p.c === 'w' ? 7 : 0; bd[hr2 * 8 + 3] = bd[hr2 * 8 + 0]; bd[hr2 * 8 + 0] = null; }
  if (p.t === 'k') { if (p.c === 'w') { st.castle.wk = st.castle.wq = false; } else { st.castle.bk = st.castle.bq = false; } }
  if (m.from === 56 || m.to === 56) st.castle.wq = false;
  if (m.from === 63 || m.to === 63) st.castle.wk = false;
  if (m.from === 0 || m.to === 0) st.castle.bq = false;
  if (m.from === 7 || m.to === 7) st.castle.bk = false;
  st.ep = (p.t === 'p' && Math.abs(rc(m.to)[0] - rc(m.from)[0]) === 2)
    ? (rc(m.from)[0] + rc(m.to)[0]) / 2 * 8 + rc(m.from)[1] : -1;
  st.half = (p.t === 'p' || undo.captured || m.ep) ? 0 : st.half + 1;
  st.turn = opp(st.turn);
  return undo;
}
function unmake(st, undo) {
  var m = undo.m, bd = st.board;
  var p = bd[m.to];
  bd[m.from] = m.promo ? { t: 'p', c: p.c } : p;
  bd[m.to] = undo.captured;
  if (m.ep) { var tr = rc(m.to)[0], tc = rc(m.to)[1]; bd[tr * 8 + tc + (p.c === 'w' ? 8 : -8)] = undo.epCap; }
  if (m.castle === 'k') { var hr = p.c === 'w' ? 7 : 0; bd[hr * 8 + 7] = bd[hr * 8 + 5]; bd[hr * 8 + 5] = null; }
  if (m.castle === 'q') { var hr2 = p.c === 'w' ? 7 : 0; bd[hr2 * 8 + 0] = bd[hr2 * 8 + 3]; bd[hr2 * 8 + 3] = null; }
  st.castle = undo.castle; st.ep = undo.ep; st.half = undo.half; st.turn = opp(st.turn);
}

function legalMoves(st, color) {
  var out = [], ps = pseudoMoves(st, color, false);
  for (var i = 0; i < ps.length; i++) {
    var u = make(st, ps[i]);
    if (!attacked(st.board, kingSq(st.board, color), opp(color))) out.push(ps[i]);
    unmake(st, u);
  }
  return out;
}
function inCheck(st, color) { return attacked(st.board, kingSq(st.board, color), opp(color)); }

function posKey(st) {
  var s = st.turn;
  for (var i = 0; i < 64; i++) { var p = st.board[i]; s += p ? p.c + p.t : '.'; }
  s += JSON.stringify(st.castle) + st.ep;
  return s;
}
function insufficient(bd) {
  var minor = 0;
  for (var i = 0; i < 64; i++) { var p = bd[i]; if (!p || p.t === 'k') continue; if (p.t === 'b' || p.t === 'n') minor++; else return false; }
  return minor <= 1;
}

/* ---------- AI ---------- */
function evaluate(bd) { // + = White better
  var s = 0;
  for (var i = 0; i < 64; i++) {
    var p = bd[i]; if (!p) continue;
    var r = rc(i)[0], c = rc(i)[1];
    var idx = p.c === 'w' ? (7 - r) * 8 + c : r * 8 + c; // PST from white's view
    var v = VAL[p.t] + PST[p.t][idx];
    s += p.c === 'w' ? v : -v;
  }
  return s;
}
var nodes = 0, nodeCap = 400000;
function quiesce(st, alpha, beta, colorSign) {
  nodes++; if (nodes > nodeCap) return colorSign * evaluate(st.board);
  var stand = colorSign * evaluate(st.board);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  var ms = pseudoMoves(st, st.turn, true), scored = [];
  for (var i = 0; i < ms.length; i++) {
    var u = make(st, ms[i]);
    var ok = !attacked(st.board, kingSq(st.board, st.turn === 'w' ? 'b' : 'w'), st.turn);
    // note: after make(), st.turn flipped; king of mover:
    unmake(st, u);
    if (!ok) continue;
    var cap = st.board[ms[i].to];
    scored.push({ m: ms[i], s: cap ? VAL[cap.t] : 0 });
  }
  scored.sort(function (a, b) { return b.s - a.s; });
  for (var j = 0; j < scored.length; j++) {
    var u2 = make(st, scored[j].m);
    var sc = -quiesce(st, -beta, -alpha, -colorSign);
    unmake(st, u2);
    if (sc >= beta) return beta;
    if (sc > alpha) alpha = sc;
  }
  return alpha;
}
function negamax(st, depth, alpha, beta, colorSign) {
  nodes++; if (nodes > nodeCap) return colorSign * evaluate(st.board);
  if (st.half >= 100 || insufficient(st.board)) return 0;
  var ms = legalMoves(st, st.turn);
  if (!ms.length) return inCheck(st, st.turn) ? -100000 + (3 - depth) : 0;
  if (depth === 0) return quiesce(st, alpha, beta, colorSign);
  // order: captures/promotions first
  ms.sort(function (a, b) {
    var sa = (st.board[b.to] ? VAL[st.board[b.to].t] : 0) + (b.promo ? 800 : 0);
    var sb = (st.board[a.to] ? VAL[st.board[a.to].t] : 0) + (a.promo ? 800 : 0);
    return sb - sa;
  });
  var best = -Infinity;
  for (var i = 0; i < ms.length; i++) {
    var u = make(st, ms[i]);
    var sc = -negamax(st, depth - 1, -beta, -alpha, -colorSign);
    unmake(st, u);
    if (sc > best) best = sc;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}
function aiPick(st, depth, blunder) {
  nodes = 0;
  var ms = legalMoves(st, st.turn);
  if (!ms.length) return null;
  var sign = st.turn === 'w' ? 1 : -1, scored = [];
  ms.sort(function (a, b) {
    var sa = (st.board[b.to] ? VAL[st.board[b.to].t] : 0) + (b.promo ? 800 : 0);
    var sb = (st.board[a.to] ? VAL[st.board[a.to].t] : 0) + (a.promo ? 800 : 0);
    return sb - sa;
  });
  for (var i = 0; i < ms.length; i++) {
    var u = make(st, ms[i]);
    var sc = -negamax(st, depth - 1, -Infinity, Infinity, -sign);
    unmake(st, u);
    scored.push({ m: ms[i], s: sc });
  }
  scored.sort(function (a, b) { return b.s - a.s; });
  if (blunder) { // easy: sometimes pick a weaker move
    if (Math.random() < 0.35) return scored[Math.floor(Math.random() * Math.min(scored.length, 6))].m;
  }
  return scored[0].m;
}

/* ---------- UI ---------- */
var GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
var st = G();
var human = 'w', depth = 2, blunder = false, over = false;
var sel = -1, selMoves = [];
var moveLog = [];

var boardEl = document.getElementById('board');
var statusEl = document.getElementById('status');
var movesEl = document.getElementById('moves');
var capWEl = document.getElementById('cap-w'), capBEl = document.getElementById('cap-b');
var overlay = document.getElementById('setup'), endOverlay = document.getElementById('gameover');

function sqName(i) { return 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8)); }

function render() {
  boardEl.innerHTML = '';
  var flip = human === 'b';
  for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
    var dr = flip ? 7 - r : r, dc = flip ? 7 - c : c, i = dr * 8 + dc;
    var d = document.createElement('div');
    d.className = 'sq ' + ((dr + dc) % 2 ? 'dark' : 'light');
    d.dataset.i = i;
    var p = st.board[i];
    if (p) {
      var s = document.createElement('span');
      s.className = 'pc ' + p.c; s.textContent = GLYPH[p.t];
      d.appendChild(s);
    }
    if (i === sel) d.classList.add('sel');
    for (var k = 0; k < selMoves.length; k++) if (selMoves[k].to === i) d.classList.add(st.board[i] ? 'takes' : 'move');
    if (inCheck(st, st.turn) && p && p.t === 'k' && p.c === st.turn) d.classList.add('check');
    d.addEventListener('click', onSq);
    boardEl.appendChild(d);
  }
  // status + captured + material
  var cw = [], cb = [], mat = 0;
  for (var j = 0; j < 64; j++) { var q = st.board[j]; if (q) mat += (q.c === 'w' ? 1 : -1) * VAL[q.t]; }
  moveLog.forEach(function (ml) { if (ml.cap) (ml.cap.c === 'w' ? cw : cb).push(ml.cap.t); });
  capWEl.textContent = cw.map(function (t) { return GLYPH[t]; }).join(' ');
  capBEl.textContent = cb.map(function (t) { return GLYPH[t]; }).join(' ');
  var md = document.getElementById('matdiff');
  md.textContent = mat === 0 ? '' : (mat > 0 ? 'White +' + (mat / 100) : 'Black +' + (-mat / 100));
  statusEl.innerHTML = over ? statusEl.innerHTML :
    (st.turn === human ? 'Your move' : 'Computer is thinking…') +
    (inCheck(st, st.turn) ? ' — <b>check!</b>' : '');
  movesEl.innerHTML = '';
  for (var n = 0; n < moveLog.length; n += 2) {
    var row = document.createElement('div');
    row.textContent = ((n / 2) + 1) + '. ' + moveLog[n].san + (moveLog[n + 1] ? '  ' + moveLog[n + 1].san : '');
    movesEl.appendChild(row);
  }
  movesEl.scrollTop = movesEl.scrollHeight;
}

function san(st0, m, legal) {
  // compute SAN before making the move
  var p = st0.board[m.from], s = '';
  var dest = sqName(m.to);
  var isCap = !!st0.board[m.to] || m.ep;
  if (m.castle === 'k') return 'O-O';
  if (m.castle === 'q') return 'O-O-O';
  if (p.t === 'p') {
    s = isCap ? 'abcdefgh'[m.from % 8] + 'x' + dest : dest;
    if (m.promo) s += '=' + m.promo.toUpperCase();
  } else {
    var others = legal.filter(function (x) { return x.to === m.to && x.from !== m.from && st0.board[x.from].t === p.t; });
    var dis = '';
    if (others.length) {
      var sameFile = others.some(function (x) { return x.from % 8 === m.from % 8; });
      var sameRank = others.some(function (x) { return Math.floor(x.from / 8) === Math.floor(m.from / 8); });
      if (!sameFile) dis = 'abcdefgh'[m.from % 8];
      else if (!sameRank) dis = '' + (8 - Math.floor(m.from / 8));
      else dis = sqName(m.from);
    }
    s = p.t.toUpperCase() + dis + (isCap ? 'x' : '') + dest;
  }
  var u = make(st0, m);
  var foe = legalMoves(st0, st0.turn);
  if (!foe.length) s += inCheck(st0, st0.turn) ? '#' : '';
  else if (inCheck(st0, st0.turn)) s += '+';
  unmake(st0, u);
  return s;
}

function doMove(m) {
  var legal = legalMoves(st, st.turn);
  var s = san(st, m, legal);
  var captured = st.board[m.to] || null;
  if (m.ep) { var tr = rc(m.to)[0], tc = rc(m.to)[1]; captured = st.board[tr * 8 + tc + (st.turn === 'w' ? 8 : -8)]; }
  make(st, m);
  var key = posKey(st); st.reps[key] = (st.reps[key] || 0) + 1;
  moveLog.push({ san: s, cap: captured });
  sel = -1; selMoves = [];
  checkEnd();
  render();
  if (!over && st.turn !== human) setTimeout(aiMove, 450);
}

function checkEnd() {
  var ms = legalMoves(st, st.turn), key = posKey(st);
  var msg = null;
  if (!ms.length) msg = inCheck(st, st.turn)
    ? (st.turn === human ? 'Checkmate — the computer wins.' : 'Checkmate — you win! Brilliant thinking.')
    : 'Stalemate — a draw.';
  else if (st.half >= 100) msg = 'Draw — fifty quiet moves.';
  else if (insufficient(st.board)) msg = 'Draw — not enough pieces left.';
  else if ((st.reps[key] || 0) >= 3) msg = 'Draw — the same position three times.';
  if (msg) {
    over = true;
    document.getElementById('end-title').textContent = msg.indexOf('you win') !== -1 ? '🏆 You win!' : 'Game over';
    document.getElementById('end-msg').textContent = msg;
    endOverlay.classList.add('show');
  }
}

function onSq(e) {
  if (over || st.turn !== human) return;
  var i = +e.currentTarget.dataset.i, p = st.board[i];
  if (sel !== -1) {
    for (var k = 0; k < selMoves.length; k++) if (selMoves[k].to === i) {
      var mv = selMoves[k];
      if (mv.promo && st.board[mv.from].t === 'p') { askPromo(mv); return; }
      doMove(mv); return;
    }
  }
  if (p && p.c === human) {
    sel = i;
    selMoves = legalMoves(st, human).filter(function (m) { return m.from === i; });
  } else { sel = -1; selMoves = []; }
  render();
}

function askPromo(mv) {
  var pr = document.getElementById('promo');
  pr.classList.add('show');
  var btns = pr.querySelectorAll('button');
  function pick(e) {
    mv.promo = e.currentTarget.dataset.p;
    pr.classList.remove('show');
    for (var i = 0; i < btns.length; i++) btns[i].removeEventListener('click', pick);
    doMove(mv);
  }
  for (var i = 0; i < btns.length; i++) btns[i].addEventListener('click', pick);
}

function aiMove() {
  if (over) return;
  var m = aiPick(st, depth, blunder);
  if (m) doMove(m);
}

document.getElementById('start-btn').addEventListener('click', function () {
  var hc = document.querySelector('input[name="color"]:checked').value;
  human = hc === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : hc;
  var df = document.querySelector('input[name="diff"]:checked').value;
  depth = df === 'easy' ? 1 : df === 'hard' ? 3 : 2;
  blunder = df === 'easy';
  st = G(); st.reps[posKey(st)] = 1;
  over = false; sel = -1; selMoves = []; moveLog = [];
  overlay.classList.remove('show');
  render();
  if (st.turn !== human) setTimeout(aiMove, 600);
});
document.getElementById('new-btn').addEventListener('click', function () {
  endOverlay.classList.remove('show');
  overlay.classList.add('show');
});
document.getElementById('panel-new').addEventListener('click', function () {
  overlay.classList.add('show');
});

st.reps[posKey(st)] = 1;
render();
})();
