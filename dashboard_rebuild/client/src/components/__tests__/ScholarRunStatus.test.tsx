import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScholarRunStatus } from "@/components/ScholarRunStatus";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock fetch for the inline queryFn
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock theme constants
vi.mock("@/lib/theme", () => ({
  CARD_BORDER_SECONDARY: "border-2 border-secondary",
  ICON_SM: "w-3 h-3",
  STATUS_SUCCESS: "text-green-400",
  STATUS_ERROR: "text-red-400",
}));

// Mock api (not used directly but imported)
vi.mock("@/lib/api", () => ({
  api: {},
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function mockStatus(data: Record<string, unknown>) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ScholarRunStatus", () => {
  it("renders the component title", () => {
    mockStatus({ running: false, status: "idle" });
    render(<ScholarRunStatus />, { wrapper: createWrapper() });
    expect(screen.getByText("SCHOLAR ORCHESTRATOR")).toBeInTheDocument();
  });

  it("renders Run Scholar button", () => {
    mockStatus({ running: false });
    render(<ScholarRunStatus />, { wrapper: createWrapper() });
    expect(screen.getByText("Run Scholar")).toBeInTheDocument();
  });

  it("renders study mode selector", () => {
    mockStatus({ running: false });
    render(<ScholarRunStatus />, { wrapper: createWrapper() });
    expect(screen.getByText("Study mode")).toBeInTheDocument();
  });

  it("shows Idle badge initially", () => {
    mockStatus({ running: false });
    render(<ScholarRunStatus />, { wrapper: createWrapper() });
    expect(screen.getByText("Idle")).toBeInTheDocument();
  });

  it("renders info text about study modes", () => {
    mockStatus({ running: false });
    render(<ScholarRunStatus />, { wrapper: createWrapper() });
    expect(screen.getByText(/Brain Study: session logs/)).toBeInTheDocument();
  });

  it("shows Complete badge when status is complete", async () => {
    mockStatus({ running: false, status: "complete", last_run: "2026-02-15T10:00:00Z" });
    render(<ScholarRunStatus />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Complete")).toBeInTheDocument();
    });
  });

  it("shows Error badge when status is error", async () => {
    mockStatus({ running: false, status: "error" });
    render(<ScholarRunStatus />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
    });
  });

  it("shows Running badge and current step when running", async () => {
    mockStatus({ running: true, current_step: "Analyzing sessions", progress: 42 });
    render(<ScholarRunStatus />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Running")).toBeInTheDocument();
    });
    expect(screen.getByText("Analyzing sessions")).toBeInTheDocument();
    expect(screen.getByText("Current Step:")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("Progress:")).toBeInTheDocument();
  });

  it("shows last run date when not running", async () => {
    mockStatus({ running: false, status: "complete", last_run: "2026-02-15T10:00:00Z" });
    render(<ScholarRunStatus />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Last Run:")).toBeInTheDocument();
    });
  });

  it("shows error list when errors present", async () => {
    mockStatus({ running: false, status: "error", errors: ["API timeout", "Rate limited"] });
    render(<ScholarRunStatus />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Errors:")).toBeInTheDocument();
    });
    expect(screen.getByText(/API timeout/)).toBeInTheDocument();
    expect(screen.getByText(/Rate limited/)).toBeInTheDocument();
  });
});
