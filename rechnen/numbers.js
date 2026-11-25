/*
 * Zugriff auf die Zahlen-Daten aus data/counting.json.
 * Im Browser werden die Daten vom gemeinsamen Bootstrap geladen,
 * in Node direkt aus der JSON-Datei (für die Smoke-Tests).
 */
(function (root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = data;
  } else {
    root.NUMBER_DATA = data;
  }
})(typeof self !== "undefined" ? self : this, function () {
  if (typeof module === "object" && module.exports) {
    return require("../data/counting.json");
  }
  return typeof self !== "undefined" && self.APP_DATA
    ? self.APP_DATA.rechnen || null
    : null;
});
