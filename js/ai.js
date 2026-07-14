/* ============================================================
   BLEEDTHROUGH v0.2 — ai.js
   The student across the desk. Wins when it can, blocks when it
   must, fumbles early pages, and runs the subject gimmick:
   trenches & the Tall Horse (History), elemental O's & the
   telegraphed Thunderbolt (Mythology).
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
    };
  }

  function mistakeChance(st) {
    if (st.isBoss) return 0.02;
    return Math.max(0.06, 0.34 - 0.035 * (st.page - 1));
  }

  function candidates(G, includeSmudged) {
    return Engine.innerCells(G).filter(function (cl) {
      if (Engine.canPlace(G, 'E', cl)) return true;
      return includeSmudged && !cl.mark && cl.smudge > 0;
    });
  }

  // ---------- tactical layer ----------
  function winningCell(G, who) {
    var cells = Engine.innerCells(G).filter(function (cl) {
      return !cl.mark && cl.smudge === 0;
    });
    var mark = who === 'P' ? 'X' : 'O';
    var gapOK = who === 'P' && G.playerGapLines;
    for (var i = 0; i < cells.length; i++) {
      cells[i].mark = mark;
      var win = Engine.findWin(G, who, gapOK);
      cells[i].mark = null;
      if (win) return cells[i];
    }
    return null;
  }

  /* Heuristic value of placing an O at cell: open own spans get
     stronger with more O's; spans crowded with X's are worth
     contesting; slight center pull. */
  function scoreCell(G, cell) {
    var s = 0;
    Engine.DIRS.forEach(function (d) {
      for (var back = 0; back < G.winLen; back++) {
        var r0 = cell.r - d.dr * back, c0 = cell.c - d.dc * back;
        var rEnd = r0 + d.dr * (G.winLen - 1), cEnd = c0 + d.dc * (G.winLen - 1);
        if (r0 < 0 || c0 < 0 || rEnd >= G.size || cEnd >= G.size || c0 >= G.size || cEnd < 0) continue;
        var os = 0, xs = 0, dead = false;
        for (var k = 0; k < G.winLen; k++) {
          var cl = Engine.at(G, r0 + d.dr * k, c0 + d.dc * k);
          if (cl.mark === 'O') os++;
          else if (cl.mark === 'X') xs++;
          if (cl.smudge > 1) dead = true;
        }
        if (dead) continue;
        if (xs === 0) s += (os + 1) * (os + 1);        // build our line
        if (os === 0 && xs > 0) s += xs * xs * 1.6;    // squat on theirs
      }
    });
    var mid = (G.size - 1) / 2;
    s += 1 - (Math.abs(cell.r - mid) + Math.abs(cell.c - mid)) * 0.1;
    return s;
  }

  function chooseNormalCell(G, st) {
    var win = winningCell(G, 'E');
    if (win) return win;
    var block = winningCell(G, 'P');
    if (block && Engine.canPlace(G, 'E', block)) return block;
    var cands = candidates(G, false);
    if (!cands.length) return null;
    if (G.rng() < mistakeChance(st)) {
      return cands[Math.floor(G.rng() * cands.length)];
    }
    var best = cands[0], bs = -Infinity;
    cands.forEach(function (cl) {
      var s = scoreCell(G, cl) + G.rng() * 0.3;
      if (s > bs) { bs = s; best = cl; }
    });
    return best;
  }

  /* Best-guess prediction for Corner Peek (no specials). */
  function predict(G, st) {
    return chooseNormalCell(G, st);
  }

  // ---------- subject gimmicks ----------
  function elementalRoll(G, st, subj) {
    var bands = subj.gimmick.elemental;
    if (!bands) return null;
    var p = st.isBoss ? bands.boss : st.page <= 3 ? bands.early : st.page <= 6 ? bands.mid : bands.late;
    if (G.rng() >= p) return null;
    var types = ['fire', 'ice', 'bolt'];
    return types[Math.floor(G.rng() * types.length)];
  }

  function applyElement(G, cell, elem, events) {
    var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    if (elem === 'fire') {
      var burn = null, bs = -1;
      dirs.forEach(function (d) {
        var r = cell.r + d[0], c = cell.c + d[1];
        if (!Engine.inner(G, r, c)) return;
        var n = Engine.at(G, r, c);
        if (n.mark === 'X') {
          var v = scoreCell(G, { r: r, c: c });
          if (v > bs) { bs = v; burn = n; }
        }
      });
      if (burn) {
        var hit = Engine.smudgeX(G, burn.r, burn.c, 2);
        events.push({ t: 'note', msg: hit ? '🔥 The fire O burns your adjacent X to a smudge!' : '🔥 The fire O flares — your anchored X shrugs it off.' });
      }
    }
    if (elem === 'ice') {
      var froze = 0;
      dirs.forEach(function (d) {
        var r = cell.r + d[0], c = cell.c + d[1];
        if (!Engine.inner(G, r, c)) return;
        var n = Engine.at(G, r, c);
        if (!n.mark && n.smudge === 0) { n.frozen = 1; froze++; }
      });
      if (froze) events.push({ t: 'note', msg: '❄️ The ice O freezes ' + froze + ' nearby square(s) for your next turn.' });
    }
    if (elem === 'bolt') {
      events.push({ t: 'note', msg: '⚡ A lightning O — it can strike smudged squares clean.' });
    }
  }

  function bestHorse(G) {
    var best = null, bs = -Infinity;
    for (var r = 0; r < G.size - 1; r++) for (var c = 0; c < G.size; c++) {
      var a = Engine.at(G, r, c), b = Engine.at(G, r + 1, c);
      if (!Engine.canPlace(G, 'E', a) || !Engine.canPlace(G, 'E', b)) continue;
      var s = scoreCell(G, a) + scoreCell(G, b);
      if (s > bs) { bs = s; best = { r: r, c: c }; }
    }
    return best;
  }

  function markBoltTargets(G, count) {
    var xs = Engine.innerCells(G).filter(function (cl) { return cl.mark === 'X'; });
    xs.sort(function (a, b) { return scoreCell(G, b) - scoreCell(G, a); });
    var marked = [];
    xs.slice(0, count).forEach(function (cl) { cl.boltMark = true; marked.push(cl); });
    return marked;
  }

  function strikeBolts(G, events) {
    var hit = 0;
    G.cells.forEach(function (cl) {
      if (!cl.boltMark) return;
      cl.boltMark = false;
      if (cl.mark === 'X') { if (Engine.smudgeX(G, cl.r, cl.c, 2)) hit++; }
    });
    events.push({ t: 'dialogue', key: 'specialDone' });
    events.push({ t: 'note', msg: '⚡ Thunderbolt! ' + (hit ? hit + ' of your X\'s scorched to smudges.' : 'The marked squares were already bare.') });
  }

  // ---------- the turn ----------
  function takeTurn(G, st, run) {
    var subj = Subjects.ALL[st.subjectId];
    var events = [];
    var summary = { events: events, skipped: false };

    if (G.skipEnemyTurns > 0) {
      G.skipEnemyTurns--;
      events.push({ t: 'note', msg: '🚪 ' + subj.student + ' got called out of class. Turn skipped!' });
      summary.skipped = true;
      return summary;
    }

    Engine.clearJustPlaced(G);
    st.turn++;

    var bossCfg = subj.gimmick.boss;

    // execute a telegraphed special
    if (st.pendingSpecial && st.isBoss) {
      st.pendingSpecial = false;
      if (bossCfg.type === 'horse') {
        var h = bestHorse(G);
        if (h && Engine.placeHorse(G, h.r, h.c)) {
          events.push({ t: 'dialogue', key: 'specialDone' });
          return summary;
        } // no room: fall through to a normal move
      }
      if (bossCfg.type === 'bolt') {
        strikeBolts(G, events);
        return summary;
      }
    }

    // telegraph the next special
    if (st.isBoss && !st.pendingSpecial && st.turn >= 2 && (st.turn - 2) % bossCfg.cadence === 0) {
      st.pendingSpecial = true;
      events.push({ t: 'dialogue', key: 'preSpecial' });
      if (bossCfg.type === 'bolt') markBoltTargets(G, bossCfg.boltCount);
      // telegraph turn still makes a normal move below
    }

    // History mid-notebook trench: replaces the placement
    var gk = subj.gimmick;
    if (!st.isBoss && gk.trenchFromPage && st.page >= gk.trenchFromPage && st.turn % gk.trenchEvery === 3) {
      var block = winningCell(G, 'P') || chooseNormalCell(G, st);
      if (block && !block.mark && block.smudge === 0) {
        block.smudge = 2;
        events.push({ t: 'dialogue', key: 'trench' });
        events.push({ t: 'note', msg: '🕳 ' + subj.student + ' digs a trench — that square is dead for 2 turns.' });
        return summary;
      }
    }

    // normal move (maybe elemental)
    var elem = elementalRoll(G, st, subj);
    var cell = chooseNormalCell(G, st);
    if (elem === 'bolt') {
      // lightning may reclaim a smudged square if it's juicier
      var smudged = candidates(G, true).filter(function (cl) { return cl.smudge > 0; });
      smudged.forEach(function (cl) {
        if (!cell || scoreCell(G, cl) > scoreCell(G, cell)) cell = cl;
      });
    }
    if (!cell) return summary; // nowhere to go — draw check happens outside

    var placed = elem === 'bolt'
      ? Engine.placeBoltO(G, cell.r, cell.c)
      : Engine.place(G, 'E', cell.r, cell.c, { elem: elem });
    if (placed && elem) applyElement(G, placed, elem, events);

    return summary;
  }

  return { newState: newState, takeTurn: takeTurn, predict: predict, mistakeChance: mistakeChance, scoreCell: scoreCell, winningCell: winningCell };
})();

if (typeof module !== 'undefined') module.exports = AI;
