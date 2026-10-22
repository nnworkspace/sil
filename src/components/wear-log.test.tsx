import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Removing a logged wear asks first (#197, `VAL-WEAR-09`).
 *
 * The ✕ used to submit a form straight to `removeWear`, which runs a hard
 * delete. Two things made that sharp: it sat 12px from the edit pencil with
 * both icons 14px — so the realistic mis-tap was *"I meant to correct this
 * wear"* — and a lost wear silently moves the wear total, cost-per-wear, the
 * most-worn leaderboard and the never-worn count.
 *
 * Asserted through the accessibility tree, per ADR-0015.
 */

const logWear = vi.fn();
const updateWear = vi.fn();
const removeWear = vi.fn();

vi.mock("@/app/items/wear-actions", () => ({
  logWear: (...args: unknown[]) => logWear(...args),
  updateWear: (fd: FormData) => updateWear(fd),
  removeWear: (fd: FormData) => removeWear(fd),
}));

const { WearLog } = await import("@/components/wear-log");

const WEARS = [
  { id: "w1", itemId: "item-1", wornAt: "2026-07-20", occasion: "office", note: null },
  { id: "w2", itemId: "item-1", wornAt: "2026-07-01", occasion: null, note: "rainy day" },
] as never[];

const renderLog = () =>
  render(
    <WearLog itemId="item-1" wears={WEARS} pricePaidCents={5900} currency="EUR" priorWears={3} />,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VAL-WEAR-09 — a wear is never deleted on a single click", () => {
  it("does NOT delete when the ✕ is clicked — it asks", async () => {
    const user = userEvent.setup();
    renderLog();

    await user.click(screen.getAllByRole("button", { name: "Remove this wear" })[0]);

    // The assertion this file exists for.
    expect(removeWear).not.toHaveBeenCalled();
    expect(await screen.findByText("Remove this wear?")).toBeInTheDocument();
  });

  it("deletes nothing when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderLog();

    await user.click(screen.getAllByRole("button", { name: "Remove this wear" })[0]);
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(removeWear).not.toHaveBeenCalled();
  });

  it("deletes exactly one wear on confirm, and the right one", async () => {
    const user = userEvent.setup();
    renderLog();

    await user.click(screen.getAllByRole("button", { name: "Remove this wear" })[1]);
    await user.click(await screen.findByRole("button", { name: "Remove" }));

    await waitFor(() => expect(removeWear).toHaveBeenCalledTimes(1));
    const sent = removeWear.mock.calls[0][0] as FormData;
    expect(sent.get("wearId")).toBe("w2");
    expect(sent.get("itemId")).toBe("item-1");
  });

  it("names the wear being removed, so it is clear which one is going", async () => {
    const user = userEvent.setup();
    renderLog();

    await user.click(screen.getAllByRole("button", { name: "Remove this wear" })[1]);

    // The second wear carries a note but no occasion — both must show.
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("rainy day");
    expect(dialog).toHaveTextContent(/cannot be undone/i);
  });

  it("warns that the wear count and cost-per-wear will change", async () => {
    const user = userEvent.setup();
    renderLog();

    await user.click(screen.getAllByRole("button", { name: "Remove this wear" })[0]);

    expect(await screen.findByRole("dialog")).toHaveTextContent(/cost-per-wear/i);
  });
});

describe("removing does not collide with editing", () => {
  it("the ✕ does not open the edit form", async () => {
    const user = userEvent.setup();
    renderLog();

    await user.click(screen.getAllByRole("button", { name: "Remove this wear" })[0]);

    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("the pencil opens the edit form and deletes nothing", async () => {
    const user = userEvent.setup();
    renderLog();

    await user.click(screen.getAllByRole("button", { name: "Edit this wear" })[0]);

    expect(await screen.findByLabelText("Wear date")).toBeInTheDocument();
    expect(removeWear).not.toHaveBeenCalled();
    expect(screen.queryByText("Remove this wear?")).not.toBeInTheDocument();
  });
});
