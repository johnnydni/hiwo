// Screenshots of every screen at phone, tablet and desktop width, against a
// mock GitHub API seeded with a lived-in home (no clicking through onboarding).
// Build first:  NEXT_PUBLIC_BASE_PATH=/hiwo NEXT_PUBLIC_GITHUB_API=http://127.0.0.1:4010 npm run build
// Then:         CHROMIUM_PATH=<pfad> node scripts/screens.mjs   (PNGs in screens-output/)
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import { startMockGitHub } from "./mock-github.mjs";

const OUT = process.env.SCREENS_OUT ?? "screens-output";
fs.mkdirSync(OUT, { recursive: true });
const PORT = 3001;
const BASE = `http://127.0.0.1:${PORT}/hiwo`;
const REPO = "illy/hiwo-daten";
const TOKEN = "test-token";

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
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// --- synthetic interior photos -------------------------------------------
const gen = await browser.newPage();
const palettes = [
  ["#d9cbb7", "#a88b6a", "#6e5a47", "#e9e2d6"],
  ["#e4ddd2", "#9c8a78", "#4f4a45", "#c9b79c"],
  ["#cfd2c8", "#8a9680", "#5b5146", "#efe9df"],
  ["#eadfd0", "#b9684a", "#3f3a35", "#d8cbb8"],
  ["#dcd6cc", "#7d6f61", "#2f2b27", "#f1ece4"],
];
const jpg = [];
for (let i = 0; i < palettes.length; i++) {
  const data = await gen.evaluate(([p, seed]) => {
    const c = document.createElement("canvas");
    c.width = 1200; c.height = 900;
    const g = c.getContext("2d");
    g.scale(0.75, 0.75);
    const wall = g.createLinearGradient(0, 0, 0, 800);
    wall.addColorStop(0, p[3]); wall.addColorStop(1, p[0]);
    g.fillStyle = wall; g.fillRect(0, 0, 1600, 820);
    const floor = g.createLinearGradient(0, 820, 0, 1200);
    floor.addColorStop(0, p[1]); floor.addColorStop(1, p[2]);
    g.fillStyle = floor; g.fillRect(0, 820, 1600, 380);
    g.fillStyle = "rgba(255,255,255,0.55)"; g.fillRect(200 + seed * 120, 140, 380, 480);
    g.fillStyle = p[2]; g.globalAlpha = 0.85;
    g.beginPath(); g.roundRect(700 - seed * 60, 620, 720, 240, 40); g.fill();
    g.fillStyle = p[1]; g.beginPath(); g.roundRect(730 - seed * 60, 560, 660, 140, 30); g.fill();
    g.globalAlpha = 1;
    g.fillStyle = "#6f7d63";
    for (let k = 0; k < 9; k++) { g.beginPath(); g.ellipse(160 + k * 6, 700 - k * 30, 26, 70, (k - 4) * 0.3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#b9684a"; g.beginPath(); g.roundRect(110, 760, 120, 120, 16); g.fill();
    return c.toDataURL("image/jpeg", 0.85).split(",")[1];
  }, [palettes[i], i]);
  jpg.push(Buffer.from(data, "base64"));
}
// a product shot on white (armchair with a white cushion, which must stay)
const product = Buffer.from(
  await gen.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 900; c.height = 900;
    const g = c.getContext("2d");
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, 900, 900);
    g.fillStyle = "rgba(0,0,0,0.08)"; g.beginPath(); g.ellipse(450, 760, 330, 30, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#4d6b5a";
    g.beginPath(); g.roundRect(170, 220, 560, 330, 60); g.fill();
    g.beginPath(); g.roundRect(120, 420, 150, 260, 40); g.fill();
    g.beginPath(); g.roundRect(630, 420, 150, 260, 40); g.fill();
    g.beginPath(); g.roundRect(240, 500, 420, 180, 30); g.fill();
    g.fillStyle = "#f4f1ea"; g.beginPath(); g.roundRect(330, 330, 240, 150, 40); g.fill();
    g.fillStyle = "#6b4f3a";
    for (const x of [170, 700]) g.fillRect(x, 680, 30, 80);
    return c.toDataURL("image/jpeg", 0.9).split(",")[1];
  }),
  "base64",
);
await gen.close();

