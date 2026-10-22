import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The copy control (#217).
 *
 * The guarantee worth a test is the one nobody would write down: **copying must
 * not navigate.** These buttons live on cards whose whole surface navigates, so
 * a click that escapes the button sends the owner to the piece's page — and the
 * copy still succeeds, which makes the bug read as "the app randomly opens
 * things" rather than as a broken button. That is exactly the sort of fault a
 * manual pass explains away.
 *
 * The second is quieter: **a failed copy must say so.** `navigator.clipboard`
 * rejects outside a secure context, and a silent failure leaves the owner
 * pasting whatever was on the clipboard before.
 */

import { CopyButton } from "@/components/copy-button";

const writeText = vi.fn<(t: string) => Promise<void>>();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
});

// A test that installs fake timers and then fails leaves them installed — the
// runner abandons the body, so a `finally` inside it never runs, and every
// later test in the file times out for a reason that has nothing to do with it.
// Restoring here means one failure stays one failure.
afterEach(() => {
  vi.useRealTimers();
});

/**
 * `navigator.clipboard` is getter-only in jsdom, and `userEvent.setup()`
 * installs a clipboard stub of its own — so the mock has to be defined, and
 * defined *after* setup, or user-event's stub wins and the assertions see
 * nothing.
 */
function setup(options?: Parameters<typeof userEvent.setup>[0]) {
  const user = userEvent.setup(options);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return user;
}

/** The card shape both real usages have: a stretched link behind a control. */
function CardLike({ value, label }: { value: string; label: string }) {
  const navigated = React.useRef(false);
  return (
    <div
      data-testid="card"
      onClick={() => {
        navigated.current = true;
        document.body.setAttribute("data-navigated", "true");
      }}
    >
      {/* The stretched link is modelled by the handler above rather than a real
          <a>: what must not happen is the click *reaching the card*, and an
          anchor here would only add a lint exemption without adding a check. */}
      <span>Silk Satin Kaftan-Style Top</span>
      <CopyButton value={value} label={label} />
    </div>
  );
}

describe("#217 — copying", () => {
  it("puts the value on the clipboard", async () => {
    const user = setup();
    render(<CopyButton value="R1-W6R2-S4-L" label="Copy berth code" />);

    await user.click(screen.getByRole("button", { name: /copy berth code/i }));

    expect(writeText).toHaveBeenCalledWith("R1-W6R2-S4-L");
  });

  it("does not let the click reach the surrounding card", async () => {
    const user = setup();
    document.body.removeAttribute("data-navigated");
    render(<CardLike value="Silk Satin Kaftan-Style Top" label="Copy name" />);

    await user.click(screen.getByRole("button", { name: /copy name/i }));

    expect(writeText).toHaveBeenCalledOnce();
    expect(document.body.getAttribute("data-navigated")).toBeNull();
  });

  it("confirms, then goes back to offering the copy", async () => {
    vi.useFakeTimers();
    try {
      // `fireEvent`, not user-event: user-event schedules its own timers, and
      // driving those from fake timers is a fight this assertion does not need.
      // The click is the trivial part here; the 1.5s revert is the point.
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });
      render(<CopyButton value="x" label="Copy name" />);
      const button = screen.getByRole("button");

      fireEvent.click(button);
      // Flush the microtask the clipboard promise resolves on.
      await act(async () => void (await vi.advanceTimersByTimeAsync(0)));
      expect(button).toHaveAccessibleName("Copied");

      await act(async () => void (await vi.advanceTimersByTimeAsync(1600)));
      expect(button).toHaveAccessibleName("Copy name");
    } finally {
      vi.useRealTimers();
    }
  });

  it("says so when the clipboard refuses, instead of appearing to succeed", async () => {
    // An insecure context rejects. Silence would leave the owner believing a
    // code is on the clipboard when it is not.
    writeText.mockRejectedValue(new Error("not allowed"));
    const user = setup();
    render(<CopyButton value="x" label="Copy name" />);

    await user.click(screen.getByRole("button", { name: /copy name/i }));

    expect(await screen.findByRole("button", { name: /couldn't copy/i })).toBeInTheDocument();
  });

  it("names what it copies, since a grid renders dozens of these", () => {
    render(
      <>
        <CopyButton value="a" label="Copy name" />
        <CopyButton value="b" label="Copy berth code R1-W6R2-S4-L" />
      </>,
    );

    expect(screen.getByRole("button", { name: "Copy name" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy berth code R1-W6R2-S4-L" }),
    ).toBeInTheDocument();
  });
});
