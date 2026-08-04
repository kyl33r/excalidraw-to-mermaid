import {
  CaptureUpdateAction,
  Excalidraw,
  hashElementsVersion,
  loadFromBlob,
  serializeAsJSON,
} from "@excalidraw/excalidraw";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ConversionWarning } from "../src/types.js";
import {
  convertWorkspaceScene,
  hasConvertibleNode,
} from "./conversion.js";
import { downloadText } from "./files.js";

const STORAGE_KEY = "excali2md.source-diagram.v1";
const SAVE_DELAY_MS = 300;

interface RenderedResult {
  mermaid: string;
  svg: string;
  warnings: ConversionWarning[];
  sourceVersion: number;
  counts: {
    nodes: number;
    edges: number;
    groups: number;
  };
}

function serializeScene(api: ExcalidrawImperativeAPI): string {
  return serializeAsJSON(
    api.getSceneElementsIncludingDeleted(),
    api.getAppState(),
    api.getFiles(),
    "local",
  );
}

async function loadInitialScene() {
  const serialized = localStorage.getItem(STORAGE_KEY);
  if (!serialized) {
    return null;
  }
  try {
    return await loadFromBlob(
      new Blob([serialized], { type: "application/json" }),
      null,
      null,
    );
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function blockUnsupportedToolShortcut(event: KeyboardEvent<HTMLDivElement>) {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA")
  ) {
    return;
  }
  const unsupportedShortcuts = new Set([
    "0",
    "6",
    "7",
    "9",
    "e",
    "f",
    "k",
    "l",
    "p",
    "x",
  ]);
  if (unsupportedShortcuts.has(event.key.toLowerCase())) {
    event.preventDefault();
    event.stopPropagation();
  }
}

export default function App() {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [sceneVersion, setSceneVersion] = useState(0);
  const [hasNodes, setHasNodes] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<RenderedResult | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const pendingSceneRef = useRef<string | null>(null);
  const lastSeenVersionRef = useRef(0);
  const initialData = useMemo(() => loadInitialScene(), []);

  const flushPendingScene = useCallback(() => {
    if (!pendingSceneRef.current) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, pendingSceneRef.current);
      pendingSceneRef.current = null;
      setPersistenceError(null);
    } catch (error) {
      setPersistenceError(`Local save failed: ${errorMessage(error)}`);
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => flushPendingScene();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      flushPendingScene();
    };
  }, [flushPendingScene]);

  useEffect(() => {
    if (conversionError !== null) {
      setConversionError(null);
    }
    if (actionError !== null) {
      setActionError(null);
    }
    setCopied(false);
  }, [sceneVersion]);

  const handleSceneChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      const version = hashElementsVersion(elements);
      if (version !== lastSeenVersionRef.current) {
        lastSeenVersionRef.current = version;
        setSceneVersion(version);
      }
      const serialized = serializeAsJSON(elements, appState, files, "local");
      pendingSceneRef.current = serialized;
      try {
        setHasNodes(hasConvertibleNode(serialized));
      } catch {
        setHasNodes(false);
      }
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(
        flushPendingScene,
        SAVE_DELAY_MS,
      );
    },
    [flushPendingScene],
  );

  const handleConvert = useCallback(async () => {
    if (!api || isConverting) {
      return;
    }
    setIsConverting(true);
    setConversionError(null);
    setActionError(null);
    setCopied(false);
    const sourceVersion = hashElementsVersion(
      api.getSceneElementsIncludingDeleted(),
    );
    try {
      const conversion = convertWorkspaceScene(serializeScene(api));
      const { renderMermaid } = await import("./mermaid-renderer.js");
      const svg = await renderMermaid(conversion.mermaid);
      setResult({
        mermaid: conversion.mermaid,
        svg,
        warnings: conversion.graph.warnings,
        sourceVersion,
        counts: {
          nodes: conversion.graph.nodes.length,
          edges: conversion.graph.edges.length,
          groups: conversion.graph.groups.length,
        },
      });
    } catch (error) {
      setConversionError(errorMessage(error));
    } finally {
      setIsConverting(false);
    }
  }, [api, isConverting]);

  const handleNew = useCallback(() => {
    if (!api) {
      return;
    }
    if (
      api.getSceneElements().length > 0 &&
      !window.confirm("Start a new diagram? Your current source will be cleared.")
    ) {
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    pendingSceneRef.current = null;
    api.resetScene();
    api.history.clear();
    setResult(null);
    setConversionError(null);
    setActionError(null);
  }, [api]);

  const handleOpen = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !api) {
        return;
      }
      try {
        const restored = await loadFromBlob(
          file,
          api.getAppState(),
          api.getSceneElements(),
        );
        api.addFiles(Object.values(restored.files));
        api.updateScene({
          elements: restored.elements,
          appState: restored.appState,
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });
        api.history.clear();
        void api.scrollToContent(restored.elements, { fitToContent: true });
        setResult(null);
        setConversionError(null);
        setActionError(null);
      } catch (error) {
        setActionError(`Could not open source: ${errorMessage(error)}`);
      }
    },
    [api],
  );

  const handleSaveSource = useCallback(() => {
    if (api) {
      downloadText(
        serializeScene(api),
        "excali2md-source.excalidraw",
        "application/vnd.excalidraw+json",
      );
    }
  }, [api]);

  const handleCopy = useCallback(async () => {
    if (!result) {
      return;
    }
    try {
      await navigator.clipboard.writeText(result.mermaid);
      setCopied(true);
      setActionError(null);
    } catch (error) {
      setActionError(`Copy failed: ${errorMessage(error)}`);
    }
  }, [result]);

  const isOutdated =
    result !== null &&
    (result.sourceVersion !== sceneVersion || conversionError !== null);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Browser-local diagram conversion</p>
          <h1>excali2md</h1>
        </div>
        <div className="privacy-note" title="Nothing is uploaded">
          <span className="privacy-dot" aria-hidden="true" />
          Stored on this device
        </div>
      </header>

      <section className="workspace" aria-label="Conversion workspace">
        <article className="source-pane panel">
          <div className="panel-header source-header">
            <div>
              <p className="panel-kicker">Source diagram</p>
              <h2>Draw the flow</h2>
            </div>
            <div className="source-actions">
              <button className="button button-quiet" onClick={handleNew} disabled={!api}>
                New
              </button>
              <button
                className="button button-quiet"
                onClick={() => fileInputRef.current?.click()}
                disabled={!api}
              >
                Open
              </button>
              <button
                className="button button-quiet"
                onClick={handleSaveSource}
                disabled={!api}
              >
                Save source
              </button>
              <input
                ref={fileInputRef}
                className="visually-hidden"
                type="file"
                accept=".excalidraw,application/json,application/vnd.excalidraw+json"
                onChange={handleOpen}
                aria-label="Open Excalidraw source"
              />
            </div>
          </div>
          <div
            className="canvas-wrap"
            onKeyDownCapture={blockUnsupportedToolShortcut}
          >
            <Excalidraw
              initialData={initialData}
              excalidrawAPI={setApi}
              onChange={handleSceneChange}
              autoFocus
              aiEnabled={false}
              UIOptions={{
                canvasActions: {
                  changeViewBackgroundColor: false,
                  clearCanvas: false,
                  export: false,
                  loadScene: false,
                  saveAsImage: false,
                  saveToActiveFile: false,
                  toggleTheme: false,
                },
                tools: { image: false },
              }}
            />
          </div>
          <div className="source-footer">
            <span>Rectangle · Ellipse · Diamond · Arrow · Text</span>
            <span className={persistenceError ? "status-error" : "status-saved"}>
              {persistenceError ?? "Autosaved locally"}
            </span>
          </div>
        </article>

        <div className="convert-rail">
          <button
            className="convert-button"
            onClick={handleConvert}
            disabled={!api || !hasNodes || isConverting}
          >
            <span>{isConverting ? "Rendering…" : "Convert"}</span>
            <span aria-hidden="true">→</span>
          </button>
          {!hasNodes && (
            <p className="convert-hint">Add a node shape to begin</p>
          )}
        </div>

        <article className="result-pane panel" aria-live="polite">
          <div className="panel-header result-header">
            <div>
              <p className="panel-kicker">Generated diagram</p>
              <div className="result-title-row">
                <h2>Mermaid preview</h2>
                {isOutdated && <span className="badge badge-stale">Out of date</span>}
              </div>
            </div>
            {result && (
              <div className="result-actions">
                <button className="button button-quiet" onClick={handleCopy}>
                  {copied ? "Copied" : "Copy Mermaid"}
                </button>
                <button
                  className="button button-quiet"
                  onClick={() =>
                    downloadText(result.mermaid, "diagram.mmd", "text/plain")
                  }
                >
                  Download .mmd
                </button>
                <button
                  className="button button-quiet"
                  onClick={() =>
                    downloadText(result.svg, "diagram.svg", "image/svg+xml")
                  }
                >
                  Download SVG
                </button>
              </div>
            )}
          </div>

          {conversionError && (
            <div className="error-banner" role="alert">
              <strong>Conversion failed.</strong>
              <span>{conversionError}</span>
            </div>
          )}

          {actionError && (
            <div className="error-banner" role="alert">
              <strong>Action failed.</strong>
              <span>{actionError}</span>
            </div>
          )}

          {!result ? (
            <div className="empty-result">
              <div className="empty-mark" aria-hidden="true">M</div>
              <h3>Your Mermaid diagram will appear here</h3>
              <p>Draw at least one supported shape, then choose Convert.</p>
            </div>
          ) : (
            <>
              <div
                className={`mermaid-preview${isOutdated ? " is-outdated" : ""}`}
                dangerouslySetInnerHTML={{ __html: result.svg }}
              />

              <div className="result-meta">
                <span>{result.counts.nodes} nodes</span>
                <span>{result.counts.edges} edges</span>
                <span>{result.counts.groups} groups</span>
                <span>{result.warnings.length} warnings</span>
              </div>

              <details className="source-code">
                <summary>Mermaid source</summary>
                <pre><code>{result.mermaid}</code></pre>
              </details>

              <details className="warnings" open={result.warnings.length > 0}>
                <summary>
                  Conversion warnings
                  <span className="warning-count">{result.warnings.length}</span>
                </summary>
                {result.warnings.length === 0 ? (
                  <p className="no-warnings">No warnings for this conversion.</p>
                ) : (
                  <ul>
                    {result.warnings.map((warning, index) => (
                      <li key={`${warning.code}-${index}`}>
                        <span className={`severity severity-${warning.severity}`}>
                          {warning.severity}
                        </span>
                        <div>
                          <strong>{warning.code}</strong>
                          <p>{warning.message}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </>
          )}
        </article>
      </section>
    </main>
  );
}
