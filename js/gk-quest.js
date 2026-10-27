/* GK Quest — Wisely Arcade: 100 levels of general knowledge.
   5 questions per level, mixed categories, facts get tougher as you climb.
   Every answer teaches one true fact. Progress: wa_gk_current/unlocked/stars. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var MAX_LEVEL = 100, PER_LEVEL = 5;

  /* [category, question, options, correct, why] */
  var T1 = [
    ['🌍 World', 'What is the capital of France?', ['Paris', 'London', 'Rome'], 'Paris', 'Paris has been France\'s capital for centuries and is home to the Eiffel Tower.'],
    ['🦁 Animals', 'Which animal is called the King of the Jungle?', ['Lion', 'Tiger', 'Elephant'], 'Lion', 'Lions earned the title from their strength and their royal mane.'],
    ['🔬 Science', 'What do bees make?', ['Honey', 'Milk', 'Silk'], 'Honey', 'Bees turn flower nectar into honey inside the hive.'],
    ['🍎 Food', 'Which fruit keeps the doctor away, in the famous saying?', ['Apple', 'Banana', 'Grapes'], 'Apple', 'The saying goes: an apple a day keeps the doctor away!'],
    ['🚀 Space', 'What planet do we live on?', ['Earth', 'Mars', 'Venus'], 'Earth', 'Earth is the only planet known to have life.'],
    ['🦁 Animals', 'How many legs does a spider have?', ['8', '6', '10'], '8', 'All spiders have 8 legs — insects have 6.'],
    ['🌍 World', 'Which is the largest ocean?', ['Pacific', 'Atlantic', 'Indian'], 'Pacific', 'The Pacific Ocean covers about a third of Earth\'s surface.'],
    ['🔬 Science', 'What colour do you get mixing blue and yellow?', ['Green', 'Purple', 'Orange'], 'Green', 'Blue + yellow paint makes green.'],
    ['🍎 Food', 'Which vegetable do rabbits love in cartoons?', ['Carrot', 'Potato', 'Onion'], 'Carrot', 'Carrots are sweet and crunchy — a rabbit favourite.'],
    ['🚀 Space', 'What is the name of our galaxy\'s star?', ['The Sun', 'The Moon', 'Polaris'], 'The Sun', 'The Sun is a star — the closest one to Earth.'],
    ['🌍 World', 'How many days are in a week?', ['7', '5', '10'], '7', 'Monday to Sunday — 7 days in every week.'],
    ['🦁 Animals', 'Which bird cannot fly but swims?', ['Penguin', 'Eagle', 'Owl'], 'Penguin', 'Penguins are flightless birds built for swimming in cold seas.'],
    ['🔬 Science', 'Water is made of hydrogen and…?', ['Oxygen', 'Carbon', 'Iron'], 'Oxygen', 'That is why water\'s symbol is H₂O — two hydrogen, one oxygen.'],
    ['🏛️ History', 'Who painted the Mona Lisa?', ['Leonardo da Vinci', 'Pablo Picasso', 'Van Gogh'], 'Leonardo da Vinci', 'Da Vinci painted it over 500 years ago; it hangs in Paris today.']
  ];
  var T2 = [
    ['🚀 Space', 'Which planet is known as the Red Planet?', ['Mars', 'Jupiter', 'Saturn'], 'Mars', 'Mars looks red because of iron rust in its dust.'],
    ['🌍 World', 'What is the capital of Japan?', ['Tokyo', 'Beijing', 'Seoul'], 'Tokyo', 'Tokyo is one of the largest cities in the world.'],
    ['🦁 Animals', 'Which is the fastest land animal?', ['Cheetah', 'Horse', 'Lion'], 'Cheetah', 'A cheetah can sprint up to about 100 km/h.'],
    ['🔬 Science', 'How many sides does a hexagon have?', ['6', '5', '8'], '6', 'Hex = six. Bees build hexagon honeycomb cells.'],
    ['🏛️ History', 'The Great Wall is in which country?', ['China', 'India', 'Japan'], 'China', 'It stretches over 21,000 km across northern China.'],
    ['🍎 Food', 'Sushi comes from which country?', ['Japan', 'Thailand', 'Italy'], 'Japan', 'Sushi began in Japan as seasoned rice with fish.'],
    ['⚽ Sports', 'How many players does a football (soccer) team have on the field?', ['11', '9', '10'], '11', 'Eleven players per side, including the goalkeeper.'],
    ['🌍 World', 'Which country has the kangaroo as a famous animal?', ['Australia', 'Brazil', 'Kenya'], 'Australia', 'Kangaroos live wild only in Australia.'],
    ['🔬 Science', 'What force keeps us on the ground?', ['Gravity', 'Magnetism', 'Friction'], 'Gravity', 'Gravity pulls everything toward Earth\'s centre.'],
    ['🦁 Animals', 'Which animal has the longest neck?', ['Giraffe', 'Camel', 'Horse'], 'Giraffe', 'A giraffe\'s neck can be about 2 metres long.'],
    ['🚀 Space', 'How many planets are in our solar system?', ['8', '9', '7'], '8', 'Mercury to Neptune — Pluto is classed a dwarf planet.'],
    ['🏛️ History', 'Who was the first man on the Moon?', ['Neil Armstrong', 'Buzz Aldrin', 'Yuri Gagarin'], 'Neil Armstrong', 'He stepped onto the Moon on 20 July 1969.'],
    ['⚽ Sports', 'In which sport would you use a shuttlecock?', ['Badminton', 'Tennis', 'Squash'], 'Badminton', 'The shuttlecock is the light feathered "ball" of badminton.'],
    ['🌍 World', 'Mount Everest sits on the border of Nepal and…?', ['China', 'India', 'Pakistan'], 'China', 'Everest, the world\'s highest peak, straddles Nepal and China.']
  ];
  var T3 = [
    ['🌍 World', 'What is the capital of Australia?', ['Canberra', 'Sydney', 'Melbourne'], 'Canberra', 'Sydney is the biggest city, but Canberra is the capital.'],
    ['🔬 Science', 'What is the chemical symbol for gold?', ['Au', 'Ag', 'Gd'], 'Au', 'Au comes from "aurum", the Latin word for gold.'],
    ['🏛️ History', 'The pyramids of Giza were built in which country?', ['Egypt', 'Mexico', 'Greece'], 'Egypt', 'They were built about 4,500 years ago as royal tombs.'],
    ['🦁 Animals', 'Which is the largest land animal?', ['African elephant', 'Hippo', 'Giraffe'], 'African elephant', 'A big male can weigh as much as six small cars.'],
    ['🚀 Space', 'Which planet has giant rings around it?', ['Saturn', 'Mars', 'Mercury'], 'Saturn', 'Saturn\'s rings are made of ice and rock chunks.'],
    ['🍎 Food', 'Which country drinks the most tea per person (famous for tea culture)?', ['Turkey', 'England', 'India'], 'Turkey', 'Turkey tops the world tea-drinking charts per person.'],
    ['⚽ Sports', 'The Olympic Games began in which ancient country?', ['Greece', 'Italy', 'Egypt'], 'Greece', 'The first ancient Olympics were held in Olympia, Greece.'],
    ['🌍 World', 'Which is the longest river in the world?', ['The Nile', 'The Amazon', 'The Yangtze'], 'The Nile', 'The Nile runs about 6,650 km through Africa.'],
    ['🔬 Science', 'How many bones are in the adult human body?', ['206', '186', '226'], '206', 'Babies start with about 300; many fuse as we grow.'],
    ['🏛️ History', 'Who wrote the play Romeo and Juliet?', ['William Shakespeare', 'Charles Dickens', 'Jane Austen'], 'William Shakespeare', 'Shakespeare wrote it in the 1590s.'],
    ['🦁 Animals', 'A group of wolves is called a…?', ['Pack', 'Herd', 'Flock'], 'Pack', 'Wolf packs are family groups led by the parents.'],
    ['🚀 Space', 'What galaxy do we live in?', ['The Milky Way', 'Andromeda', 'Triangulum'], 'The Milky Way', 'Our Sun is one of its 100+ billion stars.'],
    ['🌍 World', 'Which country is home to the Taj Mahal?', ['India', 'Pakistan', 'Iran'], 'India', 'The Taj Mahal stands in Agra, built in the 1600s.'],
    ['🔬 Science', 'Which organ pumps blood around the body?', ['Heart', 'Liver', 'Lung'], 'Heart', 'Your heart beats about 100,000 times a day.']
  ];
  var T4 = [
    ['🔬 Science', 'Which gas do plants absorb from the air?', ['Carbon dioxide', 'Nitrogen', 'Oxygen'], 'Carbon dioxide', 'Plants take in CO₂ and release oxygen.'],
    ['🌍 World', 'What is the smallest country in the world?', ['Vatican City', 'Monaco', 'Malta'], 'Vatican City', 'It is about 0.44 km² — smaller than many parks.'],
    ['🚀 Space', 'Which planet has the shortest day (fastest spin)?', ['Jupiter', 'Neptune', 'Mercury'], 'Jupiter', 'A day on Jupiter lasts under 10 hours.'],
    ['🏛️ History', 'In which year did World War II end?', ['1945', '1939', '1950'], '1945', 'WWII ended in 1945 after beginning in 1939.'],
    ['🦁 Animals', 'Which mammal can fly?', ['Bat', 'Flying squirrel', 'Sugar glider'], 'Bat', 'Bats are the only mammals with true flight.'],
    ['⚽ Sports', 'How often are the Summer Olympic Games held?', ['Every 4 years', 'Every 2 years', 'Every 5 years'], 'Every 4 years', 'The cycle dates back to the ancient Greek games.'],
    ['🍎 Food', 'Which spice is the most expensive by weight?', ['Saffron', 'Vanilla', 'Cardamom'], 'Saffron', 'Saffron threads are picked by hand from crocus flowers.'],
    ['🌍 World', 'The Danube river flows through which capital city?', ['Vienna', 'Prague', 'Warsaw'], 'Vienna', 'Vienna, Bratislava, Budapest and Belgrade all sit on the Danube.'],
    ['🔬 Science', 'What is the powerhouse of the cell?', ['Mitochondria', 'Nucleus', 'Ribosome'], 'Mitochondria', 'Mitochondria turn food energy into fuel for the cell.'],
    ['🏛️ History', 'The ancient Olympic Games honoured which god?', ['Zeus', 'Apollo', 'Ares'], 'Zeus', 'A giant statue of Zeus stood at Olympia.'],
    ['🚀 Space', 'How long does light from the Sun take to reach Earth?', ['About 8 minutes', 'About 8 seconds', 'About 1 hour'], 'About 8 minutes', 'Light travels 300,000 km per second — the trip takes ~8 min 20 sec.'],
    ['🦁 Animals', 'What is a baby frog called?', ['Tadpole', 'Pup', 'Cub'], 'Tadpole', 'Tadpoles hatch in water and grow legs as they change.'],
    ['🌍 World', 'Which desert is the largest hot desert on Earth?', ['The Sahara', 'The Gobi', 'The Kalahari'], 'The Sahara', 'It covers much of North Africa — almost the size of the USA.'],
    ['🔬 Science', 'Which element has the symbol "Fe"?', ['Iron', 'Fluorine', 'Lead'], 'Iron', 'Fe comes from "ferrum", Latin for iron.']
  ];
  var T5 = [
    ['🔬 Science', 'What is the speed of light in a vacuum (approx.)?', ['300,000 km/s', '150,000 km/s', '30,000 km/s'], '300,000 km/s', 'At that speed you could circle Earth 7.5 times in one second.'],
    ['🌍 World', 'Which country has the most natural lakes?', ['Canada', 'Russia', 'USA'], 'Canada', 'Canada holds an estimated 62% of the world\'s lakes.'],
    ['🏛️ History', 'The Berlin Wall fell in which year?', ['1989', '1991', '1979'], '1989', 'It fell on 9 November 1989, reuniting East and West Berlin.'],
    ['🚀 Space', 'Which was the first artificial satellite in space?', ['Sputnik 1', 'Explorer 1', 'Telstar'], 'Sputnik 1', 'The USSR launched Sputnik 1 in October 1957.'],
    ['🦁 Animals', 'Which animal has three hearts?', ['Octopus', 'Squid', 'Jellyfish'], 'Octopus', 'Two hearts pump to the gills; one pumps to the body.'],
    ['⚽ Sports', 'Which country has won the most football World Cups?', ['Brazil', 'Germany', 'Argentina'], 'Brazil', 'Brazil has won the World Cup five times.'],
    ['🍎 Food', 'Which country is the world\'s largest producer of coffee?', ['Brazil', 'Vietnam', 'Colombia'], 'Brazil', 'Brazil grows about a third of the world\'s coffee.'],
    ['🌍 World', 'What is the currency of Switzerland?', ['Swiss franc', 'Euro', 'Krone'], 'Swiss franc', 'Switzerland kept its franc instead of joining the euro.'],
    ['🔬 Science', 'How many elements are on the periodic table (standard count)?', ['118', '108', '120'], '118', 'The table was completed to 118 with oganesson.'],
    ['🏛️ History', 'Who was the British prime minister for most of WWII?', ['Winston Churchill', 'Neville Chamberlain', 'Clement Attlee'], 'Winston Churchill', 'Churchill led Britain from 1940 to 1945.'],
    ['🚀 Space', 'Which planet is hottest (thick CO₂ atmosphere)?', ['Venus', 'Mercury', 'Mars'], 'Venus', 'Venus traps heat — about 465°C at the surface.'],
    ['🦁 Animals', 'A group of crows is called a…?', ['Murder', 'Parliament', 'Gaggle'], 'Murder', 'A "murder of crows" is the old collective name.'],
    ['🌍 World', 'Which African country was formerly known as Abyssinia?', ['Ethiopia', 'Sudan', 'Eritrea'], 'Ethiopia', 'Ethiopia was called Abyssinia for centuries.'],
    ['🔬 Science', 'Which blood cells carry oxygen?', ['Red blood cells', 'White blood cells', 'Platelets'], 'Red blood cells', 'Haemoglobin inside them grabs oxygen in the lungs.']
  ];
  var BANKS = [T1, T2, T3, T4, T5];
  var TIERS = [
    { to: 15, name: 'Curious start' }, { to: 35, name: 'Knowledge explorer' },
    { to: 55, name: 'Fact hunter' }, { to: 75, name: 'Brain champion' },
    { to: 100, name: 'GK Mastermind' }
  ];
  function tierIdx(l) { return l <= 15 ? 0 : l <= 35 ? 1 : l <= 55 ? 2 : l <= 75 ? 3 : 4; }
  function tierName(l) { for (var i = 0; i < TIERS.length; i++) if (l <= TIERS[i].to) return TIERS[i].name; return TIERS[4].name; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function seeded(seed) { var t = seed * 2654435761 % 4294967296; return function () { t = (t * 1664525 + 1013904223) % 4294967296; return t / 4294967296; }; }

  var cur = 1, unlocked = 1, starMap = {};
  try {
    cur = parseInt(localStorage.getItem('wa_gk_current') || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem('wa_gk_unlocked') || '1', 10) || 1;
    starMap = JSON.parse(localStorage.getItem('wa_gk_stars') || '{}') || {};
  } catch (e) {}
  if (cur < 1) cur = 1; if (cur > MAX_LEVEL) cur = MAX_LEVEL;
  if (unlocked < cur) unlocked = cur; if (unlocked > MAX_LEVEL) unlocked = MAX_LEVEL;

  var round = 0, score = 0, wrongOnce = false, locked = false, levelQs = [];
  function save() {
    try {
      localStorage.setItem('wa_gk_current', String(cur));
      localStorage.setItem('wa_gk_unlocked', String(unlocked));
      localStorage.setItem('wa_gk_stars', JSON.stringify(starMap));
    } catch (e) {}
  }
  function buildLevel() {
    var ti = tierIdx(cur), bank = BANKS[ti].slice();
    /* mix a little of the previous tier in for variety from tier 2 up */
    if (ti > 0) bank = bank.concat(BANKS[ti - 1].slice(0, 4));
    var rng = seeded(cur * 131 + 7);
    for (var i = bank.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = bank[i]; bank[i] = bank[j]; bank[j] = t; }
    return bank.slice(0, PER_LEVEL);
  }
  function buildMap() {
    var map = $('gk-map'); map.innerHTML = '';
    for (var l = 1; l <= MAX_LEVEL; l++) {
      (function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        if (starMap[l] != null && l !== cur) { b.className = 'gk-lvl gk-done'; b.textContent = l + (starMap[l] >= 4 ? ' ⭐' : ''); }
        else if (l === cur) { b.className = 'gk-lvl gk-cur'; b.textContent = l; }
        else if (l <= unlocked) { b.className = 'gk-lvl'; b.textContent = l; }
        else { b.className = 'gk-lvl gk-lock'; b.textContent = '🔒'; }
        b.disabled = l > unlocked;
        b.setAttribute('aria-label', 'Level ' + l);
        b.addEventListener('click', function () { if (l <= unlocked) { cur = l; save(); startLevel(); } });
        map.appendChild(b);
      })(l);
    }
    $('gk-level-now').textContent = cur;
    var doneCount = 0; for (var k in starMap) doneCount++;
    $('gk-progress-note').textContent = tierName(cur) + ' · ' + doneCount + ' of 100 levels completed';
  }
  function stars() {
    var s = '', i;
    for (i = 0; i < PER_LEVEL; i++) s += (i < score ? '⭐' : '☆') + ' ';
    $('gk-stars').textContent = s.trim();
  }
  function startLevel() {
    round = 0; score = 0;
    levelQs = buildLevel();
    $('gk-done').classList.add('hidden');
    buildMap();
    next();
  }
  function next() {
    locked = false; wrongOnce = false;
    var q = levelQs[round];
    $('gk-cat').textContent = q[0];
    $('gk-q').textContent = q[1];
    $('gk-round').textContent = (round + 1) + ' / ' + PER_LEVEL;
    $('gk-score').textContent = score;
    var bt = 0; for (var bk in starMap) bt += starMap[bk];
    $('gk-best').textContent = bt + ' ⭐';
    stars();
    $('gk-why').textContent = '';
    $('gk-msg').textContent = 'Tap your answer!';
    $('gk-msg').style.color = '';
    var box = $('gk-choices'); box.innerHTML = '';
    var opts = shuffle(q[2].slice());
    var nChoices = cur < 21 ? 3 : opts.length;
    opts.slice(0, nChoices).forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gk-choice';
      b.textContent = o;
      b.addEventListener('click', function () { answer(b, o, q); });
      box.appendChild(b);
    });
  }
  function answer(btn, val, q) {
    if (locked) return;
    if (val === q[3]) {
      locked = true;
      btn.classList.add('gk-right');
      if (!wrongOnce) { score++; stars(); }
      $('gk-score').textContent = score;
      $('gk-msg').textContent = ['Correct! 🎉', 'Spot on! 🌟', 'You knew it! 💪'][Math.floor(Math.random() * 3)];
      $('gk-msg').style.color = '#15803d';
      $('gk-why').textContent = '💡 ' + q[4];
      round++;
      setTimeout(function () { if (round >= PER_LEVEL) finish(); else next(); }, 2100);
    } else {
      btn.classList.add('gk-wrong');
      btn.disabled = true;
      wrongOnce = true;
      $('gk-msg').textContent = 'Not that one — try again!';
      $('gk-msg').style.color = '#b91c1c';
    }
  }
  function finish() {
    if (starMap[cur] == null || score > starMap[cur]) starMap[cur] = score;
    if (cur === unlocked && unlocked < MAX_LEVEL) unlocked++;
    save();
    buildMap();
    $('gk-done-title').textContent = score >= 5 ? '🏆 GK Mastermind!' : score >= 3 ? '🎉 Level ' + cur + ' Complete!' : '🌱 Level ' + cur + ' Done!';
    $('gk-done-stats').textContent = 'You answered ' + score + ' of ' + PER_LEVEL + ' first try on Level ' + cur + '.' +
      (cur < MAX_LEVEL ? ' Level ' + (cur + 1) + ' is now unlocked — the facts get tougher!' : ' You conquered all 100 levels of GK Quest!');
    $('gk-done').classList.remove('hidden');
  }
  $('gk-again').addEventListener('click', function () {
    if (cur < MAX_LEVEL) { cur++; save(); }
    startLevel();
  });
  $('gk-restart').addEventListener('click', startLevel);
  startLevel();
})();
