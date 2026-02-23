import { describe, it, expect } from "vitest";

describe("Test environment smoke test", () => {
  it("vitest globals are available", () => {
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });

  it("jsdom environment is configured", () => {
    expect(document).toBeDefined();
    expect(document.createElement).toBeDefined();
    const div = document.createElement("div");
    div.textContent = "Hello";
    expect(div.textContent).toBe("Hello");
  });

  it("module aliases resolve (@/ paths)", async () => {
    // If this import fails, the @ alias in vitest.config.ts is broken
    const displayStage = await import("@/lib/displayStage");
    expect(displayStage.getDisplayStage).toBeDefined();
  });
});
