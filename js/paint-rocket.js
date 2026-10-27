/* Paint the Rocket — Wisely Arcade: 100 levels.
   Detail and colours grow as you climb; from Level 6 each level sets a
   Colour Mission — paint named parts in the named colours for 3 stars. */
(function () {
  'use strict';
  var MAX_LEVEL = 100;
  var ALL_COLORS = [
    { name: 'Red', hex: '#ef4444' }, { name: 'Orange', hex: '#f97316' },
    { name: 'Yellow', hex: '#facc15' }, { name: 'Green', hex: '#22c55e' },
    { name: 'Sky blue', hex: '#38bdf8' }, { name: 'Blue', hex: '#3b82f6' },
    { name: 'Purple', hex: '#a855f7' }, { name: 'Pink', hex: '#ec4899' },
    { name: 'Brown', hex: '#b07d4f' }, { name: 'Silver', hex: '#cbd5e1' },
    { name: 'Dark night', hex: '#1e293b' }, { name: 'White', hex: '#ffffff' },
    { name: 'Teal', hex: '#14b8a6' }, { name: 'Lime', hex: '#84cc16' },
    { name: 'Gold', hex: '#d4af37' }, { name: 'Lavender', hex: '#c4b5fd' },
    { name: 'Peach', hex: '#fdba74' }, { name: 'Magenta', hex: '#d946ef' }
  ];
  var TIERS = [
    { to: 20, name: 'First flights' }, { to: 40, name: 'Sky painter' },
    { to: 60, name: 'Orbit artist' }, { to: 80, name: 'Star designer' },
    { to: 100, name: 'Master of colour' }
  ];
  function tierName(l) { for (var i = 0; i < TIERS.length; i++) if (l <= TIERS[i].to) return TIERS[i].name; return TIERS[4].name; }
  function maxLvl(l) { return Math.ceil(l / 20); }
  function paletteSize(l) { return Math.min(18, 8 + Math.floor((l - 1) / 10)); }
  function missionCount(l) { return l < 6 ? 0 : l <= 20 ? 1 : l <= 40 ? 2 : l <= 60 ? 3 : l <= 80 ? 4 : 5; }
  function seeded(seed) { var t = seed * 2654435761 % 4294967296; return function () { t = (t * 1664525 + 1013904223) % 4294967296; return t / 4294967296; }; }

  var palette = document.getElementById('pr-palette');
  var msg = document.getElementById('pr-msg');
  var countEl = document.getElementById('pr-count');
  var colorNameEl = document.getElementById('pr-colorname');
  var missionEl = document.getElementById('pr-mission');
  var parts = Array.prototype.slice.call(document.querySelectorAll('.pr-part'));

  var cur = 1, unlocked = 1, starMap = {};
  try {
    cur = parseInt(localStorage.getItem('wa_pr_current') || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem('wa_pr_unlocked') || '1', 10) || 1;
    starMap = JSON.parse(localStorage.getItem('wa_pr_stars') || '{}') || {};
  } catch (e) {}
  if (cur < 1) cur = 1; if (cur > MAX_LEVEL) cur = MAX_LEVEL;
  if (unlocked < cur) unlocked = cur;
  var current = ALL_COLORS[0];
  var mission = [];
  function save() {
    try {
      localStorage.setItem('wa_pr_current', String(cur));
      localStorage.setItem('wa_pr_unlocked', String(unlocked));
      localStorage.setItem('wa_pr_stars', JSON.stringify(starMap));
    } catch (e) {}
  }

  function visibleParts() {
    var m = maxLvl(cur);
    return parts.filter(function (p) { return parseInt(p.dataset.lvl || '2', 10) <= m; });
  }
  function applyLevelVisibility() {
    var m = maxLvl(cur);
    parts.forEach(function (p) { p.style.display = parseInt(p.dataset.lvl || '2', 10) <= m ? '' : 'none'; });
  }
  function buildMission() {
    mission = [];
    var k = missionCount(cur);
    if (!k) { missionEl.innerHTML = ''; return; }
    var rng = seeded(cur * 97 + 13);
    var vis = visibleParts().slice();
    var cols = ALL_COLORS.slice(0, paletteSize(cur));
    var usedNames = {};
    var guard = 0;
    while (mission.length < k && guard++ < 80) {
      var p = vis[Math.floor(rng() * vis.length)];
      var nm = p.getAttribute('data-name') || 'a part';
      if (usedNames[nm]) continue;
      usedNames[nm] = 1;
      mission.push({ part: p, name: nm, color: cols[Math.floor(rng() * cols.length)] });
    }
    renderMission();
  }
  function missionMatched() {
    return mission.filter(function (m) { return m.part.dataset.color === m.color.hex; }).length;
  }
  function renderMission() {
    if (!mission.length) { missionEl.innerHTML = ''; return; }
    var html = '<strong>🎯 Colour Mission — Level ' + cur + ':</strong> ';
    html += mission.map(function (m) {
      var ok = m.part.dataset.color === m.color.hex;
      return (ok ? '✅ ' : '⬜ ') + 'paint <em>' + m.name + '</em> <strong>' + m.color.name + '</strong>';
    }).join(' · ');
    missionEl.innerHTML = html;
  }
  function buildPalette() {
    palette.innerHTML = '';
    ALL_COLORS.slice(0, paletteSize(cur)).forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pr-color' + (i === 0 ? ' pr-sel' : '');
      b.style.background = c.hex;
      b.title = c.name;
      b.setAttribute('aria-label', c.name);
      b.addEventListener('click', function () {
        current = c;
        colorNameEl.textContent = c.name;
        palette.querySelectorAll('.pr-color').forEach(function (x) { x.classList.remove('pr-sel'); });
        b.classList.add('pr-sel');
      });
      palette.appendChild(b);
    });
    current = ALL_COLORS[0];
    colorNameEl.textContent = current.name;
  }
  function buildMap() {
    var map = document.getElementById('pr-map');
    map.innerHTML = '';
    for (var l = 1; l <= MAX_LEVEL; l++) {
      (function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        if (starMap[l] != null && l !== cur) { b.className = 'pr-lvl pr-done'; b.textContent = l + (starMap[l] >= 3 ? ' ⭐' : ''); }
        else if (l === cur) { b.className = 'pr-lvl pr-cur'; b.textContent = l; }
        else if (l <= unlocked) { b.className = 'pr-lvl'; b.textContent = l; }
        else { b.className = 'pr-lvl pr-lock'; b.textContent = '🔒'; }
        b.disabled = l > unlocked;
        b.setAttribute('aria-label', 'Level ' + l);
        b.addEventListener('click', function () { if (l <= unlocked) { cur = l; save(); startLevel(); } });
        map.appendChild(b);
      })(l);
    }
    document.getElementById('pr-level-now').textContent = cur;
    var doneCount = 0; for (var k in starMap) doneCount++;
    document.getElementById('pr-progress-note').textContent = tierName(cur) + ' · ' + doneCount + ' of 100 levels completed';
  }
  function paintedCount() { return visibleParts().filter(function (p) { return p.dataset.painted === '1'; }).length; }
  function refreshCount() {
    var vis = visibleParts();
    countEl.textContent = paintedCount() + ' / ' + vis.length;
    return vis.length;
  }
  function reset() {
    parts.forEach(function (p) {
      if (p.dataset.paint === 'stroke') p.style.stroke = '';
      else p.setAttribute('fill', '#ffffff');
      delete p.dataset.painted;
      delete p.dataset.color;
    });
    document.getElementById('pr-rocket').classList.remove('pr-fly');
    document.getElementById('pr-done').classList.add('hidden');
    refreshCount();
    renderMission();
    msg.textContent = 'Pick a colour, then tap part of the picture to paint it!';
  }
  function startLevel() {
    applyLevelVisibility();
    buildPalette();
    buildMap();
    buildMission();
    reset();
  }

  parts.forEach(function (p) {
    p.addEventListener('click', function () {
      if (parseInt(p.dataset.lvl || '2', 10) > maxLvl(cur)) return;
      if (p.dataset.paint === 'stroke') p.style.stroke = current.hex;
      else p.setAttribute('fill', current.hex);
      p.dataset.painted = '1';
      p.dataset.color = current.hex;
      p.classList.remove('pr-pop');
      void p.getBoundingClientRect();
      p.classList.add('pr-pop');
      var total = refreshCount();
      var n = paintedCount();
      var name = p.getAttribute('data-name') || 'that part';
      renderMission();
      msg.textContent = n === total
        ? 'You painted everything! Press Launch and watch YOUR rocket fly! 🚀'
        : 'You painted ' + name + ' ' + current.name + '! ' + (total - n) + ' parts to go.';
    });
  });

  document.getElementById('pr-reset').addEventListener('click', reset);
  document.getElementById('pr-again').addEventListener('click', function () {
    if (cur < MAX_LEVEL) { cur++; save(); }
    startLevel();
  });
  document.getElementById('pr-launch').addEventListener('click', function () {
    var total = visibleParts().length;
    var n = paintedCount();
    if (n < total) {
      msg.textContent = 'Your rocket is almost ready — ' + (total - n) + ' white parts are still waiting for colour!';
      return;
    }
    var stars = 3;
    if (mission.length) {
      var got = missionMatched();
      stars = got === mission.length ? 3 : got >= Math.ceil(mission.length / 2) ? 2 : 1;
    }
    if (starMap[cur] == null || stars > starMap[cur]) starMap[cur] = stars;
    if (cur === unlocked && unlocked < MAX_LEVEL) unlocked++;
    save();
    buildMap();
    document.getElementById('pr-rocket').classList.add('pr-fly');
    msg.textContent = '3… 2… 1… BLAST OFF! 🚀';
    var stats = document.getElementById('pr-done-stats');
    if (stats) stats.textContent = 'Level ' + cur + ' complete — ' + stars + ' of 3 stars!' +
      (mission.length ? ' Colour Mission: ' + missionMatched() + ' of ' + mission.length + ' matched.' : '') +
      (cur < MAX_LEVEL ? ' Level ' + (cur + 1) + ' is unlocked — a bigger, more colourful rocket awaits!' : ' You painted all 100 rockets. Master of colour!');
    setTimeout(function () { document.getElementById('pr-done').classList.remove('hidden'); }, 1500);
  });

  startLevel();
})();
