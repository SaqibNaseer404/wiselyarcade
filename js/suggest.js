/* Wisely Arcade — "What should we build next?" suggestion box.
   No backend, no tracking: the visitor's own email app sends the idea,
   and their ideas are kept only in this browser's localStorage. */
(function () {
  var form = document.getElementById('suggest-form');
  if (!form) return;

  var ideaInput = document.getElementById('suggest-idea');
  var nameInput = document.getElementById('suggest-name');
  var listWrap = document.getElementById('my-ideas');
  var list = document.getElementById('my-ideas-list');
  var KEY = 'wa_suggestions_v1';
  var TO = 'saqibnaseer077@gmail.com';

  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function save(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items.slice(0, 10))); }
    catch (e) { /* storage unavailable — the mailto send still works */ }
  }

  function render() {
    var items = load();
    if (!items.length) { listWrap.style.display = 'none'; return; }
    listWrap.style.display = 'block';
    list.innerHTML = '';
    items.forEach(function (it) {
      var d = document.createElement('div');
      d.className = 'idea-chip';
      var t = document.createElement('div');
      t.textContent = it.idea; /* textContent, never innerHTML — no injection */
      d.appendChild(t);
      var s = document.createElement('small');
      s.textContent = 'from ' + (it.name || 'a player') + ' · ' + it.date;
      d.appendChild(s);
      list.appendChild(d);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var idea = ideaInput.value.trim();
    if (!idea) { ideaInput.focus(); return; }
    var name = nameInput.value.trim();

    var body = 'Hi! I have a game idea for Wisely Arcade:\n\n'
      + idea
      + (name ? '\n\n— ' + name : '')
      + '\n\nThe lesson it could teach: ________';

    /* Real aggregation happens here: the visitor's own email app opens
       with everything pre-written — zero tracking, fully opt-in. */
    window.location.href =
      'mailto:' + TO
      + '?subject=' + encodeURIComponent('Game idea for Wisely Arcade')
      + '&body=' + encodeURIComponent(body);

    var items = load();
    items.unshift({ idea: idea, name: name, date: new Date().toLocaleDateString() });
    save(items);
    render();
    ideaInput.value = '';
    nameInput.value = '';
  });

  render();
})();
