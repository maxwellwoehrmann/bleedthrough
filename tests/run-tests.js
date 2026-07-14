/* BLEEDTHROUGH — engine logic tests (node tests/run-tests.js) */
'use strict';
const path = require('path');

global.Engine = require(path.join(__dirname, '..', 'js', 'engine.js'));
global.Cards = require(path.join(__dirname, '..', 'js', 'cards.js'));
global.Enemy = require(path.join(__dirname, '..', 'js', 'enemy.js'));
global.Flipside = require(path.join(__dirname, '..', 'js', 'flipside.js'));

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (e) { fail++; console.log('FAIL  ' + name + '\n      ' + e.message); }
}
function eq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'eq') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}
function ok(v, msg) { if (!v) throw new Error(msg || 'expected truthy'); }

function mkG(opts) {
  return Engine.newMatch(Object.assign({ seed: 42, target: 40, deck: [] }, opts));
}
function put(G, who, rcs) {
  return Engine.placeMarks(G, who, rcs.map(([r, c]) => Engine.idx(G, r, c)));
}

console.log('\n-- scoring math --');
t('baseScore: 3/4/5/6 -> 3/8/15/24', () => {
  eq(Engine.baseScore(3), 3); eq(Engine.baseScore(4), 8);
  eq(Engine.baseScore(5), 15); eq(Engine.baseScore(6), 24);
});

console.log('\n-- run detection & circling --');
t('3-in-a-row scores 3 and circles', () => {
  const G = mkG();
  const res = put(G, 'P', [[0, 0], [0, 1], [0, 2]]);
  eq(res.scored.length, 1); eq(G.scores.P, 3);
  ok(G.cells[Engine.idx(G, 0, 1)].circled.H, 'middle cell circled H');
});
t('extending a circled 3 to 4 re-scores at length 4', () => {
  const G = mkG();
  put(G, 'P', [[0, 0], [0, 1], [0, 2]]);
  put(G, 'P', [[0, 3]]);
  eq(G.scores.P, 3 + 8);
});
t('re-placing through fully circled run does not double-score', () => {
  const G = mkG();
  put(G, 'P', [[2, 0], [2, 1], [2, 2]]);
  const s = G.scores.P;
  // placing elsewhere in same row but not adjacent: no new run through circles
  put(G, 'P', [[2, 5]]);
  eq(G.scores.P, s);
});
t('2-in-a-row does not score', () => {
  const G = mkG();
  put(G, 'P', [[5, 5], [5, 6]]);
  eq(G.scores.P, 0);
});
t('diagonal run scores', () => {
  const G = mkG();
  const res = put(G, 'P', [[1, 1], [2, 2], [3, 3]]);
  eq(res.scored.length, 1); eq(G.scores.P, 3);
});

console.log('\n-- rule cards shift the goalposts --');
t('Odd Ink: 4-run scores nothing, 5-run scores', () => {
  const G = mkG(); Engine.addRule(G, 'oddInk');
  put(G, 'P', [[0, 0], [0, 1], [0, 2], [0, 3]]);
  eq(G.scores.P, 0, '4 is even');
  put(G, 'P', [[0, 4]]);
  eq(G.scores.P, 15, 'now 5, odd');
});
t('Short Circuit: 5-run scores nothing', () => {
  const G = mkG(); Engine.addRule(G, 'shortCircuit');
  put(G, 'P', [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]]);
  eq(G.scores.P, 0);
});
t('Grand Lines: 5-run scores triple (45), 3-run nothing', () => {
  const G = mkG(); Engine.addRule(G, 'grandLines');
  put(G, 'P', [[2, 0], [2, 1], [2, 2]]);
  eq(G.scores.P, 0);
  const G2 = mkG(); Engine.addRule(G2, 'grandLines');
  put(G2, 'P', [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]]);
  eq(G2.scores.P, 45);
});
t('Orthodox kills diagonals; contradiction with Diagonal Pride replaces', () => {
  const G = mkG(); Engine.addRule(G, 'orthodox');
  put(G, 'P', [[1, 1], [2, 2], [3, 3]]);
  eq(G.scores.P, 0);
  Engine.addRule(G, 'diagonalPride');
  ok(!Engine.hasRule(G, 'orthodox'), 'orthodox replaced');
  ok(Engine.hasRule(G, 'diagonalPride'));
});
t('Ink Tax: minimum 1', () => {
  const G = mkG(); Engine.addRule(G, 'inkTax');
  put(G, 'P', [[0, 0], [0, 1], [0, 2]]);
  eq(G.scores.P, 1, '3 - 3 floored to 1');
});
t('Double Down doubles effective length, capped at board', () => {
  const G = mkG(); Engine.addRule(G, 'doubleDown');
  eq(Engine.effectiveLen(G, 3), 6);
  eq(Engine.effectiveLen(G, 5), 8);
});
t('draw/play economy rules', () => {
  const G = mkG();
  eq(Engine.drawCount(G), 1); eq(Engine.playLimit(G), 1);
  Engine.addRule(G, 'overdraw'); Engine.addRule(G, 'frenzy');
  eq(Engine.drawCount(G), 2); eq(Engine.playLimit(G), 2);
});

