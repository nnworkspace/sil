// @vitest-environment jsdom
/**
 * Every Mermaid diagram in the docs must parse (#333).
 *
 * A diagram that does not parse is otherwise only noticed when someone opens
 * the page on GitHub and finds "Unable to render rich display" where the
 * diagram should be. #331 was one semicolon, which Mermaid reads as the end of
 * a statement, in the AI planner's flow diagram.
 *
 * This file is the one `.test.ts` that runs in jsdom rather than node
 * (ADR-0015 splits the tiers by extension): Mermaid sanitises labels with
 * DOMPurify, which needs a window, and flowcharts and state diagrams fail to
 * parse without one. It renders nothing; it only parses.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import mermaid from "mermaid";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

type Diagram = { where: string; code: string };

/** Every fenced `mermaid` block in the tracked Markdown, with its file and line. */
function collectDiagrams(): Diagram[] {
  const files = execFileSync("git", ["ls-files", "*.md"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  const diagrams: Diagram[] = [];
  for (const file of files) {
    const lines = readFileSync(path.join(root, file), "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!/^\s*```mermaid\s*$/.test(lines[i])) continue;
      const start = i + 1;
      const body: string[] = [];
      for (i++; i < lines.length && !/^\s*```\s*$/.test(lines[i]); i++) body.push(lines[i]);
      diagrams.push({ where: `${file}:${start}`, code: body.join("\n") });
    }
  }
  return diagrams;
}

const diagrams = collectDiagrams();
mermaid.initialize({ startOnLoad: false });

describe("#333: every Mermaid diagram in the docs parses", () => {
  it("finds the diagrams at all", () => {
    // Guards the extractor: a regex that matched nothing would pass every case below.
    expect(diagrams.length).toBeGreaterThan(0);
  });

  it("rejects a diagram that GitHub cannot render", async () => {
    // The #331 shape, kept so the check is known to bite.
    await expect(mermaid.parse("sequenceDiagram\n  A->>B: save x; read y + z")).rejects.toThrow();
  });

  // A plain loop rather than `it.each`, which truncates long names: a failure
  // must name the whole `file:line`.
  for (const { where, code } of diagrams) {
    it(where, async () => {
      await expect(mermaid.parse(code)).resolves.toBeTruthy();
    });
  }
});
