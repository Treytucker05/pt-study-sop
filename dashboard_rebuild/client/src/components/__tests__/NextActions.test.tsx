import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextActions } from "@/components/NextActions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockGetQueue = vi.fn().mockResolvedValue([]);
const mockGetSettings = vi.fn().mockResolvedValue({});
const mockGenerate = vi.fn().mockResolvedValue({ tasks_created: 3 });
const mockUpdateTask = vi.fn().mockResolvedValue({});
const mockUpdateSettings = vi.fn().mockResolvedValue({});

// Mock api
vi.mock("@/lib/api", () => ({
  api: {
    planner: {
      getQueue: (...args: unknown[]) => mockGetQueue(...args),
      getSettings: (...args: unknown[]) => mockGetSettings(...args),
      generate: (...args: unknown[]) => mockGenerate(...args),
      updateTask: (...args: unknown[]) => mockUpdateTask(...args),
      updateSettings: (...args: unknown[]) => mockUpdateSettings(...args),
    },
  },
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock("@/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
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
  mockGetQueue.mockResolvedValue([]);
  mockGetSettings.mockResolvedValue({});
});

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

describe("NextActions", () => {
  it("renders the component title", () => {
    render(<NextActions />, { wrapper: createWrapper() });
    expect(screen.getByText("NEXT_ACTIONS")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    render(<NextActions />, { wrapper: createWrapper() });
    expect(screen.getByText("Loading queue...")).toBeInTheDocument();
  });

  it("shows GENERATE button in all mode", () => {
    render(<NextActions filter="all" />, { wrapper: createWrapper() });
    expect(screen.getByText("GENERATE")).toBeInTheDocument();
  });

  it("hides GENERATE button in today mode", () => {
    render(<NextActions filter="today" />, { wrapper: createWrapper() });
    expect(screen.queryByText("GENERATE")).not.toBeInTheDocument();
  });

  it("shows TOGGLE button for calendar source", () => {
    render(<NextActions filter="all" />, { wrapper: createWrapper() });
    expect(screen.getByText("TOGGLE")).toBeInTheDocument();
    expect(screen.getByText(/Source:/)).toBeInTheDocument();
  });

  it("shows empty message after loading when queue is empty", async () => {
    render(<NextActions filter="all" />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/No pending tasks/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Click GENERATE/)).toBeInTheDocument();
  });

  it("renders today tasks with TaskRow when queue has due items", async () => {
    mockGetQueue.mockResolvedValue([
      { id: 1, anchor_text: "Brachial Plexus", scheduled_date: today, status: "pending", course_name: "Anatomy", planned_minutes: 25, review_number: 2 },
      { id: 2, anchor_text: "ATP Cycle", scheduled_date: today, status: "pending" },
    ]);
    render(<NextActions filter="all" />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/TODAY \(2\)/)).toBeInTheDocument();
    });
    expect(screen.getByText(/R2/)).toBeInTheDocument();
    expect(screen.getByText(/Brachial Plexus/)).toBeInTheDocument();
    expect(screen.getByText("Anatomy")).toBeInTheDocument();
    expect(screen.getByText("25m")).toBeInTheDocument();
    expect(screen.getByText(/ATP Cycle/)).toBeInTheDocument();
  });

  it("renders upcoming section for future tasks in all mode", async () => {
    mockGetQueue.mockResolvedValue([
      { id: 10, anchor_text: "Future Task", scheduled_date: tomorrow, status: "pending" },
    ]);
    render(<NextActions filter="all" />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/UPCOMING \(1\)/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Future Task/)).toBeInTheDocument();
  });

  it("shows no-today message in today mode when only future tasks exist", async () => {
    mockGetQueue.mockResolvedValue([
      { id: 10, anchor_text: "Future", scheduled_date: tomorrow, status: "pending" },
    ]);
    render(<NextActions filter="today" />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/No tasks due today/)).toBeInTheDocument();
    });
    expect(screen.getByText(/1 upcoming/)).toBeInTheDocument();
  });

  it("calls completeMutation when DONE is clicked", async () => {
    mockGetQueue.mockResolvedValue([
      { id: 5, anchor_text: "Test Task", scheduled_date: today, status: "pending" },
    ]);
    render(<NextActions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Test Task/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText("DONE")[0]);
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(5, { status: "completed" });
    });
  });

  it("calls deferMutation when DEFER is clicked", async () => {
    mockGetQueue.mockResolvedValue([
      { id: 7, anchor_text: "Defer Me", scheduled_date: today, status: "pending" },
    ]);
    render(<NextActions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Defer Me/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText("DEFER")[0]);
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(7, { status: "deferred" });
    });
  });

  it("shows Google source when settings specify google", async () => {
    mockGetSettings.mockResolvedValue({ calendar_source: "google" });
    render(<NextActions filter="all" />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Google/)).toBeInTheDocument();
    });
  });
});