console.log('\n-- terrain --');
t('coffee ring doubles, star adds +3', () => {
  const G = mkG();
  Engine.cellAt(G, 3, 1).terrain = 'ring';
  put(G, 'P', [[3, 0], [3, 1], [3, 2]]);
  eq(G.scores.P, 6, '3 x2 ring');
  const G2 = mkG();
  Engine.cellAt(G2, 4, 1).terrain = 'star';
  put(G2, 'P', [[4, 0], [4, 1], [4, 2]]);
  eq(G2.scores.P, 6, '3 + 3 star');
});
t('spiral knockout on qualifying line', () => {
  const G = mkG();
  Engine.cellAt(G, 5, 2).terrain = 'spiral';
  put(G, 'P', [[5, 0], [5, 1], [5, 2]]);
  ok(G.over && G.over.winner === 'P' && G.over.how === 'spiral');
});
t('spiral does NOT trigger on non-qualifying line', () => {
  const G = mkG(); Engine.addRule(G, 'oddInk');
  Engine.cellAt(G, 5, 3).terrain = 'spiral';
  put(G, 'P', [[5, 0], [5, 1], [5, 2], [5, 3]]); // 4 = even, no qualify
  ok(!G.over, 'no KO from unqualified line');
});
t('Sudden Death triggers even on unqualified 6-run', () => {
  const G = mkG(); Engine.addRule(G, 'suddenDeath'); Engine.addRule(G, 'oddInk');
  put(G, 'P', [[6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5]]);
  ok(G.over && G.over.how === 'suddenDeath');
});
t('Safety Scissors fizzles an enemy knockout once', () => {
  const G = mkG();
  G.trinkets.P.push('safetyScissors');
  Engine.cellAt(G, 5, 2).terrain = 'spiral';
  put(G, 'E', [[5, 0], [5, 1], [5, 2]]);
  ok(!G.over, 'KO fizzled');
  eq(G.trinkets.P.indexOf('safetyScissors'), -1, 'scissors consumed');
  eq(G.scores.E, 3, 'line still scored');
});

console.log('\n-- trinkets --');
t('Lucky Coin +2 for P, Blue Blood +2 for E', () => {
  const G = mkG();
  G.trinkets.P.push('luckyCoin'); G.trinkets.E.push('blueBlood');
  put(G, 'P', [[0, 0], [0, 1], [0, 2]]);
  eq(G.scores.P, 5);
  put(G, 'E', [[7, 0], [7, 1], [7, 2]]);
  eq(G.scores.E, 5);
});
t('Japanese Eraser wipes diagonal-adjacent uncircled enemy marks', () => {
  const G = mkG();
  G.trinkets.P.push('japaneseEraser');
  put(G, 'E', [[2, 2]]);
  put(G, 'P', [[3, 3]]);
  eq(Engine.cellAt(G, 2, 2).mark, null, 'enemy mark gone');
  ok(!Engine.cellAt(G, 2, 2).smudge, 'no smudge — clean');
});

console.log('\n-- ghosts & target --');
t('claiming own ghost gives +1 ink', () => {
  const G = mkG({ side: 'flip' });
  Engine.cellAt(G, 4, 4).ghost = 'P';
  put(G, 'P', [[4, 4]]);
  eq(G.scores.P, 1);
  eq(Engine.cellAt(G, 4, 4).ghost, null);
});
t('reaching target ends the match', () => {
  const G = mkG({ target: 3 });
  put(G, 'P', [[0, 0], [0, 1], [0, 2]]);
  ok(G.over && G.over.winner === 'P' && G.over.how === 'target');
});

console.log('\n-- shapes & jam --');
t('fitShape downgrades a line that cannot fit', () => {
  const G = mkG();
  // fill everything except two adjacent cells
  for (let i = 0; i < G.cells.length; i++) G.cells[i].smudge = true;
  Engine.cellAt(G, 0, 0).smudge = false;
  Engine.cellAt(G, 0, 1).smudge = false;
  const s = Engine.fitShape(G, { kind: 'line', len: 4 });
  eq(s.kind, 'line'); eq(s.len, 2);
});
t('jam ends match, higher ink wins', () => {
  const G = mkG();
  G.scores.P = 10; G.scores.E = 4;
  for (let i = 0; i < G.cells.length; i++) G.cells[i].smudge = true;
  Engine.checkJam(G);
  ok(G.over && G.over.winner === 'P' && G.over.how === 'jam');
});

