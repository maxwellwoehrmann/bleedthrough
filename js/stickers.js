/* ============================================================
   BLEEDTHROUGH v0.2 — stickers.js
   Consumable sticky notes, bought in the bathroom stall.
   Hold max 3. One use per turn, and using one never costs
   your placement. Priced by strength.
   ============================================================ */

var Stickers = (function () {

  var DB = {};
  function def(s) { DB[s.id] = s; }

  def({
    id: 'peek', name: 'Corner Peek', price: 1, icon: '👀',
    text: "See where the student will move next, for the rest of this page.",
    flavor: 'Lean back. Squint. Act natural.',
    target: null,
    effect: function (G) { G.peek = true; },
  });
  def({
    id: 'smudgeBomb', name: 'Smudge Bomb', price: 2, icon: '💣',
    text: 'Smudge an empty square. Nobody plays there for 2 turns.',
    flavor: 'Palm, meet fresh graphite.',
    target: 'empty',
    effect: function (G, ctx) { Engine.at(G, ctx.r, ctx.c).smudge = 2; },
  });
  def({
    id: 'pinkEraser', name: 'Pink Eraser', price: 2, icon: '▱',
    text: 'Erase one O. Leaves a smudge for 2 turns.',
    flavor: 'It came free with a pencil. It erases like it, too.',
    target: 'enemyO',
    effect: function (G, ctx) { Engine.eraseO(G, ctx.r, ctx.c, 2); },
  });
  def({
    id: 'anchor', name: 'Anchor Sticker', price: 3, icon: '⚓',
    text: 'Your next X cannot be burned, zapped, or erased.',
    flavor: 'Stuck on there REAL good.',
    target: null,
    effect: function (G) { G.shieldNext = true; },
  });
  def({
    id: 'cleanEraser', name: 'Art-Gum Eraser', price: 3, icon: '◻',
    text: 'Erase one O cleanly — the square is instantly usable.',
    flavor: 'Erases so clean the paper forgets.',
    target: 'enemyO',
    effect: function (G, ctx) { Engine.eraseO(G, ctx.r, ctx.c, 0); },
  });
  def({
    id: 'twofer', name: 'Two-fer', price: 4, icon: '⁑',
    text: 'Place two X’s this turn.',
    flavor: 'The teacher only saw one of them.',
    target: null,
    effect: function (G) { G.extraPlaces += 1; },
  });
  def({
    id: 'marginNote', name: 'Margin Note', price: 4, icon: '🖇',
    text: 'Place one X OUTSIDE the board. It counts for your lines.',
    flavor: 'The board ends where your ambition does.',
    target: null,
    effect: function (G) { G.marginUnlocks += 1; },
  });
  def({
    id: 'timeOut', name: 'Hall Pass', price: 5, icon: '🚪',
    text: 'The student skips their next turn.',
    flavor: '"You’re wanted in the office." They are not.',
    target: null,
    effect: function (G) { G.skipEnemyTurns += 1; },
  });
  def({
    id: 'bellRinger', name: 'Fire Drill', price: 5, icon: '🔔',
    text: 'Erase two O’s cleanly.',
    flavor: 'Everyone out! Especially you two.',
    target: 'enemyO2',
    effect: function (G, ctx) {
      ctx.targets.forEach(function (t) { Engine.eraseO(G, t.r, t.c, 0); });
    },
  });

  /* The stall shows 5 random distinct notes; you may buy ONE. */
  function shopOffer(rng) {
    var ids = Object.keys(DB);
    Run.shuffle(rng, ids);
    return ids.slice(0, 5);
  }

  return { DB: DB, shopOffer: shopOffer };
})();

if (typeof module !== 'undefined') module.exports = Stickers;
