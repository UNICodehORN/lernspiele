/*
 * Zahl-Welt – Spielsteuerung, Darstellung und Sprachausgabe.
 * Spiellogik: logic.js · Effekte: animations.js · Daten: numbers.js
 */
"use strict";

const TASKS_PER_LEVEL = 3;
const LEVEL_EMOJIS = [
  "⭐", "🐵", "🦍", "🐘", "🦔", "🦙", "🐆", "🐎",
  "🦄", "🐬", "🦉", "🦦", "🦥", "🦚", "🦜", "🐉",
  "🐲", "🦖", "🐢", "🐸", "🐝"
];
const TYPE_INFO = [
  { type: "mix", icon: "🎲", name: "Alles gemischt", desc: "Alle Aufgabenarten bunt gemischt." },
  { type: "add", icon: "➕", name: "Plus rechnen", desc: "Zwei Zahlen zusammenzählen." },
  { type: "count", icon: "🔢", name: "Zählen", desc: "Wie viele Bilder sind es?" },
  { type: "sequence", icon: "🧮", name: "Zahlenreihe", desc: "Welche Zahl fehlt?" },
  { type: "compare", icon: "⚖️", name: "Zahlen vergleichen", desc: "Welche Zahl ist größer?" },
  { type: "double", icon: "✌️", name: "Verdoppeln", desc: "Eine Zahl und noch einmal dieselbe." },
  { type: "sub", icon: "➖", name: "Minus rechnen", desc: "Von einer Zahl subtrahieren." },
  { type: "ten", icon: "🔟", name: "Zehnerfreund", desc: "Wie viele fehlen bis 10?" },
  { type: "bond", icon: "🧱", name: "Zahl zerlegen", desc: "Zehner und Einer erkennen." },
  { type: "cross", icon: "🌉", name: "Über den Zehner", desc: "Plus über die 10 hinaus." }
];
const INPUT_TYPES = ["add", "sub", "cross", "double", "ten", "bond", "sequence"];

let selectedType = MathLogic.MIX_TYPE;
let currentPoints = 0;
let currentLevel = 1;
let tasksDone = 0;
let streak = 0;
let currentTask = null;
let lastType = null;
let wrongCount = 0;
let locked = false;
let soundOn = true;
let appConfig = null;
let pendingTimers = [];

function schedule(fn, ms) {
  const id = window.setTimeout(() => {
    pendingTimers = pendingTimers.filter(entry => entry !== id);
    fn();
  }, ms);
  pendingTimers.push(id);
}

function clearScheduled() {
  pendingTimers.forEach(id => window.clearTimeout(id));
  pendingTimers = [];
}

function $(id) {
  return document.getElementById(id);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

/* ---------------------- Start & Grundfunktionen ---------------------- */

function startScreenInit(data, config) {
  window.NUMBER_DATA = data;
  appConfig = config || null;
  const grid = $("typeGrid");
  TYPE_INFO.forEach(info => {
    const button = el("button", "type-btn");
    button.type = "button";
    button.appendChild(el("span", "type-icon", info.icon));
    const text = el("span", "type-text");
    text.appendChild(el("span", "type-name", info.name));
    text.appendChild(el("span", "type-desc", info.desc));
    button.appendChild(text);
    button.addEventListener("click", () => startGame(info.type));
    grid.appendChild(button);
  });

  $("readTaskBtn").addEventListener("click", readTaskAloud);
  $("changeTypeBtn").addEventListener("click", showTypeSelection);
  $("soundToggle").addEventListener("click", toggleSound);
  document.addEventListener("keyup", handleKeyboard);

  updateStats();
  updateProgress();
}

function startGame(type) {
  // Erster Klick erlaubt browsersseitig die Sprachausgabe.
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (error) {
      // Ignorieren: Sprachausgabe ist optional.
    }
  }
  clearScheduled();
  selectedType = type || MathLogic.MIX_TYPE;
  currentPoints = 0;
  currentLevel = 1;
  tasksDone = 0;
  streak = 0;
  lastType = null;
  $("startScreen").classList.add("hidden");
  $("gameScreen").classList.remove("hidden");
  updateStats();
  updateProgress();
  newTask();
}

function showTypeSelection() {
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (error) {
      // Ignorieren.
    }
  }
  clearScheduled();
  currentTask = null;
  locked = false;
  currentLevel = 1;
  tasksDone = 0;
  updateStats();
  updateProgress();
  $("gameScreen").classList.add("hidden");
  $("startScreen").classList.remove("hidden");
}

function newTask() {
  locked = false;
  wrongCount = 0;
  currentTask = MathLogic.createTask(
    currentLevel, Math.random, NUMBER_DATA, lastType, selectedType
  );
  lastType = currentTask.type;
  renderTask();
}

