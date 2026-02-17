import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyllabusViewTab } from "@/components/SyllabusViewTab";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock fetch for inline queryFn (courses)
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock api methods
vi.mock("@/lib/api", () => ({
  api: {
    modules: { getByCourse: vi.fn().mockResolvedValue([]) },
    learningObjectives: { getByCourse: vi.fn().mockResolvedValue([]) },
    scheduleEvents: { getByCourse: vi.fn().mockResolvedValue([]) },
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([]),
  });
});

describe("SyllabusViewTab", () => {
  it("renders the course selector", () => {
    render(<SyllabusViewTab />, { wrapper: createWrapper() });
    expect(screen.getByText("SELECT COURSE")).toBeInTheDocument();
  });

  it("shows 'Select a course' message when no course selected", () => {
    render(<SyllabusViewTab />, { wrapper: createWrapper() });
    expect(screen.getByText("Select a course to view syllabus")).toBeInTheDocument();
  });

  it("renders course selector placeholder", () => {
    render(<SyllabusViewTab />, { wrapper: createWrapper() });
    expect(screen.getByText("Choose a course...")).toBeInTheDocument();
  });
});
