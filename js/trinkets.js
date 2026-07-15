/* ============================================================
   BLEEDTHROUGH v0.3 — trinkets.js
   The engine of the game. Every numeric value is tagged data
   with an improvement direction, so Math Quiz (+1) and Math
   Test (x2, applied AFTER the +1) work on all of them.
   Trinkets stack — duplicates add up. No cap. Chaos.
   ============================================================ */

var Trinkets = (function () {

  var DB = {};
  function def(t) { DB[t.id] = t; }

  // ------------------------------------------------ COMMON
  def({
    id: 'apple', name: "Teacher's Apple", rarity: 'common', icon: '🍎',
    values: { candy: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return '+' + v.candy + ' extra candy for each board you win.'; },
    flavor: 'Shameless. Effective.',
  });
  def({
    id: 'looseChange', name: 'Loose Change', rarity: 'common', icon: '🪙',
    values: { candy: { base: 2, dir: 'up', min: 0 } },
    text: function (v) { return 'Start each notebook with +' + v.candy + ' candy.'; },
    flavor: 'Found in the couch of the teachers\' lounge.',
  });
  def({
    id: 'candyWrapper', name: 'Candy Wrapper', rarity: 'common', icon: '🍬',
    values: { candy: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return 'Draws award +' + v.candy + ' candy instead of nothing.'; },
    flavor: 'Technically still smells like victory.',
  });
  def({
    id: 'gum', name: 'Gum', rarity: 'common', icon: '🫧',
    values: { save: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return 'The first board you lose each notebook costs ' + v.save + ' less candy.'; },
    flavor: 'Still has some flavor. Probably.',
  });
  def({
    id: 'stickerStar', name: 'Sticker Star', rarity: 'common', icon: '⭐',
    values: { nth: { base: 4, dir: 'down', min: 1 } },
    text: function (v) { return 'Every ' + nth(v.nth) + ' X you place is shielded — it survives one hit.'; },
    flavor: 'Great job! You survived!',
  });

  // ------------------------------------------------ UNCOMMON
  def({
    id: 'fork', name: 'Fork', rarity: 'uncommon', icon: '🍴',
    active: 'page', values: { uses: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return v.uses + '×/page: tear an empty square out of the page. Nobody can ever play there.'; },
    flavor: 'Cafeteria issue. Surprisingly sharp.',
  });
  def({
    id: 'candycane', name: 'Candycane', rarity: 'uncommon', icon: '🍭',
    values: { cost: { base: 1, dir: 'down', min: 0 } },
    text: function (v) { return 'You may place a candy (' + v.cost + ' 🍬) instead of an X. Enemy powers cannot destroy it. For whatever reason.'; },
    flavor: 'Nobody questions the candy. Nobody.',
  });
  def({
    id: 'magnet', name: 'Magnet', rarity: 'uncommon', icon: '🧲',
    active: 'page', values: { uses: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return v.uses + '×/page: slide one of your X\'s to an adjacent empty square.'; },
    flavor: 'Confiscated from the science lab. Repeatedly.',
  });
  def({
    id: 'compass', name: 'Compass', rarity: 'uncommon', icon: '🧭',
    values: { uses: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return v.uses + ' X per page may be placed in the margin, OUTSIDE the board. It counts for your lines.'; },
    flavor: 'It points wherever you were going anyway.',
  });
  def({
    id: 'laminator', name: 'Laminator', rarity: 'uncommon', icon: '💳',
    values: { nth: { base: 5, dir: 'down', min: 1 } },
    text: function (v) { return 'Every ' + nth(v.nth) + ' X you place is laminated: indestructible.'; },
    flavor: 'The librarian\'s true power, borrowed.',
  });
  def({
    id: 'toothFairy', name: 'Tooth Fairy', rarity: 'uncommon', icon: '🦷',
    values: { candy: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return 'Whenever one of your X\'s is destroyed, +' + v.candy + ' candy.'; },
    flavor: 'She pays out for any calcium-adjacent loss.',
  });
  def({
    id: 'vendingKey', name: 'Vending Key', rarity: 'uncommon', icon: '🔑',
    values: { visits: { base: 2, dir: 'up', min: 1 } },
    text: function (v) { return 'You may visit the bathroom ' + v.visits + '× per notebook.'; },
    flavor: 'Opens the machine. And certain hearts.',
  });
  def({
    id: 'piggyBank', name: 'Piggy Bank', rarity: 'uncommon', icon: '🐷',
    values: { candy: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return 'When you finish a notebook, +' + v.candy + ' candy per 5 you hold.'; },
    flavor: 'Compound interest, but it oinks.',
  });
  def({
    id: 'seatingChart', name: 'Seating Chart', rarity: 'uncommon', icon: '🪑',
    values: {},
    text: function () { return 'You choose who goes first on every page — even against bosses.'; },
    flavor: 'Whoever holds the chart holds the room.',
  });
  def({
    id: 'fieldTrip', name: 'Field Trip Form', rarity: 'uncommon', icon: '🚌',
    active: 'notebook', values: { uses: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return v.uses + '×/notebook: skip a non-boss page entirely. No candy either way.'; },
    flavor: 'Forged signature. Real freedom.',
  });
  def({
    id: 'studentId', name: 'Student ID', rarity: 'uncommon', icon: '🪪',
    values: { off: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return 'Stall prices are ' + v.off + ' candy cheaper (min 1).'; },
    flavor: 'The photo is of somebody else.',
  });
  def({
    id: 'ballpoint', name: 'Ballpoint Pen', rarity: 'uncommon', icon: '🖊',
    active: 'page', values: { uses: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return v.uses + '×/page: press hard — your next placement BLEEDS THROUGH to the next page of this notebook. (A Stamp block bleeds the whole block.)'; },
    flavor: 'Three carbon copies deep.',
  });

  // ------------------------------------------------ RARE
  def({
    id: 'studyGuide', name: 'Study Guide', rarity: 'rare', icon: '📖',
    values: {},
    text: function () { return 'Always see the square the student is eyeing for their next move.'; },
    flavor: 'Last year\'s answers. This year\'s edge.',
  });
  def({
    id: 'stamp', name: 'Stamp', rarity: 'rare', icon: '🖃',
    values: { nth: { base: 3, dir: 'down', min: 1 }, size: { base: 2, dir: 'up', min: 2 } },
    text: function (v) { return 'Every ' + nth(v.nth) + ' placement is a ' + v.size + '×' + v.size + ' block of X\'s.'; },
    flavor: 'APPROVED. APPROVED. APPROVED.',
  });
  def({
    id: 'fountainPen', name: 'Fountain Pen', rarity: 'rare', icon: '🖋',
    values: {},
    text: function () { return 'Place an X exactly two squares from another of your X\'s, with a clean empty square between: the middle fills in free. Chains.'; },
    flavor: 'The ink wants to connect. Let it.',
  });
  def({
    id: 'mathQuiz', name: 'Math Quiz', rarity: 'rare', icon: '➕',
    values: {},
    text: function () { return 'Every trinket number improves by 1. (Every-3rd becomes every-2nd; +1 becomes +2.)'; },
    flavor: 'Show your work. The work is winning.',
  });
  def({
    id: 'ruler', name: 'Ruler', rarity: 'rare', icon: '📏',
    active: 'page', values: { uses: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return v.uses + '×/page: extend a straight line of 2+ of your X\'s by one free X.'; },
    flavor: 'Twelve inches of pure momentum.',
  });
  def({
    id: 'allowance', name: 'Allowance', rarity: 'rare', icon: '💵',
    values: { candy: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return '+' + v.candy + ' candy at the start of every page.'; },
    flavor: 'For doing chores you did not do.',
  });
  def({
    id: 'detentionSlip', name: 'Detention Slip', rarity: 'rare', icon: '📋',
    values: { slow: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return 'Boss special moves recharge ' + v.slow + ' turn(s) slower.'; },
    flavor: 'See me after class. — The Management',
  });
  def({
    id: 'mirrorTape', name: 'Mirror Tape', rarity: 'rare', icon: '🪞',
    values: {},
    text: function () { return 'Your first X each page is also placed on its mirror-image square.'; },
    flavor: 'The other side of the page is jealous.',
  });
  def({
    id: 'juiceBox', name: 'Juice Box', rarity: 'rare', icon: '🧃',
    values: { at: { base: 1, dir: 'up', min: 1 } },
    text: function (v) { return 'The first time you would hit 0 candy each run, survive at ' + v.at + ' instead.'; },
    flavor: 'Emergency sugar. Break glass. It\'s cardboard.',
  });
  def({
    id: 'cheatSheet', name: 'Cheat Sheet', rarity: 'rare', icon: '📝',
    values: {},
    text: function () { return 'Start every page with a free X in the center.'; },
    flavor: 'Written on your arm in your own handwriting.',
  });
  def({
    id: 'couponBook', name: 'Coupon Book', rarity: 'rare', icon: '🎟',
    values: { div: { base: 2, dir: 'up', min: 2 } },
    text: function (v) { return 'Stall prices are divided by ' + v.div + ' (min 1).'; },
    flavor: 'Expired in 1997. Eddie doesn\'t check.',
  });

  // ------------------------------------------------ MYTHICAL
  def({
    id: 'extraCredit', name: 'Extra Credit', rarity: 'mythical', icon: '💯',
    values: { places: { base: 2, dir: 'up', min: 1 } },
    text: function (v) { return 'You place ' + v.places + ' X\'s every turn.'; },
    flavor: 'The syllabus never said you couldn\'t.',
  });
  def({
    id: 'skippingStone', name: 'Skipping Stone', rarity: 'mythical', icon: '🪨',
    values: {},
    text: function () { return 'Your lines may skip squares: X_X_X counts as 5-in-a-row. Gaps can\'t touch each other.'; },
    flavor: 'It skips across the page like it skipped across the lake.',
  });
  def({
    id: 'mathTest', name: 'Math Test', rarity: 'mythical', icon: '✖️',
    values: {},
    text: function () { return 'Every trinket number is doubled. Applies AFTER Math Quiz\'s +1.'; },
    flavor: 'This will be 200% of your grade.',
  });
  def({
    id: 'connectDots', name: 'Connect-the-Dots', rarity: 'mythical', icon: '🔗',
    values: {},
    text: function () { return 'Any connected blob of your X\'s that\'s win-length or bigger wins. Any shape. Snakes welcome.'; },
    flavor: 'It was a duck the whole time.',
  });
  def({
    id: 'principalsPhone', name: "Principal's Phone", rarity: 'mythical', icon: '☎️',
    active: 'notebook', values: { uses: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return v.uses + '×/notebook: every enemy mark is called to the office. All of them. Gone.'; },
    flavor: '"...yes, all of them. Yes, even the horse."',
  });
  def({
    id: 'bicorneHat', name: 'Bicorne Hat', rarity: 'mythical', icon: '👒', signature: 'history',
    active: 'page', values: { uses: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return v.uses + '×/page: place a 2×1 vertical domino of X\'s. Your own cavalry.'; },
    flavor: 'Napoleon\'s. It still smells like exile.',
  });
  def({
    id: 'stolenThunder', name: 'Stolen Thunder', rarity: 'mythical', icon: '⚡', signature: 'greek',
    active: 'page', values: { uses: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return v.uses + '×/page: your next X is electrified — it sprouts X\'s into its diagonal squares, if unobstructed.'; },
    flavor: 'Zeus is still looking for it.',
  });
  def({
    id: 'beanstalk', name: 'Beanstalk', rarity: 'mythical', icon: '🌱', signature: 'biology',
    active: 'page', values: { uses: { base: 1, dir: 'up', min: 0 } },
    text: function (v) { return v.uses + '×/page: your next X is ROOTED — every turn it grows another X into a random free neighbouring square.'; },
    flavor: 'Traded the family cow for it. Worth it.',
  });
  def({
    id: 'chainReaction', name: 'Chain Reaction', rarity: 'mythical', icon: '💥', signature: 'physics',
    values: { size: { base: 3, dir: 'down', min: 2 } },
    text: function (v) { return 'When your X connects two chains of ' + v.size + '+ of your X\'s, the entire column tears out of the page. Everything in it. Yours too.'; },
    flavor: 'E = mc… whatever. BOOM.',
  });

  function nth(n) {
    return n === 1 ? 'single' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th';
  }

  // ---------------- ownership & value resolution ----------------
  function count(run, id) {
    var n = 0;
    for (var i = 0; i < run.trinkets.length; i++) if (run.trinkets[i] === id) n++;
    return n;
  }
  function has(run, id) { return count(run, id) > 0; }

  /* Math Quiz improves by +1 per copy, then Math Test doubles per copy.
     Direction-aware: 'up' numbers grow, 'down' numbers (every-Nth,
     costs, divisors... wait, divisors are 'up') shrink toward min. */
  function val(run, id, field) {
    var def = DB[id].values[field];
    var v = def.base;
    var quiz = count(run, 'mathQuiz'), test = count(run, 'mathTest');
    if (id !== 'mathQuiz' && id !== 'mathTest') {
      for (var q = 0; q < quiz; q++) v = def.dir === 'up' ? v + 1 : v - 1;
      for (var t = 0; t < test; t++) v = def.dir === 'up' ? v * 2 : Math.ceil(v / 2);
    }
    if (def.min !== undefined) v = Math.max(def.min, v);
    if (def.max !== undefined) v = Math.min(def.max, v);
    return v;
  }

  /* Total across copies for additive effects: copies × value. */
  function total(run, id, field) {
    return count(run, id) * val(run, id, field);
  }

  function text(run, id) {
    var t = DB[id], v = {};
    Object.keys(t.values).forEach(function (f) { v[f] = run ? val(run, id, f) : t.values[f].base; });
    return t.text(v);
  }

  var RARITY_ORDER = ['common', 'uncommon', 'rare', 'mythical'];
  var RARITY_WEIGHT = { common: 0.5, uncommon: 0.3, rare: 0.15, mythical: 0.05 };
  var RARITY_PRICE = { common: 2, uncommon: 4, rare: 7, mythical: 12 };

  function pool(rarity, includeSignatures) {
    return Object.keys(DB).filter(function (id) {
      if (DB[id].rarity !== rarity) return false;
      if (DB[id].signature && !includeSignatures) return false;
      return true;
    });
  }

  function rollRarity(rng) {
    var x = rng(), acc = 0;
    for (var i = 0; i < RARITY_ORDER.length; i++) {
      acc += RARITY_WEIGHT[RARITY_ORDER[i]];
      if (x < acc) return RARITY_ORDER[i];
    }
    return 'common';
  }

  /* n distinct trinket offers, rarity-weighted, no boss signatures. */
  function offer(rng, n) {
    var out = [], guard = 0;
    while (out.length < n && guard++ < 100) {
      var ids = pool(rollRarity(rng), false);
      var id = ids[Math.floor(rng() * ids.length)];
      if (out.indexOf(id) === -1) out.push(id);
    }
    return out;
  }

  function uncommonOffer(rng, n) {
    var ids = pool('uncommon', false);
    for (var i = ids.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = ids[i]; ids[i] = ids[j]; ids[j] = t;
    }
    return ids.slice(0, n);
  }

  function price(run, id) {
    var p = RARITY_PRICE[DB[id].rarity];
    p -= total(run, 'studentId', 'off');
    if (has(run, 'couponBook')) p = Math.floor(p / val(run, 'couponBook', 'div'));
    return Math.max(1, p);
  }

  return {
    DB: DB, RARITY_ORDER: RARITY_ORDER, RARITY_PRICE: RARITY_PRICE,
    count: count, has: has, val: val, total: total, text: text,
    pool: pool, rollRarity: rollRarity, offer: offer, uncommonOffer: uncommonOffer, price: price,
  };
})();

if (typeof module !== 'undefined') module.exports = Trinkets;
