import type {
  Bounds,
  ConversionWarning,
  NormalizedElement,
  Point,
} from "./types.js";

export interface NormalizationResult {
  elements: NormalizedElement[];
  warnings: ConversionWarning[];
}

function rotatePoint(point: Point, center: Point, angle: number): Point {
  if (angle === 0) {
    return point;
  }

  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const offsetX = point.x - center.x;
  const offsetY = point.y - center.y;

  return {
    x: center.x + offsetX * cosine - offsetY * sine,
    y: center.y + offsetX * sine + offsetY * cosine,
  };
}

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function isFiniteBounds(bounds: Bounds): boolean {
  return (
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height)
  );
}

function getRotatedBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  center: Point,
  angle: number,
): Bounds {
  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ].map((point) => rotatePoint(point, center, angle));
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function normalizePoints(
  value: unknown,
  origin: Point,
  center: Point,
  angle: number,
): Point[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const points: Point[] = [];
  for (const point of value) {
    if (
      !Array.isArray(point) ||
      point.length < 2 ||
      typeof point[0] !== "number" ||
      !Number.isFinite(point[0]) ||
      typeof point[1] !== "number" ||
      !Number.isFinite(point[1])
    ) {
      return undefined;
    }
    const absolutePoint = { x: origin.x + point[0], y: origin.y + point[1] };
    const rotatedPoint = rotatePoint(absolutePoint, center, angle);
    if (!isFinitePoint(absolutePoint) || !isFinitePoint(rotatedPoint)) {
      return undefined;
    }
    points.push(rotatedPoint);
  }

  return points;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function nonBlankString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function bindingElementId(value: unknown): string | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return nonBlankString((value as Record<string, unknown>).elementId);
}

function groupIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((id): id is string => nonBlankString(id) !== undefined);
}

