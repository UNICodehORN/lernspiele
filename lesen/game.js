/*
 * Wort-Welt – Spielsteuerung, Darstellung, Sprachausgabe und Mikrofon.
 */
"use strict";

const TASKS_PER_LEVEL = 3;
const SKIP_AFTER_WRONG = 2;
const LEVEL_EMOJIS = [
  "⭐", "🐵", "🦍", "🐘", "🦔", "🦙", "🐆", "🐎",
  "🦄", "🐬", "🦉", "🦦", "🦥", "🦚", "🦜", "🐉",
  "🐲", "🦖", "🐢", "🐸", "🐝"
];
const TYPE_INFO = [
  { type: "all", icon: "🎲", name: "Alle gemischt", desc: "Alle Aufgaben abwechselnd." },
  { type: "syllables", icon: "🔢", name: "Silben zählen", desc: "Wie viele Silben hat das Wort?" },
  { type: "speak", icon: "🎤", name: "Wort aussprechen", desc: "Sag das zum Bild passende Wort laut." },
  { type: "choose", icon: "🖼️", name: "Wort finden", desc: "Welches Wort passt zum Bild?" },
  { type: "readAloud", icon: "📖", name: "Wort lesen", desc: "Lies das Wort und sprich es laut aus." },
  { type: "rhyme", icon: "🎵", name: "Reime finden", desc: "Welche Wörter reimen sich?" },
  { type: "compare", icon: "⚖️", name: "Mehr Silben", desc: "Zwei Wörter vergleichen." },
  { type: "letter", icon: "🔍", name: "Buchstabe suchen", desc: "Alle passenden Bilder anklicken." },
  { type: "syllablesRead", icon: "🗣️", name: "Silben lesen", desc: "Silben einzeln lesen und zu einem Wort verbinden." },
  { type: "letterSalad", icon: "🔤", name: "Buchstabensalat", desc: "Buchstaben richtig ordnen." }
];

const DOMINO_SVG =
  '<svg viewBox="0 0 100 150" aria-hidden="true">' +
  '<rect x="4" y="4" width="92" height="142" rx="12" fill="#ffffff" stroke="#37474f" stroke-width="5"/>' +
  '<line x1="50" y1="8" x2="50" y2="142" stroke="#37474f" stroke-width="4"/>' +
  '<circle cx="27" cy="38" r="8" fill="#37474f"/>' +
  '<circle cx="27" cy="75" r="8" fill="#37474f"/>' +
  '<circle cx="27" cy="112" r="8" fill="#37474f"/>' +
  '<circle cx="73" cy="38" r="8" fill="#37474f"/>' +
  '<circle cx="73" cy="112" r="8" fill="#37474f"/>' +
  "</svg>";
const IGLOO_SVG =
  '<svg viewBox="0 0 140 110" aria-hidden="true">' +
  '<path d="M12 102 A58 58 0 0 1 128 102 Z" fill="#eaf6ff" stroke="#546e7a" stroke-width="5"/>' +
  '<path d="M34 64 H106 M18 84 H122 M52 46 V64 M88 46 V64 M36 64 V84 M104 64 V84" stroke="#90a4ae" stroke-width="3" fill="none"/>' +
  '<path d="M56 102 V79 A14 14 0 0 1 84 79 V102 Z" fill="#607d8b" stroke="#37474f" stroke-width="3"/>' +
  '<circle cx="30" cy="24" r="4" fill="#ffffff"/><circle cx="110" cy="26" r="5" fill="#ffffff"/>' +
  "</svg>";
