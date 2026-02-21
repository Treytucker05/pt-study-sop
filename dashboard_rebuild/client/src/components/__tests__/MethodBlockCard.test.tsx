import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MethodBlockCard from "@/components/MethodBlockCard";
import type { MethodBlock } from "@/api";

const baseBlock: MethodBlock = {
  id: 1,
  name: "Active Recall",
  category: "retrieve",
  description: "Attempt to retrieve information from memory without looking at notes",
  default_duration_min: 15,
  energy_cost: "medium",
  best_stage: "first_pass",
  tags: ["solo", "high-yield", "retrieval", "core", "extra-tag"],
  evidence: "Roediger & Butler (2011)",
  created_at: "2026-01-01T00:00:00Z",
};

describe("MethodBlockCard", () => {
  it("renders block name and stage badge in full mode", () => {
    render(<MethodBlockCard block={baseBlock} />);
    expect(screen.getByText("Active Recall")).toBeInTheDocument();
    expect(screen.getByText("RETRIEVAL")).toBeInTheDocument();
  });

  it("renders description and evidence in full mode", () => {
    render(<MethodBlockCard block={baseBlock} />);
    expect(screen.getByText(/Attempt to retrieve/)).toBeInTheDocument();
    expect(screen.getByText("Roediger & Butler (2011)")).toBeInTheDocument();
  });

  it("renders duration and energy cost", () => {
    render(<MethodBlockCard block={baseBlock} />);
    expect(screen.getByText("15m")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
  });

  it("renders best_stage when present", () => {
    render(<MethodBlockCard block={baseBlock} />);
    expect(screen.getByText("first pass")).toBeInTheDocument();
  });

  it("limits tags to 4 in full mode", () => {
    render(<MethodBlockCard block={baseBlock} />);
    expect(screen.getByText("solo")).toBeInTheDocument();
    expect(screen.getByText("high-yield")).toBeInTheDocument();
    expect(screen.getByText("retrieval")).toBeInTheDocument();
    expect(screen.getByText("core")).toBeInTheDocument();
    expect(screen.queryByText("extra-tag")).not.toBeInTheDocument();
  });

  it("hides description and evidence in compact mode", () => {
    render(<MethodBlockCard block={baseBlock} compact />);
    expect(screen.getByText("Active Recall")).toBeInTheDocument();
    expect(screen.queryByText(/Attempt to retrieve/)).not.toBeInTheDocument();
    expect(screen.queryByText("Roediger & Butler (2011)")).not.toBeInTheDocument();
  });

  it("fires onClick callback", () => {
    const onClick = vi.fn();
    render(<MethodBlockCard block={baseBlock} onClick={onClick} />);
    fireEvent.click(screen.getByText("Active Recall"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("handles null description and evidence gracefully", () => {
    const minimal: MethodBlock = {
      ...baseBlock,
      description: null,
      evidence: null,
      best_stage: null,
      tags: [],
    };
    render(<MethodBlockCard block={minimal} />);
    expect(screen.getByText("Active Recall")).toBeInTheDocument();
    expect(screen.getByText("15m")).toBeInTheDocument();
  });

  it("shows legacy category when showLegacyCategory is set", () => {
    render(<MethodBlockCard block={baseBlock} showLegacyCategory />);
    expect(screen.getByText("legacy: retrieve")).toBeInTheDocument();
  });
});
