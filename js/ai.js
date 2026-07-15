/* ============================================================
   BLEEDTHROUGH v0.3 — ai.js
   The student: wins when it can, blocks when it must, fumbles
   early pages. Places subject tokens (horses, swords, tridents,
   sandals, mice, spiders, snakes) and runs telegraphed boss
   specials. Gravity-aware in physics notebooks.
   ============================================================ */

var AI = (function () {

  function newState(run) {
    var subj = Run.subject(run);
    return {
      subjectId: subj.id,
      page: run.page,
      isBoss: Run.isBossPage(run),
      turn: 0,
      pendingSpecial: false,
      cadence: subj.gimmick.boss.cadence + Trinkets.total(run, 'detentionSlip', 'slow'),
    };
  }

  function mistakeChance(st) {
    if (st.isBoss) return 0;
    return Math.max(0.08, 0.32 - 0.06 * (st.page - 1));
  }

  /* Legal single-cell moves. Gravity: one landing per column. */
  function candidates(G) {
    if (G.gravity) {
      var out = [];
      for (var c = 0; c < G.cols; c++) {
        var l = Engine.landing(G, 'E', c);
        if (l) out.push(l);
      }
      return out;
    }
    return Engine.innerCells(G).filter(function (cl) { return !cl.mark && !cl.torn; });
  }

  function winningCell(G, who) {
    var cands = who === 'E' ? candidates(G) : candidates(G).filter(function (cl) { return cl.web === 0; });
    var mark = who === 'P' ? 'X' : 'O';
    for (var i = 0; i < cands.length; i++) {
      cands[i].mark = mark;
      var win = Engine.findWinNormal(G, who) ||
        (who === 'P' && G.playerSkipping ? Engine.findWinSkipping(G, who) : null) ||
        (who === 'P' && G.playerConnect ? Engine.findWinConnect(G, who) : null);
      cands[i].mark = null;
      if (win) return cands[i];
    }
    return null;
  }

  /* Span-based heuristic; treats blockers and tears as dead. */
  function scoreCell(G, cell) {
    var s = 0;
    Engine.LINE_DIRS.forEach(function (d) {
      for (var back = 0; back < G.winLen; back++) {
        var r0 = cell.r - d.dr * back, c0 = cell.c - d.dc * back;
        var rE = r0 + d.dr * (G.winLen - 1), cE = c0 + d.dc * (G.winLen - 1);
        if (r0 < 0 || rE >= G.rows || Math.min(c0, cE) < 0 || Math.max(c0, cE) >= G.cols) continue;
        var os = 0, xs = 0, dead = false;
        for (var k = 0; k < G.winLen; k++) {
          var cl = Engine.at(G, r0 + d.dr * k, c0 + d.dc * k);
          if (cl.torn || cl.mark === 'B') { dead = true; break; }
          if (cl.mark === 'O') os++;
          else if (cl.mark === 'X') xs++;
        }
        if (dead) continue;
        if (xs === 0) s += (os + 1) * (os + 1);
        if (os === 0 && xs > 0) s += xs * xs * 1.7;
      }
    });
    s += 1 - (Math.abs(cell.r - (G.rows - 1) / 2) + Math.abs(cell.c - (G.cols - 1) / 2)) * 0.08;
    return s;
  }

  function chooseNormalCell(G, st) {
    var win = winningCell(G, 'E');
    if (win) return win;
    var block = winningCell(G, 'P');
    if (block) {
      // in gravity the block square must actually be reachable
      var reach = G.gravity ? Engine.landing(G, 'E', block.c) : block;
      if (reach === block) return block;
    }
    var cands = candidates(G);
    if (!cands.length) return null;
    if (G.rng() < mistakeChance(st)) return cands[Math.floor(G.rng() * cands.length)];
    var best = cands[0], bs = -Infinity;
    cands.forEach(function (cl) {
      var s = scoreCell(G, cl) + G.rng() * 0.3;
      if (s > bs) { bs = s; best = cl; }
    });
    return best;
  }

  function predict(G, st) { return chooseNormalCell(G, st); }

  // ---------------- movers (mice & sandals) ----------------
  function moveMovers(G, events) {
    var movers = G.cells.filter(function (cl) {
      return cl.mark === 'O' && (cl.kind === 'mouse' || cl.kind === 'sandal');
    });
    movers.forEach(function (cl) {
      var opts = [];
      Engine.ORTHO.forEach(function (d) {
        var rr = cl.r + d[0], cc = cl.c + d[1];
        if (!Engine.inner(G, rr, cc)) return;
        var n = Engine.at(G, rr, cc);
        if (!n.mark && !n.torn) opts.push(n);
      });
      if (!opts.length) return;
      var dest;
      if (cl.kind === 'sandal') {
        dest = opts[0]; var bs = -Infinity;
        opts.forEach(function (o) { var s = scoreCell(G, o); if (s > bs) { bs = s; dest = o; } });
      } else {
        dest = opts[Math.floor(G.rng() * opts.length)];
      }
      dest.mark = 'O'; dest.kind = cl.kind; dest.justPlaced = true;
      cl.mark = null; cl.kind = null;
    });
    if (movers.length) events.push({ t: 'note', msg: '🐾 The critters shuffle around the page…' });
  }

  // ---------------- tokens ----------------
  function tryToken(G, st, subj, events) {
    var toks = subj.gimmick.tokens || [];
    for (var i = 0; i < toks.length; i++) {
      var tk = toks[i];
      if (!st.isBoss && st.page < tk.fromPage) continue;
      if (tk.minCols && G.cols < tk.minCols) continue;
      if (tk.minRows && G.rows < tk.minRows) continue;
      var p = st.isBoss ? tk.bossProb : tk.prob;
      if (G.rng() >= p) continue;

      if (tk.kind === 'mouse' || tk.kind === 'sandal' || tk.kind === 'spider') {
        var cell = chooseNormalCell(G, st);
        if (!cell) continue;
        Engine.place(G, 'E', cell);
        cell.kind = tk.kind;
        if (tk.kind === 'spider') {
          var webbed = 0;
          Engine.ORTHO.forEach(function (d) {
            var rr = cell.r + d[0], cc = cell.c + d[1];
            if (!Engine.inner(G, rr, cc)) return;
            var n = Engine.at(G, rr, cc);
            if (!n.mark && !n.torn) { n.web = 1; webbed++; }
          });
        }
        events.push({ t: 'token', kind: tk.kind });
        return true;
      }

      // multi-cell tokens: find the best anchor
      var best = null, bs = -Infinity;
      for (var r = 0; r < G.rows; r++) for (var c = 0; c < G.cols; c++) {
        if (!Engine.canPlaceToken(G, tk.kind, r, c)) continue;
        var s = 0;
        Engine.TOKENS[tk.kind].shape.forEach(function (d) {
          s += scoreCell(G, Engine.at(G, r + d[0], c + d[1]));
        });
        if (s > bs) { bs = s; best = { r: r, c: c }; }
      }
      if (best) {
        Engine.placeToken(G, tk.kind, best.r, best.c);
        events.push({ t: 'token', kind: tk.kind });
        return true;
      }
    }
    return false;
  }

  // ---------------- boss specials ----------------
  function execSpecial(G, st, subj, events) {
    var boss = subj.gimmick.boss;
    if (boss.type === 'horse') {
      var best = null, bs = -Infinity;
      for (var r = 0; r < G.rows - 1; r++) for (var c = 0; c < G.cols; c++) {
        if (!Engine.canPlaceToken(G, 'horse', r, c)) continue;
        var s = scoreCell(G, Engine.at(G, r, c)) + scoreCell(G, Engine.at(G, r + 1, c));
        if (s > bs) { bs = s; best = { r: r, c: c }; }
      }
      if (best) { Engine.placeToken(G, 'horse', best.r, best.c); events.push({ t: 'dialogue', key: 'specialDone' }); return true; }
    }
    if (boss.type === 'bolt') {
      var hit = 0, fairies = 0;
      G.cells.forEach(function (cl) {
        if (!cl.boltMark) return;
        cl.boltMark = false;
        if (cl.mark === 'X') {
          var res = Engine.destroy(G, cl, false);
          if (res === 'destroyed') { hit++; fairies++; }
          else if (res === 'shielded') events.push({ t: 'note', msg: '⭐ Your sticker shield ate a thunderbolt!' });
          else if (res === 'immune') events.push({ t: 'note', msg: '💳 Laminated. Zeus is furious.' });
        }
      });
      events.push({ t: 'dialogue', key: 'specialDone' });
      if (hit) events.push({ t: 'destroyedX', count: fairies });
      return true;
    }
    if (boss.type === 'stampede') {
      var placed = 0;
      for (var k = 0; k < (boss.count || 3); k++) {
        var cell = chooseNormalCell(G, st);
        if (!cell) break;
        Engine.place(G, 'E', cell);
        cell.kind = 'mouse';
        placed++;
      }
      if (placed) { events.push({ t: 'dialogue', key: 'specialDone' }); return true; }
    }
    if (boss.type === 'apple') {
      // find the marked column, crush the topmost player mark in it
      var col = -1;
      G.cells.forEach(function (cl) { if (cl.appleMark) { col = cl.c; cl.appleMark = false; } });
      if (col === -1) return false;
      for (var rr = 0; rr < G.rows; rr++) {
        var cl2 = Engine.at(G, rr, col);
        if (cl2.mark === 'X') {
          var res2 = Engine.destroy(G, cl2, false);
          if (res2 === 'destroyed') {
            events.push({ t: 'destroyedX', count: 1 });
            Engine.place(G, 'E', cl2); cl2.kind = 'apple';
          } else {
            events.push({ t: 'note', msg: res2 === 'shielded' ? '⭐ The apple bounced off your shield!' : '💳 The apple bounced off the lamination!' });
          }
          Engine.settle(G);
          events.push({ t: 'dialogue', key: 'specialDone' });
          return true;
        }
        if (cl2.mark) break; // enemy piece on top — apple fizzles
      }
      return false;
    }
    return false;
  }

  function telegraph(G, st, subj, events) {
    var boss = subj.gimmick.boss;
    events.push({ t: 'dialogue', key: 'preSpecial' });
    if (boss.type === 'bolt') {
      var xs = Engine.innerCells(G).filter(function (cl) { return cl.mark === 'X'; });
      xs.sort(function (a, b) { return scoreCell(G, b) - scoreCell(G, a); });
      xs.slice(0, boss.boltCount || 2).forEach(function (cl) { cl.boltMark = true; });
    }
    if (boss.type === 'apple') {
      // mark the column where the player is tallest
      var bestCol = 0, bestH = -1;
      for (var c = 0; c < G.cols; c++) {
        var h = 0;
        for (var r = 0; r < G.rows; r++) if (Engine.at(G, r, c).mark === 'X') h++;
        if (h > bestH) { bestH = h; bestCol = c; }
      }
      Engine.at(G, 0, bestCol).appleMark = true;
    }
  }

  // ---------------- the turn ----------------
  function takeTurn(G, st, run) {
    var subj = Subjects.ALL[st.subjectId];
    var events = [];
    var summary = { events: events, skipped: false };

    Engine.clearJustPlaced(G);
    st.turn++;

    moveMovers(G, events);

    if (st.pendingSpecial && st.isBoss) {
      st.pendingSpecial = false;
      if (execSpecial(G, st, subj, events)) { Engine.settle(G); return summary; }
    }

    if (st.isBoss && !st.pendingSpecial && st.turn >= 2 && (st.turn - 2) % st.cadence === 0) {
      st.pendingSpecial = true;
      telegraph(G, st, subj, events);
      // telegraph turn still makes a normal move below
    }

    if (tryToken(G, st, subj, events)) { Engine.settle(G); return summary; }

    var cell = chooseNormalCell(G, st);
    if (cell) Engine.place(G, 'E', cell);
    Engine.settle(G);
    return summary;
  }

  return {
    newState: newState, takeTurn: takeTurn, predict: predict,
    mistakeChance: mistakeChance, scoreCell: scoreCell,
    winningCell: winningCell, candidates: candidates,
  };
})();

if (typeof module !== 'undefined') module.exports = AI;
