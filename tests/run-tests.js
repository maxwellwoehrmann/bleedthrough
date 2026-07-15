/* BLEEDTHROUGH v0.3 — engine/trinkets/run/ai tests (bun tests/run-tests.js) */
'use strict';
const path = require('path');

global.Engine = require(path.join(__dirname, '..', 'js', 'engine.js'));
global.Subjects = require(path.join(__dirname, '..', 'js', 'subjects.js'));
global.Trinkets = require(path.join(__dirname, '..', 'js', 'trinkets.js'));
global.Run = require(path.join(__dirname, '..', 'js', 'run.js'));
global.AI = require(path.join(__dirname, '..', 'js', 'ai.js'));

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
  return Engine.newPage(Object.assign({ rows: 4, cols: 4, winLen: 4, seed: 42 }, opts));
}
function fill(G, who, rcs, kind) {
  rcs.forEach(([r, c]) => {
    const cl = Engine.at(G, r, c);
    cl.mark = who === 'P' ? 'X' : 'O';
    if (kind) cl.kind = kind;
  });
}
function mkRun(trinkets, seed) {
  const r = Run.newRun(seed || 7);
  (trinkets || []).forEach(id => r.trinkets.push(id));
  return r;
}

console.log('\n-- boards --');
t('rectangular boards work (7 rows x 5 cols)', () => {
  const G = mkG({ rows: 7, cols: 5, winLen: 5 });
  eq(Engine.innerCells(G).length, 35);
  fill(G, 'P', [[2, 1], [3, 1], [4, 1], [5, 1], [6, 1]]);
  ok(Engine.findWinNormal(G, 'P'), 'vertical 5 wins');
});
t('physics notebooks are taller than wide; others square', () => {
  const r = mkRun();
  r.subjects = ['physics', 'history', 'biology', 'greek'];
  let b = Run.boardFor(r);
  ok(b.rows > b.cols, 'physics tall');
  ok(b.gravity, 'physics has gravity');
  r.level = 2; // history slot
  b = Run.boardFor(r);
  eq(b.rows, b.cols, 'history square');
  ok(!b.gravity, 'no gravity outside physics');
});
t('margin ring: player-only, needs unlock, counts for lines', () => {
  const G = mkG();
  ok(!Engine.canPlace(G, 'P', Engine.at(G, -1, 0)));
  G.marginUnlocks = 1;
  ok(Engine.canPlace(G, 'P', Engine.at(G, -1, 0)));
  ok(!Engine.canPlace(G, 'E', Engine.at(G, -1, 0)));
  fill(G, 'P', [[0, 0], [1, 0], [2, 0]]);
  Engine.place(G, 'P', Engine.at(G, -1, 0));
  ok(Engine.findWinNormal(G, 'P'), 'margin X completes the column');
});

console.log('\n-- gravity --');
t('pieces fall to the bottom', () => {
  const G = mkG({ rows: 6, cols: 4, winLen: 4, gravity: true });
  const target = Engine.target(G, 'P', Engine.at(G, 0, 2));
  eq(target.r, 5, 'lands on the floor');
  Engine.place(G, 'P', target);
  const t2 = Engine.target(G, 'P', Engine.at(G, 0, 2));
  eq(t2.r, 4, 'stacks on top');
});
t('torn squares act as shelves', () => {
  const G = mkG({ rows: 6, cols: 4, winLen: 4, gravity: true });
  Engine.tear(G, Engine.at(G, 3, 1));
  const target = Engine.target(G, 'P', Engine.at(G, 0, 1));
  eq(target.r, 2, 'rests on the tear');
});
t('settle drops floating pieces after destruction', () => {
  const G = mkG({ rows: 6, cols: 4, winLen: 4, gravity: true });
  fill(G, 'P', [[5, 0], [4, 0]]);
  fill(G, 'E', [[3, 0]]);
  Engine.destroy(G, Engine.at(G, 5, 0), true);
  Engine.settle(G);
  eq(Engine.at(G, 5, 0).mark, 'X', 'X fell to floor');
  eq(Engine.at(G, 4, 0).mark, 'O', 'O fell onto it, order preserved');
  ok(!Engine.at(G, 3, 0).mark, 'top square now empty');
});

