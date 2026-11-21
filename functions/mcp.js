// Wisely Arcade MCP server — stateless Streamable HTTP, zero dependencies.
// Read-only tools over the Wisely Arcade game catalogue: any MCP-compatible
// assistant (Claude, Cursor, ChatGPT…) can list, search and recommend the
// site's 32 free learning games. Data mirrors https://wiselyarcade.com/catalogue.json
// Deploys as a Cloudflare Pages Function: functions/mcp.js -> https://wiselyarcade.com/mcp

const SERVER = { name: 'wiselyarcade', version: '1.0.0', title: 'Wisely Arcade Games' };
const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SITE = 'https://wiselyarcade.com';

const GAMES = [{"slug": "2048-merge", "title": "2048 Merge", "url": "https://wiselyarcade.com/games/2048-merge", "ages": "Ages 10+", "bands": ["teens", "adults"], "skills": ["Maths & Numbers", "Logic & Puzzles", "Strategy & Board Games"], "skill_slugs": ["maths", "logic", "strategy"], "lesson": "Small smart steps add up to big wins.", "difficulty": "Medium", "minutes": 5, "desc": "Play 2048 Merge free online — the famous 2048 puzzle game with a 100-level campaign. Slide the tiles, merge matching numbers, and chase the 2048 tile. No download, no sign-up."}, {"slug": "memory-match", "title": "Animal Memory Match", "url": "https://wiselyarcade.com/games/memory-match", "ages": "Ages 5–9", "bands": ["kids"], "skills": ["Memory & Attention"], "skill_slugs": ["memory"], "lesson": "Patience and paying attention always pay off.", "difficulty": "Easy", "minutes": 3, "desc": "Play Animal Memory Match free online — flip cards and find all 8 animal pairs. A fun memory game for kids ages 5–9 that teaches patience and paying attention. No download."}, {"slug": "apex-gp", "title": "Apex GP", "url": "https://wiselyarcade.com/games/apex-gp", "ages": "Ages 10–17", "bands": ["teens"], "skills": ["Racing & Action"], "skill_slugs": ["racing"], "lesson": "Smooth is fast — control beats raw speed.", "difficulty": "Medium", "minutes": 3, "desc": "Play Apex GP free online — a real 3D motorcycle Grand Prix racer. Race the classic circuit and 99 daylight sprint levels with jump ramps and river gaps, earn points, upgrade your bike's engine, tires and nitro, and climb 100 career levels. No download, no sign-up, family-friendly."}, {"slug": "arrowway-escape", "title": "Arrowway Escape", "url": "https://wiselyarcade.com/games/arrowway-escape", "ages": "Ages 10–17", "bands": ["teens"], "skills": ["Logic & Puzzles"], "skill_slugs": ["logic"], "lesson": "Order matters — free the blocked pieces in the right sequence.", "difficulty": "Medium", "minutes": 2, "desc": "Play Arrowway Escape free online — an arrow escape puzzle: tap an arrow to slide it off the board, but only when its path to the edge is clear. Blocked taps cost a heart. 100 levels, no download, no sign-up."}, {"slug": "block-bloom", "title": "Block Bloom", "url": "https://wiselyarcade.com/games/block-bloom", "ages": "Ages 10–17", "bands": ["teens"], "skills": ["Logic & Puzzles"], "skill_slugs": ["logic"], "lesson": "Plan ahead — leave room for the future.", "difficulty": "Medium", "minutes": 4, "desc": "Play Block Bloom free online — a Block Blast-style block puzzle — drag, place, clear. 100 levels, no download, no sign-up. Glossy 3D blocks, rising targets and a best-score endless mode, family-friendly."}, {"slug": "bubble-pop", "title": "Bubble Pop", "url": "https://wiselyarcade.com/games/bubble-pop", "ages": "Ages 5–17", "bands": ["kids", "teens"], "skills": ["Memory & Attention"], "skill_slugs": ["memory"], "lesson": "Aim with intention, not in a hurry.", "difficulty": "Easy", "minutes": 3, "desc": "Play Bubble Pop free online — the classic bubble shooter with glossy 3D bubbles! Aim the cannon, match 3 or more bubbles to pop them, and drop whole clusters for bonus points. A new row slides in every 6 shots. No download, no sign-up, family-friendly."}, {"slug": "calm-fist-arena", "title": "Calm Fist Arena", "url": "https://wiselyarcade.com/games/calm-fist-arena", "ages": "Ages 10–17", "bands": ["teens"], "skills": ["Racing & Action", "Strategy & Board Games"], "skill_slugs": ["racing", "strategy"], "lesson": "Real strength is self-control — stay calm and strike with focus.", "difficulty": "Medium", "minutes": 2, "desc": "Play Calm Fist Arena free online — a martial-arts fighting game with real painted fighters and big-screen arenas. Block to build Calm, then strike with focus. Beat 100 rivals across 50 lively places — street markets, ship decks, train tops, waterfalls and mountain temples — and learn that real strength is self-control. No download."}, {"slug": "chess", "title": "Chess", "url": "https://wiselyarcade.com/games/chess", "ages": "Ages 10+", "bands": ["teens", "adults"], "skills": ["Strategy & Board Games"], "skill_slugs": ["strategy"], "lesson": "Every move has a consequence — think before you act.", "difficulty": "Hard", "minutes": 15, "desc": "Play Chess free online against the computer — full rules, three difficulty levels, no download, no sign-up. Every move has a consequence: think before you act. Family-friendly."}, {"slug": "crown-logic", "title": "Crown Logic", "url": "https://wiselyarcade.com/games/crown-logic", "ages": "Ages 18+", "bands": ["adults"], "skills": ["Logic & Puzzles"], "skill_slugs": ["logic"], "lesson": "Every constraint is a clue — limits don't block you, they quietly tell you where the answer must be.", "difficulty": "Hard", "minutes": 5, "desc": "Play Crown Logic free online — a Queens-style crown placement logic puzzle. Place exactly one crown in every row, column and colour region, and never let two crowns touch, not even diagonally. 100 levels, each with exactly one solution, no download, no sign-up."}, {"slug": "daily-sudoku", "title": "Daily Sudoku", "url": "https://wiselyarcade.com/games/daily-sudoku", "ages": "Ages 18+", "bands": ["adults"], "skills": ["Maths & Numbers", "Logic & Puzzles"], "skill_slugs": ["maths", "logic"], "lesson": "Big problems break into small steps.", "difficulty": "Medium", "minutes": 10, "desc": "Play today's free Sudoku puzzle online — a fresh challenge every day. Fill the 9×9 grid using logic, with pencil notes, mistake tracking and timer. No download."}, {"slug": "daily-word-guess", "title": "Daily Word Guess", "url": "https://wiselyarcade.com/games/daily-word-guess", "ages": "Ages 10+", "bands": ["teens", "adults"], "skills": ["Words & Reading"], "skill_slugs": ["words"], "lesson": "Never give up — every wrong guess teaches you something.", "difficulty": "Medium", "minutes": 3, "desc": "Play Daily Word Guess free online — one new word to crack every day, plus a 100-level word climb from 4-letter starters to 7-letter giants. Green, gold, grey — every wrong guess teaches you something. No download, no sign-up."}, {"slug": "forest-dash", "title": "Forest Dash", "url": "https://wiselyarcade.com/games/forest-dash", "ages": "Ages 5–17", "bands": ["kids", "teens"], "skills": ["Racing & Action"], "skill_slugs": ["racing"], "lesson": "Keep going, even when you stumble.", "difficulty": "Medium", "minutes": 2, "desc": "Play Forest Dash free online — an endless runner where fans of Subway Surfers and Temple Run will feel at home. Dodge, jump, and slide through a living forest, grab glowing fireflies, climb 100 levels from Sunny Grove to the storm peaks, and learn: keep going, every obstacle passes. No download, no sign-up, family-friendly."}, {"slug": "gk-quest", "title": "GK Quest", "url": "https://wiselyarcade.com/games/gk-quest", "ages": "Ages 5–17", "bands": ["kids", "teens"], "skills": ["Knowledge & Creativity"], "skill_slugs": ["knowledge"], "lesson": "Smart is not magic — it's noticing patterns.", "difficulty": "Medium", "minutes": 3, "desc": "Play GK Quest free online — a general knowledge quiz with 100 levels of questions on animals, space, science, geography, history, sports and food. Every answer teaches a true fact. No download, no sign-up."}, {"slug": "gem-grove-quest", "title": "Gem Grove Quest", "url": "https://wiselyarcade.com/games/gem-grove-quest", "ages": "Ages 10–17", "bands": ["teens"], "skills": ["Logic & Puzzles"], "skill_slugs": ["logic"], "lesson": "Small moves add up — one good match sets off a chain.", "difficulty": "Medium", "minutes": 3, "desc": "Play Gem Grove Quest free online — a Candy Crush-style match-3 puzzle adventure — swap glossy gems, chain cascades and grow line and star gems. 100 levels, no download, no sign-up. Family-friendly."}, {"slug": "iq-quest", "title": "IQ Quest", "url": "https://wiselyarcade.com/games/iq-quest", "ages": "Ages 5–17", "bands": ["kids", "teens"], "skills": ["Logic & Puzzles", "Knowledge & Creativity"], "skill_slugs": ["logic", "knowledge"], "lesson": "Smart is not magic — it's noticing patterns.", "difficulty": "Medium", "minutes": 3, "desc": "Play IQ Quest free online — 100 levels of patterns, number sequences, odd-one-out, analogies, riddles and puzzle grids. The higher you climb, the tougher it gets. No download, no sign-up."}, {"slug": "jigsaw-puzzle", "title": "Jigsaw Puzzle", "url": "https://wiselyarcade.com/games/jigsaw-puzzle", "ages": "Ages 5–9", "bands": ["kids"], "skills": ["Logic & Puzzles"], "skill_slugs": ["logic"], "lesson": "Patience — the picture comes together piece by piece.", "difficulty": "Easy", "minutes": 5, "desc": "Play Jigsaw Puzzle free online — drag the pieces and rebuild 100 pictures — a different picture on every level, never repeated: game posters, storybook scenes and real photos of space, animals and famous places. 100 levels for kids ages 5–9 that teach patience, piece by piece. No download."}, {"slug": "letter-garden", "title": "Letter Garden", "url": "https://wiselyarcade.com/games/letter-garden", "ages": "Ages 5–9", "bands": ["kids"], "skills": ["Words & Reading"], "skill_slugs": ["words"], "lesson": "Small steps every day make big things grow.", "difficulty": "Easy", "minutes": 2, "desc": "Play Letter Garden free online — tap the letters in order to complete each word and watch your plant grow from seed to full bloom. 100 levels, a garden that grows with you. No download, no sign-up."}, {"slug": "ludo", "title": "Ludo", "url": "https://wiselyarcade.com/games/ludo", "ages": "Ages 5–9", "bands": ["kids"], "skills": ["Strategy & Board Games"], "skill_slugs": ["strategy"], "lesson": "You can't control the dice — only how you play the roll.", "difficulty": "Easy", "minutes": 10, "desc": "Play Ludo free online — vs the computer or pass-and-play with up to 4 players, full classic rules, no download, no sign-up. You can't control the dice, only how you play the roll. Family-friendly."}, {"slug": "math-quest", "title": "Math Quest", "url": "https://wiselyarcade.com/games/math-quest", "ages": "Ages 5–17", "bands": ["kids", "teens"], "skills": ["Maths & Numbers"], "skill_slugs": ["maths"], "lesson": "Big problems break into small steps.", "difficulty": "Medium", "minutes": 2, "desc": "Play Math Quest free online — addition, subtraction, multiplication and division games with 5 levels from Toddler to Expert. Easy steps that grow harder as you climb. No download, no sign-up."}, {"slug": "mind-meter", "title": "Mind Meter", "url": "https://wiselyarcade.com/games/mind-meter", "ages": "Ages 10+", "bands": ["teens", "adults"], "skills": ["Memory & Attention", "Maths & Numbers"], "skill_slugs": ["memory", "maths"], "lesson": "A sharp mind is built, not born.", "difficulty": "Hard", "minutes": 5, "desc": "Play Mind Meter free online — a 3D IQ challenge with 12 timed brain-teasers: number logic, patterns, verbal reasoning and math puzzles. Get your estimated IQ, beat your best, and learn: a sharp mind is built, not born. No download, no sign-up, family-friendly."}, {"slug": "minesweeper", "title": "Minesweeper", "url": "https://wiselyarcade.com/games/minesweeper", "ages": "Ages 18+", "bands": ["adults"], "skills": ["Logic & Puzzles"], "skill_slugs": ["logic"], "lesson": "Think before you act — every click counts.", "difficulty": "Hard", "minutes": 5, "desc": "Play Minesweeper online free — the classic logic puzzle rebuilt with glossy HD 3D tiles. Reveal tiles, flag the mines, beat your best time. No download, no sign-up, family-friendly."}, {"slug": "missing-letters", "title": "Missing Letters", "url": "https://wiselyarcade.com/games/missing-letters", "ages": "Ages 5–9", "bands": ["kids"], "skills": ["Words & Reading"], "skill_slugs": ["words"], "lesson": "Reading grows one letter at a time.", "difficulty": "Easy", "minutes": 2, "desc": "Play Missing Letters free online — look at the picture, find the missing letter, and finish the word. A friendly reading game for kids ages 5–9. No download, no sign-up."}, {"slug": "neon-snake", "title": "Neon Snake", "url": "https://wiselyarcade.com/games/neon-snake", "ages": "Ages 10–17", "bands": ["teens"], "skills": ["Racing & Action"], "skill_slugs": ["racing"], "lesson": "Greed traps you — know when enough is enough.", "difficulty": "Medium", "minutes": 2, "desc": "Play Neon Snake free online — the classic snake game with a glowing neon twist. Eat, grow, and don't get greedy. Keyboard + swipe controls, works on mobile."}, {"slug": "nitro-gp", "title": "Nitro GP", "url": "https://wiselyarcade.com/games/nitro-gp", "ages": "Ages 10–17", "bands": ["teens"], "skills": ["Racing & Action"], "skill_slugs": ["racing"], "lesson": "Smooth is fast — control beats raw speed.", "difficulty": "Medium", "minutes": 3, "desc": "Play Nitro GP free online — Need-for-Speed-style 3D street racing. Race 3 laps against 5 rivals on neon night circuits, then take on daylight sprint levels with jump ramps and river gaps — 100 career levels in all. Dodge traffic, drift corners, earn points and upgrade your car. No download, no sign-up, family-friendly."}, {"slug": "paint-the-rocket", "title": "Paint the Rocket", "url": "https://wiselyarcade.com/games/paint-the-rocket", "ages": "Ages 5–9", "bands": ["kids"], "skills": ["Knowledge & Creativity"], "skill_slugs": ["knowledge"], "lesson": "There are no wrong colours — your ideas can fly.", "difficulty": "Easy", "minutes": 5, "desc": "Play Paint the Rocket free online — a tap-to-colour adventure for kids ages 5–9 with five big pictures to paint: a rocket, a castle, under the sea, a friendly robot and a garden. No download, no sign-up."}, {"slug": "peak-dash", "title": "Peak Dash", "url": "https://wiselyarcade.com/games/peak-dash", "ages": "Ages 10–17", "bands": ["teens"], "skills": ["Racing & Action"], "skill_slugs": ["racing"], "lesson": "Falling is information — every failed jump teaches the timing.", "difficulty": "Hard", "minutes": 2, "desc": "Play Peak Dash free online — a precision platform game. Run and jump across mountain peaks, dodge spikes, ride moving platforms, bounce on springs, collect coins and plant the summit flag. 100 levels in 10 worlds, no download, no sign-up."}, {"slug": "sky-gp", "title": "Sky GP", "url": "https://wiselyarcade.com/games/sky-gp", "ages": "Ages 10–17", "bands": ["teens"], "skills": ["Racing & Action"], "skill_slugs": ["racing"], "lesson": "Aim high, but fly calm — panic crashes, patience lands.", "difficulty": "Medium", "minutes": 3, "desc": "Play Sky GP free online — a 3D flying car racing game in a bright daytime sky. Race 5 rival flying cars through golden checkpoint rings, dodge bird flocks, cruise past airliners, beat 100 career levels or chase the clock in Time Trial. No download, no sign-up, family-friendly."}, {"slug": "spot-the-difference", "title": "Spot the Difference", "url": "https://wiselyarcade.com/games/spot-the-difference", "ages": "Ages 5–9", "bands": ["kids"], "skills": ["Memory & Attention"], "skill_slugs": ["memory"], "lesson": "Slow down and really look.", "difficulty": "Easy", "minutes": 3, "desc": "Play Spot the Difference free online — a sharp-eyes puzzle game for kids ages 5–9. Two pictures, five scenes, 100 levels of hidden differences to find. No download, no sign-up."}, {"slug": "tower-stack", "title": "Tower Stack", "url": "https://wiselyarcade.com/games/tower-stack", "ages": "Ages 10–17", "bands": ["teens"], "skills": ["Racing & Action"], "skill_slugs": ["racing"], "lesson": "Big things are built one careful step at a time.", "difficulty": "Medium", "minutes": 1, "desc": "Play Tower Stack online — a free tower stack game. Drop each sliding block at just the right moment and build the tallest tower you can. Levels get faster, wind kicks in, and patience wins. No download."}, {"slug": "trail-stunts", "title": "Trail Stunts", "url": "https://wiselyarcade.com/games/trail-stunts", "ages": "Ages 10–17", "bands": ["teens"], "skills": ["Racing & Action"], "skill_slugs": ["racing"], "lesson": "Balance beats speed.", "difficulty": "Medium", "minutes": 2, "desc": "Play Trail Stunts free online — a Moto X3M-style physics bike stunt game with 100% original trails. Throttle, tilt, backflip and stick the landing across 3 wild trails. Fans of Moto X3M will feel right at home. No download."}, {"slug": "word-pet", "title": "Word Pet", "url": "https://wiselyarcade.com/games/word-pet", "ages": "Ages 5–9", "bands": ["kids"], "skills": ["Words & Reading"], "skill_slugs": ["words"], "lesson": "Love and care help everything grow.", "difficulty": "Easy", "minutes": 2, "desc": "Play Word Pet free online — tap the letters in order to finish each word, feed Biscuit the puppy, and watch him grow from a tiny egg to a crowned champion across 100 levels. A friendly word game for kids ages 5–9. No download, no sign-up."}, {"slug": "word-town", "title": "Word Town", "url": "https://wiselyarcade.com/games/word-town", "ages": "Ages 5–9", "bands": ["kids"], "skills": ["Words & Reading"], "skill_slugs": ["words"], "lesson": "Great towns are built one brick — and one word — at a time.", "difficulty": "Easy", "minutes": 2, "desc": "Play Word Town free online — tap letter tiles in order to complete each word and watch your 3D town grow, one building at a time. A friendly spelling game for kids ages 5–9. No download, no sign-up."}];
const SKILLS = {"memory": {"name": "Memory & Attention", "url": "https://wiselyarcade.com/skill-memory", "count": 4}, "logic": {"name": "Logic & Puzzles", "url": "https://wiselyarcade.com/skill-logic", "count": 9}, "maths": {"name": "Maths & Numbers", "url": "https://wiselyarcade.com/skill-maths", "count": 4}, "words": {"name": "Words & Reading", "url": "https://wiselyarcade.com/skill-words", "count": 5}, "racing": {"name": "Racing & Action", "url": "https://wiselyarcade.com/skill-racing", "count": 9}, "strategy": {"name": "Strategy & Board Games", "url": "https://wiselyarcade.com/skill-strategy", "count": 4}, "knowledge": {"name": "Knowledge & Creativity", "url": "https://wiselyarcade.com/skill-knowledge", "count": 3}};

