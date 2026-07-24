import { describe, expect, it } from "vitest";

import { buildDiagramGraph } from "../src/graph.js";
import type { NormalizedElement } from "../src/types.js";

function element(
  id: string,
  type: string,
  x: number,
  y: number,
  width: number,
  height: number,
  extra: Partial<NormalizedElement> = {},
): NormalizedElement {
  return {
    id,
    type,
    bounds: { x, y, width, height },
    center: { x: x + width / 2, y: y + height / 2 },
    rotation: 0,
    ...extra,
  };
}

describe("buildDiagramGraph", () => {
  it("assembles labelled nodes, edges, frame groups, and horizontal direction", () => {
    const graph = buildDiagramGraph([
      element("frame", "frame", -20, -20, 360, 120),
      element("start", "rectangle", 0, 0, 100, 80, { frameId: "frame" }),
      element("start-text", "text", 10, 25, 80, 20, {
        text: "Start",
        containerId: "start",
        frameId: "frame",
      }),
      element("end", "ellipse", 220, 0, 100, 80, { frameId: "frame" }),
      element("end-text", "text", 230, 25, 80, 20, {
        text: "End",
        containerId: "end",
        frameId: "frame",
      }),
      element("arrow", "arrow", 100, 35, 120, 10, {
        startBindingId: "start",
        endBindingId: "end",
        frameId: "frame",
        points: [
          { x: 100, y: 40 },
          { x: 220, y: 40 },
        ],
      }),
    ]);

    expect(graph.id).toBe("diagram");
    expect(graph.direction).toBe("LR");
    expect(graph.nodes.map(({ label, parentGroupId }) => ({ label, parentGroupId }))).toEqual([
      { label: "Start", parentGroupId: "g_frame" },
      { label: "End", parentGroupId: "g_frame" },
    ]);
    expect(graph.edges).toHaveLength(1);
    expect(graph.groups).toEqual([
      {
        id: "g_frame",
        label: "frame",
        childNodeIds: ["n_start", "n_end"],
        bounds: { x: -20, y: -20, width: 360, height: 120 },
      },
    ]);
    expect(graph.warnings).toEqual([]);
  });
});
