import { buildDiagramGraph } from "./graph.js";
import type { BuildDiagramGraphOptions } from "./graph.js";
import { parseExcalidrawJson } from "./input.js";
import { generateMermaid } from "./mermaid.js";
import { buildSequenceDiagram, generateSequenceMermaid } from "./sequence.js";
import { normalizeExcalidrawElements } from "./normalize.js";
import type { DiagramGraph, DiagramMode, SequenceDiagram } from "./types.js";

export interface ConvertExcalidrawOptions extends BuildDiagramGraphOptions {
  maxInputBytes?: number;
  mode?: DiagramMode;
}

export interface MermaidConversionResult {
  graph: DiagramGraph;
  mermaid: string;
  mode: DiagramMode;
  sequence?: SequenceDiagram;
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
  const mode = options.mode ?? "flowchart";
  if (mode === "sequence") {
    const sequence = buildSequenceDiagram(graph, normalized.elements);
    graph.warnings = sequence.warnings;
    return { graph, mermaid: generateSequenceMermaid(sequence), mode, sequence };
  }
  return { graph, mermaid: generateMermaid(graph), mode };
}
