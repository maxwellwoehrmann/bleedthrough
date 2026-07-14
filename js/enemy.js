/* ============================================================
   BLEEDTHROUGH — enemy.js
   The Inkfiend: scripted card queue with telegraphed intents,
   one SURPRISE opener, and a placement heuristic.
   No DOM access.
   ============================================================ */

var Enemy = (function () {

  /* Enemy actions are lightweight — not full player cards.
     {id, name, surprise?, apply(G) -> placedShape override or null} */
  var ACTIONS = {
    ePlain:    { id: 'ePlain', name: 'Doodling', desc: 'places a mark', card: null },
    eSlash:    { id: 'eSlash', name: 'Slash', desc: 'draws a line of 3', card: 'slash' },
    eLong:     { id: 'eLong', name: 'Long Stroke', desc: 'draws a line of 4', card: 'longStroke' },
    eEraser:   { id: 'eEraser', name: 'Eraser', desc: 'smudges out one of your marks', card: 'eraser' },
    eScribble: { id: 'eScribble', name: 'Scribble', desc: 'smudges an empty cell you want', card: 'scribble' },
    eInkTax:   { id: 'eInkTax', name: 'Ink Tax', desc: 'plays a rule: all lines −3 ink', card: 'inkTax' },
    eOrthodox: { id: 'eOrthodox', name: 'Orthodox', desc: 'plays a rule: diagonals don\'t score', card: 'orthodox' },
    eBlueBlood:{ id: 'eBlueBlood', name: 'Blue Blood', desc: 'sets out a trinket: its lines +2', card: 'blueBlood' },
    eInksplosion: { id: 'eInksplosion', name: 'INKSPLOSION', desc: '?!', surprise: true, card: null },
  };

  function makeInkfiend(side) {
    var script = side === 'front'
      ? ['eBlueBlood', 'eInksplosion', 'eSlash', 'eEraser', 'eScribble', 'eLong', 'eInkTax', 'eSlash', 'eEraser', 'eScribble']
      : ['eEraser', 'eSlash', 'eScribble', 'eOrthodox', 'eEraser', 'eLong', 'eSlash', 'eScribble'];
    var loopFrom = side === 'front' ? 2 : 0;
    return {
      name: side === 'front' ? 'The Inkfiend' : 'The Inkfiend (smeared)',
      script: script,
      loopFrom: loopFrom,
      step: 0,
    };
  }

  function nextAction(foe) {
    var i = foe.step;
    if (i >= foe.script.length) {
      var loop = foe.script.slice(foe.loopFrom);
      i = foe.loopFrom + ((i - foe.loopFrom) % loop.length);
    }
    return ACTIONS[foe.script[i] ? foe.script[i] : foe.script[foe.loopFrom]] || ACTIONS.ePlain;
  }
  function peekAction(foe, ahead) {
    var i = foe.step + ahead;
    if (i >= foe.script.length) {
      var loopLen = foe.script.length - foe.loopFrom;
      i = foe.loopFrom + ((i - foe.loopFrom) % loopLen);
    }
    return ACTIONS[foe.script[i]] || ACTIONS.ePlain;
  }

  // ---------- threat analysis ----------
  /* Cells that would let P complete a qualifying run next turn, valued. */
  function playerHotCells(G) {
    var hot = {};
    for (var r = 0; r < G.size; r++) for (var c = 0; c < G.size; c++) {
      if (Engine.cellAt(G, r, c).mark !== 'P') continue;
      Engine.DIR_KEYS.forEach(function (dir) {
        var run = Engine.maximalRun(G, 'P', r, c, dir);
        if (run.len < 2) return;
        var d = Engine.DIRS[dir];
        var q = run.len + 1;
        if (!Engine.lineQualifies(G, q, dir)) return;
        var value = Engine.baseScore(q);
        [[run.r0 - d.dr, run.c0 - d.dc],
         [run.r0 + d.dr * run.len, run.c0 + d.dc * run.len]].forEach(function (p) {
          if (Engine.inBounds(G, p[0], p[1]) && Engine.placeable(Engine.cellAt(G, p[0], p[1]))) {
            var i = Engine.idx(G, p[0], p[1]);
            hot[i] = Math.max(hot[i] || 0, value);
          }
        });
      });
    }
    return hot;
  }

  // ---------- placement scoring ----------
  function evalPlacement(G, cellIdxs, hot) {
    // simulate: what runs would E form?
    var marks = {};
    cellIdxs.forEach(function (i) { marks[i] = true; });
    var gain = 0, ko = false;

    // temporarily mark
    cellIdxs.forEach(function (i) { G.cells[i].mark = 'E'; });
    var seen = {};
    cellIdxs.forEach(function (i) {
      var r = Math.floor(i / G.size), c = i % G.size;
      Engine.DIR_KEYS.forEach(function (dir) {
        var run = Engine.maximalRun(G, 'E', r, c, dir);
        var key = dir + ':' + run.r0 + ',' + run.c0;
        if (seen[key]) return;
        seen[key] = true;
        var spiral = run.cellIdxs.some(function (j) { return G.cells[j].terrain === 'spiral'; });
        if (spiral && Engine.lineQualifies(G, run.len, dir)) ko = true;
        if (Engine.hasRule(G, 'suddenDeath') && run.len >= 6) ko = true;
        if (Engine.lineQualifies(G, run.len, dir)) {
          var isNew = run.cellIdxs.some(function (j) { return !G.cells[j].circled[dir]; });
          if (isNew) gain += Engine.scoreRun(G, 'E', run);
        } else {
          gain += run.len * 0.4; // building material
        }
      });
    });
    cellIdxs.forEach(function (i) { G.cells[i].mark = null; });

    if (ko) return 99999;
    var score = gain * 10;
    cellIdxs.forEach(function (i) {
      if (hot[i]) score += hot[i] * 6;                       // deny the player
      var t = G.cells[i].terrain;
      if (t === 'star') score += 4;
      if (t === 'ring') score += 6;
      if (G.cells[i].ghost === 'E') score += 3;
      if (G.cells[i].ghost === 'P') score += 2;              // deny ghost ink
      var r = Math.floor(i / G.size), c = i % G.size;
      var mid = (G.size - 1) / 2;
      score += 1.5 - (Math.abs(r - mid) + Math.abs(c - mid)) * 0.15; // slight center bias
    });
    return score;
  }

  function bestLinePlacement(G, len) {
    var hot = playerHotCells(G);
    var best = null, bestScore = -Infinity;
    if (len === 1) {
      for (var i = 0; i < G.cells.length; i++) {
        if (!Engine.placeable(G.cells[i])) continue;
        var s = evalPlacement(G, [i], hot);
        if (s > bestScore) { bestScore = s; best = [i]; }
      }
      return best;
    }
    for (var r = 0; r < G.size; r++) for (var c = 0; c < G.size; c++) {
      for (var d = 0; d < Engine.ALL_DIRS8.length; d++) {
        var cells = Engine.lineCells(G, r, c, Engine.ALL_DIRS8[d], len);
        if (!cells) continue;
        var sc = evalPlacement(G, cells, hot);
        if (sc > bestScore) { bestScore = sc; best = cells; }
      }
    }
    return best;
  }

  // plus-shape for Inksplosion, centered near the middle, keep what fits
  function inksplosionCells(G) {
    var mid = Math.floor(G.size / 2);
    var candidates = [];
    for (var r = mid - 2; r <= mid + 1; r++) for (var c = mid - 2; c <= mid + 1; c++) {
      candidates.push([r, c]);
    }
    var best = null, bestN = -1;
    candidates.forEach(function (ctr) {
      var cells = [];
      [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) {
        var rr = ctr[0] + d[0], cc = ctr[1] + d[1];
        if (Engine.inBounds(G, rr, cc) && Engine.placeable(Engine.cellAt(G, rr, cc))) {
          cells.push(Engine.idx(G, rr, cc));
        }
      });
      if (cells.length > bestN) { bestN = cells.length; best = cells; }
    });
    return best && best.length ? best : null;
  }

  /* Execute the enemy's turn. Returns a summary for the renderer. */
  function takeTurn(G, foe) {
    var action = nextAction(foe);
    foe.step++;
    var summary = { action: action, placed: [], result: null };

    var shapeLen = 1;
    switch (action.id) {
      case 'eSlash': shapeLen = 3; break;
      case 'eLong': shapeLen = 4; break;
      case 'eBlueBlood':
        if (G.trinkets.E.indexOf('blueBlood') === -1) G.trinkets.E.push('blueBlood');
        break;
      case 'eInkTax': Engine.addRule(G, 'inkTax'); break;
      case 'eOrthodox': Engine.addRule(G, 'orthodox'); break;
      case 'eEraser': {
        // smudge the player's most valuable uncircled mark
        var hot = playerHotCells(G);
        var bestI = -1, bestV = -1;
        for (var i = 0; i < G.cells.length; i++) {
          var cl = G.cells[i];
          if (cl.mark !== 'P' || Engine.isCircled(cl)) continue;
          var v = 1;
          var r = Math.floor(i / G.size), c = i % G.size;
          Engine.DIR_KEYS.forEach(function (dir) {
            v += Engine.maximalRun(G, 'P', r, c, dir).len;
          });
          if (v > bestV) { bestV = v; bestI = i; }
        }
        if (bestI !== -1) {
          Engine.smudgeErase(G, bestI);
          G.fx.push({ t: 'erase', cells: [bestI], clean: false });
        }
        break;
      }
      case 'eScribble': {
        var hot2 = playerHotCells(G);
        var target = -1, tv = -1;
        Object.keys(hot2).forEach(function (k) {
          if (hot2[k] > tv) { tv = hot2[k]; target = +k; }
        });
        if (target === -1) {
          for (var j = 0; j < G.cells.length; j++) {
            if (Engine.placeable(G.cells[j])) { target = j; break; }
          }
        }
        if (target !== -1) G.cells[target].smudge = true;
        break;
      }
      case 'eInksplosion': {
        var boom = inksplosionCells(G);
        if (boom) {
          summary.placed = boom;
          summary.result = Engine.placeMarks(G, 'E', boom);
          Engine.checkJam(G);
          return summary; // Inksplosion IS the placement
        }
        break;
      }
    }

    if (G.over) return summary;

    // placement
    var shape = Engine.fitShape(G, { kind: 'line', len: Engine.effectiveLen(G, shapeLen) });
    if (!shape) { Engine.checkJam(G); return summary; }
    var cells = bestLinePlacement(G, shape.len);
    if (cells) {
      summary.placed = cells;
      summary.result = Engine.placeMarks(G, 'E', cells);
    }
    Engine.checkJam(G);
    return summary;
  }

  return {
    ACTIONS: ACTIONS,
    makeInkfiend: makeInkfiend,
    nextAction: nextAction,
    peekAction: peekAction,
    playerHotCells: playerHotCells,
    inksplosionCells: inksplosionCells,
    takeTurn: takeTurn,
  };
})();

if (typeof module !== 'undefined') module.exports = Enemy;
