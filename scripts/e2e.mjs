import fs from "node:fs";
import { chromium } from "playwright";

const OUT = process.env.E2E_OUT ?? "e2e-output";
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE ?? "http://127.0.0.1:3000/hiwo";
const HOME_URL = new RegExp(`^${BASE}/?$`);
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

async function latestCode(email) {
  for (let t = 0; t < 30; t++) {
    const r = await fetch("http://127.0.0.1:54324/api/v1/search?query=" + encodeURIComponent(`to:${email}`)).then((r) => r.json());
    if (r.messages?.length) {
      const id = r.messages[0].ID;
      const m = await fetch(`http://127.0.0.1:54324/api/v1/message/${id}`).then((r) => r.json());
      const code = (m.Text || m.HTML).match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("no code");
}

async function login(p, email) {
  if (!/\/login/.test(p.url())) await p.goto(`${BASE}/login/`);
  await p.fill("input[type=email]", email);
  await p.click("text=Weiter");
  await p.waitForSelector("text=Wir haben dir einen Code");
  const code = await latestCode(email);
  await p.fill("input[autocomplete=one-time-code]", code);
  await p.click("button:has-text('Anmelden')");
}

await page.goto(`${BASE}/`);
await page.waitForURL(/\/login\/?/);
await shot("01-login");
await login(page, "illy@example.com");
await page.waitForURL(/\/willkommen\/?$/);
await shot("02-onboarding");
await page.fill("input[name=display_name]", "Illy");
await page.fill("input[name=home_name]", "Meine Wohnung");
await page.fill("input[name=city]", "München");
await page.click("button:has-text('Wohnung anlegen')");
await page.waitForURL(HOME_URL);
await page.waitForSelector("text=Noch keine Zimmer");
await shot("03-home-empty");

// rooms
for (const [i, name] of ["Wohnzimmer", "Schlafzimmer", "Küche", "Badezimmer"].entries()) {
  await page.goto(`${BASE}/wohnung`);
  await page.click("button[aria-label='Zimmer hinzufügen']");
  await page.click(`button:has-text('${name}')`);
  await page.click("form button:has-text('Zimmer hinzufügen')");
  await page.waitForURL(/\/zimmer\/?\?id=/);
  if (i === 0) await shot("04-room-empty");
  const fileInput = page.locator("input[type=file]").first();
  await fileInput.setInputFiles(i === 0 ? [`${OUT}/room0.jpg`, `${OUT}/room1.jpg`, `${OUT}/room2.jpg`] : [`${OUT}/room${i}.jpg`]);
  await page.waitForSelector("text=Titelbild", { timeout: 20000 });
  if (i === 0) {
    for (const f of ["Sofa", "TV Board", "Couchtisch", "Teppich", "Lampe"]) {
      await page.fill("input[name=name]", f);
      await page.press("input[name=name]", "Enter");
      await page.waitForSelector(`li:has-text('${f}')`);
    }
    await shot("05-room-detail");
    // photo actions
    await page.locator("button:has(img)").nth(1).click();
    await page.click("text=Als Bild der Wohnung");
    await page.waitForTimeout(800);
  }
}
await page.goto(`${BASE}/wohnung`);
await page.waitForTimeout(500);
await shot("06-rooms");

// shopping
await page.goto(`${BASE}/einkauf`);
const add = async (name, room, price) => {
  await page.click("button:has-text('Artikel hinzufügen')");
  await page.fill("input[name=name]", name);
  if (room) await page.selectOption("select[name=room_id]", { label: room });
  if (price) {
    if (await page.isVisible("text=+ Preis, Link oder Notiz")) await page.click("text=+ Preis, Link oder Notiz");
    await page.fill("input[name=price]", price);
  }
  await page.click("button:has-text('Auf die Liste')");
  await page.waitForSelector(`li:has-text('${name}')`);
};
await add("Vorhänge", null, "12,99");
await add("Pflanzen", null, "24,90");
await add("Stehlampe", "Wohnzimmer", "89,90");
await add("Teppich", "Wohnzimmer", "129");
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
await page.fill("input[name=name]", "Nadin");
await page.fill("input[name=contact]", "nadin@example.com");
await page.click("form button:has-text('Einladen')");
await page.waitForSelector("text=Nadin wurde eingeladen.");
await shot("11-invited");
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
await shot("12-members");
await page.goto(`${BASE}/profil`);
await shot("13-profile");
await page.goto(`${BASE}/wohnung`);
await page.click("button[aria-label='hiwo fragen']");
await page.waitForTimeout(400);
await shot("14-ai");

// second user: Nadin joins via e-mail invite and checks an item
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "de-DE" });
const p2 = await ctx2.newPage();
p2.on("pageerror", (e) => errors.push("p2 " + e));
await login(p2, "nadin@example.com");
await p2.waitForURL(/\/willkommen\/?$/);
await p2.fill("input[name=display_name]", "Nadin");
await p2.click("button:has-text('Weiter')");
await p2.waitForURL(HOME_URL);
const sawHome = await p2.waitForSelector("text=Meine Wohnung").then(() => true, () => false);
await p2.goto(`${BASE}/einkauf`);
await p2.locator("li:has-text('Nachttisch') button[aria-label='Als erledigt markieren']").click();
await page.goto(`${BASE}/einkauf`);
await p2.waitForTimeout(1000);

// desktop
const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: await ctx.storageState() });
const pd = await ctxD.newPage();
await pd.goto(`${BASE}/wohnung`);
await pd.waitForTimeout(500);
await pd.screenshot({ path: `${OUT}/15-desktop-rooms.png` });
await pd.goto(`${BASE}/`);
await pd.waitForTimeout(500);
await pd.screenshot({ path: `${OUT}/16-desktop-home.png` });

// invite link flow for a person without e-mail invite
await page.goto(`${BASE}/profil/mitbewohner`);
await page.click("text=Person einladen");
await page.fill("input[name=name]", "Mama");
await page.fill("input[name=contact]", "+49 170 1234567");
await page.click("form button:has-text('Einladen')");
await page.waitForSelector("text=Mama wurde eingeladen.");

// Mama joins through the shared link (needs the local service key to read the token)
let joinedByLink = "skipped";
if (process.env.E2E_SERVICE_KEY) {
  const rows = await fetch(`${process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321"}/rest/v1/home_invites?name=eq.Mama&select=token`, {
    headers: { apikey: process.env.E2E_SERVICE_KEY, Authorization: `Bearer ${process.env.E2E_SERVICE_KEY}` },
  }).then((r) => r.json());
  const ctx4 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "de-DE" });
  const p4 = await ctx4.newPage();
  p4.on("pageerror", (e) => errors.push("p4 " + e));
  await p4.goto(`${BASE}/einladung/?t=${rows[0].token}`);
  await p4.waitForSelector("text=lädt dich in");
  await p4.screenshot({ path: `${OUT}/17-invite-link.png` });
  await p4.click("text=Anmelden und beitreten");
  await p4.waitForURL(/\/login\/?\?next=/);
  await login(p4, "mama@example.com");
  await p4.waitForSelector("text=Einladung annehmen");
  await p4.click("text=Einladung annehmen");
  await p4.waitForURL(/\/willkommen\/?$/);
  await p4.fill("input[name=display_name]", "Mama");
  await p4.click("button:has-text('Weiter')");
  await p4.waitForURL(HOME_URL);
  await p4.goto(`${BASE}/wohnung/`);
  await p4.waitForSelector("text=Wohnzimmer");
  joinedByLink = "ok";
}

console.log(JSON.stringify({ sawHome, joinedByLink, errors }, null, 2));
await browser.close();
