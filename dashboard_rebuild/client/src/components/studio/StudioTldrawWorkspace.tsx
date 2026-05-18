import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Editor } from "tldraw";
import type {
  StudioWorkspaceCardState,
  StudioWorkspaceObject,
  StudioWorkspaceObjectUpdate,
} from "@/lib/studioWorkspaceObjects";
import { buildObsidianHandoffMarkdown } from "@/lib/obsidianHandoffPacket";
import {
  buildStudioCanvasShape,
  getStudioCanvasShapeId,
} from "@/lib/studioCanvasShapes";
import {
  buildSessionSeedShapes,
  SESSION_SEED_SHAPE_PREFIX,
} from "@/lib/canvasFromBundle";
import type { SessionMaterialBundle } from "@/lib/sessionMaterialBundle";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

const TLDRAW_VENDOR_CTA_RE = /get a license for production|made with tldraw/i;
const WORKSPACE_CARD_BUTTON_CLASS =
  "h-7 rounded-full border-primary/20 bg-black/20 px-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-primary/84 hover:bg-black/30 disabled:cursor-default disabled:opacity-100 disabled:text-foreground/60";

function stripVendorCtas(root: ParentNode) {
  root.querySelectorAll("a, button").forEach((element) => {
    const href = element.getAttribute("href") || "";
    const text = element.textContent || "";
    if (
      href.includes("tldraw.dev") ||
      href.includes("pricing") ||
      TLDRAW_VENDOR_CTA_RE.test(text)
    ) {
      element.remove();
    }
  });
}

export interface StudioTldrawWorkspaceProps {
  courseName: string | null;
  canvasObjects: StudioWorkspaceObject[];
  currentRunObjects: StudioWorkspaceObject[];
  selectedMaterialCount: number;
  promotedPrimeObjectIds?: string[];
  sessionBundle?: SessionMaterialBundle;
  onPromoteExcerptToPrime?: (
    workspaceObject: Extract<StudioWorkspaceObject, { kind: "excerpt" }>,
  ) => void;
  onPromoteTextNoteToPrime?: (
    workspaceObject: Extract<StudioWorkspaceObject, { kind: "text_note" }>,
  ) => void;
  onUpdateWorkspaceObject?: (
    objectId: string,
    patch: StudioWorkspaceObjectUpdate,
  ) => void;
  onDeleteWorkspaceObject?: (objectId: string) => void;
}