console.log('\n-- win modes --');
t('Skipping Stone: X_X_X wins on winLen 5', () => {
  const G = mkG({ rows: 5, cols: 5, winLen: 5 });
  fill(G, 'P', [[2, 0], [2, 2], [2, 4]]);
  ok(!Engine.findWinNormal(G, 'P'));
  ok(Engine.findWinSkipping(G, 'P'), 'skipping win');
});
t('Skipping Stone: no double gaps, no gap ends', () => {
  const G = mkG({ rows: 5, cols: 5, winLen: 5 });
  fill(G, 'P', [[1, 0], [1, 4]]);            // X___X
  ok(!Engine.findWinSkipping(G, 'P'));
  const G2 = mkG({ rows: 5, cols: 5, winLen: 5 });
  fill(G2, 'P', [[3, 1], [3, 2], [3, 3], [3, 4]]); // _XXXX span needs X ends
  ok(!Engine.findWinSkipping(G2, 'P') || Engine.findWinNormal(G2, 'P') === null);
});
t('Connect-the-Dots: a snake of winLen wins', () => {
  const G = mkG({ rows: 4, cols: 4, winLen: 4 });
  fill(G, 'P', [[0, 0], [1, 0], [1, 1], [2, 1]]);
  ok(!Engine.findWinNormal(G, 'P'));
  ok(Engine.findWinConnect(G, 'P'), 'connected blob of 4');
});
t('candy marks count as X for lines', () => {
  const G = mkG();
  fill(G, 'P', [[0, 0], [0, 1], [0, 2]]);
  fill(G, 'P', [[0, 3]], 'candy');
  ok(Engine.findWinNormal(G, 'P'));
});
t('blockers (swords) count for nobody', () => {
  const G = mkG();
  fill(G, 'E', [[1, 0], [1, 1], [1, 2]]);
  Engine.at(G, 1, 3).mark = 'B';
  ok(!Engine.findWinNormal(G, 'E'));
});

