/* Forest Village — Wisely Arcade
   A real-3D survival-planning game. The lesson IS the mechanic:
   plan backwards from tonight's costs (food, firewood, shelter),
   assign your villagers, and learn real survival skills to solve real problems.
   Tough from Day 1 by design. */
(function () {
  'use strict';

  /* ================= DATA: real survival skills ================= */
  var SKILLS = [
    {
      id: 'fire-friction', icon: '🔥', title: 'Make Fire by Rubbing Sticks',
      problem: 'The matches are wet and the night is cold. The village needs a fire — with no matches and no lighter.',
      q: 'What makes the wood start to smoke when you rub sticks together?',
      options: ['The wood is magic', 'Friction — rubbing turns movement into heat', 'Blowing on it first'],
      correct: 1,
      steps: ['Collect dry grass and tiny twigs — this is your tinder nest', 'Rub a dry stick fast against a flat dry wood board', 'When smoke rises, drop the hot dust into the tinder nest', 'Blow gently and feed tiny twigs, then bigger sticks'],
      fact: 'This is called friction fire. People have lit fires this way for thousands of years. Dry materials and fast, steady rubbing are the secret.',
      effect: 'fireFree', effectText: 'Skill bonus: your fire lights first try tonight — no firewood is wasted.'
    },
    {
      id: 'fire-flint', icon: '🪨', title: 'Sparks from Stone and Steel',
      problem: 'A traveller left a flint stone and a steel striker. The village wants a fire before dark.',
      q: 'How does flint and steel make a fire?',
      options: ['The stone is already hot inside', 'Striking shaves off tiny steel bits that burn as sparks', 'You rub the stone until it melts'],
      correct: 1,
      steps: ['Hold a piece of dry char cloth or dry grass near the flint edge', 'Strike the steel down the sharp edge of the flint', 'Catch a spark on the dry material until it glows', 'Blow the glow into a tinder nest until it flames'],
      fact: 'The sparks are tiny pieces of steel that catch fire in the air — they reach over 1,000°C. Flint works because it is harder than steel and shaves it.',
      effect: 'fireFree', effectText: 'Skill bonus: sparks catch fast — tonight the fire costs no extra wood.'
    },
    {
      id: 'fire-battery', icon: '🔋', title: 'Fire from a Battery and Wires',
      problem: 'A broken torch was found in the forest — its battery still works. The fire is out and the wood is damp.',
      q: 'How can a battery start a fire?',
      options: ['Shake the battery until it gets hot', 'Touch steel wool or thin wire across both battery ends — it glows hot', 'Put the battery in the sun'],
      correct: 1,
      steps: ['Take a small ball of fine steel wool (or thin wire)', 'Stretch it so it touches BOTH ends of the battery at once', 'The wire glows hot — touch it to dry tinder at once', 'Blow gently and build the fire up with small sticks'],
      fact: 'Electricity racing through thin wire makes it glow — the same idea as an old light bulb. Safety rule: only small batteries, only with an adult, and never try this with big batteries or mains power.',
      effect: 'fireFree', effectText: 'Skill bonus: the battery trick lights the fire even with damp wood — no firewood wasted tonight.'
    },
    {
      id: 'fire-glass', icon: '🔍', title: 'Fire from Sunlight and Glass',
      problem: 'The sun is strong at midday and someone has a magnifying glass. The village needs fire for cooking.',
      q: 'How does a magnifying glass start a fire?',
      options: ['It focuses sunlight into one tiny, very hot point', 'It makes the sun bigger', 'The glass itself burns'],
      correct: 0,
      steps: ['Put dry tinder where strong sunlight falls', 'Hold the glass above it and find the smallest, brightest dot', 'Keep the dot still on one spot until smoke rises', 'Blow gently and feed the flame with tiny twigs'],
      fact: 'A lens bends light rays together. All the energy of a wide circle of sunlight lands on one tiny point — hot enough to smoke dry grass in seconds.',
      effect: 'fireFree', effectText: 'Skill bonus: free fire from the sun — tonight the fire costs no extra wood.'
    },
    {
      id: 'water-boil', icon: '💧', title: 'Make River Water Safe',
      problem: 'The village is drinking from the river, and two villagers have sore stomachs. The water looks clear — but looks can fool you.',
      q: 'What makes river water safe to drink?',
      options: ['Letting it sit for an hour', 'Boiling it — heat kills the germs', 'Adding cold water to it'],
      correct: 1,
      steps: ['Pour the water through a clean cloth to remove dirt', 'Bring it to a strong, rolling boil', 'Keep it boiling for one full minute', 'Let it cool in a clean, covered pot'],
      fact: 'Clear water can still carry germs you cannot see. Boiling for one minute kills nearly all of them. A cloth filter removes dirt, but only heat makes water truly safe.',
      effect: 'safeWater', effectText: 'Skill bonus: nobody gets sick tonight — and no food is wasted on sore stomachs (+2 food saved).'
    },
    {
      id: 'knot-lashing', icon: '🪢', title: 'Tie a Shelter That Stays Up',
      problem: 'The wind keeps blowing the shelter poles apart. Loose knots slip in the night.',
      q: 'What makes a lashing strong?',
      options: ['One very tight knot', 'Many tight wraps around both poles, then a knot to lock them', 'Longer rope'],
      correct: 1,
      steps: ['Cross the two poles where they must join', 'Wrap the rope around both poles 5–6 times, pulling tight each time', 'Wrap twice between the poles to squeeze the lashing', 'Finish with a firm knot and test it with a hard pull'],
      fact: 'Friction does the work: every tight wrap grips the poles harder. Builders and sailors have used lashings for thousands of years — no nails needed.',
      effect: 'shelterPlus', effectText: 'Skill bonus: your lashings hold — shelter counts for 2 extra villagers tonight.'
    },
    {
      id: 'compass-sun', icon: '🧭', title: 'Find North with a Stick and the Sun',
      problem: 'A gatherer must find the berry valley tomorrow, but nobody knows which way is north. There is no compass.',
      q: 'How can a stick and its shadow show you north?',
      options: ['The shadow always points north', 'Mark the shadow tip, wait, mark again — the line between marks runs west to east', 'The longest shadow is north'],
      correct: 1,
      steps: ['Push a stick upright into flat ground', 'Mark the tip of its shadow with a stone', 'Wait 15 minutes and mark the new shadow tip', 'The line from the first mark to the second runs west to east — north is at a right angle to it'],
      fact: 'The sun moves across the sky, so shadows crawl the other way. Two marks turn that movement into a compass — a method travellers have used for centuries.',
      effect: 'grove', effectText: 'Skill bonus: your gatherers find the hidden berry grove — each gatherer brings +1 extra food today.'
    },
    {
      id: 'signal-help', icon: '🆘', title: 'Signal for Help',
      problem: 'A lost villager is far from camp. Shouting is not working — sound dies in the trees.',
      q: 'What is the universal signal for "I need help"?',
      options: ['Waving both arms slowly', 'Groups of three: three whistle blasts, three flashes, three fires', 'One long shout'],
      correct: 1,
      steps: ['Use a mirror or shiny metal to flash sunlight', 'Flash in groups of three, then pause', 'At night, use three fires in a triangle', 'Repeat the pattern — rescuers look for patterns of three'],
      fact: 'Three of anything — blasts, flashes, fires — is the international distress signal. Patterns stand out because nature rarely makes perfect groups of three.',
      effect: 'gift', effectText: 'Skill bonus: a passing traveller sees the signal and shares supplies — +6 food.'
    },
    {
      id: 'shelter-leanto', icon: '⛺', title: 'Build a Lean-To Shelter',
      problem: 'Rain is coming and there is no time for a hut. The village needs fast shelter that sheds water.',
      q: 'What makes a lean-to keep rain out?',
      options: ['A flat roof of leaves', 'A slanted roof, high side facing the wind, covered thick with branches and leaves', 'Building it under the tallest tree'],
      correct: 1,
      steps: ['Lean long poles against a strong branch or rope line', 'Keep the high side facing the wind and rain', 'Cover the poles thickly with branches, then leaves, from bottom to top', 'Dig a tiny trench on the uphill side so water runs away'],
      fact: 'Water runs downhill — even on a roof. Overlapping leaves work like roof tiles: each layer pushes rain onto the layer below, away from you.',
      effect: 'shelterPlus', effectText: 'Skill bonus: fast lean-tos raise shelter for 2 extra villagers tonight.'
    },
    {
      id: 'food-safe', icon: '🍄', title: 'Know What Is Safe to Eat',
      problem: 'A gatherer found bright mushrooms and red berries. They look tasty — and the village is hungry.',
      q: 'What is the safe rule for wild food you do not know?',
      options: ['Bright colours mean it is ripe and safe', 'If birds eat it, people can too', 'Never eat wild food you cannot name — some look-alikes are poison'],
      correct: 2,
      steps: ['Only gather food you can name with certainty', 'When in doubt, leave it — no meal is worth the risk', 'Cook known food fully before eating', 'Teach the whole village which finds are safe'],
      fact: 'Some of the most poisonous mushrooms look almost exactly like safe ones, and birds can eat berries that make people very sick. Naming it first is the rule that keeps gatherers alive.',
      effect: 'safeFood', effectText: 'Skill bonus: nobody eats anything bad — the village keeps its strength (+2 food saved).'
    }
  ];

  /* ================= LEVEL GENERATION (tough from Day 1) =================
     Goals are END-OF-DAY stock targets: what must still be in store
     AFTER tonight's meal and fire. Day 1 already has one best answer. */
  var TIERS = ['First Camp', 'Growing Village', 'Harsh Seasons', 'Storm Watch', 'Elder Trials', 'Elder Trials'];
  function tierFor(n) { return TIERS[Math.min(5, Math.floor((n - 1) / 20))]; }

  var EVENTS = {
    clear: { icon: '☀️', name: 'Clear day', note: 'A fair day. Plan well and the village eats well.' },
    rain: { icon: '🌧️', name: 'Rain', note: 'Rain slows gathering: each gatherer brings 1 less food.' },
    cold: { icon: '🥶', name: 'Cold snap', note: 'A bitter night: the fire will burn 5 wood, and everyone needs shelter.' },
    storm: { icon: '⛈️', name: 'Storm', note: 'A storm night: the fire burns 3 wood, and everyone needs shelter or the village suffers.' },
    berries: { icon: '🫐', name: 'Berry boom', note: 'The bushes are heavy: each gatherer brings 1 extra food.' },
    wind: { icon: '💨', name: 'High wind', note: 'Wind makes chopping hard: each woodcutter brings 1 less wood.' }
  };
  function eventFor(n) {
    if (n === 1) return 'clear';
    var cyc = ['clear', 'rain', 'clear', 'wind', 'berries', 'cold', 'clear', 'storm', 'rain', 'clear', 'wind', 'cold', 'berries', 'storm'];
    return cyc[(n * 5 + 3) % cyc.length];
  }
  function skillFor(n) {
    if (n === 2) return SKILLS[0];                 // Day 2: friction fire — the first lesson
    if (n % 5 === 3) return SKILLS[(Math.floor(n / 5) + 1) % SKILLS.length];
    return null;
  }

  function genLevel(n) {
    var V = Math.min(14, 5 + Math.floor((n - 1) / 6));       // villagers
    var buildDay = (n % 5 === 0);
    var ev = buildDay ? (n % 10 === 0 ? 'berries' : 'clear') : eventFor(n); // build days are project days
    var fireWood = ev === 'cold' ? 5 : (ev === 'storm' ? 3 : 2);
    var L = {
      day: n, villagers: V, event: ev, fireWood: fireWood,
      startFood: 4 + (n % 3),
      startWood: 2 + ((n * 2) % 3),
      shelterStart: Math.min(V, 3 + Math.floor(n / 8)),
      skill: skillFor(n),
      eatTotal: V * 2, buildDay: buildDay, build: null,
      goalFoodEnd: Math.min(25, 11 + Math.floor((n - 1) / 6)),
      goalWoodEnd: Math.min(13, 5 + Math.floor((n - 1) / 9))
    };
    // Weather-fair targets: the elder lowers the stock target when the
    // weather itself eats the difference — the day stays tough, never impossible.
    if (ev === 'rain') L.goalFoodEnd = Math.max(2, L.goalFoodEnd - 5);
    if (ev === 'wind') L.goalWoodEnd = Math.max(2, L.goalWoodEnd - 3);
    if (ev === 'cold') L.goalWoodEnd = Math.max(2, L.goalWoodEnd - 2);
    if (ev === 'cold' || ev === 'storm') L.startWood += 2; // stored extra wood for hard nights
    if (buildDay) {
      var hut = n >= 30;
      L.build = hut
        ? { name: 'Hut', cost: 16, builders: 2, capAdd: 4, icon: '🏠' }
        : { name: 'Tent', cost: 8, builders: 1, capAdd: 2, icon: '⛺' };
      L.goalFoodEnd = 2;   // on build days: end fed, fire lit, building up
      L.goalWoodEnd = 0;
    }
    return L;
  }

  /* ================= SIMULATION ================= */
  function simulate(L, assign, skillOk) {
    var gYield = 5 + (L.event === 'berries' ? 1 : 0) - (L.event === 'rain' ? 1 : 0);
    var wYield = 5 - (L.event === 'wind' ? 1 : 0);
    if (skillOk && L.skill && L.skill.effect === 'grove') gYield += 1;
    var foodMade = assign.g * gYield;
    var woodMade = assign.w * wYield;
    var totalFood = L.startFood + foodMade;
    var totalWood = L.startWood + woodMade;
    var built = false, shelter = L.shelterStart;
    if (L.buildDay && assign.b >= L.build.builders && totalWood >= L.build.cost) {
      built = true; totalWood -= L.build.cost; shelter += L.build.capAdd;
    }
    if (skillOk && L.skill && L.skill.effect === 'shelterPlus') shelter += 2;
    if (skillOk && L.skill && (L.skill.effect === 'safeWater' || L.skill.effect === 'safeFood')) totalFood += 2;
    if (skillOk && L.skill && L.skill.effect === 'gift') totalFood += 6;
    var fireCost = (skillOk && L.skill && L.skill.effect === 'fireFree') ? 0 : L.fireWood;
    var endFood = totalFood - L.eatTotal;
    var fireLit = totalWood >= fireCost;
    var endWood = fireLit ? totalWood - fireCost : totalWood;
    var hungry = endFood < 0;
    var coldNight = (L.event === 'cold' || L.event === 'storm');
    var exposed = coldNight && shelter < L.villagers;
    var frozen = coldNight && !fireLit;
    var heartsLost = (hungry ? 1 : 0) + (exposed ? 1 : 0) + (frozen ? 1 : 0);
    var goalMet = L.buildDay
      ? (built && endFood >= L.goalFoodEnd && fireLit)
      : (endFood >= L.goalFoodEnd && endWood >= L.goalWoodEnd && fireLit);
    var pass = goalMet && heartsLost <= 1;
    var surplus = Math.max(0, endFood - L.goalFoodEnd) + Math.max(0, endWood - L.goalWoodEnd);
    var stars = !pass ? 0 : (surplus >= 8 ? 3 : (surplus >= 3 ? 2 : 1));
    return {
      gYield: gYield, wYield: wYield, foodMade: foodMade, woodMade: woodMade,
      built: built, shelter: shelter, fireCost: fireCost, fireLit: fireLit,
      endFood: endFood, endWood: endWood, hungry: hungry, exposed: exposed,
      frozen: frozen, heartsLost: heartsLost, goalMet: goalMet, pass: pass,
      stars: stars, surplus: surplus
    };
  }

  // Exposed for testing
  window.FV = { SKILLS: SKILLS, EVENTS: EVENTS, genLevel: genLevel, simulate: simulate, tierFor: tierFor };

  /* ================= STATE ================= */
  var LS = { cur: 'wa_fv_current', unl: 'wa_fv_unlocked', stars: 'wa_fv_stars' };
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var state = {
    current: lsGet(LS.cur, 1), unlocked: lsGet(LS.unl, 1), stars: lsGet(LS.stars, {}),
    level: null, assign: { g: 0, w: 0, b: 0 }, skillOk: false, skillDone: false, phase: 'map'
  };

  function $(id) { return document.getElementById(id); }
  function hearts(n) { var s = ''; for (var i = 0; i < 3; i++) s += i < (3 - n) ? '❤️' : '🖤'; return s; }

  function elderTip(L) {
    var need = 'Tonight the village eats ' + L.eatTotal + ' food and the fire burns ' + L.fireWood + ' wood. ';
    if (L.buildDay) return need + 'Build the ' + L.build.name + ' (' + L.build.cost + ' wood, ' + L.build.builders + ' builder' + (L.build.builders > 1 ? 's' : '') + ') and still end the day fed, with the fire lit. Plan backwards from tonight — that is the whole game.';
    return need + 'Your target: end the night with at least ' + L.goalFoodEnd + ' food and ' + L.goalWoodEnd + ' wood still in store. Plan backwards from tonight — that is the whole game.';
  }

  /* ================= LEVEL MAP ================= */
  function renderMap() {
    state.phase = 'map';
    var panel = $('fv-panel');
    var html = '<div class="fv-map-head"><h2>Choose a day</h2><p class="fv-note">Every day is a hard day in the forest. Finish a day to unlock the next. Tough from Day 1 — plan backwards from tonight.</p></div><div class="fv-map">';
    for (var n = 1; n <= 100; n++) {
      var locked = n > state.unlocked;
      var st = state.stars[n] || 0;
      html += '<button class="fv-lvl' + (n === state.current ? ' cur' : '') + '" data-day="' + n + '"' + (locked ? ' disabled' : '') + '>' +
        '<span class="fv-lvl-n">' + n + '</span>' +
        '<span class="fv-lvl-s">' + (locked ? '🔒' : (st ? '★'.repeat(st) + '☆'.repeat(3 - st) : '☆☆☆')) + '</span></button>';
    }
    html += '</div>';
    panel.innerHTML = html;
    var btns = panel.querySelectorAll('.fv-lvl');
    for (var i = 0; i < btns.length; i++) btns[i].addEventListener('click', function () { startDay(parseInt(this.getAttribute('data-day'), 10)); });
    updateHUD(null);
    if (window.FV3D) FV3D.showVillage(null);
  }

  /* ================= DAY / PLAN ================= */
  function startDay(n) {
    state.current = n; lsSet(LS.cur, n);
    state.level = genLevel(n);
    state.assign = { g: 0, w: 0, b: 0 };
    state.skillOk = false; state.skillDone = !state.level.skill;
    state.phase = 'plan';
    renderPlan();
    if (window.FV3D) FV3D.showVillage(state.level);
  }

  function assigned() { return state.assign.g + state.assign.w + state.assign.b; }

  function renderPlan() {
    var L = state.level, ev = EVENTS[L.event];
    var panel = $('fv-panel');
    var goalHtml;
    if (L.buildDay) {
      goalHtml = '<div class="fv-goal"><span class="fv-goal-ic">' + L.build.icon + '</span><div><strong>Build day: raise the ' + L.build.name + '</strong><br>Costs ' + L.build.cost + ' wood and ' + L.build.builders + ' builder' + (L.build.builders > 1 ? 's' : '') + ' working all day. End the night fed (food 0 or more) with the fire lit.</div></div>';
    } else {
      goalHtml = '<div class="fv-goal"><span class="fv-goal-ic">🎯</span><div><strong>Stock target</strong><br>End the night with at least <strong>' + L.goalFoodEnd + ' food</strong> and <strong>' + L.goalWoodEnd + ' wood</strong> still in store — after the meal and the fire.</div></div>';
    }
    var skillHtml = '';
    if (L.skill) {
      skillHtml = '<div class="fv-skill-card"><div class="fv-skill-ic">' + L.skill.icon + '</div><div class="fv-skill-tx"><strong>A problem needs real know-how: ' + L.skill.title + '</strong><br>' + L.skill.problem + '</div>' +
        (state.skillDone
          ? '<div class="fv-skill-done">' + (state.skillOk ? '✅ Learned well! ' + L.skill.effectText : '📖 Learned. (Solve it with no mistakes for the bonus.)') + '</div>'
          : '<button id="fv-skill-btn" class="fv-btn fv-btn-alt">Learn the skill</button>') + '</div>';
    }
    var jobs = [
      { k: 'g', icon: '🧺', name: 'Gather food', desc: 'Each brings ' + (5 + (L.event === 'berries' ? 1 : 0) - (L.event === 'rain' ? 1 : 0)) + ' food' },
      { k: 'w', icon: '🪓', name: 'Chop wood', desc: 'Each brings ' + (5 - (L.event === 'wind' ? 1 : 0)) + ' wood' },
      { k: 'b', icon: '🔨', name: 'Build', desc: L.buildDay ? 'Works on the ' + L.build.name : 'No building today — builders rest hands' }
    ];
    var jobsHtml = jobs.map(function (j) {
      return '<div class="fv-job"><div class="fv-job-ic">' + j.icon + '</div><div class="fv-job-tx"><strong>' + j.name + '</strong><br><span>' + j.desc + '</span></div>' +
        '<div class="fv-step"><button class="fv-minus" data-k="' + j.k + '">−</button><span id="fv-as-' + j.k + '">0</span><button class="fv-plus" data-k="' + j.k + '">+</button></div></div>';
    }).join('');
    panel.innerHTML =
      '<div class="fv-day-head"><h2>Day ' + L.day + ' — ' + tierFor(L.day) + '</h2><span class="fv-ev">' + ev.icon + ' ' + ev.name + '</span></div>' +
      '<p class="fv-note">' + ev.note + '</p>' +
      '<div class="fv-stores">🏠 Shelter for ' + L.shelterStart + ' of ' + L.villagers + ' &nbsp;·&nbsp; 🍽️ Tonight\'s meal: ' + L.eatTotal + ' food &nbsp;·&nbsp; 🔥 Fire: ' + L.fireWood + ' wood</div>' +
      goalHtml + skillHtml +
      '<h3 class="fv-h3">Assign your ' + L.villagers + ' villagers — <span id="fv-left">' + L.villagers + '</span> still idle</h3>' +
      jobsHtml +
      '<p class="fv-tip">🧙 <strong>Elder\'s tip:</strong> ' + elderTip(L) + '</p>' +
      '<button id="fv-start" class="fv-btn">▶ Start the day</button>' +
      '<button id="fv-tomap" class="fv-btn fv-btn-ghost">🗺️ Day map</button>';
    updateHUD(L);
    var plus = panel.querySelectorAll('.fv-plus'), minus = panel.querySelectorAll('.fv-minus');
    for (var i = 0; i < plus.length; i++) plus[i].addEventListener('click', function () { stepJob(this.getAttribute('data-k'), 1); });
    for (var j = 0; j < minus.length; j++) minus[j].addEventListener('click', function () { stepJob(this.getAttribute('data-k'), -1); });
    $('fv-start').addEventListener('click', startWork);
    $('fv-tomap').addEventListener('click', renderMap);
    var sb = $('fv-skill-btn');
    if (sb) sb.addEventListener('click', renderSkill);
  }

  function stepJob(k, d) {
    var L = state.level;
    if (d > 0 && assigned() >= L.villagers) return;
    state.assign[k] = Math.max(0, state.assign[k] + d);
    $('fv-as-' + k).textContent = state.assign[k];
    $('fv-left').textContent = L.villagers - assigned();
    if (window.FV3D) FV3D.setJobs(state.assign, L);
  }

  /* ================= SKILL LESSON ================= */
  var skillState = { mistakes: 0, stepIdx: 0, order: [] };
  function renderSkill() {
    var S = state.level.skill; state.phase = 'skill'; skillState = { mistakes: 0, stepIdx: 0, order: [] };
    var panel = $('fv-panel');
    var opts = S.options.map(function (o, i) { return '<button class="fv-opt" data-i="' + i + '">' + o + '</button>'; }).join('');
    panel.innerHTML = '<div class="fv-day-head"><h2>' + S.icon + ' ' + S.title + '</h2></div>' +
      '<p class="fv-note">' + S.problem + '</p>' +
      '<h3 class="fv-h3">' + S.q + '</h3><div class="fv-opts">' + opts + '</div><div id="fv-skill-msg"></div>';
    var btns = panel.querySelectorAll('.fv-opt');
    for (var i = 0; i < btns.length; i++) btns[i].addEventListener('click', function () {
      var pick = parseInt(this.getAttribute('data-i'), 10);
      if (pick === S.correct) { this.classList.add('good'); renderSteps(); }
      else { skillState.mistakes++; this.classList.add('bad'); this.disabled = true; $('fv-skill-msg').innerHTML = '<p class="fv-wrong">Not that one — think again. The real answer is taught below if you need it.</p>'; }
    });
  }
  function renderSteps() {
    var S = state.level.skill;
    var panel = $('fv-panel');
    var shuffled = S.steps.map(function (s, i) { return { s: s, i: i }; });
    for (var i = shuffled.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t; }
    skillState.order = shuffled;
    panel.innerHTML = '<div class="fv-day-head"><h2>' + S.icon + ' ' + S.title + '</h2></div>' +
      '<p class="fv-note">Correct! Now put the real steps <strong>in order</strong> — tap them 1, 2, 3, 4.</p>' +
      '<div id="fv-steps-done" class="fv-steps-done"></div><div class="fv-opts">' +
      shuffled.map(function (o, k) { return '<button class="fv-opt fv-step" data-k="' + k + '">' + o.s + '</button>'; }).join('') +
      '</div><div id="fv-skill-msg"></div>';
    var btns = panel.querySelectorAll('.fv-step');
    for (var i = 0; i < btns.length; i++) btns[i].addEventListener('click', function () {
      var k = parseInt(this.getAttribute('data-k'), 10);
      var item = skillState.order[k];
      if (item.i === skillState.stepIdx) {
        skillState.stepIdx++;
        this.classList.add('good'); this.disabled = true;
        $('fv-steps-done').innerHTML += '<div class="fv-step-done">' + skillState.stepIdx + '. ' + item.s + '</div>';
        if (skillState.stepIdx === S.steps.length) finishSkill();
      } else {
        skillState.mistakes++; this.classList.add('bad');
        $('fv-skill-msg').innerHTML = '<p class="fv-wrong">That step comes later. Think: what must happen first?</p>';
        var el = this; setTimeout(function () { el.classList.remove('bad'); }, 500);
      }
    });
  }
  function finishSkill() {
    var S = state.level.skill;
    state.skillDone = true;
    state.skillOk = skillState.mistakes === 0;
    var panel = $('fv-panel');
    panel.innerHTML = '<div class="fv-day-head"><h2>' + S.icon + ' Skill learned!</h2></div>' +
      '<div class="fv-fact">📖 ' + S.fact + '</div>' +
      (state.skillOk ? '<p class="fv-note">✅ No mistakes — the bonus is yours: ' + S.effectText + '</p>' : '<p class="fv-note">You learned it, but with ' + skillState.mistakes + ' mistake' + (skillState.mistakes > 1 ? 's' : '') + ' — no bonus this time. The knowledge still counts.</p>') +
      '<button id="fv-back-plan" class="fv-btn">Back to planning</button>';
    $('fv-back-plan').addEventListener('click', renderPlan);
  }

  /* ================= WORK PHASE ================= */
  function startWork() {
    var L = state.level;
    if (L.skill && !state.skillDone) { renderSkill(); return; }
    var R = simulate(L, state.assign, state.skillOk);
    state.phase = 'work';
    var panel = $('fv-panel');
    panel.innerHTML = '<div class="fv-day-head"><h2>Day ' + L.day + ' — the village works…</h2></div>' +
      '<div class="fv-progress"><div id="fv-bar"></div></div><div id="fv-log" class="fv-log"></div>';
    if (window.FV3D) { FV3D.setJobs(state.assign, L); FV3D.setWorking(true); }
    var lines = [];
    if (state.assign.g) lines.push('🧺 Gatherers bring in ' + R.foodMade + ' food.');
    if (state.assign.w) lines.push('🪓 Woodcutters stack ' + R.woodMade + ' wood.');
    if (L.buildDay && state.assign.b) lines.push(R.built ? '🔨 The ' + L.build.name + ' goes up!' : '🔨 The builders cannot finish — not enough wood or hands.');
    if (L.skill && state.skillOk) lines.push(L.skill.icon + ' ' + L.skill.effectText);
    if (!lines.length) lines.push('😴 Nobody worked. The forest does not feed the idle…');
    var dur = 8000, start = Date.now(), li = 0;
    var iv = setInterval(function () {
      var p = Math.min(1, (Date.now() - start) / dur);
      var bar = $('fv-bar'); if (bar) bar.style.width = (p * 100) + '%';
      var should = Math.floor(p * lines.length);
      while (li < should && li < lines.length) {
        var log = $('fv-log');
        if (log) { var d = document.createElement('div'); d.className = 'fv-log-line'; d.textContent = lines[li]; log.appendChild(d); }
        li++;
      }
      if (p >= 1) { clearInterval(iv); setTimeout(function () { renderNight(R); }, 600); }
    }, 200);
  }

  /* ================= NIGHT SUMMARY ================= */
  function renderNight(R) {
    var L = state.level; state.phase = 'night';
    if (window.FV3D) FV3D.setNight(R);
    var rows = [
      ['🍎 Food', 'Started ' + L.startFood + ' + gathered ' + R.foodMade + ' − meal ' + L.eatTotal + ' = <strong>' + R.endFood + '</strong>'],
      ['🪵 Wood', 'Started ' + L.startWood + ' + chopped ' + R.woodMade + (R.built ? ' − built ' + L.build.cost : '') + ' − fire ' + (R.fireLit ? R.fireCost : 0) + ' = <strong>' + R.endWood + '</strong>'],
      ['🏠 Shelter', 'Room for <strong>' + R.shelter + '</strong> of ' + L.villagers],
      ['🔥 Fire', R.fireLit ? 'Lit — the village is warm.' : 'WENT OUT — not enough wood!']
    ];
    var problems = [];
    if (R.hungry) problems.push('🍽️ The food ran out — someone went hungry.');
    if (R.exposed) problems.push('🏠 The ' + L.event + ' night caught villagers without shelter.');
    if (R.frozen) problems.push('🥶 No fire on a freezing night.');
    var html = '<div class="fv-day-head"><h2>Night falls on Day ' + L.day + '</h2><span class="fv-hearts">' + hearts(R.heartsLost) + '</span></div>' +
      '<div class="fv-rows">' + rows.map(function (r) { return '<div class="fv-row"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>'; }).join('') + '</div>' +
      (problems.length ? '<div class="fv-problems">' + problems.join('<br>') + '</div>' : '<div class="fv-ok">A safe night — everyone fed, warm and sheltered.</div>');
    if (R.pass) {
      if ((state.stars[L.day] || 0) < R.stars) { state.stars[L.day] = R.stars; lsSet(LS.stars, state.stars); }
      if (L.day === state.unlocked && state.unlocked < 100) { state.unlocked++; lsSet(LS.unl, state.unlocked); }
      html += '<div class="fv-stars">' + '★'.repeat(R.stars) + '☆'.repeat(3 - R.stars) + '</div>' +
        '<p class="fv-note">Day complete! ' + (R.stars === 3 ? 'Perfect planning — the elder is proud.' : R.stars === 2 ? 'Well planned. A little more surplus earns 3 stars.' : 'You scraped through. The forest respects survivors.') + '</p>' +
        (L.day < 100 ? '<button id="fv-next" class="fv-btn">Next day ▶</button>' : '<p class="fv-note">🏆 Day 100 — your village stands strong. You are a true Village Keeper!</p>') +
        '<button id="fv-replay" class="fv-btn fv-btn-ghost">↻ Replay day</button><button id="fv-tomap2" class="fv-btn fv-btn-ghost">🗺️ Day map</button>';
    } else {
      html += '<p class="fv-note">❌ <strong>The day is lost.</strong> ' + (R.goalMet ? 'The village took too much harm.' : 'The target was missed.') + ' Read the numbers, re-plan, and try again — plan backwards from tonight.</p>' +
        '<button id="fv-replay" class="fv-btn">↻ Try Day ' + L.day + ' again</button><button id="fv-tomap2" class="fv-btn fv-btn-ghost">🗺️ Day map</button>';
    }
    $('fv-panel').innerHTML = html;
    updateHUD(L, R);
    var nx = $('fv-next'); if (nx) nx.addEventListener('click', function () { startDay(L.day + 1); });
    $('fv-replay').addEventListener('click', function () { startDay(L.day); });
    $('fv-tomap2').addEventListener('click', renderMap);
  }

  function updateHUD(L, R) {
    if (!L) { $('fv-hud').innerHTML = '<span>🌲 Forest Village — pick a day to begin</span>'; return; }
    var f = R ? R.endFood : L.startFood, w = R ? R.endWood : L.startWood;
    $('fv-hud').innerHTML = '<span>📅 Day ' + L.day + '</span><span>👥 ' + L.villagers + '</span><span>🍎 ' + f + '</span><span>🪵 ' + w + '</span><span>🏠 ' + (R ? R.shelter : L.shelterStart) + '</span>';
  }

  document.addEventListener('DOMContentLoaded', function () { renderMap(); });

  /* ================= 3D VILLAGE (three.js) ================= */
  var FV3D = (function () {
    var api = { ok: false };
    // Safe no-op stubs: if three.js fails to load, the game still plays fully in 2D.
    api.showVillage = function () { var fb = document.getElementById('fv-3d-fallback'); if (fb) fb.style.display = 'block'; var c = document.getElementById('fv-3d'); if (c) c.style.display = 'none'; };
    api.setJobs = function () {};
    api.setWorking = function () {};
    api.setNight = function () {};
    if (typeof THREE === 'undefined') return api;
    var container = null, renderer, scene, camera, clock;
    var angle = 0.7, dragging = false, lastX = 0, working = false;
    var villagers = [], floats = [], rain = null, flame, flameInner, fireLight, dirLight, hemi;
    var builtMesh = null, frameMesh = null, tentGroup = null;
    var DAY = { bg: new THREE.Color(0x8ec9e8), fog: 0x8ec9e8, dir: 0xfff2cc, di: 1.55, hi: 0.95 };
    var NIGHT = { bg: new THREE.Color(0x27354f), fog: 0x27354f, dir: 0xff9a5c, di: 0.55, hi: 0.35 };
    var SHIRTS = [0xe74c3c, 0x3498db, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xec87bf, 0x2ecc71, 0xf1c40f, 0x95a5a6, 0xfd79a8, 0x00b894, 0x6c5ce7, 0xd63031];
    function rng(seed) { var t = seed; return function () { t += 0x6D2B79F5; var r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
    var rand = rng(1234);
    var spots = { gather: [], wood: [], build: [], home: [] };

    function mat(c, r) { return new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.9 : r }); }
    function makeTree(s) {
      var g = new THREE.Group();
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.26 * s, 1.3 * s, 6), mat(0x7a4a21));
      trunk.position.y = 0.65 * s; trunk.castShadow = true; g.add(trunk);
      var greens = [0x2e7d32, 0x388e3c, 0x43a047];
      for (var i = 0; i < 3; i++) {
        var cone = new THREE.Mesh(new THREE.ConeGeometry((1.25 - i * 0.3) * s, 1.5 * s, 7), mat(greens[i % 3]));
        cone.position.y = (1.5 + i * 0.72) * s; cone.castShadow = true; g.add(cone);
      }
      return g;
    }
    function makeTent() {
      var g = new THREE.Group();
      var c = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.9, 4), mat(0xd9c9a3));
      c.position.y = 0.95; c.rotation.y = Math.PI / 4; c.castShadow = true; g.add(c);
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 5), mat(0x7a4a21));
      pole.position.y = 1.15; g.add(pole);
      return g;
    }
    function makeHut() {
      var g = new THREE.Group();
      var base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 2.3), mat(0xa9825a));
      base.position.y = 0.9; base.castShadow = true; g.add(base);
      var roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.2, 4), mat(0x8a5a2b));
      roof.position.y = 2.4; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
      var door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.06), mat(0x5d3d1a));
      door.position.set(0, 0.6, 1.16); g.add(door);
      return g;
    }
    function makeVillager(i) {
      var g = new THREE.Group();
      var body = new THREE.Mesh(new THREE.CapsuleGeometry(0.30, 0.5, 3, 10), mat(SHIRTS[i % SHIRTS.length]));
      body.position.y = 0.72; body.castShadow = true; g.add(body);
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), mat(0xf2c79b));
      head.position.y = 1.48; head.castShadow = true; g.add(head);
      var hat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.3, 8), mat(0x6ab04c));
      hat.position.y = 1.72; g.add(hat);
      var carry = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mat(0x66bb6a));
      carry.position.set(0.42, 0.95, 0.1); carry.visible = false; g.add(carry);
      g.userData = { phase: rand() * 6.28, carry: carry, target: new THREE.Vector3(), speed: 2.4 + rand() * 0.7, job: 'home' };
      return g;
    }

    function buildScene() {
      container = $('fv-3d');
      if (!container) return false;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
      } catch (e) { return false; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);
      scene = new THREE.Scene();
      scene.background = DAY.bg.clone();
      scene.fog = new THREE.Fog(DAY.fog, 34, 78);
      camera = new THREE.PerspectiveCamera(46, 1, 0.1, 200);
      hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3f7a3a, DAY.hi); scene.add(hemi);
      dirLight = new THREE.DirectionalLight(DAY.dir, DAY.di);
      dirLight.position.set(16, 24, 10); dirLight.castShadow = true;
      dirLight.shadow.mapSize.set(2048, 2048);
      dirLight.shadow.camera.left = -24; dirLight.shadow.camera.right = 24;
      dirLight.shadow.camera.top = 24; dirLight.shadow.camera.bottom = -24;
      scene.add(dirLight);

      var ground = new THREE.Mesh(new THREE.CircleGeometry(26, 48), mat(0x5da75d));
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
      var dirt = new THREE.Mesh(new THREE.CircleGeometry(8.5, 32), mat(0x9a7b4f));
      dirt.rotation.x = -Math.PI / 2; dirt.position.y = 0.02; dirt.receiveShadow = true; scene.add(dirt);

      // forest ring
      for (var i = 0; i < 34; i++) {
        var a = (i / 34) * Math.PI * 2 + rand() * 0.16;
        var r = 12.5 + rand() * 8;
        var t = makeTree(0.9 + rand() * 0.9);
        t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        t.rotation.y = rand() * 3; scene.add(t);
        if (i % 3 === 0) spots.wood.push(new THREE.Vector3(Math.cos(a) * (r - 2.2), 0, Math.sin(a) * (r - 2.2)));
      }
      // berry bushes (gather site)
      var bushPos = [[-9.5, -6.5], [-11, -3.5], [-8.5, -9.5], [-11.5, -8], [-7.5, -4.5]];
      bushPos.forEach(function (p) {
        var b = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 8), mat(0x2f6b33));
        b.position.set(p[0], 0.7, p[1]); b.castShadow = true; scene.add(b);
        for (var k = 0; k < 6; k++) {
          var berry = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshBasicMaterial({ color: 0xe84393 }));
          berry.position.set(p[0] + (rand() - 0.5) * 1.4, 0.7 + (rand() - 0.5) * 0.9, p[1] + (rand() - 0.5) * 1.4);
          scene.add(berry);
        }
        spots.gather.push(new THREE.Vector3(p[0] + 1.3, 0, p[1] + 0.8));
      });
      // rocks
      for (var j = 0; j < 7; j++) {
        var rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + rand() * 0.4), mat(0x8d99ae));
        var ra = rand() * Math.PI * 2, rr = 9.5 + rand() * 4;
        rock.position.set(Math.cos(ra) * rr, 0.25, Math.sin(ra) * rr); rock.castShadow = true; scene.add(rock);
      }
      // campfire
      var fireG = new THREE.Group();
      for (var s = 0; s < 8; s++) {
        var st = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 6), mat(0x6c757d));
        var fa = (s / 8) * Math.PI * 2;
        st.position.set(Math.cos(fa) * 0.85, 0.12, Math.sin(fa) * 0.85); fireG.add(st);
      }
      var log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.1, 6), mat(0x7a4a21));
      log1.rotation.z = Math.PI / 2; log1.position.y = 0.16; fireG.add(log1);
      var log2 = log1.clone(); log2.rotation.y = Math.PI / 2; fireG.add(log2);
      flame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.15, 8), new THREE.MeshBasicMaterial({ color: 0xff7b2f, transparent: true, opacity: 0.92 }));
      flame.position.y = 0.85; fireG.add(flame);
      flameInner = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 8), new THREE.MeshBasicMaterial({ color: 0xffd93b }));
      flameInner.position.y = 0.7; fireG.add(flameInner);
      fireLight = new THREE.PointLight(0xff8c3a, 30, 16, 1.8);
      fireLight.position.set(0, 1.4, 0); fireG.add(fireLight);
      scene.add(fireG);
      // wood pile + food crates
      for (var wp = 0; wp < 5; wp++) {
        var lg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.5, 6), mat(0x8a5a2b));
        lg.rotation.z = Math.PI / 2; lg.position.set(6, 0.16 + Math.floor(wp / 3) * 0.3, 4.6 + (wp % 3) * 0.34); lg.castShadow = true; scene.add(lg);
      }
      for (var fc = 0; fc < 3; fc++) {
        var crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mat(0xb08954));
        crate.position.set(-6 + fc * 0.95, 0.4, 4.8); crate.castShadow = true; scene.add(crate);
        var apple = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mat(0xe74c3c));
        apple.position.set(-6 + fc * 0.95, 0.95, 4.8); scene.add(apple);
      }
      // build site frame
      frameMesh = new THREE.Group();
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) {
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.1, 5), mat(0x7a4a21));
        pole.position.set(p[0], 1.05, p[1]); frameMesh.add(pole);
      });
      var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.9, 5), mat(0x7a4a21));
      beam.rotation.z = Math.PI / 2; beam.position.set(0, 2.1, -1); frameMesh.add(beam);
      frameMesh.position.set(7.5, 0, -5.5); frameMesh.visible = false; scene.add(frameMesh);
      for (var bs = 0; bs < 4; bs++) spots.build.push(new THREE.Vector3(7.5 + (rand() - 0.5) * 2.6, 0, -5.5 + (rand() - 0.5) * 2.6));
      for (var hs = 0; hs < 14; hs++) { var ha = (hs / 14) * Math.PI * 2; spots.home.push(new THREE.Vector3(Math.cos(ha) * 2.6, 0, Math.sin(ha) * 2.6)); }
      tentGroup = new THREE.Group(); scene.add(tentGroup);
      // rain
      var rainGeo = new THREE.BufferGeometry();
      var rp = new Float32Array(500 * 3);
      for (var ri = 0; ri < 500; ri++) { rp[ri * 3] = (rand() - 0.5) * 44; rp[ri * 3 + 1] = rand() * 18; rp[ri * 3 + 2] = (rand() - 0.5) * 44; }
      rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
      rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaaccee, size: 0.14, transparent: true, opacity: 0.75 }));
      rain.visible = false; scene.add(rain);
      // villagers (max 14, shown per level)
      for (var v = 0; v < 14; v++) {
        var vm = makeVillager(v);
        vm.position.copy(spots.home[v]);
        vm.userData.target.copy(spots.home[v]);
        scene.add(vm); villagers.push(vm);
      }
      // drag to look around
      var el = renderer.domElement;
      el.style.touchAction = 'none';
      el.addEventListener('pointerdown', function (e) { dragging = true; lastX = e.clientX; });
      window.addEventListener('pointerup', function () { dragging = false; });
      window.addEventListener('pointermove', function (e) { if (dragging) { angle += (e.clientX - lastX) * 0.005; lastX = e.clientX; } });
      clock = new THREE.Clock();
      resize(); window.addEventListener('resize', resize);
      renderer.setAnimationLoop(animate);
      api.ok = true;
      return true;
    }
    function resize() {
      if (!renderer || !container) return;
      var w = container.clientWidth || 320, h = Math.round(w * 0.52);
      renderer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    function setSky(night) {
      var S = night ? NIGHT : DAY;
      scene.background.copy(S.bg); scene.fog.color.copy(S.fog);
      dirLight.color.set(S.dir); dirLight.intensity = S.di; hemi.intensity = S.hi;
    }
    function animate() {
      var dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
      if (!dragging) angle += dt * 0.03;
      camera.position.set(Math.cos(angle) * 24, 15.5, Math.sin(angle) * 24);
      camera.lookAt(0, 1, 0);
      // flame flicker
      var fl = 1 + Math.sin(t * 11) * 0.13 + Math.sin(t * 23) * 0.07;
      if (flame.visible) { flame.scale.set(fl, fl * (1 + Math.sin(t * 7) * 0.1), fl); flameInner.scale.copy(flame.scale); fireLight.intensity = 30 * fl; }
      // villagers
      for (var i = 0; i < villagers.length; i++) {
        var v = villagers[i]; if (!v.visible) continue;
        var u = v.userData, tg = u.target;
        var dx = tg.x - v.position.x, dz = tg.z - v.position.z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.15) {
          v.position.x += (dx / dist) * u.speed * dt;
          v.position.z += (dz / dist) * u.speed * dt;
          v.position.y = Math.abs(Math.sin(t * 9 + u.phase)) * 0.09;
          v.rotation.y = Math.atan2(dx, dz);
        } else {
          v.position.y = working ? Math.abs(Math.sin(t * 6 + u.phase)) * 0.05 : 0;
          if (working && u.job !== 'home' && Math.random() < dt * 0.5) spawnFloat(v.position, u.job === 'gather' ? '+ food 🍎' : (u.job === 'wood' ? '+ wood 🪵' : '🔨'), u.job === 'gather' ? '#7CFC98' : '#ffd479');
        }
      }
      // rain
      if (rain.visible) {
        var pos = rain.geometry.attributes.position;
        for (var r2 = 0; r2 < pos.count; r2++) { var y = pos.getY(r2) - dt * 22; pos.setY(r2, y < 0 ? 18 : y); }
        pos.needsUpdate = true;
      }
      // floats
      for (var f = floats.length - 1; f >= 0; f--) {
        var fo = floats[f]; fo.life -= dt;
        if (fo.life <= 0) { fo.el.remove(); floats.splice(f, 1); continue; }
        fo.pos.y += dt * 1.1;
        var pr = fo.pos.clone().project(camera);
        var w = container.clientWidth, h = container.clientHeight;
        fo.el.style.transform = 'translate(' + ((pr.x * 0.5 + 0.5) * w) + 'px,' + ((-pr.y * 0.5 + 0.5) * h) + 'px)';
        fo.el.style.opacity = Math.min(1, fo.life / 0.5);
      }
      if (builtMesh && builtMesh.scale.x < 1) { var s = Math.min(1, builtMesh.scale.x + dt * 1.6); builtMesh.scale.set(s, s, s); }
      renderer.render(scene, camera);
    }
    function spawnFloat(worldPos, text, color) {
      var layer = $('fv-float'); if (!layer) return;
      var el = document.createElement('div');
      el.className = 'fv-float-t'; el.textContent = text; el.style.color = color || '#fff';
      layer.appendChild(el);
      floats.push({ el: el, pos: worldPos.clone().add(new THREE.Vector3(0, 2.1, 0)), life: 1.3 });
    }
    api.showVillage = function (L) {
      if (!api.ok) { if (!buildScene()) { var fb = $('fv-3d-fallback'); if (fb) fb.style.display = 'block'; var c3 = $('fv-3d'); if (c3) c3.style.display = 'none'; return; } }
      setSky(false);
      flame.visible = true; flameInner.visible = true; fireLight.visible = true;
      working = false;
      rain.visible = !!(L && (L.event === 'rain' || L.event === 'storm'));
      if (L && L.event === 'storm') { scene.background.set(0x5a6b80); scene.fog.color.set(0x5a6b80); }
      // tents by shelter
      while (tentGroup.children.length) tentGroup.remove(tentGroup.children[0]);
      if (builtMesh) { scene.remove(builtMesh); builtMesh = null; }
      frameMesh.visible = false;
      if (L) {
        var tents = Math.max(1, Math.round(L.shelterStart / 2));
        for (var i = 0; i < tents; i++) {
          var tm = makeTent();
          var a = 2.2 + (i / Math.max(1, tents)) * 2.4;
          tm.position.set(Math.cos(a) * 5.6, 0, Math.sin(a) * 5.6);
          tm.rotation.y = -a + Math.PI; tentGroup.add(tm);
        }
      }
      for (var v = 0; v < villagers.length; v++) {
        var on = !L || v < L.villagers;
        villagers[v].visible = on;
        villagers[v].userData.job = 'home';
        villagers[v].userData.carry.visible = false;
        if (on) villagers[v].userData.target.copy(spots.home[v % spots.home.length]);
      }
    };
    api.setJobs = function (assign, L) {
      if (!api.ok) return;
      var idx = 0;
      function place(count, list, job, carryColor) {
        for (var k = 0; k < count; k++, idx++) {
          if (idx >= villagers.length) return;
          var v = villagers[idx];
          v.userData.job = job;
          v.userData.target.copy(list[k % list.length]);
          if (carryColor) { v.userData.carry.material = mat(carryColor); v.userData.carry.visible = true; }
        }
      }
      place(assign.g, spots.gather, 'gather', 0x66bb6a);
      place(assign.w, spots.wood, 'wood', 0x8a5a2b);
      place(assign.b, spots.build, 'build', null);
      frameMesh.visible = assign.b > 0;
      for (; idx < villagers.length; idx++) {
        if (L && idx >= L.villagers) break;
        villagers[idx].userData.job = 'home';
        villagers[idx].userData.carry.visible = false;
        villagers[idx].userData.target.copy(spots.home[idx % spots.home.length]);
      }
    };
    api.setWorking = function (on) { working = on; };
    api.setNight = function (R) {
      if (!api.ok) return;
      working = false;
      setSky(true);
      flame.visible = R.fireLit; flameInner.visible = R.fireLit; fireLight.visible = R.fireLit;
      if (R.built && state.level && state.level.build) {
        builtMesh = state.level.build.name === 'Hut' ? makeHut() : makeTent();
        builtMesh.position.set(-4.5, 0, -4.2);
        builtMesh.scale.set(0.01, 0.01, 0.01);
        scene.add(builtMesh);
      }
      for (var v = 0; v < villagers.length; v++) {
        villagers[v].userData.job = 'home';
        villagers[v].userData.carry.visible = false;
        villagers[v].userData.target.copy(spots.home[v % spots.home.length]);
      }
    };
    return api;
  })();
  window.FV3D = FV3D;
})();
