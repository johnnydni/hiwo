// End-to-end run against a mock GitHub API (scripts/mock-github.mjs).
// Build first:  NEXT_PUBLIC_BASE_PATH=/hiwo NEXT_PUBLIC_GITHUB_API=http://127.0.0.1:4010 NEXT_PUBLIC_LINK_PREVIEW_API=http://127.0.0.1:4010/preview npm run build
// Then:         CHROMIUM_PATH=<pfad> npm run e2e    (screenshots in e2e-output/)
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import { startMockGitHub } from "./mock-github.mjs";

const OUT = process.env.E2E_OUT ?? "e2e-output";
fs.mkdirSync(OUT, { recursive: true });
const PORT = 3000;
const BASE = `http://127.0.0.1:${PORT}/hiwo`;
const HOME_URL = new RegExp(`^${BASE}/?$`);
const REPO = "illy/hiwo-daten";
const TOKEN = "test-token";

// --- mock GitHub + static site ---------------------------------------------
const gh = await startMockGitHub({ repo: REPO, token: TOKEN });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain" };
const site = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!p.startsWith("/hiwo")) return res.writeHead(404).end();
  p = path.join("out", p.slice("/hiwo".length));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!fs.existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": types[path.extname(p)] ?? "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => site.listen(PORT, "127.0.0.1", r));
const doc = () => JSON.parse(gh.files.get("hiwo.json").toString());

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// --- synthetic interior photos -------------------------------------------
const gen = await browser.newPage();
const palettes = [
  ["#d9cbb7", "#a88b6a", "#6e5a47", "#e9e2d6"],
  ["#e4ddd2", "#9c8a78", "#4f4a45", "#c9b79c"],
  ["#cfd2c8", "#8a9680", "#5b5146", "#efe9df"],
  ["#eadfd0", "#b9684a", "#3f3a35", "#d8cbb8"],
];
for (let i = 0; i < 4; i++) {
  const data = await gen.evaluate(([p, seed]) => {
    const c = document.createElement("canvas");
    c.width = 1600; c.height = 1200;
    const g = c.getContext("2d");
    let wall = g.createLinearGradient(0, 0, 0, 800);
    wall.addColorStop(0, p[3]); wall.addColorStop(1, p[0]);
    g.fillStyle = wall; g.fillRect(0, 0, 1600, 820);
    let floor = g.createLinearGradient(0, 820, 0, 1200);
    floor.addColorStop(0, p[1]); floor.addColorStop(1, p[2]);
    g.fillStyle = floor; g.fillRect(0, 820, 1600, 380);
    // window light
    g.fillStyle = "rgba(255,255,255,0.55)"; g.fillRect(200 + seed * 120, 140, 380, 480);
    g.strokeStyle = "rgba(0,0,0,0.12)"; g.lineWidth = 10; g.strokeRect(200 + seed * 120, 140, 380, 480);
    // sofa / bed
    g.fillStyle = p[2]; g.globalAlpha = 0.85;
    g.beginPath(); g.roundRect(700 - seed * 60, 620, 720, 240, 40); g.fill();
    g.fillStyle = p[1]; g.beginPath(); g.roundRect(730 - seed * 60, 560, 660, 140, 30); g.fill();
    g.globalAlpha = 1;
    // rug + table
    g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(900, 1020, 420, 90, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#3a332d"; g.beginPath(); g.roundRect(780, 900, 260, 40, 12); g.fill();
    // plant
    g.fillStyle = "#6f7d63";
    for (let k = 0; k < 9; k++) { g.beginPath(); g.ellipse(160 + k * 6, 700 - k * 30, 26, 70, (k - 4) * 0.3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#b9684a"; g.beginPath(); g.roundRect(110, 760, 120, 120, 16); g.fill();
    return c.toDataURL("image/jpeg", 0.9).split(",")[1];
  }, [palettes[i], i]);
  fs.writeFileSync(`${OUT}/room${i}.jpg`, Buffer.from(data, "base64"));
}
await gen.close();

// --- flow -----------------------------------------------------------------
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "de-DE" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });

const newPhone = async () => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "de-DE" });
  await c.grantPermissions(["clipboard-read", "clipboard-write"], { origin: `http://127.0.0.1:${PORT}` });
  return c;
};
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: `http://127.0.0.1:${PORT}` });

