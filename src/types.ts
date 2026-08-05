export interface Point {
  x: number;
  y: number;
}

export interface Bounds extends Point {
  width: number;
  height: number;
}

export type DiagramDirection = "TB" | "TD" | "BT" | "LR" | "RL";
export type GraphNodeShape = "rectangle" | "ellipse" | "diamond" | "state";
export type WarningSeverity = "info" | "warning" | "error";

export interface ConversionWarning {
  code: string;
  elementIds: string[];
  message: string;
  severity: WarningSeverity;
}

export interface GraphNode {
  id: string;
  sourceElementIds: string[];
  label: string;
  shape: GraphNodeShape;
  bounds: Bounds;
  parentGroupId?: string;
  confidence: number;
}

export interface GraphEdge {
  id: string;
  sourceElementIds: string[];
  sourceNodeId?: string;
  targetNodeId?: string;
  label?: string;
  directed: boolean;
  confidence: number;
}

export interface GraphGroup {
  id: string;
  label?: string;
  parentGroupId?: string;
  childNodeIds: string[];
  bounds: Bounds;
}

export interface DiagramGraph {
  id: string;
  direction: DiagramDirection;
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups: GraphGroup[];
  warnings: ConversionWarning[];
}

export interface NormalizedElement {
  id: string;
  type: string;
  bounds: Bounds;
  center: Point;
  rotation: number;
  text?: string;
  name?: string;
  containerId?: string;
  frameId?: string;
  groupIds?: string[];
  startBindingId?: string;
  endBindingId?: string;
  points?: Point[];
}
