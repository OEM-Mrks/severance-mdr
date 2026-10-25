# Macrodata Refinement

Fan-Nachbau des MDR-Terminals aus der Serie *Severance*: ein Feld aus schwebenden Zahlen, in dem sich manche Gruppen „beängstigend“ anfühlen. Man markiert sie und sortiert sie in einen der fünf Behälter ein. Reine Demo ohne weitere Funktionen.

## Bedienung

- Maus über das Feld bewegen: Zahlen in der Nähe wachsen, beängstigende Gruppen zittern.
- Klicken markiert eine Zahl, Ziehen markiert einen Bereich. Rechtsklick oder `Esc` hebt die Auswahl auf.
- Behälter anklicken oder Taste `1`–`5` drücken, um die Auswahl einzusortieren. Mindestens 60 % einer Gruppe müssen markiert sein.
- Scrollen, Pfeiltasten oder zwei Finger verschieben das Feld.
- `M` schaltet den Ton um, `?` zeigt die Hilfe.

Jeder Behälter fasst vier Gruppen. Sind alle fünf voll, ist die Datei abgeschlossen und die nächste startet.

## Lokal starten

```bash
python3 -m http.server 8765
```

Dann `http://localhost:8765` öffnen. Es gibt keinen Build-Schritt: `index.html`, `style.css` und `app.js` sind alles.

---

Fan-Projekt. Nicht mit Apple TV+ oder den Machern von *Severance* verbunden.