await page.goto(`${BASE}/`);
await page.waitForURL(/\/login\/?/);
await shot("01-login");
// wrong token first
await page.fill("input[placeholder='besitzer/hiwo-daten']", `https://github.com/${REPO}.git`);
await page.fill("input[type=password]", "nope");
await page.click("button:has-text('Verbinden')");
await page.waitForSelector("text=Der Schlüssel stimmt nicht");
await page.fill("input[type=password]", TOKEN);
await page.click("button:has-text('Verbinden')");
await page.waitForURL(/\/willkommen\/?/);
await page.waitForSelector("text=Wohnung anlegen");
await shot("02-onboarding");
await page.fill("input[name=display_name]", "Illy");
await page.fill("input[name=home_name]", "Meine Wohnung");
await page.fill("input[name=city]", "München");
await page.click("button:has-text('Wohnung anlegen')");
await page.waitForURL(HOME_URL);
await page.waitForSelector("text=Noch keine Zimmer");
await shot("03-home-empty");

// rooms: base photo first, then variants with their own list
for (const [i, name] of ["Wohnzimmer", "Schlafzimmer", "Küche", "Badezimmer"].entries()) {
  await page.goto(`${BASE}/wohnung`);
  await page.click("button[aria-label='Zimmer hinzufügen']");
  await page.click(`button:has-text('${name}')`);
  await page.click("form button:has-text('Zimmer hinzufügen')");
  // the sheet closes and the new room shows up in the overview
  await page.waitForSelector("[role=dialog]", { state: "detached" });
  await page.click(`a[href*='/zimmer']:has-text('${name}')`);
  await page.waitForURL(/\/zimmer\/?\?id=/);
  await page.waitForSelector(`text=So sieht ${name} jetzt aus`);
  if (i === 0) await shot("04-room-empty");
  await page.locator("input[type=file]").first().setInputFiles(`${OUT}/room${i}.jpg`);
  await page.waitForSelector("text=Ausgangszustand", { timeout: 20000 });
}
const wohnzimmer = doc().rooms.find((r) => r.name === "Wohnzimmer");
let sketchCheck = null;
let replaceCheck = null;
await page.goto(`${BASE}/zimmer/?id=${wohnzimmer.id}`);
await page.waitForSelector("text=Ausgangszustand");
for (const [k, file] of ["room1.jpg", "room2.jpg"].entries()) {
  await page.locator("input[type=file]").nth(1).setInputFiles(`${OUT}/${file}`);
  await page.waitForURL(/\/variante\/?\?id=/, { timeout: 20000 });
  await page.waitForSelector(`h1:has-text('Variante ${k + 1}')`);
  if (k === 0) {
    // name it and fill its list
    await page.click("button[aria-label='Variante bearbeiten']");
    await page.fill("[role=dialog] input[name=name]", "Japandi");
    await page.fill("textarea[name=note]", "Hell, Holz, wenig Zeug.");
    await page.click("[role=dialog] button:has-text('Speichern')");
    await page.waitForSelector("h1:has-text('Japandi')");
    for (const f of ["Leinensofa", "Couchtisch Eiche", "Papierleuchte"]) {
      await page.fill("input[placeholder^='z.B. Sofa']", f);
      await page.press("input[placeholder^='z.B. Sofa']", "Enter");
      await page.waitForSelector(`li:has-text('${f}')`);
    }
    // a pasted shop link becomes an item with the product's name and picture
    await page.fill("input[placeholder^='z.B. Sofa']", "https://shop.example/de/sofa-lino");
    await page.press("input[placeholder^='z.B. Sofa']", "Enter");
    await page.waitForSelector("li:has-text('Sofa Lino') img", { timeout: 15000 });
    await shot("05-variant");
    await page.click("button:has-text('Vergleich')");
    await page.waitForSelector("[role=slider]");
    await page.waitForTimeout(600);
    await shot("05b-variant-compare");
    await page.click("button:has-text('Variante')");

    // draw on the variant, save it as a sketch; the original photo stays as it is
    const variant = doc().photos.find((p) => p.name === "Japandi");
    const original = Buffer.from(gh.files.get(variant.path));
    await page.click("button[aria-label='Bild bearbeiten']");
    const canvas = page.locator("canvas[aria-label='Zeichenfläche']");
    await canvas.waitFor();
    await page.waitForTimeout(300);
    const b = await canvas.boundingBox();
    const at = (x, y) => [b.x + b.width * x, b.y + b.height * y];
    const line = async (...pts) => {
      await page.mouse.move(...pts[0]);
      await page.mouse.down();
      for (const p of pts.slice(1)) await page.mouse.move(...p, { steps: 8 });
      await page.mouse.up();
    };
    await line(at(0.15, 0.3), at(0.4, 0.65), at(0.7, 0.3));
    await page.click("button[aria-label='Marker']");
    await page.click("button[aria-label='Farbe #f5a524']");
    await page.click("button[aria-label='Stärke 4']");
    await line(at(0.1, 0.85), at(0.9, 0.85));
    await page.click("button[aria-label='Pfeil']");
    await page.click("button[aria-label='Farbe #ffffff']");
    await line(at(0.85, 0.15), at(0.6, 0.45));
    await page.click("button[aria-label='Text']");
    await page.mouse.click(...at(0.5, 0.15));
    await page.fill("input[placeholder^='Text']", "Sofa hierhin");
    await page.click("button:has-text('Fertig')");
    await page.click("button[aria-label='Rückgängig']");
    await page.click("button[aria-label='Wiederholen']");
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/05c-editor.png` });
    await page.click("button:has-text('Als Skizze sichern')");
    await page.waitForSelector("[role=dialog] >> text=Version 1", { timeout: 15000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/05d-sketch.png` });
    // keep drawing on the sketch: a second version next to the first
    await page.click("[role=dialog] button:has-text('Weiterzeichnen')");
    await canvas.waitFor();
    await page.waitForTimeout(300);
    await page.click("button[aria-label='Radierer']");
    await line(at(0.3, 0.5), at(0.5, 0.5));
    await page.click("button:has-text('Als Skizze sichern')");
    await page.waitForSelector("[role=dialog] >> text=Version 2", { timeout: 15000 });
    await page.click("[role=dialog] button:has-text('Skizzen')");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/05e-sketches.png` });
    const versions = await page.locator("[role=dialog] button:has-text('Version')").count();
    // delete version 2 again
    await page.click("[role=dialog] button:has-text('Version 2')");
    await page.click("[role=dialog] button:has-text('Löschen')");
    await page.click("[role=dialog] button:has-text('Wirklich?')");
    await page.waitForSelector("[role=dialog] button:has-text('Version 1')");
    await page.waitForTimeout(800);
    await page.keyboard.press("Escape");
    sketchCheck = {
      versionsShown: versions,
      inDoc: (doc().sketches ?? []).length,
      files: [...gh.files.keys()].filter((k) => k.startsWith("fotos/skizzen/")).length,
      originalUnchanged: original.equals(gh.files.get(variant.path)),
      badge: await page.locator("button[aria-label='Skizzen (1)']").count(),
    };
  } else {
    await page.fill("input[placeholder^='z.B. Sofa']", "Samtsessel");
    await page.press("input[placeholder^='z.B. Sofa']", "Enter");
    await page.waitForSelector("li:has-text('Samtsessel')");
    // a new picture for the variant: id, name and list stay, the old file goes
    const v = doc().photos.find((p) => p.kind === "variant" && p.name === "Variante 2");
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click("button[aria-label='Bild ersetzen']")]);
    await chooser.setFiles(`${OUT}/room3.jpg`);
    for (let t = 0; t < 100 && doc().photos.find((p) => p.id === v.id)?.path === v.path; t++) await page.waitForTimeout(200);
    await page.waitForTimeout(800);
    const nv = doc().photos.find((p) => p.id === v.id);
    replaceCheck = {
      samePhotoId: !!nv,
      newPath: nv?.path !== v.path,
      oldFileGone: !gh.files.has(v.path),
      newFileThere: gh.files.has(nv?.path),
      listKept: doc().shopping.some((s) => s.variant_id === v.id && s.name === "Samtsessel"),
    };
  }
  await page.goto(`${BASE}/zimmer/?id=${wohnzimmer.id}`);
  await page.waitForSelector("text=Ausgangszustand");
}
await page.fill("input[placeholder^='z.B. Glühbirnen']", "Glühbirnen E27");
await page.press("input[placeholder^='z.B. Glühbirnen']", "Enter");
await page.waitForSelector("li:has-text('Glühbirnen E27')");
await page.waitForTimeout(600);
await shot("06-room-detail");
await page.click("button[aria-label='Ausgangsfoto']");
await page.click("text=Als Bild der Wohnung");
await page.waitForTimeout(800);
await page.goto(`${BASE}/wohnung`);
await page.waitForTimeout(800);
await shot("06b-rooms");
// an own title picture for the home, uploaded right on the rooms overview
const coverBefore = doc().home.cover_photo_id;
{
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click("button[aria-label='Titelbild ändern']")]);
  await chooser.setFiles(`${OUT}/room0.jpg`);
  for (let t = 0; t < 100 && !doc().home.cover; t++) await page.waitForTimeout(200);
  await page.waitForTimeout(800);
}
const titleCheck = {
  roomCoverWasSet: !!coverBefore,
  ownCover: !!doc().home.cover,
  fileThere: gh.files.has(doc().home.cover?.path),
  roomCoverCleared: doc().home.cover_photo_id === null,
};
await shot("06c-rooms-title");

// shopping
await page.goto(`${BASE}/einkauf`);
const add = async (name, room, price) => {
  await page.click("button:has-text('Artikel hinzufügen')");
  await page.fill("[role=dialog] input[name=name]", name);
  if (room) await page.selectOption("select[name=target]", { label: room });
  if (price) {
    if (await page.isVisible("text=+ Preis, Link oder Notiz")) await page.click("text=+ Preis, Link oder Notiz");
    await page.fill("input[name=price]", price);
  }
  await page.click("button:has-text('Auf die Liste')");
  await page.waitForSelector(`li:has-text('${name}')`);
};
await add("Vorhänge", null, "12,99");
await add("Pflanzen", null, "24,90");
await add("Stehlampe", "Wohnzimmer · Japandi", "89,90");
await add("Teppich", "Wohnzimmer allgemein", "129");
await add("Nachttisch", "Schlafzimmer");
await shot("07-shopping");
await page.locator("li:has-text('Pflanzen') button[aria-label='Als erledigt markieren']").click();
await page.waitForTimeout(800);
await page.click("text=Nach Zimmer");
await shot("08-shopping-room");
await page.click("text=Gesamte Wohnung");
await page.click("li:has-text('Stehlampe') a");
await page.waitForURL(/\/artikel\/?\?id=/);
await shot("09-item");

// home dashboard
await page.goto(`${BASE}/`);
await page.waitForTimeout(500);
await shot("10-home");

// invite
await page.goto(`${BASE}/profil/mitbewohner`);
await page.click("text=Person einladen");
await page.fill("input[placeholder^='z.B. Nadin']", "Nadin");
await shot("11-invite");
await page.click("button:has-text('Link kopieren')");
await page.waitForSelector("text=Kopiert");
const inviteUrl = await page.evaluate(() => navigator.clipboard.readText());
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
await page.goto(`${BASE}/profil`);
await shot("13-profile");

// second person: Nadin opens the invite link on her phone
const ctx2 = await newPhone();
const p2 = await ctx2.newPage();
p2.on("pageerror", (e) => errors.push("p2 " + e));
await p2.goto(inviteUrl);
await p2.waitForURL(/\/willkommen\/?/);
await p2.waitForSelector("text=Schön, dass");
await p2.screenshot({ path: `${OUT}/17-invite-welcome.png`, fullPage: true });
const keyLeftInUrl = (await p2.evaluate(() => location.href)).includes(TOKEN);
await p2.fill("input[name=display_name]", "Nadin");
await p2.click("button:has-text('Beitreten')");
await p2.waitForURL(HOME_URL);
const sawHome = await p2.waitForSelector("text=Meine Wohnung").then(() => true, () => false);

// both edit at the same moment: Nadin ticks an item while Illy (on a stale copy) adds one
await p2.goto(`${BASE}/einkauf`);
await page.goto(`${BASE}/einkauf`);
await page.click("button:has-text('Artikel hinzufügen')");
await page.fill("input[name=name]", "Kerzen");
const conflictsBefore = gh.stats.conflicts;
await Promise.all([
  p2.locator("li:has-text('Nachttisch') button[aria-label='Als erledigt markieren']").click(),
  page.click("button:has-text('Auf die Liste')"),
]);
await page.waitForSelector("li:has-text('Kerzen')");
await p2.waitForTimeout(1500);
const d = doc();
const concurrent = {
  conflictsResolved: gh.stats.conflicts - conflictsBefore,
  kerzenSaved: d.shopping.some((s) => s.name === "Kerzen"),
  nachttischDone: d.shopping.find((s) => s.name === "Nachttisch")?.status === "done",
  doneBy: d.members.find((m) => m.id === d.shopping.find((s) => s.name === "Nachttisch")?.done_by)?.name,
};
await page.reload();
await page.waitForSelector("li:has-text('Kerzen')");
await shot("18-after-concurrent");

// Illy sees Nadin in the member list
await page.goto(`${BASE}/profil/mitbewohner`);
await page.waitForSelector("text=Nadin");
await shot("12-members");

// same person, second device: picks her name instead of creating a duplicate
const ctx3 = await newPhone();
const p3 = await ctx3.newPage();
p3.on("pageerror", (e) => errors.push("p3 " + e));
await p3.goto(inviteUrl);
await p3.waitForSelector("text=Schon dabei?");
await p3.click("ul button:has-text('Nadin')");
await p3.waitForURL(HOME_URL);

// desktop
const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: await ctx.storageState() });
const pd = await ctxD.newPage();
await pd.goto(`${BASE}/wohnung`);
await pd.waitForSelector("text=Wohnzimmer");
await pd.waitForTimeout(800);
await pd.screenshot({ path: `${OUT}/15-desktop-rooms.png` });
// reorder by dragging: Küche in front of Wohnzimmer, without opening either room
const card = (n) => pd.locator(`a[href*='/zimmer']:has-text('${n}')`);
const from = await card("Küche").boundingBox();
const to = await card("Wohnzimmer").boundingBox();
await pd.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
await pd.mouse.down();
for (let s = 1; s <= 12; s++)
  await pd.mouse.move(from.x + from.width / 2 + ((to.x - from.x) * s) / 12, from.y + from.height / 2 + ((to.y - from.y) * s) / 12);
await pd.mouse.up();
await pd.waitForTimeout(1500);
const reorder = {
  stayedOnOverview: /\/wohnung\/?$/.test(pd.url()),
  order: [...doc().rooms].sort((a, b) => a.position - b.position).map((r) => r.name),
};
await pd.goto(`${BASE}/`);
await pd.waitForTimeout(800);
await pd.screenshot({ path: `${OUT}/16-desktop-home.png` });

// delete a room: its photos disappear from the repo too
const before = [...gh.files.keys()].filter((k) => k.startsWith("fotos/")).length;
const bad = doc().rooms.find((r) => r.name === "Badezimmer");
await page.goto(`${BASE}/zimmer/?id=${bad.id}`);
await page.waitForSelector("h1:has-text('Badezimmer')");
await page.click("button[aria-label='Mehr']");
await page.click("text=Zimmer löschen");
await page.click("text=wirklich löschen?");
await page.waitForURL(/\/wohnung\/?$/);
await page.waitForTimeout(1500);
const after = [...gh.files.keys()].filter((k) => k.startsWith("fotos/")).length;

const final = doc();
const summary = {
  sawHome,
  keyLeftInUrl,
  concurrent,
  reorder,
  sketchCheck,
  replaceCheck,
  titleCheck,
  members: final.members.map((m) => m.name),
  rooms: final.rooms.map((r) => r.name),
  variants: final.photos.filter((p) => p.kind === "variant").map((p) => p.name),
  fromLink: final.shopping.filter((s) => s.url).map((s) => ({ name: s.name, image_url: s.image_url })),
  japandiList: final.shopping.filter((s) => s.variant_id === final.photos.find((p) => p.name === "Japandi")?.id).map((s) => s.name),
  schema: final.schema,
  photoFiles: { before, after },
  photosInDoc: final.photos.length,
  shopping: final.shopping.length,
  commits: gh.stats.puts,
  errors,
};
console.log(JSON.stringify(summary, null, 2));
await browser.close();
site.close();
gh.close();
