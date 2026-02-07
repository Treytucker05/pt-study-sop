export type MethodCategory =
  | "activate"
  | "map"
  | "encode"
  | "retrieve"
  | "connect"
  | "consolidate";

export type EnergyLevel = "low" | "medium" | "high";

export type StudyStage =
  | "first_exposure"
  | "review"
  | "exam_prep"
  | "consolidation";

export interface MethodBlock {
  id: number;
  name: string;
  category: MethodCategory;
  description: string | null;
  default_duration_min: number;
  energy_cost: EnergyLevel;
  best_stage: StudyStage | null;
  tags: string[];
  created_at: string;
}

export interface ContextTags {
  class_type?: string;
  stage?: StudyStage;
  energy?: EnergyLevel;
  time_available?: number;
}

export interface MethodChain {
  id: number;
  name: string;
  description: string | null;
  block_ids: number[];
  context_tags: ContextTags;
  created_at: string;
  is_template: number;
  blocks?: MethodBlock[];
}

export interface MethodRating {
  id: number;
  method_block_id: number | null;
  chain_id: number | null;
  session_id: number | null;
  effectiveness: number;
  engagement: number;
  notes: string | null;
  context: ContextTags;
  rated_at: string;
  method_name?: string;
  chain_name?: string;
}

export interface BlockStats {
  id: number;
  name: string;
  category: MethodCategory;
  usage_count: number;
  avg_effectiveness: number | null;
  avg_engagement: number | null;
}

export interface ChainStats {
  id: number;
  name: string;
  is_template: number;
  usage_count: number;
  avg_effectiveness: number | null;
  avg_engagement: number | null;
}

export interface MethodAnalytics {
  block_stats: BlockStats[];
  chain_stats: ChainStats[];
  recent_ratings: MethodRating[];
}

export const CATEGORY_COLORS: Record<MethodCategory, string> = {
  activate: "#f59e0b",
  map: "#3b82f6",
  encode: "#8b5cf6",
  retrieve: "#ef4444",
  connect: "#10b981",
  consolidate: "#6b7280",
};

export const CATEGORY_LABELS: Record<MethodCategory, string> = {
  activate: "Activate",
  map: "Map",
  encode: "Encode",
  retrieve: "Retrieve",
  connect: "Connect",
  consolidate: "Consolidate",
};
