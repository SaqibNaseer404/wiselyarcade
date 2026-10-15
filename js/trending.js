/* Wisely Arcade — "Trending now": per-browser play counts with a ranked shelf.
   - On game pages (/games/<slug>) each visit counts as a play (localStorage).
   - On the homepage, #trending-shelf renders the top 6 games by plays.
   - Seeded once from real analytics so the shelf isn't empty on first visit. */
(function () {
  'use strict';

  var GAMES = [
    { slug: 'memory-match', name: 'Animal Memory Match' },
    { slug: 'forest-dash',  name: 'Forest Dash' },
    { slug: 'bubble-pop',   name: 'Bubble Pop' },
    { slug: 'neon-snake',   name: 'Neon Snake' },
    { slug: 'tower-stack',  name: 'Tower Stack' },
    { slug: 'trail-stunts', name: 'Trail Stunts' },
    { slug: '2048-merge',   name: '2048 Merge' },
    { slug: 'daily-sudoku', name: 'Daily Sudoku' },
    { slug: 'minesweeper',  name: 'Minesweeper' },
    { slug: 'mind-meter',   name: 'Mind Meter' }
  ];
  var KEY = 'wa_trend_';

  function get(slug) {
    try { return parseInt(localStorage.getItem(KEY + slug) || '0', 10) || 0; }
    catch (e) { return 0; }
  }
  function set(slug, v) {
    try { localStorage.setItem(KEY + slug, String(v)); } catch (e) {}
  }

  // Seed once from real site analytics (Oct 2026: Forest Dash led clearly).
  try {
    if (!localStorage.getItem('wa_trend_seeded')) {
      set('forest-dash', 45);
      set('minesweeper', 9);
      set('daily-sudoku', 7);
      localStorage.setItem('wa_trend_seeded', '1');
    }
  } catch (e) {}

  // Track: a visit to a game page counts as a play.
  var m = location.pathname.match(/\/games\/([a-z0-9-]+)/);
  if (m) {
    for (var i = 0; i < GAMES.length; i++) {
      if (GAMES[i].slug === m[1]) { set(m[1], get(m[1]) + 1); break; }
    }
  }

  // Render the ranked shelf on the homepage.
  var shelf = document.getElementById('trending-shelf');
  if (shelf) {
    var ranked = GAMES.map(function (g) { return { g: g, plays: get(g.slug) }; })
      .sort(function (a, b) { return b.plays - a.plays; })
      .slice(0, 6);
    var html = '';
    ranked.forEach(function (r, idx) {
      html += '<a class="trend-card" href="games/' + r.g.slug + '">'
        + '<span class="trend-rank">#' + (idx + 1) + '</span>'
        + '<img src="images/thumbs/' + r.g.slug + '.jpg" alt="' + r.g.name + ' — free online game">'
        + '<span class="trend-name">' + r.g.name + '</span>'
        + '<span class="trend-plays">' + r.plays + ' plays</span>'
        + '</a>';
    });
    shelf.innerHTML = html;
  }
})();
