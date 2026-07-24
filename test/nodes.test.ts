import { describe, expect, it } from "vitest";

import { extractGraphNodes } from "../src/nodes.js";
import type { NormalizedElement } from "../src/types.js";

function normalizedElement(
  id: string,
  type: string,
  overrides: Partial<NormalizedElement> = {},
): NormalizedElement {
  return {
    id,
    type,
    bounds: { x: 10, y: 20, width: 100, height: 40 },
    center: { x: 60, y: 40 },
    rotation: 0,
    ...overrides,
  };
}

describe("extractGraphNodes", () => {
  it("extracts rectangle, ellipse, and diamond candidates only", () => {
    const result = extractGraphNodes([
      normalizedElement("rect-1", "rectangle"),
      normalizedElement("ellipse-1", "ellipse"),
      normalizedElement("diamond-1", "diamond"),
      normalizedElement("arrow-1", "arrow"),
      normalizedElement("text-1", "text", { text: "Not enabled" }),
    ]);

    expect(result.warnings).toEqual([]);
    expect(
      result.nodes.map(({ sourceElementIds, shape, label, bounds, confidence }) => ({
        sourceElementIds,
        shape,
        label,
        bounds,
        confidence,
      })),
    ).toEqual([
      {
        sourceElementIds: ["rect-1"],
        shape: "rectangle",
        label: "",
        bounds: { x: 10, y: 20, width: 100, height: 40 },
        confidence: 1,
      },
      {
        sourceElementIds: ["ellipse-1"],
        shape: "ellipse",
        label: "",
        bounds: { x: 10, y: 20, width: 100, height: 40 },
        confidence: 1,
      },
      {
        sourceElementIds: ["diamond-1"],
        shape: "diamond",
        label: "",
        bounds: { x: 10, y: 20, width: 100, height: 40 },
        confidence: 1,
      },
    ]);
  });

  it("extracts connected or configured standalone text but not contained text", () => {
    const elements = [
      normalizedElement("container", "rectangle", {
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      }),
      normalizedElement("connected-text", "text", {
        bounds: { x: 200, y: 0, width: 80, height: 20 },
        text: "Connected state",
      }),
      normalizedElement("configured-text", "text", {
        bounds: { x: 300, y: 0, width: 80, height: 20 },
        text: "Configured state",
      }),
      normalizedElement("bound-label", "text", {
        bounds: { x: 10, y: 10, width: 50, height: 20 },
        text: "Container label",
        containerId: "container",
      }),
      normalizedElement("geometric-label", "text", {
        bounds: { x: 20, y: 40, width: 50, height: 20 },
        text: "Geometric label",
      }),
      normalizedElement("arrow", "arrow", {
        startBindingId: "container",
        endBindingId: "connected-text",
      }),
    ];

    const defaultResult = extractGraphNodes(elements);
    expect(
      defaultResult.nodes.map(({ sourceElementIds, shape, label }) => ({
        sourceElementIds,
        shape,
        label,
      })),
    ).toEqual([
      {
        sourceElementIds: ["container"],
        shape: "rectangle",
        label: "",
      },
      {
        sourceElementIds: ["connected-text"],
        shape: "state",
        label: "Connected state",
      },
    ]);

    const configuredResult = extractGraphNodes(elements, {
      includeStandaloneText: true,
    });
    expect(configuredResult.nodes.map(({ sourceElementIds }) => sourceElementIds)).toEqual([
      ["container"],
      ["connected-text"],
      ["configured-text"],
    ]);
    expect(defaultResult.warnings).toEqual([]);
    expect(configuredResult.warnings).toEqual([]);
  });

  it("creates stable Mermaid-safe IDs without using labels as identifiers", () => {
    const result = extractGraphNodes([
      normalizedElement("W9m-1qA", "rectangle", { text: "Unsafe [label]" }),
      normalizedElement("a-b", "ellipse"),
      normalizedElement("a_b", "diamond"),
      normalizedElement("a_b__612d62", "rectangle"),
    ]);

    expect(result.nodes.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "n_W9m_1qA", label: "" },
      { id: "n0_0061002d0062", label: "" },
      { id: "n0_0061005f0062", label: "" },
      { id: "n_a_b__612d62", label: "" },
    ]);
    for (const node of result.nodes) {
      expect(node.id).toMatch(/^[A-Za-z_][A-Za-z0-9_]*$/);
    }

    const reordered = extractGraphNodes([
      normalizedElement("a_b", "diamond"),
      normalizedElement("a-b", "ellipse"),
    ]);
    expect(
      Object.fromEntries(
        reordered.nodes.map((node) => [node.sourceElementIds[0], node.id]),
      ),
    ).toEqual({
      "a-b": "n0_0061002d0062",
      a_b: "n0_0061005f0062",
    });
  });

  it("keeps collision IDs injective for distinct lone UTF-16 surrogates", () => {
    const highSurrogateA = "\ud800";
    const highSurrogateB = "\ud801";
    const result = extractGraphNodes([
      normalizedElement(highSurrogateA, "rectangle"),
      normalizedElement(highSurrogateB, "ellipse"),
    ]);

    expect(result.nodes.map(({ id }) => id)).toEqual(["n0_d800", "n0_d801"]);

    const reordered = extractGraphNodes([
      normalizedElement(highSurrogateB, "ellipse"),
      normalizedElement(highSurrogateA, "rectangle"),
    ]);
    expect(
      Object.fromEntries(
        reordered.nodes.map((node) => [node.sourceElementIds[0], node.id]),
      ),
    ).toEqual({
      [highSurrogateA]: "n0_d800",
      [highSurrogateB]: "n0_d801",
    });
  });

  it("assigns distinct IDs across mixed colliding source strings", () => {
    const sourceIds = [
      "a-b",
      "a_b",
      "a b",
      "\ud800",
      "\ud801",
      "\ud800x",
      "\ud801x",
      "😀",
      "😁",
      "流程",
      "流 程",
    ];
    const result = extractGraphNodes(
      sourceIds.map((id) => normalizedElement(id, "rectangle")),
    );

    expect(new Set(result.nodes.map(({ id }) => id)).size).toBe(sourceIds.length);
  });

  it("rejects duplicate candidate source IDs at the public API boundary", () => {
    const result = extractGraphNodes([
      normalizedElement("duplicate", "rectangle"),
      normalizedElement("duplicate", "ellipse"),
    ]);

    expect(result.nodes).toEqual([]);
    expect(result.warnings).toEqual([
      {
        code: "duplicate-node-source-id",
        elementIds: ["duplicate"],
        message: "Duplicate node source ID is ambiguous; all matching candidates were skipped.",
        severity: "warning",
      },
    ]);
  });
});
