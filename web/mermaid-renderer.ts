import mermaid from "mermaid";

let initialized = false;
let renderSequence = 0;

export function makeSvgXmlSafe(svg: string): string {
  return svg.replaceAll("<br>", "<br/>");
}

function initialize(): void {
  if (initialized) {
    return;
  }
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    theme: "neutral",
    flowchart: {
      // SVG downloads must be standalone XML documents. HTML labels produce
      // browser-tolerated foreignObject markup that is not reliably valid XML.
      htmlLabels: false,
      useMaxWidth: true,
    },
  });
  initialized = true;
}

export async function renderMermaid(source: string): Promise<string> {
  initialize();
  await mermaid.parse(source);
  renderSequence += 1;
  const result = await mermaid.render(
    `excali2md-preview-${renderSequence}`,
    source,
  );
  // Mermaid can emit HTML-style `<br>` tags inside SVG labels. Browsers render
  // them in the preview, but a downloaded SVG is parsed as XML and requires
  // self-closing tags.
  return makeSvgXmlSafe(result.svg);
}
