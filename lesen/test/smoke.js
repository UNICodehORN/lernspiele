/* Smoke-Tests ohne DOM: node test/smoke.js */
"use strict";

const WORD_DATA = require("../words.js");
const Logic = require("../logic.js");

let checks = 0;
function check(condition, message) {
  checks++;
  if (!condition) {
    console.error("FEHLGESCHLAGEN: " + message);
    process.exit(1);
  }
}

function seededRng(seed) {
  let value = seed >>> 0;
  return function () {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wordsOf(options) {
  return options.map(option => option.w);
}

/* Daten */
check(WORD_DATA.words.length === 80, "Es sollten 80 Wörter geladen werden");
const names = new Set();
WORD_DATA.words.forEach(word => {
  check(!!word.w && (!!word.emoji || !!word.art), "Wort und Bild müssen gesetzt sein: " + word.w);
  check(Array.isArray(word.syl) && word.syl.length > 0, "Silben fehlen bei " + word.w);
  check(
    word.syl.join("").toLowerCase() === word.w.toLowerCase(),
    "Silben ergeben nicht das Wort: " + word.w
  );
  check(
    word.syl.every(part => part.length > 0),
    "Leere Silbe bei " + word.w
  );
  check(!names.has(word.w), "Doppeltes Wort: " + word.w);
  names.add(word.w);
});
const byName = name => WORD_DATA.words.filter(word => word.w === name)[0];
check(byName("Zitrone").syl.length === 3, "Zitrone hat 3 Silben");
check(byName("Hund").syl.length === 1, "Hund hat 1 Silbe");
check(byName("Elefant").syl.length === 3, "Elefant hat 3 Silben");
check(byName("Kristall").syl.length === 2, "Kristall hat 2 Silben");
check(byName("Domino").art === "domino", "Domino braucht eine eigene Zeichnung statt Würfel");
check(byName("Iglu").art === "igloo", "Iglu braucht eine eigene Zeichnung statt Eiswürfel");
check(byName("Salami").art === "salami", "Salami braucht eine eigene Zeichnung statt leerem Bild");

WORD_DATA.rhymeGroups.forEach(group => {
  check(group.length >= 2, "Reimgruppe zu kurz: " + group.join(","));
  group.forEach(name => check(!!byName(name), "Reimwort fehlt in der Wortliste: " + name));
});

/* Spracherkennung */
check(Logic.speechMatches("Haus", "Haus"), "exakte Erkennung");
check(Logic.speechMatches("Das Haus!", "Haus"), "Artikel und Satzzeichen");
check(Logic.speechMatches("Kristal", "Kristall"), "ein Erkennungsfehler bei langem Wort");
check(Logic.speechMatches("Brokkoli", "Brokoli"), "Schreibvariante");
check(!Logic.speechMatches("Maus", "Haus"), "ähnliche kurze Wörter nicht verwechseln");
check(!Logic.speechMatches("Hause", "Haus"), "keine Treffer bei kurzen Wörtern");
check(!Logic.speechMatches("Reis", "Eis"), "Eis und Reis nicht verwechseln");
check(!Logic.speechMatches("", "Haus"), "leere Eingabe ist falsch");
check(Logic.normalizeWord("ÄÖÜß") === "aeoeuess", "Umlaut-Normalisierung");

/* Aufgaben über alle Level und Zufallswerte */
const seenTypes = new Set();
const rng = seededRng(20261124);
for (let level = 1; level <= 6; level++) {
  for (let i = 0; i < 250; i++) {
    const task = Logic.createTask(level, rng, WORD_DATA, null);
    seenTypes.add(task.type);
    check(
      Logic.availableTypes(level).indexOf(task.type) !== -1,
      "Aufgabentyp " + task.type + " ist auf Level " + level + " noch nicht frei"
    );

    if (task.type === "syllables") {
      check(task.answer === task.word.syl.length, "falsche Silbenzahl");
      check(Logic.isCorrect(task, String(task.answer)), "Silbenzahl wird nicht akzeptiert");
      check(!Logic.isCorrect(task, task.answer === 4 ? 1 : 4), "falsche Silbenzahl akzeptiert");
    } else if (task.type === "speak" || task.type === "readAloud") {
      check(task.answer === task.word.w, "Sprechwort stimmt nicht mit Bild/Wort überein");
      check(Logic.isCorrect(task, task.word.w), "gesprochenes Wort wird nicht akzeptiert");
      check(!Logic.isCorrect(task, "Quatsch"), "Unsinn wird als richtig gewertet");
    } else if (task.type === "choose" || task.type === "rhyme") {
      check(task.options.length === (level >= 3 ? 4 : 3), "falsche Optionenanzahl");
      check(task.answerIndex >= 0 && task.answerIndex < task.options.length, "Lösung index ungültig");
      check(new Set(wordsOf(task.options)).size === task.options.length, "doppelte Optionen");
      check(Logic.isCorrect(task, task.answerIndex), "richtige Option nicht akzeptiert");
      const wrong = (task.answerIndex + 1) % task.options.length;
      check(!Logic.isCorrect(task, wrong), "falsche Option akzeptiert");
      if (task.type === "rhyme") {
        const group = WORD_DATA.rhymeGroups.filter(
          entry => entry.indexOf(task.word.w) !== -1
        )[0];
        check(!!group, "Reimaufgabe ohne Reimgruppe");
        check(
          group.indexOf(task.options[task.answerIndex].w) !== -1,
          "Reimlösung reimt sich nicht"
        );
      }
    } else if (task.type === "compare") {
      check(task.options.length === 2, "Vergleich braucht genau zwei Bilder");
      const left = task.options[0].syl.length;
      const right = task.options[1].syl.length;
      check(left !== right, "beide Wörter haben gleich viele Silben");
      check(
        task.options[task.answerIndex].syl.length === Math.max(left, right),
        "nicht das Wort mit mehr Silben markiert"
      );
      check(Logic.isCorrect(task, task.answerIndex), "Vergleichslösung nicht akzeptiert");
    } else if (task.type === "letter") {
      check(task.options.length === (level >= 4 ? 6 : 5), "falsche Anzahl Buchstaben-Bilder");
      check(task.answerIndices.length >= 2, "zu wenige richtige Bilder beim Buchstabenspiel");
      check(new Set(wordsOf(task.options)).size === task.options.length, "doppelte Buchstaben-Bilder");
      task.options.forEach((word, index) => {
        const contains = Logic.normalizeWord(word.w).indexOf(task.letter) !== -1;
        check(
          (task.answerIndices.indexOf(index) !== -1) === contains,
          "Buchstabe " + task.letter + " falsch zugeordnet bei " + word.w
        );
      });
      check(Logic.isCorrect(task, task.answerIndices.slice()), "Buchstabenlösung nicht akzeptiert");
      check(!Logic.isCorrect(task, [0]), "unvollständige Buchstabenlösung akzeptiert");
    } else if (task.type === "syllablesRead") {
      check(task.word.syl.length > 1, "Silbenlesen verwendet ein einsilbiges Wort");
      check(task.stepIndex === 0, "Silbenlesen beginnt nicht bei Schritt 0");
      check(task.steps.join("") === task.word.syl.join(""), "Silbenfolge falsch");
      check(task.steps.indexOf(task.word.w) === -1, "ganzes Wort darf nicht als Silbe stehen");
      check(Logic.isCorrect(task, task.word.w), "ganzes Wort wird nicht akzeptiert");
      check(!Logic.isCorrect(task, task.steps[0]), "einzelne Silbe wird fälschlich geprüft");
    } else if (task.type === "letterSalad") {
      const letters = task.letters.map(item => item.ch.toLowerCase()).sort().join("");
      const needed = task.word.w.toLowerCase().split("").sort().join("");
      const extras = letters.length - needed.length;
      check(extras === (level >= 4 ? 3 : level >= 2 ? 2 : 0), "falsche Anzahl Ablenk-Buchstaben");
      const poolCounts = {};
      letters.split("").forEach(ch => { poolCounts[ch] = (poolCounts[ch] || 0) + 1; });
      needed.split("").forEach(ch => {
        check((poolCounts[ch] || 0) > 0, "Buchstabe " + ch + " fehlt im Salat");
        poolCounts[ch] -= 1;
      });
      Object.keys(poolCounts).filter(ch => poolCounts[ch] > 0).forEach(ch => {
        check(task.word.w.toLowerCase().indexOf(ch) === -1, "Ablenk-Buchstabe steckt im Wort: " + ch);
      });
      check(task.showWord === undefined, "Buchstabensalat darf das Wort nicht anzeigen");
      check(Logic.isCorrect(task, task.word.w.split("")), "Buchstabenreihenfolge nicht akzeptiert");
      check(!Logic.isCorrect(task, task.letters.map(item => item.ch)), "falsche Reihenfolge akzeptiert");
    }
  }
}

check(seenTypes.size === 9, "Alle 9 Aufgabenarten müssen vorkommen (waren: " + [...seenTypes].join(",") + ")");

/* Gezieltes Training: gewählter Typ muss auch auf Level 1 erscheinen */
Logic.ALL_TYPES.forEach(type => {
  for (let i = 0; i < 40; i++) {
    const task = Logic.createTask(1, rng, WORD_DATA, null, type);
    check(task.type === type, "gezielter Typ " + type + " wurde nicht erzwungen");
    let answer;
    if (type === "syllables") answer = task.answer;
    else if (type === "letter") answer = task.answerIndices.slice();
    else if (type === "speak" || type === "readAloud") answer = task.word.w;
    else if (type === "syllablesRead") answer = task.word.w;
    else if (type === "letterSalad") answer = task.word.w.split("");
    else answer = task.answerIndex;
    check(Logic.isCorrect(task, answer), "gezielte Aufgabe " + type + " ist nicht lösbar");
  }
});

/* Silbenlesen Stufe 2: jede Silbe und danach das ganze Wort */
const chain = Logic.createTask(4, rng, WORD_DATA, null, "syllablesRead");
check(chain.word.syl.length > 1, "Silbenlesen nimmt ein einsilbiges Wort");
check(chain.steps.length === chain.word.syl.length, "Silbenanzahl falsch");
chain.steps.forEach((step, index) => {
  chain.stepIndex = index;
  check(!Logic.isCorrect(chain, step), "einzelne Silbe " + step + " wird geprüft");
});
check(Logic.isCorrect(chain, chain.word.w), "ganzes Wort wird nicht akzeptiert");
check(!Logic.isCorrect(chain, "Quatsch"), "falsches Wort akzeptiert");

console.log("OK: " + checks + " Prüfungen bestanden.");
