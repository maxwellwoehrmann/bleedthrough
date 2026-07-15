# BLEEDTHROUGH

*A school-day tic-tac-toe roguelike. Collect trinkets. Stack trinkets. Become a problem.*

**Prototype 0.3 — "The Trinket Engine"** · Play: https://maxwellwoehrmann.github.io/bleedthrough/

## Run it

Open `index.html` in any browser (or the hosted link). No build step.
Tests: `bun tests/run-tests.js` (39 tests).

---

## The loop

Your school day is **4 class periods in random order** — History, Greek Mythology,
Biology, Physics. Each period is a **5-page notebook** against one student; **page 5
they transform into the subject's boss**. Boards grow each notebook (4×4 win-4 →
6×6 win-5 → 8×8 win-5 → 9×9 win-6). Boards don't have to be square: **Physics
notebooks are taller than wide and have GRAVITY** — every X and O falls to the bottom
of its column (torn squares act as shelves).

- **Start each notebook: pick 1 of 3 uncommon trinkets** from your locker.
- **Win a page: pick 1 of 3 trinkets** (weighted 50/30/15/5 common→mythical).
- **Beat the boss: their signature mythical** (or a rare alternative).
- **No trinket cap. Duplicates stack.** By 4th period you should feel illegal.
- Candy = life: start 5, **+1 per win, −2 per loss**, 0 = run over.
- **The Stall** (Sticky-Fingers Eddie): trinkets priced by rarity (2/4/7/12 🍬),
  one purchase per visit, one visit per notebook (Vending Key adds more), and he
  never takes your last candy.

## The math trinkets

Every trinket number is **tagged data with an improvement direction**, so:

- **Math Quiz** (rare): every number improves by 1 — Teacher's Apple +1→+2,
  Stamp every-3rd→every-**2nd** and 2×2→**3×3**.
- **Math Test** (mythical): every number doubles, **applied after the Quiz**.
  Quiz + Test turns Stamp into *every placement is a 6×6 block*. This is intentional.

## Trinket catalog (39)

- **Common (5):** Teacher's Apple, Loose Change, Candy Wrapper, Gum, Sticker Star (every 4th X shielded).
- **Uncommon (12):** Fork (tear a square), Candycane (candy as indestructible X), Magnet,
  Compass (margin play), Laminator (every 5th X indestructible), Tooth Fairy, Vending Key,
  Piggy Bank, Seating Chart, Field Trip Form, Student ID (−1 prices), **Ballpoint Pen**
  (1×/page your placement bleeds through to the next page — a Stamp block bleeds whole).
- **Rare (13):** Study Guide (permanent peek), Stamp, Fountain Pen (auto-fills the middle
  of gap-2 pairs, chains), Math Quiz, Ruler, Allowance, Detention Slip, Mirror Tape,
  Juice Box, Cheat Sheet, Coupon Book (half prices), Tutor (new trinkets arrive graded).
- **Mythical (9):** Extra Credit (2 places/turn), Skipping Stone (X_X_X wins),
  Math Test, Connect-the-Dots (any connected blob wins), Principal's Phone (wipe all O's),
  Red Pen (grades a random trinket up each notebook),
  and the **boss signatures**: Bicorne Hat (History — 2×1 X cavalry), Stolen Thunder
  (Greek — electrified X sprouts diagonals), Beanstalk (Biology — rooted X grows every
  turn), Chain Reaction (Physics — bridging two 3-chains tears the whole column out).

## The subjects

| period | student → boss | tokens & gimmick |
|---|---|---|
| 🏛 History | Norm → **Napoleon** | Horses (2 squares, count as O), swords (3 squares, block BOTH players). Boss: telegraphed cavalry. |
| 🏺 Greek Myth | Zoe → **Zeus** | Hermes sandals (O's that move), Poseidon tridents (3 vertical). Boss: telegraphed thunderbolt marks 2 X's, destroys them. |
| 🧬 Biology | Bea → **Mother Nature** | Mice (scurry every turn), spiders (web squares), snakes (3 across). Boss: telegraphed STAMPEDE of mice. |
| 🍎 Physics | Newt → **Newton** | GRAVITY all notebook. Boss: telegraphed apple drop crushes your tallest stack. |

All bosses telegraph specials with dialogue ("Watch out for my special move!") one turn
ahead. Shields/lamination/candy resist destruction. No smudges or erasing in v0.3.

---

## Letter grades (v0.35)

Every numeric trinket has a **grade: C → B → A → A+** (per trinket type; duplicates
share it). Each grade is one improvement step on every number, applied
**base → grade → Math Quiz +1 → Math Test ×2**, so grades compound with the math
trinkets. Grades keep commons relevant late — an A+ Teacher's Apple is a 4th-period
economy engine. Rarity is what a trinket *is*; grade is what you've *made* of it.
Numberless trinkets (Fountain Pen, Mirror Tape, Connect-the-Dots…) can't be graded
yet — hand-authored grade effects for those are phase 2.

Four ways to grade up:
1. **Eddie's back room** (in the stall): pay 3/6/10 🍬 to re-grade one trinket.
   Counts as your one transaction; Student ID and Coupon Book discounts apply.
2. **Fuse duplicates**: picking a trinket you already own offers a choice — take
   the copy (stacks still stack) or fuse it into a grade-up.
3. **Flawless notebook**: beat the boss without losing a single page that notebook
   → free grade-up of your choice.
4. **Upgrader trinkets**: 🎓 **Tutor** (rare — new trinkets arrive a grade higher,
   stacks) and 🖍 **Red Pen** (mythical — grades a random trinket up every notebook).

**Phase 2 — every numberless trinket has a hand-authored grade track** (shown as
★ lines on its card as you earn them):

| trinket | B | A | A+ |
|---|---|---|---|
| Fountain Pen | bridges 2-square gaps | 3-square | 4-square |
| Mirror Tape | first 2 placements mirror | first 3 | first 4 |
| Cheat Sheet | 2 free starting X's | 3 | 4 |
| Study Guide | student fumbles +10% | +20% (bosses too) | +30% |
| Seating Chart | conceding first move: +1 X on turn 1 | turns 1–2 | turns 1–3 |
| Skipping Stone | gaps may sit on tears | gaps two squares wide | gaps on ENEMY marks |
| Connect-the-Dots | diagonals connect | blob needs 1 fewer X | 2 fewer |
| Math Quiz | improves numbers by 2 | by 3 | by 4 |
| Math Test | doubles twice (×4) | ×8 | ×16 |

## Roadmap

- More subjects (Math, Gym, Chemistry, Lunch), more trinkets (goal: 60+).
- Sound (pencil scratch, bell, toilet flush, thunk of apple).
- Run stats & seed sharing; iPhone wrap (Capacitor/PWA).

## Code layout

```
index.html          screens
css/style.css       notebook + stall aesthetic, rarity glows, token art colors
js/engine.js        rect boards, gravity, tears, webs, tokens, 3 win modes   (tested)
js/trinkets.js      37-trinket catalog + tagged-value math (Quiz/Test)       (tested)
js/run.js           school day: candy, notebooks, prices, rewards           (tested)
js/subjects.js      4 subjects, tokens config, bosses, ALL the dialogue
js/ai.js            student AI + tokens + movers + telegraphed specials     (tested)
js/render.js        DOM: marks, token doodles, SVG grid, shelf, stall
js/main.js          flow + trinket pipeline (stamp/mirror/pen/chain/bleed)
tests/run-tests.js  39 tests (bun/node)
```

*(v0.1 card-battler and v0.2 utensil build live in git history.)*
