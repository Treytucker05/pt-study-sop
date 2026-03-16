import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MaterialSelector } from "@/components/MaterialSelector";
import { MaterialUploader } from "@/components/MaterialUploader";
import { TutorChainBuilder } from "@/components/TutorChainBuilder";
import { api } from "@/lib/api";
import type { TutorContentSources, TutorTemplateChain } from "@/lib/api";
import {
  ICON_SM,
  INPUT_BASE,
  PANEL_PADDING,
  SELECT_BASE,
  TEXT_MUTED,
  TEXT_PANEL_TITLE,
  TEXT_SECTION_LABEL,
} from "@/lib/theme";
import type { Course } from "@shared/schema";
import { Database, FileText, Link, Loader2, Zap } from "lucide-react";

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

interface ContentFilterViewProps {
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
  templateChains: TutorTemplateChain[];
  chainsLoading: boolean;
  sources?: TutorContentSources;
  sourcesError: boolean;
  templateChainsError: boolean;
  courses: Course[];
  coursesLoading: boolean;
  chainTab: "templates" | "custom";
  setChainTab: (tab: "templates" | "custom") => void;
}

function SectionLabel({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className={`${TEXT_SECTION_LABEL} mb-2 flex items-center gap-1.5 border-b border-primary/20 pb-1`}>
      {icon}
      {children}
    </div>
  );
}

function StartSessionButton({
  onStartSession,
  isStarting,
  hasActiveSession,
  compactLabel = false,
  className,
}: {
  onStartSession: () => void;
  isStarting: boolean;
  hasActiveSession: boolean;
  compactLabel?: boolean;
  className: string;
}) {
  return (
    <Button
      onClick={onStartSession}
      disabled={isStarting || hasActiveSession}
      className={className}
    >
      {isStarting ? (
        <Loader2 className={`${ICON_SM} mr-1 animate-spin`} />
      ) : hasActiveSession ? (
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          {compactLabel ? "ACTIVE" : "SESSION ACTIVE"}
        </span>
      ) : (
        <Zap className={`${ICON_SM} mr-1`} />
      )}
      {!isStarting && !hasActiveSession && (compactLabel ? "START" : "START SESSION")}
    </Button>
  );
}

