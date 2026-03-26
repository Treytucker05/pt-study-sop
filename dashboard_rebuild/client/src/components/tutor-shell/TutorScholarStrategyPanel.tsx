import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CARD_BORDER, TEXT_BADGE } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { UseTutorSessionReturn } from "@/hooks/useTutorSession";
import { CONTROL_KICKER } from "@/components/shell/controlStyles";
import {
  TUTOR_FIELD_SURFACE,
  TUTOR_GLASS_PANEL,
  TUTOR_GLASS_PANEL_SOFT,
} from "@/components/tutor-shell/tutorShellStyles";

interface TutorScholarStrategyPanelProps {
  session: UseTutorSessionReturn;
}

export function TutorScholarStrategyPanel({
  session,
}: TutorScholarStrategyPanelProps) {
  if (!session.scholarStrategy) {
    return null;
  }

  return (
    <div className="flex-none">
      <button
        type="button"
        onClick={() => session.setScholarStrategyExpanded((prev: boolean) => !prev)}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-1.5 border-b border-primary/15 transition-colors text-left hover:border-primary/24",
          TUTOR_GLASS_PANEL_SOFT,
        )}
      >
        <ChevronDown
          className={`h-3 w-3 text-primary/60 transition-transform duration-200 ${session.scholarStrategyExpanded ? "" : "-rotate-90"}`}
        />
        <span className={TEXT_BADGE}>SCHOLAR STRATEGY</span>
        <span className="font-mono text-sm leading-6 text-foreground/72 truncate flex-1">
          {session.scholarStrategy.hybridArchetype?.label || ""}
        </span>
      </button>
      {session.scholarStrategyExpanded && (
        <Card
          className={cn(
            "mx-4 mt-1 mb-2 rounded-none border-primary/30",
            CARD_BORDER,
            TUTOR_GLASS_PANEL,
          )}
        >
          <div className="p-3 space-y-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <div className="font-mono text-base leading-7 text-foreground/78 max-w-3xl">
                  {session.scholarStrategy.summary}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-none text-ui-2xs border-primary/40"
                  >
                    BRAIN SNAPSHOT{" "}
                    {session.scholarStrategy.profileSnapshotId ?? "N/A"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-none text-ui-2xs border-primary/40"
                  >
                    {session.scholarStrategy.hybridArchetype?.label ||
                      "EMERGING PATTERN"}
                  </Badge>
                  {session.scholarStrategy.activeInvestigation?.title && (
                    <Badge
                      variant="outline"
                      className="rounded-none text-ui-2xs border-secondary/40"
                    >
                      RESEARCH:{" "}
                      {session.scholarStrategy.activeInvestigation.title}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="font-mono text-sm leading-6 text-foreground/72 max-w-sm">
                {session.scholarStrategy.boundedBy?.note}
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {Object.entries(session.scholarStrategy.fields || {}).map(
                ([fieldKey, field]) => (
                  <div
                    key={fieldKey}
                    className={cn("p-2 rounded-none space-y-1", TUTOR_GLASS_PANEL_SOFT)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-arcade text-ui-2xs text-primary/80">
                        {fieldKey}
                      </span>
                      <Badge
                        variant="outline"
                        className="rounded-none text-ui-2xs border-primary/30"
                      >
                        {field.value}
                      </Badge>
                    </div>
                    <div className="font-mono text-sm leading-6 text-foreground/72">
                      {field.rationale}
                    </div>
                  </div>
                ),
              )}
            </div>

            <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-2">
                <div className={TEXT_BADGE}>LEARNER FIT FEEDBACK</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {[
                    {
                      key: "pacing",
                      label: "PACING",
                      options: ["slower", "good", "faster"],
                    },
                    {
                      key: "scaffolds",
                      label: "SCAFFOLDS",
                      options: ["less", "good", "more"],
                    },
                    {
                      key: "retrievalPressure",
                      label: "RETRIEVAL",
                      options: ["lighter", "good", "harder"],
                    },
                    {
                      key: "explanationDensity",
                      label: "EXPLANATIONS",
                      options: ["leaner", "good", "denser"],
                    },
                  ].map((control) => (
                    <div
                      key={control.key}
                      className={cn("p-2 rounded-none space-y-2", TUTOR_GLASS_PANEL_SOFT)}
                    >
                      <div className="font-arcade text-ui-2xs text-primary/80">
                        {control.label}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {control.options.map((option) => {
                          const active =
                            (session.strategyFeedback?.[
                              control.key as keyof typeof session.strategyFeedback
                            ] || "") === option;
                          return (
                            <Button
                              key={option}
                              variant="ghost"
                              size="sm"
                              disabled={session.savingStrategyFeedback}
                              onClick={() => {
                                void session.saveScholarStrategyFeedback(
                                  control.key as
                                    | "pacing"
                                    | "scaffolds"
                                    | "retrievalPressure"
                                    | "explanationDensity",
                                  option,
                                );
                              }}
                              className={
                                active
                                  ? "h-8 rounded-none border border-primary bg-primary/20 px-2 font-arcade text-ui-2xs text-primary"
                                  : "h-8 rounded-none border border-primary/20 px-2 font-arcade text-ui-2xs text-foreground/72"
                              }
                            >
                              {option.toUpperCase()}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Textarea
                    value={session.strategyNotes}
                    onChange={(event) => session.setStrategyNotes(event.target.value)}
                    placeholder="What about the strategy is helping or hurting right now?"
                    className={cn("min-h-[90px]", TUTOR_FIELD_SURFACE)}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-sm leading-6 text-foreground/72">
                      Feedback is stored on the Tutor session so Brain and Scholar can
                      inspect it later.
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={session.savingStrategyFeedback}
                      onClick={() => {
                        void session.saveScholarStrategyNotes();
                      }}
                      className="h-8 rounded-none border border-primary/20 px-2 font-arcade text-ui-2xs text-foreground/72"
                    >
                      SAVE FEEDBACK
                    </Button>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "space-y-2 p-3 rounded-none border-secondary/20",
                  TUTOR_GLASS_PANEL_SOFT,
                )}
              >
                <div className={TEXT_BADGE}>BOUNDARIES</div>
                <div className="font-mono text-sm leading-6 text-foreground/72 space-y-2">
                  <div>
                    Allowed:{" "}
                    {session.scholarStrategy.boundedBy?.allowedFields?.join(", ")}
                  </div>
                  <div>
                    Fixed:{" "}
                    {session.scholarStrategy.boundedBy?.forbiddenFields?.join(", ")}
                  </div>
                  {session.scholarStrategy.activeInvestigation?.topFinding && (
                    <div>
                      Latest finding:{" "}
                      {session.scholarStrategy.activeInvestigation.topFinding}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