const SALAMI_SVG =
  '<svg viewBox="0 0 120 120" aria-hidden="true">' +
  '<ellipse cx="60" cy="60" rx="48" ry="40" fill="#c0392b" stroke="#7b241c" stroke-width="5"/>' +
  '<ellipse cx="60" cy="60" rx="38" ry="31" fill="#d45b4a" stroke="#a04030" stroke-width="3"/>' +
  '<circle cx="44" cy="50" r="6" fill="#fff3e6"/><circle cx="72" cy="46" r="5" fill="#fff3e6"/>' +
  '<circle cx="58" cy="70" r="7" fill="#fff3e6"/><circle cx="82" cy="70" r="4" fill="#fff3e6"/>' +
  '<circle cx="34" cy="66" r="4" fill="#fff3e6"/>' +
  "</svg>";
const DESK_SVG =
  '<svg viewBox="0 0 140 120" aria-hidden="true">' +
  '<rect x="10" y="22" width="120" height="16" rx="6" fill="#8d6e63" stroke="#5d4037" stroke-width="4"/>' +
  '<rect x="18" y="38" width="10" height="62" rx="4" fill="#6d4c41"/>' +
  '<rect x="112" y="38" width="10" height="62" rx="4" fill="#6d4c41"/>' +
  '<rect x="30" y="52" width="80" height="10" rx="4" fill="#a1887f"/>' +
  '<rect x="14" y="96" width="18" height="6" rx="3" fill="#5d4037"/>' +
  '<rect x="108" y="96" width="18" height="6" rx="3" fill="#5d4037"/>' +
  "</svg>";

const MIC_TYPES = ["speak", "readAloud", "syllablesRead"];

let selectedType = "all";
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
let allowedTypes = WordLogic.ALL_TYPES.slice();
let recognition = null;
let toastTimer = null;
let emojiTimer = null;

const SpeechRecognitionApi =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

