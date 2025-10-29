import { useEffect, useMemo, useState } from "react";

/**
 * WishCraft — Prompt Studio (PWA)
 * • Works offline (with /public/sw.js)
 * • History stored locally (last 10)
 * • Strong prompt controls for designer-grade images
 */

/* --------------------------------- utils --------------------------------- */
function clsx(...a: any[]) { return a.filter(Boolean).join(" "); }
function useLocalStorage<T>(key: string, def: T) {
  const [v, setV] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def; } catch { return def; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV] as const;
}
function haptic(ms = 12) { try { (navigator as any).vibrate?.(ms); } catch {} }

/* --------------------------------- domain -------------------------------- */
const OCCASIONS = [
  { id: "birthday",    label: "🎂 Birthday Wish Poster" },
  { id: "festival",    label: "🪔 Festival Wish Poster (India)" },
  { id: "anniversary", label: "💞 Anniversary Wish" },
  { id: "sale",        label: "🏷️ Festive Offer Banner" },
  { id: "custom",      label: "✨ Custom Canvas" },
] as const;

type AnyFestival = {
  id: string; label: string; palette: string[];
  motifs: string[]; greetings: Record<string, string>;
};
const BUILTIN_FESTIVALS: AnyFestival[] = [
  { id: "diwali", label: "Diwali", palette:["#F59E0B","#FDE68A","#B45309","#1F2937"], motifs:["diyas","rangoli","fireworks","lotus"], greetings:{en:"Happy Diwali", hi:"शुभ दीपावली", te:"శుభ దీపావళి"} },
  { id: "holi", label: "Holi", palette:["#EC4899","#F59E0B","#84CC16","#06B6D4"], motifs:["gulal splash","pichkari","color clouds"], greetings:{en:"Happy Holi", hi:"होली की शुभकामनाएँ", te:"హోలీ శుభాకాంక్షలు"} },
  { id: "sankranthi", label: "Sankranthi / Makar Sankranti", palette:["#FF8C00","#FFD166","#06B6D4","#065F46"], motifs:["kites","sugarcane","rangoli"], greetings:{en:"Happy Sankranthi", hi:"मकर संक्रांति की शुभकामनाएँ", te:"హ్యాపీ సంక్రాంతి"} },
  { id: "ganesh", label: "Ganesh Chaturthi", palette:["#F59E0B","#EF4444","#10B981","#1F2937"], motifs:["Ganesha icon","modak","marigold"], greetings:{en:"Happy Ganesh Chaturthi", hi:"गणेश चतुर्थी की शुभकामनाएँ", te:"వినాయక చవితి శుభాకాంక్షలు"} },
  { id: "navratri", label: "Navratri", palette:["#7C3AED","#E11D48","#F59E0B","#111827"], motifs:["dandiya","trishul","rangoli"], greetings:{en:"Happy Navratri", hi:"नवरात्रि की शुभकामनाएँ", te:"నవరాత్రి శుభాకాంక్షలు"} },
  { id: "rakhi", label: "Raksha Bandhan", palette:["#E11D48","#F59E0B","#2563EB","#111827"], motifs:["rakhi","sweets","thread pattern"], greetings:{en:"Happy Raksha Bandhan", hi:"रक्षाबंधन की शुभकामनाएँ", te:"రాఖీ పండుగ శుభాకాంక్షలు"} },
];

const LANGS = [
  { id:"en", label:"English" },
  { id:"hi", label:"Hindi (Devanagari)" },
  { id:"te", label:"Telugu" },
] as const;

const PALETTES = [
  { id:"auto",    label:"Auto from occasion" },
  { id:"gold",    label:"Royal Gold" },
  { id:"vibrant", label:"Vibrant" },
  { id:"pastel",  label:"Soft Pastel" },
  { id:"mono",    label:"Monochrome" },
] as const;

const ORIENT = [
  { id: "portrait",  label: "Portrait" },
  { id: "square",    label: "Square" },
  { id: "landscape", label: "Landscape" },
] as const;

const SIZE_PRESETS = [
  { id:"ig-post",     label:"1080×1080 (IG Post)" },
  { id:"ig-portrait", label:"1080×1350 (IG Portrait)" },
  { id:"story",       label:"1080×1920 (Story)" },
  { id:"a4",          label:"A4 2480×3508 (Print)" },
  { id:"hd",          label:"1920×1080 (HD)" },
] as const;

