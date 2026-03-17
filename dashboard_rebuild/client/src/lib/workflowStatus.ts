const STATUS_LABELS: Record<string, string> = {
  launch_ready: "LAUNCH READY",
  priming_in_progress: "PRIMING",
  priming_complete: "PRIMED",
  tutor_in_progress: "IN SESSION",
  tutor_complete: "SESSION DONE",
  polish_in_progress: "POLISHING",
  polish_complete: "POLISHED",
  stored: "STORED",
  abandoned: "ABANDONED",
  error: "ERROR",
};

export function formatWorkflowStatus(status: string | null | undefined): string {
  if (!status) return "DRAFT";
  return STATUS_LABELS[status] || status.replace(/_/g, " ").toUpperCase();
}

export function truncateWorkflowId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.substring(0, 8);
}
