/*
 * Kurze Effekt-Töne direkt mit der Web Audio API erzeugt.
 * Damit werden keine Audio-Dateien mit unbekannter Herkunft benötigt.
 */
(function (root) {
  "use strict";

  let context = null;

  function audioContext() {
    const Api = root.AudioContext || root.webkitAudioContext;
    if (!Api) return null;
    if (!context) context = new Api();
    if (context.state === "suspended" && context.resume) context.resume();
    return context;
  }

  function tone(ctx, frequency, start, duration, volume, type) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  const SOUNDS = {
    success(ctx, now) {
      tone(ctx, 660, now, 0.14, 0.09);
      tone(ctx, 880, now + 0.12, 0.18, 0.09);
    },
    fail(ctx, now) {
      tone(ctx, 240, now, 0.16, 0.07, "triangle");
      tone(ctx, 180, now + 0.14, 0.22, 0.07, "triangle");
    },
    levelup(ctx, now) {
      [523, 659, 784, 1047].forEach((frequency, index) => {
        tone(ctx, frequency, now + index * 0.1, 0.16, 0.08);
      });
    }
  };

  const GameAudio = {
    play(name) {
      const effect = SOUNDS[name];
      if (!effect) return false;
      const ctx = audioContext();
      if (!ctx) return false;
      try {
        effect(ctx, ctx.currentTime + 0.01);
        return true;
      } catch (error) {
        return false;
      }
    }
  };

  root.GameAudio = GameAudio;
})(typeof window !== "undefined" ? window : this);
