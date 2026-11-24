import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The three click targets on a Look photo (#195, `VAL-LOOK-12` / `VAL-LOOK-13`).
 *
 * These exist because the guarantees are behavioural and one of them is
 * destructive: **the ✕ must ask before anything is deleted**. Before #195 it
 * fired straight from the click, with no confirmation and no undo, on a control
 * sitting on top of the photo. Verifying that by hand proves it worked once; a
 * test keeps it true.
 *
 * Asserted through the accessibility tree (roles and accessible names), so the
 * tests break when the behaviour breaks rather than when a class changes, and
 * they double as a check that each control stays reachable without a mouse.
 *
 * Not asserted here: the viewer's zoom and pan. They depend on measured
 * geometry, which jsdom reports as zeroes (ADR-0015).
 */

const addLookPhotos = vi.fn();
const deleteLookPhoto = vi.fn();
const setLookCover = vi.fn();
const refresh = vi.fn();

vi.mock("@/app/looks/actions", () => ({
  addLookPhotos: (fd: FormData) => addLookPhotos(fd),
  deleteLookPhoto: (fd: FormData) => deleteLookPhoto(fd),
  setLookCover: (fd: FormData) => setLookCover(fd),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// next/image needs a Next runtime; the tests care about the surrounding
// controls, not about image optimisation.
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement("img", { src, alt }),
}));

const { LookPhotos } = await import("@/components/look-photos");

const PHOTOS = [
  { id: "p1", url: "/uploads/one.avif", isPrimary: true },
  { id: "p2", url: "/uploads/two.avif", isPrimary: false },
];

const renderPhotos = () => render(<LookPhotos lookId="look-1" photos={PHOTOS} />);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VAL-LOOK-12: a look's photos open the shared viewer", () => {
  it("opens the viewer when a photo is clicked", async () => {
    const user = userEvent.setup();
    renderPhotos();

    expect(screen.queryByRole("dialog", { name: "Photo viewer" })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Enlarge photo" })[0]);

    expect(await screen.findByRole("dialog", { name: "Photo viewer" })).toBeInTheDocument();
  });

  it("offers a photo button per photo, so every one can be enlarged", () => {
    renderPhotos();
    expect(screen.getAllByRole("button", { name: "Enlarge photo" })).toHaveLength(PHOTOS.length);
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderPhotos();

    await user.click(screen.getAllByRole("button", { name: "Enlarge photo" })[0]);
    expect(await screen.findByRole("dialog", { name: "Photo viewer" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Photo viewer" })).not.toBeInTheDocument(),
    );
  });
});

describe("VAL-LOOK-13: deleting asks first, setting the cover does not", () => {
  it("does NOT delete when the ✕ is clicked: it asks", async () => {
    const user = userEvent.setup();
    renderPhotos();

    await user.click(screen.getAllByRole("button", { name: "Remove photo" })[0]);

    // The single most important assertion in this file.
    expect(deleteLookPhoto).not.toHaveBeenCalled();
    expect(await screen.findByText("Remove this photo?")).toBeInTheDocument();
  });

  it("deletes nothing when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderPhotos();

    await user.click(screen.getAllByRole("button", { name: "Remove photo" })[0]);
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(deleteLookPhoto).not.toHaveBeenCalled();
  });

  it("deletes exactly once, and only the confirmed photo, on confirm", async () => {
    const user = userEvent.setup();
    renderPhotos();

    await user.click(screen.getAllByRole("button", { name: "Remove photo" })[1]);
    await user.click(await screen.findByRole("button", { name: "Remove" }));

    await waitFor(() => expect(deleteLookPhoto).toHaveBeenCalledTimes(1));
    const sent = deleteLookPhoto.mock.calls[0][0] as FormData;
    expect(sent.get("photoId")).toBe("p2");
    expect(sent.get("lookId")).toBe("look-1");
  });

  it("does not open the viewer when the ✕ is clicked", async () => {
    const user = userEvent.setup();
    renderPhotos();

    await user.click(screen.getAllByRole("button", { name: "Remove photo" })[0]);

    expect(screen.queryByRole("dialog", { name: "Photo viewer" })).not.toBeInTheDocument();
  });

  it("sets the cover immediately, without asking", async () => {
    const user = userEvent.setup();
    renderPhotos();

    // Only the non-cover photo offers the control.
    await user.click(screen.getByRole("button", { name: "Set as cover" }));

    await waitFor(() => expect(setLookCover).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Remove this photo?")).not.toBeInTheDocument();
    const sent = setLookCover.mock.calls[0][0] as FormData;
    expect(sent.get("photoId")).toBe("p2");
  });

  it("does not open the viewer when ★ is clicked", async () => {
    const user = userEvent.setup();
    renderPhotos();

    await user.click(screen.getByRole("button", { name: "Set as cover" }));

    expect(screen.queryByRole("dialog", { name: "Photo viewer" })).not.toBeInTheDocument();
  });
});

describe("the empty state", () => {
  it("offers upload and no photo controls when there are none", () => {
    render(<LookPhotos lookId="look-1" photos={[]} />);

    expect(screen.getByRole("button", { name: /upload/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enlarge photo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove photo" })).not.toBeInTheDocument();
  });
});
