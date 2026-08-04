import { describe, expect, it } from "vitest";

import {
  convertWorkspaceScene,
  hasConvertibleNode,
} from "../web/conversion.js";

function element(
  id: string,
  type: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    type,
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    angle: 0,
    ...overrides,
  };
}

describe("workspace conversion", () => {
  it("converts in a browser environment without Node's Buffer global", () => {
    const originalBuffer = globalThis.Buffer;
    Reflect.deleteProperty(globalThis, "Buffer");

    try {
      expect(() =>
        convertWorkspaceScene(
          JSON.stringify({
            type: "excalidraw",
            elements: [element("node", "rectangle")],
          }),
        ),
      ).not.toThrow();
    } finally {
      globalThis.Buffer = originalBuffer;
    }
  });

  it("recognizes only a non-deleted supported node as convertible", () => {
    expect(
      hasConvertibleNode(
        JSON.stringify({ elements: [element("frame", "frame")] }),
      ),
    ).toBe(false);
    expect(
      hasConvertibleNode(
        JSON.stringify({
          elements: [element("node", "rectangle", { isDeleted: true })],
        }),
      ),
    ).toBe(false);
    expect(
      hasConvertibleNode(
        JSON.stringify({ elements: [element("node", "diamond")] }),
      ),
    ).toBe(true);
  });

  it("converts the constrained palette and reports imported unsupported types", () => {
    const result = convertWorkspaceScene(
      JSON.stringify({
        type: "excalidraw",
        elements: [
          element("node", "rectangle"),
          element("label", "text", {
            text: "Start",
            containerId: "node",
            x: 20,
            y: 20,
            width: 60,
            height: 20,
          }),
          element("frame-a", "frame"),
          element("frame-b", "frame", { x: 200 }),
          element("stroke", "freedraw"),
        ],
      }),
    );

    expect(result.mermaid).toContain('n_node["Start"]');
    expect(result.graph.groups).toEqual([]);
    expect(result.unsupportedWarnings).toEqual([
      {
        code: "unsupported-source-element",
        elementIds: ["frame-a", "frame-b"],
        message:
          'Elements of type "frame" remain visible in the source but are excluded from conversion.',
        severity: "warning",
      },
      {
        code: "unsupported-source-element",
        elementIds: ["stroke"],
        message:
          'Elements of type "freedraw" remain visible in the source but are excluded from conversion.',
        severity: "warning",
      },
    ]);
  });
});
