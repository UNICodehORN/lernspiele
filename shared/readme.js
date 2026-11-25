/*
 * Zeigt die README.md formatiert innerhalb der App an.
 */
(function (root) {
  "use strict";

  const script = typeof document !== "undefined" ? document.currentScript : null;
  let baseRoot = script && script.dataset.root ? script.dataset.root : ".";
  let overlay = null;
  let content = null;

  function readmeUrl() {
    const base = new URL(baseRoot.replace(/\/?$/, "/"), root.location.href);
    return new URL("README.md", base).href;
  }

  function close() {
    if (overlay) overlay.classList.add("hidden");
  }

  async function open() {
    if (!overlay || !content) return;
    content.textContent = "Lädt …";
    overlay.classList.remove("hidden");
    try {
      const response = await fetch(readmeUrl(), { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      content.innerHTML = root.Markdown.render(await response.text());
    } catch (error) {
      content.textContent = "Die Readme konnte nicht geladen werden.";
    }
    const closeButton = root.document.getElementById("readmeClose");
    if (closeButton) closeButton.focus();
  }

  function init(newBaseRoot) {
    if (newBaseRoot) baseRoot = newBaseRoot;
    overlay = root.document.getElementById("readmeOverlay");
    content = root.document.getElementById("readmeContent");
    const button = root.document.getElementById("readmeBtn");
    const closeButton = root.document.getElementById("readmeClose");
    if (button) button.addEventListener("click", open);
    if (closeButton) closeButton.addEventListener("click", close);
    if (overlay) {
      overlay.addEventListener("click", event => {
        if (event.target === overlay) close();
      });
    }
    root.document.addEventListener("keydown", event => {
      if (event.key === "Escape" && overlay && !overlay.classList.contains("hidden")) close();
    });
  }

  root.Readme = { init, open, close };
})(typeof window !== "undefined" ? window : this);
