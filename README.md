# Verteiler

Verteilt Studierendengruppen auf die Zeitslots des Rotationsplans, anhand der 1./2./3.-Wahl
aus einem Google-Formular.

Die App führt Semesterorganisatoren durch alle zehn Schritte: Formular kopieren,
veröffentlichen, Semester informieren, Deadline setzen, Formular schließen, Antworten als CSV
exportieren, hochladen, Kapazitäten eintragen und die Verteilung berechnen.

Alles läuft im Browser. Es gibt keinen Server und keine Datenbank, die hochgeladene CSV
verlässt das Gerät nicht. Der Fortschritt wird lokal im Browser gespeichert.

## Entwicklung

```bash
bun install
bun run dev        # Entwicklungsserver
bun run check      # Typen und Accessibility prüfen
bun run test       # Tests, Node- und Browser-Projekt
bun run build      # statischer Build nach build/
```

Für die Browser-Tests wird Chromium über Playwright benötigt:

```bash
bunx playwright install chromium
```

Der Anwendungscode liegt in `src/`, alle Tests und ihre CSV-Fixtures in `tests/`.

## Wie die Verteilung berechnet wird

Ein Semester hat 8 Zeitslots mit je 4 parallelen Rotationsgruppen, also 32 Plätze mit
standardmäßig je 6 Kapazität. Jede Gruppe gibt drei Wunsch-Zeitslots an oder "Egal".

Die Zuordnung wird als ganzzahliges lineares Programm formuliert und mit
[HiGHS](https://highs.dev) gelöst, kompiliert nach WebAssembly und ausgeführt in einem Web
Worker. Gewichtung: 1. Wahl 0, 2. Wahl -1, 3. Wahl -5, kein Treffer -100. Das Ergebnis ist
nachweislich optimal, nicht heuristisch.

## Deployment

Push auf main baut die Seite und veröffentlicht sie über GitHub Pages, siehe
.github/workflows/deploy.yml. BASE_PATH setzt den Unterpfad, unter dem die Seite läuft.

## Dokumentation

CLAUDE.md verweist auf die Regeln in .claude/rules/ und den Hintergrund in .claude/context/.
