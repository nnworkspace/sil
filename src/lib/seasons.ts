/**
 * Season inference (#108).
 *
 * Every piece should carry `season` tags (spring/summer/autumn/winter) so the
 * season filter is useful. When the owner didn't choose them, infer from the
 * material, name and description. Heuristics are deliberately generous — a piece
 * usually spans two or three seasons — and are shared by the one-off backfill
 * and (later, #107) the in-app AI import as a sensible fallback.
 */

const SEASON_ORDER = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASON_ORDER)[number];

/** Infer the seasons a piece suits from its free-text fields. Returns the tags
 *  in canonical order; never empty (falls back to the transitional trio). */
export function inferSeasons(input: {
  material?: string | null;
  name?: string | null;
  description?: string | null;
}): Season[] {
  const t = [input.material, input.name, input.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const has = (...ws: string[]) => ws.some((w) => t.includes(w));

  const seasons = new Set<Season>();

  // Cold-weather fabrics / construction → autumn + winter.
  const cold = has(
    "wool", "cashmere", "merino", "mohair", "alpaca", "flannel", "velvet",
    "corduroy", "fleece", "down", "padded", "quilted", "teddy", "sherpa",
    "tweed", "chunky", "heavy knit",
  );
  // Genuinely heavy outerwear-ish → no spring shoulder season.
  const heavy = has("down", "padded", "quilted", "puffer", "fleece", "sherpa", "teddy", "chunky", "heavy");

  // Warm-weather fabrics / light construction → spring + summer.
  const airy = has(
    "linen", "seersucker", "chiffon", "voile", "broderie", "eyelet", "organza",
    "gauze", "muslin", "sleeveless", "short sleeve", "short-sleeve", "cami",
    "slip dress", "sheer", "lightweight", "strappy", "cropped",
  );

  const silk = has("silk");
  // Mid-weight everyday cottons/denims/jerseys → transitional (spring/autumn).
  const midweight = has("cotton", "denim", "jersey", "poplin", "twill", "chambray");

  if (cold) {
    seasons.add("autumn");
    seasons.add("winter");
    if (!heavy) seasons.add("spring");
  }
  if (airy) {
    seasons.add("spring");
    seasons.add("summer");
  }
  if (silk && !cold) {
    seasons.add("spring");
    seasons.add("summer");
    seasons.add("autumn");
  }
  if (midweight && !cold) {
    seasons.add("spring");
    seasons.add("autumn");
    if (airy) seasons.add("summer");
  }

  // Nothing determinable → the safe transitional trio (skip deep winter).
  if (seasons.size === 0) {
    seasons.add("spring");
    seasons.add("summer");
    seasons.add("autumn");
  }

  return SEASON_ORDER.filter((s) => seasons.has(s));
}
