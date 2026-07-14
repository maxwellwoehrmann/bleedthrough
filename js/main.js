/* ============================================================
   BLEEDTHROUGH v0.2 — main.js
   The school day: title -> pick utensil -> class cover -> pages
   -> boss transform -> reward -> next period. Candy is life.
   ============================================================ */

(function () {

  var $ = function (sel) { return document.querySelector(sel); };

  var App = { run: null, G: null, st: null, ui: null };

  function freshUi() {
    return {
      utensilMode: 'draw',
      stickerArmed: -1, stickerTargets: [],
      canUseSticker: true,
      placesLeft: 1,
      highlight: new Set(),
      peekCell: -1,
      busy: false,
    };
  }

  function subj() { return Run.subject(App.run); }
  function say(key, opts) {
    var d = subj().dialogue[key];
    Render.bubble(Subjects.line(App.run.rng, d), opts);
  }
  function foeName() {
    return Run.isBossPage(App.run) ? subj().boss : subj().student;
  }
  function redraw() { Render.match(App.G, App.ui, App.run, foeName()); }

  // ================= run / page setup =================
  function startRun(utensil) {
    App.run = Run.newRun(utensil, (Date.now() % 1000000) | 0);
    showCover('intro');
  }

  function showCover(kind) {
    var run = App.run;
    var s = subj();
    $('#cover-period').textContent = Run.periodName(run);
    $('#cover-subject').textContent = s.periodEmoji + ' ' + s.title.toUpperCase();
    $('#cover-page').textContent = Run.isBossPage(run)
      ? 'FINAL PAGE — ' + run.page + '/' + run.pagesPerNotebook
      : 'page ' + run.page + ' of ' + run.pagesPerNotebook;
    var d = s.dialogue[kind === 'intro' && run.page === 1 ? 'intro' : kind === 'retry' ? 'retry' : 'pageStart'];
    $('#cover-dialogue').textContent = Subjects.line(run.rng, d);
    $('#cover-vs').textContent = 'vs ' + (Run.isBossPage(run) ? s.student + '… probably' : s.student);
    $('#btn-start-page').textContent = Run.isBossPage(run) ? '▶ turn to the final page' : '▶ turn the page';
    $('#btn-bathroom').style.display = run.bathroomUsed ? 'none' : '';
    Render.drawCandy(run);
    Render.showScreen('screen-cover');
  }

  function startPage() {
    var run = App.run;
    if (Run.isBossPage(run) && !run._transformed) {
      run._transformed = true;
      return showTransform();
    }
    var G = Engine.newPage({
      size: Run.boardSize(run),
      rng: run.rng,
      firstTurn: Run.isBossPage(run) ? 'E' : 'P',
    });
    G.playerGapLines = Run.gapLines(run);
    App.G = G;
    App.st = AI.newState(run);
    App.ui = freshUi();

    // pen bleedthrough from the previous page
    if (run.bleedCell && Run.bleeds(run)) {
      Engine.place(G, 'P', run.bleedCell.r, run.bleedCell.c, { bled: true });
      Render.toast('🖋 Your X bled through from the last page.');
    }
    run.bleedCell = null;

    Render.showScreen('screen-match');
    $('#result-overlay').classList.remove('show');
    redraw();
    if (Run.isBossPage(run)) {
      say('bossIntro');
      App.ui.busy = true;
      setTimeout(enemyTurn, 1400);
    } else {
      say(run.page === 1 ? 'intro' : 'pageStart');
      playerTurnStart();
    }
  }

  function showTransform() {
    var s = subj();
    $('#transform-title').textContent = s.bossTitle;
    $('#transform-body').innerHTML = s.dialogue.transform.map(function (t) { return '<p>' + t + '</p>'; }).join('');
    Render.showScreen('screen-transform');
  }

  // ================= turns =================
  function playerTurnStart() {
    var ui = App.ui;
    ui.busy = false;
    ui.canUseSticker = true;
    ui.placesLeft = 1;
    ui.stickerArmed = -1;
    ui.stickerTargets = [];
    ui.highlight = new Set();
    updatePeek();
    redraw();
    hintNow();
  }

  function hintNow() {
    var ui = App.ui;
    if (App.G.over) { Render.hint(''); return; }
    if (ui.stickerArmed >= 0) {
      var st = Stickers.DB[App.run.stickers[ui.stickerArmed]];
      Render.hint(st.target === 'enemyO2'
        ? 'tap ' + (2 - ui.stickerTargets.length) + ' O\'s to erase (tap the note again to cancel)'
        : 'tap a target (tap the note again to cancel)');
      return;
    }
    if (ui.placesLeft > 1) { Render.hint('two-fer! place ' + ui.placesLeft + ' X\'s'); return; }
    if (App.G.marginUnlocks > 0) { Render.hint('margin unlocked — the outside squares glow'); return; }
    Render.hint(App.ui.utensilMode === 'erase' ? 'tap an O to erase it (leaves a 2-turn smudge)' : 'tap a square to place your X');
  }

  function updatePeek() {
    var G = App.G, ui = App.ui;
    ui.peekCell = -1;
    if (G.peek && !G.over) {
      var cell = AI.predict(G, App.st);
      if (cell) ui.peekCell = Engine.idx(G, cell.r, cell.c);
    }
  }

  function absorbExtras() {
    if (App.G.extraPlaces > 0) {
      App.ui.placesLeft += App.G.extraPlaces;
      App.G.extraPlaces = 0;
    }
  }

  function handleCellTap(i) {
    var G = App.G, ui = App.ui, run = App.run;
    if (G.over || ui.busy) return;
    var cell = G.cells[i];

    // sticker targeting
    if (ui.stickerArmed >= 0) {
      var stk = Stickers.DB[run.stickers[ui.stickerArmed]];
      if (stk.target === 'empty') {
        if (cell.margin || cell.mark || cell.smudge > 0) return;
        stk.effect(G, { r: cell.r, c: cell.c });
        consumeSticker();
      } else if (stk.target === 'enemyO') {
        if (cell.mark !== 'O') return;
        stk.effect(G, { r: cell.r, c: cell.c });
        consumeSticker();
      } else if (stk.target === 'enemyO2') {
        if (cell.mark !== 'O') return;
        ui.stickerTargets.push({ r: cell.r, c: cell.c });
        if (ui.stickerTargets.length >= 2 || countOs(G) <= ui.stickerTargets.length) {
          stk.effect(G, { targets: ui.stickerTargets });
          consumeSticker();
        } else { redraw(); hintNow(); }
      }
      return;
    }

    // erase mode (pencil / erasable pen): erasing IS your turn
    if (ui.utensilMode === 'erase') {
      if (cell.mark !== 'O') return;
      Engine.eraseO(G, cell.r, cell.c, 2);
      Render.toast('🧼 Erased. The smudge lasts 2 turns.');
      afterPlayerAction(true);
      return;
    }

    // place an X
    if (!Engine.canPlace(G, 'P', cell)) return;
    Engine.place(G, 'P', cell.r, cell.c);
    afterPlayerAction(false);
  }

  function countOs(G) {
    return G.cells.filter(function (cl) { return cl.mark === 'O'; }).length;
  }

  function afterPlayerAction(wasErase) {
    var G = App.G, ui = App.ui;
    absorbExtras();
    var win = Engine.findWin(G, 'P', G.playerGapLines);
    if (win) return pageOver('win', win);

    ui.placesLeft--;
    if (!wasErase && ui.placesLeft > 0) { redraw(); hintNow(); return; }

    Engine.tickAfter(G, 'P');
    if (boardJammed(G)) return pageOver('draw', null);
    ui.busy = true;
    redraw();
    Render.hint(foeName() + ' is thinking…');
    setTimeout(enemyTurn, 750);
  }

  function boardJammed(G) {
    return !Engine.innerCells(G).some(function (cl) { return !cl.mark && cl.smudge === 0; });
  }

  function enemyTurn() {
    var G = App.G, st = App.st;
    if (G.over) return;
    var summary = AI.takeTurn(G, st, App.run);
    summary.events.forEach(function (ev, k) {
      if (ev.t === 'dialogue') say(ev.key, { special: ev.key === 'preSpecial' });
      if (ev.t === 'note') setTimeout(function () { Render.toast(ev.msg); }, 250 * k);
    });
    var win = Engine.findWin(G, 'E', false);
    if (win) { redraw(); return pageOver('loss', win); }
    Engine.tickAfter(G, 'E');
    if (boardJammed(G)) { redraw(); return pageOver('draw', null); }
    playerTurnStart();
  }

  // ================= stickers =================
  function handleStickerTap(s) {
    var run = App.run, ui = App.ui, G = App.G;
    if (G.over || ui.busy) return;
    if (ui.stickerArmed === s) { ui.stickerArmed = -1; ui.stickerTargets = []; redraw(); hintNow(); return; }
    if (!ui.canUseSticker) { Render.toast('One sticky note per turn.'); return; }
    var id = run.stickers[s];
    if (!id) return;
    var stk = Stickers.DB[id];
    if (!stk.target) {
      stk.effect(G, {});
      run.stickers.splice(s, 1);
      ui.canUseSticker = false;
      Render.toast(stk.icon + ' ' + stk.name + '!');
      absorbExtras();
      updatePeek();
      redraw(); hintNow();
    } else {
      if ((stk.target === 'enemyO' || stk.target === 'enemyO2') && countOs(G) === 0) {
        Render.toast('No O\'s on the page to target.');
        return;
      }
      ui.stickerArmed = s;
      ui.stickerTargets = [];
      redraw(); hintNow();
    }
  }

  function consumeSticker() {
    var ui = App.ui, run = App.run;
    var id = run.stickers[ui.stickerArmed];
    run.stickers.splice(ui.stickerArmed, 1);
    ui.stickerArmed = -1;
    ui.stickerTargets = [];
    ui.canUseSticker = false;
    Render.toast(Stickers.DB[id].icon + ' ' + Stickers.DB[id].name + '!');
    updatePeek();
    redraw(); hintNow();
  }

  // ================= page end =================
  function pageOver(result, line) {
    var G = App.G, run = App.run;
    G.over = { winner: result === 'win' ? 'P' : result === 'loss' ? 'E' : 'draw', line: line };
    App.ui.busy = true;
    redraw();

    var isBoss = Run.isBossPage(run);
    if (result === 'win') say(isBoss ? 'bossDefeat' : 'studentLoses');
    else if (result === 'loss') say('studentWins');
    else say('draw');

    var delta = Run.applyResult(run, result);
    if (delta) setTimeout(function () {
      Render.toast(delta > 0 ? '+1 🍬 candy!' : '−2 🍬 candy…');
      Render.drawCandy(run);
    }, 700);

    // pen bleedthrough: remember your final X
    if (result === 'win' && !isBoss && Run.bleeds(run) && G.lastPlayerX) {
      run.bleedCell = G.lastPlayerX;
    }

    setTimeout(function () { showResultOverlay(result); }, 1700);
  }

  function showResultOverlay(result) {
    var run = App.run;
    var isBoss = Run.isBossPage(run);
    var title = result === 'win' ? (isBoss ? '👑 SUBJECT MASTERED' : 'PAGE WON') :
      result === 'loss' ? (run.over ? 'OUT OF CANDY' : 'PAGE LOST') : 'A DRAW';
    var body = result === 'win' ? '+1 🍬' : result === 'loss' ? '−2 🍬' : 'no candy changes hands';
    $('#result-title2').textContent = title;
    $('#result-body2').textContent = body + '  ·  candy: ' + run.candy;
    $('#btn-continue').textContent = run.over ? '☠ the end' : '▶ continue';
    $('#result-overlay').classList.add('show');
    $('#result-overlay').dataset.result = result;
  }

  function continueFromResult() {
    var run = App.run;
    var result = $('#result-overlay').dataset.result;
    $('#result-overlay').classList.remove('show');

    if (run.over) return showGameOver();

    if (Run.isBossPage(run)) {
      if (result === 'win') return showReward();
      return showCover('retry');            // the boss must be beaten to pass
    }
    // normal pages: the class period marches on, win or lose
    Run.advancePage(run);
    showCover('pageStart');
  }

  function showGameOver() {
    $('#gameover-body').textContent =
      'You ran out of candy in ' + Run.periodName(App.run) + ' (' + subj().title + '), page ' +
      App.run.page + '. The vending machine of fate is empty.';
    Render.showScreen('screen-gameover');
  }

  // ================= rewards =================
  function showReward() {
    var run = App.run;
    var picks = Run.rewardChoices(run);
    $('#reward-sub').textContent = subj().boss + ' drops something as the bell rings…';
    $('#reward-cards').innerHTML = picks.map(function (id) {
      var t = Run.TRINKETS[id];
      return '<div class="trinket-card" data-t="' + id + '">' +
        '<div class="tk-icon">' + t.icon + '</div><div class="tk-name">' + t.name + '</div>' +
        '<div class="tk-text">' + t.text + '</div><div class="tk-flavor">' + t.flavor + '</div></div>';
    }).join('');
    $('#reward-cards').querySelectorAll('.trinket-card').forEach(function (el) {
      el.addEventListener('click', function () {
        run.trinkets.push(el.getAttribute('data-t'));
        Render.toast('Permanent trinket: ' + Run.TRINKETS[el.getAttribute('data-t')].name + '!');
        run._transformed = false;
        var next = Run.nextLevel(run);
        if (next === 'victory') return Render.showScreen('screen-victory');
        showCover('intro');
      });
    });
    Render.showScreen('screen-reward');
  }

  // ================= bathroom =================
  function enterBathroom() {
    var run = App.run;
    run.bathroomUsed = true;
    run._shopOffer = Stickers.shopOffer(run.rng);
    run._bought = false;
    $('#eddie-line').textContent = Subjects.line(run.rng, Subjects.EDDIE.greet);
    drawShop();
    Render.showScreen('screen-bathroom');
  }

  function drawShop() {
    var run = App.run;
    $('#shop-candy').textContent = '🍬 × ' + run.candy;
    $('#shop-items').innerHTML = run._shopOffer.map(function (id) {
      var s = Stickers.DB[id];
      var affordable = run.candy - s.price >= 1;   // never spend your last candy
      var can = !run._bought && affordable && run.stickers.length < Run.MAX_STICKERS;
      return '<div class="shop-item' + (can ? '' : ' off') + '" data-id="' + id + '">' +
        '<span class="si-icon">' + s.icon + '</span>' +
        '<span class="si-name">' + s.name + '</span>' +
        '<span class="si-text">' + s.text + '</span>' +
        '<span class="si-price">' + s.price + ' 🍬</span></div>';
    }).join('');
    $('#shop-items').querySelectorAll('.shop-item:not(.off)').forEach(function (el) {
      el.addEventListener('click', function () { buySticker(el.getAttribute('data-id')); });
    });
  }

  function buySticker(id) {
    var run = App.run;
    var s = Stickers.DB[id];
    if (run._bought) return;
    if (run.candy - s.price < 1) {
      $('#eddie-line').textContent = Subjects.line(run.rng, Subjects.EDDIE.broke);
      return;
    }
    run.candy -= s.price;
    run.stickers.push(id);
    run._bought = true;
    $('#eddie-line').textContent = Subjects.line(run.rng, Subjects.EDDIE.buy);
    Render.toast(s.icon + ' bought ' + s.name + ' for ' + s.price + ' 🍬');
    drawShop();
  }

  // ================= events =================
  function wire() {
    document.querySelectorAll('.utensil-pick').forEach(function (el) {
      el.addEventListener('click', function () { startRun(el.getAttribute('data-u')); });
    });

    $('#board').addEventListener('click', function (e) {
      var cell = e.target.closest('.cell');
      if (cell) handleCellTap(+cell.getAttribute('data-i'));
    });

    $('#sticker-row').addEventListener('click', function (e) {
      var s = e.target.closest('.sticker');
      if (s && s.dataset.s !== undefined) handleStickerTap(+s.dataset.s);
    });

    $('#utensil-bar').addEventListener('click', function (e) {
      var b = e.target.closest('.mode-btn');
      if (!b || !App.ui || App.ui.busy) return;
      App.ui.utensilMode = b.getAttribute('data-mode');
      redraw(); hintNow();
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

    $('#btn-again-1').addEventListener('click', function () { Render.showScreen('screen-title'); });
    $('#btn-again-2').addEventListener('click', function () { Render.showScreen('screen-title'); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    wire();
    Render.showScreen('screen-title');
  });

  // dev hook for driving/staging in tests — not used by the game itself
  window.__bt = { App: App, startPage: startPage, showCover: showCover, showReward: showReward };

})();