// --- seed ---------------------------------------------------------------
const t = (d) => new Date(Date.UTC(2026, 9, d, 10)).toISOString();
const photo = (id, room_id, kind, img, name = null, note = null) => {
  const p = `fotos/${room_id}/${id}.jpg`;
  gh.files.set(p, jpg[img]);
  return { id, room_id, kind, name, note, path: p, sha: "x", width: 1200, height: 900, created_by: "m1", created_at: t(2) };
};
const item = (id, name, room_id, variant_id, price, status = "open", extra = {}) => ({
  id, room_id, variant_id, name, price_cents: price, note: null, url: null, image_path: null, image_sha: null,
  status, created_by: "m1", done_by: status === "done" ? "m2" : null, done_at: status === "done" ? t(4) : null, created_at: t(3), ...extra,
});
const rooms = ["Wohnzimmer", "Schlafzimmer", "Küche", "Badezimmer", "Arbeitszimmer mit Gästebett", "Flur"].map((name, i) => ({
  id: `r${i}`, name, position: i, created_by: "m1", created_at: t(1), updated_at: t(1 + i),
}));
const photos = [
  photo("b0", "r0", "base", 0),
  photo("v0", "r0", "variant", 1, "Japandi", "Hell, Holz, wenig Zeug. Das Sofa soll niedrig sein, der Teppich groß genug für die vorderen Beine."),
  photo("v1", "r0", "variant", 2, "Warm & Samt"),
  photo("v2", "r0", "variant", 3, "Variante 3"),
  photo("b1", "r1", "base", 4),
  photo("v3", "r1", "variant", 0, "Ruhig in Salbeigrün mit Leinen"),
  photo("b2", "r2", "base", 3),
  photo("b4", "r4", "base", 2),
];
const shopping = [
  item("s1", "Leinensofa, 3-Sitzer", "r0", "v0", 129900, "open", { url: "https://www.example-moebel.de/sofa", note: "Farbe Sand, Bezug abnehmbar" }),
  item("s2", "Couchtisch Eiche", "r0", "v0", 34900, "open", { image_path: "fotos/einkauf/s2.jpg", image_sha: "x" }),
  item("s3", "Papierleuchte Ø 60 cm", "r0", "v0", 8990),
  item("s4", "Samtsessel", "r0", "v1", 45900),
  item("s5", "Glühbirnen E27 warmweiß", "r0", null, 1299),
  item("s6", "Teppich 200×300", "r0", null, 12900),
  item("s7", "Nachttisch", "r1", null, null),
  item("s8", "Bettwäsche Leinen", "r1", "v3", 11900),
  item("s9", "Vorhänge", null, null, 1299),
  item("s10", "Pflanzen", null, null, 2490, "done"),
  item("s11", "Gewürzregal", "r2", null, 3499),
  item("s12", "Ein sehr langer Artikelname, der auf dem Handy umbrechen oder abgeschnitten werden muss", "r4", null, 19900),
];
gh.files.set("fotos/einkauf/s2.jpg", jpg[2]);
gh.files.set("fotos/einkauf/s13.jpg", product);
shopping.push(item("s13", "Sessel Salbei", "r0", "v0", 59900, "open", { image_path: "fotos/einkauf/s13.jpg", image_sha: "x" }));
gh.files.set("fotos/skizzen/b0/k1.jpg", jpg[1]);
const sketches = [{ id: "k1", source_id: "b0", path: "fotos/skizzen/b0/k1.jpg", sha: "x", width: 1200, height: 900, created_by: "m2", created_at: t(4) }];
const doc = {
  schema: 2,
  home: { id: "h1", name: "Altbau Schwabing", city: "München", cover_photo_id: "b0", created_at: t(1) },
  members: [
    { id: "m1", name: "Illy", role: "owner", joined_at: t(1) },
    { id: "m2", name: "Nadin", role: "member", joined_at: t(2) },
  ],
  rooms, photos, shopping, sketches,
};
gh.files.set("hiwo.json", Buffer.from(JSON.stringify(doc, null, 2)));

