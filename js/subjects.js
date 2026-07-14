/* ============================================================
   BLEEDTHROUGH v0.2 — subjects.js
   Each class period: one student, one subject, one boss form.
   Dialogue and gimmick tuning live here; ai.js executes it.
   ============================================================ */

var Subjects = (function () {

  var ALL = {

    history: {
      id: 'history',
      title: 'History', periodEmoji: '🏛',
      student: 'Norm', boss: 'Napoleon',
      bossTitle: 'NAPOLEON, EMPEROR OF THE BOARD',
      gimmick: {
        // pages 5+: occasionally digs a trench (smudges a square you want)
        trenchFromPage: 5, trenchEvery: 4,
        boss: { type: 'horse', cadence: 3 },
      },
      dialogue: {
        intro: [
          'Norm adjusts his glasses. "Those who don\'t study tic-tac-toe are doomed to repeat it."',
          '"I\'ve read every book on strategy. Sun Tzu. Clausewitz. The school handbook."',
        ],
        pageStart: [
          '"Fresh page. Like the Treaty of Westphalia — everything resets."',
          '"I annotate my victories. This will need a footnote."',
          '"Napoleon lost 400,000 men to winter. I have a cardigan. Advantage: me."',
          '"Rome wasn\'t built in a day, but this game will take like four minutes."',
        ],
        studentWins: [
          '"And THAT is what we call a decisive victory. Textbook. Literally, I\'ll show you the textbook."',
          '"I\'m going to partition your side of the board like Poland."',
          '"Veni, vidi, vici, buddy."',
        ],
        studentLoses: [
          'Norm stares at the page. "History is written by the victors. This page is FAKE NEWS."',
          '"A tactical retreat. Ask the French — it\'s a whole thing."',
          '"I demand a recount. Like the Council of Trent. Don\'t check that reference."',
        ],
        draw: [
          '"A stalemate. How very Cold War of us."',
          '"Trench warfare. Nobody advances. Everybody loses. Mostly the paper."',
        ],
        trench: [
          '"I dig a TRENCH. Very 1916 of me."',
        ],
        transform: [
          'The bell tolls. Norm stands on his desk. A bicorne hat unfolds from his backpack with a snap.',
          '"You\'ve reached the last page. Class is no longer in session. I AM HISTORY ITSELF."',
        ],
        bossIntro: [
          '"Bonjour. I am NAPOLEON. I am not short — this board is simply too tall."',
        ],
        preSpecial: [
          '"Watch out for my special move! The CAVALRY arrives next turn!" 🐎',
          '"Prepare yourself — my special move comes! Vive l\'Empereur!" 🐎',
        ],
        specialDone: [
          'A tall horse gallops onto the page, taking TWO squares. "Magnifique."',
        ],
        bossDefeat: [
          'Napoleon stares at the board. "Exile. Again. It is always exile." He hands you his hat with dignity.',
        ],
        retry: [
          '"Back for more? Even Waterloo had a sequel. It did not go better." ',
        ],
      },
    },

    mythology: {
      id: 'mythology',
      title: 'Mythology', periodEmoji: '⚡',
      student: 'Zoe', boss: 'Zeus',
      bossTitle: 'ZEUS, GOD OF POP QUIZZES',
      gimmick: {
        // elemental O chance by page band
        elemental: { early: 0.25, mid: 0.45, late: 0.65, boss: 0.8 },
        boss: { type: 'bolt', cadence: 3, boltCount: 2 },
      },
      dialogue: {
        intro: [
          'Zoe doesn\'t look up from her book. "My O\'s contain multitudes. Also, elements."',
          '"Fair warning: I main gods."',
        ],
        pageStart: [
          '"Every myth starts the same way: someone thought they could beat a god at a board game."',
          '"Icarus flew too close to the sun. You\'re about to place too close to my fire."',
          '"This page is my labyrinth. You are, respectfully, the minotaur snack."',
          '"Cassandra predicted this game. Nobody believed her. She predicted that too."',
        ],
        studentWins: [
          '"That was fire. Literally."',
          '"Chill. Also literally."',
          '"The Fates measured your line and CUT it. Snip snip."',
        ],
        studentLoses: [
          '"Hubris. That was hubris on my part. The gods punish that. Rude, since I work for them."',
          '"Fine. Even Achilles had a heel. Mine is apparently the top row."',
        ],
        draw: [
          '"Sisyphus vibes. Same board tomorrow, same boulder."',
        ],
        transform: [
          'Thunder rolls down the hallway. The fluorescent lights flicker to a golden glow. Zoe ascends her chair.',
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
          'CRACK. Lightning scorches the marked squares. The smell of burnt graphite fills the room.',
        ],
        bossDefeat: [
          'Zeus shrinks back into a student mid-lightning-pose. "Whatever. Olympus has grade inflation anyway." She drops a trinket.',
        ],
        retry: [
          '"Prometheus came back every day too. It went poorly for his liver."',
        ],
      },
    },
  };

  /* Bathroom stall dealer. */
  var EDDIE = {
    name: 'Sticky-Fingers Eddie',
    greet: [
      '"Psst. In here. You need somethin\'? Candy talks."',
      '"Welcome to aisle one of the finest retail establishment in this stall."',
      '"Keep your voice down. The janitor\'s onto me."',
    ],
    buy: [
      '"Pleasure doin\' business. You never saw me."',
      '"Quality merchandise. Fell off a truck. A stationery truck."',
    ],
    broke: [
      '"No candy, no notes. Them\'s the rules of the stall."',
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
