import Link from "next/link";

import { getFigureItems } from "@/lib/queries";
import {
  acquisitionByYear,
  active,
  collection,
  collectionByPrimary,
  careSplit,
  colourFamilies,
  costPerWearLeaders,
  gaps,
  inYear,
  materialFamilies,
  mostWorn,
  overview,
  purchaseYears,
  seasonCoverage,
  spendByBrand,
  wearSummary,
  type FigureItem,
  type WearRow,
} from "@/lib/figures";
import { formatPrice } from "@/lib/format";
import { Base, BarRow, ColumnChart, Empty, SwatchRow } from "@/components/figures/bars";
import { FiguresSidebar, type Section } from "@/components/figures/sidebar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Figures · Sil",
  description: "What the wardrobe is made of, what it cost, and what gets worn.",
};

const SECTIONS: Section[] = [
  { id: "overview", label: "Overview" },
  { id: "collection", label: "Collection" },
  { id: "spending", label: "Spending" },
  { id: "wear", label: "Wear & value" },
  { id: "gaps", label: "Gaps" },
  { id: "texture", label: "Colour & fabric" },
  { id: "care", label: "Care & season" },
];

/** Money for display. Figures totals are EUR (VAL-FIG-08). */
const money = (cents: number) => formatPrice(cents, "EUR") ?? "—";

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-serif text-2xl tabular-nums">{value}</div>
      {note ? <div className="text-xs text-muted-foreground">{note}</div> : null}
    </div>
  );
}

function PieceRow({
  row,
  value,
  display,
  max,
}: {
  row: WearRow;
  value: number;
  display: string;
  max: number;
}) {
  return (
    <BarRow
      label={row.brand ? `${row.name} · ${row.brand}` : row.name}
      value={value}
      display={display}
      max={max}
      href={`/items/${row.id}`}
      hint={row.pricePaidCents != null ? `${row.wears} wears` : undefined}
    />
  );
}

