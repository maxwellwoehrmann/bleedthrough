/* ============================================================
   BLEEDTHROUGH — main.js
   Game flow: run -> front match -> (draft) -> flipside -> result.
   Owns the interaction state machine and wires the DOM events.
   ============================================================ */

(function () {

  var $ = function (sel) { return document.querySelector(sel); };

  var App = {
    run: null,   // { deckIds, seed }
    G: null,     // current match
    foe: null,
    front: null, // finished front match (for flipside build)
    ui: null,
  };

  function freshUi() {
    return {
      mode: 'idle', selectedCard: -1,
      highlight: new Set(), preview: new Set(),
      pending: null,       // {k, id, stage} while targeting
      anchor: null,
      freeCells: [], freeLeft: 0,
      placementsDone: 0,
    };
  }

  function redraw() { Render.match(App.G, App.ui, App.foe); }
  function fx() { Render.drainFx(App.G, App.foe); }

  // ================= run / match setup =================
  function startRun() {
    App.run = { deckIds: Cards.STARTER_DECK.slice(), seed: (Date.now() % 100000) | 0 };
    startFront();
  }

  function startFront() {
    var G = Engine.newMatch({ seed: App.run.seed, target: 40, deck: App.run.deckIds.slice() });
    Engine.scatterTerrain(G);
    Engine.shuffle(G, G.deck);
    App.G = G;
    App.foe = Enemy.makeInkfiend('front');
    App.front = null;
    App.ui = freshUi();
    Engine.draw(G, 4);
    beginPlayerTurn(true);
    Render.showScreen('screen-match');
    redraw();
  }

  function startFlipside() {
    var F = Flipside.build(App.front, { deck: App.run.deckIds.slice(), target: 30 });
    App.G = F;
    App.foe = Enemy.makeInkfiend('flip');
    App.ui = freshUi();
    Engine.draw(F, 4);
    var copies = Flipside.applyCarbonPaper(F);
    if (copies.length) {
      Render.toast('Carbon Paper: copied ' + copies.map(function (id) { return Cards.DB[id].name; }).join(' + ') + ' into your hand.');
    }
    beginPlayerTurn(true);
    var page = $('#page');
    page.classList.add('flipping');
    setTimeout(function () { page.classList.remove('flipping'); }, 900);
    Render.showScreen('screen-match');
    redraw();
    Render.toast('The page turns. The ink remembers.');
  }

  // ================= turn loop =================
  function beginPlayerTurn(first) {
    var G = App.G;
    if (G.over) return finishMatch();
    if (!Engine.fitShape(G, { kind: 'line', len: 1 })) {
      Engine.checkJam(G);
      return finishMatch();
    }
    var drawn = Engine.startPlayerTurn(G);
    if (!first && drawn.length) {
      Render.toast('drew: ' + drawn.map(function (id) { return Cards.DB[id].name; }).join(', '));
    }
    G.pressHardThisTurn = false;
    App.ui = freshUi();
  }

  function endPlayerTurn() {
    var G = App.G;
    G.pressHardThisTurn = false;
    G.placement.P = null;
    Engine.checkJam(G);
    if (G.over) return finishMatch();
    App.ui.mode = 'enemy';
    redraw();
    setTimeout(enemyTurn, 700);
  }

  function enemyTurn() {
    var G = App.G;
    var summary = Enemy.takeTurn(G, App.foe);
    Render.toast(App.foe.name + ': ' + summary.action.name + (summary.action.surprise ? '!!' : ''));
    fx();
    redraw();
    if (G.over) return setTimeout(finishMatch, 900);
    setTimeout(function () {
      beginPlayerTurn(false);
      redraw();
    }, 650);
  }

  // ================= playing cards =================
  function selectCard(k) {
    var ui = App.ui;
    if (ui.mode !== 'idle') return;
    ui.selectedCard = (ui.selectedCard === k) ? -1 : k;
    redraw();
  }

  function tryPlayCard(k) {
    var G = App.G, ui = App.ui;
    if (G.over || G.turn !== 'P' || ui.mode !== 'idle') return;
    var id = G.hand[k];
    var card = Cards.DB[id];
    if (!card) return;
    if (card.type !== 'margin' && G.playsLeft <= 0) {
      Render.toast('No plays left this turn. (Margin cards are still free.)');
      redraw();
      return;
    }
    if (!card.target) {
      commitCard(k, id, {});
      return;
    }
    // targeting needed
    if (card.target === 'steal') {
      if (!G.trinkets.E.length) { Render.toast('The Inkfiend has nothing worth stealing. Yet.'); redraw(); return; }
      openStealModal(k, id);
      return;
    }
    ui.pending = { k: k, id: id, stage: 1 };
    ui.selectedCard = -1;
    if (card.target === 'empty-cell') {
      ui.mode = 'target-cell';
      ui.highlight = collectCells(function (cell) { return Engine.placeable(cell); });
    } else if (card.target === 'enemy-mark') {
      ui.mode = 'target-cell';
      ui.highlight = collectCells(function (cell) { return cell.mark === 'E' && !Engine.isCircled(cell); });
      if (!ui.highlight.size) { Render.toast('No erasable enemy ink on the page.'); cancelTargeting(); return; }
    } else if (card.target === 'area-3x3') {
      ui.mode = 'target-cell';
      ui.highlight = collectCells(function () { return true; });
    } else if (card.target === 'strip-erase') {
      ui.mode = 'target-cell';
      ui.highlight = collectCells(function (cell) {
        return (cell.mark && !Engine.isCircled(cell)) || cell.smudge;
      });
      if (!ui.highlight.size) { Render.toast('Nothing on the page to white-out.'); cancelTargeting(); return; }
    }
    redraw();
  }

  function collectCells(pred) {
    var s = new Set();
    App.G.cells.forEach(function (cell, i) { if (pred(cell, i)) s.add(i); });
    return s;
  }

  function commitCard(k, id, ctx) {
    var G = App.G;
    var card = Cards.DB[id];
    G.hand.splice(k, 1);
    if (card.type !== 'margin') G.playsLeft--;
    if (card.type === 'active' || card.type === 'margin') {
      G.discard.push(id);
      if (G.side === 'front') G.playedActivesFront.push(id);
    }
    card.effect(G, ctx);
    cancelTargeting(true);
    fx();
    if (G.over) return finishMatch();
    redraw();
  }

  function cancelTargeting(silent) {
    var ui = App.ui;
    ui.mode = 'idle';
    ui.pending = null;
    ui.anchor = null;
    ui.highlight = new Set();
    ui.preview = new Set();
    if (!silent) redraw();
  }

  function handleTargetTap(i) {
    var G = App.G, ui = App.ui;
    var card = Cards.DB[ui.pending.id];

    if (card.target === 'empty-cell' || card.target === 'enemy-mark') {
      if (!ui.highlight.has(i)) return;
      commitCard(ui.pending.k, ui.pending.id, { cellIdx: i });
      return;
    }
    if (card.target === 'area-3x3') {
      var r = Math.floor(i / G.size), c = i % G.size;
      r = Math.max(1, Math.min(G.size - 2, r));
      c = Math.max(1, Math.min(G.size - 2, c));
      var cells = [];
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        cells.push(Engine.idx(G, r + dr, c + dc));
      }
      commitCard(ui.pending.k, ui.pending.id, { cellIdxs: cells });
      return;
    }
    if (card.target === 'strip-erase') {
      if (ui.pending.stage === 1) {
        if (!ui.highlight.has(i)) return;
        ui.anchor = i;
        ui.pending.stage = 2;
        ui.mode = 'target-strip';
        // endpoints: straight cells within distance 2 (or the anchor itself for single)
        var hi = new Set([i]);
        var r0 = Math.floor(i / G.size), c0 = i % G.size;
        Engine.ALL_DIRS8.forEach(function (d) {
          for (var step = 1; step <= 2; step++) {
            var rr = r0 + d.dr * step, cc = c0 + d.dc * step;
            if (Engine.inBounds(G, rr, cc)) hi.add(Engine.idx(G, rr, cc));
          }
        });
        ui.highlight = hi;
        redraw();
      } else {
        if (!ui.highlight.has(i)) return;
        var cellsIdxs = stripBetween(G, ui.anchor, i);
        commitCard(ui.pending.k, ui.pending.id, { cellIdxs: cellsIdxs });
      }
    }
  }

  function stripBetween(G, a, b) {
    var r0 = Math.floor(a / G.size), c0 = a % G.size;
    var r1 = Math.floor(b / G.size), c1 = b % G.size;
    var dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0);
    var out = [a];
    var r = r0, c = c0;
    var guard = 0;
    while ((r !== r1 || c !== c1) && guard++ < 8) {
      r += dr; c += dc;
      out.push(Engine.idx(G, r, c));
    }
    return out;
  }

  // ================= placement =================
  function handleCellTap(i) {
    var G = App.G, ui = App.ui;
    if (G.over || G.turn !== 'P') return;

    if (ui.mode === 'target-cell' || ui.mode === 'target-strip') return handleTargetTap(i);
    if (ui.mode === 'enemy') return;

    if (ui.mode === 'place-endpoint') {
      if (i === ui.anchor) { cancelTargeting(); return; }
      if (!ui.highlight.has(i)) return;
      var cells = lineFromAnchor(G, ui.anchor, i);
      if (cells) doPlacement(cells);
      return;
    }

    if (ui.mode === 'place-free') {
      if (!Engine.placeable(G.cells[i]) || ui.freeCells.indexOf(i) !== -1) return;
      ui.freeCells.push(i);
      ui.freeLeft--;
      ui.preview = new Set(ui.freeCells);
      if (ui.freeLeft <= 0 || !anyPlaceableExcept(G, ui.freeCells)) {
        doPlacement(ui.freeCells.slice());
      } else {
        redraw();
      }
      return;
    }

    // idle: begin a placement with the current shape
    var shape = Engine.fitShape(G, Engine.currentShape(G, 'P'));
    if (!shape) { Engine.checkJam(G); return finishMatch(); }

    if (shape.kind === 'free') {
      ui.mode = 'place-free';
      ui.freeCells = []; ui.freeLeft = shape.n;
      ui.highlight = collectCells(function (cell) { return Engine.placeable(cell); });
      // fall through: first tap counts
      App.ui = ui;
      handleCellTap(i);
      return;
    }

    if (shape.kind === 'block') {
      var bcells = Engine.blockCells(G, Math.floor(i / G.size), i % G.size, shape.w, shape.h);
      if (!bcells) { Render.toast("The block doesn't fit there."); return; }
      doPlacement(bcells);
      return;
    }

    // line
    if (shape.len === 1) {
      if (!Engine.placeable(G.cells[i])) return;
      doPlacement([i]);
      return;
    }
    if (!Engine.placeable(G.cells[i])) return;
    var ends = validEndpoints(G, i, shape.len);
    if (!ends.size) { Render.toast('A line of ' + shape.len + " can't start there."); return; }
    ui.mode = 'place-endpoint';
    ui.anchor = i;
    ui.highlight = ends;
    redraw();
  }

  function validEndpoints(G, anchor, len) {
    var s = new Set();
    var r = Math.floor(anchor / G.size), c = anchor % G.size;
    Engine.ALL_DIRS8.forEach(function (d) {
      var cells = Engine.lineCells(G, r, c, d, len);
      if (cells) s.add(cells[cells.length - 1]);
    });
    return s;
  }

  function lineFromAnchor(G, anchor, endpoint) {
    var r0 = Math.floor(anchor / G.size), c0 = anchor % G.size;
    var r1 = Math.floor(endpoint / G.size), c1 = endpoint % G.size;
    var d = { dr: Math.sign(r1 - r0), dc: Math.sign(c1 - c0) };
    var len = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0)) + 1;
    return Engine.lineCells(G, r0, c0, d, len);
  }

  function anyPlaceableExcept(G, taken) {
    return G.cells.some(function (cell, i) {
      return Engine.placeable(cell) && taken.indexOf(i) === -1;
    });
  }

  function doPlacement(cells) {
    var G = App.G, ui = App.ui;
    Engine.placeMarks(G, 'P', cells, { pressHard: !!G.pressHardThisTurn });
    fx();
    if (G.over) return finishMatch();

    if (G.doubleTake && ui.placementsDone === 0) {
      ui.placementsDone = 1;
      ui.mode = 'idle';
      ui.anchor = null; ui.highlight = new Set(); ui.preview = new Set();
      ui.freeCells = []; ui.freeLeft = 0;
      Render.toast('DOUBLE TAKE — place it again!');
      redraw();
      return;
    }
    endPlayerTurn();
  }

  // ================= match end / draft / flip =================
  function finishMatch() {
    var G = App.G;
    if (!G.over) return;
    redraw();
    setTimeout(function () {
      if (G.side === 'front') {
        App.front = G;
        openDraft();
      } else {
        showResult();
      }
    }, 1100);
  }

  var draftGoesTo = null; // 'flip' | 'result'

  function openDraft() {
    var front = App.front;
    var playerLost = front.over.winner === 'E';
    draftGoesTo = (playerLost || front.flipsidePact) ? 'flip' : 'result';

    var pool = Cards.DRAFT_POOL.slice();
    Engine.shuffle(front, pool);
    var picks = [pool[0], pool[1], pool[2]];

    $('#draft-title').textContent = draftGoesTo === 'flip'
      ? (playerLost ? 'Beaten… but the page has two sides.' : 'The Pact demands the flipside.')
      : 'Page cleared! A sticker pack falls out of the notebook.';
    $('#draft-sub').textContent = 'Tuck one card into your deck.';
    $('#draft-cards').innerHTML = picks.map(function (id) { return Render.cardHTML(id); }).join('');
    $('#draft-cards').querySelectorAll('.card').forEach(function (el) {
      el.addEventListener('click', function () {
        App.run.deckIds.push(el.getAttribute('data-card'));
        Render.toast('Added: ' + Cards.DB[el.getAttribute('data-card')].name);
        afterDraft();
      });
    });
    Render.showScreen('screen-draft');
  }

  function afterDraft() {
    if (draftGoesTo === 'flip') startFlipside();
    else showResult();
  }

  function showResult() {
    var G = App.G;
    var won = G.over.winner === 'P';
    var how = {
      target: won ? 'You hit the target score.' : 'The Inkfiend hit the target score.',
      jam: 'The page jammed solid — ' + (won ? 'your' : 'their') + ' ink weighed more.',
      spiral: (won ? 'Your' : 'Their') + ' line ran through THE SPIRAL.',
      suddenDeath: 'Sudden Death: a line of six ended everything.',
    }[G.over.how] || '';

    var title, body;
    if (G.side === 'front' && won) {
      title = 'PAGE CLEARED ✓';
      body = how + ' In the full run you\'d march on to page 2 — for now, you can flip the page anyway to watch your ink bleed through.';
    } else if (won) {
      title = 'COMEBACK — WON ON THE REBOUND';
      body = how + ' The front side\'s ink set up the flipside. That\'s the whole idea.';
    } else {
      title = 'RUN OVER — the notebook closes';
      body = how + ' Next time, leave more uncircled ink lying around: it becomes your ghosts on the flipside.';
    }
    $('#result-title').textContent = title;
    $('#result-body').textContent = body;
    $('#result-score').textContent = 'you ' + G.scores.P + ' · ' + G.scores.E + ' inkfiend';
    $('#btn-flip-anyway').style.display = (G.side === 'front' && won) ? '' : 'none';
    Render.showScreen('screen-result');
  }

  // ================= steal modal =================
  function openStealModal(k, id) {
    var G = App.G;
    var body = $('#modal-body');
    body.innerHTML = '<h3>Sticky fingers…</h3><p>Take which trinket?</p>' +
      G.trinkets.E.map(function (tid) {
        var c = Cards.DB[tid];
        return '<button class="modal-choice" data-t="' + tid + '">' + c.icon + ' ' + c.name + '<small>' + c.text + '</small></button>';
      }).join('') + '<button class="modal-choice cancel">never mind</button>';
    $('#modal').classList.add('open');
    body.querySelectorAll('.modal-choice').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $('#modal').classList.remove('open');
        if (btn.classList.contains('cancel')) return;
        commitCard(k, id, { trinketId: btn.getAttribute('data-t') });
      });
    });
  }

  function openHelp() {
    var body = $('#modal-body');
    body.innerHTML =
      '<h3>How to play</h3>' +
      '<p><b>Each turn:</b> draw 1, play up to 1 card (MARGIN cards are always free), then place your marks by tapping the page.</p>' +
      '<p><b>Scoring:</b> finish a straight line of 3+ of your ✗ and it gets circled in pen: length 3 → 3 ink, 4 → 8, 5 → 15, 6 → 24. First to the target wins. Circled ink is permanent.</p>' +
      '<p><b>The rules lie:</b> RULE cards change what scores and how big your placements are — for both of you.</p>' +
      '<p><b>Doodles:</b> ★ +3 ink · ☕ ring ×2 · the SPIRAL: a scoring line through it wins instantly · smudges are dead paper.</p>' +
      '<p><b>The flipside:</b> lose the front and you replay the page\'s other side, mirrored. Circled ink bleeds into dead smudges; your loose uncircled marks become ghosts you can reclaim for bonus ink. Losing well is a strategy. Hold 👁 to peek through the paper.</p>' +
      '<button class="modal-choice cancel">back to the page</button>';
    $('#modal').classList.add('open');
    body.querySelector('.cancel').addEventListener('click', function () {
      $('#modal').classList.remove('open');
    });
  }

  // ================= events =================
  function wire() {
    $('#board').addEventListener('click', function (e) {
      var cell = e.target.closest('.cell');
      if (cell) handleCellTap(+cell.getAttribute('data-i'));
    });

    $('#hand').addEventListener('click', function (e) {
      var card = e.target.closest('.card');
      if (!card) return;
      selectCard(+card.getAttribute('data-k'));
    });

    $('#card-focus').addEventListener('click', function (e) {
      if (e.target.id === 'focus-play') {
        var k = App.ui.selectedCard;
        App.ui.selectedCard = -1;
        tryPlayCard(k);
        return;
      }
      if (e.target.id === 'focus-back' || e.target.id === 'card-focus') {
        App.ui.selectedCard = -1;
        redraw();
      }
    });

    $('#btn-cancel').addEventListener('click', function () { cancelTargeting(); });
    $('#btn-help').addEventListener('click', openHelp);
    $('#btn-new-run').addEventListener('click', startRun);
    $('#btn-again').addEventListener('click', function () { Render.showScreen('screen-title'); });
    $('#btn-flip-anyway').addEventListener('click', startFlipside);

    var peek = $('#btn-peek');
    var peekOn = function (e) { e.preventDefault(); if (App.G && App.G.side === 'front') Render.showPeek(App.G); };
    var peekOff = function () { Render.hidePeek(); };
    peek.addEventListener('pointerdown', peekOn);
    peek.addEventListener('pointerup', peekOff);
    peek.addEventListener('pointerleave', peekOff);

    $('#modal').addEventListener('click', function (e) {
      if (e.target.id === 'modal') $('#modal').classList.remove('open');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    wire();
    Render.showScreen('screen-title');
  });

})();
