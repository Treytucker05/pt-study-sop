import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  TutorAccuracyProfile,
  TutorObjectiveScope,
  TutorTemplateChain,
} from "@/lib/api";

export interface RunConfigPanelProps {
  primingMethodIds: string[];
  setPrimingMethods?: (next: string[]) => void;
  tutorChainId?: number;
  setTutorChainId?: (next: number | undefined) => void;
  tutorCustomBlockIds: number[];
  setTutorCustomBlockIds?: (next: number[]) => void;
  accuracyProfile: TutorAccuracyProfile;
  setAccuracyProfile?: (next: TutorAccuracyProfile) => void;
  objectiveScope: TutorObjectiveScope;
  setObjectiveScope?: (next: TutorObjectiveScope) => void;
  templateChains?: TutorTemplateChain[];
  templateChainsLoading?: boolean;
  hasActiveSession: boolean;
}

const PRIMING_METHOD_OPTIONS = [
  { id: "M-PRE-010", label: "Objectives" },
  { id: "M-PRE-008", label: "Bridge" },
  { id: "M-PRE-005", label: "Concept Map" },
  { id: "M-PRE-014", label: "Weak Points" },
] as const;

function getTutorStartSummary(
  tutorChainId: number | undefined,
  tutorCustomBlockIds: number[],
): { label: string; detail: string; mode: string } {
  if (typeof tutorChainId === "number") {
    return {
      label: "Template chain selected",
      detail: `Chain #${tutorChainId}`,
      mode: "Template",
    };
  }

  if (tutorCustomBlockIds.length === 1) {
    return {
      label: "Solo method selected",
      detail: `Method block #${tutorCustomBlockIds[0]}`,
      mode: "Solo",
    };
  }

  if (tutorCustomBlockIds.length > 1) {
    return {
      label: "Custom method stack selected",
      detail: `${tutorCustomBlockIds.length} method blocks staged`,
      mode: "Custom",
    };
  }

  return {
    label: "No tutor structure selected",
    detail: "Choose a template chain or a solo method before Tutor starts.",
    mode: "Not set",
  };
}

