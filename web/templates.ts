import agentArchitecture from "../examples/04-quant-agent.excalidraw?raw";
import authenticationFlow from "../examples/03-grouped-process.excalidraw?raw";
import orderLogic from "../examples/02-branching-flow.excalidraw?raw";
import requestFlow from "../examples/01-basic-flow.excalidraw?raw";
import type { DiagramMode } from "../src/types.js";

export interface WorkspaceTemplate {
  id: string;
  title: string;
  description: string;
  source: string;
  mode?: DiagramMode;
}

interface TemplateElement {
  id: string;
  type: "rectangle" | "text" | "arrow";
  x: number;
  y: number;
  width: number;
  height: number;
  [key: string]: unknown;
}

function baseElement(id: string, type: TemplateElement["type"], x: number, y: number, width: number, height: number): TemplateElement {
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    seed: 1,
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    updated: 1,
    link: null,
    locked: false,
    groupIds: [],
    frameId: null,
    roundness: null,
    boundElements: null,
  };
}

function node(id: string, x: number, y: number, label: string): TemplateElement[] {
  const width = 180;
  const height = 84;
  return [
    {
      ...baseElement(id, "rectangle", x, y, width, height),
      backgroundColor: "#d3f9d8",
      roundness: { type: 3 },
    },
    {
      ...baseElement(`${id}-label`, "text", x + 16, y + 27, width - 32, 30),
      text: label,
      originalText: label,
      containerId: id,
      fontSize: 20,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "middle",
      autoResize: true,
      lineHeight: 1.25,
    },
  ];
}

function arrow(id: string, sourceId: string, targetId: string, x: number, y: number, width: number, height = 0): TemplateElement {
  return {
    ...baseElement(id, "arrow", x, y, width, height),
    points: [[0, 0], [width, height]],
    lastCommittedPoint: [width, height],
    startBinding: { elementId: sourceId, focus: 0, gap: 1 },
    endBinding: { elementId: targetId, focus: 0, gap: 1 },
    startArrowhead: null,
    endArrowhead: "arrow",
  };
}

function message(id: string, x: number, y: number, text: string): TemplateElement {
  return { ...baseElement(`${id}-label`, "text", x, y, 120, 24), text, originalText: text, containerId: id, fontSize: 18, fontFamily: 1, textAlign: "center", verticalAlign: "middle", autoResize: true, lineHeight: 1.25 };
}

function scene(elements: TemplateElement[]): string {
  return JSON.stringify({ type: "excalidraw", version: 2, elements });
}

const sequenceFlow = scene([
  ...node("sequence-client", 60, 140, "Customer"),
  ...node("sequence-api", 310, 140, "API"),
  ...node("sequence-service", 560, 140, "Order service"),
  ...node("sequence-store", 810, 140, "Data store"),
  arrow("sequence-a1", "sequence-client", "sequence-api", 240, 250, 70), message("sequence-a1", 210, 220, "Place order"),
  arrow("sequence-a2", "sequence-api", "sequence-service", 490, 330, 70), message("sequence-a2", 460, 300, "Create order"),
  arrow("sequence-a3", "sequence-service", "sequence-store", 740, 410, 70), message("sequence-a3", 710, 380, "Persist order"),
]);

const dataModel = scene([
  ...node("erd-customer", 60, 140, "Customer"),
  ...node("erd-order", 340, 140, "Order"),
  ...node("erd-payment", 620, 140, "Payment"),
  arrow("erd-a1", "erd-customer", "erd-order", 240, 182, 100),
  arrow("erd-a2", "erd-order", "erd-payment", 520, 182, 100),
]);

export const WORKSPACE_TEMPLATES: readonly WorkspaceTemplate[] = [
  {
    id: "request-flow",
    title: "Request flowchart",
    description: "A compact request-validation flow with a decision and outcome.",
    source: requestFlow,
  },
  {
    id: "order-logic",
    title: "Order fulfilment logic",
    description: "A branching business-rule flow that rejoins after each outcome.",
    source: orderLogic,
  },
  {
    id: "authentication-process",
    title: "Authentication process",
    description: "A framed process that demonstrates Mermaid subgraphs.",
    source: authenticationFlow,
  },
  {
    id: "sequence-flow",
    title: "Service interaction sequence",
    description: "A true Mermaid sequence diagram with ordered participants and messages.",
    source: sequenceFlow,
    mode: "sequence",
  },
  {
    id: "data-model",
    title: "Order data model (ERD-style)",
    description: "An entity-relationship style view rendered as a Mermaid flowchart.",
    source: dataModel,
  },
  {
    id: "agent-architecture",
    title: "Agent-system architecture",
    description: "A 23-node professional architecture for stress-testing conversion.",
    source: agentArchitecture,
  },
] as const;
