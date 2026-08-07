# Sequence diagram mode

## Goal

Add an explicit `sequence` output mode that converts a constrained Excalidraw
scene into valid Mermaid `sequenceDiagram` source. Flowchart conversion remains
the default and is unchanged.

## Authoring convention

- Draw each participant as a labelled supported node shape.
- Arrange participants left-to-right. Their x-coordinate determines participant
  order.
- Draw directed arrows between participants. Their midpoint y-coordinate
  determines message order, from top to bottom.
- Attach text to each arrow for its message. Unlabelled arrows receive a
  warning and are omitted from sequence output.
- Use a left-pointing arrow for a return. Right-pointing arrows are calls.

## Output

- Participants render as `participant id as Label`.
- Calls render as `sender->>receiver: Message`.
- Returns render as `sender-->>receiver: Message`.
- Mermaid identifiers are deterministic and distinct from display labels.

## Deliberate v1 exclusions

- No automatic mode detection.
- No activation bars, notes, create/destroy, `alt`, `opt`, `loop`, `par`, or
  critical fragments.
- Frames and group IDs do not affect sequence output.
- Ambiguous horizontal direction, self messages, missing endpoints, and
  unlabelled arrows produce warnings rather than guessed Mermaid syntax.

## Architecture

Keep Excalidraw parsing and normalization unchanged. Introduce a sequence
intermediate representation derived from normalized elements, then a dedicated
Mermaid sequence emitter. Add `mode: "flowchart" | "sequence"` to public
conversion options, workspace conversion, and CLI flags. The workspace selector
controls the mode; templates include one true sequence example.

## Verification

- Unit tests cover participant ordering, call/return syntax, sorting, and all
  omission warnings.
- CLI JSON tests expose the selected mode and warnings.
- Browser E2E loads the sequence template, selects sequence mode, renders a
  Mermaid SVG, and verifies exported source.
