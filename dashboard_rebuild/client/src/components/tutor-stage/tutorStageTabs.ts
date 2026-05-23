export type TutorStageTab =
  | "sources"
  | "read"
  | "prime"
  | "teach"
  | "polish"
  | "settings";

export type TutorStageTabDefinition = {
  id: TutorStageTab;
  label: string;
  testId: string;
};

export const TUTOR_STAGE_TABS: readonly TutorStageTabDefinition[] = [
  { id: "sources", label: "Sources", testId: "tutor-stage-tab-sources" },
  { id: "read", label: "Read", testId: "tutor-stage-tab-read" },
  { id: "prime", label: "Prime", testId: "tutor-stage-tab-prime" },
  { id: "teach", label: "Teach", testId: "tutor-stage-tab-teach" },
  { id: "polish", label: "Polish", testId: "tutor-stage-tab-polish" },
  { id: "settings", label: "Settings", testId: "tutor-stage-tab-settings" },
] as const;

/** Productive pipeline tabs that share the session board (not Settings). */
export const TUTOR_STAGE_TABS_WITH_BOARD: readonly TutorStageTab[] = [
  "sources",
  "read",
  "prime",
  "teach",
  "polish",
];

export function tutorStageViewportTestId(tab: TutorStageTab): string {
  return `tutor-stage-${tab}`;
}

export function tutorStageShowsBoard(tab: TutorStageTab): boolean {
  return tab !== "settings";
}