function Section({
  id,
  title,
  children,
  lede,
}: {
  id: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="font-serif text-xl font-normal tracking-tight">{title}</h2>
      {lede ? <p className="mt-0.5 mb-3 text-sm text-muted-foreground">{lede}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

export default async function FiguresPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; year?: string }>;
}) {
  const params = await searchParams;
  const scope = params.scope === "all" ? "all" : "active";
  const yearParam = Number(params.year);
  const year = Number.isInteger(yearParam) ? yearParam : null;

  const all = (await getFigureItems()) as FigureItem[];
  const scoped = scope === "all" ? all : active(all);
  const items = year != null ? inYear(scoped, year) : scoped;

  const thisYear = new Date().getFullYear();
  const o = overview(items, thisYear);
  const rows = collection(items);
  const primaryRows = collectionByPrimary(items);
  const years = acquisitionByYear(items);
  const brands = spendByBrand(items);
  const wear = wearSummary(items);
  const worn = mostWorn(items);
  const cpw = costPerWearLeaders(items);
  // Photos are a separate table; the metric layer asks rather than knowing.
  const photographed = new Set(
    (items as (FigureItem & { photos?: { id: string }[] })[])
      .filter((i) => (i.photos?.length ?? 0) > 0)
      .map((i) => i.id),
  );
  const dataGaps = gaps(items, (id) => photographed.has(id));
  const colours = colourFamilies(items);
  const materials = materialFamilies(items);
  const care = careSplit(items);
  const seasons = seasonCoverage(items);
  const undated = scoped.filter((i) => i.purchasedAt == null).length;

  const maxCount = rows[0]?.count ?? 0;
  const maxPrimary = primaryRows[0]?.count ?? 0;
  const maxBrandSpend = brands.value[0]?.spendCents ?? 0;
  const maxYearPieces = Math.max(1, ...years.value.map((r) => r.pieces));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-normal tracking-tight">Figures</h1>
        <p className="text-muted-foreground">
          {scope === "all" ? "The whole catalogue" : "The active wardrobe"}
          {year != null ? `, bought in ${year}` : ""} — what it is made of, what it cost, and when
          it arrived.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <FiguresSidebar
          sections={SECTIONS}
          scope={scope}
          year={year}
          years={purchaseYears(scope === "all" ? all : active(all))}
        />

        <div className="min-w-0 space-y-10">
          <Section id="overview" title="Overview">
            {items.length === 0 ? (
              <Empty>
                Nothing to measure under this filter yet.{" "}
                <Link href="/items/new" className="underline">
                  Add a piece
                </Link>{" "}
                or widen the scope.
              </Empty>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Tile label="Pieces" value={String(o.pieces)} />
                  <Tile
                    label="Total value"
                    value={money(o.totalValueCents.value)}
                    note={o.totalValueCents.excluded > 0 ? `${o.totalValueCents.excluded} unpriced` : undefined}
                  />
                  <Tile label="Categories in use" value={String(o.categoriesInUse)} />
                  <Tile label="Average price" value={money(o.averagePriceCents.value)} />
                  <Tile label={`Bought in ${thisYear}`} value={String(o.addedThisYear)} />
                  <Tile label="Favourites" value={String(o.favourites)} />
                </div>
                <div className="mt-2">
                  <Base base={o.totalValueCents.base} excluded={o.totalValueCents.excluded} noun="pieces" />
                </div>
              </>
            )}
          </Section>

          <Section id="collection" title="Collection">
            {rows.length === 0 ? (
              <Empty>No pieces under this filter.</Empty>
            ) : (
              <div className="space-y-8">
                {/* Two true answers to two different questions (VAL-FIG-11).
                    This one: what the wardrobe is made of, each piece counted
                    once, so the parts add up to the whole. */}
                <div>
                  <h3 className="text-sm font-medium">What it is made of</h3>
                  <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
                    Every piece counted once, under its main category — so these sum to the{" "}
                    <span className="tabular-nums">{items.length}</span>.
                  </p>
                  <div className="divide-y">
                    {primaryRows.map((r) => (
                      <BarRow
                        key={r.slug}
                        label={r.label}
                        value={r.count}
                        display={String(r.count)}
                        max={maxPrimary}
                        href={`/category/${r.slug}`}
                        hint={`${r.count} pieces whose main category is ${r.label}`}
                      />
                    ))}
                  </div>
                </div>

                {/* And this one: how much counts as X at all — which must
                    include pieces filed there as a secondary. */}
                <div>
                  <h3 className="text-sm font-medium">How much counts as each</h3>
                  <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
                    A piece counts under every category it is filed in, and a parent includes its
                    sub-categories — so these deliberately do not sum to the{" "}
                    <span className="tabular-nums">{items.length}</span>.
                  </p>
                  <div className="divide-y">
                    {rows.map((r) => (
                      <BarRow
                        key={r.slug}
                        label={r.label}
                        value={r.count}
                        display={String(r.count)}
                        max={maxCount}
                        href={`/category/${r.slug}`}
                        indent={r.isChild}
                        hint={`${r.count} pieces in ${r.label}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Section>

          <Section id="spending" title="Spending &amp; acquisition">
            {years.value.length === 0 ? (
              <Empty>
                No purchase dates recorded under this filter, so there is no timeline to draw.
              </Empty>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="mb-2 text-sm">
                    <span className="font-medium tabular-nums">{years.base}</span> pieces with a
                    purchase date, {money(years.value.reduce((n, r) => n + r.spendCents, 0))} spent.
                  </p>
                  <ColumnChart
                    rows={years.value.map((r) => ({
                      key: String(r.year),
                      height: Math.round((r.pieces / maxYearPieces) * 120),
                      label: r.pieces > 0 ? String(r.pieces) : "",
                      caption: `’${String(r.year).slice(2)}`,
                      title: `${r.year}: ${r.pieces} pieces, ${money(r.spendCents)}`,
                    }))}
                  />
                  {undated > 0 && year == null ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {undated} {undated === 1 ? "piece has" : "pieces have"} no purchase date and
                      sit outside this timeline.
                    </p>
                  ) : null}
                </div>

                {brands.value.length > 0 ? (
                  <div>
                    <h3 className="mb-1 text-sm font-medium">By brand</h3>
                    <div className="divide-y">
                      {brands.value.map((b) => (
                        <BarRow
                          key={b.brand}
                          label={`${b.brand} · ${b.pieces} ${b.pieces === 1 ? "piece" : "pieces"}`}
                          value={b.spendCents}
                          display={money(b.spendCents)}
                          max={maxBrandSpend}
                          hint={`${b.brand}: ${money(b.spendCents)} over ${b.pieces} pieces`}
                        />
                      ))}
                    </div>
                    <Base base={brands.base} excluded={brands.excluded} noun="pieces with a brand" />
                  </div>
                ) : null}
              </div>
            )}
          </Section>

          <Section id="wear" title="Wear &amp; value">
            {wear.recorded === 0 ? (
              <Empty>
                No wear history recorded yet under this filter — so there is nothing to rank.
                Setting a prior count when editing a piece, or logging a wear, starts this off.
              </Empty>
            ) : (
              <div className="space-y-6">
                <p className="text-sm">
                  <span className="font-medium tabular-nums">{wear.wears}</span> wears across{" "}
                  <span className="font-medium tabular-nums">{wear.recorded}</span> pieces with a
                  recorded history.{" "}
                  {wear.neverWorn > 0 ? (
                    <>
                      <span className="font-medium tabular-nums">{wear.neverWorn}</span>{" "}
                      {wear.neverWorn === 1 ? "is" : "are"} recorded as never worn.
                    </>
                  ) : null}{" "}
                  {wear.notRecorded > 0 ? (
                    <span className="text-muted-foreground">
                      {wear.notRecorded} more have no wear history recorded — see Gaps.
                    </span>
                  ) : null}
                </p>

                <div>
                  <h3 className="mb-1 text-sm font-medium">Most worn</h3>
                  <div className="divide-y">
                    {worn.value.map((r) => (
                      <PieceRow
                        key={r.id}
                        row={r}
                        value={r.wears}
                        display={`${r.wears}×`}
                        max={worn.value[0]?.wears ?? 0}
                      />
                    ))}
                  </div>
                </div>

                {cpw.base > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <h3 className="mb-1 text-sm font-medium">Best value</h3>
                      <div className="divide-y">
                        {cpw.value.best.map((r) => (
                          <PieceRow
                            key={r.id}
                            row={r}
                            value={r.costPerWearCents ?? 0}
                            display={`${money(Math.round(r.costPerWearCents ?? 0))}`}
                            max={cpw.value.worst[0]?.costPerWearCents ?? 0}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-1 text-sm font-medium">Yet to earn their keep</h3>
                      <div className="divide-y">
                        {cpw.value.worst.map((r) => (
                          <PieceRow
                            key={r.id}
                            row={r}
                            value={r.costPerWearCents ?? 0}
                            display={`${money(Math.round(r.costPerWearCents ?? 0))}`}
                            max={cpw.value.worst[0]?.costPerWearCents ?? 0}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Cost per wear is shown only where it is defined — a piece with no price, or none
                  recorded worn, has none. {cpw.excluded} excluded on that basis.
                </p>
              </div>
            )}
          </Section>

          <Section
            id="gaps"
            title="Gaps"
            lede="Not a scolding — a to-do list. Every one of these filled makes some other figure on this page truer."
          >
            {dataGaps.length === 0 ? (
              <Empty>Nothing missing under this filter. Remarkable.</Empty>
            ) : (
              <div className="divide-y">
                {dataGaps.map((g) => (
                  <Link
                    key={g.kind}
                    href={`/browse?missing=${g.kind}`}
                    className="flex items-center justify-between gap-3 py-2 text-sm transition-colors hover:text-primary"
                  >
                    <span>{g.label}</span>
                    <span className="tabular-nums">
                      {g.count}{" "}
                      <span className="text-muted-foreground">
                        {g.count === 1 ? "piece" : "pieces"} →
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section id="texture" title="Colour &amp; fabric">
            {colours.value.length === 0 && materials.value.length === 0 ? (
              <Empty>No colours or materials recorded under this filter.</Empty>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {colours.value.length > 0 ? (
                  <div>
                    <h3 className="mb-1 text-sm font-medium">Palette</h3>
                    <div className="divide-y">
                      {colours.value.map((c) => (
                        <SwatchRow
                          key={c.key}
                          label={c.label}
                          swatch={c.swatch}
                          value={c.count}
                          max={colours.value[0]?.count ?? 0}
                          href={`/browse?color=${c.key}`}
                        />
                      ))}
                    </div>
                    <Base base={colours.base} excluded={colours.excluded} noun="pieces whose colour matches a family" />
                  </div>
                ) : null}

                {materials.value.length > 0 ? (
                  <div>
                    <h3 className="mb-1 text-sm font-medium">Fabric</h3>
                    <div className="divide-y">
                      {materials.value.map((m) => (
                        <BarRow
                          key={m.key}
                          label={m.label}
                          value={m.count}
                          display={String(m.count)}
                          max={materials.value[0]?.count ?? 0}
                          hint={`${m.count} pieces contain ${m.label.toLowerCase()}`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      A blend counts in every fibre it names, so these add to more than the
                      wardrobe.
                    </p>
                    <Base base={materials.base} excluded={materials.excluded} noun="pieces with a material" />
                  </div>
                ) : null}
              </div>
            )}
          </Section>

          <Section id="care" title="Care &amp; season">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="mb-1 text-sm font-medium">How demanding</h3>
                {care.base === 0 ? (
                  <Empty>No care tags recorded under this filter.</Empty>
                ) : (
                  <>
                    <div className="divide-y">
                      {care.value.map((c) => (
                        <BarRow
                          key={c.key}
                          label={c.label}
                          value={c.count}
                          display={String(c.count)}
                          max={Math.max(...care.value.map((x) => x.count), 1)}
                          href={`/browse?tag=${c.key}`}
                        />
                      ))}
                    </div>
                    <Base base={care.base} excluded={care.excluded} noun="pieces with a care tag" />
                  </>
                )}
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium">Season coverage</h3>
                {seasons.base === 0 ? (
                  <Empty>No season tags recorded under this filter.</Empty>
                ) : (
                  <>
                    <div className="divide-y">
                      {seasons.value.map((c) => (
                        <BarRow
                          key={c.key}
                          label={c.label}
                          value={c.count}
                          display={String(c.count)}
                          max={Math.max(...seasons.value.map((x) => x.count), 1)}
                          href={`/browse?tag=${c.key}`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Most pieces span more than one season, so these add to more than the wardrobe.
                    </p>
                    <Base base={seasons.base} excluded={seasons.excluded} noun="pieces with a season tag" />
                  </>
                )}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