export function StudioTldrawWorkspace({
  courseName,
  canvasObjects,
  currentRunObjects,
  selectedMaterialCount,
  promotedPrimeObjectIds = [],
  sessionBundle,
  onPromoteExcerptToPrime,
  onPromoteTextNoteToPrime,
  onUpdateWorkspaceObject,
  onDeleteWorkspaceObject,
}: StudioTldrawWorkspaceProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDetail, setEditingDetail] = useState("");
  const syncedObjectIdsRef = useRef<string[]>([]);
  const workspaceRootRef = useRef<HTMLDivElement | null>(null);
  const sessionSeedKeyRef = useRef<string | null>(null);
  const visibleCanvasObjects = useMemo(
    () => canvasObjects.filter((workspaceObject) => !workspaceObject.workspace?.hidden),
    [canvasObjects],
  );
  const obsidianHandoffObjects = useMemo(
    () =>
      canvasObjects.filter(
        (workspaceObject) => workspaceObject.workspace?.obsidianHandoff === true,
      ),
    [canvasObjects],
  );
  const materialTitles = useMemo(
    () =>
      canvasObjects
        .filter((workspaceObject) => workspaceObject.kind === "material")
        .map((workspaceObject) => workspaceObject.title),
    [canvasObjects],
  );
  const sessionGoal = useMemo(
    () =>
      [sessionBundle?.studyUnit, sessionBundle?.topic]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(" / ") || null,
    [sessionBundle?.studyUnit, sessionBundle?.topic],
  );

  const deleteSessionSeedShapes = useCallback(
    (targetEditor: Editor) => {
      const ids = targetEditor.getCurrentPageShapeIds();
      const toDelete: string[] = [];
      for (const id of ids) {
        if (String(id).startsWith(`shape:${SESSION_SEED_SHAPE_PREFIX}-`)) {
          toDelete.push(id as unknown as string);
        }
      }
      if (toDelete.length > 0) {
        targetEditor.deleteShapes(toDelete as never);
      }
    },
    [],
  );

  const applySessionSeed = useCallback(
    (targetEditor: Editor, bundle: SessionMaterialBundle) => {
      const shapes = buildSessionSeedShapes(bundle);
      if (shapes.length === 0) return false;
      deleteSessionSeedShapes(targetEditor);
      targetEditor.createShapes(shapes as never);
      // Variable-length text wraps taller than the fixed grid step, so the
      // grid coords alone overlap. Bin-pack the seeded shapes (potpack) so
      // they never overlap each other, then frame them in view. Optional-
      // chained so it safely no-ops where the editor lacks the API (mocks).
      const ed = targetEditor as Editor & {
        packShapes?: (ids: unknown, gap?: number) => void;
        zoomToFit?: (opts?: unknown) => void;
      };
      const seededIds = shapes.map((s) => s.id);
      requestAnimationFrame(() => {
        ed.packShapes?.(seededIds as never, 32);
        ed.zoomToFit?.({ animation: { duration: 0 } });
      });
      return true;
    },
    [deleteSessionSeedShapes],
  );

  useEffect(() => {
    if (!editor) return;
    if (!sessionBundle?.isReady) return;
    if (sessionSeedKeyRef.current === sessionBundle.sessionKey) return;
    // Only auto-seed a clean canvas: no synced workspace objects AND no
    // user-created shapes yet (beyond stale session seeds we control).
    if (visibleCanvasObjects.length > 0) {
      sessionSeedKeyRef.current = sessionBundle.sessionKey;
      return;
    }
    const userShapeIds = editor.getCurrentPageShapeIds();
    const nonSeedShapes = [...userShapeIds].filter(
      (id) => !String(id).startsWith(`shape:${SESSION_SEED_SHAPE_PREFIX}-`),
    );
    if (nonSeedShapes.length > 0) {
      sessionSeedKeyRef.current = sessionBundle.sessionKey;
      return;
    }
    const applied = applySessionSeed(editor, sessionBundle);
    if (applied) {
      sessionSeedKeyRef.current = sessionBundle.sessionKey;
    }
  }, [applySessionSeed, editor, sessionBundle, visibleCanvasObjects.length]);

  const handleRefreshFromSession = useCallback(() => {
    if (!editor || !sessionBundle?.isReady) return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Re-seed the canvas starter frames from the current session? Your freeform shapes stay; only the session-seeded frames are replaced.",
      );
      if (!confirmed) return;
    }
    const applied = applySessionSeed(editor, sessionBundle);
    if (applied) {
      sessionSeedKeyRef.current = sessionBundle.sessionKey;
    }
  }, [applySessionSeed, editor, sessionBundle]);
  const patchWorkspaceState = useCallback(
    (workspaceObject: StudioWorkspaceObject, patch: StudioWorkspaceCardState) => {
      onUpdateWorkspaceObject?.(workspaceObject.id, {
        workspace: {
          ...workspaceObject.workspace,
          ...patch,
        },
      });
    },
    [onUpdateWorkspaceObject],
  );

  const beginCardEdit = useCallback((workspaceObject: StudioWorkspaceObject) => {
    setEditingCardId(workspaceObject.id);
    setEditingTitle(workspaceObject.title);
    setEditingDetail(workspaceObject.detail);
  }, []);

  const cancelCardEdit = useCallback(() => {
    setEditingCardId(null);
    setEditingTitle("");
    setEditingDetail("");
  }, []);

  const saveCardEdit = useCallback(() => {
    if (!editingCardId) return;
    onUpdateWorkspaceObject?.(editingCardId, {
      title: editingTitle.trim() || "Untitled Workspace card",
      detail: editingDetail.trim(),
    });
    cancelCardEdit();
  }, [
    cancelCardEdit,
    editingCardId,
    editingDetail,
    editingTitle,
    onUpdateWorkspaceObject,
  ]);

  const handleCopyObsidianHandoff = useCallback(async () => {
    if (obsidianHandoffObjects.length === 0) {
      toast.error("Select at least one Workspace card for Obsidian first");
      return;
    }
    try {
      if (
        typeof window === "undefined" ||
        !window.navigator.clipboard?.writeText
      ) {
        throw new Error("Clipboard unavailable");
      }
      const markdown = buildObsidianHandoffMarkdown({
        courseName,
        sessionGoal,
        materialTitles,
        workspaceObjects: canvasObjects,
      });
      await window.navigator.clipboard.writeText(markdown);
      toast.success("Copied Obsidian handoff markdown");
    } catch (err) {
      toast.error("Could not copy Obsidian handoff", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [
    canvasObjects,
    courseName,
    materialTitles,
    obsidianHandoffObjects.length,
    sessionGoal,
  ]);

  const excerptObjects = canvasObjects.filter(
    (
      workspaceObject,
    ): workspaceObject is Extract<StudioWorkspaceObject, { kind: "excerpt" }> =>
      workspaceObject.kind === "excerpt",
  );
  const textNoteObjects = canvasObjects.filter(
    (
      workspaceObject,
    ): workspaceObject is Extract<StudioWorkspaceObject, { kind: "text_note" }> =>
      workspaceObject.kind === "text_note",
  );
  const imageObjects = canvasObjects.filter(
    (
      workspaceObject,
    ): workspaceObject is Extract<StudioWorkspaceObject, { kind: "image" }> =>
      workspaceObject.kind === "image",
  );

  useEffect(() => {
    if (!editor) return;

    const nextObjectIds = visibleCanvasObjects.map((workspaceObject) => workspaceObject.id);
    const previousObjectIds = syncedObjectIdsRef.current;
    const previousObjectIdSet = new Set(previousObjectIds);
    const nextObjectIdSet = new Set(nextObjectIds);

    const shapesToCreate = visibleCanvasObjects
      .filter((workspaceObject) => !previousObjectIdSet.has(workspaceObject.id))
      .map((workspaceObject, index) => buildStudioCanvasShape(workspaceObject, index));

    if (shapesToCreate.length > 0) {
      editor.createShapes(shapesToCreate);
    }

    const shapesToUpdate = visibleCanvasObjects
      .filter((workspaceObject) => previousObjectIdSet.has(workspaceObject.id))
      .map((workspaceObject, index) => buildStudioCanvasShape(workspaceObject, index));

    if (shapesToUpdate.length > 0) {
      editor.updateShapes(shapesToUpdate);
    }

    const shapesToDelete = previousObjectIds
      .filter((objectId) => !nextObjectIdSet.has(objectId))
      .map((objectId) => getStudioCanvasShapeId(objectId));

    if (shapesToDelete.length > 0) {
      editor.deleteShapes(shapesToDelete);
    }

    // When the canvas-object set changes, bin-pack the studio shapes so they
    // never overlap and frame them in view (they spawn off the default
    // viewport at the overlay-clearing origin). Optional-chained so it
    // safely no-ops where the editor lacks the API (test mocks).
    if (shapesToCreate.length > 0 || shapesToDelete.length > 0) {
      const ed = editor as Editor & {
        packShapes?: (ids: unknown, gap?: number) => void;
        zoomToFit?: (opts?: unknown) => void;
      };
      const studioShapeIds = nextObjectIds.map((id) =>
        getStudioCanvasShapeId(id),
      );
      requestAnimationFrame(() => {
        ed.packShapes?.(studioShapeIds as never, 32);
        ed.zoomToFit?.({ animation: { duration: 0 } });
      });
    }

    syncedObjectIdsRef.current = nextObjectIds;
  }, [editor, visibleCanvasObjects]);

  useEffect(() => {
    const root = workspaceRootRef.current;
    if (!root) return;

    stripVendorCtas(root);

    const observer = new MutationObserver(() => {
      stripVendorCtas(root);
    });

    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={workspaceRootRef}
      data-testid="studio-tldraw-workspace"
      className="flex h-full min-h-0 flex-col rounded-[var(--ds-r-085)] border border-primary/15 bg-black/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/12 px-4 py-3 font-mono text-sm text-foreground/78">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
            Workspace
          </div>
          <div className="mt-1 text-sm text-foreground">
            {courseName || "No course selected"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyObsidianHandoff}
            disabled={obsidianHandoffObjects.length === 0}
            aria-label="Copy Obsidian markdown handoff"
            className="h-8 rounded-full border-primary/20 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/84 hover:bg-black/30 disabled:cursor-default disabled:opacity-50"
          >
            Obsidian Handoff ({obsidianHandoffObjects.length})
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="canvas-refresh-from-session"
            onClick={handleRefreshFromSession}
            disabled={!editor || !sessionBundle?.isReady}
            title={
              sessionBundle?.isReady
                ? "Re-seed canvas starter frames from the active session"
                : "No session material yet"
            }
            className="h-8 rounded-full border-primary/20 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/84 hover:bg-black/30 disabled:cursor-default disabled:opacity-50"
          >
            Refresh from session
          </Button>
          <Badge
            variant="outline"
            className="rounded-full border-primary/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-primary/84"
          >
            {selectedMaterialCount} source{selectedMaterialCount === 1 ? "" : "s"}
          </Badge>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute left-4 top-4 z-10 w-full max-w-sm space-y-2">
          <div className="rounded-[var(--ds-r-085)] border border-primary/18 bg-black/65 px-3 py-2 font-mono text-sm text-foreground/78 shadow-[var(--ds-shadow-elev)] backdrop-blur">
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
              Current Run Ready
            </div>
            <div className="mt-1 text-sm text-foreground">
              {currentRunObjects.length} current-run source object
              {currentRunObjects.length === 1 ? "" : "s"} ready
            </div>
          </div>

          <div className="rounded-[var(--ds-r-085)] border border-primary/18 bg-black/65 px-3 py-2 font-mono text-sm text-foreground/78 shadow-[var(--ds-shadow-elev)] backdrop-blur">
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
              Canvas Objects
            </div>
            <div className="mt-1 text-sm text-foreground">
              {visibleCanvasObjects.length} active canvas object
              {visibleCanvasObjects.length === 1 ? "" : "s"}
            </div>
          </div>

          {excerptObjects.length > 0 ? (
            <div className="pointer-events-auto rounded-[var(--ds-r-085)] border border-primary/18 bg-black/65 px-3 py-3 font-mono text-sm text-foreground/78 shadow-[var(--ds-shadow-elev)] backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
                Workspace Excerpts
              </div>
              <div className="mt-2 space-y-2">
                {excerptObjects.map((workspaceObject) => {
                  const isPromoted = promotedPrimeObjectIds.includes(
                    workspaceObject.id,
                  );
                  const sourceLabel =
                    workspaceObject.provenance.sourceTitle || workspaceObject.title;

                  return (
                    <div
                      key={workspaceObject.id}
                      className="rounded-[var(--ds-r-075)] border border-primary/12 bg-black/30 p-2.5"
                    >
                      <div className="text-sm text-foreground">{sourceLabel}</div>
                      <div className="mt-1 text-xs leading-5 text-foreground/62">
                        {workspaceObject.detail}
                      </div>
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isPromoted}
                          onClick={() => onPromoteExcerptToPrime?.(workspaceObject)}
                          aria-label={
                            isPromoted
                              ? `Excerpt: ${sourceLabel} already in Prime Packet`
                              : `Promote excerpt: ${sourceLabel} to Prime Packet`
                          }
                          className="h-8 rounded-full border-primary/20 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/84 hover:bg-black/30 disabled:cursor-default disabled:opacity-100 disabled:text-foreground/60"
                        >
                          {isPromoted ? "In Prime Packet" : "Promote to Prime Packet"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {textNoteObjects.length > 0 ? (
            <div className="pointer-events-auto rounded-[var(--ds-r-085)] border border-primary/18 bg-black/65 px-3 py-3 font-mono text-sm text-foreground/78 shadow-[var(--ds-shadow-elev)] backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
                Workspace Notes
              </div>
              <div className="mt-2 space-y-2">
                {textNoteObjects.map((workspaceObject) => {
                  const isPromoted = promotedPrimeObjectIds.includes(
                    workspaceObject.id,
                  );
                  const isEditing = editingCardId === workspaceObject.id;
                  const isHidden = Boolean(workspaceObject.workspace?.hidden);
                  const isTutorContext = Boolean(
                    workspaceObject.workspace?.tutorContext || isPromoted,
                  );
                  const isObsidianHandoff = Boolean(
                    workspaceObject.workspace?.obsidianHandoff,
                  );

                  return (
                    <div
                      key={workspaceObject.id}
                      className="rounded-[var(--ds-r-075)] border border-primary/12 bg-black/30 p-2.5"
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.14em] text-primary/72">
                            Workspace card title
                            <input
                              aria-label="Workspace card title"
                              value={editingTitle}
                              onChange={(event) => setEditingTitle(event.target.value)}
                              className="rounded-[var(--ds-r-065)] border border-primary/18 bg-black/40 px-2 py-1.5 text-xs normal-case tracking-normal text-foreground outline-none focus:border-primary/50"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.14em] text-primary/72">
                            Workspace card detail
                            <textarea
                              aria-label="Workspace card detail"
                              value={editingDetail}
                              onChange={(event) => setEditingDetail(event.target.value)}
                              rows={4}
                              className="rounded-[var(--ds-r-065)] border border-primary/18 bg-black/40 px-2 py-1.5 text-xs normal-case leading-5 tracking-normal text-foreground outline-none focus:border-primary/50"
                            />
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={saveCardEdit}
                              className={WORKSPACE_CARD_BUTTON_CLASS}
                            >
                              Save Workspace Card
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={cancelCardEdit}
                              className={WORKSPACE_CARD_BUTTON_CLASS}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-sm text-foreground">
                              {workspaceObject.title}
                            </div>
                            {isHidden ? (
                              <Badge
                                variant="outline"
                                className="shrink-0 rounded-full border-primary/18 px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] text-foreground/58"
                              >
                                Hidden
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs leading-5 text-foreground/62">
                            {workspaceObject.detail}
                          </div>
                        </>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            patchWorkspaceState(workspaceObject, {
                              tutorContext: !isTutorContext,
                            })
                          }
                          aria-label={
                            isTutorContext
                              ? `Remove ${workspaceObject.title} from Tutor context`
                              : `Include ${workspaceObject.title} in Tutor context`
                          }
                          className={WORKSPACE_CARD_BUTTON_CLASS}
                        >
                          {isTutorContext ? "Tutor On" : "Tutor"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            patchWorkspaceState(workspaceObject, {
                              obsidianHandoff: !isObsidianHandoff,
                            })
                          }
                          aria-label={
                            isObsidianHandoff
                              ? `Remove ${workspaceObject.title} from Obsidian handoff`
                              : `Include ${workspaceObject.title} in Obsidian handoff`
                          }
                          className={WORKSPACE_CARD_BUTTON_CLASS}
                        >
                          {isObsidianHandoff ? "Obsidian On" : "Obsidian"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => beginCardEdit(workspaceObject)}
                          aria-label={`Edit Workspace card: ${workspaceObject.title}`}
                          className={WORKSPACE_CARD_BUTTON_CLASS}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            patchWorkspaceState(workspaceObject, {
                              hidden: !isHidden,
                            })
                          }
                          aria-label={
                            isHidden
                              ? `Show Workspace card: ${workspaceObject.title}`
                              : `Hide Workspace card: ${workspaceObject.title}`
                          }
                          className={WORKSPACE_CARD_BUTTON_CLASS}
                        >
                          {isHidden ? "Show" : "Hide"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isPromoted}
                          onClick={() => onPromoteTextNoteToPrime?.(workspaceObject)}
                          aria-label={
                            isPromoted
                              ? `Note: ${workspaceObject.title} already in Prime Packet`
                              : `Promote note: ${workspaceObject.title} to Prime Packet`
                          }
                          className="h-8 rounded-full border-primary/20 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/84 hover:bg-black/30 disabled:cursor-default disabled:opacity-100 disabled:text-foreground/60"
                        >
                          {isPromoted ? "In Prime Packet" : "Promote to Prime Packet"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onDeleteWorkspaceObject?.(workspaceObject.id)}
                          aria-label={`Delete Workspace card: ${workspaceObject.title}`}
                          className={WORKSPACE_CARD_BUTTON_CLASS}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {imageObjects.length > 0 ? (
            <div className="pointer-events-auto rounded-[var(--ds-r-085)] border border-primary/18 bg-black/65 px-3 py-3 font-mono text-sm text-foreground/78 shadow-[var(--ds-shadow-elev)] backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
                Workspace Images
              </div>
              <div className="mt-2 space-y-2">
                {imageObjects.map((workspaceObject) => (
                  <div
                    key={workspaceObject.id}
                    className="rounded-[var(--ds-r-075)] border border-primary/12 bg-black/30 p-2.5"
                  >
                    <div className="text-sm text-foreground">{workspaceObject.title}</div>
                    <div className="mt-1 text-xs leading-5 text-foreground/62">
                      {workspaceObject.detail}
                    </div>
                    <img
                      src={workspaceObject.asset.url}
                      alt={workspaceObject.title}
                      className="mt-3 max-h-32 w-full rounded-[var(--ds-r-075)] border border-primary/12 object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="h-full min-h-0 w-full">
          <Tldraw
            autoFocus={false}
            hideUi
            onMount={(mountedEditor) => {
              setEditor(mountedEditor);
              // Match the cockpit theme — tldraw defaults to light, which
              // rendered a glaring white canvas against the dark UI.
              // Optional-chained so it safely no-ops if the editor lacks the
              // preferences API (e.g. test mocks).
              mountedEditor.user?.updateUserPreferences?.({
                colorScheme: "dark",
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