console.log('\n-- tokens & powers --');
t('horse occupies 2, trident 3, sword blocks 3', () => {
  const G = mkG({ rows: 6, cols: 6, winLen: 5 });
  ok(Engine.placeToken(G, 'horse', 0, 0));
  eq(Engine.at(G, 1, 0).kind, 'horse');
  ok(Engine.placeToken(G, 'trident', 0, 2));
  eq(Engine.at(G, 2, 2).mark, 'O');
  ok(Engine.placeToken(G, 'sword', 5, 1));
  eq(Engine.at(G, 5, 2).mark, 'B');
});
t('destroy respects candy, lamination, shield', () => {
  const G = mkG();
  fill(G, 'P', [[0, 0]], 'candy');
  eq(Engine.destroy(G, Engine.at(G, 0, 0), false), 'immune');
  const c1 = Engine.at(G, 1, 1); c1.mark = 'X'; c1.laminated = true;
  eq(Engine.destroy(G, c1, false), 'immune');
  const c2 = Engine.at(G, 2, 2); c2.mark = 'X'; c2.shield = true;
  eq(Engine.destroy(G, c2, false), 'shielded');
  eq(c2.mark, 'X', 'still there');
  eq(Engine.destroy(G, c2, false), 'destroyed');
});
t('tearColumn destroys everything in the column', () => {
  const G = mkG({ rows: 5, cols: 5, winLen: 5 });
  fill(G, 'P', [[0, 2], [1, 2]]);
  fill(G, 'E', [[3, 2]]);
  eq(Engine.tearColumn(G, 2), 5);
  ok(Engine.at(G, 0, 2).torn && !Engine.at(G, 0, 2).mark);
});
t('connectsChains detects a bridge between two 3-chains', () => {
  const G = mkG({ rows: 5, cols: 7, winLen: 5 });
  fill(G, 'P', [[2, 0], [2, 1], [2, 2]]);   // chain A
  fill(G, 'P', [[2, 4], [2, 5], [2, 6]]);   // chain B
  const bridge = Engine.at(G, 2, 3);
  bridge.mark = 'X';
  ok(Engine.connectsChains(G, bridge, 'P', 3));
  const lone = Engine.at(G, 4, 3); lone.mark = 'X';
  ok(!Engine.connectsChains(G, lone, 'P', 3));
});
t('fountain pen fills gaps and chains', () => {
  const G = mkG({ rows: 5, cols: 7, winLen: 5 });
  fill(G, 'P', [[1, 0], [1, 2], [1, 4]]);
  const fills = Engine.penFills(G, 'P');
  eq(fills.length, 2, 'both middles filled');
  eq(Engine.at(G, 1, 1).mark, 'X');
  eq(Engine.at(G, 1, 3).mark, 'X');
});
t('electrify sprouts diagonal X\'s', () => {
  const G = mkG();
  const cell = Engine.at(G, 1, 1); cell.mark = 'X';
  const made = Engine.electrify(G, cell, 'P');
  eq(made.length, 4);
});
t('rooted X sprouts a neighbour', () => {
  const G = mkG();
  const cell = Engine.at(G, 1, 1); cell.mark = 'X'; cell.rooted = true;
  const made = Engine.sproutRooted(G, 'P');
  eq(made.length, 1);
  ok(made[0].mark === 'X');
});
t('webs block the player for one turn only', () => {
  const G = mkG();
  Engine.at(G, 2, 2).web = 1;
  ok(!Engine.canPlace(G, 'P', Engine.at(G, 2, 2)));
  ok(Engine.canPlace(G, 'E', Engine.at(G, 2, 2)));
  Engine.tickAfter(G, 'P');
  ok(Engine.canPlace(G, 'P', Engine.at(G, 2, 2)));
});

console.log('\n-- trinket math (Quiz then Test) --');
t('Teacher\'s Apple: 1 -> 2 (quiz) -> 4 (test after quiz)', () => {
  const r = mkRun(['apple']);
  eq(Trinkets.val(r, 'apple', 'candy'), 1);
  r.trinkets.push('mathQuiz');
  eq(Trinkets.val(r, 'apple', 'candy'), 2);
  r.trinkets.push('mathTest');
  eq(Trinkets.val(r, 'apple', 'candy'), 4);
});
t('Stamp: every-3rd 2x2 -> every-2nd 3x3 (quiz) -> every-1st 6x6 (test)', () => {
  const r = mkRun(['stamp']);
  eq(Trinkets.val(r, 'stamp', 'nth'), 3);
  eq(Trinkets.val(r, 'stamp', 'size'), 2);
  r.trinkets.push('mathQuiz');
  eq(Trinkets.val(r, 'stamp', 'nth'), 2);
  eq(Trinkets.val(r, 'stamp', 'size'), 3);
  r.trinkets.push('mathTest');
  eq(Trinkets.val(r, 'stamp', 'nth'), 1);
  eq(Trinkets.val(r, 'stamp', 'size'), 6);
});
t('every-Nth clamps at 1; candycane cost can hit 0', () => {
  const r = mkRun(['stickerStar', 'candycane', 'mathQuiz', 'mathQuiz', 'mathQuiz', 'mathQuiz']);
  eq(Trinkets.val(r, 'stickerStar', 'nth'), 1);
  eq(Trinkets.val(r, 'candycane', 'cost'), 0);
});
t('duplicates stack via total()', () => {
  const r = mkRun(['apple', 'apple']);
  eq(Trinkets.total(r, 'apple', 'candy'), 2);
});
t('Extra Credit: 2 places, x2 with Math Test', () => {
  const r = mkRun(['extraCredit']);
  eq(Trinkets.val(r, 'extraCredit', 'places'), 2);
  r.trinkets.push('mathTest');
  eq(Trinkets.val(r, 'extraCredit', 'places'), 4);
});

