// Wisely Arcade — shared JS: footer year, active nav, 3D tilt cards, game search.
(function () {
  // Footer copyright year on every page.
  var yearEls = document.querySelectorAll('#year');
  var y = new Date().getFullYear();
  for (var i = 0; i < yearEls.length; i++) yearEls[i].textContent = y;

  // Highlight the nav link matching the current page.
  var path = location.pathname.split('/').pop() || '/';
  var links = document.querySelectorAll('nav.main a');
  for (var j = 0; j < links.length; j++) {
    var href = links[j].getAttribute('href');
    if (href === path) {
      links[j].classList.add('active');
    }
  }

  // 3D tilt on game cards (fine pointers only; respects reduced motion).
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (fine && !reduced) {
    var cards = document.querySelectorAll('.card:not(.coming)');
    for (var c = 0; c < cards.length; c++) {
      (function (card) {
        card.classList.add('tilt');
        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform =
            'perspective(900px) rotateX(' + (-py * 7).toFixed(2) + 'deg)' +
            ' rotateY(' + (px * 9).toFixed(2) + 'deg) translateY(-6px)';
        });
        card.addEventListener('pointerleave', function () {
          card.style.transform = '';
        });
      })(cards[c]);
    }
  }

  // Live game search: filters cards by title on hub pages.
  var inputs = document.querySelectorAll('.game-search, #game-search');
  for (var s = 0; s < inputs.length; s++) {
    (function (input) {
      // The cards grid nearest to this input (same section).
      var section = input.closest('section') || document;
      var grid = section.querySelector('.cards');
      if (!grid) return;
      var items = grid.querySelectorAll('.card');
      var empty = document.createElement('p');
      empty.className = 'search-empty';
      empty.textContent = 'No games match — try another word.';
      empty.style.display = 'none';
      grid.parentNode.insertBefore(empty, grid.nextSibling);
      input.addEventListener('input', function () {
        var q = input.value.trim().toLowerCase();
        var shown = 0;
        for (var k = 0; k < items.length; k++) {
          var title = items[k].querySelector('h3');
          var name = title ? title.textContent.toLowerCase() : '';
          var hit = !q || name.indexOf(q) !== -1;
          items[k].style.display = hit ? '' : 'none';
          if (hit) shown++;
        }
        empty.style.display = shown ? 'none' : '';
      });
    })(inputs[s]);
  }
})();
