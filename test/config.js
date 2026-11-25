/* Konfiguration und lokale Daten prüfen: node test/config.js */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const configPath = path.join(root, "data", "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const WordLogic = require(path.join(root, "lesen", "logic.js"));
const MathLogic = require(path.join(root, "rechnen", "logic.js"));
const Markdown = require(path.join(root, "shared", "markdown.js"));

let checks = 0;
function check(condition, message) {
  checks++;
  if (!condition) {
    console.error("FEHLGESCHLAGEN: " + message);
    process.exit(1);
  }
}

function loadSource(name) {
  check(typeof config.sources[name] === "string", "Quelle für " + name + " fehlt");
  const target = path.resolve(root, config.sources[name]);
  check(target.startsWith(root + path.sep), "Quelle für " + name + " verlässt das Projekt");
  check(fs.existsSync(target), "Datendatei fehlt: " + config.sources[name]);
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

check(config.version === 1, "Konfigurationsversion ist nicht 1");
check(typeof config.privacy.allowExternalApis === "boolean", "allowExternalApis muss ein Boolean sein");
check(typeof config.privacy.allowMicrophone === "boolean", "allowMicrophone muss ein Boolean sein");
if (!config.privacy.allowExternalApis) {
  check(config.privacy.allowMicrophone === false, "ohne externe APIs muss auch das Mikrofon aus sein");
}

const words = loadSource("lesen");
const counting = loadSource("rechnen");
check(Array.isArray(words.words) && words.words.length > 0, "Wortliste ist leer");
check(Array.isArray(words.rhymeGroups) && words.rhymeGroups.length > 0, "Reimgruppen fehlen");
check(Array.isArray(counting.countEmoji) && counting.countEmoji.length > 0, "Zählbilder fehlen");
check(counting.numberWords.length === 21, "Zahlwörter 0–20 fehlen");

/* Aufgabenfilter: ohne Mikrofon dürfen keine Sprech-Aufgaben entstehen. */
const micTypes = ["speak", "readAloud", "syllablesRead"];
const allowedTypes = WordLogic.ALL_TYPES.filter(type => micTypes.indexOf(type) === -1);
let rngState = 42;
function rng() {
  rngState = (rngState * 1103515245 + 12345) >>> 0;
  return rngState / 4294967296;
}
for (let level = 1; level <= 6; level++) {
  for (let i = 0; i < 200; i++) {
    const task = WordLogic.createTask(level, rng, words, null, null, allowedTypes);
    check(allowedTypes.indexOf(task.type) !== -1, "Sprech-Aufgabe trotz Mikrofon-Sperre: " + task.type);
  }
}
check(
  WordLogic.availableTypes(6, allowedTypes).every(type => micTypes.indexOf(type) === -1),
  "availableTypes liefert gesperrte Typen"
);
check(MathLogic.ALL_TYPES.length === 9, "Rechen-Aufgabenarten fehlen");

/* Readme wird in der App gerendert. */
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const copyright = "Copyright 2026 (c) made with ❤️ by [UNICodehORN](https://github.com/UNICodehORN)";
check(readme.indexOf(copyright) !== -1, "Copyright fehlt in der Readme");
const rendered = Markdown.render(readme);
check(rendered.indexOf("<h1>") !== -1, "Readme-Renderer erzeugt keine Überschriften");
check(rendered.indexOf("<table>") !== -1, "Readme-Renderer erzeugt keine Tabellen");
check(rendered.indexOf('href="https://github.com/UNICodehORN"') !== -1, "Copyright-Link fehlt im gerenderten HTML");
check(rendered.indexOf("<script") === -1, "Rendered HTML enthält unerwünschtes Markup");
check(
  Markdown.render("[x](javascript:alert(1))").indexOf("javascript:") === -1,
  "Unsichere Links werden nicht herausgefiltert"
);

/* Footer mit Copyright auf jeder Seite. */
const footerJs = fs.readFileSync(path.join(root, "shared", "footer.js"), "utf8");
check(footerJs.indexOf("Copyright 2026 (c)") !== -1, "Copyright fehlt im Footer");
check(footerJs.indexOf("https://github.com/UNICodehORN") !== -1, "Footer-Link fehlt");
check(footerJs.indexOf("data-no-read") !== -1, "Footer darf nicht vorgelesen werden");
check(fs.existsSync(path.join(root, "shared", "footer.css")), "footer.css fehlt");

const pages = [
  path.join(root, "index.html"),
  path.join(root, "lesen", "index.html"),
  path.join(root, "rechnen", "index.html")
];
pages.forEach(page => {
  const html = fs.readFileSync(page, "utf8");
  check(html.indexOf("footer.css") !== -1, "footer.css fehlt auf " + path.basename(path.dirname(page)) + "/" + path.basename(page));
  check(html.indexOf("footer.js") !== -1, "footer.js fehlt auf " + path.basename(path.dirname(page)) + "/" + path.basename(page));
});

/* Vorleseregeln: Emojis stumm, Lösungen geschützt, Klick ist die Aktion. */
const speakRoot = require(path.join(root, "shared", "speak.js"));
const Speak = speakRoot.Speak;
check(Speak.stripEmoji("Hund 🐶 ⭐ 1️⃣ ❤️") === "Hund 1", "Emojis werden nicht entfernt");
check(Speak.stripEmoji("🐶🎲") === "", "Reine Emoji-Texte bleiben übrig");
check(Speak.hasWords("🐶🎲") === false, "Emoji-only gilt als vorlesbarer Text");
check(Speak.hasWords("🔊 Aufgabe") === true, "Button-Text mit Emoji gilt nicht als Text");

const spoken = [];
speakRoot.speechSynthesis = {
  getVoices: () => [],
  cancel: () => {},
  speak: utterance => spoken.push(utterance.text)
};
speakRoot.SpeechSynthesisUtterance = function (text) { this.text = text; };
check(Speak.speak("Lies das Wort 🐶") === true, "Sprachausgabe funktioniert nicht");
check(spoken[0] === "Lies das Wort", "Emojis werden beim Sprechen mitgelesen");

const speakSource = fs.readFileSync(path.join(root, "shared", "speak.js"), "utf8");
check(
  speakSource.indexOf('INTERACTIVE_SELECTOR = "button, a, .start"') !== -1,
  "Los geht's wird nicht als interaktives Element behandelt"
);
check(speakSource.indexOf("[data-no-read]") !== -1, "data-no-read wird nicht ausgewertet");

const gameSource = fs.readFileSync(path.join(root, "lesen", "game.js"), "utf8");
check(
  gameSource.indexOf('["speak", "readAloud", "choose", "letterSalad", "syllablesRead"]') !== -1,
  "Lösungen werden beim Vorlesen nicht geschützt"
);
check((gameSource.match(/noRead\(/g) || []).length >= 8, "Zu wenige Antworten sind stumm markiert");
check(
  gameSource.indexOf("Tippe auf „Aufgabe vorlesen“") === -1,
  "Hinweis verweist auf Vorlesen, das die Lösung nicht mehr nennt"
);

console.log("OK: " + checks + " Prüfungen bestanden.");
