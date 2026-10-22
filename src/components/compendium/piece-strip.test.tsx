import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * "In this wardrobe" (`VAL-COMP-10`, #213).
 *
 * The guarantee is negative and therefore easy to lose: an entry that matches
 * nothing must **say so**, not render an empty box. An empty box reads as a
 * broken page; a sentence reads as a fact about the wardrobe. Nobody would
 * notice the difference in a manual pass, which is exactly why it is tested.
 */

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// next/image needs a Next runtime; these tests care about the links around the
// photo, not about image optimisation. `createElement` rather than JSX, so the
// house lint rule against a bare <img> stays on everywhere it means something.
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) =>
    React.createElement("img", { src, alt }),
}));

import { PieceStrip } from "@/components/compendium/piece-strip";

const piece = (id: string, name: string, url?: string) => ({
  id,
  name,
  photos: url ? [{ url }] : [],
});

describe("VAL-COMP-10 — an entry with no pieces", () => {
  it("says so rather than rendering an empty region", () => {
    render(<PieceStrip pieces={[]} emptyNote="Nothing in the catalogue matches this yet." />);

    expect(screen.getByText(/nothing in the catalogue matches this yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("passes through the note it was given, so an entry can explain its own silence", () => {
    // A `knitted-to-shape` entry is silent for a different reason than a fibre
    // this wardrobe simply does not own — and the page says which.
    render(<PieceStrip pieces={[]} emptyNote="This one is explained rather than counted." />);

    expect(screen.getByText(/explained rather than counted/i)).toBeInTheDocument();
  });
});

describe("the piece strip", () => {
  it("links each piece to its page, named for a reader not a machine", () => {
    render(
      <PieceStrip
        pieces={[piece("abc", "Silk Satin Kaftan-Style Top", "/u/a.webp")]}
        emptyNote="none"
      />,
    );

    const link = screen.getByRole("link", { name: /silk satin kaftan-style top/i });
    expect(link).toHaveAttribute("href", "/items/abc");
  });

  it("still shows a piece that has no photo", () => {
    // A missing photo must not silently drop the piece from an entry's count.
    render(<PieceStrip pieces={[piece("xyz", "Belted Poplin Shirt")]} emptyNote="none" />);

    expect(screen.getByRole("link", { name: /belted poplin shirt/i })).toBeInTheDocument();
    expect(screen.getByText(/no photo/i)).toBeInTheDocument();
  });
});
