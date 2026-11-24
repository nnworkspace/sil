import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * The Berth field on the item form (#202).
 *
 * It used to sit in the *purchase* section, between "Return by" and "Return
 * policy", two thirds down the form, and in the wrong group: price, date and
 * return terms are fixed when the piece is bought, while the berth is where it
 * lives now and changes whenever a shelf is reorganised. It is also the field
 * edited most often after filing (a whole batch of pieces can be berthed at once).
 *
 * These tests pin the two things that made it hard to use: **where** it sits
 * relative to the purchase fields, and that it is **labelled and reachable**.
 * Per ADR-0015 they assert through the accessibility tree, so they survive
 * restyling and break only if the behaviour does.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement("img", { src, alt }),
}));

const { ItemForm } = await import("@/components/item-form");

const renderForm = () =>
  render(
    <ItemForm
      action={async () => ({ errors: {} })}
      values={{ storageLocation: "R1-W6R2-S4-R" }}
      submitLabel="Save"
    />,
  );

describe("VAL-ITEM: the Berth field is findable and editable", () => {
  it("is present, labelled 'Berth', and carries the current value", () => {
    renderForm();
    const berth = screen.getByLabelText(/berth/i);
    expect(berth).toBeInTheDocument();
    expect(berth).toHaveValue("R1-W6R2-S4-R");
  });

  it("submits under the storageLocation name", () => {
    renderForm();
    expect(screen.getByLabelText(/berth/i)).toHaveAttribute("name", "storageLocation");
  });

  it("keeps the 31-character cap", () => {
    renderForm();
    expect(screen.getByLabelText(/berth/i)).toHaveAttribute("maxLength", "31");
  });

  it("sits BEFORE the purchase fields, not buried among them (#202)", () => {
    const { container } = renderForm();
    const inputs = Array.from(container.querySelectorAll("input[name], select[name]"));
    const nameOf = (el: Element) => el.getAttribute("name");
    const berthAt = inputs.findIndex((el) => nameOf(el) === "storageLocation");
    const purchaseAt = inputs.findIndex((el) => nameOf(el) === "purchasedAt");
    const returnAt = inputs.findIndex((el) => nameOf(el) === "returnBy");

    expect(berthAt).toBeGreaterThanOrEqual(0);
    // The regression this guards: berth drifting back down among purchase data.
    expect(berthAt).toBeLessThan(purchaseAt);
    expect(berthAt).toBeLessThan(returnAt);
  });

  it("sits with the identity fields: after size, near brand and colour", () => {
    const { container } = renderForm();
    const inputs = Array.from(container.querySelectorAll("input[name], select[name]"));
    const at = (n: string) => inputs.findIndex((el) => el.getAttribute("name") === n);

    expect(at("storageLocation")).toBeGreaterThan(at("brand"));
    expect(at("storageLocation")).toBeGreaterThan(at("size"));
  });
});

