/* ============================================================
   BLEEDTHROUGH — flipside.js
   Generates the flipside board from the front's final state.
   The page mirrors horizontally: (r, c) -> (r, size-1-c).

   Bleedthrough rules:
   - circled ink (anyone's)      -> SMUDGE      (heavy ink kills the paper)
   - your uncircled marks        -> your GHOSTS (+1 ink when you claim them)
   - enemy uncircled marks       -> enemy ghosts
   - Press Hard marks (uncircled)-> your real starting MARKS
   - Ink Spill area              -> your real starting MARKS (overrides all)
   - smudges                     -> persist
   - pen terrain (stars/rings/spiral) does NOT bleed; fresh doodles scatter
   - Heavy Paper rule at front's end -> nothing bleeds at all
   ============================================================ */

var Flipside = (function () {

  /* Compute what each front cell becomes on the flipside.
     Returns array (front-indexed) of:
     null | {kind:'smudge'} | {kind:'ghost', who} | {kind:'mark', who} */
  function projectCell(front, cell) {
    if (Engine.hasRule(front, 'heavyPaper')) return null;
    if (cell.spill) return { kind: 'mark', who: 'P' };
    if (cell.mark && Engine.isCircled(cell)) return { kind: 'smudge' };
    if (cell.mark && cell.pressHard && cell.mark === 'P') return { kind: 'mark', who: 'P' };
    if (cell.mark) return { kind: 'ghost', who: cell.mark };
    if (cell.smudge) return { kind: 'smudge' };
    return null;
  }

  function projection(front) {
    return front.cells.map(function (cell) { return projectCell(front, cell); });
  }

  /* Build the flipside match from the finished front match. */
  function build(front, opts) {
    opts = opts || {};
    var G = Engine.newMatch({
      size: front.size,
      side: 'flip',
      rng: front.rng,
      target: opts.target || 30,
      deck: opts.deck,
      playedActivesFront: front.playedActivesFront,
    });

    var proj = projection(front);
    for (var r = 0; r < front.size; r++) {
      for (var c = 0; c < front.size; c++) {
        var p = proj[Engine.idx(front, r, c)];
        if (!p) continue;
        var mc = Engine.cellAt(G, r, front.size - 1 - c); // mirrored
        if (p.kind === 'smudge') mc.smudge = true;
        else if (p.kind === 'ghost') mc.ghost = p.who;
        else if (p.kind === 'mark') mc.mark = p.who;
      }
    }

    // trinkets live on the desk, not the page — they persist
    G.trinkets.P = front.trinkets.P.slice();
    G.trinkets.E = front.trinkets.E.slice();

    // Flipside Pact: front's winner gets a head start
    if (front.flipsidePact && front.over) {
      G.scores[front.over.winner] += 8;
    }

    // fresh pen doodles on the new page
    Engine.scatterTerrain(G);

    Engine.shuffle(G, G.deck);
    return G;
  }

  /* Carbon Paper: actives played on front, up to 2 copies into hand. */
  function applyCarbonPaper(G) {
    if (!Engine.hasTrinket(G, 'P', 'carbonPaper')) return [];
    var actives = G.playedActivesFront.filter(function (id) {
      var card = Cards.DB[id];
      return card && (card.type === 'active' || card.type === 'margin');
    });
    var picks = actives.slice(-2);
    picks.forEach(function (id) { if (G.hand.length < 8) G.hand.push(id); });
    return picks;
  }

  return { projectCell: projectCell, projection: projection, build: build, applyCarbonPaper: applyCarbonPaper };
})();

if (typeof module !== 'undefined') module.exports = Flipside;
