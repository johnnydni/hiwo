// Everyday shopping (Einkaufswagen): categories, the built-in word list that
// suggests a category, and parsing of "500 g Mehl" into amount + name.
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

/** word → category, optionally with its own icon. Singular and plural where they differ. */
const W: Record<string, [CategoryId, string?]> = {};
const add = (cat: CategoryId, words: string, icon?: string) => {
  for (const w of words.split(",")) W[w.trim()] = icon ? [cat, icon] : [cat];
};

// Obst
add("obst", "apfel,äpfel", "🍎");
add("obst", "banane,bananen", "🍌");
add("obst", "birne,birnen", "🍐");
add("obst", "orange,orangen,apfelsine,apfelsinen,mandarine,mandarinen,clementine,clementinen", "🍊");
add("obst", "zitrone,zitronen,limette,limetten", "🍋");
add("obst", "traube,trauben,weintrauben", "🍇");
add("obst", "erdbeere,erdbeeren", "🍓");
add("obst", "himbeere,himbeeren,brombeere,brombeeren,heidelbeere,heidelbeeren,blaubeere,blaubeeren,johannisbeeren,beeren", "🫐");
add("obst", "kirsche,kirschen", "🍒");
add("obst", "pfirsich,pfirsiche,nektarine,nektarinen,aprikose,aprikosen", "🍑");
add("obst", "melone,melonen,wassermelone", "🍉");
add("obst", "ananas", "🍍");
add("obst", "mango,mangos", "🥭");
add("obst", "kiwi,kiwis", "🥝");
add("obst", "pflaume,pflaumen,zwetschge,zwetschgen,feige,feigen,granatapfel,datteln,obst,rhabarber");
add("obst", "avocado,avocados", "🥑");

// Gemüse
add("gemuese", "tomate,tomaten,cherrytomaten,rispentomaten", "🍅");
add("gemuese", "gurke,gurken,salatgurke", "🥒");
add("gemuese", "karotte,karotten,möhre,möhren,mohrrüben", "🥕");
add("gemuese", "kartoffel,kartoffeln,süßkartoffel,süßkartoffeln", "🥔");
add("gemuese", "zwiebel,zwiebeln,lauchzwiebeln,frühlingszwiebeln,schalotten", "🧅");
add("gemuese", "knoblauch", "🧄");
add("gemuese", "paprika,paprikas,chili,chilis,peperoni", "🫑");
add("gemuese", "brokkoli,broccoli", "🥦");
add("gemuese", "salat,eisbergsalat,feldsalat,rucola,kopfsalat,spinat,blattspinat", "🥬");
add("gemuese", "mais,maiskolben", "🌽");
add("gemuese", "pilze,champignons,champignon", "🍄");
add("gemuese", "aubergine,auberginen", "🍆");
add("gemuese", "zucchini,kürbis,blumenkohl,rosenkohl,kohlrabi,lauch,porree,sellerie,staudensellerie,rote bete,radieschen,rettich,fenchel,spargel,ingwer,bohnen,erbsen,kräuter,petersilie,schnittlauch,basilikum,dill,koriander,minze,gemüse,kohl,rotkohl,weißkohl,grünkohl,wirsing,mangold,pastinaken");

// Brot & Backwaren
add("brot", "brot,toast,toastbrot,vollkornbrot,brötchen,semmeln,baguette,croissant,croissants,brezel,brezeln,laugenbrezel,knäckebrot,wraps,tortillas,fladenbrot,kuchen,zwieback", "🥖");

// Milch, Käse & Eier
add("kuehl", "ei,eier", "🥚");
add("kuehl", "milch,hafermilch,mandelmilch,sojamilch,haferdrink,buttermilch", "🥛");
add("kuehl", "käse,gouda,emmentaler,mozzarella,parmesan,feta,frischkäse,hüttenkäse,camembert,brie,halloumi,reibekäse,bergkäse", "🧀");
add("kuehl", "butter", "🧈");
add("kuehl", "joghurt,jogurt,quark,skyr,sahne,schmand,saure sahne,creme fraiche,crème fraîche,margarine,pudding,kefir,tofu,hummus,pesto,gnocchi,schupfnudeln");

// Fleisch & Fisch
add("fleisch", "fisch,lachs,thunfischsteak,forelle,garnelen,shrimps,kabeljau,seelachs", "🐟");
add("fleisch", "hähnchen,hähnchenbrust,hühnchen,huhn,putenbrust,pute,chicken", "🍗");
add("fleisch", "fleisch,hack,hackfleisch,rinderhack,steak,steaks,schnitzel,gulasch,braten,rind,schwein,kotelett", "🥩");
add("fleisch", "wurst,würstchen,salami,schinken,kochschinken,speck,bacon,aufschnitt,bratwurst,wiener,leberwurst,mett,chorizo", "🥓");

