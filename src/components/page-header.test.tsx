import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "@/components/page-header";

/**
 * The shared page heading (#305).
 *
 * **What this tier can and cannot say.** jsdom has no layout engine, so it
 * cannot see the thing this component exists for: that a long title wraps
 * instead of pushing the actions off the screen. #294 is the cautionary tale:
 * a control shipped at zero height and every component test passed.
 *
 * So the geometry is verified in a browser at 378px (title 24px, three lines
 * instead of seven, no horizontal scroll), and these tests guard the two things
 * jsdom *can* see: that every slot renders, and that the classes this component
 * exists to guarantee are actually on the heading. Asserting a class is usually
 * a smell, but here the classes **are** the contract, because four pages
 * previously each remembered a different subset of them.
 */

describe("#305: PageHeader", () => {
  it("renders the title as the page's level-1 heading", () => {
    render(<PageHeader title="Autumn Design Week Workshops and Studio Visits in Copenhagen" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Autumn Design Week Workshops and Studio Visits in Copenhagen",
    );
  });

  it("renders badge, meta and actions when given", () => {
    render(
      <PageHeader
        title="A trip"
        badge={<span>Business</span>}
        meta={<span>Copenhagen</span>}
        actions={<button type="button">Edit</button>}
      />,
    );
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getByText("Copenhagen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("omits meta and actions entirely rather than leaving empty boxes", () => {
    // An empty flex row still occupies gap space and shifts what follows.
    const { container } = render(<PageHeader title="Browse" />);
    // container itself is a div (RTL wraps), so: wrapper + text column + title row.
    expect(container.querySelectorAll("div").length).toBe(3);
  });

  it("keeps the classes four pages had each half-remembered", () => {
    // `break-words` so a long unbroken string cannot overflow; the responsive
    // size because sixty characters at 30px on a 360px screen is seven lines.
    render(<PageHeader title="x" />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.className).toContain("break-words");
    expect(h1.className).toContain("text-2xl");
    expect(h1.className).toContain("sm:text-3xl");
  });

  it("lets the text column shrink, which is what stops actions being pushed off", () => {
    // `min-w-0` on a flex item is the whole fix: without it the item refuses to
    // shrink below its content and the row overflows instead of wrapping.
    const { container } = render(
      <PageHeader title="x" actions={<button type="button">E</button>} />,
    );
    // `firstElementChild` twice, not a `div > div` selector: `container` is
    // itself a div, so that selector matches the wrapper first.
    const textColumn = container.firstElementChild?.firstElementChild;
    expect(textColumn?.className).toContain("min-w-0");
    expect(container.firstElementChild?.className).toContain("flex-wrap");
  });
});
