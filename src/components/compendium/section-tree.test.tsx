import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * The Compendium's section navigation (`VAL-COMP-08`, #213).
 *
 * Two guarantees worth a test: the reader can always tell **where they are**,
 * and on a phone the navigation must not sit between them and the content.
 * Both are behaviour rather than a function, so they belong in the DOM tier
 * (ADR-0015).
 *
 * Not asserted here: that the tree is actually beside the content on a wide
 * screen. That is layout, and jsdom has no layout engine.
 */

const pathname = vi.fn(() => "/compendium");
vi.mock("next/navigation", () => ({ usePathname: () => pathname() }));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SectionTree } from "@/components/compendium/section-tree";

describe("VAL-COMP-08 — the tree says where you are", () => {
  it("marks the current section, and only that one", () => {
    pathname.mockReturnValue("/compendium/berth-notation");
    render(<SectionTree />);

    const current = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current"));
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName(/berth notation/i);
  });

  it("marks nothing on the area's front page, which is not a section", () => {
    pathname.mockReturnValue("/compendium");
    render(<SectionTree />);

    expect(screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current"))).toHaveLength(
      0,
    );
  });

  it("lists a section that is not written yet rather than hiding it (VAL-COMP-10)", () => {
    pathname.mockReturnValue("/compendium");
    render(<SectionTree />);

    expect(screen.getByRole("link", { name: /materials/i })).toHaveAttribute(
      "href",
      "/compendium/materials",
    );
  });

  it("is a named landmark, so it can be skipped", () => {
    pathname.mockReturnValue("/compendium");
    render(<SectionTree />);

    expect(screen.getByRole("navigation", { name: /compendium sections/i })).toBeInTheDocument();
  });
});

/**
 * The one level of nesting the tree gained in #265. Materials became an
 * overview and its four groups became pages, so the tree has children for the
 * first time.
 */
describe("#265 — the groups under Materials", () => {
  it("offers every group without needing anything expanded first", () => {
    // The children are not behind a disclosure, and this is the reason: the
    // split exists so the groups can be seen and picked.
    pathname.mockReturnValue("/compendium");
    render(<SectionTree />);

    for (const [label, href] of [
      ["Fibres", "/compendium/fibres"],
      ["Constructions", "/compendium/constructions"],
      ["Finishes", "/compendium/finishes"],
      ["Cuts", "/compendium/cuts"],
    ]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
  });

  it("marks the group you are on, and not its parent", () => {
    pathname.mockReturnValue("/compendium/cuts");
    render(<SectionTree />);

    const current = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current"));
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName("Cuts");
  });

  it("marks nothing on an entry page, which is not itself a section", () => {
    // `/compendium/materials/linen` is inside Materials without being it, and
    // claiming otherwise would tell a screen reader the wrong page is current.
    pathname.mockReturnValue("/compendium/materials/linen");
    render(<SectionTree />);

    expect(screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current"))).toHaveLength(
      0,
    );
  });
});

describe("the phone disclosure", () => {
  it("names the current section while shut, so the label is useful closed", () => {
    pathname.mockReturnValue("/compendium/berth-notation");
    render(<SectionTree />);

    const toggle = screen.getByRole("button", { name: /berth notation/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("names the parent section from inside an entry page", () => {
    // Shut, the button is the only thing telling the reader where they are —
    // "Sections" would be a wasted line when the answer is known.
    pathname.mockReturnValue("/compendium/materials/linen");
    render(<SectionTree />);

    expect(screen.getByRole("button", { name: /materials/i })).toBeInTheDocument();
  });

  it("names a group while shut", () => {
    pathname.mockReturnValue("/compendium/fibres");
    render(<SectionTree />);

    expect(screen.getByRole("button", { name: /fibres/i })).toBeInTheDocument();
  });

  it("opens and closes on click", async () => {
    const user = userEvent.setup();
    pathname.mockReturnValue("/compendium");
    render(<SectionTree />);

    const toggle = screen.getByRole("button", { name: /sections/i });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
