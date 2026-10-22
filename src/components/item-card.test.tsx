import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Copying a berth from a piece's card (#240).
 *
 * The berth is the string the owner retypes most — into a note, a message, a
 * search box — and it already had a copy control on the Berths tab (#217). This
 * puts the same control where the pieces are.
 *
 * Two things are worth pinning, and neither is visible in a screenshot:
 *
 *  1. **It must not navigate.** The whole card is a stretched link, so a click
 *     that escapes the button opens the piece — while the copy still succeeds,
 *     which reads as "the app randomly opens things" rather than as a bug.
 *  2. **It must be distinguishable from the copy-name control.** A grid renders
 *     dozens of both; identical accessible names would leave a screen reader
 *     with no way to tell them apart.
 */

const writeText = vi.fn<(t: string) => Promise<void>>();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
// The card's overlay buttons import server actions, which pull in the database
// client at module load. The card itself is what is under test here.
vi.mock("@/app/items/actions", () => ({ toggleFavorite: vi.fn() }));
vi.mock("@/app/items/wear-actions", () => ({
  quickLogWear: vi.fn(),
  quickUnlogWear: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement("img", { src, alt }),
}));

/**
 * `userEvent.setup()` installs a clipboard stub of its own, so ours has to be
 * defined *after* it or user-event's wins and the assertions see nothing — the
 * same trap documented in `copy-button.test.tsx`.
 */
const setup = () => {
  const user = userEvent.setup();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  return user;
};

const { ItemCard } = await import("@/components/item-card");

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
});

type CardItem = Parameters<typeof ItemCard>[0]["item"];

const item = (over: Partial<CardItem> = {}) =>
  ({
    id: "abc",
    name: "Cropped Jacket in Nubby Denim",
    brand: "Emporio Armani",
    size: "40 (IT)",
    storageLocation: "R1-W6R2-S4-R",
    showFullCover: false,
    favorite: false,
    photos: [],
    ...over,
  }) as CardItem;

const renderCard = (over: Partial<CardItem> = {}) =>
  render(<ItemCard item={item(over)} overlays={false} />);

describe("#240 — copying a berth from the card", () => {
  it("offers the control when the piece has a berth", () => {
    renderCard();
    expect(screen.getByRole("button", { name: "Copy berth" })).toBeInTheDocument();
  });

  it("copies the berth code itself", async () => {
    renderCard();
    await setup().click(screen.getByRole("button", { name: "Copy berth" }));
    expect(writeText).toHaveBeenCalledWith("R1-W6R2-S4-R");
  });

  it("offers nothing when the piece has no berth", () => {
    // Most of the wardrobe is in this state — an empty control on every card
    // would be noise, and copying "" would be worse.
    renderCard({ storageLocation: null });
    expect(screen.queryByRole("button", { name: "Copy berth" })).toBeNull();
  });

  it("is named apart from the copy-name control on the same card", async () => {
    renderCard();
    const name = screen.getByRole("button", { name: "Copy name" });
    const berth = screen.getByRole("button", { name: "Copy berth" });
    expect(name).not.toBe(berth);
    // And they copy different things — the guard against wiring both to `name`.
    const user = setup();
    await user.click(name);
    expect(writeText).toHaveBeenCalledWith("Cropped Jacket in Nubby Denim");
  });

  it("does not navigate the card", async () => {
    renderCard();
    const link = screen.getByRole("link", { name: "Cropped Jacket in Nubby Denim" });
    const navigated = vi.fn();
    link.addEventListener("click", navigated);
    await setup().click(screen.getByRole("button", { name: "Copy berth" }));
    expect(navigated).not.toHaveBeenCalled();
  });
});
