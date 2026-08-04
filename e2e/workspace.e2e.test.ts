import puppeteer from "puppeteer";
import type { Browser, Page } from "puppeteer";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import type { ViteDevServer } from "vite";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

let browser: Browser;
let page: Page;
let server: ViteDevServer;
let baseUrl: string;
const headless = process.env.E2E_HEADLESS !== "false";
const slowMotionMs = Number(process.env.E2E_SLOW_MO ?? (headless ? 0 : 120));
const finalPauseMs = Number(process.env.E2E_PAUSE_MS ?? (headless ? 0 : 3_000));

async function selectTool(testId: string): Promise<void> {
  await page.click(`[data-testid="${testId}"]`);
}

async function drag(
  start: { x: number; y: number },
  end: { x: number; y: number },
): Promise<void> {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
}

async function drawLabel(
  center: { x: number; y: number },
  label: string,
): Promise<void> {
  await selectTool("toolbar-text");
  await page.mouse.click(center.x, center.y);
  await page.waitForSelector("textarea.excalidraw-wysiwyg", {
    visible: true,
    timeout: 5_000,
  });
  await page.keyboard.type(label);
  await page.keyboard.press("Escape");
  await page.waitForSelector("textarea.excalidraw-wysiwyg", { hidden: true });
}

async function openEmptyWorkspace(): Promise<void> {
  await page.goto(baseUrl, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector('[data-testid="toolbar-rectangle"]', {
    visible: true,
  });
}

function capturePageErrors(): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) =>
    errors.push(error instanceof Error ? error.message : String(error)),
  );
  return errors;
}

beforeAll(async () => {
  server = await createServer({
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 0,
    },
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") {
    throw new Error("Vite did not expose a local test port.");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;

  browser = await puppeteer.launch({
    headless,
    slowMo: slowMotionMs,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
});

beforeEach(async () => {
  page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
});

afterEach(async () => {
  if (finalPauseMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, finalPauseMs));
  }
  await page?.close();
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

describe("Conversion Workspace", () => {
  it("lets a user draw three connected rectangles and render them as Mermaid", async () => {
    const pageErrors = capturePageErrors();
    await openEmptyWorkspace();

    const canvas = await page.$eval(".canvas-wrap", (element) => {
      const bounds = element.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    });
    expect(canvas.width).toBeGreaterThan(700);
    expect(canvas.height).toBeGreaterThan(500);

    const rectangles = [
      { left: 260, right: 370, label: "Receive request" },
      { left: 440, right: 550, label: "Validate input" },
      { left: 620, right: 730, label: "Send response" },
    ];
    const top = 170;
    const bottom = 250;
    const centerY = canvas.y + (top + bottom) / 2;

    for (const rectangle of rectangles) {
      await selectTool("toolbar-rectangle");
      await drag(
        { x: canvas.x + rectangle.left, y: canvas.y + top },
        { x: canvas.x + rectangle.right, y: canvas.y + bottom },
      );
      await drawLabel(
        {
          x: canvas.x + (rectangle.left + rectangle.right) / 2,
          y: centerY,
        },
        rectangle.label,
      );
    }

    await selectTool("toolbar-arrow");
    await drag(
      { x: canvas.x + rectangles[0]!.right - 4, y: centerY },
      { x: canvas.x + rectangles[1]!.left + 4, y: centerY },
    );
    await selectTool("toolbar-arrow");
    await drag(
      { x: canvas.x + rectangles[1]!.right - 4, y: centerY },
      { x: canvas.x + rectangles[2]!.left + 4, y: centerY },
    );

    await page.click("button.convert-button");
    await page.waitForSelector(".mermaid-preview svg", { visible: true });
    await page.waitForFunction(() =>
      document.querySelector(".result-meta")?.textContent?.includes("3 nodes"),
    );

    const resultSummary = await page.$eval(
      ".result-meta",
      (element) => element.textContent ?? "",
    );
    expect(resultSummary).toContain("3 nodes");
    expect(resultSummary).toContain("2 edges");

    await page.click("details.source-code summary");
    const mermaidSource = await page.$eval(
      ".source-code code",
      (element) => element.textContent ?? "",
    );
    const normalizedMermaidSource = mermaidSource.replaceAll("<br/>", " ");
    expect(normalizedMermaidSource).toContain("Receive request");
    expect(normalizedMermaidSource).toContain("Validate input");
    expect(normalizedMermaidSource).toContain("Send response");
    expect(mermaidSource.match(/-->/g)).toHaveLength(2);

    const previewLabels = await page.$$eval(
      ".mermaid-preview svg text, .mermaid-preview svg foreignObject",
      (elements) => elements.map((element) => element.textContent ?? "").join(" "),
    );
    const normalizedPreviewLabels = previewLabels.replaceAll(/\s/g, "");
    expect(normalizedPreviewLabels).toContain("Receiverequest");
    expect(normalizedPreviewLabels).toContain("Validateinput");
    expect(normalizedPreviewLabels).toContain("Sendresponse");
    expect(pageErrors).toEqual([]);
  });

  it("lets a user open an Excalidraw file and render its Mermaid preview", async () => {
    const pageErrors = capturePageErrors();
    await openEmptyWorkspace();

    const fileChooserPromise = page.waitForFileChooser();
    await page.locator('::-p-xpath(//button[normalize-space()="Open"])').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.accept([
      fileURLToPath(
        new URL("../examples/01-basic-flow.excalidraw", import.meta.url),
      ),
    ]);

    await page.waitForFunction(() => {
      const convert = document.querySelector<HTMLButtonElement>(
        "button.convert-button",
      );
      return convert !== null && !convert.disabled;
    });
    await page.click("button.convert-button");
    await page.waitForSelector(".mermaid-preview svg", { visible: true });

    const resultSummary = await page.$eval(
      ".result-meta",
      (element) => element.textContent ?? "",
    );
    expect(resultSummary).toContain("4 nodes");
    expect(resultSummary).toContain("3 edges");

    const previewLabels = await page.$$eval(
      ".mermaid-preview svg text, .mermaid-preview svg foreignObject",
      (elements) => elements.map((element) => element.textContent ?? "").join(" "),
    );
    expect(previewLabels.replaceAll(/\s/g, "")).toContain("Receiverequest");
    expect(previewLabels.replaceAll(/\s/g, "")).toContain("Inputvalid?");
    expect(pageErrors).toEqual([]);
  });
});
