import { describe, expect, it } from "vitest";

import { makeSvgXmlSafe } from "./mermaid-renderer.js";

describe("makeSvgXmlSafe", () => {
  it("makes Mermaid line breaks valid in a standalone SVG document", () => {
    const svg = makeSvgXmlSafe("<svg><p>one<br>two</p></svg>");
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");

    expect(svg).toContain("<br/>");
    expect(parsed.querySelector("parsererror")).toBeNull();
  });
});
