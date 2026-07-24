import { describe, expect, it } from "vitest";

import {
  ConversionInputError,
  parseExcalidrawJson,
} from "../src/input.js";

describe("parseExcalidrawJson", () => {
  it("accepts a full Excalidraw document and records source metadata", () => {
    const result = parseExcalidrawJson(
      JSON.stringify({
        type: "excalidraw",
        version: 2,
        source: "https://excalidraw.com",
        elements: [{ id: "node-1", type: "rectangle", isDeleted: false }],
        appState: { theme: "light" },
        files: {},
        futureField: "preserved",
      }),
    );

    expect(result.documentType).toBe("excalidraw");
    expect(result.schemaVersion).toBe(2);
    expect(result.source).toBe("https://excalidraw.com");
    expect(result.elements).toEqual([
      { id: "node-1", type: "rectangle", isDeleted: false },
    ]);
    expect(result.raw.futureField).toBe("preserved");
  });

  it("rejects malformed JSON with a stable error code", () => {
    expect(() => parseExcalidrawJson("{"))
      .toThrowError(
        expect.objectContaining<Partial<ConversionInputError>>({
          code: "invalid-json",
        }),
      );
  });

  it.each([
    ["null", "invalid-document"],
    ["[]", "invalid-document"],
    [JSON.stringify({ type: "other", elements: [] }), "unsupported-document-type"],
    [JSON.stringify({ type: "excalidraw" }), "invalid-elements"],
    [JSON.stringify({ type: "excalidraw", elements: {} }), "invalid-elements"],
  ])("rejects invalid top-level document structure: %s", (input, code) => {
    expect(() => parseExcalidrawJson(input)).toThrowError(
      expect.objectContaining<Partial<ConversionInputError>>({ code }),
    );
  });

  it("accepts clipboard JSON and excludes deleted elements", () => {
    const result = parseExcalidrawJson(
      JSON.stringify({
        type: "excalidraw/clipboard",
        elements: [
          { id: "kept", type: "ellipse" },
          { id: "deleted", type: "rectangle", isDeleted: true },
        ],
      }),
    );

    expect(result.documentType).toBe("excalidraw/clipboard");
    expect(result.elements).toEqual([{ id: "kept", type: "ellipse" }]);
  });

  it("rejects input whose UTF-8 byte length exceeds the configured limit", () => {
    const input = JSON.stringify({
      type: "excalidraw",
      elements: [],
      padding: "💥",
    });

    expect(() =>
      parseExcalidrawJson(input, { maxInputBytes: Buffer.byteLength(input) - 1 }),
    ).toThrowError(
      expect.objectContaining<Partial<ConversionInputError>>({
        code: "input-too-large",
      }),
    );
  });

  it("rejects non-object entries in the elements array", () => {
    const input = JSON.stringify({
      type: "excalidraw",
      elements: [null],
    });

    expect(() => parseExcalidrawJson(input)).toThrowError(
      expect.objectContaining<Partial<ConversionInputError>>({
        code: "invalid-element",
      }),
    );
  });
});