function ContentFilterCompactView({
  chainId,
  setChainId,
  topic,
  setTopic,
  onStartSession,
  isStarting,
  hasActiveSession,
  templateChains,
}: Pick<
  ContentFilterViewProps,
  "chainId" | "setChainId" | "topic" | "setTopic" | "onStartSession" | "isStarting" | "hasActiveSession" | "templateChains"
>) {
  return (
    <div className="flex flex-wrap items-end gap-3 p-3">
      <div>
        <div className={`${TEXT_SECTION_LABEL} mb-1`}>Chain</div>
        <select
          value={chainId ?? ""}
          onChange={(event) => {
            if (event.target.value) {
              setChainId(Number(event.target.value));
              return;
            }
            setChainId(undefined);
          }}
          className={`${SELECT_BASE} h-9 w-[180px] border-[3px] border-double border-primary/30`}
        >
          <option value="">Freeform</option>
          {templateChains.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className={`${TEXT_SECTION_LABEL} mb-1`}>Topic</div>
        <input
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="e.g. Hip Flexors"
          className={`${INPUT_BASE} h-9 w-[180px] border-[3px] border-double border-primary/30`}
        />
      </div>

      <StartSessionButton
        onStartSession={onStartSession}
        isStarting={isStarting}
        hasActiveSession={hasActiveSession}
        compactLabel
        className={`h-9 px-5 rounded-none border-2 font-arcade text-xs ${hasActiveSession
          ? "border-success/50 bg-success/10 text-success cursor-default"
          : isStarting
            ? "border-primary/50 bg-primary/10 text-primary cursor-wait"
            : "border-primary bg-primary/10 hover:bg-primary/20"
          }`}
      />
    </div>
  );
}

function ChainSelectorSection({
  chainId,
  setChainId,
  customBlockIds,
  setCustomBlockIds,
  templateChains,
  chainsLoading,
  chainTab,
  setChainTab,
}: Pick<
  ContentFilterViewProps,
  "chainId" | "setChainId" | "customBlockIds" | "setCustomBlockIds" | "templateChains" | "chainsLoading" | "chainTab" | "setChainTab"
>) {
  return (
    <div>
      <SectionLabel icon={<Link className={ICON_SM} />}>Chain</SectionLabel>

      <div className="mb-2 grid min-w-0 grid-cols-2 gap-1">
        <button
          onClick={() => setChainTab("templates")}
          className={`truncate border-2 px-1.5 py-1 font-arcade text-xs transition-colors ${chainTab === "templates"
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
          }}
          className={`truncate border-2 px-1.5 py-1 font-arcade text-xs transition-colors ${chainTab === "custom"
            ? "border-primary bg-primary/20 text-primary"
            : "border-primary/30 text-foreground/80 hover:border-primary/50"
            }`}
        >
          CUSTOM
        </button>
      </div>

      {chainTab === "templates" ? (
        <ScrollArea className="h-40 border-[3px] border-double border-primary/30 bg-black/20">
          <div className="space-y-1 p-1">
            <button
              onClick={() => setChainId(undefined)}
              className={`w-full border-2 px-3 py-2 text-left transition-all ${!chainId
                ? "border-primary bg-primary/20 text-primary"
                : "border-primary/20 text-foreground/80 hover:border-primary/40 hover:bg-black/30 hover:text-foreground"
                }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-arcade text-xs">FREEFORM</div>
                  <div className={`${TEXT_MUTED} text-xs`}>No template</div>
                </div>
                {!chainId && <div className="h-2 w-2 rounded-full bg-primary" />}
              </div>
            </button>

            {chainsLoading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-10 w-full bg-primary/10" />
                <Skeleton className="h-10 w-full bg-primary/10" />
                <Skeleton className="h-10 w-full bg-primary/10" />
              </div>
            ) : (
              templateChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => setChainId(chain.id)}
                  className={`w-full border-2 px-3 py-2 text-left transition-all ${chainId === chain.id
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-primary/20 text-foreground/80 hover:border-primary/40 hover:bg-black/30 hover:text-foreground"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-arcade text-xs">{chain.name.toUpperCase()}</div>
                      <div className={`${TEXT_MUTED} text-xs`}>{chain.blocks.length} blocks</div>
                    </div>
                    {chainId === chain.id && <div className="ml-2 h-2 w-2 rounded-full bg-primary" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      ) : (
        <TutorChainBuilder
          selectedBlockIds={customBlockIds}
          setSelectedBlockIds={setCustomBlockIds}
        />
      )}
    </div>
  );
}

function ContentFilterFullView({
  courseId,
  setCourseId,
  selectedMaterials,
  setSelectedMaterials,
  customBlockIds,
  setCustomBlockIds,
  topic,
  setTopic,
  onStartSession,
  isStarting,
  hasActiveSession,
  templateChains,
  chainsLoading,
  sources,
  sourcesError,
  templateChainsError,
  courses,
  coursesLoading,
  chainId,
  setChainId,
  chainTab,
  setChainTab,
}: ContentFilterViewProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className={`shrink-0 ${PANEL_PADDING} border-b-[3px] border-double border-primary/30 pb-2`}>
        <div className={TEXT_PANEL_TITLE}>CONTENT FILTER</div>
        {(sourcesError || templateChainsError) && (
          <div className={`${TEXT_MUTED} text-destructive`}>
            Tutor API unavailable. Start the dashboard via <span className="font-arcade">Start_Dashboard.bat</span>.
          </div>
        )}
        <div className={`mt-1 flex items-center gap-2 ${TEXT_MUTED}`}>
          <Database className={ICON_SM} />
          {sources?.total_materials ?? 0} materials
          <span className="text-muted-foreground/40">|</span>
          {sources?.total_instructions ?? 0} SOP
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className={`${PANEL_PADDING} space-y-2`}>
          <ChainSelectorSection
            chainId={chainId}
            setChainId={setChainId}
            customBlockIds={customBlockIds}
            setCustomBlockIds={setCustomBlockIds}
            templateChains={templateChains}
            chainsLoading={chainsLoading}
            chainTab={chainTab}
            setChainTab={setChainTab}
          />

          <div>
            <SectionLabel>Topic</SectionLabel>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Hip Flexors"
              className={`${INPUT_BASE} border-[3px] border-double border-primary/30`}
            />
          </div>

          <div>
            <SectionLabel>Course</SectionLabel>
            {coursesLoading ? (
              <Skeleton className="h-10 w-full bg-primary/10" />
            ) : (
              <select
                value={courseId ?? ""}
                onChange={(event) => setCourseId(event.target.value ? Number(event.target.value) : undefined)}
                className={`${SELECT_BASE} border-[3px] border-double border-primary/30`}
              >
                <option value="">All courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <SectionLabel icon={<FileText className={ICON_SM} />}>Materials</SectionLabel>
            <MaterialSelector
              courseId={courseId}
              selectedMaterials={selectedMaterials}
              setSelectedMaterials={setSelectedMaterials}
            />
          </div>

          <div className="border-t border-primary/10 pt-2">
            <SectionLabel>Upload</SectionLabel>
            <MaterialUploader courseId={courseId} />
          </div>
        </div>
      </div>

      <div className={`shrink-0 ${PANEL_PADDING} border-t-2 border-primary/30 pt-2`}>
        <StartSessionButton
          onStartSession={onStartSession}
          isStarting={isStarting}
          hasActiveSession={hasActiveSession}
          className={`w-full h-9 rounded-none border-2 font-arcade text-xs ${hasActiveSession
            ? "border-success/50 bg-success/10 text-success cursor-default"
            : isStarting
              ? "border-primary/50 bg-primary/10 text-primary cursor-wait"
              : "border-primary bg-primary/10 hover:bg-primary/20"
            }`}
        />
      </div>
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
  const effectiveChainTab = chainId !== undefined ? "templates" : chainTab;

  if (compact) {
    return (
      <ContentFilterCompactView
        chainId={chainId}
        setChainId={setChainId}
        topic={topic}
        setTopic={setTopic}
        onStartSession={onStartSession}
        isStarting={isStarting}
        hasActiveSession={hasActiveSession}
        templateChains={templateChains}
      />
    );
  }

  return (
    <ContentFilterFullView
      courseId={courseId}
      setCourseId={setCourseId}
      selectedMaterials={selectedMaterials}
      setSelectedMaterials={setSelectedMaterials}
      chainId={chainId}
      setChainId={setChainId}
      customBlockIds={customBlockIds}
      setCustomBlockIds={setCustomBlockIds}
      topic={topic}
      setTopic={setTopic}
      onStartSession={onStartSession}
      isStarting={isStarting}
      hasActiveSession={hasActiveSession}
      templateChains={templateChains}
      chainsLoading={chainsLoading}
      sources={sources}
      sourcesError={sourcesError}
      templateChainsError={templateChainsError}
      courses={courses}
      coursesLoading={coursesLoading}
      chainTab={effectiveChainTab}
      setChainTab={setChainTab}
    />
  );
}
