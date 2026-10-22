#!/usr/bin/env node
/**
 * Seed the LOCAL database with an invented demo wardrobe: `pnpm db:seed-demo`.
 *
 * For local demos only, alongside DEMO_MODE=1 (see src/lib/demo.ts). Every
 * brand, piece, look and trip below is made up; no real person, shop or
 * wardrobe is described.
 *
 * Safety guards, all of which must pass before anything is written:
 *
 *   1. DEMO_MODE=1 must be set (in the shell or .env.local).
 *   2. DATABASE_URL must point at host localhost or 127.0.0.1 ...
 *   3. ... and at a database named exactly `sil` (the docker-compose one).
 *   4. The catalogue must be empty, unless `--reset` is passed, in which case
 *      every catalogue table is cleared first (and the local photo files the
 *      cleared rows referenced are deleted).
 *
 * Plain Node ESM on purpose: the repo has no TypeScript script runner, and the
 * `postgres` driver and `sharp` are already dependencies. Photos follow the
 * app's local storage convention (src/lib/storage.ts): a `<uuid>.<ext>` file in
 * public/uploads, registered with url `/uploads/<file>` and path
 * `uploads/<file>`. They are AVIF, as offline/bulk work in this app is (see
 * docs/ARCHITECTURE.md §5).
 */

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import postgres from "postgres";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UPLOAD_SUBDIR = "uploads";
const UPLOAD_DIR = path.join(ROOT, "public", UPLOAD_SUBDIR);

// Load .env.local the way Next.js and drizzle.config.ts do. Values already in
// the environment win, so `DEMO_MODE=1 pnpm db:seed-demo` works either way.
config({ path: path.join(ROOT, ".env.local"), quiet: true });

const RESET = process.argv.includes("--reset");

