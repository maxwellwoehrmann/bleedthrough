# BLEEDTHROUGH

*A notebook roguelike. Tic-tac-toe, but the rules are written in pencil — and the page has two sides.*

**Prototype 0.1** — one full page (front + flipside) vs The Inkfiend, with a 40-card pool.

## Run it

Open `index.html` in any browser. No build step, no server, no dependencies.
Tests: `bun tests/run-tests.js` (or `node tests/run-tests.js`).

Touch-first layout — it already plays well in mobile Safari; the iPhone plan is a straight
Capacitor/PWA wrap of this same code.

---

## The core loop

Each turn (Fluxx economy):

1. **Draw 1** card (rules can change this).
2. **Play up to 1** card — **MARGIN cards are always free** and never count against your plays.
3. **Place your marks** by tapping the page. Base placement is a single ✗; Active cards
   upgrade your *next* placement (lines of 3–6, a 2×2 block, or Oxygel's split placement).

### Scoring — the shifting goalposts

- Finish a straight line (any of 8 directions) of **3+** of your marks and it scores
  **L × (L−2)** ink: `3→3, 4→8, 5→15, 6→24, 7→35, 8→48`.
- Scored lines get **circled in pen**. Circled ink is *permanent* — it can't be erased,
  and it can't score again. But **extending** a circled 3 into a 4 re-scores at the new
  length, so growing a line turn by turn out-earns one big drop (if nobody cuts you off).
- **Rule cards mutate what qualifies** for everyone: Odd Ink (odd lengths only),
  Short Circuit (≤4 only), Grand Lines (5+ only, ×3), Orthodox (no diagonals)…
  A 5-line under Short Circuit is worth *nothing*. The goalposts move mid-match.
- **First to the target (40 front / 30 flipside) wins.** Board jams solid → higher ink wins.

### Knockouts (the hybrid part)

- **THE SPIRAL** doodle: complete a *qualifying* line through it and you win instantly.
  Works for the enemy too. Spiral Doodle (card) lets you move it.
- **Sudden Death** (rule): any line of 6+ ends the match — qualifying or not.
- **Safety Scissors** (trinket): eats the first knockout against you.

### Doodle terrain

| doodle | effect |
|---|---|
| ★ star | +3 ink to a scored line through it |
| ☕ coffee ring | scored lines through it ×2 (either player) |
| 🌀 spiral | qualifying line through it = instant win |
| smudge | dead paper — nobody can place there |

### The flipside (the signature)

Lose the front of the page and you replay its **flipside**, mirrored horizontally.
What bled through depends on how the front ended:

- **Circled ink (anyone's) → smudges.** Heavy ink kills the paper. The winner's scoring
  structure becomes dead terrain — their victory flattens into obstacles.
- **Your loose, uncircled marks → your ghosts.** Place on your own ghost for +1 ink.
- **Ink Spill** (card): a 3×3 you doused on the front starts as your real marks.
- **Press Hard** (card): marks placed that turn bleed as real marks.
- **Carbon Paper** (trinket): copies of 2 Actives you played on the front come back.
- **Heavy Paper** (rule): nothing bleeds. Cardstock. Ruthless.

**The arbitrage:** a losing front full of loose marks is *better flipside soil* than a
winning front full of circled ink. Playing to lose well is a real strategy — hold the
👁 button to peek through the paper and see the projection live. Trinkets live on the
desk, not the page — they persist across the flip.

**Flipside Pact** (goal card): the page can only be *won* on the flipside; the front
becomes pure prep (front's winner starts the flip with +8 ink).

Win the front outright and the page clears — you can still flip it for a bonus round.

### The enemy

**The Inkfiend** telegraphs its next move (Slay-the-Spire intents) — except its signature
**INKSPLOSION** opener (a plus-shaped blast of 5 marks), which fires unannounced on turn 2.
The **Magnifying Glass** trinket reveals surprises. It plays erasers at your best loose
mark, smudges the cell you most want, and runs a **Blue Blood** trinket you can steal
with Five-Finger Discount (unless… Grippy Glove).

### After the match: sticker packs

Win or lose, the page-flip moment opens a **pick-1-of-3 draft** from the 25-card pool —
the seed of the Balatro-style shop (see roadmap).

---

## Card pool (40)

**Actives** — Slash (line 3), Long Stroke (4), Longer Stroke (5), The Yardstick (6),
Fat Marker (2×2 block), Oxygel (split placement), Eraser (smudges), White-Out (clean strip),
Scribble, Undo, Star Sticker, Coffee Break, Spiral Doodle, Ink Spill, Press Hard,
Five-Finger Discount.

**Rules** — Double Down (all placement lengths ×2), Odd Ink, Short Circuit, Grand Lines,
Sudden Death, Ink Tax, Diagonal Pride, Orthodox, Overdraw, Frenzy, Heavy Paper.

**Trinkets** (stealable) — Japanese Eraser (clean-erases diagonally adjacent enemy marks
when you place), Lucky Coin, Compass, Grippy Glove, Safety Scissors, Magnifying Glass,
Carbon Paper, Blue Blood (enemy's).

**Goals** — Quick Draw (target 25), Marathon (target 60), Flipside Pact.

**Margin** (free plays) — Post-It Ambush (+1 mark now), Sneaky Peek, Double Take
(placement resolves twice).

---

## Roadmap (designed, not yet built)

- **The notebook map**: pages are rooms laid out as a spiral-bound spread. You may
  **reorder one or two pages** before committing a route.
- **Page adjacency**: cards tagged *bleed* affect the neighboring page (ink soaks
  sideways through the paper stack, not just front-to-back).
- **The boss — "The Deadline"**: challengeable early from any page. Bounce off it,
  re-order your remaining pages to prep bleedthrough into the boss fight, re-challenge.
- **The School Store** (between pages): Balatro-style shop — sticker packs (pick 1 of 3),
  single cards, a trinket shelf, and "tear out a page" (card removal). Currency: **ink
  drops**, earned by margin of victory and flashy lines.
- **More enemies**: The Doodler (terrain spam), Hall Monitor (rules lawyer — plays
  Orthodox/Ink Tax/Short Circuit), Wite-Out Wraith (erasure heavy).
- Sound (pencil scratch, page turn), run persistence, difficulty curves.

## Code layout

```
index.html        shell + screens
css/style.css     the whole notebook aesthetic
js/engine.js      board, runs, scoring, rules, shapes  (pure logic, tested)
js/cards.js       the 40-card database                 (pure logic, tested)
js/enemy.js       Inkfiend AI: script, intents, heuristics
js/flipside.js    bleedthrough projection + flipside builder
js/render.js      all DOM: hand-drawn SVG marks, pen circles, cards, fx
js/main.js        game flow + interaction state machine
tests/run-tests.js  34 engine tests (bun/node)
```
