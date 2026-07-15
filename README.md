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

## Trinket catalog (37)

- **Common (5):** Teacher's Apple, Loose Change, Candy Wrapper, Gum, Sticker Star (every 4th X shielded).
- **Uncommon (12):** Fork (tear a square), Candycane (candy as indestructible X), Magnet,
  Compass (margin play), Laminator (every 5th X indestructible), Tooth Fairy, Vending Key,
  Piggy Bank, Seating Chart, Field Trip Form, Student ID (−1 prices), **Ballpoint Pen**
  (1×/page your placement bleeds through to the next page — a Stamp block bleeds whole).
- **Rare (12):** Study Guide (permanent peek), Stamp, Fountain Pen (auto-fills the middle
  of gap-2 pairs, chains), Math Quiz, Ruler, Allowance, Detention Slip, Mirror Tape,
  Juice Box, Cheat Sheet, Coupon Book (half prices).
- **Mythical (8):** Extra Credit (2 places/turn), Skipping Stone (X_X_X wins),
  Math Test, Connect-the-Dots (any connected blob wins), Principal's Phone (wipe all O's),
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

## Roadmap

### 🎫 TICKET: Trinket tiers & upgrading (Hades-style boons) — design, not yet built
Each trinket gains a **tier track** (base → Silver → Gold, or Lv.1→3): same effect,
bigger numbers — implemented as a per-copy `tier` that feeds the existing tagged-value
system before Quiz/Test (order: base → tier → Quiz +1 → Test ×2). Acquisition ideas
to explore: **Eddie's back room** (pay candy to upgrade one owned trinket), **duplicate
auto-merge** (picking a third copy fuses into tier-up — Balatro-negative vibes),
**boss-page stakes** (win the boss page *flawlessly* → free upgrade), and **upgrader
trinkets** (mythical: "Red Pen — grades one random trinket up a tier each notebook").
Rarity stays what a trinket *is*; tier is what you've *made* of it. UI: chip gains a
silver/gold underline + roman numeral. Needs balance pass: tiered every-Nth trinkets
must clamp (already min 1).

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
