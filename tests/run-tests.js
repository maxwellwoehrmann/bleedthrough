/* BLEEDTHROUGH v0.2 — engine/run/ai tests (bun tests/run-tests.js) */
'use strict';
const path = require('path');

global.Engine = require(path.join(__dirname, '..', 'js', 'engine.js'));
global.Subjects = require(path.join(__dirname, '..', 'js', 'subjects.js'));
global.Run = require(path.join(__dirname, '..', 'js', 'run.js'));
global.Stickers = require(path.join(__dirname, '..', 'js', 'stickers.js'));
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

function mkG(size, first) {
  return Engine.newPage({ size: size || 4, seed: 42, firstTurn: first || 'P' });
}
function fill(G, who, rcs) {
  rcs.forEach(([r, c]) => { Engine.at(G, r, c).mark = who === 'P' ? 'X' : 'O'; });
}

console.log('\n-- board & placement --');
t('4x4 page has a margin ring (6x6 grid)', () => {
  const G = mkG(4);
  eq(G.W, 6); eq(G.winLen, 4);
  eq(Engine.innerCells(G).length, 16);
});
t('cannot place in margin without an unlock; can with one', () => {
  const G = mkG(4);
  eq(Engine.place(G, 'P', -1, 0), null);
  G.marginUnlocks = 1;
  ok(Engine.place(G, 'P', -1, 0));
  eq(G.marginUnlocks, 0);
});
t('enemy can never use the margin', () => {
  const G = mkG(4);
  G.marginUnlocks = 5;
  ok(!Engine.canPlace(G, 'E', Engine.at(G, -1, 0)));
});
t('smudged cells block placement and expire after rounds', () => {
  const G = mkG(4);
  Engine.at(G, 1, 1).smudge = 2;
  ok(!Engine.canPlace(G, 'P', Engine.at(G, 1, 1)));
  Engine.tickAfter(G, 'E'); Engine.tickAfter(G, 'E');
  ok(Engine.canPlace(G, 'P', Engine.at(G, 1, 1)));
});
t('frozen cells block only the player, thaw after their turn', () => {
  const G = mkG(4);
  Engine.at(G, 2, 2).frozen = 1;
  ok(!Engine.canPlace(G, 'P', Engine.at(G, 2, 2)));
  ok(Engine.canPlace(G, 'E', Engine.at(G, 2, 2)));
  Engine.tickAfter(G, 'P');
  ok(Engine.canPlace(G, 'P', Engine.at(G, 2, 2)));
});

console.log('\n-- winning --');
t('4-in-a-row wins on a 4x4', () => {
  const G = mkG(4);
  fill(G, 'P', [[0, 0], [0, 1], [0, 2], [0, 3]]);
  const win = Engine.findWin(G, 'P', false);
  ok(win); eq(win.length, 4);
});
t('diagonal wins', () => {
  const G = mkG(4);
  fill(G, 'P', [[0, 0], [1, 1], [2, 2], [3, 3]]);
  ok(Engine.findWin(G, 'P', false));
});
t('3-in-a-row does not win on a 4x4', () => {
  const G = mkG(4);
  fill(G, 'P', [[0, 0], [0, 1], [0, 2]]);
  ok(!Engine.findWin(G, 'P', false));
});
t('margin X completes a line', () => {
  const G = mkG(4);
  fill(G, 'P', [[0, 0], [0, 1], [0, 2]]);
  G.marginUnlocks = 1;
  Engine.place(G, 'P', 0, -1);
  ok(Engine.findWin(G, 'P', false), 'line -1..2 across the edge');
});
t('Double-Spaced: X X _ X counts as a 4-line (one interior gap)', () => {
  const G = mkG(4);
  fill(G, 'P', [[1, 0], [1, 1], [1, 3]]);
  ok(!Engine.findWin(G, 'P', false), 'not without the trinket');
  ok(Engine.findWin(G, 'P', true), 'with the trinket');
});
t('Double-Spaced: gap cannot be at the ends or doubled', () => {
  const G = mkG(4);
  fill(G, 'P', [[2, 0], [2, 3]]);           // two gaps
  ok(!Engine.findWin(G, 'P', true));
  const G2 = mkG(4);
  fill(G2, 'P', [[3, 1], [3, 2], [3, 3]]);  // gap would be at an end
  ok(!Engine.findWin(G2, 'P', true));
});
t('smudged square cannot be the Double-Spaced gap', () => {
  const G = mkG(4);
  fill(G, 'P', [[1, 0], [1, 1], [1, 3]]);
  Engine.at(G, 1, 2).smudge = 2;
  ok(!Engine.findWin(G, 'P', true));
});

