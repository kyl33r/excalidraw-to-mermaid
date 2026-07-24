import { describe, expect, it } from "vitest";

import { generateMermaid } from "../src/mermaid.js";
import type { DiagramGraph } from "../src/types.js";

const graph: DiagramGraph = {
  id: "diagram",
  direction: "LR",
  nodes: [
    {
      id: "n_end",
      sourceElementIds: ["end"],
      label: "Done & safe",
      shape: "ellipse",
      bounds: { x: 200, y: 0, width: 100, height: 80 },
      parentGroupId: "g_main",
      confidence: 1,
    },
    {
      id: "n_start",
      sourceElementIds: ["start"],
      label: "Say \"hello\"\nagain",
      shape: "rectangle",
      bounds: { x: 0, y: 0, width: 100, height: 80 },
      parentGroupId: "g_main",
      confidence: 1,
    },
  ],
  edges: [
    {
      id: "e_arrow",
      sourceElementIds: ["arrow"],
      sourceNodeId: "n_start",
      targetNodeId: "n_end",
      label: "yes <now>",
      directed: true,
      confidence: 1,
    },
  ],
  groups: [
    {
      id: "g_main",
      label: "Main \"flow\"",
      childNodeIds: ["n_start", "n_end"],
      bounds: { x: -10, y: -10, width: 320, height: 100 },
    },
  ],
  warnings: [],
};

describe("generateMermaid", () => {
  it("emits deterministic escaped flowchart syntax with shapes and groups", () => {
    expect(generateMermaid(graph)).toBe(
      [
        "flowchart LR",
        "  subgraph g_main[\"Main &quot;flow&quot;\"]",
        "    direction LR",
        "    n_start[\"Say &quot;hello&quot;<br/>again\"]",
        "    n_end([\"Done &amp; safe\"])",
        "  end",
        "  n_start -->|\"yes &lt;now&gt;\"| n_end",
        "",
      ].join("\n"),
    );
  });
});
