/* Calm Fist Arena — a 1v1 martial-arts sparring game.
   Real painted fighters (AI art, chroma-keyed sprites), 50 living places, 100 rivals.
   Every named rival is a different real fighter; every place moves (rain, snow,
   fountain spray, petals, embers) on a canvas weather layer over a drifting backdrop.
   The lesson is the mechanic: blocking builds CALM, calm powers the Focus Strike.
   Real strength is self-control. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var arenaEl = $('cfa-arena'), pEl = $('cfa-p'), eEl = $('cfa-e');
  var bgEl = $('cfa-bg'), wxEl = $('cfa-weather');
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
    { src: '../images/arenas/arena-dojo.jpg', name: 'Sunset Dojo', fx: 'dust' },
    { src: '../images/arenas/arena-school-yard.jpg', name: 'School Yard', fx: 'dust' },
    { src: '../images/arenas/arena-town-square.jpg', name: 'Town Square', fx: 'dust' },
    { src: '../images/arenas/arena-street-market.jpg', name: 'Street Market', fx: 'dust' },
    { src: '../images/arenas/arena-fountain-plaza.jpg', name: 'Fountain Plaza', fx: 'spray' },
    { src: '../images/arenas/arena-city-alley.jpg', name: 'City Alley', fx: 'rain' },
    { src: '../images/arenas/arena-canal-street.jpg', name: 'Canal Street', fx: 'spray' },
    { src: '../images/arenas/arena-harbor-pier.jpg', name: 'Harbor Pier', fx: 'spray' },
    { src: '../images/arenas/arena-fishing-village.jpg', name: 'Fishing Village', fx: 'spray' },
    { src: '../images/arenas/arena-beach.jpg', name: 'Dusk Beach', fx: 'glint' },
    { src: '../images/arenas/arena-lake-dock.jpg', name: 'Lake Dock', fx: 'spray' },
    { src: '../images/arenas/arena-farm-yard.jpg', name: 'Farm Yard', fx: 'dust' },
    { src: '../images/arenas/arena-windmill-field.jpg', name: 'Windmill Field', fx: 'leaves' },
    { src: '../images/arenas/arena-grass-steppe.jpg', name: 'Grass Steppe', fx: 'leaves' },
    { src: '../images/arenas/arena-blossom-park.jpg', name: 'Blossom Park', fx: 'petals' },
    { src: '../images/arenas/arena-bamboo-forest.jpg', name: 'Bamboo Forest', fx: 'leaves' },
    { src: '../images/arenas/arena-pine-forest.jpg', name: 'Pine Forest', fx: 'leaves' },
    { src: '../images/arenas/arena-autumn-forest.jpg', name: 'Autumn Forest', fx: 'leavesWarm' },
    { src: '../images/arenas/arena-river-rocks.jpg', name: 'River Rocks', fx: 'spray' },
    { src: '../images/arenas/arena-waterfall-bridge.jpg', name: 'Waterfall Bridge', fx: 'spray' },
    { src: '../images/arenas/arena-rice-terraces.jpg', name: 'Rice Terraces', fx: 'glint' },
    { src: '../images/arenas/arena-mountain-cliff.jpg', name: 'Mountain Cliff', fx: 'dust' },
    { src: '../images/arenas/arena-snow-village.jpg', name: 'Snow Village', fx: 'snow' },
    { src: '../images/arenas/arena-snow-peak.jpg', name: 'Snow Peak', fx: 'snow' },
    { src: '../images/arenas/arena-canyon-rim.jpg', name: 'Canyon Rim', fx: 'dust' },
    { src: '../images/arenas/arena-desert-bazaar.jpg', name: 'Desert Bazaar', fx: 'dust' },
    { src: '../images/arenas/arena-jungle-ruins.jpg', name: 'Jungle Ruins', fx: 'leaves' },
    { src: '../images/arenas/arena-volcano-slope.jpg', name: 'Volcano Slope', fx: 'embers' },
    { src: '../images/arenas/arena-crystal-cave.jpg', name: 'Crystal Cave', fx: 'glint' },
    { src: '../images/arenas/arena-castle-courtyard.jpg', name: 'Castle Courtyard', fx: 'dust' },
    { src: '../images/arenas/arena-construction-site.jpg', name: 'Construction Site', fx: 'dust' },
    { src: '../images/arenas/arena-bus-depot.jpg', name: 'Bus Depot', fx: 'rain' },
    { src: '../images/arenas/arena-train-station.jpg', name: 'Train Station', fx: 'dust' },
    { src: '../images/arenas/arena-train-inside.jpg', name: 'Inside the Train', fx: 'dust' },
    { src: '../images/arenas/arena-train-top.jpg', name: 'Train Top', fx: 'dust' },
    { src: '../images/arenas/arena-ferry-deck.jpg', name: 'Ferry Deck', fx: 'spray' },
    { src: '../images/arenas/arena-ship-deck.jpg', name: 'Ship Deck', fx: 'spray' },
    { src: '../images/arenas/arena-port-cranes.jpg', name: 'Port Cranes', fx: 'dust' },
    { src: '../images/arenas/arena-lighthouse-rocks.jpg', name: 'Lighthouse Rocks', fx: 'spray' },
    { src: '../images/arenas/arena-airport-tarmac.jpg', name: 'Airport Tarmac', fx: 'dust' },
    { src: '../images/arenas/arena-cable-car.jpg', name: 'Cable Car Station', fx: 'dust' },
    { src: '../images/arenas/arena-city-bridge.jpg', name: 'City Bridge', fx: 'rain' },
    { src: '../images/arenas/arena-highway-overpass.jpg', name: 'Highway Overpass', fx: 'dust' },
    { src: '../images/arenas/arena-city-rooftop.jpg', name: 'City Rooftop', fx: 'dust' },
    { src: '../images/arenas/arena-festival-street.jpg', name: 'Festival Street', fx: 'glint' },
    { src: '../images/arenas/arena-night-market.jpg', name: 'Night Market', fx: 'fireflies' },
    { src: '../images/arenas/arena-lantern-festival.jpg', name: 'Lantern Festival', fx: 'fireflies' },
    { src: '../images/arenas/arena-circus-yard.jpg', name: 'Circus Yard', fx: 'glint' },
    { src: '../images/arenas/arena-neon.jpg', name: 'Neon Rooftop', fx: 'rain' },
    { src: '../images/arenas/arena-temple.jpg', name: 'Mountain Temple', fx: 'dust' }
  ];
  var RIVALS = [
    { name: 'Zara', title: 'the Swift', set: 'rival' },
    { name: 'Kenji', title: 'the Stone Wall', set: 'rival2' },
    { name: 'Bruno', title: 'the Mountain', set: 'rival3' },
    { name: 'Aiko', title: 'Quick Hands', set: 'rival4' },
    { name: 'Omar', title: 'the Desert Wind', set: 'rival5' },
    { name: 'Petra', title: 'the Iron Guard', set: 'rival6' },
    { name: 'Diego', title: 'the Dancer', set: 'rival5' },
    { name: 'Mika', title: 'the Silent Storm', set: 'rival4' },
    { name: 'Boris', title: 'the Bear', set: 'rival3' },
    { name: 'Sana', title: 'Sharp Eye', set: 'rival6' },
    { name: 'Master Roku', title: 'the Unshaken', set: 'rival7' }
  ];
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
    return { name: r.name, title: r.title, dan: dan, idx: idx, set: r.set, mirror: false,
             champion: L % 10 === 0 };
  }
  function arenaFor(L) { return ARENAS[Math.min(49, Math.floor((L - 1) / 2))]; }
  function spriteSet(who, pose) { return IMG + who + '-' + pose + '.webp'; }
  function preload(who) {
    POSES.forEach(function (p) { var i = new Image(); i.src = spriteSet(who, p); });
  }
  /* ---------- living background: weather / particle layer ---------- */
  var wxCtx = wxEl ? wxEl.getContext('2d') : null;
  var wxType = 'dust', wxParts = [];
  var WX_COUNT = { spray: 85, rain: 115, snow: 90, petals: 42, leaves: 42,
    leavesWarm: 42, embers: 55, dust: 38, glint: 34, fireflies: 38 };
  function wxSize() {
    if (!wxEl || !arenaEl) return;
    var w = arenaEl.clientWidth, h = arenaEl.clientHeight;
    if (w && (wxEl.width !== w || wxEl.height !== h)) { wxEl.width = w; wxEl.height = h; }
  }
  function wxSpawn(p, init) {
    var w = wxEl.width, h = wxEl.height;
    p.x = Math.random() * w; p.y = init ? Math.random() * h : h + 6;
    p.s = 0.6 + Math.random() * 0.9; p.ph = Math.random() * 6.28;
    p.a = 0.25 + Math.random() * 0.5;
    if (wxType === 'rain') { p.y = init ? Math.random() * h : -12; p.len = 10 + Math.random() * 12; }
    if (wxType === 'spray') { p.x = w * (0.18 + Math.random() * 0.64); p.y = init ? h * (0.45 + Math.random() * 0.55) : h + 4; p.vy = -(14 + Math.random() * 30); }
    if (wxType === 'embers') { p.y = init ? Math.random() * h : h + 4; }
    if (wxType === 'glint' || wxType === 'fireflies') { p.y = Math.random() * h; }
    return p;
  }
  function setWeather(type) {
    wxType = type || 'dust';
    wxParts = [];
    if (!wxEl) return;
    wxSize();
    var n = WX_COUNT[wxType] || 38, i;
    for (i = 0; i < n; i++) wxParts.push(wxSpawn({}, true));
  }
  function drawWeather(dt) {
    if (!wxCtx || !wxEl) return;
    wxSize();
    var w = wxEl.width, h = wxEl.height;
    if (!w || !h) return;
    wxCtx.clearRect(0, 0, w, h);
    var i, p, t = performance.now() / 1000;
    for (i = 0; i < wxParts.length; i++) {
      p = wxParts[i];
      if (wxType === 'rain') {
        p.y += 560 * p.s * dt; p.x += 70 * dt;
        wxCtx.strokeStyle = 'rgba(190,220,255,0.38)'; wxCtx.lineWidth = 1.4;
        wxCtx.beginPath(); wxCtx.moveTo(p.x, p.y); wxCtx.lineTo(p.x - 2.5, p.y + p.len); wxCtx.stroke();
        if (p.y > h + 14) wxSpawn(p, false);
      } else if (wxType === 'snow') {
        p.y += (26 + 22 * p.s) * dt; p.x += Math.sin(t * 1.3 + p.ph) * 18 * dt;
        wxCtx.fillStyle = 'rgba(255,255,255,' + (0.35 + p.a * 0.5) + ')';
        wxCtx.beginPath(); wxCtx.arc(p.x, p.y, 1.4 + p.s * 1.7, 0, 6.29); wxCtx.fill();
        if (p.y > h + 5) wxSpawn(p, false);
      } else if (wxType === 'petals' || wxType === 'leaves' || wxType === 'leavesWarm') {
        p.y += (20 + 18 * p.s) * dt; p.x += Math.sin(t * 1.6 + p.ph) * 26 * dt;
        wxCtx.save(); wxCtx.translate(p.x, p.y); wxCtx.rotate(t * 1.8 + p.ph);
        wxCtx.fillStyle = wxType === 'petals' ? 'rgba(255,170,200,0.75)'
          : wxType === 'leavesWarm' ? 'rgba(240,150,60,0.8)' : 'rgba(140,200,110,0.75)';
        wxCtx.beginPath(); wxCtx.ellipse(0, 0, 3.4 * p.s + 1.6, 2 * p.s + 1, 0, 0, 6.29); wxCtx.fill();
        wxCtx.restore();
        if (p.y > h + 6) wxSpawn(p, false);
      } else if (wxType === 'spray') {
        p.y += p.vy * dt; p.x += Math.sin(t * 2.2 + p.ph) * 9 * dt; if (p.vy < 26) p.vy += 34 * dt;
        wxCtx.fillStyle = 'rgba(215,240,255,' + (p.a * 0.55) + ')';
        wxCtx.beginPath(); wxCtx.arc(p.x, p.y, 1 + p.s * 1.6, 0, 6.29); wxCtx.fill();
        if (p.y > h + 5 || p.y < h * 0.3) wxSpawn(p, false);
      } else if (wxType === 'embers') {
        p.y -= (24 + 26 * p.s) * dt; p.x += Math.sin(t * 2.6 + p.ph) * 14 * dt;
        wxCtx.fillStyle = 'rgba(255,' + (120 + Math.floor(90 * p.s)) + ',40,' + (0.35 + 0.4 * Math.abs(Math.sin(t * 3 + p.ph))) + ')';
        wxCtx.beginPath(); wxCtx.arc(p.x, p.y, 1 + p.s * 1.5, 0, 6.29); wxCtx.fill();
        if (p.y < -5) wxSpawn(p, false);
      } else if (wxType === 'glint') {
        var tw = 0.5 + 0.5 * Math.sin(t * 2.4 + p.ph * 3);
        wxCtx.fillStyle = 'rgba(255,250,215,' + (tw * 0.75) + ')';
        wxCtx.beginPath(); wxCtx.arc(p.x, p.y, 1 + p.s * 1.3, 0, 6.29); wxCtx.fill();
        if (Math.random() < 0.004) { p.x = Math.random() * w; p.y = Math.random() * h; }
      } else if (wxType === 'fireflies') {
        p.x += Math.sin(t * 0.9 + p.ph) * 16 * dt; p.y += Math.cos(t * 0.7 + p.ph * 2) * 11 * dt;
        var fl = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.7 + p.ph));
        wxCtx.fillStyle = 'rgba(255,225,140,' + (fl * 0.85) + ')';
        wxCtx.beginPath(); wxCtx.arc(p.x, p.y, 1.4 + p.s * 1.4, 0, 6.29); wxCtx.fill();
        if (p.x < -6 || p.x > w + 6 || p.y < -6 || p.y > h + 6) wxSpawn(p, true);
      } else { /* dust */
        p.x += (7 + 6 * p.s) * dt; p.y -= 3.5 * dt;
        wxCtx.fillStyle = 'rgba(255,240,205,' + (p.a * 0.4) + ')';
        wxCtx.beginPath(); wxCtx.arc(p.x, p.y, 0.8 + p.s * 1.1, 0, 6.29); wxCtx.fill();
        if (p.x > w + 5 || p.y < -5) { wxSpawn(p, false); p.x = -4; p.y = Math.random() * h; }
      }
    }
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
    E.who = r.mirror ? 'hero' : r.set;
    E.maxHp = Math.round((r.mirror ? 185 : 55 + L * 1.15) * champ);
    E.hp = E.maxHp; E.calm = 0; E.x = 72; E.y = 0; E.vy = 0;
    E.state = 'idle'; E.dead = false;
    E.baseFilter = r.mirror
      ? 'brightness(.5) contrast(1.25) hue-rotate(240deg) saturate(1.5)'
      : '';
    E.img.style.filter = E.baseFilter;
    E.el.classList.remove('ko'); eImg.style.transform = '';
    E.el.style.transform = 'translateX(-50%) scale(' + (r.champion ? 1.07 : 1) + ')';
    P.el.style.transform = 'translateX(-50%)';
    preload('hero'); preload(E.who);
    setPose(P, 'idle'); setPose(E, 'idle');
    faceEachOther(); place(P); place(E);
    if (bgEl) bgEl.style.backgroundImage = 'url(' + arenaFor(L).src + ')';
    else arenaEl.style.backgroundImage = 'url(' + arenaFor(L).src + ')';
    setWeather(arenaFor(L).fx);
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
    drawWeather(dt);
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
    weather: function () { return wxType; },
    start: function () { startFight(); },
    punch: function () { return startAttack(P, 'punch'); },
    giveCalm: function () { P.calm = 100; hud(); },
    focus: function () { return startAttack(P, 'focus'); },
    hurtEnemy: function (dmg) { E.hp -= dmg; hud(); checkEnd(); },
    pos: function () { return { px: P.x, ex: E.x }; },
    moveEnemyClose: function () { E.x = P.x + 10; place(E); }
  };
})();
