/* ============================================================
   BLEEDTHROUGH v0.3 — main.js
   Flow: title -> pick an uncommon -> 5-page notebook -> boss ->
   signature trinket -> next class. Trinkets all the way down.
   ============================================================ */

(function () {

  var $ = function (sel) { return document.querySelector(sel); };

  var App = {
    run: null, G: null, st: null, ui: null,
    charges: {},          // page-scoped active uses remaining
    notebookUsed: {},     // notebook-scoped actives: uses SPENT this notebook
    pendingBleeds: [],    // Ballpoint: coords for the next page
    goFirstChoice: null,  // Seating Chart
  };

  var PAGE_ACTIVES = ['fork', 'magnet', 'ruler', 'bicorneHat', 'stolenThunder', 'beanstalk', 'ballpoint'];
  var NOTEBOOK_ACTIVES = ['principalsPhone', 'fieldTrip'];

  var TOKEN_NOTES = {
    horse: '🐎 A horse seizes TWO squares!',
    sword: '⚔️ A sword slams down — THREE squares blocked, for both of you.',
    trident: '🔱 A trident stabs through three squares!',
    sandal: '👟 A winged sandal — that O will keep moving!',
    mouse: '🐭 A mouse! It scurries somewhere new every turn.',
    spider: '🕸 A spider webs the nearby squares for a turn.',
    snake: '🐍 A snake slithers across three squares!',
  };

  function freshUi() {
    return {
      placesLeft: 1, armed: null, magnetSrc: -1, candyMode: false,
      highlight: new Set(), peekCell: -1, busy: false, firstManualDone: false,
    };
  }

  function run() { return App.run; }
  function subj() { return Run.subject(App.run); }
  function foeName() { return Run.isBossPage(App.run) ? subj().boss : subj().student; }
  function say(key, opts) {
    var d = subj().dialogue[key];
    Render.bubble(Subjects.line(App.run.rng, d), opts);
  }
  function redraw() { Render.match(App.G, App.ui, App.run, foeName(), App.charges); }
  function tval(id, f) { return Trinkets.val(App.run, id, f); }
  function tcount(id) { return Trinkets.count(App.run, id); }
  function thas(id) { return Trinkets.has(App.run, id); }

  // ================= run setup =================
  function startRun() {
    App.run = Run.newRun((Date.now() % 1000000) | 0);
    App.pendingBleeds = [];
    App.notebookUsed = {};
    pickTrinkets('Grab one trinket from your locker', Trinkets.uncommonOffer(App.run.rng, 3), function () {
      App.run.candy += Trinkets.total(App.run, 'looseChange', 'candy');
      showCover('intro');
    });
  }

  /* Availability derives from CURRENT trinkets, so mid-notebook
     pickups of notebook-actives work. */
  function notebookAvail(id) {
    var totalUses = tcount(id) * (Trinkets.DB[id].values.uses ? tval(id, 'uses') : 1);
    return Math.max(0, totalUses - (App.notebookUsed[id] || 0));
  }

  function resetPageCharges() {
    var out = {};
    PAGE_ACTIVES.forEach(function (id) {
      out[id] = tcount(id) * (Trinkets.DB[id].values.uses ? tval(id, 'uses') : 1);
    });
    NOTEBOOK_ACTIVES.forEach(function (id) { out[id] = notebookAvail(id); });
    return out;
  }

  // ================= cover =================
  function showCover(kind) {
    var r = run(), s = subj();
    $('#cover-period').textContent = Run.periodName(r);
    $('#cover-subject').textContent = s.periodEmoji + ' ' + s.title.toUpperCase();
    $('#cover-page').textContent = Run.isBossPage(r)
      ? 'FINAL PAGE — ' + r.page + '/' + r.pagesPerNotebook
      : 'page ' + r.page + ' of ' + r.pagesPerNotebook;
    var d = s.dialogue[kind === 'intro' && r.page === 1 ? 'intro' : kind === 'retry' ? 'retry' : 'pageStart'];
    $('#cover-dialogue').textContent = Subjects.line(r.rng, d);
    $('#cover-vs').textContent = 'vs ' + (Run.isBossPage(r) ? s.student + '… probably' : s.student);
    $('#btn-start-page').textContent = Run.isBossPage(r) ? '▶ turn to the final page' : '▶ turn the page';
    $('#btn-bathroom').style.display = r.visitsUsed < Run.bathroomVisitsAllowed(r) ? '' : 'none';
    var ftShow = notebookAvail('fieldTrip') > 0 && !Run.isBossPage(r);
    $('#btn-fieldtrip').style.display = ftShow ? '' : 'none';
    var seatShow = thas('seatingChart');
    $('#seating-row').style.display = seatShow ? '' : 'none';
    if (seatShow && App.goFirstChoice === null) App.goFirstChoice = 'P';
    drawSeating();
    Render.drawCandy(r);
    Render.showScreen('screen-cover');
  }

  function drawSeating() {
    document.querySelectorAll('.seat-btn').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-s') === App.goFirstChoice);
    });
  }

  // ================= page setup =================
  function startPage() {
    var r = run();
    if (Run.isBossPage(r) && !r._transformed) {
      r._transformed = true;
      return showTransform();
    }
    var dims = Run.boardFor(r);
    var G = Engine.newPage({
      rows: dims.rows, cols: dims.cols, winLen: dims.winLen,
      gravity: dims.gravity, rng: r.rng,
    });
    G.playerSkipping = thas('skippingStone');
    G.playerConnect = thas('connectDots');
    App.G = G;
    App.st = AI.newState(r);
    App.ui = freshUi();
    App.charges = resetPageCharges();

    // page-start trinkets
    var allowance = Trinkets.total(r, 'allowance', 'candy');
    if (allowance) { r.candy += allowance; Render.toast('💵 Allowance: +' + allowance + ' candy'); }
    G.marginUnlocks = tcount('compass') * tval('compass', 'uses');

    for (var cs = 0; cs < tcount('cheatSheet'); cs++) {
      var center = nearestFree(G, Math.floor((G.rows - 1) / 2), Math.floor((G.cols - 1) / 2));
      if (center) placePlayerX(center, {});
    }
    if (App.pendingBleeds.length) {
      var bled = 0;
      App.pendingBleeds.forEach(function (p) {
        if (p.r < G.rows && p.c < G.cols) {
          var cell = Engine.at(G, p.r, p.c);
          if (!cell.mark && !cell.torn) { placePlayerX(cell, { noPerks: true }); cell.bledIn = true; bled++; }
        }
      });
      App.pendingBleeds = [];
      if (bled) Render.toast('🖊 ' + bled + ' X\'s bled through from the last page!');
    }
    Engine.settle(G);

    var first = thas('seatingChart') ? (App.goFirstChoice || 'P') : (Run.isBossPage(r) ? 'E' : 'P');
    G.turn = first;

    Render.showScreen('screen-match');
    $('#result-overlay').classList.remove('show');
    redraw();
    if (Run.isBossPage(r)) say('bossIntro'); else say(r.page === 1 ? 'intro' : 'pageStart');

    if (first === 'E') {
      App.ui.busy = true;
      setTimeout(enemyTurn, 1300);
    } else {
      playerTurnStart();
    }
  }

  function nearestFree(G, r0, c0) {
    var best = null, bd = 1e9;
    Engine.innerCells(G).forEach(function (cl) {
      if (cl.mark || cl.torn) return;
      var d = Math.abs(cl.r - r0) + Math.abs(cl.c - c0);
      if (d < bd) { bd = d; best = cl; }
    });
    return best;
  }

  function showTransform() {
    var s = subj();
    $('#transform-title').textContent = s.bossTitle;
    $('#transform-body').innerHTML = s.dialogue.transform.map(function (t) { return '<p>' + t + '</p>'; }).join('');
    Render.showScreen('screen-transform');
  }

  // ================= player turn =================
  function playerTurnStart() {
    var ui = App.ui;
    ui.busy = false;
    ui.placesLeft = 1 + tcount('extraCredit') * (tval('extraCredit', 'places') - 1);
    ui.armed = null; ui.magnetSrc = -1; ui.highlight = new Set();
    updatePeek();
    redraw();
    hintNow();
  }

  function updatePeek() {
    var ui = App.ui;
    ui.peekCell = -1;
    if (thas('studyGuide') && !App.G.over) {
      var cell = AI.predict(App.G, App.st);
      if (cell) ui.peekCell = Engine.idx(App.G, cell.r, cell.c);
    }
  }

  function hintNow() {
    var ui = App.ui, G = App.G;
    if (G.over) { Render.hint(''); return; }
    if (ui.armed === 'fork') return Render.hint('🍴 tap an empty square to TEAR it out (tap the fork to cancel)');
    if (ui.armed === 'magnet' && ui.magnetSrc < 0) return Render.hint('🧲 tap one of your X\'s to move');
    if (ui.armed === 'magnet') return Render.hint('🧲 tap an adjacent square to slide it there');
    if (ui.armed === 'ruler') return Render.hint('📏 tap a glowing square to extend your line for free');
    if (ui.armed === 'bicorneHat') return Render.hint('👒 tap the TOP square for your 2×1 cavalry');
    var bits = [];
    if (ui.placesLeft > 1) bits.push(ui.placesLeft + ' placements left');
    if (ui.candyMode) bits.push('placing CANDY (' + tval('candycane', 'cost') + ' 🍬)');
    if (G.electArmed > 0) bits.push('⚡ electrified');
    if (G.rootArmed > 0) bits.push('🌱 rooted');
    if (G.bleedArmed > 0) bits.push('🖊 pressing hard');
    if (G.gravity) bits.push('gravity: pieces FALL');
    Render.hint(bits.length ? bits.join(' · ') : 'tap a square to place your X');
  }

  /* Place one player X with counters/perks. */
  function placePlayerX(cell, opts) {
    var G = App.G, r = run();
    var perks = {};
    if (!opts.noPerks) {
      G.xCount++;
      if (thas('stickerStar') && G.xCount % tval('stickerStar', 'nth') === 0) perks.shield = true;
      if (thas('laminator') && G.xCount % tval('laminator', 'nth') === 0) perks.laminated = true;
    }
    if (opts.candy) perks.kind = 'candy';
    var placed = Engine.place(G, 'P', cell, {
      kind: perks.kind, shield: perks.shield, laminated: perks.laminated,
    });
    if (placed && perks.shield) Render.toast('⭐ That X is shielded!');
    if (placed && perks.laminated) Render.toast('💳 That X is LAMINATED.');
    return placed;
  }

  function checkPlayerWin() {
    var G = App.G;
    var line = Engine.findWinNormal(G, 'P') ||
      (G.playerSkipping ? Engine.findWinSkipping(G, 'P') : null) ||
      (G.playerConnect ? Engine.findWinConnect(G, 'P') : null);
    if (line) { pageOver('win', line); return true; }
    return false;
  }

  function handleCellTap(i) {
    var G = App.G, ui = App.ui, r = run();
    if (G.over || ui.busy || G.turn !== 'P') return;
    var cell = G.cells[i];

    // ---- armed actives ----
    if (ui.armed === 'fork') {
      if (cell.margin || cell.mark || cell.torn) return;
      Engine.tear(G, cell);
      App.charges.fork--;
      ui.armed = null;
      Render.toast('🍴 RIIIP. That square is gone forever.');
      Engine.settle(G);
      redraw(); hintNow();
      return;
    }
    if (ui.armed === 'magnet') {
      if (ui.magnetSrc < 0) {
        if (cell.mark !== 'X') return;
        ui.magnetSrc = i;
        ui.highlight = new Set();
        Engine.ALL8.forEach(function (d) {
          var rr = cell.r + d[0], cc = cell.c + d[1];
          if (!Engine.inner(G, rr, cc)) return;
          var n = Engine.at(G, rr, cc);
          if (!n.mark && !n.torn && n.web === 0) ui.highlight.add(Engine.idx(G, rr, cc));
        });
        redraw(); hintNow();
        return;
      }
      if (!ui.highlight.has(i)) return;
      var src = G.cells[ui.magnetSrc];
      var FIELDS = ['mark', 'kind', 'shield', 'laminated', 'rooted'];
      FIELDS.forEach(function (f) { cell[f] = src[f]; });
      FIELDS.forEach(function (f) { src[f] = f === 'mark' || f === 'kind' ? null : false; });
      cell.justPlaced = true;
      App.charges.magnet--;
      ui.armed = null; ui.magnetSrc = -1; ui.highlight = new Set();
      Engine.settle(G);
      if (checkPlayerWin()) return;
      redraw(); hintNow();
      return;
    }
    if (ui.armed === 'ruler') {
      if (!ui.highlight.has(i)) return;
      placePlayerX(cell, {});
      App.charges.ruler--;
      ui.armed = null; ui.highlight = new Set();
      afterCreation([cell]);
      return;
    }
    if (ui.armed === 'bicorneHat') {
      if (cell.margin || !Engine.inner(G, cell.r + 1, cell.c)) return;
      var below = Engine.at(G, cell.r + 1, cell.c);
      if (cell.mark || cell.torn || below.mark || below.torn) return;
      placePlayerX(cell, {});
      placePlayerX(below, {});
      App.charges.bicorneHat--;
      ui.armed = null;
      Render.toast('🐎 Your cavalry arrives!');
      afterCreation([cell, below]);
      return;
    }

    // ---- normal placement ----
    var target = Engine.target(G, 'P', cell);
    if (!target) return;

    var isCandy = ui.candyMode;
    if (isCandy) {
      var cost = tval('candycane', 'cost');
      if (r.candy - cost < 1) { Render.toast('Not enough candy to spare.'); ui.candyMode = false; redraw(); return; }
      r.candy -= cost;
      Render.drawCandy(r);
    }

    G.manualCount++;
    var placedCells = [];

    // Stamp: every Nth manual placement becomes a size×size block
    var isStamp = thas('stamp') && G.manualCount % tval('stamp', 'nth') === 0;
    if (isStamp && !target.margin) {
      var size = Math.min(tval('stamp', 'size'), Math.min(G.rows, G.cols));
      var ar = Math.max(0, Math.min(target.r, G.rows - size));
      var ac = Math.max(0, Math.min(target.c, G.cols - size));
      for (var dr = 0; dr < size; dr++) for (var dc = 0; dc < size; dc++) {
        var bc = Engine.at(G, ar + dr, ac + dc);
        if (!bc.mark && !bc.torn && bc.web === 0) {
          var pl = placePlayerX(bc, { candy: isCandy });
          if (pl) placedCells.push(bc);
        }
      }
      Render.toast('🖃 STAMP! A ' + size + '×' + size + ' block!');
    } else {
      var pl2 = placePlayerX(target, { candy: isCandy });
      if (!pl2) return;
      placedCells.push(target);
    }

    if (isCandy) ui.candyMode = false;

    // Beanstalk / Stolen Thunder arm the manual mark
    if (G.rootArmed > 0 && placedCells.length) {
      placedCells[0].rooted = true; G.rootArmed--;
      Render.toast('🌱 That X is ROOTED. It will grow.');
    }
    if (G.electArmed > 0 && placedCells.length) {
      G.electArmed--;
      var sparks = Engine.electrify(G, placedCells[0], 'P');
      if (sparks.length) Render.toast('⚡ KZZT! ' + sparks.length + ' X\'s arc onto the diagonals!');
      placedCells = placedCells.concat(sparks);
    }

    // Ballpoint: this placement bleeds to the next page
    if (G.bleedArmed > 0 && placedCells.length) {
      G.bleedArmed--;
      placedCells.forEach(function (cl) {
        cl.pressed = true;
        App.pendingBleeds.push({ r: cl.r, c: cl.c });
      });
      Render.toast('🖊 Pressed hard — it will bleed through to the next page.');
    }

    // Mirror Tape: first manual placement mirrors
    if (!ui.firstManualDone && thas('mirrorTape') && placedCells.length) {
      var m = placedCells[0];
      if (!m.margin) {
        var mc = Engine.at(G, m.r, G.cols - 1 - m.c);
        if (mc !== m && !mc.mark && !mc.torn && !mc.margin) {
          placePlayerX(mc, {});
          placedCells.push(mc);
          Render.toast('🪞 Mirror Tape doubles your opening!');
        }
      }
    }
    ui.firstManualDone = true;

    // Chain Reaction
    if (thas('chainReaction') && placedCells.length && !placedCells[0].margin) {
      if (Engine.connectsChains(G, placedCells[0], 'P', tval('chainReaction', 'size'))) {
        var col = placedCells[0].c;
        Engine.tearColumn(G, col);
        Render.toast('💥 CHAIN REACTION! Column ' + (col + 1) + ' tears out of the page!');
      }
    }

    afterCreation(placedCells);
  }

  /* Post-creation pipeline: pen fills, gravity, win check, turn end. */
  function afterCreation(placedCells) {
    var G = App.G, ui = App.ui;
    if (thas('fountainPen')) {
      var fills = Engine.penFills(G, 'P');
      if (fills.length) Render.toast('🖋 Fountain Pen fills ' + fills.length + ' square(s)!');
    }
    Engine.settle(G);
    if (checkPlayerWin()) return;

    ui.placesLeft--;
    if (ui.placesLeft > 0 && Engine.movesAvailable(G, 'P')) {
      redraw(); hintNow();
      return;
    }
    endPlayerTurn();
  }

  function endPlayerTurn() {
    var G = App.G;
    var sprouts = Engine.sproutRooted(G, 'P');
    if (sprouts.length) {
      Render.toast('🌱 The rooted X grows!');
      Engine.settle(G);
      if (checkPlayerWin()) return;
    }
    Engine.tickAfter(G, 'P');
    if (Engine.boardFull(G)) return pageOver('draw', null);
    App.ui.busy = true;
    redraw();
    Render.hint(foeName() + ' is thinking…');
    setTimeout(enemyTurn, 750);
  }

  // ================= enemy turn =================
  function enemyTurn() {
    var G = App.G;
    if (G.over) return;
    var summary = AI.takeTurn(G, App.st, run());
    summary.events.forEach(function (ev, k) {
      if (ev.t === 'dialogue') say(ev.key, { special: ev.key === 'preSpecial' });
      if (ev.t === 'note') setTimeout(function () { Render.toast(ev.msg); }, 220 * k);
      if (ev.t === 'token') setTimeout(function () { Render.toast(TOKEN_NOTES[ev.kind] || ''); }, 220 * k);
      if (ev.t === 'destroyedX') {
        var fairy = Trinkets.total(run(), 'toothFairy', 'candy') * ev.count;
        if (fairy > 0) {
          run().candy += fairy;
          setTimeout(function () { Render.toast('🦷 Tooth Fairy pays out +' + fairy + ' candy!'); }, 400);
        }
      }
    });
    var win = Engine.findWinNormal(G, 'E');
    if (win) { redraw(); return pageOver('loss', win); }
    Engine.tickAfter(G, 'E');
    if (Engine.boardFull(G)) { redraw(); return pageOver('draw', null); }
    playerTurnStart();
  }

  // ================= trinket shelf =================
  function handleChipTap(id) {
    var ui = App.ui, G = App.G;
    if (!G || G.over || ui.busy || G.turn !== 'P') {
      Render.toast(Trinkets.DB[id].name + ': ' + Trinkets.text(run(), id));
      return;
    }
    var t = Trinkets.DB[id];

    if (id === 'candycane') {
      ui.candyMode = !ui.candyMode;
      redraw(); hintNow();
      return;
    }
    if (!t.active) {
      Render.toast(t.name + ': ' + Trinkets.text(run(), id));
      return;
    }
    if (ui.armed === id) { ui.armed = null; ui.magnetSrc = -1; ui.highlight = new Set(); redraw(); hintNow(); return; }
    if ((App.charges[id] || 0) <= 0) { Render.toast(t.name + ': all used up.'); return; }

    if (id === 'stolenThunder') { G.electArmed++; App.charges[id]--; Render.toast('⚡ Your next X is ELECTRIFIED.'); redraw(); hintNow(); return; }
    if (id === 'beanstalk') { G.rootArmed++; App.charges[id]--; Render.toast('🌱 Your next X will be ROOTED.'); redraw(); hintNow(); return; }
    if (id === 'ballpoint') { G.bleedArmed++; App.charges[id]--; Render.toast('🖊 Pressing hard: your next placement bleeds through.'); redraw(); hintNow(); return; }
    if (id === 'principalsPhone') {
      App.charges[id]--;
      App.notebookUsed[id] = (App.notebookUsed[id] || 0) + 1;
      var wiped = 0;
      G.cells.forEach(function (cl) {
        if (cl.mark === 'O' || cl.mark === 'B') { Engine.destroy(G, cl, true); wiped++; }
      });
      Engine.settle(G);
      Render.toast('☎️ "...yes, all ' + wiped + ' of them. Yes, even the horse."');
      updatePeek(); redraw(); hintNow();
      return;
    }
    if (id === 'ruler') {
      var cands = rulerCandidates(G);
      if (!cands.size) { Render.toast('📏 No line of 2+ to extend.'); return; }
      ui.armed = 'ruler'; ui.highlight = cands;
      redraw(); hintNow();
      return;
    }
    if (id === 'fork' || id === 'magnet' || id === 'bicorneHat') {
      ui.armed = id; ui.magnetSrc = -1; ui.highlight = new Set();
      redraw(); hintNow();
      return;
    }
  }

  function rulerCandidates(G) {
    var out = new Set();
    Engine.LINE_DIRS.forEach(function (d) {
      Engine.innerCells(G).forEach(function (cl) {
        if (cl.mark !== 'X') return;
        // run starting here?
        var pr = cl.r - d.dr, pc = cl.c - d.dc;
        if (Engine.inGrid(G, pr, pc) && Engine.at(G, pr, pc).mark === 'X') return;
        var len = 0, r2 = cl.r, c2 = cl.c;
        while (Engine.inGrid(G, r2, c2) && Engine.at(G, r2, c2).mark === 'X') { len++; r2 += d.dr; c2 += d.dc; }
        if (len < 2) return;
        [[cl.r - d.dr, cl.c - d.dc], [r2, c2]].forEach(function (p) {
          if (!Engine.inner(G, p[0], p[1])) return;
          var n = Engine.at(G, p[0], p[1]);
          if (!n.mark && !n.torn && n.web === 0) out.add(Engine.idx(G, p[0], p[1]));
        });
      });
    });
    return out;
  }

  // ================= page end =================
  function pageOver(result, line) {
    var G = App.G, r = run();
    G.over = { winner: result === 'win' ? 'P' : result === 'loss' ? 'E' : 'draw', line: line };
    App.ui.busy = true;
    redraw();

    var isBoss = Run.isBossPage(r);
    if (result === 'win') say(isBoss ? 'bossDefeat' : 'studentLoses');
    else if (result === 'loss') say('studentWins');
    else say('draw');

    var delta = Run.applyResult(r, result);
    if (delta) setTimeout(function () {
      Render.toast(delta > 0 ? '+' + delta + ' 🍬 candy!' : delta + ' 🍬 candy…');
      Render.drawCandy(r);
    }, 700);
    if (r.juiceUsed && r.candy > 0 && result === 'loss' && delta <= -2) {
      setTimeout(function () { Render.toast('🧃 JUICE BOX! You survive on emergency sugar.'); }, 1100);
    }

    setTimeout(function () { showResultOverlay(result); }, 1600);
  }

  function showResultOverlay(result) {
    var r = run();
    var isBoss = Run.isBossPage(r);
    var title = result === 'win' ? (isBoss ? '👑 SUBJECT MASTERED' : 'PAGE WON') :
      result === 'loss' ? (r.over ? 'OUT OF CANDY' : 'PAGE LOST') : 'A DRAW';
    $('#result-title2').textContent = title;
    $('#result-body2').textContent = 'candy: ' + r.candy;
    $('#btn-continue').textContent = r.over ? '☠ the end' : '▶ continue';
    $('#result-overlay').classList.add('show');
    $('#result-overlay').dataset.result = result;
  }

  function continueFromResult() {
    var r = run();
    var result = $('#result-overlay').dataset.result;
    $('#result-overlay').classList.remove('show');

    if (r.over) return showGameOver();

    if (Run.isBossPage(r)) {
      if (result === 'win') return showBossReward();
      return showCover('retry');
    }
    if (result === 'win') {
      return pickTrinkets('You won the page! Take a trinket', Trinkets.offer(r.rng, 3), function () {
        Run.advancePage(r);
        showCover('pageStart');
      });
    }
    Run.advancePage(r);
    showCover('pageStart');
  }

  function showGameOver() {
    $('#gameover-body').textContent =
      'You ran out of candy in ' + Run.periodName(App.run) + ' (' + subj().title + '), page ' +
      App.run.page + ', holding ' + App.run.trinkets.length + ' trinket(s). The vending machine of fate is empty.';
    Render.showScreen('screen-gameover');
  }

  // ================= trinket picks & grades =================
  /* Every acquisition goes through here: Tutor boosts new arrivals. */
  function addTrinket(id) {
    var r = run();
    var isNew = Trinkets.count(r, id) === 0;
    r.trinkets.push(id);
    if (isNew && Trinkets.gradeable(id)) {
      var arr = Trinkets.arrivalGrade(r);
      if (arr > Trinkets.grade(r, id)) {
        Trinkets.setGrade(r, id, arr);
        Render.toast('🎓 Tutor: ' + Trinkets.DB[id].name + ' arrives at grade ' + Trinkets.gradeName(r, id) + '!');
      }
    }
  }

  function pickTrinkets(title, ids, done) {
    $('#pick-title').textContent = title;
    $('#pick-cards').innerHTML = ids.map(function (id) {
      return Render.trinketCardHTML(App.run, id);
    }).join('');
    $('#pick-cards').querySelectorAll('.trinket-card').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-t');
        var r = App.run;
        // duplicate of something you own? offer the fuse
        if (Trinkets.count(r, id) > 0 && Trinkets.gradeable(id) && Trinkets.grade(r, id) < Trinkets.MAX_GRADE) {
          return showFuseChoice(id, done);
        }
        addTrinket(id);
        var n = App.run.trinkets.length;
        Render.toast(Trinkets.DB[id].icon + ' ' + Trinkets.DB[id].name + ' joins the collection! (' + n + ' trinket' + (n === 1 ? '' : 's') + ')');
        done(id);
      });
    });
    Render.showScreen('screen-pick');
  }

  /* Take the duplicate copy, or fuse it into a grade-up. */
  function showFuseChoice(id, done) {
    var r = run();
    var g = Trinkets.grade(r, id);
    var t = Trinkets.DB[id];
    $('#pick-title').textContent = 'You already have ' + t.name + ' (grade ' + Trinkets.GRADES[g] + ')…';
    $('#pick-cards').innerHTML = Render.trinketCardHTML(r, id) +
      '<div class="fuse-row">' +
      '<button class="btn" id="fuse-stack">📚 take the copy (×' + (Trinkets.count(r, id) + 1) + ')</button>' +
      '<button class="btn" id="fuse-up">🖍 FUSE: grade ' + Trinkets.GRADES[g] + ' → ' + Trinkets.GRADES[g + 1] + '</button>' +
      '</div>';
    $('#fuse-stack').addEventListener('click', function () {
      addTrinket(id);
      Render.toast(t.icon + ' Another ' + t.name + '. They stack.');
      done(id);
    });
    $('#fuse-up').addEventListener('click', function () {
      Trinkets.setGrade(r, id, g + 1);
      Render.toast('🖍 ' + t.name + ' re-graded: ' + Trinkets.GRADES[g] + ' → ' + Trinkets.GRADES[g + 1] + '!');
      done(id);
    });
  }

  function gradeCandidates() {
    var r = run(), seen = {}, out = [];
    r.trinkets.forEach(function (id) {
      if (seen[id]) return;
      seen[id] = true;
      if (Trinkets.gradeable(id) && Trinkets.grade(r, id) < Trinkets.MAX_GRADE) out.push(id);
    });
    return out;
  }

  /* Free grade-up pick (flawless notebook reward). */
  function pickGradeUp(title, done) {
    var cands = gradeCandidates();
    if (!cands.length) return done();
    $('#pick-title').textContent = title;
    $('#pick-cards').innerHTML = cands.map(function (id) {
      return Render.trinketCardHTML(App.run, id);
    }).join('');
    $('#pick-cards').querySelectorAll('.trinket-card').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-t');
        var r = App.run, g = Trinkets.grade(r, id);
        Trinkets.setGrade(r, id, g + 1);
        Render.toast('🖍 ' + Trinkets.DB[id].name + ' re-graded: ' + Trinkets.GRADES[g] + ' → ' + Trinkets.gradeName(r, id) + '!');
        done(id);
      });
    });
    Render.showScreen('screen-pick');
  }

  function applyRedPen() {
    var r = run();
    if (!Trinkets.has(r, 'redPen')) return;
    var n = Trinkets.total(r, 'redPen', 'grades');
    for (var k = 0; k < n; k++) {
      var cands = gradeCandidates().filter(function (id) { return id !== 'redPen'; });
      if (!cands.length) break;
      var id = cands[Math.floor(r.rng() * cands.length)];
      var g = Trinkets.grade(r, id);
      Trinkets.setGrade(r, id, g + 1);
      Render.toast('🖍 Red Pen grades ' + Trinkets.DB[id].name + ' up to ' + Trinkets.gradeName(r, id) + '!');
    }
  }

  function showBossReward() {
    var r = run(), s = subj();
    var sig = s.signature;
    var rarePool = Trinkets.pool('rare', false);
    var alt = rarePool[Math.floor(r.rng() * rarePool.length)];
    var choices = Trinkets.has(r, sig) ? [alt, Trinkets.pool('mythical', false)[0]] : [sig, alt];
    var flawless = r.lossesThisNotebook === 0;
    pickTrinkets(s.boss + ' drops something as the bell rings…', choices, function () {
      if (flawless) {
        pickGradeUp('FLAWLESS NOTEBOOK! 💯 Grade up any trinket, on the house', afterBossRewards);
      } else {
        afterBossRewards();
      }
    });
  }

  function afterBossRewards() {
    var r = run();
    applyRedPen();
    var next = Run.nextLevel(r);
    App.pendingBleeds = [];
    App.goFirstChoice = null;
    r._transformed = false;
    if (next === 'victory') return Render.showScreen('screen-victory');
    App.notebookUsed = {};
    pickTrinkets('New notebook! Grab an uncommon from your locker', Trinkets.uncommonOffer(r.rng, 3), function () {
      showCover('intro');
    });
  }

  // ================= bathroom =================
  function enterBathroom() {
    var r = run();
    r.visitsUsed++;
    r._shopOffer = Trinkets.offer(r.rng, 4);
    r._bought = false;
    $('#eddie-line').textContent = Subjects.line(r.rng, Subjects.EDDIE.greet);
    drawShop();
    Render.showScreen('screen-bathroom');
  }

  function drawShop() {
    var r = run();
    $('#shop-candy').textContent = '🍬 × ' + r.candy;
    $('#shop-items').innerHTML = r._shopOffer.map(function (id) {
      var t = Trinkets.DB[id];
      var p = Trinkets.price(r, id);
      var can = !r._bought && r.candy - p >= 1;
      return '<div class="shop-item r-' + t.rarity + (can ? '' : ' off') + '" data-id="' + id + '">' +
        '<span class="si-icon">' + t.icon + '</span>' +
        '<span class="si-name">' + t.name + ' <em class="si-rarity">' + t.rarity + '</em></span>' +
        '<span class="si-text">' + Trinkets.text(r, id) + '</span>' +
        '<span class="si-price">' + p + ' 🍬</span></div>';
    }).join('');
    $('#shop-items').querySelectorAll('.shop-item:not(.off)').forEach(function (el) {
      el.addEventListener('click', function () { buyTrinket(el.getAttribute('data-id')); });
    });
    drawBackroom();
  }

  /* Eddie's back room: pay candy to re-grade one owned trinket.
     Counts as your one transaction for the visit. */
  function drawBackroom() {
    var r = run();
    var cands = gradeCandidates();
    $('#backroom-wrap').style.display = cands.length ? '' : 'none';
    $('#backroom-items').innerHTML = cands.map(function (id) {
      var t = Trinkets.DB[id];
      var g = Trinkets.grade(r, id);
      var p = Trinkets.upgradePrice(r, id);
      var can = !r._bought && r.candy - p >= 1;
      return '<div class="shop-item backroom r-' + t.rarity + (can ? '' : ' off') + '" data-id="' + id + '">' +
        '<span class="si-icon">' + t.icon + '</span>' +
        '<span class="si-name">' + t.name + ' <em class="si-grade-arrow">' + Trinkets.GRADES[g] + ' → ' + Trinkets.GRADES[g + 1] + '</em></span>' +
        '<span class="si-text">' + Trinkets.text(r, id) + '</span>' +
        '<span class="si-price">' + p + ' 🍬</span></div>';
    }).join('');
    $('#backroom-items').querySelectorAll('.shop-item:not(.off)').forEach(function (el) {
      el.addEventListener('click', function () { buyUpgrade(el.getAttribute('data-id')); });
    });
  }

  function buyTrinket(id) {
    var r = run();
    var p = Trinkets.price(r, id);
    if (r._bought || r.candy - p < 1) {
      $('#eddie-line').textContent = Subjects.line(r.rng, Subjects.EDDIE.broke);
      return;
    }
    r.candy -= p;
    addTrinket(id);
    r._bought = true;
    $('#eddie-line').textContent = Subjects.line(r.rng, Subjects.EDDIE.buy);
    Render.toast(Trinkets.DB[id].icon + ' bought ' + Trinkets.DB[id].name + ' for ' + p + ' 🍬');
    drawShop();
  }

  function buyUpgrade(id) {
    var r = run();
    var p = Trinkets.upgradePrice(r, id);
    if (r._bought || p === null || r.candy - p < 1) {
      $('#eddie-line').textContent = Subjects.line(r.rng, Subjects.EDDIE.broke);
      return;
    }
    r.candy -= p;
    var g = Trinkets.grade(r, id);
    Trinkets.setGrade(r, id, g + 1);
    r._bought = true;
    $('#eddie-line').textContent = '"Grades? Yeah, I know a guy. The guy is me."';
    Render.toast('🖍 ' + Trinkets.DB[id].name + ' re-graded: ' + Trinkets.GRADES[g] + ' → ' + Trinkets.gradeName(r, id) + ' for ' + p + ' 🍬');
    drawShop();
  }

  // ================= events =================
  function wire() {
    $('#btn-new-run').addEventListener('click', startRun);

    $('#board').addEventListener('click', function (e) {
      var cell = e.target.closest('.cell');
      if (cell) handleCellTap(+cell.getAttribute('data-i'));
    });

    $('#shelf').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (chip) handleChipTap(chip.getAttribute('data-t'));
    });

    $('#btn-start-page').addEventListener('click', startPage);
    $('#btn-face-boss').addEventListener('click', startPage);
    $('#btn-continue').addEventListener('click', continueFromResult);

    $('#btn-bathroom').addEventListener('click', function () {
      Render.toast('"I… gotta go to the bathroom."');
      setTimeout(enterBathroom, 800);
    });
    $('#btn-leave-shop').addEventListener('click', function () {
      Render.toast(Subjects.line(App.run.rng, Subjects.EDDIE.leave));
      showCover('pageStart');
    });
    $('#btn-fieldtrip').addEventListener('click', function () {
      App.notebookUsed.fieldTrip = (App.notebookUsed.fieldTrip || 0) + 1;
      Render.toast('🚌 Field trip! You skip the page entirely.');
      Run.advancePage(App.run);
      showCover('pageStart');
    });
    document.querySelectorAll('.seat-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        App.goFirstChoice = b.getAttribute('data-s');
        drawSeating();
      });
    });

    $('#btn-again-1').addEventListener('click', function () { Render.showScreen('screen-title'); });
    $('#btn-again-2').addEventListener('click', function () { Render.showScreen('screen-title'); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    wire();
    Render.showScreen('screen-title');
  });

  // dev hook for tests/staging
  window.__bt = {
    App: App, startPage: startPage, showCover: showCover,
    pickTrinkets: pickTrinkets, showBossReward: showBossReward, enterBathroom: enterBathroom,
  };

})();
