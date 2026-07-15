/* ============================================================
   BLEEDTHROUGH v0.3 — render.js
   All DOM. Hand-drawn marks, subject token doodles, tears,
   webs, the trinket shelf, dialogue, the stall.
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

  function svgCandy(i) {
    return '<svg viewBox="0 0 100 100" class="glyph glyph-candy" style="transform:rotate(' + jit(i, 15, 20) + 'deg)">' +
      '<circle cx="50" cy="50" r="22" class="candy-body"/>' +
      '<path class="candy-wrap" d="M28 50 L8 36 L14 50 L8 64 Z"/>' +
      '<path class="candy-wrap" d="M72 50 L92 36 L86 50 L92 64 Z"/>' +
      '<path class="candy-swirl" d="M38 44 Q 50 36 62 44 M36 56 Q 50 64 64 56"/></svg>';
  }

  function svgTear(i) {
    var pts = [];
    for (var t = 0; t < Math.PI * 2; t += 0.45) {
      var rad = 38 * (1 + jit(i, 71 + t * 5, 0.3));
      pts.push((50 + Math.cos(t) * rad).toFixed(1) + ' ' + (50 + Math.sin(t) * rad * 0.9).toFixed(1));
    }
    return '<svg viewBox="0 0 100 100" class="doodle doodle-tear"><path d="M' + pts.join(' L') + ' Z"/></svg>';
  }

  function svgHorse(i) {
    return '<svg viewBox="0 0 100 200" class="token-svg span-v2" style="transform:rotate(' + jit(i, 61, 3) + 'deg)">' +
      '<g class="tok ink">' +
      '<path d="M58 42 C 50 30, 58 16, 72 14 C 84 12, 90 22, 84 30 C 80 36, 72 34, 66 40"/>' +
      '<path d="M70 15 L 76 4 M78 17 L 86 8"/>' +
      '<circle cx="74" cy="22" r="2.4" class="fill"/>' +
      '<path d="M62 40 C 48 58, 44 84, 46 116"/>' +
      '<path d="M46 116 C 38 142, 46 158, 62 158 C 74 158, 80 148, 78 132"/>' +
      '<path d="M50 156 L 45 192 M60 158 L 59 194 M70 156 L 74 192"/>' +
      '<path d="M78 134 C 90 140, 92 158, 84 170"/>' +
      '</g></svg>';
  }

  function svgSword(i) {
    return '<svg viewBox="0 0 300 100" class="token-svg span-h3" style="transform:rotate(' + jit(i, 62, 2) + 'deg)">' +
      '<g class="tok steel">' +
      '<path d="M20 50 L 225 46 L 250 50 L 225 54 Z" class="fill-light"/>' +
      '<path d="M20 50 L 225 46 L 250 50 L 225 54 Z"/>' +
      '<path d="M225 30 L 228 70"/>' +
      '<path d="M228 50 L 275 52"/>' +
      '<circle cx="284" cy="52" r="7"/>' +
      '</g></svg>';
  }

  function svgTrident(i) {
    return '<svg viewBox="0 0 100 300" class="token-svg span-v3" style="transform:rotate(' + jit(i, 63, 2) + 'deg)">' +
      '<g class="tok ink">' +
      '<path d="M50 60 L 50 270"/>' +
      '<path d="M30 55 C 28 30, 32 18, 30 10 M50 60 L 50 12 M70 55 C 72 30, 68 18, 70 10"/>' +
      '<path d="M30 42 Q 50 58 70 42"/>' +
      '<path d="M26 10 L 34 16 M46 8 L 54 14 M66 10 L 74 16"/>' +
      '</g></svg>';
  }

  function svgSnake(i) {
    return '<svg viewBox="0 0 300 100" class="token-svg span-h3" style="transform:rotate(' + jit(i, 64, 2) + 'deg)">' +
      '<g class="tok bio">' +
      '<path d="M15 55 C 50 20, 90 85, 135 50 C 180 18, 215 80, 255 52 C 268 44, 276 44, 282 48"/>' +
      '<circle cx="278" cy="45" r="3" class="fill"/>' +
      '<path d="M288 48 L 298 44 M288 48 L 298 52"/>' +
      '</g></svg>';
  }

  function svgMouse(i) {
    return '<svg viewBox="0 0 100 100" class="glyph" style="transform:rotate(' + jit(i, 65, 14) + 'deg)">' +
      '<g class="tok bio">' +
      '<path d="M30 62 C 26 46, 40 34, 56 36 C 72 38, 80 50, 76 60 C 72 70, 40 72, 30 62 Z"/>' +
      '<circle cx="38" cy="42" r="8"/><circle cx="56" cy="34" r="6"/>' +
      '<circle cx="70" cy="52" r="2" class="fill"/>' +
      '<path d="M28 64 C 14 70, 10 82, 18 88"/>' +
      '<path d="M78 58 L 90 56 M78 62 L 90 64"/>' +
      '</g></svg>';
  }

  function svgSpider(i) {
    return '<svg viewBox="0 0 100 100" class="glyph" style="transform:rotate(' + jit(i, 66, 10) + 'deg)">' +
      '<g class="tok bio">' +
      '<circle cx="50" cy="52" r="14"/><circle cx="50" cy="34" r="8"/>' +
      '<path d="M38 46 C 24 40, 18 32, 14 24 M38 54 C 24 54, 16 58, 10 64 M40 62 C 30 70, 26 78, 24 86"/>' +
      '<path d="M62 46 C 76 40, 82 32, 86 24 M62 54 C 76 54, 84 58, 90 64 M60 62 C 70 70, 74 78, 76 86"/>' +
      '</g></svg>';
  }

  function svgSandal(i) {
    return '<svg viewBox="0 0 100 100" class="glyph" style="transform:rotate(' + jit(i, 67, 12) + 'deg)">' +
      '<g class="tok gold">' +
      '<ellipse cx="50" cy="60" rx="26" ry="14"/>' +
      '<path d="M36 56 Q 50 40 64 56"/>' +
      '<path d="M26 52 C 14 44, 10 34, 16 26 M30 46 C 22 40, 20 32, 24 26"/>' +
      '</g></svg>';
  }

  function svgApple(i) {
    return '<svg viewBox="0 0 100 100" class="glyph" style="transform:rotate(' + jit(i, 68, 8) + 'deg)">' +
      '<g class="tok red">' +
      '<path d="M50 36 C 30 24, 16 40, 22 60 C 26 76, 40 84, 50 78 C 60 84, 74 76, 78 60 C 84 40, 70 24, 50 36 Z"/>' +
      '<path d="M50 34 C 50 26, 54 20, 60 16"/>' +
      '<path d="M58 22 C 66 16, 74 18, 76 24 C 70 28, 62 28, 58 22 Z" class="leaf"/>' +
      '</g></svg>';
  }

  function svgWeb(i) {
    return '<svg viewBox="0 0 100 100" class="doodle doodle-web">' +
      '<path d="M2 2 L 50 50 M50 2 L 50 50 M98 2 L 50 50 M2 50 L 50 50 M98 50 L 50 50" />' +
      '<path d="M26 14 Q 34 26 26 38 M50 20 Q 58 30 66 22 M20 34 Q 32 42 30 54" /></svg>';
  }

  function cellContent(G, cell, i) {
    var html = '';
    if (cell.torn) return svgTear(i);
    if (cell.web > 0) html += svgWeb(i);
    if (cell.boltMark) html += '<span class="warn-badge">⚡</span>';
    if (cell.appleMark) html += '<span class="warn-badge">🍎</span>';
    if (cell.mark === 'X') {
      html += cell.kind === 'candy' ? svgCandy(i) : svgX(i, cell.pressed ? 'pressed' : cell.bledIn ? 'bled' : '');
      if (cell.shield) html += '<span class="mini-badge b-shield">⭐</span>';
      if (cell.laminated) html += '<span class="mini-badge b-lam">💳</span>';
      if (cell.rooted) html += '<span class="mini-badge b-root">🌱</span>';
      if (cell.pressed) html += '<span class="mini-badge b-press">🖊</span>';
    } else if (cell.mark === 'O' || cell.mark === 'B') {
      var k = cell.kind;
      if (!k) html += svgO(i);
      else if (k === 'mouse') html += svgMouse(i);
      else if (k === 'spider') html += svgSpider(i);
      else if (k === 'sandal') html += svgSandal(i);
      else if (k === 'apple') html += svgApple(i);
      else if (k === 'horse') html += cell.part === 0 ? svgHorse(i) : '';
      else if (k === 'sword') html += cell.part === 0 ? svgSword(i) : '';
      else if (k === 'trident') html += cell.part === 0 ? svgTrident(i) : '';
      else if (k === 'snake') html += cell.part === 0 ? svgSnake(i) : '';
    }
    return html;
  }

  /* SVG coords: margin tracks are 55 units, inner cells 100. */
  function vbW(G) { return G.cols * 100 + 110; }
  function vbH(G) { return G.rows * 100 + 110; }
  function cellCX(G, c) { return c < 0 ? 27.5 : c >= G.cols ? G.cols * 100 + 82.5 : 55 + c * 100 + 50; }
  function cellCY(G, r) { return r < 0 ? 27.5 : r >= G.rows ? G.rows * 100 + 82.5 : 55 + r * 100 + 50; }

  function gridSVG(G) {
    var s = '<svg class="grid-svg" viewBox="0 0 ' + vbW(G) + ' ' + vbH(G) + '" preserveAspectRatio="none">';
    for (var c = 1; c < G.cols; c++) {
      var x = 55 + c * 100;
      s += '<line class="grid-line" x1="' + x + '" y1="55" x2="' + x + '" y2="' + (55 + G.rows * 100) + '"/>';
    }
    for (var r = 1; r < G.rows; r++) {
      var y = 55 + r * 100;
      s += '<line class="grid-line" x1="55" y1="' + y + '" x2="' + (55 + G.cols * 100) + '" y2="' + y + '"/>';
    }
    s += '<rect class="grid-frame" x="55" y="55" width="' + (G.cols * 100) + '" height="' + (G.rows * 100) + '"/>';
    return s + '</svg>';
  }

  function drawBoard(G, ui) {
    var board = $('#board');
    board.style.setProperty('--nc', G.cols);
    board.style.setProperty('--nr', G.rows);
    var ar = (G.cols + 1.1) / (G.rows + 1.1);
    board.style.aspectRatio = (G.cols + 1.1) + ' / ' + (G.rows + 1.1);
    $('#board-wrap').style.maxWidth = 'min(100%, calc(56dvh * ' + ar.toFixed(3) + '))';

    var html = gridSVG(G);

    var marginArmed = G.marginUnlocks > 0;
    for (var i = 0; i < G.cells.length; i++) {
      var cell = G.cells[i];
      var cls = ['cell'];
      if (cell.margin) {
        cls.push('margin');
        if (marginArmed && !cell.mark && !cell.torn) cls.push('armed');
      }
      if (cell.web > 0) cls.push('webbed');
      if (cell.justPlaced) cls.push('just-placed');
      if (ui && ui.highlight && ui.highlight.has(i)) cls.push('hi');
      if (ui && ui.peekCell === i) cls.push('peek-cell');
      html += '<div class="' + cls.join(' ') + '" data-i="' + i + '">' + cellContent(G, cell, i) +
        (ui && ui.peekCell === i ? '<span class="peek-mark">O?</span>' : '') + '</div>';
    }
    board.innerHTML = html;
    drawWinLine(G);
  }

  function drawWinLine(G) {
    var svg = $('#overlay');
    svg.setAttribute('viewBox', '0 0 ' + vbW(G) + ' ' + vbH(G));
    if (!G.over || !G.over.line || !G.over.line.length) { svg.innerHTML = ''; return; }
    var line = G.over.line;
    var a = line[0], b = line[line.length - 1];
    var x0 = cellCX(G, a.c), y0 = cellCY(G, a.r);
    var x1 = cellCX(G, b.c), y1 = cellCY(G, b.r);
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    var half = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)) / 2;
    var ang = Math.atan2(y1 - y0, x1 - x0);
    var rx = half + 46, ry = 44;
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
    for (var i = 0; i < Math.min(n, 10); i++) s += '🍬';
    if (n > 10) s += '…';
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

  /* The trinket shelf: grouped chips, actives show charges. */
  function drawShelf(run, ui, charges) {
    var shelf = $('#shelf');
    var seen = {}, order = [];
    run.trinkets.forEach(function (id) {
      if (!seen[id]) { seen[id] = 0; order.push(id); }
      seen[id]++;
    });
    // actives first
    order.sort(function (a, b) {
      return (Trinkets.DB[a].active ? 0 : 1) - (Trinkets.DB[b].active ? 0 : 1);
    });
    var html = order.map(function (id) {
      var t = Trinkets.DB[id];
      var cls = ['chip', 'r-' + t.rarity];
      var chargeHtml = '';
      if (t.active || id === 'candycane') {
        var left = charges && charges[id] !== undefined ? charges[id] : 0;
        if (id === 'candycane') {
          cls.push('active-chip');
          if (ui && ui.candyMode) cls.push('armed');
        } else {
          cls.push('active-chip');
          if (left > 0) cls.push('charged'); else cls.push('spent');
          if (ui && ui.armed === id) cls.push('armed');
          chargeHtml = '<span class="chip-charges">' + left + '</span>';
        }
      }
      var cnt = seen[id] > 1 ? '<span class="chip-count">×' + seen[id] + '</span>' : '';
      return '<div class="' + cls.join(' ') + '" data-t="' + id + '" title="' + t.name + ': ' + Trinkets.text(run, id) + '">' +
        '<span class="chip-icon">' + t.icon + '</span>' + cnt + chargeHtml + '</div>';
    }).join('');
    shelf.innerHTML = html || '<span class="shelf-empty">no trinkets yet — win some boards</span>';
  }

  function trinketCardHTML(run, id, extra) {
    var t = Trinkets.DB[id];
    return '<div class="trinket-card r-' + t.rarity + (extra ? ' ' + extra : '') + '" data-t="' + id + '">' +
      '<div class="tk-rarity">' + t.rarity + '</div>' +
      '<div class="tk-icon">' + t.icon + '</div>' +
      '<div class="tk-name">' + t.name + '</div>' +
      '<div class="tk-text">' + Trinkets.text(run, id) + '</div>' +
      '<div class="tk-flavor">' + (t.flavor || '') + '</div></div>';
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

  function match(G, ui, run, foeName, charges) {
    drawBoard(G, ui);
    drawCandy(run);
    drawPageDots(run);
    drawShelf(run, ui, charges);
    $('#student-name').textContent = foeName;
    $('#subject-tag').textContent = Run.subject(run).periodEmoji + ' ' + Run.subject(run).title;
    document.body.classList.toggle('gravity-page', !!G.gravity);
  }

  return {
    jit: jit, svgX: svgX, svgO: svgO,
    drawBoard: drawBoard, drawWinLine: drawWinLine,
    drawCandy: drawCandy, drawPageDots: drawPageDots, drawShelf: drawShelf,
    trinketCardHTML: trinketCardHTML,
    bubble: bubble, hint: hint, toast: toast, showScreen: showScreen, match: match,
  };
})();
