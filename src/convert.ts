import { buildDiagramGraph } from "./graph.js";
import type { BuildDiagramGraphOptions } from "./graph.js";
import { parseExcalidrawJson } from "./input.js";
import { generateMermaid } from "./mermaid.js";
import { normalizeExcalidrawElements } from "./normalize.js";
import type { DiagramGraph } from "./types.js";

export interface ConvertExcalidrawOptions extends BuildDiagramGraphOptions {
  maxInputBytes?: number;
}

export interface MermaidConversionResult {
  graph: DiagramGraph;
  mermaid: string;
}

export function convertExcalidrawToMermaid(
  input: string,
  options: ConvertExcalidrawOptions = {},
): MermaidConversionResult {
  const parsed = parseExcalidrawJson(
    input,
    options.maxInputBytes === undefined
      ? undefined
      : { maxInputBytes: options.maxInputBytes },
  );
  const normalized = normalizeExcalidrawElements(parsed.elements);
  const graph = buildDiagramGraph(normalized.elements, options);
  graph.warnings = [...normalized.warnings, ...graph.warnings];
  return { graph, mermaid: generateMermaid(graph) };
}
