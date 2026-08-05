---
name: excalidraw-to-mermaid
description: Convert Excalidraw JSON or .excalidraw files into deterministic Mermaid flowcharts with the excali2md CLI. Use when an agent needs to inspect, convert, validate, or summarize an Excalidraw diagram, including nested groups and conversion warnings.
---

# Excalidraw to Mermaid

Run the converter from the excali2md repository root:

```sh
bun run convert -- --json /absolute/path/to/diagram.excalidraw
```

Parse the single JSON value emitted on standard output. It contains:

- `mermaid`: generated Mermaid source.
- `graph`: nodes, edges, groups, and inferred nesting.
- `counts`: node, edge, group, and warning totals.
- `warnings`: structured conversion warnings.

Treat `warnings` as material output. Do not claim that an omitted or
ambiguous relationship converted faithfully. Ask for source clarification when
warnings change the requested interpretation.

To save Mermaid to a file instead, use:

```sh
bun run convert -- /absolute/path/to/diagram.excalidraw /absolute/path/to/diagram.mmd
```

Frames and Excalidraw group IDs become Mermaid subgraphs when they encode a
clear parent relationship. Images, embeds, and freehand drawing are not
faithful Mermaid graph input; report their warnings.