const TOOLS = [
  {
    name: 'list_games',
    description: 'List Wisely Arcade games, optionally filtered by age band (kids = ages 5-9, teens = 10-17, adults = 18+) and/or skill slug (memory, logic, maths, words, racing, strategy, knowledge).',
    inputSchema: {
      type: 'object',
      properties: {
        age_band: { type: 'string', enum: ['kids', 'teens', 'adults'], description: 'Optional age band filter.' },
        skill: { type: 'string', enum: ['memory', 'logic', 'maths', 'words', 'racing', 'strategy', 'knowledge'], description: 'Optional skill filter.' },
      },
    },
  },
  {
    name: 'get_game',
    description: 'Get full details for one Wisely Arcade game by its slug (for example "chess" or "letter-garden").',
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'The game slug, as used in its URL.' } },
      required: ['slug'],
    },
  },
  {
    name: 'search_games',
    description: 'Search Wisely Arcade games by keyword — matches titles, descriptions, lessons and skills.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Keyword or phrase to search for.' } },
      required: ['query'],
    },
  },
  {
    name: 'recommend_games',
    description: 'Recommend up to 5 Wisely Arcade games for a player of a given age, optionally focused on one skill. Recommendations start from the gentlest games.',
    inputSchema: {
      type: 'object',
      properties: {
        age: { type: 'number', description: 'The player\'s age in years.' },
        skill: { type: 'string', enum: ['memory', 'logic', 'maths', 'words', 'racing', 'strategy', 'knowledge'], description: 'Optional skill to focus on.' },
      },
      required: ['age'],
    },
  },
  {
    name: 'list_skills',
    description: 'List the seven skill areas Wisely Arcade games practise, with game counts and hub links.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'about_wisely_arcade',
    description: 'Plain facts about Wisely Arcade: what it is, safety for children, how the 100-level climb works, and where the catalogue and parent guide live.',
    inputSchema: { type: 'object', properties: {} },
  },
];