describe("the category setter (#206)", () => {
  const renderWith = (category: string, secondaryCategories: string[] = []) =>
    render(
      <ItemForm
        action={async () => ({ errors: {} })}
        values={{ category, secondaryCategories }}
        submitLabel="Save"
      />,
    );

  it("does not offer the primary in 'Also in', because it is set by Main category", () => {
    renderWith("shirts");
    // The dropdown still offers it…
    expect(screen.getByLabelText(/main category/i)).toHaveValue("shirts");
    // …but there is no Shirts tick box to fight with. This is the whole bug:
    // the owner tried to untick the primary and could not.
    expect(screen.queryByRole("checkbox", { name: /^shirts$/i })).not.toBeInTheDocument();
  });

  it("ticks the primary's family automatically, and says why", () => {
    renderWith("shirts");
    const tops = screen.getByRole("checkbox", { name: /tops/i });
    expect(tops).toBeChecked();
    expect(tops).toBeDisabled(); // a consequence, not a choice
    expect(screen.getByText(/via shirts/i)).toBeInTheDocument();
  });

  it("ticks the family of any ticked child, not only the primary's", () => {
    // A dress also filed under jeans is in Trousers too.
    renderWith("dresses", ["jeans"]);
    const trousers = screen.getByRole("checkbox", { name: /trousers/i });
    expect(trousers).toBeChecked();
    expect(trousers).toBeDisabled();
    expect(screen.getByText(/via jeans/i)).toBeInTheDocument();
  });

  it("leaves unrelated families untouched and editable", () => {
    renderWith("shirts");
    const knitwear = screen.getByRole("checkbox", { name: /knitwear/i });
    expect(knitwear).not.toBeChecked();
    expect(knitwear).toBeEnabled();
  });

  it("does not submit implied families, because the server re-derives them", () => {
    const { container } = renderWith("shirts");
    const named = Array.from(
      container.querySelectorAll('input[name="secondaryCategories"]'),
    ).map((el) => el.getAttribute("value"));
    // Tops is implied via Shirts, so it carries no name; nothing depends on it
    // being posted, and normaliseSecondaries adds it back on save.
    expect(named).not.toContain("tops");
    expect(named).toContain("knitwear");
  });

  it("shows sub-types alongside their family so the hierarchy is visible", () => {
    renderWith("dresses");
    for (const sub of ["T-Shirts", "Vests", "Jumpers", "Cardigans"]) {
      expect(screen.getByRole("checkbox", { name: new RegExp(sub, "i") })).toBeInTheDocument();
    }
  });
});

/**
 * A rejected save must never be silent (#238).
 *
 * The bug: the owner changed the Berth, clicked Save, and nothing happened.
 * Nothing was written at all: the action had rejected the submit because a
 * *different* field (`care`, 1099 characters against a 1000 cap) failed
 * validation. The form rendered an inline message for ten fields and nothing
 * for the rest, so the page came back looking untouched and the edit was gone.
 *
 * These tests submit for real rather than passing a pre-baked error state:
 * `useActionState` has no state until the form is actually submitted, which is
 * precisely the path that was broken.
 */
describe("#238: a rejected save says so", () => {
  const submitWith = async (errors: Record<string, string[]>) => {
    render(
      <ItemForm
        action={async () => ({ ok: false, errors })}
        values={{ name: "Cropped Jacket in Nubby Denim", category: "blazers" }}
        submitLabel="Save changes"
      />,
    );
    // Two submit controls exist: the one at the end of the form and the
    // floating one (#103). Either must produce the same report.
    await userEvent.click(screen.getAllByRole("button", { name: "Save changes" })[0]);
  };

  it("names the offending field even when it has no inline slot", async () => {
    await submitWith({ care: ["Too big: expected string to have <=4000 characters"] });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("not saved");
    // "Care", not "care": the owner is looking for a label on the form, not a
    // schema key.
    expect(alert).toHaveTextContent("Care");
  });

  it("says plainly that the change was not saved, rather than only marking a field", async () => {
    // The whole edit is discarded, not just the bad field. Saying so is the
    // difference between "fix this" and "your other changes are gone".
    await submitWith({ material: ["Too big"] });
    expect(await screen.findByRole("alert")).toHaveTextContent(/not saved/i);
  });

  it("lists every failing field, not just the first", async () => {
    await submitWith({ care: ["Too big"], material: ["Too big"], name: ["Name is required"] });
    const alert = await screen.findByRole("alert");
    for (const label of ["Care", "Material", "Name"]) {
      expect(alert).toHaveTextContent(label);
    }
  });

  it("stays quiet when the save succeeds", async () => {
    await submitWith({});
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("is keyed off the returned errors, so an unknown field still surfaces", async () => {
    // The guard that stops this recurring: a field added to the schema tomorrow
    // is reported without anyone remembering to wire up a slot for it. It falls
    // back to the raw key, which is ugly but never silent.
    await submitWith({ someFutureField: ["Nope"] });
    expect(await screen.findByRole("alert")).toHaveTextContent("someFutureField");
  });
});
