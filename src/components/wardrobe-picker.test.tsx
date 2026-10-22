import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Browsing the picker by category (#280 → #284 → #296).
 *
 * Three shapes in one day: stacked groups with per-group chips, then two chip
 * rows and a flat grid, now two dropdowns. The **behaviour** has not moved
 * through any of it — narrow to a category, narrow again to a sub-type, and
 * the sub-choice never survives a change of category — so these tests are
 * written against that rather than against the control of the week.
 *
 * Component tier (ADR-0015): asserted through the accessibility tree, so a
 * test breaks when the behaviour does rather than when a class changes. Note
 * what this tier **cannot** see: #294 shipped these controls at zero height and
 * every one of these tests passed, because jsdom has no layout engine.
 */

// The mock stands in for next/image, which needs a Next runtime jsdom has not
// got. A plain <img> is the point of the stub, so the LCP rule is off here.
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

import { WardrobePicker, type PickerItem } from "@/components/wardrobe-picker";

const piece = (
  id: string,
  name: string,
  category: string,
  material: string | null = null,
): PickerItem => ({
  id,
  name,
  category,
  secondaryCategories: [],
  photoUrl: null,
  tags: [],
  color: null,
  material,
  pricePaidCents: null,
  purchasedAt: null,
  createdAt: new Date("2026-01-01"),
  priorWears: null,
  wearEvents: [],
});

const ITEMS: PickerItem[] = [
  piece("a", "Belted Kaftan Dress", "dresses"),
  piece("b", "Long Cotton Shirt Dress", "shirt-dresses"),
  piece("c", "Midi Shirt Dress", "shirt-dresses"),
  piece("d", "Long Silk Slip Dress", "slip-dresses"),
  piece("e", "Isabella Pumps", "shoes"),
];

/** A second set, for the material facet — the fibre lives on the piece, so the
 *  pieces above (all `material: null`) cannot exercise it. */
const FIBRES: PickerItem[] = [
  piece("f1", "Linen Shift", "dresses", "100% linen"),
  piece("f2", "Silk Slip", "dresses", "100% mulberry silk"),
  piece("f3", "Silky Cotton Shirt", "dresses", "100% cotton (mercerised — silky sheen)"),
  piece("f4", "Unlabelled Dress", "dresses", null),
];

const openPicker = async () => {
  const user = userEvent.setup();
  render(
    <WardrobePicker
      action={() => {}}
      contextField="tripId"
      contextId="t1"
      items={ITEMS}
      addedIds={[]}
    />,
  );
  await user.click(screen.getByRole("button", { name: /add/i }));
  return user;
};

const DRESSES = ITEMS.filter((i) => i.category !== "shoes").map((i) => i.name);

/** Open a dropdown by its accessible name and choose an option. */
const choose = async (
  user: ReturnType<typeof userEvent.setup>,
  dropdown: string | RegExp,
  option: string,
) => {
  await user.click(await screen.findByRole("button", { name: dropdown }));
  await user.click(await screen.findByRole("menuitemradio", { name: option }));
  // Escape, because in jsdom the menu does not actually unmount on select —
  // Base UI's exit is animation-driven and jsdom runs no animations, so the
  // popup keeps `data-open` forever. Without closing it, the next `choose`
  // clicks its trigger through an open overlay. This is a test-environment
  // workaround, not a claim about the browser.
  await user.keyboard("{Escape}");
};

/** The cards currently on screen, by their piece name. */
const visible = () =>
  screen
    .getAllByRole("button")
    .map((b) => b.textContent ?? "")
    .filter((t) => ITEMS.some((i) => t.includes(i.name)))
    .map((t) => ITEMS.find((i) => t.includes(i.name))!.name);

describe("#296 — the category dropdown", () => {
  it("shows the whole wardrobe until a category is chosen", async () => {
    // "All categories" is the default. Anything else would hide pieces from
    // someone who opened the picker to find one specific thing.
    await openPicker();
    expect(visible()).toEqual(expect.arrayContaining([...DRESSES, "Isabella Pumps"]));
    expect(screen.getByRole("button", { name: "Category" })).toHaveTextContent("All categories");
  });

  it("narrows to one category, hiding the others", async () => {
    // The complaint this fixes: choosing a dress meant scrolling past Tops,
    // Trousers and Shoes, all rendered at once.
    const user = await openPicker();
    await choose(user, "Category", "Dresses");

    expect(visible()).toEqual(expect.arrayContaining(DRESSES));
    expect(visible()).not.toContain("Isabella Pumps");
  });

  it("offers no option for a category with nothing in it", async () => {
    // Fourteen categories, most of them empty in any given view. An option
    // that leads to an empty grid is a dead end.
    const user = await openPicker();
    await user.click(screen.getByRole("button", { name: "Category" }));
    expect(await screen.findByRole("menuitemradio", { name: "Dresses" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitemradio", { name: "Skirts" })).not.toBeInTheDocument();
  });

  it("returns to everything via All categories", async () => {
    const user = await openPicker();
    await choose(user, "Category", "Dresses");
    await choose(user, "Category", "All categories");

    expect(visible()).toContain("Isabella Pumps");
  });
});

describe("#296 — the sub-category dropdown", () => {
  const openDresses = async () => {
    const user = await openPicker();
    await choose(user, "Category", "Dresses");
    return user;
  };

  it("appears only for a category that has children", async () => {
    // Most categories have none, and a dropdown offering one option is noise.
    const user = await openPicker();
    await choose(user, "Category", "Shoes");
    expect(screen.queryByRole("button", { name: /shoes type/i })).not.toBeInTheDocument();
  });

  it("rolls up until a sub-type is chosen", async () => {
    await openDresses();
    expect(screen.getByRole("button", { name: /dresses type/i })).toHaveTextContent("All dresses");
    expect(visible()).toEqual(expect.arrayContaining(DRESSES));
  });

  it("narrows to one sub-type", async () => {
    const user = await openDresses();
    await choose(user, /dresses type/i, "Shirt Dresses");

    expect(visible()).toContain("Long Cotton Shirt Dress");
    expect(visible()).toContain("Midi Shirt Dress");
    expect(visible()).not.toContain("Belted Kaftan Dress");
  });

  it("shows only pieces filed at the parent under 'Not categorised'", async () => {
    // The honest counterpart of the roll-up, and how a piece missing its
    // sub-type gets noticed at all.
    const user = await openDresses();
    await choose(user, /dresses type/i, "Not categorised");

    expect(visible()).toEqual(["Belted Kaftan Dress"]);
  });

  it("forgets the sub-type when a different category is chosen", async () => {
    // Carrying it across would filter Shoes by `shirt-dresses` and show an
    // empty grid with no clue why.
    const user = await openDresses();
    await choose(user, /dresses type/i, "Shirt Dresses");
    await choose(user, "Category", "Shoes");

    expect(visible()).toEqual(["Isabella Pumps"]);
  });

  it("composes with the search box rather than replacing it", async () => {
    const user = await openDresses();
    await user.type(screen.getByPlaceholderText(/search/i), "midi");

    expect(visible()).toEqual(["Midi Shirt Dress"]);
  });

  it("forgets both choices when the dialog is reopened", async () => {
    const user = await openDresses();
    await choose(user, /dresses type/i, "Shirt Dresses");
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    await user.click(screen.getByRole("button", { name: /add/i }));

    expect(screen.getByRole("button", { name: "Category" })).toHaveTextContent("All categories");
    expect(screen.queryByRole("button", { name: /dresses type/i })).not.toBeInTheDocument();
  });
});

/**
 * The material facet (#299).
 *
 * #263 gave Browse a material filter and never gave this dialog one — `PickerItem`
 * could not even carry the question. The picker is arguably where it matters
 * more: browse is for looking things up, the picker is for choosing what to
 * pack, and "which of these are linen" is what a summer trip asks.
 */
describe("#299 — filtering the picker by material", () => {
  const openWith = async (items: PickerItem[]) => {
    const user = userEvent.setup();
    render(
      <WardrobePicker
        action={() => {}}
        contextField="tripId"
        contextId="t1"
        items={items}
        addedIds={[]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /add/i }));
    await user.click(screen.getByRole("button", { name: /filters/i }));
    return user;
  };

  const pickFibre = async (user: ReturnType<typeof userEvent.setup>, fibre: string) => {
    await user.click(await screen.findByRole("button", { name: "Material" }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: fibre }));
    await user.keyboard("{Escape}");
  };

  const names = () =>
    screen
      .getAllByRole("button")
      .map((b) => b.textContent ?? "")
      .filter((t) => FIBRES.some((i) => t.includes(i.name)))
      .map((t) => FIBRES.find((i) => t.includes(i.name))!.name);

  it("narrows to one fibre", async () => {
    const user = await openWith(FIBRES);
    await pickFibre(user, "Linen");
    expect(names()).toEqual(["Linen Shift"]);
  });

  it("does not file a 'silky' cotton under Silk", async () => {
    // The catalogue string that justifies both-sided token boundaries, and the
    // reason the picker matches through `containsToken` rather than a substring
    // of its own.
    const user = await openWith(FIBRES);
    await pickFibre(user, "Silk");
    expect(names()).toEqual(["Silk Slip"]);
  });

  it("drops a piece with no material recorded", async () => {
    // It cannot be claimed for a fibre it does not name — the same restraint
    // the Compendium matcher shows.
    const user = await openWith(FIBRES);
    await pickFibre(user, "Cotton");
    expect(names()).toEqual(["Silky Cotton Shirt"]);
    expect(names()).not.toContain("Unlabelled Dress");
  });

  it("composes with the search box", async () => {
    const user = await openWith(FIBRES);
    await pickFibre(user, "Cotton");
    await user.type(screen.getByPlaceholderText(/search/i), "nothing-matches-this");
    expect(names()).toEqual([]);
  });

  it("counts toward the active-filter badge and is cleared with the rest", async () => {
    const user = await openWith(FIBRES);
    await pickFibre(user, "Linen");
    const clear = await screen.findByRole("button", { name: /clear/i });
    await user.click(clear);
    expect(names()).toEqual(expect.arrayContaining(["Linen Shift", "Silk Slip"]));
  });
});
