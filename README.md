# BLEEDTHROUGH

*A school-day tic-tac-toe roguelike. Every class is a notebook. Every notebook ends in a boss. Candy is your life — spend it wisely, in a bathroom.*

**Prototype 0.2 — "The School Day"** · Play: https://maxwellwoehrmann.github.io/bleedthrough/

## Run it

Open `index.html` in any browser (or the hosted link above). No build step, no server.
Tests: `bun tests/run-tests.js`.

---

## The school day

Your schedule is a **random order of subjects** — each class period is one notebook and
one level. Each notebook is **10 pages** of tic-tac-toe against a single student who is
*very* well-versed in the subject. On the **final page they transform into the subject's
boss** (the History kid becomes **Napoleon**; the Mythology kid becomes **Zeus**).

- **Level 1 = 4×4 board, 4-in-a-row to win.** Every level adds one row and column
  (level 2 = 5×5, five in a row, etc.).
- Normal pages march on win or lose — the class period waits for no one. The **boss must
  be beaten** to reach the next period.

### Candy = life

- Start with **5 candy**. Win a page: **+1**. Lose a page: **−2**. Draw: nothing.
- Hit **0 and the run ends**. Shopping spends the same candy you live on.

### Your utensil (choose at the start)

| | |
|---|---|
| ✏️ **Pencil** | Each turn: draw an X **or** erase an O (leaves a smudge nobody can use for 2 turns). |
| 🖋 **Pen** | X's only — but when you win a page, your **final X bleeds through** to the next page. |

### Sticky notes (consumables, max 3)

Bought only in **the bathroom stall** — one visit per notebook, one purchase per visit,
and Eddie won't take your last candy. The 5-note offer is randomized; prices scale with
power (Corner Peek 1 🍬 → Hall Pass / Fire Drill 5 🍬). Using a note never costs your turn.
Current pool: Corner Peek, Smudge Bomb, Pink Eraser, Anchor Sticker, Art-Gum Eraser,
Two-fer, Margin Note (place an X *outside* the board — it counts), Hall Pass, Fire Drill.

> "I… gotta go to the bathroom."

### Bosses telegraph

Before a special move the boss **announces it in dialogue** ("Watch out for my special
move!"), so you can brace:

- **Napoleon** (History): the **Tall Horse** — an O that gallops in and takes **two
  vertical squares** at once. Erase either half to shoo the whole horse.
  Mid-notebook, the student also digs **trenches** (timed smudges on squares you want).
- **Zeus** (Mythology): marks two of your X's with ⚡ on the telegraph turn, then the
  **Thunderbolt** scorches them to smudges. The student version plays **elemental O's**
  all notebook: 🔥 fire (burns an adjacent X), ❄️ ice (freezes nearby squares for a turn),
  ⚡ lightning (can land on smudges).

### Boss rewards (permanent trinkets, pick 1 of 2)

- 🖊 **Erasable Pen** — pen + pencil combined: place or erase, and winners still bleed through.
- ↔ **Double-Spaced** — your lines may skip one square; the gap still counts.
- 🍱 **Spare Lunchbox** — +2 candy at the start of every class.

---

## Design decisions (tunable)

- Starting candy 5; shop won't let you drop below 1.
- Draws advance the page (no candy); boss draws retry.
- Boss goes first on the boss page.
- The Double-Spaced gap must be interior to the line, empty, and unsmudged.
- Student AI fumbles ~34% of moves on page 1, sharpening to ~6% by page 9; bosses ~2%.

## Roadmap

- More periods: Math (geometry-warping O's), Gym (dodgeball erasure), Chemistry
  (reacting elements), Lunch (secret bonus level).
- More trinkets, more sticky notes, Eddie price haggling.
- Sound (pencil scratch, bell, toilet flush), run stats, iPhone wrap (Capacitor/PWA).

## Code layout

```
index.html          screens
css/style.css       notebook + bathroom aesthetic
js/engine.js        board, margin ring, win/gap detection, smudge/freeze, horse  (tested)
js/run.js           school day: candy, utensils, trinkets, levels               (tested)
js/stickers.js      sticky-note pool + shop offers                              (tested)
js/subjects.js      subjects, bosses, gimmick tuning, ALL the dialogue
js/ai.js            student AI: win/block/heuristic + gimmicks + telegraphs     (tested)
js/render.js        DOM: hand-drawn marks, the horse doodle, bubbles, stall
js/main.js          flow: covers -> pages -> transform -> boss -> reward
tests/run-tests.js  31 tests (bun/node)
```

*(v0.1 — the card-battler "ink race" prototype — lives in git history before this commit.)*
