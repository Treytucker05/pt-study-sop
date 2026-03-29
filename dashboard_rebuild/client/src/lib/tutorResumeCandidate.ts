import type { TutorHubResumeCandidate } from "@/lib/api";

export function resolveResumableTutorHubCandidate(
  candidate: TutorHubResumeCandidate | null | undefined,
): TutorHubResumeCandidate | null {
  if (!candidate?.can_resume) {
    return null;
  }

  const sessionId =
    typeof candidate.session_id === "string" ? candidate.session_id.trim() : "";
  if (!sessionId) {
    return null;
  }

  if (sessionId === candidate.session_id) {
    return candidate;
  }

  return {
    ...candidate,
    session_id: sessionId,
  };
}
