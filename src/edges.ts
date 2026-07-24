import type {
  ConversionWarning,
  GraphEdge,
  GraphNode,
  NormalizedElement,
} from "./types.js";

export interface EdgeExtractionOptions {
  assignedTextElementIds?: string[];
  snapDistance?: number;
}

export interface EdgeExtractionResult {
  edges: GraphEdge[];
  warnings: ConversionWarning[];
  assignedTextElementIds: string[];
}

function mermaidEdgeId(sourceId: string): string {
  return `e_${sourceId.replace(/[^A-Za-z0-9_]/g, "_")}`;
}

function pointToBoundsDistance(
  point: { x: number; y: number },
  bounds: GraphNode["bounds"],
): number {
  const horizontal = Math.max(
    bounds.x - point.x,
    point.x - (bounds.x + bounds.width),
    0,
  );
  const vertical = Math.max(
    bounds.y - point.y,
    point.y - (bounds.y + bounds.height),
    0,
  );
  return Math.hypot(horizontal, vertical);
}

function resolveGeometricNode(
  point: { x: number; y: number } | undefined,
  nodes: GraphNode[],
  snapDistance: number,
): GraphNode | undefined {
  if (!point) {
    return undefined;
  }
  const ranked = nodes
    .map((node) => ({ node, distance: pointToBoundsDistance(point, node.bounds) }))
    .filter(({ distance }) => distance <= snapDistance)
    .sort(
      (left, right) =>
        left.distance - right.distance || left.node.id.localeCompare(right.node.id),
    );
  const first = ranked[0];
  const second = ranked[1];
  if (!first || (second && Math.abs(first.distance - second.distance) < 1e-9)) {
    return undefined;
  }
  return first.node;
}

export function extractGraphEdges(
  nodes: GraphNode[],
  elements: NormalizedElement[],
  options: EdgeExtractionOptions = {},
): EdgeExtractionResult {
  const warnings: ConversionWarning[] = [];
  const assignedTextIds = new Set(options.assignedTextElementIds ?? []);
  const snapDistance = options.snapDistance ?? 24;
  const nodeBySourceId = new Map<string, GraphNode>();
  for (const node of nodes) {
    for (const sourceId of node.sourceElementIds) {
      nodeBySourceId.set(sourceId, node);
    }
  }

  const edges: GraphEdge[] = [];
  for (const element of elements) {
    if (element.type !== "arrow" && element.type !== "line") {
      continue;
    }
    const explicitSourceNode =
      element.startBindingId === undefined
        ? undefined
        : nodeBySourceId.get(element.startBindingId);
    const explicitTargetNode =
      element.endBindingId === undefined
        ? undefined
        : nodeBySourceId.get(element.endBindingId);
    const sourceNode =
      explicitSourceNode ??
      resolveGeometricNode(element.points?.[0], nodes, snapDistance);
    const targetNode =
      explicitTargetNode ??
      resolveGeometricNode(element.points?.at(-1), nodes, snapDistance);
    if (!sourceNode || !targetNode) {
      warnings.push({
        code: "unresolved-edge-endpoint",
        elementIds: [element.id],
        message: "Edge endpoints were missing or ambiguous; the edge was omitted.",
        severity: "warning",
      });
      continue;
    }

    const labels = elements
      .filter(
        (candidate) =>
          candidate.type === "text" &&
          candidate.text !== undefined &&
          candidate.containerId === element.id &&
          !assignedTextIds.has(candidate.id),
      )
      .sort(
        (left, right) =>
          left.bounds.y - right.bounds.y ||
          left.bounds.x - right.bounds.x ||
          left.id.localeCompare(right.id),
      );
    for (const label of labels) {
      assignedTextIds.add(label.id);
    }

    const edge: GraphEdge = {
      id: mermaidEdgeId(element.id),
      sourceElementIds: [element.id, ...labels.map(({ id }) => id)],
      sourceNodeId: sourceNode.id,
      targetNodeId: targetNode.id,
      directed: element.type === "arrow",
      confidence: explicitSourceNode && explicitTargetNode ? 1 : 0.75,
    };
    if (labels.length > 0) {
      edge.label = labels.map(({ text }) => text ?? "").join("\n");
    }
    edges.push(edge);
  }

  return {
    edges,
    warnings,
    assignedTextElementIds: [...assignedTextIds],
  };
}