export function RunConfigPanel({
  primingMethodIds,
  setPrimingMethods,
  tutorChainId,
  setTutorChainId,
  tutorCustomBlockIds,
  setTutorCustomBlockIds,
  accuracyProfile,
  setAccuracyProfile,
  objectiveScope,
  setObjectiveScope,
  templateChains = [],
  templateChainsLoading = false,
  hasActiveSession,
}: RunConfigPanelProps) {
  const tutorStart = getTutorStartSummary(tutorChainId, tutorCustomBlockIds);
  const primingMethodOptions = useMemo(() => {
    const optionMap = new Map(
      PRIMING_METHOD_OPTIONS.map((option) => [option.id, option.label] as const),
    );
    for (const methodId of primingMethodIds) {
      if (!optionMap.has(methodId)) {
        optionMap.set(methodId, methodId);
      }
    }
    return Array.from(optionMap.entries()).map(([id, label]) => ({ id, label }));
  }, [primingMethodIds]);

  return (
    <div className="space-y-4 font-mono text-sm text-foreground/78">
      <div className="rounded-[0.85rem] border border-primary/15 bg-black/15 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
          Priming
        </div>
        <div className="mt-1 text-sm text-foreground">
          {primingMethodIds.length > 0
            ? `${primingMethodIds.length} priming methods selected`
            : "No priming methods selected yet"}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {primingMethodOptions.map((option) => {
            const isSelected = primingMethodIds.includes(option.id);
            return (
              <Button
                key={option.id}
                type="button"
                variant="outline"
                aria-pressed={isSelected}
                onClick={() => {
                  const next = isSelected
                    ? primingMethodIds.filter((methodId) => methodId !== option.id)
                    : [...primingMethodIds, option.id];
                  setPrimingMethods?.(next);
                }}
                className={
                  isSelected
                    ? "h-8 rounded-full border-primary/30 bg-primary/16 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary"
                    : "h-8 rounded-full border-primary/14 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/72"
                }
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[0.85rem] border border-primary/15 bg-black/15 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
          Tutor start mode
        </div>
        <div className="mt-1 text-sm text-foreground">{tutorStart.label}</div>
        <div className="mt-1 text-sm text-foreground/72">{tutorStart.detail}</div>
        <Badge
          variant="outline"
          className="mt-3 rounded-full border-primary/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-primary/84"
        >
          {tutorStart.mode}
        </Badge>
        <div className="mt-3 space-y-3">
          <label className="block space-y-1 text-xs text-foreground/72">
            <span className="uppercase tracking-[0.18em] text-primary/72">
              Tutor chain
            </span>
            <select
              aria-label="Tutor chain"
              value={typeof tutorChainId === "number" ? String(tutorChainId) : ""}
              onChange={(event) => {
                const nextValue = event.target.value.trim();
                if (!nextValue) {
                  setTutorChainId?.(undefined);
                  return;
                }
                const parsed = Number.parseInt(nextValue, 10);
                if (Number.isFinite(parsed)) {
                  setTutorChainId?.(parsed);
                  setTutorCustomBlockIds?.([]);
                }
              }}
              className="mt-1 h-9 w-full rounded-[0.7rem] border border-primary/18 bg-black/20 px-3 font-mono text-xs text-foreground"
            >
              <option value="">
                {templateChainsLoading ? "Loading chains..." : "No template chain"}
              </option>
              {templateChains.map((chain) => (
                <option key={chain.id} value={String(chain.id)}>
                  {chain.title || `Chain #${chain.id}`}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-xs text-foreground/72">
            <span className="uppercase tracking-[0.18em] text-primary/72">
              Tutor custom block ids
            </span>
            <input
              aria-label="Tutor custom block ids"
              value={tutorCustomBlockIds.join(", ")}
              onChange={(event) => {
                const next = event.target.value
                  .split(",")
                  .map((value) => Number.parseInt(value.trim(), 10))
                  .filter((value) => Number.isFinite(value));
                setTutorCustomBlockIds?.(next);
                if (next.length > 0) {
                  setTutorChainId?.(undefined);
                }
              }}
              placeholder="11, 12"
              className="mt-1 h-9 w-full rounded-[0.7rem] border border-primary/18 bg-black/20 px-3 font-mono text-xs text-foreground"
            />
          </label>
        </div>
      </div>

      <div className="rounded-[0.85rem] border border-primary/15 bg-black/15 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
          Runtime rules
        </div>
        <div className="mt-3 grid gap-3">
          <label className="block space-y-1 text-xs text-foreground/72">
            <span className="uppercase tracking-[0.18em] text-primary/72">
              Accuracy profile
            </span>
            <select
              aria-label="Accuracy profile"
              value={accuracyProfile}
              onChange={(event) =>
                setAccuracyProfile?.(event.target.value as TutorAccuracyProfile)
              }
              className="mt-1 h-9 w-full rounded-[0.7rem] border border-primary/18 bg-black/20 px-3 font-mono text-xs text-foreground"
            >
              <option value="strict">Strict</option>
              <option value="balanced">Balanced</option>
              <option value="coverage">Coverage</option>
            </select>
          </label>

          <label className="block space-y-1 text-xs text-foreground/72">
            <span className="uppercase tracking-[0.18em] text-primary/72">
              Objective scope
            </span>
            <select
              aria-label="Objective scope"
              value={objectiveScope}
              onChange={(event) =>
                setObjectiveScope?.(event.target.value as TutorObjectiveScope)
              }
              className="mt-1 h-9 w-full rounded-[0.7rem] border border-primary/18 bg-black/20 px-3 font-mono text-xs text-foreground"
            >
              <option value="module_all">Module all</option>
              <option value="single_focus">Single focus</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-[0.85rem] border border-primary/10 bg-black/10 p-3 text-foreground/72">
        {hasActiveSession
          ? "Tutor session is already live. Changes stage the next start configuration."
          : "Tutor session not started yet."}
      </div>
    </div>
  );
}
