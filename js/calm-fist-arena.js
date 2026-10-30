/* Calm Fist Arena — a 1v1 martial-arts sparring game.
   Real painted fighters (AI art, chroma-keyed sprites), 4 arenas, 100 rivals.
   The lesson is the mechanic: blocking builds CALM, calm powers the Focus Strike.
   Real strength is self-control. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var arenaEl = $('cfa-arena'), pEl = $('cfa-p'), eEl = $('cfa-e');
  var pImg = $('cfa-p-img'), eImg = $('cfa-e-img');
  var pHpEl = $('cfa-p-hp'), eHpEl = $('cfa-e-hp');
  var pCalmEl = $('cfa-p-calm'), eCalmEl = $('cfa-e-calm');
  var pNameEl = $('cfa-p-name'), eNameEl = $('cfa-e-name');
  var timerEl = $('cfa-timer'), announceEl = $('cfa-announce');
  var msgEl = $('cfa-msg'), fxEl = $('cfa-fx');
  var introEl = $('cfa-intro'), endEl = $('cfa-end');
  var mapEl = $('cfa-map');

  var IMG = '../images/fighters/';
  var POSES = ['idle', 'punch', 'kick', 'block', 'hurt', 'crouch', 'jump', 'win'];
  var ARENAS = [
    { src: '../images/arenas/arena-dojo.jpg', name: 'Sunset Dojo' },
    { src: '../images/arenas/arena-beach.jpg', name: 'Dusk Beach' },
    { src: '../images/arenas/arena-temple.jpg', name: 'Mountain Temple' },
    { src: '../images/arenas/arena-neon.jpg', name: 'Neon Rooftop' }
  ];
  var RIVALS = [
    { name: 'Zara', title: 'the Swift' }, { name: 'Kenji', title: 'the Stone Wall' },
    { name: 'Bruno', title: 'the Mountain' }, { name: 'Aiko', title: 'Quick Hands' },
    { name: 'Omar', title: 'the Desert Wind' }, { name: 'Petra', title: 'the Iron Guard' },
    { name: 'Diego', title: 'the Dancer' }, { name: 'Mika', title: 'the Silent Storm' },
    { name: 'Boris', title: 'the Bear' }, { name: 'Sana', title: 'Sharp Eye' },
    { name: 'Master Roku', title: 'the Unshaken' }
  ];
  var FILTERS = ['', 'hue-rotate(35deg)', 'hue-rotate(95deg) saturate(1.3)',
    'hue-rotate(160deg)', 'hue-rotate(210deg) saturate(1.2)', 'hue-rotate(280deg)',
    'brightness(1.18) hue-rotate(-25deg)', 'sepia(.55) hue-rotate(-15deg) saturate(1.4)',
    'contrast(1.15) hue-rotate(120deg)', 'brightness(.85) hue-rotate(45deg)',
    'saturate(1.6) hue-rotate(190deg)'];
  var TIPS = [
    'Breathe out slowly before you strike. A calm mind lands clean hits.',
    'Blocking is not weakness. Every block builds your Calm.',
    'Anger makes you swing wild. Control makes you accurate.',
    'Watch your rival. Patience shows you the opening.',
    'A champion respects every opponent — even the first one.',
    'Losing your temper is losing the fight before it starts.',
    'Strong legs, soft heart, steady breath.',
    'The best fighters win twice: the match, and their own anger.',
    'Do not chase. Let the opening come to you.',
    'Pain passes. Panic makes it stay. Breathe.',
    'Practise slowly and you will move fast when it matters.',
    'Bow to your rival. Gratitude keeps your spirit strong.'
  ];

  /* ---------- saved progress ---------- */
  function load(key, dflt) {
    try { var v = localStorage.getItem(key); return v === null ? dflt : JSON.parse(v); }
    catch (e) { return dflt; }
  }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  var done = load('cfa_done', {});               // {level: stars}
  var unlocked = load('cfa_unlocked', 1);        // highest level you may play
  var level = Math.min(unlocked, 100);

  /* ---------- helpers ---------- */
  function rivalFor(L) {
    if (L === 100) return { name: 'Your Own Anger', title: 'the Final Test', mirror: true, idx: 11 };
    var idx = (L - 1) % RIVALS.length;
    var dan = Math.floor((L - 1) / RIVALS.length) + 1;
    var r = RIVALS[idx];
    return { name: r.name, title: r.title, dan: dan, idx: idx, mirror: false,
             champion: L % 10 === 0 };
  }
  function arenaFor(L) { return ARENAS[Math.min(3, Math.floor((L - 1) / 25))]; }
  function spriteSet(who, pose) { return IMG + who + '-' + pose + '.webp'; }
  function preload(who) {
    POSES.forEach(function (p) { var i = new Image(); i.src = spriteSet(who, p); });
  }

  /* ---------- fighter state ---------- */
  function makeFighter(el, img, who) {
    return {
      el: el, img: img, who: who, x: 30, y: 0, vy: 0, hp: 100, maxHp: 100,
      calm: 0, pose: '', state: 'idle', t: 0, facing: 1, atkCd: 0,
      atkHitDone: true, blocking: false, dead: false, baseFilter: ''
    };
  }
  var P = makeFighter(pEl, pImg, 'hero');
  var E = makeFighter(eEl, eImg, 'rival');
  var phase = 'intro';           // intro | fight | over
  var timeLeft = 60, lastTs = 0, aiTimer = 0, result = null;

  function setPose(f, pose) {
    var key = f.who + ':' + pose;
    if (f.poseKey === key) return;
    f.poseKey = key;
    f.pose = pose;
    f.img.src = spriteSet(f.who, pose);
  }
  function place(f) {
    f.el.style.left = f.x + '%';
    f.el.style.bottom = 'calc(9% + ' + f.y + '%)';
    var flip = f.facing === 1 ? '' : 'scaleX(-1)';
    f.img.style.transform = flip;
  }
  function faceEachOther() {
    P.facing = E.x >= P.x ? 1 : -1;
    E.facing = P.x >= E.x ? 1 : -1;
  }

  /* ---------- HUD ---------- */
  function hud() {
    pHpEl.style.width = Math.max(0, P.hp / P.maxHp * 100) + '%';
    eHpEl.style.width = Math.max(0, E.hp / E.maxHp * 100) + '%';
    pCalmEl.style.width = Math.min(100, P.calm) + '%';
    eCalmEl.style.width = Math.min(100, E.calm) + '%';
    timerEl.textContent = Math.ceil(timeLeft);
    $('cfa-level-now').textContent = level;
    var beaten = Object.keys(done).length;
    $('cfa-progress-note').textContent = beaten + ' of 100 rivals beaten';
    var stars = 0; for (var k in done) stars += done[k];
    $('cfa-wins').textContent = beaten;
    $('cfa-stars').textContent = stars;
    var bestEl = $('cfa-best'); if (bestEl) bestEl.textContent = unlocked;
  }
  function buildMap() {
    mapEl.innerHTML = '';
    for (var L = 1; L <= 100; L++) {
      (function (L) {
        var b = document.createElement('button');
        b.className = 'cfa-lvl' + (done[L] ? ' cfa-done' : '') +
          (L === level ? ' cfa-cur' : '') + (L > unlocked ? ' cfa-lock' : '');
        b.textContent = L;
        b.disabled = L > unlocked;
        b.addEventListener('click', function () { setupLevel(L); });
        mapEl.appendChild(b);
      })(L);
    }
  }
  function announce(text, ms) {
    announceEl.textContent = text;
    announceEl.classList.remove('show');
    void announceEl.offsetWidth;
    announceEl.classList.add('show');
    if (ms) setTimeout(function () { announceEl.classList.remove('show'); }, ms);
  }
  function spark(x, y, kind) {
    var s = document.createElement('div');
    s.className = 'cfa-spark' + (kind ? ' ' + kind : '');
    s.textContent = '✦';
    s.style.left = x + '%';
    s.style.bottom = 'calc(9% + ' + y + '%)';
    fxEl.appendChild(s);
    setTimeout(function () { s.remove(); }, 420);
  }
  function shake() {
    arenaEl.classList.remove('shake');
    void arenaEl.offsetWidth;
    arenaEl.classList.add('shake');
  }
  function flash(f) {
    f.img.style.filter = 'brightness(2.4) saturate(.3)';
    setTimeout(function () { f.img.style.filter = f.baseFilter; }, 95);
  }

  /* ---------- level setup ---------- */
  function setupLevel(L) {
    level = L;
    var r = rivalFor(L);
    var champ = r.champion ? 1.25 : 1;
    P.hp = P.maxHp = 100; P.calm = 0; P.x = 28; P.y = 0; P.vy = 0;
    P.state = 'idle'; P.dead = false; P.baseFilter = ''; P.img.style.filter = '';
    P.el.classList.remove('ko'); pImg.style.transform = '';
    E.who = r.mirror ? 'hero' : 'rival';
    E.maxHp = Math.round((r.mirror ? 185 : 55 + L * 1.15) * champ);
    E.hp = E.maxHp; E.calm = 0; E.x = 72; E.y = 0; E.vy = 0;
    E.state = 'idle'; E.dead = false;
    E.baseFilter = r.mirror
      ? 'brightness(.5) contrast(1.25) hue-rotate(240deg) saturate(1.5)'
      : FILTERS[r.idx % FILTERS.length];
    E.img.style.filter = E.baseFilter;
    E.el.classList.remove('ko'); eImg.style.transform = '';
    E.el.style.transform = 'translateX(-50%) scale(' + (r.champion ? 1.07 : 1) + ')';
    P.el.style.transform = 'translateX(-50%)';
    preload('hero'); preload(E.who);
    setPose(P, 'idle'); setPose(E, 'idle');
    faceEachOther(); place(P); place(E);
    arenaEl.style.backgroundImage = 'url(' + arenaFor(L).src + ')';
    pNameEl.textContent = 'Kai — You';
    eNameEl.textContent = (r.champion ? 'Champion ' : '') + r.name + ' ' + r.title +
      (r.dan ? ' · Dan ' + r.dan : '');
    $('cfa-intro-title').textContent = 'Level ' + L + ' — ' + arenaFor(L).name;
    $('cfa-intro-rival').innerHTML = 'Your rival: <strong>' + eNameEl.textContent + '</strong>' +
      (r.mirror ? '<br>The last rival is the anger inside you. Stay calm, champion.' : '');
    $('cfa-intro-tip').textContent = '🧘 Sensei says: ' + TIPS[(L - 1) % TIPS.length];
    timeLeft = 60; result = null; phase = 'intro';
    introEl.classList.remove('hidden'); endEl.classList.add('hidden');
    announceEl.classList.remove('show');
    msgEl.textContent = 'Press Start Fight when you are ready. Block (S / ↓) to build Calm, then unleash a Focus Strike (L)!';
    buildMap(); hud();
  }

  function startFight() {
    if (phase !== 'intro') return;
    phase = 'fight';
    introEl.classList.add('hidden');
    announce('FIGHT!', 900);
    msgEl.textContent = 'Move A/D · Jump W · Block S · Punch J · Kick K · Focus Strike L';
    aiTimer = 0.4;
  }

  /* ---------- combat ---------- */
  function startAttack(f, kind) {
    if (f.state === 'hurt' || f.state === 'ko' || f.dead) return false;
    if (f.atkCd > 0 || f.state === 'punch' || f.state === 'kick' || f.state === 'focus') return false;
    if (kind === 'focus') {
      if (f.calm < 50) { if (f === P) msgEl.textContent = 'Not enough Calm yet — block attacks to build it! 🧘'; return false; }
      f.calm -= 50;
      f.state = 'focus'; f.t = 0; f.atkHitDone = false;
      f.vx = f.facing * 65;                      // dash toward the rival
      setPose(f, 'jump');
      return true;
    }
    if (f.y > 0.5) {                              // air knee
      f.state = 'airatk'; f.t = 0; f.atkHitDone = false;
      setPose(f, 'jump');
      return true;
    }
    f.state = kind; f.t = 0; f.atkHitDone = false;
    f.atkCd = kind === 'punch' ? 0.30 : 0.48;
    setPose(f, kind);
    return true;
  }

  function attackSpec(f) {
    switch (f.state) {
      case 'punch': return { at: 0.09, range: 13.5, dmg: 6, kb: 2.5 };
      case 'kick': return { at: 0.16, range: 15.5, dmg: 10, kb: 4 };
      case 'airatk': return { at: 0.02, range: 13, dmg: 9, kb: 4 };
      case 'focus': return { at: 0.10, range: 16, dmg: 22, kb: 9 };
    }
    return null;
  }

  function resolveHit(att, def, spec, mult) {
    var dx = Math.abs(att.x - def.x);
    var dy = Math.abs(att.y - def.y);
    if (dx > spec.range || dy > 26) return;
    att.atkHitDone = true;
    var midX = (att.x + def.x) / 2, midY = Math.max(att.y, def.y) + 34;
    var blocked = def.blocking && def.y < 1 && !def.dead;
    if (blocked) {
      def.hp -= spec.dmg * mult * 0.12;
      def.calm = Math.min(100, def.calm + 20);
      spark(midX, midY, 'block');
      msgEl.textContent = def === P ? 'Blocked! Your Calm grows. 🧘' : 'Your strike was blocked!';
    } else {
      def.hp -= spec.dmg * mult;
      def.calm = Math.max(0, def.calm - 8);
      def.state = 'hurt'; def.t = 0; def.blocking = false;
      def.x += (def.x >= att.x ? 1 : -1) * spec.kb;
      def.x = Math.max(5, Math.min(95, def.x));
      setPose(def, 'hurt');
      flash(def);
      spark(midX, midY, att.state === 'focus' ? 'big' : '');
      if (att.state === 'focus') shake();
    }
    hud();
    checkEnd();
  }

  function checkEnd() {
    if (phase !== 'fight') return;
    if (E.hp <= 0) return endFight(true, 'K.O.!');
    if (P.hp <= 0) return endFight(false, 'K.O.!');
  }

  function endFight(won, how) {
    phase = 'over';
    var loser = won ? E : P, winner = won ? P : E;
    loser.dead = true; loser.state = 'ko';
    setPose(loser, 'hurt');
    loser.el.classList.add('ko');
    loser.img.style.transform = (loser.facing === 1 ? 'rotate(-78deg)' : 'rotate(78deg) scaleX(-1)');
    setPose(winner, 'win');
    winner.state = 'win';
    announce(how, 1600);
    if (won) {
      var frac = P.hp / P.maxHp;
      var stars = frac >= 0.7 ? 3 : frac >= 0.35 ? 2 : 1;
      if (!done[level] || done[level] < stars) done[level] = stars;
      save('cfa_done', done);
      if (level === unlocked && level < 100) { unlocked = level + 1; save('cfa_unlocked', unlocked); }
      result = { won: true, stars: stars };
    } else {
      result = { won: false, stars: 0 };
    }
    setTimeout(function () {
      $('cfa-end-title').textContent = won ? '🏆 You win — calm and strong!' : 'Defeated — breathe, and rise again.';
      $('cfa-end-stats').innerHTML = won
        ? 'You beat <strong>' + eNameEl.textContent + '</strong> with <strong>' + Math.max(0, Math.ceil(P.hp)) + ' HP</strong> left — ' +
          '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars)
        : 'Sensei says: every champion has lost. Block more, build Calm, and strike with focus.';
      $('cfa-next').style.display = won && level < 100 ? '' : 'none';
      endEl.classList.remove('hidden');
      buildMap(); hud();
    }, 1250);
  }

  /* ---------- AI ---------- */
  function aiThink(dt) {
    aiTimer -= dt;
    // AI blocking reaction: if the player just attacked and AI is free, it may guard
    if ((P.state === 'punch' || P.state === 'kick') && E.state === 'idle' && E.y < 1) {
      var blockChance = Math.min(0.48, 0.06 + level * 0.004);
      if (Math.random() < blockChance * dt * 14) { E.blocking = true; E.state = 'block'; E.t = 0; setPose(E, 'block'); }
    }
    if (aiTimer > 0) return;
    aiTimer = Math.max(0.24, 0.64 - level * 0.004) * (0.75 + Math.random() * 0.5);
    if (E.state === 'hurt' || E.state === 'ko' || E.dead) return;
    var dist = Math.abs(P.x - E.x);
    var dir = P.x > E.x ? 1 : -1;
    var aggression = Math.min(0.82, 0.35 + level * 0.005);
    E.blocking = false;
    if (E.state === 'block') { E.state = 'idle'; setPose(E, 'idle'); }
    if (E.calm >= 50 && dist < 34 && Math.random() < 0.7) { startAttack(E, 'focus'); return; }
    if (dist > 15) {
      if (Math.random() < 0.12 + level * 0.001 && E.y < 1) { E.vy = 34; }   // jump in
      E.state = 'walk'; E.walkDir = dir; E.walkT = 0.28 + Math.random() * 0.3;
    } else if (Math.random() < aggression) {
      startAttack(E, Math.random() < 0.55 ? 'punch' : 'kick');
    } else if (Math.random() < 0.3) {
      E.blocking = true; E.state = 'block'; E.t = 0; setPose(E, 'block');
    } else if (Math.random() < 0.25) {
      E.state = 'walk'; E.walkDir = -dir; E.walkT = 0.22;
    }
  }

  /* ---------- main loop ---------- */
  var keys = {};
  function stepFighter(f, dt) {
    f.atkCd = Math.max(0, f.atkCd - dt);
    f.t += dt;
    // dash during focus
    if (f.state === 'focus') {
      f.x += (f.vx || 0) * dt;
      f.x = Math.max(5, Math.min(95, f.x));
    }
    // gravity
    if (f.y > 0 || f.vy > 0) {
      f.y += f.vy * dt;
      f.vy -= 130 * dt;
      if (f.y <= 0) { f.y = 0; f.vy = 0; if (f.state === 'airatk') { f.state = 'idle'; setPose(f, 'idle'); } }
    }
    // attack hit windows
    var spec = attackSpec(f);
    if (spec && !f.atkHitDone && f.t >= spec.at) {
      resolveHit(f, f === P ? E : P, spec, f === P ? 1 : Math.min(1.6, 0.5 + level * 0.011));
    }
    // state timeouts
    if ((f.state === 'punch' && f.t > 0.26) || (f.state === 'kick' && f.t > 0.42) ||
        (f.state === 'focus' && f.t > 0.34) || (f.state === 'hurt' && f.t > 0.26) ||
        (f.state === 'block' && f === E && f.t > 0.45)) {
      f.state = 'idle'; f.blocking = false; setPose(f, f.y > 0.5 ? 'jump' : 'idle');
    }
    if (f.state === 'walk') {
      f.walkT -= dt;
      var sp = (f === P ? 26 : Math.min(30, 15 + level * 0.12)) * dt;
      f.x += f.walkDir * sp;
      f.x = Math.max(5, Math.min(95, f.x));
      setPose(f, 'idle');
      if (f.walkT <= 0) f.state = 'idle';
    }
    place(f);
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (phase !== 'fight') return;
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endFight(P.hp / P.maxHp >= E.hp / E.maxHp, 'TIME!');
      hud();
      return;
    }
    /* player input */
    P.blocking = false;
    if (P.state !== 'hurt' && P.state !== 'ko') {
      var left = keys['a'] || keys['arrowleft'], right = keys['d'] || keys['arrowright'];
      var block = keys['s'] || keys['arrowdown'];
      if (block && P.y < 1 && P.state !== 'punch' && P.state !== 'kick' && P.state !== 'focus') {
        P.blocking = true;
        if (P.state !== 'block') { P.state = 'block'; setPose(P, 'block'); }
      } else if (left || right) {
        if (P.state === 'block') P.state = 'idle';
        if (P.state === 'idle' || P.state === 'walk') {
          P.state = 'walk';
          P.walkDir = left ? -1 : 1;
          P.walkT = 0.05;
          setPose(P, 'idle');
        }
      } else if (P.state === 'block' || P.state === 'walk') {
        P.state = 'idle'; setPose(P, 'idle');
      }
    }
    faceEachOther();
    aiThink(dt);
    stepFighter(P, dt);
    stepFighter(E, dt);
    // separation: fighters cannot pass through each other
    if (Math.abs(P.x - E.x) < 7 && P.y < 8 && E.y < 8) {
      var push = (7 - Math.abs(P.x - E.x)) / 2 * (P.x < E.x ? -1 : 1);
      P.x = Math.max(5, Math.min(95, P.x + push));
      E.x = Math.max(5, Math.min(95, E.x - push));
      place(P); place(E);
    }
    hud();
  }
  requestAnimationFrame(loop);

  /* ---------- input ---------- */
  var GAMEKEYS = ['a', 'd', 'w', 's', 'j', 'k', 'l', 'f', 'g', 'h',
    'arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '];
  document.addEventListener('keydown', function (ev) {
    var k = ev.key.toLowerCase();
    if (GAMEKEYS.indexOf(k) !== -1) ev.preventDefault();
    keys[k] = true;
    if (ev.repeat) return;
    if (phase === 'fight') {
      if (k === 'w' || k === 'arrowup') { if (P.y < 1 && P.state !== 'hurt') { P.vy = 36; P.y = 0.01; setPose(P, 'jump'); } }
      if (k === 'j' || k === 'f') startAttack(P, 'punch');
      if (k === 'k' || k === 'g') startAttack(P, 'kick');
      if (k === 'l' || k === 'h') startAttack(P, 'focus');
    } else if (k === ' ' || k === 'enter') {
      if (phase === 'intro') startFight();
    }
  });
  document.addEventListener('keyup', function (ev) { keys[ev.key.toLowerCase()] = false; });

  /* touch controls */
  function bindTouch(id, key, isAttack) {
    var el = $(id);
    if (!el) return;
    var on = function (ev) {
      ev.preventDefault();
      if (isAttack) {
        if (phase === 'fight') {
          if (key === 'jump') { if (P.y < 1 && P.state !== 'hurt') { P.vy = 36; P.y = 0.01; setPose(P, 'jump'); } }
          else startAttack(P, key);
        }
      } else keys[key] = true;
    };
    var off = function (ev) { ev.preventDefault(); if (!isAttack) keys[key] = false; };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('mousedown', on);
    el.addEventListener('mouseup', off);
  }
  bindTouch('cfa-t-left', 'a'); bindTouch('cfa-t-right', 'd');
  bindTouch('cfa-t-block', 's');
  bindTouch('cfa-t-jump', 'jump', true); bindTouch('cfa-t-punch', 'punch', true);
  bindTouch('cfa-t-kick', 'kick', true); bindTouch('cfa-t-focus', 'focus', true);

  /* ---------- buttons ---------- */
  $('cfa-start').addEventListener('click', startFight);
  $('cfa-next').addEventListener('click', function () { if (level < 100) setupLevel(level + 1); });
  $('cfa-again').addEventListener('click', function () { setupLevel(level); });
  $('cfa-restart').addEventListener('click', function () { setupLevel(level); });

  setupLevel(level);

  /* QA hooks (used by automated play tests) */
  window.__cfa = {
    state: function () {
      return { phase: phase, level: level, unlocked: unlocked,
        pHP: Math.round(P.hp), eHP: Math.round(E.hp),
        pCalm: Math.round(P.calm), eCalm: Math.round(E.calm),
        pPose: P.pose, ePose: E.pose, done: Object.keys(done).length };
    },
    setLevel: function (n) { setupLevel(Math.max(1, Math.min(100, n))); },
    start: function () { startFight(); },
    punch: function () { return startAttack(P, 'punch'); },
    giveCalm: function () { P.calm = 100; hud(); },
    focus: function () { return startAttack(P, 'focus'); },
    hurtEnemy: function (dmg) { E.hp -= dmg; hud(); checkEnd(); },
    pos: function () { return { px: P.x, ex: E.x }; },
    moveEnemyClose: function () { E.x = P.x + 10; place(E); }
  };
})();
