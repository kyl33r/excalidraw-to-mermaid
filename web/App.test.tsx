/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const editor = vi.hoisted(() => {
  const initialElements = [
    {
      id: "node",
      type: "rectangle",
      x: 0,
      y: 0,
      width: 120,
      height: 70,
      angle: 0,
      version: 1,
      versionNonce: 10,
      isDeleted: false,
    },
    {
      id: "label",
      type: "text",
      x: 20,
      y: 20,
      width: 80,
      height: 20,
      angle: 0,
      version: 1,
      versionNonce: 11,
      isDeleted: false,
      text: "Start",
      containerId: "node",
    },
  ];
  return {
    elements: structuredClone(initialElements),
    initialElements,
    onChange: null as null | ((elements: unknown[], appState: object, files: object) => void),
  };
});

const renderMermaid = vi.hoisted(() => vi.fn(async () => '<svg data-testid="rendered-svg"></svg>'));

vi.mock("@excalidraw/excalidraw", async () => {
  const React = await import("react");
  const serialize = (elements: unknown[]) =>
    JSON.stringify({ type: "excalidraw", elements });
  const api = {
    addFiles: vi.fn(),
    getAppState: () => ({}),
    getFiles: () => ({}),
    getSceneElements: () => editor.elements.filter(({ isDeleted }) => !isDeleted),
    getSceneElementsIncludingDeleted: () => editor.elements,
    history: { clear: vi.fn() },
    resetScene: vi.fn(),
    scrollToContent: vi.fn(),
    updateScene: vi.fn(),
  };
  return {
    CaptureUpdateAction: { IMMEDIATELY: "IMMEDIATELY" },
    Excalidraw: (props: {
      excalidrawAPI: (value: typeof api) => void;
      onChange: (elements: unknown[], appState: object, files: object) => void;
    }) => {
      React.useEffect(() => {
        editor.onChange = props.onChange;
        props.excalidrawAPI(api);
        props.onChange(editor.elements, {}, {});
      }, [props.excalidrawAPI, props.onChange]);
      return (
        <button
          data-testid="mock-editor"
          onClick={() => {
            editor.elements = editor.elements.map((element, index) =>
              index === 0
                ? {
                    ...element,
                    version: element.version + 1,
                    versionNonce: element.versionNonce + 100,
                  }
                : element,
            );
            props.onChange(editor.elements, {}, {});
          }}
        >
          Edit source
        </button>
      );
    },
    hashElementsVersion: (elements: { versionNonce: number }[]) =>
      elements.reduce((sum, element) => sum + element.versionNonce, 0),
    loadFromBlob: vi.fn(async () => null),
    serializeAsJSON: serialize,
  };
});

vi.mock("./mermaid-renderer.js", () => ({ renderMermaid }));

import App from "./App.js";

const storedValues = new Map<string, string>();
const testStorage: Storage = {
  get length() {
    return storedValues.size;
  },
  clear: () => storedValues.clear(),
  getItem: (key) => storedValues.get(key) ?? null,
  key: (index) => [...storedValues.keys()][index] ?? null,
  removeItem: (key) => {
    storedValues.delete(key);
  },
  setItem: (key, value) => {
    storedValues.set(key, value);
  },
};

describe("interactive conversion workspace", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: testStorage,
    });
    editor.elements = structuredClone(editor.initialElements);
    editor.onChange = null;
    testStorage.clear();
    renderMermaid.mockReset();
    renderMermaid.mockResolvedValue('<svg data-testid="rendered-svg"></svg>');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("converts, renders, marks edits outdated, and preserves the last good preview on failure", async () => {
    render(<App />);

    const convert = await screen.findByRole("button", { name: /convert/i });
    await waitFor(() => expect(convert).toBeEnabled());
    fireEvent.click(convert);

    expect(await screen.findByTestId("rendered-svg")).toBeInTheDocument();
    expect(screen.getByText("1 nodes")).toBeInTheDocument();
    expect(screen.queryByText("Out of date")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("mock-editor"));
    expect(await screen.findByText("Out of date")).toBeInTheDocument();

    renderMermaid.mockRejectedValueOnce(new Error("synthetic render failure"));
    fireEvent.click(convert);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "synthetic render failure",
    );
    expect(screen.getByTestId("rendered-svg")).toBeInTheDocument();
    expect(screen.getByText("Out of date")).toBeInTheDocument();

    await waitFor(() =>
      expect(localStorage.getItem("excali2md.source-diagram.v1")).toContain(
        '"type":"excalidraw"',
      ),
    );
  });
});
