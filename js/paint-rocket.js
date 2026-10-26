// Wisely Arcade — Paint the Rocket v2 (5 levels: more parts + colours as you climb)
(function () {
  'use strict';

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
  var LEVELS = {
    toddler: { label: 'Toddler', sub: 'big & simple', maxLvl: 1, colors: 8, big: true },
    kids:    { label: 'Kids', sub: 'ages 5–9', maxLvl: 2, colors: 12, big: false },
    teen:    { label: 'Teen', sub: 'more detail', maxLvl: 3, colors: 12, big: false },
    adults:  { label: 'Adults', sub: 'fine details', maxLvl: 4, colors: 14, big: false },
    expert:  { label: 'Expert', sub: 'the full masterpiece', maxLvl: 5, colors: 18, big: false }
  };
  var ORDER = ['toddler', 'kids', 'teen', 'adults', 'expert'];

  var palette = document.getElementById('pr-palette');
  var msg = document.getElementById('pr-msg');
  var countEl = document.getElementById('pr-count');
  var colorNameEl = document.getElementById('pr-colorname');
  var levelsEl = document.getElementById('pr-levels');
  var parts = Array.prototype.slice.call(document.querySelectorAll('.pr-part'));

  var levelKey = 'kids';
  try { levelKey = localStorage.getItem('wa_pr_level') || 'kids'; } catch (e) {}
  if (!LEVELS[levelKey]) levelKey = 'kids';
  var L = LEVELS[levelKey];
  var current = ALL_COLORS[0];

  function visibleParts() {
    return parts.filter(function (p) { return parseInt(p.dataset.lvl || '2', 10) <= L.maxLvl; });
  }
  function applyLevelVisibility() {
    parts.forEach(function (p) {
      var vis = parseInt(p.dataset.lvl || '2', 10) <= L.maxLvl;
      p.style.display = vis ? '' : 'none';
    });
  }
  function buildPalette() {
    palette.innerHTML = '';
    palette.classList.toggle('pr-big', !!L.big);
    current = ALL_COLORS[0];
    colorNameEl.textContent = current.name;
    ALL_COLORS.slice(0, L.colors).forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pr-color' + (i === 0 ? ' pr-sel' : '');
      b.style.background = c.hex;
      b.title = c.name;
      b.setAttribute('aria-label', 'Colour: ' + c.name);
      b.addEventListener('click', function () {
        current = c;
        colorNameEl.textContent = c.name;
        palette.querySelectorAll('.pr-color').forEach(function (x) { x.classList.remove('pr-sel'); });
        b.classList.add('pr-sel');
        msg.textContent = c.name + ' picked! Now tap part of the picture.';
      });
      palette.appendChild(b);
    });
  }
  function buildLevelButtons() {
    levelsEl.innerHTML = '';
    ORDER.forEach(function (k) {
      var lv = LEVELS[k];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lvl-btn' + (k === levelKey ? ' lvl-sel' : '');
      b.innerHTML = lv.label + '<small>' + lv.sub + '</small>';
      b.addEventListener('click', function () {
        if (k === levelKey) return;
        levelKey = k; L = LEVELS[k];
        try { localStorage.setItem('wa_pr_level', k); } catch (e) {}
        buildLevelButtons();
        applyLevelVisibility();
        buildPalette();
        reset();
      });
      levelsEl.appendChild(b);
    });
  }
  function paintedCount() {
    return visibleParts().filter(function (p) { return p.dataset.painted === '1'; }).length;
  }
  function refreshCount() {
    var vis = visibleParts();
    countEl.textContent = paintedCount() + ' / ' + vis.length;
    return vis.length;
  }

  parts.forEach(function (p) {
    p.addEventListener('click', function () {
      if (parseInt(p.dataset.lvl || '2', 10) > L.maxLvl) return;
      if (p.dataset.paint === 'stroke') p.style.stroke = current.hex;
      else p.setAttribute('fill', current.hex);
      p.dataset.painted = '1';
      p.classList.remove('pr-pop');
      void p.getBoundingClientRect();
      p.classList.add('pr-pop');
      var total = refreshCount();
      var n = paintedCount();
      var name = p.getAttribute('data-name') || 'that part';
      msg.textContent = n === total
        ? 'You painted everything! Press Launch and watch YOUR rocket fly! 🚀'
        : 'You painted ' + name + ' ' + current.name + '! ' + (total - n) + ' parts to go.';
    });
  });

  function reset() {
    parts.forEach(function (p) {
      if (p.dataset.paint === 'stroke') p.style.stroke = '';
      else p.setAttribute('fill', '#ffffff');
      delete p.dataset.painted;
    });
    document.getElementById('pr-rocket').classList.remove('pr-fly');
    document.getElementById('pr-done').classList.add('hidden');
    refreshCount();
    msg.textContent = 'Pick a colour, then tap part of the picture to paint it!';
  }

  document.getElementById('pr-reset').addEventListener('click', reset);
  document.getElementById('pr-again').addEventListener('click', reset);
  document.getElementById('pr-launch').addEventListener('click', function () {
    var total = visibleParts().length;
    var n = paintedCount();
    if (n < total) {
      msg.textContent = 'Your rocket is almost ready — ' + (total - n) + ' white parts are still waiting for colour!';
      return;
    }
    document.getElementById('pr-rocket').classList.add('pr-fly');
    msg.textContent = '3… 2… 1… BLAST OFF! 🚀';
    setTimeout(function () {
      document.getElementById('pr-done').classList.remove('hidden');
    }, 1500);
  });

  buildLevelButtons();
  applyLevelVisibility();
  buildPalette();
  refreshCount();
})();
