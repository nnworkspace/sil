import * as React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { COMPENDIUM_ENTRIES, ENTRY_GROUPS } from "@/lib/compendium/entries";
import { Markdown } from "@/components/markdown";

/**
 * Every entry's prose must actually render as Markdown (#243).
 *
 * Found on the Bolero page: **它解决的问题很具体：**一条无袖…  showed its
 * asterisks. It is a CommonMark rule that bites only in Chinese: a closing
 * `**` is a valid closer when it is *right-flanking*, which it is not when it
 * sits between a punctuation mark and a letter. `：**一` fails; `**：一` is
 * fine. Nothing about the string looks wrong, and TypeScript, ESLint and the
 * build are all perfectly happy with it.
 *
 * So the check is the rendered output, not the source: put every prose field
 * through the real renderer and look for asterisks that survived. This is
 * cheap, and it covers entries nobody thought to open.
 */

const PROSE_FIELDS = ["explanation", "recognise", "wearing", "uncertain"] as const;

const renderedText = (markdown: string) => {
  const { container, unmount } = render(<Markdown>{markdown}</Markdown>);
  const text = container.textContent ?? "";
  unmount();
  return text;
};

describe("#243: entry prose renders as Markdown", () => {
  it("leaves no literal ** anywhere in any entry", () => {
    const offenders: string[] = [];
    for (const entry of COMPENDIUM_ENTRIES) {
      for (const field of PROSE_FIELDS) {
        const value = entry[field];
        if (!value) continue;
        if (renderedText(value).includes("**")) offenders.push(`${entry.slug}.${field}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("leaves no literal ** in a group blurb either", () => {
    const offenders = ENTRY_GROUPS.filter((g) => renderedText(g.blurb).includes("**")).map(
      (g) => g.group,
    );
    expect(offenders).toEqual([]);
  });

  it("catches the failure it was written for", () => {
    // The exact string from the Bolero entry before the fix, and the fix.
    expect(renderedText("**它解决的问题很具体：**一条无袖的连衣裙")).toContain("**");
    expect(renderedText("**它解决的问题很具体**：一条无袖的连衣裙")).not.toContain("**");
  });
});
