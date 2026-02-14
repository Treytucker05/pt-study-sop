interface BrainDocMetaOptions {
  mode: "structured" | "mindmap";
  title: string;
  mermaid?: string;
  layoutPath?: string;
  strokesPath?: string;
  snapshotPath?: string;
}

export function sanitizeCanvasTitle(raw: string | undefined): string {
  const value = (raw || "Untitled Canvas").trim();
  const safe = value.replace(/[/\\?%*:|"<>]/g, "-");
  return safe || "Untitled Canvas";
}

export function buildBrainCanvasMarkdown(opts: BrainDocMetaOptions): string {
  const now = new Date().toISOString();
  const lines = [
    "---",
    "type: brain-canvas",
    `canvas_mode: ${opts.mode}`,
    `title: "${opts.title.replace(/"/g, '\\"')}"`,
    `updated: ${now}`,
  ];

  if (opts.layoutPath) lines.push(`layout_path: "${opts.layoutPath}"`);
  if (opts.strokesPath) lines.push(`strokes_path: "${opts.strokesPath}"`);
  if (opts.snapshotPath) lines.push(`snapshot_path: "${opts.snapshotPath}"`);

  lines.push("---", "", `# ${opts.title}`, "");

  if (opts.mermaid?.trim()) {
    lines.push("```mermaid", opts.mermaid.trim(), "```", "");
  }

  return lines.join("\n");
}
