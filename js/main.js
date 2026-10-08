// Wisely Arcade — shared JS: footer year + active nav highlighting.
(function () {
  // Footer copyright year on every page.
  var yearEls = document.querySelectorAll('#year');
  var y = new Date().getFullYear();
  for (var i = 0; i < yearEls.length; i++) yearEls[i].textContent = y;

  // Highlight the nav link matching the current page.
  var path = location.pathname.split('/').pop() || 'index.html';
  var links = document.querySelectorAll('nav.main a');
  for (var j = 0; j < links.length; j++) {
    var href = links[j].getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      links[j].classList.add('active');
    }
  }
})();
