/* ============================================================
   BLEEDTHROUGH v0.2 — run.js
   The school day: candy (= life), utensil, stickers, trinkets,
   levels (class periods), pages. Pure logic, no DOM.
   ============================================================ */

var Run = (function () {

  var PAGES_PER_NOTEBOOK = 10;
  var STARTING_CANDY = 5;
  var MAX_STICKERS = 3;

  var PERIOD_NAMES = ['1st Period', '2nd Period', '3rd Period', '4th Period', '5th Period', '6th Period'];

  function shuffle(rng, arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function newRun(utensil, seed) {
    var rng = Engine.makeRng(seed || 1);
    return {
      seed: seed, rng: rng,
      utensil: utensil,                 // 'pencil' | 'pen'
      candy: STARTING_CANDY,
      stickers: [],                     // sticker ids, max 3
      trinkets: [],                     // permanent trinket ids
      level: 1,
      subjects: shuffle(rng, Object.keys(Subjects.ALL)),
      page: 1,
      pagesPerNotebook: PAGES_PER_NOTEBOOK,
      bathroomUsed: false,
      bleedCell: null,                  // pen: {r,c} carried to next page
      over: false, won: false,
    };
  }

  function subjectId(run) { return run.subjects[run.level - 1]; }
  function subject(run) { return Subjects.ALL[subjectId(run)]; }
  function boardSize(run) { return 3 + run.level; }        // level 1 = 4x4
  function isBossPage(run) { return run.page >= run.pagesPerNotebook; }
  function periodName(run) { return PERIOD_NAMES[run.level - 1] || (run.level + 'th Period'); }

  function hasTrinket(run, id) { return run.trinkets.indexOf(id) !== -1; }
  function canErase(run) { return run.utensil === 'pencil' || hasTrinket(run, 'erasablePen'); }
  function bleeds(run) { return run.utensil === 'pen' || hasTrinket(run, 'erasablePen'); }
  function gapLines(run) { return hasTrinket(run, 'doubleSpaced'); }

  /* result: 'win' | 'loss' | 'draw'. Returns candy delta. */
  function applyResult(run, result) {
    var d = result === 'win' ? 1 : result === 'loss' ? -2 : 0;
    run.candy += d;
    if (run.candy <= 0) { run.candy = 0; run.over = true; }
    return d;
  }

  /* After a won/drawn page: advance. Returns what comes next:
     'page' | 'boss' | 'reward' | 'victory' */
  function advancePage(run) {
    run.page++;
    if (run.page > run.pagesPerNotebook) return 'reward';
    return isBossPage(run) ? 'boss' : 'page';
  }

  function nextLevel(run) {
    run.level++;
    run.page = 1;
    run.bathroomUsed = false;
    run.bleedCell = null;
    if (hasTrinket(run, 'lunchbox')) run.candy += 2;
    if (run.level > run.subjects.length) { run.won = true; return 'victory'; }
    return 'class';
  }

  // ---------------- permanent trinkets (boss rewards) ----------------
  var TRINKETS = {
    erasablePen: {
      id: 'erasablePen', name: 'Erasable Pen', icon: '🖊',
      text: 'Pen and pencil in one: place OR erase each turn, and your last X still bleeds through to the next page when you win.',
      flavor: 'Banned in three school districts.',
    },
    doubleSpaced: {
      id: 'doubleSpaced', name: 'Double-Spaced', icon: '↔',
      text: 'Your lines may skip one square — the gap still counts as part of your tic-tac-toe.',
      flavor: 'The teacher said double-space everything. EVERYTHING.',
    },
    lunchbox: {
      id: 'lunchbox', name: 'Spare Lunchbox', icon: '🍱',
      text: 'Start every new class with +2 candy.',
      flavor: 'There is a second, secret lunchbox.',
    },
  };

  function rewardChoices(run) {
    var pool = Object.keys(TRINKETS).filter(function (id) { return !hasTrinket(run, id); });
    shuffle(run.rng, pool);
    return pool.slice(0, 2);
  }

  return {
    PAGES_PER_NOTEBOOK: PAGES_PER_NOTEBOOK, STARTING_CANDY: STARTING_CANDY,
    MAX_STICKERS: MAX_STICKERS, TRINKETS: TRINKETS,
    newRun: newRun, subjectId: subjectId, subject: subject,
    boardSize: boardSize, isBossPage: isBossPage, periodName: periodName,
    hasTrinket: hasTrinket, canErase: canErase, bleeds: bleeds, gapLines: gapLines,
    applyResult: applyResult, advancePage: advancePage, nextLevel: nextLevel,
    rewardChoices: rewardChoices, shuffle: shuffle,
  };
})();

if (typeof module !== 'undefined') module.exports = Run;
