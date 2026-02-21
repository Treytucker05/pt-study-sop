import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { TutorContentSources, TutorMode, TutorTemplateChain } from "@/lib/api";
import type { Course } from "@shared/schema";
import {
  TEXT_PANEL_TITLE,
  TEXT_SECTION_LABEL,
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_BADGE,
  INPUT_BASE,
  SELECT_BASE,
  BTN_PRIMARY,
  PANEL_PADDING,
  SECTION_GAP,
  ICON_SM,
  ICON_MD,
} from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database,
  FileText,
  Globe,
  Loader2,
  Zap,
  Link,
} from "lucide-react";
import { MaterialUploader } from "@/components/MaterialUploader";
import { MaterialSelector } from "@/components/MaterialSelector";
import { TutorChainBuilder } from "@/components/TutorChainBuilder";

interface ContentFilterProps {
  courseId: number | undefined;
  setCourseId: (id: number | undefined) => void;
  selectedMaterials: number[];
  setSelectedMaterials: (ids: number[]) => void;
  chainId: number | undefined;
  setChainId: (id: number | undefined) => void;
  customBlockIds: number[];
  setCustomBlockIds: (ids: number[]) => void;
  topic: string;
  setTopic: (topic: string) => void;
  onStartSession: () => void;
  isStarting: boolean;
  hasActiveSession: boolean;
  compact?: boolean;
}

function _lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function _lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function SectionLabel({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`${TEXT_SECTION_LABEL} flex items-center gap-1.5 pb-1 border-b border-primary/20 mb-2`}>
      {icon}
      {children}
    </div>
  );
}

