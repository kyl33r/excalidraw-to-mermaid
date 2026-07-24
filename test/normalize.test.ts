import { describe, expect, it } from "vitest";

import { normalizeExcalidrawElements } from "../src/normalize.js";

describe("normalizeExcalidrawElements", () => {
  it("normalizes an unrotated element's bounds and center", () => {
    const result = normalizeExcalidrawElements([
      {
        id: "node-1",
        type: "rectangle",
        x: 10,
        y: 20,
        width: 100,
        height: 40,
        angle: 0,
      },
    ]);

    expect(result.warnings).toEqual([]);
    expect(result.elements).toEqual([
      {
        id: "node-1",
        type: "rectangle",
        bounds: { x: 10, y: 20, width: 100, height: 40 },
        center: { x: 60, y: 40 },
        rotation: 0,
      },
    ]);
  });

  it("normalizes negative dimensions without moving the element center", () => {
    const result = normalizeExcalidrawElements([
      {
        id: "reversed",
        type: "rectangle",
        x: 110,
        y: 60,
        width: -100,
        height: -40,
        angle: 0,
      },
    ]);

    expect(result.elements[0]).toMatchObject({
      bounds: { x: 10, y: 20, width: 100, height: 40 },
      center: { x: 60, y: 40 },
    });
  });

  it("uses the axis-aligned bounds of a rotated element", () => {
    const result = normalizeExcalidrawElements([
      {
        id: "rotated",
        type: "rectangle",
        x: 0,
        y: 0,
        width: 100,
        height: 40,
        angle: Math.PI / 2,
      },
    ]);

    const element = result.elements[0];
    expect(element?.center).toEqual({ x: 50, y: 20 });
    expect(element?.rotation).toBe(Math.PI / 2);
    expect(element?.bounds.x).toBeCloseTo(30);
    expect(element?.bounds.y).toBeCloseTo(-30);
    expect(element?.bounds.width).toBeCloseTo(40);
    expect(element?.bounds.height).toBeCloseTo(100);
  });

  it("converts relative linear points to rotated absolute coordinates", () => {
    const result = normalizeExcalidrawElements([
      {
        id: "arrow-1",
        type: "arrow",
        x: 10,
        y: 20,
        width: 100,
        height: 0,
        angle: Math.PI / 2,
        points: [
          [0, 0],
          [100, 0],
        ],
      },
    ]);

    const points = result.elements[0]?.points;
    expect(points?.[0]?.x).toBeCloseTo(60);
    expect(points?.[0]?.y).toBeCloseTo(-30);
    expect(points?.[1]?.x).toBeCloseTo(60);
    expect(points?.[1]?.y).toBeCloseTo(70);
  });

  it("preserves relationship metadata needed by later graph extraction", () => {
    const result = normalizeExcalidrawElements([
      { id: "node-a", type: "rectangle", x: 0, y: 0, width: 10, height: 10 },
      { id: "node-b", type: "rectangle", x: 20, y: 0, width: 10, height: 10 },
      { id: "diamond-1", type: "diamond", x: 5, y: 6, width: 50, height: 20 },
      { id: "frame-1", type: "frame", x: 0, y: 0, width: 100, height: 100 },
      {
        id: "label-1",
        type: "text",
        x: 5,
        y: 6,
        width: 50,
        height: 20,
        text: "Approve?",
        containerId: "diamond-1",
        frameId: "frame-1",
        groupIds: ["inner-group", "outer-group"],
        startBinding: { elementId: "node-a" },
        endBinding: { elementId: "node-b" },
      },
    ]);

    expect(result.warnings).toEqual([]);
    expect(result.elements.find(({ id }) => id === "label-1")).toMatchObject({
      text: "Approve?",
      containerId: "diamond-1",
      frameId: "frame-1",
      groupIds: ["inner-group", "outer-group"],
      startBindingId: "node-a",
      endBindingId: "node-b",
    });
  });

  it("skips deleted and malformed elements while warning about malformed relationships", () => {
    const result = normalizeExcalidrawElements([
      {
        id: "deleted",
        type: "rectangle",
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        isDeleted: true,
      },
      {
        id: "broken",
        type: "rectangle",
        x: "not-a-number",
        y: 0,
        width: 20,
        height: 20,
      },
      {
        id: "arrow-bad-metadata",
        type: "arrow",
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        points: [[0, 0], ["bad", 20]],
        text: 42,
        frameId: 10,
        groupIds: ["valid-id", 3],
        startBinding: { elementId: 42 },
      },
    ]);

    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]).not.toHaveProperty("points");
    expect(result.elements[0]).not.toHaveProperty("startBindingId");
    expect(result.warnings).toEqual([
      {
        code: "invalid-element",
        elementIds: ["broken"],
        message: "Element has invalid identity or geometry and was skipped.",
        severity: "warning",
      },
      {
        code: "invalid-points",
        elementIds: ["arrow-bad-metadata"],
        message: "Element points are malformed and were ignored.",
        severity: "warning",
      },
      {
        code: "invalid-binding",
        elementIds: ["arrow-bad-metadata"],
        message: "Element binding is malformed and was ignored.",
        severity: "warning",
      },
      {
        code: "invalid-text",
        elementIds: ["arrow-bad-metadata"],
        message: "Element text is malformed and was ignored.",
        severity: "warning",
      },
      {
        code: "invalid-reference",
        elementIds: ["arrow-bad-metadata"],
        message: "Element container or frame reference is malformed and was ignored.",
        severity: "warning",
      },
      {
        code: "invalid-group-membership",
        elementIds: ["arrow-bad-metadata"],
        message: "Malformed group memberships were ignored; valid group IDs were retained.",
        severity: "warning",
      },
    ]);
  });

  it("rejects duplicate element IDs instead of resolving them ambiguously", () => {
    const result = normalizeExcalidrawElements([
      { id: "duplicate", type: "rectangle", x: 0, y: 0, width: 10, height: 10 },
      { id: "duplicate", type: "ellipse", x: 20, y: 0, width: 10, height: 10 },
    ]);

    expect(result.elements).toEqual([]);
    expect(result.warnings).toEqual([
      {
        code: "duplicate-element-id",
        elementIds: ["duplicate"],
        message: "Duplicate element ID is ambiguous; all matching elements were skipped.",
        severity: "warning",
      },
    ]);
  });

  it("omits relationships to missing or deleted elements", () => {
    const result = normalizeExcalidrawElements([
      { id: "active", type: "rectangle", x: 0, y: 0, width: 10, height: 10 },
      {
        id: "deleted-target",
        type: "frame",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        isDeleted: true,
      },
      {
        id: "label",
        type: "text",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        containerId: "missing-container",
        frameId: "deleted-target",
      },
      {
        id: "arrow",
        type: "arrow",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        startBinding: { elementId: "active" },
        endBinding: { elementId: "missing-node" },
      },
    ]);

    expect(result.elements.find(({ id }) => id === "label")).not.toHaveProperty("containerId");
    expect(result.elements.find(({ id }) => id === "label")).not.toHaveProperty("frameId");
    expect(result.elements.find(({ id }) => id === "arrow")).toMatchObject({
      startBindingId: "active",
    });
    expect(result.elements.find(({ id }) => id === "arrow")).not.toHaveProperty("endBindingId");
    expect(result.warnings).toEqual([
      {
        code: "unresolved-reference",
        elementIds: ["label", "missing-container", "deleted-target"],
        message: "Element container or frame target is missing or ambiguous and was ignored.",
        severity: "warning",
      },
      {
        code: "unresolved-binding",
        elementIds: ["arrow", "missing-node"],
        message: "Element binding target is missing or ambiguous and was ignored.",
        severity: "warning",
      },
    ]);
  });

  it("rejects blank identities and retains valid group IDs from mixed metadata", () => {
    const result = normalizeExcalidrawElements([
      { id: "target", type: "rectangle", x: 0, y: 0, width: 10, height: 10 },
      { id: "   ", type: "rectangle", x: 0, y: 0, width: 10, height: 10 },
      { id: "bad-type", type: "\t", x: 0, y: 0, width: 10, height: 10 },
      {
        id: "arrow",
        type: "arrow",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        containerId: " ",
        frameId: "target",
        groupIds: ["valid-group", "", 42],
        startBinding: { elementId: "" },
        endBinding: { elementId: "target" },
      },
    ]);

    const arrow = result.elements.find(({ id }) => id === "arrow");
    expect(arrow).toMatchObject({
      frameId: "target",
      groupIds: ["valid-group"],
      endBindingId: "target",
    });
    expect(arrow).not.toHaveProperty("containerId");
    expect(arrow).not.toHaveProperty("startBindingId");
    expect(result.warnings).toEqual([
      {
        code: "invalid-element",
        elementIds: [],
        message: "Element has invalid identity or geometry and was skipped.",
        severity: "warning",
      },
      {
        code: "invalid-element",
        elementIds: ["bad-type"],
        message: "Element has invalid identity or geometry and was skipped.",
        severity: "warning",
      },
      {
        code: "invalid-binding",
        elementIds: ["arrow"],
        message: "Element binding is malformed and was ignored.",
        severity: "warning",
      },
      {
        code: "invalid-reference",
        elementIds: ["arrow"],
        message: "Element container or frame reference is malformed and was ignored.",
        severity: "warning",
      },
      {
        code: "invalid-group-membership",
        elementIds: ["arrow"],
        message: "Malformed group memberships were ignored; valid group IDs were retained.",
        severity: "warning",
      },
    ]);
  });

  it("skips elements when derived bounds or centers overflow", () => {
    const result = normalizeExcalidrawElements([
      {
        id: "overflowed",
        type: "rectangle",
        x: Number.MAX_VALUE,
        y: 0,
        width: Number.MAX_VALUE,
        height: 10,
      },
    ]);

    expect(result.elements).toEqual([]);
    expect(result.warnings).toEqual([
      {
        code: "invalid-element",
        elementIds: ["overflowed"],
        message: "Element has invalid identity or geometry and was skipped.",
        severity: "warning",
      },
    ]);
  });

  it("ignores relative points whose absolute coordinates overflow", () => {
    const result = normalizeExcalidrawElements([
      {
        id: "overflowed-point",
        type: "arrow",
        x: Number.MAX_VALUE,
        y: 0,
        width: 0,
        height: 10,
        points: [[Number.MAX_VALUE, 0]],
      },
    ]);

    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]).not.toHaveProperty("points");
    expect(result.warnings).toEqual([
      {
        code: "invalid-points",
        elementIds: ["overflowed-point"],
        message: "Element points are malformed and were ignored.",
        severity: "warning",
      },
    ]);
  });
});
