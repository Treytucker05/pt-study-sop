import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MethodAnalytics from "@/components/MethodAnalytics";
import type { MethodAnalyticsResponse } from "@/api";

const emptyData: MethodAnalyticsResponse = {
  block_stats: [],
  chain_stats: [],
  recent_ratings: [],
};

const populatedData: MethodAnalyticsResponse = {
  block_stats: [
    { id: 1, name: "Active Recall", category: "retrieve", usage_count: 5, avg_effectiveness: 4.2, avg_engagement: 3.8 },
    { id: 2, name: "Mind Mapping", category: "encode", usage_count: 3, avg_effectiveness: 3.5, avg_engagement: 4.0 },
    { id: 3, name: "Unused Block", category: "prepare", usage_count: 0, avg_effectiveness: null, avg_engagement: null },
  ],
  chain_stats: [
    { id: 1, name: "Deep Study", is_template: 1, usage_count: 4, avg_effectiveness: 4.0, avg_engagement: 3.5 },
    { id: 2, name: "No Ratings Chain", is_template: 0, usage_count: 0, avg_effectiveness: null, avg_engagement: null },
  ],
  recent_ratings: [
    { id: 1, method_block_id: 1, chain_id: null, effectiveness: 5, engagement: 3, notes: "Great session", context: {}, rated_at: "2026-01-01T00:00:00Z", method_name: "Flashcard Drill", chain_name: null },
    { id: 2, method_block_id: null, chain_id: 1, effectiveness: 3, engagement: 2, notes: null, context: {}, rated_at: "2026-01-02T00:00:00Z", method_name: null, chain_name: "Morning Routine" },
    { id: 3, method_block_id: null, chain_id: null, effectiveness: 4, engagement: 4, notes: null, context: {}, rated_at: "2026-01-03T00:00:00Z", method_name: null, chain_name: null },
  ],
};

describe("MethodAnalytics", () => {
  it("renders section headers", () => {
    render(<MethodAnalytics data={emptyData} />);
    expect(screen.getByText("BLOCK EFFECTIVENESS")).toBeInTheDocument();
    expect(screen.getByText("CHAIN COMPARISON")).toBeInTheDocument();
    expect(screen.getByText("RECENT RATINGS")).toBeInTheDocument();
  });

  it("shows empty messages when no ratings exist", () => {
    render(<MethodAnalytics data={emptyData} />);
    expect(screen.getByText(/No ratings yet/)).toBeInTheDocument();
    expect(screen.getByText("No chain ratings yet.")).toBeInTheDocument();
    expect(screen.getByText("No ratings recorded yet.")).toBeInTheDocument();
  });

  it("renders only blocks with usage_count > 0", () => {
    render(<MethodAnalytics data={populatedData} />);
    expect(screen.getByText("Active Recall")).toBeInTheDocument();
    expect(screen.getByText("Mind Mapping")).toBeInTheDocument();
    expect(screen.queryByText("Unused Block")).not.toBeInTheDocument();
  });

  it("renders block effectiveness values", () => {
    render(<MethodAnalytics data={populatedData} />);
    expect(screen.getByText("4.2")).toBeInTheDocument();
    expect(screen.getByText("3.5")).toBeInTheDocument();
  });

  it("renders usage counts for blocks", () => {
    render(<MethodAnalytics data={populatedData} />);
    expect(screen.getByText("(5)")).toBeInTheDocument();
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("renders only chains with usage_count > 0", () => {
    render(<MethodAnalytics data={populatedData} />);
    expect(screen.getByText("Deep Study")).toBeInTheDocument();
    expect(screen.queryByText("No Ratings Chain")).not.toBeInTheDocument();
  });

  it("renders chain effectiveness value", () => {
    render(<MethodAnalytics data={populatedData} />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders recent ratings with method/chain name", () => {
    render(<MethodAnalytics data={populatedData} />);
    expect(screen.getByText("E:5/5")).toBeInTheDocument();
    expect(screen.getByText("G:3/5")).toBeInTheDocument();
    expect(screen.getByText("E:3/5")).toBeInTheDocument();
    expect(screen.getByText("Flashcard Drill")).toBeInTheDocument();
    expect(screen.getByText("Morning Routine")).toBeInTheDocument();
  });

  it("shows notes when present in recent ratings", () => {
    render(<MethodAnalytics data={populatedData} />);
    expect(screen.getByText("Great session")).toBeInTheDocument();
  });

  it("shows 'Unknown' for ratings with no method or chain name", () => {
    render(<MethodAnalytics data={populatedData} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});
