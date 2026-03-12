/**
 * API Type Definitions
 *
 * All interfaces, type aliases, and type-adjacent constants for the API client.
 * Extracted from api.ts to keep the client module focused on runtime logic.
 *
 * Import pattern: consumers should import from "@/api" or "@/lib/api" as before.
 */

import type {
  Session, InsertSession,
  CalendarEvent, InsertCalendarEvent,
  Task, InsertTask,
  Proposal, InsertProposal,
  ChatMessage, InsertChatMessage,
  Note, InsertNote,
  Course, InsertCourse,
  ScheduleEvent, InsertScheduleEvent,
  Module, InsertModule,
  LearningObjective, InsertLearningObjective,
  LoSession, InsertLoSession
} from "@shared/schema";

// Re-export schema types so consumers can get everything from one place
export type {
  Session, InsertSession,
  CalendarEvent, InsertCalendarEvent,
  Task, InsertTask,
  Proposal, InsertProposal,
  ChatMessage, InsertChatMessage,
  Note, InsertNote,
  Course, InsertCourse,
  ScheduleEvent, InsertScheduleEvent,
  Module, InsertModule,
  LearningObjective, InsertLearningObjective,
  LoSession, InsertLoSession,
};

// ── App-level type extensions ───────────────────────────────────────────────

export type AppLearningObjective = LearningObjective & {
  groupName?: string | null;
  managedByTutor?: boolean;
};

// ── Google Tasks ────────────────────────────────────────────────────────────

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  position?: string;
  listId: string;
  listTitle?: string;
}

// ── Planner ─────────────────────────────────────────────────────────────────

export interface PlannerTask {
  id: number;
  course_id?: number | null;
  topic_id?: number | null;
  course_event_id?: number | null;
  scheduled_date?: string | null;
  planned_minutes?: number | null;
  status: "pending" | "in_progress" | "completed" | "deferred" | string;
  actual_session_id?: number | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  source?: string | null;
  priority?: number | null;
  review_number?: number | null;
  anchor_text?: string | null;
  course_name?: string | null;
}

export interface PlannerTaskCreate {
  course_id?: number | null;
  topic_id?: number | null;
  course_event_id?: number | null;
  scheduled_date?: string | null;
  planned_minutes?: number | null;
  status?: "pending" | "in_progress" | "completed" | "deferred";
  actual_session_id?: number | null;
  notes?: string | null;
  source?: string | null;
  priority?: number | null;
  review_number?: number | null;
  anchor_text?: string | null;
}

export type PlannerTaskUpdate = Partial<
  Pick<PlannerTask, "status" | "scheduled_date" | "planned_minutes" | "notes" | "actual_session_id">
>;

// ── Syllabus ────────────────────────────────────────────────────────────────

export interface SyllabusImportResult {
  modulesCreated: number;
  eventsCreated: number;
  classMeetingsExpanded: number;
  errors?: string[];
}

// ── Janitor ─────────────────────────────────────────────────────────────────

export interface JanitorIssue {
  issue_type: string;
  path: string;
  field: string;
  detail: string;
  fixable: boolean;
  fix_data: Record<string, unknown>;
  family: string;
  issue_class: string;
  severity: "low" | "medium" | "high" | string;
  confidence: "low" | "medium" | "high" | string;
  explanation: string;
  fix_preview: string;
  counts_toward_health: boolean;
}

export interface JanitorNoteSummary {
  path: string;
  family: string;
  issue_count: number;
  issue_classes: string[];
  severity: "low" | "medium" | "high" | string;
  counts_toward_health: boolean;
}

export interface JanitorOptions {
  course: string[];
  course_name: string[];
  course_code: Record<string, string>;
  module_name: string[];
  unit_type: string[];
  note_type: string[];
}

export interface AiFieldSuggestion {
  value: string;
  confidence: "high" | "medium" | "low";
}

export interface AiResolveResponse {
  success: boolean;
  suggestion: Record<string, AiFieldSuggestion>;
  reasoning: string;
  apply_action: string;
  uncertain_fields?: string[];
  error?: string;
}

export interface AiApplyResponse {
  success: boolean;
  detail: string;
  links_added?: number;
}

export interface BatchEnrichResponse {
  total_processed: number;
  total_links_added: number;
  results: { path: string; links_added: number; selection_reason?: string; error?: string }[];
}

export interface JanitorHealthResponse {
  available: boolean;
  notes_scanned: number;
  total_markdown_files: number;
  affected_notes: number;
  issue_instances: number;
  excluded_system_files: number;
  advisory_only_files: number;
  counts: Record<string, number>;
  issueClassCounts: Record<string, number>;
  familyCounts: Record<string, number>;
  scan_time_ms: number;
}

export interface JanitorScanResponse {
  available: boolean;
  notes_scanned: number;
  total_markdown_files: number;
  affected_notes: number;
  issue_instances: number;
  excluded_system_files: number;
  advisory_only_files: number;
  counts: Record<string, number>;
  issueClassCounts: Record<string, number>;
  familyCounts: Record<string, number>;
  scan_time_ms: number;
  note_summaries: JanitorNoteSummary[];
  issues: JanitorIssue[];
}

// ── Scholar ─────────────────────────────────────────────────────────────────

