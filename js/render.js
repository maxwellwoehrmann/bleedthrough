/* ============================================================
   BLEEDTHROUGH v0.2 — render.js
   All DOM. Hand-drawn marks, doodle horses, elemental O's,
   speech bubbles, candy, sticky notes, the stall.
   ============================================================ */

var Render = (function () {

  var $ = function (sel) { return document.querySelector(sel); };

  function jit(i, salt, range) {
    var x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return ((x - Math.floor(x)) - 0.5) * 2 * range;
  }

  // ---------- glyphs ----------
  function svgX(i, cls) {
    var r = jit(i, 1, 9);
    var a = 22 + jit(i, 2, 5), b = 78 + jit(i, 3, 5);
    return '<svg viewBox="0 0 100 100" class="glyph glyph-x ' + (cls || '') + '" style="transform:rotate(' + r + 'deg)">' +
      '<path class="stroke s1" pathLength="1" d="M' + a + ' ' + (a + jit(i, 4, 4)) + ' Q 50 ' + (48 + jit(i, 5, 8)) + ' ' + b + ' ' + (b + jit(i, 6, 4)) + '"/>' +
      '<path class="stroke s2" pathLength="1" d="M' + b + ' ' + (a + jit(i, 7, 4)) + ' Q ' + (52 + jit(i, 8, 6)) + ' 50 ' + a + ' ' + (b + jit(i, 9, 4)) + '"/>' +
      '</svg>';
  }

  function svgO(i, cls) {
    var r = jit(i, 11, 30);
    var rx = 30 + jit(i, 12, 4), ry = 27 + jit(i, 13, 4);
    var pts = [];
    for (var t = -0.35; t <= Math.PI * 2 + 0.15; t += 0.28) {
      var wob = 1 + jit(i, 14 + t * 10, 0.045);
      pts.push((50 + Math.cos(t) * rx * wob).toFixed(1) + ' ' + (50 + Math.sin(t) * ry * wob).toFixed(1));
    }
    return '<svg viewBox="0 0 100 100" class="glyph glyph-o ' + (cls || '') + '" style="transform:rotate(' + r + 'deg)">' +
      '<path class="stroke" pathLength="1" d="M' + pts.join(' L') + '"/></svg>';
  }

  function svgSmudge(i) {
    var pts = [];
    for (var t = 0; t <= Math.PI * 2; t += 0.5) {
      var rad = 30 * (1 + jit(i, 51 + t * 3, 0.35));
      pts.push((50 + Math.cos(t) * rad * 1.2).toFixed(1) + ' ' + (50 + Math.sin(t) * rad * 0.8).toFixed(1));
    }
    return '<svg viewBox="0 0 100 100" class="doodle doodle-smudge"><path d="M' + pts.join(' L') + ' Z"/></svg>';
  }

  /* Napoleon's tall horse: one scribble spanning two cells. */
  function svgHorse(i) {
    var r = jit(i, 61, 3);
    return '<svg viewBox="0 0 100 200" class="horse-svg" style="transform:rotate(' + r + 'deg)">' +
      '<g class="horse-strokes">' +
      '<path d="M58 42 C 50 30, 58 16, 72 14 C 84 12, 90 22, 84 30 C 80 36, 72 34, 66 40"/>' + // head
      '<path d="M70 15 L 76 4 M78 17 L 86 8"/>' +                                              // ears
      '<circle cx="74" cy="22" r="2.4" class="horse-eye"/>' +
      '<path d="M62 40 C 48 58, 44 84, 46 116"/>' +                                            // neck/back
      '<path d="M46 116 C 38 142, 46 158, 62 158 C 74 158, 80 148, 78 132"/>' +                // body
      '<path d="M50 156 L 45 192 M60 158 L 59 194 M70 156 L 74 192"/>' +                       // legs
      '<path d="M78 134 C 90 140, 92 158, 84 170"/>' +                                         // tail
      '<path d="M60 44 C 54 60, 52 76, 52 92" class="horse-mane"/>' +
      '</g></svg>';
  }

  var ELEM_BADGE = { fire: '🔥', ice: '❄️', bolt: '⚡' };

  function cellContent(G, cell, i) {
    var html = '';
    if (cell.smudge > 0) {
      html += svgSmudge(i) + '<span class="smudge-count">' + cell.smudge + '</span>';
    }
    if (cell.boltMark) html += '<span class="bolt-warn">⚡</span>';
    if (cell.mark === 'X') {
      html += svgX(i, cell.bled ? 'bled' : '');
      if (cell.shield) html += '<span class="shield-badge">⚓</span>';
    }
    if (cell.mark === 'O') {
      if (cell.horse) {
        html += cell.horsePart === 'head' ? svgHorse(i) : '';
      } else {
        html += svgO(i, cell.elem ? 'elem-' + cell.elem : '');
        if (cell.elem) html += '<span class="elem-badge">' + ELEM_BADGE[cell.elem] + '</span>';
      }
    }
    return html;
  }

  function drawBoard(G, ui) {
    var board = $('#board');
    board.style.setProperty('--n', G.size);
    var marginArmed = G.marginUnlocks > 0;
    // pencil frame around the inner board (ring tracks are .55fr each)
    var total = G.size + 1.1;
    var off = (0.55 / total * 100).toFixed(3) + '%';
    var span = (G.size / total * 100).toFixed(3) + '%';
    var html = '<div id="board-frame" style="left:' + off + ';top:' + off + ';width:' + span + ';height:' + span + '"></div>';
    for (var i = 0; i < G.cells.length; i++) {
      var cell = G.cells[i];
      var cls = ['cell'];
      if (cell.margin) {
        cls.push('margin');
        if (marginArmed && !cell.mark) cls.push('armed');
        if (cell.mark) cls.push('margin-used');
      }
      if (cell.frozen > 0) cls.push('frozen');
      if (cell.justPlaced) cls.push('just-placed');
      if (ui && ui.highlight && ui.highlight.has(i)) cls.push('hi');
      if (ui && ui.peekCell === i) cls.push('peek-cell');
      html += '<div class="' + cls.join(' ') + '" data-i="' + i + '">' + cellContent(G, cell, i) +
        (ui && ui.peekCell === i ? '<span class="peek-mark">O?</span>' : '') + '</div>';
    }
    board.innerHTML = html;
    drawWinLine(G);
  }

  // ---------- winning line circle ----------
  function drawWinLine(G) {
    var svg = $('#overlay');
    svg.setAttribute('viewBox', '0 0 ' + G.W * 100 + ' ' + G.W * 100);
    if (!G.over || !G.over.line) { svg.innerHTML = ''; return; }
    var line = G.over.line;
    var a = line[0], b = line[line.length - 1];
    var x0 = (a.c + 1) * 100 + 50, y0 = (a.r + 1) * 100 + 50;
    var x1 = (b.c + 1) * 100 + 50, y1 = (b.r + 1) * 100 + 50;
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    var half = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)) / 2;
    var ang = Math.atan2(y1 - y0, x1 - x0);
    var rx = half + 44, ry = 42;
    var seed = a.r * 31 + a.c * 7;
    var pts = [];
    for (var t = -0.25; t <= Math.PI * 2 + 0.35; t += 0.22) {
      var wob = 1 + jit(seed, t * 9, 0.05);
      var ex = Math.cos(t) * rx * wob, ey = Math.sin(t) * ry * wob;
      pts.push((mx + ex * Math.cos(ang) - ey * Math.sin(ang)).toFixed(1) + ' ' +
               (my + ex * Math.sin(ang) + ey * Math.cos(ang)).toFixed(1));
    }
    svg.innerHTML = '<path class="pen-circle ' + (G.over.winner === 'P' ? 'pc-p' : 'pc-e') + '" d="M' + pts.join(' L') + '"/>';
    var p = svg.querySelector('path');
    var len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    p.getBoundingClientRect();
    p.style.transition = 'stroke-dashoffset .8s ease-in';
    p.style.strokeDashoffset = 0;
  }

  // ---------- chrome ----------
  function drawCandy(run) {
    var n = run.candy;
    var s = '';
    for (var i = 0; i < Math.min(n, 12); i++) s += '🍬';
    if (n > 12) s += ' +' + (n - 12);
    var html = '<span class="candy-pieces">' + (s || '💀') + '</span><span class="candy-count">× ' + n + '</span>';
    document.querySelectorAll('.candy-row').forEach(function (el) { el.innerHTML = html; });
  }

  function drawPageDots(run) {
    var html = '';
    for (var p = 1; p <= run.pagesPerNotebook; p++) {
      var cls = 'dot' + (p === run.page ? ' now' : p < run.page ? ' done' : '');
      html += '<span class="' + cls + '">' + (p === run.pagesPerNotebook ? '👑' : '') + '</span>';
    }
    $('#page-dots').innerHTML = html;
    $('#page-label').textContent = 'page ' + Math.min(run.page, run.pagesPerNotebook) + '/' + run.pagesPerNotebook;
  }

  function drawStickers(run, ui) {
    var row = $('#sticker-row');
    var html = '';
    for (var s = 0; s < Run.MAX_STICKERS; s++) {
      var id = run.stickers[s];
      if (id) {
        var st = Stickers.DB[id];
        var sel = ui && ui.stickerArmed === s ? ' armed' : '';
        var usable = ui && ui.canUseSticker ? ' usable' : '';
        html += '<div class="sticker' + sel + usable + '" data-s="' + s + '" title="' + st.text + '">' +
          '<span class="st-icon">' + st.icon + '</span><span class="st-name">' + st.name + '</span></div>';
      } else {
        html += '<div class="sticker empty">·</div>';
      }
    }
    row.innerHTML = html;
  }

  function drawUtensil(run, ui) {
    var el = $('#utensil-bar');
    if (!Run.canErase(run)) {
      el.innerHTML = '<span class="utensil-tag">' + (Run.bleeds(run) ? '🖋 pen — winners bleed through' : '✏️') + '</span>';
      return;
    }
    var mode = ui ? ui.utensilMode : 'draw';
    el.innerHTML =
      '<button class="mode-btn' + (mode === 'draw' ? ' on' : '') + '" data-mode="draw">✏️ draw X</button>' +
      '<button class="mode-btn' + (mode === 'erase' ? ' on' : '') + '" data-mode="erase">🧼 erase O</button>';
  }

  function bubble(text, opts) {
    opts = opts || {};
    var el = $('#student-bubble');
    if (!text) { el.classList.remove('show'); return; }
    el.innerHTML = text;
    el.classList.remove('show');
    el.getBoundingClientRect();
    el.classList.add('show');
    el.classList.toggle('special', !!opts.special);
  }

  function hint(text) { $('#turn-hint').textContent = text || ''; }

  function toast(msg) {
    var holder = $('#toast-holder');
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    holder.appendChild(el);
    setTimeout(function () { el.classList.add('gone'); }, 2400);
    setTimeout(function () { el.remove(); }, 3000);
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.toggle('active', s.id === id);
    });
  }

  function match(G, ui, run, foeName) {
    drawBoard(G, ui);
    drawCandy(run);
    drawPageDots(run);
    drawStickers(run, ui);
    drawUtensil(run, ui);
    $('#student-name').textContent = foeName;
    $('#subject-tag').textContent = Run.subject(run).periodEmoji + ' ' + Run.subject(run).title;
  }

  return {
    jit: jit, svgX: svgX, svgO: svgO, svgSmudge: svgSmudge, svgHorse: svgHorse,
    drawBoard: drawBoard, drawWinLine: drawWinLine,
    drawCandy: drawCandy, drawPageDots: drawPageDots, drawStickers: drawStickers, drawUtensil: drawUtensil,
    bubble: bubble, hint: hint, toast: toast, showScreen: showScreen, match: match,
  };
})();
