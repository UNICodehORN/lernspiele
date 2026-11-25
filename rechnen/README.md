# Zahl-Welt – Rechnen üben

Lokales Browserspiel für ein Kind in der 1. Klasse. Es nutzt dieselben Gamification-Elemente wie `../lesen` (Startbildschirm mit Aufgabenwahl, Punkte, Level, Fortschrittsbalken, Extrapunkt bei drei richtigen Aufgaben in Folge, Konfetti, Feuerwerk, Sounds, Vorlesen und Tipps), funktioniert offline und ist für Smartphones ausgelegt.

Die grundsätzliche Spiellogik des alten Rechenspiels bleibt erhalten: eine Aufgabe erscheint, das Ergebnis wird eingetippt und mit ✅ geprüft, die Zahlenreihe zeigt die beiden Zahlen, drei richtige Aufgaben ergeben ein neues Level. Neu sind die Aufgabenarten und der Zahlenraum bis 20.

## Starten

Das Spiel ist über das Hauptmenü (`../index.html`) erreichbar; der 🏠-Button in der Kopfzeile führt jederzeit dorthin zurück. Konfiguration und Zahlen-Daten werden als JSON geladen, daher bitte im Projektstamm einen lokalen Webserver starten und `http://localhost:8000/rechnen/index.html` öffnen. Direktes `file://` wird nicht unterstützt.

## Aufgabenarten

Auf dem Startbildschirm steht „🎲 Alles gemischt“ bereit: Dabei wird bei jeder Aufgabe eine neue Art ausgewählt – das ist der Standardmodus. Wer gezielt üben möchte, wählt eine einzelne Art; das Spiel trainiert dann nur diese. Mit „↩️ Andere Aufgabe wählen“ geht es zurück zur Auswahl. Neue Arten werden mit steigendem Level freigeschaltet und erscheinen im Mischmodus automatisch mit.

| Aufgabe | Was das Kind tut | Ab Level |
| --- | --- | --- |
| Alles gemischt | Bei jeder Aufgabe eine andere, passende Art | 1 |
| Plus rechnen | Zwei Zahlen addieren, Ergebnis eintippen | 1 |
| Zählen | Eine Gruppe Bilder zählen und die richtige Zahl antippen | 1 |
| Zahlenreihe | Die fehlende Zahl in einer Reihe von fünf Zahlen eintragen | 1 |
| Zahlen vergleichen | Von zwei Zahlen die größere antippen | 2 |
| Verdoppeln | Eine Zahl und noch einmal dieselbe zusammenrechnen | 3 |
| Minus rechnen | Subtrahieren, ohne negatives Ergebnis | 5 |
| Zehnerfreund | Ergänzen auf 10, z. B. 7 + ? = 10 | 5 |
| Zahl zerlegen | Zehner und Einer erkennen, z. B. 14 = 10 + ? | 6 |
| Über den Zehner | Plus mit Zehnerübergang, z. B. 8 + 5 | 7 |

Die Summen wachsen mit dem Level von 5 bis 20. Bei jeder Aufgabe gibt es den Button „🔊 Aufgabe vorlesen“; außerdem genügt bei fast jedem Text ein Tippen auf den Text selbst. Button- und Link-Texte werden beim Hovern vorgelesen, ein Klick löst nur die Aktion aus; Emojis bleiben stumm. Nach zwei Fehlern erscheint ein konkreter Tipp. Pro Level sind drei richtige Aufgaben nötig; drei richtige in Folge geben einen Extra-Punkt. Bei einer falschen Antwort gibt es Punktabzug, aber nie weniger als 0 Punkte. Bei `allowExternalApis: false` in `../data/config.json` werden nur lokal verfügbare deutsche Stimmen verwendet.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Aufbau der Seite |
| `style.css` | Modernes, responsives Design |
| `numbers.js` | Zugriff auf `../data/counting.json` (Zähl-Bilder und Zahlwörter) |
| `logic.js` | Reine Spiellogik ohne DOM – erzeugt Aufgaben und prüft Antworten |
| `game.js` | Spielsteuerung, Darstellung und Sprachausgabe |
| `animations.js` | Toast, Emoji-Popup, Konfetti und Feuerwerk |
| `test/smoke.js` | Tests der Spiellogik ohne Browser |

Die Logik ist wie in `../lesen` bewusst vom DOM getrennt. Dadurch lassen sich alle Aufgabenarten und Level direkt mit Node prüfen. Die drei Effekt-Töne werden gemeinsam mit dem Lesespiel über `../shared/audio.js` lokal erzeugt; es gibt keine MP3-Dateien mehr.

## Tests

```sh
node test/smoke.js
```

Prüft die Daten, alle neun Aufgabenarten, die Level-Freischaltung, Zahlenbereiche, die Zehnerübergänge, das gezielte Training und die Antwortvalidierung mit einem festen Zufallsgenerator (ohne DOM). Konfiguration und Daten werden zusätzlich im Projektstamm mit `node test/config.js` geprüft.
