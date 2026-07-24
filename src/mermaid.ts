import type {
  Bounds,
  DiagramGraph,
  GraphEdge,
  GraphNode,
} from "./types.js";

function escapeLabel(label: string): string {
  return label
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/\r?\n/g, "<br/>");
}

function compareBounds(
  left: { id: string; bounds: Bounds },
  right: { id: string; bounds: Bounds },
): number {
  return (
    left.bounds.y - right.bounds.y ||
    left.bounds.x - right.bounds.x ||
    left.id.localeCompare(right.id)
  );
}

function renderNode(node: GraphNode): string {
  const label = `"${escapeLabel(node.label)}"`;
  switch (node.shape) {
    case "ellipse":
      return `${node.id}([${label}])`;
    case "diamond":
      return `${node.id}{${label}}`;
    case "rectangle":
    case "state":
      return `${node.id}[${label}]`;
  }
}

function renderEdge(edge: GraphEdge): string | undefined {
  if (!edge.sourceNodeId || !edge.targetNodeId) {
    return undefined;
  }
  const connector = edge.directed ? "-->" : "---";
  const label = edge.label ? `|"${escapeLabel(edge.label)}"|` : "";
  return `${edge.sourceNodeId} ${connector}${label} ${edge.targetNodeId}`;
}

export function generateMermaid(graph: DiagramGraph): string {
  const lines = [`flowchart ${graph.direction}`];
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const renderedNodeIds = new Set<string>();

  for (const group of [...graph.groups].sort(compareBounds)) {
    lines.push(`  subgraph ${group.id}["${escapeLabel(group.label ?? group.id)}"]`);
    lines.push(`    direction ${graph.direction}`);
    const children = group.childNodeIds
      .map((id) => nodesById.get(id))
      .filter((node): node is GraphNode => node !== undefined)
      .sort(compareBounds);
    for (const node of children) {
      lines.push(`    ${renderNode(node)}`);
      renderedNodeIds.add(node.id);
    }
    lines.push("  end");
  }

  for (const node of [...graph.nodes].sort(compareBounds)) {
    if (!renderedNodeIds.has(node.id)) {
      lines.push(`  ${renderNode(node)}`);
    }
  }

  for (const edge of [...graph.edges].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    const rendered = renderEdge(edge);
    if (rendered) {
      lines.push(`  ${rendered}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
