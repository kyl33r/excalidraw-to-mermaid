import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { convertExcalidrawToMermaid } from "./convert.js";

export interface CliIo {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

const USAGE = [
  "Usage: excali2md <input.excalidraw> <output.mmd>",
  "       excali2md --json <input.excalidraw>",
].join("\n");

export async function runCli(
  args: string[],
  io: CliIo = {
    stdout: (message) => console.log(message),
    stderr: (message) => console.error(message),
  },
): Promise<number> {
  const jsonMode = args[0] === "--json";
  const inputPath = jsonMode ? args[1] : args[0];
  const outputPath = jsonMode ? undefined : args[1];
  if (
    (jsonMode && (args.length !== 2 || !inputPath)) ||
    (!jsonMode && (args.length !== 2 || !inputPath || !outputPath))
  ) {
    io.stderr(USAGE);
    return 2;
  }
  if (!inputPath) {
    io.stderr(USAGE);
    return 2;
  }

  try {
    const source = await readFile(inputPath, "utf8");
    const result = convertExcalidrawToMermaid(source);
    if (jsonMode) {
      io.stdout(
        JSON.stringify({
          mermaid: result.mermaid,
          graph: result.graph,
          counts: {
            nodes: result.graph.nodes.length,
            edges: result.graph.edges.length,
            groups: result.graph.groups.length,
            warnings: result.graph.warnings.length,
          },
          warnings: result.graph.warnings,
        }),
      );
      return 0;
    }
    if (!outputPath) {
      io.stderr(USAGE);
      return 2;
    }
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, result.mermaid, "utf8");

    for (const warning of result.graph.warnings) {
      io.stderr(
        `[${warning.severity}] ${warning.code}: ${warning.message} (${warning.elementIds.join(", ")})`,
      );
    }
    io.stdout(
      `Wrote ${outputPath}: ${result.graph.nodes.length} nodes, ${result.graph.edges.length} edges, ${result.graph.groups.length} groups, ${result.graph.warnings.length} warnings.`,
    );
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`excali2md: ${message}`);
    return 1;
  }
}
