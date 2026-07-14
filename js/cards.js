/* ============================================================
   BLEEDTHROUGH — cards.js
   The card database. Declarative: each card names a target kind;
   main.js runs the targeting UI, then calls effect(G, ctx).
   Types: active | rule | trinket | goal | margin
   Margin cards never consume a play.
   ============================================================ */

var Cards = (function () {

  var DB = {};
  function def(card) { DB[card.id] = card; }

  // ---------------- ACTIVES: placement shapes ----------------
  def({
    id: 'slash', name: 'Slash', type: 'active', target: null, icon: '〳',
    text: 'Your next placement is a line of 3.',
    flavor: 'One clean stroke.',
    effect: function (G) { G.placement.P = { kind: 'line', len: 3 }; },
  });
  def({
    id: 'longStroke', name: 'Long Stroke', type: 'active', target: null, icon: '〜',
    text: 'Your next placement is a line of 4.',
    flavor: 'Follow through from the shoulder.',
    effect: function (G) { G.placement.P = { kind: 'line', len: 4 }; },
  });
  def({
    id: 'longerStroke', name: 'Longer Stroke', type: 'active', target: null, icon: '〰',
    text: 'Your next placement is a line of 5.',
    flavor: 'The ruler was a lie all along.',
    effect: function (G) { G.placement.P = { kind: 'line', len: 5 }; },
  });
  def({
    id: 'yardstick', name: 'The Yardstick', type: 'active', target: null, icon: '📏',
    text: 'Your next placement is a line of 6. (Careful what qualifies…)',
    flavor: 'Overkill is a kind of confidence.',
    effect: function (G) { G.placement.P = { kind: 'line', len: 6 }; },
  });
  def({
    id: 'fatMarker', name: 'Fat Marker', type: 'active', target: null, icon: '▆',
    text: 'Your next placement is a 2×2 block. Blocks build territory, not lines.',
    flavor: 'Chisel tip. No regrets.',
    effect: function (G) { G.placement.P = { kind: 'block', w: 2, h: 2 }; },
  });
  def({
    id: 'oxygel', name: 'Oxygel', type: 'active', target: null, icon: '💧',
    text: 'Split your next placement: place each of its marks anywhere, one at a time.',
    flavor: 'The ink floats free of the pen.',
    effect: function (G) {
      var s = G.placement.P || { kind: 'line', len: 1 };
      var n = s.kind === 'line' ? s.len : s.kind === 'free' ? s.n : s.w * s.h;
      G.placement.P = { kind: 'free', n: Math.max(n, 3) };
    },
  });

  // ---------------- ACTIVES: board manipulation ----------------
  def({
    id: 'eraser', name: 'Eraser', type: 'active', target: 'enemy-mark', icon: '▱',
    text: 'Erase 1 uncircled enemy mark. Leaves a smudge nobody can use.',
    flavor: 'Cheap pink rubber. It never erases clean.',
    effect: function (G, ctx) {
      Engine.smudgeErase(G, ctx.cellIdx);
      G.fx.push({ t: 'erase', cells: [ctx.cellIdx], clean: false });
    },
  });
  def({
    id: 'whiteOut', name: 'White-Out', type: 'active', target: 'strip-erase', icon: '⌫',
    text: 'Clean-erase up to 3 cells in a straight strip (uncircled marks and smudges).',
    flavor: 'Paint over your mistakes. Or theirs.',
    effect: function (G, ctx) {
      var hit = [];
      ctx.cellIdxs.forEach(function (i) { if (Engine.cleanErase(G, i)) hit.push(i); });
      if (hit.length) G.fx.push({ t: 'erase', cells: hit, clean: true });
    },
  });
  def({
    id: 'scribble', name: 'Scribble', type: 'active', target: 'empty-cell', icon: '🌀',
    text: 'Smudge any empty cell. Nobody can ever place there.',
    flavor: 'Angry little tornado.',
    effect: function (G, ctx) { G.cells[ctx.cellIdx].smudge = true; },
  });
  def({
    id: 'undo', name: 'Undo', type: 'active', target: null, icon: '↺',
    text: "Clean-erase every uncircled mark the enemy placed last turn.",
    flavor: 'ctrl+z, but in pen.',
    effect: function (G) {
      var hit = [];
      G.enemyLastPlaced.forEach(function (i) { if (Engine.cleanErase(G, i)) hit.push(i); });
      if (hit.length) G.fx.push({ t: 'erase', cells: hit, clean: true });
      else G.fx.push({ t: 'toast', msg: 'Nothing to undo — the ink already dried.' });
    },
  });
  def({
    id: 'starSticker', name: 'Star Sticker', type: 'active', target: 'empty-cell', icon: '★',
    text: 'Draw a star on an empty cell. Scored lines through it gain +3 ink.',
    flavor: 'Good job! Gold star.',
    effect: function (G, ctx) { G.cells[ctx.cellIdx].terrain = 'star'; },
  });
  def({
    id: 'coffeeBreak', name: 'Coffee Break', type: 'active', target: 'empty-cell', icon: '☕',
    text: 'Set a coffee ring on an empty cell. Lines scored through it are ×2 — for anyone.',
    flavor: 'Some stains are strategic.',
    effect: function (G, ctx) { G.cells[ctx.cellIdx].terrain = 'ring'; },
  });
  def({
    id: 'spiralDoodle', name: 'Spiral Doodle', type: 'active', target: 'empty-cell', icon: '🌪',
    text: 'Draw THE SPIRAL on an empty cell (moves it if it exists). A qualifying line through it wins the match instantly. For anyone.',
    flavor: 'You drew it during class. Now it wants blood.',
    effect: function (G, ctx) {
      G.cells.forEach(function (cl) { if (cl.terrain === 'spiral') cl.terrain = null; });
      G.cells[ctx.cellIdx].terrain = 'spiral';
    },
  });

  // ---------------- ACTIVES: flipside prep ----------------
  def({
    id: 'inkSpill', name: 'Ink Spill', type: 'active', target: 'area-3x3', icon: '🫙',
    text: 'Douse a 3×3 area. On the FLIPSIDE, those cells start as your marks.',
    flavor: 'Tomorrow-you sends their thanks.',
    effect: function (G, ctx) {
      ctx.cellIdxs.forEach(function (i) { G.cells[i].spill = true; });
      G.fx.push({ t: 'spill', cells: ctx.cellIdxs });
    },
  });
  def({
    id: 'pressHard', name: 'Press Hard', type: 'active', target: null, icon: '✍',
    text: 'Marks you place this turn bleed through to the flipside as your marks.',
    flavor: 'Three carbon copies deep.',
    effect: function (G) { G.pressHardThisTurn = true; },
  });

  // ---------------- ACTIVES: theft ----------------
  def({
    id: 'fiveFinger', name: 'Five-Finger Discount', type: 'active', target: 'steal', icon: '🖐',
    text: "Steal an enemy trinket (or take back one of yours).",
    flavor: 'It was just lying there. On their desk. In their hand.',
    effect: function (G, ctx) {
      if (Engine.hasTrinket(G, 'E', 'grippyGlove')) {
        G.fx.push({ t: 'toast', msg: 'The Grippy Glove grips! Nothing comes loose.' });
        return;
      }
      var k = G.trinkets.E.indexOf(ctx.trinketId);
      if (k !== -1) {
        G.trinkets.E.splice(k, 1);
        G.trinkets.P.push(ctx.trinketId);
        G.fx.push({ t: 'toast', msg: 'Swiped: ' + DB[ctx.trinketId].name + '!' });
      }
    },
  });

  // ---------------- RULES (persistent, global) ----------------
  def({
    id: 'doubleDown', name: 'Double Down', type: 'rule', target: null, icon: '×2',
    text: 'ALL placement lengths are doubled. Singles become 2-lines. Everything escalates.',
    flavor: 'Rule written twice, underlined twice.',
    effect: function (G) { Engine.addRule(G, 'doubleDown'); },
  });
  def({
    id: 'oddInk', name: 'Odd Ink', type: 'rule', target: null, icon: '1·3·5',
    text: 'Only ODD-length lines score.',
    flavor: 'Even numbers are a government plot.',
    effect: function (G) { Engine.addRule(G, 'oddInk'); },
  });
  def({
    id: 'shortCircuit', name: 'Short Circuit', type: 'rule', target: null, icon: '≤4',
    text: 'Only lines of length 4 or shorter score. Overshooting is worth nothing.',
    flavor: 'The margins have shrunk.',
    effect: function (G) { Engine.addRule(G, 'shortCircuit'); },
  });
  def({
    id: 'grandLines', name: 'Grand Lines', type: 'rule', target: null, icon: '≥5',
    text: 'Only lines of 5+ score — but they score TRIPLE.',
    flavor: 'Go big or go to the recycling bin.',
    effect: function (G) { Engine.addRule(G, 'grandLines'); },
  });
  def({
    id: 'suddenDeath', name: 'Sudden Death', type: 'rule', target: null, icon: '☠',
    text: 'ANY line of 6+ instantly wins the match. Qualifying or not. For anyone.',
    flavor: 'Written in red. Underlined three times.',
    effect: function (G) { Engine.addRule(G, 'suddenDeath'); },
  });
  def({
    id: 'inkTax', name: 'Ink Tax', type: 'rule', target: null, icon: '−3',
    text: 'All scored lines are worth 3 less ink (minimum 1).',
    flavor: 'The notebook takes its cut.',
    effect: function (G) { Engine.addRule(G, 'inkTax'); },
  });
  def({
    id: 'diagonalPride', name: 'Diagonal Pride', type: 'rule', target: null, icon: '⤢',
    text: 'Diagonal lines score DOUBLE.',
    flavor: 'Why walk the grid when you can cut across the lawn?',
    effect: function (G) { Engine.addRule(G, 'diagonalPride'); },
  });
  def({
    id: 'orthodox', name: 'Orthodox', type: 'rule', target: null, icon: '✚',
    text: "Diagonal lines don't score at all.",
    flavor: 'Stay between the lines. The lines are your friends.',
    effect: function (G) { Engine.addRule(G, 'orthodox'); },
  });
  def({
    id: 'overdraw', name: 'Overdraw', type: 'rule', target: null, icon: '🂠🂠',
    text: 'Both players draw 2 cards per turn.',
    flavor: 'More ideas than the page can hold.',
    effect: function (G) { Engine.addRule(G, 'overdraw'); },
  });
  def({
    id: 'frenzy', name: 'Frenzy', type: 'rule', target: null, icon: '‼',
    text: 'Both players may play 2 cards per turn.',
    flavor: 'The pen is moving faster than the thought.',
    effect: function (G) { Engine.addRule(G, 'frenzy'); G.playsLeft += 1; },
  });
  def({
    id: 'heavyPaper', name: 'Heavy Paper', type: 'rule', target: null, icon: '▤',
    text: 'NOTHING bleeds through to the flipside. Cardstock. Ruthless.',
    flavor: '120gsm of pure denial.',
    effect: function (G) { Engine.addRule(G, 'heavyPaper'); },
  });

  // ---------------- TRINKETS (persistent, stealable) ----------------
  def({
    id: 'japaneseEraser', name: 'Japanese Eraser', type: 'trinket', target: null, icon: '🧊',
    text: 'After you place marks, uncircled enemy marks diagonally adjacent to them vanish — cleanly, no smudge.',
    flavor: 'Imported. Shaped like a tiny sushi. Erases like a miracle.',
    effect: function (G) { G.trinkets.P.push('japaneseEraser'); },
  });
  def({
    id: 'luckyCoin', name: 'Lucky Coin', type: 'trinket', target: null, icon: '🪙',
    text: 'Your scored lines are worth +2 ink.',
    flavor: 'Found it heads-up in the parking lot.',
    effect: function (G) { G.trinkets.P.push('luckyCoin'); },
  });
  def({
    id: 'compass', name: 'Compass', type: 'trinket', target: null, icon: '📐',
    text: 'Your diagonal lines are worth +4 ink.',
    flavor: 'The pointy kind. Confiscated twice.',
    effect: function (G) { G.trinkets.P.push('compass'); },
  });
  def({
    id: 'grippyGlove', name: 'Grippy Glove', type: 'trinket', target: null, icon: '🧤',
    text: "Your trinkets can't be stolen. (Including this one. Don't think about it too hard.)",
    flavor: 'Rubber dots on the palm. Maximum security.',
    effect: function (G) { G.trinkets.P.push('grippyGlove'); },
  });
  def({
    id: 'safetyScissors', name: 'Safety Scissors', type: 'trinket', target: null, icon: '✂',
    text: 'The first knockout against you fizzles — the line just scores instead. Then the scissors break.',
    flavor: 'They cannot cut you. That is the whole point.',
    effect: function (G) { G.trinkets.P.push('safetyScissors'); },
  });
  def({
    id: 'magnifyingGlass', name: 'Magnifying Glass', type: 'trinket', target: null, icon: '🔍',
    text: "Enemy SURPRISE moves are revealed to you in advance.",
    flavor: 'For inspecting fine print and finer lies.',
    effect: function (G) { G.trinkets.P.push('magnifyingGlass'); },
  });
  def({
    id: 'carbonPaper', name: 'Carbon Paper', type: 'trinket', target: null, icon: '⿻',
    text: 'When a flipside starts, add copies of up to 2 Actives you played on the front to your hand.',
    flavor: 'Everything you did echoes one page down.',
    effect: function (G) { G.trinkets.P.push('carbonPaper'); },
  });
  // enemy-only trinket (steal target)
  def({
    id: 'blueBlood', name: 'Blue Blood', type: 'trinket', target: null, icon: '🖋',
    text: "Owner's scored lines are worth +2 ink.",
    flavor: 'Fountain pen. Monogrammed. Insufferable.',
    effect: function (G) { G.trinkets.E.push('blueBlood'); },
  });

  // ---------------- GOALS (shift the finish line) ----------------
  def({
    id: 'quickDraw', name: 'Quick Draw', type: 'goal', target: null, icon: '⚡',
    text: 'The target score becomes 25. For everyone. Blink and it\'s over.',
    flavor: 'First one to the bell.',
    effect: function (G) { G.target = 25; G.fx.push({ t: 'target' }); },
  });
  def({
    id: 'marathon', name: 'Marathon', type: 'goal', target: null, icon: '🐢',
    text: 'The target score becomes 60. Settle in.',
    flavor: 'The long game. The looong game.',
    effect: function (G) { G.target = 60; G.fx.push({ t: 'target' }); },
  });
  def({
    id: 'flipsidePact', name: 'Flipside Pact', type: 'goal', target: null, icon: '🔄',
    text: 'This page can only be WON on the flipside. The front still shapes what bleeds through — and the front\'s winner starts the flipside with +8 ink.',
    flavor: 'Sign here. And here. And on the back.',
    effect: function (G) { G.flipsidePact = true; G.fx.push({ t: 'target' }); },
  });

  // ---------------- MARGIN (free plays — never cost a play) ----------------
  def({
    id: 'postItAmbush', name: 'Post-It Ambush', type: 'margin', target: 'empty-cell', icon: '📌',
    text: 'MARGIN: free play. Immediately place 1 extra mark right now.',
    flavor: 'Stuck it there while nobody was looking.',
    effect: function (G, ctx) {
      Engine.placeMarks(G, 'P', [ctx.cellIdx], { pressHard: !!G.pressHardThisTurn });
    },
  });
  def({
    id: 'sneakyPeek', name: 'Sneaky Peek', type: 'margin', target: null, icon: '👀',
    text: "MARGIN: free play. Reveal the enemy's next two moves, then draw a card.",
    flavor: 'Lean back. Squint. Act natural.',
    effect: function (G) {
      G.fx.push({ t: 'peek-intents' });
      Engine.draw(G, 1);
    },
  });
  def({
    id: 'doubleTake', name: 'Double Take', type: 'margin', target: null, icon: '⁑',
    text: 'MARGIN: free play. Your placement this turn resolves TWICE (place it, then place it again).',
    flavor: 'Wait. Do that again.',
    effect: function (G) { G.doubleTake = true; },
  });

  // ---------------- decks & pools ----------------
  var STARTER_DECK = [
    'slash', 'slash', 'longStroke', 'fatMarker', 'oxygel',
    'eraser', 'whiteOut', 'scribble', 'inkSpill',
    'doubleDown', 'oddInk', 'grandLines', 'frenzy',
    'luckyCoin', 'carbonPaper',
    'postItAmbush', 'fiveFinger',
  ];

  var DRAFT_POOL = [
    'longerStroke', 'yardstick', 'shortCircuit', 'suddenDeath', 'inkTax',
    'diagonalPride', 'orthodox', 'overdraw', 'heavyPaper',
    'japaneseEraser', 'compass', 'grippyGlove', 'safetyScissors', 'magnifyingGlass',
    'starSticker', 'coffeeBreak', 'pressHard', 'undo', 'spiralDoodle',
    'quickDraw', 'marathon', 'flipsidePact',
    'sneakyPeek', 'doubleTake', 'postItAmbush',
  ];

  return { DB: DB, STARTER_DECK: STARTER_DECK, DRAFT_POOL: DRAFT_POOL };
})();

if (typeof module !== 'undefined') module.exports = Cards;
