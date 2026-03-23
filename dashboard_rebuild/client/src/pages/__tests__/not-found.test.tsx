import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "@/pages/not-found";

describe("Not Found page", () => {
  it("renders the shared HUD panel surface for the 404 state", () => {
    const { container } = render(<NotFound />);

    expect(
      screen.getByRole("heading", { name: /404 page not found/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/did you forget to add the page to the router/i),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-ui="hud-panel"][data-hud-variant="b"]'),
    ).not.toBeNull();
  });
});
