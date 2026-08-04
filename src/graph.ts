import { extractGraphEdges } from "./edges.js";
import { resolveNodeLabels } from "./labels.js";
import { extractGraphNodes } from "./nodes.js";
import type {
  DiagramDirection,
  DiagramGraph,
  GraphEdge,
  GraphGroup,
  GraphNode,
  NormalizedElement,
} from "./types.js";

export interface BuildDiagramGraphOptions {
  direction?: DiagramDirection;
  includeStandaloneText?: boolean;
  snapDistance?: number;
}

function groupId(sourceId: string): string {
  return `g_${sourceId.replace(/[^A-Za-z0-9_]/g, "_")}`;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted[middle];
  if (value === undefined) {
    return 0;
  }
  if (sorted.length % 2 === 1) {
    return value;
  }
  return ((sorted[middle - 1] ?? value) + value) / 2;
}

function inferDirection(nodes: GraphNode[], edges: GraphEdge[]): DiagramDirection {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const horizontal: number[] = [];
  const vertical: number[] = [];
  for (const edge of edges) {
    const source = edge.sourceNodeId
      ? nodeById.get(edge.sourceNodeId)
      : undefined;
    const target = edge.targetNodeId
      ? nodeById.get(edge.targetNodeId)
      : undefined;
    if (!source || !target) {
      continue;
    }
    const sourceCenter = {
      x: source.bounds.x + source.bounds.width / 2,
      y: source.bounds.y + source.bounds.height / 2,
    };
    const targetCenter = {
      x: target.bounds.x + target.bounds.width / 2,
      y: target.bounds.y + target.bounds.height / 2,
    };
    horizontal.push(Math.abs(targetCenter.x - sourceCenter.x));
    vertical.push(Math.abs(targetCenter.y - sourceCenter.y));
  }
  return median(horizontal) > median(vertical) * 1.2 ? "LR" : "TB";
}

export function buildDiagramGraph(
  elements: NormalizedElement[],
  options: BuildDiagramGraphOptions = {},
): DiagramGraph {
  const nodeCandidates = extractGraphNodes(
    elements,
    options.includeStandaloneText === undefined
      ? {}
      : { includeStandaloneText: options.includeStandaloneText },
  );
  const labels = resolveNodeLabels(nodeCandidates.nodes, elements);
  const edgeResult = extractGraphEdges(labels.nodes, elements, {
    assignedTextElementIds: labels.assignedTextElementIds,
    ...(options.snapDistance === undefined
      ? {}
      : { snapDistance: options.snapDistance }),
  });

  const elementById = new Map(elements.map((element) => [element.id, element]));
  const frames = elements.filter(({ type }) => type === "frame");
  const frameIdMap = new Map(frames.map((frame) => [frame.id, groupId(frame.id)]));
  const nodes = labels.nodes.map((node) => {
    const source = elementById.get(node.sourceElementIds[0] ?? "");
    const parentGroupId = source?.frameId
      ? frameIdMap.get(source.frameId)
      : undefined;
    return parentGroupId ? { ...node, parentGroupId } : node;
  });
  const groups: GraphGroup[] = frames.map((frame) => {
    const id = frameIdMap.get(frame.id) ?? groupId(frame.id);
    return {
      id,
      label: frame.name ?? frame.text ?? frame.id,
      childNodeIds: nodes
        .filter(({ parentGroupId }) => parentGroupId === id)
        .map(({ id: nodeId }) => nodeId),
      bounds: { ...frame.bounds },
    };
  });

  return {
    id: "diagram",
    direction: options.direction ?? inferDirection(nodes, edgeResult.edges),
    nodes,
    edges: edgeResult.edges,
    groups,
    warnings: [
      ...nodeCandidates.warnings,
      ...labels.warnings,
      ...edgeResult.warnings,
    ],
  };
}
