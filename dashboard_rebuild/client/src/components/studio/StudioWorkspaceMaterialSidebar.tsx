import { useMemo, useState } from "react";
import {
  BookText,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Copy,
  FileText,
  Layers,
  Lightbulb,
  ListChecks,
  Package,
  Sparkles,
  StickyNote,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  SessionMaterialBundle,
  PrimePromotedWorkspaceObject,
} from "@/lib/sessionMaterialBundle";
import type { StudioPolishPromotedNote } from "@/lib/studioPacketSections";

// ── Section model ────────────────────────────────────────────────────

type MaterialItem = {
  id: string;
  title: string;
  snippet: string | null;
  source: string | null;
  copyText: string;
};

type MaterialSection = {
  id: string;
  label: string;
  stage: "load" | "tutor" | "prime" | "polish" | "workbench";
  icon: LucideIcon;
  emptyHint: string;
  items: MaterialItem[];
};

// ── Stage palette (matches the redesigned toolbar) ────────────────────

const STAGE_BADGE_CLASS: Record<MaterialSection["stage"], string> = {
  load: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  tutor: "border-primary/35 bg-primary/12 text-primary",
  prime: "border-violet-400/30 bg-violet-400/10 text-violet-200",
  polish: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  workbench: "border-pink-400/30 bg-pink-400/10 text-pink-200",
};

// ── Section builders ─────────────────────────────────────────────────

