import { describe, it, expect, vi, afterEach } from "vitest";
import {
  parseSOPRefs,
  renderSOPRefLinks,
  setupSOPRefNavigation,
  navigateToSOPFile,
  highlightSOPSection,
} from "@/utils/sopref";

describe("parseSOPRefs", () => {
  it("returns empty array for content with no refs", () => {
    expect(parseSOPRefs("Just plain text")).toEqual([]);
  });

  it("parses a single SOPRef link", () => {
    const result = parseSOPRefs("See SOPRef[sop/05-intake.md] for details");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      raw: "SOPRef[sop/05-intake.md]",
      path: "sop/05-intake.md",
      section: undefined,
      displayText: "05-intake.md",
    });
  });

  it("parses SOPRef with section anchor", () => {
    const result = parseSOPRefs("SOPRef[sop/05-intake.md#phase-2]");
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("sop/05-intake.md");
    expect(result[0].section).toBe("phase-2");
    expect(result[0].displayText).toBe("05-intake.md");
  });

  it("parses multiple SOPRefs", () => {
    const content = "SOPRef[a.md] and SOPRef[b.md#sec]";
    const result = parseSOPRefs(content);
    expect(result).toHaveLength(2);
    expect(result[0].path).toBe("a.md");
    expect(result[1].path).toBe("b.md");
    expect(result[1].section).toBe("sec");
  });
});

describe("renderSOPRefLinks", () => {
  it("replaces SOPRef with anchor HTML", () => {
    const onNavigate = vi.fn();
    const result = renderSOPRefLinks("See SOPRef[sop/file.md]", onNavigate);
    expect(result).toContain("<a");
    expect(result).toContain('data-path="sop/file.md"');
    expect(result).toContain("file.md");
    expect(result).not.toContain("SOPRef[sop/file.md]");
  });

  it("includes section data attribute when present", () => {
    const onNavigate = vi.fn();
    const result = renderSOPRefLinks("SOPRef[file.md#intro]", onNavigate);
    expect(result).toContain('data-section="intro"');
    expect(result).toContain("§intro");
  });

  it("returns original text when no refs", () => {
    const onNavigate = vi.fn();
    const result = renderSOPRefLinks("No links here", onNavigate);
    expect(result).toBe("No links here");
  });
});

describe("setupSOPRefNavigation", () => {
  it("attaches click handlers to sopref-link elements", () => {
    const container = document.createElement("div");
    container.innerHTML = `<a class="sopref-link" data-path="sop/file.md" data-section="intro" href="#">link</a>`;
    const onNavigate = vi.fn();

    setupSOPRefNavigation(container, onNavigate);

    const link = container.querySelector("a")!;
    link.click();
    expect(onNavigate).toHaveBeenCalledWith("sop/file.md", "intro");
  });

  it("handles links without section", () => {
    const container = document.createElement("div");
    container.innerHTML = `<a class="sopref-link" data-path="sop/file.md" href="#">link</a>`;
    const onNavigate = vi.fn();

    setupSOPRefNavigation(container, onNavigate);
    container.querySelector("a")!.click();
    expect(onNavigate).toHaveBeenCalledWith("sop/file.md", undefined);
  });

  it("ignores non-sopref elements", () => {
    const container = document.createElement("div");
    container.innerHTML = `<a class="other-link" href="#">not a ref</a>`;
    const onNavigate = vi.fn();

    setupSOPRefNavigation(container, onNavigate);
    // No error, no calls
    expect(onNavigate).not.toHaveBeenCalled();
  });
});

describe("navigateToSOPFile", () => {
  it("does not throw when called", () => {
    // jsdom does not implement navigation; verify no error is thrown
    expect(() => navigateToSOPFile("sop/file.md")).not.toThrow();
  });

  it("handles section parameter", () => {
    expect(() => navigateToSOPFile("sop/file.md", "intro")).not.toThrow();
  });
});

describe("highlightSOPSection", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("scrolls to element and adds/removes highlight class", async () => {
    vi.useFakeTimers();
    const el = document.createElement("div");
    el.id = "test-section";
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);

    highlightSOPSection("test-section");

    vi.advanceTimersByTime(500);
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    expect(el.classList.contains("highlight-section")).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(el.classList.contains("highlight-section")).toBe(false);

    document.body.removeChild(el);
  });

  it("does nothing when element not found", () => {
    vi.useFakeTimers();
    highlightSOPSection("nonexistent");
    vi.advanceTimersByTime(3000);
  });
});
