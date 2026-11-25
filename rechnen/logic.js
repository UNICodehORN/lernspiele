/*
 * Reine Spiellogik ohne DOM – dadurch direkt mit Node testbar.
 * Die Aufgabenarten orientieren sich am Stoff der 1. Klasse:
 * Zählen, Zahlenreihe, Vergleichen, Plus/Minus bis 20, Verdoppeln,
 * Zehnerfreunde, Zehner-Einer-Zerlegung und Plus über den Zehner.
 */
(function (root, factory) {
  const logic = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = logic;
  } else {
    root.MathLogic = logic;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Wie im ursprünglichen Spiel: neue Aufgabenarten kommen mit höheren Leveln dazu.
  const TYPES_BY_LEVEL = [
    { minLevel: 1, types: ["add", "count", "sequence"] },
    { minLevel: 2, types: ["compare"] },
    { minLevel: 3, types: ["double"] },
    { minLevel: 5, types: ["sub", "ten"] },
    { minLevel: 6, types: ["bond"] },
    { minLevel: 7, types: ["cross"] }
  ];
  const ALL_TYPES = [
    "add", "count", "sequence", "compare", "double",
    "sub", "ten", "bond", "cross"
  ];
  // Sondermodus: bei jeder Aufgabe eine neue, passende Art auswählen.
  const MIX_TYPE = "mix";

  function pick(list, rng) {
    return list[Math.floor(rng() * list.length)];
  }

  function shuffle(list, rng) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function randInt(min, max, rng) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  /* Summenobergrenze wächst mit dem Level – wie zuvor, jetzt bis 20. */
  function maxSumForLevel(level) {
    return Math.min(20, level + 4);
  }

  function availableTypes(level) {
    const types = [];
    TYPES_BY_LEVEL.forEach(entry => {
      if (level >= entry.minLevel) types.push(...entry.types);
    });
    // Höhere Level: die anspruchsvolleren Aufgaben kommen häufiger dran.
    if (level >= 8) types.push("cross", "bond", "sub");
    return types;
  }

  function pickType(level, rng, lastType) {
    const types = availableTypes(level).filter(type => type !== lastType);
    return pick(types.length ? types : availableTypes(level), rng);
  }

  function makeAddTask(level, rng) {
    const max = maxSumForLevel(level);
    let n1, n2;
    do {
      n1 = randInt(1, max - 1, rng);
      n2 = randInt(1, max - 1, rng);
    } while (n1 + n2 > max);
    return { type: "add", n1, n2, answer: n1 + n2, lineMax: max };
  }

  function makeSubTask(level, rng) {
    const max = maxSumForLevel(level);
    const n1 = randInt(2, max, rng);
    const n2 = randInt(1, n1, rng); // kein negatives Ergebnis
    return { type: "sub", n1, n2, answer: n1 - n2, lineMax: max };
  }

  function makeCrossTask(level, rng) {
    let n1, n2;
    do {
      n1 = randInt(2, 9, rng);
      n2 = randInt(2, 9, rng);
    } while (n1 + n2 <= 10); // immer über den Zehner
    return { type: "cross", n1, n2, answer: n1 + n2, lineMax: 20 };
  }

  function makeDoubleTask(level, rng) {
    const n = randInt(1, Math.min(10, 2 + level), rng);
    return { type: "double", n, answer: 2 * n, lineMax: 20 };
  }

  function makeTenTask(level, rng) {
    const n = randInt(1, 9, rng);
    return { type: "ten", n, answer: 10 - n, lineMax: 10 };
  }

  function makeBondTask(level, rng) {
    const total = randInt(11, 19, rng);
    return { type: "bond", total, answer: total - 10, lineMax: 20 };
  }

  function makeCompareTask(level, rng) {
    const max = Math.max(10, maxSumForLevel(level));
    let a, b;
    do {
      a = randInt(1, max, rng);
      b = randInt(1, max, rng);
    } while (a === b);
    const options = shuffle([a, b], rng);
    return {
      type: "compare",
      options,
      answerIndex: options.indexOf(Math.max(a, b)),
      lineMax: max
    };
  }

  function makeCountTask(level, rng, data) {
    const max = Math.max(5, maxSumForLevel(level));
    const count = randInt(1, max, rng);
    const emoji = pick(data.countEmoji, rng);

    // Ablenkzahlen liegen dicht am Ergebnis, damit genau hingeschaut wird.
    const near = [];
    [1, -1, 2, -2, 3, -3].forEach(delta => {
      const value = count + delta;
      if (value >= 1 && value <= max && near.indexOf(value) === -1) near.push(value);
    });
    const distractors = shuffle(near, rng).slice(0, 3);
    while (distractors.length < 3) {
      const value = randInt(1, max, rng);
      if (value !== count && distractors.indexOf(value) === -1) distractors.push(value);
    }
    const options = shuffle([count].concat(distractors), rng);
    return {
      type: "count",
      emoji,
      count,
      options,
      answerIndex: options.indexOf(count)
    };
  }

  function makeSequenceTask(level, rng) {
    const max = Math.max(10, maxSumForLevel(level));
    const start = randInt(1, max - 4, rng);
    const numbers = [start, start + 1, start + 2, start + 3, start + 4];
    const gap = randInt(1, 3, rng);
    return {
      type: "sequence",
      numbers,
      gap,
      answer: numbers[gap],
      lineMax: max
    };
  }

  function createTask(level, rng, data, lastType, forcedType) {
    const safeRng = typeof rng === "function" ? rng : Math.random;
    const safeData = data && Array.isArray(data.countEmoji) && data.countEmoji.length
      ? data
      : { countEmoji: ["⭐"] };
    const safeLevel = Math.max(1, Math.floor(level) || 1);
    // Mix wählt pro Aufgabe neu aus dem für das Level freigegebenen Topf.
    // Beim gezielten Training ist der gewählte Typ unabhängig vom Level erlaubt.
    const type = forcedType !== MIX_TYPE && ALL_TYPES.indexOf(forcedType) !== -1
      ? forcedType
      : pickType(safeLevel, safeRng, lastType);
    let task;

    switch (type) {
      case "add": task = makeAddTask(safeLevel, safeRng); break;
      case "sub": task = makeSubTask(safeLevel, safeRng); break;
      case "cross": task = makeCrossTask(safeLevel, safeRng); break;
      case "double": task = makeDoubleTask(safeLevel, safeRng); break;
      case "ten": task = makeTenTask(safeLevel, safeRng); break;
      case "bond": task = makeBondTask(safeLevel, safeRng); break;
      case "compare": task = makeCompareTask(safeLevel, safeRng); break;
      case "count": task = makeCountTask(safeLevel, safeRng, safeData); break;
      case "sequence": task = makeSequenceTask(safeLevel, safeRng); break;
      default: throw new Error("Unbekannter Aufgabentyp: " + type);
    }

    task.level = safeLevel;
    return task;
  }

  /* Nur eindeutige, nicht negative Zahlen akzeptieren – leere Felder sind falsch. */
  function toNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^\d+$/.test(value.trim())) {
      return Number(value.trim());
    }
    return NaN;
  }

  function isCorrect(task, answer) {
    if (!task) return false;
    switch (task.type) {
      case "count":
      case "compare":
        return toNumber(answer) === task.answerIndex;
      case "sequence":
      case "add":
      case "sub":
      case "double":
      case "ten":
      case "bond":
      case "cross":
        return toNumber(answer) === task.answer;
      default:
        return false;
    }
  }

  return {
    ALL_TYPES,
    MIX_TYPE,
    availableTypes,
    createTask,
    isCorrect,
    maxSumForLevel,
    toNumber
  };
});