export interface ScholarQuestion {
  id: number;
  question_id?: string;
  question_hash?: string;
  question: string;
  question_text?: string;
  context: string;
  dataInsufficient: string;
  researchAttempted: string;
  source: string;
  status?: string;
  answer_text?: string | null;
  answered_at?: string | null;
  created_at?: string;
  updated_at?: string;
  audience_type?: "learner" | "operator" | "system" | string;
  rationale?: string;
  is_blocking?: boolean;
  linked_investigation_id?: string;
  evidence_needed?: string;
  answer_incorporation_status?: string;
  answer_incorporated_at?: string | null;
}

export interface ScholarChatResponse {
  response: string;
  sessionCount: number;
  isStub: boolean;
}

export interface ScholarFinding {
  id?: number;
  finding_id?: string;
  investigation_id?: string;
  title: string;
  source?: string;
  content?: string;
  topic?: string;
  summary?: string;
  relevance?: string;
  confidence?: "low" | "medium" | "high" | string;
  uncertainty?: string;
  source_ids?: string[];
  sources?: ScholarSource[];
  created_at?: string;
  updated_at?: string;
}

export interface ScholarSource {
  id?: number;
  source_id: string;
  investigation_id: string;
  url: string;
  normalized_url?: string;
  domain: string;
  title?: string;
  publisher?: string;
  published_at?: string;
  snippet?: string;
  source_type?: string;
  trust_tier?: "high" | "medium" | "general" | string;
  rank_order?: number;
  fetched_at?: string;
  created_at?: string;
}

export interface ScholarInvestigation {
  id?: number;
  investigation_id: string;
  title: string;
  query_text: string;
  rationale: string;
  audience_type: "learner" | "operator" | "system" | string;
  mode: "brain" | "tutor" | string;
  status: "queued" | "running" | "blocked" | "completed" | "failed" | string;
  source_policy?: string;
  confidence?: "low" | "medium" | "high" | string;
  uncertainty_summary?: string;
  linked_profile_snapshot_id?: string | null;
  requested_by?: string;
  findings_count?: number;
  open_question_count?: number;
  created_at?: string;
  updated_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
  run_notes?: string | null;
  output_markdown?: string | null;
  error_message?: string | null;
}

export interface ScholarInvestigationDetail extends ScholarInvestigation {
  findings: ScholarFinding[];
  questions: ScholarQuestion[];
  sources: ScholarSource[];
}

export interface ScholarInvestigationCreatePayload {
  title?: string;
  query_text: string;
  rationale: string;
  audience_type?: "learner" | "operator" | "system" | string;
  mode?: "brain" | "tutor" | string;
  requested_by?: string;
}

export interface TutorAuditItem {
  id: number;
  sessionId: string;
  date: string;
  userMessages: number;
  assistantMessages: number;
  status: string;
  issue?: string;
  frequency?: number;
  courses?: string[];
}

export interface ScholarClusterItem {
  title: string;
  source: string;
}

export interface ScholarCluster {
  cluster_id: number;
  count: number;
  items: ScholarClusterItem[];
}

export interface ScholarClustersResponse {
  clusters: ScholarCluster[];
}

export interface ScholarRunResult {
  ok: boolean;
  run_id?: string;
  error?: string;
}

export interface ScholarRunStatus {
  running: boolean;
  run_id?: string;
  phase?: string;
  status?: "running" | "complete" | "error" | "idle" | string;
  progress?: number;
  current_step?: string;
  last_run?: string;
  errors?: string[];
  error?: string;
  started_at?: string;
  ended_at?: string;
  finished_at?: string;
}

export interface ScholarRunHistoryItem {
  id: number;
  run_id: string;
  status: string;
  started_at: string;
  finished_at?: string;
  duration_seconds?: number;
  summary?: string;
}

// ── Academic Deadlines ──────────────────────────────────────────────────────

export interface InsertAcademicDeadline {
  title: string;
  course: string;
  type: 'assignment' | 'quiz' | 'exam' | 'project';
  dueDate: string;
  notes?: string;
}

