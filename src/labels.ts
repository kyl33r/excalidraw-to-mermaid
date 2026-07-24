import type {
  ConversionWarning,
  GraphNode,
  NormalizedElement,
} from "./types.js";

export interface LabelResolutionResult {
  nodes: GraphNode[];
  warnings: ConversionWarning[];
  assignedTextElementIds: string[];
}

function containsBounds(
  outer: GraphNode["bounds"],
  inner: NormalizedElement["bounds"],
): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function overlapRatio(
  outer: GraphNode["bounds"],
  inner: NormalizedElement["bounds"],
): number {
  const width = Math.max(
    0,
    Math.min(outer.x + outer.width, inner.x + inner.width) -
      Math.max(outer.x, inner.x),
  );
  const height = Math.max(
    0,
    Math.min(outer.y + outer.height, inner.y + inner.height) -
      Math.max(outer.y, inner.y),
  );
  const innerArea = inner.width * inner.height;
  return innerArea > 0 ? (width * height) / innerArea : 0;
}

function boundsDistance(
  left: GraphNode["bounds"],
  right: NormalizedElement["bounds"],
): number {
  const horizontal = Math.max(
    left.x - (right.x + right.width),
    right.x - (left.x + left.width),
    0,
  );
  const vertical = Math.max(
    left.y - (right.y + right.height),
    right.y - (left.y + left.height),
    0,
  );
  return Math.hypot(horizontal, vertical);
}

export function resolveNodeLabels(
  nodes: GraphNode[],
  elements: NormalizedElement[],
): LabelResolutionResult {
  const assignedTextIds = new Set<string>();
  const warnings: ConversionWarning[] = [];
  const textElements = elements.filter(
    (element) => element.type === "text" && element.text !== undefined,
  );

  const resolvedNodes = nodes.map((node, index) => {
    const sourceIds = new Set(node.sourceElementIds);
    const availableText = textElements.filter(
      (text) => !assignedTextIds.has(text.id),
    );
    const explicitMatches = availableText.filter(
      (text) =>
        text.containerId !== undefined && sourceIds.has(text.containerId),
    );
    const containedMatches = availableText.filter((text) =>
      containsBounds(node.bounds, text.bounds),
    );
    const overlappingMatches = availableText.filter(
      (text) => overlapRatio(node.bounds, text.bounds) >= 0.5,
    );
    const nearest = [...availableText].sort(
      (left, right) =>
        boundsDistance(node.bounds, left.bounds) -
          boundsDistance(node.bounds, right.bounds) ||
        left.id.localeCompare(right.id),
    )[0];
    const nearestMatches =
      nearest !== undefined && boundsDistance(node.bounds, nearest.bounds) <= 40
        ? [nearest]
        : [];
    const usedNearest =
      explicitMatches.length === 0 &&
      containedMatches.length === 0 &&
      overlappingMatches.length === 0 &&
      nearestMatches.length > 0;
    const matches = (
      explicitMatches.length > 0
        ? explicitMatches
        : containedMatches.length > 0
          ? containedMatches
          : overlappingMatches.length > 0
            ? overlappingMatches
            : nearestMatches
    ).sort(
      (left, right) =>
        left.bounds.y - right.bounds.y ||
        left.bounds.x - right.bounds.x ||
        left.id.localeCompare(right.id),
    );

    if (matches.length === 0) {
      warnings.push({
        code: "generated-node-label",
        elementIds: [...node.sourceElementIds],
        message: "Node had no associated text; a fallback label was generated.",
        severity: "info",
      });
      return { ...node, label: `Unnamed node ${index + 1}` };
    }

    for (const text of matches) {
      assignedTextIds.add(text.id);
    }
    if (usedNearest) {
      warnings.push({
        code: "low-confidence-node-label",
        elementIds: [...node.sourceElementIds, ...matches.map(({ id }) => id)],
        message: "Node label was assigned from nearby unbound text.",
        severity: "warning",
      });
    }
    return {
      ...node,
      label: matches.map(({ text }) => text ?? "").join("\n"),
    };
  });

  return {
    nodes: resolvedNodes,
    warnings,
    assignedTextElementIds: [...assignedTextIds],
  };
}