function $(id) {
  return document.getElementById(id);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function noRead(node) {
  if (node) node.dataset.noRead = "";
  return node;
}

function picture(word, sizeClass) {
  const node = el("span", "picture " + (sizeClass || "big-art"));
  if (word.art === "domino") node.innerHTML = DOMINO_SVG;
  else if (word.art === "igloo") node.innerHTML = IGLOO_SVG;
  else if (word.art === "salami") node.innerHTML = SALAMI_SVG;
  else if (word.art === "desk") node.innerHTML = DESK_SVG;
  else node.textContent = word.emoji || "❓";
  return node;
}

/* ---------------------- Start & Grundfunktionen ---------------------- */

function updateAllowedTypes() {
  allowedTypes = WordLogic.ALL_TYPES.slice();
  if (!AppBootstrap.canUseMicrophone(appConfig)) {
    allowedTypes = allowedTypes.filter(type => MIC_TYPES.indexOf(type) === -1);
  }
}

function startScreenInit(data, config) {
  window.WORD_DATA = data;
  appConfig = config || null;
  updateAllowedTypes();

  const grid = $("typeGrid");
  TYPE_INFO.filter(info => info.type === "all" || allowedTypes.indexOf(info.type) !== -1)
    .forEach(info => {
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

  const hint = $("startHint");
  if (hint && !AppBootstrap.canUseMicrophone(appConfig)) {
    hint.textContent = "Wähle eine Aufgabe aus. Tippe auf einen Text – bei Buttons und Links genügt Hovern. Das Mikrofon ist heute aus.";
  }

  $("readTaskBtn").addEventListener("click", readTaskAloud);
  $("changeTypeBtn").addEventListener("click", showTypeSelection);
  $("soundToggle").addEventListener("click", toggleSound);
  $("micRetry").addEventListener("click", startListening);
  $("micCancel").addEventListener("click", closeMic);
  $("skipBtn").addEventListener("click", skipTask);
  $("micSkip").addEventListener("click", skipTask);
  $("micForm").addEventListener("submit", event => {
    event.preventDefault();
    const typed = $("micText").value.trim();
    closeMic();
    if (typed) {
      showHeard([typed], "Eingegeben");
      submitAnswer(typed);
    }
  });
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
  selectedType = type || "all";
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
  closeMic();
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (error) {
      // Ignorieren.
    }
  }
  currentTask = null;
  locked = false;
  updateSkipButtons();
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
  currentTask = WordLogic.createTask(
    currentLevel, Math.random, WORD_DATA, lastType,
    selectedType === "all" ? null : selectedType,
    allowedTypes
  );
  lastType = currentTask.type;
  currentTask.selected = [];
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
  showToast(soundOn ? "Ton an 🔊" : "Ton aus 🔇", "", "ok");
}

/* ---------------------- Darstellung der Aufgaben ---------------------- */

function speakButton(word) {
  const button = el("button", "btn btn-speak", "🔊 Anhören");
  button.type = "button";
  button.addEventListener("click", () => speakWord(word));
  return button;
}

function micButton() {
  const button = el("button", "btn btn-mic", "🎤 Wort aussprechen");
  button.type = "button";
  button.addEventListener("click", startListening);
  return button;
}

function wordOption(word, index, showPicture, sizeClass, showWord) {
  const button = el("button", "option");
  button.type = "button";
  button.dataset.index = String(index);
  if (showPicture) button.appendChild(picture(word, sizeClass || "opt-art"));
  if (showWord !== false) button.appendChild(el("span", "", word.w));
  return button;
}

function renderTask() {
  const task = currentTask;
  const prompt = $("taskPrompt");
  const visual = $("taskVisual");
  const controls = $("taskControls");

  prompt.textContent = "";
  $("heardText").textContent = "";
  visual.replaceChildren();
  controls.replaceChildren();
  controls.className = "controls";
  controls.onclick = null;

  switch (task.type) {
    case "syllables": {
      prompt.textContent = "Wie viele Silben hat dieses Wort?";
      visual.appendChild(el("div", "big-word", task.word.w));
      for (let i = 1; i <= 4; i++) {
        const button = el("button", "btn number-btn", String(i));
        button.type = "button";
        button.dataset.answer = String(i);
        controls.appendChild(button);
      }
      controls.onclick = event => {
        const button = event.target.closest("[data-answer]");
        if (button) submitAnswer(button.dataset.answer);
      };
      break;
    }

    case "speak": {
      prompt.textContent = "Sag das Wort laut!";
      visual.appendChild(picture(task.word, "big-art"));
      controls.appendChild(micButton());
      break;
    }

    case "choose": {
      prompt.textContent = "Welches Wort ist das?";
      visual.appendChild(picture(task.word, "big-art"));
      const grid = el("div", "option-grid" + (task.options.length === 3 ? " three" : ""));
      // Antworten sind zum Lesen da – sie werden nicht vorgelesen.
      task.options.forEach((word, index) => grid.appendChild(noRead(wordOption(word, index, false))));
      controls.appendChild(grid);
      controls.onclick = event => optionClick(event);
      break;
    }

    case "readAloud": {
      prompt.textContent = "Lies das Wort und sag es laut!";
      visual.appendChild(noRead(el("div", "big-word", task.word.w)));
      controls.appendChild(micButton());
      break;
    }

    case "rhyme": {
      prompt.textContent = "Welches Wort reimt sich?";
      visual.appendChild(picture(task.word, "big-art"));
      visual.appendChild(el("div", "word-label", task.word.w));
      const grid = el("div", "option-grid" + (task.options.length === 3 ? " three" : ""));
      task.options.forEach((word, index) =>
        grid.appendChild(noRead(wordOption(word, index, currentLevel < 4)))
      );
      controls.appendChild(grid);
      controls.onclick = event => optionClick(event);
      break;
    }

    case "compare": {
      prompt.textContent = "Welches Wort hat mehr Silben?";
      const grid = el("div", "pair-grid");
      task.options.forEach((word, index) => {
        const button = noRead(wordOption(word, index, true, "pair-art"));
        button.appendChild(el("span", "word-label", word.w));
        grid.appendChild(button);
      });
      controls.appendChild(grid);
      const sounds = el("div", "controls");
      task.options.forEach(word => sounds.appendChild(noRead(speakButton(word.w))));
      controls.appendChild(sounds);
      controls.onclick = event => optionClick(event);
      break;
    }

    case "syllablesRead": {
      prompt.textContent = "Lies laut die einzelnen Silben und verbinde sie zu einem Wort.";
      visual.appendChild(el("div", "syllable-chain"));
      updateSyllableRead();
      if (task.stepIndex < task.steps.length) {
        const next = el("button", "btn btn-ok", "Silbe gelesen 👉");
        next.type = "button";
        next.id = "syllableNext";
        next.addEventListener("click", nextSyllable);
        controls.appendChild(next);
      } else {
        const mic = micButton();
        mic.textContent = "🎤 Ganzes Wort sagen";
        controls.appendChild(mic);
      }
      break;
    }

    case "letterSalad": {
      prompt.textContent = "Setze die Buchstaben in die richtige Reihenfolge!";
      visual.appendChild(picture(task.word, "big-art"));
      const slots = el("div", "letter-slots");
      slots.id = "letterSlots";
      controls.appendChild(slots);
      const tiles = el("div", "letter-tiles");
      task.letters.forEach((letter, index) => {
        const button = noRead(el("button", "letter-tile", letter.ch.toUpperCase()));
        button.type = "button";
        button.dataset.index = String(index);
        tiles.appendChild(button);
      });
      controls.appendChild(tiles);
      const undo = el("button", "btn btn-ghost", "↩️ Löschen");
      undo.type = "button";
      undo.addEventListener("click", undoLetter);
      controls.appendChild(undo);
      controls.onclick = event => letterSaladClick(event);
      renderLetterSlots();
      break;
    }

    case "letter": {
      prompt.textContent = "In welchen Worten steckt das „" + task.letter + "“? Alle Bilder anklicken!";
      visual.appendChild(el("div", "big-word", task.letter.toUpperCase()));
      const grid = el("div", "option-grid");
      task.options.forEach((word, index) => {
        // Nur das Bild zeigen: das Kind hört das Wort beim Antippen.
        grid.appendChild(wordOption(word, index, true, "opt-art", false));
      });
      controls.appendChild(grid);
      const ok = el("button", "btn btn-ok", "Fertig ✅");
      ok.type = "button";
      ok.disabled = true;
      ok.id = "letterOk";
      ok.addEventListener("click", () => submitAnswer(task.selected.slice()));
      controls.appendChild(ok);
      controls.onclick = event => letterClick(event);
      break;
    }

    default:
      prompt.textContent = "Aufgabe nicht verfügbar.";
  }

  updateHint();
}

function nextSyllable() {
  if (locked || !currentTask || currentTask.type !== "syllablesRead") return;
  if (currentTask.stepIndex < currentTask.steps.length) {
    currentTask.stepIndex += 1;
    renderTask();
  }
}

function updateSyllableRead() {
  const task = currentTask;
  if (!task || task.type !== "syllablesRead") return;
  const row = $("taskVisual").querySelector(".syllable-chain");
  if (!row) return;
  row.replaceChildren();
  task.steps.forEach((step, index) => {
    const className =
      "syllable-tile" +
      (index < task.stepIndex ? " done" : "") +
      (index === task.stepIndex ? " current" : "");
    row.appendChild(noRead(el("span", className, (index < task.stepIndex ? "✓ " : "") + step)));
  });
}

function renderLetterSlots() {
  const slots = $("letterSlots");
  if (!slots || !currentTask) return;
  slots.replaceChildren();
  const word = currentTask.word.w;
  for (let i = 0; i < word.length; i++) {
    const chosen = currentTask.selected[i];
    const text = chosen === undefined ? "_" : currentTask.letters[chosen].ch.toUpperCase();
    slots.appendChild(noRead(el("span", "letter-slot" + (chosen === undefined ? "" : " filled"), text)));
  }
}

function letterSaladClick(event) {
  if (locked) return;
  const button = event.target.closest("[data-index]");
  if (button) chooseLetter(Number(button.dataset.index));
}

function chooseLetter(index) {
  if (locked || !currentTask || currentTask.type !== "letterSalad") return;
  const letter = currentTask.letters[index];
  if (!letter || index < 0) return;
  const next = currentTask.word.w[currentTask.selected.length];
  if (letter.ch.toLowerCase() !== next.toLowerCase()) {
    const button = $("taskControls").querySelector('[data-index="' + index + '"]');
    if (button) {
      button.classList.add("wrong");
      window.setTimeout(() => button.classList.remove("wrong"), 500);
    }
    handleWrong();
    return;
  }
  currentTask.selected.push(index);
  const button = $("taskControls").querySelector('[data-index="' + index + '"]');
  if (button) {
    button.classList.add("used");
    button.disabled = true;
  }
  renderLetterSlots();
  if (currentTask.selected.length === currentTask.word.w.length) {
    submitAnswer(currentTask.selected.map(i => currentTask.letters[i].ch));
  }
}

function undoLetter() {
  if (locked || !currentTask || currentTask.type !== "letterSalad") return;
  const index = currentTask.selected.pop();
  if (index === undefined) return;
  const button = $("taskControls").querySelector('[data-index="' + index + '"]');
  if (button) {
    button.classList.remove("used");
    button.disabled = false;
  }
  renderLetterSlots();
}

function optionClick(event) {
  if (locked) return;
  const button = event.target.closest("[data-index]");
  if (!button) return;
  markOption(button, "selected");
  submitAnswer(Number(button.dataset.index));
}

function letterClick(event) {
  if (locked) return;
  const button = event.target.closest("[data-index]");
  if (!button) return;
  const index = Number(button.dataset.index);
  const position = currentTask.selected.indexOf(index);
  if (position === -1) {
    currentTask.selected.push(index);
    button.classList.add("selected");
    const word = currentTask.options[index];
    if (word) speakWord(word.w);
  } else {
    currentTask.selected.splice(position, 1);
    button.classList.remove("selected");
  }
  $("letterOk").disabled = currentTask.selected.length === 0;
}

function markOption(button, className) {
  const all = $("taskControls").querySelectorAll(".option");
  all.forEach(option => option.classList.remove(className));
  button.classList.add(className);
}

function updateHint() {
  const hint = $("taskHint");
  hint.replaceChildren();
  const task = currentTask;
  updateSkipButtons();
  if (!task) return;

  if (wrongCount < 2) {
    const texts = {
      syllables: "Sprich langsam und klatsche mit den Händen mit.",
      speak: "Schau dir das Bild genau an und sag das Wort laut.",
      choose: "Schau genau hin – die Wörter klingen ähnlich.",
      readAloud: "Lies das Wort leise und sag es dann laut.",
      rhyme: "Reimwörter klingen am Ende gleich.",
      compare: "Denk daran, wie viele Teile du mitklatschen kannst.",
      letter: "Es gibt mehr als ein richtiges Bild.",
      syllablesRead: "Lies eine Silbe nach der anderen und sag dann das ganze Wort.",
      letterSalad: "Tippe die Buchstaben der Reihe nach an."
    };
    hint.textContent = texts[task.type] || "";
    return;
  }

  if (task.type === "syllables") {
    hint.appendChild(el("span", "", "So geht es: "));
    const row = el("span", "syllable-row");
    task.word.syl.forEach(part => row.appendChild(el("span", "", part)));
    hint.appendChild(row);
  } else if (task.type === "speak") {
    hint.textContent = "Schau dir das Bild genau an und sag den Namen laut.";
  } else if (task.type === "readAloud") {
    hint.textContent = "Lies das Wort leise und sag es dann laut.";
  } else if (task.type === "choose" || task.type === "rhyme" || task.type === "compare") {
    const answer = task.options[task.answerIndex];
    hint.textContent = "Tipp: Es beginnt mit „" + answer.w[0] + "“.";
  } else if (task.type === "syllablesRead") {
    hint.textContent = "Erst alle Silben laut lesen, dann das ganze Wort sagen.";
  } else if (task.type === "letterSalad") {
    const next = task.word.w[task.selected.length];
    hint.textContent = "Der nächste Buchstabe ist „" + String(next || "").toUpperCase() + "“.";
  } else {
    hint.textContent = "Tipp: Tippe auf ein Bild und höre dir das Wort an.";
  }
}

/* ---------------------- Antworten & Punkte ---------------------- */

function submitAnswer(answer) {
  if (!currentTask || locked) return;
  const correct = WordLogic.isCorrect(currentTask, answer);
  if (!correct) {
    handleWrong();
    return;
  }
  handleCorrect();
}

function handleCorrect() {
  locked = true;
  updateSkipButtons();
  streak += 1;
  const bonus = streak >= 3 ? 1 : 0;
  currentPoints += currentLevel + bonus;
  tasksDone += 1;
  updateStats();
  updateProgress();

  playSound("successSound", 0.35);
  showEmojiToast("🎉", "show");
  showToast(
    bonus ? "Super! +" + (currentLevel + bonus) + " Punkte" : "Richtig! +" + currentLevel + " Punkte",
    bonus ? "Drei in Folge – Extra-Punkt! 🌟" : "Weiter so!",
    "ok"
  );
  showConfetti();

  const levelUp = tasksDone >= TASKS_PER_LEVEL;
  if (levelUp) {
    currentLevel += 1;
    tasksDone = 0;
  }

  const delay = levelUp ? 1600 : 800;
  window.setTimeout(() => {
    if (levelUp) {
      showFirework();
      playSound("lvlupSound", 0.4);
      const emoji = LEVEL_EMOJIS[(currentLevel - 1) % LEVEL_EMOJIS.length];
      showToast("Level " + currentLevel + "! " + emoji, "Jetzt wird es etwas schwerer.", "ok");
      updateStats();
      updateProgress();
    }
    newTask();
  }, delay);
}

function updateSkipButtons() {
  const show = !!currentTask && !locked && wrongCount >= SKIP_AFTER_WRONG;
  $("skipBtn").classList.toggle("hidden", !show);
  $("micSkip").classList.toggle("hidden", !show);
}

// Fehlversuche zählen (auch beim Mikrofon), aber nur echte Fehlantworten
// kosten einen Punkt. Ab SKIP_AFTER_WRONG erscheinen Tipp und Überspringen.
function registerMiss() {
  wrongCount += 1;
  streak = 0;
  updateHint();
}

function skipTask() {
  if (!currentTask || locked) return;
  closeMic();
  wrongCount = 0;
  streak = 0;
  showToast("Aufgabe übersprungen", "Weiter mit der nächsten Aufgabe – versuch es später noch einmal!", "ok");
  newTask();
}

function handleWrong() {
  registerMiss();
  currentPoints = Math.max(0, currentPoints - 1);
  updateStats();
  playSound("failSound", 0.45);
  showEmojiToast("👹", "fail show");
  showToast("Noch nicht ganz", "Versuch es noch einmal – du schaffst das!", "error");
}

function handleKeyboard(event) {
  if (!$("startScreen").classList.contains("hidden")) {
    // Die Auswahlbuttons werden vom Browser selbst per Enter/Leertaste ausgelöst.
    return;
  }
  if (!currentTask || locked) return;
  if (!$("micOverlay").classList.contains("hidden")) return;

  const key = event.key;
  if (currentTask.type === "syllables" && /^[1-4]$/.test(key)) {
    submitAnswer(Number(key));
  } else if (
    ["choose", "rhyme", "compare"].indexOf(currentTask.type) !== -1 &&
    /^[1-4]$/.test(key)
  ) {
    const index = Number(key) - 1;
    if (currentTask.options[index]) submitAnswer(index);
  } else if (currentTask.type === "letter" && key === "Enter") {
    if (currentTask.selected.length) submitAnswer(currentTask.selected.slice());
  } else if (currentTask.type === "letterSalad" && /^[1-9]$/.test(key)) {
    const index = Number(key) - 1;
    if (currentTask.letters[index]) chooseLetter(index);
  } else if (currentTask.type === "letterSalad" && (key === "Backspace" || key === "Delete")) {
    undoLetter();
  } else if (
    ["speak", "readAloud", "syllablesRead"].indexOf(currentTask.type) !== -1 &&
    (currentTask.type !== "syllablesRead" || currentTask.stepIndex >= currentTask.steps.length) &&
    (key === "m" || key === "M")
  ) {
    startListening();
  }
}

/* ---------------------- Sprachausgabe (TTS) ---------------------- */

function readTaskAloud() {
  const task = currentTask;
  if (!task) return;
  let text = $("taskPrompt").textContent;
  if (task.type === "letter") {
    text = "Wo steckt das " + task.letter + "? Klicke alle passenden Bilder an.";
  } else if (task.type === "compare") {
    text += " " + task.options[0].w + " und " + task.options[1].w + ".";
  } else if (["speak", "readAloud", "choose", "letterSalad", "syllablesRead"].indexOf(task.type) !== -1) {
    // Nur die Aufgabenstellung – gesuchtes Wort und Antworten bleiben geheim.
  } else if (task.word) {
    text += " " + task.word.w + ".";
  }
  speakWord(text);
}

function speakWord(word) {
  if (!soundOn) {
    showToast("Ton ist aus", "Tippe auf 🔊 oben rechts.", "error");
    return false;
  }
  return Speak.speak(word, {
    onError: message => showToast("Keine Sprachausgabe", message, "error")
  });
}

/* ---------------------- Mikrofon ---------------------- */

// Das erkannte Wort wird sofort in der Aufgabenkarte angezeigt, damit man
// sehen kann, was das Mikrofon tatsächlich verstanden hat.
function showHeard(texts, label) {
  const box = $("heardText");
  if (!box) return;
  const cleaned = (texts || [])
    .map(text => String(text || "").trim().replace(/\s+/g, " "))
    .filter(Boolean);
  if (!cleaned.length) {
    box.textContent = "";
    return;
  }
  box.textContent = "👂 " + (label || "Erkannt") + ": „" + cleaned[0] + "“";
  const extra = cleaned.slice(1, 3);
  if (extra.length) {
    box.textContent += " – auch: " + extra.map(text => "„" + text + "“").join(", ");
  }
}

function showNothingHeard() {
  const box = $("heardText");
  if (box) box.textContent = "👂 Nichts erkannt – noch einmal versuchen.";
}

function startListening() {
  if (!currentTask || locked) return;
  if (!AppBootstrap.canUseMicrophone(appConfig)) {
    showToast("Mikrofon ist aus", "Wähle eine Aufgabe ohne Sprechen.", "error");
    return;
  }
  // Die Sprachausgabe darf nicht mit ins Mikrofon sprechen.
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (error) {
      // Sprachausgabe ist optional.
    }
  }
  const overlay = $("micOverlay");
  overlay.classList.remove("hidden");
  $("micHeard").textContent = "";
  $("heardText").textContent = "";
  $("micStatus").textContent = "Ich höre zu … Sag das Wort laut!";
  $("micIcon").textContent = "🎤";
  $("micFallback").open = false;
  $("micText").value = "";
  updateSkipButtons();

  if (!SpeechRecognitionApi) {
    $("micStatus").textContent = "Mikrofon geht hier nicht – tippe das Wort.";
    $("micIcon").textContent = "⌨️";
    $("micFallback").open = true;
    return;
  }

  stopRecognition();
  try {
    const current = new SpeechRecognitionApi();
    recognition = current;
    current.lang = "de-DE";
    current.interimResults = false;
    current.continuous = false;
    current.maxAlternatives = 5;
    let handled = false;
    let hadError = false;

    current.onresult = event => {
      if (handled) return;
      handled = true;
      const result = event.results[0];
      const alternatives = [];
      for (let i = 0; i < result.length; i++) alternatives.push(result[i].transcript);
      const heard = alternatives[0] || "";
      $("micHeard").textContent = "Du hast gesagt: " + heard;
      showHeard(alternatives);

      if (alternatives.some(text => WordLogic.isCorrect(currentTask, text))) {
        closeMic();
        submitAnswer(heard);
      } else {
        registerMiss();
        $("micStatus").textContent = "Hmm, das war's noch nicht. Nochmal versuchen?";
        $("micIcon").textContent = "🤔";
      }
    };

    current.onerror = event => {
      if (handled) return;
      handled = true;
      hadError = true;
      if (event.error === "no-speech") {
        registerMiss();
        $("micStatus").textContent = "Ich habe nichts gehört. Nochmal oder tippe das Wort.";
        $("micFallback").open = true;
      } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        $("micStatus").textContent = "Mikrofon nicht erlaubt – tippe das Wort.";
        $("micFallback").open = true;
      } else {
        $("micStatus").textContent = "Mikrofon geht gerade nicht – tippe das Wort.";
        $("micFallback").open = true;
      }
      $("micIcon").textContent = "🙈";
    };

    current.onend = () => {
      if (!handled && !hadError) {
        registerMiss();
        $("micStatus").textContent = "Nochmal! Sag das Wort laut in das Mikrofon.";
        $("micIcon").textContent = "🎤";
        showNothingHeard();
      }
    };

    current.start();
  } catch (error) {
    $("micStatus").textContent = "Mikrofon geht hier nicht – tippe das Wort.";
    $("micIcon").textContent = "⌨️";
    $("micFallback").open = true;
  }
}

