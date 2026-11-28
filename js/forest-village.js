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
  function simulate(L, assign, skillOk, me) {
    me = me || { food: 0, wood: 0, builder: false };   // work done by hand in walk-and-play mode
    var gYield = 5 + (L.event === 'berries' ? 1 : 0) - (L.event === 'rain' ? 1 : 0);
    var wYield = 5 - (L.event === 'wind' ? 1 : 0);
    if (skillOk && L.skill && L.skill.effect === 'grove') gYield += 1;
    var foodMade = assign.g * gYield + me.food;
    var woodMade = assign.w * wYield + me.wood;
    var totalFood = L.startFood + foodMade;
    var totalWood = L.startWood + woodMade;
    var built = false, shelter = L.shelterStart;
    if (L.buildDay && assign.b + (me.builder ? 1 : 0) >= L.build.builders && totalWood >= L.build.cost) {
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
    level: null, playMode: lsGet('wa_fv_play', true), assign: { g: 0, w: 0, b: 0 }, skillOk: false, skillDone: false, phase: 'map'
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
  function playing() { return state.playMode && !!(window.FV3D && FV3D.ok); }
  function team() { return state.level.villagers - (playing() ? 1 : 0); }   // in play mode you are one villager
  function setMode(play) {
    state.playMode = play; lsSet('wa_fv_play', play);
    ['b', 'w', 'g'].forEach(function (k) { while (assigned() > team() && state.assign[k] > 0) state.assign[k]--; });
    renderPlan();
    if (window.FV3D) FV3D.setJobs(state.assign, state.level);
  }

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
        '<div class="fv-step"><button class="fv-minus" data-k="' + j.k + '">−</button><span id="fv-as-' + j.k + '">' + state.assign[j.k] + '</span><button class="fv-plus" data-k="' + j.k + '">+</button></div></div>';
    }).join('');
    panel.innerHTML =
      '<div class="fv-day-head"><h2>Day ' + L.day + ' — ' + tierFor(L.day) + '</h2><span class="fv-ev">' + ev.icon + ' ' + ev.name + '</span></div>' +
      '<p class="fv-note">' + ev.note + '</p>' +
      '<div class="fv-stores">🏠 Shelter for ' + L.shelterStart + ' of ' + L.villagers + ' &nbsp;·&nbsp; 🍽️ Tonight\'s meal: ' + L.eatTotal + ' food &nbsp;·&nbsp; 🔥 Fire: ' + L.fireWood + ' wood</div>' +
      goalHtml + skillHtml +
      (window.FV3D && FV3D.ok ? '<div class="fv-modes"><button class="fv-mode' + (playing() ? ' on' : '') + '" id="fv-mode-play">🚶 Walk and work myself</button><button class="fv-mode' + (playing() ? '' : ' on') + '" id="fv-mode-watch">👀 Manage and watch</button></div>' : '') +
      (playing() ? '<p class="fv-note">You are one of the ' + L.villagers + ' villagers. You choose <strong>one job</strong> and do it by hand in the forest (90 seconds of daylight). Give jobs to the other ' + team() + '.</p>' : '') +
      '<h3 class="fv-h3">Assign ' + team() + ' villagers — <span id="fv-left">' + (team() - assigned()) + '</span> still idle</h3>' +
      jobsHtml +
      '<p class="fv-tip">🧙 <strong>Elder\'s tip:</strong> ' + elderTip(L) + '</p>' +
      '<button id="fv-start" class="fv-btn">▶ Start the day</button>' +
      '<button id="fv-tomap" class="fv-btn fv-btn-ghost">🗺️ Day map</button>';
    updateHUD(L);
    var plus = panel.querySelectorAll('.fv-plus'), minus = panel.querySelectorAll('.fv-minus');
    for (var i = 0; i < plus.length; i++) plus[i].addEventListener('click', function () { stepJob(this.getAttribute('data-k'), 1); });
    for (var j = 0; j < minus.length; j++) minus[j].addEventListener('click', function () { stepJob(this.getAttribute('data-k'), -1); });
    $('fv-start').addEventListener('click', startWork);
    if ($('fv-mode-play')) {
      $('fv-mode-play').addEventListener('click', function () { setMode(true); });
      $('fv-mode-watch').addEventListener('click', function () { setMode(false); });
    }
    $('fv-tomap').addEventListener('click', renderMap);
    var sb = $('fv-skill-btn');
    if (sb) sb.addEventListener('click', renderSkill);
  }

  function stepJob(k, d) {
    var L = state.level;
    if (d > 0 && assigned() >= team()) return;
    state.assign[k] = Math.max(0, state.assign[k] + d);
    $('fv-as-' + k).textContent = state.assign[k];
    $('fv-left').textContent = team() - assigned();
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
    if (playing() && startPlay()) return;
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

  /* ================= WALK-AND-PLAY DAY ================= */
  function startPlay() {
    var L = state.level, base = simulate(L, state.assign, state.skillOk);
    FV3D.setJobs(state.assign, L);
    var ok = FV3D.play({
      level: L, assign: state.assign,
      yields: { g: base.gYield, w: base.wYield },
      preview: function (me) { return simulate(L, state.assign, state.skillOk, me); },
      onDone: function (me) { renderNight(simulate(L, state.assign, state.skillOk, me)); },
      onFail: function () { state.playMode = false; renderPlan(); }
    });
    if (!ok) return false;
    state.phase = 'work';
    $('fv-panel').innerHTML = '<div class="fv-day-head"><h2>Day ' + L.day + ' — you are in the forest</h2></div>' +
      '<p class="fv-note">Work, then walk to the campfire and light it to end the day.</p>' +
      '<button id="fv-end" class="fv-btn">🌙 End the day now</button>';
    $('fv-end').addEventListener('click', function () { FV3D.endPlay(); });
    return true;
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

  /* ================= 3D FOREST WORLD (three.js r160, all procedural) =================
     No image, model or sound files: terrain, trees, weather and audio are made in code.
     If anything here fails, the game keeps playing in 2D. */
  var FV3D = (function () {
    var api = { ok: false };
    var failed = false;
    function showFallback() {
      var fb = document.getElementById('fv-3d-fallback'); if (fb) fb.style.display = 'block';
      var c = document.getElementById('fv-3d'); if (c) c.style.display = 'none';
    }
    api.showVillage = showFallback;
    api.setJobs = function () {};
    api.setWorking = function () {};
    api.setNight = function () {};
    api.play = function () { return false; };
    api.endPlay = function () {};
    if (typeof THREE === 'undefined') return api;

    var container, renderer, scene, camera, clock;
    var low = false, calm = false, onScreen = true;
    var U = { uTime: { value: 0 }, uWind: { value: 0.35 }, uSnow: { value: 0 }, uCam: { value: new THREE.Vector2(29, 0) }, uFocus: { value: new THREE.Vector2(0, 0) }, uCutW: { value: 13 }, uCutT: { value: 0.45 } };
    var yaw = 0.7, pitch = 0.28, dist = 29, idleUntil = 0;
    var working = false, night = false, fireOn = true, event = 'clear', level = null;
    var sun, hemi, fireLight, sky, skyU, water, waterU, ground, groundMat;
    var rain, rainU, snow, snowU, ripples, rippleData = [], puddleMat, leaves, leafData = [];
    var fireSprites = [], smokeSprites = [], embers, emberData = [], fireflies, flyData = [];
    var birds = [], butterflies = [], deer = [], villagers = [], floats = [];
    var berryExtra, tentGroup, frameMesh, builtMesh = null, logStock = [], foodStock = [], grassMeshes = [];
    var bolt, flash = 0, nextBolt = 3, windowMat;
    var spots = { gather: [], wood: [], build: [], home: [] };
    var trees = [], solids = [], tentSolids = [], bushState = [];
    var SHIRTS = [0xc0392b, 0x2874a6, 0xd68910, 0x7d3c98, 0x148f77, 0xba4a00, 0xb03a75, 0x1e8449, 0xb7950b, 0x707b7c, 0xe56b8f, 0x117a65, 0x5b4fc4, 0x922b21];

    /* ---------- helpers ---------- */
    function rng(seed) { var t = seed; return function () { t += 0x6D2B79F5; var r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
    var rand = rng(1234);
    function range(a, b) { return a + rand() * (b - a); }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function mix(a, b, t) { return a + (b - a) * t; }
    function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    function hash2(x, y) { var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
    function noise(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      return mix(mix(hash2(xi, yi), hash2(xi + 1, yi), u), mix(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v);
    }
    function riverX(z) { return 18 + Math.sin(z * 0.11) * 2.6 + Math.sin(z * 0.037) * 3; }
    function heightAt(x, z) {
      var r = Math.sqrt(x * x + z * z);
      var h = smooth(21, 58, r) * (1 + noise(x * 0.055, z * 0.055) * 7 + noise(x * 0.16, z * 0.16) * 1.4);
      var d = Math.abs(x - riverX(z));
      if (d < 4.6) h = mix(-1.25, h, smooth(1.8, 4.6, d));
      return h;
    }
    function segDist(px, pz, ax, az, bx, bz) {
      var dx = bx - ax, dz = bz - az, t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1);
      return Math.hypot(px - ax - dx * t, pz - az - dz * t);
    }
    var matCache = {};
    function mat(c, rough) {
      var k = c + '_' + (rough == null ? 0.9 : rough);
      return matCache[k] || (matCache[k] = new THREE.MeshStandardMaterial({ color: c, roughness: rough == null ? 0.9 : rough }));
    }
    function mesh(geo, material, x, y, z, parent) {
      var m = new THREE.Mesh(geo, material); m.position.set(x || 0, y || 0, z || 0);
      m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m;
    }
    function cyl(r1, r2, h, s) { return new THREE.CylinderGeometry(r1, r2, h, s || 7); }

    /* Adds wind sway, snow cover and a camera "cut-away" (so near trees never hide the village). */
    function patch(material, o) {
      material.onBeforeCompile = function (sh) {
        sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind; sh.uniforms.uSnow = U.uSnow;
        sh.uniforms.uCam = U.uCam; sh.uniforms.uFocus = U.uFocus; sh.uniforms.uCutW = U.uCutW; sh.uniforms.uCutT = U.uCutT;
        sh.uniforms.uSway = { value: o.sway || 0 }; sh.uniforms.uH = { value: o.h || 1 };
        sh.uniforms.uCut = { value: o.cut ? 1 : 0 }; sh.uniforms.uSnowAmt = { value: o.snow == null ? 1 : o.snow };
        sh.vertexShader = 'uniform float uTime,uWind,uSway,uH,uCut,uCutW,uCutT;\nuniform vec2 uCam,uFocus;\nvarying float vUp;\n' +
          sh.vertexShader.replace('#include <begin_vertex>', [
            '#include <begin_vertex>',
            'vec3 wn = objectNormal;',
            '#ifdef USE_INSTANCING',
            '  wn = mat3(instanceMatrix) * wn;',
            '  vec2 ip = instanceMatrix[3].xz;',
            '  float hh = clamp(transformed.y / uH, 0.0, 1.2);',
            '  float ph = ip.x * 0.35 + ip.y * 0.27;',
            '  float s = sin(uTime * (1.2 + uWind) + ph) * 0.6 + sin(uTime * 3.3 + ph * 2.3) * 0.25 + uWind * 0.45;',
            '  vec3 wd = vec3(0.9, 0.0, 0.4) * s * uWind * uSway * hh * hh;',
            '  vec3 lw = wd * mat3(instanceMatrix);',
            '  vec2 seg = uFocus - uCam;',
            '  float tt = dot(ip - uCam, seg) / max(dot(seg, seg), 0.001);',
            '  float dd = length(ip - uCam - seg * clamp(tt, 0.0, 1.0));',
            '  float cut = uCut * (1.0 - smoothstep(uCutW * 0.65, uCutW, dd)) * (1.0 - smoothstep(uCutT - 0.08, uCutT + 0.04, tt));',
            '  transformed *= 1.0 - 0.84 * cut;',
            '  transformed += lw / max(dot(instanceMatrix[0].xyz, instanceMatrix[0].xyz), 0.001);',
            '#endif',
            'vUp = normalize(mat3(modelMatrix) * wn).y;'
          ].join('\n'));
        sh.fragmentShader = 'uniform float uSnow,uSnowAmt;\nvarying float vUp;\n' +
          sh.fragmentShader.replace('#include <color_fragment>',
            '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.80, 0.86, 0.92), uSnow * uSnowAmt * smoothstep(0.15, 0.85, vUp));');
      };
      material.customProgramCacheKey = function () { return 'fv-patch'; };
      return material;
    }

    /* Merge simple shapes into one vertex-coloured geometry (so we can instance it). */
    function part(geo, color, x, y, z, rx, ry, rz, jitter) {
      return { geo: geo, color: color, p: [x || 0, y || 0, z || 0], r: [rx || 0, ry || 0, rz || 0], j: jitter || 0 };
    }
    function merge(parts) {
      var pos = [], nor = [], col = [], c = new THREE.Color(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
      parts.forEach(function (pt) {
        var g = pt.geo.index ? pt.geo.toNonIndexed() : pt.geo.clone();
        var p = g.attributes.position;
        if (pt.j) {
          for (var i = 0; i < p.count; i++) {
            var x = p.getX(i), y = p.getY(i), z = p.getZ(i);
            var kx = Math.round(x * 100), ky = Math.round(y * 100), kz = Math.round(z * 100);
            p.setXYZ(i, x + (hash2(kx, ky + kz) - 0.5) * pt.j, y + (hash2(ky, kz + kx) - 0.5) * pt.j, z + (hash2(kz, kx + ky) - 0.5) * pt.j);
          }
        }
        e.set(pt.r[0], pt.r[1], pt.r[2]); q.setFromEuler(e);
        m.compose(v.set(pt.p[0], pt.p[1], pt.p[2]), q, one);
        g.applyMatrix4(m);
        p = g.attributes.position; var n = g.attributes.normal; c.set(pt.color);
        for (var k = 0; k < p.count; k++) {
          var shade = 0.88 + hash2(k, p.count) * 0.24;
          pos.push(p.getX(k), p.getY(k), p.getZ(k)); nor.push(n.getX(k), n.getY(k), n.getZ(k));
          col.push(c.r * shade, c.g * shade, c.b * shade);
        }
        g.dispose();
      });
      var out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      return out;
    }
    function scatter(geo, material, list, shadows) {
      var im = new THREE.InstancedMesh(geo, material, Math.max(1, list.length));
      var d = new THREE.Object3D(), c = new THREE.Color();
      for (var i = 0; i < list.length; i++) {
        var it = list[i];
        d.position.set(it.x, it.y, it.z); d.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
        d.scale.set(it.s, it.s * (it.sy || 1), it.s); d.updateMatrix();
        im.setMatrixAt(i, d.matrix);
        var t = it.tint == null ? range(0.82, 1.18) : it.tint;
        im.setColorAt(i, c.setRGB(t * range(0.94, 1.08), t, t * range(0.9, 1.06)));
      }
      im.count = list.length;
      im.castShadow = !!shadows; im.receiveShadow = true;
      scene.add(im); return im;
    }
    function leafMat(o) { return patch(new THREE.MeshLambertMaterial({ vertexColors: true }), o); }

    /* ---------- tree shapes ---------- */
    function pineGeo() {
      var parts = [part(cyl(0.11, 0.27, 2.2), 0x5a3a20, 0, 1.1, 0)];
      var greens = [0x1c4a2a, 0x215533, 0x28603a, 0x306b3f, 0x3a7646];
      for (var i = 0; i < 5; i++) {
        parts.push(part(new THREE.ConeGeometry(1.6 - i * 0.27, 1.45, 11, 2), greens[i], 0, 1.7 + i * 0.74, 0, 0, i * 0.7, 0, 0.3));
      }
      return merge(parts);
    }
    function oakGeo() {
      var parts = [part(cyl(0.18, 0.36, 2.4), 0x62431f, 0, 1.2, 0),
        part(cyl(0.07, 0.13, 1.4, 5), 0x62431f, 0.45, 2.4, 0, 0, 0, -0.75),
        part(cyl(0.06, 0.12, 1.3, 5), 0x62431f, -0.4, 2.5, 0.1, 0.2, 0, 0.8)];
      [[0, 3.8, 0, 1.35, 0x3d7a2c], [0.95, 3.2, 0.2, 0.95, 0x2f6a27], [-0.95, 3.25, 0.1, 1.0, 0x4a8832],
        [0.1, 3.2, 0.9, 0.85, 0x37722a], [-0.15, 3.35, -0.9, 0.9, 0x568f35]].forEach(function (b) {
        parts.push(part(new THREE.IcosahedronGeometry(b[3], 1), b[4], b[0], b[1], b[2], 0, 0, 0, 0.45));
      });
      return merge(parts);
    }
    function birchGeo() {
      var parts = [];
      for (var i = 0; i < 8; i++) parts.push(part(cyl(0.12 - i * 0.006, 0.126 - i * 0.006, i % 2 ? 0.1 : 0.7, 6), i % 2 ? 0x3b3a36 : 0xd9d6c8, 0, 0.35 + Math.floor((i + 1) / 2) * 0.7 - (i % 2 ? 0.3 : 0), 0));
      [[0, 3.7, 0, 0.85, 0x86a83a], [0.5, 3.1, 0.2, 0.62, 0x739a33], [-0.45, 3.2, -0.2, 0.66, 0x98b545], [0.05, 4.35, 0, 0.55, 0xa3bd4c]].forEach(function (b) {
        parts.push(part(new THREE.IcosahedronGeometry(b[3], 1), b[4], b[0], b[1], b[2], 0, 0, 0, 0.35));
      });
      return merge(parts);
    }

    /* ---------- world ---------- */
    var BUSH = [[-9.5, -6.5], [-11, -3.4], [-8.4, -9.6], [-11.8, -8.2], [-7.4, -4.2], [-12.6, -5.6], [-5.8, -10.8]];
    var WORK_ANGLES = [];
    for (var wa = 0; wa < 14; wa++) WORK_ANGLES.push(-1.65 + wa * 0.285);
    var SITE = { x: 7.5, z: -5.8 };

    function blocked(x, z, pad) {
      if (Math.abs(x - riverX(z)) < 3.6 + pad) return true;
      if (Math.hypot(x - 4, z - 17) < 4.5 + pad) return true;            // deer meadow
      for (var i = 0; i < BUSH.length; i++) if (Math.hypot(x - BUSH[i][0], z - BUSH[i][1]) < 1.8 + pad) return true;
      return false;
    }

    function buildGround() {
      var seg = low ? 130 : 210;
      var g = new THREE.PlaneGeometry(260, 260, seg, seg); g.rotateX(-Math.PI / 2);
      var p = g.attributes.position, col = new Float32Array(p.count * 3);
      var c = new THREE.Color(), grassA = new THREE.Color(0x3f6e2a), grassB = new THREE.Color(0x6e9a3a), moss = new THREE.Color(0x2c4a22),
        dirt = new THREE.Color(0x8a6a45), mud = new THREE.Color(0x5a4630), sand = new THREE.Color(0x9c8a66), rock = new THREE.Color(0x6f7469);
      for (var i = 0; i < p.count; i++) {
        var x = p.getX(i), z = p.getZ(i), h = heightAt(x, z), r = Math.hypot(x, z);
        p.setY(i, h);
        c.copy(grassA).lerp(grassB, noise(x * 0.18, z * 0.18));
        c.lerp(moss, smooth(10, 17, r) * (0.55 + noise(x * 0.4, z * 0.4) * 0.45));
        var path = Math.min(segDist(x, z, 0, 0, -9, -5.5), segDist(x, z, 0, 0, SITE.x, SITE.z), segDist(x, z, 0, 0, 10.5, 4), segDist(x, z, 0, 0, 3, 13));
        c.lerp(dirt, (1 - smooth(0.3, 1.4, path + noise(x * 1.3, z * 1.3) * 0.5)) * 0.85);
        c.lerp(dirt, 1 - smooth(5.5, 9, r + (noise(x * 0.7, z * 0.7) - 0.5) * 3));
        c.lerp(mud, smooth(0.6, 1, noise(x * 0.9 + 9, z * 0.9)) * (1 - smooth(6, 9, r)));
        var d = Math.abs(x - riverX(z));
        c.lerp(sand, 1 - smooth(2.8, 4.4, d));
        c.lerp(rock, smooth(8, 12, h));
        var s = 0.88 + noise(x * 2.1, z * 2.1) * 0.24;
        col[i * 3] = c.r * s; col[i * 3 + 1] = c.g * s; col[i * 3 + 2] = c.b * s;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      groundMat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), { snow: 0.9 });
      ground = new THREE.Mesh(g, groundMat); ground.receiveShadow = true; scene.add(ground);

      // distant mountain ring
      var mm = patch(new THREE.MeshLambertMaterial({ color: 0x35503f, flatShading: true }), { snow: 0.8 });
      for (var k = 0; k < 26; k++) {
        var a = k / 26 * Math.PI * 2 + range(-0.08, 0.08), rr = range(100, 122), ht = range(11, 22);
        var cg = new THREE.ConeGeometry(range(20, 32), ht, 9, 4);
        var m = new THREE.Mesh(merge([part(cg, 0xffffff, 0, 0, 0, 0, 0, 0, 3.5)]), mm);
        m.position.set(Math.cos(a) * rr, ht / 2 - 1, Math.sin(a) * rr); scene.add(m);
      }
    }

    function buildWater() {
      var n = 130, pos = [], idx = [];
      for (var i = 0; i <= n; i++) {
        var z = -120 + 240 * i / n, x = riverX(z);
        pos.push(x - 3.9, -0.38, z, x + 3.9, -0.38, z);
        if (i < n) { var a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      waterU = { uT: U.uTime, uRain: { value: 0 }, uIce: U.uSnow, uSky: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() }, uFog: { value: new THREE.Color() }, uNear: { value: 40 }, uFar: { value: 150 } };
      water = new THREE.Mesh(g, new THREE.ShaderMaterial({
        uniforms: waterU, transparent: true,
        vertexShader: 'varying vec3 vW; varying float vD; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz; vec4 mv = viewMatrix*w; vD=-mv.z; gl_Position=projectionMatrix*mv; }',
        fragmentShader: [
          'uniform float uT,uRain,uIce,uNear,uFar; uniform vec3 uSky,uDeep,uFog; varying vec3 vW; varying float vD;',
          'float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
          'void main(){ vec2 p=vW.xz; float t=uT*(1.0-uIce*0.9);',
          ' float a=sin(p.y*2.3+t*2.6+sin(p.x*1.7))*0.5+sin(p.y*5.1+p.x*2.9+t*3.8)*0.3+sin(p.x*4.3-t*1.9)*0.2;',
          ' vec3 n=normalize(vec3(a*0.16,1.0,cos(p.y*3.1+p.x+t*2.2)*0.14));',
          ' vec3 v=normalize(cameraPosition-vW); float f=pow(1.0-max(dot(n,v),0.0),3.0);',
          ' vec3 c=mix(uDeep,uSky,clamp(f+0.18+a*0.07,0.0,1.0));',
          ' c+=uSky*smoothstep(0.72,0.98,a)*0.35;',
          ' vec2 g=p*1.4, id=floor(g), q=fract(g)-0.5; float ph=fract(t*1.5+h(id));',
          ' c+=vec3(0.35)*uRain*smoothstep(0.07,0.0,abs(length(q)-ph*0.48))*(1.0-ph);',
          ' c=mix(c,vec3(0.62,0.74,0.82),uIce*0.7);',
          ' c=mix(c,uFog,smoothstep(uNear,uFar,vD));',
          ' gl_FragColor=vec4(c,0.93);',
          ' #include <colorspace_fragment>',
          '}'].join('\n')
      }));
      scene.add(water);
      // stepping rocks along the banks
      var rocks = [];
      for (var j = 0; j < (low ? 60 : 120); j++) {
        var rz = range(-55, 55), side = rand() < 0.5 ? -1 : 1, rx = riverX(rz) + side * range(2.6, 3.9);
        rocks.push({ x: rx, y: heightAt(rx, rz) + 0.08, z: rz, s: range(0.2, 0.6), sy: 0.65, ry: rand() * 6 });
      }
      scatter(merge([part(new THREE.DodecahedronGeometry(1), 0x7d837f, 0, 0, 0, 0, 0, 0, 0.35)]), leafMat({}), rocks, true);
    }

    function buildForest() {
      var kinds = [pineGeo(), oakGeo(), birchGeo()];
      var near = [[], [], []], far = [[], [], []], total = low ? 380 : 900, made = 0, tries = 0;
      while (made < total && tries++ < total * 8) {
        var a = rand() * Math.PI * 2, r = 14.2 + Math.pow(rand(), 1.25) * 58;
        var x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (blocked(x, z, 0.6)) continue;
        var n = noise(x * 0.09 + 4, z * 0.09), k = n > 0.62 ? 1 : (n < 0.3 ? 2 : 0);
        if (rand() < 0.18) k = Math.floor(rand() * 3);
        (r < 30 ? near : far)[k].push({ x: x, y: heightAt(x, z) - 0.1, z: z, s: range(0.7, 1.45), sy: range(0.85, 1.3), ry: rand() * 6.28 });
        made++;
      }
      // the trees the woodcutters work on
      WORK_ANGLES.forEach(function (ang, i) {
        var tx = Math.cos(ang) * 12.9, tz = Math.sin(ang) * 12.9;
        near[i % 3 === 2 ? 2 : 0].push({ x: tx, y: heightAt(tx, tz) - 0.05, z: tz, s: range(0.75, 0.95), sy: 1, ry: rand() * 6 });
        spots.wood.push({ pos: new THREE.Vector3(Math.cos(ang) * 11.8, 0, Math.sin(ang) * 11.8), look: new THREE.Vector3(tx, 0, tz) });
      });
      var mats = [leafMat({ sway: 0.42, h: 5.4, cut: true, snow: 0.85 }), leafMat({ sway: 0.36, h: 5, cut: true, snow: 0.7 }), leafMat({ sway: 0.55, h: 4.8, cut: true, snow: 0.6 })];
      for (var q = 0; q < 3; q++) {
        var im = scatter(kinds[q], mats[q], near[q], true); scatter(kinds[q], mats[q], far[q], false);
        near[q].forEach(function (r, index) {
          r.im = im; r.index = index; r.hp = 3; r.shake = 0; trees.push(r);
          solids.push({ x: r.x, z: r.z, r: 0.3 * r.s, tree: r });
        });
      }
      // distant forest on the hills
      var cheap = merge([part(new THREE.ConeGeometry(1.3, 4.4, 6), 0x214d31, 0, 2.2, 0)]), ring = [];
      for (var i = 0; i < (low ? 350 : 900); i++) {
        var fa = rand() * Math.PI * 2, fr = range(66, 100), fx = Math.cos(fa) * fr, fz = Math.sin(fa) * fr;
        if (!blocked(fx, fz, 0)) ring.push({ x: fx, y: heightAt(fx, fz) - 0.2, z: fz, s: range(0.8, 1.7), ry: rand() * 6 });
      }
      scatter(cheap, leafMat({ snow: 0.7 }), ring, false);
    }

    function place(count, rMin, rMax, pad, fn) {
      var out = [], tries = 0;
      while (out.length < count && tries++ < count * 6) {
        var a = rand() * Math.PI * 2, r = Math.sqrt(range(rMin * rMin, rMax * rMax)), x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (Math.abs(x - riverX(z)) < 3.7 + pad) continue;
        var it = fn(x, z, r); if (it) { it.x = x; it.z = z; if (it.y == null) it.y = heightAt(x, z); out.push(it); }
      }
      return out;
    }

    function buildUndergrowth() {
      // grass tufts: thin double-faced blades that bend in the wind
      var pos = [], nor = [], col = [], base = new THREE.Color(0x35601f), tip = new THREE.Color(0xa4c85a);
      for (var b = 0; b < 5; b++) {
        var a = b * 1.31, ox = Math.cos(a) * 0.14 * (b % 3), oz = Math.sin(a) * 0.14 * (b % 3), wx = Math.cos(a + 1.57) * 0.045, wz = Math.sin(a + 1.57) * 0.045;
        var ht = 0.34 + (b % 3) * 0.1, lx = Math.cos(a) * 0.14, lz = Math.sin(a) * 0.14;
        var A = [ox - wx, 0, oz - wz], B = [ox + wx, 0, oz + wz], C = [ox + lx, ht, oz + lz];
        [[A, B, C], [B, A, C]].forEach(function (tri) {
          tri.forEach(function (v) { pos.push(v[0], v[1], v[2]); nor.push(0, 1, 0); var c = v === C ? tip : base; col.push(c.r, c.g, c.b); });
        });
      }
      var gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      gg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      var gm = leafMat({ sway: 0.2, h: 0.5, snow: 0.55 });
      grassMeshes.push(scatter(gg, gm, place(low ? 5000 : 17000, 6.2, 36, 0, function (x, z, r) {
        if (r < 8.5 && rand() < 0.8) return null;
        if (segDist(x, z, 0, 0, -9, -5.5) < 0.9 || segDist(x, z, 0, 0, SITE.x, SITE.z) < 1.2 || Math.hypot(x - SITE.x, z - SITE.z) < 2.6) return null;
        return { s: range(0.65, 1.35), ry: rand() * 6.28 };
      }), false));

      var fern = [];
      for (var f = 0; f < 8; f++) {
        var fa = f / 8 * Math.PI * 2;
        fern.push(part(new THREE.ConeGeometry(0.17, 1.05, 4), f % 2 ? 0x3f7f35 : 0x2f6a2c, Math.sin(fa) * 0.34, 0.3, Math.cos(fa) * 0.34, 1.05, fa, 0));
      }
      scatter(merge(fern), leafMat({ sway: 0.12, h: 0.7 }), place(low ? 160 : 450, 10.5, 40, 0.3, function () { return { s: range(0.55, 1.15), ry: rand() * 6 }; }), false);

      var colours = [0xffffff, 0xffd84a, 0xd96bd0, 0x7fa6ff];
      colours.forEach(function (c) {
        var fl = merge([part(cyl(0.012, 0.012, 0.3, 4), 0x4c7a2a, 0, 0.15, 0), part(new THREE.IcosahedronGeometry(0.07, 0), c, 0, 0.33, 0)]);
        var cx = range(-12, 12), cz = range(-12, 12);
        scatter(fl, leafMat({ sway: 0.14, h: 0.35, snow: 0.6 }), place(low ? 45 : 110, 8.6, 24, 0, function (x, z) { return noise(x * 0.3 + cx, z * 0.3 + cz) > 0.55 ? { s: range(0.7, 1.2), ry: rand() * 6 } : null; }), false);
      });

      scatter(merge([part(new THREE.DodecahedronGeometry(0.6), 0x80867f, 0, 0, 0, 0, 0, 0, 0.3), part(new THREE.IcosahedronGeometry(0.3, 0), 0x4f7036, 0.05, 0.38, 0, 0, 0, 0, 0.1)]),
        leafMat({}), place(low ? 40 : 90, 10, 45, 0, function () { return { s: range(0.3, 1.1), sy: 0.7, ry: rand() * 6 }; }), true);

      var shroom = merge([part(cyl(0.05, 0.07, 0.22, 6), 0xe8dfc8, 0, 0.11, 0), part(new THREE.SphereGeometry(0.17, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0xb8341f, 0, 0.2, 0),
        part(new THREE.IcosahedronGeometry(0.03, 0), 0xffffff, 0.07, 0.33, 0.04), part(new THREE.IcosahedronGeometry(0.025, 0), 0xffffff, -0.08, 0.31, -0.03)]);
      scatter(shroom, leafMat({}), place(low ? 25 : 60, 10.5, 24, 0.2, function () { return { s: range(0.6, 1.4), ry: rand() * 6 }; }), false);

      var log = merge([part(cyl(0.34, 0.38, 3, 9), 0x5c3d22, 0, 0, 0, 0, 0, Math.PI / 2), part(cyl(0.27, 0.27, 3.04, 9), 0xb89060, 0, 0, 0, 0, 0, Math.PI / 2), part(new THREE.IcosahedronGeometry(0.3, 0), 0x4a7030, 0.5, 0.27, 0, 0, 0, 0, 0.2)]);
      scatter(log, leafMat({}), place(low ? 7 : 16, 15, 34, 1, function (x, z) { return { s: range(0.7, 1.1), y: heightAt(x, z) + 0.22, ry: rand() * 6 }; }), true);

      // berry bushes
      var bp = [];
      [[0, 0.62, 0, 0.8], [0.55, 0.45, 0.25, 0.55], [-0.5, 0.48, -0.2, 0.58], [0.05, 0.45, -0.55, 0.5]].forEach(function (s, i) {
        bp.push(part(new THREE.IcosahedronGeometry(s[3], 1), i % 2 ? 0x2d6130 : 0x37733a, s[0], s[1], s[2], 0, 0, 0, 0.28));
      });
      var bushes = [], berries = [], extra = [];
      BUSH.forEach(function (p, i) {
        var b0 = berries.length, e0 = extra.length;
        bushState.push({ x: p[0], z: p[1], left: 3, from: [b0, e0] });
        solids.push({ x: p[0], z: p[1], r: 0.8 });
        bushes.push({ x: p[0], y: 0, z: p[1], s: range(0.95, 1.2), ry: rand() * 6 });
        for (var k = 0; k < 26; k++) {
          var th = rand() * 6.28, el = range(-0.1, 1.2), R = range(0.82, 0.98);
          (k < 10 ? berries : extra).push({ x: p[0] + Math.cos(th) * Math.cos(el) * R, y: 0.62 + Math.sin(el) * R, z: p[1] + Math.sin(th) * Math.cos(el) * R, s: range(0.8, 1.2), tint: 1 });
        }
        for (var q = 0; q < 2; q++) {
          var ang = Math.atan2(-p[1], -p[0]) + (q ? 0.65 : -0.65);
          spots.gather.push({ pos: new THREE.Vector3(p[0] + Math.cos(ang) * 1.45, 0, p[1] + Math.sin(ang) * 1.45), look: new THREE.Vector3(p[0], 0, p[1]) });
        }
      });
      scatter(merge(bp), leafMat({ sway: 0.08, h: 1.4, snow: 0.7 }), bushes, true);
      var berryGeo = merge([part(new THREE.IcosahedronGeometry(0.085, 0), 0xd81b60)]), berryMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 });
      var berryBase = scatter(berryGeo, berryMat, berries, false);
      berryExtra = scatter(berryGeo, berryMat, extra, false);
      bushState.forEach(function (b) {
        b.ranges = [{ im: berryBase, list: berries, from: b.from[0], to: b.from[0] + 10 }, { im: berryExtra, list: extra, from: b.from[1], to: b.from[1] + 16 }];
      });
    }

    function tentGeometry() {
      var w = 1.15, h = 1.45, d = 1.3;
      var A = [-w, 0, d], B = [w, 0, d], C = [0, h, d], D = [-w, 0, -d], E = [w, 0, -d], F = [0, h, -d];
      var tris = [A, C, F, A, F, D, C, B, E, C, E, F, E, D, F], p = [];
      tris.forEach(function (v) { p.push(v[0], v[1], v[2]); });
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g;
    }
    function makeTent() {
      var g = new THREE.Group();
      var canvasMat = mat(0xc9b586); canvasMat.side = THREE.DoubleSide;
      mesh(tentGeometry(), canvasMat, 0, 0, 0, g);
      [-1.33, 1.33].forEach(function (z) {
        var a = mesh(cyl(0.045, 0.045, 1.95, 5), mat(0x6b431f), -0.55, 0.78, z, g); a.rotation.z = -0.67;
        var b = mesh(cyl(0.045, 0.045, 1.95, 5), mat(0x6b431f), 0.55, 0.78, z, g); b.rotation.z = 0.67;
      });
      var ridge = mesh(cyl(0.05, 0.05, 2.9, 5), mat(0x6b431f), 0, 1.47, 0, g); ridge.rotation.x = Math.PI / 2;
      var bed = mesh(new THREE.BoxGeometry(1.3, 0.1, 2.1), mat(0x8a3b2e), 0, 0.06, -0.1, g); bed.castShadow = false;
      return g;
    }
    function makeHut() {
      var g = new THREE.Group();
      for (var i = 0; i < 7; i++) {
        var y = 0.16 + i * 0.27;
        [-1.2, 1.2].forEach(function (z) { var l = mesh(cyl(0.15, 0.15, 3.1, 8), mat(0x8c6238), 0, y, z, g); l.rotation.z = Math.PI / 2; });
        [-1.35, 1.35].forEach(function (x) { var l = mesh(cyl(0.15, 0.15, 2.7, 8), mat(0x7a5330), x, y + 0.12, 0, g); l.rotation.x = Math.PI / 2; });
      }
      [-1, 1].forEach(function (s) { var r = mesh(new THREE.BoxGeometry(3.5, 0.14, 2.0), mat(0x5b3a24), 0, 2.45, s * 0.78, g); r.rotation.x = s * 0.62; });
      var gable = new THREE.BufferGeometry();
      gable.setAttribute('position', new THREE.Float32BufferAttribute([1.34, 1.95, 1.2, 1.34, 1.95, -1.2, 1.34, 2.95, 0, -1.34, 1.95, -1.2, -1.34, 1.95, 1.2, -1.34, 2.95, 0], 3));
      gable.computeVertexNormals(); mesh(gable, mat(0x8c6238), 0, 0, 0, g);
      mesh(new THREE.BoxGeometry(0.7, 1.25, 0.08), mat(0x3f2812), -0.45, 0.63, 1.36, g);
      mesh(new THREE.BoxGeometry(0.55, 0.5, 0.08), windowMat, 0.65, 1.1, 1.36, g);
      return g;
    }

    function buildCamp() {
      var fire = new THREE.Group(); scene.add(fire);
      solids.push({ x: 0, z: 0, r: 1.15 }, { x: 7.1, z: 4.5, r: 1.2 }, { x: -1.6, z: 7.2, r: 0.9 }, { x: 0.2, z: 7.2, r: 0.9 });
      for (var s = 0; s < 11; s++) {
        var a = s / 11 * Math.PI * 2;
        var st = mesh(new THREE.DodecahedronGeometry(range(0.2, 0.27)), mat(0x6d7276), Math.cos(a) * 0.86, 0.1, Math.sin(a) * 0.86, fire); st.rotation.set(rand() * 3, rand() * 3, 0);
      }
      for (var l = 0; l < 5; l++) {
        var la = l / 5 * Math.PI * 2, pivot = new THREE.Group(); pivot.rotation.y = la; fire.add(pivot);
        var lg = mesh(cyl(0.08, 0.11, 1.15, 7), mat(0x4a2c16), 0.3, 0.38, 0, pivot); lg.rotation.z = 0.9;
      }
      mesh(new THREE.CircleGeometry(0.62, 16), new THREE.MeshBasicMaterial({ color: 0x1c1410 }), 0, 0.03, 0, fire).rotation.x = -Math.PI / 2;
      var cv = document.createElement('canvas'); cv.width = cv.height = 64;
      var cx = cv.getContext('2d'), gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
      var tex = new THREE.CanvasTexture(cv);
      for (var i = 0; i < 38; i++) {
        var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
        sp.userData = { life: rand(), speed: range(1.1, 2.1), a: rand() * 6.28, r: rand() * 0.38 }; scene.add(sp); fireSprites.push(sp);
      }
      for (var m = 0; m < 22; m++) {
        var sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x9a9a9a, transparent: true, depthWrite: false, opacity: 0 }));
        sm.userData = { life: m / 22, a: rand() * 6.28 }; scene.add(sm); smokeSprites.push(sm);
      }
      var ep = new Float32Array(60 * 3);
      for (var e = 0; e < 60; e++) emberData.push({ life: rand(), a: rand() * 6.28, r: rand() * 0.5, s: range(0.35, 0.8) });
      var eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
      embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xffa033, size: 0.11, map: tex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
      embers.frustumCulled = false; scene.add(embers);
      fireLight = new THREE.PointLight(0xff8c3a, 30, 24, 1.6); fireLight.position.set(0, 1.5, 0); scene.add(fireLight);

      // sitting logs
      [0.3, 2.0, 4.4].forEach(function (a) { var s = mesh(cyl(0.24, 0.24, 1.7, 9), mat(0x6b4524), Math.cos(a) * 3.35, 0.2, Math.sin(a) * 3.35, scene); s.rotation.set(Math.PI / 2, 0, a); });
      // visible stores: logs and food baskets grow and shrink with your stock
      for (var w = 0; w < 30; w++) {
        var wl = mesh(cyl(0.15, 0.15, 1.4, 8), mat(0x8a5a2b), 6.2, 0.16 + Math.floor(w / 6) * 0.27, 3.7 + (w % 6) * 0.32, scene); wl.rotation.z = Math.PI / 2; wl.visible = false; logStock.push(wl);
      }
      for (var f = 0; f < 18; f++) {
        var b = new THREE.Group(); b.position.set(-2.5 + (f % 6) * 0.68, 0, 6.4 + Math.floor(f / 6) * 0.72);
        mesh(cyl(0.3, 0.22, 0.38, 9), mat(0xa47a45), 0, 0.19, 0, b);
        for (var k = 0; k < 4; k++) mesh(new THREE.SphereGeometry(0.12, 8, 6), mat(k % 2 ? 0xc0392b : 0xd98324, 0.5), (k % 2 - 0.5) * 0.22, 0.43, (Math.floor(k / 2) - 0.5) * 0.22, b);
        b.visible = false; scene.add(b); foodStock.push(b);
      }
      // building site
      frameMesh = new THREE.Group(); frameMesh.position.set(SITE.x, 0, SITE.z); frameMesh.visible = false; scene.add(frameMesh);
      [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1]].forEach(function (p) { mesh(cyl(0.08, 0.09, 2.1, 6), mat(0x7a4a21), p[0], 1.05, p[1], frameMesh); });
      [-1.1, 1.1].forEach(function (z) { var bm = mesh(cyl(0.065, 0.065, 2.9, 6), mat(0x7a4a21), 0, 2.08, z, frameMesh); bm.rotation.z = Math.PI / 2; });
      for (var bs = 0; bs < 14; bs++) {
        var ba = bs / 14 * Math.PI * 2;
        spots.build.push({ pos: new THREE.Vector3(SITE.x + Math.cos(ba) * 2.35, 0, SITE.z + Math.sin(ba) * 2.35), look: new THREE.Vector3(SITE.x, 0, SITE.z) });
      }
      for (var hs = 0; hs < 14; hs++) {
        var ha = hs / 14 * Math.PI * 2 + 0.15;
        spots.home.push({ pos: new THREE.Vector3(Math.cos(ha) * 2.65, 0, Math.sin(ha) * 2.65), look: new THREE.Vector3(0, 0, 0) });
      }
      tentGroup = new THREE.Group(); scene.add(tentGroup);
    }

    /* ---------- people and animals ---------- */
    function limb(parent, x, y, z, len, r, color) {
      var p = new THREE.Group(); p.position.set(x, y, z); parent.add(p);
      mesh(cyl(r, r * 0.85, len, 7), mat(color), 0, -len / 2, 0, p); return p;
    }
    function makeVillager(i) {
      var g = new THREE.Group(), root = new THREE.Group(), up = new THREE.Group(); g.add(root);
      var shirt = SHIRTS[i % SHIRTS.length], skin = [0xf2c79b, 0xc98e62, 0x8d5a38, 0xe0ac7e][i % 4];
      var legL = limb(root, -0.14, 0.66, 0, 0.66, 0.11, 0x3d3a45), legR = limb(root, 0.14, 0.66, 0, 0.66, 0.11, 0x3d3a45);
      up.position.y = 0.66; root.add(up);
      mesh(new THREE.CapsuleGeometry(0.26, 0.34, 4, 10), mat(shirt), 0, 0.37, 0, up);
      mesh(new THREE.SphereGeometry(0.22, 14, 12), mat(skin), 0, 0.93, 0, up);
      [-0.08, 0.08].forEach(function (x) { mesh(new THREE.SphereGeometry(0.028, 6, 5), mat(0x1b1410), x, 0.96, 0.2, up); });
      mesh(new THREE.ConeGeometry(0.34, 0.22, 12), mat(0x7d5a2f), 0, 1.15, 0, up);
      var armL = limb(up, -0.34, 0.6, 0, 0.55, 0.075, shirt), armR = limb(up, 0.34, 0.6, 0, 0.55, 0.075, shirt);
      [armL, armR].forEach(function (a) { mesh(new THREE.SphereGeometry(0.085, 8, 6), mat(skin), 0, -0.57, 0, a); });
      var axe = new THREE.Group(); axe.position.y = -0.58; armR.add(axe);
      mesh(cyl(0.032, 0.032, 0.7, 5), mat(0x7a4a21), 0, 0, 0.3, axe).rotation.x = Math.PI / 2;
      mesh(new THREE.BoxGeometry(0.06, 0.28, 0.18), mat(0xb9c2c9, 0.35), 0, -0.08, 0.62, axe);
      var hammer = new THREE.Group(); hammer.position.y = -0.58; armR.add(hammer);
      mesh(cyl(0.03, 0.03, 0.48, 5), mat(0x7a4a21), 0, 0, 0.2, hammer).rotation.x = Math.PI / 2;
      mesh(new THREE.BoxGeometry(0.14, 0.28, 0.14), mat(0x5d646b, 0.4), 0, 0, 0.45, hammer);
      var basket = new THREE.Group(); basket.position.set(0, 0.38, -0.36); up.add(basket);
      mesh(cyl(0.22, 0.17, 0.4, 10), mat(0xa47a45), 0, 0, 0, basket);
      mesh(new THREE.SphereGeometry(0.15, 8, 6), mat(0xc2185b, 0.5), 0, 0.19, 0, basket);
      axe.visible = hammer.visible = basket.visible = false;
      g.userData = { root: root, up: up, legL: legL, legR: legR, armL: armL, armR: armR, axe: axe, hammer: hammer, basket: basket, phase: rand() * 6.28, speed: range(2.5, 3.2), job: 'home', target: new THREE.Vector3(), look: new THREE.Vector3() };
      return g;
    }
    function send(v, job, spot) {
      var u = v.userData; u.job = job; u.target.copy(spot.pos); u.look.copy(spot.look);
      u.axe.visible = job === 'wood'; u.hammer.visible = job === 'build'; u.basket.visible = job === 'gather';
    }
    function makeDeer() {
      var g = new THREE.Group(), brown = 0x8a5a34;
      var body = mesh(new THREE.CapsuleGeometry(0.32, 0.75, 4, 10), mat(brown), 0, 0.95, 0, g); body.rotation.x = Math.PI / 2;
      var neck = new THREE.Group(); neck.position.set(0, 1.08, 0.55); g.add(neck);
      mesh(cyl(0.1, 0.17, 0.65, 7), mat(brown), 0, 0.24, 0.13, neck).rotation.x = 0.5;
      mesh(new THREE.BoxGeometry(0.24, 0.24, 0.42), mat(brown), 0, 0.58, 0.38, neck);
      [-1, 1].forEach(function (s) {
        mesh(cyl(0.02, 0.03, 0.5, 5), mat(0xd8c7a0), s * 0.15, 0.9, 0.26, neck).rotation.z = -s * 0.5;
        mesh(cyl(0.015, 0.02, 0.25, 5), mat(0xd8c7a0), s * 0.2, 0.93, 0.36, neck).rotation.x = 0.8;
      });
      mesh(new THREE.SphereGeometry(0.13, 8, 6), mat(0xf0e6d2), 0, 1.08, -0.68, g);
      var legs = [];
      [[-0.2, 0.42], [0.2, 0.42], [-0.2, -0.42], [0.2, -0.42]].forEach(function (p) { legs.push(limb(g, p[0], 0.8, p[1], 0.8, 0.07, 0x6e4526)); });
      g.userData = { legs: legs, neck: neck, target: new THREE.Vector3(4, 0, 17), wait: 0 };
      return g;
    }
    function winged(color, w, len) {
      var g = new THREE.Group(), wings = [];
      var m = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
      [-1, 1].forEach(function (s) {
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, len, s * w, 0, -len * 0.4, 0, 0, -len], 3));
        var wg = new THREE.Mesh(geo, m); g.add(wg); wings.push(wg);
      });
      g.userData = { wings: wings, a: rand() * 6.28, r: range(8, 24), h: range(9, 15), sp: range(0.18, 0.34) };
      return g;
    }
    function buildLife() {
      for (var v = 0; v < 14; v++) { var vm = makeVillager(v); vm.position.copy(spots.home[v].pos); send(vm, 'home', spots.home[v]); scene.add(vm); villagers.push(vm); }
      for (var d = 0; d < 3; d++) { var de = makeDeer(); de.position.set(2 + d * 2.2, 0, 16 + (d % 2) * 2.4); de.scale.setScalar(d === 2 ? 0.7 : 1); scene.add(de); deer.push(de); }
      for (var b = 0; b < 9; b++) { var bd = winged(0x1d2228, 0.75, 0.22); scene.add(bd); birds.push(bd); }
      var cols = [0xffc93c, 0xff7eb6, 0x6ec6ff, 0xffffff];
      for (var f = 0; f < 14; f++) { var bf = winged(cols[f % 4], 0.17, 0.11); bf.userData.home = BUSH[f % BUSH.length]; scene.add(bf); butterflies.push(bf); }
    }

    /* ---------- sky and weather ---------- */
    function buildSky() {
      skyU = { uT: U.uTime, uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uCloud: { value: new THREE.Color() }, uCover: { value: 0.3 }, uNight: { value: 0 }, uFlash: { value: 0 }, uSun: { value: new THREE.Vector3(0.5, 0.35, -0.6).normalize() }, uSunCol: { value: new THREE.Color(0xfff0c0) }, uDrift: { value: 0 } };
      sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 20), new THREE.ShaderMaterial({
        uniforms: skyU, side: THREE.BackSide, depthWrite: false,
        vertexShader: 'varying vec3 vDir; void main(){ vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
        fragmentShader: [
          'uniform float uT,uCover,uNight,uFlash,uDrift; uniform vec3 uTop,uHor,uCloud,uSun,uSunCol; varying vec3 vDir;',
          'float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
          'float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }',
          'float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.03+7.1; a*=0.5; } return s; }',
          'void main(){ vec3 d=normalize(vDir); float y=max(d.y,0.0);',
          ' vec3 c=mix(uHor,uTop,pow(y,0.5));',
          ' vec2 uv=d.xz/(y+0.16)*1.5+vec2(uDrift,uDrift*0.4);',
          ' float e=1.0-uCover*0.85;',
          ' float cl=smoothstep(e-0.18,e+0.22,fbm(uv))*smoothstep(0.0,0.14,d.y);',
          ' float sd=max(dot(d,uSun),0.0);',
          ' c+=uSunCol*(pow(sd,900.0)*2.5+pow(sd,14.0)*0.22)*(1.0-uCover*0.92);',
          ' vec2 sg=d.xz/(y+0.35)*95.0; float st=step(0.985,h(floor(sg)))*smoothstep(0.35,0.0,length(fract(sg)-0.5));',
          ' c+=vec3(st)*uNight*(1.0-cl)*(1.0-uCover*0.8)*smoothstep(0.0,0.1,d.y)*(0.7+0.3*sin(uT*3.0+h(floor(sg))*40.0));',
          ' c=mix(c,uCloud*(0.72+0.55*fbm(uv*2.3+3.0)),cl);',
          ' c+=vec3(0.65,0.72,0.9)*uFlash*(0.35+cl*0.5)*smoothstep(-0.02,0.2,d.y);',
          ' gl_FragColor=vec4(c,1.0);',
          ' #include <colorspace_fragment>',
          '}'].join('\n')
      }));
      sky.frustumCulled = false; scene.add(sky);
    }

    function buildWeather() {
      var N = low ? 2200 : 5500, p = new Float32Array(N * 6), end = new Float32Array(N * 2), seed = new Float32Array(N * 2);
      for (var i = 0; i < N; i++) {
        var x = range(-36, 36), y = range(0, 26), z = range(-36, 36), s = rand();
        p.set([x, y, z, x, y, z], i * 6); end.set([0, 1], i * 2); seed.set([s, s], i * 2);
      }
      var rg = new THREE.BufferGeometry();
      rg.setAttribute('position', new THREE.BufferAttribute(p, 3)); rg.setAttribute('aEnd', new THREE.BufferAttribute(end, 1)); rg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      rainU = { uT: U.uTime, uSlant: { value: 0.1 }, uAlpha: { value: 0 }, uCol: { value: new THREE.Color(0xbcd4ee) } };
      rain = new THREE.LineSegments(rg, new THREE.ShaderMaterial({
        uniforms: rainU, transparent: true, depthWrite: false,
        vertexShader: [
          'uniform float uT,uSlant; attribute float aEnd,aSeed; varying float vA;',
          'void main(){ vec3 p=position; float y=mod(p.y-uT*(19.0+aSeed*9.0),26.0)+aEnd*(0.55+aSeed*0.6);',
          ' p.y=y; p.x+=uSlant*(y-13.0); p.z+=uSlant*0.4*(y-13.0); vA=0.25+aEnd*0.75;',
          ' vec4 mv=modelViewMatrix*vec4(p,1.0); vA*=smoothstep(1.5,7.0,-mv.z); gl_Position=projectionMatrix*mv; }'].join('\n'),
        fragmentShader: 'uniform float uAlpha; uniform vec3 uCol; varying float vA; void main(){ gl_FragColor=vec4(uCol,uAlpha*vA);\n#include <colorspace_fragment>\n}'
      }));
      rain.frustumCulled = false; rain.userData.max = N; scene.add(rain);

      var M = low ? 1600 : 4200, sp = new Float32Array(M * 3), ss = new Float32Array(M);
      for (var j = 0; j < M; j++) { sp.set([range(-36, 36), range(0, 22), range(-36, 36)], j * 3); ss[j] = rand(); }
      var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('aSeed', new THREE.BufferAttribute(ss, 1));
      snowU = { uT: U.uTime, uAlpha: { value: 0 }, uScale: { value: 600 } };
      snow = new THREE.Points(sg, new THREE.ShaderMaterial({
        uniforms: snowU, transparent: true, depthWrite: false,
        vertexShader: [
          'uniform float uT,uScale; attribute float aSeed;',
          'void main(){ vec3 p=position; p.y=mod(p.y-uT*(1.1+aSeed*1.3),22.0);',
          ' p.x+=sin(uT*0.9+aSeed*40.0)*0.9; p.z+=cos(uT*0.7+aSeed*23.0)*0.7;',
          ' vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=min(14.0,uScale*(0.08+aSeed*0.1)/-mv.z); gl_Position=projectionMatrix*mv; }'].join('\n'),
        fragmentShader: 'uniform float uAlpha; void main(){ float d=length(gl_PointCoord-0.5); gl_FragColor=vec4(1.0,1.0,1.0,uAlpha*smoothstep(0.5,0.15,d)); }'
      }));
      snow.frustumCulled = false; scene.add(snow);

      // rain rings on the ground
      var ring = new THREE.RingGeometry(0.78, 1, 14); ring.rotateX(-Math.PI / 2);
      ripples = new THREE.InstancedMesh(ring, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }), low ? 70 : 180);
      var black = new THREE.Color(0, 0, 0);
      for (var r = 0; r < ripples.count; r++) { rippleData.push({ x: 0, z: 0, life: rand() }); ripples.setColorAt(r, black); }
      ripples.frustumCulled = false; scene.add(ripples);
      // puddles
      puddleMat = new THREE.MeshStandardMaterial({ color: 0x4d5f70, roughness: 0.06, metalness: 0.55, transparent: true, opacity: 0, depthWrite: false });
      [[2.9, -3.8, 1.1], [-3.6, 1.2, 0.8], [4.8, 0.9, 1.3], [-1.2, 5.6, 1.0], [1.3, 4.2, 0.55], [-4.9, -1.9, 0.7], [0.9, -6.2, 0.9], [4.1, -2.0, 0.5]].forEach(function (q) {
        var cg = new THREE.CircleGeometry(q[2], 22), cp = cg.attributes.position;
        for (var k = 1; k < cp.count - 1; k++) { var f = 0.75 + hash2(k, q[2] * 10) * 0.4; cp.setXY(k, cp.getX(k) * f, cp.getY(k) * f); }
        cp.setXY(cp.count - 1, cp.getX(1), cp.getY(1));
        var pm = new THREE.Mesh(cg, puddleMat); pm.rotation.x = -Math.PI / 2; pm.position.set(q[0], 0.04, q[1]); pm.scale.y = 0.65; scene.add(pm);
      });
      // flying leaves
      var lg = new THREE.PlaneGeometry(0.24, 0.14);
      leaves = new THREE.InstancedMesh(lg, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), low ? 100 : 260);
      var lc = new THREE.Color(), pal = [0x9acb3c, 0xd9a521, 0xc8641e, 0x6e9e2f];
      for (var q2 = 0; q2 < leaves.count; q2++) { leafData.push({ x: range(-26, 26), y: range(0.3, 9), z: range(-26, 26), s: rand() * 6 }); leaves.setColorAt(q2, lc.set(pal[q2 % 4])); }
      leaves.frustumCulled = false; leaves.visible = false; scene.add(leaves);
      // fireflies
      var fp = new Float32Array(70 * 3);
      for (var ff = 0; ff < 70; ff++) { var a = rand() * 6.28, rr = range(7, 22); flyData.push({ x: Math.cos(a) * rr, y: range(0.4, 2.8), z: Math.sin(a) * rr, s: rand() * 6.28 }); }
      var fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
      fireflies = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xd8ff6a, size: 0.24, map: fireSprites[0].material.map, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
      fireflies.frustumCulled = false; fireflies.visible = false; scene.add(fireflies);
      // lightning bolt (rebuilt for each strike)
      bolt = new THREE.Group(); bolt.visible = false; scene.add(bolt);
    }

    var boltMat = new THREE.MeshBasicMaterial({ color: 0xeaf2ff, fog: false });
    function strike() {
      while (bolt.children.length) { bolt.children[0].geometry.dispose(); bolt.remove(bolt.children[0]); }
      var a = yaw + Math.PI + range(-0.5, 0.5), r = range(45, 75), up = new THREE.Vector3(0, 1, 0);
      var prev = new THREE.Vector3(Math.cos(a) * r, 34, Math.sin(a) * r);
      for (var i = 0; i < 11; i++) {
        var next = new THREE.Vector3(prev.x + range(-2.4, 2.4), prev.y - 3, prev.z + range(-2.4, 2.4));
        var dir = next.clone().sub(prev), seg = new THREE.Mesh(cyl(0.12, 0.17, dir.length(), 4), boltMat);
        seg.position.copy(prev).add(next).multiplyScalar(0.5); seg.quaternion.setFromUnitVectors(up, dir.normalize()); bolt.add(seg); prev = next;
      }
      flash = 1; Sound.thunder(range(0.4, 1.5));
    }

    var LOOK = {
      clear:   { top: 0x2f78d0, hor: 0xb4d8ea, cloud: 0xffffff, cover: 0.34, sun: 0xfff0d0, si: 2.7, hemi: 1.25, near: 42, far: 165, rain: 0, snow: 0, wind: 0.35, wet: 0 },
      berries: { top: 0x3a86d8, hor: 0xd8e6d8, cloud: 0xfff8ec, cover: 0.24, sun: 0xffe2a8, si: 2.9, hemi: 1.25, near: 45, far: 170, rain: 0, snow: 0, wind: 0.3, wet: 0 },
      wind:    { top: 0x4a82bd, hor: 0xbfd2da, cloud: 0xe9eef2, cover: 0.58, sun: 0xfff0d8, si: 2.2, hemi: 1.2, near: 38, far: 150, rain: 0, snow: 0, wind: 1.5, wet: 0 },
      rain:    { top: 0x56636f, hor: 0x8e9ca4, cloud: 0x8b949c, cover: 0.95, sun: 0xc8d4e0, si: 0.9, hemi: 1.15, near: 24, far: 105, rain: 0.65, snow: 0, wind: 0.65, wet: 1 },
      storm:   { top: 0x1b222e, hor: 0x47525f, cloud: 0x39414d, cover: 1, sun: 0x93a6c0, si: 0.55, hemi: 0.85, near: 20, far: 92, rain: 1, snow: 0, wind: 1.7, wet: 1 },
      cold:    { top: 0x7896b6, hor: 0xcbd9e4, cloud: 0xdfe6ee, cover: 0.75, sun: 0xdbe8ff, si: 1.6, hemi: 1.15, near: 28, far: 120, rain: 0, snow: 1, wind: 0.5, wet: 0 }
    };
    var cur = null;
    function targetLook() {
      var w = LOOK[event] || LOOK.clear, t = {};
      for (var k in w) t[k] = w[k];
      t.night = night ? 1 : 0;
      if (play) {
        var dusk = smooth(0.6, 1, play.elapsed / DAY_SECONDS), clearness = 1 - w.cover * 0.6;
        t.sun = new THREE.Color(w.sun).lerp(new THREE.Color(0xff7a2e), dusk * 0.85).getHex();
        t.hor = new THREE.Color(w.hor).lerp(new THREE.Color(0xe08a5c), dusk * clearness * 0.8).getHex();
        t.top = new THREE.Color(w.top).lerp(new THREE.Color(0x2a3566), dusk * 0.7).getHex();
        t.si = w.si * (1 - dusk * 0.35); t.hemi = w.hemi * (1 - dusk * 0.3);
      }
      if (night) {
        var grim = w.cover > 0.9;
        t.top = grim ? 0x070a12 : 0x07102a; t.hor = grim ? 0x1a222e : 0x1d3154; t.cloud = grim ? 0x141a24 : 0x27344e;
        t.sun = 0x93acff; t.si = grim ? 0.35 : 0.75; t.hemi = grim ? 0.35 : 0.5;
      }
      return t;
    }
    var tmpColor = new THREE.Color();
    function applyLook(dt) {
      var t = targetLook();
      if (!cur) { cur = {}; for (var k0 in t) cur[k0] = /^(top|hor|cloud|sun)$/.test(k0) ? new THREE.Color(t[k0]) : t[k0]; }
      var a = 1 - Math.exp(-dt * 1.6);
      for (var k in t) { if (cur[k].isColor) cur[k].lerp(tmpColor.set(t[k]), a); else cur[k] = mix(cur[k], t[k], a); }
      skyU.uTop.value.copy(cur.top); skyU.uHor.value.copy(cur.hor); skyU.uCloud.value.copy(cur.cloud);
      skyU.uCover.value = cur.cover; skyU.uNight.value = cur.night; skyU.uFlash.value = flash;
      skyU.uSunCol.value.copy(cur.sun); skyU.uDrift.value += dt * (0.008 + cur.wind * 0.03);
      scene.fog.color.copy(cur.hor); scene.fog.near = cur.near; scene.fog.far = cur.far;
      sun.color.copy(cur.sun); sun.intensity = cur.si;
      hemi.color.copy(cur.hor).lerp(tmpColor.set(0xffffff), 0.35); hemi.intensity = cur.hemi + flash * 3.5;
      U.uWind.value = cur.wind; U.uSnow.value = cur.snow * 0.92;
      groundMat.roughness = 1 - cur.wet * 0.42; groundMat.color.setScalar(1 - cur.wet * 0.3);
      puddleMat.opacity = cur.wet * 0.75; puddleMat.color.copy(cur.hor);
      waterU.uRain.value = cur.rain; waterU.uSky.value.copy(cur.hor);
      waterU.uDeep.value.set(0x12414a).multiplyScalar(1 - cur.night * 0.8);
      waterU.uFog.value.copy(cur.hor); waterU.uNear.value = cur.near; waterU.uFar.value = cur.far;
      rain.visible = cur.rain > 0.02; rain.geometry.setDrawRange(0, Math.floor(rain.userData.max * clamp(cur.rain, 0, 1)) * 2);
      rainU.uAlpha.value = (0.5 - cur.night * 0.18) * Math.min(1, cur.rain * 2) + flash * 0.3; rainU.uSlant.value = cur.wind * 0.16;
      snow.visible = cur.snow > 0.02; snowU.uAlpha.value = cur.snow * 0.95;
      windowMat.emissiveIntensity = cur.night * 1.6;
    }

    /* ---------- sound (made in the browser, off until the player taps the speaker) ---------- */
    var Sound = (function () {
      var ctx = null, on = false, master, rainG, windG, noiseBuf, tBird = 1, tFire = 0, tCricket = 0;
      function loop(type, freq, q) {
        var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
        var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
        var g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(master); s.start(); return g;
      }
      function burst(type, freq, vol, attack, len, delay) {
        var t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
        var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
        var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + len + 0.05);
      }
      function tone(f1, f2, vol, len, delay) {
        var t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + len);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + len * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + len + 0.02);
      }
      return {
        toggle: function () {
          if (!ctx) {
            var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
            ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
            noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
            var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            rainG = loop('bandpass', 2600, 0.45); windG = loop('lowpass', 380, 2.5);
          }
          on = !on; if (on) ctx.resume(); else ctx.suspend(); return on;
        },
        start: function () { if (!on && !this.muted) { this.toggle(); if (this.button) this.button.textContent = on ? '🔊' : '🔇'; } },
        sfx: function (k) {
          if (!on) return;
          if (k === 'chop') { burst('lowpass', 480, 0.8, 0.005, 0.16); burst('highpass', 2200, 0.18, 0.004, 0.06); }
          else if (k === 'fall') { burst('lowpass', 700, 0.35, 0.2, 0.9); burst('lowpass', 140, 0.9, 0.02, 0.6, 0.9); }
          else if (k === 'pick') tone(520, 880, 0.12, 0.1, 0);
          else if (k === 'hammer') { burst('bandpass', 900, 0.8, 0.003, 0.1); tone(240, 180, 0.15, 0.09, 0); }
          else if (k === 'spark') burst('highpass', 1800, 0.35, 0.02, 0.4);
          else if (k === 'step') burst('lowpass', 900, 0.07, 0.01, 0.09);
          else if (k === 'done') { tone(523, 523, 0.12, 0.16, 0); tone(659, 659, 0.12, 0.16, 0.14); tone(784, 784, 0.12, 0.3, 0.28); }
          else if (k === 'no') tone(220, 150, 0.12, 0.22, 0);
        },
        pause: function (hidden) { if (ctx && on) { if (hidden) ctx.suspend(); else ctx.resume(); } },
        thunder: function (delay) { if (on) { burst('lowpass', 220, 0.9, 0.08, 2.8, delay); burst('lowpass', 90, 0.9, 0.3, 3.6, delay + 0.2); } },
        update: function (dt, t) {
          if (!on || !cur) return;
          rainG.gain.value = cur.rain * 0.3;
          windG.gain.value = Math.max(0, cur.wind - 0.2) * (0.2 + Math.sin(t * 0.7) * 0.07 + Math.sin(t * 1.9) * 0.04);
          tFire -= dt; if (fireOn && tFire <= 0) { tFire = 0.04 + Math.random() * 0.28; burst('highpass', 1500 + Math.random() * 2500, 0.04 + Math.random() * 0.1, 0.004, 0.05, 0); }
          var calmSky = cur.rain < 0.1 && cur.snow < 0.1;
          tBird -= dt; if (!night && calmSky && tBird <= 0) {
            tBird = 1.2 + Math.random() * 3.5; var f = 2000 + Math.random() * 2000;
            for (var i = 0; i < 2 + Math.floor(Math.random() * 3); i++) tone(f, f * (0.75 + Math.random() * 0.6), 0.05, 0.12, i * 0.15);
          }
          tCricket -= dt; if (night && calmSky && tCricket <= 0) { tCricket = 0.7; for (var k = 0; k < 4; k++) tone(4300, 4250, 0.018, 0.04, k * 0.06); }
        }
      };
    })();

    /* ---------- camera, buttons, sizing ---------- */
    function isFull() { return container.classList.contains('fv-full'); }
    function zoom(f) { if (play) playDist = clamp(playDist * f, 5, 16); else dist = clamp(dist * f, 14, 46); }
    function setFull(on) {
      container.classList.toggle('fv-full', on); document.body.classList.toggle('fv-noscroll', on);
      renderer.domElement.style.touchAction = on ? 'none' : 'pan-y'; resize();
    }
    function controls() {
      var bar = document.createElement('div'); bar.className = 'fv-cam';
      function btn(label, title, fn) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.title = title; b.setAttribute('aria-label', title);
        b.addEventListener('click', function () { fn(b); }); bar.appendChild(b); return b;
      }
      Sound.button = btn('🔇', 'Sound on or off', function (b) { var is = Sound.toggle(); Sound.muted = !is; b.textContent = is ? '🔊' : '🔇'; });
      btn('＋', 'Zoom in', function () { zoom(0.8); });
      btn('－', 'Zoom out', function () { zoom(1.25); });
      btn('⛶', 'Full screen', function () { setFull(!isFull()); });
      container.appendChild(bar);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isFull()) setFull(false); });
      document.addEventListener('visibilitychange', function () { Sound.pause(document.hidden); });

      var el = renderer.domElement, pts = {}, pinch = 0;
      el.style.touchAction = 'pan-y';
      el.addEventListener('pointerdown', function (e) { pts[e.pointerId] = { x: e.clientX, y: e.clientY }; pinch = 0; });
      function up(e) { delete pts[e.pointerId]; pinch = 0; }
      window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      window.addEventListener('pointermove', function (e) {
        var p = pts[e.pointerId]; if (!p) return;
        var ids = Object.keys(pts), dx = e.clientX - p.x, dy = e.clientY - p.y;
        p.x = e.clientX; p.y = e.clientY; idleUntil = U.uTime.value + 5;
        if (ids.length > 1) {
          var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch) zoom(pinch / Math.max(d, 1));
          pinch = d; return;
        }
        yaw += dx * 0.006;
        if (e.pointerType === 'mouse' || isFull()) pitch = clamp(pitch + dy * 0.004, 0.1, 1.15);
      });
      el.addEventListener('wheel', function (e) { if (!isFull() && !e.ctrlKey) return; e.preventDefault(); zoom(1 + clamp(e.deltaY, -100, 100) * 0.0012); }, { passive: false });
    }
    function resize() {
      if (!renderer) return;
      var w = container.clientWidth || 320, h = isFull() ? (container.clientHeight || window.innerHeight) : Math.round(w * (w < 600 ? 0.82 : 0.6));
      renderer.setSize(w, h, false); renderer.domElement.style.height = h + 'px';
      camera.aspect = w / h; camera.fov = w / h < 1 ? 60 : 46; camera.updateProjectionMatrix();
      if (snowU) snowU.uScale.value = h * renderer.getPixelRatio();
    }

    function buildScene() {
      container = document.getElementById('fv-3d');
      if (!container) return false;
      low = window.innerWidth < 800 || !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
      scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xb4d8ea, 42, 165);
      camera = new THREE.PerspectiveCamera(46, 1, 0.5, 700);
      hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3b5a2c, 1.2); scene.add(hemi);
      sun = new THREE.DirectionalLight(0xfff0d0, 2.6); sun.position.set(18, 26, 12); sun.castShadow = true;
      sun.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
      var sc = sun.shadow.camera; sc.left = -28; sc.right = 28; sc.top = 28; sc.bottom = -28; sc.far = 80;
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun);
      windowMat = new THREE.MeshStandardMaterial({ color: 0x4a6070, emissive: 0xffb347, emissiveIntensity: 0 });

      buildSky(); buildGround(); buildWater(); buildForest(); buildUndergrowth(); buildCamp(); buildLife(); buildWeather(); buildPlayer();

      container.appendChild(renderer.domElement);
      controls(); buildPlayUI(); clock = new THREE.Clock(); resize();
      window.addEventListener('resize', resize);
      if (window.ResizeObserver) { var lastW = 0; new ResizeObserver(function () { if (container.clientWidth !== lastW) { lastW = container.clientWidth; resize(); } }).observe(container); }
      if (window.IntersectionObserver) new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; }).observe(container);
      renderer.setAnimationLoop(animate);
      api.ok = true; return true;
    }

    /* ---------- animation ---------- */
    function animateVillagers(dt, t) {
      for (var i = 0; i < villagers.length; i++) {
        var v = villagers[i]; if (!v.visible) continue;
        var u = v.userData, dx = u.target.x - v.position.x, dz = u.target.z - v.position.z, d = Math.hypot(dx, dz);
        var lean = 0, aL = 0, aR = 0, lL = 0, lR = 0, drop = 0, s = t * 8 + u.phase;
        if (d > 0.15) {
          var step = Math.min(d, u.speed * dt);
          v.position.x += dx / d * step; v.position.z += dz / d * step;
          var fr = Math.hypot(v.position.x, v.position.z);
          if (fr < 1.7 && fr > 0.01) { v.position.x *= 1.7 / fr; v.position.z *= 1.7 / fr; }   // walk round the fire
          v.rotation.y = Math.atan2(dx, dz);
          lL = Math.sin(s) * 0.7; lR = -lL; aL = -lL * 0.8; aR = lL * 0.8; lean = 0.1; drop = Math.abs(Math.cos(s)) * 0.06;
        } else {
          v.rotation.y = Math.atan2(u.look.x - v.position.x, u.look.z - v.position.z);
          if (working && u.job === 'wood') { var k = Math.pow(Math.abs(Math.sin(t * 3.2 + u.phase)), 3); aR = -2.7 + k * 2.1; aL = aR * 0.8; lean = k * 0.35; }
          else if (working && u.job === 'gather') { lean = 0.65 + Math.sin(t * 2 + u.phase) * 0.15; aL = -1.2 + Math.sin(t * 5 + u.phase) * 0.35; aR = -1.2 - Math.sin(t * 5 + u.phase) * 0.35; }
          else if (working && u.job === 'build') { aR = -1.7 + Math.abs(Math.sin(t * 6 + u.phase)) * 1.1; aL = -0.7; lean = 0.2; }
          else if (night && u.job === 'home') { lL = lR = -1.45; drop = -0.4; aL = aR = -0.75; lean = 0.12; }
          else { aL = Math.sin(t * 1.4 + u.phase) * 0.06; aR = -aL; }
          if (working && u.job !== 'home' && Math.random() < dt * 0.35) spawnFloat(v.position, u.job === 'gather' ? '+ food 🍎' : (u.job === 'wood' ? '+ wood 🪵' : '🔨'), u.job === 'gather' ? '#9dffb4' : '#ffd479');
        }
        u.legL.rotation.x = lL; u.legR.rotation.x = lR; u.armL.rotation.x = aL; u.armR.rotation.x = aR; u.up.rotation.x = lean; u.root.position.y = drop;
      }
    }
    function animateLife(dt, t) {
      var fair = !night && cur.rain < 0.15, i, o, u, flap;
      for (i = 0; i < deer.length; i++) {
        o = deer[i]; u = o.userData; o.visible = cur.rain < 0.5;
        var dx = u.target.x - o.position.x, dz = u.target.z - o.position.z, d = Math.hypot(dx, dz), swing = 0, graze = 0;
        if (u.wait > 0) { u.wait -= dt; graze = 1.35; if (u.wait <= 0) u.target.set(4 + range(-3.4, 3.4), 0, 17 + range(-3.4, 3.4)); }
        else if (d > 0.3) { o.position.x += dx / d * dt * 0.8; o.position.z += dz / d * dt * 0.8; o.rotation.y = Math.atan2(dx, dz); swing = Math.sin(t * 5 + i) * 0.4; }
        else u.wait = range(3, 8);
        o.position.y = heightAt(o.position.x, o.position.z);
        u.neck.rotation.x = mix(u.neck.rotation.x, graze, Math.min(1, dt * 3));
        u.legs[0].rotation.x = u.legs[3].rotation.x = swing; u.legs[1].rotation.x = u.legs[2].rotation.x = -swing;
      }
      for (i = 0; i < birds.length; i++) {
        o = birds[i]; u = o.userData; o.visible = fair && cur.snow < 0.5; u.a += dt * u.sp;
        o.position.set(Math.cos(u.a) * u.r, u.h + Math.sin(t * 0.8 + i), Math.sin(u.a) * u.r); o.rotation.y = -u.a;
        flap = Math.sin(t * 7 + i * 2) * 0.6; u.wings[0].rotation.z = -flap; u.wings[1].rotation.z = flap;
      }
      for (i = 0; i < butterflies.length; i++) {
        o = butterflies[i]; u = o.userData; o.visible = fair && cur.snow < 0.1 && cur.wind < 0.9 && (event === 'berries' || i < 7);
        var a = u.a + t * u.sp * 2.4;
        o.position.set(u.home[0] + Math.cos(a) * 1.7 + Math.sin(t * 1.7 + i), 1.1 + Math.sin(t * 2.3 + i) * 0.5, u.home[1] + Math.sin(a * 1.3) * 1.7); o.rotation.y = -a;
        flap = Math.sin(t * 19 + i) * 1.05; u.wings[0].rotation.z = -flap; u.wings[1].rotation.z = flap;
      }
    }
    var dummy = new THREE.Object3D();
    function animateEffects(dt, t) {
      var i, p, s, u;
      for (i = 0; i < fireSprites.length; i++) {
        s = fireSprites[i]; u = s.userData; s.visible = fireOn; if (!fireOn) continue;
        u.life += dt * u.speed; if (u.life > 1) { u.life -= 1; u.a = Math.random() * 6.28; u.r = Math.random() * 0.38; }
        var k = u.life, sh = 1 - k * 0.8;
        s.position.set(Math.cos(u.a) * u.r * sh + cur.wind * k * k * 0.45, 0.3 + k * (1.7 - cur.rain * 0.5), Math.sin(u.a) * u.r * sh + cur.wind * k * k * 0.2);
        s.scale.set(0.72 * (1 - k * 0.65), 0.98 * (1 - k * 0.55), 1);
        s.material.color.setRGB(1, mix(0.62, 0.07, k), mix(0.18, 0.0, k)); s.material.opacity = Math.sin(Math.PI * Math.min(1, k * 0.85 + 0.12)) * 0.7;
      }
      for (i = 0; i < smokeSprites.length; i++) {
        s = smokeSprites[i]; u = s.userData; u.life += dt * 0.22; if (u.life > 1) u.life -= 1;
        var m = u.life;
        s.position.set(Math.sin(u.a + t * 0.6) * m * 0.6 + cur.wind * m * m * 4, 1.5 + m * 5.5, Math.cos(u.a + t * 0.4) * m * 0.6 + cur.wind * m * m * 1.8);
        s.scale.setScalar(0.5 + m * 2.2); s.material.opacity = Math.sin(Math.PI * m) * (fireOn ? 0.16 : 0.07);
      }
      p = embers.geometry.attributes.position; embers.visible = fireOn;
      for (i = 0; i < emberData.length; i++) {
        u = emberData[i]; u.life += dt * u.s; if (u.life > 1) { u.life = 0; u.a = Math.random() * 6.28; }
        p.setXYZ(i, Math.cos(u.a + u.life * 3) * u.r * (1 + u.life) + cur.wind * u.life * u.life * 2.4, 0.5 + u.life * 4, Math.sin(u.a + u.life * 3) * u.r * (1 + u.life) + cur.wind * u.life * u.life);
      }
      p.needsUpdate = true;
      var f = 1 + Math.sin(t * 11) * 0.12 + Math.sin(t * 23) * 0.08;
      fireLight.intensity = fireOn ? (18 + cur.night * 40) * f : 0;

      ripples.visible = cur.rain > 0.05;
      if (ripples.visible) {
        var c = tmpColor;
        for (i = 0; i < rippleData.length; i++) {
          u = rippleData[i]; u.life += dt * 2.4;
          if (u.life > 1) { u.life -= 1; var a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 12; u.x = focus.x + Math.cos(a) * r; u.z = focus.z + Math.sin(a) * r; }
          dummy.position.set(u.x, 0.07, u.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0.04 + u.life * 0.26); dummy.updateMatrix(); ripples.setMatrixAt(i, dummy.matrix);
          var b = (1 - u.life) * cur.rain * (0.45 - cur.night * 0.3); ripples.setColorAt(i, c.setRGB(b * 0.8, b * 0.9, b));
        }
        ripples.instanceMatrix.needsUpdate = true; ripples.instanceColor.needsUpdate = true;
      }
      leaves.visible = cur.wind > 0.9;
      if (leaves.visible) {
        for (i = 0; i < leafData.length; i++) {
          u = leafData[i]; u.x += dt * cur.wind * (5 + Math.sin(u.s)); u.z += dt * cur.wind * 2; u.y += Math.sin(t * 2.4 + u.s * 5) * dt * 1.5 - dt * 0.35;
          if (u.x > 28 || u.z > 28 || u.y < 0.1) { u.x = -28 + Math.random() * 30; u.z = -28 + Math.random() * 50; u.y = 0.5 + Math.random() * 8; }
          dummy.position.set(u.x, u.y, u.z); dummy.rotation.set(t * 3 + u.s, t * 2 + u.s * 2, u.s); dummy.scale.setScalar(1); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
        }
        leaves.instanceMatrix.needsUpdate = true;
      }
      fireflies.visible = cur.night > 0.5 && cur.rain < 0.1 && cur.snow < 0.1;
      if (fireflies.visible) {
        p = fireflies.geometry.attributes.position;
        for (i = 0; i < flyData.length; i++) { u = flyData[i]; var blink = Math.sin(t * 2 + u.s * 7) > -0.3; p.setXYZ(i, u.x + Math.sin(t * 0.5 + u.s) * 1.2, blink ? u.y + Math.sin(t * 0.9 + u.s * 3) * 0.5 : -20, u.z + Math.cos(t * 0.4 + u.s) * 1.2); }
        p.needsUpdate = true;
      }
      if (event === 'storm') {
        nextBolt -= dt; if (nextBolt <= 0) { nextBolt = range(5, 11); if (!calm) strike(); else Sound.thunder(0.2); }
      }
      flash = Math.max(0, flash - dt * 3.2); bolt.visible = flash > 0.55;
      for (i = floats.length - 1; i >= 0; i--) {
        var fo = floats[i]; fo.life -= dt;
        if (fo.life <= 0) { fo.el.remove(); floats.splice(i, 1); continue; }
        fo.pos.y += dt * 1.1;
        var pr = fo.pos.clone().project(camera);
        fo.el.style.transform = 'translate(' + ((pr.x * 0.5 + 0.5) * container.clientWidth) + 'px,' + ((-pr.y * 0.5 + 0.5) * renderer.domElement.clientHeight) + 'px)';
        fo.el.style.opacity = Math.min(1, fo.life / 0.5);
      }
    }
    function animateTrees(dt) {
      for (var i = 0; i < trees.length; i++) {
        var tr = trees[i]; if (tr.shake <= 0) continue;
        tr.shake -= dt; if (tr.hp > 0) setInstance(tr.im, tr.index, tr, 1, Math.sin(tr.shake * 45) * Math.max(0, tr.shake) * 0.12, 0);
      }
      for (var j = falling.length - 1; j >= 0; j--) {
        var f = falling[j]; f.t += dt; f.tip.rotation.x = Math.min(1.5, f.t * f.t * 1.4);
        if (f.t > 2.4) { scene.remove(f.g); falling.splice(j, 1); }
      }
    }
    var slow = 0, quality = 0;
    function adapt(raw) {   // drop detail automatically on weak devices
      if (raw > 0.2) return;
      slow = Math.max(0, slow + (raw > 0.036 ? raw : -raw));
      if (slow < 4 || quality > 1) return;
      slow = 0; quality++;
      if (quality === 1) { renderer.setPixelRatio(1); resize(); }
      else { sun.castShadow = false; grassMeshes.forEach(function (g) { g.count = Math.floor(g.count * 0.5); }); }
    }
    function frame() {
      var raw = clock.getDelta(), dt = Math.min(raw, 0.05);
      if (!onScreen && !isFull()) return;
      U.uTime.value += dt; var t = U.uTime.value;
      adapt(raw);
      if (play) { updatePlay(dt, t); }
      if (play) {
        focus.x += (me.position.x - focus.x) * Math.min(1, dt * 9); focus.z += (me.position.z - focus.z) * Math.min(1, dt * 9); focus.y = me.position.y + 1.5;
        var pf = Math.cos(pitch) * playDist;
        camera.position.set(focus.x + Math.cos(yaw) * pf, focus.y + Math.sin(pitch) * playDist, focus.z + Math.sin(yaw) * pf);
        camera.position.y = Math.max(camera.position.y, heightAt(camera.position.x, camera.position.z) + 1.2);
        camera.lookAt(focus.x, focus.y, focus.z);
        U.uCutW.value = 2.8; U.uCutT.value = 0.88;
      } else {
        focus.set(0, 1, 0);
        if (!calm && t > idleUntil) yaw += dt * 0.025;
        var ty = mix(6, 1, clamp((pitch - 0.1) / 0.8, 0, 1)), flat = Math.cos(pitch) * dist;
        camera.position.set(Math.cos(yaw) * flat, ty + Math.sin(pitch) * dist, Math.sin(yaw) * flat);
        camera.position.y = Math.max(camera.position.y, heightAt(camera.position.x, camera.position.z) + 3);
        camera.lookAt(0, ty, 0);
        U.uCutW.value = 13; U.uCutT.value = 0.45;
      }
      sky.position.copy(camera.position);
      U.uCam.value.set(camera.position.x, camera.position.z); U.uFocus.value.set(focus.x, focus.z);
      animateTrees(dt);
      applyLook(dt); animateVillagers(dt, t); animateLife(dt, t); animateEffects(dt, t); Sound.update(dt, t);
      if (builtMesh && builtMesh.scale.x < 1) builtMesh.scale.setScalar(Math.min(1, builtMesh.scale.x + dt * 0.8));
      renderer.render(scene, camera);
    }
    function fail(e) {
      if (window.console) console.error('Forest Village 3D stopped:', e);
      var lost = play && play.onFail; if (play) { play = null; container.classList.remove('fv-playing', 'fv-full'); document.body.classList.remove('fv-noscroll'); }
      failed = true; api.ok = false; if (renderer) renderer.setAnimationLoop(null); showFallback(); if (lost) lost();
    }
    function animate() { try { frame(); } catch (e) { fail(e); } }
    function spawnFloat(worldPos, text, color) {
      var layer = document.getElementById('fv-float'); if (!layer || floats.length > 24) return;
      var el = document.createElement('div'); el.className = 'fv-float-t'; el.textContent = text; el.style.color = color; layer.appendChild(el);
      floats.push({ el: el, pos: worldPos.clone().add(new THREE.Vector3(0, 2.2, 0)), life: 1.3 });
    }
    function discard(group) { group.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }
    function showStock(food, wood) {
      var nf = Math.min(foodStock.length, Math.ceil(Math.max(0, food) / 2)), nw = Math.min(logStock.length, Math.max(0, wood));
      foodStock.forEach(function (m, i) { m.visible = i < nf; });
      logStock.forEach(function (m, i) { m.visible = i < nw; });
    }

    /* ---------- walk-and-play mode: you are one villager and do one worker's job ---------- */
    var DAY_SECONDS = 90, HAMMER_HITS = 8, FIRE_HITS = 3;
    var play = null, me = null, meRing, targetRing, stumps = [], falling = [];
    var playDist = 8.5, saved = null, keys = {}, joy = { x: 0, y: 0, id: null }, held = false, ui = null;
    var focus = new THREE.Vector3(0, 1, 0);

    function buildPlayUI() {
      function div(cls, parent) { var d = document.createElement('div'); d.className = cls; (parent || container).appendChild(d); return d; }
      ui = {};
      ui.info = div('fv-g fv-g-info');
      ui.time = div('fv-g-time', ui.info); ui.job = div('fv-g-job', ui.info); ui.fore = div('fv-g-fore', ui.info);
      ui.toast = div('fv-g fv-g-toast');
      ui.prompt = div('fv-g fv-g-prompt');
      ui.map = document.createElement('canvas'); ui.map.className = 'fv-g fv-g-map'; ui.map.width = ui.map.height = 128; container.appendChild(ui.map);
      ui.joy = div('fv-g fv-g-joy'); ui.knob = div('fv-g-knob', ui.joy);
      ui.act = document.createElement('button'); ui.act.type = 'button'; ui.act.className = 'fv-g fv-g-act'; ui.act.textContent = '✋'; ui.act.setAttribute('aria-label', 'Action'); container.appendChild(ui.act);

      function moveJoy(e) {
        var b = ui.joy.getBoundingClientRect(), x = (e.clientX - b.left - b.width / 2) / (b.width * 0.36), y = (e.clientY - b.top - b.height / 2) / (b.height * 0.36);
        var l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
        joy.x = x; joy.y = y; ui.knob.style.transform = 'translate(' + (x * 34) + 'px,' + (y * 34) + 'px)';
      }
      function dropJoy(e) { if (e && e.pointerId !== joy.id) return; joy.x = joy.y = 0; joy.id = null; ui.knob.style.transform = ''; }
      ui.joy.addEventListener('pointerdown', function (e) { e.preventDefault(); joy.id = e.pointerId; if (ui.joy.setPointerCapture) ui.joy.setPointerCapture(e.pointerId); moveJoy(e); });
      ui.joy.addEventListener('pointermove', function (e) { if (e.pointerId === joy.id) moveJoy(e); });
      ui.joy.addEventListener('pointerup', dropJoy); ui.joy.addEventListener('pointercancel', dropJoy); ui.joy.addEventListener('lostpointercapture', dropJoy);
      ui.act.addEventListener('pointerdown', function (e) { e.preventDefault(); held = true; act(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { ui.act.addEventListener(n, function () { held = false; }); });
      ui.act.addEventListener('click', function (e) { if (e.detail === 0) act(); });   // keyboard / screen reader

      var MOVE = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
      window.addEventListener('keydown', function (e) {
        if (!play) return;
        if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); if (!held) { held = true; act(); } }
        else if (MOVE.indexOf(e.code) >= 0) { e.preventDefault(); keys[e.code] = true; }
      });
      window.addEventListener('keyup', function (e) { keys[e.code] = false; if (e.code === 'KeyE' || e.code === 'Space') held = false; });
      window.addEventListener('blur', clearInput);
    }
    function clearInput() { keys = {}; held = false; joy.x = joy.y = 0; joy.id = null; if (ui) ui.knob.style.transform = ''; }

    function buildPlayer() {
      me = makeVillager(2); me.scale.setScalar(1.08);
      var u = me.userData;
      mesh(new THREE.BoxGeometry(0.52, 0.72, 0.07), mat(0xd32f2f), 0, 0.3, -0.29, u.up);   // red cape
      meRing = new THREE.Mesh(new THREE.RingGeometry(0.52, 0.66, 28), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.85, depthWrite: false }));
      meRing.rotation.x = -Math.PI / 2; meRing.position.y = 0.06; me.add(meRing);
      me.visible = false; scene.add(me);
      targetRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
      targetRing.rotation.x = -Math.PI / 2; targetRing.visible = false; scene.add(targetRing);
    }

    function setInstance(im, i, r, scale, tiltX, tiltZ) {
      dummy.position.set(r.x, r.y, r.z); dummy.rotation.set((r.rx || 0) + (tiltX || 0), r.ry || 0, (r.rz || 0) + (tiltZ || 0));
      dummy.scale.set(r.s * scale, r.s * (r.sy || 1) * scale, r.s * scale); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.instanceMatrix.needsUpdate = true;
    }
    function resetWorld() {
      stumps.forEach(function (s) { scene.remove(s); discard(s); }); stumps = [];
      falling.forEach(function (f) { scene.remove(f.g); }); falling = [];
      trees.forEach(function (tr) { if (tr.hp < 3) setInstance(tr.im, tr.index, tr, 1); tr.hp = 3; tr.shake = 0; });
      bushState.forEach(function (b) { if (b.left < 3) showBerries(b, true); b.left = 3; });
    }
    function showBerries(b, on) {
      b.ranges.forEach(function (rg) { for (var i = rg.from; i < rg.to; i++) setInstance(rg.im, i, rg.list[i], on ? 1 : 0.001); });
    }
    function fellTree(tr) {
      setInstance(tr.im, tr.index, tr, 0.001);
      var away = Math.atan2(tr.x - me.position.x, tr.z - me.position.z);
      var g = new THREE.Group(), tip = new THREE.Group(), m = new THREE.Mesh(tr.im.geometry, tr.im.material);
      g.position.set(tr.x, tr.y, tr.z); g.rotation.y = away; g.add(tip); tip.add(m);
      m.rotation.y = tr.ry - away; m.scale.set(tr.s, tr.s * tr.sy, tr.s); m.castShadow = true; scene.add(g);
      falling.push({ g: g, tip: tip, t: 0 });
      var st = new THREE.Group(); st.position.set(tr.x, tr.y, tr.z); scene.add(st); stumps.push(st);
      mesh(cyl(0.24 * tr.s, 0.32 * tr.s, 0.4, 9), mat(0x5c3d22), 0, 0.2, 0, st);
      mesh(cyl(0.23 * tr.s, 0.23 * tr.s, 0.02, 9), mat(0xc19a68), 0, 0.41, 0, st);
    }

    function toast(text) { if (!play) return; ui.toast.textContent = text; ui.toast.style.opacity = 1; play.toast = 3.2; }

    /* what can I use from here? */
    function findTarget() {
      var best = null, bestD = 99, px = me.position.x, pz = me.position.z;
      function consider(kind, x, z, reach, radius, ref, label) {
        var d = Math.hypot(px - x, pz - z) - radius;
        if (d < reach && d < bestD) { bestD = d; best = { kind: kind, x: x, z: z, radius: radius, ref: ref, label: label }; }
      }
      if (play.elapsed > 4) consider('fire', 0, 0, 1.5, 1.15, null, 'Light the fire and END the day (' + play.fire + '/' + FIRE_HITS + ')');
      bushState.forEach(function (b) { if (b.left > 0) consider('bush', b.x, b.z, 1.25, 0.9, b, 'Pick berries'); });
      trees.forEach(function (tr) { if (tr.hp > 0) consider('tree', tr.x, tr.z, 1.25, 0.34 * tr.s, tr, 'Chop tree (' + tr.hp + ' left)'); });
      if (level.buildDay && play.hits < HAMMER_HITS) consider('site', SITE.x, SITE.z, 1.5, 1.6, null, 'Hammer the ' + level.build.name);
      return best;
    }
    function takeJob(job) {
      var names = { g: 'gathering food', w: 'chopping wood', b: 'building' };
      if (play.job && play.job !== job) { toast('Today you are ' + names[play.job] + '. One villager, one job!'); Sound.sfx('no'); return false; }
      if (job !== 'b' && play.got >= play.need[job]) { toast("Your day's work is done. Go to the fire to end the day."); Sound.sfx('no'); return false; }
      return true;
    }
    function act() {
      if (!play || play.cool > 0) return;
      var t = play.target; if (!t) return;
      var job = t.kind === 'bush' ? 'g' : (t.kind === 'tree' ? 'w' : (t.kind === 'site' ? 'b' : null));
      if (job && !takeJob(job)) { play.cool = 0.8; return; }
      play.cool = t.kind === 'bush' ? 0.55 : 0.75; play.swing = play.cool; play.pending = t;
      me.rotation.y = Math.atan2(t.x - me.position.x, t.z - me.position.z);
    }
    function land(t) {   // the moment the hand, axe or hammer connects
      var up = me.position.clone();
      if (t.kind === 'bush') {
        play.job = 'g'; play.got++; t.ref.left--; if (!t.ref.left) showBerries(t.ref, false);
        Sound.sfx('pick'); spawnFloat(up, '+1 🍎', '#9dffb4');
      } else if (t.kind === 'tree') {
        play.job = 'w'; play.got++; t.ref.hp--; t.ref.shake = 0.35; Sound.sfx('chop'); spawnFloat(up, '+1 🪵', '#ffd479');
        if (!t.ref.hp) { fellTree(t.ref); Sound.sfx('fall'); }
      } else if (t.kind === 'site') {
        play.job = 'b'; play.hits++; Sound.sfx('hammer'); spawnFloat(up, '🔨 ' + play.hits + '/' + HAMMER_HITS, '#ffd479');
        frameMesh.scale.set(1, 1 + play.hits * 0.04, 1);
      } else if (t.kind === 'fire') {
        play.fire++; Sound.sfx('spark'); spawnFloat(up, '✨ ' + play.fire + '/' + FIRE_HITS, '#ffb35a');
        if (play.fire >= FIRE_HITS) { finishPlay(); return; }
      }
      var done = play.job === 'b' ? play.hits >= HAMMER_HITS : (play.job && play.got >= play.need[play.job]);
      if (done && !play.told) { play.told = true; held = false; Sound.sfx('done'); toast('Job done! Walk to the campfire to end the day.'); }
      drawHud();
    }
    function myWork() {
      return { food: play.job === 'g' ? play.got : 0, wood: play.job === 'w' ? play.got : 0, builder: play.job === 'b' && play.hits >= HAMMER_HITS };
    }
    function finishPlay() {
      if (!play) return;
      var done = play.onDone, work = myWork();
      leavePlay(); done(work);
    }
    function leavePlay() {
      if (!play) return;
      play = null; clearInput();
      container.classList.remove('fv-playing'); setFull(false);
      targetRing.visible = false; me.visible = false; frameMesh.scale.set(1, 1, 1);
      if (saved) { yaw = saved.yaw; pitch = saved.pitch; dist = saved.dist; saved = null; }
    }

    function collide(p) {
      for (var n = 0; n < 2; n++) {
        var all = solids.concat(tentSolids);
        for (var i = 0; i < all.length; i++) {
          var c = all[i]; if (c.tree && c.tree.hp <= 0) continue;
          var dx = p.x - c.x, dz = p.z - c.z, min = c.r + 0.32, d = Math.hypot(dx, dz);
          if (d < min && d > 0.001) { p.x = c.x + dx / d * min; p.z = c.z + dz / d * min; }
        }
      }
      var r = Math.hypot(p.x, p.z); if (r > 29) { p.x *= 29 / r; p.z *= 29 / r; }
      var rx = riverX(p.z); if (p.x > rx - 3.3) p.x = rx - 3.3;
    }

    function updatePlay(dt, t) {
      play.elapsed += dt; play.cool = Math.max(0, play.cool - dt);
      if (play.toast > 0) { play.toast -= dt; if (play.toast <= 0) ui.toast.style.opacity = 0; }
      var sx = joy.x + (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      var sy = -joy.y + (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      var len = Math.hypot(sx, sy); if (len > 1) { sx /= len; sy /= len; len = 1; }
      var moving = len > 0.12 && play.swing <= 0;
      if (moving) {
        var fx = -Math.cos(yaw), fz = -Math.sin(yaw), mx = fx * sy - fz * sx, mz = fz * sy + fx * sx;
        var speed = (keys.ShiftLeft || keys.ShiftRight) ? 6.8 : 4.8;
        me.position.x += mx * speed * dt; me.position.z += mz * speed * dt; collide(me.position);
        var want = Math.atan2(mx, mz), diff = Math.atan2(Math.sin(want - me.rotation.y), Math.cos(want - me.rotation.y));
        me.rotation.y += diff * Math.min(1, dt * 12);
        if (t > idleUntil) yaw += sx * dt * 0.8;     // camera follows gently when you turn
        play.stepT -= dt * len; if (play.stepT <= 0) { play.stepT = 0.34; Sound.sfx('step'); }
      }
      me.position.y = heightAt(me.position.x, me.position.z);

      var u = me.userData, s = t * 10, aL = 0, aR = 0, lL = 0, lR = 0, lean = 0, bob = 0;
      if (play.swing > 0) {
        var before = play.swing; play.swing -= dt;
        var pt = play.pending, dur = pt.kind === 'bush' ? 0.55 : 0.75, k = clamp(1 - play.swing / dur, 0, 1);
        if (pt.kind === 'bush') { lean = Math.sin(k * Math.PI) * 0.75; aL = aR = -Math.sin(k * Math.PI) * 1.4; }
        else if (pt.kind === 'fire') { lean = 0.75; lL = -0.5; aL = -1.2 + Math.sin(t * 30) * 0.25; aR = -1.2 - Math.sin(t * 30) * 0.25; }
        else { aR = k < 0.55 ? -2.8 * Math.sin(k / 0.55 * Math.PI / 2) : -2.8 + (k - 0.55) / 0.45 * 2.3; aL = aR * 0.7; lean = k > 0.55 ? 0.35 : -0.1; }
        if (before > dur * 0.3 && play.swing <= dur * 0.3) { land(pt); if (!play) return; }
      } else if (moving) { lL = Math.sin(s) * 0.8; lR = -lL; aL = -lL * 0.8; aR = lL * 0.8; lean = 0.14; bob = Math.abs(Math.cos(s)) * 0.07; }
      else { aL = Math.sin(t * 1.5) * 0.05; aR = -aL; }
      u.legL.rotation.x = lL; u.legR.rotation.x = lR; u.armL.rotation.x = aL; u.armR.rotation.x = aR; u.up.rotation.x = lean; u.root.position.y = bob;

      var target = findTarget(); play.target = target;
      u.axe.visible = !!target && target.kind === 'tree' || play.job === 'w' && !(target && target.kind === 'site');
      u.hammer.visible = !!target && target.kind === 'site';
      u.basket.visible = play.job === 'g' || !!target && target.kind === 'bush';
      targetRing.visible = !!target;
      if (target) {
        targetRing.position.set(target.x, heightAt(target.x, target.z) + 0.09, target.z);
        targetRing.scale.setScalar((target.radius + 0.35) * (1 + Math.sin(t * 6) * 0.05));
        ui.prompt.textContent = (matchTouch() ? '✋ ' : 'E  ·  ') + target.label; ui.prompt.style.opacity = 1;
      } else ui.prompt.style.opacity = 0;
      ui.act.classList.toggle('ready', !!target);
      if (held && play.cool <= 0 && target && target.kind !== 'fire') act();   // hold to keep working

      play.hudT -= dt; if (play.hudT <= 0) { play.hudT = 0.2; drawHud(); drawMap(); }
      if (play.elapsed >= DAY_SECONDS) finishPlay();
    }
    function matchTouch() { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); }

    function drawHud() {
      if (!play) return;
      var left = Math.max(0, Math.ceil(DAY_SECONDS - play.elapsed)), R = play.preview(myWork()), job;
      ui.time.textContent = (left < 20 ? '🌇 ' : '☀️ ') + 'Daylight ' + Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2);
      if (play.job === 'g') job = '🧺 Your food: ' + play.got + ' / ' + play.need.g;
      else if (play.job === 'w') job = '🪓 Your wood: ' + play.got + ' / ' + play.need.w;
      else if (play.job === 'b') job = '🔨 Your hammering: ' + play.hits + ' / ' + HAMMER_HITS;
      else job = 'Pick ONE job: berries' + (level.buildDay ? ', trees or building' : ' or trees');
      ui.job.textContent = job;
      var goal = level.buildDay
        ? level.build.name + ': ' + (R.built ? '✅ will be built' : '❌ not yet') + ' · 🍎 ' + R.endFood + ' (need ' + level.goalFoodEnd + ')'
        : '🍎 ' + R.endFood + ' (need ' + level.goalFoodEnd + ') · 🪵 ' + R.endWood + ' (need ' + level.goalWoodEnd + ')';
      ui.fore.textContent = 'Left tonight, with team: ' + goal + (R.fireLit ? '' : ' · 🔥 not enough wood');
    }
    function drawMap() {
      var g = ui.map.getContext('2d'); if (!g || !g.arc) return;
      var S = 2.1, fx = -Math.cos(yaw), fz = -Math.sin(yaw);
      function pt(x, z, edge) {
        var dx = x - me.position.x, dz = z - me.position.z, px = (-fz * dx + fx * dz) * S, py = -(fx * dx + fz * dz) * S, l = Math.hypot(px, py);
        if (l > 56) { if (!edge) return null; px *= 56 / l; py *= 56 / l; }
        return [64 + px, 64 + py];
      }
      function dot(x, z, r, c, edge) { var p = pt(x, z, edge); if (!p) return; g.fillStyle = c; g.beginPath(); g.arc(p[0], p[1], r, 0, 6.2832); g.fill(); }
      g.clearRect(0, 0, 128, 128); g.fillStyle = 'rgba(10,30,20,0.72)'; g.beginPath(); g.arc(64, 64, 63, 0, 6.2832); g.fill();
      for (var z = -40; z <= 40; z += 2) dot(riverX(z), z, 4, '#3d8fb5');
      trees.forEach(function (tr) { if (tr.hp > 0) dot(tr.x, tr.z, 1.7, '#5f9e52'); });
      bushState.forEach(function (b) { if (b.left) dot(b.x, b.z, 3.4, '#ff5fa2', play.job === 'g'); });
      dot(-9.5, -6.5, 3.4, '#ff5fa2', true);
      if (level.buildDay) dot(SITE.x, SITE.z, 5, '#6cc7ff', true);
      dot(0, 0, 5, '#ff9a2e', true);
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(64, 56); g.lineTo(69, 69); g.lineTo(59, 69); g.fill();
    }

    api.play = function (opts) {
      if (!api.ok || play) return false;
      try {
        if (opts.level && opts.level !== level) api.showVillage(opts.level);   // keep 3D and game on the same day
        if (opts.assign) api.setJobs(opts.assign, level);
        resetWorld();
        saved = { yaw: yaw, pitch: pitch, dist: dist };
        yaw = Math.PI / 2; pitch = 0.36; playDist = 8.5; fireOn = false; working = true; night = false; idleUntil = 0;
        play = { elapsed: 0, job: null, got: 0, hits: 0, fire: 0, cool: 0, swing: 0, pending: null, target: null, toast: 0, hudT: 0, stepT: 0, told: false,
          need: opts.yields, preview: opts.preview, onDone: opts.onDone, onFail: opts.onFail };
        villagers.forEach(function (v, i) { v.visible = i < level.villagers - 1; });
        me.position.set(0, 0, 4.2); me.rotation.y = Math.PI; me.visible = true; focus.set(0, 1.5, 4.2);
        clearInput(); container.classList.add('fv-playing'); setFull(true);
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        Sound.start();
        toast(matchTouch() ? 'Move with the stick. Tap ✋ to work. Drag to look around.' : 'Move: W A S D · Work: E or Space · Look: drag the mouse');
        play.toast = 6;
        drawHud();
        return true;
      } catch (e) { fail(e); return false; }
    };
    api.endPlay = function () { if (play) { try { finishPlay(); } catch (e) { fail(e); } } };

    /* ---------- the calls the game uses ---------- */
    api.showVillage = function (L) {
      if (failed) { showFallback(); return; }
      try {
        if (!api.ok && !buildScene()) { showFallback(); return; }
        leavePlay(); resetWorld(); tentSolids = [];
        level = L; night = false; working = false; fireOn = true; flash = 0; nextBolt = 1.8;
        event = L ? L.event : 'clear';
        berryExtra.visible = event === 'berries';
        while (tentGroup.children.length) { discard(tentGroup.children[0]); tentGroup.remove(tentGroup.children[0]); }
        if (builtMesh) { discard(builtMesh); scene.remove(builtMesh); builtMesh = null; }
        frameMesh.visible = !!(L && L.buildDay);
        var tents = L ? Math.max(1, Math.ceil(L.shelterStart / 2)) : 3;
        for (var i = 0; i < tents; i++) {
          var tm = makeTent(), a = 2.4 + i * (tents > 1 ? 2.55 / (tents - 1) : 0), r = 5.8;
          tm.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); tm.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)); tm.scale.setScalar(0.88); tentGroup.add(tm); tentSolids.push({ x: tm.position.x, z: tm.position.z, r: 0.75 });
        }
        showStock(L ? L.startFood : 8, L ? L.startWood : 8);
        villagers.forEach(function (v, i) { v.visible = !L || i < L.villagers; send(v, 'home', spots.home[i]); });
      } catch (e) { fail(e); }
    };
    api.setJobs = function (assign, L) {
      if (!api.ok) return;
      try {
        var idx = 0;
        [['gather', assign.g], ['wood', assign.w], ['build', assign.b]].forEach(function (j) {
          for (var k = 0; k < j[1] && idx < villagers.length; k++, idx++) send(villagers[idx], j[0], spots[j[0]][k % spots[j[0]].length]);
        });
        for (; idx < villagers.length; idx++) send(villagers[idx], 'home', spots.home[idx]);
        frameMesh.visible = !!(L && L.buildDay);
      } catch (e) { fail(e); }
    };
    api.setWorking = function (on) { working = on; };
    api.setNight = function (R) {
      if (!api.ok) return;
      try {
        working = false; night = true; fireOn = R.fireLit;
        showStock(R.endFood, R.endWood);
        if (R.built && level && level.build) {
          builtMesh = level.build.name === 'Hut' ? makeHut() : makeTent();
          builtMesh.position.set(SITE.x, 0, SITE.z); builtMesh.rotation.y = Math.atan2(-SITE.x, -SITE.z);
          builtMesh.scale.setScalar(0.01); scene.add(builtMesh); frameMesh.visible = false;
        }
        villagers.forEach(function (v, i) { v.visible = !level || i < level.villagers; send(v, 'home', spots.home[i]); });
      } catch (e) { fail(e); }
    };
    return api;
  })();
  window.FV3D = FV3D;
})();
