# excali2md

A deterministic Excalidraw-to-Mermaid converter built from `DESIGN.md` in explicit phases.

## Current capabilities

- Full Excalidraw and clipboard JSON input support with stable input errors.
- Deterministic geometry and relationship normalization.
- Rectangle, ellipse, diamond, and eligible standalone-text node extraction.
- Node and edge label resolution.
- Explicit and conservative geometric arrow endpoint resolution.
- Frame-to-subgraph conversion and graph-direction inference.
- Escaped, deterministic Mermaid flowchart generation.
- Minimal file-in/file-out CLI.
- Machine-readable warnings for malformed, ambiguous, or omitted content.

## Quickstart

This project uses [Bun](https://bun.sh/) as the primary package manager and command runner. Bun 1.3 or newer is recommended.

Install dependencies and build the CLI:

```sh
bun install
bun run build
mkdir -p artifacts
```

Convert an Excalidraw document to Mermaid:

```sh
bun run convert -- \
  examples/01-basic-flow.excalidraw \
  artifacts/01-basic-flow.mmd
```

The CLI accepts two positional arguments:

```text
excali2md <input.excalidraw> <output.mmd>
```

The other bundled examples can be converted in the same way:

```sh
bun run convert -- examples/02-branching-flow.excalidraw artifacts/02-branching-flow.mmd
bun run convert -- examples/03-grouped-process.excalidraw artifacts/03-grouped-process.mmd
bun run convert -- examples/04-quant-agent.excalidraw artifacts/04-quant-agent.mmd
```

Convert every example:

```sh
for input in examples/*.excalidraw; do
  name="$(basename "$input" .excalidraw)"
  bun run convert -- "$input" "artifacts/$name.mmd"
done
```

Current example conversion summaries:

| Example | Nodes | Edges | Groups |
| --- | ---: | ---: | ---: |
| `01-basic-flow` | 4 | 3 | 0 |
| `02-branching-flow` | 5 | 5 | 0 |
| `03-grouped-process` | 3 | 2 | 1 |
| `04-quant-agent` | 23 | 24 | 0 |

## Validate and render Mermaid

Inspect generated Mermaid source:

```sh
less artifacts/01-basic-flow.mmd
```

Validate its syntax and render an SVG using Mermaid CLI through Bun:

```sh
bunx mmdc \
  -i artifacts/01-basic-flow.mmd \
  -o artifacts/01-basic-flow.svg \
  -b transparent
```

Open the SVG on macOS:

```sh
open artifacts/01-basic-flow.svg
```

Render a PNG instead:

```sh
bunx mmdc \
  -i artifacts/01-basic-flow.mmd \
  -o artifacts/01-basic-flow.png \
  -b white

open artifacts/01-basic-flow.png
```

Validate and render every generated Mermaid file:

```sh
for input in artifacts/*.mmd; do
  output="${input%.mmd}.svg"
  bunx mmdc -i "$input" -o "$output" -b transparent
done
```

## Testing

Run the complete test suite, typecheck, and build:

```sh
bun run test
bun run typecheck
bun run build
```

Run only the example integration tests:

```sh
bunx vitest run test/examples.test.ts
```

Run the converter and CLI tests:

```sh
bunx vitest run test/convert.test.ts test/cli.test.ts
```

Bun installs dependencies into the ignored `node_modules/` directory. Generated files under `artifacts/` are also ignored by Git.

## Design document status

The checked-in `DESIGN.md` currently ends mid-sentence in section 7.3. Work is limited to requirements present in that file; later phases should not infer requirements that are not checked in.
