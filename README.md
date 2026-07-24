# excali2md

A deterministic Excalidraw-to-Mermaid converter built from `DESIGN.md` in explicit phases.

## Current phase

Phases 1 through 3 are implemented:

- TypeScript project and test harness.
- Public intermediate-representation and normalized-element types.
- Full Excalidraw and clipboard JSON input support.
- Top-level document and element validation.
- Deleted-element filtering.
- Configurable UTF-8 input-size limit (10 MiB by default).
- Preservation of unknown source fields in the parsed document.
- Stable input error codes.
- Element normalization with finite geometry validation.
- Normalized bounds and centers for negative dimensions and rotated elements.
- Relative linear-element points converted to rotated absolute coordinates.
- Text, container, frame, binding, and group relationship metadata.
- Deleted elements ignored; malformed elements skipped with machine-readable warnings.
- Duplicate identities and dangling relationships rejected deterministically.
- Mixed group metadata retains valid IDs while reporting malformed entries.
- Rectangle, ellipse, and diamond node-candidate extraction.
- Optional standalone-text nodes when configured or explicitly arrow-connected.
- Contained text excluded from standalone-node extraction.
- Stable, collision-safe Mermaid identifiers kept separate from display labels.

## Commands

```sh
npm test
npm run typecheck
npm run build
```

Dependencies and npm's cache are kept inside this repository (`node_modules/` and `.npm-cache/`) and ignored by Git.

## Design document status

The checked-in `DESIGN.md` currently ends mid-sentence in section 7.3. Work is limited to requirements present in that file; later phases should not infer requirements that are not checked in.