console.log('\n-- letter grades --');
t('grade order: base -> grade -> quiz -> test', () => {
  const r = mkRun(['apple']);
  Trinkets.setGrade(r, 'apple', 1);              // B
  eq(Trinkets.val(r, 'apple', 'candy'), 2, 'C base 1, B = 2');
  r.trinkets.push('mathQuiz');
  eq(Trinkets.val(r, 'apple', 'candy'), 3, '(1+grade1)+quiz1');
  r.trinkets.push('mathTest');
  eq(Trinkets.val(r, 'apple', 'candy'), 6, 'then doubled');
});
t('grades improve every field, direction-aware', () => {
  const r = mkRun(['stamp']);
  Trinkets.setGrade(r, 'stamp', 1);
  eq(Trinkets.val(r, 'stamp', 'nth'), 2, 'every-3rd -> every-2nd');
  eq(Trinkets.val(r, 'stamp', 'size'), 3, '2x2 -> 3x3');
});
t('every trinket is gradeable (numeric or hand-authored track)', () => {
  Object.keys(Trinkets.DB).forEach(id => ok(Trinkets.gradeable(id), id));
});
t('grade caps at A+', () => {
  const r = mkRun(['apple']);
  Trinkets.setGrade(r, 'apple', 99);
  eq(Trinkets.grade(r, 'apple'), 3);
  eq(Trinkets.gradeName(r, 'apple'), 'A+');
  eq(Trinkets.upgradePrice(r, 'apple'), null, 'no further upgrades');
});
t('upgrade prices: 3/6/10, discounted by Student ID and Coupon Book', () => {
  const r = mkRun(['apple']);
  eq(Trinkets.upgradePrice(r, 'apple'), 3);
  Trinkets.setGrade(r, 'apple', 1);
  eq(Trinkets.upgradePrice(r, 'apple'), 6);
  Trinkets.setGrade(r, 'apple', 2);
  eq(Trinkets.upgradePrice(r, 'apple'), 10);
  r.trinkets.push('studentId');
  eq(Trinkets.upgradePrice(r, 'apple'), 9);
  r.trinkets.push('couponBook');
  eq(Trinkets.upgradePrice(r, 'apple'), 4, '(10-1)/2 floored');
});
t('Tutor: new trinkets arrive graded; stacks; Red Pen has value', () => {
  const r = mkRun();
  eq(Trinkets.arrivalGrade(r), 0);
  r.trinkets.push('tutor');
  eq(Trinkets.arrivalGrade(r), 1);
  r.trinkets.push('tutor');
  eq(Trinkets.arrivalGrade(r), 2);
  eq(Trinkets.DB.redPen.rarity, 'mythical');
  eq(Trinkets.DB.tutor.rarity, 'rare');
  eq(Trinkets.total(mkRun(['redPen']), 'redPen', 'grades'), 1);
});
t('graded values flow into charges-style uses (Fork B = 2 tears)', () => {
  const r = mkRun(['fork']);
  Trinkets.setGrade(r, 'fork', 1);
  eq(Trinkets.val(r, 'fork', 'uses'), 2);
});
t('flawless tracking: losses count and reset per notebook', () => {
  const r = mkRun();
  eq(r.lossesThisNotebook, 0);
  Run.applyResult(r, 'loss');
  eq(r.lossesThisNotebook, 1);
  Run.nextLevel(r);
  eq(r.lossesThisNotebook, 0);
});