// --- screens -------------------------------------------------------------
const VIEWPORTS = {
  phone: { width: 375, height: 812 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
};
const PAGES = {
  home: "/",
  wohnung: "/wohnung/",
  zimmer: "/zimmer/?id=r0",
  "zimmer-leer": "/zimmer/?id=r3",
  variante: "/variante/?id=v0",
  einkauf: "/einkauf/",
  artikel: "/artikel/?id=s1",
  "artikel-foto": "/artikel/?id=s2",
  profil: "/profil/",
  mitbewohner: "/profil/mitbewohner/",
};
const only = process.env.SCREENS_ONLY?.split(",");
const errors = [];
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: size, deviceScaleFactor: 2, locale: "de-DE" });
  await ctx.addInitScript(([repo, token]) => {
    localStorage.setItem("hiwo_connection", JSON.stringify({ repo, token, memberId: "m1" }));
    sessionStorage.setItem("hiwo_intro", "1"); // skip the splash animation
  }, [REPO, TOKEN]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${vp}: ${e}`));
  for (const [name, url] of Object.entries(PAGES)) {
    if (only && !only.includes(name)) continue;
    await page.goto(BASE + url);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${vp}-${name}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) errors.push(`${vp}-${name}: horizontal overflow ${overflow}px`);
  }
  // a sheet, open
  if (!only || only.includes("sheet")) {
    await page.goto(BASE + "/einkauf/");
    await page.waitForLoadState("networkidle");
    await page.click("button:has-text('Artikel hinzufügen')");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${vp}-sheet.png` });
    // opened from an (animated) page header
    await page.goto(BASE + "/wohnung/");
    await page.waitForLoadState("networkidle");
    await page.click("header button[aria-label='Zimmer hinzufügen']");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${vp}-sheet-header.png` });
  }
  // before/after slider on a variant, handle dragged to 30%
  if (!only || only.includes("vergleich")) {
    await page.goto(BASE + "/variante/?id=v0");
    await page.waitForLoadState("networkidle");
    await page.click("button:has-text('Vergleich')");
    const box = await page.locator("[role=slider]").locator("..").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${vp}-vergleich.png` });
  }
  // image editor: put the armchair (background removed) into the variant photo
  if (!only || only.includes("editor-produkt")) {
    await page.goto(BASE + "/variante/?id=v0");
    await page.waitForLoadState("networkidle");
    await page.click("button[aria-label='Bild bearbeiten']");
    await page.waitForSelector("canvas[aria-label='Zeichenfläche']");
    await page.waitForTimeout(400);
    await page.click("button[aria-label='Produkt']");
    await page.waitForSelector("[aria-label='Produkt einfügen']");
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${vp}-editor-picker.png` });
    await page.click("button[aria-label='Sessel Salbei einfügen']");
    await page.waitForSelector("input[aria-label='Hintergrund entfernen']");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${vp}-editor-produkt.png` });
    // drag it to the left and mirror it
    const b = await page.locator("canvas[aria-label='Zeichenfläche']").boundingBox();
    const at = (x, y) => [b.x + b.width * x, b.y + b.height * y];
    const drag = async (from, to) => {
      await page.mouse.move(...from);
      await page.mouse.down();
      await page.mouse.move(...to, { steps: 10 });
      await page.mouse.up();
    };
    await drag(at(0.5, 0.58), at(0.3, 0.62));
    await page.click("button:has-text('Spiegeln')");
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/${vp}-editor-produkt-bewegt.png` });
    await page.click("button:has-text('Als Skizze sichern')");
    await page.waitForSelector("[role=dialog] >> text=Version", { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${vp}-editor-gesichert.png` });
    // export the sketch (no share sheet in headless Chromium, so it downloads)
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("[role=dialog] button:has-text('Herunterladen')")]);
    const size = fs.statSync(await dl.path()).size;
    if (!/^Wohnzimmer Japandi Skizze \d+\.jpg$/.test(dl.suggestedFilename()) || size < 10_000) errors.push(`${vp}: export ${dl.suggestedFilename()} ${size}B`);
  }
  await ctx.close();
}
// logged-out screens
{
  const ctx = await browser.newContext({ viewport: VIEWPORTS[Object.keys(VIEWPORTS)[0]], deviceScaleFactor: 2, locale: "de-DE" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/login/");
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/login.png` });
  await ctx.close();
}
console.log(errors.length ? errors.join("\n") : "no errors");
await browser.close();
site.close();
gh.close();