function refuse(message) {
  console.error(`seed-demo: refusing to run. ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

if (process.env.DEMO_MODE?.trim() !== "1") {
  refuse("DEMO_MODE=1 is not set. This script only seeds a local demo database.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) refuse("DATABASE_URL is not set.");

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  refuse("DATABASE_URL is not a valid URL.");
}
const host = parsed.hostname;
const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
if (!["localhost", "127.0.0.1"].includes(host)) {
  refuse(`the database host is "${host}"; only localhost or 127.0.0.1 is allowed.`);
}
if (dbName !== "sil") {
  refuse(`the database name is "${dbName}"; only the local "sil" database is allowed.`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic PRNG (mulberry32), so every run seeds the same wardrobe. */
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = prng(20261022);
const pick = (list) => list[Math.floor(rand() * list.length)];

const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const TODAY = iso(today);
function daysAgo(n) {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - n);
  return iso(d);
}
function addDays(isoDate, n) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}
const eur = (euros) => Math.round(euros * 100);

/** Mix a hex colour with white; `t` = share of white (0..1). */
function tint(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (255 - c) * t));
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
/** Darken a hex colour; `t` = share of black (0..1). */
function shade(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c * (1 - t)));
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
const escapeXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Simple silhouettes on an 800 x 1000 canvas, centred around x = 400.
const SHAPES = {
  dress:
    "M330 180 L360 160 Q400 190 440 160 L470 180 L465 330 L560 760 Q400 800 240 760 L335 330 Z",
  top: "M300 230 L360 200 Q400 235 440 200 L500 230 L590 330 L545 375 L495 330 L495 600 L305 600 L305 330 L255 375 L210 330 Z",
  knit: "M300 230 L360 205 Q400 240 440 205 L500 230 L575 600 L530 615 L495 360 L495 620 L305 620 L305 360 L270 615 L225 600 Z",
  blazer:
    "M295 220 L370 195 L400 330 L430 195 L505 220 L585 640 L535 650 L500 400 L500 680 L300 680 L300 400 L265 650 L215 640 Z",
  coat: "M290 200 L370 175 L400 300 L430 175 L510 200 L590 740 L540 750 L505 420 L515 800 L285 800 L295 420 L260 750 L210 740 Z",
  trousers: "M300 200 L500 200 L520 800 L430 800 L400 360 L370 800 L280 800 Z",
  shorts: "M300 300 L500 300 L525 560 L425 560 L400 420 L375 560 L275 560 Z",
  skirt: "M320 250 L480 250 L560 700 Q400 740 240 700 Z",
  shoe: "M220 560 L300 470 Q340 450 360 500 Q420 560 560 580 Q600 590 600 640 L220 640 Z",
  bag: "M250 420 L550 420 L590 760 L210 760 Z M320 420 Q320 270 400 270 Q480 270 480 420 L455 420 Q455 300 400 300 Q345 300 345 420 Z",
  scarf: "M260 260 L540 260 L540 360 L470 360 L500 760 L420 760 L400 380 L380 760 L300 760 L330 360 L260 360 Z",
  jewel:
    "M400 300 m-150 0 a150 150 0 1 0 300 0 a150 150 0 1 0 -300 0 Z M400 300 m-120 0 a120 120 0 1 1 240 0 a120 120 0 1 1 -240 0 Z M400 470 m-45 0 a45 45 0 1 0 90 0 a45 45 0 1 0 -90 0 Z",
};
const SHAPE_FOR = {
  dresses: "dress",
  "shirt-dresses": "dress",
  "slip-dresses": "dress",
  tops: "top",
  shirts: "top",
  "t-shirts": "top",
  vests: "top",
  boleros: "top",
  blazers: "blazer",
  knitwear: "knit",
  trousers: "trousers",
  jeans: "trousers",
  culottes: "trousers",
  shorts: "shorts",
  skirts: "skirt",
  outerwear: "coat",
  "underwear-and-pyjamas": "top",
  activewear: "trousers",
  shoes: "shoe",
  bags: "bag",
  accessories: "scarf",
  jewellery: "jewel",
  earrings: "jewel",
  necklaces: "jewel",
};
const CATEGORY_LABEL = {
  dresses: "Dresses",
  "shirt-dresses": "Shirt Dresses",
  "slip-dresses": "Slip Dresses",
  shirts: "Shirts",
  "t-shirts": "T-Shirts",
  vests: "Vests",
  boleros: "Boleros",
  blazers: "Blazers",
  knitwear: "Knitwear",
  trousers: "Trousers",
  jeans: "Jeans",
  culottes: "Culottes",
  shorts: "Shorts",
  skirts: "Skirts",
  outerwear: "Outerwear",
  "underwear-and-pyjamas": "Underwear and Pyjamas",
  activewear: "Activewear",
  shoes: "Shoes",
  bags: "Bags",
  accessories: "Accessories",
  earrings: "Earrings",
  necklaces: "Necklaces",
};

/** A placeholder photo: a soft tint of the piece's colour, a silhouette, and
 *  the category and brand as a caption. Returns AVIF bytes. */
async function placeholderPhoto(piece) {
  const fill = piece.hex;
  const bg = tint(fill, 0.82);
  const stroke = shade(fill, 0.35);
  const shape = SHAPES[SHAPE_FOR[piece.category] ?? "top"];
  const label = escapeXml(CATEGORY_LABEL[piece.category] ?? piece.category);
  const brand = escapeXml(piece.brand.toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <rect width="800" height="1000" fill="${bg}"/>
  <path d="${shape}" fill="${fill}" fill-rule="evenodd" stroke="${stroke}" stroke-width="6" stroke-linejoin="round"/>
  <text x="400" y="890" text-anchor="middle" font-family="serif" font-size="46" fill="${shade(fill, 0.55)}">${label}</text>
  <text x="400" y="945" text-anchor="middle" font-family="sans-serif" font-size="26" letter-spacing="3" fill="${shade(fill, 0.45)}">${brand}</text>
</svg>`;
  return sharp(Buffer.from(svg)).avif({ quality: 60 }).toBuffer();
}

// ---------------------------------------------------------------------------
// The invented wardrobe
// ---------------------------------------------------------------------------

const AN = "Atelier Nord";
const MV = "Maison Verre";
const LC = "Linden & Co";
const SK = "Studio Kaze";

/**
 * Each piece: `key` is a local handle for looks and trips; `hex` only drives
 * the placeholder photo. Prices are what was paid, in EUR.
 */
const PIECES = [
  // Dresses
  { key: "linen-shift", name: "Linen shift dress", category: "dresses", brand: LC, color: "sage", hex: "#8fa58a", size: "M", material: "100% linen", description: "A relaxed **shift** in washed linen with a round neck and side pockets. Unlined, so it breathes on the hottest days.", care: "Machine wash 30°C, gentle cycle.", tags: ["casual", "summer", "breathable", "lightweight", "round", "sleeveless", "shift", "relaxed", "midi"], list: 129, paid: 99, bought: "2024-05-18", berth: "R1-W1R1-H1", priorWears: 6 },
  { key: "slip-dress", name: "Bias-cut slip dress", category: "slip-dresses", secondary: ["dresses"], brand: MV, color: "ivory", hex: "#e9e1cf", size: "S", material: "100% silk", description: "Cut on the bias from a heavy silk satin, with fine adjustable straps and a column line to the ankle.", care: "Dry clean only.", tags: ["occasion", "occasion-only", "summer", "delicate", "dry-clean", "v-neck", "sleeveless", "column", "maxi"], list: 340, paid: 255, bought: "2023-06-02", berth: "R1-W2R3-D1-L-BB", priorWears: 2, notes: "Wear with a strapless bra; it shows everything else." },
  { key: "shirt-dress", name: "Striped poplin shirt dress", category: "shirt-dresses", secondary: ["dresses"], brand: AN, color: "navy / white stripe", hex: "#3d4f7a", size: "M", material: "100% cotton", description: "Crisp cotton poplin in a fine stripe, with a point collar, a self-tie belt and an easy A-line skirt.", care: "Machine wash 40°C.", tags: ["office", "casual", "spring", "summer", "easy-care", "collared", "long", "a-line", "midi"], list: 159, paid: 159, bought: "2025-04-11", berth: "R1-W1R1-H1", priorWears: 0 },
  { key: "wrap-dress", name: "Jersey wrap dress", category: "dresses", brand: SK, color: "burgundy", hex: "#7a2a3a", size: "M", material: "95% viscose, 5% elastane", description: "A true wrap dress in a fluid viscose jersey, with long sleeves and a knee-length skirt that moves well.", care: "Machine wash 30°C, do not tumble dry.", tags: ["office", "autumn", "winter", "easy-care", "v-neck", "long", "wrap", "regular", "knee"], list: 119, paid: 89, bought: "2024-10-03", berth: "R1-W1R1-H1", priorWears: null },

  // Tops
  { key: "oxford", name: "Oxford shirt", category: "shirts", secondary: ["tops"], brand: AN, color: "white", hex: "#f2f1ec", size: "M", material: "100% cotton", description: "A classic button-down in a soft Oxford weave, slightly relaxed through the body.", care: "Machine wash 40°C.", tags: ["office", "casual", "spring", "autumn", "easy-care", "collared", "long", "regular"], list: 89, paid: 89, bought: "2023-09-14", berth: "R1-W1R2-H1", priorWears: 25 },
  { key: "silk-blouse", name: "Silk crêpe blouse", category: "shirts", secondary: ["tops"], brand: MV, color: "cream", hex: "#efe6d2", size: "S", material: "100% silk", description: "Silk crêpe de chine with a round neck, a keyhole at the back and softly gathered cuffs.", care: "Hand wash cold or dry clean.", tags: ["office", "occasion", "spring", "autumn", "hand-wash", "delicate", "round", "long", "relaxed"], list: 210, paid: 168, bought: "2024-02-22", berth: "R1-W1R2-H1", priorWears: 4 },
  { key: "tee-black", name: "Organic cotton T-shirt", category: "t-shirts", secondary: ["tops"], brand: LC, color: "black", hex: "#2a2a2a", size: "M", material: "100% cotton", description: "A mid-weight single jersey tee in organic cotton, with a narrow ribbed neckband.", care: "Machine wash 40°C.", tags: ["casual", "spring", "summer", "autumn", "easy-care", "round", "short", "regular"], list: 35, paid: 35, bought: "2025-03-08", berth: "R1-W7R2-S6-L", priorWears: 10 },
  { key: "rib-tee", name: "Boxy rib tee", category: "t-shirts", secondary: ["tops"], brand: SK, color: "grey marl", hex: "#9a9a9a", size: "M", material: "92% cotton, 8% elastane", description: "A short, boxy tee knitted in a wide rib.", care: "Machine wash 30°C.", tags: ["casual", "summer", "easy-care", "round", "short", "boxy", "cropped"], list: 45, paid: 29, bought: "2023-07-20", berth: null, priorWears: 30, archived: { at: "2026-06-30", reason: "worn-out", note: "The neckband went wavy after three summers." } },
  { key: "rib-tank", name: "Ribbed tank", category: "vests", secondary: ["tops"], brand: LC, color: "ivory", hex: "#ece5d4", size: "S", material: "95% modal, 5% elastane", description: "A fine ribbed tank in soft modal, close-fitting and long enough to tuck.", care: "Machine wash 30°C.", tags: ["casual", "loungewear", "summer", "easy-care", "round", "sleeveless", "slim"], list: 29, paid: 29, bought: "2025-06-01", berth: "R1-W7R2-S6", priorWears: null },
  { key: "lace-bolero", name: "Cropped lace bolero", category: "boleros", secondary: ["tops"], brand: MV, color: "black", hex: "#262626", size: "S", material: "100% polyamide", description: "A short lace bolero with long sleeves and a scalloped edge, finished with a single hook at the neck.", care: "Hand wash cold.", tags: ["occasion", "spring", "summer", "delicate", "hand-wash", "round", "long", "cropped"], list: 95, paid: 95, bought: "2025-08-16", berth: "R1-W2R3-D1-L-BB", priorWears: 1 },

  // Blazers
  { key: "wool-blazer", name: "Single-breasted wool blazer", category: "blazers", brand: AN, color: "charcoal", hex: "#4a4a4f", size: "38", material: "Outer: 100% wool. Lining: 100% cupro.", description: "A softly structured single-breasted blazer in a fine wool twill, lined in cupro, with notch lapels and flap pockets.", care: "Dry clean only.", tags: ["office", "autumn", "winter", "spring", "dry-clean", "long", "regular"], list: 420, paid: 336, bought: "2023-10-07", berth: "R1-W1R2-H1", priorWears: 40, details: [{ label: "Fit", value: "Regular, hip length" }, { label: "Lining", value: "Fully lined" }] },
  { key: "linen-blazer", name: "Linen-blend blazer", category: "blazers", brand: SK, color: "sand", hex: "#cdb991", size: "38", material: "55% linen, 45% cotton", description: "An unlined summer blazer in a linen and cotton blend, part of a suit with the matching trousers.", care: "Dry clean recommended.", tags: ["office", "occasion", "summer", "breathable", "lightweight", "long", "relaxed"], list: 260, paid: 195, bought: "2025-05-23", berth: "R1-W1R2-H1", priorWears: 0 },

  // Knitwear
  { key: "cashmere-crew", name: "Cashmere crew-neck jumper", category: "knitwear", secondary: ["jumpers"], brand: AN, color: "oat", hex: "#cbbba0", size: "M", material: "100% cashmere", description: "A two-ply cashmere jumper, fully fashioned, with ribbed cuffs and hem.", care: "Hand wash cold, dry flat.", tags: ["casual", "office", "autumn", "winter", "warm", "cozy", "hand-wash", "round", "long", "regular"], list: 280, paid: 224, bought: "2023-11-25", berth: "R1-W7R2-S4-L", priorWears: 35 },
  { key: "merino-cardigan", name: "Merino cardigan", category: "knitwear", secondary: ["cardigans"], brand: LC, color: "navy", hex: "#2f3b5c", size: "M", material: "100% wool", description: "Extra-fine merino wool in a fine gauge, with a V-neck and horn-effect buttons.", care: "Machine wash 30°C, wool cycle.", tags: ["office", "casual", "spring", "autumn", "warm", "lightweight", "v-neck", "long", "regular"], list: 120, paid: 120, bought: "2024-09-12", berth: "R1-W7R2-S4-L", priorWears: 12 },
  { key: "boucle-jumper", name: "Bouclé jumper", category: "knitwear", secondary: ["jumpers"], brand: MV, color: "lilac", hex: "#b6a3c9", size: "M", material: "45% wool, 30% polyamide, 25% acrylic", description: "A cropped, boxy jumper in a soft bouclé yarn.", care: "Hand wash cold.", tags: ["casual", "winter", "warm", "cozy", "hand-wash", "round", "long", "boxy", "cropped"], list: 150, paid: 90, bought: "2023-12-02", berth: null, priorWears: 8, archived: { at: "2026-02-14", reason: "gifted", note: "Went to a friend who loved the colour more than I did." } },

  // Trousers
  { key: "jeans", name: "Straight-leg jeans", category: "jeans", secondary: ["trousers"], brand: SK, color: "indigo", hex: "#33456e", size: "28", material: "99% cotton, 1% elastane", description: "Mid-rise straight-leg jeans in a rigid indigo denim that softens with wear.", care: "Machine wash 30°C inside out.", tags: ["casual", "spring", "autumn", "winter", "easy-care", "regular"], list: 140, paid: 140, bought: "2024-03-16", berth: "R1-W7R2-S6", priorWears: 50 },
  { key: "wool-trousers", name: "Wide-leg wool trousers", category: "trousers", brand: AN, color: "black", hex: "#25252a", size: "38", material: "100% wool", description: "High-waisted wide-leg trousers in a wool crêpe, with front pleats and a long hem for heels.", care: "Dry clean only.", tags: ["office", "occasion", "autumn", "winter", "spring", "dry-clean", "relaxed", "maxi"], list: 230, paid: 230, bought: "2024-11-02", berth: "R1-W1R2-H1", priorWears: 15 },
  { key: "linen-trousers", name: "Linen-blend suit trousers", category: "trousers", brand: SK, color: "sand", hex: "#cdb991", size: "38", material: "55% linen, 45% cotton", description: "Straight, high-waisted trousers in the same linen and cotton blend as the blazer.", care: "Dry clean recommended.", tags: ["office", "occasion", "summer", "breathable", "lightweight", "regular"], list: 160, paid: 120, bought: "2025-05-23", berth: "R1-W1R2-H1", priorWears: 0 },
  { key: "linen-culottes", name: "Linen culottes", category: "culottes", secondary: ["trousers", "skirts"], brand: LC, color: "ecru", hex: "#d9cfb8", size: "M", material: "100% linen", description: "Wide culottes in a mid-weight linen, cropped above the ankle, with an elasticated back waist.", care: "Machine wash 30°C.", tags: ["casual", "summer", "breathable", "easy-care", "relaxed", "cropped"], list: 99, paid: 79, bought: "2024-06-08", berth: "R1-W7R2-S6", priorWears: 7 },
  { key: "chambray-shorts", name: "Chambray shorts", category: "shorts", secondary: ["trousers"], brand: SK, color: "light blue", hex: "#8fa9c9", size: "M", material: "100% cotton", description: "Pleated shorts in a light cotton chambray.", care: "Machine wash 40°C.", tags: ["casual", "summer", "easy-care", "relaxed", "mini"], list: 69, paid: 49, bought: "2023-06-10", berth: null, priorWears: 12, archived: { at: "2025-09-20", reason: "sold", note: "Sold online; they never fitted after the first wash." } },
  { key: "cord-trousers", name: "Needlecord trousers", category: "trousers", brand: LC, color: "rust", hex: "#a5532e", size: "38", material: "98% cotton, 2% elastane", description: "Slim, ankle-length trousers in a fine needlecord with a little stretch.", care: "Machine wash 30°C inside out.", tags: ["casual", "autumn", "winter", "warm", "easy-care", "slim"], list: 110, paid: 88, bought: "2025-10-04", berth: "R1-W7R2-S6", priorWears: null },

  // Skirts
  { key: "satin-skirt", name: "Satin midi skirt", category: "skirts", brand: MV, color: "emerald", hex: "#2f7a5a", size: "S", material: "100% polyester", description: "A bias-cut satin skirt with an A-line swing and a concealed side zip.", care: "Hand wash cold.", tags: ["occasion", "office", "autumn", "spring", "hand-wash", "a-line", "midi"], list: 135, paid: 108, bought: "2024-12-07", berth: "R1-W1R1-H1", priorWears: 3 },
  { key: "pleated-skirt", name: "Pleated wool skirt", category: "skirts", brand: AN, color: "navy check", hex: "#3a4566", size: "38", material: "70% wool, 30% polyester", description: "A knife-pleated skirt in a small check, falling just below the knee.", care: "Dry clean only.", tags: ["office", "autumn", "winter", "dry-clean", "a-line", "knee"], list: 190, paid: 190, bought: "2026-01-17", berth: "R1-W1R1-H1", priorWears: 0 },

  // Outerwear
  { key: "wool-coat", name: "Double-faced wool coat", category: "outerwear", brand: AN, color: "camel", hex: "#b48a5a", size: "38", material: "90% wool, 10% cashmere", description: "An unlined double-faced coat with hand-finished seams, dropped shoulders and a long, straight line.", care: "Dry clean only.", tags: ["office", "casual", "winter", "autumn", "warm", "heavyweight", "dry-clean", "long", "oversized"], list: 590, paid: 472, bought: "2023-11-04", berth: "R0-C1-H1", priorWears: 60 },
  { key: "trench", name: "Cotton trench coat", category: "outerwear", brand: SK, color: "stone", hex: "#bfb39c", size: "M", material: "100% cotton", description: "A double-breasted trench in a water-repellent cotton gabardine, with a storm flap and a belted waist.", care: "Dry clean only.", tags: ["office", "casual", "spring", "autumn", "dry-clean", "collared", "long", "regular"], list: 320, paid: 320, bought: "2024-04-06", berth: "R0-C1-H1", priorWears: 20 },
  { key: "liner-jacket", name: "Quilted liner jacket", category: "outerwear", brand: LC, color: "olive", hex: "#6b7048", size: "M", material: "Shell: 100% polyamide. Padding: 100% polyester.", description: "A light quilted jacket with a round neck and snap fastening, to wear alone or under a coat.", care: "Machine wash 30°C.", tags: ["casual", "spring", "autumn", "lightweight", "easy-care", "round", "long", "regular"], list: 99, paid: 69, bought: "2026-03-01", berth: "R0-C1-H1", priorWears: null },

  // Shoes, bags, accessories, jewellery
  { key: "loafers", name: "Leather loafers", category: "shoes", brand: MV, color: "black", hex: "#222222", size: "38", material: "Upper: leather. Sole: rubber.", description: "Penny loafers in polished calf leather on a light rubber sole.", care: "Polish regularly.", tags: ["office", "casual", "spring", "autumn", "winter"], list: 260, paid: 208, bought: "2023-09-30", berth: "R0-C1-S1-F", priorWears: 80, fullCover: true },
  { key: "trainers", name: "White leather trainers", category: "shoes", brand: SK, color: "white", hex: "#efefea", size: "38", material: "Upper: leather. Lining: textile. Sole: rubber.", description: "Minimal low-top trainers in smooth leather.", care: "Wipe clean.", tags: ["casual", "sport", "spring", "summer", "autumn", "easy-care"], list: 150, paid: 150, bought: "2024-04-20", berth: "R0-C1-S1-B", priorWears: 90, fullCover: true },
  { key: "tote", name: "Leather tote", category: "bags", brand: AN, color: "tan", hex: "#a8764a", size: null, material: "Leather", description: "An unlined, structured tote in vegetable-tanned leather, large enough for a laptop.", care: "Condition twice a year.", tags: ["office", "casual"], list: 380, paid: 380, bought: "2024-01-13", berth: "R1-W7R2-S4", priorWears: 100, fullCover: true },
  { key: "silk-scarf", name: "Printed silk scarf", category: "accessories", brand: LC, color: "blue / rust print", hex: "#5a76a3", size: null, material: "100% silk", description: "A large square scarf in silk twill with hand-rolled edges and an abstract tile print.", care: "Dry clean only.", tags: ["casual", "office", "spring", "autumn", "delicate", "dry-clean"], list: 140, paid: 140, bought: "2025-09-27", berth: "R1-C1-D1-LF", priorWears: 3 },
  { key: "hoops", name: "Gold hoop earrings", category: "earrings", secondary: ["jewellery"], brand: MV, color: "gold", hex: "#c9a24a", size: null, material: "Gold-plated brass", description: "Medium hoops with a hinged clasp.", care: "Keep dry.", tags: ["office", "casual", "occasion"], list: 75, paid: 75, bought: "2025-02-15", berth: "R1-C1-D1-LF", priorWears: null, fullCover: true },
  { key: "pendant", name: "Pearl pendant necklace", category: "necklaces", secondary: ["jewellery"], brand: MV, color: "silver", hex: "#b8b8bd", size: null, material: "Sterling silver, freshwater pearl", description: "A single freshwater pearl on a fine sterling silver chain.", care: "Keep dry.", tags: ["office", "occasion"], list: 95, paid: 95, bought: "2026-04-04", berth: "R1-C1-D1-LF", priorWears: 0, fullCover: true },

  // Activewear, underwear and pyjamas
  { key: "leggings", name: "Running leggings", category: "activewear", brand: SK, color: "black", hex: "#1f1f22", size: "S", material: "78% polyamide, 22% elastane", description: "High-waisted, full-length leggings with a back zip pocket.", care: "Machine wash 30°C, no softener.", tags: ["sport", "spring", "autumn", "winter", "easy-care", "slim"], list: 85, paid: 68, bought: "2025-01-11", berth: "R1-W7R2-S6", priorWears: 20 },
  { key: "pyjamas", name: "Poplin pyjamas", category: "underwear-and-pyjamas", brand: LC, color: "pale blue stripe", hex: "#a9bdd6", size: "M", material: "100% cotton", description: "A long-sleeved pyjama set in cotton poplin with piped edges.", care: "Machine wash 40°C.", tags: ["loungewear", "spring", "summer", "autumn", "easy-care", "collared", "long", "relaxed"], list: 89, paid: 89, bought: "2024-08-24", berth: "R1-W7R2-S6", priorWears: 15 },
];

const LOOKS = [
  {
    name: "Linen suit",
    kind: "set",
    notes: "The blazer and trousers were bought together. Worn as a suit to a summer wedding, with the loafers.",
    members: ["linen-blazer", "linen-trousers"],
  },
  {
    name: "Autumn at the office",
    kind: "look",
    notes: "Blazer over the silk blouse, wide trousers and loafers. The tote carries everything.",
    members: ["wool-blazer", "silk-blouse", "wool-trousers", "loafers", "tote", "hoops"],
  },
  {
    name: "Saturday denim",
    kind: "look",
    notes: "Cashmere, jeans and trainers, with the scarf if the wind is up.",
    members: ["cashmere-crew", "jeans", "trainers", "silk-scarf"],
  },
];

const TRIPS = [
  {
    name: "Long weekend in Copenhagen",
    type: "vacation",
    destination: "Copenhagen, Denmark",
    start: "2026-05-14",
    end: "2026-05-17",
    notes: "Mostly walking: harbour, galleries, a dinner out on Saturday.",
    plan: [
      { category: "tops", target: 3 },
      { category: "knitwear", target: 1 },
      { category: "trousers", target: 2 },
      { category: "outerwear", target: 1 },
      { category: "shoes", target: 2 },
      { category: "bags", target: 1 },
    ],
    // [key, packed, everyDay, day offsets from the start]
    pack: [
      ["trench", true, true, []],
      ["tote", true, true, []],
      ["trainers", true, false, [0, 1, 3]],
      ["loafers", true, false, [2]],
      ["jeans", true, false, [0, 1, 3]],
      ["wool-trousers", true, false, [2]],
      ["oxford", true, false, [0, 3]],
      ["tee-black", true, false, [1]],
      ["silk-blouse", true, false, [2]],
      ["cashmere-crew", true, false, [1, 3]],
      ["silk-scarf", true, false, [0, 1]],
    ],
  },
  {
    name: "Ten days in Kyoto",
    type: "vacation",
    destination: "Kyoto, Japan",
    start: "2027-03-29",
    end: "2027-04-07",
    notes: "Cherry blossom season: cool mornings, warm afternoons, lots of temples, so shoes that come off easily.",
    plan: [
      { category: "tops", target: 6 },
      { category: "knitwear", target: 2 },
      { category: "trousers", target: 3 },
      { category: "skirts", target: 1 },
      { category: "dresses", target: 2 },
      { category: "outerwear", target: 1 },
      { category: "shoes", target: 2 },
      { category: "bags", target: 1 },
    ],
    pack: [
      ["trench", true, true, []],
      ["tote", false, true, []],
      ["loafers", true, false, [0, 3, 7]],
      ["trainers", false, false, [1, 2, 4, 5, 6, 8, 9]],
      ["jeans", false, false, [1, 4, 8]],
      ["linen-culottes", false, false, [2, 6]],
      ["wool-trousers", true, false, [3, 7]],
      ["shirt-dress", false, false, [5]],
      ["wrap-dress", false, false, [9]],
      ["satin-skirt", false, false, [7]],
      ["oxford", true, false, [0, 4]],
      ["tee-black", false, false, [1, 6]],
      ["silk-blouse", false, false, [3, 7]],
      ["rib-tank", false, false, [2, 8]],
      ["cashmere-crew", true, false, [0, 1, 4]],
      ["merino-cardigan", false, false, [2, 5, 6, 9]],
      ["silk-scarf", false, false, [0, 3]],
      ["pyjamas", true, true, []],
    ],
  },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const sql = postgres(databaseUrl, { prepare: false, max: 1, onnotice: () => {} });

async function main() {
  const [{ n: itemCount }] = await sql`select count(*)::int as n from items`;
  const [{ n: lookCount }] = await sql`select count(*)::int as n from looks`;
  const [{ n: tripCount }] = await sql`select count(*)::int as n from trips`;
  const nonEmpty = itemCount + lookCount + tripCount > 0;

  if (nonEmpty && !RESET) {
    refuse(
      `the catalogue is not empty (${itemCount} pieces, ${lookCount} looks, ${tripCount} trips). ` +
        "Pass --reset to clear it first: pnpm db:seed-demo --reset",
    );
  }

  if (nonEmpty && RESET) {
    // Collect the local photo files the rows point at before the rows go.
    const photoPaths = await sql`
      select path from item_photos union select path from look_photos`;
    await sql.begin(async (tx) => {
      await tx`truncate wear_events, trip_item_days, trip_items, trips,
                        look_photos, look_items, looks, item_photos, items`;
    });
    let removed = 0;
    for (const { path: p } of photoPaths) {
      // Only plain local uploads; a Blob URL is never touched from here.
      if (!/^uploads\/[^/]+$/.test(p)) continue;
      try {
        await unlink(path.join(ROOT, "public", p));
        removed++;
      } catch {
        // Already gone: nothing to do.
      }
    }
    console.log(`seed-demo: cleared the catalogue (${itemCount} pieces) and ${removed} photo files.`);
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  // Write the photos first, so a failure there leaves the database untouched.
  const photoFor = new Map();
  for (const piece of PIECES) {
    const filename = `${randomUUID()}.avif`;
    await writeFile(path.join(UPLOAD_DIR, filename), await placeholderPhoto(piece));
    photoFor.set(piece.key, { url: `/${UPLOAD_SUBDIR}/${filename}`, path: `${UPLOAD_SUBDIR}/${filename}` });
  }

  const ids = new Map();
  let wearCount = 0;

  await sql.begin(async (tx) => {
    for (const p of PIECES) {
      const createdAt = new Date(`${p.bought}T12:00:00Z`);
      const [row] = await tx`
        insert into items ${tx({
          name: p.name,
          category: p.category,
          secondary_categories: p.secondary ?? [],
          brand: p.brand,
          color: p.color,
          size: p.size ?? null,
          list_price_cents: eur(p.list),
          price_paid_cents: eur(p.paid),
          currency: "EUR",
          purchased_at: p.bought,
          purchase_channel: rand() < 0.5 ? "Online" : "In store",
          storage_location: p.berth ?? null,
          favorite: ["cashmere-crew", "wool-coat", "jeans", "slip-dress", "loafers"].includes(p.key),
          show_full_cover: p.fullCover ?? false,
          tags: p.tags,
          notes: p.notes ?? null,
          description: p.description,
          material: p.material,
          care: p.care,
          details: tx.json(p.details ?? []),
          prior_wears: p.priorWears,
          archived_at: p.archived?.at ?? null,
          archive_reason: p.archived?.reason ?? null,
          archive_note: p.archived?.note ?? null,
          created_at: createdAt,
          updated_at: createdAt,
        })}
        returning id`;
      ids.set(p.key, row.id);

      const photo = photoFor.get(p.key);
      await tx`
        insert into item_photos ${tx({
          item_id: row.id,
          url: photo.url,
          path: photo.path,
          kind: "official",
          sort: 0,
          is_primary: true,
        })}`;

      // Wear events over the past ~nine months, never before purchase and
      // never after the piece left the wardrobe.
      const occasions = p.tags.filter((t) =>
        ["casual", "office", "occasion", "sport", "loungewear"].includes(t),
      );
      const wearsWanted = p.archived ? Math.floor(rand() * 4) : Math.floor(rand() * 12);
      const seen = new Set();
      for (let i = 0; i < wearsWanted; i++) {
        const day = daysAgo(1 + Math.floor(rand() * 270));
        if (day < p.bought || (p.archived && day > p.archived.at) || seen.has(day)) continue;
        seen.add(day);
        await tx`
          insert into wear_events ${tx({
            item_id: row.id,
            worn_at: day,
            occasion: occasions.length && rand() < 0.8 ? pick(occasions) : null,
            note: rand() < 0.12 ? pick(["Dinner with friends.", "Long day at the office.", "Gallery visit.", "Rainy, but it held up."]) : null,
          })}`;
        wearCount++;
      }
    }

    for (const look of LOOKS) {
      const [row] = await tx`
        insert into looks ${tx({ name: look.name, kind: look.kind, notes: look.notes })}
        returning id`;
      for (const [sort, key] of look.members.entries()) {
        await tx`insert into look_items ${tx({ look_id: row.id, item_id: ids.get(key), sort })}`;
      }
    }

    for (const trip of TRIPS) {
      const [row] = await tx`
        insert into trips ${tx({
          name: trip.name,
          type: trip.type,
          destination: trip.destination,
          start_date: trip.start,
          end_date: trip.end,
          notes: trip.notes,
          plan: tx.json(trip.plan),
        })}
        returning id`;
      for (const [key, packed, everyDay, days] of trip.pack) {
        const itemId = ids.get(key);
        await tx`
          insert into trip_items ${tx({ trip_id: row.id, item_id: itemId, packed, every_day: everyDay })}`;
        for (const offset of days) {
          await tx`
            insert into trip_item_days ${tx({ trip_id: row.id, item_id: itemId, day: addDays(trip.start, offset) })}`;
        }
      }
    }
  });

  const archived = PIECES.filter((p) => p.archived).length;
  console.log(
    `seed-demo: seeded ${PIECES.length} pieces (${archived} archived), ${PIECES.length} photos, ` +
      `${LOOKS.length} looks, ${TRIPS.length} trips and ${wearCount} wear events (as of ${TODAY}).`,
  );
}

try {
  await main();
} catch (err) {
  console.error("seed-demo: failed:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
