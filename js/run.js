/* ============================================================
   BLEEDTHROUGH v0.3 — run.js
   The school day: 5-page notebooks, growing (rectangular)
   boards, candy = life, uncapped trinket collection.
   ============================================================ */

var Run = (function () {

  var PAGES_PER_NOTEBOOK = 5;
  var STARTING_CANDY = 5;

  // board plan per notebook slot (1-based): square size + win length
  var SLOT_SIZE = [4, 6, 8, 9];
  var SLOT_WIN = [4, 5, 5, 6];

  var PERIOD_NAMES = ['1st Period', '2nd Period', '3rd Period', '4th Period'];

  function shuffle(rng, arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function newRun(seed) {
    var rng = Engine.makeRng(seed || 1);
    return {
      seed: seed, rng: rng,
      candy: STARTING_CANDY,
      trinkets: [],                 // ids, duplicates allowed, NO CAP
      level: 1,
      subjects: shuffle(rng, Object.keys(Subjects.ALL)),
      page: 1,
      pagesPerNotebook: PAGES_PER_NOTEBOOK,
      visitsUsed: 0,
      juiceUsed: false,
      gumUsed: false,               // per notebook
      over: false, won: false,
    };
  }

  function subjectId(run) { return run.subjects[run.level - 1]; }
  function subject(run) { return Subjects.ALL[subjectId(run)]; }
  function isBossPage(run) { return run.page >= run.pagesPerNotebook; }
  function periodName(run) { return PERIOD_NAMES[run.level - 1] || (run.level + 'th Period'); }

  /* Board dimensions: physics notebooks are taller than wide. */
  function boardFor(run) {
    var s = SLOT_SIZE[run.level - 1] || (8 + run.level);
    var win = SLOT_WIN[run.level - 1] || 6;
    var subj = subject(run);
    if (subj.shape === 'tall') {
      var cols = Math.max(win, s - 1);
      return { rows: cols + 2, cols: cols, winLen: win, gravity: !!subj.gravity };
    }
    return { rows: s, cols: s, winLen: win, gravity: !!subj.gravity };
  }

  /* result: 'win' | 'loss' | 'draw'. Returns candy delta. */
  function applyResult(run, result) {
    var d = 0;
    if (result === 'win') d = 1 + Trinkets.total(run, 'apple', 'candy');
    if (result === 'draw') d = Trinkets.total(run, 'candyWrapper', 'candy');
    if (result === 'loss') {
      d = -2;
      if (!run.gumUsed && Trinkets.has(run, 'gum')) {
        d += Trinkets.total(run, 'gum', 'save');
        if (d > 0) d = 0;
        run.gumUsed = true;
      }
    }
    run.candy += d;
    if (run.candy <= 0) {
      if (!run.juiceUsed && Trinkets.has(run, 'juiceBox')) {
        run.juiceUsed = true;
        run.candy = Trinkets.val(run, 'juiceBox', 'at');
      } else {
        run.candy = 0; run.over = true;
      }
    }
    return d;
  }

  function bathroomVisitsAllowed(run) {
    if (!Trinkets.has(run, 'vendingKey')) return 1;
    var copies = Trinkets.count(run, 'vendingKey');
    return 1 + copies * (Trinkets.val(run, 'vendingKey', 'visits') - 1);
  }

  function advancePage(run) {
    run.page++;
    return isBossPage(run) ? 'boss' : 'page';
  }

  /* Boss beaten: piggy bank pays out, next class begins. */
  function nextLevel(run) {
    if (Trinkets.has(run, 'piggyBank')) {
      run.candy += Math.floor(run.candy / 5) * Trinkets.total(run, 'piggyBank', 'candy');
    }
    run.level++;
    run.page = 1;
    run.visitsUsed = 0;
    run.gumUsed = false;
    if (run.level > run.subjects.length) { run.won = true; return 'victory'; }
    run.candy += Trinkets.total(run, 'looseChange', 'candy');
    return 'class';
  }

  return {
    PAGES_PER_NOTEBOOK: PAGES_PER_NOTEBOOK, STARTING_CANDY: STARTING_CANDY,
    shuffle: shuffle, newRun: newRun,
    subjectId: subjectId, subject: subject, isBossPage: isBossPage,
    periodName: periodName, boardFor: boardFor,
    applyResult: applyResult, bathroomVisitsAllowed: bathroomVisitsAllowed,
    advancePage: advancePage, nextLevel: nextLevel,
  };
})();

if (typeof module !== 'undefined') module.exports = Run;
