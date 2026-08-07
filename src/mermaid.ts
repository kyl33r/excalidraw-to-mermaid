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
  const groupsByParent = new Map<string | undefined, typeof graph.groups>();
  for (const group of graph.groups) {
    const siblings = groupsByParent.get(group.parentGroupId) ?? [];
    siblings.push(group);
    groupsByParent.set(group.parentGroupId, siblings);
  }

  function renderGroup(group: (typeof graph.groups)[number], depth: number): void {
    const indent = "  ".repeat(depth);
    lines.push(`${indent}subgraph ${group.id}["${escapeLabel(group.label ?? group.id)}"]`);
    lines.push(`${indent}  direction ${graph.direction}`);
    const children = group.childNodeIds
      .map((id) => nodesById.get(id))
      .filter((node): node is GraphNode => node !== undefined)
      .sort(compareBounds);
    for (const node of children) {
      lines.push(`${indent}  ${renderNode(node)}`);
      renderedNodeIds.add(node.id);
    }
    for (const childGroup of [...(groupsByParent.get(group.id) ?? [])].sort(compareBounds)) {
      renderGroup(childGroup, depth + 1);
    }
    lines.push(`${indent}end`);
  }

  for (const group of [...(groupsByParent.get(undefined) ?? [])].sort(compareBounds)) {
    renderGroup(group, 1);
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
