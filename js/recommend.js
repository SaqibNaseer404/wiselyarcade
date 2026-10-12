// Wisely Arcade — "Before you go" exit popup + More-games strips.
// Single source of truth for the game catalogue used in recommendations.
(function () {
  'use strict';

  var GAMES = [
    { slug: 'memory-match', name: 'Animal Memory Match', ages: ['kids'] },
    { slug: 'forest-dash',  name: 'Forest Dash',          ages: ['kids', 'teens'] },
    { slug: 'bubble-pop',   name: 'Bubble Pop',           ages: ['kids', 'teens'] },
    { slug: 'neon-snake',   name: 'Neon Snake',           ages: ['teens'] },
    { slug: 'tower-stack',  name: 'Tower Stack',           ages: ['teens'] },
    { slug: 'trail-stunts', name: 'Trail Stunts',         ages: ['teens'] },
    { slug: '2048-merge',   name: '2048 Merge',           ages: ['teens', 'adults'] },
    { slug: 'daily-sudoku', name: 'Daily Sudoku',         ages: ['adults'] },
    { slug: 'minesweeper',   name: 'Minesweeper',          ages: ['adults'] },
    { slug: 'mind-meter',    name: 'Mind Meter',           ages: ['teens', 'adults'] }
  ];

  // Are we on a game page? e.g. /games/neon-snake
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

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function currentAges() {
    for (var i = 0; i < GAMES.length; i++) {
      if (GAMES[i].slug === currentSlug) return GAMES[i].ages;
    }
    // Hub pages: infer from path
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
    var ordered = shuffle(preferred).concat(shuffle(rest));
    return ordered.slice(0, count);
  }

  /* ---------- "More games" strip on game pages ---------- */
  function buildMoreStrip() {
    if (!inGamesDir) return;
    var area = document.querySelector('.game-area');
    if (!area || document.querySelector('.more-games')) return;
    var games = pick(3);
    var wrap = document.createElement('div');
    wrap.className = 'more-games';
    var html = '<h2>You may also like</h2><div class="mg-grid">';
    games.forEach(function (g) {
      html += '<a class="mg-card" href="' + url(g) + '">' +
        '<img src="' + thumb(g) + '" alt="' + g.name + ' — free online game" loading="lazy">' +
        '<span>' + g.name + '</span></a>';
    });
    wrap.innerHTML = html + '</div>';
    area.parentNode.insertBefore(wrap, area.nextSibling);
  }

  /* ---------- Exit-intent popup ("Before you go…") ---------- */
  var shown = false;
  function buildModal() {
    if (document.querySelector('.xp-veil')) return;
    var games = pick(6);
    var veil = document.createElement('div');
    veil.className = 'xp-veil';
    veil.setAttribute('role', 'dialog');
    veil.setAttribute('aria-label', 'More games to try');
    var html = '<div class="xp-modal">' +
      '<button class="xp-close" aria-label="Close">✕</button>' +
      '<h2>Before you go… why not try these games?</h2>' +
      '<p class="xp-sub">Every game teaches a lesson. Pick your next one:</p>' +
      '<div class="xp-grid">';
    games.forEach(function (g) {
      html += '<a class="xp-card" href="' + url(g) + '">' +
        '<img src="' + thumb(g) + '" alt="' + g.name + ' — free online game" loading="lazy">' +
        '<span>' + g.name + '</span></a>';
    });
    veil.innerHTML = html + '</div></div>';
    document.body.appendChild(veil);
    veil.querySelector('.xp-close').addEventListener('click', hide);
    veil.addEventListener('click', function (e) { if (e.target === veil) hide(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hide();
    });
  }
  function show() {
    if (shown) return;
    try {
      if (sessionStorage.getItem('xpShown')) return;
    } catch (e) {}
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
    // Desktop only: devices with a fine pointer (mouse). Touch devices get the
    // always-visible "You may also like" strip instead.
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget && e.clientY <= 0) show();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { buildMoreStrip(); initExitIntent(); });
  } else {
    buildMoreStrip();
    initExitIntent();
  }
})();
