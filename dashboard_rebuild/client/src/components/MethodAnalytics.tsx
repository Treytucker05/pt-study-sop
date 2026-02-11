import { BarChart3, TrendingUp, Star } from "lucide-react";
import type { MethodAnalyticsResponse } from "@/api";
import { PEIRRO_COLORS } from "@/lib/colors";

interface MethodAnalyticsProps {
  data: MethodAnalyticsResponse;
}

export default function MethodAnalytics({ data }: MethodAnalyticsProps) {
  const { block_stats, chain_stats, recent_ratings } = data;
  const ratedBlocks = block_stats.filter((b) => b.usage_count > 0);
  const ratedChains = chain_stats.filter((c) => c.usage_count > 0);

  return (
    <div className="space-y-6">
      {/* Block Effectiveness */}
      <div className="border-2 border-secondary bg-black/40 p-4 rounded-none">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="font-arcade text-xs text-primary">BLOCK EFFECTIVENESS</span>
        </div>
        {ratedBlocks.length === 0 ? (
          <p className="font-terminal text-xs text-muted-foreground">No ratings yet. Rate methods after study sessions to see analytics.</p>
        ) : (
          <div className="space-y-2">
            {ratedBlocks.map((b) => (
              <div key={b.id} className="flex items-center gap-2">
                <span className="font-terminal text-xs w-32 truncate">{b.name}</span>
                <div className="flex-1 h-4 bg-secondary/20 rounded-none overflow-hidden">
                  <div
                    className={`h-full ${PEIRRO_COLORS[b.category]?.bar || "bg-primary"}`}
                    style={{ width: `${((b.avg_effectiveness ?? 0) / 5) * 100}%` }}
                  />
                </div>
                <span className="font-terminal text-xs text-muted-foreground w-8 text-right">
                  {b.avg_effectiveness ?? "—"}
                </span>
                <span className="font-terminal text-xs text-muted-foreground w-6 text-right">
                  ({b.usage_count})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chain Comparison */}
      <div className="border-2 border-secondary bg-black/40 p-4 rounded-none">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="font-arcade text-xs text-primary">CHAIN COMPARISON</span>
        </div>
        {ratedChains.length === 0 ? (
          <p className="font-terminal text-xs text-muted-foreground">No chain ratings yet.</p>
        ) : (
          <div className="space-y-2">
            {ratedChains.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="font-terminal text-xs w-40 truncate">{c.name}</span>
                <div className="flex-1 h-4 bg-secondary/20 rounded-none overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${((c.avg_effectiveness ?? 0) / 5) * 100}%` }}
                  />
                </div>
                <span className="font-terminal text-xs text-muted-foreground w-8 text-right">
                  {c.avg_effectiveness ?? "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Ratings */}
      <div className="border-2 border-secondary bg-black/40 p-4 rounded-none">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-primary" />
          <span className="font-arcade text-xs text-primary">RECENT RATINGS</span>
        </div>
        {recent_ratings.length === 0 ? (
          <p className="font-terminal text-xs text-muted-foreground">No ratings recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {recent_ratings.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center justify-between border border-secondary/50 p-2 rounded-none">
                <div>
                  <span className="font-terminal text-xs">
                    {r.method_name || r.chain_name || "Unknown"}
                  </span>
                  {r.notes && (
                    <p className="font-terminal text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                      {r.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs font-terminal">
                  <span>E:{r.effectiveness}/5</span>
                  <span>G:{r.engagement}/5</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
