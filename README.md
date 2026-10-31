# Macrodata Refinement

Fan-Nachbau des MDR-Terminals aus der Serie *Severance*: ein Feld aus schwebenden Zahlen, in dem sich manche Gruppen „beängstigend“ anfühlen. Man markiert sie und sortiert sie in einen der fünf Behälter ein. Reine Demo ohne weitere Funktionen.

**Ausprobieren:** https://oem-mrks.github.io/severance-mdr/

## Video

Ein 34-sekündiger Rundgang durch einen Arbeitstag am Terminal, vom ersten Zittern bis zur Waffelparty: [video/macrodata-refinement.mp4](video/macrodata-refinement.mp4) (im Browser abspielen: https://oem-mrks.github.io/severance-mdr/video/macrodata-refinement.mp4).

## Ablauf wie im Handbuch

Aufbau und Ablauf folgen den Seiten „All About Refining Numbers“ aus dem offiziellen Begleitbuch zur Serie:

1. Der Rechner bootet mit Systemzeilen, dann dreht sich das Lumon-Logo ins Bild.
2. Am blinkenden `>` den Namen der Datei eintippen und Enter drücken (leer lassen nimmt die zugewiesene Datei).
3. Im Rolodex mit den Pfeiltasten zum Buchstaben der Datei blättern und die Karte anklicken.
4. Das Programm lädt: Dateiname und Fortschritt oben, Zahlenfeld, fünf Behälter mit Füllstand, Koordinaten unten.

`Esc` oder „Überspringen“ springt jederzeit direkt ins Programm.

## Bedienung

- Mit der Lupe über das Feld fahren: Zahlen in der Nähe wachsen, beängstigende Gruppen zittern.
- Klicken markiert eine Zahl, Ziehen markiert einen Bereich. Rechtsklick oder `Esc` hebt die Auswahl auf.
- Behälter anklicken oder Taste `1`–`5` drücken, um die Auswahl einzusortieren. Mindestens 60 % einer Gruppe müssen markiert sein.
- Jede Gruppe gehört in genau einen Behälter. Beim richtigen klappt der Behälter auf und zeigt seinen Bericht (WO, FC, DR, MA), beim falschen erscheint „Nope“ und die Zahlen bleiben im Feld.
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
