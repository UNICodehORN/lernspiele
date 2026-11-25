/*
 * Zahl-Welt – kleine Effekte: Toast, Emoji-Popup, Konfetti und Feuerwerk.
 * Die Spiellogik liegt in logic.js, die Steuerung in game.js.
 */
"use strict";

const Effects = (function () {
  let toastTimer = null;
  let emojiTimer = null;

  function $(id) {
    return document.getElementById(id);
  }

  function toast(title, message, type) {
    const node = $("toast");
    if (!node) return;
    $("toastTitle").textContent = title;
    $("toastMsg").textContent = message || "";
    $("toastIcon").textContent = type === "error" ? "👹" : "🎉";
    node.classList.toggle("error", type === "error");
    node.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => node.classList.remove("show"), 2400);
  }

  function emoji(kind) {
    const fail = kind === "fail";
    const node = fail ? $("failToast") : $("emojiToast");
    if (!node) return;
    node.textContent = fail ? "👹" : "🎉";
    node.className = "emoji-toast " + (fail ? "fail show" : "show");
    window.clearTimeout(emojiTimer);
    emojiTimer = window.setTimeout(() => {
      node.className = "emoji-toast" + (fail ? " fail" : "");
    }, 1000);
  }

  function confetti() {
    const container = $("confetti");
    if (!container) return;
    container.replaceChildren();
    const colors = ["c1", "c2", "c3", "c4", "c5"];
    for (let i = 0; i < 28; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece " + colors[i % colors.length];
      piece.style.left = Math.random() * 100 + "%";
      piece.style.animationDelay = Math.random() * 0.4 + "s";
      const size = 6 + Math.random() * 6;
      piece.style.width = size + "px";
      piece.style.height = size + "px";
      container.appendChild(piece);
    }
    window.setTimeout(() => container.replaceChildren(), 1800);
  }

  function firework() {
    const node = $("firework");
    if (!node) return;
    node.classList.remove("show");
    void node.offsetWidth; // Animation neu starten
    node.classList.add("show");
    window.setTimeout(() => node.classList.remove("show"), 1500);
  }

  return { toast, emoji, confetti, firework };
})();
