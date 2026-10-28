/* Daily Word Guess — Wisely Arcade: one word a day for everyone, plus a
   100-level climb (4 letters → 7 letters). Green = right place, gold =
   right letter wrong place, grey = not in the word. Progress lives in
   localStorage only (wg_ keys). Word lists: common, family-safe words. */
(function () {
  'use strict';

  /* ---------------- Answer word lists (common words only) ------------- */
  var WORDS4 = [
    'able', 'acid', 'aged', 'also', 'area', 'army', 'away', 'baby', 'back', 'bake', 'ball', 'band',
    'bank', 'bark', 'barn', 'base', 'bath', 'bead', 'beam', 'bean', 'bear', 'beat', 'bell', 'belt',
    'bend', 'bent', 'best', 'bill', 'bird', 'bite', 'blow', 'blue', 'boat', 'body', 'boil', 'bold',
    'bolt', 'bond', 'bone', 'book', 'boot', 'born', 'boss', 'both', 'bowl', 'bulk', 'bull', 'burn',
    'bush', 'busy', 'cafe', 'cage', 'cake', 'calm', 'camp', 'cane', 'cape', 'card', 'care', 'cart',
    'case', 'cash', 'cast', 'cave', 'cell', 'cent', 'city', 'clam', 'clay', 'club', 'clue', 'coal',
    'coat', 'code', 'coil', 'cold', 'comb', 'come', 'cone', 'cook', 'cool', 'copy', 'cord', 'core',
    'corn', 'cost', 'cozy', 'crab', 'crew', 'crib', 'crop', 'crow', 'cube', 'curb', 'cure', 'cute',
    'dart', 'dash', 'data', 'date', 'dawn', 'dead', 'deal', 'dean', 'dear', 'debt', 'deck', 'deed',
    'deep', 'deer', 'desk', 'dial', 'dice', 'diet', 'dirt', 'dish', 'disk', 'dock', 'does', 'doll',
    'dome', 'done', 'door', 'dose', 'down', 'drag', 'draw', 'drip', 'drop', 'drum', 'dual', 'duck',
    'duct', 'dude', 'dull', 'dump', 'dune', 'dusk', 'dust', 'duty', 'each', 'earn', 'ears', 'ease',
    'east', 'easy', 'echo', 'edge', 'edit', 'else', 'emit', 'epic', 'even', 'ever', 'evil', 'exam',
    'exit', 'face', 'fact', 'fade', 'fail', 'fair', 'fall', 'fame', 'farm', 'fast', 'fate', 'fear',
    'feat', 'feed', 'feel', 'feet', 'fell', 'felt', 'fern', 'file', 'fill', 'film', 'find', 'fine',
    'fire', 'firm', 'fish', 'fist', 'five', 'flag', 'flat', 'flea', 'flee', 'flow', 'foam', 'foil',
    'fold', 'folk', 'fond', 'font', 'food', 'fool', 'foot', 'ford', 'fork', 'form', 'fort', 'foul',
    'four', 'free', 'frog', 'from', 'fuel', 'full', 'fund', 'game', 'gate', 'gave', 'gear', 'gift',
    'girl', 'give', 'glad', 'goal', 'goat', 'goes', 'gold', 'golf', 'gone', 'good', 'gore', 'grab',
    'gray', 'grin', 'grit', 'grow', 'gulp', 'guru', 'hail', 'hair', 'half', 'hall', 'hand', 'hang',
    'hard', 'harm', 'harp', 'hate', 'have', 'hawk', 'head', 'heal', 'heap', 'hear', 'heat', 'heel',
    'held', 'help', 'herb', 'herd', 'here', 'hero', 'hers', 'hide', 'high', 'hill', 'hint', 'hire',
    'hold', 'hole', 'holy', 'home', 'hood', 'hook', 'hope', 'horn', 'hose', 'host', 'hour', 'howl',
    'huge', 'hunt', 'hurt', 'hush', 'icon', 'idea', 'idle', 'inch', 'into', 'iron', 'isle', 'item',
    'jazz', 'jean', 'jerk', 'join', 'joke', 'jump', 'june', 'junk', 'jury', 'just', 'keen', 'keep',
    'kick', 'kind', 'king', 'kiss', 'kite', 'knee', 'knew', 'knot', 'know', 'lady', 'laid', 'lake',
    'lamb', 'lamp', 'land', 'lane', 'last', 'late', 'lava', 'lawn', 'lazy', 'lead', 'leaf', 'leak',
    'lean', 'leap', 'left', 'lend', 'lens', 'less', 'lick', 'life', 'lift', 'like', 'limb', 'lime',
    'line', 'link', 'lion', 'list', 'live', 'load', 'loaf', 'loan', 'lock', 'lone', 'long', 'look',
    'loop', 'lose', 'loss', 'lost', 'loud', 'love', 'luck', 'lung', 'lure', 'lush', 'maid', 'mail',
    'main', 'make', 'male', 'mall', 'malt', 'many', 'mare', 'mark', 'mars', 'mask', 'mass', 'mate',
    'math', 'maze', 'meal', 'mean', 'meat', 'meet', 'melt', 'memo', 'menu', 'mere', 'mesh', 'mess',
    'mice', 'mild', 'mile', 'milk', 'mill', 'mind', 'mine', 'mint', 'mist', 'mite', 'mode', 'mold',
    'mole', 'monk', 'mood', 'moon', 'moor', 'more', 'moss', 'most', 'moth', 'move', 'much', 'mule',
    'muse', 'mush', 'must', 'mute', 'myth', 'nail', 'name', 'nape', 'navy', 'near', 'neat', 'neck',
    'need', 'nest', 'news', 'next', 'nice', 'nick', 'nine', 'none', 'noon', 'norm', 'nose', 'note',
    'noun', 'nude', 'oath', 'odor', 'omit', 'once', 'only', 'open', 'oral', 'oval', 'oven', 'over',
    'pace', 'pack', 'pact', 'page', 'paid', 'pain', 'pair', 'pale', 'palm', 'park', 'part', 'pass',
    'past', 'path', 'pave', 'peak', 'pear', 'peas', 'peek', 'peel', 'peep', 'peer', 'perk', 'pest',
    'pick', 'pier', 'pile', 'pill', 'pink', 'pipe', 'plan', 'play', 'plea', 'plot', 'plow', 'ploy',
    'plug', 'plum', 'plus', 'poem', 'poet', 'pole', 'poll', 'pond', 'pool', 'poor', 'pore', 'pork',
    'port', 'pose', 'post', 'pour', 'pout', 'pray', 'puff', 'pull', 'pulp', 'pump', 'pure', 'push',
    'quit'
  ];

  var WORDS5 = [
    'about', 'above', 'abuse', 'actor', 'acute', 'admit', 'adopt', 'adult', 'after', 'again', 'agent', 'agree',
    'ahead', 'alarm', 'album', 'alert', 'algae', 'alike', 'alive', 'allow', 'alloy', 'alone', 'aloud', 'alpha',
    'alter', 'amber', 'amend', 'among', 'ample', 'amuse', 'angel', 'angle', 'angry', 'ankle', 'apart', 'apple',
    'apply', 'apron', 'arena', 'argue', 'arise', 'armor', 'aroma', 'array', 'arrow', 'aside', 'asset', 'attic',
    'audio', 'audit', 'avail', 'avoid', 'awake', 'award', 'aware', 'awful', 'bacon', 'badge', 'bagel', 'baker',
    'basic', 'basil', 'basin', 'basis', 'bathe', 'beach', 'beard', 'beast', 'began', 'beige', 'being', 'below',
    'bench', 'berry', 'bible', 'bidet', 'bigot', 'binge', 'birth', 'black', 'blade', 'blame', 'blank', 'blast',
    'blaze', 'bleak', 'bleed', 'blend', 'bless', 'blind', 'blink', 'bliss', 'block', 'blond', 'blood', 'bloom',
    'blues', 'bluff', 'blunt', 'board', 'boast', 'bonus', 'boost', 'botch', 'bound', 'brace', 'brain', 'brake',
    'brand', 'brass', 'brave', 'bread', 'break', 'breed', 'bribe', 'brick', 'bride', 'brief', 'bring', 'brink',
    'brisk', 'broad', 'broil', 'broke', 'brood', 'brook', 'broom', 'brown', 'brush', 'build', 'bunch', 'burst',
    'buyer', 'cabin', 'cable', 'cache', 'camel', 'cameo', 'canal', 'candy', 'canoe', 'cargo', 'carol', 'carry',
    'catch', 'cause', 'cease', 'cedar', 'chain', 'chair', 'chalk', 'chaos', 'charm', 'chart', 'chase', 'cheap',
    'check', 'cheek', 'cheer', 'chess', 'chest', 'chief', 'child', 'chill', 'chime', 'choir', 'choke', 'chord',
    'chore', 'chunk', 'churn', 'cider', 'cigar', 'civic', 'civil', 'claim', 'clamp', 'clash', 'clasp', 'class',
    'clean', 'clear', 'clerk', 'click', 'cliff', 'climb', 'cloak', 'clock', 'clone', 'close', 'cloth', 'cloud',
    'clove', 'clump', 'coach', 'coast', 'cobra', 'color', 'comic', 'coral', 'couch', 'cough', 'could', 'count',
    'coupe', 'court', 'cover', 'crack', 'craft', 'crane', 'crank', 'crash', 'crate', 'crave', 'crawl', 'crazy',
    'creak', 'cream', 'creek', 'creep', 'crest', 'cried', 'crime', 'crisp', 'cross', 'crowd', 'crown', 'crude',
    'cruel', 'crumb', 'crush', 'crust', 'curio', 'curse', 'curve', 'cycle', 'daddy', 'daily', 'dairy', 'daisy',
    'dance', 'death', 'decay', 'delay', 'delta', 'demur', 'dense', 'depot', 'depth', 'derby', 'deter', 'devil',
    'diary', 'digit', 'dirty', 'disco', 'ditch', 'dizzy', 'dodge', 'donor', 'doubt', 'dough', 'dozen', 'draft',
    'drain', 'drake', 'drama', 'drank', 'drape', 'drawn', 'dread', 'dream', 'dress', 'drift', 'drill', 'drink',
    'drive', 'drool', 'droop', 'drove', 'drown', 'drunk', 'dummy', 'dutch', 'dwarf', 'dwell', 'dwelt', 'dying',
    'eager', 'eagle', 'early', 'earth', 'easel', 'eerie', 'eight', 'eject', 'elbow', 'elder', 'elect', 'elite',
    'elope', 'elude', 'email', 'empty', 'enact', 'enemy', 'enjoy', 'enrol', 'enter', 'entry', 'envoy', 'equal',
    'equip', 'erase', 'erect', 'error', 'essay', 'evade', 'event', 'every', 'evict', 'evoke', 'exact', 'excel',
    'exile', 'exist', 'expel', 'extra', 'exult', 'facet', 'faint', 'faith', 'false', 'fancy', 'fatal', 'fault',
    'favor', 'feast', 'fence', 'fetch', 'fever', 'fiber', 'field', 'fiery', 'fifth', 'fight', 'final', 'first',
    'flake', 'flame', 'flank', 'flare', 'flash', 'fleet', 'flesh', 'flick', 'fling', 'flint', 'flirt', 'float',
    'flood', 'floor', 'flour', 'fluid', 'flush', 'focus', 'force', 'forum', 'found', 'frame', 'fresh', 'frost',
    'frown', 'fruit', 'funny', 'gauge', 'ghost', 'giant', 'glass', 'glide', 'glory', 'glove', 'grace', 'grade',
    'grain', 'grant', 'grape', 'grasp', 'grass', 'grave', 'great', 'green', 'greet', 'grief', 'group', 'guard',
    'guess', 'guest', 'guide', 'habit', 'handy', 'happy', 'heart', 'heavy', 'hedge', 'hello', 'honor', 'horse',
    'hotel', 'house', 'hover', 'human', 'humor', 'hurry', 'ideal', 'image', 'imply', 'index', 'inner', 'input',
    'issue', 'jeans', 'jelly', 'jewel', 'joint', 'judge', 'juice', 'kneel', 'knife', 'knock', 'label', 'labor',
    'laden', 'lance', 'lapel', 'lapse', 'large', 'latch', 'later', 'laugh', 'layer', 'learn', 'lease', 'leash',
    'least', 'leave', 'ledge', 'leech', 'legal', 'lemon', 'level', 'light', 'limit', 'linen', 'liter', 'liver',
    'lobby', 'local', 'lodge', 'logic', 'loose', 'lover', 'loyal', 'lunar', 'lunch', 'lurch', 'lying', 'lyric',
    'macaw', 'magic', 'major', 'maple', 'march', 'marry', 'marsh', 'match', 'maybe', 'mayor', 'medal', 'media',
    'medic', 'melon', 'mercy', 'merge', 'merit', 'merry', 'metal', 'meter', 'metro', 'micro', 'might', 'minor',
    'minus', 'mirth', 'miser', 'model', 'moist', 'molar', 'money', 'month', 'moose', 'moral', 'motel', 'motor',
    'motto', 'mound', 'mount', 'mouse', 'mouth', 'movie', 'mower', 'muddy'
  ];

  var WORDS6 = [
    'abroad', 'absent', 'absorb', 'access', 'accuse', 'across', 'action', 'active', 'adjust', 'admire', 'advice', 'advise',
    'affair', 'affect', 'afraid', 'agency', 'agenda', 'almost', 'always', 'amount', 'anchor', 'animal', 'annual', 'answer',
    'appeal', 'appear', 'around', 'arrest', 'arrive', 'artist', 'asleep', 'aspect', 'assert', 'assess', 'assign', 'assist',
    'assume', 'assure', 'attach', 'attack', 'attain', 'attend', 'author', 'autumn', 'avenue', 'banana', 'banner', 'barrel',
    'basket', 'battle', 'beauty', 'become', 'beetle', 'before', 'behave', 'behind', 'belief', 'belong', 'beside', 'bestow',
    'betray', 'better', 'beyond', 'bishop', 'bitter', 'border', 'borrow', 'bottle', 'bottom', 'bounce', 'branch', 'breath',
    'breeze', 'bridge', 'bright', 'bronze', 'brutal', 'bubble', 'bucket', 'budget', 'bullet', 'bundle', 'burden', 'burger',
    'butter', 'button', 'camera', 'campus', 'cancel', 'cancer', 'candle', 'canvas', 'carbon', 'career', 'carpet', 'castle',
    'casual', 'cattle', 'cellar', 'center', 'chance', 'change', 'charge', 'cheese', 'cherry', 'choice', 'choose', 'church',
    'cinema', 'circle', 'clause', 'clever', 'client', 'clinic', 'coffee', 'collar', 'colony', 'column', 'combat', 'comedy',
    'common', 'corner', 'county', 'couple', 'course', 'cousin', 'create', 'credit', 'crisis', 'critic', 'cruise', 'custom',
    'damage', 'danger', 'dealer', 'debate', 'decade', 'decide', 'defeat', 'defect', 'define', 'degree', 'demand', 'dental',
    'depart', 'depend', 'deputy', 'derive', 'desert', 'design', 'detail', 'detect', 'device', 'dialog', 'differ', 'digest',
    'dinner', 'direct', 'divide', 'doctor', 'domain', 'donate', 'double', 'editor', 'effort', 'either', 'embody', 'emerge',
    'empire', 'employ', 'enable', 'encore', 'endure', 'energy', 'engage', 'engine', 'enough', 'enrich', 'ensure', 'entire',
    'escape', 'estate', 'ethnic', 'exceed', 'except', 'excite', 'excuse', 'expect', 'expert', 'expire', 'export', 'extend',
    'fabric', 'factor', 'family', 'famous', 'farmer', 'father', 'fellow', 'female', 'fierce', 'figure', 'finger', 'finish',
    'fiscal', 'flavor', 'flight', 'fluent', 'follow', 'forbid', 'forest', 'forget', 'formal', 'former', 'fossil', 'foster',
    'freeze', 'french', 'friend', 'frozen', 'future', 'gadget', 'galaxy', 'garage', 'garden', 'garlic', 'gather', 'gender',
    'genius', 'gentle', 'glance', 'global', 'gossip', 'govern', 'ground', 'growth', 'guilty', 'guitar', 'handle', 'happen',
    'harbor', 'hardly', 'hazard', 'health', 'heaven', 'height', 'helmet', 'hidden', 'hockey', 'honest', 'horror', 'hunger',
    'hybrid', 'ignore', 'immune', 'impact', 'import', 'impose', 'income', 'indoor', 'infant', 'infect', 'inject', 'injury',
    'insect', 'inside', 'insist', 'insult', 'intact', 'intake', 'intend', 'invent', 'invest', 'invite', 'island', 'jacket',
    'jaguar', 'jungle', 'junior', 'launch', 'leader', 'league', 'legend', 'length', 'lesson', 'letter', 'likely', 'linger',
    'liquid', 'listen', 'little', 'lonely', 'lumber', 'mammal', 'manage', 'manner', 'manual', 'marble', 'margin', 'marine',
    'market', 'marvel', 'master', 'matter', 'mature', 'member', 'memory', 'menace', 'mental', 'mentor', 'method', 'middle',
    'mingle', 'mirror', 'mobile', 'modest', 'moment', 'monkey', 'mother', 'motion', 'muffin', 'mumble', 'murder', 'muscle',
    'museum', 'mutual', 'narrow', 'nation', 'native', 'nature', 'notice', 'notion', 'number', 'object', 'obtain', 'occupy',
    'office', 'oppose', 'option', 'orange', 'origin', 'outfit', 'output', 'outset', 'oxygen', 'palace', 'parade', 'parcel',
    'pardon', 'parent', 'patrol', 'patron', 'peanut', 'pencil', 'people', 'pepper', 'period', 'permit', 'person', 'phrase',
    'picnic', 'pigeon', 'planet', 'player', 'please', 'plenty', 'plural', 'pocket', 'police', 'policy', 'potato', 'powder',
    'praise', 'prefer', 'pretty', 'priest', 'prince', 'prison', 'profit', 'proper', 'public', 'purple', 'pursue', 'puzzle',
    'quaint', 'rabbit', 'random', 'rather', 'rattle', 'ravage', 'reason', 'recall', 'recent', 'recipe', 'reckon', 'record',
    'reduce', 'reform', 'refuge', 'regard', 'regime', 'region', 'regret', 'reject', 'relate', 'relief', 'remain', 'remark',
    'remedy', 'remind', 'remote', 'repair', 'repeat', 'report', 'rescue', 'reside', 'resist', 'resort', 'result', 'resume',
    'retain', 'retire', 'return', 'reveal', 'review', 'reward', 'rhythm', 'ribbon', 'robust', 'rocket', 'rookie', 'rustic',
    'sacred', 'saddle', 'sahara', 'salary', 'salute', 'sample', 'scheme', 'school', 'scrape', 'scream', 'screen', 'script',
    'sculpt', 'search', 'season', 'second', 'secret', 'secure', 'select', 'senior', 'sequel', 'series', 'settle', 'severe',
    'shadow', 'shield', 'shower', 'shrewd', 'shrimp', 'shrink', 'shroud', 'signal', 'silver', 'simple', 'single', 'sister',
    'sketch', 'slight', 'slogan', 'smooth', 'snatch', 'sneeze', 'snooze', 'soccer', 'social', 'sorrow', 'source', 'sphere',
    'spider', 'spirit', 'splash', 'spleen', 'spouse', 'spread', 'spring', 'sprout', 'spruce', 'square', 'squash', 'squeak',
    'squeal', 'stable', 'statue', 'status', 'steady', 'stereo', 'sticky', 'strain', 'strand', 'streak', 'stream', 'street',
    'stress', 'stride', 'strife', 'strike', 'string', 'stripe', 'strive', 'stroke', 'stroll', 'strong', 'studio', 'stupid',
    'submit', 'sudden', 'suffer', 'summer', 'supper', 'supply', 'survey', 'symbol', 'system', 'tackle', 'tactic', 'talent',
    'target', 'tattoo', 'tavern', 'techie', 'temper', 'temple', 'tenant', 'terror', 'theory', 'thirst', 'thirty', 'threat',
    'thrill', 'thrive', 'throat', 'throne', 'throng', 'thrust', 'thwart', 'ticket', 'timber', 'tomato', 'tongue', 'toward',
    'tragic', 'travel', 'treaty', 'trench', 'trivia', 'trophy', 'tumble', 'tunnel', 'turkey', 'turnip', 'turtle', 'twelve',
    'twenty', 'tyrant', 'unable', 'unborn', 'uncoil', 'uncork', 'uncurl', 'undead', 'undeaf'
  ];

  var WORDS7 = [
    'ability', 'absence', 'academy', 'account', 'achieve', 'acquire', 'actress', 'advance', 'advisor', 'against', 'airport', 'alcohol',
    'algebra', 'allergy', 'already', 'amateur', 'amazing', 'analyze', 'ancient', 'another', 'anxiety', 'anxious', 'apology', 'apparel',
    'appoint', 'approve', 'archive', 'arrange', 'arrival', 'article', 'ashamed', 'assault', 'athlete', 'attempt', 'attract', 'auction',
    'average', 'balance', 'bandage', 'banking', 'bargain', 'barrier', 'battery', 'because', 'bedroom', 'believe', 'benefit', 'besides',
    'bicycle', 'bidding', 'biology', 'blanket', 'brother', 'builder', 'captain', 'careful', 'cartoon', 'channel', 'chapter', 'charity',
    'chicken', 'citizen', 'classic', 'climate', 'college', 'comfort', 'company', 'compass', 'concert', 'control', 'cottage', 'council',
    'country', 'courage', 'diamond', 'dolphin', 'drawing', 'evening', 'factory', 'feather', 'feature', 'fiction', 'fortune', 'forward',
    'freedom', 'friends', 'general', 'genuine', 'giraffe', 'glasses', 'harvest', 'holiday', 'horizon', 'however', 'hundred', 'husband',
    'journey', 'kitchen', 'lantern', 'library', 'lobster', 'machine', 'manager', 'message', 'morning', 'musical', 'mystery', 'natural',
    'network', 'octopus', 'officer', 'outside', 'painter', 'penguin', 'picture', 'plastic', 'popular', 'rainbow', 'reading', 'science',
    'several', 'snowman', 'soldier', 'someone', 'station', 'success', 'teacher', 'thunder', 'tonight', 'tractor', 'uniform', 'village',
    'volcano', 'weather', 'wedding', 'weekend', 'welcome', 'western', 'written', 'younger'
  ];
  var LISTS = { 4: WORDS4, 5: WORDS5, 6: WORDS6, 7: WORDS7 };
  var MAX_LEVEL = 100;

  /* ---------------- deterministic helpers ---------------- */
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function seeded(seed) {
    var t = seed >>> 0;
    return function () { t = (t * 1664525 + 1013904223) >>> 0; return t / 4294967296; };
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dailyWordFor(key) { return WORDS5[hashStr('wg-daily-' + key) % WORDS5.length]; }
  function bandFor(level) {
    if (level <= 25) return { len: 4, tries: 5 };
    if (level <= 50) return { len: 5, tries: 6 };
    if (level <= 75) return { len: 6, tries: 6 };
    return { len: 7, tries: 6 };
  }
  function levelWord(level) {
    var b = bandFor(level), list = LISTS[b.len];
    var rng = seeded(level * 7919 + 1013);
    return list[Math.floor(rng() * list.length)];
  }

  /* -------- scoring: the classic duplicate-letter rule --------
     Pass 1 marks greens and pools the answer's remaining letters;
     pass 2 hands out golds only while the pool still holds that letter. */
  function scoreGuess(guess, answer) {
    var n = answer.length, res = [], pool = {}, i;
    for (i = 0; i < n; i++) res.push('grey');
    for (i = 0; i < n; i++) {
      if (guess[i] === answer[i]) res[i] = 'green';
      else pool[answer[i]] = (pool[answer[i]] || 0) + 1;
    }
    for (i = 0; i < n; i++) {
      if (res[i] !== 'green' && pool[guess[i]] > 0) { res[i] = 'gold'; pool[guess[i]]--; }
    }
    return res;
  }

  /* ---------------- storage (never throws) ---------------- */
  function lsGet(k, dflt) { try { var v = localStorage.getItem(k); return v === null ? dflt : v; } catch (e) { return dflt; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------------- DOM ---------------- */
  function el(id) { return document.getElementById(id); }
  var boardEl = el('wg-board'), kbEl = el('wg-kb'), msgEl = el('wg-msg');
  var overlay = el('wg-done'), doneTitle = el('wg-done-title'), doneStats = el('wg-done-stats');
  var primaryBtn = el('wg-primary'), secondaryBtn = el('wg-secondary');

  /* ---------------- state ---------------- */
  var mode = 'daily';
  var cur = 1, unlocked = 1, starMap = {};
  try {
    unlocked = parseInt(lsGet('wg_unlocked', '1'), 10) || 1;
    starMap = JSON.parse(lsGet('wg_stars', '{}') || '{}');
  } catch (e) { starMap = {}; }
  if (unlocked < 1) unlocked = 1; if (unlocked > MAX_LEVEL) unlocked = MAX_LEVEL;
  var S = null;          // {answer, len, maxTries, guesses:[], scores:[], current:'', status}
  var keyState = {};     // letter -> best colour this round
  var busy = false;      // true while tiles are flipping

  function setMsg(t) { msgEl.textContent = t; }
  function totalStars() { var s = 0; for (var k in starMap) s += starMap[k]; return s; }

  /* ---------------- board ---------------- */
  function buildBoard() {
    boardEl.innerHTML = '';
    boardEl.setAttribute('data-len', String(S.len));
    for (var r = 0; r < S.maxTries; r++) {
      var row = document.createElement('div'); row.className = 'wg-row';
      for (var c = 0; c < S.len; c++) {
        var t = document.createElement('div'); t.className = 'wg-tile'; row.appendChild(t);
      }
      boardEl.appendChild(row);
    }
    S.guesses.forEach(function (g, r) {
      var sc = S.scores[r];
      for (var c = 0; c < S.len; c++) {
        var tile = boardEl.children[r].children[c];
        tile.textContent = g[c].toUpperCase();
        tile.classList.add('wg-filled', 'wg-' + sc[c]);
      }
    });
    renderCurrent();
  }
  function renderCurrent() {
    if (!S || S.status !== 'playing') return;
    var row = boardEl.children[S.guesses.length]; if (!row) return;
    for (var c = 0; c < S.len; c++) {
      var tile = row.children[c];
      tile.textContent = S.current[c] ? S.current[c].toUpperCase() : '';
      tile.classList.toggle('wg-filled', !!S.current[c]);
    }
  }

  /* ---------------- keyboard ---------------- */
  var keyBtns = {};
  function buildKeyboard() {
    kbEl.innerHTML = ''; keyBtns = {};
    var rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    rows.forEach(function (letters, ri) {
      var rowEl = document.createElement('div'); rowEl.className = 'wg-krow';
      if (ri === 2) rowEl.appendChild(makeKey('enter', 'Enter', true));
      letters.split('').forEach(function (ch) { rowEl.appendChild(makeKey(ch, ch.toUpperCase(), false)); });
      if (ri === 2) rowEl.appendChild(makeKey('back', '⌫', true));
      kbEl.appendChild(rowEl);
    });
  }
  function makeKey(k, label, wide) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'wg-key' + (wide ? ' wg-wide' : '');
    b.textContent = label; b.setAttribute('data-key', k);
    b.setAttribute('aria-label', k === 'back' ? 'Delete' : label);
    b.addEventListener('click', function () { press(k); });
    if (!wide) keyBtns[k] = b;
    return b;
  }
  function noteKeys(guess, sc) {
    var rank = { grey: 1, gold: 2, green: 3 };
    for (var i = 0; i < guess.length; i++) {
      var ch = guess[i], curS = keyState[ch];
      if (!curS || rank[sc[i]] > rank[curS]) keyState[ch] = sc[i];
    }
  }
  function paintKeyboard() {
    for (var ch in keyBtns) {
      var b = keyBtns[ch];
      b.classList.remove('wg-green', 'wg-gold', 'wg-grey');
      if (keyState[ch]) b.classList.add('wg-' + keyState[ch]);
    }
  }

  /* ---------------- overlay ---------------- */
  function showOverlay(title, stats, pLabel, pFn, sLabel, sFn) {
    doneTitle.textContent = title;
    doneStats.innerHTML = stats;
    primaryBtn.textContent = pLabel;
    primaryBtn.onclick = function () { hideOverlay(); if (pFn) pFn(); };
    if (sLabel) {
      secondaryBtn.style.display = '';
      secondaryBtn.textContent = sLabel;
      secondaryBtn.onclick = function () { hideOverlay(); if (sFn) sFn(); };
    } else secondaryBtn.style.display = 'none';
    overlay.classList.remove('hidden');
  }
  function hideOverlay() { overlay.classList.add('hidden'); }

  /* ---------------- input ---------------- */
  function press(k) {
    if (busy || !S || S.status !== 'playing') return;
    if (k === 'enter') { submit(); return; }
    if (k === 'back') { S.current = S.current.slice(0, -1); renderCurrent(); return; }
    if (/^[a-z]$/.test(k) && S.current.length < S.len) {
      S.current += k;
      renderCurrent();
      var row = boardEl.children[S.guesses.length];
      if (row) {
        var tile = row.children[S.current.length - 1];
        tile.classList.remove('wg-pop'); void tile.offsetWidth; tile.classList.add('wg-pop');
      }
    }
  }
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Enter') { e.preventDefault(); press('enter'); }
    else if (e.key === 'Backspace') { e.preventDefault(); press('back'); }
    else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toLowerCase());
  });

  function submit() {
    if (S.current.length < S.len) {
      var row = boardEl.children[S.guesses.length];
      if (row) { row.classList.remove('wg-shake'); void row.offsetWidth; row.classList.add('wg-shake'); }
      setMsg('Too short — this word has ' + S.len + ' letters. Keep going!');
      return;
    }
    var guess = S.current, sc = scoreGuess(guess, S.answer);
    var r = S.guesses.length;
    S.guesses.push(guess); S.scores.push(sc); S.current = '';
    busy = true;
    var rowEl = boardEl.children[r];
    for (var c = 0; c < S.len; c++) {
      (function (tile, ch, col, delay) {
        tile.textContent = ch.toUpperCase();
        tile.classList.add('wg-filled', 'wg-flip');
        tile.style.animationDelay = (delay / 1000) + 's';
        setTimeout(function () { tile.classList.add('wg-' + col); }, delay + 200);
      })(rowEl.children[c], guess[c], sc[c], c * 110);
    }
    setTimeout(function () {
      busy = false;
      noteKeys(guess, sc); paintKeyboard();
      renderCurrent();
      if (mode === 'daily') saveDaily();
      updateStats();
      if (guess === S.answer) return onWin();
      if (S.guesses.length >= S.maxTries) return onLose();
      var g = sc.filter(function (x) { return x === 'green'; }).length;
      var o = sc.filter(function (x) { return x === 'gold'; }).length;
      setMsg(guess.toUpperCase() + ': ' + g + ' green · ' + o + ' gold — ' +
        (S.maxTries - S.guesses.length) + ' ' + (S.maxTries - S.guesses.length === 1 ? 'try' : 'tries') + ' left. Every guess teaches you something!');
    }, S.len * 110 + 480);
  }

  /* ---------------- daily mode ---------------- */
  function todayKey() { return dateKey(new Date()); }
  function yesterdayKey() { var d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d); }
  function displayStreak() {
    var raw = parseInt(lsGet('wg_daily_streak', '0'), 10) || 0;
    var lw = lsGet('wg_daily_lastwin', '');
    return (lw === todayKey() || lw === yesterdayKey()) ? raw : 0;
  }
  function saveDaily() {
    lsSet('wg_daily_date', todayKey());
    lsSet('wg_daily_guesses', JSON.stringify(S.guesses));
    lsSet('wg_daily_status', S.status);
  }
  function startDaily() {
    var key = todayKey();
    S = { answer: dailyWordFor(key), len: 5, maxTries: 6, guesses: [], scores: [], current: '', status: 'playing' };
    el('wg-d-date').textContent = new Date().toLocaleDateString(undefined,
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    keyState = {};
    if (lsGet('wg_daily_date', '') === key) {
      var saved = [];
      try { saved = JSON.parse(lsGet('wg_daily_guesses', '[]') || '[]'); } catch (e) { saved = []; }
      saved.slice(0, S.maxTries).forEach(function (g) {
        if (typeof g === 'string' && g.length === S.len) {
          S.guesses.push(g); S.scores.push(scoreGuess(g, S.answer));
          noteKeys(g, S.scores[S.scores.length - 1]);
        }
      });
      var st = lsGet('wg_daily_status', 'playing');
      if (st === 'won' || st === 'lost') S.status = st;
    }
    hideOverlay();
    buildBoard(); paintKeyboard(); updateStats();
    if (S.status === 'won') {
      setMsg('You already cracked today\'s word — a new one arrives tomorrow 🌅');
      showDailyResult();
    } else if (S.status === 'lost') {
      setMsg('Today\'s word got away — a new one arrives tomorrow 🌅');
      showDailyResult();
    } else {
      setMsg('One word, six tries. Type your first guess — every guess teaches you something.');
    }
  }
  function showDailyResult() {
    var won = S.status === 'won';
    showOverlay(
      won ? '🎉 You cracked it!' : 'Out of tries 💪',
      'The word was <strong>' + S.answer.toUpperCase() + '</strong> · ' +
        (won ? 'solved in ' + S.guesses.length + ' / ' + S.maxTries + ' tries' : 'not solved today') +
        '<br>🔥 Streak: ' + displayStreak() + ' · Come back tomorrow for a new word 🌅',
      '🧗 Play the Level Climb', function () { switchMode('levels'); },
      'Admire my board', null);
  }
  function dailyEnd(won) {
    var key = todayKey();
    if (won) {
      var lw = lsGet('wg_daily_lastwin', '');
      var streak = parseInt(lsGet('wg_daily_streak', '0'), 10) || 0;
      if (lw !== key) streak = (lw === yesterdayKey()) ? streak + 1 : 1;
      lsSet('wg_daily_streak', String(streak));
      lsSet('wg_daily_lastwin', key);
    } else {
      lsSet('wg_daily_streak', '0');
    }
    S.status = won ? 'won' : 'lost';
    saveDaily(); updateStats();
    showDailyResult();
  }

  /* ---------------- level climb ---------------- */
  function starTotal() { return totalStars(); }
  function buildMap() {
    var map = el('wg-map');
    map.innerHTML = '';
    for (var l = 1; l <= MAX_LEVEL; l++) {
      (function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        if (starMap[l] != null && l !== cur) { b.className = 'wg-lvl wg-done'; b.textContent = l + (starMap[l] >= 3 ? ' ⭐' : ''); }
        else if (l === cur) { b.className = 'wg-lvl wg-cur'; b.textContent = l; }
        else if (l <= unlocked) { b.className = 'wg-lvl'; b.textContent = l; }
        else { b.className = 'wg-lvl wg-lock'; b.textContent = '🔒'; }
        b.disabled = l > unlocked;
        b.setAttribute('aria-label', 'Level ' + l);
        b.addEventListener('click', function () { if (l <= unlocked && !busy) { cur = l; startLevel(); } });
        map.appendChild(b);
      })(l);
    }
    el('wg-level-now').textContent = cur;
    var doneCount = 0; for (var k in starMap) doneCount++;
    var b = bandFor(cur);
    el('wg-progress-note').textContent = doneCount + ' of 100 levels completed · ' +
      b.len + '-letter words · ' + b.tries + ' tries · ' + starTotal() + ' stars earned';
  }
  function startLevel() {
    var b = bandFor(cur);
    S = { answer: levelWord(cur), len: b.len, maxTries: b.tries, guesses: [], scores: [], current: '', status: 'playing' };
    keyState = {};
    hideOverlay();
    buildBoard(); paintKeyboard(); buildMap(); updateStats();
    setMsg('Level ' + cur + ' — a ' + b.len + '-letter word in ' + b.tries + ' tries. You\'ve got this!');
  }
  function levelEnd(won) {
    if (won) {
      var used = S.guesses.length;
      var stars = used <= Math.floor(S.maxTries / 2) ? 3 : used <= S.maxTries - 1 ? 2 : 1;
      if (starMap[cur] == null || stars > starMap[cur]) starMap[cur] = stars;
      if (cur === unlocked && unlocked < MAX_LEVEL) unlocked++;
      lsSet('wg_unlocked', String(unlocked));
      lsSet('wg_stars', JSON.stringify(starMap));
      S.status = 'won';
      buildMap(); updateStats();
      showOverlay(
        cur >= MAX_LEVEL ? '🏆 Master of Words!' : '⭐ Level ' + cur + ' complete!',
        'The word was <strong>' + S.answer.toUpperCase() + '</strong> · solved in ' + used + ' / ' + S.maxTries +
          ' tries<br>You earned ' + '⭐'.repeat(stars) + ' for this level · ' + starTotal() + ' stars in total',
        cur < MAX_LEVEL ? 'Next level →' : 'Admire my climb', cur < MAX_LEVEL ? function () { cur++; startLevel(); } : null,
        'Replay this level', function () { startLevel(); });
    } else {
      S.status = 'lost';
      updateStats();
      showOverlay(
        'Out of tries 💪',
        'The word was <strong>' + S.answer.toUpperCase() + '</strong>.<br>' +
          'Every wrong guess taught you something — those grey and gold tiles were clues, not failures.',
        'Try again', function () { startLevel(); },
        'Admire my board', null);
    }
  }

  /* ---------------- shared end + stats ---------------- */
  function onWin() {
    setMsg('🎉 ' + S.answer.toUpperCase() + ' — you cracked it in ' + S.guesses.length + '!');
    if (mode === 'daily') dailyEnd(true); else levelEnd(true);
  }
  function onLose() {
    if (mode === 'daily') dailyEnd(false); else levelEnd(false);
  }
  function updateStats() {
    if (mode === 'daily') {
      el('wg-d-streak').textContent = '🔥 ' + displayStreak();
      el('wg-d-tries').textContent = S.guesses.length + ' / ' + S.maxTries;
      el('wg-d-status').textContent = S.status === 'won' ? 'Won 🎉' : S.status === 'lost' ? 'Out of tries' : 'Playing';
    } else {
      var b = bandFor(cur);
      el('wg-l-level').textContent = cur;
      el('wg-l-len').textContent = b.len;
      el('wg-l-stars').textContent = starTotal();
    }
  }

  /* ---------------- modes ---------------- */
  function switchMode(m) {
    if (busy) return;
    mode = m;
    el('wg-tab-daily').classList.toggle('wg-sel', m === 'daily');
    el('wg-tab-levels').classList.toggle('wg-sel', m === 'levels');
    el('wg-daily-head').style.display = m === 'daily' ? '' : 'none';
    el('wg-level-head').style.display = m === 'levels' ? '' : 'none';
    el('wg-restart').style.display = m === 'levels' ? '' : 'none';
    if (m === 'daily') startDaily(); else startLevel();
  }
  el('wg-tab-daily').addEventListener('click', function () { switchMode('daily'); });
  el('wg-tab-levels').addEventListener('click', function () { switchMode('levels'); });
  el('wg-restart').addEventListener('click', function () { if (!busy && mode === 'levels') startLevel(); });

  /* ---------------- QA hook (read-only) ---------------- */
  window.__wg = {
    answer: function () { return S ? S.answer : null; },
    mode: function () { return mode; },
    level: function () { return cur; },
    score: scoreGuess,
    dailyWordFor: dailyWordFor,
    levelWord: levelWord,
    bandFor: bandFor,
    counts: { 4: WORDS4.length, 5: WORDS5.length, 6: WORDS6.length, 7: WORDS7.length },
    state: function () {
      return S ? { guesses: S.guesses.slice(), status: S.status, len: S.len, maxTries: S.maxTries, current: S.current } : null;
    }
  };

  buildKeyboard();
  switchMode('daily');
})();
