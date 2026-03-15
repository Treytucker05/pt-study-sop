import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const {
  notesGetAllMock,
  notesCreateMock,
  notesUpdateMock,
  notesDeleteMock,
  notesReorderMock,
  setLocationMock,
  toastMock,
} = vi.hoisted(() => ({
  notesGetAllMock: vi.fn(),
  notesCreateMock: vi.fn(),
  notesUpdateMock: vi.fn(),
  notesDeleteMock: vi.fn(),
  notesReorderMock: vi.fn(),
  setLocationMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
  useLocation: () => ["/", setLocationMock],
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

  it("compacts the header on scroll down and expands it again when scrolled back up", async () => {
    render(
      <Layout>
        <div>page</div>
      </Layout>,
      { wrapper: createWrapper() },
    );

    const header = screen.getByText("TREY'S STUDY SYSTEM").closest("header");
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
      expect(header).toHaveAttribute("data-header-state", "compact");
    });

    Object.defineProperty(main as HTMLElement, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0,
    });

    fireEvent.scroll(main as HTMLElement);

    await waitFor(() => {
      expect(header).toHaveAttribute("data-header-state", "expanded");
    });
  });
});