function updateStats() {
  $("pts").textContent = String(currentPoints);
  const emoji = LEVEL_EMOJIS[(currentLevel - 1) % LEVEL_EMOJIS.length];
  $("levelBadge").textContent = emoji + " Level " + currentLevel;
}

function updateProgress() {
  const percent = (tasksDone / TASKS_PER_LEVEL) * 100;
  $("progressBar").style.width = percent + "%";
  $("progressText").textContent = tasksDone >= TASKS_PER_LEVEL
    ? "Level geschafft! 🎉"
    : "Noch " + (TASKS_PER_LEVEL - tasksDone) + " Aufgaben bis zum nächsten Level";
}

function toggleSound() {
  soundOn = !soundOn;
  $("soundToggle").textContent = soundOn ? "🔊" : "🔇";
  if (!soundOn && "speechSynthesis" in window) window.speechSynthesis.cancel();
  Effects.toast(soundOn ? "Ton an 🔊" : "Ton aus 🔇", "");
}

/* ---------------------- Darstellung der Aufgaben ---------------------- */

function operand(value, className) {
  return el("span", "operand " + (className || ""), String(value));
}

function operator(symbol) {
  return el("span", "operator", symbol);
}

function answerInput() {
  const input = el("input", "answer-input");
  input.id = "result";
  input.type = "text";
  input.setAttribute("inputmode", "numeric");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("aria-label", "Ergebnis eingeben");
  input.maxLength = 2;
  input.addEventListener("input", () => {
    const cleaned = input.value.replace(/[^0-9]/g, "");
    if (cleaned !== input.value) input.value = cleaned;
  });
  return input;
}

function equation(parts) {
  const row = el("div", "equation");
  parts.forEach(part => row.appendChild(part));
  return row;
}

function solveButton() {
  const button = el("button", "btn btn-main", "Prüfen ✅");
  button.type = "button";
  button.id = "solveBtn";
  button.addEventListener("click", solve);
  return button;
}

function numberOption(value, index) {
  const button = el("button", "option number-option", String(value));
  button.type = "button";
  button.dataset.index = String(index);
  return button;
}

function showNumberLine(max, first, second) {
  const line = $("numberLine");
  line.replaceChildren();
  for (let i = 0; i <= max; i++) {
    line.appendChild(el("div", "tick", String(i)));
  }
  const ticks = line.querySelectorAll(".tick");
  if (first !== undefined && ticks[first]) ticks[first].classList.add("highlight1");
  if (second !== undefined && ticks[second]) ticks[second].classList.add("highlight2");
  line.classList.remove("hidden");
}

function hideNumberLine() {
  $("numberLine").classList.add("hidden");
  $("numberLine").replaceChildren();
}

