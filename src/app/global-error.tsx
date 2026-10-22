"use client";

import * as React from "react";

/**
 * The boundary of last resort (#308).
 *
 * `error.tsx` replaces a *page* and keeps the shell. This one catches a failure
 * in the root layout itself — the header, the fonts, the theme provider — where
 * there is no shell left to keep. Next requires it to render its own `<html>`
 * and `<body>`, because it is replacing the document.
 *
 * Deliberately dependency-free: no shared components, no icons, inline styles
 * only. Everything it might import is a thing that could be the reason the
 * layout crashed, and a boundary that throws while reporting an error leaves
 * the reader with a blank page and no explanation at all.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Root layout failed:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 400, margin: 0 }}>Sil couldn’t start</h1>
          <p style={{ color: "#666", fontSize: "0.9rem", lineHeight: 1.6 }}>
            The app failed to load. <strong>Nothing has been lost</strong> — your wardrobe is
            stored in the database and is untouched by this.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: "1.5rem", fontFamily: "monospace", fontSize: "0.75rem", color: "#888" }}>
              Reference {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