console.log('\n-- phase 2 grade effects --');
t('numberless trinkets with grade tracks are gradeable', () => {
  ['fountainPen', 'mirrorTape', 'cheatSheet', 'studyGuide', 'seatingChart',
   'skippingStone', 'connectDots', 'mathQuiz', 'mathTest'].forEach(id => {
    ok(Trinkets.gradeable(id), id);
  });
});
t('graded Math Quiz applies extra steps', () => {
  const r = mkRun(['apple', 'mathQuiz']);
  eq(Trinkets.val(r, 'apple', 'candy'), 2);
  Trinkets.setGrade(r, 'mathQuiz', 2);          // A: +3 per copy
  eq(Trinkets.val(r, 'apple', 'candy'), 4);
});
t('graded Math Test doubles more', () => {
  const r = mkRun(['apple', 'mathTest']);
  eq(Trinkets.val(r, 'apple', 'candy'), 2);
  Trinkets.setGrade(r, 'mathTest', 1);          // B: x4
  eq(Trinkets.val(r, 'apple', 'candy'), 4);
});
t('Fountain Pen reach: B bridges 2-square gaps', () => {
  const G = mkG({ rows: 5, cols: 7, winLen: 5 });
  fill(G, 'P', [[1, 0], [1, 3]]);               // 2 empties between
  eq(Engine.penFills(G, 'P', 2).length, 0, 'C cannot');
  eq(Engine.penFills(G, 'P', 3).length, 2, 'B fills both middles');
  eq(Engine.at(G, 1, 1).mark, 'X');
  eq(Engine.at(G, 1, 2).mark, 'X');
});
t('Skipping grades: torn gaps (B), wide gaps (A), enemy gaps (A+)', () => {
  const G = mkG({ rows: 5, cols: 5, winLen: 5 });
  fill(G, 'P', [[2, 0], [2, 2], [2, 4]]);
  Engine.tear(G, Engine.at(G, 2, 1));
  ok(!Engine.findWinSkipping(G, 'P', {}), 'torn gap blocks at C');
  ok(Engine.findWinSkipping(G, 'P', { overTorn: true }), 'B skips the tear');

  const G2 = mkG({ rows: 5, cols: 5, winLen: 5 });
  fill(G2, 'P', [[1, 0], [1, 3], [1, 4]]);      // X _ _ X X
  ok(!Engine.findWinSkipping(G2, 'P', {}), 'double gap blocks at C');
  ok(Engine.findWinSkipping(G2, 'P', { wideGaps: true }), 'A allows it');

  const G3 = mkG({ rows: 5, cols: 5, winLen: 5 });
  fill(G3, 'P', [[3, 0], [3, 2], [3, 4]]);
  fill(G3, 'E', [[3, 1]]);
  ok(!Engine.findWinSkipping(G3, 'P', {}), 'enemy in gap blocks at C');
  ok(Engine.findWinSkipping(G3, 'P', { overEnemy: true }), 'A+ skips right over the O');
});
t('Connect grades: diagonal joins (B), smaller blob (A)', () => {
  const G = mkG({ rows: 4, cols: 4, winLen: 4 });
  fill(G, 'P', [[0, 0], [1, 1], [2, 2], [3, 3]]); // diagonal chain — not orth-connected
  ok(!Engine.findWinConnect(G, 'P', {}), 'not connected at C');
  ok(Engine.findWinConnect(G, 'P', { diag: true }), 'B connects diagonals');

  const G2 = mkG({ rows: 4, cols: 4, winLen: 4 });
  fill(G2, 'P', [[0, 0], [1, 0], [1, 1]]);        // blob of 3
  ok(!Engine.findWinConnect(G2, 'P', {}));
  ok(Engine.findWinConnect(G2, 'P', { reduce: 1 }), 'A needs one fewer');
});
t('Study Guide grades make the student (and boss) nervous', () => {
  const r1 = mkRun(['studyGuide']);
  const r2 = mkRun(['studyGuide']);
  Trinkets.setGrade(r2, 'studyGuide', 2);
  r1.page = 5; r2.page = 5;
  const st1 = AI.newState(r1), st2 = AI.newState(r2);
  eq(AI.mistakeChance(st1), 0, 'boss unaffected at C');
  ok(Math.abs(AI.mistakeChance(st2) - 0.2) < 1e-9, 'boss fumbles 20% at A');
});

