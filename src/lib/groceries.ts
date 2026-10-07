// Everyday shopping (Einkaufskorb): categories, the built-in catalogue that
// gives a category and icon, and parsing of "500 g Mehl" into amount + name.
// No AI: a suggestion is a dictionary lookup, and what you two confirm in the
// sorting assistant is remembered in hiwo.json (grocery_words).

import type { GroceryItem } from "./types";

export const CATEGORIES = [
  { id: "obst", name: "Obst", icon: "🍎" },
  { id: "gemuese", name: "Gemüse", icon: "🥕" },
  { id: "brot", name: "Brot & Backwaren", icon: "🥖" },
  { id: "kuehl", name: "Milch, Käse & Eier", icon: "🧀" },
  { id: "fleisch", name: "Fleisch & Fisch", icon: "🥩" },
  { id: "vorrat", name: "Vorrat", icon: "🍝" },
  { id: "tk", name: "Tiefkühl", icon: "🧊" },
  { id: "suess", name: "Süßes & Snacks", icon: "🍫" },
  { id: "getraenke", name: "Getränke", icon: "🥤" },
  { id: "drogerie", name: "Drogerie", icon: "🧴" },
  { id: "haushalt", name: "Haushalt", icon: "🧽" },
  { id: "sonstiges", name: "Sonstiges", icon: "🛍️" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const category = (id: string | null | undefined) => CATEGORIES.find((c) => c.id === id);

/**
 * The built-in catalogue. One product per comma: "Display/alias/alias=icon".
 * The display name shows in the catalogue, every form is matched when typing.
 * Products without their own icon use the line's icon, then the category's.
 */
export type Product = { name: string; category: CategoryId; icon?: string; forms: string[] };
export const CATALOG: Product[] = [];
const W: Record<string, Product> = {};
const add = (cat: CategoryId, list: string, icon?: string) => {
  for (const entry of list.split(",")) {
    const [spelled, own] = entry.split("=");
    const [name, ...aliases] = spelled.split("/").map((s) => s.trim());
    const forms = [name, ...aliases].map(normalize);
    const p: Product = { name, category: cat, icon: own?.trim() || icon, forms };
    CATALOG.push(p);
    for (const w of forms) W[w] = p;
  }
};

/** Lower case, single spaces; the form words are compared in. */
export function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

// Obst
add("obst", "Äpfel/apfel=🍎,Bananen/banane=🍌,Birnen/birne=🍐,Orangen/orange/apfelsine/apfelsinen=🍊,Mandarinen/mandarine/clementine/clementinen=🍊,Zitronen/zitrone=🍋,Limetten/limette=🍋,Weintrauben/trauben/traube=🍇,Erdbeeren/erdbeere=🍓,Himbeeren/himbeere,Heidelbeeren/heidelbeere/blaubeeren/blaubeere=🫐,Brombeeren/brombeere,Beeren,Kirschen/kirsche=🍒,Pfirsiche/pfirsich/nektarine/nektarinen=🍑,Aprikosen/aprikose=🍑,Melone/melonen=🍈,Wassermelone=🍉,Ananas=🍍,Mango/mangos=🥭,Kiwis/kiwi=🥝,Avocados/avocado=🥑,Pflaumen/pflaume/zwetschgen/zwetschge,Feigen/feige,Granatapfel,Datteln,Rhabarber,Kokosnuss=🥥,Obst");

// Gemüse
add("gemuese", "Tomaten/tomate/cherrytomaten/rispentomaten=🍅,Gurke/gurken/salatgurke=🥒,Karotten/karotte/möhren/möhre/mohrrüben=🥕,Kartoffeln/kartoffel=🥔,Süßkartoffeln/süßkartoffel=🍠,Zwiebeln/zwiebel/schalotten=🧅,Frühlingszwiebeln/lauchzwiebeln,Knoblauch=🧄,Paprika/paprikas=🫑,Chili/chilis/peperoni=🌶️,Brokkoli/broccoli=🥦,Salat/kopfsalat/eisbergsalat=🥬,Feldsalat=🥬,Rucola=🥬,Spinat/blattspinat=🥬,Mais/maiskolben=🌽,Champignons/champignon/pilze=🍄,Aubergine/auberginen=🍆,Zucchini,Kürbis=🎃,Blumenkohl,Rosenkohl,Kohlrabi,Kohl/weißkohl,Rotkohl,Grünkohl,Wirsing,Lauch/porree,Sellerie/staudensellerie,Rote Bete,Radieschen,Rettich,Fenchel,Spargel,Ingwer=🫚,Bohnen/grüne bohnen=🫘,Erbsen=🫛,Kräuter=🌿,Petersilie=🌿,Schnittlauch=🌿,Basilikum=🌿,Dill=🌿,Koriander=🌿,Minze=🌿,Mangold,Pastinaken,Gemüse");

// Brot & Backwaren
add("brot", "Brot/vollkornbrot=🍞,Toast/toastbrot=🍞,Brötchen/semmeln=🥯,Baguette=🥖,Croissants/croissant=🥐,Brezeln/brezel/laugenbrezel=🥨,Knäckebrot,Wraps/tortillas=🫓,Fladenbrot=🫓,Kuchen=🍰,Zwieback");

// Milch, Käse & Eier
add("kuehl", "Eier/ei=🥚,Milch=🥛,Hafermilch/haferdrink=🥛,Mandelmilch=🥛,Sojamilch=🥛,Buttermilch=🥛,Butter=🧈,Käse,Gouda,Emmentaler,Bergkäse,Reibekäse,Mozzarella,Parmesan,Feta,Halloumi,Camembert/brie,Frischkäse,Hüttenkäse,Joghurt/jogurt,Quark,Skyr,Sahne,Schmand/saure sahne,Crème fraîche/creme fraiche,Margarine,Pudding=🍮,Kefir,Tofu,Hummus,Pesto,Gnocchi/schupfnudeln");

// Fleisch & Fisch
add("fleisch", "Fisch=🐟,Lachs=🐟,Thunfischsteak=🐟,Forelle=🐟,Kabeljau/seelachs=🐟,Garnelen/shrimps=🍤,Hähnchen/hähnchenbrust/hühnchen/huhn/chicken=🍗,Putenbrust/pute=🍗,Fleisch=🥩,Hackfleisch/hack/rinderhack=🥩,Steak/steaks=🥩,Schnitzel=🥩,Gulasch=🥩,Braten/rind/schwein/kotelett=🍖,Würstchen/wiener/bratwurst/wurst=🌭,Salami,Schinken/kochschinken,Speck/bacon=🥓,Aufschnitt,Leberwurst,Mett,Chorizo");

// Vorrat
add("vorrat", "Nudeln/pasta=🍝,Spaghetti=🍝,Penne/fusilli=🍝,Lasagneplatten,Tortellini/ravioli,Reis/basmatireis/risottoreis=🍚,Couscous/bulgur,Quinoa,Mehl,Zucker,Puderzucker,Vanillezucker,Backpulver,Hefe,Speisestärke/stärke,Haferflocken=🥣,Müsli/granola=🥣,Cornflakes=🥣,Olivenöl=🫒,Öl/rapsöl/sonnenblumenöl,Essig/balsamico,Salz=🧂,Pfeffer,Gewürze/curry/paprikapulver/zimt/oregano,Brühe/gemüsebrühe,Sojasauce/sojasoße,Senf,Ketchup,Mayonnaise/mayo,Tomatenmark=🥫,Passierte Tomaten/dosentomaten/tomatensoße/tomatensauce=🥫,Kokosmilch=🥥,Linsen,Kichererbsen,Kidneybohnen=🥫,Thunfisch=🥫,Konserven=🥫,Honig=🍯,Marmelade/konfitüre,Nutella,Erdnussbutter=🥜,Nüsse/walnüsse=🥜,Mandeln=🌰,Kerne/sonnenblumenkerne/saaten,Rosinen,Kaffee/kaffeebohnen/espresso=☕,Tee=🍵,Kakao");

// Tiefkühl
add("tk", "Pizza/tiefkühlpizza=🍕,Pommes=🍟,Eis/speiseeis=🍦,TK-Gemüse,Fischstäbchen,Tiefkühlbeeren,Eiswürfel");

// Süßes & Snacks
add("suess", "Schokolade/schoki=🍫,Kekse=🍪,Gummibärchen=🍬,Bonbons=🍬,Müsliriegel/riegel,Süßigkeiten=🍬,Pralinen,Chips/kartoffelchips=🥔,Salzstangen=🥨,Erdnüsse=🥜,Cracker,Popcorn=🍿,Nachos,Snacks");

// Getränke
add("getraenke", "Wasser/mineralwasser/sprudel/stilles wasser=💧,Saft=🧃,Apfelsaft=🧃,Orangensaft=🧃,Apfelschorle/schorle=🧃,Limonade/limo=🥤,Cola=🥤,Eistee=🥤,Smoothie=🥤,Bier=🍺,Radler=🍺,Alkoholfreies Bier=🍺,Wein=🍷,Rotwein=🍷,Weißwein=🥂,Rosé=🍷,Sekt/prosecco=🍾,Gin/wodka/rum=🍸,Aperol=🍹");

// Drogerie
add("drogerie", "Shampoo,Spülung,Duschgel,Seife/flüssigseife/handseife=🧼,Deo/deodorant,Zahnpasta/zahncreme=🪥,Zahnbürste=🪥,Zahnseide,Mundspülung,Bodylotion/creme,Handcreme,Sonnencreme=🧴,Rasierer/rasierklingen=🪒,Rasierschaum,Wattepads,Wattestäbchen,Tampons,Binden/slipeinlagen,Kondome,Haargel/haarspray,Make-up=💄,Abschminktücher,Taschentücher=🤧,Pflaster=🩹,Tabletten/ibuprofen=💊,Vitamine=💊,Windeln,Feuchttücher");

// Haushalt
add("haushalt", "Klopapier/toilettenpapier=🧻,Küchenrolle/küchenpapier=🧻,Servietten,Spülmittel,Spülmaschinentabs/tabs/spültabs/geschirrspültabs,Spülmaschinensalz,Klarspüler,Waschmittel,Weichspüler,Putzmittel/allzweckreiniger,Glasreiniger,Badreiniger/wc-reiniger,Entkalker,Schwämme/schwamm/spülschwamm=🧽,Putzlappen,Müllbeutel/mülltüten=🗑️,Gefrierbeutel,Alufolie,Frischhaltefolie,Backpapier,Kerzen/teelichter=🕯️,Batterien=🔋,Glühbirne=💡,Streichhölzer/feuerzeug=🔥");

/** short words that are safe at the end of a compound: Kokosöl, Kräutertee */
const SHORT_SUFFIX = new Set(["öl", "tee"]);
const keys = Object.keys(W).sort((a, b) => b.length - a.length);

export type Suggestion = { category: CategoryId; icon?: string; learned: boolean } | null;

/** The catalogue product a name stands for: exact form, else the end of a compound ("Vollkornbrot" → Brot). */
export function product(name: string): Product | null {
  const n = normalize(name);
  if (W[n]) return W[n];
  // the longest match wins ("Zahnpasta" is Drogerie, not "Pasta");
  // short words (Ei, Eis) only as whole words, else "Brei" would be Eier
  for (const k of keys) {
    const hit = k.length < 4 && !SHORT_SUFFIX.has(k) ? n.split(" ").includes(k) : n.endsWith(k) || n.split(" ").includes(k);
    if (hit) return W[k];
  }
  return null;
}

/** Category for a name: first what you two chose before, then the catalogue. */
export function suggest(name: string, learned: Record<string, string> = {}): Suggestion {
  const n = normalize(name);
  const p = product(name);
  if (learned[n] && category(learned[n])) return { category: learned[n] as CategoryId, icon: p?.icon, learned: true };
  return p ? { category: p.category, icon: p.icon, learned: false } : null;
}

/**
 * The emoji on a tile: the product's own (Äpfel 🍎) or none, then the tile shows
 * the first letter like Bring! does. A category icon would mislead (Mehl as 🍝).
 */
export function iconFor(item: Pick<GroceryItem, "name" | "category">) {
  const own = product(item.name);
  return own?.icon && (!item.category || own.category === item.category) ? own.icon : null;
}

/** Catalogue products matching what is being typed; names starting with it first. */
export function search(query: string, limit = 12): Product[] {
  const q = normalize(query);
  if (!q) return [];
  const starts = CATALOG.filter((p) => p.forms.some((f) => f.startsWith(q)));
  const contains = CATALOG.filter((p) => !starts.includes(p) && p.forms.some((f) => f.includes(q)));
  return [...starts, ...contains].slice(0, limit);
}

const UNITS =
  "g|gr|kg|mg|ml|l|liter|x|stk|stück|pck|pkg|packung|packungen|päckchen|dose|dosen|flasche|flaschen|becher|bund|glas|gläser|tüte|tüten|netz|netze|beutel|rolle|rollen|kasten|kästen|scheiben|tafel|tafeln|kopf|köpfe";
const AMOUNT = new RegExp(`^(\\d+(?:[.,]\\d+)?|½|¼|zwei|drei|vier|fünf|sechs)\\s*(?:(${UNITS})\\.?\\s+|\\s+)(.+)$`, "i");
const AMOUNT_AFTER = new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNITS})?\\.?$`, "i");

/** "500 g Mehl" → { amount: "500 g", name: "Mehl" }; "Eier 10" works as well. */
export function parseEntry(text: string): { name: string; amount: string | null } {
  const t = text.trim().replace(/\s+/g, " ");
  const m = t.match(AMOUNT);
  if (m) return { name: cap(m[3]), amount: [m[1].toLowerCase(), unit(m[2])].filter(Boolean).join(" ") };
  const a = t.match(AMOUNT_AFTER);
  if (a) return { name: cap(a[1]), amount: [a[2], unit(a[3])].filter(Boolean).join(" ") };
  return { name: cap(t), amount: null };
}

const unit = (u: string | undefined) => (!u ? null : u.toLowerCase() === "x" ? null : u.length <= 3 ? u.toLowerCase() : u);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Milch, 6 Eier, Brot" → three entries. */
export const splitEntries = (text: string) =>
  text
    .split(/[;\n]|,(?!\d)|(?<!\d),/) // "1,5 l Milch" stays one entry
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseEntry);

/** First letter for the A–Z filter; Ä sorts with A. */
export const initial = (name: string) => {
  const c = name.trim().charAt(0).toUpperCase();
  return ({ Ä: "A", Ö: "O", Ü: "U" } as Record<string, string>)[c] ?? (/[A-Z]/.test(c) ? c : "#");
};

/** How many bought items stay as "Zuletzt gekauft"; older ones are dropped. */
export const KEEP_RECENT = 60;

/**
 * Put entries into the basket (used for the optimistic view and the commit alike):
 * something already open only gets the new amount, something bought before
 * comes back, anything else is new. Known words are sorted in right away.
 */
export function putEntries(
  list: GroceryItem[],
  entries: { id: string; name: string; amount: string | null }[],
  learned: Record<string, string>,
  by: string | null,
  at: string,
): GroceryItem[] {
  const out = [...list];
  for (const e of entries) {
    const n = normalize(e.name);
    const k = out.findIndex((g) => normalize(g.name) === n);
    if (k >= 0) {
      const g = out[k];
      out[k] = { ...g, amount: e.amount ?? (g.status === "open" ? g.amount : null), status: "open", done_by: null, done_at: null };
      continue;
    }
    out.push({
      id: e.id,
      name: e.name,
      amount: e.amount,
      category: suggest(e.name, learned)?.category ?? null,
      status: "open",
      created_by: by,
      done_by: null,
      done_at: null,
      created_at: at,
    });
  }
  return out;
}

/** Drops the oldest bought items beyond KEEP_RECENT. */
export function pruneRecent(list: GroceryItem[]) {
  const done = list.filter((g) => g.status === "done").sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
  const drop = new Set(done.slice(KEEP_RECENT).map((g) => g.id));
  return drop.size ? list.filter((g) => !drop.has(g.id)) : list;
}
