import type { DiagramGraph, NormalizedElement, SequenceDiagram } from "./types.js";

function escape(value: string): string {
  return value.replaceAll(":", "&#58;").replace(/\r?\n/g, "<br/>");
}

export function buildSequenceDiagram(
  graph: DiagramGraph,
  elements: NormalizedElement[],
): SequenceDiagram {
  const participants = [...graph.nodes]
    .sort((a, b) => a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y || a.id.localeCompare(b.id))
    .map(({ id, label, sourceElementIds, bounds }) => ({ id, label, sourceElementIds, bounds }));
  const byId = new Map(participants.map((participant) => [participant.id, participant]));
  const elementById = new Map(elements.map((element) => [element.id, element]));
  const warnings = [...graph.warnings];
  const messages = graph.edges.flatMap((edge) => {
    const source = edge.sourceNodeId ? byId.get(edge.sourceNodeId) : undefined;
    const target = edge.targetNodeId ? byId.get(edge.targetNodeId) : undefined;
    const element = elementById.get(edge.sourceElementIds[0] ?? "");
    if (!source || !target || !element) return [];
    if (!edge.directed || !edge.label) {
      warnings.push({ code: "sequence-omitted-message", elementIds: edge.sourceElementIds, message: "Sequence messages must be labelled directed arrows; the edge was omitted.", severity: "warning" });
      return [];
    }
    const sourceCenter = source.bounds.x + source.bounds.width / 2;
    const targetCenter = target.bounds.x + target.bounds.width / 2;
    if (source.id === target.id || Math.abs(sourceCenter - targetCenter) < 1) {
      warnings.push({ code: "sequence-ambiguous-message", elementIds: edge.sourceElementIds, message: "Sequence message direction was ambiguous; the edge was omitted.", severity: "warning" });
      return [];
    }
    return [{ id: edge.id, sourceParticipantId: source.id, targetParticipantId: target.id, label: edge.label, kind: sourceCenter < targetCenter ? "call" as const : "return" as const, order: element.center.y }];
  }).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return { participants, messages, warnings };
}

export function generateSequenceMermaid(diagram: SequenceDiagram): string {
  const lines = ["sequenceDiagram"];
  for (const participant of diagram.participants) lines.push(`  participant ${participant.id} as ${escape(participant.label)}`);
  for (const message of diagram.messages) lines.push(`  ${message.sourceParticipantId}${message.kind === "call" ? "->>" : "-->>"}${message.targetParticipantId}: ${escape(message.label)}`);
  return `${lines.join("\n")}\n`;
}
