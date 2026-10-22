"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * The full-screen photo viewer (#195).
 *
 * Extracted verbatim from `PhotoGallery`, which owned it alone until look
 * photos needed the same behaviour. It is deliberately **one** implementation:
 * the zoom/pan handling below is the accumulation of several rounds of fixes —
 * pan clamping so a stray drag cannot strand the image off-centre (#127), and
 * sizing to the *visual* viewport so a phone does not show only a corner of the
 * photo (#131). A second copy would have to earn all of that again, and would
 * drift from the first.
 *
 * Ported from an earlier project's image-zoom.js (no external library): a fixed ×1.15
 * wheel step for smooth zoom from the centre, drag to pan, double-click to
 * toggle, plus touch pinch / one-finger pan / double-tap for phones. Zoom is
 * applied imperatively so there is no re-render per frame. When not zoomed,
 * ‹ › and Left/Right navigate; Esc closes.
 *
 * The component is controlled: the caller owns which photo is open, so the same
 * viewer serves a per-kind carousel (items) and a flat grid (looks) without
 * knowing anything about either.
 */

export type ViewerPhoto = { id: string; url: string };

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const WHEEL_FACTOR = 1.15; // fixed step per wheel tick — smooth, matches the original viewer

export function PhotoViewer({
  photos,
  index,
  onClose,
  onStep,
}: {
  photos: ViewerPhoto[];
  index: number;
  onClose: () => void;
  /** Called with -1 / +1; the caller wraps with `stepIndex`. */
  onStep: (delta: number) => void;
}) {
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const scaleRef = React.useRef(1);
  const panRef = React.useRef({ x: 0, y: 0 });

  // Keep the latest onStep/onClose reachable from the listeners without making
  // them effect dependencies — re-subscribing on every parent render would drop
  // an in-flight drag.
  const stepRef = React.useRef(onStep);
  const closeRef = React.useRef(onClose);
  React.useEffect(() => {
    stepRef.current = onStep;
    closeRef.current = onClose;
  });

  const apply = React.useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    // Clamp the pan to the amount the scaled image actually overflows the
    // visible box. At scale 1 the image already fits, so the pan is forced back
    // to 0 and it stays dead-centre — previously a stray drag could slide it
    // into a corner with no way to recover (#127). Measure the overlay (sized to
    // the visual viewport) rather than window.inner* — on phones those describe
    // the layout viewport and are wrong while the URL bar shows or the page is
    // pinch-zoomed (#131).
    const box = overlayRef.current;
    const vw = box?.clientWidth ?? window.innerWidth;
    const vh = box?.clientHeight ?? window.innerHeight;
    const s = scaleRef.current;
    const maxX = Math.max(0, (img.clientWidth * s - vw) / 2);
    const maxY = Math.max(0, (img.clientHeight * s - vh) / 2);
    panRef.current.x = Math.min(maxX, Math.max(-maxX, panRef.current.x));
    panRef.current.y = Math.min(maxY, Math.max(-maxY, panRef.current.y));
    img.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${s})`;
  }, []);

  const reset = React.useCallback(() => {
    scaleRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    apply();
  }, [apply]);

  // Pointer/touch/wheel interaction on the current image (imperative, for
  // smoothness). Re-runs per photo, which also resets the zoom.
  React.useEffect(() => {
    reset();
    const img = imgRef.current;
    if (!img) return;

    const clamp = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
    const setScale = (s: number) => {
      scaleRef.current = clamp(s);
      if (scaleRef.current === 1) panRef.current = { x: 0, y: 0 };
      apply();
    };

    let dragging = false;
    let start = { x: 0, y: 0 };
    let startPan = { x: 0, y: 0 };
    let pinchDist = 0;
    let pinchStartScale = 1;
    let lastTap = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale(scaleRef.current * (e.deltaY < 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR));
    };
    const onMouseDown = (e: MouseEvent) => {
      // Only pan when zoomed in — matches the touch handler. Chrome fires
      // compatibility mouse events after a tap, so without this a plain tap on a
      // phone dragged the un-zoomed image off-centre (#127).
      if (e.button !== 0 || scaleRef.current <= 1) return;
      dragging = true;
      start = { x: e.clientX, y: e.clientY };
      startPan = { ...panRef.current };
      img.style.cursor = "grabbing";
      e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      panRef.current = {
        x: startPan.x + (e.clientX - start.x),
        y: startPan.y + (e.clientY - start.y),
      };
      apply();
    };
    const onMouseUp = () => {
      dragging = false;
      img.style.cursor = "grab";
    };
    const onDblClick = (e: MouseEvent) => {
      e.preventDefault();
      setScale(scaleRef.current > 1 ? 1 : 2.5);
    };

    const distance = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchDist = distance(e.touches);
        pinchStartScale = scaleRef.current;
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap < 300) {
          setScale(scaleRef.current > 1 ? 1 : 2.5);
          lastTap = 0;
        } else {
          lastTap = now;
        }
        dragging = true;
        start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        startPan = { ...panRef.current };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchDist > 0) {
        e.preventDefault();
        setScale(pinchStartScale * (distance(e.touches) / pinchDist));
      } else if (e.touches.length === 1 && dragging && scaleRef.current > 1) {
        e.preventDefault();
        panRef.current = {
          x: startPan.x + (e.touches[0].clientX - start.x),
          y: startPan.y + (e.touches[0].clientY - start.y),
        };
        apply();
      }
    };
    const onTouchEnd = () => {
      dragging = false;
      pinchDist = 0;
    };

    img.addEventListener("wheel", onWheel, { passive: false });
    img.addEventListener("mousedown", onMouseDown);
    img.addEventListener("dblclick", onDblClick);
    img.addEventListener("touchstart", onTouchStart, { passive: false });
    img.addEventListener("touchmove", onTouchMove, { passive: false });
    img.addEventListener("touchend", onTouchEnd);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      img.removeEventListener("wheel", onWheel);
      img.removeEventListener("mousedown", onMouseDown);
      img.removeEventListener("dblclick", onDblClick);
      img.removeEventListener("touchstart", onTouchStart);
      img.removeEventListener("touchmove", onTouchMove);
      img.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [index, apply, reset]);

  // Size and position the viewer to the *visual* viewport, and keep the page
  // behind it from scrolling. On phones the layout viewport — what `inset-0` and
  // vh/vw units describe — is larger than what is actually on screen while the
  // URL bar is visible or the page is pinch-zoomed, so the viewer was drawn
  // bigger than the screen and only a corner of the photo was visible (#131).
  React.useEffect(() => {
    const vv = window.visualViewport;
    const sync = () => {
      const el = overlayRef.current;
      if (!el) return;
      el.style.width = `${vv?.width ?? window.innerWidth}px`;
      el.style.height = `${vv?.height ?? window.innerHeight}px`;
      el.style.transform = `translate(${vv?.offsetLeft ?? 0}px, ${vv?.offsetTop ?? 0}px)`;
      apply(); // re-clamp against the new box
    };
    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      document.body.style.overflow = prevOverflow;
    };
  }, [apply]);

  // Keyboard: Esc closes; arrows pan when zoomed, else navigate photos.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        return;
      }
      e.preventDefault();
      if (scaleRef.current > 1) {
        const d = 80;
        if (e.key === "ArrowLeft") panRef.current.x += d;
        else if (e.key === "ArrowRight") panRef.current.x -= d;
        else if (e.key === "ArrowUp") panRef.current.y += d;
        else if (e.key === "ArrowDown") panRef.current.y -= d;
        apply();
      } else if (e.key === "ArrowLeft") {
        stepRef.current(-1);
      } else if (e.key === "ArrowRight") {
        stepRef.current(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [apply]);

  const current = photos[index];
  if (!current) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      // Sized/positioned to the visual viewport by the effect above, so no
      // inset-0 / vh units here (#131).
      className="fixed left-0 top-0 z-50 flex items-center justify-center overflow-hidden bg-black/90 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="size-5" />
      </button>

      {photos.length > 1 ? (
        <button
          type="button"
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation();
            onStep(-1);
          }}
          className="absolute left-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <ChevronLeft className="size-6" />
        </button>
      ) : null}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={current.url}
        alt=""
        draggable={false}
        // Bounded by the overlay box (the visual viewport) rather than
        // vh/vw units, which overstate the screen on phones (#131).
        className="max-h-full max-w-full cursor-grab object-contain will-change-transform select-none"
        style={{ transformOrigin: "center", touchAction: "none" }}
      />

      {photos.length > 1 ? (
        <button
          type="button"
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation();
            onStep(1);
          }}
          className="absolute right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <ChevronRight className="size-6" />
        </button>
      ) : null}
    </div>
  );
}
