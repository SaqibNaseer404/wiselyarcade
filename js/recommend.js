// Wisely Arcade — recommendations, trending, recently-played, lesson pills.
// Single source of truth for the game catalogue.
(function () {
  'use strict';

  var GAMES = [
    { slug: 'memory-match', name: 'Animal Memory Match', ages: ['kids'], seed: 12,
      lesson: 'Patience and paying attention always pay off.' },
    { slug: 'forest-dash',  name: 'Forest Dash',          ages: ['kids', 'teens'], seed: 42,
      lesson: 'Keep going, even when you stumble.' },
    { slug: 'paint-the-rocket', name: 'Paint the Rocket', ages: ['kids'], seed: 27,
      lesson: 'There are no wrong colours — your ideas can fly.' },
    { slug: 'spot-the-difference', name: 'Spot the Difference', ages: ['kids'], seed: 26,
      lesson: 'Slow down and really look.' },
    { slug: 'jigsaw-puzzle', name: 'Jigsaw Puzzle', ages: ['kids'], seed: 33,
      lesson: 'Patience — the picture comes together piece by piece.' },
    { slug: 'missing-letters', name: 'Missing Letters', ages: ['kids'], seed: 28,
      lesson: 'Reading grows one letter at a time.' },
    { slug: 'math-quest', name: 'Math Quest', ages: ['kids', 'teens'], seed: 29,
      lesson: 'Big problems break into small steps.' },
    { slug: 'iq-quest', name: 'IQ Quest', ages: ['kids', 'teens'], seed: 30,
      lesson: 'Smart is not magic — it\'s noticing patterns.' },
    { slug: 'gk-quest', name: 'GK Quest', ages: ['kids', 'teens'], seed: 31,
      lesson: 'Smart is not magic — it\'s noticing patterns.' },
    { slug: 'bubble-pop',   name: 'Bubble Pop',           ages: ['kids', 'teens'], seed: 22,
      lesson: 'Aim with intention, not in a hurry.' },
    { slug: 'neon-snake',   name: 'Neon Snake',           ages: ['teens'], seed: 35,
      lesson: 'Greed traps you — know when enough is enough.' },
    { slug: 'tower-stack',  name: 'Tower Stack',          ages: ['teens'], seed: 20,
      lesson: 'Big things are built one careful step at a time.' },
    { slug: 'trail-stunts', name: 'Trail Stunts',         ages: ['teens'], seed: 18,
      lesson: 'Balance beats speed.' },
    { slug: '2048-merge',   name: '2048 Merge',           ages: ['teens', 'adults'], seed: 16,
      lesson: 'Small smart steps add up to big wins.' },
    { slug: 'daily-sudoku', name: 'Daily Sudoku',         ages: ['adults'], seed: 28,
      lesson: 'Big problems break into small steps.' },
    { slug: 'daily-word-guess', name: 'Daily Word Guess', ages: ['teens', 'adults'], seed: 24,
      lesson: 'Never give up — every wrong guess teaches you something.' },
    { slug: 'minesweeper',   name: 'Minesweeper',          ages: ['adults'], seed: 14,
      lesson: 'Think before you act — every click counts.' },
    { slug: 'mind-meter',    name: 'Mind Meter',           ages: ['teens', 'adults'], seed: 25,
      lesson: 'A sharp mind is built, not born.' },
    { slug: 'ludo',          name: 'Ludo',                 ages: ['kids'], seed: 10,
      lesson: "You can't control the dice — only how you play the roll." },
    { slug: 'chess',         name: 'Chess',                ages: ['teens', 'adults'], seed: 10,
      lesson: 'Every move has a consequence — think before you act.' },
    { slug: 'apex-gp',       name: 'Apex GP',              ages: ['teens'], seed: 30,
      lesson: 'Smooth is fast — control beats raw speed.' },
    { slug: 'nitro-gp',      name: 'Nitro GP',             ages: ['teens'], seed: 31,
      lesson: 'Smooth is fast — control beats raw speed.' },
    { slug: 'sky-gp',        name: 'Sky GP',               ages: ['teens'], seed: 32,
      lesson: 'Aim high, but fly calm — panic crashes, patience lands.' }
  ];

  var path = location.pathname;
  var inGamesDir = path.indexOf('/games/') !== -1;
  var prefix = inGamesDir ? '../' : '';
  var currentSlug = null;
  if (inGamesDir) {
    var parts = path.split('/').filter(Boolean);
    currentSlug = parts[parts.length - 1] || null;
  }

  function thumb(g) { return prefix + 'images/thumbs/' + g.slug + '.jpg'; }
  function url(g) { return prefix + 'games/' + g.slug; }
  function bySlug(s) {
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].slug === s) return GAMES[i];
    return null;
  }

  /* ---------- local play tracking (no accounts, this browser only) ---------- */
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function read(k, fb) {
    try { var v = localStorage.getItem(k); return v === null ? fb : JSON.parse(v); }
    catch (e) { return fb; }
  }
  function recordPlay() {
    if (!inGamesDir || !currentSlug || !bySlug(currentSlug)) return;
    var plays = read('wa_plays', {});
    plays[currentSlug] = (plays[currentSlug] || 0) + 1;
    store('wa_plays', plays);
    var recent = read('wa_recent', []).filter(function (s) { return s !== currentSlug; });
    recent.unshift(currentSlug);
    store('wa_recent', recent.slice(0, 8));
  }
  function playsOf(g) {
    return (g.seed || 0) + (read('wa_plays', {})[g.slug] || 0);
  }

  /* ---------- lesson pills on every game card ---------- */
  function injectLessonPills() {
    var cards = document.querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (card.querySelector('.lesson-line') || card.querySelector('.lesson-pill')) continue;
      var h3 = card.querySelector('h3');
      if (!h3) continue;
      var name = h3.textContent.trim().toLowerCase();
      var g = null;
      for (var j = 0; j < GAMES.length; j++) {
        if (GAMES[j].name.toLowerCase() === name) { g = GAMES[j]; break; }
      }
      if (!g) continue;
      var pill = document.createElement('div');
      pill.className = 'lesson-pill';
      pill.innerHTML = '<b>💡 Lesson:</b> ' + g.lesson;
      var btnRow = card.querySelector('.btn-row');
      if (btnRow) card.insertBefore(pill, btnRow);
      else card.appendChild(pill);
    }
  }

  /* ---------- homepage shelves ---------- */
  function shelfCard(g, badge) {
    return '<a class="shelf-card" href="' + url(g) + '">' +
      (badge ? '<span class="shelf-badge">' + badge + '</span>' : '') +
      '<img src="' + thumb(g) + '" alt="' + g.name + ' — free online game" loading="lazy">' +
      '<span class="shelf-name">' + g.name + '</span></a>';
  }
  function buildTrending() {
    var el = document.getElementById('trending-shelf');
    if (!el) return;
    var ranked = GAMES.slice().sort(function (a, b) { return playsOf(b) - playsOf(a); }).slice(0, 6);
    var html = '';
    ranked.forEach(function (g, i) {
      html += shelfCard(g, i < 3 ? '🔥 #' + (i + 1) : '#' + (i + 1));
    });
    el.innerHTML = html;
  }
  function buildRecent() {
    var sec = document.getElementById('recent-section');
    var el = document.getElementById('recent-shelf');
    if (!sec || !el) return;
    var recent = read('wa_recent', [])
      .map(bySlug)
      .filter(function (g) { return g && g.slug !== currentSlug; })
      .slice(0, 6);
    if (!recent.length) { sec.style.display = 'none'; return; }
    sec.style.display = '';
    el.innerHTML = recent.map(function (g) { return shelfCard(g, '↻'); }).join('');
  }

  /* ---------- "More games" strip on game pages ---------- */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function currentAges() {
    var g = bySlug(currentSlug);
    if (g) return g.ages;
    if (path.indexOf('kids') !== -1) return ['kids'];
    if (path.indexOf('teens') !== -1) return ['teens'];
    if (path.indexOf('adults') !== -1) return ['adults'];
    return [];
  }
  function pick(count, preferAges) {
    var ages = preferAges || currentAges();
    var pool = GAMES.filter(function (g) { return g.slug !== currentSlug; });
    var preferred = pool.filter(function (g) {
      return g.ages.some(function (a) { return ages.indexOf(a) !== -1; });
    });
    var rest = pool.filter(function (g) { return preferred.indexOf(g) === -1; });
    return shuffle(preferred).concat(shuffle(rest)).slice(0, count);
  }
  function buildMoreStrip() {
    if (!inGamesDir) return;
    var area = document.querySelector('.game-area');
    if (!area || document.querySelector('.more-games')) return;
    var wrap = document.createElement('div');
    wrap.className = 'more-games';
    var html = '<h2>You may also like</h2><div class="mg-grid">';
    pick(3).forEach(function (g) {
      html += '<a class="mg-card" href="' + url(g) + '">' +
        '<img src="' + thumb(g) + '" alt="' + g.name + ' — free online game" loading="lazy">' +
        '<span>' + g.name + '</span></a>';
    });
    wrap.innerHTML = html + '</div>';
    area.parentNode.insertBefore(wrap, area.nextSibling);
  }

  /* ---------- Share + bookmark bar on game pages ---------- */
  function buildShareBar() {
    if (!inGamesDir || !currentSlug) return;
    var g = bySlug(currentSlug);
    if (!g || document.querySelector('.share-bar')) return;
    var area = document.querySelector('.game-area');
    if (!area) return;
    var bar = document.createElement('div');
    bar.className = 'share-bar';
    bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;margin:18px auto 4px;max-width:640px';
    var btn = 'style="border:0;cursor:pointer;font:inherit;font-weight:800;padding:11px 18px;border-radius:999px;background:linear-gradient(180deg,#ffc44d,#f59e0b);color:#26160a;box-shadow:0 6px 16px rgba(122,96,178,.22)"';
    var ghost = 'style="cursor:pointer;font-weight:800;padding:11px 18px;border-radius:999px;background:rgba(255,255,255,.85);color:inherit;border:2px solid rgba(122,96,178,.35)"';
    bar.innerHTML =
      '<button type="button" id="wa-share" ' + btn + '>\uD83D\uDCE4 Share this game</button>' +
      '<button type="button" id="wa-save" ' + ghost + '>\u2B50 Save Wisely Arcade</button>' +
      '<span id="wa-share-msg" style="font-weight:700;min-height:1em"></span>';
    area.parentNode.insertBefore(bar, area.nextSibling);
    var msg = bar.querySelector('#wa-share-msg');
    bar.querySelector('#wa-share').addEventListener('click', function () {
      var data = { title: g.name + ' — Wisely Arcade', text: 'Play ' + g.name + ' free on Wisely Arcade. ' + g.lesson, url: location.href };
      if (navigator.share) { navigator.share(data).catch(function () {}); }
      else if (navigator.clipboard) {
        navigator.clipboard.writeText(data.url).then(function () { msg.textContent = 'Link copied — send it to a friend!'; });
      }
    });
    bar.querySelector('#wa-save').addEventListener('click', function () {
      var isMac = /Mac/i.test(navigator.userAgent);
      msg.textContent = 'Press ' + (isMac ? 'Cmd' : 'Ctrl') + ' + D to bookmark us — then try today\'s Daily Sudoku!';
    });
  }

  /* ---------- Exit-intent popup ---------- */
  var shown = false;
  function buildModal() {
    if (document.querySelector('.xp-veil')) return;
    var veil = document.createElement('div');
    veil.className = 'xp-veil';
    veil.setAttribute('role', 'dialog');
    veil.setAttribute('aria-label', 'More games to try');
    var html = '<div class="xp-modal">' +
      '<button class="xp-close" aria-label="Close">✕</button>' +
      '<h2>Before you go… why not try these games?</h2>' +
      '<p class="xp-sub">Every game teaches a lesson. Pick your next one:</p>' +
      '<div class="xp-grid">';
    pick(6).forEach(function (g) {
      html += '<a class="xp-card" href="' + url(g) + '">' +
        '<img src="' + thumb(g) + '" alt="' + g.name + ' — free online game" loading="lazy">' +
        '<span>' + g.name + '</span></a>';
    });
    veil.innerHTML = html + '</div></div>';
    document.body.appendChild(veil);
    veil.querySelector('.xp-close').addEventListener('click', hide);
    veil.addEventListener('click', function (e) { if (e.target === veil) hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  }
  function show() {
    if (shown) return;
    try { if (sessionStorage.getItem('xpShown')) return; } catch (e) {}
    shown = true;
    try { sessionStorage.setItem('xpShown', '1'); } catch (e) {}
    buildModal();
    requestAnimationFrame(function () {
      document.querySelector('.xp-veil').classList.add('show');
    });
  }
  function hide() {
    var veil = document.querySelector('.xp-veil');
    if (veil) veil.classList.remove('show');
  }
  function initExitIntent() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget && e.clientY <= 0) show();
    });
  }

  function init() {
    recordPlay();
    injectLessonPills();
    buildTrending();
    buildRecent();
    buildMoreStrip();
    buildShareBar();
    initExitIntent();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
