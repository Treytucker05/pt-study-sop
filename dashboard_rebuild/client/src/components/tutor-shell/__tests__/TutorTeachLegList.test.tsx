import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { TutorTeachLegList } from "@/components/tutor-shell/TutorTeachLegList";

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      listTeachLegs: vi.fn().mockResolvedValue({
        workflow_id: "wf-1",
        count: 2,
        teach_legs: [
          {
            session_id: "sess-a",
            teach_leg_label: "Leg A",
            status: "completed",
            turn_count: 3,
            is_active: false,
          },
          {
            session_id: "sess-b",
            teach_leg_label: "Leg B",
            status: "active",
            turn_count: 1,
            is_active: true,
          },
        ],
      }),
    },
  },
}));

describe("TutorTeachLegList", () => {
  it("renders teach leg labels from the workflow API", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <TutorTeachLegList workflowId="wf-1" activeSessionId="sess-b" />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("tutor-teach-leg-list")).toBeInTheDocument();
    expect(screen.getByText(/Leg A/)).toBeInTheDocument();
    expect(screen.getByText(/Leg B/)).toBeInTheDocument();
  });
});