export interface AcademicDeadline extends InsertAcademicDeadline {
  id: number;
  completed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ── Anki ────────────────────────────────────────────────────────────────────

export interface AnkiStatus {
  connected: boolean;
  version?: number;
  decks?: string[];
  reviewedToday?: number;
  error?: string;
}

export interface AnkiDeck {
  id: number;
  name: string;
  cardCount: number;
}

export interface AnkiDueInfo {
  dueCount: number;
  cardIds: number[];
}

export interface CardDraft {
  id: number;
  sessionId: string;
  deckName: string;
  cardType: string;
  front: string;
  back: string;
  tags: string;
  status: string;
  createdAt: string;
}

export interface AnkiSyncResult {
  success: boolean;
  output?: string;
  error?: string;
}

// ── Obsidian ────────────────────────────────────────────────────────────────

export interface ObsidianStatus {
  connected: boolean;
  status: 'online' | 'offline' | 'error';
  error?: string;
}

export interface ObsidianConfig {
  vaultName: string;
  apiUrl: string;
  canonicalRoot?: string;
  deprecatedRoots?: string[];
}

export interface ObsidianAppendResult {
  success: boolean;
  path?: string;
  bytes?: number;
  error?: string;
}

export interface ObsidianFile {
  path: string;
  name: string;
  type: 'file' | 'folder';
}

export interface ObsidianFilesResult {
  success: boolean;
  files?: string[];
  error?: string;
}

export interface ObsidianFileResult {
  success: boolean;
  content?: string;
  path?: string;
  error?: string;
}

export interface ObsidianCrudResult {
  success: boolean;
  path?: string;
  created?: boolean;
  deleted?: boolean;
  error?: string;
}

export interface ObsidianMoveResult {
  success: boolean;
  from_path?: string;
  to_path?: string;
  moved?: boolean;
  error?: string;
}

export interface ObsidianTemplateRenderResult {
  success: boolean;
  template_id?: string;
  content?: string;
  error?: string;
}

export interface ObsidianVaultIndexResult {
  success: boolean;
  notes: string[];
  paths: Record<string, string>;
  count: number;
  cached?: boolean;
  timestamp?: string;
  error?: string;
}

export interface ObsidianGraphNode {
  id: string;
  name: string;
  folder: string;
}

export interface ObsidianGraphLink {
  source: string;
  target: string;
}

export interface ObsidianGraphResult {
  success: boolean;
  nodes: ObsidianGraphNode[];
  links: ObsidianGraphLink[];
  cached?: boolean;
  error?: string;
}

// ── Brain ───────────────────────────────────────────────────────────────────

export interface BrainChatPayload {
  message: string;
  syncToObsidian?: boolean;
  mode?: string;
  destinationPath?: string;
  organizedMarkdown?: string;
  organizedTitle?: string;
  confirmWrite?: boolean;
}

export interface BrainDestinationOption {
  id: string;
  label: string;
  path: string;
  kind: "recommended" | "session" | "new" | "existing" | "custom";
  exists: boolean;
}

export interface BrainOrganizePreviewResponse {
  success: boolean;
  error?: string;
  organized?: {
    title: string;
    markdown: string;
    checklist: string[];
    suggested_links: string[];
  };
  destination?: {
    recommended_path: string;
    recommended_label: string;
    session_path?: string;
    module_path?: string | null;
    options: BrainDestinationOption[];
  };
  course?: string;
  courseFolder?: string | null;
}

export interface BrainProfileReliabilityTier {
  tier: number;
  label: string;
  description: string;
}

export interface BrainHybridArchetype {
  slug: string;
  label: string;
  summary: string;
  supportingTraits: string[];
}

export interface BrainProfileSummaryCard {
  headline: string;
  strengths: string[];
  watchouts: string[];
  nextBestActions: string[];
  backfillMode: string;
}

export interface BrainProfileOverview {
  userId: string;
  snapshotId: number;
  generatedAt: string;
  modelVersion: string;
  hybridArchetype: BrainHybridArchetype;
  profileSummary: BrainProfileSummaryCard;
  claimsOverview: {
    count: number;
    highConfidence: number;
    needsCalibration: number;
    watchouts: number;
  };
  sourceWindow: {
    start: string | null;
    end: string | null;
  };
  backfillMode: string;
  reliabilityTiers: BrainProfileReliabilityTier[];
  evidenceSummary: Record<string, unknown>;
}

export interface BrainProfileClaim {
  claimKey: string;
  label: string;
  score: number;
  valueBand: string;
  confidence: number;
  confidenceBand: string;
  freshnessDays: number | null;
  contradictionState: string;
  evidenceTier: number;
  evidenceLabel: string;
  signalDirection: "strength" | "watchout";
  observedCount: number;
  explanation: string;
  recommendedStrategy: string;
  evidence: Record<string, unknown>;
}

export interface BrainProfileClaimsResponse {
  userId: string;
  snapshotId: number;
  generatedAt: string;
  claims: BrainProfileClaim[];
  count: number;
}

export interface BrainProfileQuestion {
  id: number;
  snapshotId: number;
  questionKey: string;
  questionText: string;
  claimKey: string;
  rationale: string;
  questionType: string;
  status: string;
  blocking: boolean;
  evidenceNeeded: string;
  answerText?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrainProfileQuestionsResponse {
  userId: string;
  snapshotId: number;
  questions: BrainProfileQuestion[];
  count: number;
}

export interface BrainProfileHistoryItem {
  snapshotId: number;
  generatedAt: string;
  modelVersion: string;
  archetypeLabel: string;
  archetypeSummary: string;
  topSignals: Array<{
    claimKey: string;
    score: number;
    confidence: number;
    contradictionState: string;
  }>;
  sourceWindow: {
    start: string | null;
    end: string | null;
  };
}

export interface BrainProfileHistoryResponse {
  userId: string;
  history: BrainProfileHistoryItem[];
  count: number;
}

export interface BrainProfileFeedbackPayload {
  questionId?: number;
  claimKey?: string;
  responseType: "answer" | "challenge" | "confirm";
  responseText: string;
  source?: string;
  userId?: string;
}

export interface BrainProfileFeedbackResponse {
  ok: boolean;
  feedbackId: number;
  snapshotId: number | null;
  claimKey: string | null;
  responseType: string;
  question?: BrainProfileQuestion | null;
}

export interface ProductEventPayload {
  eventType: string;
  source?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  workspaceId?: string;
}

export interface ProductPrivacySettings {
  userId: string;
  workspaceId: string;
  retentionDays: number;
  allowTier2Signals: boolean;
  allowVaultSignals: boolean;
  allowCalendarSignals: boolean;
  allowScholarPersonalization: boolean;
  allowOutcomeReports: boolean;
  updatedAt: string;
}

export interface ProductFeatureFlag {
  flagKey: string;
  enabled: boolean;
  variant: string;
  description: string;
  scope: string;
  updatedAt: string;
}

export interface ProductAnalyticsResponse {
  generatedAt: string;
  userId: string;
  workspaceId: string;
  activation: {
    onboardingCompleted: boolean;
    onboardingCompletedAt: string | null;
    brainProfileReady: boolean;
    firstArchetypeLabel?: string | null;
  };
  engagement: {
    brainTrustInteractions30d: number;
    scholarInvestigations: number;
    scholarPendingQuestions: number;
    scholarAnsweredQuestions: number;
    scholarQuestionResponseRate: number;
    tutorSessionsStarted30d: number;
    tutorSessionsCompleted30d: number;
    tutorCompletionRate30d: number;
    strategyFeedbackCount: number;
    exportsTriggered: number;
  };
  valueProof: {
    clearerDiagnosis: boolean;
    betterFollowThrough: number;
    strongerRetrieval: number | null;
    betterSelfUnderstanding: number;
  };
  nextBestActions: string[];
}

export interface ProductOutcomeReport {
  generatedAt: string;
  userId: string;
  workspaceId: string;
  headline: string;
  narrative: string;
  brain: {
    snapshotId: number | null;
    hybridArchetype: BrainHybridArchetype;
    profileSummary: BrainProfileSummaryCard;
    claimsOverview: {
      count?: number;
      highConfidence?: number;
      needsCalibration?: number;
      watchouts?: number;
    };
  };
  scholar: {
    investigationCount: number;
    answeredQuestions: number;
    pendingQuestions: number;
    responseRate: number;
  };
  tutor: {
    sessionsStarted30d: number;
    sessionsCompleted30d: number;
    completionRate30d: number;
    strategyFeedbackCount: number;
  };
  proof: ProductAnalyticsResponse["valueProof"];
  highlights: string[];
  recommendedNextActions: string[];
}

// ── Method Library ──────────────────────────────────────────────────────────

export type MethodCategory =
  | "PRIME" | "CALIBRATE" | "ENCODE" | "REFERENCE" | "RETRIEVE" | "OVERLEARN"
  | "prepare" | "encode" | "interrogate" | "retrieve" | "refine" | "overlearn";

export const CATEGORY_LABELS: Record<MethodCategory, string> = {
  PRIME: "PRIME",
  CALIBRATE: "CALIBRATE",
  ENCODE: "ENCODE",
  REFERENCE: "REFERENCE",
  RETRIEVE: "RETRIEVE",
  OVERLEARN: "OVERLEARN",
  prepare: "Prepare",
  encode: "Encode",
  interrogate: "Interrogate",
  retrieve: "Retrieve",
  refine: "Refine",
  overlearn: "Overlearn",
};

export const CATEGORY_COLORS: Record<MethodCategory, string> = {
  PRIME: "#3b82f6",
  CALIBRATE: "#f59e0b",
  ENCODE: "#10b981",
  REFERENCE: "#8b5cf6",
  RETRIEVE: "#ef4444",
  OVERLEARN: "#ec4899",
  prepare: "#3b82f6",
  encode: "#10b981",
  interrogate: "#8b5cf6",
  retrieve: "#ef4444",
  refine: "#ec4899",
  overlearn: "#ec4899",
};

export interface MethodBlock {
  id: number;
  name: string;
  control_stage?: string | null;
  category: MethodCategory | string;
  description: string | null;
  default_duration_min: number;
  energy_cost: string;
  best_stage: string | null;
  tags: string[];
  evidence: string | null;
  facilitation_prompt?: string | null;
  knobs?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  has_active_knobs?: boolean;
  created_at: string;
}

export interface MethodChain {
  id: number;
  name: string;
  description: string | null;
  block_ids: number[];
  context_tags: Record<string, unknown>;
  created_at: string;
  is_template: number;
}

export interface MethodChainExpanded extends MethodChain {
  blocks: MethodBlock[];
}

export interface MethodAnalyticsResponse {
  block_stats: {
    id: number;
    name: string;
    control_stage?: string | null;
    category: string;
    usage_count: number;
    avg_effectiveness: number | null;
    avg_engagement: number | null;
  }[];
  chain_stats: {
    id: number;
    name: string;
    is_template: number;
    usage_count: number;
    avg_effectiveness: number | null;
    avg_engagement: number | null;
  }[];
  recent_ratings: {
    id: number;
    method_block_id: number | null;
    chain_id: number | null;
    effectiveness: number;
    engagement: number;
    notes: string | null;
    context: Record<string, unknown>;
    rated_at: string;
    method_name: string | null;
    chain_name: string | null;
  }[];
}

// ── Chain Runner ────────────────────────────────────────────────────────────

export interface ChainRunRequest {
  chain_id: number;
  topic: string;
  course_id?: number;
  source_doc_ids?: number[];
  options?: {
    write_obsidian?: boolean;
    draft_cards?: boolean;
  };
}

export interface ChainRunStep {
  step: number;
  method_name: string;
  category: string;
  output: string;
  duration_ms: number;
}

export interface ChainRunResult {
  run_id: number;
  chain_name: string;
  status: "completed" | "failed" | "running";
  steps: ChainRunStep[];
  artifacts: {
    session_id: number;
    obsidian_path?: string | null;
    card_draft_ids?: number[];
    metrics: {
      total_duration_ms: number;
      steps_completed: number;
      cards_drafted: number;
    };
  } | null;
  error?: string;
}

export interface ChainRunSummary {
  id: number;
  chain_id: number;
  chain_name: string;
  topic: string;
  status: string;
  current_step: number;
  total_steps: number;
  started_at: string;
  completed_at: string | null;
}

// ── Adaptive Tutor ──────────────────────────────────────────────────────────

export type TutorPhase = "first_pass" | "understanding" | "testing";
export type TutorMode =
  | "Core"
  | "Sprint"
  | "Quick Sprint"
  | "Light"
  | "Drill"
  | "Diagnostic Sprint"
  | "Teaching Sprint";
export type TutorAccuracyProfile = "balanced" | "strict" | "coverage";
export type TutorObjectiveScope = "module_all" | "single_focus";
export type BehaviorOverride = "socratic" | "evaluate" | "concept_map" | "teach_back";
export type TutorSessionStatus = "active" | "completed" | "abandoned";

export interface TutorSyncedPageStatus {
  path: string;
  status: string;
  error?: string | null;
  module_name?: string;
  course_name?: string;
  subtopic_name?: string;
  objective_ids?: string[];
}

export interface TutorPageSyncResult {
  ok: boolean;
  map_of_contents: TutorSyncedPageStatus;
  learning_objectives_todo: TutorSyncedPageStatus;
  errors?: string[];
  synced_at?: string;
}

export interface TutorSessionPreflightRequest {
  course_id: number;
  topic?: string;
  study_unit?: string;
  module_name?: string;
  module_id?: number;
  objective_scope?: TutorObjectiveScope;
  focus_objective_id?: string;
  learning_objectives?: Array<
    string | {
      id?: string;
      objective_id?: string;
      lo_code?: string;
      title?: string;
      objective?: string;
      status?: string;
      group?: string;
    }
  >;
  content_filter?: {
    material_ids?: number[];
    folders?: string[];
    web_search?: boolean;
    accuracy_profile?: TutorAccuracyProfile;
    objective_scope?: TutorObjectiveScope;
    focus_objective_id?: string;
    vault_folder?: string;
    force_full_docs?: boolean;
    default_mode?: {
      materials?: boolean;
      obsidian?: boolean;
      web_search?: boolean;
      deep_think?: boolean;
      gemini_vision?: boolean;
    };
  };
}

export interface TutorSessionPreflightResponse {
  ok: boolean;
  preflight_id: string;
  course_id: number;
  module_name?: string;
  topic?: string;
  objective_scope?: TutorObjectiveScope;
  focus_objective_id?: string | null;
  material_ids: number[];
  resolved_learning_objectives: Array<{
    objective_id: string;
    title: string;
    status: string;
    group?: string;
  }>;
  map_of_contents?: {
    path: string;
    status: string;
    module_name: string;
    course_name?: string;
    subtopic_name?: string;
    objective_ids: string[];
  } | null;
  learning_objectives_page?: TutorSyncedPageStatus | null;
  page_sync_result?: TutorPageSyncResult | null;
  north_star?: {
    path: string;
    status: string;
    module_name: string;
    course_name?: string;
    subtopic_name?: string;
    objective_ids: string[];
  } | null;
  vault_ready: boolean;
  recommended_mode_flags: {
    materials: boolean;
    obsidian: boolean;
    gemini_vision: boolean;
    web_search: boolean;
    deep_think: boolean;
  };
  blockers: Array<{ code: string; message: string }>;
}

export interface TutorCreateSessionRequest {
  preflight_id?: string;
  course_id?: number;
  phase?: TutorPhase;
  mode?: TutorMode;
  topic?: string;
  module_name?: string;
  objective_scope?: TutorObjectiveScope;
  focus_objective_id?: string;
  learning_objectives?: Array<
    string | {
      id?: string;
      objective_id?: string;
      lo_code?: string;
      title?: string;
      objective?: string;
      status?: string;
      group?: string;
    }
  >;
  north_star_refresh?: boolean;
  content_filter?: {
    material_ids?: number[];
    model?: string;
    folders?: string[];
    web_search?: boolean;
    accuracy_profile?: TutorAccuracyProfile;
    objective_scope?: TutorObjectiveScope;
    focus_objective_id?: string;
    vault_folder?: string;
    north_star_refresh?: boolean;
    force_full_docs?: boolean;
    default_mode?: {
      materials?: boolean;
      obsidian?: boolean;
      web_search?: boolean;
      deep_think?: boolean;
      gemini_vision?: boolean;
    };
  };
  method_chain_id?: number;
}

export interface TutorTemplateChain {
  id: number;
  name: string;
  description: string;
  blocks: { id: number; name: string; control_stage?: string; category: string; description?: string; duration: number; facilitation_prompt?: string }[];
  context_tags: string;
  template_id?: string | null;
  certification?: {
    disposition: "strict-certification" | "baseline-certification" | "legacy/deferred" | "admin-only/non-user path";
    bar?: "strict" | "baseline" | string;
    selectable?: boolean;
    gold_standard?: boolean;
    rationale?: string;
  } | null;
  runtime_profile?: Record<string, unknown> | null;
}

export interface TutorMethodBlock {
  id: number;
  name: string;
  category: string;
  description: string | null;
  default_duration_min: number;
  energy_cost: string;
  facilitation_prompt?: string | null;
}

export interface TutorBlockProgress {
  block_index: number;
  block_name: string;
  block_description: string;
  block_category?: string;
  block_duration?: number;
  facilitation_prompt?: string;
  is_last: boolean;
  complete?: boolean;
  vault_write_status?: "success" | "skipped" | "failed" | "unavailable";
}

export interface TutorScholarStrategyField {
  field: string;
  value: string;
  rationale: string;
  sourceClaimKeys: string[];
  evidence: Record<string, unknown>[];
}

export interface TutorScholarStrategy {
  strategyId: string;
  generatedAt: string;
  profileSnapshotId: number | null;
  hybridArchetype?: {
    slug?: string;
    label?: string;
    summary?: string;
    supportingTraits?: string[];
  } | null;
  profileSummary?: {
    headline?: string;
    strengths?: string[];
    watchouts?: string[];
    nextBestActions?: string[];
  } | null;
  boundedBy: {
    allowedFields: string[];
    forbiddenFields: string[];
    note: string;
  };
  activeInvestigation?: {
    investigationId?: string;
    title?: string;
    status?: string;
    confidence?: string;
    uncertaintySummary?: string | null;
    openQuestionCount?: number;
    topFinding?: string | null;
  } | null;
  fields: Record<string, TutorScholarStrategyField>;
  summary: string;
}

export interface TutorStrategyFeedback {
  pacing?: string | null;
  scaffolds?: string | null;
  retrievalPressure?: string | null;
  explanationDensity?: string | null;
  notes?: string | null;
  updatedAt?: string | null;
}

export interface TutorSession {
  session_id: string;
  phase: TutorPhase;
  mode?: TutorMode;
  topic: string;
  status: TutorSessionStatus;
  started_at: string;
  method_chain_id?: number | null;
  current_block_index?: number;
  current_block_name?: string | null;
  objective_scope?: TutorObjectiveScope;
  focus_objective_id?: string | null;
  map_of_contents?: {
    path: string;
    status: string;
    module_name: string;
    course_name?: string;
    subtopic_name?: string;
    objective_ids: string[];
  };
  learning_objectives_page?: TutorSyncedPageStatus;
  page_sync_result?: TutorPageSyncResult;
  north_star?: {
    path: string;
    status: string;
    module_name: string;
    course_name?: string;
    subtopic_name?: string;
    objective_ids: string[];
  };
  reference_targets_count?: number;
  brain_profile_snapshot_id?: number | null;
  scholar_strategy?: TutorScholarStrategy | null;
  strategy_feedback?: TutorStrategyFeedback | null;
}

export interface TutorTurn {
  id: number;
  turn_number: number;
  question: string;
  answer: string | null;
  citations_json: TutorCitation[] | string | null;
  phase: string | null;
  artifacts_json: unknown;
  strategy_snapshot_json?: TutorScholarStrategy | string | null;
  created_at: string;
}

export interface TutorCitation {
  source: string;
  url?: string;
  index: number;
}

export interface TutorSessionWithTurns extends TutorSession {
  id: number;
  brain_session_id: number | null;
  course_id: number | null;
  content_filter_json: string | null;
  content_filter: {
    material_ids?: number[];
    model?: string;
    web_search?: boolean;
    accuracy_profile?: TutorAccuracyProfile;
    objective_scope?: TutorObjectiveScope;
    focus_objective_id?: string;
    force_full_docs?: boolean;
    default_mode?: {
      materials?: boolean;
      obsidian?: boolean;
      web_search?: boolean;
      deep_think?: boolean;
      gemini_vision?: boolean;
    };
    reference_targets?: string[];
    follow_up_targets?: string[];
    module_name?: string;
    module_prefix?: string;
    vault_folder?: string;
    enforce_reference_bounds?: boolean;
    map_of_contents?: {
      path: string;
      status: string;
      module_name: string;
      course_name?: string;
      subtopic_name?: string;
      objective_ids: string[];
    };
    north_star?: {
      path: string;
      status: string;
      module_name: string;
      course_name?: string;
      subtopic_name?: string;
      objective_ids: string[];
    };
  } | null;
  turn_count: number;
  artifacts_json: string | null;
  lo_ids_json: string | null;
  summary_text: string | null;
  ended_at: string | null;
  turns: TutorTurn[];
  chain_blocks?: { id: number; name: string; category: string; description: string; default_duration_min: number; facilitation_prompt?: string; evidence?: string }[];
}

export interface TutorSessionSummary {
  id: number;
  session_id: string;
  course_id: number | null;
  phase: TutorPhase;
  mode?: TutorMode;
  topic: string;
  status: TutorSessionStatus;
  turn_count: number;
  started_at: string;
  ended_at: string | null;
}

export interface TutorSessionEndResult {
  session_id: string;
  status: "completed";
  brain_session_id: number | null;
  ended_at: string;
}

export interface TutorArtifactRequest {
  type: "note" | "card" | "map" | "structured_notes";
  content: string;
  title?: string;
  front?: string;
  back?: string;
  tags?: string;
}

export interface TutorArtifactResult {
  type: string;
  session_id: string;
  card_id?: number;
  content?: string;
  title?: string;
  mermaid?: string;
  status?: string;
}

export interface TutorContentSources {
  courses: {
    id: number | null;
    name: string;
    code: string | null;
    doc_count: number;
    wheel_linked?: boolean;
    wheel_active?: boolean;
    wheel_position?: number | null;
  }[];
  total_materials: number;
  total_instructions: number;
  total_docs: number;
  openrouter_enabled: boolean;
  buster_enabled?: boolean;
}

export interface TutorChainRequest {
  chain_name?: string;
  course_id?: number;
  topic: string;
  session_ids?: string[];
}

export interface TutorChain {
  id: number;
  chain_name: string | null;
  topic: string;
  session_ids: string[];
}

export interface TutorChainWithSessions extends TutorChain {
  course_id: number | null;
  session_ids_json: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  sessions: TutorSession[];
}

export interface TutorEmbedResult {
  embedded: number;
  skipped: number;
  total_chunks: number;
  timed_out?: number;
  provider?: string;
  model?: string;
  collection?: string;
  auto_selected_provider?: boolean;
}

export interface TutorSyncPreviewPayload {
  folder_path: string;
  allowed_exts?: string[];
}

export interface TutorSyncStartPayload extends TutorSyncPreviewPayload {
  selected_files?: string[];
  course_id?: number | null;
}

export interface TutorSyncPreviewNode {
  type: "folder" | "file";
  name: string;
  path: string;
  size?: number;
  modified_at?: string | null;
  children?: TutorSyncPreviewNode[];
}

export interface TutorSyncPreviewResult {
  ok?: boolean;
  folder: string;
  tree: TutorSyncPreviewNode;
  counts: {
    folders: number;
    files: number;
  };
  allowed_exts?: string[];
  truncated?: boolean;
  max_files?: number;
}

export interface TutorSyncStartResult {
  ok?: boolean;
  job_id: string;
  folder?: string;
  selected_count?: number | null;
  course_id?: number | null;
}

export interface TutorSyncJobStatus {
  job_id: string;
  status: "pending" | "running" | "completed" | "failed";
  phase?: string;
  folder?: string;
  processed: number;
  total: number;
  index?: number;
  current_file: string | null;
  errors: number;
  last_error?: string | null;
  sync_result?: {
    ok?: boolean;
    total?: number;
    processed?: number;
    failed?: number;
    errors?: string[];
    doc_ids?: number[];
    [key: string]: unknown;
  } | null;
  embed_result?: TutorEmbedResult | { error: string } | null;
  started_at: string;
  finished_at?: string | null;
}

export interface TutorVideoProcessStartResult {
  ok: boolean;
  job_id: string;
  material_id: number;
  source_path: string;
}

export interface TutorVideoJobStatus {
  job_id: string;
  status: "pending" | "running" | "completed" | "failed";
  phase?: string;
  material_id: number;
  source_path?: string;
  title?: string;
  model_size?: string;
  language?: string | null;
  keyframe_interval_sec?: number;
  started_at?: string;
  finished_at?: string | null;
  last_error?: string | null;
  manifest?: Record<string, unknown> | null;
  ingest_result?: Record<string, unknown> | null;
}

export interface TutorVideoEnrichResult {
  ok: boolean;
  material_id: number;
  status?: string;
  results?: Record<string, unknown>[];
  enrichment_md_path?: string;
  error?: string;
}

export interface TutorVideoEnrichmentStatus {
  ok: boolean;
  provider: string;
  mode: "off" | "auto" | "manual" | string;
  model_preference: string;
  model_name: string;
  api_key_configured: boolean;
  key_sources_configured?: string[];
  key_failover_strategy?: string;
  local_only_fallback: boolean;
  allowed: boolean;
  reason: string | null;
  material_id: number | null;
  budget: {
    monthly_spend: number;
    monthly_cap: number;
    per_video_cap: number;
    video_spend?: number;
    allowed?: boolean;
    reason?: string | null;
  };
  error?: string;
}

export interface Material {
  id: number;
  title: string | null;
  source_path: string | null;
  folder_path: string | null;
  file_type: string | null;
  file_size: number | null;
  course_id: number | null;
  enabled: boolean;
  extraction_error: string | null;
  checksum: string | null;
  created_at: string;
  updated_at: string | null;
  has_docling_assets?: boolean;
  docling_asset_count?: number;
}

export interface MaterialContent {
  id: number;
  title: string;
  source_path: string | null;
  file_type: string | null;
  content: string;
  char_count: number;
  extraction_lossy: boolean;
  replacement_ratio: number;
}

export interface AutoLinkResult {
  linked: number;
  unlinked: number;
  mappings: Record<string, string>;
}

export interface MaterialUploadResponse {
  id: number;
  title: string;
  file_type: string;
  file_size: number;
  char_count: number;
  embedded: boolean;
  duplicate_of: { id: number; title: string } | null;
}

// ── Data Editor ─────────────────────────────────────────────────────────────

export interface DataTableSchema {
  table: string;
  columns: { cid: number; name: string; type: string; notnull: number; default: unknown; pk: number }[];
  row_count: number;
}

export interface DataRowsResponse {
  rows: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
}

// ── Tutor Verdict / Teach-Back ──────────────────────────────────────────────

export interface TutorVerdictErrorLocation {
  type: "concept" | "prerequisite" | "reasoning" | "recall";
  node: string | null;
  prereq_from: string | null;
  prereq_to: string | null;
}

export interface TutorVerdict {
  verdict: "pass" | "fail" | "partial";
  error_location?: TutorVerdictErrorLocation | null;
  error_type?: string | null;
  why_wrong?: string | null;
  next_hint?: string | null;
  next_question?: string | null;
  confidence?: number;
  citations?: string[];
  _validation_issues?: string[];
}

export interface TeachBackRubricGap {
  skill_id: string;
  edge_id?: string | null;
}

export interface TeachBackRubric {
  overall_rating: "pass" | "partial" | "fail";
  accuracy_score: number;
  breadth_score: number;
  synthesis_score: number;
  misconceptions?: string[];
  gaps?: TeachBackRubricGap[];
  strengths?: string[];
  next_focus?: string;
  confidence?: number;
  _validation_issues?: string[];
  _mastery_blocked?: boolean;
}

// ── SSE Streaming ───────────────────────────────────────────────────────────

export interface TutorSSEChunk {
  type: "token" | "done" | "error" | "web_search_searching" | "web_search_completed" | "tool_call" | "tool_result" | "tool_limit_reached";
  content?: string;
  citations?: TutorCitation[];
  artifacts?: unknown[];
  summary?: string;
  model?: string;
  retrieval_debug?: TutorRetrievalDebug;
  behavior_override?: BehaviorOverride;
  verdict?: TutorVerdict;
  concept_map?: unknown;
  teach_back_rubric?: TeachBackRubric;
  mastery_update?: { skill_id: string; new_mastery: number; correct: boolean };
}

export interface TutorRetrievalDebug {
  accuracy_profile?: TutorAccuracyProfile;
  accuracy_profile_label?: string;
  requested_accuracy_profile?: TutorAccuracyProfile;
  effective_accuracy_profile?: TutorAccuracyProfile;
  profile_escalated?: boolean;
  profile_escalation_reasons?: string[];
  insufficient_evidence_guard?: boolean;
  insufficient_evidence_reasons?: string[];
  material_ids_provided?: boolean;
  material_ids_count?: number;
  selected_material_count?: number;
  material_k?: number;
  retrieval_course_id?: number | null;
  material_retrieval_mode?: "full_content" | "vector_search" | string;
  retrieved_material_chunks?: number;
  retrieved_material_unique_sources?: number;
  retrieved_material_sources?: string[];
  material_top_source?: string | null;
  material_top_source_share?: number;
  citations_total?: number;
  citations_unique_sources?: number;
  citation_sources?: string[];
  material_candidates_similarity?: number;
  material_candidates_mmr?: number;
  material_candidates_merged?: number;
  material_candidates_after_cap?: number;
  material_dropped_by_cap?: number;
  retrieval_confidence?: number;
  retrieval_confidence_tier?: "low" | "medium" | "high";
}

export interface TutorSessionWrapSummary {
  session_id: string;
  topic: string;
  mode?: string;
  duration_seconds: number;
  turn_count: number;
  artifact_count: number;
  objectives_covered: { id: string; name: string; status: "covered" | "partial" | "missed" }[];
  chain_progress?: { current_block: number; total_blocks: number; chain_name: string };
}

export interface TutorChainStatusResponse {
  chain_id: number | null;
  chain_name: string | null;
  current_block: number;
  total_blocks: number;
  blocks: { index: number; name: string; category: string; completed: boolean }[];
}

export interface TutorConfigCheck {
  ok: boolean;
  codex_available: boolean;
  openrouter_configured: boolean;
  chatgpt_streaming: boolean;
  issues: string[];
}

export interface TutorEmbedStatus {
  materials: {
    id: number;
    title: string;
    source_path: string;
    chunk_count: number;
    embedded: number;
    stale_chunk_count: number;
    needs_reembed: boolean;
  }[];
  total: number;
  embedded: number;
  pending: number;
  stale: number;
  provider?: string;
  model?: string;
  collection?: string;
  auto_selected_provider?: boolean;
}

// ── Mastery Dashboard ───────────────────────────────────────────────────────

export interface MasterySkill {
  skill_id: string;
  name: string;
  effective_mastery: number;
  status: "locked" | "available" | "mastered";
}

export interface MasteryDashboardResponse {
  skills: MasterySkill[];
  count: number;
}

export interface MasteryDetailResponse {
  skill_id: string;
  effective_mastery: number;
  status: string;
  p_mastery_latent: number;
  last_practiced_at: number | null;
}

export interface WhyLockedPrereq {
  skill_id: string;
  effective_mastery: number;
  status: string;
  needed: number;
}

export interface WhyLockedFlag {
  skill_id: string;
  flags: { error_type: string; severity: string; evidence_ref: string | null; created_at: string }[];
}

export interface WhyLockedResponse {
  skill_id: string;
  status: string;
  missing_prereqs: WhyLockedPrereq[];
  flagged_prereqs: WhyLockedFlag[];
  recent_error_flags: { error_type: string; severity: string; edge_id: string | null; evidence_ref: string | null; created_at: string }[];
  remediation_path: string[];
}

// ── Course Map ──────────────────────────────────────────────────────────────

export interface CourseMapCourse {
  code: string;
  label: string;
  term: string;
  unit_type: string;
  units: Array<{ id: string; name: string; topics: string[] }>;
}

export interface CourseMapResponse {
  vault_root: string;
  courses: CourseMapCourse[];
}
