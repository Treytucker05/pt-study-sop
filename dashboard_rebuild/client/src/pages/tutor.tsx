import Layout from "@/components/layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Copy,
  Link,
  Code,
  Loader2
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearch } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api, SOPIndex, SOPGroup, SOPSection, SOPItem } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SopBreakdownPanel } from "@/components/SopBreakdownPanel";

interface TreeItemProps {
  item: SOPItem;
  isSelected: boolean;
  onSelect: (path: string) => void;
}

function TreeItem({ item, isSelected, onSelect }: TreeItemProps) {
  const isFolder = item.type === "dir";

  return (
    <button
      onClick={() => !isFolder && onSelect(item.path)}
      disabled={isFolder}
      className={cn(
        "w-full text-left px-3 py-1.5 text-sm font-terminal flex items-center gap-2 transition-colors",
        isFolder
          ? "text-muted-foreground cursor-default"
          : "hover:bg-primary/20 cursor-pointer",
        isSelected && "bg-primary/30 text-primary border-l-2 border-primary"
      )}
    >
      {isFolder ? (
        <Folder className="w-4 h-4 text-yellow-500/70" />
      ) : (
        <FileText className="w-4 h-4 text-primary/70" />
      )}
      <span className="truncate">{item.title}</span>
    </button>
  );
}