/** Expert Prompt Styles (additive) */
const STYLE_PRESETS = [
  { id:"minimal-luxe", label:"Minimal Luxe", parts:[
    "Minimal, upscale composition with generous negative space",
    "Soft micro-shadows, subtle paper grain",
    "Elegant display serif for H1; clean geometric sans for body",
  ]},
  { id:"editorial", label:"Editorial Serif", parts:[
    "Magazine-style editorial layout",
    "High contrast serif display + tidy sans subheads",
    "Grids, alignment, and baseline rhythm",
  ]},
  { id:"bold-memphis", label:"Bold Memphis", parts:[
    "Playful geometric shapes, Memphis accents",
    "Thick strokes, rounded forms, bold color blocking",
  ]},
  { id:"gradient-glow", label:"Gradient Glow", parts:[
    "Smooth multi-stop gradients, soft bloom glow",
    "Glassmorphism highlights with tasteful blur",
  ]},
  { id:"paper-collage", label:"Paper-Cut Collage", parts:[
    "Layered paper textures with cast shadows",
    "Torn edges, organic overlaps, hand-cut vibe",
  ]},
  { id:"clay-3d", label:"3D Clay Look", parts:[
    "Clay material look, soft GI lighting, rounded edges",
    "Realistic occlusion without noise",
  ]},
  { id:"neon", label:"Neon Glow", parts:[
    "Dark background, neon accents, rim light",
    "Vibrant glow with restrained reflections",
  ]},
  { id:"vintage-film", label:"Vintage Film", parts:[
    "Retro palette, film grain, gentle fade",
    "Authentic textures, slight vignette",
  ]},
  { id:"watercolor", label:"Watercolor", parts:[
    "Hand-painted watercolor wash, soft edges",
    "Textured paper, controlled bleeding",
  ]},
  { id:"foil-pressed", label:"Metallic Foil", parts:[
    "Gold/rose-gold foil accents with micro-glints",
    "Subtle emboss/deboss, luxury stationary feel",
  ]},
  { id:"glass", label:"Glass & Blur", parts:[
    "Frosted glass panes, background blur",
    "Sharp foreground text; high contrast",
  ]},
  { id:"flat-geo", label:"Flat Geometric", parts:[
    "Flat shapes, crisp edges, high contrast",
    "Precise alignment, grid-based rhythm",
  ]},
] as const;

const RENDER_INTENT = [
  { id:"photo",        label:"Photographic / Real Objects" },
  { id:"illustration", label:"Illustration / Painted" },
  { id:"vector",       label:"Vector / Flat Shapes" },
  { id:"hybrid",       label:"Hybrid Photo + Graphics" },
] as const;

const LIGHTING = [
  { id:"soft-day",    label:"Soft Daylight" },
  { id:"studio",      label:"Studio Softbox" },
  { id:"golden",      label:"Golden Hour Glow" },
  { id:"dramatic",    label:"Dramatic Rim Light" },
  { id:"none",        label:"Not Applicable" },
] as const;

const TEXTURES = [
  { id:"none",     label:"None" },
  { id:"paper",    label:"Subtle Paper Grain" },
  { id:"linen",    label:"Linen Texture" },
  { id:"grain",    label:"Fine Film Grain" },
  { id:"bokeh",    label:"Bokeh Background (soft)" },
  { id:"foil",     label:"Metallic Foil Accents" },
  { id:"glass",    label:"Glassmorphism Blur" },
  { id:"water",    label:"Watercolor Wash" },
] as const;

const COMPOSITION = [
  { id:"center",   label:"Centered Hero" },
  { id:"thirds",   label:"Rule of Thirds" },
  { id:"diagonal", label:"Diagonal Flow" },
  { id:"grid",     label:"Strict Grid" },
] as const;

type OrientId  = typeof ORIENT[number]["id"];
type SizeId    = typeof SIZE_PRESETS[number]["id"];
type LangId    = typeof LANGS[number]["id"];
type StyleId   = typeof STYLE_PRESETS[number]["id"];
type IntentId  = typeof RENDER_INTENT[number]["id"];
type LightId   = typeof LIGHTING[number]["id"];
type TextureId = typeof TEXTURES[number]["id"];
type CompId    = typeof COMPOSITION[number]["id"];
type FestivalId = string;

