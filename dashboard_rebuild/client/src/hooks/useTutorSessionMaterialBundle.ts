import { useEffect, useMemo, useRef } from "react";

import type {
  TutorCapturedNote,
  TutorPrimingMethodRun,
  TutorPrimingSourceInventoryItem,
} from "@/api.types";
import type { TutorArtifact } from "@/components/TutorArtifacts";
import {
  buildSessionMaterialBundle,
  type SessionMaterialBundle,
  type SessionMaterialBundleInput,
} from "@/lib/sessionMaterialBundle";
import type { PrimePromotedWorkspaceObject } from "@/lib/sessionMaterialBundle";
import type { StudioPolishPromotedNote } from "@/lib/studioPacketSections";

export type UseTutorSessionMaterialBundleOptions = {
  workflowId: string | null;
  tutorSessionId: string | null;
  topic: string | null;
  studyUnit: string | null;
  courseId: number | null;
  courseName: string | null;
  sourceInventory: readonly TutorPrimingSourceInventoryItem[];
  primingMethodRuns: readonly TutorPrimingMethodRun[];
  artifacts: readonly TutorArtifact[];
  turnCount: number;
  capturedNotes: readonly TutorCapturedNote[];
  primePacket: readonly PrimePromotedWorkspaceObject[];
  polishPacket: readonly StudioPolishPromotedNote[];
  hasWorkflowDetail: boolean;
};

export function useTutorSessionMaterialBundle(
  options: UseTutorSessionMaterialBundleOptions,
): SessionMaterialBundle {
  const bundle = useMemo<SessionMaterialBundle>(() => {
    const input: SessionMaterialBundleInput = {
      workflowId: options.workflowId,
      tutorSessionId: options.tutorSessionId,
      topic: options.topic,
      studyUnit: options.studyUnit,
      courseId: options.courseId,
      courseName: options.courseName,
      sourceInventory: options.sourceInventory,
      primingMethodRuns: options.primingMethodRuns,
      artifacts: options.artifacts,
      turnCount: options.turnCount,
      capturedNotes: options.capturedNotes,
      primePacket: options.primePacket,
      polishPacket: options.polishPacket,
      hasWorkflowDetail: options.hasWorkflowDetail,
    };
    return buildSessionMaterialBundle(input);
  }, [
    options.artifacts,
    options.capturedNotes,
    options.courseId,
    options.courseName,
    options.hasWorkflowDetail,
    options.polishPacket,
    options.primePacket,
    options.primingMethodRuns,
    options.sourceInventory,
    options.studyUnit,
    options.topic,
    options.turnCount,
    options.tutorSessionId,
    options.workflowId,
  ]);

  const loggedSessionKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!bundle.isReady) return;
    if (loggedSessionKeyRef.current === bundle.sessionKey) return;
    loggedSessionKeyRef.current = bundle.sessionKey;
    // eslint-disable-next-line no-console
    console.debug("[SessionMaterialBundle] ready", {
      sessionKey: bundle.sessionKey,
      topic: bundle.topic,
      learningObjectives: bundle.learningObjectives.length,
      concepts: bundle.concepts.length,
      terms: bundle.terms.length,
      summaries: bundle.summaries.length,
      rootExplanations: bundle.rootExplanations.length,
      gaps: bundle.gaps.length,
      artifacts: bundle.artifacts.length,
      turnCount: bundle.turnCount,
      primePacket: bundle.primePacket.length,
      polishPacket: bundle.polishPacket.length,
      notes: bundle.notes.length,
    });
  }, [bundle]);

  return bundle;
}
