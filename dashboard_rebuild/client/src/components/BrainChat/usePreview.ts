import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { BrainOrganizePreviewResponse } from "@/lib/api";
import type { ChecklistState } from "./types";

export function usePreview() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawNotes, setRawNotes] = useState("");
  const [organized, setOrganized] = useState<BrainOrganizePreviewResponse["organized"] | null>(null);
  const [destination, setDestination] = useState<BrainOrganizePreviewResponse["destination"] | null>(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState("");
  const [customDestination, setCustomDestination] = useState("");
  const [checklistState, setChecklistState] = useState<ChecklistState>({});
  const [diffLines, setDiffLines] = useState<string[]>([]);

  const buildDiffLines = (rawNotes: string, organizedNotes: string): string[] => {
    const raw = rawNotes.split("\n");
    const organized = organizedNotes.split("\n");
    const diff: string[] = [];
    let i = 0;
    let j = 0;

    while (i < raw.length || j < organized.length) {
      const rawLine = raw[i];
      const orgLine = organized[j];
      if (i < raw.length && j < organized.length && rawLine === orgLine) {
        diff.push(` ${rawLine}`);
        i += 1;
        j += 1;
        continue;
      }
      if (i < raw.length) {
        diff.push(`-${rawLine}`);
        i += 1;
      }
      if (j < organized.length) {
        diff.push(`+${orgLine}`);
        j += 1;
      }
    }

    return diff;
  };

  const reset = useCallback(() => {
    setOpen(false);
    setLoading(false);
    setError(null);
    setRawNotes("");
    setOrganized(null);
    setDestination(null);
    setSelectedDestinationId("");
    setCustomDestination("");
    setChecklistState({});
    setDiffLines([]);
  }, []);

  const startPreview = useCallback(async (notes: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setRawNotes(notes);

    try {
      const response = await api.brain.organizePreview(notes);
      if (!response.success || !response.organized || !response.destination) {
        throw new Error(response.error || "Unable to organize notes.");
      }

      setOrganized(response.organized);
      setDestination(response.destination);
      setSelectedDestinationId("recommended");

      const checklistEntries = response.organized.checklist ?? [];
      const initialChecklist: ChecklistState = {};
      checklistEntries.forEach((item) => {
        initialChecklist[item] = false;
      });
      setChecklistState(initialChecklist);
      setDiffLines(buildDiffLines(notes, response.organized.markdown || ""));
      setOpen(true);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleChecklist = useCallback((item: string) => {
    setChecklistState((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  }, []);

  const getSelectedDestinationPath = useCallback(() => {
    if (!destination) return "";
    if (selectedDestinationId === "custom") {
      return customDestination.trim();
    }
    const match = destination.options.find((opt) => opt.id === selectedDestinationId);
    return match?.path || "";
  }, [destination, selectedDestinationId, customDestination]);

  const allChecklistChecked =
    Object.values(checklistState).length === 0
      ? true
      : Object.values(checklistState).every(Boolean);

  return {
    // State
    open,
    setOpen,
    loading,
    error,
    rawNotes,
    organized,
    destination,
    selectedDestinationId,
    setSelectedDestinationId,
    customDestination,
    setCustomDestination,
    checklistState,
    diffLines,
    allChecklistChecked,

    // Actions
    reset,
    startPreview,
    toggleChecklist,
    getSelectedDestinationPath,
  };
}
