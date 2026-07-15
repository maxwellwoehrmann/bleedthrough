/* ============================================================
   BLEEDTHROUGH v0.3 — engine.js
   Rectangular boards, gravity, tears, webs, shields/lamination,
   candy marks, multi-cell tokens, three win modes.
   Pure logic — no DOM. No smudges, no erasing (v0.3).
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

  var LINE_DIRS = [
    { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 },
  ];
  var ORTHO = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  var DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  var ALL8 = ORTHO.concat(DIAG);

  var TOKEN_SEQ = 0;

  /* Grid coords: r in -1..rows, c in -1..cols (margin ring). */
  function newPage(opts) {
    var G = {
      rows: opts.rows, cols: opts.cols, winLen: opts.winLen,
      gravity: !!opts.gravity,
      W: opts.cols + 2, H: opts.rows + 2,
      rng: opts.rng || makeRng(opts.seed || 1),
      turn: opts.firstTurn || 'P',
      over: null,             // {winner:'P'|'E'|'draw', line:[cells]|null}
      marginUnlocks: 0,
      electArmed: 0,          // Stolen Thunder charges armed
      rootArmed: 0,           // Beanstalk charges armed
      manualCount: 0,         // player taps (Stamp counter)
      xCount: 0,              // every X that appears for the player
      cells: [],
      fx: [],
    };
    for (var i = 0; i < G.W * G.H; i++) {
      var r = Math.floor(i / G.W) - 1, c = (i % G.W) - 1;
      G.cells.push({
        r: r, c: c,
        margin: r < 0 || c < 0 || r >= G.rows || c >= G.cols,
        mark: null,           // null | 'X' | 'O' | 'B' (blocker)
        kind: null,           // candy|horse|sword|trident|snake|mouse|sandal|spider|apple
        tokenId: 0, part: 0,
        torn: false, web: 0,
        shield: false, laminated: false, rooted: false,
        boltMark: false, appleMark: false,
        justPlaced: false,
      });
    }
    return G;
  }

  function idx(G, r, c) { return (r + 1) * G.W + (c + 1); }
  function at(G, r, c) { return G.cells[idx(G, r, c)]; }
  function inGrid(G, r, c) { return r >= -1 && c >= -1 && r <= G.rows && c <= G.cols; }
  function inner(G, r, c) { return r >= 0 && c >= 0 && r < G.rows && c < G.cols; }
  function innerCells(G) { return G.cells.filter(function (cl) { return !cl.margin; }); }

  function ownMark(cell, who) {
    return who === 'P' ? cell.mark === 'X' : cell.mark === 'O';
  }

  function canPlace(G, who, cell) {
    if (!cell || cell.mark || cell.torn) return false;
    if (cell.margin) return who === 'P' && G.marginUnlocks > 0;
    if (who === 'P' && cell.web > 0) return false;
    return true;
  }

  /* Gravity landing square: the piece falls from the top of the
     column and stops at the first obstruction (mark or torn shelf). */
  function landing(G, who, c) {
    var last = null;
    for (var r = 0; r < G.rows; r++) {
      var cell = at(G, r, c);
      if (cell.torn || cell.mark) break;
      last = cell;
    }
    return last && canPlace(G, who, last) ? last : null;
  }

  /* Where a tap actually places, given gravity. */
  function target(G, who, cell) {
    if (!G.gravity || cell.margin) return canPlace(G, who, cell) ? cell : null;
    return landing(G, who, cell.c);
  }

  function place(G, who, cell, opts) {
    opts = opts || {};
    if (!cell || cell.mark || cell.torn) return null;
    cell.mark = who === 'P' ? 'X' : 'O';
    cell.kind = opts.kind || null;
    cell.rooted = !!opts.rooted;
    cell.shield = !!opts.shield;
    cell.laminated = !!opts.laminated;
    cell.justPlaced = true;
    if (cell.margin && who === 'P') G.marginUnlocks--;
    return cell;
  }

  /* Multi-cell enemy tokens. shape: [[dr,dc],...] from anchor.
     mark 'O' counts for the enemy; 'B' (sword) counts for nobody. */
  var TOKENS = {
    horse:   { shape: [[0, 0], [1, 0]], mark: 'O' },
    sword:   { shape: [[0, 0], [0, 1], [0, 2]], mark: 'B' },
    trident: { shape: [[0, 0], [1, 0], [2, 0]], mark: 'O' },
    snake:   { shape: [[0, 0], [0, 1], [0, 2]], mark: 'O' },
  };

  function canPlaceToken(G, kind, r, c) {
    var t = TOKENS[kind];
    for (var k = 0; k < t.shape.length; k++) {
      var rr = r + t.shape[k][0], cc = c + t.shape[k][1];
      if (!inner(G, rr, cc)) return false;
      var cell = at(G, rr, cc);
      if (cell.mark || cell.torn) return false;
    }
    return true;
  }

  function placeToken(G, kind, r, c) {
    if (!canPlaceToken(G, kind, r, c)) return false;
    var t = TOKENS[kind], id = ++TOKEN_SEQ;
    t.shape.forEach(function (d, k) {
      var cell = at(G, r + d[0], c + d[1]);
      cell.mark = t.mark; cell.kind = kind;
      cell.tokenId = id; cell.part = k;
      cell.justPlaced = true;
    });
    return true;
  }

  /* Destroy a mark. Respects candy/lamination/shield unless force.
     Returns 'immune' | 'shielded' | 'destroyed' | null. */
  function destroy(G, cell, force) {
    if (!cell || !cell.mark) return null;
    if (!force) {
      if (cell.laminated || cell.kind === 'candy') return 'immune';
      if (cell.shield) { cell.shield = false; return 'shielded'; }
    }
    cell.mark = null; cell.kind = null; cell.tokenId = 0; cell.part = 0;
    cell.rooted = false; cell.shield = false; cell.laminated = false;
    return 'destroyed';
  }

  function tear(G, cell) {
    if (!cell || cell.margin) return false;
    destroy(G, cell, true);
    cell.torn = true; cell.web = 0;
    return true;
  }

  function tearColumn(G, c) {
    var hit = 0;
    for (var r = 0; r < G.rows; r++) { if (tear(G, at(G, r, c))) hit++; }
    return hit;
  }

  /* Gravity: compact every column downward; torn squares are shelves.
     Piece payloads travel with the mark. Returns count moved. */
  function settle(G) {
    if (!G.gravity) return 0;
    var moved = 0;
    var FIELDS = ['mark', 'kind', 'tokenId', 'part', 'shield', 'laminated', 'rooted'];
    for (var c = 0; c < G.cols; c++) {
      var segStart = 0;
      for (var r = 0; r <= G.rows; r++) {
        var atEnd = r === G.rows;
        if (atEnd || at(G, r, c).torn) {
          // compact segment [segStart, r)
          var stack = [];
          for (var rr = segStart; rr < r; rr++) {
            var cl = at(G, rr, c);
            if (cl.mark) {
              var payload = {};
              FIELDS.forEach(function (f) { payload[f] = cl[f]; });
              stack.push(payload);
              FIELDS.forEach(function (f) { cl[f] = f === 'mark' || f === 'kind' ? null : 0; });
              cl.shield = false; cl.laminated = false; cl.rooted = false;
            }
          }
          for (var k = 0; k < stack.length; k++) {
            var dest = at(G, r - stack.length + k, c);
            var was = dest.justPlaced;
            FIELDS.forEach(function (f) { dest[f] = stack[k][f]; });
            if (r - stack.length + k !== segStart + k) moved++;
            dest.justPlaced = was || dest.justPlaced;
          }
          segStart = r + 1;
        }
      }
    }
    return moved;
  }

  // ---------------- win detection ----------------
  function findWinNormal(G, who) {
    for (var r = -1; r <= G.rows; r++) for (var c = -1; c <= G.cols; c++) {
      for (var d = 0; d < LINE_DIRS.length; d++) {
        var dr = LINE_DIRS[d].dr, dc = LINE_DIRS[d].dc;
        if (!inGrid(G, r + dr * (G.winLen - 1), c + dc * (G.winLen - 1))) continue;
        var cellsArr = [], ok = true;
        for (var k = 0; k < G.winLen; k++) {
          var cell = at(G, r + dr * k, c + dc * k);
          if (!ownMark(cell, who)) { ok = false; break; }
          cellsArr.push(cell);
        }
        if (ok) return cellsArr;
      }
    }
    return null;
  }

  /* Skipping Stone: span of winLen where ends are yours and gaps sit
     between your marks. X_X_X wins on 5. Grade options:
     overTorn (B): gaps may be torn squares; wideGaps (A): gaps may be
     two squares wide; overEnemy (A+): gaps may sit on enemy marks. */
  function findWinSkipping(G, who, opts) {
    opts = opts || {};
    var maxGapRun = opts.wideGaps ? 2 : 1;
    for (var r = -1; r <= G.rows; r++) for (var c = -1; c <= G.cols; c++) {
      for (var d = 0; d < LINE_DIRS.length; d++) {
        var dr = LINE_DIRS[d].dr, dc = LINE_DIRS[d].dc;
        if (!inGrid(G, r + dr * (G.winLen - 1), c + dc * (G.winLen - 1))) continue;
        var cellsArr = [], ok = true, gapRun = 0, marks = 0;
        for (var k = 0; k < G.winLen; k++) {
          var cell = at(G, r + dr * k, c + dc * k);
          if (ownMark(cell, who)) { marks++; gapRun = 0; cellsArr.push(cell); }
          else if (k > 0 && k < G.winLen - 1 && gapRun < maxGapRun && gapQualifies(cell, who, opts)) {
            gapRun++;
          } else { ok = false; break; }
        }
        if (ok && marks >= 2) return cellsArr;
      }
    }
    return null;
  }

  function gapQualifies(cell, who, opts) {
    if (cell.torn) return !!opts.overTorn;
    if (!cell.mark) return true;
    if (opts.overEnemy && !ownMark(cell, who)) return true;
    return false;
  }

  /* Connect-the-Dots: any connected blob of winLen+. Grade options:
     diag (B): diagonal touches connect; reduce (A/A+): blob may be
     1-2 X's smaller (never below 3). */
  function findWinConnect(G, who, opts) {
    opts = opts || {};
    var dirs = opts.diag ? ORTHO.concat(DIAG) : ORTHO;
    var need = Math.max(3, G.winLen - (opts.reduce || 0));
    var seen = {};
    var all = G.cells.filter(function (cl) { return ownMark(cl, who); });
    for (var i = 0; i < all.length; i++) {
      var start = all[i], key = start.r + ',' + start.c;
      if (seen[key]) continue;
      var comp = [], queue = [start];
      seen[key] = true;
      while (queue.length) {
        var cl = queue.pop();
        comp.push(cl);
        dirs.forEach(function (d) {
          var rr = cl.r + d[0], cc = cl.c + d[1];
          if (!inGrid(G, rr, cc)) return;
          var n = at(G, rr, cc);
          var nk = rr + ',' + cc;
          if (!seen[nk] && ownMark(n, who)) { seen[nk] = true; queue.push(n); }
        });
      }
      if (comp.length >= need) {
        comp.sort(function (a, b) { return (a.r - b.r) || (a.c - b.c); });
        return comp;
      }
    }
    return null;
  }

  /* Chain Reaction: does this just-placed cell join >=2 previously
     separate own chains of size >= minSize? */
  function connectsChains(G, cell, who, minSize) {
    var mark = cell.mark;
    cell.mark = null;                      // examine the world without it
    var seen = {}, comps = [];
    ORTHO.forEach(function (d) {
      var rr = cell.r + d[0], cc = cell.c + d[1];
      if (!inGrid(G, rr, cc)) return;
      var n = at(G, rr, cc);
      if (!ownMark(n, who) || seen[rr + ',' + cc]) return;
      var comp = [], queue = [n];
      seen[rr + ',' + cc] = true;
      while (queue.length) {
        var cl = queue.pop();
        comp.push(cl);
        ORTHO.forEach(function (d2) {
          var r2 = cl.r + d2[0], c2 = cl.c + d2[1];
          if (!inGrid(G, r2, c2)) return;
          var n2 = at(G, r2, c2), k2 = r2 + ',' + c2;
          if (!seen[k2] && ownMark(n2, who)) { seen[k2] = true; queue.push(n2); }
        });
      }
      comps.push(comp);
    });
    cell.mark = mark;
    return comps.filter(function (cp) { return cp.length >= minSize; }).length >= 2;
  }

  /* Fountain Pen: pairs of own marks exactly `dist` apart (8 dirs) with
     ALL squares between clean and empty -> fill them. Grades extend the
     reach (C: dist 2, B: 3, A: 4, A+: 5). Loops until stable (capped). */
  function penFills(G, who, reach) {
    reach = reach || 2;
    var filled = [], guard = 0;
    var changed = true;
    while (changed && guard++ < 20) {
      changed = false;
      for (var r = -1; r <= G.rows; r++) for (var c = -1; c <= G.cols; c++) {
        var a = at(G, r, c);
        if (!ownMark(a, who)) continue;
        for (var d = 0; d < ALL8.length; d++) {
          for (var dist = 2; dist <= reach; dist++) {
            var r2 = r + ALL8[d][0] * dist, c2 = c + ALL8[d][1] * dist;
            if (!inGrid(G, r2, c2)) break;
            var b = at(G, r2, c2);
            if (!ownMark(b, who)) continue;
            var mids = [], clean = true;
            for (var m = 1; m < dist; m++) {
              var mid = at(G, r + ALL8[d][0] * m, c + ALL8[d][1] * m);
              if (mid.margin || mid.mark || mid.torn || mid.web > 0) { clean = false; break; }
              mids.push(mid);
            }
            if (!clean) continue;
            mids.forEach(function (mid) {
              place(G, who, mid);
              filled.push(mid);
            });
            changed = true;
          }
        }
      }
    }
    return filled;
  }

  /* Stolen Thunder: sprout X's on the 4 diagonals of a cell. */
  function electrify(G, cell, who) {
    var made = [];
    DIAG.forEach(function (d) {
      var rr = cell.r + d[0], cc = cell.c + d[1];
      if (!inner(G, rr, cc)) return;
      var n = at(G, rr, cc);
      if (n.mark || n.torn) return;
      place(G, who, n);
      made.push(n);
    });
    return made;
  }

  /* Beanstalk: each rooted X sprouts into one random free neighbour. */
  function sproutRooted(G, who) {
    var made = [];
    var rooted = G.cells.filter(function (cl) { return cl.rooted && ownMark(cl, who); });
    rooted.forEach(function (cl) {
      var opts = [];
      ALL8.forEach(function (d) {
        var rr = cl.r + d[0], cc = cl.c + d[1];
        if (!inner(G, rr, cc)) return;
        var n = at(G, rr, cc);
        if (!n.mark && !n.torn) opts.push(n);
      });
      if (opts.length) {
        var pick = opts[Math.floor(G.rng() * opts.length)];
        place(G, who, pick);
        made.push(pick);
      }
    });
    return made;
  }

  function movesAvailable(G, who) {
    if (G.gravity) {
      for (var c = 0; c < G.cols; c++) if (landing(G, who, c)) return true;
      return false;
    }
    return innerCells(G).some(function (cl) {
      return !cl.mark && !cl.torn && !(who === 'P' && cl.web > 0);
    });
  }

  function boardFull(G) {
    return !innerCells(G).some(function (cl) { return !cl.mark && !cl.torn; });
  }

  function tickAfter(G, who) {
    if (who === 'P') G.cells.forEach(function (cl) { if (cl.web > 0) cl.web--; });
  }

  function clearJustPlaced(G) {
    G.cells.forEach(function (cl) { cl.justPlaced = false; });
  }

  return {
    makeRng: makeRng, LINE_DIRS: LINE_DIRS, ORTHO: ORTHO, DIAG: DIAG, ALL8: ALL8,
    TOKENS: TOKENS,
    newPage: newPage, idx: idx, at: at, inGrid: inGrid, inner: inner, innerCells: innerCells,
    ownMark: ownMark, canPlace: canPlace, landing: landing, target: target,
    place: place, canPlaceToken: canPlaceToken, placeToken: placeToken,
    destroy: destroy, tear: tear, tearColumn: tearColumn, settle: settle,
    findWinNormal: findWinNormal, findWinSkipping: findWinSkipping, findWinConnect: findWinConnect,
    connectsChains: connectsChains, penFills: penFills, electrify: electrify, sproutRooted: sproutRooted,
    movesAvailable: movesAvailable, boardFull: boardFull,
    tickAfter: tickAfter, clearJustPlaced: clearJustPlaced,
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