function renderTask() {
  const task = currentTask;
  const prompt = $("taskPrompt");
  const visual = $("taskVisual");
  const controls = $("taskControls");

  prompt.textContent = "";
  visual.replaceChildren();
  controls.replaceChildren();
  controls.className = "controls";
  controls.onclick = null;
  hideNumberLine();

  switch (task.type) {
    case "add":
      prompt.textContent = "Wie lautet die Summe?";
      visual.appendChild(equation([
        operand(task.n1, "first"), operator("+"), operand(task.n2, "second"),
        operator("="), answerInput()
      ]));
      showNumberLine(task.lineMax, task.n1, task.n2);
      controls.appendChild(solveButton());
      break;

    case "sub":
      prompt.textContent = "Wie groß ist die Differenz?";
      visual.appendChild(equation([
        operand(task.n1, "first"), operator("−"), operand(task.n2, "second"),
        operator("="), answerInput()
      ]));
      showNumberLine(task.lineMax, task.n1, task.n2);
      controls.appendChild(solveButton());
      break;

    case "cross":
      prompt.textContent = "Rechne über den Zehner – was ist das Ergebnis?";
      visual.appendChild(equation([
        operand(task.n1, "first"), operator("+"), operand(task.n2, "second"),
        operator("="), answerInput()
      ]));
      showNumberLine(task.lineMax, task.n1, task.n2);
      controls.appendChild(solveButton());
      break;

    case "double": {
      prompt.textContent = "Was ergibt die doppelte Zahl?";
      visual.appendChild(el("div", "dot-row", "🔵 ".repeat(task.n).trim()));
      visual.appendChild(el("div", "dot-row", "🔵 ".repeat(task.n).trim()));
      visual.appendChild(equation([
        operand(task.n, "first"), operator("+"), operand(task.n, "second"),
        operator("="), answerInput()
      ]));
      showNumberLine(task.lineMax, task.n);
      controls.appendChild(solveButton());
      break;
    }

    case "ten":
      prompt.textContent = "Wie viel fehlt bis zur 10?";
      visual.appendChild(equation([
        operand(task.n, "first"), operator("+"), answerInput(),
        operator("="), operand(10, "second")
      ]));
      showNumberLine(task.lineMax, task.n, 10);
      controls.appendChild(solveButton());
      break;

    case "bond":
      prompt.textContent = "Welche Zahl fehlt?";
      visual.appendChild(equation([
        operand(task.total, "first"), operator("="), operand(10, "second"),
        operator("+"), answerInput()
      ]));
      showNumberLine(task.lineMax, 10, task.total);
      controls.appendChild(solveButton());
      break;

    case "sequence": {
      prompt.textContent = "Welche Zahl fehlt in der Reihe?";
      const row = el("div", "sequence-row");
      task.numbers.forEach((value, index) => {
        if (index === task.gap) {
          const cell = el("span", "seq-cell seq-gap");
          cell.appendChild(answerInput());
          row.appendChild(cell);
        } else {
          row.appendChild(el("span", "seq-cell", String(value)));
        }
      });
      visual.appendChild(row);
      showNumberLine(task.lineMax, task.numbers[0], task.numbers[4]);
      controls.appendChild(solveButton());
      break;
    }

    case "count": {
      prompt.textContent = "Wie viele Bilder sind das?";
      const cloud = el("div", "count-cloud");
      for (let i = 0; i < task.count; i++) cloud.appendChild(el("span", "count-pic", task.emoji));
      visual.appendChild(cloud);
      const grid = el("div", "option-grid four");
      task.options.forEach((value, index) => grid.appendChild(numberOption(value, index)));
      controls.appendChild(grid);
      controls.onclick = optionClick;
      break;
    }

    case "compare": {
      prompt.textContent = "Welche Zahl ist größer?";
      visual.appendChild(el("div", "big-emoji", "⚖️"));
      const grid = el("div", "compare-grid");
      task.options.forEach((value, index) => {
        const button = el("button", "compare-card", String(value));
        button.type = "button";
        button.dataset.index = String(index);
        grid.appendChild(button);
      });
      controls.appendChild(grid);
      controls.onclick = optionClick;
      break;
    }

    default:
      prompt.textContent = "Aufgabe nicht verfügbar.";
  }

  updateHint();
}

function optionClick(event) {
  if (locked) return;
  const button = event.target.closest("[data-index]");
  if (!button) return;
  button.classList.add("selected");
  submitAnswer(Number(button.dataset.index));
}

function solve() {
  if (!currentTask || locked) return;
  const input = $("result");
  if (!input) return;
  submitAnswer(input.value);
}

/* ---------------------- Antworten & Punkte ---------------------- */

function answerValue(task, answer) {
  if (task.type === "count") return task.count;
  if (task.type === "compare") return task.options[task.answerIndex];
  return MathLogic.toNumber(answer);
}

function submitAnswer(answer) {
  if (!currentTask || locked) return;
  if (!MathLogic.isCorrect(currentTask, answer)) {
    handleWrong();
    return;
  }
  handleCorrect(answerValue(currentTask, answer));
}

function handleCorrect(value) {
  locked = true;
  streak += 1;
  const bonus = streak >= 3 ? 1 : 0;
  const earned = currentLevel + bonus;
  currentPoints += earned;
  tasksDone += 1;
  updateStats();
  updateProgress();

  playSound("successSound", 0.35);
  Effects.emoji("success");
  Effects.confetti();
  Effects.toast(
    bonus ? "Super! +" + earned + " Punkte" : "Richtig! +" + earned + " Punkte",
    bonus ? "Drei in Folge – Extra-Punkt! 🌟" : "Weiter so!"
  );
  brieflyHighlightNumber(value);

  const levelUp = tasksDone >= TASKS_PER_LEVEL;
  if (levelUp) {
    currentLevel += 1;
    tasksDone = 0;
  }

  const delay = levelUp ? 1600 : 800;
  schedule(() => {
    if (levelUp) {
      Effects.firework();
      playSound("lvlupSound", 0.4);
      const emoji = LEVEL_EMOJIS[(currentLevel - 1) % LEVEL_EMOJIS.length];
      Effects.toast("Level " + currentLevel + "! " + emoji, "Jetzt wird es etwas schwerer.");
      updateStats();
      updateProgress();
    }
    newTask();
  }, delay);
}

function handleWrong() {
  wrongCount += 1;
  streak = 0;
  // Punktabzug wie bisher – aber niemals unter null.
  currentPoints = Math.max(0, currentPoints - (currentLevel + 1));
  updateStats();
  playSound("failSound", 0.45);
  Effects.emoji("fail");
  Effects.toast("Noch nicht ganz", "Versuch es noch einmal – du schaffst das!", "error");
  updateHint();
}