console.log('\n-- flipside bleedthrough --');
t('projection: circled->smudge, loose->ghost, spill->mark, smudge->smudge', () => {
  const G = mkG();
  put(G, 'P', [[0, 0], [0, 1], [0, 2]]);      // circled
  put(G, 'P', [[5, 5]]);                       // loose
  put(G, 'E', [[6, 6]]);                       // loose enemy
  Engine.cellAt(G, 7, 7).smudge = true;
  Engine.cellAt(G, 4, 4).spill = true;
  const proj = Flipside.projection(G);
  eq(proj[Engine.idx(G, 0, 0)].kind, 'smudge');
  eq(proj[Engine.idx(G, 5, 5)].kind, 'ghost');
  eq(proj[Engine.idx(G, 5, 5)].who, 'P');
  eq(proj[Engine.idx(G, 6, 6)].who, 'E');
  eq(proj[Engine.idx(G, 7, 7)].kind, 'smudge');
  eq(proj[Engine.idx(G, 4, 4)].kind, 'mark');
});
t('Heavy Paper blocks all bleedthrough', () => {
  const G = mkG();
  put(G, 'P', [[0, 0], [0, 1], [0, 2]]);
  Engine.addRule(G, 'heavyPaper');
  const proj = Flipside.projection(G);
  ok(proj.every(p => p === null));
});
t('build mirrors horizontally and persists trinkets', () => {
  const G = mkG();
  put(G, 'P', [[3, 0]]); // loose mark at col 0 -> flip col 7
  G.trinkets.P.push('luckyCoin');
  G.over = { winner: 'E', how: 'target' };
  const F = Flipside.build(G, { deck: [], target: 30 });
  eq(Engine.cellAt(F, 3, 7).ghost, 'P', 'mirrored ghost');
  ok(Engine.hasTrinket(F, 'P', 'luckyCoin'));
  eq(F.target, 30); eq(F.side, 'flip');
});
t('press-hard loose marks become real marks on flipside', () => {
  const G = mkG();
  Engine.placeMarks(G, 'P', [Engine.idx(G, 2, 1)], { pressHard: true });
  G.over = { winner: 'E', how: 'target' };
  const F = Flipside.build(G, { deck: [], target: 30 });
  eq(Engine.cellAt(F, 2, 6).mark, 'P');
});
t('Flipside Pact grants front winner +8 on flipside', () => {
  const G = mkG();
  G.flipsidePact = true;
  G.over = { winner: 'P', how: 'target' };
  const F = Flipside.build(G, { deck: [], target: 30 });
  eq(F.scores.P, 8);
});

console.log('\n-- cards sanity --');
t('every deck/pool id exists in DB, and types are valid', () => {
  const types = ['active', 'rule', 'trinket', 'goal', 'margin'];
  Cards.STARTER_DECK.concat(Cards.DRAFT_POOL).forEach(id => {
    ok(Cards.DB[id], 'missing card: ' + id);
    ok(types.indexOf(Cards.DB[id].type) !== -1, 'bad type on ' + id);
  });
});
t('Frenzy grants an extra play immediately', () => {
  const G = mkG();
  G.playsLeft = 0; // just spent the play on Frenzy itself
  Cards.DB.frenzy.effect(G);
  eq(G.playsLeft, 1);
  eq(Engine.playLimit(G), 2);
});
t('Oxygel converts pending line into free placement', () => {
  const G = mkG();
  G.placement.P = { kind: 'line', len: 5 };
  Cards.DB.oxygel.effect(G);
  eq(G.placement.P.kind, 'free'); eq(G.placement.P.n, 5);
});

console.log('\n-- enemy smoke test --');
t('Inkfiend plays 8 full turns without exploding', () => {
  const G = mkG();
  Engine.scatterTerrain(G);
  const foe = Enemy.makeInkfiend('front');
  for (let turn = 0; turn < 8 && !G.over; turn++) {
    // player: drop a mark in the first open cell
    for (let i = 0; i < G.cells.length; i++) {
      if (Engine.placeable(G.cells[i])) { Engine.placeMarks(G, 'P', [i]); break; }
    }
    if (G.over) break;
    Enemy.takeTurn(G, foe);
  }
  ok(true);
});
t('Inksplosion finds a plus shape on an open board', () => {
  const G = mkG();
  const cells = Enemy.inksplosionCells(G);
  ok(cells && cells.length === 5);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
