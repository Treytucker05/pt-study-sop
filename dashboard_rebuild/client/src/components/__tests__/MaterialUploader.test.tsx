import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MaterialUploader } from "@/components/MaterialUploader";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock api
vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      uploadMaterial: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock theme constants
vi.mock("@/lib/theme", () => ({
  TEXT_SECTION_LABEL: "font-arcade text-sm",
  TEXT_BODY: "font-terminal text-lg",
  TEXT_MUTED: "font-terminal text-xs text-muted-foreground",
  BTN_OUTLINE: "rounded-none font-terminal text-xs",
  ICON_SM: "w-3 h-3",
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createFile(name: string, size = 1024): File {
  const content = new Array(size).fill("x").join("");
  return new File([content], name, { type: "application/pdf" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MaterialUploader", () => {
  it("renders the drop zone", () => {
    render(<MaterialUploader />, { wrapper: createWrapper() });
    expect(screen.getByText("Drop files or click to browse")).toBeInTheDocument();
    expect(screen.getByText("PDF, DOCX, PPTX, MD, TXT, MP4")).toBeInTheDocument();
  });

  it("adds valid files to queue via file input", () => {
    render(<MaterialUploader />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createFile("notes.pdf");
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    expect(screen.getByText("notes.pdf")).toBeInTheDocument();
    expect(screen.getByText("UPLOAD 1 FILE")).toBeInTheDocument();
  });

  it("rejects unsupported file types", async () => {
    const { toast } = await import("sonner");
    render(<MaterialUploader />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    expect(toast.error).toHaveBeenCalledWith("No supported files selected");
    expect(screen.queryByText("photo.jpg")).not.toBeInTheDocument();
  });

  it("removes file from queue when X is clicked", () => {
    render(<MaterialUploader />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createFile("notes.pdf");
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    expect(screen.getByText("notes.pdf")).toBeInTheDocument();

    // Click the remove button (X icon)
    const removeBtn = screen.getByText("notes.pdf").closest("div")!.querySelector("button")!;
    fireEvent.click(removeBtn);

    expect(screen.queryByText("notes.pdf")).not.toBeInTheDocument();
  });

  it("shows file size in queue", () => {
    render(<MaterialUploader />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createFile("notes.pdf", 2048);
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    expect(screen.getByText("2KB")).toBeInTheDocument();
  });

  it("adds multiple files to queue", () => {
    render(<MaterialUploader />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [createFile("a.pdf"), createFile("b.md")];
    Object.defineProperty(input, "files", { value: files });
    fireEvent.change(input);

    expect(screen.getByText("a.pdf")).toBeInTheDocument();
    expect(screen.getByText("b.md")).toBeInTheDocument();
    expect(screen.getByText("UPLOAD 2 FILES")).toBeInTheDocument();
  });

  it("accepts MP4 video files", () => {
    render(<MaterialUploader />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mp4 = new File(["video data"], "lecture.mp4", { type: "video/mp4" });
    Object.defineProperty(input, "files", { value: [mp4] });
    fireEvent.change(input);

    expect(screen.getByText("lecture.mp4")).toBeInTheDocument();
    expect(screen.getByText("UPLOAD 1 FILE")).toBeInTheDocument();
  });

  it("accepts MP4 alongside other file types", () => {
    render(<MaterialUploader />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pdf = createFile("notes.pdf");
    const mp4 = new File(["video data"], "lecture.mp4", { type: "video/mp4" });
    Object.defineProperty(input, "files", { value: [pdf, mp4] });
    fireEvent.change(input);

    expect(screen.getByText("notes.pdf")).toBeInTheDocument();
    expect(screen.getByText("lecture.mp4")).toBeInTheDocument();
    expect(screen.getByText("UPLOAD 2 FILES")).toBeInTheDocument();
  });

  it("accepts DOCX files", () => {
    render(<MaterialUploader />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const docx = new File(["doc data"], "outline.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    Object.defineProperty(input, "files", { value: [docx] });
    fireEvent.change(input);

    expect(screen.getByText("outline.docx")).toBeInTheDocument();
  });

  it("accepts PPTX files", () => {
    render(<MaterialUploader />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pptx = new File(["ppt data"], "lecture.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    Object.defineProperty(input, "files", { value: [pptx] });
    fireEvent.change(input);

    expect(screen.getByText("lecture.pptx")).toBeInTheDocument();
  });

  it("accepts TXT and MD files", () => {
    render(<MaterialUploader />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const txt = new File(["notes"], "study.txt", { type: "text/plain" });
    const md = new File(["# Notes"], "notes.md", { type: "text/markdown" });
    Object.defineProperty(input, "files", { value: [txt, md] });
    fireEvent.change(input);

    expect(screen.getByText("study.txt")).toBeInTheDocument();
    expect(screen.getByText("notes.md")).toBeInTheDocument();
  });

  it("rejects multiple unsupported files together", async () => {
    const { toast } = await import("sonner");
    render(<MaterialUploader />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const exe = new File(["bin"], "virus.exe", { type: "application/octet-stream" });
    const svg = new File(["<svg>"], "icon.svg", { type: "image/svg+xml" });
    Object.defineProperty(input, "files", { value: [exe, svg] });
    fireEvent.change(input);

    expect(toast.error).toHaveBeenCalled();
    expect(screen.queryByText("virus.exe")).not.toBeInTheDocument();
    expect(screen.queryByText("icon.svg")).not.toBeInTheDocument();
  });

  it("shows singular 'FILE' text for single file", () => {
    render(<MaterialUploader />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createFile("single.pdf");
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    expect(screen.getByText("UPLOAD 1 FILE")).toBeInTheDocument();
  });

  it("handles empty file list from input", () => {
    render(<MaterialUploader />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [] });
    fireEvent.change(input);

    expect(screen.queryByText(/UPLOAD/)).not.toBeInTheDocument();
  });
});