console.log('\n-- utensils & powers --');
t('eraseO leaves a timed smudge', () => {
  const G = mkG(4);
  fill(G, 'E', [[1, 1]]);
  ok(Engine.eraseO(G, 1, 1, 2));
  eq(Engine.at(G, 1, 1).mark, null);
  eq(Engine.at(G, 1, 1).smudge, 2);
});
t('tall horse occupies two cells; erasing a leg shoos the whole horse', () => {
  const G = mkG(4);
  ok(Engine.placeHorse(G, 1, 2));
  eq(Engine.at(G, 1, 2).mark, 'O'); eq(Engine.at(G, 2, 2).mark, 'O');
  ok(Engine.eraseO(G, 2, 2, 0));
  eq(Engine.at(G, 1, 2).mark, null, 'head gone too');
});
t('horse completes a column win', () => {
  const G = mkG(4);
  fill(G, 'E', [[0, 1], [1, 1]]);
  ok(Engine.placeHorse(G, 2, 1));
  ok(Engine.findWin(G, 'E', false));
});
t('shield eats one burn', () => {
  const G = mkG(4);
  G.shieldNext = true;
  Engine.place(G, 'P', 1, 1);
  ok(Engine.at(G, 1, 1).shield);
  ok(!Engine.smudgeX(G, 1, 1, 2), 'shield absorbed it');
  eq(Engine.at(G, 1, 1).mark, 'X');
  ok(Engine.smudgeX(G, 1, 1, 2), 'second hit lands');
});
t('lightning O lands on smudges', () => {
  const G = mkG(4);
  Engine.at(G, 2, 2).smudge = 2;
  ok(Engine.placeBoltO(G, 2, 2));
  eq(Engine.at(G, 2, 2).mark, 'O');
  eq(Engine.at(G, 2, 2).smudge, 0);
});

console.log('\n-- run & candy --');
t('level 1 is 4x4; level 2 is 5x5', () => {
  const run = Run.newRun('pencil', 7);
  eq(Run.boardSize(run), 4);
  run.level = 2;
  eq(Run.boardSize(run), 5);
});
t('candy: +1 win, -2 loss, 0 draw, dead at 0', () => {
  const run = Run.newRun('pen', 7);
  eq(run.candy, 5);
  Run.applyResult(run, 'win'); eq(run.candy, 6);
  Run.applyResult(run, 'draw'); eq(run.candy, 6);
  Run.applyResult(run, 'loss'); eq(run.candy, 4);
  Run.applyResult(run, 'loss'); Run.applyResult(run, 'loss');
  eq(run.candy, 0); ok(run.over);
});
t('utensils: pencil erases, pen bleeds, erasable pen does both', () => {
  const pencil = Run.newRun('pencil', 7), pen = Run.newRun('pen', 7);
  ok(Run.canErase(pencil)); ok(!Run.bleeds(pencil));
  ok(!Run.canErase(pen)); ok(Run.bleeds(pen));
  pen.trinkets.push('erasablePen');
  ok(Run.canErase(pen)); ok(Run.bleeds(pen));
});
t('page 10 is the boss; beating it offers 2 distinct trinkets', () => {
  const run = Run.newRun('pen', 7);
  run.page = 10;
  ok(Run.isBossPage(run));
  const picks = Run.rewardChoices(run);
  eq(picks.length, 2);
  ok(picks[0] !== picks[1]);
});
t('subjects are shuffled but complete', () => {
  const run = Run.newRun('pen', 123);
  eq(run.subjects.length, Object.keys(Subjects.ALL).length);
  ok(run.subjects.indexOf('history') !== -1);
  ok(run.subjects.indexOf('mythology') !== -1);
});

