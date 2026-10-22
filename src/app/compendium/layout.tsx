import { SectionTree } from "@/components/compendium/section-tree";

/**
 * The Compendium shell (SPEC-COMPENDIUM-INT §3, #213): section tree beside the
 * content, on every page in the area.
 *
 * Two columns, not three — the right-hand table of contents is deliberately out
 * of scope until a section grows long enough to want in-page anchors.
 */
export const metadata = {
  title: "Compendium · Sil",
  description: "The wardrobe's materials, notation and conventions.",
};

export default function CompendiumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-10">
        <SectionTree />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
