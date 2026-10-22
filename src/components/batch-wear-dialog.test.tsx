import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const batchLogWear = vi.fn();
const batchUnlogWear = vi.fn();
const wornOnDate = vi.fn();

vi.mock("@/app/items/wear-actions", () => ({
  batchLogWear: (...a: unknown[]) => batchLogWear(...a),
  batchUnlogWear: (...a: unknown[]) => batchUnlogWear(...a),
  wornOnDate: (...a: unknown[]) => wornOnDate(...a),
}));

const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a) } }));

import { BatchWearDialog } from "@/components/batch-wear-dialog";

/**
 * The batch wear dialog (#320).
 *
 * jsdom can see behaviour but not layout, so these cover what the dialog
 * *decides* — the date it opens on, that one submit writes every piece, and
 * that a duplicate warns before it writes. The geometry is checked in a browser.
 */

const PIECES = [
  { itemId: "dress", name: "Midi Shirt Dress" },
  { itemId: "necklace", name: "Rectangular-Link Chain Necklace" },
];

beforeEach(() => {
  vi.clearAllMocks();
  wornOnDate.mockResolvedValue([]);
  batchLogWear.mockResolvedValue({
    ok: true,
    wearIds: ["w1", "w2"],
    packedTicked: [],
    message: "Logged 2 wears",
  });
});

describe("#320 — which date the dialog opens on", () => {
  it("opens on the trip day, not today", async () => {
    // The case that matters on the road: catching up days later. Defaulting to
    // today would silently record the wrong date.
    render(
      <BatchWearDialog open onOpenChange={() => {}} pieces={PIECES} tripId="t1" day="2026-08-14" />,
    );
    expect(await screen.findByLabelText("Date")).toHaveValue("2026-08-14");
  });

  it("opens on today when there is no day", async () => {
    render(<BatchWearDialog open onOpenChange={() => {}} pieces={PIECES} />);
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(await screen.findByLabelText("Date")).toHaveValue(iso);
  });
});

describe("#320 — one submit, every piece", () => {
  it("sends all selected ids in a single call", async () => {
    const user = userEvent.setup();
    render(<BatchWearDialog open onOpenChange={() => {}} pieces={PIECES} />);
    await user.click(await screen.findByRole("button", { name: "Log 2 wears" }));
    await waitFor(() => expect(batchLogWear).toHaveBeenCalledTimes(1));
    expect(batchLogWear.mock.calls[0][0]).toEqual(["dress", "necklace"]);
  });

  it("passes the trip id only when there is a trip", async () => {
    // This is what decides whether packed gets inferred at all.
    const user = userEvent.setup();
    const { rerender } = render(
      <BatchWearDialog open onOpenChange={() => {}} pieces={PIECES} tripId="t1" day="2026-08-14" />,
    );
    await user.click(await screen.findByRole("button", { name: "Log 2 wears" }));
    await waitFor(() => expect(batchLogWear.mock.calls[0][2]).toBe("t1"));

    vi.clearAllMocks();
    batchLogWear.mockResolvedValue({ ok: true, wearIds: ["w"], packedTicked: [], message: "ok" });
    rerender(<BatchWearDialog open onOpenChange={() => {}} pieces={PIECES} />);
    await user.click(await screen.findByRole("button", { name: "Log 2 wears" }));
    await waitFor(() => expect(batchLogWear.mock.calls[0][2]).toBe(null));
  });

  it("offers an undo that reverts the whole batch", async () => {
    const user = userEvent.setup();
    batchLogWear.mockResolvedValue({
      ok: true,
      wearIds: ["w1", "w2"],
      packedTicked: ["necklace"],
      message: "Logged 2 wears · 1 marked packed",
    });
    render(
      <BatchWearDialog open onOpenChange={() => {}} pieces={PIECES} tripId="t1" day="2026-08-14" />,
    );
    await user.click(await screen.findByRole("button", { name: "Log 2 wears" }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());

    // The toast carries the ticks, so undoing reverts them too — an undo that
    // left pieces marked packed would be lying about what it undid.
    const [message, opts] = toastSuccess.mock.calls[0] as [string, { action: { onClick: () => void } }];
    expect(message).toBe("Logged 2 wears · 1 marked packed");
    opts.action.onClick();
    expect(batchUnlogWear).toHaveBeenCalledWith(["w1", "w2"], ["dress", "necklace"], "t1", ["necklace"]);
  });
});

describe("#320 — duplicates warn before they write", () => {
  it("does not write on the first press, and says which piece", async () => {
    wornOnDate.mockResolvedValue(["dress"]);
    const user = userEvent.setup();
    render(<BatchWearDialog open onOpenChange={() => {}} pieces={PIECES} />);

    const button = await screen.findByRole("button", { name: "Log anyway" });
    expect(await screen.findByText(/Midi Shirt Dress already has/)).toBeInTheDocument();
    await user.click(button);
    expect(batchLogWear).not.toHaveBeenCalled();
  });

  it("writes on the second press — wearing something twice in a day is real", async () => {
    wornOnDate.mockResolvedValue(["dress"]);
    const user = userEvent.setup();
    render(<BatchWearDialog open onOpenChange={() => {}} pieces={PIECES} />);
    const button = await screen.findByRole("button", { name: "Log anyway" });
    await user.click(button);
    await user.click(await screen.findByRole("button", { name: "Log 2 wears" }));
    await waitFor(() => expect(batchLogWear).toHaveBeenCalledTimes(1));
  });
});