export function ContentFilter({
  courseId,
  setCourseId,
  selectedMaterials,
  setSelectedMaterials,
  chainId,
  setChainId,
  customBlockIds,
  setCustomBlockIds,
  topic,
  setTopic,
  onStartSession,
  isStarting,
  hasActiveSession,
  compact = false,
}: ContentFilterProps) {
  const {
    data: sources,
    isLoading: sourcesLoading,
    isError: sourcesError,
  } = useQuery<TutorContentSources>({
    queryKey: ["tutor-content-sources"],
    queryFn: () => api.tutor.getContentSources(),
  });

  const {
    data: templateChains = [],
    isLoading: chainsLoading,
    isError: templateChainsError,
  } = useQuery<TutorTemplateChain[]>({
    queryKey: ["tutor-template-chains"],
    queryFn: () => api.tutor.getTemplateChains(),
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["courses-active"],
    queryFn: () => api.courses.getActive(),
  });

  const [chainTab, setChainTab] = useState<"templates" | "custom">("templates");

  useEffect(() => {
    // A concrete template selection should always surface the template tab.
    if (chainId !== undefined && chainTab !== "templates") {
      setChainTab("templates");
    }
  }, [chainId, chainTab]);

  // ─── COMPACT: inline toolbar ───
  if (compact) {
    const selectedChainName = templateChains.find((c) => c.id === chainId)?.name;
    return (
      <div className="flex flex-wrap items-end gap-3 p-3">
        {/* Chain */}
        <div>
          <div className={`${TEXT_SECTION_LABEL} mb-1`}>Chain</div>
          <select
            value={chainId ?? ""}
            onChange={(e) => {
              if (e.target.value) {
                setChainId(Number(e.target.value));
                return;
              }
              // Treat compact "Freeform" as an explicit override.
              setChainId(undefined);
            }}
            className={`${SELECT_BASE} border-[3px] border-double border-primary/30 h-9 w-[180px]`}
          >
            <option value="">Freeform</option>
            {templateChains.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div>
          <div className={`${TEXT_SECTION_LABEL} mb-1`}>Topic</div>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Hip Flexors"
            className={`${INPUT_BASE} border-[3px] border-double border-primary/30 h-9 w-[180px]`}
          />
        </div>

        {/* Start button */}
        <Button
          onClick={onStartSession}
          disabled={isStarting || hasActiveSession}
          className={`h-9 px-5 rounded-none border-2 font-arcade text-xs ${hasActiveSession
            ? "border-success/50 bg-success/10 text-success cursor-default"
            : isStarting
              ? "border-primary/50 bg-primary/10 text-primary cursor-wait"
              : "border-primary bg-primary/10 hover:bg-primary/20"
            }`}
        >
          {isStarting ? (
            <Loader2 className={`${ICON_SM} animate-spin mr-1`} />
          ) : hasActiveSession ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              ACTIVE
            </span>
          ) : (
            <Zap className={`${ICON_SM} mr-1`} />
          )}
          {!isStarting && !hasActiveSession && "START"}
        </Button>
      </div>
    );
  }

  // ─── FULL: vertical panel ───
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed header */}
      <div className={`shrink-0 ${PANEL_PADDING} pb-2 border-b-[3px] border-double border-primary/30`}>
        <div className={TEXT_PANEL_TITLE}>CONTENT FILTER</div>
        {(sourcesError || templateChainsError) && (
          <div className={`${TEXT_MUTED} text-destructive`}>
            Tutor API unavailable. Start the dashboard via <span className="font-arcade">Start_Dashboard.bat</span>.
          </div>
        )}
        <div className={`flex items-center gap-2 mt-1 ${TEXT_MUTED}`}>
          <Database className={ICON_SM} />
          {sources?.total_materials ?? 0} materials
          <span className="text-muted-foreground/40">|</span>
          {sources?.total_instructions ?? 0} SOP
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className={`${PANEL_PADDING} space-y-2`}>

          {/* Chain selector */}
          <div>
            <SectionLabel icon={<Link className={ICON_SM} />}>
              Chain
            </SectionLabel>

            {/* Tab toggle: Templates vs Custom */}
            <div className="grid grid-cols-2 gap-1 mb-2 min-w-0">
              <button
                onClick={() => setChainTab("templates")}
                className={`px-1.5 py-1 border-2 font-arcade text-xs truncate transition-colors ${chainTab === "templates"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-primary/30 text-foreground/80 hover:border-primary/50"
                  }`}
              >
                TEMPLATES
              </button>
              <button
                onClick={() => {
                  setChainTab("custom");
                  setChainId(undefined);
                  // Respect explicit custom selection
                }}
                className={`px-1.5 py-1 border-2 font-arcade text-xs truncate transition-colors ${chainTab === "custom"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-primary/30 text-foreground/80 hover:border-primary/50"
                  }`}
              >
                CUSTOM
              </button>
            </div>

            {chainTab === "templates" ? (
              <>
                {/* Chain list - card style with better borders */}
                <ScrollArea className="h-40 border-[3px] border-double border-primary/30 bg-black/20">
                  <div className="p-1 space-y-1">
                    {/* Freeform option as a card */}
                    <button
                      onClick={() => {
                        setChainId(undefined);
                      }}
                      className={`w-full text-left px-3 py-2 border-2 transition-all ${!chainId
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-primary/20 text-foreground/80 hover:border-primary/40 hover:text-foreground hover:bg-black/30"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-arcade text-xs">FREEFORM</div>
                          <div className={`${TEXT_MUTED} text-xs`}>No template</div>
                        </div>
                        {!chainId && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                    </button>

                    {chainsLoading ? (
                      <div className="space-y-2 p-2">
                        <Skeleton className="w-full h-10 bg-primary/10" />
                        <Skeleton className="w-full h-10 bg-primary/10" />
                        <Skeleton className="w-full h-10 bg-primary/10" />
                      </div>
                    ) : (
                      templateChains.map((chain) => (
                        <button
                          key={chain.id}
                          onClick={() => setChainId(chain.id)}
                          className={`w-full text-left px-3 py-2 border-2 transition-all ${chainId === chain.id
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-primary/20 text-foreground/80 hover:border-primary/40 hover:text-foreground hover:bg-black/30"
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="font-arcade text-xs truncate">{chain.name.toUpperCase()}</div>
                              <div className={`${TEXT_MUTED} text-xs`}>{chain.blocks.length} blocks</div>
                            </div>
                            {chainId === chain.id && <div className="w-2 h-2 rounded-full bg-primary ml-2" />}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <TutorChainBuilder
                selectedBlockIds={customBlockIds}
                setSelectedBlockIds={setCustomBlockIds}
              />
            )}
          </div>

          {/* Topic */}
          <div>
            <SectionLabel>Topic</SectionLabel>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Hip Flexors"
              className={`${INPUT_BASE} border-[3px] border-double border-primary/30`}
            />
          </div>

          {/* Course selector */}
          <div>
            <SectionLabel>Course</SectionLabel>
            {coursesLoading ? (
              <Skeleton className="w-full h-10 bg-primary/10" />
            ) : (
              <select
                value={courseId ?? ""}
                onChange={(e) => setCourseId(e.target.value ? Number(e.target.value) : undefined)}
                className={`${SELECT_BASE} border-[3px] border-double border-primary/30`}
              >
                <option value="">All courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Materials selector */}
          <div>
            <SectionLabel icon={<FileText className={ICON_SM} />}>
              Materials
            </SectionLabel>
            <MaterialSelector
              courseId={courseId}
              selectedMaterials={selectedMaterials}
              setSelectedMaterials={setSelectedMaterials}
            />
          </div>

          {/* Quick upload */}
          <div className="border-t border-primary/10 pt-2">
            <SectionLabel>Upload</SectionLabel>
            <MaterialUploader courseId={courseId} />
          </div>
        </div>
      </div>

      {/* Fixed footer — Start button */}
      <div className={`shrink-0 ${PANEL_PADDING} pt-2 border-t-2 border-primary/30`}>
        <Button
          onClick={onStartSession}
          disabled={isStarting || hasActiveSession}
          className={`w-full h-9 rounded-none border-2 font-arcade text-xs ${hasActiveSession
            ? "border-success/50 bg-success/10 text-success cursor-default"
            : isStarting
              ? "border-primary/50 bg-primary/10 text-primary cursor-wait"
              : "border-primary bg-primary/10 hover:bg-primary/20"
            }`}
        >
          {isStarting ? (
            <Loader2 className={`${ICON_SM} animate-spin mr-1`} />
          ) : hasActiveSession ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              SESSION ACTIVE
            </span>
          ) : (
            <Zap className={`${ICON_SM} mr-1`} />
          )}
          {!isStarting && !hasActiveSession && "START SESSION"}
        </Button>
      </div>
    </div>
  );
}
