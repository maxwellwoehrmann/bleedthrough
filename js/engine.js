/* ============================================================
   BLEEDTHROUGH v0.2 — engine.js
   One page of class-period tic-tac-toe. Pure logic, no DOM.
   Board is N×N inner cells (win = N in a row) wrapped in a
   1-cell margin ring (playable only via the Margin Note sticky).
   ============================================================ */

var Engine = (function () {

  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var DIRS = [
    { dr: 0, dc: 1 },   // H
    { dr: 1, dc: 0 },   // V
    { dr: 1, dc: 1 },   // diag down-right
    { dr: 1, dc: -1 },  // diag down-left
  ];

  var HORSE_SEQ = 0;

  /* Grid coords run -1..size (margin ring included). */
  function newPage(opts) {
    var size = opts.size, W = size + 2;
    var G = {
      size: size, W: W, winLen: size,
      rng: opts.rng || makeRng(opts.seed || 1),
      cells: [],
      turn: opts.firstTurn || 'P',
      round: 1,
      over: null,              // {winner:'P'|'E'|'draw', line:[cells]|null}
      lastPlayerX: null,       // for pen bleedthrough
      marginUnlocks: 0,        // Margin Note sticky charges
      extraPlaces: 0,          // Two-fer
      skipEnemyTurns: 0,       // Time Out
      shieldNext: false,       // Anchor
      peek: false,             // Corner Peek (reveal enemy intent)
      fx: [],
    };
    for (var i = 0; i < W * W; i++) {
      var r = Math.floor(i / W) - 1, c = (i % W) - 1;
      G.cells.push({
        r: r, c: c,
        margin: r < 0 || c < 0 || r >= size || c >= size,
        mark: null,            // null | 'X' | 'O'
        elem: null,            // null | 'fire' | 'ice' | 'bolt'
        horse: 0, horsePart: null,
        smudge: 0,             // rounds this cell is dead paper
        frozen: 0,             // player-only lockout turns
        shield: false,
        boltMark: false,       // Zeus is aiming here
        bled: false,           // arrived via pen bleedthrough
        justPlaced: false,
      });
    }
    return G;
  }

  function idx(G, r, c) { return (r + 1) * G.W + (c + 1); }
  function at(G, r, c) { return G.cells[idx(G, r, c)]; }
  function inGrid(G, r, c) { return r >= -1 && c >= -1 && r <= G.size && c <= G.size; }
  function inner(G, r, c) { return r >= 0 && c >= 0 && r < G.size && c < G.size; }

  function canPlace(G, who, cell) {
    if (!cell || cell.mark || cell.smudge > 0) return false;
    if (cell.margin) return who === 'P' && G.marginUnlocks > 0;
    if (who === 'P' && cell.frozen > 0) return false;
    return true;
  }

  function place(G, who, r, c, opts) {
    opts = opts || {};
    var cell = at(G, r, c);
    if (!canPlace(G, who, cell)) return null;
    cell.mark = who === 'P' ? 'X' : 'O';
    cell.elem = opts.elem || null;
    cell.bled = !!opts.bled;
    cell.justPlaced = true;
    if (cell.margin) G.marginUnlocks--;
    if (who === 'P') {
      G.lastPlayerX = { r: r, c: c };
      if (G.shieldNext) { cell.shield = true; G.shieldNext = false; }
    }
    return cell;
  }

  /* Lightning O may land on a smudge, scorching it clean first. */
  function placeBoltO(G, r, c) {
    var cell = at(G, r, c);
    if (!cell || cell.mark || cell.margin) return null;
    cell.smudge = 0;
    return place(G, 'E', r, c, { elem: 'bolt' });
  }

  /* Erase an enemy O. smudgeTurns > 0 leaves dead paper behind.
     Erasing either half of a horse shoos the whole horse. */
  function eraseO(G, r, c, smudgeTurns) {
    var cell = at(G, r, c);
    if (!cell || cell.mark !== 'O') return false;
    if (cell.horse) {
      var hid = cell.horse;
      G.cells.forEach(function (cl) {
        if (cl.horse === hid) { cl.mark = null; cl.elem = null; cl.horse = 0; cl.horsePart = null; }
      });
    } else {
      cell.mark = null; cell.elem = null;
    }
    if (smudgeTurns) cell.smudge = smudgeTurns;
    return true;
  }

  /* Enemy powers burning/zapping a player X. Shield eats one hit. */
  function smudgeX(G, r, c, smudgeTurns) {
    var cell = at(G, r, c);
    if (!cell || cell.mark !== 'X') return false;
    if (cell.shield) { cell.shield = false; return false; }
    cell.mark = null;
    cell.smudge = smudgeTurns || 2;
    return true;
  }

  /* Napoleon's Tall Horse: an O occupying (r,c) and (r+1,c). */
  function placeHorse(G, r, c) {
    if (!inner(G, r, c) || !inner(G, r + 1, c)) return false;
    var a = at(G, r, c), b = at(G, r + 1, c);
    if (!canPlace(G, 'E', a) || !canPlace(G, 'E', b)) return false;
    var id = ++HORSE_SEQ;
    a.mark = 'O'; a.horse = id; a.horsePart = 'head'; a.justPlaced = true;
    b.mark = 'O'; b.horse = id; b.horsePart = 'legs'; b.justPlaced = true;
    return true;
  }

  /* Win check: winLen consecutive marks in any direction, margin
     ring included. With gapOK (Double-Spaced trinket, player only)
     the line may skip ONE empty interior square. */
  function findWin(G, who, gapOK) {
    var mark = who === 'P' ? 'X' : 'O';
    for (var r = -1; r <= G.size; r++) for (var c = -1; c <= G.size; c++) {
      for (var d = 0; d < DIRS.length; d++) {
        var dr = DIRS[d].dr, dc = DIRS[d].dc;
        if (!inGrid(G, r + dr * (G.winLen - 1), c + dc * (G.winLen - 1))) continue;
        var marks = 0, gaps = 0, cellsArr = [], ok = true;
        for (var k = 0; k < G.winLen; k++) {
          var cell = at(G, r + dr * k, c + dc * k);
          cellsArr.push(cell);
          if (cell.mark === mark) marks++;
          else if (gapOK && !cell.mark && cell.smudge === 0 && k > 0 && k < G.winLen - 1 && gaps === 0) gaps++;
          else { ok = false; break; }
        }
        if (!ok) continue;
        if (marks === G.winLen || (gapOK && marks === G.winLen - 1 && gaps === 1)) {
          return cellsArr;
        }
      }
    }
    return null;
  }

  function movesAvailable(G, who) {
    return G.cells.some(function (cl) { return canPlace(G, who, cl); });
  }

  /* Timers. Frozen cells thaw after the player's turn ends;
     smudges fade at the end of each full round (enemy turn end). */
  function tickAfter(G, who) {
    if (who === 'P') {
      G.cells.forEach(function (cl) { if (cl.frozen > 0) cl.frozen--; });
    } else {
      G.cells.forEach(function (cl) { if (cl.smudge > 0) cl.smudge--; });
      G.round++;
    }
  }

  function clearJustPlaced(G) {
    G.cells.forEach(function (cl) { cl.justPlaced = false; });
  }

  function innerCells(G) {
    return G.cells.filter(function (cl) { return !cl.margin; });
  }

  return {
    makeRng: makeRng, DIRS: DIRS,
    newPage: newPage, idx: idx, at: at, inGrid: inGrid, inner: inner,
    canPlace: canPlace, place: place, placeBoltO: placeBoltO,
    eraseO: eraseO, smudgeX: smudgeX, placeHorse: placeHorse,
    findWin: findWin, movesAvailable: movesAvailable,
    tickAfter: tickAfter, clearJustPlaced: clearJustPlaced, innerCells: innerCells,
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
