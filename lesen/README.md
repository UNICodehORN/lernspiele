# Wort-Welt – Lesen und Sprechen üben

Lokales Browserspiel für ein Kind in der 1. Klasse. Es nutzt dieselben Gamification-Elemente wie `../rechnen` (Punkte, Level, Fortschrittsbalken, Konfetti, Feuerwerk, Sounds), ist aber für Smartphones ausgelegt.

## Starten

Das Spiel ist über das Hauptmenü (`../index.html`) erreichbar; der 🏠-Button in der Kopfzeile führt jederzeit dorthin zurück. Konfiguration und Wortliste werden als JSON geladen, daher bitte einen lokalen Webserver starten. Für das Mikrofon braucht der Browser ohnehin eine **sichere Umgebung** (`http://localhost` oder HTTPS). Im Projektstamm:

```sh
python3 -m http.server 8000
```

Danach `http://localhost:8000/lesen/index.html` öffnen. Direktes `file://` wird nicht unterstützt.

Was das Mikrofon erkannt hat, wird sofort in der Aufgabenkarte angezeigt („👂 Erkannt: …“, ggf. mit Alternativen) – auch wenn es nicht als richtig gilt. So lässt sich prüfen, ob die Aussprache oder die Erkennung das Problem ist. Falls kein Mikrofon verfügbar oder erlaubt ist bzw. nichts gehört wird, erscheint automatisch ein Textfeld – das Wort kann dann getippt werden.

Hinweis zur Erkennung: Die Sprachausgabe (TTS) ist nur für die Ausgabe zuständig; das Erkennen läuft über einen separaten Web-Speech-Dienst. Sehr kurze Laute wie „ma“ liegen oft unter der Mindestdauer der Erkennung („no-speech“), und Browser ohne `SpeechRecognition`-Unterstützung können gar nicht zuhören. Vor dem Zuhören wird deshalb die laufende Sprachausgabe gestoppt.

Auf dem Startbildschirm kann man „🎲 Alle gemischt“ wählen – dann wechseln die Aufgaben abwechselnd und werden mit steigendem Level freigegeben. Alternativ trainiert man gezielt eine einzelne Aufgabenart. Mit „↩️ Andere Aufgabe wählen“ geht es zurück zur Auswahl. Ist das Mikrofon in `../data/config.json` gesperrt, erscheinen die drei Sprech-Aufgabenarten gar nicht erst (auch nicht im Mix).

## Aufgabenarten

| Aufgabe | Was das Kind tut |
| --- | --- |
| Silben zählen | Wort ansehen/anhören, Anzahl der Silben antippen (1–4) |
| Wort sprechen | Bild ansehen und das Wort ins Mikrofon sagen |
| Lesen (Stufe 1) | Bild ansehen und das passende Wort aus 3–4 Optionen wählen |
| Wort lesen | Wort lesen und ins Mikrofon sprechen |
| Reime | Wort/Bild ansehen und ein Reimwort auswählen |
| Mehr Silben | Zwei Bilder vergleichen und das mit mehr Silben antippen |
| Buchstaben hören | Buchstabe oben bleibt sichtbar, die Bilder haben keine Wortbeschriftung; beim Antippen wird das jeweilige Wort vorgelesen. Alle passenden Bilder anklicken |
| Silben lesen | Nur Wörter mit mehr als einer Silbe. Aufgabenstellung: „Lies laut die einzelnen Silben und verbinde sie zu einem Wort.“ Die Silben werden nacheinander hervorgehoben und laut gelesen (jeweils mit „Silbe gelesen 👉“ weiter); geprüft wird **ausschließlich das ganze Wort** per Mikrofon. Der Vorlese-Button nennt nur die Aufgabenstellung, nie eine Silbe |
| Buchstabensalat | Nur das Bild wird gezeigt, nie das Wort (der Vorlese-Button sagt es). Buchstaben in der richtigen Reihenfolge antippen. Stufe 1 nur mit den Buchstaben des Wortes, ab Stufe 2 mit zusätzlichen Buchstaben (z. B. B-H-A-U-S-Z) |

Bei **jeder** Aufgabe gibt es den Button „🔊 Aufgabe vorlesen“. Beim Silbenvergleich haben die beiden Bilder zusätzlich je einen eigenen 🔊-Button. Nach zwei Fehlversuchen (auch bei erzeugten Mikrofon-Ergebnissen ohne Treffer) erscheinen ein ausführlicher Tipp und der Button „⏭️ Aufgabe überspringen“ – in der Aufgabenkarte und im Mikrofon-Dialog. Überspringen gibt keine Punkte, kostet aber auch keine weiteren Punkte und startet die nächste Aufgabe. Ab Level 4 gibt es mehr Optionen, längere Wörter und ähnlicher klingende Ablenkungen. Pro Level sind drei richtige Aufgaben nötig; drei richtige in Folge geben einen Extra-Punkt.

## Hinweise

- Alle 80 Wörter und die Reimgruppen liegen in `../data/words.json`; `words.js` ist nur der Zugriff darauf. Bilder sind Emojis; Domino, Iglu und Salami werden mangels passendem Emoji als kleine SVG-Zeichnung dargestellt. Das Spiel benötigt keine externen Bilddateien.
- Die Sprachausgabe nutzt die Web Speech API (`SpeechSynthesis`, `de-DE`). Bei `allowExternalApis: false` werden nur lokal verfügbare deutsche Stimmen verwendet; ist keine vorhanden, bleibt die Sprachausgabe stumm.
- Die Spracherkennung nutzt die Web Speech API (`de-DE`). In vielen Browsern wird das Audio dafür an den Browseranbieter gesendet und benötigt eine Internetverbindung. Safari auf iOS unterstützt die Erkennung meist nicht – dort das Textfeld nutzen. Details stehen in der Haupt-Readme unter „Datenschutz“.
- Bei fast jedem Text (auch Beschreibungen und Hinweisen) genügt ein Tippen auf den Text selbst zum Vorlesen – ohne zusätzliche Icons. Buttons und Links werden beim Hovern vorgelesen; ein Klick löst nur die Aktion aus. Emojis werden nicht mitgelesen.
- In den Übungen „Sag das Wort laut“, „Wort finden“, „Lies das Wort“, „Was hat mehr Silben“ und „Buchstabensalat“ werden das gesuchte Wort und die Antworten nicht vorgelesen – sonst wäre es eine Hör- statt einer Leseübung. Bei „Was hat mehr Silben“ dienen nur die eigenen 🔊-Buttons zum Anhören. Die Readme selbst ist bewusst nicht vorlesbar.
- Kurze Wörter werden bei der Spracherkennung streng geprüft (`Haus` ist nicht `Maus`), längere Wörter erlauben einen kleinen Erkennungsfehler. Artikel und Satzzeichen werden ignoriert.
- Der Ton lässt sich oben rechts mit 🔊/🔇 abschalten.
- Die Erfolgstöne werden über `../shared/audio.js` lokal erzeugt; es gibt keine MP3-Dateien mehr.

## Tests

```sh
node test/smoke.js
```

Prüft die Wortliste, Reimgruppen, Sprach Matching und zufällig erzeugte Aufgaben aller Level (ohne DOM). Konfiguration und Daten werden zusätzlich im Projektstamm mit `node test/config.js` geprüft.
