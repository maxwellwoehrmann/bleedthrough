/* ============================================================
   BLEEDTHROUGH — render.js
   All DOM. Hand-drawn SVG marks, wobbly red-pen circles,
   doodle terrain, cards, meters, intents, toasts.
   ============================================================ */

var Render = (function () {

  var $ = function (sel) { return document.querySelector(sel); };

  // deterministic per-cell jitter so marks don't dance on re-render
  function jit(i, salt, range) {
    var x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return ((x - Math.floor(x)) - 0.5) * 2 * range;
  }

  // ---------- hand-drawn glyphs ----------
  function svgX(i) {
    var r = jit(i, 1, 9);
    var a = 22 + jit(i, 2, 5), b = 78 + jit(i, 3, 5);
    return '<svg viewBox="0 0 100 100" class="glyph glyph-x" style="transform:rotate(' + r + 'deg)">' +
      '<path class="stroke s1" pathLength="1" d="M' + a + ' ' + (a + jit(i, 4, 4)) + ' Q 50 ' + (48 + jit(i, 5, 8)) + ' ' + b + ' ' + (b + jit(i, 6, 4)) + '"/>' +
      '<path class="stroke s2" pathLength="1" d="M' + b + ' ' + (a + jit(i, 7, 4)) + ' Q ' + (52 + jit(i, 8, 6)) + ' 50 ' + a + ' ' + (b + jit(i, 9, 4)) + '"/>' +
      '</svg>';
  }

  function svgO(i) {
    var r = jit(i, 11, 30);
    var rx = 30 + jit(i, 12, 4), ry = 27 + jit(i, 13, 4);
    // open ellipse with overshoot, like a real ballpoint circle
    var pts = [];
    for (var t = -0.35; t <= Math.PI * 2 + 0.15; t += 0.28) {
      var wob = 1 + jit(i, 14 + t * 10, 0.045);
      pts.push((50 + Math.cos(t) * rx * wob).toFixed(1) + ' ' + (50 + Math.sin(t) * ry * wob).toFixed(1));
    }
    return '<svg viewBox="0 0 100 100" class="glyph glyph-o" style="transform:rotate(' + r + 'deg)">' +
      '<path class="stroke" pathLength="1" d="M' + pts.join(' L') + '"/></svg>';
  }

  function svgStar(i) {
    var pts = [], spikes = 5, rot = jit(i, 21, 0.6);
    for (var k = 0; k <= spikes * 2; k++) {
      var ang = (k * Math.PI) / spikes - Math.PI / 2 + rot;
      var rad = (k % 2 === 0 ? 34 : 14) * (1 + jit(i, 22 + k, 0.12));
      pts.push((50 + Math.cos(ang) * rad).toFixed(1) + ' ' + (50 + Math.sin(ang) * rad).toFixed(1));
    }
    return '<svg viewBox="0 0 100 100" class="doodle doodle-star"><path d="M' + pts.join(' L') + ' Z"/></svg>';
  }

  function svgRing(i) {
    var pts = [];
    for (var t = 0; t <= Math.PI * 2 + 0.3; t += 0.3) {
      var wob = 1 + jit(i, 31 + t * 7, 0.06);
      pts.push((50 + Math.cos(t) * 40 * wob).toFixed(1) + ' ' + (50 + Math.sin(t) * 38 * wob).toFixed(1));
    }
    return '<svg viewBox="0 0 100 100" class="doodle doodle-ring"><path d="M' + pts.join(' L') + '"/></svg>';
  }

  function svgSpiral(i) {
    var pts = [];
    for (var t = 0; t < Math.PI * 6.5; t += 0.25) {
      var rad = 4 + t * 5.6;
      pts.push((50 + Math.cos(t + jit(i, 41, 1)) * rad).toFixed(1) + ' ' + (50 + Math.sin(t + jit(i, 41, 1)) * rad).toFixed(1));
    }
    return '<svg viewBox="0 0 100 100" class="doodle doodle-spiral"><path d="M' + pts.join(' L') + '"/></svg>';
  }

  function svgSmudge(i) {
    var pts = [];
    for (var t = 0; t <= Math.PI * 2; t += 0.5) {
      var rad = 30 * (1 + jit(i, 51 + t * 3, 0.35));
      pts.push((50 + Math.cos(t) * rad * 1.2).toFixed(1) + ' ' + (50 + Math.sin(t) * rad * 0.8).toFixed(1));
    }
    return '<svg viewBox="0 0 100 100" class="doodle doodle-smudge"><path d="M' + pts.join(' L') + ' Z"/></svg>';
  }

  function glyphFor(cell, i) {
    var html = '';
    if (cell.terrain === 'star') html += svgStar(i);
    if (cell.terrain === 'ring') html += svgRing(i);
    if (cell.terrain === 'spiral') html += svgSpiral(i);
    if (cell.smudge) html += svgSmudge(i);
    if (cell.ghost === 'P') html += '<div class="ghost ghost-p">' + svgX(i) + '</div>';
    if (cell.ghost === 'E') html += '<div class="ghost ghost-e">' + svgO(i) + '</div>';
    if (cell.mark === 'P') html += svgX(i);
    if (cell.mark === 'E') html += svgO(i);
    return html;
  }

  // ---------- board ----------
  function drawBoard(G, ui) {
    var board = $('#board');
    board.style.setProperty('--n', G.size);
    var html = '';
    for (var i = 0; i < G.cells.length; i++) {
      var cell = G.cells[i];
      var cls = ['cell'];
      if (cell.justPlaced) cls.push('just-placed');
      if (cell.spill) cls.push('spilled');
      if (Engine.isCircled(cell)) cls.push('inked');
      if (ui && ui.highlight && ui.highlight.has(i)) cls.push('hi');
      if (ui && ui.preview && ui.preview.has(i)) cls.push('preview');
      html += '<div class="' + cls.join(' ') + '" data-i="' + i + '">' + glyphFor(cell, i) + '</div>';
    }
    board.innerHTML = html;
    drawOverlay(G);
  }

  function wobblyCirclePath(run, size) {
    var d = Engine.DIRS[run.dir];
    var x0 = run.c0 * 100 + 50, y0 = run.r0 * 100 + 50;
    var x1 = (run.c0 + d.dc * (run.len - 1)) * 100 + 50;
    var y1 = (run.r0 + d.dr * (run.len - 1)) * 100 + 50;
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    var half = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)) / 2;
    var ang = Math.atan2(y1 - y0, x1 - x0);
    var rx = half + 42, ry = 40;
    var seed = run.r0 * 31 + run.c0 * 7;
    var pts = [];
    for (var t = -0.25; t <= Math.PI * 2 + 0.35; t += 0.22) {
      var wob = 1 + jit(seed, t * 9, 0.05);
      var ex = Math.cos(t) * rx * wob, ey = Math.sin(t) * ry * wob;
      var x = mx + ex * Math.cos(ang) - ey * Math.sin(ang);
      var y = my + ex * Math.sin(ang) + ey * Math.cos(ang);
      pts.push(x.toFixed(1) + ' ' + y.toFixed(1));
    }
    return 'M' + pts.join(' L');
  }

  function drawOverlay(G) {
    var svg = $('#overlay');
    svg.setAttribute('viewBox', '0 0 ' + G.size * 100 + ' ' + G.size * 100);
    var html = '';
    G.circles.forEach(function (c) {
      html += '<path class="pen-circle ' + (c.who === 'P' ? 'pc-p' : 'pc-e') + '" d="' + wobblyCirclePath(c.run, G.size) + '"/>';
    });
    svg.innerHTML = html;
  }

  function animateNewCircle(G, run, who, ink) {
    var svg = $('#overlay');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('class', 'pen-circle drawing ' + (who === 'P' ? 'pc-p' : 'pc-e'));
    p.setAttribute('d', wobblyCirclePath(run, G.size));
    svg.appendChild(p);
    var len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    p.getBoundingClientRect();
    p.style.strokeDashoffset = 0;
    scorePopup(G, run, who, ink);
  }

  function scorePopup(G, run, who, ink) {
    var wrap = $('#board-wrap');
    var d = Engine.DIRS[run.dir];
    var mr = run.r0 + d.dr * (run.len - 1) / 2, mc = run.c0 + d.dc * (run.len - 1) / 2;
    var el = document.createElement('div');
    el.className = 'score-pop ' + (who === 'P' ? 'sp-p' : 'sp-e');
    el.textContent = '+' + ink;
    el.style.left = ((mc + 0.5) / G.size * 100) + '%';
    el.style.top = ((mr + 0.5) / G.size * 100) + '%';
    wrap.appendChild(el);
    setTimeout(function () { el.remove(); }, 1600);
  }

  // ---------- peek (projection through the paper) ----------
  function showPeek(G) {
    var proj = Flipside.projection(G);
    var board = $('#board');
    board.classList.add('peeking');
    proj.forEach(function (p, i) {
      var el = board.querySelector('[data-i="' + i + '"]');
      if (!el) return;
      if (!p) return;
      var tag = document.createElement('div');
      tag.className = 'proj proj-' + (p.kind === 'mark' ? 'mark' : p.kind === 'ghost' ? ('ghost-' + p.who.toLowerCase()) : 'smudge');
      tag.textContent = p.kind === 'mark' ? '✗' : p.kind === 'ghost' ? (p.who === 'P' ? 'x' : 'o') : '▒';
      el.appendChild(tag);
    });
  }
  function hidePeek() {
    var board = $('#board');
    board.classList.remove('peeking');
    board.querySelectorAll('.proj').forEach(function (n) { n.remove(); });
  }

  // ---------- cards ----------
  function cardHTML(id, extraCls) {
    var c = Cards.DB[id];
    return '<div class="card t-' + c.type + (extraCls ? ' ' + extraCls : '') + '" data-card="' + id + '">' +
      '<div class="card-pin"></div>' +
      '<div class="card-top"><span class="card-icon">' + c.icon + '</span>' +
      '<span class="card-type">' + c.type + '</span></div>' +
      '<div class="card-name">' + c.name + '</div>' +
      '<div class="card-text">' + c.text + '</div>' +
      '<div class="card-flavor">' + (c.flavor || '') + '</div>' +
      '</div>';
  }

  function drawHand(G, ui) {
    var hand = $('#hand');
    var html = '';
    G.hand.forEach(function (id, k) {
      var c = Cards.DB[id];
      var canPlay = !G.over && G.turn === 'P' &&
        (c.type === 'margin' || G.playsLeft > 0) &&
        (!ui || ui.mode === 'idle' || ui.mode === 'place-anchor');
      var cls = (ui && ui.selectedCard === k ? 'sel ' : '') + (canPlay ? 'can ' : 'dim ');
      html += cardHTML(id, cls + 'k' + k).replace('data-card=', 'data-k="' + k + '" data-card=');
    });
    hand.innerHTML = html || '<div class="hand-empty">~ no cards, just vibes ~</div>';
  }

  /* Big centered focus view of the selected card — the card IS the moment. */
  function drawFocus(G, ui) {
    var el = $('#card-focus');
    var k = ui ? ui.selectedCard : -1;
    if (k < 0 || !G.hand[k]) { el.classList.remove('open'); el.innerHTML = ''; return; }
    var id = G.hand[k];
    var c = Cards.DB[id];
    var canPlay = !G.over && G.turn === 'P' &&
      (c.type === 'margin' || G.playsLeft > 0) && ui.mode === 'idle';
    var typeNote = {
      active: 'one-shot — fires when played',
      rule: 'sticks to the page — changes the game for BOTH of you',
      trinket: 'sits on your desk — permanent, but stealable',
      goal: 'moves the finish line itself',
      margin: 'FREE — never costs your play for the turn',
    }[c.type] || '';
    el.innerHTML = cardHTML(id, 'big') +
      '<div class="focus-type-note">' + typeNote + '</div>' +
      '<div class="focus-btns">' +
      (canPlay
        ? '<button class="btn big" id="focus-play">▶ play it</button>'
        : '<div class="focus-note">no plays left this turn — margin cards are always free</div>') +
      '<button class="btn" id="focus-back">put it back</button></div>';
    el.classList.add('open');
  }

  // ---------- chrome ----------
  function drawMeters(G) {
    $('#score-p').textContent = G.scores.P;
    $('#score-e').textContent = G.scores.E;
    $('#target-label').textContent = 'first to ' + G.target + (G.flipsidePact ? ' — FLIPSIDE PACT' : '');
    $('#meter-player .fill').style.width = Math.min(100, G.scores.P / G.target * 100) + '%';
    $('#meter-enemy .fill').style.width = Math.min(100, G.scores.E / G.target * 100) + '%';
  }

  function drawRules(G) {
    var row = $('#rules-row');
    if (!G.rules.length) { row.innerHTML = '<span class="no-rules">house rules: none (yet)</span>'; return; }
    row.innerHTML = G.rules.map(function (id) {
      var c = Cards.DB[id];
      return '<span class="rule-chip" title="' + c.text + '">' + c.icon + ' ' + c.name + '</span>';
    }).join('');
  }

  function drawTrinkets(G) {
    var mk = function (ids, who) {
      return ids.map(function (id) {
        var c = Cards.DB[id];
        return '<span class="trinket" title="' + c.name + ': ' + c.text + '">' + c.icon + '</span>';
      }).join('') || '<span class="trinket-none">—</span>';
    };
    $('#player-trinkets').innerHTML = mk(G.trinkets.P, 'P');
    $('#enemy-trinkets').innerHTML = mk(G.trinkets.E, 'E');
  }

  function drawIntent(G, foe, revealSurprise) {
    var el = $('#intent-note');
    if (G.over) { el.innerHTML = ''; return; }
    var a = Enemy.nextAction(foe);
    if (a.surprise && !revealSurprise) {
      el.innerHTML = '<span class="intent-surprise">next: ?! (something is scribbling excitedly)</span>';
    } else {
      el.innerHTML = 'next: <b>' + a.name + '</b> — ' + (a.surprise ? 'a plus-shaped blast of 5 marks!' : a.desc);
    }
  }

  function drawHint(G, ui) {
    var el = $('#turn-hint');
    var s = Engine.currentShape(G, 'P');
    var shapeName = s.kind === 'line' ? (s.len === 1 ? 'a single mark' : 'a line of ' + s.len)
      : s.kind === 'block' ? 'a ' + s.w + '×' + s.h + ' block'
      : s.n + ' free marks';
    var msgs = {
      'idle': 'play cards (' + G.playsLeft + ' left) or tap the page to place ' + shapeName,
      'place-anchor': 'tap a starting square for ' + shapeName,
      'place-endpoint': 'tap a glowing end square (or tap the start again to cancel)',
      'place-free': 'free placement: ' + (ui.freeLeft || 0) + ' mark(s) left — tap anywhere open',
      'place-block': 'tap where the top-left of the block goes',
      'target-cell': 'tap a target square (✕ cancels)',
      'target-strip': 'tap the far end of the strip (✕ cancels)',
      'enemy': 'the Inkfiend is thinking…',
    };
    el.textContent = msgs[ui.mode] || '';
    $('#btn-cancel').style.display =
      (ui.mode === 'target-cell' || ui.mode === 'target-strip' || ui.mode === 'place-endpoint') ? '' : 'none';
  }

  // ---------- toasts & fx ----------
  function toast(msg) {
    var holder = $('#toast-holder');
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    holder.appendChild(el);
    setTimeout(function () { el.classList.add('gone'); }, 2200);
    setTimeout(function () { el.remove(); }, 2800);
  }

  function drainFx(G, foe) {
    var fx = G.fx.splice(0);
    fx.forEach(function (e) {
      if (e.t === 'circle') animateNewCircle(G, e.run, e.who, e.ink);
      if (e.t === 'toast') toast(e.msg);
      if (e.t === 'erase') toast(e.msg || (e.clean ? 'erased clean.' : 'erased… it smudged.'));
      if (e.t === 'spill') toast('Ink soaks into the page. The flipside will remember.');
      if (e.t === 'ko') toast(e.ko.how === 'spiral' ? 'THE SPIRAL CLAIMS THE PAGE.' : 'SUDDEN DEATH!');
      if (e.t === 'target') drawMeters(G);
      if (e.t === 'peek-intents' && foe) {
        var a1 = Enemy.nextAction(foe), a2 = Enemy.peekAction(foe, 1);
        toast('Peeked: ' + a1.name + ', then ' + a2.name + '.');
      }
    });
  }

  // ---------- full redraw ----------
  function match(G, ui, foe) {
    drawBoard(G, ui);
    drawHand(G, ui);
    drawFocus(G, ui);
    drawMeters(G);
    drawRules(G);
    drawTrinkets(G);
    drawHint(G, ui);
    if (foe) {
      $('#enemy-name').textContent = foe.name;
      drawIntent(G, foe, Engine.hasTrinket(G, 'P', 'magnifyingGlass'));
    }
    $('#side-label').textContent = G.side === 'front' ? '· page 1, front ·' : '· page 1, FLIPSIDE ·';
    document.body.classList.toggle('flipside', G.side === 'flip');
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.toggle('active', s.id === id);
    });
  }

  return {
    match: match, drawBoard: drawBoard, drawHand: drawHand, drawFocus: drawFocus, drawMeters: drawMeters,
    drawRules: drawRules, drawTrinkets: drawTrinkets, drawIntent: drawIntent, drawHint: drawHint,
    toast: toast, drainFx: drainFx, showScreen: showScreen,
    showPeek: showPeek, hidePeek: hidePeek, cardHTML: cardHTML,
    animateNewCircle: animateNewCircle,
  };
})();
