import {
  TutorStudioHome,
  type TutorStudioHomeProps,
} from "@/components/TutorStudioHome";

export type StudioWorkspaceHomeProps = Omit<
  TutorStudioHomeProps,
  "homeTitle" | "homeCopy"
>;

export function StudioWorkspaceHome(props: StudioWorkspaceHomeProps) {
  return (
    <TutorStudioHome
      {...props}
      homeTitle="WORKSPACE HOME"
      homeCopy="Workspace Home is where priming, Tutor handoff, and study wrap-up stay connected. Start from the next recommended action, then open Workspace when you need the source-linked canvas."
    />
  );
}
