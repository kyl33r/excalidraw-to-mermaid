import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { convertExcalidrawToMermaid } from "./convert.js";

export interface CliIo {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

const USAGE = "Usage: excali2md <input.excalidraw> <output.mmd>";

export async function runCli(
  args: string[],
  io: CliIo = {
    stdout: (message) => console.log(message),
    stderr: (message) => console.error(message),
  },
): Promise<number> {
  if (args.length !== 2 || !args[0] || !args[1]) {
    io.stderr(USAGE);
    return 2;
  }

  const [inputPath, outputPath] = args;
  try {
    const source = await readFile(inputPath, "utf8");
    const result = convertExcalidrawToMermaid(source);
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
