# Architektur

## Paketgrenzen

- `squircles`: reine Geometrie ohne DOM-Zugriffe und Laufzeitabhängigkeiten.
- `squircles/dom`: CSS-basierte Darstellung mit `applySquircle`.
- `squircles/react`: Komponenten und Hooks, React als optionale Peer-Abhängigkeit.
- `squircles/svelte`: Action mit Aktualisierung und Aufräumen, ohne Svelte-Import.
- `src/css/`: strukturelle Leser für berechnete CSS-Werte, in Node testbar.

Die englischen Namen der veröffentlichten API und der CSS-Eigenschaften bleiben
zur Kompatibilität bestehen. Kommentare, Beispiele und Fehlermeldungen sind deutsch.

## Geometrie und Kontur

Die Geometrie folgt Figmas veröffentlichter kubischer Bézier-Konstruktion:
`smoothing: 0` ergibt Kreisbögen, `1` vollständig geglättete Übergänge.
Jede Ecke erhält einen proportionalen Anteil der benachbarten Seiten.
Reicht der Platz nicht aus, wird die Glättung begrenzt. `preserveSmoothing`
komprimiert stattdessen die ersten Kontrollpunkte.

Eine Kontur entsteht als SVG-Stroke auf dem um eine halbe Konturbreite
versetzten Pfad. Eine separat berechnete innere Maske entfällt: Das bloße
Verkleinern eines Eckradius ergäbe keinen exakten parallelen Bézier-Versatz.
Quellen und Danksagungen stehen in `NOTICE`.

## Darstellungsebenen

`Squircle` rendert nur sein natives Element. Ein Effekt bindet `applySquircle`
an dieses Element. Die Darstellungsebenen liegen außerhalb von Reacts Abgleich.
Ein Wechsel von `as` entfernt die alte Anbindung und misst das neue Element.

| Ebene | Stapelposition | Aufgabe |
| --- | --- | --- |
| `[data-squircle-shadow]` | -3 | Versetzte, weichgezeichnete Form pro äußerem Schatten |
| `[data-squircle-fill]` | -2 | Kopierter Hintergrund mit geglättetem Clip-Pfad |
| `[data-squircle-stroke]` | -1 | SVG-Kontur auf dem geglätteten Pfad |

Alle Ebenen ignorieren Zeigereingaben. Ihr negativer Versatz um die Konturbreite
gleicht den Unterschied zwischen Innen- und Rahmenfläche aus. Die originale
Kontur wird transparent, behält aber ihre Breite, damit sich das Layout nicht
verschiebt. Das Element selbst bleibt standardmäßig unbeschnitten, sodass
Schatten und Fokusmarkierungen sichtbar bleiben.

Die SVG-Kontur überdeckt den Rand der Hintergrundfläche. Bei halbtransparenten
Konturen kann dieser durchscheinen; `SquircleSurface` zeichnet Füllung und Kontur
gemeinsam auf einem SVG-Pfad und vermeidet diesen Fall.

## CSS lesen und wiederherstellen

Zum Lesen werden eigene Überschreibungen kurz aufgehoben. Übergänge bleiben
währenddessen deaktiviert, damit das Lesen keine Übergänge oder dauernde
Neuberechnungen auslöst. Änderungen werden pro Animationsframe gebündelt;
eigene Mutationseinträge werden anschließend verworfen.

Pro Element werden die ursprünglichen und die zuletzt angewendeten Inline-Stile
gespeichert. Abweichungen gegenüber dem angewendeten Zustand werden in die
ursprünglichen Stile übernommen. Dadurch bleiben nachträgliche Änderungen durch
Frameworks beim Neuzeichnen und Aufräumen erhalten. Eine Zuweisung genau des
bereits von der Bibliothek gesetzten Werts ist davon nicht unterscheidbar.

Eine Anbindung pro Element ist vorgesehen. Aufräumen ist idempotent und entfernt
Beobachter, Ereignisbehandlung, ausstehende Frames und eigene Ebenen.

## Größenmessung

DOM und React verwenden dieselbe Messung. `ResizeObserver` liefert logische
Inline- und Blockmaße, die anhand von `writing-mode` in physische Breite und Höhe
umgerechnet werden. Das umfasst `vertical-*` und `sideways-*`.
Auf 1/64 Pixel gerundete Maße vermeiden Änderungen durch minimale Messabweichungen.

Fehlt `ResizeObserver`, werden die Abmessungen beim Start und bei
Fenstergrößenänderungen gemessen. Sonstige Layoutänderungen benötigen dann einen
Polyfill. Feste Größen umgehen die Messung in den React-Hooks vollständig.
Flächen mit Breite oder Höhe null ergeben keinen gültigen sichtbaren Pfad.

## Grenzen

- `outline` und innere Schatten folgen weiterhin der normalen CSS-Rundung.
- Nur durchgezogene Konturen anhand der oberen Rahmenwerte werden gezeichnet.
- Elliptische Radien werden auf den einbeschriebenen Kreis reduziert.
- Leere HTML-Elemente wie `img` und `input` erhalten direkt einen Clip-Pfad.
  Dieser beschneidet auch ihre eigene Kontur und ihren Schatten.
- `backdrop-filter` bleibt ohne `clipContent` rechteckig.
- Schattenlisten werden als einzelne Ebenen zusammengesetzt. Innere Schatten
  werden nicht nachgezeichnet; in gemischten Listen verschwinden sie beim
  Unterdrücken des ursprünglichen Schattens.
- Änderungen ausschließlich an Vorfahren oder Stylesheets benötigen ein
  beobachtetes Ereignis am Element, etwa eine Größen- oder Klassenänderung.
- Hintergrundübergänge werden weitergereicht; Geometrie- und Konturänderungen
  werden zum Zeitpunkt der Aktualisierung neu gezeichnet.
- Bruchteile physischer Pixel können weiterhin leicht unterschiedliche
  Rasterisierung an gegenüberliegenden Kanten ergeben.

## Prüfung und Bilder

`npm run check` prüft Typen, Geometrie, CSS-Leser, serverseitiges React-Rendering
und den Paketinhalt. `npm run test:browser` prüft die DOM-Lebenszyklen,
Stiländerungen, Schreibrichtungen und den Playground in Chromium.
`npm run screenshots` fotografiert den Playground und rendert den Schatten in
einen transparenten PNG-Rand. Die Bildbreiten im README sind explizit begrenzt.
