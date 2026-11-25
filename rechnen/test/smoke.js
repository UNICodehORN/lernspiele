/* Smoke-Tests ohne DOM: node test/smoke.js */
"use strict";

const NUMBER_DATA = require("../numbers.js");
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

/* Daten */
check(NUMBER_DATA.countEmoji.length >= 10, "Zähl-Bilder fehlen");
check(NUMBER_DATA.countEmoji.every(Boolean), "leeres Zähl-Bild gefunden");
check(NUMBER_DATA.numberWords.length === 21, "Zahlwörter 0–20 fehlen");
check(NUMBER_DATA.numberWords[20] === "zwanzig", "Zahlwort 20 fehlt");

/* Aufgaben über alle Level und Zufallswerte */
check(Logic.ALL_TYPES.length === 9, "Es sollten neun Aufgabenarten sein");
const seenTypes = new Set();
const rng = seededRng(20261124);

for (let level = 1; level <= 12; level++) {
  for (let i = 0; i < 250; i++) {
    const task = Logic.createTask(level, rng, NUMBER_DATA, null);
    seenTypes.add(task.type);
    check(
      Logic.availableTypes(level).indexOf(task.type) !== -1,
      "Aufgabentyp " + task.type + " ist auf Level " + level + " noch nicht frei"
    );
    check(task.level === level, "falsches Level in der Aufgabe");

    if (task.type === "add" || task.type === "cross" || task.type === "sub") {
      check(task.n1 >= 1 && task.n2 >= 1, "Operanden müssen positiv sein");
      check(task.lineMax >= task.n1 && task.lineMax >= task.n2, "Zahlenreihe zu kurz");
      if (task.type === "sub") {
        check(task.answer === task.n1 - task.n2, "falsches Minus-Ergebnis");
        check(task.answer >= 0, "negatives Minus-Ergebnis");
        check(task.n2 <= task.n1, "Abziehen größer als die Startzahl");
      } else {
        check(task.answer === task.n1 + task.n2, "falsches Plus-Ergebnis");
        if (task.type === "cross") {
          check(task.n1 + task.n2 > 10, "Aufgabe geht nicht über den Zehner");
          check(task.n1 <= 9 && task.n2 <= 9, "Zehnerübergang nur mit einstelligen Summanden");
        } else {
          check(task.answer <= Logic.maxSumForLevel(level), "Summe über der Level-Grenze");
        }
      }
      check(Logic.isCorrect(task, String(task.answer)), "Ergebnis wird nicht akzeptiert");
      check(!Logic.isCorrect(task, task.answer + 1), "falsches Ergebnis akzeptiert");
      check(!Logic.isCorrect(task, ""), "leere Eingabe akzeptiert");
    } else if (task.type === "double") {
      check(task.n >= 1 && task.n <= 10, "Verdopplungszahl außerhalb 1–10");
      check(task.answer === 2 * task.n, "falsches Verdopplungsergebnis");
      check(Logic.isCorrect(task, String(task.answer)), "Verdopplung nicht akzeptiert");
      check(!Logic.isCorrect(task, task.answer + 1), "falsche Verdopplung akzeptiert");
    } else if (task.type === "ten") {
      check(task.n >= 1 && task.n <= 9, "Zehnerfreund außerhalb 1–9");
      check(task.answer === 10 - task.n, "falscher Zehnerfreund");
      check(Logic.isCorrect(task, String(task.answer)), "Zehnerfreund nicht akzeptiert");
    } else if (task.type === "bond") {
      check(task.total >= 11 && task.total <= 19, "Zehner-Einer-Zahl außerhalb 11–19");
      check(task.answer === task.total - 10, "falsche Zehner-Einer-Zerlegung");
      check(Logic.isCorrect(task, String(task.answer)), "Zerlegung nicht akzeptiert");
    } else if (task.type === "count") {
      check(task.count >= 1 && task.count <= Math.max(5, Logic.maxSumForLevel(level)), "Zählmenge zu groß");
      check(NUMBER_DATA.countEmoji.indexOf(task.emoji) !== -1, "unbekanntes Zähl-Bild");
      check(task.options.length === 4, "Zählen braucht vier Antwortmöglichkeiten");
      check(new Set(task.options).size === 4, "doppelte Zähl-Antworten");
      check(task.options[task.answerIndex] === task.count, "falsche Zähl-Antwort markiert");
      check(Logic.isCorrect(task, task.answerIndex), "Zähl-Antwort nicht akzeptiert");
      check(!Logic.isCorrect(task, (task.answerIndex + 1) % 4), "falsche Zähl-Antwort akzeptiert");
    } else if (task.type === "compare") {
      check(task.options.length === 2, "Vergleich braucht genau zwei Zahlen");
      check(task.options[0] !== task.options[1], "beide Vergleichszahlen sind gleich");
      check(
        task.options[task.answerIndex] === Math.max(task.options[0], task.options[1]),
        "nicht die größere Zahl markiert"
      );
      check(Logic.isCorrect(task, task.answerIndex), "Vergleichslösung nicht akzeptiert");
    } else if (task.type === "sequence") {
      check(task.numbers.length === 5, "Zahlenreihe braucht fünf Plätze");
      check(task.gap >= 1 && task.gap <= 3, "Lücke liegt nicht in der Mitte");
      check(
        task.numbers.every((value, index) => index === 0 || value === task.numbers[index - 1] + 1),
        "Zahlenreihe ist nicht fortlaufend"
      );
      check(task.answer === task.numbers[task.gap], "falsche Lückenzahl");
      check(task.numbers[4] <= Math.max(10, Logic.maxSumForLevel(level)), "Reihe geht über 20 hinaus");
      check(Logic.isCorrect(task, String(task.answer)), "Lückenzahl nicht akzeptiert");
    } else {
      check(false, "unbekannter Aufgabentyp: " + task.type);
    }
  }
}

