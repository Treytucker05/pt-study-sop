import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const indexHtmlPath = path.resolve(currentDir, "../../index.html");

describe("client shell metadata", () => {
  it("uses PT Study Brain metadata and keeps pinch zoom enabled", () => {
    const html = fs.readFileSync(indexHtmlPath, "utf8");

    expect(html).toContain("<title>PT Study Brain</title>");
    expect(html).toContain(
      '<meta name="description" content="AI-powered adaptive study system for physical therapy education" />',
    );
    expect(html).toContain('<meta property="og:title" content="PT Study Brain" />');
    expect(html).toContain(
      '<meta property="og:description" content="AI-powered adaptive study system for physical therapy education" />',
    );
    expect(html).toContain('<meta name="twitter:title" content="PT Study Brain" />');
    expect(html).toContain(
      '<meta name="twitter:description" content="AI-powered adaptive study system for physical therapy education" />',
    );
    expect(html).toContain("maximum-scale=5");
    expect(html).not.toContain("maximum-scale=1");
    expect(html).not.toContain("Arcade UI Kit");
    expect(html).not.toContain("90s Arcade Themed UI Template");
  });
});
