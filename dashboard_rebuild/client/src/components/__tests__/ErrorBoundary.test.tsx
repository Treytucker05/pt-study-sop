import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ErrorBoundary,
  SidebarErrorFallback,
  TabErrorFallback,
} from "@/components/ErrorBoundary";

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("test explosion");
  return <div>child ok</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("child ok")).toBeInTheDocument();
  });

  it("renders default fallback UI when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("COMPONENT ERROR")).toBeInTheDocument();
    expect(screen.getByText("test explosion")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("custom fallback")).toBeInTheDocument();
    expect(screen.queryByText("COMPONENT ERROR")).not.toBeInTheDocument();
  });

  it("calls onError callback when child throws", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "test explosion" }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it("resets error state when Try Again is clicked", () => {
    let shouldThrow = true;
    function Conditional() {
      if (shouldThrow) throw new Error("test explosion");
      return <div>child ok</div>;
    }

    render(
      <ErrorBoundary>
        <Conditional />
      </ErrorBoundary>
    );
    expect(screen.getByText("COMPONENT ERROR")).toBeInTheDocument();

    // Stop throwing before reset so the re-render succeeds
    shouldThrow = false;
    fireEvent.click(screen.getByText("Try Again"));

    expect(screen.getByText("child ok")).toBeInTheDocument();
  });
});

describe("SidebarErrorFallback", () => {
  it("renders sidebar error message and calls onReset", () => {
    const onReset = vi.fn();
    render(<SidebarErrorFallback onReset={onReset} />);
    expect(screen.getByText("Sidebar Error")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Retry"));
    expect(onReset).toHaveBeenCalledOnce();
  });
});

describe("TabErrorFallback", () => {
  it("renders tab name in error message and calls onReset", () => {
    const onReset = vi.fn();
    render(<TabErrorFallback tabName="GRAPH" onReset={onReset} />);
    expect(screen.getByText("GRAPH TAB ERROR")).toBeInTheDocument();
    expect(screen.getByText("Failed to load graph view")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Reload Tab"));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
