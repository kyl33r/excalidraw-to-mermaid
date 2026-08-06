import { describe, expect, it } from "vitest";
import { convertExcalidrawToMermaid } from "../src/convert.js";

describe("sequence conversion", () => {
  it("orders participants left-to-right and labelled arrows top-to-bottom", () => {
    const result = convertExcalidrawToMermaid(JSON.stringify({ type: "excalidraw", elements: [
      { id: "client", type: "rectangle", x: 0, y: 0, width: 100, height: 50 },
      { id: "client-text", type: "text", x: 5, y: 5, width: 80, height: 20, text: "Client", containerId: "client" },
      { id: "api", type: "rectangle", x: 240, y: 0, width: 100, height: 50 },
      { id: "api-text", type: "text", x: 245, y: 5, width: 80, height: 20, text: "API", containerId: "api" },
      { id: "call", type: "arrow", x: 100, y: 100, width: 140, height: 0, points: [[0, 0], [140, 0]], startBinding: { elementId: "client" }, endBinding: { elementId: "api" } },
      { id: "call-label", type: "text", x: 140, y: 80, width: 80, height: 20, text: "Request", containerId: "call" },
      { id: "return", type: "arrow", x: 240, y: 160, width: -140, height: 0, points: [[0, 0], [-140, 0]], startBinding: { elementId: "api" }, endBinding: { elementId: "client" } },
      { id: "return-label", type: "text", x: 140, y: 140, width: 80, height: 20, text: "Response", containerId: "return" },
    ] }), { mode: "sequence" });
    expect(result.mermaid).toBe(["sequenceDiagram", "  participant n_client as Client", "  participant n_api as API", "  n_client->>n_api: Request", "  n_api-->>n_client: Response", ""].join("\n"));
    expect(result.graph.warnings).toEqual([]);
  });
});
