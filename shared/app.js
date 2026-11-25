/*
 * Gemeinsamer Bootstrap für Hauptmenü und Module.
 * Lädt data/config.json und die dort angegebenen lokalen Datendateien.
 * Es werden ausschließlich Dateien aus diesem Projekt geladen – keine externen APIs.
 */
(function (root) {
  "use strict";

  const script = typeof document !== "undefined" ? document.currentScript : null;
  const rootHint = script && script.dataset.root ? script.dataset.root : "..";

  const DEFAULT_CONFIG = {
    version: 1,
    sources: {
      lesen: "data/words.json",
      rechnen: "data/counting.json"
    },
    privacy: {
      allowExternalApis: true,
      allowMicrophone: true
    }
  };

  function isSafeLocalPath(path) {
    if (typeof path !== "string" || !path.trim()) return false;
    if (/^(?:[a-z]+:)?\/\//i.test(path)) return false;
    return path.split(/[\\/]/).every(part => part !== "..");
  }

  function resolveUrl(baseRoot, path) {
    if (!isSafeLocalPath(path)) {
      throw new Error("Nur lokale Dateien aus dem Projekt sind erlaubt: " + path);
    }
    const base = new URL(baseRoot.replace(/\/?$/, "/"), root.location.href);
    return new URL(path.replace(/^\.\//, ""), base).href;
  }

  function asBoolean(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
  }

  function normalizeConfig(raw) {
    const input = raw && typeof raw === "object" ? raw : {};
    const sourcesInput = input.sources && typeof input.sources === "object" ? input.sources : {};
    const privacyInput = input.privacy && typeof input.privacy === "object" ? input.privacy : {};
    const sources = {};

    Object.keys(DEFAULT_CONFIG.sources).forEach(name => {
      sources[name] = isSafeLocalPath(sourcesInput[name])
        ? sourcesInput[name]
        : DEFAULT_CONFIG.sources[name];
    });

    const privacy = {
      allowExternalApis: asBoolean(privacyInput.allowExternalApis, true),
      allowMicrophone: asBoolean(privacyInput.allowMicrophone, true)
    };
    // Ohne externe APIs darf auch kein Mikrofon verwendet werden.
    if (!privacy.allowExternalApis) privacy.allowMicrophone = false;

    return {
      version: Number.isFinite(input.version) ? input.version : DEFAULT_CONFIG.version,
      sources,
      privacy
    };
  }

  async function fetchJson(baseRoot, path) {
    const response = await fetch(resolveUrl(baseRoot, path), { cache: "no-store" });
    if (!response.ok) throw new Error(path + " konnte nicht geladen werden (HTTP " + response.status + ")");
    return response.json();
  }

  function showFatal(error) {
    const message = "Die Spiele konnten nicht geladen werden. Bitte einen lokalen Webserver starten und die Readme beachten. (" + (error && error.message ? error.message : "unbekannter Fehler") + ")";
    if (root.document && root.document.body) {
      root.document.body.replaceChildren(root.document.createTextNode(message));
    }
    if (root.console) root.console.error(error);
  }

  const AppBootstrap = {
    DEFAULT_CONFIG,

    async load(baseRoot, includeData) {
      const config = normalizeConfig(await fetchJson(baseRoot, "data/config.json"));
      root.APP_CONFIG = config;
      if (includeData !== false) {
        const data = {};
        for (const name of Object.keys(config.sources)) {
          data[name] = await fetchJson(baseRoot, config.sources[name]);
        }
        root.APP_DATA = data;
      }
      return config;
    },

    canUseMicrophone(config) {
      const privacy = (config || root.APP_CONFIG || DEFAULT_CONFIG).privacy;
      return privacy.allowExternalApis && privacy.allowMicrophone;
    },

    allowExternalApis(config) {
      return (config || root.APP_CONFIG || DEFAULT_CONFIG).privacy.allowExternalApis;
    },

    initSpeech(config) {
      if (root.Speak && typeof root.Speak.init === "function") root.Speak.init(config);
    },

    async startMenu(baseRoot) {
      const config = await this.load(baseRoot || rootHint, false);
      const lesenDesc = root.document.getElementById("lesenDesc");
      if (lesenDesc) {
        lesenDesc.textContent = this.canUseMicrophone(config)
          ? "Wörter, Silben, Lesen und Sprechen üben – mit Vorlesen und Mikrofon."
          : "Wörter, Silben und Lesen üben – mit Vorlesen.";
      }
      this.initSpeech(config);
      if (root.Readme && typeof root.Readme.init === "function") root.Readme.init(baseRoot || rootHint);
      return config;
    },

    async startModule(moduleName, ready, baseRoot) {
      const config = await this.load(baseRoot || rootHint, true);
      if (!root.APP_DATA || !root.APP_DATA[moduleName]) {
        throw new Error("Keine Daten für " + moduleName + " gefunden");
      }
      this.initSpeech(config);
      ready(root.APP_DATA[moduleName], config);
      return config;
    }
  };

  root.AppBootstrap = AppBootstrap;

  if (typeof document !== "undefined" && document.readyState === "complete") {
    // onload hat bereits gefeuert (z. B. bei dynamisch eingefügtem Script).
    if (document.body && document.body.dataset.bootstrap === "menu") {
      AppBootstrap.startMenu(rootHint).catch(showFatal);
    }
  }

  root.AppBootstrap.showFatal = showFatal;
})(typeof window !== "undefined" ? window : this);