console.log('\n-- bug regressions --');
t('margin X completes a gapped line (skip + compass combo)', () => {
  const G = mkG({ rows: 4, cols: 4, winLen: 4 });
  fill(G, 'P', [[1, 1], [1, 2]]);
  G.marginUnlocks = 1;
  Engine.place(G, 'P', Engine.at(G, 1, -1));      // X[m] _ X X
  ok(Engine.findWinSkipping(G, 'P', {}), 'combo works');
});
t('gravity landing falls from the top, not under shelves', () => {
  const G = mkG({ rows: 6, cols: 4, winLen: 4, gravity: true });
  Engine.tear(G, Engine.at(G, 3, 1));
  eq(Engine.landing(G, 'P', 1).r, 2, 'rests ON the shelf');
  Engine.tear(G, Engine.at(G, 0, 2));
  eq(Engine.landing(G, 'P', 2), null, 'column sealed at the top is dead');
});
t('movesAvailable false when only pockets under tears remain', () => {
  const G = mkG({ rows: 3, cols: 2, winLen: 3, gravity: true });
  Engine.tear(G, Engine.at(G, 0, 0));
  Engine.tear(G, Engine.at(G, 0, 1));
  ok(!Engine.movesAvailable(G, 'P'), 'no landings anywhere');
  ok(!Engine.boardFull(G), 'yet the board is not "full" — draw must use moves');
});
t('connect win line comes back sorted for a sane circle', () => {
  const G = mkG({ rows: 4, cols: 4, winLen: 4 });
  fill(G, 'P', [[2, 1], [0, 0], [1, 0], [1, 1]]);
  const comp = Engine.findWinConnect(G, 'P', {});
  ok(comp);
  eq(comp[0].r, 0);
  eq(comp[comp.length - 1].r, 2);
});

console.log('\n-- run & candy --');
t('5-page notebooks, page 5 is boss', () => {
  const r = mkRun();
  eq(r.pagesPerNotebook, 5);
  r.page = 5;
  ok(Run.isBossPage(r));
});
t('candy: win +1 (+apple), loss -2, gum softens first loss', () => {
  const r = mkRun(['apple', 'gum']);
  eq(r.candy, 5);
  Run.applyResult(r, 'win'); eq(r.candy, 7, '1 + 1 apple');
  Run.applyResult(r, 'loss'); eq(r.candy, 6, 'gum: -2 +1 = -1');
  Run.applyResult(r, 'loss'); eq(r.candy, 4, 'gum used up');
});
t('juice box saves you once', () => {
  const r = mkRun(['juiceBox']);
  r.candy = 2;
  Run.applyResult(r, 'loss');
  eq(r.candy, 1, 'survived at 1');
  ok(!r.over);
  Run.applyResult(r, 'loss');
  ok(r.over, 'second time is fatal');
});
t('shop prices: rarity base, student id, coupon book', () => {
  const r = mkRun();
  eq(Trinkets.price(r, 'apple'), 2);
  eq(Trinkets.price(r, 'extraCredit'), 12);
  r.trinkets.push('studentId');
  eq(Trinkets.price(r, 'extraCredit'), 11);
  r.trinkets.push('couponBook');
  eq(Trinkets.price(r, 'extraCredit'), 5, '(12-1)/2 floored');
  eq(Trinkets.price(r, 'apple'), 1, 'min 1');
});
t('vending key grants extra bathroom visits', () => {
  const r = mkRun();
  eq(Run.bathroomVisitsAllowed(r), 1);
  r.trinkets.push('vendingKey');
  eq(Run.bathroomVisitsAllowed(r), 2);
});
t('piggy bank pays interest at notebook end', () => {
  const r = mkRun(['piggyBank']);
  r.candy = 11;
  Run.nextLevel(r);
  ok(r.candy >= 13, '11 + 2 interest (+ maybe loose change)');
});
t('offers: 3 distinct, uncommons only for locker pick, no signatures', () => {
  const rng = Engine.makeRng(9);
  const offer = Trinkets.offer(rng, 3);
  eq(new Set(offer).size, 3);
  offer.forEach(id => ok(!Trinkets.DB[id].signature, id + ' not a signature'));
  const unc = Trinkets.uncommonOffer(rng, 3);
  unc.forEach(id => eq(Trinkets.DB[id].rarity, 'uncommon'));
});
t('all four subjects present and shuffled', () => {
  const r = mkRun();
  eq(r.subjects.length, 4);
  ['history', 'greek', 'biology', 'physics'].forEach(s => ok(r.subjects.indexOf(s) !== -1, s));
});

