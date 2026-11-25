/*
 * Gemeinsamer Footer für alle Seiten der App.
 * Er wird einmal definiert und in Hauptmenü und beiden Modulen eingebunden.
 */
(function (root) {
  "use strict";

  const HTML =
    '<footer class="app-footer" data-no-read>' +
      'Copyright 2026 (c) made with ❤️ by ' +
      '<a href="https://github.com/UNICodehORN" target="_blank" rel="noopener noreferrer">UNICodehORN</a>' +
    "</footer>";

  function mount() {
    if (!root.document || !root.document.body) return;
    if (root.document.querySelector(".app-footer")) return;
    const template = root.document.createElement("template");
    template.innerHTML = HTML;
    root.document.body.appendChild(template.content);
  }

  if (root.document && root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})(typeof window !== "undefined" ? window : this);
