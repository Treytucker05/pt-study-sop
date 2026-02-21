import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, Unlock, Trophy, ChevronDown, ChevronRight, AlertTriangle, ArrowRight } from "lucide-react";
import Layout from "@/components/layout";
import { api } from "@/lib/api";
import type { MasterySkill, WhyLockedResponse } from "@/api";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  locked: { label: "LOCKED", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30", Icon: Lock },
  available: { label: "AVAILABLE", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", Icon: Unlock },
  mastered: { label: "MASTERED", color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/30", Icon: Trophy },
} as const;

function masteryBarColor(value: number): string {
  if (value >= 0.9) return "bg-cyan-400";
  if (value >= 0.6) return "bg-green-400";
  if (value >= 0.3) return "bg-yellow-400";
  return "bg-red-400";
}

function MasteryBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className={cn("w-full h-3 bg-black/60 border border-primary/20", className)}>
      <div
        className={cn("h-full transition-all duration-300", masteryBarColor(value))}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function SkillCard({
  skill,
  isSelected,
  onSelect,
}: {
  skill: MasterySkill;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const config = STATUS_CONFIG[skill.status];
  const pct = Math.round(skill.effective_mastery * 100);
  const isClickable = skill.status === "locked";

  return (
    <button
      type="button"
      data-testid={`skill-card-${skill.skill_id}`}
      className={cn(
        "w-full text-left bg-black/40 border-2 p-3 transition-all",
        isSelected ? "border-primary" : "border-primary/20 hover:border-primary/40",
        isClickable && "cursor-pointer",
      )}
      onClick={isClickable ? onSelect : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-arcade text-xs text-white truncate mr-2">{skill.name}</span>
        <span className={cn("flex items-center gap-1 text-[10px] font-arcade shrink-0", config.color)}>
          <config.Icon className="w-3 h-3" />
          {config.label}
        </span>
      </div>
      <MasteryBar value={skill.effective_mastery} />
      <div className="flex justify-between mt-1">
        <span className="font-terminal text-[10px] text-muted-foreground">MASTERY</span>
        <span className={cn("font-terminal text-xs", config.color)}>{pct}%</span>
      </div>
      {isClickable && (
        <div className="flex items-center gap-1 mt-1 text-[10px] font-terminal text-muted-foreground">
          {isSelected ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Click for details
        </div>
      )}
    </button>
  );
}

function WhyLockedPanel({ data }: { data: WhyLockedResponse }) {
  return (
    <div
      data-testid="why-locked-panel"
      className="bg-black/60 border-2 border-red-400/30 p-4 space-y-4"
    >
      <h3 className="font-arcade text-xs text-red-400">WHY LOCKED: {data.skill_id}</h3>

      {data.missing_prereqs.length > 0 && (
        <div>
          <h4 className="font-arcade text-[10px] text-yellow-400 mb-2">MISSING PREREQUISITES</h4>
          <div className="space-y-2">
            {data.missing_prereqs.map((prereq) => (
              <div key={prereq.skill_id} className="bg-black/40 border border-primary/20 p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-terminal text-xs text-white">{prereq.skill_id}</span>
                  <span className="font-terminal text-[10px] text-muted-foreground">
                    {Math.round(prereq.effective_mastery * 100)}% / {Math.round(prereq.needed * 100)}% needed
                  </span>
                </div>
                <MasteryBar value={prereq.effective_mastery} />
              </div>
            ))}
          </div>
        </div>
      )}

      {data.flagged_prereqs.length > 0 && (
        <div>
          <h4 className="font-arcade text-[10px] text-yellow-400 mb-2">FLAGGED PREREQUISITES</h4>
          <div className="space-y-2">
            {data.flagged_prereqs.map((fp) => (
              <div key={fp.skill_id} className="bg-black/40 border border-primary/20 p-2">
                <span className="font-terminal text-xs text-white">{fp.skill_id}</span>
                {fp.flags.map((flag, i) => (
                  <div key={i} className="flex items-center gap-2 mt-1">
                    <SeverityBadge severity={flag.severity} />
                    <span className="font-terminal text-[10px] text-muted-foreground">{flag.error_type}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recent_error_flags.length > 0 && (
        <div>
          <h4 className="font-arcade text-[10px] text-yellow-400 mb-2">RECENT ERROR FLAGS</h4>
          <div className="space-y-1">
            {data.recent_error_flags.map((flag, i) => (
              <div key={i} className="flex items-center gap-2 bg-black/40 border border-primary/20 p-2">
                <SeverityBadge severity={flag.severity} />
                <span className="font-terminal text-xs text-white">{flag.error_type}</span>
                {flag.evidence_ref && (
                  <span className="font-terminal text-[10px] text-muted-foreground truncate ml-auto">
                    {flag.evidence_ref}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.remediation_path.length > 0 && (
        <div>
          <h4 className="font-arcade text-[10px] text-green-400 mb-2">REMEDIATION PATH</h4>
          <ol className="space-y-1">
            {data.remediation_path.map((step, i) => (
              <li key={i} className="flex items-center gap-2 font-terminal text-xs text-white">
                <ArrowRight className="w-3 h-3 text-green-400 shrink-0" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const color = severity === "critical" ? "text-red-400 bg-red-400/10"
    : severity === "high" ? "text-orange-400 bg-orange-400/10"
    : "text-yellow-400 bg-yellow-400/10";

  return (
    <span className={cn("px-1.5 py-0.5 text-[9px] font-arcade", color)}>
      <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
      {severity.toUpperCase()}
    </span>
  );
}

export default function MasteryPage() {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["mastery-dashboard"],
    queryFn: api.mastery.getDashboard,
  });

  const { data: whyLocked } = useQuery({
    queryKey: ["mastery-why-locked", selectedSkillId],
    queryFn: () => api.mastery.getWhyLocked(selectedSkillId!),
    enabled: !!selectedSkillId,
  });

  const skills = dashboard?.skills ?? [];
  const statusCounts = {
    locked: skills.filter((s) => s.status === "locked").length,
    available: skills.filter((s) => s.status === "available").length,
    mastered: skills.filter((s) => s.status === "mastered").length,
  };

  const handleSelect = (skillId: string) => {
    setSelectedSkillId((prev) => (prev === skillId ? null : skillId));
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-arcade text-2xl text-primary">MASTERY</h1>
          <div className="flex items-center gap-4 font-terminal text-xs">
            <span className="text-muted-foreground">
              SKILLS: <span className="text-white">{skills.length}</span>
            </span>
            <span className="text-red-400">
              <Lock className="w-3 h-3 inline mr-0.5" />{statusCounts.locked}
            </span>
            <span className="text-yellow-400">
              <Unlock className="w-3 h-3 inline mr-0.5" />{statusCounts.available}
            </span>
            <span className="text-green-400">
              <Trophy className="w-3 h-3 inline mr-0.5" />{statusCounts.mastered}
            </span>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12 font-terminal text-sm text-muted-foreground">
            Loading mastery data...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && skills.length === 0 && (
          <div
            data-testid="mastery-empty"
            className="text-center py-16 border-2 border-primary/20 bg-black/40"
          >
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-arcade text-sm text-muted-foreground">NO SKILLS TRACKED YET</p>
            <p className="font-terminal text-xs text-muted-foreground mt-1">
              Skills will appear as you study and the adaptive engine tracks your progress.
            </p>
          </div>
        )}

        {/* Skill Grid */}
        {!isLoading && skills.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {skills.map((skill) => {
              const isSelected = selectedSkillId === skill.skill_id;
              return (
                <div key={skill.skill_id} className="contents">
                  <SkillCard
                    skill={skill}
                    isSelected={isSelected}
                    onSelect={() => handleSelect(skill.skill_id)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Why-Locked Panel (below grid) */}
        {selectedSkillId && whyLocked && (
          <WhyLockedPanel data={whyLocked} />
        )}
      </div>
    </Layout>
  );
}
