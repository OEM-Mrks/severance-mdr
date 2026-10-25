# Macrodata Refinement

Fan-Nachbau des MDR-Terminals aus der Serie *Severance*: ein Feld aus schwebenden Zahlen, in dem sich manche Gruppen „beängstigend“ anfühlen. Man markiert sie und sortiert sie in einen der fünf Behälter ein. Reine Demo ohne weitere Funktionen.

## Bedienung

- Maus über das Feld bewegen: Zahlen in der Nähe wachsen, beängstigende Gruppen zittern.
- Klicken markiert eine Zahl, Ziehen markiert einen Bereich. Rechtsklick oder `Esc` hebt die Auswahl auf.
- Behälter anklicken oder Taste `1`–`5` drücken, um die Auswahl einzusortieren. Mindestens 60 % einer Gruppe müssen markiert sein.
- Scrollen, Pfeiltasten oder zwei Finger verschieben das Feld.
- `M` schaltet den Ton um, `?` zeigt die Hilfe.

Jeder Behälter fasst drei Gruppen. Sind alle fünf voll, ist die Datei abgeschlossen und es gibt eine Belohnung.

## Belohnungen

Nach jeder Datei gibt es reihum eine Belohnung: Fingerfalle, Music Dance Experience (Defiant Jazz, Techno oder Chillwave, die Zahlen tanzen zur Musik), Radiergummi, Melonen-Bar und als Höhepunkt die Waffelparty. Gesammelte Belohnungen und die Zahl der abgeschlossenen Dateien merkt sich der Browser. Ein volles Behältnis wird zwischendurch mit Lichteffekt, Ton und einem Lob quittiert.

Zum Ausprobieren ohne Durchspielen: Seite mit `#test` öffnen und in der Konsole `mdr.showDone()` oder `mdr.startParty('mde', 'techno')` aufrufen.

## Lokal starten

```bash
python3 -m http.server 8765
```

Dann `http://localhost:8765` öffnen. Es gibt keinen Build-Schritt: `index.html`, `style.css` und `app.js` sind alles.

---

Fan-Projekt. Nicht mit Apple TV+ oder den Machern von *Severance* verbunden.
