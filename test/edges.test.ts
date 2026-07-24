import { describe, expect, it } from "vitest";

import { extractGraphEdges } from "../src/edges.js";
import type { GraphNode, NormalizedElement } from "../src/types.js";

function node(id: string, sourceId: string, x: number): GraphNode {
  return {
    id,
    sourceElementIds: [sourceId],
    label: sourceId,
    shape: "rectangle",
    bounds: { x, y: 0, width: 100, height: 80 },
    confidence: 1,
  };
}

function element(
  id: string,
  type: string,
  extra: Partial<NormalizedElement> = {},
): NormalizedElement {
  return {
    id,
    type,
    bounds: { x: 0, y: 0, width: 10, height: 10 },
    center: { x: 5, y: 5 },
    rotation: 0,
    ...extra,
  };
}

describe("extractGraphEdges", () => {
  it("uses explicit arrow bindings and bound text labels", () => {
    const result = extractGraphEdges(
      [node("n_start", "start", 0), node("n_end", "end", 200)],
      [
        element("start", "rectangle"),
        element("end", "rectangle"),
        element("arrow/1", "arrow", {
          startBindingId: "start",
          endBindingId: "end",
          points: [
            { x: 100, y: 40 },
            { x: 200, y: 40 },
          ],
        }),
        element("edge-label", "text", {
          text: "success",
          containerId: "arrow/1",
        }),
      ],
      { assignedTextElementIds: [] },
    );

    expect(result.edges).toEqual([
      {
        id: "e_arrow_1",
        sourceElementIds: ["arrow/1", "edge-label"],
        sourceNodeId: "n_start",
        targetNodeId: "n_end",
        label: "success",
        directed: true,
        confidence: 1,
      },
    ]);
    expect(result.assignedTextElementIds).toEqual(["edge-label"]);
    expect(result.warnings).toEqual([]);
  });

  it("infers unbound endpoints only when each endpoint has a unique nearby node", () => {
    const result = extractGraphEdges(
      [node("n_start", "start", 0), node("n_end", "end", 200)],
      [
        element("start", "rectangle"),
        element("end", "rectangle"),
        element("inferred", "arrow", {
          points: [
            { x: 105, y: 40 },
            { x: 195, y: 40 },
          ],
        }),
      ],
      { snapDistance: 10 },
    );

    expect(result.edges).toEqual([
      {
        id: "e_inferred",
        sourceElementIds: ["inferred"],
        sourceNodeId: "n_start",
        targetNodeId: "n_end",
        directed: true,
        confidence: 0.75,
      },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("omits an edge and warns when an endpoint is ambiguous", () => {
    const result = extractGraphEdges(
      [
        node("n_start", "start", 0),
        node("n_overlap", "overlap", 0),
        node("n_end", "end", 200),
      ],
      [
        element("ambiguous", "arrow", {
          points: [
            { x: 50, y: 40 },
            { x: 195, y: 40 },
          ],
        }),
      ],
      { snapDistance: 10 },
    );

    expect(result.edges).toEqual([]);
    expect(result.warnings).toEqual([
      {
        code: "unresolved-edge-endpoint",
        elementIds: ["ambiguous"],
        message: "Edge endpoints were missing or ambiguous; the edge was omitted.",
        severity: "warning",
      },
    ]);
  });
});
