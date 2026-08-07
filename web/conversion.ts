import { convertExcalidrawToMermaid } from "../src/convert.js";
import type {
  ConversionWarning,
  DiagramMode,
  MermaidConversionResult,
} from "../src/index.js";

export const AUTHORING_ELEMENT_TYPES = new Set([
  "rectangle",
  "ellipse",
  "diamond",
  "arrow",
  "text",
  "frame",
]);

const NODE_ELEMENT_TYPES = new Set(["rectangle", "ellipse", "diamond"]);

interface ExcalidrawSceneRecord {
  elements: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface WorkspaceConversionResult extends MermaidConversionResult {
  unsupportedWarnings: ConversionWarning[];
}

function parseScene(serializedScene: string): ExcalidrawSceneRecord {
  const value: unknown = JSON.parse(serializedScene);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The Excalidraw scene must be a JSON object.");
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.elements)) {
    throw new Error("The Excalidraw scene must contain an elements array.");
  }
  const elements = record.elements.filter(
    (element): element is Record<string, unknown> =>
      element !== null && typeof element === "object" && !Array.isArray(element),
  );
  return { ...record, elements };
}

function unsupportedWarnings(
  elements: Record<string, unknown>[],
): ConversionWarning[] {
  const byType = new Map<string, string[]>();
  for (const element of elements) {
    if (element.isDeleted === true) {
      continue;
    }
    const type = typeof element.type === "string" ? element.type : "unknown";
    if (AUTHORING_ELEMENT_TYPES.has(type)) {
      continue;
    }
    const ids = byType.get(type) ?? [];
    if (typeof element.id === "string") {
      ids.push(element.id);
    }
    byType.set(type, ids);
  }
  return [...byType]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([type, elementIds]) => ({
      code: "unsupported-source-element",
      elementIds,
      message: `Elements of type "${type}" remain visible in the source but are excluded from conversion.`,
      severity: "warning" as const,
    }));
}

export function hasConvertibleNode(serializedScene: string): boolean {
  return parseScene(serializedScene).elements.some(
    (element) =>
      element.isDeleted !== true &&
      typeof element.type === "string" &&
      NODE_ELEMENT_TYPES.has(element.type),
  );
}

export function convertWorkspaceScene(
  serializedScene: string,
  mode: DiagramMode = "flowchart",
): WorkspaceConversionResult {
  const scene = parseScene(serializedScene);
  const warnings = unsupportedWarnings(scene.elements);
  const supportedElements = scene.elements.filter(
    (element) =>
      element.isDeleted === true ||
      (typeof element.type === "string" &&
        AUTHORING_ELEMENT_TYPES.has(element.type)),
  );
  const conversion = convertExcalidrawToMermaid(
    JSON.stringify({ ...scene, elements: supportedElements }),
    { mode },
  );
  const allWarnings = [...conversion.graph.warnings, ...warnings];
  conversion.graph.warnings = allWarnings;
  if (conversion.sequence) {
    conversion.sequence.warnings = allWarnings;
  }
  return { ...conversion, unsupportedWarnings: warnings };
}