interface TreeSectionProps {
  section: SOPSection;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function TreeSection({ section, selectedPath, onSelect }: TreeSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasSelectedItem = section.items.some(item => item.path === selectedPath);

  useEffect(() => {
    if (hasSelectedItem) setIsOpen(true);
  }, [hasSelectedItem]);

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-2 py-1 text-xs font-arcade uppercase text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
      >
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {section.title}
      </button>
      {isOpen && (
        <div className="ml-2 border-l border-secondary/50">
          {section.items.map((item) => (
            <TreeItem
              key={item.id}
              item={item}
              isSelected={item.path === selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TreeGroupProps {
  group: SOPGroup;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  defaultOpen?: boolean;
}

function TreeGroup({ group, selectedPath, onSelect, defaultOpen = false }: TreeGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasSelectedItem = group.sections.some(section =>
    section.items.some(item => item.path === selectedPath)
  );

  useEffect(() => {
    if (hasSelectedItem) setIsOpen(true);
  }, [hasSelectedItem]);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-2 text-sm font-arcade uppercase bg-secondary/20 hover:bg-secondary/30 flex items-center gap-2 transition-colors border-l-2 border-primary/50"
      >
        {isOpen ? (
          <FolderOpen className="w-4 h-4 text-primary" />
        ) : (
          <Folder className="w-4 h-4 text-primary/70" />
        )}
        {group.title}
      </button>
      {isOpen && (
        <div className="mt-1 ml-2">
          {group.sections.map((section) => (
            <TreeSection
              key={section.id}
              section={section}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CopyButton({
  onClick,
  icon: Icon,
  label,
  copied
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  copied: boolean;
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "rounded-none border border-secondary hover:bg-primary hover:text-black text-[10px] font-arcade h-auto py-2 px-3 transition-all",
        copied && "bg-green-500/20 border-green-500 text-green-500"
      )}
    >
      <Icon className="w-3 h-3 mr-1" />
      {copied ? "COPIED!" : label}
    </Button>
  );
}

const CONCEPT_MAP_CONTENT = `╔══════════════════════════════════════════════════════════════════════════════╗
║                    PT STUDY OS — CONCEPT MAP                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

                         ┌─────────────────────────┐
                         │  PT Study OS Vision     │
                         │  ──────────────────     │
                         │ • Durable Context       │
                         │ • End-to-End Flows      │
                         │ • RAG-First             │
                         │ • Spaced Cards          │
                         │ • No Phantoms           │
                         └────────┬────────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                ▼                 ▼                 ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │  MAP Phase   │  │  LOOP Phase  │  │  WRAP Phase  │
        │ ──────────   │  │ ────────────  │  │ ────────────  │
        │ M0 Planning  │  │ M2 Prime     │  │ M6 Wrap      │
        │ M1 Entry     │  │ M3 Encode    │  │ Exit Ticket  │
        │              │  │ M4 Build     │  │ Session      │
        │              │  │ M5 Modes     │  │ Ledger       │
        └──────────────┘  └──────┬───────┘  └──────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            ┌──────────────┐ ┌──────────┐ ┌──────────────┐
            │ PEIRRO Cycle │ │ KWIK     │ │ Content      │
            │ ──────────   │ │ Encoding │ │ Engines      │
            │ Prepare      │ │ ──────   │ │ ────────     │
            │ Encode ────┐ │ │ • Sound  │ │ • Anatomy    │
            │ Interrogate│ │ │ • Func.  │ │ • Concept    │
            │ Retrieve   │ │ │ • Image  │ │              │
            │ Refine     │ │ │ • Reson. │ │              │
            │ Overlearn  │ │ │ • Lock   │ │              │
            └──────────────┘ └──────────┘ └──────────────┘
                    │
                    └─────────────────────┐
                                          ▼
                        ┌──────────────────────────────┐
                        │   Core Rules (10 No-Skip)    │
                        │ ────────────────────────────  │
                        │ 1. M0 Planning (mandatory)    │
                        │ 2. Source-Lock (invariant)    │
                        │ 3. Seed-Lock (ask-first)      │
                        │ 4. Level Gating (L2→L4)       │
                        │ 5. PEIRRO Cycle (no skip)     │
                        │ 6. Exit Ticket (mandatory)    │
                        │ 7. Session Ledger (mand.)     │
                        │ 8. No Phantoms (invariant)    │
                        │ 9. Evidence Nuance            │
                        │ 10. Function Before Struct.   │
                        └──────────────────────────────┘

                              SYSTEM FLOW
                    ┌──────────────────────────────┐
                    │   Material Ingestion         │
                    │   (pre-session, if needed)   │
                    │   → Tutor-Ready Packet       │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │   TUTOR SYSTEM               │
                    │   (Custom GPT)               │
                    │ • Enforces M0-M6 flow        │
                    │ • Runs PEIRRO cycle          │
                    │ • KWIK encoding              │
                    │ • Content engines            │
                    └──────────────┬───────────────┘
                                   │
                ┌──────────────────┼──────────────┐
                ▼                  ▼              ▼
        ┌─────────────┐  ┌──────────┐  ┌──────────────┐
        │ RAG System  │  │ Anki     │  │ Exit Ticket+ │
        │ (source     │  │ Bridge   │  │ Session      │
        │  lock)      │  │ (cards)  │  │ Ledger       │
        └─────────────┘  └──────────┘  └───────┬──────┘
                                                 │
                                                 ▼
                                    ┌────────────────────────┐
                                    │ BRAIN (Ingestion)      │
                                    │ • Parse Session Ledger │
                                    │ • Generate JSON logs   │
                                    │ • Store data           │
                                    │ • Produce Resume       │
                                    └────────────┬───────────┘
                                                 │
                                                 ▼
                            ┌────────────────────────────────┐
                            │ DASHBOARD / PLANNER            │
                            │ • Coverage maps                │
                            │ • Spacing alerts               │
                            │ • Readiness scores             │
                            │ • Weekly plans (3+2 rotation)  │
                            │ • Next session recommendations │
                            └────────────────────────────────┘

                              DATA SCHEMAS
        ┌─────────────┬─────────────┬──────────────┬────────────┐
        │ Session Log │ RAG Doc     │ Card         │ Resume     │
        │ ─────────── │ ────────    │ ────         │ ──────     │
        │ • date      │ • id        │ • deck       │ • readiness│
        │ • topic     │ • chunks    │ • front      │ • coverage │
        │ • mode      │ • images    │ • back       │ • gaps     │
        │ • duration  │ • metadata  │ • tags       │ • recs     │
        │ • understanding          │ • source_refs│            │
        │ • retention │ • Function-first glossary │            │
        │ • RSR %     │ (ALL definitions)         │            │
        │ • artifacts │                          │            │
        └─────────────┴─────────────┴──────────────┴────────────┘


                            OPERATING MODES
        ┌──────────┬──────────┬──────────┬──────────┬──────────┐
        │  Core    │  Sprint  │  Light   │  Quick   │  Drill   │
        │ ──────── │ ──────── │ ──────── │ Sprint   │ ──────── │
        │ Guided   │ Test-1st │ Micro    │ 20-30min │ Repeated │
        │ w/       │ rapid    │ 10-15min │ burst    │ misses   │
        │ scaffolds│ gap find │ 1-3 cards│ mand.    │ deep     │
        │ Default  │ Exam prep│ Focused  │ wrap     │ practice │
        │ new mat. │          │          │ cards    │ on weak   │
        └──────────┴──────────┴──────────┴──────────┴──────────┘


                      WEEKLY ROTATION (3+2)

        Week Structure:
        ┌──────────────────────────────────┐
        │ Study 3 classes (1 session each)  │
        │         ↓                         │
        │ Review 2 weakest anchors (spaced) │
        │         ↓                         │
        │ Repeat cycle                      │
        └──────────────────────────────────┘

        Progress Status Progression:
        Not Started → In Progress → Needs Review → Solid
                                                    (2 retrieval ✓s)


                      EVIDENCE GUARDRAILS
        ┌─────────────────────────────────────────┐
        │ Prevent Overclaiming:                   │
        │ ✗ No numeric forgetting curves         │
        │ ✗ No "2x" dual-coding guarantees       │
        │ ✗ Zeigarnik effect ≠ memory guarantee  │
        │ ✗ RSR thresholds are adaptive          │
        │ ✗ Interleaving ≠ distributed practice  │
        └─────────────────────────────────────────┘`;

export default function Tutor() {
  const searchString = useSearch();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "breakdown">("content");

  // Parse path from URL query string
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const pathParam = params.get("path");
    if (pathParam) {
      setSelectedPath(pathParam);
    }
  }, [searchString]);

  // Fetch SOP index
  const { data: index, isLoading: indexLoading, error: indexError } = useQuery({
    queryKey: ["sop-index"],
    queryFn: () => api.sop.getIndex(),
  });

  // Fetch selected file content
  const { data: fileData, isLoading: fileLoading, error: fileError } = useQuery({
    queryKey: ["sop-file", selectedPath],
    queryFn: () => {
      if (!selectedPath) return null;
      if (selectedPath === "concept-map") {
        return { content: CONCEPT_MAP_CONTENT };
      }
      return api.sop.getFile(selectedPath);
    },
    enabled: !!selectedPath,
  });

  // Handle file selection
  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path);
    setActiveTab("content");
    // Update URL without navigation
    const newUrl = `/tutor?path=${encodeURIComponent(path)}`;
    window.history.pushState({}, "", newUrl);
  }, []);

  // Handle anchor scrolling after content loads
  useEffect(() => {
    if (fileData?.content && window.location.hash) {
      const anchor = decodeURIComponent(window.location.hash.slice(1));
      setTimeout(() => {
        const element = document.getElementById(anchor);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, [fileData?.content]);

  // Copy functions
  const copyContent = useCallback(() => {
    if (fileData?.content) {
      navigator.clipboard.writeText(fileData.content);
      setCopiedType("content");
      setTimeout(() => setCopiedType(null), 2000);
    }
  }, [fileData?.content]);

  const copyDeepLink = useCallback(() => {
    if (selectedPath) {
      const url = `${window.location.origin}/tutor?path=${encodeURIComponent(selectedPath)}`;
      navigator.clipboard.writeText(url);
      setCopiedType("link");
      setTimeout(() => setCopiedType(null), 2000);
    }
  }, [selectedPath]);

  const copySOPRef = useCallback(() => {
    if (selectedPath) {
      const sopRef = JSON.stringify({
        path: selectedPath,
        anchor: "",
        label: selectedPath.split("/").pop()?.replace(".md", "") || selectedPath,
      }, null, 2);
      navigator.clipboard.writeText(sopRef);
      setCopiedType("sopref");
      setTimeout(() => setCopiedType(null), 2000);
    }
  }, [selectedPath]);

  // Get the default group
  const defaultGroup = index?.default_group || "runtime";

  // Find selected item title
  const selectedTitle = useMemo(() => {
    if (!index || !selectedPath) return null;
    for (const group of index.groups) {
      for (const section of group.sections) {
        const item = section.items.find(i => i.path === selectedPath);
        if (item) return item.title;
      }
    }
    return selectedPath.split("/").pop();
  }, [index, selectedPath]);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4">

        {/* Left Panel: Navigation Tree */}
        <aside className="w-full md:w-80 shrink-0">
          <Card className="min-h-[calc(100vh-140px)] bg-black/40 border-2 border-primary rounded-none flex flex-col">
            <CardHeader className="border-b border-secondary p-3 sticky top-0 bg-black/95 z-10">
              <CardTitle className="font-arcade text-sm flex items-center gap-2">
                <Folder className="w-4 h-4" /> SOP EXPLORER
              </CardTitle>
            </CardHeader>
            <div className="flex-1">
              <div className="p-2 space-y-2">
                {/* Concept Map Button */}
                <button
                  onClick={() => handleSelect("concept-map")}
                  className={cn(
                    "w-full text-left p-2 text-sm font-arcade uppercase bg-secondary/20 hover:bg-secondary/30 flex items-center gap-2 transition-colors border-l-2 mb-2",
                    selectedPath === "concept-map" ? "bg-primary/30 border-primary text-primary" : "border-primary/50"
                  )}
                >
                  <Code className="w-4 h-4" />
                  CONCEPT MAP
                </button>

                {indexLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : indexError ? (
                  <div className="text-red-500 text-sm p-4 font-terminal">
                    Failed to load SOP index
                  </div>
                ) : index ? (
                  index.groups.map((group) => (
                    <TreeGroup
                      key={group.id}
                      group={group}
                      selectedPath={selectedPath}
                      onSelect={handleSelect}
                      defaultOpen={group.id === defaultGroup}
                    />
                  ))
                ) : null}
              </div>
            </div>
          </Card>
        </aside>

        {/* Main Panel: Content Viewer */}
        <Card className="flex-1 bg-black/60 border-2 border-primary rounded-none flex flex-col">
          {/* Top Controls */}
          <div className="border-b border-secondary p-3 flex items-center justify-between gap-2 bg-black/40 sticky top-0 z-10">
            <div className="font-arcade text-xs text-primary truncate">
              {selectedPath ? (
                <span className="flex items-center gap-2">
                  {selectedPath === "concept-map" ? (
                    <Code className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  {selectedPath === "concept-map" ? "PT STUDY SOP — CONCEPT MAP" : (selectedTitle || selectedPath)}
                </span>
              ) : (
                <span className="text-muted-foreground">SELECT A FILE TO VIEW</span>
              )}
            </div>
            {selectedPath && (
              <div className="flex gap-2 shrink-0">
                <CopyButton
                  onClick={copyContent}
                  icon={Copy}
                  label="CONTENT"
                  copied={copiedType === "content"}
                />
                <CopyButton
                  onClick={copyDeepLink}
                  icon={Link}
                  label="LINK"
                  copied={copiedType === "link"}
                />
                <CopyButton
                  onClick={copySOPRef}
                  icon={Code}
                  label="SOPREF"
                  copied={copiedType === "sopref"}
                />
              </div>
            )}
          </div>

          {/* Content / Breakdown Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
            <TabsList className="bg-black/60 border-b border-secondary rounded-none p-1 w-full justify-start sticky top-0 z-10">
              <TabsTrigger
                value="content"
                className="rounded-none font-arcade text-[10px] data-[state=active]:bg-primary data-[state=active]:text-black px-3"
              >
                CONTENT
              </TabsTrigger>
              <TabsTrigger
                value="breakdown"
                className="rounded-none font-arcade text-[10px] data-[state=active]:bg-primary data-[state=active]:text-black px-3"
                disabled={!fileData?.content || selectedPath === "concept-map"}
              >
                BREAKDOWN
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="flex-1 mt-0">
              <div className="h-full">
                <div className="p-6">
                  {!selectedPath ? (
                    <div className="text-center py-12 font-terminal text-muted-foreground">
                      <Folder className="w-12 h-12 mx-auto mb-4 text-primary/50" />
                      <p>SELECT A FILE FROM THE TREE</p>
                      <p className="text-xs mt-2">Browse your Study Operating Procedures</p>
                    </div>
                  ) : fileLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : fileError ? (
                    <div className="text-red-500 font-terminal">
                      Failed to load file: {selectedPath}
                    </div>
                  ) : fileData?.content ? (
                    selectedPath === "concept-map" ? (
                      <div className="p-6 overflow-auto h-full">
                        <pre className="font-mono text-xs leading-relaxed text-primary whitespace-pre-wrap break-words bg-black/30 p-4 border border-secondary rounded">
                          {fileData.content}
                        </pre>
                      </div>
                    ) : (
                      <article className="prose prose-invert prose-primary max-w-none font-terminal text-sm leading-relaxed
                        prose-headings:font-arcade prose-headings:text-primary prose-headings:border-b prose-headings:border-secondary/50 prose-headings:pb-2
                        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                        prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
                        prose-code:bg-secondary/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-primary
                        prose-pre:bg-black/50 prose-pre:border prose-pre:border-secondary
                        prose-ul:list-disc prose-ol:list-decimal
                        prose-li:marker:text-primary
                        prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
                        prose-table:border-collapse prose-th:border prose-th:border-secondary prose-th:bg-secondary/20 prose-th:p-2
                        prose-td:border prose-td:border-secondary prose-td:p-2
                      ">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // Add IDs to headings for anchor scrolling
                            h1: ({ children, ...props }) => {
                              const id = String(children).toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
                              return <h1 id={id} {...props}>{children}</h1>;
                            },
                            h2: ({ children, ...props }) => {
                              const id = String(children).toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
                              return <h2 id={id} {...props}>{children}</h2>;
                            },
                            h3: ({ children, ...props }) => {
                              const id = String(children).toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
                              return <h3 id={id} {...props}>{children}</h3>;
                            },
                            h4: ({ children, ...props }) => {
                              const id = String(children).toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
                              return <h4 id={id} {...props}>{children}</h4>;
                            },
                          }}
                        >
                          {fileData.content}
                        </ReactMarkdown>
                      </article>
                    )
                  ) : (
                    <div className="text-muted-foreground font-terminal">
                      No content available
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="breakdown" className="flex-1 mt-0">
              <div className="p-4">
                {selectedPath && fileData?.content ? (
                  <SopBreakdownPanel path={selectedPath} content={fileData.content} />
                ) : (
                  <div className="font-terminal text-xs text-muted-foreground p-3">
                    Select a SOP file first.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer with path info */}
          {selectedPath && (
            <div className="border-t border-secondary p-2 bg-black/40">
              <div className="text-[10px] font-mono text-muted-foreground truncate">
                {selectedPath === "concept-map" ? "PT Study SOP — Concept Map (ASCII Visual)" : selectedPath}
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
