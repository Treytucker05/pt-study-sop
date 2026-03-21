import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const notesGetAllMock = vi.fn();
const notesCreateMock = vi.fn();
const notesUpdateMock = vi.fn();
const notesDeleteMock = vi.fn();
const notesReorderMock = vi.fn();
const methodsGetAllMock = vi.fn();
const methodsAnalyticsMock = vi.fn();
const methodsCreateMock = vi.fn();
const methodsUpdateMock = vi.fn();
const methodsDeleteMock = vi.fn();
const methodsRateMock = vi.fn();
const methodsGetTemplatePromptMock = vi.fn();
const chainsGetAllMock = vi.fn();
const chainsGetOneMock = vi.fn();
const chainsCreateMock = vi.fn();
const chainsUpdateMock = vi.fn();
const chainsDeleteMock = vi.fn();
const chainsRateMock = vi.fn();
const chainRunHistoryMock = vi.fn();
const chainRunGetOneMock = vi.fn();
const coursesGetActiveMock = vi.fn();
const tutorTemplateChainsMock = vi.fn();

vi.mock("@/components/MethodBlockCard", () => ({
  default: ({ block }: { block: { id: number; name: string } }) => (
    <div data-testid={`method-block-${block.id}`}>{block.name}</div>
  ),
}));

vi.mock("@/components/ChainBuilder", () => ({
  default: ({ chain }: { chain: { id: number; name: string } }) => (
    <div data-testid="chain-builder">builder:{chain.name}</div>
  ),
}));

vi.mock("@/components/MethodAnalytics", () => ({
  default: ({ data }: { data: { summary?: { total_runs?: number } } }) => (
    <div data-testid="method-analytics">runs:{data.summary?.total_runs ?? 0}</div>
  ),
}));

vi.mock("@/components/RatingDialog", () => ({
  default: () => null,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    notes: {
      getAll: (...args: unknown[]) => notesGetAllMock(...args),
      create: (...args: unknown[]) => notesCreateMock(...args),
      update: (...args: unknown[]) => notesUpdateMock(...args),
      delete: (...args: unknown[]) => notesDeleteMock(...args),
      reorder: (...args: unknown[]) => notesReorderMock(...args),
    },
    methods: {
      getAll: (...args: unknown[]) => methodsGetAllMock(...args),
      analytics: (...args: unknown[]) => methodsAnalyticsMock(...args),
      create: (...args: unknown[]) => methodsCreateMock(...args),
      update: (...args: unknown[]) => methodsUpdateMock(...args),
      delete: (...args: unknown[]) => methodsDeleteMock(...args),
      rate: (...args: unknown[]) => methodsRateMock(...args),
      getTemplatePrompt: (...args: unknown[]) => methodsGetTemplatePromptMock(...args),
    },
    chains: {
      getAll: (...args: unknown[]) => chainsGetAllMock(...args),
      getOne: (...args: unknown[]) => chainsGetOneMock(...args),
      create: (...args: unknown[]) => chainsCreateMock(...args),
      update: (...args: unknown[]) => chainsUpdateMock(...args),
      delete: (...args: unknown[]) => chainsDeleteMock(...args),
      rate: (...args: unknown[]) => chainsRateMock(...args),
    },
    chainRun: {
      getHistory: (...args: unknown[]) => chainRunHistoryMock(...args),
      getOne: (...args: unknown[]) => chainRunGetOneMock(...args),
    },
    courses: {
      getActive: (...args: unknown[]) => coursesGetActiveMock(...args),
    },
    tutor: {
      getTemplateChains: (...args: unknown[]) => tutorTemplateChainsMock(...args),
    },
  },
}));

vi.mock("@/pages/brain", () => ({
  default: () => <div data-testid="brain-page-stub">Brain page</div>,
}));

vi.mock("@/pages/calendar", () => ({
  default: () => <div data-testid="calendar-page-stub">Calendar page</div>,
}));

vi.mock("@/pages/scholar", () => ({
  default: () => <div data-testid="scholar-page-stub">Scholar page</div>,
}));