// Vorrat
add("vorrat", "nudeln,pasta,spaghetti,penne,fusilli,lasagneplatten,tortellini,ravioli", "🍝");
add("vorrat", "reis,basmatireis,risottoreis,couscous,bulgur,quinoa", "🍚");
add("vorrat", "mehl,zucker,puderzucker,backpulver,hefe,vanillezucker,stärke,speisestärke,haferflocken,müsli,cornflakes,granola");
add("vorrat", "öl,olivenöl,rapsöl,sonnenblumenöl,essig,balsamico,salz,pfeffer,gewürze,curry,paprikapulver,zimt,oregano,brühe,gemüsebrühe,sojasauce,sojasoße,senf,ketchup,mayo,mayonnaise,tomatenmark,passierte tomaten,dosentomaten,tomatensoße,tomatensauce,kokosmilch,linsen,kichererbsen,kidneybohnen,thunfisch,konserven,honig,marmelade,konfitüre,nutella,erdnussbutter,nüsse,mandeln,walnüsse,kerne,sonnenblumenkerne,saaten,rosinen,kaffee,kaffeebohnen,espresso,tee,kakao");

// Tiefkühl
add("tk", "pizza,tiefkühlpizza,pommes,eis,speiseeis,tk-gemüse,fischstäbchen,tiefkühlbeeren,eiswürfel", "🧊");

// Süßes & Snacks
add("suess", "schokolade,schoki,kekse,gummibärchen,bonbons,riegel,müsliriegel,süßigkeiten,pralinen", "🍫");
add("suess", "chips,kartoffelchips,salzstangen,erdnüsse,cracker,popcorn,nachos,snacks", "🥨");

// Getränke
add("getraenke", "wasser,mineralwasser,sprudel,stilles wasser", "💧");
add("getraenke", "saft,apfelsaft,orangensaft,schorle,apfelschorle,limo,limonade,cola,eistee,smoothie", "🧃");
add("getraenke", "bier,radler,alkoholfreies bier", "🍺");
add("getraenke", "wein,rotwein,weißwein,rosé,sekt,prosecco,gin,wodka,rum,aperol", "🍷");

// Drogerie
add("drogerie", "shampoo,spülung,duschgel,seife,flüssigseife,handseife,deo,deodorant,zahnpasta,zahncreme,zahnbürste,zahnseide,mundspülung,bodylotion,creme,handcreme,sonnencreme,rasierer,rasierklingen,rasierschaum,wattepads,wattestäbchen,tampons,binden,slipeinlagen,kondome,haargel,haarspray,make-up,abschminktücher,taschentücher,pflaster,tabletten,ibuprofen,vitamine,windeln,feuchttücher", "🧴");

// Haushalt
add("haushalt", "klopapier,toilettenpapier,küchenrolle,küchenpapier,servietten", "🧻");
add("haushalt", "spülmittel,tabs,spültabs,geschirrspültabs,spülmaschinensalz,klarspüler,waschmittel,weichspüler,putzmittel,allzweckreiniger,glasreiniger,badreiniger,wc-reiniger,entkalker,schwamm,schwämme,spülschwamm,putzlappen,müllbeutel,mülltüten,gefrierbeutel,alufolie,frischhaltefolie,backpapier,kerzen,teelichter,batterien,glühbirne,streichhölzer,feuerzeug", "🧽");

/** Lower case, single spaces; the form words are compared in. */
export const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** short words that are safe at the end of a compound: Kokosöl, Kräutertee */
const SHORT_SUFFIX = new Set(["öl", "tee"]);
const keys = Object.keys(W).sort((a, b) => b.length - a.length);

export type Suggestion = { category: CategoryId; icon?: string; learned: boolean } | null;

/**
 * Suggest a category: first what you two confirmed before, then the word list.
 * German compounds work through the end of the word ("Vollkornbrot" → brot),
 * the longest match wins ("Zahnpasta" is Drogerie, not "Pasta").
 */
export function suggest(name: string, learned: Record<string, string> = {}): Suggestion {
  const n = normalize(name);
  if (learned[n] && category(learned[n])) return { category: learned[n] as CategoryId, icon: W[n]?.[1], learned: true };
  if (W[n]) return { category: W[n][0], icon: W[n][1], learned: false };
  for (const k of keys) {
    // short words (Ei, Öl, Eis) only as whole words, else "Brei" would be Eier
    const hit = k.length < 4 && !SHORT_SUFFIX.has(k) ? n.split(" ").includes(k) : n.endsWith(k) || n.split(" ").includes(k);
    if (hit) return { category: W[k][0], icon: W[k][1], learned: false };
  }
  return null;
}

/** The emoji shown in front of an item: its own (Apfel 🍎), else its category's. */
export function iconFor(item: Pick<GroceryItem, "name" | "category">) {
  const own = suggest(item.name);
  if (own?.icon && (!item.category || own.category === item.category)) return own.icon;
  return category(item.category)?.icon ?? null;
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
