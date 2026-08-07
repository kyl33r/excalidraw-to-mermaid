# TODO

This is the working backlog for turning Excalidraw scenes into useful,
deterministic Mermaid diagrams. Keep conversion semantics ahead of visual
fidelity: warn when intent cannot be inferred safely.

## Next: broaden the core flowchart vocabulary

- [ ] Add rounded rectangles as nodes, rendered with Mermaid's rounded-node
  syntax.
- [ ] Add parallelograms as input/output nodes.
- [ ] Add trapezoids as manual-operation nodes.
- [ ] Add hexagons as preparation nodes.
- [ ] Add cylinders as database/data-store nodes.
- [ ] Add document shapes, including the multi-document variant when its
  intent is unambiguous.
- [ ] Preserve Excalidraw lines as undirected Mermaid links, with the same
  conservative endpoint-resolution rules used for arrows.
- [ ] Support arrowheads and line styles where Mermaid has an equivalent,
  without treating visual decoration as graph semantics.
- [ ] Add fixtures and browser workflow tests for every supported shape and
  connector combination.

## Excalidraw-native objects and assets

- [ ] Recognize `image` elements and emit an explicit warning that Mermaid
  cannot faithfully represent embedded/raster assets; retain their file IDs in
  conversion metadata for a future export format.
- [ ] Recognize `embeddable` elements and report their URL or source safely
  when available. Do not execute or fetch embedded content during conversion.
- [ ] Recognize `iframe` elements and report them as omitted external content.
- [ ] Decide whether Excalidraw `magicframe` should become a Mermaid subgraph
  or remain an unsupported layout-only element.
- [ ] Treat `freedraw` and decorative `line` elements as non-semantic by
  default, with clear warnings rather than silent loss.
- [ ] Investigate a separate export target (SVG/HTML with annotations) for
  assets that Mermaid cannot encode; do not overload Mermaid source with image
  data.

## Diagram semantics and fidelity

- [x] Add an explicit Mermaid `sequenceDiagram` mode with a constrained,
  documented authoring convention, browser selector, CLI flag, template, and
  conversion warnings.
- [ ] Extend sequence mode with Mermaid-specific constructs such as activation
  bars, notes, and `alt`/`opt`/`loop` fragments, each behind explicit
  Excalidraw conventions rather than heuristic inference.
- [ ] Add the optional Mermaid `stateDiagram-v2` output mode described in
  `DESIGN.md`, enabled only by an explicit user choice or strict detection.
- [ ] Improve frame extraction for nested frames and mixed inside/outside
  edges.
- [ ] Detect multiple disconnected diagrams and either split them into outputs
  or warn before merging them into one Mermaid graph.
- [ ] Preserve safe, meaningful style hints (for example classes) only after a
  stable semantic mapping is defined.
- [ ] Add user-visible explanations for omitted elements and ambiguous arrow
  endpoints, with links back to the source element where possible.

## Product and engineering

- [x] Add an agent-friendly `--json` CLI mode and an auto-discoverable Codex
  skill for converting Excalidraw files safely.
- [x] Add a built-in template gallery with flowchart, logic-flow,
  sequence-style, ERD-style, framed-process, and large architecture examples.
- [ ] Continue expanding end-to-end tests with complex diagrams: labels,
  unbound arrows, disconnected subgraphs, and unsupported assets.
- [ ] Add accessibility review and keyboard-only browser workflow coverage.
- [ ] Add mobile and narrow-window layout tests for the conversion workspace.
- [ ] Review the manually run `deploy.sh` release workflow after the first few
  releases; it currently runs all tests before deploying to production.
- [ ] Commit the current Vercel/deployment configuration once its manual
  workflow has been reviewed.
