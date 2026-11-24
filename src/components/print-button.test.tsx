import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PrintButton } from "@/components/print-button";

/**
 * The one control the printable packing list has (#259).
 *
 * The whole PDF feature rests on this button: every browser's print dialogue
 * offers **Save as PDF** as a destination, so this is what turns a web page
 * into the file that goes in the suitcase. No PDF library, no server-side image
 * fetching, which is why it is worth a test despite being four lines.
 */
describe("#259: the print button", () => {
  it("opens the browser's print dialogue", async () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    render(<PrintButton />);
    await userEvent.setup().click(screen.getByRole("button", { name: /print/i }));
    expect(print).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("says what it does, including that it makes a PDF", () => {
    // "Print" alone hides the feature: the owner asked for a PDF, and the
    // route to one is inside the print dialogue rather than anywhere obvious.
    render(<PrintButton />);
    expect(screen.getByRole("button", { name: /save as pdf/i })).toBeInTheDocument();
  });

  it("accepts the class that removes it from the printed page", () => {
    // A button on paper is a grey rectangle; the page passes `print:hidden`.
    render(<PrintButton className="print:hidden" />);
    expect(screen.getByRole("button", { name: /print/i })).toHaveClass("print:hidden");
  });
});