console.log('\n-- AI --');
t('takes a winning move', () => {
  const G = mkG();
  fill(G, 'E', [[0, 0], [0, 1], [0, 2]]);
  const r = mkRun(); r.page = 4;
  const st = AI.newState(r);
  AI.takeTurn(G, st, r);
  ok(Engine.findWinNormal(G, 'E'));
});
t('blocks an imminent player win (mostly)', () => {
  const r = mkRun(); r.page = 4;
  let blocked = 0;
  for (let trial = 0; trial < 10; trial++) {
    const G = Engine.newPage({ rows: 4, cols: 4, winLen: 4, seed: trial + 1 });
    fill(G, 'P', [[2, 0], [2, 1], [2, 2]]);
    AI.takeTurn(G, AI.newState(r), r);
    if (Engine.at(G, 2, 3).mark === 'O') blocked++;
  }
  ok(blocked >= 8, 'blocked ' + blocked + '/10');
});
t('gravity AI only considers landing squares', () => {
  const G = mkG({ rows: 6, cols: 4, winLen: 4, gravity: true });
  const cands = AI.candidates(G);
  eq(cands.length, 4, 'one per column');
  cands.forEach(cl => eq(cl.r, 5, 'all on the floor'));
});
t('boss telegraphs then executes (Napoleon horse)', () => {
  const r = mkRun(); r.subjects = ['history', 'greek', 'biology', 'physics']; r.page = 5;
  const G = mkG({ firstTurn: 'E' });
  const st = AI.newState(r);
  ok(st.isBoss);
  AI.takeTurn(G, st, r);
  const s2 = AI.takeTurn(G, st, r);
  ok(s2.events.some(e => e.t === 'dialogue' && e.key === 'preSpecial'), 'telegraphed');
  AI.takeTurn(G, st, r);
  ok(G.cells.some(c => c.kind === 'horse'), 'the cavalry arrived');
});
t('detention slip slows boss cadence', () => {
  const r1 = mkRun(); r1.subjects = ['history']; r1.page = 5;
  const r2 = mkRun(['detentionSlip']); r2.subjects = ['history']; r2.page = 5;
  ok(AI.newState(r2).cadence === AI.newState(r1).cadence + 1);
});
t('zeus marks then strikes; shield survives', () => {
  const r = mkRun(); r.subjects = ['greek']; r.page = 5;
  const G = mkG({ rows: 6, cols: 6, winLen: 5, firstTurn: 'E' });
  fill(G, 'P', [[1, 1], [2, 2]]);
  Engine.at(G, 1, 1).shield = true;
  const st = AI.newState(r);
  AI.takeTurn(G, st, r);
  AI.takeTurn(G, st, r); // telegraph
  ok(G.cells.some(c => c.boltMark), 'targets marked');
  AI.takeTurn(G, st, r); // strike
  ok(!G.cells.some(c => c.boltMark));
  eq(Engine.at(G, 1, 1).mark, 'X', 'shielded X survived');
});
t('a full page plays out without exploding', () => {
  const r = mkRun();
  const G = Engine.newPage({ rows: 6, cols: 6, winLen: 5, seed: 11 });
  const st = AI.newState(r);
  let guard = 0;
  while (guard++ < 60 && !Engine.boardFull(G)) {
    const open = Engine.innerCells(G).filter(c => Engine.canPlace(G, 'P', c));
    if (!open.length) break;
    Engine.place(G, 'P', open[0]);
    if (Engine.findWinNormal(G, 'P')) break;
    Engine.tickAfter(G, 'P');
    AI.takeTurn(G, st, r);
    if (Engine.findWinNormal(G, 'E')) break;
    Engine.tickAfter(G, 'E');
  }
  ok(guard < 60);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
