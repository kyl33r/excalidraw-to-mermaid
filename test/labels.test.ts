import { describe, expect, it } from "vitest";

import { resolveNodeLabels } from "../src/labels.js";
import type { GraphNode, NormalizedElement } from "../src/types.js";

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

function node(id: string, sourceId: string, x: number): GraphNode {
  return {
    id,
    sourceElementIds: [sourceId],
    label: "",
    shape: "rectangle",
    bounds: { x, y: 0, width: 100, height: 80 },
    confidence: 1,
  };
}

describe("resolveNodeLabels", () => {
  it("prefers bound container text, preserves line order, and generates fallbacks", () => {
    const result = resolveNodeLabels(
      [node("n_first", "first", 0), node("n_second", "second", 200)],
      [
        element("first", "rectangle", 0, 0, 100, 80),
        element("second", "rectangle", 200, 0, 100, 80),
        element("line-two", "text", 10, 40, 80, 20, {
          text: "World",
          containerId: "first",
        }),
        element("line-one", "text", 10, 10, 80, 20, {
          text: "Hello",
          containerId: "first",
        }),
      ],
    );

    expect(result.nodes.map(({ label }) => label)).toEqual([
      "Hello\nWorld",
      "Unnamed node 2",
    ]);
    expect(result.assignedTextElementIds).toEqual(["line-one", "line-two"]);
    expect(result.warnings).toEqual([
      {
        code: "generated-node-label",
        elementIds: ["second"],
        message: "Node had no associated text; a fallback label was generated.",
        severity: "info",
      },
    ]);
  });

  it("uses geometrically contained text when no explicit container relationship exists", () => {
    const result = resolveNodeLabels(
      [node("n_first", "first", 0)],
      [
        element("first", "rectangle", 0, 0, 100, 80),
        element("visual-label", "text", 15, 25, 70, 20, {
          text: "Visual label",
        }),
      ],
    );

    expect(result.nodes[0]?.label).toBe("Visual label");
    expect(result.assignedTextElementIds).toEqual(["visual-label"]);
    expect(result.warnings).toEqual([]);
  });

  it("uses substantial overlap before conservative nearest-text matching", () => {
    const result = resolveNodeLabels(
      [node("n_overlap", "overlap", 0), node("n_near", "near", 250)],
      [
        element("overlap", "rectangle", 0, 0, 100, 80),
        element("near", "rectangle", 250, 0, 100, 80),
        element("overlap-label", "text", 80, 25, 40, 20, {
          text: "Mostly overlaps",
        }),
        element("near-label", "text", 355, 25, 70, 20, {
          text: "Nearby",
        }),
      ],
    );

    expect(result.nodes.map(({ label }) => label)).toEqual([
      "Mostly overlaps",
      "Nearby",
    ]);
    expect(result.warnings.map(({ code }) => code)).toEqual([
      "low-confidence-node-label",
    ]);
  });
});