export function normalizeExcalidrawElements(
  sourceElements: Record<string, unknown>[],
): NormalizationResult {
  const elements: NormalizedElement[] = [];
  const warnings: ConversionWarning[] = [];
  const idCounts = new Map<string, number>();

  for (const element of sourceElements) {
    if (element.isDeleted === true) {
      continue;
    }
    const id = nonBlankString(element.id);
    if (id !== undefined) {
      idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
    }
  }

  const duplicateIds = new Set(
    [...idCounts].filter(([, count]) => count > 1).map(([id]) => id),
  );
  for (const id of duplicateIds) {
    warnings.push({
      code: "duplicate-element-id",
      elementIds: [id],
      message:
        "Duplicate element ID is ambiguous; all matching elements were skipped.",
      severity: "warning",
    });
  }

  for (const element of sourceElements) {
    if (element.isDeleted === true) {
      continue;
    }

    const id = nonBlankString(element.id);
    const type = nonBlankString(element.type);
    const geometry = [element.x, element.y, element.width, element.height];
    const hasValidGeometry = geometry.every(
      (value) => typeof value === "number" && Number.isFinite(value),
    );
    const hasValidRotation =
      element.angle === undefined ||
      (typeof element.angle === "number" && Number.isFinite(element.angle));

    if (!id || !type || !hasValidGeometry || !hasValidRotation) {
      warnings.push({
        code: "invalid-element",
        elementIds: id ? [id] : [],
        message: "Element has invalid identity or geometry and was skipped.",
        severity: "warning",
      });
      continue;
    }
    if (duplicateIds.has(id)) {
      continue;
    }

    const x = element.x as number;
    const y = element.y as number;
    const width = element.width as number;
    const height = element.height as number;
    const rotation = typeof element.angle === "number" ? element.angle : 0;
    const center = { x: x + width / 2, y: y + height / 2 };
    const bounds = getRotatedBounds(x, y, width, height, center, rotation);
    if (!isFinitePoint(center) || !isFiniteBounds(bounds)) {
      warnings.push({
        code: "invalid-element",
        elementIds: [id],
        message: "Element has invalid identity or geometry and was skipped.",
        severity: "warning",
      });
      continue;
    }
    const points = normalizePoints(element.points, { x, y }, center, rotation);
    const groups = groupIds(element.groupIds);
    const text = optionalString(element.text);
    const containerId = nonBlankString(element.containerId);
    const frameId = nonBlankString(element.frameId);
    const startBindingId = bindingElementId(element.startBinding);
    const endBindingId = bindingElementId(element.endBinding);

    if (element.points !== undefined && points === undefined) {
      warnings.push({
        code: "invalid-points",
        elementIds: [id],
        message: "Element points are malformed and were ignored.",
        severity: "warning",
      });
    }
    if (
      (element.startBinding !== undefined &&
        element.startBinding !== null &&
        startBindingId === undefined) ||
      (element.endBinding !== undefined &&
        element.endBinding !== null &&
        endBindingId === undefined)
    ) {
      warnings.push({
        code: "invalid-binding",
        elementIds: [id],
        message: "Element binding is malformed and was ignored.",
        severity: "warning",
      });
    }

    if (element.text !== undefined && text === undefined) {
      warnings.push({
        code: "invalid-text",
        elementIds: [id],
        message: "Element text is malformed and was ignored.",
        severity: "warning",
      });
    }
    if (
      (element.containerId !== undefined &&
        element.containerId !== null &&
        containerId === undefined) ||
      (element.frameId !== undefined &&
        element.frameId !== null &&
        frameId === undefined)
    ) {
      warnings.push({
        code: "invalid-reference",
        elementIds: [id],
        message:
          "Element container or frame reference is malformed and was ignored.",
        severity: "warning",
      });
    }
    if (
      element.groupIds !== undefined &&
      (!Array.isArray(element.groupIds) ||
        groups === undefined ||
        groups.length !== element.groupIds.length)
    ) {
      warnings.push({
        code: "invalid-group-membership",
        elementIds: [id],
        message: "Malformed group memberships were ignored; valid group IDs were retained.",
        severity: "warning",
      });
    }

    elements.push({
      id,
      type,
      bounds,
      center,
      rotation,
      ...(text === undefined ? {} : { text }),
      ...(containerId === undefined ? {} : { containerId }),
      ...(frameId === undefined ? {} : { frameId }),
      ...(groups === undefined ? {} : { groupIds: groups }),
      ...(startBindingId === undefined ? {} : { startBindingId }),
      ...(endBindingId === undefined ? {} : { endBindingId }),
      ...(points === undefined ? {} : { points }),
    });
  }

  const validElementIds = new Set(elements.map(({ id }) => id));
  for (const element of elements) {
    const unresolvedReferences = [element.containerId, element.frameId].filter(
      (id): id is string => id !== undefined && !validElementIds.has(id),
    );
    if (unresolvedReferences.length > 0) {
      if (
        element.containerId !== undefined &&
        !validElementIds.has(element.containerId)
      ) {
        delete element.containerId;
      }
      if (
        element.frameId !== undefined &&
        !validElementIds.has(element.frameId)
      ) {
        delete element.frameId;
      }
      warnings.push({
        code: "unresolved-reference",
        elementIds: [element.id, ...unresolvedReferences],
        message:
          "Element container or frame target is missing or ambiguous and was ignored.",
        severity: "warning",
      });
    }

    const unresolvedBindings = [
      element.startBindingId,
      element.endBindingId,
    ].filter(
      (id): id is string => id !== undefined && !validElementIds.has(id),
    );
    if (unresolvedBindings.length > 0) {
      if (
        element.startBindingId !== undefined &&
        !validElementIds.has(element.startBindingId)
      ) {
        delete element.startBindingId;
      }
      if (
        element.endBindingId !== undefined &&
        !validElementIds.has(element.endBindingId)
      ) {
        delete element.endBindingId;
      }
      warnings.push({
        code: "unresolved-binding",
        elementIds: [element.id, ...unresolvedBindings],
        message:
          "Element binding target is missing or ambiguous and was ignored.",
        severity: "warning",
      });
    }
  }

  return { elements, warnings };
}
