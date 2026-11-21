/* Needs vs Wants — sort each item: do you NEED it, or just WANT it?
   The lesson IS the mechanic: needs keep you safe and growing; wants are fun —
   after needs, and after saving a little. Every correctly spotted want drops
   its price into your savings jar. 100 levels, 8 items per level, pass with 6+.
   Progress in localStorage (wa_nv_*). */
(function () {
  'use strict';
  var MAX_LEVEL = 100, PER_LEVEL = 8, PASS = 6;

  /* Item bank. e emoji, n name, c context, need 1=need 0=want, p price in coins,
     w why, tier 1 easy / 2 context matters / 3 tricky. */
  var BANK = [
    /* ---------- TIER 1 ---------- */
    { e: '🍞', n: 'Bread', c: 'Your family needs food for dinner tonight.', need: 1, p: 3, tier: 1, w: 'Food is the first need of all. Without dinner, nobody sleeps well or learns well.' },
    { e: '💧', n: 'Water bottle', c: 'You are thirsty after playing outside in the sun.', need: 1, p: 2, tier: 1, w: 'Your body needs water every day. Thirst is your body asking for a need.' },
    { e: '📚', n: 'School book', c: 'Your teacher said everyone must have this book for class.', need: 1, p: 6, tier: 1, w: 'If school requires it for learning, it is a need — it helps you grow.' },
    { e: '✏️', n: 'Pencil', c: 'Your only pencil broke while you were doing homework.', need: 1, p: 1, tier: 1, w: 'You cannot do your schoolwork without one. A broken tool you rely on is a need.' },
    { e: '🧥', n: 'Warm coat', c: 'Winter is here, and you have outgrown your old coat.', need: 1, p: 9, tier: 1, w: 'Warm clothes in winter keep you healthy. Needs are not always cheap — that is why we save.' },
    { e: '🚌', n: 'Bus fare', c: 'You must get to school, and it is too far to walk.', need: 1, p: 2, tier: 1, w: 'Getting to school is a need. Transport that takes you somewhere important counts.' },
    { e: '🍎', n: 'Apple for lunch', c: 'Your lunchbox is empty today.', need: 1, p: 2, tier: 1, w: 'Lunch is fuel for your brain. An empty lunchbox makes learning harder.' },
    { e: '🧼', n: 'Soap', c: 'The bathroom soap is finished at home.', need: 1, p: 2, tier: 1, w: 'Soap keeps germs away and keeps you healthy. Staying clean is a need.' },
    { e: '🍬', n: 'Candy', c: 'You already had a sweet today — but this one looks yummy.', need: 0, p: 1, tier: 1, w: 'It tastes great, but you do not need it to be healthy or to grow. That makes it a want.' },
    { e: '🎮', n: 'Video game', c: 'A fun new game that everyone is talking about.', need: 0, p: 8, tier: 1, w: 'Games are fun — and fun matters! But fun comes after needs. Spot it as a want and save first.' },
    { e: '🧸', n: 'Teddy bear', c: 'You have four teddies at home, but this one is extra cute.', need: 0, p: 5, tier: 1, w: 'A fifth teddy will not keep you warm or fed. Cute is a want — nothing wrong with it, just not first.' },
    { e: '🍦', n: 'Ice cream', c: 'A treat on a hot day, right after a full lunch.', need: 0, p: 2, tier: 1, w: 'Your tummy is already full from lunch. This is pure treat — a happy want.' },
    { e: '🎈', n: 'Balloon', c: 'It floats and bounces! It will also pop by tomorrow.', need: 0, p: 1, tier: 1, w: 'One day of floaty fun. Wants are fine — just know them when you see them.' },
    { e: '🛼', n: 'Roller skates', c: 'Shiny new skates — when your old pair still fits you.', need: 0, p: 9, tier: 1, w: 'If the old pair still works, the new pair is a want, however shiny it is.' },
    { e: '🍩', n: 'Doughnut', c: 'You are not hungry. It just looks delicious in the window.', need: 0, p: 2, tier: 1, w: 'Not hungry + looks tasty = want. Your eyes order more than your body needs.' },
    { e: '📱', n: 'Glitter phone case', c: 'Your phone case works fine. This one sparkles.', need: 0, p: 4, tier: 1, w: 'Sparkle does not protect the phone any better. Decorating a working thing is a want.' },

    /* ---------- TIER 2 — the same item can flip ---------- */
    { e: '👟', n: 'Shoes', c: 'Your only pair has a hole, and rain gets in.', need: 1, p: 8, tier: 2, w: 'Same shoes, different story: broken and letting in rain means NEED. Context decides!' },
    { e: '👟', n: 'Shoes', c: 'Your shoes are fine, but this colour is trending.', need: 0, p: 8, tier: 2, w: 'Same shoes, different story: fine shoes + fashion colour means WANT. Context decides!' },
    { e: '📱', n: 'Phone', c: 'Your old phone broke, and you need one to call home safely.', need: 1, p: 9, tier: 2, w: 'A phone that keeps you safe and connected to family can be a need — when the old one is truly broken.' },
    { e: '📱', n: 'Phone', c: 'Your phone works well, but a newer model just came out.', need: 0, p: 9, tier: 2, w: 'Newer is not the same as needed. A working phone makes the upgrade a want.' },
    { e: '🎒', n: 'School bag', c: 'Your bag\'s zip broke, and your books keep falling out.', need: 1, p: 7, tier: 2, w: 'A bag that cannot carry your books has stopped doing its job. Replacing a broken essential is a need.' },
    { e: '🎒', n: 'School bag', c: 'Your bag is good, but this one has your favourite cartoon on it.', need: 0, p: 7, tier: 2, w: 'The cartoon changes how it looks, not what it does. Looks-only upgrades are wants.' },
    { e: '💊', n: 'Medicine', c: 'The doctor said you need this medicine to get better.', need: 1, p: 6, tier: 2, w: 'Health first, always. Medicine a doctor prescribes is one of the clearest needs there is.' },
    { e: '🧢', n: 'Cap', c: 'You already have two caps. This one matches your shirt.', need: 0, p: 3, tier: 2, w: 'Third cap, bought for matching. Matching is a style want.' },
    { e: '🔧', n: 'Bike repair', c: 'Your bike chain broke, and you ride your bike to school.', need: 1, p: 4, tier: 2, w: 'Fixing the thing that takes you to school protects a need. Repairs of essentials are needs.' },
    { e: '🎨', n: 'Art set', c: 'You love drawing — and you already own two full art sets.', need: 0, p: 5, tier: 2, w: 'Loving something does not make more of it a need. Two full sets means this is a want.' },
    { e: '🌂', n: 'Umbrella', c: 'Rainy season has started, and you walk to school.', need: 1, p: 4, tier: 2, w: 'Staying dry on a daily walk keeps you healthy and your books safe. Seasonal essentials are needs.' },
    { e: '🍿', n: 'Cinema popcorn', c: 'A jumbo tub — just because the film is long.', need: 0, p: 3, tier: 2, w: 'The film is the treat; the jumbo tub is a treat on top of a treat. A want, happily.' },
    { e: '📖', n: 'Story book', c: 'You finished all your books, and the library is closed this month.', need: 0, p: 5, tier: 2, w: 'Reading is wonderful — but a book you choose for fun is a want. Good wants exist! They just wait their turn.' },
    { e: '🥛', n: 'Milk', c: 'For breakfast tomorrow — and the fridge is empty.', need: 1, p: 2, tier: 2, w: 'Basic food for tomorrow\'s breakfast. Everyday food you are out of is a need.' },
    { e: '🧃', n: 'Juice box', c: 'There is water at home, but juice tastes better.', need: 0, p: 2, tier: 2, w: 'Tastes better than the free option at home — that is the shape of a want.' },
    { e: '🎧', n: 'Headphones', c: 'Your pair broke, and you need them for online class.', need: 1, p: 6, tier: 2, w: 'Broken + required for class = need. The same headphones for music only would be a want.' },

    /* ---------- TIER 3 — tricky ---------- */
    { e: '🐶', n: 'Dog food', c: 'Food for your pet dog, who depends on you for every meal.', need: 1, p: 4, tier: 3, w: 'When someone — or some dog — depends on you, their needs become your needs.' },
    { e: '🦷', n: 'Toothpaste', c: 'The tube at home is completely empty.', need: 1, p: 2, tier: 3, w: 'Small, boring, essential. Needs often look boring next to wants — that is the trap.' },
    { e: '🔋', n: 'Torch batteries', c: 'The lights go out often at night, and the torch is dead.', need: 1, p: 3, tier: 3, w: 'Light and safety at night in your home: a quiet, real need.' },
    { e: '🧦', n: 'Socks', c: 'Every pair you own has holes in it.', need: 1, p: 3, tier: 3, w: 'Clothes that have worn out completely turn replacement into a need.' },
    { e: '💡', n: 'Study lamp', c: 'Your lamp broke, and you do your homework at night.', need: 1, p: 6, tier: 3, w: 'You cannot study in the dark. Tools for learning, when broken, are needs.' },
    { e: '🩹', n: 'Plasters', c: 'The home first-aid box is empty.', need: 1, p: 2, tier: 3, w: 'First-aid supplies are needs you buy BEFORE you need them. That is planning.' },
    { e: '📚', n: 'Exam guide', c: 'Your teacher set this guide as required practice for next month\'s exam.', need: 1, p: 5, tier: 3, w: 'Required by your teacher for the exam — like the school book, it is a learning need.' },
    { e: '🧤', n: 'Gloves', c: 'Snow is coming, and your hands freeze on the walk to school.', need: 1, p: 4, tier: 3, w: 'Protection from real cold on a daily walk: a need, not a fashion choice.' },
    { e: '🎁', n: 'Birthday gift', c: 'A gift for your best friend\'s birthday next week.', need: 0, p: 4, tier: 3, w: 'A kind want! Gifts are wants — but the best kind. Smart spenders plan for kind wants after needs and saving.' },
    { e: '💐', n: 'Flowers for Mum', c: 'Just because she works hard and you want to say thank you.', need: 0, p: 3, tier: 3, w: 'Another kind want. Not a need — but proof that wants are not bad. They just come second.' },
    { e: '🎟️', n: 'Match ticket', c: 'Your favourite team is playing in your city this weekend.', need: 0, p: 7, tier: 3, w: 'A special day out is a want — a memorable one. Save for it on purpose, not on impulse.' },
    { e: '📷', n: 'Camera', c: 'For your photography hobby — your phone camera works fine.', need: 0, p: 9, tier: 3, w: 'A hobby upgrade while the phone camera works: a want. Big wants are savings goals, not emergencies.' },
    { e: '🖊️', n: 'Fancy pen', c: 'Your normal pen writes perfectly. This one is gold-coloured.', need: 0, p: 3, tier: 3, w: 'Gold colour does not write better. Decoration on a working tool is a want.' },
    { e: '🎮', n: 'Game coins', c: 'Coins to buy a costume inside a game you already own.', need: 0, p: 4, tier: 3, w: 'A costume inside a game changes nothing but looks. In-game sparkle is one of the purest wants.' },
    { e: '🍫', n: 'Chocolate to share', c: 'A big bar to share with your cousins this evening.', need: 0, p: 2, tier: 3, w: 'Sharing makes it sweet — but sweet is still a want. Enjoy wants on purpose, with eyes open.' },
    { e: '🎲', n: 'Board game', c: 'For family game night. You already own three board games.', need: 0, p: 6, tier: 3, w: 'Family time is precious; a fourth game is not what makes it precious. A want.' }
  ];

  function tierName(l) { return l <= 20 ? 'First Coins' : (l <= 60 ? 'Smart Shopper' : 'Money Master'); }
  function poolsFor(l) {
    var tiers = l <= 20 ? [1] : (l <= 60 ? [1, 2] : [2, 3]);
    var needs = BANK.filter(function (x) { return x.need === 1 && tiers.indexOf(x.tier) >= 0; });
    var wants = BANK.filter(function (x) { return x.need === 0 && tiers.indexOf(x.tier) >= 0; });
    return { needs: needs, wants: wants };
  }
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pickFor(level) {
    var pools = poolsFor(level), rand = rng(level * 104729 + 7);
    function draw(pool, n) { var p = pool.slice(), out = []; while (out.length < n && p.length) out.push(p.splice(Math.floor(rand() * p.length), 1)[0]); return out; }
    var items = draw(pools.needs, PER_LEVEL / 2).concat(draw(pools.wants, PER_LEVEL / 2));
    // shuffle the combined list with the same seeded rng
    for (var i = items.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var tmp = items[i]; items[i] = items[j]; items[j] = tmp; }
    return items;
  }

  var $ = function (id) { return document.getElementById(id); };
  var levelNowEl = $('nv-level-now'), noteEl = $('nv-progress-note'), mapEl = $('nv-map');
  var roundEl = $('nv-round'), correctEl = $('nv-correct'), jarEl = $('nv-jar');
  var emojiEl = $('nv-emoji'), nameEl = $('nv-name'), ctxEl = $('nv-context'), priceEl = $('nv-price');
  var btnNeed = $('nv-btn-need'), btnWant = $('nv-btn-want');
  var whyEl = $('nv-why'), verdictEl = $('nv-verdict'), whyTextEl = $('nv-why-text'), nextBtn = $('nv-next');
  var doneEl = $('nv-done'), doneTitle = $('nv-done-title'), doneStats = $('nv-done-stats');
  var againBtn = $('nv-again'), nextLvlBtn = $('nv-next-level'), restartBtn = $('nv-restart');

  var level = 1, unlocked = 1, starsMap = {};
  try {
    level = parseInt(localStorage.getItem('wa_nv_current') || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem('wa_nv_unlocked') || '1', 10) || 1;
    starsMap = JSON.parse(localStorage.getItem('wa_nv_stars') || '{}') || {};
  } catch (e) {}
  if (level < 1) level = 1; if (level > MAX_LEVEL) level = MAX_LEVEL;
  if (unlocked < 1) unlocked = 1; if (unlocked > MAX_LEVEL) unlocked = MAX_LEVEL;
  if (level > unlocked) level = unlocked;

  var set = [], idx = 0, correct = 0, jar = 0, answered = false;

  function save() {
    try {
      localStorage.setItem('wa_nv_current', String(level));
      localStorage.setItem('wa_nv_unlocked', String(unlocked));
      localStorage.setItem('wa_nv_stars', JSON.stringify(starsMap));
    } catch (e) {}
  }
  function doneCount() { var t = 0; for (var k in starsMap) if (starsMap[k] > 0) t++; return t; }

  function renderMap() {
    mapEl.innerHTML = '';
    for (var n = 1; n <= MAX_LEVEL; n++) {
      (function (n) {
        var b = document.createElement('button');
        var st = starsMap[n] || 0;
        b.type = 'button';
        b.className = 'nv-lvl' + (n === level ? ' nv-cur' : '') + (st > 0 ? ' nv-done' : '');
        b.textContent = st > 0 ? n + ' ★'.repeat(st) : String(n);
        if (n > unlocked) { b.disabled = true; b.classList.add('nv-lock'); b.textContent = '🔒'; b.title = 'Level ' + n + ' — finish level ' + (n - 1) + ' to unlock'; }
        b.addEventListener('click', function () { if (n <= unlocked && n !== level) { level = n; save(); start(); } });
        mapEl.appendChild(b);
      })(n);
    }
    levelNowEl.textContent = level;
    noteEl.textContent = tierName(level) + ' · ' + doneCount() + ' of 100 levels completed';
  }

  function showItem() {
    var it = set[idx];
    answered = false;
    emojiEl.textContent = it.e;
    nameEl.textContent = it.n;
    ctxEl.textContent = it.c;
    priceEl.textContent = '🪙 ' + it.p + (it.p === 1 ? ' coin' : ' coins');
    whyEl.classList.add('hidden');
    btnNeed.disabled = false; btnWant.disabled = false;
    btnNeed.classList.remove('nv-picked-right', 'nv-picked-wrong');
    btnWant.classList.remove('nv-picked-right', 'nv-picked-wrong');
    roundEl.textContent = (idx + 1) + ' / ' + PER_LEVEL;
    correctEl.textContent = correct;
    jarEl.textContent = jar + ' 🪙';
  }

  function answer(guess) {
    if (answered) return;
    answered = true;
    var it = set[idx], right = (guess === it.need);
    if (right) { correct++; if (it.need === 0) jar += it.p; }
    btnNeed.disabled = true; btnWant.disabled = true;
    var picked = guess === 1 ? btnNeed : btnWant;
    picked.classList.add(right ? 'nv-picked-right' : 'nv-picked-wrong');
    verdictEl.textContent = right ? (it.need ? '✅ Correct — that is a NEED.' : '✅ Correct — that is a WANT. ' + it.p + ' coins saved into your jar!') : (it.need ? '❌ Not quite — that one is a NEED.' : '❌ Not quite — that one is a WANT.');
    whyTextEl.textContent = it.w;
    whyEl.classList.remove('hidden');
    correctEl.textContent = correct;
    jarEl.textContent = jar + ' 🪙';
    nextBtn.textContent = idx === PER_LEVEL - 1 ? 'See my result →' : 'Next item →';
  }

  function finish() {
    var stars = correct === 8 ? 3 : (correct === 7 ? 2 : (correct === PASS ? 1 : 0));
    var passed = correct >= PASS;
    if (passed) {
      if (stars > (starsMap[level] || 0)) starsMap[level] = stars;
      if (level === unlocked && unlocked < MAX_LEVEL) unlocked = level + 1;
    }
    save(); renderMap();
    doneTitle.textContent = passed ? (correct === 8 ? '🐷 Money Master!' : '🐷 Smart Spender!') : '🪙 Keep Practising';
    doneStats.textContent = 'You sorted ' + correct + ' of ' + PER_LEVEL + ' correctly on Level ' + level + ' and saved ' + jar + ' coins in your jar.' +
      (passed ? ' Level complete — ' + stars + ' star' + (stars === 1 ? '' : 's') + ' earned.' : ' You need ' + PASS + ' correct to pass. Remember: ask "do I need it to be safe, healthy and learning — or do I just want it?"');
    nextLvlBtn.style.display = passed && level < MAX_LEVEL ? '' : 'none';
    doneEl.classList.remove('hidden');
  }

  function start() {
    set = pickFor(level); idx = 0; correct = 0; jar = 0;
    doneEl.classList.add('hidden');
    renderMap(); showItem();
  }

  btnNeed.addEventListener('click', function () { answer(1); });
  btnWant.addEventListener('click', function () { answer(0); });
  nextBtn.addEventListener('click', function () { if (idx < PER_LEVEL - 1) { idx++; showItem(); } else { finish(); } });
  againBtn.addEventListener('click', start);
  nextLvlBtn.addEventListener('click', function () { if (level < MAX_LEVEL) { level++; save(); start(); } });
  restartBtn.addEventListener('click', start);

  start();
})();
