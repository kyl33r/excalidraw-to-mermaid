import mermaid from "mermaid";

let initialized = false;
let renderSequence = 0;

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
      htmlLabels: true,
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
  return result.svg;
}