function snippet(text: string | null | undefined, limit = 140): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 1)}…` : trimmed;
}

function buildPrimeItem(
  obj: PrimePromotedWorkspaceObject,
  index: number,
): MaterialItem {
  if (obj.kind === "excerpt") {
    return {
      id: `prime-excerpt-${obj.id ?? index}`,
      title: obj.title || "Excerpt",
      snippet: snippet(obj.detail),
      source:
        obj.provenance?.sourceTitle ||
        obj.provenance?.sourcePath ||
        null,
      copyText: `${obj.title}\n\n${obj.detail}`.trim(),
    };
  }
  return {
    id: `prime-note-${obj.id ?? index}`,
    title: obj.title || "Repair note",
    snippet: snippet(obj.detail),
    source: null,
    copyText: `${obj.title}\n\n${obj.detail}`.trim(),
  };
}

function buildPolishItem(
  note: StudioPolishPromotedNote,
  index: number,
): MaterialItem {
  return {
    id: `polish-${note.id ?? index}`,
    title: note.title || "Tutor output",
    snippet: snippet(note.content),
    source: note.badge || null,
    copyText: `${note.title}\n\n${note.content}`.trim(),
  };
}

function buildSections(
  bundle: SessionMaterialBundle | undefined,
): MaterialSection[] {
  if (!bundle) {
    return [];
  }

  const concepts: MaterialItem[] = bundle.concepts.map((c, i) => ({
    id: `concept-${i}`,
    title: c.concept,
    snippet: null,
    source: c.sourceTitle,
    copyText: c.concept,
  }));

  const terms: MaterialItem[] = bundle.terms.map((t, i) => ({
    id: `term-${i}`,
    title: t.term,
    snippet: t.definition,
    source: t.sourceTitle,
    copyText: t.definition ? `${t.term} :: ${t.definition}` : t.term,
  }));

  const summaries: MaterialItem[] = bundle.summaries.map((s, i) => ({
    id: `summary-${i}`,
    title: snippet(s.text, 60) || "Summary",
    snippet: snippet(s.text),
    source: s.sourceTitle,
    copyText: s.text,
  }));

  const explanations: MaterialItem[] = bundle.rootExplanations.map((e, i) => ({
    id: `explain-${i}`,
    title: snippet(e.text, 60) || "Explanation",
    snippet: snippet(e.text),
    source: e.sourceTitle,
    copyText: e.text,
  }));

  const gaps: MaterialItem[] = bundle.gaps.map((g, i) => ({
    id: `gap-${i}`,
    title: snippet(g.text, 60) || "Gap",
    snippet: snippet(g.text),
    source: g.sourceTitle,
    copyText: g.text,
  }));

  const artifacts: MaterialItem[] = bundle.artifacts.map((a, i) => ({
    id: `artifact-${i}`,
    title: a.title,
    snippet: snippet(a.content),
    source: a.type,
    copyText: a.content,
  }));

  const objectives: MaterialItem[] = bundle.learningObjectives.map((lo, i) => ({
    id: `lo-${i}`,
    title: lo.title,
    snippet: lo.loCode,
    source: lo.sourceTitle,
    copyText: lo.loCode ? `${lo.loCode} — ${lo.title}` : lo.title,
  }));

  const primeItems: MaterialItem[] = bundle.primePacket.map(buildPrimeItem);
  const polishItems: MaterialItem[] = bundle.polishPacket.map(buildPolishItem);
  const noteItems: MaterialItem[] = bundle.notes.map((n, i) => ({
    id: `note-${n.id ?? i}`,
    title: n.title || `Note ${i + 1}`,
    snippet: snippet(n.content),
    source: n.mode === "exact" ? "exact quote" : "editable",
    copyText: n.content,
  }));

  return [
    {
      id: "objectives",
      label: "Learning objectives",
      stage: "load",
      icon: Target,
      emptyHint: "No learning objectives picked up yet.",
      items: objectives,
    },
    {
      id: "prime-packet",
      label: "Prime Packet",
      stage: "prime",
      icon: Package,
      emptyHint: "No prime packet items yet.",
      items: primeItems,
    },
    {
      id: "concepts",
      label: "Concepts",
      stage: "tutor",
      icon: Sparkles,
      emptyHint: "No concepts captured yet.",
      items: concepts,
    },
    {
      id: "terms",
      label: "Terms",
      stage: "tutor",
      icon: BookText,
      emptyHint: "No terms captured yet.",
      items: terms,
    },
    {
      id: "summaries",
      label: "Summaries",
      stage: "tutor",
      icon: ListChecks,
      emptyHint: "No summaries yet.",
      items: summaries,
    },
    {
      id: "root-explanations",
      label: "Root explanations",
      stage: "tutor",
      icon: Lightbulb,
      emptyHint: "No root explanations yet.",
      items: explanations,
    },
    {
      id: "gaps",
      label: "Gaps",
      stage: "tutor",
      icon: Layers,
      emptyHint: "No gaps recorded yet.",
      items: gaps,
    },
    {
      id: "artifacts",
      label: "Artifacts",
      stage: "tutor",
      icon: FileText,
      emptyHint: "No tutor artifacts yet.",
      items: artifacts,
    },
    {
      id: "polish-packet",
      label: "Polish Packet",
      stage: "polish",
      icon: Package,
      emptyHint: "No polish packet items yet.",
      items: polishItems,
    },
    {
      id: "notes",
      label: "Notes",
      stage: "workbench",
      icon: StickyNote,
      emptyHint: "No notes captured yet.",
      items: noteItems,
    },
  ];
}

// ── Component ────────────────────────────────────────────────────────

export interface StudioWorkspaceMaterialSidebarProps {
  bundle: SessionMaterialBundle | undefined;
  className?: string;
}

export function StudioWorkspaceMaterialSidebar({
  bundle,
  className,
}: StudioWorkspaceMaterialSidebarProps) {
  const sections = useMemo(() => buildSections(bundle), [bundle]);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const haystack = `${item.title} ${item.snippet ?? ""} ${item.source ?? ""}`.toLowerCase();
          return haystack.includes(q);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [query, sections]);

  const totalItems = useMemo(
    () => sections.reduce((sum, section) => sum + section.items.length, 0),
    [sections],
  );

  async function copyItem(item: MaterialItem) {
    try {
      await navigator.clipboard.writeText(item.copyText);
      setCopiedId(item.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === item.id ? null : current));
      }, 1400);
    } catch {
      // Clipboard unavailable; ignore so the user can still see the content.
    }
  }

  return (
    <div
      data-testid="studio-workspace-material-sidebar"
      className={cn(
        "flex h-full min-h-0 w-72 shrink-0 flex-col border-r border-primary/12 bg-black/35",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-primary/10 px-3 py-2">
        <div className="flex flex-col">
          <span className="font-arcade text-[10px] uppercase tracking-[0.24em] text-primary/80">
            Material
          </span>
          <span className="font-mono text-[10px] tracking-[0.12em] text-foreground/52">
            {bundle?.isReady
              ? `${totalItems} item${totalItems === 1 ? "" : "s"} in this run`
              : "Waiting for session material"}
          </span>
        </div>
      </div>

      <div className="shrink-0 border-b border-primary/10 px-3 py-2">
        <Input
          data-testid="studio-workspace-material-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search material..."
          aria-label="Search workspace material"
          className="h-8 border-primary/15 bg-black/40 font-mono text-xs"
        />
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-1 px-2 py-2">
          {filteredSections.length === 0 ? (
            <div className="px-2 py-6 text-center font-mono text-[11px] text-foreground/52">
              {query.trim()
                ? "No matches in this run."
                : "No material yet. Run priming or capture notes to populate."}
            </div>
          ) : (
            filteredSections.map((section) => {
              const isCollapsed = collapsed[section.id] ?? false;
              const Icon = section.icon;
              return (
                <div
                  key={section.id}
                  data-testid={`studio-workspace-material-section-${section.id}`}
                  className="flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((prev) => ({
                        ...prev,
                        [section.id]: !isCollapsed,
                      }))
                    }
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-primary/8"
                    aria-expanded={!isCollapsed}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-primary/70" />
                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground/82">
                        {section.label}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.16em]",
                          STAGE_BADGE_CLASS[section.stage],
                        )}
                      >
                        {section.items.length}
                      </span>
                    </span>
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-foreground/52" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-foreground/52" />
                    )}
                  </button>
                  {!isCollapsed ? (
                    <div className="flex flex-col gap-1 pb-2 pl-1.5 pr-1 pt-0.5">
                      {section.items.length === 0 ? (
                        <div className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/42">
                          {section.emptyHint}
                        </div>
                      ) : (
                        section.items.map((item) => (
                          <div
                            key={item.id}
                            data-testid={`studio-workspace-material-item-${item.id}`}
                            className="group flex flex-col gap-1 rounded-md border border-primary/10 bg-black/30 px-2 py-1.5 transition-colors hover:border-primary/25 hover:bg-primary/8"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-mono text-[11px] leading-snug text-foreground/88">
                                {item.title}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyItem(item)}
                                title="Copy to clipboard"
                                aria-label={`Copy ${item.title}`}
                                className="shrink-0 rounded p-1 text-foreground/52 opacity-0 transition-opacity hover:bg-primary/10 hover:text-primary group-hover:opacity-100 focus:opacity-100"
                              >
                                {copiedId === item.id ? (
                                  <ClipboardCheck className="h-3 w-3 text-emerald-300" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            {item.snippet ? (
                              <span className="font-mono text-[10px] leading-relaxed text-foreground/62 line-clamp-3">
                                {item.snippet}
                              </span>
                            ) : null}
                            {item.source ? (
                              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/42">
                                {item.source}
                              </span>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
