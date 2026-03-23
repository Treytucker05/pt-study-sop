import { render, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { setLocationMock } = vi.hoisted(() => ({
  setLocationMock: vi.fn(),
}));

let mockLocation = "/";

vi.mock("wouter", () => ({
  useLocation: () => [mockLocation, setLocationMock],
}));

import { PageScaffold } from "@/components/PageScaffold";

function KeepAliveScaffolds() {
  const brainHidden = mockLocation !== "/";
  const methodsHidden = mockLocation !== "/methods";

  return (
    <>
      <div style={brainHidden ? { display: "none" } : undefined}>
        <PageScaffold
          title="Brain"
          subtitle="Brain evidence summary"
          eyebrow="Evidence"
        >
          <div>Brain page</div>
        </PageScaffold>
      </div>

      <div style={methodsHidden ? { display: "none" } : undefined}>
        <PageScaffold
          title="Method Library"
          subtitle="Methods control summary"
          eyebrow="Control"
        >
          <div>Methods page</div>
        </PageScaffold>
      </div>
    </>
  );
}

function appendHeroPortal() {
  const portal = document.createElement("div");
  portal.id = "page-hero-portal";
  document.body.appendChild(portal);
  return portal;
}

describe("PageScaffold", () => {
  beforeEach(() => {
    mockLocation = "/";
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("updates the shared hero portal when a kept-alive route becomes active again", async () => {
    const heroPortal = appendHeroPortal();
    const { rerender } = render(<KeepAliveScaffolds />);

    await waitFor(() => {
      expect(
        within(heroPortal).getByRole("heading", { name: "Brain" }),
      ).toBeInTheDocument();
    });
    expect(
      within(heroPortal).getByText("Brain evidence summary"),
    ).toBeInTheDocument();

    mockLocation = "/methods";
    rerender(<KeepAliveScaffolds />);

    await waitFor(() => {
      expect(
        within(heroPortal).getByRole("heading", { name: "Method Library" }),
      ).toBeInTheDocument();
    });
    expect(
      within(heroPortal).getByText("Methods control summary"),
    ).toBeInTheDocument();
    expect(
      within(heroPortal).queryByRole("heading", { name: "Brain" }),
    ).not.toBeInTheDocument();

    mockLocation = "/";
    rerender(<KeepAliveScaffolds />);

    await waitFor(() => {
      expect(
        within(heroPortal).getByRole("heading", { name: "Brain" }),
      ).toBeInTheDocument();
    });
    expect(
      within(heroPortal).queryByRole("heading", { name: "Method Library" }),
    ).not.toBeInTheDocument();
  });

  it("clears the shared hero portal when no scaffold route is visible", async () => {
    const heroPortal = appendHeroPortal();
    const { rerender } = render(<KeepAliveScaffolds />);

    await waitFor(() => {
      expect(
        within(heroPortal).getByRole("heading", { name: "Brain" }),
      ).toBeInTheDocument();
    });

    mockLocation = "/missing";
    rerender(<KeepAliveScaffolds />);

    await waitFor(() => {
      expect(heroPortal).toBeEmptyDOMElement();
    });
  });

  it("stacks the hero stat grid above the action row", async () => {
    const heroPortal = appendHeroPortal();

    render(
      <PageScaffold
        title="Tutor"
        subtitle="Tutor workspace"
        eyebrow="Live Study Core"
        stats={[
          { label: "Mode", value: "Tutor" },
          { label: "Session", value: "Live" },
          { label: "Course", value: "Exercise Physiology" },
          { label: "Materials", value: "1" },
        ]}
        actions={<button type="button">Refresh</button>}
      >
        <div>Body</div>
      </PageScaffold>,
    );

    await waitFor(() => {
      expect(
        within(heroPortal).getByRole("heading", { name: "Tutor" }),
      ).toBeInTheDocument();
    });

    const meta = heroPortal.querySelector(".page-shell__meta");
    expect(meta).not.toBeNull();

    const metaChildren = Array.from((meta as HTMLElement).children) as HTMLElement[];
    expect(metaChildren[0]).toHaveClass("page-shell__stat-grid");
    expect(metaChildren[1]).toHaveClass("page-shell__actions");
    expect(within(metaChildren[0]).getByText("Exercise Physiology")).toBeInTheDocument();
    expect(within(metaChildren[1]).getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("renders the hero footer beneath the hero header", async () => {
    const heroPortal = appendHeroPortal();

    render(
      <PageScaffold
        title="Tutor"
        subtitle="Tutor workspace"
        eyebrow="Live Study Core"
        heroFooter={
          <div data-testid="hero-footer">
            <button type="button">Workspace nav</button>
          </div>
        }
      >
        <div>Body</div>
      </PageScaffold>,
    );

    await waitFor(() => {
      expect(
        within(heroPortal).getByRole("heading", { name: "Tutor" }),
      ).toBeInTheDocument();
    });

    const hero = heroPortal.querySelector(".page-shell__hero");
    expect(hero).not.toBeNull();

    const header = hero?.querySelector(".page-shell__header");
    const footer = hero?.querySelector(".page-shell__hero-footer");
    expect(header).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(
      header!.compareDocumentPosition(footer!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeGreaterThan(0);
    expect(
      within(footer as HTMLElement).getByRole("button", {
        name: "Workspace nav",
      }),
    ).toBeInTheDocument();
  });
});
