// Tower Stack — Wisely Arcade
// Drop each sliding block onto the tower. Overhang gets sliced off.
// Every 5 blocks = a new level: faster slide, and wind from level 3.
(function () {
  'use strict';

  var canvas = document.getElementById('tower');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 420, H = 620, BH = 26, GROUND = 70;
  var BASE_W = 300;
  var PERFECT_TOL = 6;

  var state = 'ready'; // ready | playing | over
  var blocks = [];     // placed blocks: {x (center), w}
  var mover = null;    // sliding block: {x, w, dir}
  var debris = [];     // sliced-off pieces: {x, w, y, vy, rot, vr, life}
  var missed = null;   // the block that missed, falling
  var popups = [];     // floating texts: {text, y, life, color}

  var placed = 0, level = 1, combo = 0;
  var best = 0;
  try { best = parseInt(localStorage.getItem('towerStackBest') || '0', 10) || 0; } catch (e) {}

  var camY = 0;        // camera offset (world -> screen)
  var time = 0;
  var lastT = 0;

  var elHeight = document.getElementById('t-height');
  var elLevel = document.getElementById('t-level');
  var elBest = document.getElementById('t-best');
  var overlay = document.getElementById('t-over');
  var overStats = document.getElementById('t-over-stats');

  var PALETTE = [
    ['#ffd9a0', '#f0a35e'], ['#ffc4b8', '#ee7f6d'], ['#e7c6ff', '#a678e8'],
    ['#bfe3ff', '#5ea9ee'], ['#c9f2d8', '#58bd82'], ['#fff3b0', '#e8b93e']
  ];

  function speed() { return 200 + (level - 1) * 48; }
  function windAmp() { return level >= 3 ? Math.min(46, (level - 2) * 9) : 0; }

  function reset() {
    blocks = [{ x: W / 2, w: BASE_W }];
    debris = []; missed = null; popups = [];
    placed = 0; level = 1; combo = 0; camY = 0;
    state = 'ready';
    overlay.classList.add('hidden');
    spawnMover();
    updateStats();
    draw(0);
  }

  function spawnMover() {
    var prev = blocks[blocks.length - 1];
    var dir = (placed % 2 === 0) ? 1 : -1;
    mover = {
      x: dir === 1 ? prev.w / 2 : W - prev.w / 2,
      w: prev.w,
      dir: dir
    };
  }

  function moverRenderX() {
    return mover.x + Math.sin(time * 1.8) * windAmp();
  }

  function drop() {
    if (state === 'ready') { state = 'playing'; return; }
    if (state !== 'playing' || !mover) return;

    var prev = blocks[blocks.length - 1];
    var rx = moverRenderX();
    var dx = rx - prev.x;
    var left = Math.max(rx - mover.w / 2, prev.x - prev.w / 2);
    var right = Math.min(rx + mover.w / 2, prev.x + prev.w / 2);
    var newW = right - left;

    if (newW <= 0) {
      // Total miss — the block tumbles away.
      missed = { x: rx, w: mover.w, y: moverY(), vy: 60, rot: 0, vr: (dx > 0 ? 2.4 : -2.4), t: 0 };
      mover = null;
      state = 'over';
      finishGame();
      return;
    }

    if (Math.abs(dx) <= PERFECT_TOL) {
      // Perfect landing — no slice, combo grows.
      combo++;
      blocks.push({ x: rx, w: mover.w });
      popups.push({ text: combo > 1 ? 'Perfect x' + combo + '!' : 'Perfect!', y: moverY() - 14, life: 1, color: '#0EA5A4' });
    } else {
      combo = 0;
      var newX = (left + right) / 2;
      // The sliced-off overhang becomes falling debris.
      var cutW = mover.w - newW;
      var cutX = dx > 0 ? right + cutW / 2 : left - cutW / 2;
      debris.push({ x: cutX, w: cutW, y: moverY(), vy: 40, rot: 0, vr: (dx > 0 ? 1.6 : -1.6), life: 1.1 });
      blocks.push({ x: newX, w: newW });
    }

    placed++;
    var newLevel = 1 + Math.floor(placed / 5);
    if (newLevel > level) {
      level = newLevel;
      popups.push({ text: 'Level ' + level + (level === 3 ? ' — watch the wind!' : ' — faster!'), y: H * 0.3, life: 1.6, color: '#b3541e' });
    }
    if (placed > best) {
      best = placed;
      try { localStorage.setItem('towerStackBest', String(best)); } catch (e) {}
    }
    updateStats();
    spawnMover();
  }

  function moverY() {
    return screenY(blocks.length);
  }

  function screenY(i) {
    // i = stack level (0 = base). Returns screen Y of the block's TOP.
    return H - GROUND - (i + 1) * BH - camY;
  }

  function updateStats() {
    elHeight.textContent = placed;
    elLevel.textContent = level;
    elBest.textContent = best > 0 ? best : '—';
  }

  function finishGame() {
    var msg = 'You stacked ' + placed + (placed === 1 ? ' block' : ' blocks') + ' and reached level ' + level + '.';
    if (placed >= best && placed > 0) msg += ' That\'s your best tower yet!';
    overStats.textContent = msg;
    setTimeout(function () { overlay.classList.remove('hidden'); }, 700);
    updateStats();
  }

  // ---------- drawing ----------

  function skyColors() {
    // Sky deepens as the tower climbs: day -> sunset -> night.
    var t = Math.min(1, placed / 40);
    var top, bot;
    if (t < 0.5) {
      var k = t / 0.5;
      top = mix([250, 246, 234], [255, 183, 140], k);
      bot = mix([250, 246, 234], [255, 214, 170], k);
    } else {
      var k2 = (t - 0.5) / 0.5;
      top = mix([255, 183, 140], [38, 48, 92], k2);
      bot = mix([255, 214, 170], [94, 74, 128], k2);
    }
    return { top: css(top), bot: css(bot), night: t };
  }

  function mix(a, b, k) {
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }
  function css(c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBlock(cx, w, topY, paletteIdx, alpha) {
    var p = PALETTE[paletteIdx % PALETTE.length];
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    var g = ctx.createLinearGradient(0, topY, 0, topY + BH);
    g.addColorStop(0, p[0]);
    g.addColorStop(1, p[1]);
    rr(cx - w / 2, topY, w, BH, 5);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,70,20,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // highlight stripe
    rr(cx - w / 2 + 4, topY + 4, w - 8, 5, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
    ctx.restore();
  }

  function draw(dt) {
    var sky = skyColors();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, sky.top);
    g.addColorStop(1, sky.bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // stars at high altitude
    if (sky.night > 0.45) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (sky.night - 0.45) * 3);
      ctx.fillStyle = '#fff';
      for (var s = 0; s < 50; s++) {
        var sx = (s * 97.3) % W, sy = (s * 57.7) % (H * 0.6);
        var tw = 0.5 + 0.5 * Math.sin(time * 3 + s);
        ctx.globalAlpha = 0.25 + 0.55 * tw * Math.min(1, (sky.night - 0.45) * 3);
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.restore();
    }

    // ground
    ctx.fillStyle = 'rgba(120, 85, 40, 0.35)';
    ctx.fillRect(0, H - GROUND + BH, W, GROUND - BH);
    ctx.fillStyle = 'rgba(120, 85, 40, 0.55)';
    ctx.fillRect(0, H - GROUND + BH, W, 4);

    // placed blocks
    for (var i = 0; i < blocks.length; i++) {
      var y = screenY(i);
      if (y > H + 40 || y < -60) continue;
      drawBlock(blocks[i].x, blocks[i].w, y, i);
    }

    // sliding block
    if (mover && state !== 'over') {
      var rx = moverRenderX();
      var my = screenY(blocks.length);
      // guide shimmer under the mover
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#b3541e';
      ctx.fillRect(rx - mover.w / 2, my + BH, mover.w, 3);
      ctx.restore();
      drawBlock(rx, mover.w, my, blocks.length);
      // wind hint arrows at level 3+
      if (windAmp() > 0 && state === 'playing') {
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 4);
        ctx.fillStyle = '#7a4a1e';
        ctx.font = '700 13px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('~ wind ~', W / 2, my - 12);
        ctx.restore();
      }
    }

    // debris
    for (var d = debris.length - 1; d >= 0; d--) {
      var db = debris[d];
      db.t = (db.t || 0) + dt;
      db.vy += 900 * dt;
      db.y += db.vy * dt;
      db.rot += db.vr * dt;
      db.life -= dt;
      if (db.life <= 0 || db.y > H + 60) { debris.splice(d, 1); continue; }
      ctx.save();
      ctx.translate(db.x, db.y + BH / 2);
      ctx.rotate(db.rot);
      ctx.globalAlpha = Math.min(1, db.life);
      drawBlock(0, db.w, -BH / 2, blocks.length);
      ctx.restore();
    }

    // missed block tumbling
    if (missed) {
      missed.t += dt;
      missed.vy += 900 * dt;
      missed.y += missed.vy * dt;
      missed.rot += missed.vr * dt;
      ctx.save();
      ctx.translate(missed.x, missed.y + BH / 2);
      ctx.rotate(missed.rot);
      ctx.globalAlpha = Math.max(0, 1 - missed.t / 1.4);
      drawBlock(0, missed.w, -BH / 2, blocks.length);
      ctx.restore();
    }

    // popups
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '800 22px Nunito, sans-serif';
    for (var p = popups.length - 1; p >= 0; p--) {
      var pp = popups[p];
      pp.life -= dt;
      pp.y -= 34 * dt;
      if (pp.life <= 0) { popups.splice(p, 1); continue; }
      ctx.globalAlpha = Math.min(1, pp.life * 1.6);
      ctx.fillStyle = pp.color;
      ctx.fillText(pp.text, W / 2, pp.y);
    }
    ctx.restore();

    // ready prompt
    if (state === 'ready') {
      ctx.save();
      ctx.globalAlpha = 0.85 + 0.15 * Math.sin(time * 3);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#5b3a1a';
      ctx.font = '800 20px Nunito, sans-serif';
      ctx.fillText('Tap, click, or press Space to drop', W / 2, H * 0.42);
      ctx.font = '700 15px Nunito, sans-serif';
      ctx.globalAlpha = 0.7;
      ctx.fillText('Line each block up — overhang gets sliced off', W / 2, H * 0.42 + 26);
      ctx.restore();
    }
  }

  function frame(t) {
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0);
    lastT = t;
    time += dt;

    if (state === 'playing' && mover) {
      mover.x += mover.dir * speed() * dt;
      if (mover.x - mover.w / 2 <= 0) { mover.x = mover.w / 2; mover.dir = 1; }
      if (mover.x + mover.w / 2 >= W) { mover.x = W - mover.w / 2; mover.dir = -1; }
      // camera follows the tower top
      var target = Math.max(0, blocks.length * BH - H * 0.52);
      camY += (target - camY) * Math.min(1, dt * 4);
    }

    draw(dt);
    requestAnimationFrame(frame);
  }

  // ---------- input ----------
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    drop();
  });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowDown') {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'BUTTON' || tag === 'A') return; // let focused buttons work normally
      e.preventDefault();
      drop();
    }
  });

  document.getElementById('t-restart').addEventListener('click', reset);
  document.getElementById('t-again').addEventListener('click', reset);

  updateStats();
  reset();
  requestAnimationFrame(function (t) { lastT = t; requestAnimationFrame(frame); });
})();
