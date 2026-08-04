export type ExcalidrawDocumentType = "excalidraw" | "excalidraw/clipboard";

export interface ParsedExcalidrawDocument {
  documentType: ExcalidrawDocumentType;
  schemaVersion?: number;
  source?: string;
  elements: Record<string, unknown>[];
  raw: Record<string, unknown>;
}

export class ConversionInputError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ConversionInputError";
  }
}

export interface ParseExcalidrawOptions {
  maxInputBytes?: number;
}

export const DEFAULT_MAX_INPUT_BYTES = 10 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseExcalidrawJson(
  input: string,
  options: ParseExcalidrawOptions = {},
): ParsedExcalidrawDocument {
  const maxInputBytes = options.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES;
  if (
    !Number.isFinite(maxInputBytes) ||
    maxInputBytes < 0 ||
    new TextEncoder().encode(input).byteLength > maxInputBytes
  ) {
    throw new ConversionInputError(
      "input-too-large",
      `Input exceeds the ${maxInputBytes}-byte limit.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input) as unknown;
  } catch {
    throw new ConversionInputError("invalid-json", "Input is not valid JSON.");
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ConversionInputError(
      "invalid-document",
      "The top-level Excalidraw document must be an object.",
    );
  }

  const raw = parsed as Record<string, unknown>;
  if (raw.type !== "excalidraw" && raw.type !== "excalidraw/clipboard") {
    throw new ConversionInputError(
      "unsupported-document-type",
      "Expected an Excalidraw file or clipboard document.",
    );
  }
  if (!Array.isArray(raw.elements)) {
    throw new ConversionInputError(
      "invalid-elements",
      "The Excalidraw document must contain an elements array.",
    );
  }
  if (!raw.elements.every(isRecord)) {
    throw new ConversionInputError(
      "invalid-element",
      "Every Excalidraw element must be an object.",
    );
  }

  return {
    documentType: raw.type as ExcalidrawDocumentType,
    ...(typeof raw.version === "number" ? { schemaVersion: raw.version } : {}),
    ...(typeof raw.source === "string" ? { source: raw.source } : {}),
    elements: raw.elements.filter(
      (element): element is Record<string, unknown> =>
        element !== null &&
        typeof element === "object" &&
        !Array.isArray(element) &&
        (element as Record<string, unknown>).isDeleted !== true,
    ),
    raw,
  };
}
