/* ============================================================
   BLEEDTHROUGH — engine.js
   Pure game logic: board, runs, scoring, rules, turn economy.
   No DOM access — also loaded by tests/run-tests.js in Node.
   ============================================================ */

var Engine = (function () {

  // ---------- RNG (mulberry32, seeded) ----------
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var DIRS = {
    H:  { dr: 0, dc: 1 },
    V:  { dr: 1, dc: 0 },
    D1: { dr: 1, dc: 1 },   // down-right
    D2: { dr: 1, dc: -1 },  // down-left
  };
  var DIR_KEYS = ['H', 'V', 'D1', 'D2'];

  // ---------- state ----------
  function blankCell() {
    return {
      mark: null,            // null | 'P' | 'E'
      circled: { H: false, V: false, D1: false, D2: false },
      smudge: false,
      terrain: null,         // null | 'star' | 'ring' | 'spiral'
      ghost: null,           // flipside only: null | 'P' | 'E'
      spill: false,          // front: marked by Ink Spill for bleedthrough
      pressHard: false,      // front: flagged by Press Hard
      justPlaced: false,     // render hint, cleared each turn
    };
  }

  function newMatch(opts) {
    var size = opts.size || 8;
    var G = {
      size: size,
      side: opts.side || 'front',          // 'front' | 'flip'
      rng: opts.rng || makeRng(opts.seed || 1),
      cells: [],
      scores: { P: 0, E: 0 },
      target: opts.target || 40,
      rules: [],                            // active rule card ids
      trinkets: { P: [], E: [] },
      turn: 'P',
      turnCount: 0,
      playsLeft: 1,
      placement: { P: null, E: null },      // pending shape override, null = single
      deck: opts.deck ? opts.deck.slice() : [],
      hand: [],
      discard: [],
      playedActivesFront: opts.playedActivesFront || [],
      enemyLastPlaced: [],
      doubleTake: false,
      flipsidePact: false,
      over: null,                           // null | {winner:'P'|'E', how:string}
      circles: [],                          // scored runs, for the red-pen renderer
      fx: [],                               // visual event queue for renderer
      log: [],
    };
    for (var i = 0; i < size * size; i++) G.cells.push(blankCell());
    return G;
  }

  function idx(G, r, c) { return r * G.size + c; }
  function inBounds(G, r, c) { return r >= 0 && c >= 0 && r < G.size && c < G.size; }
  function cellAt(G, r, c) { return G.cells[idx(G, r, c)]; }
  function placeable(cell) { return !cell.mark && !cell.smudge; }

  // ---------- board generation (front) ----------
  function scatterTerrain(G) {
    var wants = [
      ['star', 2 + Math.floor(G.rng() * 2)],   // 2-3
      ['ring', 1 + Math.floor(G.rng() * 2)],   // 1-2
      ['smudgeSpot', 2 + Math.floor(G.rng() * 3)], // 2-4
      ['spiral', G.rng() < 0.55 ? 1 : 0],
    ];
    wants.forEach(function (w) {
      var kind = w[0], n = w[1];
      var guard = 0;
      while (n > 0 && guard++ < 200) {
        var r = Math.floor(G.rng() * G.size), c = Math.floor(G.rng() * G.size);
        var cell = cellAt(G, r, c);
        if (cell.terrain || cell.smudge || cell.mark) continue;
        if (kind === 'smudgeSpot') cell.smudge = true;
        else cell.terrain = kind;
        n--;
      }
    });
  }

  // ---------- rules ----------
  function hasRule(G, id) { return G.rules.indexOf(id) !== -1; }
  function hasTrinket(G, who, id) { return G.trinkets[who].indexOf(id) !== -1; }

  function addRule(G, id) {
    // draw/play-economy rules of the same knob replace each other
    var knobs = { overdraw: 'draw', frenzy: 'play' };
    if (knobs[id]) {
      G.rules = G.rules.filter(function (r) { return knobs[r] !== knobs[id]; });
    }
    // direct contradictions replace each other
    var contra = { orthodox: 'diagonalPride', diagonalPride: 'orthodox',
                   shortCircuit: 'grandLines', grandLines: 'shortCircuit' };
    if (contra[id]) G.rules = G.rules.filter(function (r) { return r !== contra[id]; });
    if (!hasRule(G, id)) G.rules.push(id);
  }

  function drawCount(G) { return hasRule(G, 'overdraw') ? 2 : 1; }
  function playLimit(G) { return hasRule(G, 'frenzy') ? 2 : 1; }

  function effectiveLen(G, len) {
    if (hasRule(G, 'doubleDown')) len *= 2;
    return Math.min(len, G.size);
  }

  // ---------- qualification & scoring ----------
  function lineQualifies(G, len, dir) {
    if (len < 3) return false;
    if (hasRule(G, 'shortCircuit') && len > 4) return false;
    if (hasRule(G, 'oddInk') && len % 2 === 0) return false;
    if (hasRule(G, 'grandLines') && len < 5) return false;
    if (hasRule(G, 'orthodox') && (dir === 'D1' || dir === 'D2')) return false;
    return true;
  }

  function baseScore(len) { return len * (len - 2); } // 3→3 4→8 5→15 6→24 7→35 8→48

  function scoreRun(G, who, run) {
    var ink = baseScore(run.len);
    if (hasRule(G, 'grandLines')) ink *= 3;
    var hasRing = false, stars = 0;
    run.cellIdxs.forEach(function (i) {
      var t = G.cells[i].terrain;
      if (t === 'ring') hasRing = true;
      if (t === 'star') stars++;
    });
    if (hasRing) ink *= 2;
    if (hasRule(G, 'diagonalPride') && (run.dir === 'D1' || run.dir === 'D2')) ink *= 2;
    ink += stars * 3;
    if (who === 'P' && hasTrinket(G, 'P', 'luckyCoin')) ink += 2;
    if (who === 'P' && hasTrinket(G, 'P', 'compass') && (run.dir === 'D1' || run.dir === 'D2')) ink += 4;
    if (who === 'E' && hasTrinket(G, 'E', 'blueBlood')) ink += 2;
    if (hasRule(G, 'inkTax')) ink = Math.max(1, ink - 3);
    return ink;
  }

  // maximal run through (r,c) in direction dir for `who`
  function maximalRun(G, who, r, c, dir) {
    var d = DIRS[dir];
    var r0 = r, c0 = c;
    while (inBounds(G, r0 - d.dr, c0 - d.dc) && cellAt(G, r0 - d.dr, c0 - d.dc).mark === who) {
      r0 -= d.dr; c0 -= d.dc;
    }
    var cellIdxs = [], rr = r0, cc = c0;
    while (inBounds(G, rr, cc) && cellAt(G, rr, cc).mark === who) {
      cellIdxs.push(idx(G, rr, cc));
      rr += d.dr; cc += d.dc;
    }
    return { dir: dir, len: cellIdxs.length, cellIdxs: cellIdxs, r0: r0, c0: c0 };
  }

  /* After `who` placed marks at cellIdxs, find every maximal run that
     (a) passes through a newly placed cell, (b) qualifies, and
     (c) contains at least one cell not yet circled in that direction.
     Returns { scored:[{run, ink}], ko:null|{...} } and mutates scores/circles. */
  function resolvePlacement(G, who, placedIdxs) {
    var seen = {};
    var scored = [];
    var ko = null;

    placedIdxs.forEach(function (i) {
      var r = Math.floor(i / G.size), c = i % G.size;
      DIR_KEYS.forEach(function (dir) {
        var run = maximalRun(G, who, r, c, dir);
        if (run.len < 2) return;
        var key = dir + ':' + run.r0 + ',' + run.c0;
        if (seen[key]) return;
        seen[key] = true;

        // knockout checks (spiral needs qualification; sudden death does not)
        var throughSpiral = run.cellIdxs.some(function (j) { return G.cells[j].terrain === 'spiral'; });
        if (throughSpiral && lineQualifies(G, run.len, dir) && !ko) {
          ko = { winner: who, how: 'spiral', run: run };
        }
        if (hasRule(G, 'suddenDeath') && run.len >= 6 && !ko) {
          ko = { winner: who, how: 'suddenDeath', run: run };
        }

        if (!lineQualifies(G, run.len, dir)) return;
        var hasNewCell = run.cellIdxs.some(function (j) { return !G.cells[j].circled[dir]; });
        if (!hasNewCell) return;

        var ink = scoreRun(G, who, run);
        run.cellIdxs.forEach(function (j) { G.cells[j].circled[dir] = true; });
        G.scores[who] += ink;
        scored.push({ run: run, ink: ink });
        G.circles.push({ who: who, run: run });
        G.fx.push({ t: 'circle', who: who, run: run, ink: ink });
      });
    });

    if (ko) {
      if (ko.winner === 'E' && hasTrinket(G, 'P', 'safetyScissors')) {
        G.trinkets.P = G.trinkets.P.filter(function (t) { return t !== 'safetyScissors'; });
        G.fx.push({ t: 'toast', msg: 'Safety Scissors! The knockout fizzles.' });
        ko = null;
      } else {
        G.over = { winner: ko.winner, how: ko.how };
        G.fx.push({ t: 'ko', ko: ko });
      }
    }
    if (!G.over && G.scores[who] >= G.target) {
      G.over = { winner: who, how: 'target' };
    }
    return { scored: scored, ko: ko };
  }

  // ---------- placing marks ----------
  /* Places marks for `who` on given cell idxs. Handles ghost bonus,
     Press Hard flag, Japanese Eraser trigger, then resolves scoring. */
  function placeMarks(G, who, cellIdxs, opts) {
    opts = opts || {};
    var ghostInk = 0;
    G.cells.forEach(function (cl) { cl.justPlaced = false; });

    cellIdxs.forEach(function (i) {
      var cell = G.cells[i];
      cell.mark = who;
      cell.justPlaced = true;
      if (opts.pressHard) cell.pressHard = true;
      if (cell.ghost === who) { ghostInk += 1; }
      if (cell.ghost) cell.ghost = null;
    });
    if (ghostInk > 0) {
      G.scores[who] += ghostInk;
      G.fx.push({ t: 'toast', msg: (who === 'P' ? 'You soak' : 'Enemy soaks') + ' up ' + ghostInk + ' ghost ink (+' + ghostInk + ')' });
    }

    // Japanese Eraser: clean-erase enemy uncircled marks diagonally adjacent
    if (hasTrinket(G, who, 'japaneseEraser')) {
      var foe = who === 'P' ? 'E' : 'P';
      var erased = [];
      cellIdxs.forEach(function (i) {
        var r = Math.floor(i / G.size), c = i % G.size;
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (d) {
          var rr = r + d[0], cc = c + d[1];
          if (!inBounds(G, rr, cc)) return;
          var n = cellAt(G, rr, cc);
          if (n.mark === foe && !isCircled(n)) {
            n.mark = null; n.pressHard = false;
            erased.push(idx(G, rr, cc));
          }
        });
      });
      if (erased.length) G.fx.push({ t: 'erase', cells: erased, clean: true, msg: 'Japanese Eraser!' });
    }

    if (who === 'E') G.enemyLastPlaced = cellIdxs.slice();
    return resolvePlacement(G, who, cellIdxs);
  }

  function isCircled(cell) {
    return cell.circled.H || cell.circled.V || cell.circled.D1 || cell.circled.D2;
  }

  // ---------- placement shape helpers ----------
  /* Shape: {kind:'line', len} | {kind:'block', w,h} | {kind:'free', n} */
  function currentShape(G, who) {
    var s = G.placement[who] || { kind: 'line', len: 1 };
    if (s.kind === 'line') return { kind: 'line', len: effectiveLen(G, s.len) };
    if (s.kind === 'free') return { kind: 'free', n: effectiveLen(G, s.n) };
    return s;
  }

  function lineCells(G, r, c, dir, len) {
    var d = DIRS[dir] || dir; // accepts key or {dr,dc}
    var out = [];
    for (var k = 0; k < len; k++) {
      var rr = r + d.dr * k, cc = c + d.dc * k;
      if (!inBounds(G, rr, cc) || !placeable(cellAt(G, rr, cc))) return null;
      out.push(idx(G, rr, cc));
    }
    return out;
  }

  var ALL_DIRS8 = [
    { dr: 0, dc: 1 }, { dr: 0, dc: -1 }, { dr: 1, dc: 0 }, { dr: -1, dc: 0 },
    { dr: 1, dc: 1 }, { dr: 1, dc: -1 }, { dr: -1, dc: 1 }, { dr: -1, dc: -1 },
  ];

  function anyLineFits(G, len) {
    if (len === 1) return G.cells.some(placeable);
    for (var r = 0; r < G.size; r++) for (var c = 0; c < G.size; c++) {
      for (var d = 0; d < ALL_DIRS8.length; d++) {
        if (lineCells(G, r, c, ALL_DIRS8[d], len)) return true;
      }
    }
    return false;
  }

  function blockCells(G, r, c, w, h) {
    var out = [];
    for (var dr = 0; dr < h; dr++) for (var dc = 0; dc < w; dc++) {
      var rr = r + dr, cc = c + dc;
      if (!inBounds(G, rr, cc) || !placeable(cellAt(G, rr, cc))) return null;
      out.push(idx(G, rr, cc));
    }
    return out;
  }

  /* Downgrade a shape until something fits. Returns fitted shape or null (board jammed). */
  function fitShape(G, shape) {
    if (shape.kind === 'block') {
      for (var r = 0; r < G.size; r++) for (var c = 0; c < G.size; c++) {
        if (blockCells(G, r, c, shape.w, shape.h)) return shape;
      }
      shape = { kind: 'line', len: 2 };
    }
    if (shape.kind === 'free') {
      var empties = G.cells.filter(placeable).length;
      if (empties === 0) return null;
      return { kind: 'free', n: Math.min(shape.n, empties) };
    }
    var len = shape.len;
    while (len >= 1) {
      if (anyLineFits(G, len)) return { kind: 'line', len: len };
      len--;
    }
    return null;
  }

  // ---------- board-jam end ----------
  function checkJam(G) {
    if (G.over) return;
    if (!G.cells.some(placeable)) {
      var w;
      if (G.scores.P !== G.scores.E) w = G.scores.P > G.scores.E ? 'P' : 'E';
      else {
        var cp = 0, ce = 0;
        G.cells.forEach(function (cl) {
          if (isCircled(cl)) { if (cl.mark === 'P') cp++; else if (cl.mark === 'E') ce++; }
        });
        w = cp >= ce ? 'P' : 'E';
      }
      G.over = { winner: w, how: 'jam' };
    }
  }

  // ---------- hand / deck ----------
  function shuffle(G, arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(G.rng() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function draw(G, n) {
    var drawn = [];
    for (var i = 0; i < n; i++) {
      if (G.hand.length >= 8) break;
      if (G.deck.length === 0) {
        if (G.discard.length === 0) break;
        G.deck = shuffle(G, G.discard.splice(0));
      }
      var id = G.deck.pop();
      G.hand.push(id);
      drawn.push(id);
    }
    return drawn;
  }

  function startPlayerTurn(G) {
    G.turn = 'P';
    G.turnCount++;
    G.playsLeft = playLimit(G);
    G.doubleTake = false;
    return draw(G, drawCount(G));
  }

  // ---------- erasing ----------
  function cleanErase(G, i) {
    var cell = G.cells[i];
    if (cell.mark && !isCircled(cell)) { cell.mark = null; cell.pressHard = false; return true; }
    if (cell.smudge) { cell.smudge = false; return true; }
    return false;
  }
  function smudgeErase(G, i) {
    var cell = G.cells[i];
    if (cell.mark && !isCircled(cell)) {
      cell.mark = null; cell.pressHard = false; cell.smudge = true; return true;
    }
    return false;
  }

  return {
    makeRng: makeRng, DIRS: DIRS, DIR_KEYS: DIR_KEYS, ALL_DIRS8: ALL_DIRS8,
    newMatch: newMatch, scatterTerrain: scatterTerrain,
    idx: idx, inBounds: inBounds, cellAt: cellAt, placeable: placeable, isCircled: isCircled,
    hasRule: hasRule, hasTrinket: hasTrinket, addRule: addRule,
    drawCount: drawCount, playLimit: playLimit, effectiveLen: effectiveLen,
    lineQualifies: lineQualifies, baseScore: baseScore, scoreRun: scoreRun,
    maximalRun: maximalRun, resolvePlacement: resolvePlacement, placeMarks: placeMarks,
    currentShape: currentShape, lineCells: lineCells, blockCells: blockCells,
    anyLineFits: anyLineFits, fitShape: fitShape, checkJam: checkJam,
    shuffle: shuffle, draw: draw, startPlayerTurn: startPlayerTurn,
    cleanErase: cleanErase, smudgeErase: smudgeErase,
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