vi.mock("@/pages/tutor", () => ({
  default: () => <div data-testid="tutor-page-stub">Tutor page</div>,
}));

vi.mock("@/pages/mastery", () => ({
  default: () => <div data-testid="mastery-page-stub">Mastery page</div>,
}));

vi.mock("@/pages/library", () => ({
  default: () => <div data-testid="library-page-stub">Library page</div>,
}));

vi.mock("@/pages/vault-health", () => ({
  default: () => <div data-testid="vault-health-page-stub">Vault Health page</div>,
}));

vi.mock("@/pages/not-found", () => ({
  default: () => <div data-testid="not-found-page-stub">Not Found</div>,
}));

import MethodsPage from "@/pages/methods";

const blockFixtures = [
  {
    id: 1,
    name: "Prime with constraints",
    category: "prepare",
    control_stage: "PRIME",
    description: "Prime method",
    default_duration_min: 5,
    energy_cost: "low",
    best_stage: "first_exposure",
    tags: [],
    evidence: "",
    facilitation_prompt: "prompt",
    artifact_type: "notes",
    knob_overrides_json: {},
    created_at: "2026-03-12T10:00:00Z",
  },
  {
    id: 2,
    name: "Retrieve under load",
    category: "retrieve",
    control_stage: "RETRIEVE",
    description: "Retrieve method",
    default_duration_min: 10,
    energy_cost: "medium",
    best_stage: "review",
    tags: [],
    evidence: "",
    facilitation_prompt: "prompt",
    artifact_type: "questions",
    knob_overrides_json: {},
    created_at: "2026-03-12T10:00:00Z",
  },
];

const chainFixtures = [
  {
    id: 10,
    name: "Template Alpha",
    description: "Template chain",
    block_ids: [1, 2],
    context_tags: {},
    is_template: 1,
    created_at: "2026-03-12T10:00:00Z",
  },
  {
    id: 11,
    name: "Custom Beta",
    description: "Custom chain",
    block_ids: [2],
    context_tags: {},
    is_template: 0,
    created_at: "2026-03-12T10:00:00Z",
  },
];

const tutorTemplateFixtures = [
  {
    id: 10,
    name: "Template Alpha",
    description: "Template chain",
  },
];

function renderMethodsPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MethodsPage />
    </QueryClientProvider>,
  );
}

