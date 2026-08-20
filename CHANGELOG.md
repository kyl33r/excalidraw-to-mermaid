# Changelog

All notable changes to excali2md land here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The `## [Unreleased]` section is the single source for release notes: a
release is cut from it by `scripts/release.sh`, which promotes it into a
versioned section and tags `vX.Y.Z`.

## [Unreleased]

### Added

- Deterministic Excalidraw-to-Mermaid flowchart conversion: rectangle,
  ellipse, diamond, and eligible standalone-text node extraction with node
  and edge label resolution.
- Explicit and conservative geometric arrow endpoint resolution, falling
  back to Excalidraw binding metadata when present.
- Frame-to-subgraph conversion and graph-direction inference.
- Escaped, deterministic Mermaid generation with machine-readable warnings
  for malformed, ambiguous, or omitted content.
- Full `.excalidraw` and clipboard JSON input support with stable input
  errors.
- Embedded browser editor that renders a live Mermaid SVG preview and keeps
  the source diagram local to the browser.
- Open/save `.excalidraw` files and download `.mmd` or SVG output.
- Minimal file-in/file-out CLI (`excali2md <input.excalidraw> <output.mmd>`).
