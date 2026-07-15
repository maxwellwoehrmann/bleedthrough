/* ============================================================
   BLEEDTHROUGH v0.3 — subjects.js
   Four notebooks, randomized per run. Each student places
   specialized tokens for their subject; each boss has a
   telegraphed special and drops a signature mythical trinket.
   ============================================================ */

var Subjects = (function () {

  var ALL = {

    history: {
      id: 'history', title: 'History', periodEmoji: '🏛',
      student: 'Norm', boss: 'Napoleon',
      bossTitle: 'NAPOLEON, EMPEROR OF THE BOARD',
      signature: 'bicorneHat',
      gimmick: {
        tokens: [
          { kind: 'horse', prob: 0.14, fromPage: 2, bossProb: 0.2 },
          { kind: 'sword', prob: 0.12, fromPage: 3, bossProb: 0.25, minCols: 6 },
        ],
        boss: { type: 'horse', cadence: 3 },
      },
      dialogue: {
        intro: [
          'Norm adjusts his glasses. "Those who don\'t study tic-tac-toe are doomed to repeat it."',
          '"I\'ve annotated every game we\'re about to play. In advance. In Latin."',
        ],
        pageStart: [
          '"Fresh page. Like the Treaty of Westphalia — everything resets."',
          '"Rome wasn\'t built in a day, but this game will take like four minutes."',
          '"I studied Hannibal\'s tactics. No elephants allowed in class. I adapted."',
        ],
        studentWins: [
          '"A decisive victory. Textbook. Literally — I\'ll show you the textbook."',
          '"I\'m going to partition your side of the board like Poland."',
          '"Veni, vidi, vici, buddy."',
        ],
        studentLoses: [
          '"History is written by the victors. This page is FAKE NEWS."',
          '"A tactical retreat. Ask the French — it\'s a whole thing."',
        ],
        draw: [
          '"A stalemate. How very Cold War of us."',
        ],
        token: [
          '"The cavalry has arrived!" A horse takes TWO squares. 🐎',
          '"En garde!" A sword slams across the page, blocking THREE squares. ⚔️',
        ],
        transform: [
          'The bell tolls. Norm stands on his desk. A bicorne hat unfolds from his backpack with a snap.',
          '"Final page. Class is no longer in session. I AM HISTORY ITSELF."',
        ],
        bossIntro: [
          '"Bonjour. I am NAPOLEON. I am not short — this board is simply too tall."',
        ],
        preSpecial: [
          '"Watch out for my special move! The CAVALRY arrives next turn!" 🐎',
          '"Prepare yourself! My cavalry charges next turn! Vive l\'Empereur!" 🐎',
        ],
        specialDone: [
          'A tall horse gallops onto the page, seizing TWO squares. "Magnifique."',
        ],
        bossDefeat: [
          'Napoleon stares at the board. "Exile. Again. It is always exile." He hands you his hat with great dignity.',
        ],
        retry: [
          '"Back for more? Even Waterloo had a sequel. It did not go better."',
        ],
      },
    },

    greek: {
      id: 'greek', title: 'Greek Mythology', periodEmoji: '🏺',
      student: 'Zoe', boss: 'Zeus',
      bossTitle: 'ZEUS, GOD OF POP QUIZZES',
      signature: 'stolenThunder',
      gimmick: {
        tokens: [
          { kind: 'sandal', prob: 0.16, fromPage: 1, bossProb: 0.2 },
          { kind: 'trident', prob: 0.12, fromPage: 3, bossProb: 0.2, minRows: 6 },
        ],
        boss: { type: 'bolt', cadence: 3, boltCount: 2 },
      },
      dialogue: {
        intro: [
          'Zoe doesn\'t look up from her book. "Fair warning: I main gods."',
          '"Every myth starts with a mortal thinking they can win a board game."',
        ],
        pageStart: [
          '"This page is my labyrinth. You are, respectfully, the snack."',
          '"Icarus flew too close to the sun. You\'re about to place too close to my trident."',
          '"Cassandra predicted this game. Nobody believed her. She predicted that too."',
        ],
        studentWins: [
          '"The Fates measured your line and CUT it. Snip snip."',
          '"That\'s not a loss. That\'s a Greek tragedy. There\'s a difference. It\'s prestige."',
        ],
        studentLoses: [
          '"Hubris. On my part. The gods punish that. Rude, since I work for them."',
          '"Even Achilles had a heel. Mine is apparently the entire board."',
        ],
        draw: [
          '"Sisyphus vibes. Same boulder tomorrow."',
        ],
        token: [
          'Hermes\' sandal skitters across the page — that O MOVES. 👟',
          'Poseidon\'s trident stabs down through THREE squares. 🔱',
        ],
        transform: [
          'Thunder rolls down the hallway. The fluorescent lights flicker gold. Zoe ascends her chair.',
          '"Final page, mortal. School\'s out. OLYMPUS IS IN."',
        ],
        bossIntro: [
          '"BEHOLD: ZEUS. God of thunder, sky, and unannounced quizzes."',
        ],
        preSpecial: [
          '"Watch out for my special move! The sky itself takes aim!" ⚡ (two squares are marked)',
          '"Tremble! My thunderbolt falls next turn — right where it\'s marked!" ⚡',
        ],
        specialDone: [
          'CRACK. Lightning takes the marked squares. The room smells like burnt homework.',
        ],
        bossDefeat: [
          'Zeus deflates back into a student mid-pose. "Whatever. Olympus has grade inflation anyway." Something clatters to the floor: his thunder. It\'s yours now.',
        ],
        retry: [
          '"Prometheus came back every day too. It went poorly for his liver."',
        ],
      },
    },

    biology: {
      id: 'biology', title: 'Biology', periodEmoji: '🧬',
      student: 'Bea', boss: 'Mother Nature',
      bossTitle: 'MOTHER NATURE, PTA PRESIDENT',
      signature: 'beanstalk',
      gimmick: {
        tokens: [
          { kind: 'mouse', prob: 0.18, fromPage: 1, bossProb: 0.25 },
          { kind: 'spider', prob: 0.15, fromPage: 2, bossProb: 0.2 },
          { kind: 'snake', prob: 0.12, fromPage: 3, bossProb: 0.2, minCols: 6 },
        ],
        boss: { type: 'stampede', cadence: 3, count: 3 },
      },
      dialogue: {
        intro: [
          'Bea is holding a hamster. "This is my strategy consultant. He says you\'re doomed."',
          '"Everything on this page is part of an ecosystem. You\'re the part that gets eaten."',
        ],
        pageStart: [
          '"Today\'s lesson: predator-prey dynamics. Guess which one you are."',
          '"Photosynthesis takes patience. Crushing you takes one class period."',
          '"My O\'s are free-range. They roam."',
        ],
        studentWins: [
          '"Natural selection. Nothing personal. Well. A little personal."',
          '"Survival of the fittest, and buddy, you skipped gym."',
        ],
        studentLoses: [
          '"An extinction event?! On MY page?!"',
          '"Fine. Even the dinosaurs had a bad day. ONE bad day."',
        ],
        draw: [
          '"Symbiosis. Gross. Let\'s never do that again."',
        ],
        token: [
          'A mouse scurries onto the board — it will keep moving! 🐭',
          'A spider drops in and webs the nearby squares. 🕸',
          'A snake slides across THREE squares. 🐍',
        ],
        transform: [
          'The classroom plants lean in. Vines curl around the desk legs. Bea\'s hamster bows.',
          '"Final page. The field trip is HERE. I am the ecosystem now."',
        ],
        bossIntro: [
          '"BEHOLD: MOTHER NATURE. I invented recess."',
        ],
        preSpecial: [
          '"Watch out for my special move! The STAMPEDE is coming next turn!" 🐭🐭🐭',
          '"Nature is healing. Onto your side of the board. Next turn. All at once!" 🐭',
        ],
        specialDone: [
          'A stampede of mice floods the page! They\'re EVERYWHERE. And they keep moving.',
        ],
        bossDefeat: [
          'Mother Nature shrinks back into Bea. The hamster golf-claps. A single bean drops from a vine. It hums with potential.',
        ],
        retry: [
          '"The salmon also swim upstream to their doom every year. Respect."',
        ],
      },
    },

    physics: {
      id: 'physics', title: 'Physics', periodEmoji: '🍎',
      student: 'Newt', boss: 'Newton',
      bossTitle: 'SIR ISAAC NEWTON, LAW ENFORCEMENT',
      signature: 'chainReaction',
      shape: 'tall',   // gravity notebook: taller than wide
      gravity: true,
      gimmick: {
        tokens: [],
        boss: { type: 'apple', cadence: 3 },
      },
      dialogue: {
        intro: [
          'Newt taps the page. "Everything on this notebook FALLS. House rules. Universe rules, technically."',
          '"An object at rest stays at rest. Like your defense."',
        ],
        pageStart: [
          '"Gravity: undefeated since forever. I\'m just borrowing it."',
          '"For every action there\'s an equal and opposite reaction. My reaction is winning."',
          '"Drop your X wherever. It\'ll end up where physics decides. Physics likes me."',
        ],
        studentWins: [
          '"Objects in motion stay in motion. Objects in denial stay in denial."',
          '"That result was theoretically predictable. I have the theory. And now the result."',
        ],
        studentLoses: [
          '"Impossible. The math was PERFECT. The universe is being weird about it."',
          '"Fine. Quantum uncertainty. That\'s my story."',
        ],
        draw: [
          '"Equilibrium. The most boring state of matter."',
        ],
        token: [],
        transform: [
          'The room tilts. Chalk dust falls UP for a second, apologizes, and falls back down. Newt\'s hair becomes a powdered wig.',
          '"Final page. I wrote the laws. Time to enforce them."',
        ],
        bossIntro: [
          '"SIR ISAAC NEWTON. You are in violation of at least three laws of motion."',
        ],
        preSpecial: [
          '"Watch out for my special move! An apple falls next turn — on your tallest stack!" 🍎',
          '"Objects fall. Apples especially. Yours especially-er. Next turn!" 🍎',
        ],
        specialDone: [
          'THUNK. An apple lands, crushing your topmost X, and settles in smugly.',
        ],
        bossDefeat: [
          'Newton rubs his head. "So THAT\'s what that feels like." The wig slides off. Something in his notebook is still glowing — a reaction. It chains.',
        ],
        retry: [
          '"Gravity always wins. But sure. Test it again."',
        ],
      },
    },
  };

  var EDDIE = {
    name: 'Sticky-Fingers Eddie',
    greet: [
      '"Psst. In here. You need somethin\'? Candy talks."',
      '"Welcome to the finest retail establishment in this stall."',
      '"Keep your voice down. The janitor\'s onto me."',
    ],
    buy: [
      '"Pleasure doin\' business. You never saw me."',
      '"Quality merchandise. Fell off a truck. A trinket truck."',
    ],
    broke: [
      '"No candy, no goods. Them\'s the rules of the stall."',
    ],
    leave: [
      '"Flush somethin\' on your way out. For appearances."',
    ],
  };

  function line(rng, arr) {
    if (!arr || !arr.length) return '';
    return arr[Math.floor(rng() * arr.length)];
  }

  return { ALL: ALL, EDDIE: EDDIE, line: line };
})();

if (typeof module !== 'undefined') module.exports = Subjects;