function brieflyHighlightNumber(number) {
  const ticks = $("numberLine").querySelectorAll(".tick");
  if (!Number.isFinite(number) || !ticks[number]) return;
  ticks[number].classList.add("highlightSuccess");
  window.setTimeout(() => ticks[number].classList.remove("highlightSuccess"), 1000);
}

function updateHint() {
  const hint = $("taskHint");
  hint.replaceChildren();
  const task = currentTask;
  if (!task) return;

  if (wrongCount < 2) {
    const texts = {
      add: "Schau auf die Zahlenreihe und zähle weiter.",
      sub: "Zähle auf der Zahlenreihe zurück.",
      cross: "Rechne erst bis zur 10 und dann weiter.",
      double: "Verdoppeln heißt: rechne die Zahl plus sich selbst.",
      ten: "Denk an die Zehnerfreunde, zum Beispiel 7 und 3.",
      bond: "Zehn und der Rest ergeben die ganze Zahl.",
      sequence: "Die Zahlen gehen immer um 1 weiter.",
      count: "Zeige auf jedes Bild und zähle leise mit.",
      compare: "Welche Zahl steht weiter rechts auf der Zahlenreihe?"
    };
    hint.textContent = texts[task.type] || "";
    return;
  }

  // Nach mehreren Fehlern gibt es einen konkreten Tipp.
  const tips = {
    add: "Rechne nach: " + task.n1 + " + " + task.n2 + " = " + task.answer + ".",
    sub: "Zähle zurück: " + task.n1 + " − " + task.n2 + " = " + task.answer + ".",
    cross: task.n1 + " + " + task.n2 + " = " + task.answer + " – erst bis 10, dann weiter.",
    double: task.n + " + " + task.n + " = " + task.answer + ".",
    ten: task.n + " und " + task.answer + " ergeben 10.",
    bond: task.total + " ist 10 und " + task.answer + ".",
    sequence: "Die fehlende Zahl ist " + task.answer + ".",
    count: "Es sind " + task.count + " Bilder.",
    compare: "Die größere Zahl ist " + answerValue(task, task.answerIndex) + "."
  };
  hint.textContent = "Tipp: " + (tips[task.type] || "Versuch es noch einmal.");
}

function handleKeyboard(event) {
  if (!$("startScreen").classList.contains("hidden")) return; // Auswahl per Browser
  if (!currentTask || locked) return;
  const active = document.activeElement;
  const onButton = active && active.tagName === "BUTTON";

  const key = event.key;
  if (key === "Enter" || key === " ") {
    if (onButton) return; // Button löst sich selbst aus
    if (INPUT_TYPES.indexOf(currentTask.type) !== -1 && $("result")) {
      event.preventDefault();
      solve();
    }
    return;
  }
  if ((currentTask.type === "count" || currentTask.type === "compare") && /^[1-4]$/.test(key)) {
    const index = Number(key) - 1;
    const button = $("taskControls").querySelector('[data-index="' + index + '"]');
    if (button) submitAnswer(index);
  }
}

/* ---------------------- Sprachausgabe (TTS) ---------------------- */

function word(value) {
  return NUMBER_DATA.numberWords[value] || String(value);
}

function readTaskAloud() {
  const task = currentTask;
  if (!task) return;
  let text = "";
  switch (task.type) {
    case "add":
    case "cross":
      text = "Wie viel ist " + word(task.n1) + " plus " + word(task.n2) + "?";
      break;
    case "sub":
      text = "Wie viel ist " + word(task.n1) + " minus " + word(task.n2) + "?";
      break;
    case "double":
      text = "Wie viel ist " + word(task.n) + " plus " + word(task.n) + "?";
      break;
    case "ten":
      text = word(task.n) + " plus wie viel ist zehn?";
      break;
    case "bond":
      text = word(task.total) + " ist zehn plus wie viel?";
      break;
    case "count":
      text = "Wie viele Bilder sind das?";
      break;
    case "sequence":
      text = "Welche Zahl fehlt in der Zahlenreihe?";
      break;
    case "compare":
      text = "Welche Zahl ist größer? " + word(task.options[0]) + " oder " + word(task.options[1]) + "?";
      break;
  }
  speak(text);
}

function speak(text) {
  if (!soundOn) {
    Effects.toast("Ton ist aus", "Tippe auf 🔊 oben rechts.", "error");
    return false;
  }
  return Speak.speak(text, {
    onError: message => Effects.toast("Keine Sprachausgabe", message, "error")
  });
}

function playSound(id) {
  if (!soundOn) return;
  const names = {
    successSound: "success",
    failSound: "fail",
    lvlupSound: "levelup"
  };
  if (window.GameAudio) window.GameAudio.play(names[id] || id);
}
