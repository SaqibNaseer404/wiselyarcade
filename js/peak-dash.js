// Peak Dash — original 2D platform game for Wisely Arcade.
// A small climber runs and jumps across mountain platforms, dodges spikes,
// rides moving platforms, bounces on springs, gathers coins and plants a
// flag on the summit. 100 levels in 10 worlds, every one generated from
// jump segments that are validated against the game's own physics
// constants, then proven finishable by a bot that plays through the real
// physics step. Vanilla JS + canvas only. Core logic is DOM-free and
// exported for node tests.
(function () {
  'use strict';

  // ---------------------------------------------------------------- RNG
  function makeRng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed() {
    var h = 2166136261;
    for (var i = 0; i < arguments.length; i++) {
      h ^= (arguments[i] * 16777619) & 0xffffff;
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // ---------------------------------------------------------------- physics
  // ONE set of constants for the whole game. Levels are designed against
  // these numbers, never the reverse. Units: pixels and seconds.
  var TILE = 32;
  var WORLD_H = 480;                    // 15 tiles tall, canvas-height world
  var PHYS = {
    GRAVITY: 2000,                      // px/s^2
    RUN_SPEED: 230,                     // px/s
    JUMP_VEL: 780,                      // px/s upward
    SPRING_VEL: 1180,                   // px/s upward off a spring
    MAX_FALL: 950,                      // px/s terminal velocity
    STEP: 1 / 120,                      // fixed timestep (s)
    COYOTE: 0.09,                       // s of grace after leaving a ledge
    BUFFER: 0.12                        // s a jump press is remembered
  };
  var PLAYER_W = 22, PLAYER_H = 30;
  // Safety margins every generated jump must respect.
  var MARGIN_H = 36, MARGIN_V = 36, SPRING_MARGIN = 48;

  function maxJumpHeight() { return PHYS.JUMP_VEL * PHYS.JUMP_VEL / (2 * PHYS.GRAVITY); }
  function springHeight() { return PHYS.SPRING_VEL * PHYS.SPRING_VEL / (2 * PHYS.GRAVITY); }
  // Horizontal distance of a running jump that lands `heightAbove` px higher
  // than takeoff (negative = landing lower). Full projectile math, no fudge.
  function jumpReach(heightAbove) {
    var v = PHYS.JUMP_VEL, g = PHYS.GRAVITY;
    var disc = v * v - 2 * g * heightAbove;
    if (disc < 0) return 0;
    return PHYS.RUN_SPEED * (v + Math.sqrt(disc)) / g;
  }
  // Is a jump across `gap` px landing `heightAbove` px up inside the real
  // physics envelope, with margin to spare?
  function canJump(gap, heightAbove) {
    if (heightAbove > maxJumpHeight() - MARGIN_V) return false;
    return gap <= jumpReach(heightAbove) - MARGIN_H;
  }
  function canSpring(heightAbove) {
    return heightAbove <= springHeight() - SPRING_MARGIN;
  }

  // ---------------------------------------------------------------- levels
  var WORLDS = [
    'Sunny Slopes', 'Pinewood Rise', 'Rocky Steps', 'Frosty Ledges',
    'Golden Ridge', 'Crystal Cliffs', 'Windy Peaks', 'Ember Highlands',
    'Twilight Ascent', 'The Grand Peak'
  ];
  function levelParams(level) {
    var L = Math.max(1, Math.min(100, level | 0));
    return {
      level: L,
      world: Math.ceil(L / 10),
      segments: 6 + Math.floor((L - 1) / 9),              // 6 -> 17
      gapMax: L < 5 ? 2 : (L < 30 ? 3 : 4),               // tiles
      climbMax: L < 10 ? 1 : (L < 40 ? 2 : 3),            // tiles
      spikes: L >= 3, spikeMax: L < 30 ? 2 : 3,           // tiles per patch
      movers: L >= 21, springs: L >= 41,
      hearts: 3
    };
  }
  // Fixed seed nudges for any endgame levels the dev-time bot found unfair;
  // same pattern as Block Bloom. (Filled only if a level needs it.)
  var SEED_TWEAKS = {};

  function genLevel(level) {
    var p = levelParams(level);
    var rng = makeRng(hashSeed(424243, p.level * 131 + 17 + (SEED_TWEAKS[p.level] || 0)));
    var solids = [], movers = [], springs = [], spikes = [], coins = [];
    var transitions = [];
    function ri(a, b) { return a + Math.floor(rng() * (b - a + 1)); }
    function addSolid(x, y, w) {
      var s = { x: x, y: y, w: w, h: WORLD_H - y + 4 * TILE, kind: 'static' };
      // h runs well past the world bottom: pits are the gaps BETWEEN solids.
      solids.push(s); return s;
    }
    function coinArc(x0, y0, x1, y1, n) {
      for (var i = 1; i <= n; i++) {
        var t = i / (n + 1);
        var cx = x0 + (x1 - x0) * t;
        var cy = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 46;
        coins.push({ x: Math.round(cx), y: Math.round(cy) });
      }
    }
    function coinLine(x, y, n, dx) {
      for (var i = 0; i < n; i++) coins.push({ x: Math.round(x + i * dx), y: Math.round(y) });
    }

    // --- start platform: wide and safe at row 11 (top y = 352)
    var top = 11 * TILE;
    var cur = addSolid(0, top, 6 * TILE);
    var spawn = { x: 2 * TILE, y: top - PLAYER_H };
    var moversUsed = 0, springsUsed = 0;
    // Rhythm rule: after an upward jump landing or a spike patch, the next
    // segment must be calm (no pit) — a full-speed runner needs room to land.
    var calmNext = false;

    function clampTop(t) { return Math.max(4 * TILE, Math.min(12 * TILE, t)); }

    for (var seg = 0; seg < p.segments; seg++) {
      var right = cur.x + cur.w;
      // Choose a challenge type allowed at this level. A calm segment is a
      // gap-0 step only — even a small drop-gap is still a pit to a runner
      // who has just landed at full speed.
      var types = calmNext ? ['step'] : ['step', 'gap', 'gap', 'drop'];
      if (p.spikes && cur.w >= 5 * TILE && !calmNext) types.push('spikes');
      if (p.movers && moversUsed < 2 && !calmNext) types.push('mover');
      if (p.springs && springsUsed < 2 && !calmNext) types.push('spring');
      var type = types[Math.floor(rng() * types.length)];
      var wasCalm = calmNext;
      calmNext = false;

      if (type === 'spikes') {
        // Extend the current platform and plant a spike patch to hop over.
        var ext = ri(4, 5) * TILE;
        cur.w += ext;
        var sw = ri(1, p.spikeMax) * TILE;
        var sx = right + Math.floor((ext - sw) / 2 / TILE) * TILE;
        spikes.push({ x: sx, y: cur.y - 14, w: sw, h: 14 });
        transitions.push({ type: 'spike-jump', gap: sw, heightAbove: 0, ok: canJump(sw, 0) });
        coinArc(sx - 10, cur.y - 26, sx + sw + 10, cur.y - 26, 3);
        calmNext = true;
        continue;
      }

      if (type === 'mover') {
        // A pit too wide to jump, crossed by a platform riding back & forth.
        var pit = ri(6, 7) * TILE;
        var mTop = cur.y;
        var nx = right + pit;
        var nxt = addSolid(nx, mTop, ri(5, 6) * TILE);
        var mw = 80;
        var mv = {
          x: right + 8, y: mTop, w: mw, h: 16, kind: 'mover',
          from: right + 8, to: nx - 8 - mw,
          period: 2.2 + rng() * 0.9, phase: rng() * 0.5
        };
        movers.push(mv); moversUsed++;
        transitions.push({ type: 'mover-in', gap: mv.from - right, heightAbove: 0, ok: canJump(mv.from - right, 0) });
        transitions.push({ type: 'mover-out', gap: nx - (mv.to + mw), heightAbove: 0, ok: canJump(nx - (mv.to + mw), 0) });
        transitions.push({ type: 'mover-span', gap: pit, heightAbove: 0, ok: pit > jumpReach(0) });
        coinLine(right + pit / 2, mTop - 30, 1, 1);
        calmNext = true;   // a jump-off landing earns a calm, wide runway
        cur = nxt; continue;
      }

      if (type === 'spring') {
        // Spring on the last tile of this platform bounces the climber to a
        // high ledge across a pit no plain jump can cross.
        springs.push({ x: right - TILE, y: cur.y });
        var upTiles = ri(5, 8);
        var ledgeTop = clampTop(cur.y - upTiles * TILE);
        var up = cur.y - ledgeTop;
        var lx = right + 2 * TILE;
        var ledge = addSolid(lx, ledgeTop, ri(5, 6) * TILE);
        transitions.push({ type: 'spring', gap: lx - right, heightAbove: up, ok: canSpring(up) && upTiles >= 5 });
        // ring of coins along the bounce
        coins.push({ x: right + 16, y: cur.y - 120 });
        coins.push({ x: right + 52, y: cur.y - 210 });
        coins.push({ x: right + 88, y: cur.y - up - 40 });
        springsUsed++;
        calmNext = true;   // a spring landing earns a calm, wide runway
        cur = ledge; continue;
      }

      // step / gap / drop: a fresh platform to the right.
      var gapT = type === 'gap' ? ri(1, p.gapMax) : (type === 'drop' ? ri(0, 2) : 0);
      var upT = 0, downT = 0;
      if (type === 'step') { upT = ri(0, p.climbMax); if (rng() < 0.35) { upT = 0; downT = ri(1, 3); } }
      if (type === 'gap') { upT = ri(0, Math.min(p.climbMax, 2)); if (rng() < 0.3) { upT = 0; downT = ri(1, 2); } }
      if (type === 'drop') { downT = ri(3, 5); }
      var nTop = clampTop(cur.y - upT * TILE + downT * TILE);
      var heightAbove = cur.y - nTop;
      var gapPx = gapT * TILE;
      // Shrink the gap until the jump is honestly inside the envelope.
      var guard = 0;
      while (!canJump(gapPx, heightAbove) && guard < 12) { gapPx -= TILE; if (gapPx < 0) gapPx = 0; guard++; }
      // A platform landed on from across a pit needs real width (5 tiles),
      // and so does a calm step right after any jump landing — the runner
      // needs a full runway before the next takeoff window closes.
      var minW = gapPx > 0 ? 5 : (wasCalm && type === 'step' ? 5 : 3);
      var nw = ri(minW, 6) * TILE;
      var np = addSolid(right + gapPx, nTop, nw);
      transitions.push({
        type: type, gap: gapPx, heightAbove: heightAbove,
        ok: canJump(gapPx, heightAbove)
      });
      if (gapPx > 0) calmNext = true;   // any pit crossing earns a calm next segment
      if (gapPx > 0) coinArc(right + 4, cur.y - 24, right + gapPx - 4, nTop - 24, 3);
      else if (nw >= 4 * TILE && rng() < 0.7) coinLine(np.x + TILE, nTop - 26, 3, 30);
      // Occasionally decorate a platform with spikes — ONLY platforms a
      // runner reaches on foot (gap-0 steps). A jump's descent cone covers
      // the first ~3 tiles of a landing platform, so spikes there would
      // kill a player mid-landing through no fault of their own. Keep
      // 2 tiles clear at the near edge and 3 at the far edge.
      if (p.spikes && type === 'step' && gapPx === 0 && nw >= 6 * TILE && rng() < 0.4) {
        var sw2 = ri(1, p.spikeMax) * TILE;
        var maxOff = Math.floor(nw / TILE) - Math.floor(sw2 / TILE) - 3;
        var sx2 = np.x + ri(2, Math.max(2, maxOff)) * TILE;
        spikes.push({ x: sx2, y: nTop - 14, w: sw2, h: 14 });
        transitions.push({ type: 'spike-jump', gap: sw2, heightAbove: 0, ok: canJump(sw2, 0) });
        calmNext = true;
      }
      cur = np;
    }

    // --- summit: a raised final platform with the flag.
    var sRight = cur.x + cur.w;
    var sTop = clampTop(cur.y - ri(1, 2) * TILE);
    var sGap = 0;
    var summit = addSolid(sRight + sGap, sTop, 6 * TILE);
    transitions.push({ type: 'summit', gap: sGap, heightAbove: cur.y - sTop, ok: canJump(sGap, cur.y - sTop) });
    var flag = { x: sRight + 3 * TILE, y: sTop };
    coinLine(summit.x + TILE / 2, sTop - 26, 2, 30);

    var valid = transitions.every(function (t) { return t.ok; });
    return {
      level: p.level, world: p.world, name: WORLDS[p.world - 1],
      params: p, w: summit.x + summit.w + 2 * TILE, h: WORLD_H,
      spawn: spawn, flag: flag,
      solids: solids, movers: movers, springs: springs,
      spikes: spikes, coins: coins,
      transitions: transitions, valid: valid
    };
  }

  // ---------------------------------------------------------------- run state
  function starsFor(deaths) {
    if (deaths <= 0) return 3;
    if (deaths === 1) return 2;
    return 1; // 2 deaths. A 3rd death fails the level, so no 0-star finish.
  }
  function moverXAt(mv, t) {
    var ph = ((t / mv.period) + mv.phase) % 1;
    var tri = ph < 0.5 ? ph * 2 : 2 - 2 * ph;
    return mv.from + (mv.to - mv.from) * tri;
  }
  function createRun(level) {
    var data = genLevel(level);
    var moversRt = data.movers.map(function (mv) {
      return { def: mv, cx: moverXAt(mv, 0), y: mv.y, w: mv.w, h: mv.h, kind: 'mover' };
    });
    return {
      level: data.level, world: data.world, name: data.name, data: data,
      player: {
        x: data.spawn.x, y: data.spawn.y, w: PLAYER_W, h: PLAYER_H,
        vx: 0, vy: 0, onGround: false, groundRef: null, coyote: 0, facing: 1
      },
      moversRt: moversRt,
      coinsTaken: data.coins.map(function () { return false; }),
      coinsGot: 0, hearts: data.params.hearts, deaths: 0,
      respawn: { x: data.spawn.x, y: data.spawn.y },
      buffer: 0, prevJump: false, invuln: 0, springAt: -9,
      time: 0, status: 'playing', stars: 0
    };
  }
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  // One fixed step of the real physics. input: {left, right, jump} held-state.
  // Returns a list of event names: 'jump' 'land' 'coin' 'spring' 'death'
  // 'won' 'failed'.
  function stepRun(run, input) {
    var ev = [];
    if (run.status !== 'playing') return ev;
    var dt = PHYS.STEP, p = run.player, L = run.data;
    run.time += dt;
    if (run.invuln > 0) run.invuln -= dt;
    if (run.buffer > 0) run.buffer -= dt;

    // movers advance; a rider is carried by the platform's delta
    run.moversRt.forEach(function (m) {
      var nx = moverXAt(m.def, run.time);
      if (p.groundRef === m) p.x += nx - m.cx;
      m.cx = nx;
    });
    var solids = L.solids.concat(run.moversRt.map(function (m) {
      return { x: m.cx, y: m.y, w: m.w, h: m.h, kind: 'mover', rt: m };
    }));

    // jump buffering + coyote time
    var jumpEdge = !!input.jump && !run.prevJump;
    run.prevJump = !!input.jump;
    if (jumpEdge) run.buffer = PHYS.BUFFER;
    if (p.onGround) p.coyote = PHYS.COYOTE; else if (p.coyote > 0) p.coyote -= dt;
    if (run.buffer > 0 && (p.onGround || p.coyote > 0)) {
      p.vy = -PHYS.JUMP_VEL; p.onGround = false; p.groundRef = null;
      p.coyote = 0; run.buffer = 0; ev.push('jump');
    }

    // horizontal run + collision
    p.vx = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * PHYS.RUN_SPEED;
    if (p.vx !== 0) p.facing = p.vx > 0 ? 1 : -1;
    p.x += p.vx * dt;
    if (p.x < 0) p.x = 0;
    solids.forEach(function (s) {
      if (!rectsOverlap(p, s)) return;
      if (p.vx > 0) p.x = s.x - p.w;
      else if (p.vx < 0) p.x = s.x + s.w;
      else p.x = (p.x + p.w / 2 < s.x + s.w / 2) ? s.x - p.w : s.x + s.w;
    });

    // vertical fall + collision
    var fell = p.vy;
    p.vy = Math.min(p.vy + PHYS.GRAVITY * dt, PHYS.MAX_FALL);
    p.y += p.vy * dt;
    var wasGround = p.onGround;
    p.onGround = false; p.groundRef = null;
    solids.forEach(function (s) {
      if (!rectsOverlap(p, s)) return;
      if (p.vy > 0 && p.y + p.h - s.y < s.y + s.h - p.y) {
        p.y = s.y - p.h; p.vy = 0; p.onGround = true;
        p.groundRef = s.kind === 'mover' ? s.rt : s;
        if (!wasGround && fell > 260) ev.push('land');
      } else if (p.vy < 0) {
        p.y = s.y + s.h; p.vy = 0;
      } else if (p.vy > 0) {
        p.y = s.y - p.h; p.vy = 0; p.onGround = true;
        p.groundRef = s.kind === 'mover' ? s.rt : s;
      }
    });
    // standing on static ground refreshes the respawn point
    if (p.onGround && p.groundRef && p.groundRef.kind === 'static') {
      run.respawn.x = p.x; run.respawn.y = p.y;
    }

    // springs
    L.springs.forEach(function (sp) {
      var rect = { x: sp.x + 2, y: sp.y - 16, w: TILE - 4, h: 16 };
      if (p.vy >= 0 && rectsOverlap(p, rect)) {
        p.vy = -PHYS.SPRING_VEL; p.onGround = false; p.groundRef = null;
        run.springAt = run.time; ev.push('spring');
      }
    });

    // coins
    for (var ci = 0; ci < L.coins.length; ci++) {
      if (run.coinsTaken[ci]) continue;
      var c = L.coins[ci];
      if (p.x - 6 < c.x + 9 && p.x + p.w + 6 > c.x - 9 &&
          p.y - 4 < c.y + 9 && p.y + p.h + 4 > c.y - 9) {
        run.coinsTaken[ci] = true; run.coinsGot++; ev.push('coin');
      }
    }

    // hazards: spikes (shrunk hitbox — only the sharp middle kills)
    var died = false;
    if (run.invuln <= 0) {
      for (var si = 0; si < L.spikes.length; si++) {
        var sk = L.spikes[si];
        var hit = { x: sk.x + 4, y: sk.y + 5, w: sk.w - 8, h: sk.h - 5 };
        if (rectsOverlap(p, hit)) { died = true; break; }
      }
    }
    if (!died && p.y > L.h + 60) died = true;   // fell off the world
    if (died) {
      run.deaths++; run.hearts--; ev.push('death');
      if (run.hearts <= 0) {
        run.hearts = 0; run.status = 'failed'; ev.push('failed');
      } else {
        p.x = run.respawn.x; p.y = run.respawn.y;
        p.vx = 0; p.vy = 0; p.onGround = false; p.groundRef = null;
        run.invuln = 1.0;
      }
      return ev;
    }

    // the summit flag
    var pole = { x: L.flag.x, y: L.flag.y - 100, w: 12, h: 100 };
    if (rectsOverlap(p, pole)) {
      run.status = 'won'; run.stars = starsFor(run.deaths); ev.push('won');
    }
    return ev;
  }

  // ---------------------------------------------------------------- campaign progress (pure, testable)
  function emptyProgress() { return { unlocked: 1, current: 1, stars: {} }; }
  function recordClear(progress, level, stars) {
    var p = {
      unlocked: progress.unlocked, current: progress.current,
      stars: Object.assign({}, progress.stars)
    };
    var key = String(level);
    if (!p.stars[key] || p.stars[key] < stars) p.stars[key] = stars;
    if (level === p.unlocked && level < 100) p.unlocked = level + 1;
    p.current = level < 100 ? level + 1 : level;
    return p;
  }

  // ---------------------------------------------------------------- completability bot
  // Plays through the REAL stepRun physics with player-like senses: it can
  // see the platforms, spikes, springs and movers of the level it is on —
  // exactly what a player sees — and reacts step by step. It never touches
  // the physics itself.
  function nextStaticAfter(L, xEdge) {
    var best = null;
    L.solids.forEach(function (s) {
      if (s.x >= xEdge - 2 && (!best || s.x < best.x)) best = s;
    });
    return best;
  }
  function botInput(run, mem) {
    var none = { left: false, right: false, jump: false };
    if (run.status !== 'playing') return none;
    var p = run.player, L = run.data;
    var right = { left: false, right: true, jump: false };
    if (!p.onGround) {
      // After a spring bounce, steer onto the ledge like a player would:
      // a full-speed rightward drift overshoots a near ledge completely.
      var aim = mem.aimLedge;
      if (aim && run.time - (mem.aimAt || 0) < 2 && p.y + p.h < aim.y + 6) {
        if (p.x + p.w < aim.x + 14) return right;
        if (p.x > aim.x + aim.w - p.w - 8) return { left: true, right: false, jump: false };
        return none;                                  // hover over the ledge and drop onto it
      }
      return right;                    // airborne: ride it out rightward
    }
    var front = p.x + p.w;
    var g = p.groundRef;
    if (g && g.kind === 'mover') {
      // Ride to the far edge, then hop off when the landing is honestly on.
      var gx = g.cx, gright = gx + g.w;
      var nxtM = nextStaticAfter(L, gright - 4);
      if (!nxtM) return none;
      if (gright - front > 8) return right;           // walk to the mover's edge
      var gapM = nxtM.x - gright, hM = g.y - nxtM.y;
      if (canJump(gapM, hM)) return { left: false, right: true, jump: true };
      return none;                                    // wait for the platform to carry us close
    }
    if (!g) return right;
    // A spring on this platform ahead of us? Just run into it — it bounces.
    // Remember the ledge it aims at, so the airborne steering can land us.
    for (var i = 0; i < L.springs.length; i++) {
      var sp = L.springs[i];
      if (sp.y === g.y && sp.x >= front - 6 && sp.x - front < 90) {
        mem.aimLedge = nextStaticAfter(L, g.x + g.w - 2);
        mem.aimAt = run.time;
        return right;
      }
    }
    mem.aimLedge = null;
    // Spikes ahead on this platform, close enough to matter? Hop them.
    for (var j2 = 0; j2 < L.spikes.length; j2++) {
      var sk = L.spikes[j2];
      if (sk.y + sk.h === g.y && sk.x - front < 34 && sk.x + sk.w > front) {
        return { left: false, right: true, jump: true };
      }
    }
    // A step up directly ahead? Jump it.
    for (var k = 0; k < L.solids.length; k++) {
      var s = L.solids[k];
      if (s === g) continue;
      if (s.x - front < 7 && s.x + s.w > front && s.y < g.y && s.y + s.h > p.y + 4) {
        if (canJump(0, g.y - s.y)) return { left: false, right: true, jump: true };
      }
    }
    // Player-like timing: if a full jump from HERE lands on the next
    // platform, take it now — never leave a jump so late that its fixed
    // arc overshoots a short landing. The same rule covers climbing an
    // adjacent step (gap 0): jump early, ride up the face, pop over.
    var nxtE = nextStaticAfter(L, g.x + g.w - 2);
    if (nxtE) {
      var gapE = nxtE.x - (g.x + g.w), hE = g.y - nxtE.y;
      var timedJump = (gapE > 0 && hE >= -30) || (gapE === 0 && hE > 0);
      if (timedJump && canJump(gapE, hE) &&
          p.x + jumpReach(hE) >= nxtE.x - p.w + 8) {
        return { left: false, right: true, jump: true };
      }
    }
    // Near the edge of this platform? Decide how to cross.
    var edgeDist = (g.x + g.w) - front;
    if (edgeDist < 18) {
      var nxt = nextStaticAfter(L, g.x + g.w - 2);
      // A mover serving the pit ahead?
      var mv = null;
      run.moversRt.forEach(function (m) { if (m.def.from >= g.x + g.w - 14 && (!mv || m.def.from < mv.def.from)) mv = m; });
      if (mv && nxt && mv.def.from < nxt.x) {
        var gapToMover = mv.cx - (g.x + g.w);
        // Board by WALKING on when the platform is within a body's width —
        // a full jump at a moving target overshoots it. Otherwise wait.
        if (gapToMover <= PLAYER_W) return { left: false, right: true, jump: false };
        return none;                                  // wait at the edge for the ride
      }
      if (nxt) {
        var gap = nxt.x - (g.x + g.w), hA = g.y - nxt.y;
        // A long drop onto a lower platform: DON'T jump — a jump's arc
        // overshoots the catch platform. Run off the edge and fall onto
        // it, when the fall distance lands the body over the platform.
        if (hA <= -64) {
          var fallD = PHYS.RUN_SPEED * Math.sqrt(2 * (-hA) / PHYS.GRAVITY);
          if (fallD > gap + 10 && fallD - PLAYER_W < gap + nxt.w - 10) {
            return { left: false, right: true, jump: false };
          }
        }
        if (canJump(gap, hA) || hA < -30) {
          return { left: false, right: true, jump: gap > 6 || hA > 10 };
        }
        return { left: false, right: true, jump: true };  // best effort — should not happen
      }
    }
    return right;
  }
  // Drive a fresh run with the bot. Returns {reached, steps, deaths, attempts}.
  function runBot(level, maxStepsPerAttempt) {
    var cap = maxStepsPerAttempt || 9000;
    var totalDeaths = 0;
    for (var attempt = 1; attempt <= 3; attempt++) {
      var run = createRun(level);
      var mem = { wasJump: false };
      var steps = 0;
      while (run.status === 'playing' && steps < cap) {
        stepRun(run, botInput(run, mem));
        steps++;
      }
      totalDeaths += run.deaths;
      if (run.status === 'won') {
        return { reached: true, steps: steps, deaths: totalDeaths, attempts: attempt, coins: run.coinsGot };
      }
    }
    return { reached: false, steps: steps, deaths: totalDeaths, attempts: 3, coins: 0 };
  }

  var Core = {
    TILE: TILE, WORLD_H: WORLD_H, PHYS: PHYS,
    PLAYER_W: PLAYER_W, PLAYER_H: PLAYER_H,
    MARGIN_H: MARGIN_H, MARGIN_V: MARGIN_V,
    makeRng: makeRng, hashSeed: hashSeed,
    maxJumpHeight: maxJumpHeight, springHeight: springHeight,
    jumpReach: jumpReach, canJump: canJump, canSpring: canSpring,
    WORLDS: WORLDS, levelParams: levelParams, genLevel: genLevel,
    starsFor: starsFor, createRun: createRun, stepRun: stepRun,
    moverXAt: moverXAt, rectsOverlap: rectsOverlap,
    emptyProgress: emptyProgress, recordClear: recordClear,
    botInput: botInput, runBot: runBot
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Core; }
  if (typeof document === 'undefined') return;

  // ================================================================ BROWSER
  var LS_KEY = 'wisely-peak-dash';
  var progress = emptyProgress();
  try {
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved) {
      progress.unlocked = Math.max(1, Math.min(100, saved.unlocked || 1));
      progress.current = Math.max(1, Math.min(100, saved.current || progress.unlocked));
      progress.stars = saved.stars || {};
    }
  } catch (e) { /* private mode: play without saving */ }
  function saveProgress() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(progress)); } catch (e) {}
  }

  var cv = document.getElementById('peakdash');
  var ctx = cv.getContext('2d');
  var CW = 880, CH = 480;
  var elCoins = document.getElementById('pd-coins');
  var elLevel = document.getElementById('pd-level');
  var elHearts = document.getElementById('pd-hearts');
  var elStatus = document.getElementById('pd-status');
  var over = document.getElementById('pd-over');
  var overTitle = document.getElementById('pd-over-title');
  var overStats = document.getElementById('pd-over-stats');
  var btnMain = document.getElementById('pd-ov-main');
  var btnAlt = document.getElementById('pd-ov-alt');
  var picker = document.getElementById('pd-picker');
  var pickerGrid = document.getElementById('pd-picker-grid');

  // Golden-hour palettes, one per world: sky top/bottom, sun, far ridge, near ridge.
  var PALETTES = [
    ['#8ec9e8', '#fdeeda', '#ffd76a', '#7fa8c9', '#4e7396'],
    ['#79b5dd', '#ffe9c9', '#ffcf5e', '#6f9bb8', '#42688c'],
    ['#6ea3d8', '#ffdfba', '#ffb84d', '#6490b4', '#3a5f86'],
    ['#7fb0dc', '#e8f3ff', '#fff3b0', '#7ea6cc', '#4a6f9e'],
    ['#f2a65e', '#ffe3ae', '#ffdf6b', '#a87f9e', '#6d557f'],
    ['#8fd0e0', '#fef6e0', '#ffe97a', '#6fa8bd', '#40708c'],
    ['#e8906f', '#ffd9a0', '#ffc44d', '#96708e', '#5f4a72'],
    ['#d97b54', '#ffc98f', '#ffab3d', '#8a5f74', '#543f5e'],
    ['#5f6fb4', '#e8b7d4', '#ffd76a', '#565d94', '#383d68'],
    ['#ffd76a', '#fff3d6', '#fff7ae', '#c99e6f', '#8a6748']
  ];
  function ridgePoints(seed, baseY, amp, step) {
    var r = makeRng(seed), pts = [], x = -100, y = baseY;
    while (x < 4200) { pts.push([x, y]); x += step + r() * step; y = baseY + (r() - 0.5) * 2 * amp; y = Math.max(120, Math.min(430, y)); }
    pts.push([x, y]);
    return pts;
  }

  var G = null;               // current run (Core.createRun)
  var started = false;
  var statusMsg = '';
  var keys = { left: false, right: false, jump: false };
  var touch = { left: false, right: false, jump: false };
  var camX = 0, shake = 0, landAt = -9, runPhase = 0;
  var particles = [];
  var ridges = null;

  function startLevel(level) {
    started = true;
    G = createRun(level);
    progress.current = G.level; saveProgress();
    camX = 0; shake = 0; particles = [];
    var pr = makeRng(hashSeed(777, G.level));
    ridges = {
      far: ridgePoints(1000 + G.level * 7, 300, 60, 130),
      near: ridgePoints(5000 + G.level * 13, 380, 52, 90),
      seed: pr
    };
    statusMsg = 'World ' + G.world + ' · ' + G.name + ' — reach the summit flag!';
    hideOverlay(); hidePicker(); updateHud();
  }
  function heartsStr() {
    var s = '';
    for (var i = 0; i < 3; i++) s += i < G.hearts ? '♥' : '♡';
    return s;
  }
  function updateHud() {
    if (!G) { elCoins.textContent = '—'; elLevel.textContent = '—'; elHearts.textContent = '♥♥♥'; return; }
    elCoins.textContent = G.coinsGot + ' / ' + G.data.coins.length;
    elLevel.textContent = G.level;
    elHearts.textContent = heartsStr();
    elStatus.textContent = statusMsg;
  }

  var mainFn = null, altFn = null;
  function showOverlay(o) {
    overTitle.textContent = o.title;
    overStats.textContent = o.stats || '';
    btnMain.textContent = o.mainLabel;
    btnAlt.textContent = o.altLabel;
    mainFn = o.mainFn; altFn = o.altFn;
    over.classList.remove('hidden');
  }
  function hideOverlay() { over.classList.add('hidden'); }
  btnMain.addEventListener('click', function () { if (mainFn) mainFn(); });
  btnAlt.addEventListener('click', function () { if (altFn) altFn(); });

  function showMenu() {
    showOverlay({
      title: 'Ready to climb?',
      stats: 'Run, jump and bounce your way to the summit flag. 100 levels across 10 mountain worlds — spikes, moving platforms and springs arrive one trick at a time.',
      mainLabel: '▶ Level ' + progress.current,
      mainFn: function () { startLevel(progress.current); },
      altLabel: 'All levels',
      altFn: openPicker
    });
  }
  function openPicker() {
    hideOverlay();
    pickerGrid.innerHTML = '';
    for (var lv = 1; lv <= 100; lv++) {
      (function (n) {
        var b = document.createElement('button');
        b.className = 'lvl-btn' + (n > progress.unlocked ? ' locked' : '');
        var st = progress.stars[String(n)] || 0;
        b.innerHTML = n + (st ? '<span>' + '★'.repeat(st) + '</span>' : '');
        b.disabled = n > progress.unlocked;
        b.addEventListener('click', function () { startLevel(n); });
        pickerGrid.appendChild(b);
      })(lv);
    }
    picker.classList.remove('hidden');
  }
  function hidePicker() { picker.classList.add('hidden'); }

  function onWon() {
    progress = recordClear(progress, G.level, G.stars);
    saveProgress();
    var starStr = '★'.repeat(G.stars) + '☆'.repeat(3 - G.stars);
    showOverlay({
      title: 'Summit reached! ' + starStr,
      stats: 'Level ' + G.level + ' · ' + G.name + ' — ' + G.coinsGot + ' of ' + G.data.coins.length +
        ' coins · ' + G.deaths + (G.deaths === 1 ? ' fall' : ' falls'),
      mainLabel: G.level < 100 ? 'Next level ▶' : 'Play level 100 again',
      mainFn: function () { startLevel(G.level < 100 ? G.level + 1 : 100); },
      altLabel: 'All levels',
      altFn: openPicker
    });
  }
  function onFailed() {
    showOverlay({
      title: 'Level ' + G.level + ' — out of hearts',
      stats: 'Three falls. Falling is information: each one taught you a timing. Watch where you fell, breathe, and take the smarter line.',
      mainLabel: 'Try again',
      mainFn: function () { startLevel(G.level); },
      altLabel: 'All levels',
      altFn: openPicker
    });
  }

  // ---------------------------------------------------------------- input
  function mergedInput() {
    return {
      left: keys.left || touch.left,
      right: keys.right || touch.right,
      jump: keys.jump || touch.jump
    };
  }
  var KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'jump', KeyW: 'jump', ArrowUp: 'jump' };
  document.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.code];
    if (!k) return;
    if (started && G && G.status === 'playing') e.preventDefault();
    keys[k] = true;
  });
  document.addEventListener('keyup', function (e) {
    var k = KEYMAP[e.code];
    if (k) keys[k] = false;
  });
  function bindTouch(id, prop) {
    var el = document.getElementById(id);
    if (!el) return;
    function on(e) { e.preventDefault(); touch[prop] = true; el.classList.add('on'); }
    function off(e) { e.preventDefault(); touch[prop] = false; el.classList.remove('on'); }
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointerleave', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  bindTouch('pd-t-left', 'left');
  bindTouch('pd-t-right', 'right');
  bindTouch('pd-t-jump', 'jump');

  // ---------------------------------------------------------------- drawing
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function drawRidge(pts, par, color) {
    var off = camX * par;
    ctx.beginPath();
    ctx.moveTo(-60, CH);
    pts.forEach(function (pt) { ctx.lineTo(pt[0] - (off % 4000), pt[1]); });
    // wrap a second copy so the ridge never runs out
    pts.forEach(function (pt) { ctx.lineTo(pt[0] - (off % 4000) + 4000, pt[1]); });
    ctx.lineTo(CW + 60, CH);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  function drawPlatform(s) {
    var x = s.x - camX, y = s.y;
    if (x + s.w < -20 || x > CW + 20) return;
    var g = ctx.createLinearGradient(0, y, 0, CH);
    g.addColorStop(0, '#8a6a52'); g.addColorStop(0.25, '#6f5340'); g.addColorStop(1, '#54402f');
    ctx.fillStyle = g;
    ctx.fillRect(x, y + 6, s.w, CH - y);
    // rocky shading stripes
    ctx.fillStyle = 'rgba(0,0,0,.10)';
    for (var rx = Math.floor(x / 46) * 46; rx < x + s.w; rx += 46) {
      ctx.fillRect(rx + 8, y + 40 + ((rx * 7) % 50), 16, 5);
    }
    // snow cap
    ctx.fillStyle = '#ffffff';
    rr(x - 1, y - 2, s.w + 2, 13, 6); ctx.fill();
    ctx.fillStyle = 'rgba(210,230,245,.9)';
    ctx.fillRect(x + 4, y + 8, s.w - 8, 3);
  }
  function drawMover(m) {
    var x = m.cx - camX, y = m.y;
    ctx.strokeStyle = 'rgba(60,40,30,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + 8, y - 90); ctx.moveTo(x + m.w - 8, y); ctx.lineTo(x + m.w - 8, y - 90); ctx.stroke();
    var g = ctx.createLinearGradient(0, y, 0, y + 16);
    g.addColorStop(0, '#a97c50'); g.addColorStop(1, '#7d5836');
    ctx.fillStyle = g; rr(x, y, m.w, 16, 5); ctx.fill();
    ctx.fillStyle = '#fff'; rr(x - 1, y - 3, m.w + 2, 9, 4); ctx.fill();
  }
  function drawSpring(sp, t) {
    var x = sp.x - camX, base = sp.y;
    if (x < -50 || x > CW + 50) return;
    var squash = (t - G.springAt < 0.18) ? 0.45 : 1;
    var h = 16 * squash;
    ctx.fillStyle = '#5b6b7a'; rr(x + 2, base - 4, TILE - 4, 5, 2); ctx.fill();
    ctx.strokeStyle = '#d8455b'; ctx.lineWidth = 3;
    ctx.beginPath();
    var coils = 3, cw2 = TILE - 10;
    for (var i = 0; i <= coils * 2; i++) {
      var px = x + 5 + (i % 2 === 0 ? 0 : cw2);
      var py = base - 4 - (h - 4) * (i / (coils * 2));
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = '#ff6b81'; rr(x, base - h - 5, TILE, 6, 3); ctx.fill();
  }
  function drawSpikes(sk) {
    var x = sk.x - camX;
    if (x + sk.w < -20 || x > CW + 20) return;
    ctx.fillStyle = '#9aa7b4';
    ctx.strokeStyle = '#5f6b78'; ctx.lineWidth = 1;
    var n = Math.round(sk.w / 16);
    for (var i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 16, sk.y + sk.h);
      ctx.lineTo(x + i * 16 + 8, sk.y);
      ctx.lineTo(x + i * 16 + 16, sk.y + sk.h);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  function drawCoin(c, taken, t) {
    if (taken) return;
    var x = c.x - camX, y = c.y + Math.sin(t * 3 + c.x) * 2;
    if (x < -20 || x > CW + 20) return;
    var sq = Math.abs(Math.cos(t * 4 + c.x * 0.7));
    ctx.save();
    ctx.translate(x, y); ctx.scale(0.35 + 0.65 * sq, 1);
    var g = ctx.createRadialGradient(-2, -3, 1, 0, 0, 10);
    g.addColorStop(0, '#fff3b0'); g.addColorStop(0.6, '#ffd23e'); g.addColorStop(1, '#e8a90c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b97e04'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#b97e04';
    ctx.font = '900 10px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 1);
    ctx.restore();
  }
  function drawFlag(t) {
    var L = G.data, fx = L.flag.x - camX, fy = L.flag.y;
    if (fx < -60 || fx > CW + 60) return;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(fx + 6, fy + 2, 30, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7d8894'; rr(fx + 3, fy - 100, 6, 100, 3); ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(fx + 6, fy - 104, 5, 0, Math.PI * 2); ctx.fill();
    var wave = Math.sin(t * 6) * 3;
    ctx.fillStyle = '#e84393';
    ctx.beginPath();
    ctx.moveTo(fx + 9, fy - 100);
    ctx.quadraticCurveTo(fx + 26, fy - 98 + wave, fx + 40, fy - 92 + wave);
    ctx.quadraticCurveTo(fx + 26, fy - 86 + wave, fx + 9, fy - 82);
    ctx.closePath(); ctx.fill();
  }
  function drawPlayer(t) {
    var p = G.player;
    var x = p.x - camX + p.w / 2, y = p.y + p.h;
    var blink = G.invuln > 0 && Math.floor(t * 14) % 2 === 0;
    ctx.save();
    ctx.translate(x, y);
    // squash & stretch: stretch while rising fast, squash just after landing
    var sx = 1, sy = 1;
    if (!p.onGround) { var st = Math.min(0.16, Math.abs(p.vy) / 4200); sx = 1 - st; sy = 1 + st; }
    else if (t - landAt < 0.14) { sx = 1.18; sy = 0.8; }
    ctx.scale(sx * p.facing, sy);
    if (blink) ctx.globalAlpha = 0.35;
    // backpack
    ctx.fillStyle = '#27ae60'; rr(-11, -24, 9, 14, 3); ctx.fill();
    // legs (run cycle)
    ctx.fillStyle = '#34495e';
    var lp = p.onGround && Math.abs(p.vx) > 10 ? Math.sin(runPhase * 22) * 5 : 0;
    ctx.fillRect(-7, -8 + Math.max(0, lp), 5, 8 - Math.max(0, lp));
    ctx.fillRect(2, -8 + Math.max(0, -lp), 5, 8 - Math.max(0, -lp));
    // boots
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(-8, -2 + Math.max(0, lp), 7, 3);
    ctx.fillRect(1, -2 + Math.max(0, -lp), 7, 3);
    // jacket body
    var bg = ctx.createLinearGradient(0, -26, 0, -8);
    bg.addColorStop(0, '#ff8a5c'); bg.addColorStop(1, '#e85d3d');
    ctx.fillStyle = bg; rr(-9, -26, 18, 18, 6); ctx.fill();
    // head
    ctx.fillStyle = '#ffd9b3';
    ctx.beginPath(); ctx.arc(1, -31, 7.5, 0, Math.PI * 2); ctx.fill();
    // beanie + pompom
    ctx.fillStyle = '#0ea5a4';
    ctx.beginPath(); ctx.arc(1, -33, 7.5, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(-6.5, -34.5, 15, 3.4);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(1, -41, 3, 0, Math.PI * 2); ctx.fill();
    // eye + smile
    ctx.fillStyle = '#22303c';
    ctx.beginPath(); ctx.arc(4.5, -31, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#22303c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(3.5, -28.6, 2.4, 0.15 * Math.PI, 0.75 * Math.PI); ctx.stroke();
    ctx.restore();
  }
  function spawnDust(x, y, n) {
    for (var i = 0; i < n; i++) {
      particles.push({
        x: x, y: y, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 40 - 8,
        r: 2 + Math.random() * 3.4, life: 0.45 + Math.random() * 0.25, t: 0
      });
    }
  }
  function drawParticles(dt) {
    particles = particles.filter(function (pt) { return pt.t < pt.life; });
    particles.forEach(function (pt) {
      pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy -= 30 * dt;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * (1 - pt.t / pt.life)) + ')';
      ctx.beginPath(); ctx.arc(pt.x - camX, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
    });
  }

  var statusFlashUntil = 0;
  function draw(now) {
    var t = now / 1000;
    if (G) {
      var pal = PALETTES[G.world - 1];
      var sky = ctx.createLinearGradient(0, 0, 0, CH);
      sky.addColorStop(0, pal[0]); sky.addColorStop(1, pal[1]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
      // sun
      ctx.fillStyle = pal[2];
      ctx.beginPath(); ctx.arc(CW - 130 - camX * 0.05 % 60, 84, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.arc(CW - 130 - camX * 0.05 % 60, 84, 42, 0, Math.PI * 2); ctx.fill();
      if (ridges) { drawRidge(ridges.far, 0.25, pal[3]); drawRidge(ridges.near, 0.5, pal[4]); }
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      G.data.solids.forEach(drawPlatform);
      G.moversRt.forEach(drawMover);
      G.data.springs.forEach(function (sp) { drawSpring(sp, t); });
      G.data.spikes.forEach(drawSpikes);
      G.data.coins.forEach(function (c, i) { drawCoin(c, G.coinsTaken[i], t); });
      drawFlag(t);
      drawPlayer(t);
      ctx.restore();
      drawParticles(1 / 60);
    }
    requestAnimationFrame(draw);
  }

  // ---------------------------------------------------------------- main loop
  var lastTs = 0, acc = 0, ended = false, dustTimer = 0;
  function frame(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.1, (ts - lastTs) / 1000);
    lastTs = ts;
    if (G && G.status === 'playing' && over.classList.contains('hidden') && picker.classList.contains('hidden')) {
      acc += dt;
      var input = mergedInput();
      var guard = 0;
      while (acc >= PHYS.STEP && guard < 16) {
        var ev = stepRun(G, input);
        acc -= PHYS.STEP; guard++;
        for (var i = 0; i < ev.length; i++) {
          if (ev[i] === 'land') { landAt = G.time; spawnDust(G.player.x + 11, G.player.y + G.player.h, 5); }
          if (ev[i] === 'death') {
            shake = 7;
            statusMsg = 'Ouch! Falling is information — that fall just taught you a timing.';
            statusFlashUntil = G.time + 2.5;
          }
          if (ev[i] === 'spring') spawnDust(G.player.x + 11, G.player.y + G.player.h, 4);
        }
        if (G.status !== 'playing') break;
      }
      var p = G.player;
      if (p.onGround && Math.abs(p.vx) > 10) {
        runPhase += dt;
        dustTimer -= dt;
        if (dustTimer <= 0) { spawnDust(p.x + 11 - p.facing * 8, p.y + p.h, 1); dustTimer = 0.14; }
      }
      var targetCam = Math.max(0, Math.min(G.data.w - CW, p.x + p.w / 2 - CW * 0.42));
      camX += (targetCam - camX) * Math.min(1, dt * 7);
      if (shake > 0) shake = Math.max(0, shake - dt * 26);
      if (statusFlashUntil && G.time > statusFlashUntil) {
        statusMsg = 'World ' + G.world + ' · ' + G.name + ' — reach the summit flag!';
        statusFlashUntil = 0;
      }
      updateHud();
      if (G.status === 'won' && !ended) { ended = true; onWon(); }
      if (G.status === 'failed' && !ended) { ended = true; onFailed(); }
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- go
  G = createRun(progress.current);
  camX = 0;
  ridges = {
    far: ridgePoints(1000 + G.level * 7, 300, 60, 130),
    near: ridgePoints(5000 + G.level * 13, 380, 52, 90)
  };
  statusMsg = 'World ' + G.world + ' · ' + G.name + ' — reach the summit flag!';
  // reset the ended flag whenever a level (re)starts
  var _startLevel = startLevel;
  startLevel = function (level) { ended = false; _startLevel(level); };
  document.getElementById('pd-restart').addEventListener('click', function () { if (G) startLevel(G.level); });
  document.getElementById('pd-levels').addEventListener('click', openPicker);
  document.getElementById('pd-picker-close').addEventListener('click', function () {
    hidePicker();
    if (!started || !G || G.status !== 'playing') showMenu();
  });
  updateHud();
  showMenu();
  requestAnimationFrame(draw);
  requestAnimationFrame(frame);
  // Test hook for the automated browser check (invisible to players).
  window.__pd = function () {
    if (!G) return null;
    return {
      status: G.status, level: G.level, x: Math.round(G.player.x), y: Math.round(G.player.y),
      vy: Math.round(G.player.vy), onGround: G.player.onGround,
      coins: G.coinsGot, hearts: G.hearts, deaths: G.deaths
    };
  };
})();
