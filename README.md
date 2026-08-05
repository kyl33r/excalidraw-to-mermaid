# excali2md

Draw an Excalidraw flowchart and turn it into deterministic Mermaid source,
directly in the browser or from the command line.

The interactive workspace embeds Excalidraw, renders a Mermaid SVG preview,
and keeps the diagram local to your browser.

## Current capabilities

- Full Excalidraw and clipboard JSON input support with stable input errors.
- Deterministic geometry and relationship normalization.
- Rectangle, ellipse, diamond, and eligible standalone-text node extraction.
- Node and edge label resolution.
- Explicit and conservative geometric arrow endpoint resolution.
- Frame-to-subgraph conversion and graph-direction inference.
- Escaped, deterministic Mermaid flowchart generation.
- Embedded browser editor with Mermaid source and SVG previews.
- Open/save `.excalidraw` files and download `.mmd` or SVG output.
- Minimal file-in/file-out CLI.
- Machine-readable warnings for malformed, ambiguous, or omitted content.

## Quickstart

This project uses [Bun](https://bun.sh/) as the primary package manager and command runner. Bun 1.3 or newer is recommended.

Use the hosted Conversion Workspace at
[excali2md.vercel.app](https://excali2md.vercel.app).

### Interactive workspace

Run the browser-local Excalidraw-to-Mermaid workspace:

```sh
bun install
bun run dev
```

Open `http://127.0.0.1:4173`. The workspace embeds a constrained Excalidraw
editor, converts the current scene on demand, and renders a Mermaid preview
without uploading the source diagram. Source diagrams are autosaved in the
browser and can also be opened or saved as `.excalidraw` files.

To convert a simple flowchart:

1. Draw rectangles, ellipses, or diamonds and add text labels.
2. Connect the shapes with arrows.
3. Choose **Convert** to generate Mermaid source and its SVG preview.
4. Copy the Mermaid source or download the `.mmd`, SVG, or source diagram.

The first supported workflow is intentionally narrow: flowchart shapes, text,
arrows, and frames are converted. Unsupported elements in opened files are
omitted from conversion with a warning.

### Built-in templates

The workspace includes ready-to-convert examples for common professional
setups: request flowcharts, branching order logic, framed authentication
processes, service interaction sequences, ERD-style data models, and a
23-node agent-system architecture. Choose one from **Start from a template**,
then select **Convert**.

Sequence and ERD-style templates currently convert to Mermaid **flowcharts**:
they demonstrate connected interaction and relationship graphs, rather than
claiming a native `sequenceDiagram` or `erDiagram` export mode.

### Command line

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

Run the unit and real-browser test suites, then typecheck and build:

```sh
bun run test:all
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

Run the real-browser workflow test headlessly, or watch it in visible Chromium:

```sh
bun run test:e2e
bun run test:e2e:headed
```

Headed mode slows the browser actions and keeps the final diagram visible for
three seconds. Override the final pause when needed:

```sh
E2E_PAUSE_MS=10000 bun run test:e2e:headed
```

Bun installs dependencies into the ignored `node_modules/` directory. Generated files under `artifacts/` are also ignored by Git.

## Deployment

Authenticate with Vercel once, then run the production deployment script:

```sh
bunx vercel login
./deploy.sh
```

The script installs the locked dependencies, runs the unit and browser tests,
typechecks and builds the project, then creates a production deployment. On a
new checkout, it also prompts you to link the correct Vercel project. Vercel's
local project metadata stays in the ignored `.vercel/` directory.

## Design document status

The checked-in `DESIGN.md` currently ends mid-sentence in section 7.3. Work is limited to requirements present in that file; later phases should not infer requirements that are not checked in.
