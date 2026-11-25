/*
 * Vorlesen durch Antippen des Textes selbst – ohne zusätzliche Icons.
 * Buttons und Links werden beim Hovern vorgelesen; ein Klick ist die Aktion.
 * Emojis und Lösungen werden grundsätzlich nicht mitgelesen.
 */
(function (root) {
  "use strict";

  let config = { privacy: { allowExternalApis: true, allowMicrophone: true } };
  let listenerAttached = false;
  let hoveredControl = null;

  const READABLE_SELECTOR = [
    "h1", "h2", "h3", "p", "summary",
    ".brand", ".stat", ".progress-text", ".small-print",
    ".prompt", ".hint", ".type-name", ".type-desc",
    ".word-label", ".big-word", ".heard-text",
    ".mic-status", ".mic-heard", ".toast-text",
    ".syllable-tile", ".letter-slot"
  ].join(",");

  // Buttons, Links und buttonartige Elemente: Hovern liest, Klick handelt.
  const INTERACTIVE_SELECTOR = "button, a, .start";

  // Emojis, Variation Selectors, ZWJ, Keycaps und Regionalindikatoren.
  const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D\u20E3]/gu;

  function stripEmoji(value) {
    return String(value == null ? "" : value)
      .replace(EMOJI_RE, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function germanVoices() {
    if (!("speechSynthesis" in root)) return [];
    return (root.speechSynthesis.getVoices() || [])
      .filter(voice => /^de[-_]?/i.test(voice.lang || ""));
  }

  function selectVoice() {
    const voices = germanVoices();
    if (!config.privacy.allowExternalApis) {
      return voices.filter(voice => voice.localService !== false)[0] || null;
    }
    return voices[0] || null;
  }

  function cleanText(element) {
    if (!element) return "";
    const clone = element.cloneNode(true);
    clone.querySelectorAll("[data-no-read]").forEach(node => node.remove());
    return stripEmoji(clone.textContent || "");
  }

  function speak(text, options) {
    const callbacks = options || {};
    const value = stripEmoji(text);
    if (!value) return false;
    if (!("speechSynthesis" in root) || !root.SpeechSynthesisUtterance) {
      if (callbacks.onError) callbacks.onError("Dieser Browser kann leider nicht vorlesen.");
      return false;
    }

    const voice = selectVoice();
    if (!config.privacy.allowExternalApis && !voice) {
      if (callbacks.onError) {
        callbacks.onError("Externe Stimmen sind aus. Es ist keine lokale deutsche Stimme verfügbar.");
      }
      return false;
    }

    try {
      root.speechSynthesis.cancel();
      const utterance = new root.SpeechSynthesisUtterance(value);
      utterance.lang = "de-DE";
      utterance.rate = 0.8;
      utterance.pitch = 1.1;
      if (voice) utterance.voice = voice;
      root.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      if (callbacks.onError) callbacks.onError("Dieser Browser kann leider nicht vorlesen.");
      return false;
    }
  }

  function hasWords(text) {
    return stripEmoji(text).replace(/[^\p{L}\p{N}]/gu, "").length >= 2;
  }

  function controlAt(node) {
    if (!node || typeof node.closest !== "function") return null;
    if (!root.document || !root.document.body) return null;
    if (node.closest("[data-no-read]")) return null;
    return node.closest(INTERACTIVE_SELECTOR);
  }

  function handleClick(event) {
    if (!event.target || typeof event.target.closest !== "function") return;
    // Buttons und Links (auch „Los geht's") gehören dem Hovern – der Klick
    // führt die Aktion aus und löst keine Sprachausgabe aus.
    if (controlAt(event.target)) return;
    if (event.target.closest("[data-no-read]")) return;
    const element = event.target.closest(READABLE_SELECTOR);
    if (!element) return;
    const text = cleanText(element);
    if (!text) return;
    speak(text);
  }

  function handleMouseOver(event) {
    const control = controlAt(event.target);
    if (!control || control === hoveredControl) return;
    hoveredControl = control;
    const text = cleanText(control);
    if (hasWords(text)) speak(text);
  }

  function handleMouseOut(event) {
    const control = event.target.closest
      ? event.target.closest(INTERACTIVE_SELECTOR)
      : null;
    if (!control || control !== hoveredControl) return;
    if (!event.relatedTarget || !control.contains(event.relatedTarget)) {
      hoveredControl = null;
    }
  }

  function init(newConfig) {
    if (newConfig && newConfig.privacy) config = newConfig;
    if (!listenerAttached && root.document) {
      root.document.addEventListener("click", handleClick);
      root.document.addEventListener("mouseover", handleMouseOver);
      root.document.addEventListener("mouseout", handleMouseOut);
      listenerAttached = true;
    }
    if ("speechSynthesis" in root) {
      root.speechSynthesis.onvoiceschanged = () => {
        // Stimmenliste wird beim nächsten Vorlesen neu gelesen.
      };
    }
  }

  root.Speak = { init, speak, selectVoice, cleanText, stripEmoji, hasWords };
})(typeof window !== "undefined" ? window : this);