check(seenTypes.size === 9, "Alle 9 Aufgabenarten müssen vorkommen (waren: " + [...seenTypes].join(",") + ")");

/* Level-Grenzen */
check(Logic.maxSumForLevel(1) === 5, "Level 1 sollte bis 5 reichen");
check(Logic.maxSumForLevel(20) === 20, "Summenobergrenze muss bei 20 liegen");
check(Logic.availableTypes(1).indexOf("sub") === -1, "Minus darf auf Level 1 nicht vorkommen");
check(Logic.availableTypes(10).indexOf("cross") !== -1, "Zehnerübergang fehlt auf Level 10");

/* Gezieltes Training: gewählter Typ muss auch auf Level 1 erscheinen */
Logic.ALL_TYPES.forEach(type => {
  for (let i = 0; i < 40; i++) {
    const task = Logic.createTask(1, rng, NUMBER_DATA, null, type);
    check(task.type === type, "gezielter Typ " + type + " wurde nicht erzwungen");
    let answer;
    if (type === "count" || type === "compare") answer = task.answerIndex;
    else answer = task.answer;
    check(Logic.isCorrect(task, answer), "gezielte Aufgabe " + type + " ist nicht lösbar");
    check(!Logic.isCorrect(task, "Quatsch"), "Unsinn wird bei " + type + " akzeptiert");
  }
});

/* Gemischter Modus: jede Aufgabe eine neue Art, aber nur freigeschaltete */
check(Logic.MIX_TYPE === "mix", "Mix-Kennung fehlt");
[1, 3, 7, 10].forEach(level => {
  const mixed = new Set();
  const allowed = new Set(Logic.availableTypes(level));
  let previous = null;
  for (let i = 0; i < 300; i++) {
    const task = Logic.createTask(level, rng, NUMBER_DATA, previous, Logic.MIX_TYPE);
    check(allowed.has(task.type), "Mix nutzt auf Level " + level + " die noch nicht freie Art " + task.type);
    check(task.type !== previous, "Mix wiederholt direkt die vorige Art");
    mixed.add(task.type);
    previous = task.type;
  }
  check(mixed.size === allowed.size, "Mix nutzt auf Level " + level + " nicht alle verfügbaren Arten");
});

/* Eingaben */
check(Logic.toNumber(" 12 ") === 12, "Zahlen mit Leerzeichen akzeptieren");
check(Number.isNaN(Logic.toNumber("")), "leere Eingabe ist keine Zahl");
check(Number.isNaN(Logic.toNumber("-3")), "negative Eingabe ist ungültig");
check(Number.isNaN(Logic.toNumber("1a")), "Buchstaben in der Eingabe sind ungültig");
check(!Logic.isCorrect(null, 1), "fehlende Aufgabe ist nicht richtig");

console.log("OK: " + checks + " Prüfungen bestanden.");
