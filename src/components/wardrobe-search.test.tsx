import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The wardrobe search field, once it left the filter panel (#240).
 *
 * The field used to live inside a collapsed "Search & filter" panel. Moving it
 * into the page header is mostly layout, but three behaviours are easy to get
 * wrong and impossible to notice by eye:
 *
 *  1. **The home page must not filter live.** There is no list there, so a live
 *     field would navigate to /browse after the first keystroke.
 *  2. **"Clear all" must still empty it.** The panel clears `q` in the URL; the
 *     header field holds its own state and has to adopt that.
 *  3. **...but adopting must not fight the debounce.** Naively syncing to the
 *     `q` prop resets a keystroke that lands inside the 300 ms window.
 */

const replace = vi.fn();
const push = vi.fn();
let params = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push, refresh: vi.fn() }),
  usePathname: () => "/category/tops",
  useSearchParams: () => params,
}));

const { WardrobeSearch } = await import("@/components/wardrobe-search");

beforeEach(() => {
  replace.mockReset();
  push.mockReset();
  params = new URLSearchParams();
});

/**
 * Real timers throughout. `userEvent` and fake timers need careful pairing, and
 * the debounce here is 300 ms, cheap enough to simply wait out with `waitFor`,
 * which also tests the real code path rather than a simulated one.
 */
const box = () => screen.getByRole("searchbox", { name: "Search the wardrobe" });

const type = async (text: string) => {
  await userEvent.setup().type(box(), text);
};

describe("#240: live mode, on a page that has a list", () => {
  it("narrows through the URL after typing settles", async () => {
    render(<WardrobeSearch q="" />);
    await type("linen");
    // Debounced: nothing has been committed the instant typing stops.
    expect(replace).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/category/tops?q=linen", { scroll: false }),
    );
  });

  it("drops the parameter rather than writing an empty one", async () => {
    params = new URLSearchParams("q=linen");
    render(<WardrobeSearch q="linen" />);
    await userEvent.setup().clear(box());
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/category/tops", { scroll: false }),
    );
  });

  it("keeps the other filters that are already in the URL", async () => {
    params = new URLSearchParams("tag=summer&color=blue");
    render(<WardrobeSearch q="" />);
    await type("silk");
    await waitFor(() => expect(replace).toHaveBeenCalled());
    const url = replace.mock.calls.at(-1)?.[0] as string;
    expect(url).toContain("tag=summer");
    expect(url).toContain("color=blue");
    expect(url).toContain("q=silk");
  });

  it("adopts an external clear, so 'Clear all' in the panel empties it", () => {
    const { rerender } = render(<WardrobeSearch q="linen" />);
    expect(box()).toHaveValue("linen");
    // What the panel's Clear all does: the URL loses `q`, the page re-renders.
    rerender(<WardrobeSearch q="" />);
    expect(box()).toHaveValue("");
  });

  it("does not reset a keystroke that lands inside the debounce window", async () => {
    // The regression the `lastCommitted` ref exists for: the parent re-renders
    // with the *previous* committed `q` while the owner is still typing. Syncing
    // on the prop alone would throw the newer characters away.
    const { rerender } = render(<WardrobeSearch q="" />);
    await type("lin");
    await waitFor(() => expect(replace).toHaveBeenCalled());
    await type("en");
    rerender(<WardrobeSearch q="lin" />); // stale prop arriving mid-type
    expect(box()).toHaveValue("linen");
  });
});

describe("#240: submit mode, on the home page", () => {
  it("does not navigate while typing", async () => {
    render(<WardrobeSearch mode="submit" />);
    await type("linen");
    // Waiting past the live mode's 300 ms debounce is the whole point: asserting
    // immediately would pass even if submit mode were debouncing like the live
    // one, which is exactly the mutation this test exists to catch.
    await new Promise((r) => setTimeout(r, 400));
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("goes to Browse carrying the query on Enter", async () => {
    render(<WardrobeSearch mode="submit" />);
    await type("linen{Enter}");
    expect(push).toHaveBeenCalledWith("/browse?q=linen");
  });

  it("encodes a query that would otherwise break the URL", async () => {
    render(<WardrobeSearch mode="submit" />);
    await type("navy & white{Enter}");
    expect(push).toHaveBeenCalledWith("/browse?q=navy%20%26%20white");
  });

  it("still reaches Browse when submitted empty", async () => {
    render(<WardrobeSearch mode="submit" />);
    await userEvent.setup().type(box(), "{Enter}");
    expect(push).toHaveBeenCalledWith("/browse");
  });
});

describe("#240: the phone affordance", () => {
  it("offers the icon as a labelled control when there is no query", () => {
    render(<WardrobeSearch q="" />);
    // Both the trigger and the field carry the same accessible name; the
    // trigger is a button, the field a searchbox.
    expect(screen.getByRole("button", { name: "Search the wardrobe" })).toBeInTheDocument();
  });

  it("opens the bar and hides its own trigger once used", async () => {
    render(<WardrobeSearch q="" />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Search the wardrobe" }));
    expect(screen.queryByRole("button", { name: "Search the wardrobe" })).toBeNull();
  });

  it("focuses the bar it just opened, so typing can start straight away", async () => {
    // Found by driving the real page: focusing inside the click handler (or in a
    // requestAnimationFrame) runs while the field is still display:none, and
    // focusing a hidden element silently does nothing.
    render(<WardrobeSearch q="" />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Search the wardrobe" }));
    expect(box()).toHaveFocus();
  });

  it("does not steal focus on load when a query is already present", () => {
    render(<WardrobeSearch q="linen" />);
    expect(box()).not.toHaveFocus();
  });

  it("starts open when a query is already active, so a shared link shows its term", () => {
    render(<WardrobeSearch q="linen" />);
    expect(screen.queryByRole("button", { name: "Search the wardrobe" })).toBeNull();
  });
});