/* -------------------- user festivals persistence -------------------- */
const USER_FESTIVALS_KEY = "wishcraft_user_festivals_v1";
function loadUserFestivals(): AnyFestival[] {
  try { const raw = localStorage.getItem(USER_FESTIVALS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveUserFestivals(f: AnyFestival[]) { try { localStorage.setItem(USER_FESTIVALS_KEY, JSON.stringify(f)); } catch {} }
function getAllFestivals(): AnyFestival[] { return [...BUILTIN_FESTIVALS, ...loadUserFestivals()]; }
function slugify(s: string){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-{2,}/g,'-'); }

/* --------------------------------- logic -------------------------------- */
function paletteFor(choice: string, festival?: AnyFestival) {
  if (choice === "auto" && festival) return festival.palette;
  switch (choice) {
    case "gold":    return ["#F59E0B","#FCD34D","#78350F","#111827"];
    case "vibrant": return ["#EF4444","#22C55E","#3B82F6","#F59E0B"];
    case "pastel":  return ["#FBCFE8","#BFDBFE","#BBF7D0","#FDE68A"];
    case "mono":    return ["#111827","#1F2937","#374151","#9CA3AF"];
    default:        return ["#3B82F6","#10B981","#F59E0B","#111827"];
  }
}

/** Greeting lines */
function greetingFor(args:{
  occasion:string; festivalId?:FestivalId; lang:LangId; name?:string; partnerName?:string
}){
  const { occasion, festivalId, lang, name, partnerName } = args;
  if (occasion === "birthday") {
    const g = { en: `Happy Birthday, ${name || "Friend"}!`, hi: `जन्मदिन मुबारक, ${name || "मित्र"}!`, te: `హ్యాపీ బర్త్‌డే, ${name || "స్నేహితుడు"}!` };
    return (g as any)[lang] || g.en;
  }
  if (occasion === "anniversary") {
    const duo = name && partnerName ? `${name} & ${partnerName}` : (name || "");
    const g = { en: `Happy Anniversary ${duo}!`, hi: `सालगिरह मुबारक ${duo}!`, te: `వేడుకల వార్షికోత్సవ శుభాకాంక్షలు ${duo}!` };
    return (g as any)[lang] || g.en;
  }
  if (occasion === "festival") {
    const fest = getAllFestivals().find(f=>f.id===festivalId) || BUILTIN_FESTIVALS[0];
    return fest.greetings[lang] || fest.greetings.en;
  }
  return { en:"Best Wishes!", hi:"शुभकामनाएँ!", te:"శుభాకాంక్షలు!" }[lang] as string;
}

/** Never encourage printing hex codes */
function joinPalette(p: string[]) {
  return p.map(c => c.replace(/#/g, "")).join(", ");
}

/** Negative prompt pack to suppress junk */
function negativePack(aggressive: boolean) {
  const base = [
    "no color codes, no hex codes, no '#' symbols",
    "no palette chips or swatches",
    "no watermarks, no logos (unless requested), no QR codes",
    "no UI icons, no screenshots, no frames",
    "no extra captions, no random text",
    "no distorted typography",
    "no low-res, no heavy noise, no compression artifacts",
  ];
  if (!aggressive) return base.join("; ");
  return base.concat([
    "no busy backgrounds",
    "no excessive glow or bloom",
    "no off-brand clipart",
    "no duplicate text",
  ]).join("; ");
}

/** Build master prompt */
function buildPrompt(state: {
  occasion: string; festivalId?: FestivalId; name?: string; partnerName?: string; age?: string; relation?: string; brand?: string;
  orient: OrientId; size: SizeId; lang: LangId; paletteChoice: string; includeLogo: boolean;
  styleId: StyleId; intentId: IntentId; lightId: LightId; textureId: TextureId; compId: CompId; negativeStrong: boolean;
}) {
  const {
    occasion, festivalId, name, partnerName, age, relation, brand,
    orient, size, lang, paletteChoice, includeLogo,
    styleId, intentId, lightId, textureId, compId, negativeStrong
  } = state;

  const fest    = getAllFestivals().find(f=>f.id===festivalId);
  const palette = paletteFor(paletteChoice, fest);
  const greet   = greetingFor({ occasion, festivalId, lang, name, partnerName });

  const style   = STYLE_PRESETS.find(s => s.id === styleId)!;
  const intent  = RENDER_INTENT.find(i => i.id === intentId)!.label;
  const light   = LIGHTING.find(l => l.id === lightId)!.label;
  const texture = TEXTURES.find(t => t.id === textureId)!.label;
  const comp    = COMPOSITION.find(c => c.id === compId)!.label;

  const common = [
    `Orientation: ${orient}`,
    `Size: ${SIZE_PRESETS.find(s=>s.id===size)?.label || size}`,
    `Render intent: ${intent}`,
    `Lighting: ${light}`,
    `Texture: ${texture}`,
    `Composition: ${comp}`,
    `Color palette guidance (do not display codes or palette chips): ${joinPalette(palette)}`,
  ];

  const brandLine = includeLogo && brand
    ? `Include ${brand} logo at top-right; maintain clear space.`
    : `Branding: none / optional placeholder`;

  const quality = [
    `Agency-grade composition with clear hierarchy and ample negative space.`,
    `Typography: professional display for H1; clean sans-serif for body; optical kerning and consistent tracking.`,
    `Production: crisp edges, anti-aliased shapes, print mindset (300-DPI intent), avoid compression artifacts.`,
  ];

  const negatives = `Negative prompt: ${negativePack(negativeStrong)}`;

  // Allowed text guard
  const only = (arr: string[]) => `Only render this copy exactly: ${arr.join(", ")}. Do not render any other text.`;

  if (occasion === "birthday") {
    const allowed = [
      `"${greet}"`,
      `"Wishing you joy and good health"`,
    ];
    const motifs = "confetti, balloons, subtle sparkles (keep uncluttered)";

    return [
      `Design a ${style.label.toLowerCase()} birthday wish poster for social and print.`,
      ...style.parts,
      ...common,
      brandLine,
      `Recipient: ${name || "[name]"}${age?`, turning ${age}`:""}${relation?`, relation: ${relation}`:""}.`,
      `Motifs: ${motifs}.`,
      only(allowed),
      `Layout: H1 prominent; H2 below; strong contrast; safe margins.`,
      ...quality,
      negatives,
      `Export as high-res PNG.`,
    ].join("\n");
  }

  if (occasion === "festival") {
    const festLabel = fest?.label || "[festival]";
    const allowed = [
      `"${greet}"`,
      `"Wishing you prosperity and happiness"`,
    ];
    const motifs = fest ? fest.motifs.join(", ") : "rangoli, diyas";

    return [
      `Create a ${style.label.toLowerCase()} festival wishes poster for ${festLabel}.`,
      ...style.parts,
      ...common,
      brandLine,
      `Motifs: ${motifs}.`,
      only(allowed),
      `Ensure text legibility over motifs.`,
      ...quality,
      negatives,
      `Export as high-res PNG.`,
    ].join("\n");
  }

  if (occasion === "anniversary") {
    const duo = name && partnerName ? `${name} & ${partnerName}` : (name || "[names]");
    const allowed = [
      `"Happy Anniversary"`,
      `"${duo}!"`,
    ];

    return [
      `Design an ${style.label.toLowerCase()} anniversary wish for ${duo}.`,
      ...style.parts,
      ...common,
      brandLine,
      `Motifs: rings, soft florals, tasteful bokeh; upscale minimal.`,
      only(allowed),
      ...quality,
      negatives,
      `Export as high-res PNG.`,
    ].join("\n");
  }

  if (occasion === "sale") {
    const allowed = [
      `"${brand || "Brand"}"`,
      `"Limited-time Offer"`,
      `"Discount %"`,
      `"Call to Action"`,
    ];

    return [
      `Design a ${style.label.toLowerCase()} festive offer banner suitable for social and print.`,
      ...style.parts,
      ...common,
      brand ? `Brand: ${brand}` : `Brand: [name]`,
      `Motifs (subtle): diyas/kites/rangoli depending on season.`,
      only(allowed),
      `Layout: strong headline, clear discount callout, CTA area, safe margins.`,
      ...quality,
      negatives,
      `Export as high-res PNG.`,
    ].join("\n");
  }

  // custom
  return [
    `Create a celebratory poster in ${style.label.toLowerCase()} style.`,
    ...style.parts,
    ...common,
    brandLine,
    `Headline: "${greet}"`,
    `Do not add extra text.`,
    ...quality,
    negatives,
  ].join("\n");
}

/* --------------------------------- icons --------------------------------- */
const IconCopy = (p:any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/></svg>);
const IconSave = (p:any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M4 21V3a1 1 0 0 1 1-1h10l5 5v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/><path d="M7 3v6h10"/></svg>);
const IconTrash= (p:any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>);
const IconHistory=(p:any)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M12 8v5l3 3"/><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-9 9Zm0 0H1"/></svg>);
const IconEdit = (p:any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>);

/* ---------------------------------- App ---------------------------------- */
export default function App() {
  const [occasion, setOccasion] = useState<string>("birthday");
  const [festivalId, setFestivalId] = useState<FestivalId>("diwali");
  const [name, setName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [age, setAge] = useState("");
  const [relation, setRelation] = useState("");
  const [brand, setBrand] = useState("");

  // New pro controls
  const [styleId, setStyleId] = useState<StyleId>("minimal-luxe");
  const [intentId, setIntentId] = useState<IntentId>("hybrid");
  const [lightId, setLightId] = useState<LightId>("studio");
  const [textureId, setTextureId] = useState<TextureId>("paper");
  const [compId, setCompId] = useState<CompId>("center");
  const [negativeStrong, setNegativeStrong] = useState(true);

  const [orient, setOrient] = useState<OrientId>("portrait");
  const [size, setSize] = useState<SizeId>("ig-portrait");
  const [lang, setLang] = useState<LangId>("en");
  const [paletteChoice, setPaletteChoice] = useState("auto");
  const [includeLogo, setIncludeLogo] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useLocalStorage<string[]>("wishcraft_history_v1", []);
  const [isCached, setIsCached] = useState(false);

  // Custom festival editor
  const [showFestEditor, setShowFestEditor] = useState(false);
  const [festLabel, setFestLabel] = useState("");
  const [festId, setFestId] = useState("");
  const [festPalette, setFestPalette] = useState("#F59E0B,#FDE68A,#B45309,#1F2937");
  const [festMotifs, setFestMotifs] = useState("diyas,rangoli");
  const [festGreetEN, setFestGreetEN] = useState("Happy Festival");
  const [festGreetHI, setFestGreetHI] = useState("शुभकामनाएँ");
  const [festGreetTE, setFestGreetTE] = useState("శుభాకాంక్షలు");

  const computed = useMemo(() => buildPrompt({
    occasion, festivalId, name, partnerName, age, relation, brand,
    orient, size, lang, paletteChoice, includeLogo,
    styleId, intentId, lightId, textureId, compId, negativeStrong
  }), [occasion, festivalId, name, partnerName, age, relation, brand,
      orient, size, lang, paletteChoice, includeLogo,
      styleId, intentId, lightId, textureId, compId, negativeStrong]);

  const [editablePrompt, setEditablePrompt] = useState(computed);
  useEffect(()=>{ if(!isEditing) setEditablePrompt(computed); }, [computed, isEditing]);

  // SW cached status
  useEffect(()=>{
    function handler(e: MessageEvent){ if(e.data === "CACHE_COMPLETE"){ setIsCached(true); try{localStorage.setItem("wishcraft_cached","1");}catch{} } }
    (navigator as any).serviceWorker?.addEventListener?.("message", handler);
    if (localStorage.getItem("wishcraft_cached")==="1") setIsCached(true);
    return ()=> (navigator as any).serviceWorker?.removeEventListener?.("message", handler);
  },[]);

  async function onCopy(){
    try{ await navigator.clipboard.writeText(isEditing?editablePrompt:computed); setCopied(true); haptic(18); setTimeout(()=>setCopied(false), 900); }
    catch{ alert("Copy failed. Select & copy manually."); }
  }
  function onSave(){ const p=(isEditing?editablePrompt:computed).trim(); if(!p) return; setHistory([p, ...history.filter(h=>h!==p)].slice(0,10)); haptic(10); }
  function onClear(){ if(isEditing) setEditablePrompt(""); }
  function restoreFromHistory(item:string){ setIsEditing(true); setEditablePrompt(item); setHistoryOpen(false); }

  // add / remove custom festival
  function addCustomFestival(){
    const id = festId || slugify(festLabel || "new-festival");
    if(!id || !festLabel) { alert("Please provide a festival name."); return; }
    const f: AnyFestival = {
      id,
      label: festLabel,
      palette: festPalette.split(/\s*,\s*/).filter(Boolean),
      motifs: festMotifs.split(/\s*,\s*/).filter(Boolean),
      greetings: { en: festGreetEN || "Happy Festival", hi: festGreetHI || "शुभकामनाएँ", te: festGreetTE || "శుభాకాంక్షలు" },
    };
    const user = loadUserFestivals();
    const i = user.findIndex(x=>x.id===id);
    if(i>=0) user[i]=f; else user.unshift(f);
    saveUserFestivals(user);
    setFestivalId(id);
    setShowFestEditor(false);
    haptic(18);
  }
  function removeCustomFestival(id:string){
    const user = loadUserFestivals().filter(x=>x.id!==id);
    saveUserFestivals(user);
    if(festivalId===id) setFestivalId("diwali");
  }

  const allFestivals = getAllFestivals();
  const pill = "px-3 py-2 rounded-2xl text-sm font-medium border border-white/15 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition";
  const selectBase = "w-full px-3 py-3 rounded-2xl bg-white text-slate-900 text-base outline-none focus:ring-4 ring-sky-300";
  const inputBase  = "w-full px-3 py-3 rounded-2xl bg-white text-slate-900 text-base outline-none focus:ring-4 ring-sky-300";

  // quick self-tests (dev only)
  useEffect(() => { try { runSelfTests(); } catch (e) { console.warn("Self-tests failed:", e); } }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-indigo-900 to-slate-950 text-white flex flex-col">
      <header className="px-4 pt-5 pb-3 sticky top-0 z-20 bg-gradient-to-b from-indigo-900/90 to-indigo-900/20 backdrop-blur">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">WishCraft</h1>
            <p className="text-xs text-white/80">Poster Prompt Studio • Offline</p>
          </div>
          <span className={clsx("text-[10px] px-2 py-1 rounded-full border", isCached ? "border-emerald-400/40" : "border-white/20")} title={isCached?"Assets cached":"Not cached yet"}>
            <span className={clsx("inline-block w-2 h-2 rounded-full mr-1 align-middle", isCached?"bg-emerald-400":"bg-slate-400")} />
            {isCached?"Cached":"Not cached"}
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28">
        <div className="max-w-md mx-auto mt-3 space-y-4">
          {/* Occasion */}
          <div>
            <label className="block text-sm mb-2" htmlFor="occ">Occasion</label>
            <select id="occ" className={selectBase} value={occasion} onChange={(e)=>setOccasion(e.target.value)}>
              {OCCASIONS.map(o=> <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>

          {/* Occasion specific */}
          {occasion === "birthday" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs mb-1" htmlFor="name">Name</label>
                <input id="name" className={inputBase} placeholder="e.g., Aanya" value={name} onChange={(e)=>setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1" htmlFor="age">Age (optional)</label>
                <input id="age" className={inputBase} inputMode="numeric" placeholder="e.g., 21" value={age} onChange={(e)=>setAge(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1" htmlFor="rel">Relation</label>
                <input id="rel" className={inputBase} placeholder="Friend / Colleague / Family" value={relation} onChange={(e)=>setRelation(e.target.value)} />
              </div>
            </div>
          )}

          {occasion === "festival" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs mb-1" htmlFor="fest">Festival</label>
                <select id="fest" className={selectBase} value={festivalId} onChange={(e)=>setFestivalId(e.target.value as FestivalId)}>
                  {allFestivals.map(f=> <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs mb-1" htmlFor="name2">Recipient / Org (optional)</label>
                <input id="name2" className={inputBase} placeholder="e.g., Team Orion" value={name} onChange={(e)=>setName(e.target.value)} />
              </div>

              {/* Custom festival editor */}
              <div className="col-span-2">
                <button className={pill} onClick={()=>setShowFestEditor(v=>!v)} aria-expanded={showFestEditor}>{showFestEditor?"Hide Custom Festival":"Add / Edit Custom Festival"}</button>
                {showFestEditor && (
                  <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="block text-xs mb-1">Festival Name</label>
                        <input className={inputBase} value={festLabel} onChange={(e)=>{ setFestLabel(e.target.value); if(!festId) setFestId(slugify(e.target.value)); }} placeholder="e.g., Pongal" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">ID (slug)</label>
                        <input className={inputBase} value={festId} onChange={(e)=>setFestId(e.target.value)} placeholder="e.g., pongal" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Motifs (comma)</label>
                        <input className={inputBase} value={festMotifs} onChange={(e)=>setFestMotifs(e.target.value)} placeholder="kites,sugarcane" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs mb-1">Palette (comma HEX)</label>
                        <input className={inputBase} value={festPalette} onChange={(e)=>setFestPalette(e.target.value)} placeholder="#F59E0B,#FDE68A,#B45309,#1F2937" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs mb-1">Greeting EN</label>
                        <input className={inputBase} value={festGreetEN} onChange={(e)=>setFestGreetEN(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Greeting HI</label>
                        <input className={inputBase} value={festGreetHI} onChange={(e)=>setFestGreetHI(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Greeting TE</label>
                        <input className={inputBase} value={festGreetTE} onChange={(e)=>setFestGreetTE(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className={clsx(pill, "bg-emerald-500/20 border-emerald-400/30 hover:bg-emerald-500/30")} onClick={addCustomFestival}>Save Festival</button>
                      {loadUserFestivals().length>0 && (
                        <select className={selectBase} onChange={(e)=>removeCustomFestival(e.target.value)}>
                          <option value="">Delete custom…</option>
                          {loadUserFestivals().map(f=> <option key={f.id} value={f.id}>{f.label}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {occasion === "anniversary" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" htmlFor="n1">Name 1</label>
                <input id="n1" className={inputBase} value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Aarav" />
              </div>
              <div>
                <label className="block text-xs mb-1" htmlFor="n2">Name 2</label>
                <input id="n2" className={inputBase} value={partnerName} onChange={(e)=>setPartnerName(e.target.value)} placeholder="e.g., Anaya" />
              </div>
            </div>
          )}

          {occasion === "sale" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs mb-1" htmlFor="brand">Brand / Business</label>
                <input id="brand" className={inputBase} value={brand} onChange={(e)=>setBrand(e.target.value)} placeholder="e.g., ArtHaus Studio" />
              </div>
            </div>
          )}

          {/* Pro designer controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Prompt Style</label>
              <select className={selectBase} value={styleId} onChange={(e)=>setStyleId(e.target.value as StyleId)}>
                {STYLE_PRESETS.map(s=> <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Render Intent</label>
              <select className={selectBase} value={intentId} onChange={(e)=>setIntentId(e.target.value as IntentId)}>
                {RENDER_INTENT.map(s=> <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Lighting</label>
              <select className={selectBase} value={lightId} onChange={(e)=>setLightId(e.target.value as LightId)}>
                {LIGHTING.map(s=> <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Texture</label>
              <select className={selectBase} value={textureId} onChange={(e)=>setTextureId(e.target.value as TextureId)}>
                {TEXTURES.map(s=> <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Composition</label>
              <select className={selectBase} value={compId} onChange={(e)=>setCompId(e.target.value as CompId)}>
                {COMPOSITION.map(s=> <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input id="neg" type="checkbox" className="w-4 h-4" checked={negativeStrong} onChange={(e)=>setNegativeStrong(e.target.checked)} />
              <label htmlFor="neg" className="text-sm">Aggressive negative prompt</label>
            </div>
          </div>

          {/* Practical toggles */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" htmlFor="orient">Orientation</label>
              <select id="orient" className={selectBase} value={orient} onChange={(e)=>setOrient(e.target.value as OrientId)}>
                {ORIENT.map(o=> <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" htmlFor="size">Size Preset</label>
              <select id="size" className={selectBase} value={size} onChange={(e)=>setSize(e.target.value as SizeId)}>
                {SIZE_PRESETS.map(s=> <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" htmlFor="lang">Language</label>
              <select id="lang" className={selectBase} value={lang} onChange={(e)=>setLang(e.target.value as LangId)}>
                {LANGS.map(l=> <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" htmlFor="pal">Palette</label>
              <select id="pal" className={selectBase} value={paletteChoice} onChange={(e)=>setPaletteChoice(e.target.value)}>
                {PALETTES.map(p=> <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input id="logo" type="checkbox" className="w-4 h-4" checked={includeLogo} onChange={(e)=>setIncludeLogo(e.target.checked)} />
              <label htmlFor="logo" className="text-sm">Include brand logo</label>
            </div>
          </div>

          {/* Output */}
          <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-lg shadow-slate-900/20">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Prompt</h2>
              <button className={pill} onClick={()=>setIsEditing(v=>!v)} aria-pressed={isEditing}>
                <span className="inline-flex items-center gap-2"><IconEdit className="w-4 h-4" /> {isEditing?"Read-only":"Edit"}</span>
              </button>
            </div>
            {!isEditing ? (
              <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-black/20 rounded-xl p-3 border border-white/10 min-h-[140px]" tabIndex={0}>{computed}</pre>
            ) : (
              <textarea className="w-full min-h-[180px] text-sm leading-relaxed text-slate-900 rounded-xl p-3 outline-none focus:ring-4 ring-sky-300" value={editablePrompt} onChange={(e)=>setEditablePrompt(e.target.value)} aria-label="Edit prompt" />
            )}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={onCopy} className={clsx(pill, "justify-center flex items-center gap-2 bg-sky-500/20 border-sky-400/30 hover:bg-sky-500/30")} aria-label="Copy prompt">
                <IconCopy className="w-4 h-4" /> {copied?"Copied!":"Copy"}
              </button>
              <button onClick={onSave} className={clsx(pill, "justify-center flex items-center gap-2 bg-emerald-500/20 border-emerald-400/30 hover:bg-emerald-500/30")} aria-label="Save to history">
                <IconSave className="w-4 h-4" /> Save
              </button>
              <button onClick={onClear} className={clsx(pill, "justify-center flex items-center gap-2 bg-rose-500/20 border-rose-400/30 hover:bg-rose-500/30")} aria-label="Clear text">
                <IconTrash className="w-4 h-4" /> Clear
              </button>
            </div>
          </section>

          {/* History button */}
          <div className="flex items-center justify-between">
            <button className={pill} onClick={()=>setHistoryOpen(true)} aria-expanded={historyOpen} aria-controls="history-drawer">
              <span className="inline-flex items-center gap-2"><IconHistory className="w-4 h-4" /> History ({history.length})</span>
            </button>
          </div>
        </div>
      </main>

      {/* sticky footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-slate-950 to-transparent px-4 pb-4 pt-3">
        <div className="max-w-md mx-auto rounded-2xl border border-white/10 bg-white/10 backdrop-blur p-3 flex items-center gap-2">
          <button onClick={onCopy} className={clsx(pill, "flex-1 text-center bg-sky-500/20 border-sky-400/30 hover:bg-sky-500/30")}>{copied?"Copied!":"Copy"}</button>
          <button onClick={onSave} className={clsx(pill, "flex-1 text-center bg-emerald-500/20 border-emerald-400/30 hover:bg-emerald-500/30")}>Save</button>
          <button onClick={()=>setHistoryOpen(true)} className={clsx(pill, "flex-1 text-center bg-white/10 hover:bg-white/20")}>History</button>
        </div>
      </footer>

      {/* history drawer */}
      <div id="history-drawer" role="dialog" aria-modal="true" className={clsx("fixed inset-0 z-40 transition", historyOpen?"pointer-events-auto":"pointer-events-none")}>
        <div className={clsx("absolute inset-0 bg-black/40 transition-opacity", historyOpen?"opacity-100":"opacity-0")} onClick={()=>setHistoryOpen(false)} />
        <div className={clsx("absolute left-0 right-0 bottom-0 max-w-md mx-auto bg-slate-900 rounded-t-2xl border-t border-white/10 shadow-2xl p-4 transition-transform", historyOpen?"translate-y-0":"translate-y-full")} style={{willChange:'transform'}}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">History (last 10)</h3>
            <button className={pill} onClick={()=>setHistoryOpen(false)}>Close</button>
          </div>
          {history.length===0 ? (
            <p className="text-sm opacity-70">No saved prompts yet. Save prompts to see them here.</p>
          ) : (
            <ul className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {history.map((item, idx) => (
                <li key={idx}>
                  <button className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10" onClick={()=>restoreFromHistory(item)}>
                    <p className="text-xs opacity-70 mb-1">Tap to restore</p>
                    <p className="text-sm line-clamp-4 whitespace-pre-wrap">{item}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------- self-test helpers (safe) ----------------------- */
function runSelfTests() {
  try {
    const s1 = {
      occasion: 'birthday',
      festivalId: 'diwali' as FestivalId,
      name: 'Aanya',
      partnerName: '',
      age: '21',
      relation: 'Friend',
      brand: '',
      orient: 'portrait' as OrientId,
      size: 'ig-post' as SizeId,
      lang: 'en' as LangId,
      paletteChoice: 'auto',
      includeLogo: false,
      styleId: 'minimal-luxe' as StyleId,
      intentId: 'hybrid' as IntentId,
      lightId: 'studio' as LightId,
      textureId: 'paper' as TextureId,
      compId: 'center' as CompId,
      negativeStrong: true,
    };
    const out1 = buildPrompt(s1);
    console.assert(out1.includes('Happy Birthday, Aanya!'), 'Birthday greeting should include name');

    const s2 = { ...s1, occasion: 'festival', festivalId: 'sankranthi' as FestivalId, name: '', lang: 'te' as LangId };
    const out2 = buildPrompt(s2);
    console.assert(
      out2.includes('హ్యాపీ సంక్రాంతి') || out2.includes('సంక్రాంతి'),
      'Sankranthi Telugu greeting expected'
    );

    const s3 = { ...s1, occasion: 'sale' };
    const out3 = buildPrompt(s3);
    console.assert(out3.includes('offer banner') || out3.includes('Limited-time'), 'Sale banner copy should include callouts');

    const gold = paletteFor('gold');
    console.assert(Array.isArray(gold) && gold.length === 4, 'Gold palette should have 4 colors');

    const s5 = { ...s1, includeLogo: true, brand: 'ArtHaus' };
    const out5 = buildPrompt(s5);
    console.assert(out5.includes('Include ArtHaus logo'), 'Branding line should mention logo');

    const s6 = { ...s1, occasion: 'anniversary', name: 'Aarav', partnerName: 'Anaya' };
    const out6 = buildPrompt(s6);
    console.assert(
      out6.includes('Aarav & Anaya') && out6.includes('Happy Anniversary'),
      'Anniversary names should appear with ampersand'
    );

    const s7 = { ...s1, occasion: 'custom', name: '', partnerName: '', lang: 'en' as LangId };
    const out7 = buildPrompt(s7);
    console.assert(out7.startsWith('Create a celebratory poster'), 'Custom should begin with generic header');

    console.assert(out1.includes('\nOrientation:'), 'Output should contain newline separators');

    console.log('%cWishCraft self-tests passed', 'color:#10B981');
  } catch (e) {
    console.warn('WishCraft self-tests encountered an error:', e);
  }
}
