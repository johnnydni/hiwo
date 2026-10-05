# hiwo – hier wohne ich.

Mobile-first Web-App für das eigene Zuhause: Wohnung und Zimmer verwalten, Fotos sammeln, Einrichtung festhalten und gemeinsame Einkaufslisten mit Familie oder Mitbewohnern pflegen. KI-Varianten folgen in Phase 2.

**Stack:** Next.js 15 als statischer Export · TypeScript · Tailwind CSS 4 · Supabase (Auth, Postgres mit RLS, Storage, Realtime) · Lucide Icons

hiwo hat keinen eigenen Server: Die Seite ist reines HTML/JS (läuft auf GitHub Pages), alle Daten gehen direkt vom Browser zu Supabase. Sicherheit kommt aus den RLS-Regeln in der Datenbank, nicht aus dem Frontend.

## Stand: Phase 1

| Bereich | Status |
| --- | --- |
| Anmeldung per E-Mail-Code (kein Passwort), Magic Link als Fallback | ✓ |
| Onboarding: Name, Wohnung, Stadt | ✓ |
| Home-Dashboard (Begrüßung, Wohnungsbild, Heute, Zuletzt bearbeitet) | ✓ |
| Zimmerübersicht (Foto-Grid), Zimmer anlegen/umbenennen/löschen | ✓ |
| Zimmerdetail: Fotos hochladen (verkleinert im Browser), Titelbild, Wohnungsbild, löschen | ✓ |
| Meine Einrichtung (Möbelliste pro Zimmer) | ✓ |
| Einkauf: Gesamte Wohnung / Nach Zimmer, abhaken, Preis, Link, Notiz, Produktfoto, Live-Updates | ✓ |
| Mitbewohner: Einladung per Link (teilen/kopieren), E-Mail-Einladung tritt beim Login automatisch bei | ✓ |
| Profil & Einstellungen | ✓ (KI/Benachrichtigungen/Darstellung als „bald“) |
| KI-Assistent (FAB + im Zimmer) | Oberfläche da, Generierung Phase 2 |

## Datenmodell

```
profiles ─┐
homes ────┼── home_members (owner | member)
          ├── home_invites (token, email/phone, 30 Tage gültig)
          ├── rooms ── room_photos
          │        ├── furniture_items (keep → KI soll behalten)
          │        ├── room_versions   (Phase 2: name, description, image, parent_version_id)
          │        └── ai_generations  (Phase 2: prompt, source_photo_id, parent_version_id, status)
          └── shopping_items (room_id null = Gesamte Wohnung)
```

Jede Tabelle trägt `home_id`, RLS prüft überall nur `is_home_member(home_id)`. Fotos liegen im privaten Bucket `photos` unter `<home_id>/…` und werden per Signed URL ausgeliefert. Originale werden nie überschrieben: Varianten sind eigene Zeilen mit eigenem Bild.

## Lokal starten

Voraussetzung: Node 20+, Docker.

```bash
npm install
npx supabase start          # lokale DB, Auth, Storage, Mailpit
cp .env.example .env.local  # anon key aus der Ausgabe eintragen
npm run dev
```

Anmeldecodes landen lokal in Mailpit: http://127.0.0.1:54324

End-to-end-Durchlauf mit Screenshots (zwei Nutzer, Einladung, Einkauf):

```bash
NEXT_PUBLIC_BASE_PATH=/hiwo npm run build
mkdir -p /tmp/site && cp -r out /tmp/site/hiwo && (cd /tmp/site && python3 -m http.server 3000 &)
npm run db:reset && CHROMIUM_PATH=<pfad> npm run e2e   # Screenshots in e2e-output/
```

## Auf GitHub Pages veröffentlichen

1. **Supabase-Projekt** auf supabase.com anlegen. Im SQL-Editor den Inhalt von `supabase/migrations/20261004000000_init.sql` ausführen.
2. **Auth → Email Templates → Magic Link**: Inhalt aus `supabase/templates/magic_link.html` übernehmen (enthält `{{ .Token }}`, sonst kommt kein Code an).
3. **Auth → URL Configuration**: Site URL `https://<user>.github.io/hiwo` eintragen.
4. Im GitHub-Repo unter **Settings → Secrets and variables → Actions → Variables** anlegen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. **Settings → Pages → Source: GitHub Actions** wählen.
6. Unter **Actions** den Workflow „Deploy to GitHub Pages“ starten (läuft danach bei jedem Push auf `main`).

Für echten Mailversand an mehr als ein paar Personen pro Stunde eigenes SMTP in Supabase hinterlegen.
