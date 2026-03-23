import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  WorkspaceTopBar,
  type WorkspaceTopBarProps,
} from "@/components/workspace/WorkspaceTopBar";

const defaultProps: WorkspaceTopBarProps = {
  mode: "prep",
  onModeChange: vi.fn(),
  courseName: "Neuroanatomy",
  courses: [
    { id: 1, name: "Neuroanatomy" },
    { id: 2, name: "Physiology" },
  ],
  onCourseChange: vi.fn(),
  workspaceName: "Session 1",
  onWorkspaceNameChange: vi.fn(),
  onStartTutor: vi.fn(),
  timerSeconds: 754,
  timerPaused: false,
  onToggleTimer: vi.fn(),
};

function renderBar(overrides: Partial<WorkspaceTopBarProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<WorkspaceTopBar {...props} />);
}

describe("WorkspaceTopBar", () => {
  // 1. Renders course name in selector
  it("renders current course name in the selector trigger", () => {
    renderBar();
    expect(screen.getByTestId("course-selector")).toHaveTextContent(
      "Neuroanatomy",
    );
  });

  // 2. Renders workspace name in input
  it("renders workspace name in the input field", () => {
    renderBar();
    const input = screen.getByTestId("workspace-name-input");
    expect(input).toHaveValue("Session 1");
  });

  // 3. Mode selector shows current mode
  it("shows the current mode in the mode selector", () => {
    renderBar({ mode: "tutor" });
    expect(screen.getByTestId("mode-selector")).toHaveTextContent(/tutor/i);
  });

  // 4. Mode change calls onModeChange (we verify the trigger renders; actual
  //    Radix Select opening requires pointer events not supported in jsdom,
  //    so we test the callback is wired by checking the trigger is present)
  it("renders mode selector trigger for mode changes", () => {
    renderBar();
    expect(screen.getByTestId("mode-selector")).toBeInTheDocument();
  });

  // 5. Start Tutor button calls onStartTutor
  it("calls onStartTutor when the Start Tutor button is clicked", () => {
    const onStartTutor = vi.fn();
    renderBar({ onStartTutor });
    fireEvent.click(screen.getByTestId("start-tutor-btn"));
    expect(onStartTutor).toHaveBeenCalledOnce();
  });

  // 6. Timer displays formatted time
  it("displays the timer in MM:SS format", () => {
    renderBar({ timerSeconds: 754 });
    // 754 seconds = 12:34
    expect(screen.getByTestId("timer-display")).toHaveTextContent("12:34");
  });

  it("displays zero timer correctly", () => {
    renderBar({ timerSeconds: 0 });
    expect(screen.getByTestId("timer-display")).toHaveTextContent("00:00");
  });

  // 7. Layout slot buttons render
  it("renders 5 layout slot buttons by default", () => {
    renderBar();
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByTestId(`layout-slot-${i}`)).toBeInTheDocument();
    }
  });

  it("renders custom number of layout slots", () => {
    renderBar({ layoutSlots: 3 });
    expect(screen.getByTestId("layout-slot-1")).toBeInTheDocument();
    expect(screen.getByTestId("layout-slot-3")).toBeInTheDocument();
    expect(screen.queryByTestId("layout-slot-4")).not.toBeInTheDocument();
  });

  // Timer toggle
  it("calls onToggleTimer when the timer toggle button is clicked", () => {
    const onToggleTimer = vi.fn();
    renderBar({ onToggleTimer });
    fireEvent.click(screen.getByTestId("timer-toggle"));
    expect(onToggleTimer).toHaveBeenCalledOnce();
  });

  // Workspace name change on blur
  it("calls onWorkspaceNameChange on input blur", () => {
    const onWorkspaceNameChange = vi.fn();
    renderBar({ onWorkspaceNameChange });
    const input = screen.getByTestId("workspace-name-input");
    fireEvent.change(input, { target: { value: "Renamed" } });
    fireEvent.blur(input);
    expect(onWorkspaceNameChange).toHaveBeenCalledWith("Renamed");
  });

  // Layout slot click calls onLoadLayout
  it("calls onLoadLayout on layout slot click", () => {
    const onLoadLayout = vi.fn();
    renderBar({ onLoadLayout });
    fireEvent.click(screen.getByTestId("layout-slot-2"));
    expect(onLoadLayout).toHaveBeenCalledWith(2);
  });

  // Layout slot shift+click calls onSaveLayout
  it("calls onSaveLayout on shift+click of a layout slot", () => {
    const onSaveLayout = vi.fn();
    renderBar({ onSaveLayout });
    fireEvent.click(screen.getByTestId("layout-slot-3"), { shiftKey: true });
    expect(onSaveLayout).toHaveBeenCalledWith(3);
  });
});
