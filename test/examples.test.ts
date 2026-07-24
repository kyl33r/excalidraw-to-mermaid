import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  extractGraphNodes,
  normalizeExcalidrawElements,
  parseExcalidrawJson,
} from "../src/index.js";

const examples = [
  {
    file: "01-basic-flow.excalidraw",
    nodeCount: 4,
    shapes: ["rectangle", "rectangle", "diamond", "ellipse"],
  },
  {
    file: "02-branching-flow.excalidraw",
    nodeCount: 5,
    shapes: ["ellipse", "diamond", "rectangle", "rectangle", "ellipse"],
  },
  {
    file: "03-grouped-process.excalidraw",
    nodeCount: 3,
    shapes: ["rectangle", "rectangle", "rectangle"],
  },
  {
    file: "04-quant-agent.excalidraw",
    nodeCount: 23,
    shapes: Array.from({ length: 23 }, () => "rectangle"),
  },
] as const;

describe("example Excalidraw documents", () => {
  it.each(examples)(
    "$file parses, normalizes, and exposes the expected node candidates",
    async ({ file, nodeCount, shapes }) => {
      const raw = await readFile(new URL(`../examples/${file}`, import.meta.url), "utf8");
      const parsed = parseExcalidrawJson(raw);
      const normalized = normalizeExcalidrawElements(parsed.elements);
      const extracted = extractGraphNodes(normalized.elements);

      expect(parsed.documentType).toBe("excalidraw");
      expect(normalized.warnings).toEqual([]);
      expect(extracted.warnings).toEqual([]);
      expect(extracted.nodes).toHaveLength(nodeCount);
      expect(extracted.nodes.map(({ shape }) => shape)).toEqual(shapes);
      expect(parsed.elements.some(({ type }) => type === "text")).toBe(true);
      expect(parsed.elements.some(({ type }) => type === "arrow")).toBe(true);
    },
  );
});