describe("MethodsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, "", "/methods");
    window.confirm = vi.fn(() => true);

    notesGetAllMock.mockResolvedValue([]);
    notesCreateMock.mockResolvedValue({ id: 1 });
    notesUpdateMock.mockResolvedValue({ id: 1 });
    notesDeleteMock.mockResolvedValue({});
    notesReorderMock.mockResolvedValue({});

    methodsGetAllMock.mockResolvedValue(blockFixtures);
    methodsAnalyticsMock.mockResolvedValue({ summary: { total_runs: 4 } });
    methodsCreateMock.mockResolvedValue({ id: 3 });
    methodsUpdateMock.mockResolvedValue({});
    methodsDeleteMock.mockResolvedValue({});
    methodsRateMock.mockResolvedValue({});
    methodsGetTemplatePromptMock.mockResolvedValue({ facilitation_prompt: "" });

    chainsGetAllMock.mockResolvedValue(chainFixtures);
    chainsGetOneMock.mockResolvedValue({
      ...chainFixtures[0],
      blocks: blockFixtures,
    });
    chainsCreateMock.mockResolvedValue({ id: 12 });
    chainsUpdateMock.mockResolvedValue({});
    chainsDeleteMock.mockResolvedValue({});
    chainsRateMock.mockResolvedValue({});

    chainRunHistoryMock.mockResolvedValue([]);
    chainRunGetOneMock.mockResolvedValue({});
    coursesGetActiveMock.mockResolvedValue([]);
    tutorTemplateChainsMock.mockResolvedValue(tutorTemplateFixtures);
  });

  it("renders the library tab by default and loads seeded methods", async () => {
    renderMethodsPage();

    expect(await screen.findByRole("button", { name: "LIBRARY" })).toBeInTheDocument();
    expect(await screen.findByTestId("method-block-1")).toHaveTextContent("Prime with constraints");
    expect(screen.getByTestId("method-block-2")).toHaveTextContent("Retrieve under load");
  });

  it("loads chain detail on the CHAINS tab and keeps template names aligned with Tutor templates", async () => {
    renderMethodsPage();

    fireEvent.click(screen.getByRole("button", { name: "CHAINS" }));

    expect(await screen.findByText("2 chains")).toBeInTheDocument();
    expect(screen.getByText("1 templates")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Template Alpha"));

    expect(await screen.findByTestId("chain-builder")).toHaveTextContent("builder:Template Alpha");
    expect(chainsGetOneMock).toHaveBeenCalledWith(10);

    const visibleTemplateNames = chainFixtures
      .filter((chain) => chain.is_template)
      .map((chain) => chain.name);
    const tutorTemplateNames = tutorTemplateFixtures.map((chain) => chain.name);
    expect(visibleTemplateNames).toEqual(tutorTemplateNames);
  });

  it("only enables analytics loading when the ANALYTICS tab is opened", async () => {
    renderMethodsPage();

    expect(methodsAnalyticsMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "ANALYTICS" }));

    expect(await screen.findByTestId("method-analytics")).toHaveTextContent("runs:4");
    expect(methodsAnalyticsMock).toHaveBeenCalledTimes(1);
  });

  it("ignores malformed favorites state and restores valid favorites on rerender", async () => {
    localStorage.setItem("methods.favoriteIds", "{bad json");

    const firstRender = renderMethodsPage();
    expect(await screen.findByTestId("method-block-1")).toBeInTheDocument();

    firstRender.unmount();
    localStorage.setItem("methods.favoriteIds", "[1]");

    renderMethodsPage();
    expect(await screen.findByTestId("method-block-1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "FAVORITES" }));

    expect(await screen.findByTestId("method-block-1")).toBeInTheDocument();
    expect(screen.queryByTestId("method-block-2")).not.toBeInTheDocument();
  });

  it("loads through the full App shell and keeps Methods grouped under support nav", async () => {
    const { default: App } = await import("@/App");
    render(<App />);

    expect(await screen.findByTestId("nav-methods")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "LIBRARY" })).toBeInTheDocument();
    expect(screen.getByTestId("nav-methods")).toHaveAttribute("aria-current", "page");
  });

  it("shows a retryable error panel when methods fail to load", async () => {
    methodsGetAllMock.mockRejectedValueOnce(new Error("Methods backend exploded"));

    renderMethodsPage();

    expect(await screen.findByText("METHODS FAILED TO LOAD")).toBeInTheDocument();
    expect(screen.getByText("Methods backend exploded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows a retryable error panel when chains fail to load", async () => {
    chainsGetAllMock.mockRejectedValueOnce(new Error("Chains backend exploded"));

    renderMethodsPage();

    const chainsButtons = await screen.findAllByRole("button", { name: "CHAINS" });
    fireEvent.click(chainsButtons[0]);

    expect(await screen.findByText("CHAINS FAILED TO LOAD")).toBeInTheDocument();
    expect(screen.getByText("Chains backend exploded")).toBeInTheDocument();
  });

  it("retries the methods query from the error panel", async () => {
    methodsGetAllMock
      .mockRejectedValueOnce(new Error("Methods backend exploded"))
      .mockResolvedValueOnce([
        {
          id: 3,
          name: "Recovered Method",
          category: "prepare",
          control_stage: "PRIME",
          description: "Recovered",
          default_duration_min: 5,
          energy_cost: "low",
          best_stage: "first_exposure",
          tags: [],
          evidence: "",
          facilitation_prompt: "prompt",
          artifact_type: "notes",
          knob_overrides_json: {},
          created_at: "2026-03-12T10:00:00Z",
        },
      ]);

    renderMethodsPage();

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByText("Recovered Method")).toBeInTheDocument();
    });
  });
});
