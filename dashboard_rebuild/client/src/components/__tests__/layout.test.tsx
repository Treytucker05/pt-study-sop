import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { PageScaffold } from "@/components/PageScaffold";

const {
  notesGetAllMock,
  notesCreateMock,
  notesUpdateMock,
  notesDeleteMock,
  notesReorderMock,
  setLocationMock,
  mockLocationState,
  toastMock,
} = vi.hoisted(() => {
  const mockLocationState = { value: "/" };
  return {
    notesGetAllMock: vi.fn(),
    notesCreateMock: vi.fn(),
    notesUpdateMock: vi.fn(),
    notesDeleteMock: vi.fn(),
    notesReorderMock: vi.fn(),
    setLocationMock: vi.fn((nextLocation: string) => {
      mockLocationState.value = nextLocation;
    }),
    mockLocationState,
    toastMock: vi.fn(),
  };
});

vi.mock("wouter", () => ({
  useLocation: () => [mockLocationState.value, setLocationMock],
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
  },
}));

vi.mock("@/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

import Layout from "@/components/layout";

function TestRouteScaffolds() {
  const route = mockLocationState.value;

  return (
    <>
      <div style={route !== "/" ? { display: "none" } : undefined}>
        <PageScaffold title="BRAIN" subtitle="Brain workspace" eyebrow="Primary">
          <div>Brain content</div>
        </PageScaffold>
      </div>

      <div style={route !== "/scholar" ? { display: "none" } : undefined}>
        <PageScaffold
          title="SCHOLAR"
          subtitle="Scholar workspace"
          eyebrow="Research"
        >
          <div>Scholar content</div>
        </PageScaffold>
      </div>

      <div style={route !== "/methods" ? { display: "none" } : undefined}>
        <PageScaffold
          title="METHODS"
          subtitle="Methods workspace"
          eyebrow="Tools"
        >
          <div>Methods content</div>
        </PageScaffold>
      </div>
    </>
  );
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("Layout nav and notes dock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationState.value = "/";
    notesGetAllMock.mockResolvedValue([]);
    notesCreateMock.mockResolvedValue({});
    notesUpdateMock.mockResolvedValue({});
    notesDeleteMock.mockResolvedValue({});
    notesReorderMock.mockResolvedValue({});
    window.localStorage.clear();
  });

  it("renders all nav buttons inline and removes the hamburger", async () => {
    render(
      <Layout>
        <div>page</div>
      </Layout>,
      { wrapper: createWrapper() },
    );

    expect(screen.queryByLabelText(/toggle navigation/i)).not.toBeInTheDocument();
    expect(await screen.findByTestId("nav-brain")).toBeInTheDocument();
    expect(screen.getByTestId("nav-scholar")).toBeInTheDocument();
    expect(screen.getByTestId("nav-tutor")).toBeInTheDocument();
    expect(screen.getByTestId("nav-library")).toBeInTheDocument();
    expect(screen.getByTestId("nav-mastery")).toBeInTheDocument();
    expect(screen.getByTestId("nav-calendar")).toBeInTheDocument();
    expect(screen.getByTestId("nav-methods")).toBeInTheDocument();
    expect(screen.getByTestId("nav-vault")).toBeInTheDocument();
  });

  it("renders a short mobile brand while keeping the full desktop title", async () => {
    render(
      <Layout>
        <div>page</div>
      </Layout>,
      { wrapper: createWrapper() },
    );

    await screen.findByTestId("mobile-nav-trigger");

    const shortBrand = screen.getByText("PT STUDY");
    expect(shortBrand).toHaveClass("sm:hidden");

    const fullBrand = screen
      .getAllByText("TREY'S STUDY SYSTEM")
      .find((element) => element.className.includes("sm:inline"));

    expect(fullBrand).toBeDefined();
    expect(fullBrand).toHaveClass("hidden");
  });

  it("does not render the floating Theme Lab button on shipped routes", async () => {
    const { rerender } = render(
      <Layout>
        <div>page</div>
      </Layout>,
      { wrapper: createWrapper() },
    );

    await screen.findByTestId("nav-brain");
    expect(screen.queryByTestId("theme-lab-link")).not.toBeInTheDocument();

    mockLocationState.value = "/tutor";
    rerender(
      <Layout>
        <div>page</div>
      </Layout>,
    );

    expect(screen.queryByTestId("theme-lab-link")).not.toBeInTheDocument();
  });

  it("opens the notes panel from the dock and closes it back to the side", async () => {
    render(
      <Layout>
        <div>page</div>
      </Layout>,
      { wrapper: createWrapper() },
    );

    const dock = await screen.findByTestId("notes-dock");
    fireEvent.click(dock);

    expect(await screen.findByText("QUICK_NOTES")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/close notes/i));

    await waitFor(() => {
      expect(screen.queryByText("QUICK_NOTES")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("notes-dock")).toBeInTheDocument();
  });

  it("lets the notes dock move vertically and persists the position", async () => {
    render(
      <Layout>
        <div>page</div>
      </Layout>,
      { wrapper: createWrapper() },
    );

    const dock = await screen.findByTestId("notes-dock");

    await waitFor(() => {
      expect(dock.style.top).toMatch(/px/);
    });

    const initialTop = dock.style.top;

    fireEvent.pointerDown(dock, { pointerId: 1, clientY: 220 });
    fireEvent.pointerMove(dock, { pointerId: 1, clientY: 340 });
    fireEvent.pointerUp(dock, { pointerId: 1, clientY: 340 });

    await waitFor(() => {
      expect(dock.style.top).not.toBe(initialTop);
    });

    expect(Number(window.localStorage.getItem("layout.notesDockTop.v1"))).toBeGreaterThan(0);
  });

  it("keeps the header static and expanded while the page scrolls", async () => {
    render(
      <Layout>
        <div>page</div>
      </Layout>,
      { wrapper: createWrapper() },
    );

    const header = document.querySelector("header[data-header-shell]");
    const main = document.querySelector("main");

    expect(header).not.toBeNull();
    expect(main).not.toBeNull();
    expect(header).toHaveAttribute("data-header-state", "expanded");

    Object.defineProperty(main as HTMLElement, "scrollTop", {
      configurable: true,
      writable: true,
      value: 180,
    });

    fireEvent.scroll(main as HTMLElement);

    await waitFor(() => {
      expect(header).toHaveAttribute("data-header-state", "expanded");
    });
    expect(document.body).not.toHaveClass("scrolled-down");

    Object.defineProperty(main as HTMLElement, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0,
    });

    fireEvent.scroll(main as HTMLElement);

    await waitFor(() => {
      expect(header).toHaveAttribute("data-header-state", "expanded");
    });
    expect(document.body).not.toHaveClass("scrolled-down");
  });

  it("updates the shared hero when a nav route changes to another kept-alive page", async () => {
    const portalId = "page-hero-portal";

    const { rerender } = render(
      <Layout>
        <TestRouteScaffolds />
      </Layout>,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(
        within(document.getElementById(portalId) as HTMLElement).getByRole("heading", {
          name: "BRAIN",
        }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("nav-scholar"));
    expect(setLocationMock).toHaveBeenCalledWith("/scholar");

    rerender(
      <Layout>
        <TestRouteScaffolds />
      </Layout>,
    );

    await waitFor(() => {
      expect(
        within(document.getElementById(portalId) as HTMLElement).getByRole("heading", {
          name: "SCHOLAR",
        }),
      ).toBeInTheDocument();
    });
    expect(
      within(document.getElementById(portalId) as HTMLElement).queryByRole("heading", {
        name: "BRAIN",
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("nav-methods"));
    expect(setLocationMock).toHaveBeenCalledWith("/methods");

    rerender(
      <Layout>
        <TestRouteScaffolds />
      </Layout>,
    );

    await waitFor(() => {
      expect(
        within(document.getElementById(portalId) as HTMLElement).getByRole("heading", {
          name: "METHODS",
        }),
      ).toBeInTheDocument();
    });
  });
});
