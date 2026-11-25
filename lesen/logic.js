/*
 * Reine Spiellogik ohne DOM – dadurch direkt mit Node testbar.
 */
(function (root, factory) {
  const logic = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = logic;
  } else {
    root.WordLogic = logic;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const TYPES_BY_LEVEL = [
    { minLevel: 1, types: ["syllables", "choose", "speak", "syllablesRead"] },
    { minLevel: 2, types: ["compare", "rhyme", "letterSalad"] },
    { minLevel: 3, types: ["readAloud", "letter"] }
  ];
  const HUNT_LETTERS = ["a", "e", "i", "n", "r", "s", "t", "l", "m", "b", "h", "k"];
  const ALL_TYPES = [
    "syllables", "speak", "choose", "readAloud", "rhyme", "compare", "letter",
    "syllablesRead", "letterSalad"
  ];
  const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

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

  function normalizeWord(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .trim()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripArticle(value) {
    return String(value).replace(
      /^(der|die|das|den|dem|ein|eine|einen|einem|einer|mein|meine)\s+/,
      ""
    ).trim();
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const current = [i];
      for (let j = 1; j <= b.length; j++) {
        current[j] = Math.min(
          previous[j] + 1,
          current[j - 1] + 1,
          previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      previous = current;
    }
    return previous[b.length];
  }

  /* Erkennung auch bei Artikel, Satzzeichen und kleinen Erkennungsfehlern akzeptieren.
   * Bei kurzen Wörtern (Haus/Maus) bleibt es bewusst streng. */
  function speechMatches(transcript, target) {
    const expected = normalizeWord(target);
    const heard = normalizeWord(transcript);
    if (!expected || !heard) return false;

    const candidates = [heard, stripArticle(heard)];
    heard.split(" ").forEach(word => {
      if (word) candidates.push(word, stripArticle(word));
    });

    return candidates.some(candidate => {
      if (!candidate) return false;
      if (candidate === expected) return true;
      if (candidate.split(" ").indexOf(expected) !== -1) return true;
      return expected.length >= 6 && levenshtein(candidate, expected) <= 1;
    });
  }

  function poolForLevel(level, data) {
    const maxSyllables = level <= 1 ? 2 : level <= 3 ? 3 : 99;
    return data.words.filter(word => word.syl.length <= maxSyllables);
  }

  function availableTypes(level, allowedTypes) {
    const types = [];
    TYPES_BY_LEVEL.forEach(entry => {
      if (level >= entry.minLevel) types.push(...entry.types);
    });
    // Höhere Level: häufiger die schwereren Aufgaben.
    if (level >= 4) types.push("rhyme", "letter", "readAloud", "syllables");
    if (Array.isArray(allowedTypes)) {
      return types.filter(type => allowedTypes.indexOf(type) !== -1);
    }
    return types;
  }

  function pickType(level, rng, lastType, allowedTypes) {
    const pool = availableTypes(level, allowedTypes);
    if (!pool.length) return null;
    const types = pool.filter(type => type !== lastType);
    return pick(types.length ? types : pool, rng);
  }

  function makeSyllableTask(level, rng, data) {
    let pool = poolForLevel(level, data);
    if (level >= 3) {
      const longer = pool.filter(word => word.syl.length >= 2);
      if (longer.length) pool = longer;
    }
    const word = pick(pool, rng);
    return { type: "syllables", word, answer: word.syl.length };
  }

  function makeSpeakTask(level, rng, data) {
    const word = pick(poolForLevel(level, data), rng);
    return { type: "speak", word, answer: word.w };
  }

  function makeReadAloudTask(level, rng, data) {
    let pool = poolForLevel(level, data);
    if (level >= 4) {
      const longer = pool.filter(word => word.syl.length >= 2);
      if (longer.length) pool = longer;
    }
    const word = pick(pool, rng);
    return { type: "readAloud", word, answer: word.w };
  }

  function makeChooseTask(level, rng, data) {
    const pool = poolForLevel(level, data);
    const word = pick(pool, rng);
    const count = level >= 3 ? 4 : 3;
    const sameStart = pool.filter(
      other => other.w !== word.w && other.w[0] === word.w[0]
    );
    let distractors;

    if (level >= 2 && sameStart.length >= count - 1) {
      distractors = shuffle(sameStart, rng).slice(0, count - 1);
    } else {
      distractors = shuffle(
        pool.filter(other => other.w !== word.w),
        rng
      ).slice(0, count - 1);
    }

    const options = shuffle([word].concat(distractors), rng);
    return {
      type: "choose",
      word,
      options,
      answerIndex: options.indexOf(word)
    };
  }

  function makeRhymeTask(level, rng, data) {
    const groups = data.rhymeGroups.filter(group => group.length >= 2);
    const group = pick(groups, rng);
    const names = shuffle(group, rng);
    const wordName = names[0];
    const answerName = names[1];
    const word = byName(data, wordName);
    const answer = byName(data, answerName);
    const count = level >= 3 ? 4 : 3;
    const rhymeEndings = [wordName, answerName].map(name => name.slice(-2));

    const distractors = shuffle(
      data.words.filter(other => {
        const name = other.w;
        if (group.indexOf(name) !== -1) return false;
        return !rhymeEndings.some(ending => name.slice(-2) === ending);
      }),
      rng
    ).slice(0, count - 1);

    const options = shuffle([answer].concat(distractors), rng);
    return {
      type: "rhyme",
      word,
      options,
      answerIndex: options.indexOf(answer)
    };
  }

  function makeCompareTask(level, rng, data) {
    const pool = poolForLevel(level, data);
    const left = pick(pool, rng);
    const different = pool.filter(
      word => word.syl.length !== left.syl.length && word.w !== left.w
    );
    const right = pick(different, rng);
    const options = shuffle([left, right], rng);
    const bigger = left.syl.length > right.syl.length ? left : right;
    return {
      type: "compare",
      options,
      answerIndex: options.indexOf(bigger)
    };
  }

  function makeLetterTask(level, rng, data) {
    const pool = poolForLevel(level, data);
    const count = level >= 4 ? 6 : 5;
    const maxHits = level >= 3 ? 3 : 2;

    let letter = null;
    let matches = [];
    const letters = shuffle(HUNT_LETTERS, rng);
    for (let i = 0; i < letters.length; i++) {
      const candidate = letters[i];
      const found = pool.filter(
        word => normalizeWord(word.w).indexOf(candidate) !== -1
      );
      if (found.length >= 2) {
        letter = candidate;
        matches = found;
        break;
      }
    }

    // Sicherheitsnetz: sollte kein Buchstabe passen, einfach einen ausgeben.
    if (!letter) {
      letter = "a";
      matches = pool.filter(word => normalizeWord(word.w).indexOf("a") !== -1);
    }

    const chosenHits = shuffle(matches, rng).slice(0, maxHits);
    const misses = shuffle(
      pool.filter(
        word =>
          chosenHits.indexOf(word) === -1 &&
          normalizeWord(word.w).indexOf(letter) === -1
      ),
      rng
    ).slice(0, count - chosenHits.length);

    const options = shuffle(chosenHits.concat(misses), rng);
    const answerIndices = options
      .map((word, index) =>
        normalizeWord(word.w).indexOf(letter) !== -1 ? index : -1
      )
      .filter(index => index !== -1);

    return { type: "letter", letter, options, answerIndices };
  }

  function makeSyllablesReadTask(level, rng, data) {
    // Nur mehrsilbige Wörter: die Silben werden einzeln gelesen,
    // geprüft wird ausschließlich das ganze Wort per Sprache.
    const multi = data.words.filter(word => word.syl.length > 1);
    const pool = poolForLevel(level, data).filter(word => word.syl.length > 1);
    const word = pick(pool.length ? pool : multi, rng);
    return {
      type: "syllablesRead",
      word,
      steps: word.syl.slice(),
      stepIndex: 0
    };
  }

  function makeLetterSaladTask(level, rng, data) {
    const pool = poolForLevel(level, data);
    const word = pick(pool, rng);
    const needed = word.w.split("");
    let extra = [];
    if (level >= 2) {
      extra = shuffle(ALPHABET, rng)
        .filter(letter => needed.map(c => c.toLowerCase()).indexOf(letter) === -1)
        .slice(0, level >= 4 ? 3 : 2);
    }
    const letters = shuffle(needed.concat(extra), rng).map(letter => ({ ch: letter }));
    // Nur das Bild zeigen – das Wort ist ausschließlich per Vorlese-Button hörbar.
    return {
      type: "letterSalad",
      word,
      letters,
      answer: word.w
    };
  }

  function byName(data, name) {
    return data.words.filter(word => word.w === name)[0];
  }

  function createTask(level, rng, data, lastType, forcedType, allowedTypes) {
    const safeRng = typeof rng === "function" ? rng : Math.random;
    const allowed = Array.isArray(allowedTypes) ? allowedTypes : ALL_TYPES;
    // Beim gezielten Training ist der gewählte Typ unabhängig vom Level erlaubt,
    // aber er darf nie außerhalb der erlaubten Aufgabenarten liegen.
    const type = allowed.indexOf(forcedType) !== -1
      ? forcedType
      : pickType(level, safeRng, lastType, allowed);
    if (!type) throw new Error("Keine erlaubte Aufgabenart verfügbar");
    let task;

    switch (type) {
      case "syllables":
        task = makeSyllableTask(level, safeRng, data);
        break;
      case "speak":
        task = makeSpeakTask(level, safeRng, data);
        break;
      case "readAloud":
        task = makeReadAloudTask(level, safeRng, data);
        break;
      case "choose":
        task = makeChooseTask(level, safeRng, data);
        break;
      case "rhyme":
        task = makeRhymeTask(level, safeRng, data);
        break;
      case "compare":
        task = makeCompareTask(level, safeRng, data);
        break;
      case "letter":
        task = makeLetterTask(level, safeRng, data);
        break;
      case "syllablesRead":
        task = makeSyllablesReadTask(level, safeRng, data);
        break;
      case "letterSalad":
        task = makeLetterSaladTask(level, safeRng, data);
        break;
      default:
        throw new Error("Unbekannter Aufgabentyp: " + type);
    }

    task.level = level;
    return task;
  }

  function isCorrect(task, answer) {
    switch (task.type) {
      case "syllables":
        return Number(answer) === task.answer;
      case "choose":
      case "rhyme":
      case "compare":
        return Number(answer) === task.answerIndex;
      case "letter": {
        const given = Array.isArray(answer)
          ? answer.map(Number).sort((a, b) => a - b)
          : [];
        const expected = task.answerIndices.slice().sort((a, b) => a - b);
        return (
          given.length === expected.length &&
          given.every((value, index) => value === expected[index])
        );
      }
      case "speak":
      case "readAloud":
        return speechMatches(answer, task.word.w);
      // Einzelne Silben werden nur gelesen, nicht geprüft.
      case "syllablesRead":
        return speechMatches(answer, task.word.w);
      case "letterSalad": {
        const typed = Array.isArray(answer) ? answer.join("") : String(answer || "");
        return normalizeWord(typed) === normalizeWord(task.word.w);
      }
      default:
        return false;
    }
  }

  return {
    ALL_TYPES,
    normalizeWord,
    levenshtein,
    speechMatches,
    availableTypes,
    createTask,
    isCorrect
  };
});
