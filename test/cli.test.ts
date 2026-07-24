import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "../src/cli-runner.js";

describe("runCli", () => {
  it("converts an input path to a Mermaid output path", async () => {
    const directory = await mkdtemp(join(tmpdir(), "excali2md-cli-"));
    const outputPath = join(directory, "basic.mmd");
    const stdout: string[] = [];
    const stderr: string[] = [];

    try {
      const exitCode = await runCli(
        [
          new URL("../examples/01-basic-flow.excalidraw", import.meta.url).pathname,
          outputPath,
        ],
        {
          stdout: (message) => stdout.push(message),
          stderr: (message) => stderr.push(message),
        },
      );

      expect(exitCode).toBe(0);
      expect(await readFile(outputPath, "utf8")).toContain("flowchart LR");
      expect(stdout.join("\n")).toContain("4 nodes, 3 edges");
      expect(stderr).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("returns a usage error when input and output paths are missing", async () => {
    const stderr: string[] = [];
    const exitCode = await runCli([], {
      stdout: () => undefined,
      stderr: (message) => stderr.push(message),
    });

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain(
      "Usage: excali2md <input.excalidraw> <output.mmd>",
    );
  });
});
