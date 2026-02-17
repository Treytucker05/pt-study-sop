import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SOPRefRenderer, InlineSOPRefRenderer } from "@/components/SOPRefRenderer";

vi.mock("@/utils/sopref", () => ({
  renderSOPRefLinks: vi.fn((content: string) => `<span class="rendered">${content}</span>`),
  setupSOPRefNavigation: vi.fn(),
  navigateToSOPFile: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SOPRefRenderer", () => {
  it("renders a container div with sopref-container class", () => {
    const { container } = render(<SOPRefRenderer content="Hello" />);
    const div = container.querySelector(".sopref-container");
    expect(div).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(<SOPRefRenderer content="Hello" className="my-class" />);
    const div = container.querySelector(".sopref-container.my-class");
    expect(div).toBeTruthy();
  });

  it("renders content via renderSOPRefLinks", () => {
    const { container } = render(<SOPRefRenderer content="See SOPRef[file.md]" />);
    const rendered = container.querySelector(".rendered");
    expect(rendered).toBeTruthy();
  });

  it("sets pre-wrap whitespace style", () => {
    const { container } = render(<SOPRefRenderer content="text" />);
    const div = container.querySelector(".sopref-container") as HTMLDivElement;
    expect(div.style.whiteSpace).toBe("pre-wrap");
  });
});

describe("InlineSOPRefRenderer", () => {
  it("renders a span with inline-sopref class", () => {
    const { container } = render(<InlineSOPRefRenderer content="Hello" />);
    const span = container.querySelector(".inline-sopref");
    expect(span).toBeTruthy();
  });

  it("renders content via renderSOPRefLinks", () => {
    const { container } = render(<InlineSOPRefRenderer content="test" />);
    const rendered = container.querySelector(".rendered");
    expect(rendered).toBeTruthy();
  });
});
