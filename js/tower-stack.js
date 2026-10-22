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

  // ---- Round 1 cinematic polish: dust puffs + shooting star (visual only) ----
  var dusts = [];
  var dustCursor = 0;
  for (var di0 = 0; di0 < 40; di0++) dusts.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1 });
  function spawnDust(x, y) {
    for (var dn = 0; dn < 6; dn++) {
      var dp = dusts[dustCursor];
      dustCursor = (dustCursor + 1) % dusts.length;
      dp.x = x + (Math.random() - 0.5) * 70;
      dp.y = y + BH - 4;
      dp.vx = (Math.random() - 0.5) * 90;
      dp.vy = -20 - Math.random() * 55;
      dp.max = dp.life = 0.32 + Math.random() * 0.16;
    }
  }
  var meteor = null;
  var nextMeteor = 9;

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
      spawnDust(rx, moverY());
      blocks.push({ x: rx, w: mover.w });
      popups.push({ text: combo > 1 ? 'Perfect x' + combo + '!' : 'Perfect!', y: moverY() - 14, life: 1, color: '#0EA5A4' });
    } else {
      combo = 0;
      var newX = (left + right) / 2;
      // The sliced-off overhang becomes falling debris.
      var cutW = mover.w - newW;
      var cutX = dx > 0 ? right + cutW / 2 : left - cutW / 2;
      debris.push({ x: cutX, w: cutW, y: moverY(), vy: 40, rot: 0, vr: (dx > 0 ? 1.6 : -1.6), life: 1.1 });
      spawnDust(newX, moverY());
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

  // ---- v3 premium polish: deterministic detail + skyline (visual only) ----
  function hash1(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  var SKY_FAR = [], SKY_NEAR = [];
  (function buildSkyline() {
    var s = 987654321;
    function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    var x = -14;
    while (x < W + 20) { var bw = 26 + rnd() * 32; SKY_FAR.push({ x: x, w: bw, h: 64 + rnd() * 128 }); x += bw + 2 + rnd() * 8; }
    x = -10;
    while (x < W + 20) { var nw = 34 + rnd() * 40; SKY_NEAR.push({ x: x, w: nw, h: 38 + rnd() * 88 }); x += nw + 3 + rnd() * 10; }
  })();

  function drawSkylineLayer(list, baseY, colFar, colNear, night, winAlpha, seedBase) {
    for (var bi = 0; bi < list.length; bi++) {
      var b = list[bi];
      var top = baseY - b.h;
      ctx.fillStyle = css(mix(colFar, colNear, night));
      ctx.fillRect(b.x, top, b.w, b.h);
      // little rooftop nub on some buildings
      if (hash1(seedBase + bi * 3.1) > 0.55) ctx.fillRect(b.x + b.w * 0.32, top - 5, b.w * 0.3, 5);
      if (winAlpha > 0.02) {
        var cols = Math.max(1, Math.floor(b.w / 10));
        var rows = Math.max(1, Math.floor(b.h / 15));
        for (var cx2 = 0; cx2 < cols; cx2++) {
          for (var cy2 = 0; cy2 < rows; cy2++) {
            var lit = hash1(seedBase + bi * 131.7 + cx2 * 17.3 + cy2 * 41.9);
            if (lit < 0.34) {
              ctx.fillStyle = 'rgba(255,196,96,' + (winAlpha * (0.45 + 0.55 * lit)).toFixed(3) + ')';
              ctx.fillRect(b.x + 3 + cx2 * 10, top + 5 + cy2 * 15, 4.5, 6.5);
            }
          }
        }
      }
    }
  }

  function drawCone(cx, baseY) {
    ctx.save();
    ctx.fillStyle = 'rgba(20,10,30,0.25)';
    ctx.beginPath(); ctx.ellipse(cx, baseY + 2, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
    var cg2 = ctx.createLinearGradient(cx - 8, 0, cx + 8, 0);
    cg2.addColorStop(0, '#ff9a3c'); cg2.addColorStop(0.5, '#f4741f'); cg2.addColorStop(1, '#c6530f');
    ctx.fillStyle = cg2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, baseY); ctx.lineTo(cx - 3.4, baseY - 19); ctx.lineTo(cx + 3.4, baseY - 19); ctx.lineTo(cx + 8, baseY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,246,230,0.92)';
    ctx.fillRect(cx - 5.6, baseY - 12.5, 11.2, 4.4);
    ctx.fillStyle = '#a34a10';
    ctx.fillRect(cx - 10, baseY - 1.6, 20, 3.2);
    ctx.restore();
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

  function shade(hex, amt) {
    // Lighten (amt > 0) or darken (amt < 0) a #rrggbb color.
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

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
    // v3 premium materials: wood crate / concrete / glass / steel girder /
    // brick / timber — seeded per block index, warm key light from upper left.
    var a = alpha === undefined ? 1 : alpha;
    var seed = paletteIdx;
    var mat = ((paletteIdx % 6) + 6) % 6;
    ctx.save();
    ctx.globalAlpha = a;
    var x = cx - w / 2, y = topY, r = Math.min(5, BH / 2);

    // ---- soft cast shadow onto whatever is below ----
    ctx.save();
    ctx.shadowColor = 'rgba(25,12,45,0.40)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    rr(x, y, w, BH, r);
    ctx.fillStyle = '#6b5136';
    ctx.fill();
    ctx.restore();

    // ---- material body, clipped to the block shape ----
    ctx.save();
    rr(x, y, w, BH, r);
    ctx.clip();
    var g, i2, j2;
    if (mat === 0) {
      // wood crate: plank seams, grain, frame, corner nails
      g = ctx.createLinearGradient(0, y, 0, y + BH);
      g.addColorStop(0, '#c98d4b'); g.addColorStop(0.5, '#a96f31'); g.addColorStop(1, '#845422');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, BH);
      ctx.strokeStyle = 'rgba(70,40,10,0.35)'; ctx.lineWidth = 1;
      for (i2 = 0; i2 < 5; i2++) {
        var gy = y + 4 + hash1(seed * 7.3 + i2 * 3.7) * (BH - 8);
        ctx.beginPath();
        ctx.moveTo(x + 2, gy);
        ctx.bezierCurveTo(x + w * 0.3, gy + 1.6, x + w * 0.7, gy - 1.6, x + w - 2, gy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(60,32,6,0.5)';
      ctx.fillRect(x, y + BH / 2 - 0.75, w, 1.5);
      ctx.strokeStyle = 'rgba(62,36,8,0.85)'; ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, BH - 3);
      ctx.fillStyle = '#3d2c17';
      var nx = [x + 5, x + w - 5], ny = [y + 5, y + BH - 5];
      for (i2 = 0; i2 < 2; i2++) for (j2 = 0; j2 < 2; j2++) {
        ctx.beginPath(); ctx.arc(nx[i2], ny[j2], 1.5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (mat === 1) {
      // concrete: speckle, formwork seam, beveled top
      g = ctx.createLinearGradient(0, y, 0, y + BH);
      g.addColorStop(0, '#d6d4cf'); g.addColorStop(0.55, '#b3b0a9'); g.addColorStop(1, '#8f8c85');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, BH);
      for (i2 = 0; i2 < 26; i2++) {
        var sx2 = x + hash1(seed * 13.1 + i2 * 7.7) * w;
        var sy2 = y + hash1(seed * 5.9 + i2 * 11.3) * BH;
        ctx.fillStyle = hash1(seed + i2 * 3.3) > 0.5 ? 'rgba(70,68,62,0.35)' : 'rgba(255,255,255,0.30)';
        ctx.fillRect(sx2, sy2, 1.6, 1.6);
      }
      ctx.fillStyle = 'rgba(90,88,82,0.35)';
      ctx.fillRect(x + w * (0.3 + hash1(seed * 3.1) * 0.4), y + 2, 1.2, BH - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x, y, w, 2);
    } else if (mat === 2) {
      // glass: translucent cyan, diagonal shine, bright frame
      g = ctx.createLinearGradient(0, y, 0, y + BH);
      g.addColorStop(0, 'rgba(178,232,248,0.88)'); g.addColorStop(0.55, 'rgba(110,196,226,0.82)'); g.addColorStop(1, 'rgba(64,152,196,0.88)');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, BH);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.16, y + BH); ctx.lineTo(x + w * 0.42, y); ctx.lineTo(x + w * 0.60, y); ctx.lineTo(x + w * 0.34, y + BH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.40)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.52, y + BH); ctx.lineTo(x + w * 0.78, y); ctx.lineTo(x + w * 0.86, y); ctx.lineTo(x + w * 0.60, y + BH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(224,246,255,0.95)'; ctx.lineWidth = 1.6;
      ctx.strokeRect(x + 1, y + 1, w - 2, BH - 2);
    } else if (mat === 3) {
      // steel girder: inset panel, rivets, brushed highlight
      g = ctx.createLinearGradient(0, y, 0, y + BH);
      g.addColorStop(0, '#93a7bb'); g.addColorStop(0.5, '#677b90'); g.addColorStop(1, '#47596c');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, BH);
      ctx.fillStyle = 'rgba(28,40,54,0.35)';
      ctx.fillRect(x + 7, y + 5, Math.max(0, w - 14), BH - 10);
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      ctx.fillRect(x + 7, y + 5, Math.max(0, w - 14), 1.4);
      ctx.fillStyle = '#2c3a49';
      var riv = Math.max(2, Math.floor(w / 26));
      for (i2 = 0; i2 <= riv; i2++) {
        var rxv = riv === 0 ? x + w / 2 : x + 6 + (w - 12) * (i2 / riv);
        ctx.beginPath(); ctx.arc(rxv, y + 4.6, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rxv, y + BH - 4.6, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    } else if (mat === 4) {
      // brick: two courses, offset mortar joints, speckle
      g = ctx.createLinearGradient(0, y, 0, y + BH);
      g.addColorStop(0, '#c96a4a'); g.addColorStop(1, '#9c4630');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, BH);
      ctx.strokeStyle = 'rgba(238,220,200,0.55)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x, y + BH / 2); ctx.lineTo(x + w, y + BH / 2); ctx.stroke();
      var bw2 = 30;
      for (var course = 0; course < 2; course++) {
        var off = (course === 0 ? hash1(seed * 3.7) * 14 : hash1(seed * 3.7) * 14 + bw2 / 2);
        ctx.beginPath();
        for (var jx = x - off + bw2; jx < x + w - 3; jx += bw2) {
          ctx.moveTo(jx, y + course * BH / 2 + 1.5);
          ctx.lineTo(jx, y + (course + 1) * BH / 2 - 1.5);
        }
        ctx.stroke();
      }
      for (i2 = 0; i2 < 14; i2++) {
        ctx.fillStyle = 'rgba(60,22,12,0.22)';
        ctx.fillRect(x + hash1(seed * 9.4 + i2 * 6.1) * w, y + hash1(seed * 4.3 + i2 * 8.9) * BH, 1.8, 1.4);
      }
    } else {
      // timber planks: vertical boards, knots, grain
      g = ctx.createLinearGradient(0, y, 0, y + BH);
      g.addColorStop(0, '#a87c42'); g.addColorStop(1, '#77501f');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, BH);
      ctx.fillStyle = 'rgba(52,30,6,0.55)';
      for (var px = x + 16 + hash1(seed * 2.9) * 6; px < x + w - 4; px += 19) ctx.fillRect(px, y, 1.6, BH);
      for (i2 = 0; i2 < 2; i2++) {
        var kx = x + 8 + hash1(seed * 11.7 + i2 * 23.3) * Math.max(4, w - 16);
        var ky = y + 6 + hash1(seed * 6.3 + i2 * 17.9) * (BH - 12);
        ctx.strokeStyle = 'rgba(52,30,6,0.6)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(kx, ky, 2.6, 1.7, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(52,30,6,0.25)';
      for (i2 = 0; i2 < 4; i2++) {
        var ty = y + 4 + hash1(seed * 8.8 + i2 * 5.1) * (BH - 8);
        ctx.beginPath(); ctx.moveTo(x + 2, ty); ctx.lineTo(x + w - 2, ty + 1.5); ctx.stroke();
      }
    }

    // ---- warm key light (sun side, upper left) + cool right shade ----
    var kg = ctx.createLinearGradient(x, 0, x + w, 0);
    kg.addColorStop(0, 'rgba(255,226,170,0.20)');
    kg.addColorStop(0.38, 'rgba(255,226,170,0)');
    kg.addColorStop(0.82, 'rgba(16,20,44,0.10)');
    kg.addColorStop(1, 'rgba(16,20,44,0.26)');
    ctx.fillStyle = kg; ctx.fillRect(x, y, w, BH);
    // top edge light + bottom contact occlusion
    var tg2 = ctx.createLinearGradient(0, y, 0, y + 7);
    tg2.addColorStop(0, 'rgba(255,244,214,0.5)'); tg2.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = tg2; ctx.fillRect(x, y, w, 7);
    var bg2 = ctx.createLinearGradient(0, y + BH * 0.62, 0, y + BH);
    bg2.addColorStop(0, 'rgba(10,8,24,0)'); bg2.addColorStop(1, 'rgba(10,8,24,0.26)');
    ctx.fillStyle = bg2; ctx.fillRect(x, y + BH * 0.62, w, BH * 0.38);
    ctx.restore();

    // ---- beveled edge ----
    rr(x, y, w, BH, r);
    ctx.strokeStyle = 'rgba(24,16,38,0.45)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }

  function draw(dt) {
    var sky = skyColors();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, sky.top);
    g.addColorStop(1, sky.bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // soft sun glow (day) fading as night falls
    var sun = ctx.createRadialGradient(W * 0.5, H * 0.30, 8, W * 0.5, H * 0.30, W * 0.8);
    sun.addColorStop(0, 'rgba(255,244,214,' + (0.32 * (1 - sky.night)).toFixed(3) + ')');
    sun.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, W, H);

    // Round 1: god-ray cone from the sun toward the tower (fades at night)
    if (sky.night < 0.85) {
      var rayA = 0.16 * (1 - sky.night);
      var rayG = ctx.createLinearGradient(0, H * 0.30, 0, H * 0.80);
      rayG.addColorStop(0, 'rgba(255,244,214,' + rayA.toFixed(3) + ')');
      rayG.addColorStop(1, 'rgba(255,244,214,0)');
      ctx.fillStyle = rayG;
      ctx.beginPath();
      ctx.moveTo(W * 0.5 - 24, H * 0.30);
      ctx.lineTo(W * 0.5 + 24, H * 0.30);
      ctx.lineTo(W * 0.5 + 95, H * 0.80);
      ctx.lineTo(W * 0.5 - 95, H * 0.80);
      ctx.closePath();
      ctx.fill();
    }

    // Round 1: three drifting pastel clouds (soft ellipses, wrap around)
    ctx.save();
    for (var ci = 0; ci < 3; ci++) {
      var cww = 100 + ci * 34;
      var cx = ((ci * 179 + time * (7 + ci * 4)) % (W + 260)) - 130;
      var cy = 64 + ci * 48;
      var cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, cww / 2);
      cg.addColorStop(0, 'rgba(255,255,255,0.5)');
      cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cww / 2, cww / 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Round 1: shooting star every ~12s (thin pastel streak across upper sky)
    if (time > nextMeteor) {
      nextMeteor = time + 10 + Math.random() * 6;
      meteor = { x: W * 0.15 + Math.random() * W * 0.6, y: 36 + Math.random() * 90, life: 1 };
    }
    if (meteor) {
      meteor.life -= dt * 1.5;
      meteor.x += 300 * dt;
      meteor.y += 120 * dt;
      if (meteor.life <= 0) { meteor = null; }
      else {
        var ma = Math.max(0, meteor.life);
        var mg = ctx.createLinearGradient(meteor.x, meteor.y, meteor.x - 72, meteor.y - 30);
        mg.addColorStop(0, 'rgba(255,250,235,' + (0.9 * ma).toFixed(3) + ')');
        mg.addColorStop(1, 'rgba(255,250,235,0)');
        ctx.save();
        ctx.strokeStyle = mg;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(meteor.x, meteor.y);
        ctx.lineTo(meteor.x - 72, meteor.y - 30);
        ctx.stroke();
        ctx.restore();
      }
    }

    // cool moon glow + glowing moon disc at high altitude
    if (sky.night > 0.5) {
      var mk = (sky.night - 0.5) * 2;
      var moon = ctx.createRadialGradient(W * 0.78, H * 0.16, 8, W * 0.78, H * 0.16, W * 0.5);
      moon.addColorStop(0, 'rgba(235,242,255,' + (0.35 * mk).toFixed(3) + ')');
      moon.addColorStop(1, 'rgba(235,242,255,0)');
      ctx.fillStyle = moon;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = mk;
      ctx.shadowColor = 'rgba(220,232,255,0.9)';
      ctx.shadowBlur = 26;
      ctx.fillStyle = 'rgba(240,246,255,0.95)';
      ctx.beginPath();
      ctx.arc(W * 0.78, H * 0.16, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // gentle vignette for depth
    var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(20,10,40,0.20)');
    ctx.fillStyle = vg;
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

    // v3: layered city skyline against the sky (lit windows grow with night)
    var skyBase = H - GROUND + BH + 8;
    drawSkylineLayer(SKY_FAR, skyBase, [203, 186, 205], [26, 28, 62], sky.night, Math.max(0, (sky.night - 0.18)) * 0.85, 11.3);
    drawSkylineLayer(SKY_NEAR, skyBase, [168, 148, 178], [15, 16, 40], sky.night, Math.max(0, (sky.night - 0.1)) * 1.0, 47.9);

    // ground (glossy soil band)
    var gg = ctx.createLinearGradient(0, H - GROUND + BH, 0, H);
    gg.addColorStop(0, 'rgba(112,78,36,0.6)');
    gg.addColorStop(0.12, 'rgba(150,108,52,0.55)');
    gg.addColorStop(1, 'rgba(80,54,24,0.45)');
    ctx.fillStyle = gg;
    ctx.fillRect(0, H - GROUND + BH, W, GROUND - BH);
    ctx.fillStyle = 'rgba(255,235,200,0.35)';
    ctx.fillRect(0, H - GROUND + BH, W, 3);

    // Round 1: warm glow ellipse under the tower base
    var tgw = ctx.createRadialGradient(W / 2, H - GROUND + BH, 4, W / 2, H - GROUND + BH, 210);
    tgw.addColorStop(0, 'rgba(255,214,150,0.28)');
    tgw.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = tgw;
    ctx.beginPath();
    ctx.ellipse(W / 2, H - GROUND + BH, 210, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    // v3: construction-site detail on the ground band (texture noise + cones)
    ctx.save();
    for (var gi = 0; gi < 90; gi++) {
      var gx = hash1(gi * 3.17) * W;
      var gy2 = (H - GROUND + BH) + 5 + hash1(gi * 7.71) * (GROUND - BH - 8);
      ctx.fillStyle = hash1(gi * 5.3) > 0.5 ? 'rgba(52,32,10,0.30)' : 'rgba(255,230,180,0.20)';
      ctx.fillRect(gx, gy2, 2.2, 1.8);
    }
    ctx.restore();
    drawCone(34, H - GROUND + BH + 34);
    drawCone(W - 40, H - GROUND + BH + 38);

    // v3: concrete foundation pad under the tower base
    if (blocks.length) {
      var padY = screenY(0) + BH - 1;
      if (padY < H + 20) {
        ctx.save();
        ctx.shadowColor = 'rgba(25,12,45,0.35)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        var pg = ctx.createLinearGradient(0, padY, 0, padY + 12);
        pg.addColorStop(0, '#c7c4bd'); pg.addColorStop(1, '#83807a');
        rr(W / 2 - BASE_W / 2 - 20, padY, BASE_W + 40, 12, 3);
        ctx.fillStyle = pg;
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(W / 2 - BASE_W / 2 - 18, padY + 1, BASE_W + 36, 1.6);
      }
    }

    // placed blocks
    for (var i = 0; i < blocks.length; i++) {
      var y = screenY(i);
      if (y > H + 40 || y < -60) continue;
      drawBlock(blocks[i].x, blocks[i].w, y, i);
    }

    // v3: site crane silhouette — mast, truss jib, blinking beacon
    ctx.save();
    ctx.fillStyle = 'rgba(34,30,54,0.88)';
    ctx.fillRect(W - 27, 26, 13, H - GROUND + BH - 26);            // mast
    ctx.fillRect(4, 12, W - 10, 11);                                 // jib
    ctx.fillRect(4, 12, 34, 17);                                     // counterweight block
    ctx.strokeStyle = 'rgba(34,30,54,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var tx = 12; tx < W - 34; tx += 22) { ctx.moveTo(tx, 23); ctx.lineTo(tx + 11, 12); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(34,30,54,0.7)';
    ctx.beginPath();
    for (var mx2 = 0; mx2 < 5; mx2++) { var myy = 44 + mx2 * 96; ctx.moveTo(W - 27, myy); ctx.lineTo(W - 14, myy + 44); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,214,140,0.5)';
    ctx.fillRect(4, 10.5, W - 10, 1.6);                              // jib rim light
    if (Math.sin(time * 2.4) > 0.2) {                                // beacon
      ctx.save();
      ctx.shadowColor = 'rgba(255,80,60,0.95)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff5a46';
      ctx.beginPath(); ctx.arc(W - 20.5, 7, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // sliding block
    if (mover && state !== 'over') {
      var rx = moverRenderX();
      var my = screenY(blocks.length);
      // v3: hoist cable + trolley from the jib down to the block
      ctx.save();
      ctx.strokeStyle = 'rgba(30,26,48,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(rx, 23); ctx.lineTo(rx, my - 5); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(rx - 0.8, 23); ctx.lineTo(rx - 0.8, my - 5); ctx.stroke();
      ctx.fillStyle = '#2b2742';
      ctx.fillRect(rx - 9, 19, 18, 8);
      ctx.fillStyle = '#F5A623';
      ctx.fillRect(rx - 9, 24.5, 18, 2.5);
      ctx.restore();
      // v3: soft contact shadow on the tower top under the hanging block
      ctx.save();
      ctx.fillStyle = 'rgba(20,10,34,0.28)';
      ctx.beginPath();
      ctx.ellipse(rx, my + BH + 2, mover.w * 0.46, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // guide shimmer under the mover
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#b3541e';
      ctx.fillRect(rx - mover.w / 2, my + BH, mover.w, 3);
      ctx.restore();
      drawBlock(rx, mover.w, my, blocks.length);
      // v3: hook block gripping the mover's top edge
      ctx.save();
      ctx.fillStyle = '#2b2742';
      ctx.fillRect(rx - 6, my - 6, 12, 7);
      ctx.fillStyle = '#F5A623';
      ctx.fillRect(rx - 6, my - 2.4, 12, 2);
      ctx.restore();
      // wind hint arrows at level 3+
      if (windAmp() > 0 && state === 'playing') {
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 4);
        ctx.fillStyle = '#7a4a1e';
        ctx.font = '600 16px "Barlow Condensed", Nunito, sans-serif';
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

    // Round 1: landing dust puffs (soft, fade in ~400ms)
    ctx.save();
    for (var du = dusts.length - 1; du >= 0; du--) {
      var dpu = dusts[du];
      if (dpu.life <= 0) continue;
      dpu.life -= dt;
      dpu.x += dpu.vx * dt;
      dpu.y += dpu.vy * dt;
      dpu.vy += 120 * dt;
      var da = Math.max(0, dpu.life / dpu.max) * 0.5;
      ctx.fillStyle = 'rgba(255,242,224,' + da.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(dpu.x, dpu.y, 3 + 4 * (1 - da * 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // missed block tumbling
    if (missed) {      missed.t += dt;
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
    ctx.font = '600 27px "Barlow Condensed", Nunito, sans-serif';
    for (var p = popups.length - 1; p >= 0; p--) {
      var pp = popups[p];
      pp.life -= dt;
      pp.y -= 34 * dt;
      if (pp.life <= 0) { popups.splice(p, 1); continue; }
      ctx.globalAlpha = Math.min(1, pp.life * 1.6);
      // v3: warm glow burst behind Perfect popups
      if (pp.color === '#0EA5A4') {
        var pglow = ctx.createRadialGradient(W / 2, pp.y - 8, 2, W / 2, pp.y - 8, 90);
        pglow.addColorStop(0, 'rgba(255,206,110,0.5)');
        pglow.addColorStop(1, 'rgba(255,206,110,0)');
        ctx.fillStyle = pglow;
        ctx.fillRect(W / 2 - 90, pp.y - 98, 180, 180);
      }
      ctx.fillStyle = pp.color === '#0EA5A4' ? '#0b7c78' : pp.color;
      ctx.fillText(pp.text, W / 2, pp.y);
    }
    ctx.restore();

    // ready prompt
    if (state === 'ready') {
      ctx.save();
      ctx.globalAlpha = 0.85 + 0.15 * Math.sin(time * 3);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#5b3a1a';
      ctx.font = '600 25px "Barlow Condensed", Nunito, sans-serif';
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
