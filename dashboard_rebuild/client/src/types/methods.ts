export type MethodCategory =
  | "prepare"
  | "encode"
  | "interrogate"
  | "retrieve"
  | "refine"
  | "overlearn";

export type EnergyLevel = "low" | "medium" | "high";

export type StudyStage =
  | "first_exposure"
  | "review"
  | "exam_prep"
  | "consolidation";

export type RuleSetScope = "global" | "chain" | "module";

export interface RuleCondition {
  type: "gate" | "skip" | "branch" | "require";
  block_index?: number;
  condition: string;
  alternate_block_id?: number;
}

export interface RuleSet {
  id: number;
  name: string;
  description: string | null;
  scope: RuleSetScope;
  rules_json: RuleCondition[];
  is_active: number;
  created_at: string;
  updated_at: string | null;
}

export interface FailureMode {
  mode: string;
  mitigation: string;
}

export interface ModuleVariant {
  name: string;
  description: string;
}

export interface ScoringHook {
  metric: string;
  threshold?: number;
  weight?: number;
}

export interface MethodBlock {
  id: number;
  name: string;
  category: MethodCategory;
  description: string | null;
  default_duration_min: number;
  energy_cost: EnergyLevel;
  best_stage: StudyStage | null;
  tags: string[];
  evidence: string | null;
  inputs: string[];
  outputs: string[];
  strategy_label: string | null;
  failure_modes: FailureMode[];
  variants: ModuleVariant[];
  scoring_hooks: ScoringHook[];
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
  ruleset_id?: number | null;
  ruleset?: RuleSet;
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

export interface UserScoringWeights {
  id?: number;
  user_id: string;
  learning_gain_weight: number;
  time_cost_weight: number;
  error_rate_weight: number;
  hint_dependence_weight: number;
  confidence_calibration_weight: number;
  cognitive_strain_weight: number;
  artifact_quality_weight: number;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string | null;
}

export interface ScoringHooks {
  learning_gain: number;
  time_cost: number;
  error_rate: number;
  hint_dependence: number;
  confidence_calibration: number;
  cognitive_strain: number;
  artifact_quality: number;
}

export interface CompositeScoreResult {
  composite_score: number;
  breakdown: Record<string, { value: number; weight: number; contribution: number }>;
  weights_source: "custom" | "default";
}

export const CATEGORY_COLORS: Record<MethodCategory, string> = {
  prepare: "#f59e0b",
  encode: "#8b5cf6",
  interrogate: "#10b981",
  retrieve: "#ef4444",
  refine: "#3b82f6",
  overlearn: "#6b7280",
};

export const CATEGORY_LABELS: Record<MethodCategory, string> = {
  prepare: "Prepare",
  encode: "Encode",
  interrogate: "Interrogate",
  retrieve: "Retrieve",
  refine: "Refine",
  overlearn: "Overlearn",
};