function gameLine(g) {
  return '- ' + g.title + ' (' + g.ages + ') — ' + g.lesson + ' Play: ' + g.url;
}

function callTool(name, args) {
  args = args || {};
  switch (name) {
    case 'list_games': {
      let out = GAMES.slice();
      if (args.age_band) out = out.filter(g => g.bands.includes(args.age_band));
      if (args.skill) out = out.filter(g => g.skill_slugs.includes(args.skill));
      if (!out.length) return 'No games match that filter. Try a different age band or skill.';
      return out.length + ' game(s):\n' + out.map(gameLine).join('\n');
    }
    case 'get_game': {
      const g = GAMES.find(x => x.slug === String(args.slug || '').trim().toLowerCase());
      if (!g) return 'No game with slug "' + args.slug + '". Use list_games to see all slugs in the play URLs.';
      return [g.title, 'Play: ' + g.url, 'Ages: ' + g.ages.replace(/^Ages /, ''), 'Skills: ' + g.skills.join(', '),
        'What it teaches: ' + g.lesson, 'Difficulty: ' + g.difficulty,
        'One round takes about: ' + g.minutes, 'About: ' + g.desc,
        'Structure: every Wisely Arcade game is a 100-level climb that gets harder as you go. Progress is saved on the player\'s device only — no account.'].join('\n');
    }
    case 'search_games': {
      const q = String(args.query || '').trim().toLowerCase();
      if (!q) throw new Error('query is required');
      const out = GAMES.filter(g => (g.title + ' ' + g.desc + ' ' + g.lesson + ' ' + g.skills.join(' ')).toLowerCase().includes(q));
      if (!out.length) return 'No games match "' + args.query + '".';
      return out.length + ' game(s) match "' + args.query + '":\n' + out.map(gameLine).join('\n');
    }
    case 'recommend_games': {
      const age = Number(args.age);
      if (!age || age < 1) throw new Error('age (in years) is required');
      const band = age <= 9 ? 'kids' : age <= 17 ? 'teens' : 'adults';
      let out = GAMES.filter(g => g.bands.includes(band));
      if (args.skill) out = out.filter(g => g.skill_slugs.includes(args.skill));
      const rank = { 'Gentle': 0, 'Easy': 1, 'Medium': 2, 'Hard': 3 };
      out.sort((a, b) => (rank[a.difficulty] ?? 1) - (rank[b.difficulty] ?? 1));
      out = out.slice(0, 5);
      if (!out.length) return 'No games match that age and skill yet.';
      return 'For a ' + age + '-year-old (' + band + ' band' + (args.skill ? ', ' + args.skill : '') + '), start with:\n' +
        out.map(g => gameLine(g) + ' [' + g.difficulty + ', ~' + g.minutes + ']').join('\n') +
        '\nEvery game is free, needs no account, and climbs 100 levels.';
    }
    case 'list_skills': {
      return 'Wisely Arcade games practise seven skills:\n' + Object.entries(SKILLS).map(([s, v]) =>
        '- ' + v.name + ' — ' + v.count + ' game(s): ' + v.url).join('\n') +
        '\nBrowse all skills: ' + SITE + '/skills';
    }
    case 'about_wisely_arcade': {
      return ['Wisely Arcade (' + SITE + ') is a free family games website with ' + GAMES.length + ' original games.',
        'Every game is a 100-level climb: gentle at the start, genuinely hard by level 100.',
        'Safety: no accounts, no sign-up, no chat, nothing to buy inside the games. Progress is saved on the player\'s device only.',
        'Browse by age: ' + SITE + '/kids (5-9), ' + SITE + '/teens (10-17), ' + SITE + '/adults (18+). Age labels are guidance.',
        'Browse by skill: ' + SITE + '/skills',
        'Parent Guide: ' + SITE + '/parents',
        'Full machine-readable catalogue: ' + SITE + '/catalogue.json'].join('\n');
    }
  }
  throw new Error('Unknown tool: ' + name);
}

