import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { convertExcalidrawToMermaid } from "../src/convert.js";

describe("convertExcalidrawToMermaid", () => {
  it("converts a complete Excalidraw document into a Mermaid graph", async () => {
    const source = await readFile(
      new URL("../examples/01-basic-flow.excalidraw", import.meta.url),
      "utf8",
    );

    const result = convertExcalidrawToMermaid(source);

    expect(result.graph.nodes).toHaveLength(4);
    expect(result.graph.edges).toHaveLength(3);
    expect(result.graph.warnings).toEqual([]);
    expect(result.mermaid).toContain("flowchart LR");
    expect(result.mermaid).toContain('n_basic_start["Receive request"]');
    expect(result.mermaid).toContain('n_basic_decision{"Input valid?"}');
    expect(result.mermaid).toContain('n_basic_done(["Continue"])');
    expect(result.mermaid.match(/-->/g)).toHaveLength(3);
  });
});