function stopRecognition() {
  if (!recognition) return;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  try {
    recognition.abort();
  } catch (error) {
    // Ignore: nothing is running.
  }
  recognition = null;
}

function closeMic() {
  stopRecognition();
  $("micOverlay").classList.add("hidden");
}

/* ---------------------- Effekte ---------------------- */

function playSound(id) {
  if (!soundOn) return;
  const names = {
    successSound: "success",
    failSound: "fail",
    lvlupSound: "levelup"
  };
  if (window.GameAudio) window.GameAudio.play(names[id] || id);
}

function showToast(title, message, type) {
  const toast = $("toast");
  $("toastTitle").textContent = title;
  $("toastMsg").textContent = message || "";
  $("toastIcon").textContent = type === "error" ? "👹" : "🎉";
  toast.classList.toggle("error", type === "error");
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function showEmojiToast(emoji, classes) {
  const toast = $(emoji === "🎉" ? "emojiToast" : "failToast");
  toast.textContent = emoji;
  toast.className = "emoji-toast " + classes;
  window.clearTimeout(emojiTimer);
  emojiTimer = window.setTimeout(() => {
    toast.className = "emoji-toast" + (toast.id === "failToast" ? " fail" : "");
  }, 1000);
}

function showConfetti() {
  const container = $("confetti");
  container.replaceChildren();
  const colors = ["c1", "c2", "c3", "c4", "c5"];
  for (let i = 0; i < 28; i++) {
    const piece = el("div", "confetti-piece " + colors[i % colors.length]);
    piece.style.left = Math.random() * 100 + "%";
    piece.style.animationDelay = Math.random() * 0.4 + "s";
    const size = 6 + Math.random() * 6;
    piece.style.width = size + "px";
    piece.style.height = size + "px";
    container.appendChild(piece);
  }
  window.setTimeout(() => container.replaceChildren(), 1800);
}

function showFirework() {
  const firework = $("firework");
  firework.classList.remove("show");
  void firework.offsetWidth; // Animation neu starten
  firework.classList.add("show");
  window.setTimeout(() => firework.classList.remove("show"), 1500);
}