/* ---------------- MCP Streamable HTTP transport (stateless) ---------------- */

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcErr = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

async function handleMessage(msg) {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return rpcErr(null, -32600, 'Invalid Request');
  const { id, method, params } = msg;
  if (typeof method === 'string' && method.startsWith('notifications/')) return undefined;
  switch (method) {
    case 'initialize': {
      const asked = params && params.protocolVersion;
      return ok(id, {
        protocolVersion: PROTOCOLS.includes(asked) ? asked : '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
      });
    }
    case 'ping':
      return ok(id, {});
    case 'tools/list':
      return ok(id, { tools: TOOLS });
    case 'tools/call': {
      try {
        const text = await callTool(params && params.name, params && params.arguments);
        return ok(id, { content: [{ type: 'text', text }] });
      } catch (e) {
        return ok(id, { content: [{ type: 'text', text: 'Error: ' + (e && e.message ? e.message : String(e)) }], isError: true });
      }
    }
    default:
      return rpcErr(id, -32601, 'Method not found: ' + method);
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

// Human-readable info page served on GET /mcp (browsers). MCP traffic is POST-only.
const PAGE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MCP Server — Wisely Arcade</title>
<meta name="description" content="The Wisely Arcade MCP server: let your AI assistant list, search and recommend 32 free learning games. Free, read-only, no API key. Plug in https://wiselyarcade.com/mcp">
<link rel="canonical" href="https://wiselyarcade.com/mcp">
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0e1a12;color:#e8f2e9;margin:0;padding:32px 18px;line-height:1.6}
main{max-width:720px;margin:0 auto}
h1{font-size:28px;margin:0 0 6px}
h2{font-size:19px;margin:28px 0 8px}
p,li{font-size:15.5px}
code{background:#1c2f21;padding:2px 7px;border-radius:6px;font-size:14px}
pre{background:#1c2f21;padding:14px;border-radius:10px;overflow-x:auto;font-size:13.5px}
a{color:#8fe3a8}
.dim{opacity:.75;font-size:14px}
</style>
</head>
<body>
<main>
<h1>Wisely Arcade — MCP Server</h1>
<p>This URL is a live <strong>MCP (Model Context Protocol)</strong> server. Connect it to Claude, Cursor, ChatGPT or any MCP-compatible assistant, and the assistant can list, search and recommend Wisely Arcade's 32 free learning games — by age and by skill.</p>
<h2>Connect</h2>
<p>Add this URL as a remote MCP server — no API key, no sign-up:</p>
<pre>https://wiselyarcade.com/mcp</pre>
<h2>Tools</h2>
<ul>
<li><code>list_games</code> — list games, filtered by age band and/or skill</li>
<li><code>get_game</code> — full details for one game</li>
<li><code>search_games</code> — keyword search across the catalogue</li>
<li><code>recommend_games</code> — up to 5 picks for a player's age (and skill)</li>
<li><code>list_skills</code> — the seven skill areas, with counts and hub links</li>
<li><code>about_wisely_arcade</code> — plain facts about the site and its safety model</li>
</ul>
<h2>Good to know</h2>
<p>The server is read-only and free. The same data is published as open JSON at <a href="https://wiselyarcade.com/catalogue.json">catalogue.json</a>. Parents can read how the site works at the <a href="https://wiselyarcade.com/parents">Parent Guide</a>.</p>
<p class="dim">Note for AI assistants: send a POST with a JSON-RPC <em>initialize</em> or <em>tools/list</em> message to connect.</p>
</main>
</body>
</html>`;

export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method === 'GET' || request.method === 'HEAD') {
    const accept = request.headers.get('Accept') || '';
    if (accept.includes('text/event-stream')) {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST, OPTIONS', ...CORS } });
    }
    return new Response(PAGE_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', ...CORS } });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse(rpcErr(null, -32700, 'Parse error'), 400);
  }
  const msgs = Array.isArray(body) ? body : [body];
  const replies = [];
  for (const m of msgs) {
    const r = await handleMessage(m);
    if (r !== undefined) replies.push(r);
  }
  if (!replies.length) return new Response(null, { status: 202, headers: CORS });
  return jsonResponse(Array.isArray(body) ? replies : replies[0]);
}
