# hiwo – hier wohne ich.

Mobile-first Web-App, um Zimmer gemeinsam einzurichten: Pro Zimmer ein Foto vom Ist-Zustand, darunter beliebig viele Varianten (eigene Fotos, Moodboards, Screenshots), und zu jeder Variante eine eigene Einkaufsliste.

**Stack:** Next.js 15 als statischer Export · TypeScript · Tailwind CSS 4 · Lucide Icons

hiwo braucht keinen Server und keine Datenbank: Die App ist reines HTML/JS (läuft auf GitHub Pages) und speichert alles in einem **privaten GitHub-Repo** (z.B. `hiwo-daten`). Der Browser spricht direkt mit der GitHub-API.

## Stand

| Bereich | Status |
| --- | --- |
| Verbinden mit Daten-Repo + Schlüssel (GitHub-Token), Warnung bei öffentlichem Repo | ✓ |
| Onboarding: Name, Wohnung, Stadt; Beitreten per Link („Wer bist du?“) | ✓ |
| Home-Dashboard (Begrüßung, Wohnungsbild, Heute, Zuletzt bearbeitet) | ✓ |
| Zimmerübersicht (Foto-Grid), Zimmer anlegen/umbenennen/löschen | ✓ |
| Zimmer: ein Ausgangsfoto (ersetzen, löschen, als Wohnungsbild) | ✓ |
| Varianten: Foto hochladen, Name, Notiz, Vorher/Nachher-Umschalter | ✓ |
| Einkaufsliste pro Variante und „für das Zimmer allgemein“, schnelles Hinzufügen | ✓ |
| Einkauf: Gesamte Wohnung / Nach Zimmer, abhaken, Preis, Link, Notiz, Produktfoto, Abgleich alle 30 s | ✓ |
| Link einfügen → Artikel mit Produktname und -bild aus dem Shop | ✓ |
| Zimmer per Drag & Drop sortieren | ✓ |
| Mitbewohner: Einladung per Link (teilen/kopieren) | ✓ |
| Profil & Einstellungen | ✓ |

## Datenmodell

```
hiwo-daten/            (privates Repo)
├── hiwo.json          home · members · rooms · photos (kind: base | variant) · shopping (room_id, variant_id)
└── fotos/
    ├── <zimmer-id>/<foto-id>.jpg
    └── einkauf/<artikel-id>-<zeit>.jpg
```

Jede Aktion ist ein Commit (z.B. „hiwo: Stehlampe auf die Liste“), die Git-Historie ist also gleichzeitig das Änderungsprotokoll. Ändern zwei Personen gleichzeitig, lehnt GitHub den zweiten Schreibversuch ab (veralteter `sha`); die App lädt dann neu und wendet die Änderung erneut an. Fotos werden im Browser verkleinert (max. 1800 px) und nie überschrieben.

## Grenzen (ehrlich)

- **Ein gemeinsamer Schlüssel.** Alle in der Familie nutzen denselben Token, er steckt im Einladungslink. Wer aus der Liste entfernt wird, hat weiter Zugriff, bis du auf GitHub einen neuen Token erstellst und alle neu einlädst.
- **Kein Live-Update.** Änderungen anderer erscheinen beim Öffnen der App und sonst spätestens nach 30 Sekunden.
- **Größe.** Ein GitHub-Repo sollte unter ~1 GB bleiben. Bei ~400 KB pro Foto reicht das für über 2000 Fotos.
- **Rate-Limit.** 5000 API-Aufrufe pro Stunde und Token, im Familienalltag kein Thema.
- **Produktbilder aus Links** holt die App über microlink.io (kostenlos, ohne Schlüssel, ca. 50 Links pro Tag). Dabei wird nur der Produktlink übertragen. Die Bilder werden vom Shop verlinkt, nicht gespeichert; ändert der Shop seine Seite, kann ein Bild verschwinden. Ein eigenes Foto am Artikel hat immer Vorrang.
- Der Token liegt im `localStorage` des Geräts. „Auf diesem Gerät abmelden“ löscht ihn.

## Einrichten

1. Auf GitHub ein **privates** Repo anlegen, z.B. `hiwo-daten` (mit README initialisieren).
2. **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**:
   Repository access: *Only select repositories* → `hiwo-daten`; Permissions: *Contents: Read and write*. Ablaufdatum nach Wunsch (max. 1 Jahr).
3. hiwo öffnen (https://johnnydni.github.io/hiwo), Repo und Token eintragen, Wohnung anlegen.
4. Profil → Mitbewohner → Person einladen → Link teilen.

## Lokal starten

```bash
npm install
npm run dev     # http://localhost:3000, verbindet sich mit dem echten GitHub
```

End-to-end-Durchlauf gegen eine nachgebaute GitHub-API (`scripts/mock-github.mjs`), mit Screenshots in `e2e-output/`:

```bash
NEXT_PUBLIC_BASE_PATH=/hiwo NEXT_PUBLIC_GITHUB_API=http://127.0.0.1:4010 NEXT_PUBLIC_LINK_PREVIEW_API=http://127.0.0.1:4010/preview npm run build
CHROMIUM_PATH=<pfad> npm run e2e
```

## Auf GitHub Pages veröffentlichen

**Settings → Pages → Source: GitHub Actions** wählen. Der Workflow „Deploy to GitHub Pages“ läuft bei jedem Push auf `main`. Es müssen keine Variablen oder Secrets gesetzt werden.