console.log('\n-- stickers --');
t('shop offers 5 distinct notes', () => {
  const rng = Engine.makeRng(9);
  const offer = Stickers.shopOffer(rng);
  eq(offer.length, 5);
  eq(new Set(offer).size, 5);
});
t('two-fer grants an extra place; margin note unlocks the ring', () => {
  const G = mkG(4);
  Stickers.DB.twofer.effect(G);
  eq(G.extraPlaces, 1);
  Stickers.DB.marginNote.effect(G);
  eq(G.marginUnlocks, 1);
});
t('hall pass skips the enemy turn', () => {
  const G = mkG(4);
  Stickers.DB.timeOut.effect(G);
  const run = Run.newRun('pen', 7);
  const st = AI.newState(run);
  const sum = AI.takeTurn(G, st, run);
  ok(sum.skipped);
  eq(G.cells.filter(c => c.mark === 'O').length, 0);
});
t('fire drill erases two O\'s', () => {
  const G = mkG(4);
  fill(G, 'E', [[0, 0], [1, 1]]);
  Stickers.DB.bellRinger.effect(G, { targets: [{ r: 0, c: 0 }, { r: 1, c: 1 }] });
  eq(G.cells.filter(c => c.mark === 'O').length, 0);
});

console.log('\n-- AI --');
t('takes a winning move', () => {
  const G = mkG(4);
  fill(G, 'E', [[0, 0], [0, 1], [0, 2]]);
  const run = Run.newRun('pen', 7);
  run.page = 9; // low mistake chance
  const st = AI.newState(run);
  AI.takeTurn(G, st, run);
  ok(Engine.findWin(G, 'E', false), 'enemy completed its row');
});
t('blocks an imminent player win', () => {
  const run = Run.newRun('pen', 7);
  run.page = 9;
  let blocked = 0;
  for (let trial = 0; trial < 10; trial++) {
    const G = Engine.newPage({ size: 4, seed: trial + 1 });
    fill(G, 'P', [[2, 0], [2, 1], [2, 2]]);
    const st = AI.newState(run);
    AI.takeTurn(G, st, run);
    if (Engine.at(G, 2, 3).mark === 'O') blocked++;
  }
  ok(blocked >= 8, 'blocked ' + blocked + '/10');
});
t('boss telegraphs, then the horse arrives', () => {
  const run = Run.newRun('pen', 7);
  run.subjects = ['history', 'mythology'];
  run.page = 10;
  const G = mkG(4, 'E');
  const st = AI.newState(run);
  ok(st.isBoss);
  AI.takeTurn(G, st, run);                     // turn 1: normal
  const s2 = AI.takeTurn(G, st, run);          // turn 2: telegraph
  ok(s2.events.some(e => e.t === 'dialogue' && e.key === 'preSpecial'), 'telegraphed');
  AI.takeTurn(G, st, run);                     // turn 3: horse
  ok(G.cells.some(c => c.horse), 'a tall horse stands on the page');
});
t('zeus marks bolt targets then strikes them', () => {
  const run = Run.newRun('pen', 7);
  run.subjects = ['mythology', 'history'];
  run.page = 10;
  const G = mkG(4, 'E');
  fill(G, 'P', [[1, 1], [2, 2]]);
  const st = AI.newState(run);
  AI.takeTurn(G, st, run);                     // turn 1
  AI.takeTurn(G, st, run);                     // turn 2: telegraph + marks
  ok(G.cells.some(c => c.boltMark), 'targets marked');
  AI.takeTurn(G, st, run);                     // turn 3: strike
  ok(!G.cells.some(c => c.boltMark), 'marks cleared');
  ok(G.cells.some(c => c.smudge > 0 && !c.mark), 'something got scorched');
});
t('a full page plays out without exploding', () => {
  const run = Run.newRun('pencil', 7);
  const G = Engine.newPage({ size: 4, seed: 11 });
  G.playerGapLines = false;
  const st = AI.newState(run);
  let guard = 0;
  while (guard++ < 40) {
    const open = Engine.innerCells(G).filter(c => Engine.canPlace(G, 'P', c));
    if (!open.length) break;
    Engine.place(G, 'P', open[0].r, open[0].c);
    if (Engine.findWin(G, 'P', false)) break;
    Engine.tickAfter(G, 'P');
    AI.takeTurn(G, st, run);
    if (Engine.findWin(G, 'E', false)) break;
    Engine.tickAfter(G, 'E');
  }
  ok(guard < 40);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
