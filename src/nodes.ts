import type {
  ConversionWarning,
  GraphNode,
  GraphNodeShape,
  NormalizedElement,
} from "./types.js";

export interface NodeExtractionOptions {
  includeStandaloneText?: boolean;
}

export interface NodeExtractionResult {
  nodes: GraphNode[];
  warnings: ConversionWarning[];
}

const NODE_SHAPES = new Set<GraphNodeShape>([
  "rectangle",
  "ellipse",
  "diamond",
]);

function isNodeShape(type: string): type is GraphNodeShape {
  return NODE_SHAPES.has(type as GraphNodeShape);
}

function mermaidNodeId(sourceId: string): string {
  return `n_${sourceId.replace(/[^A-Za-z0-9_]/g, "_")}`;
}

function utf16Hex(value: string): string {
  let encoded = "";
  for (let index = 0; index < value.length; index += 1) {
    encoded += value.charCodeAt(index).toString(16).padStart(4, "0");
  }
  return encoded;
}

function assignMermaidNodeIds(
  elements: NormalizedElement[],
): Map<string, string> {
  const baseCounts = new Map<string, number>();
  for (const element of elements) {
    const base = mermaidNodeId(element.id);
    baseCounts.set(base, (baseCounts.get(base) ?? 0) + 1);
  }

  return new Map(
    elements.map((element) => {
      const base = mermaidNodeId(element.id);
      const id =
        (baseCounts.get(base) ?? 0) > 1
          ? `n0_${utf16Hex(element.id)}`
          : base;
      return [element.id, id];
    }),
  );
}

function containsBounds(
  outer: NormalizedElement["bounds"],
  inner: NormalizedElement["bounds"],
): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function extractGraphNodes(
  elements: NormalizedElement[],
  options: NodeExtractionOptions = {},
): NodeExtractionResult {
  const shapeElements = elements.filter((element) => isNodeShape(element.type));
  const shapeIds = new Set(shapeElements.map(({ id }) => id));
  const arrowTargetIds = new Set(
    elements
      .filter(({ type }) => type === "arrow")
      .flatMap(({ startBindingId, endBindingId }) =>
        [startBindingId, endBindingId].filter(
          (id): id is string => id !== undefined,
        ),
      ),
  );

  const candidates = elements.filter((element) => {
    if (isNodeShape(element.type)) {
      return true;
    }
    if (element.type !== "text" || element.text === undefined) {
      return false;
    }
    const isEnabled =
      options.includeStandaloneText === true || arrowTargetIds.has(element.id);
    const isExplicitlyContained =
      element.containerId !== undefined && shapeIds.has(element.containerId);
    const isGeometricallyContained = shapeElements.some((shape) =>
      containsBounds(shape.bounds, element.bounds),
    );
    return isEnabled && !isExplicitlyContained && !isGeometricallyContained;
  });
  const candidateIdCounts = new Map<string, number>();
  for (const candidate of candidates) {
    candidateIdCounts.set(
      candidate.id,
      (candidateIdCounts.get(candidate.id) ?? 0) + 1,
    );
  }
  const duplicateIds = new Set(
    [...candidateIdCounts]
      .filter(([, count]) => count > 1)
      .map(([id]) => id),
  );
  const uniqueCandidates = candidates.filter(
    ({ id }) => !duplicateIds.has(id),
  );
  const nodeIds = assignMermaidNodeIds(uniqueCandidates);

  const nodes = uniqueCandidates.map<GraphNode>((element) => {
    const isText = element.type === "text";
    return {
      id: nodeIds.get(element.id) ?? mermaidNodeId(element.id),
      sourceElementIds: [element.id],
      label: isText ? (element.text ?? "") : "",
      shape: isText ? "state" : (element.type as GraphNodeShape),
      bounds: { ...element.bounds },
      confidence: 1,
    };
  });

  const warnings: ConversionWarning[] = [...duplicateIds].map((id) => ({
    code: "duplicate-node-source-id",
    elementIds: [id],
    message:
      "Duplicate node source ID is ambiguous; all matching candidates were skipped.",
    severity: "warning",
  }));

  return { nodes, warnings };
}
