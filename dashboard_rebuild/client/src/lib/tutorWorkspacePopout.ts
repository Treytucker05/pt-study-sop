import {
  createPopoutChannelName,
  type PopoutSyncMode,
  type PopoutSyncMessage,
} from "@/lib/popoutSync";

export const TUTOR_WORKSPACE_POPOUT_SCOPE = "current-note";
export const TUTOR_WORKSPACE_POPOUT_COURSE_KEY = "tutor-workspace";

export const TUTOR_WORKSPACE_VIEWER_POPOUT_CHANNEL = createPopoutChannelName(
  TUTOR_WORKSPACE_POPOUT_COURSE_KEY,
  "viewer",
  TUTOR_WORKSPACE_POPOUT_SCOPE,
);

export const TUTOR_WORKSPACE_NOTE_POPOUT_CHANNEL = createPopoutChannelName(
  TUTOR_WORKSPACE_POPOUT_COURSE_KEY,
  "note",
  TUTOR_WORKSPACE_POPOUT_SCOPE,
);

export interface TutorWorkspacePopoutSnapshot {
  title: string;
  currentFile: string | null;
  content: string;
  previewMode: boolean;
}

function escapeScriptJson<T>(value: T): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildTutorWorkspacePopoutHtml(args: {
  channelName: string;
  mode: PopoutSyncMode;
  initialSnapshot: TutorWorkspacePopoutSnapshot;
  liveSyncAvailable: boolean;
}): string {
  const modeLabel = args.mode === "note" ? "NOTE POPOUT" : "VIEWER POPOUT";
  const serializedInitial = escapeScriptJson(args.initialSnapshot);
  const serializedChannel = escapeScriptJson(args.channelName);
  const serializedMode = escapeScriptJson(args.mode);
  const liveSyncAvailable = args.liveSyncAvailable ? "true" : "false";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${modeLabel}</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #05070d;
        --surface: rgba(16, 22, 33, 0.95);
        --border: rgba(94, 234, 212, 0.2);
        --text: #e5edf8;
        --muted: #8da2c0;
        --accent: #5eead4;
        --warning: #facc15;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: radial-gradient(circle at top, rgba(94, 234, 212, 0.08), transparent 35%), var(--bg);
        color: var(--text);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        min-height: 100vh;
      }
      .shell {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .header {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border);
        background: var(--surface);
      }
      .meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .eyebrow {
        color: var(--accent);
        letter-spacing: 0.18em;
        font-size: 10px;
      }
      .title {
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .status {
        color: var(--muted);
        font-size: 11px;
      }
      .status.warning {
        color: var(--warning);
      }
      .body {
        flex: 1;
        padding: 16px;
      }
      textarea, pre {
        width: 100%;
        min-height: calc(100vh - 110px);
        margin: 0;
        border: 1px solid var(--border);
        background: rgba(4, 8, 16, 0.92);
        color: var(--text);
        padding: 16px;
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      textarea[readonly] {
        opacity: 0.92;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="header">
        <div class="meta">
          <div class="eyebrow">${modeLabel}</div>
          <div class="title" id="title">Loading…</div>
          <div class="status" id="status"></div>
        </div>
      </div>
      <div class="body">
        ${
          args.mode === "note"
            ? '<textarea id="editor" spellcheck="false"></textarea>'
            : '<pre id="viewer"></pre>'
        }
      </div>
    </div>
    <script>
      const channelName = ${serializedChannel};
      const mode = ${serializedMode};
      const liveSyncAvailable = ${liveSyncAvailable};
      const initialSnapshot = ${serializedInitial};
      const clientId = "workspace-popout-" + Math.random().toString(36).slice(2, 10);
      const titleEl = document.getElementById("title");
      const statusEl = document.getElementById("status");
      const editorEl = document.getElementById("editor");
      const viewerEl = document.getElementById("viewer");
      let revision = 0;
      let token = null;

      function setStatus(text, warning) {
        if (!statusEl) return;
        statusEl.textContent = text || "";
        statusEl.className = warning ? "status warning" : "status";
      }

      function applySnapshot(snapshot, readOnly) {
        const title = snapshot.currentFile || snapshot.title || "Tutor Workspace";
        if (titleEl) {
          titleEl.textContent = title;
        }
        if (viewerEl) {
          viewerEl.textContent = snapshot.content || "";
        }
        if (editorEl) {
          if (document.activeElement !== editorEl || editorEl.readOnly) {
            editorEl.value = snapshot.content || "";
          }
          editorEl.readOnly = readOnly || !token;
        }
      }

      applySnapshot(initialSnapshot, mode === "viewer" || !liveSyncAvailable);

      if (!liveSyncAvailable) {
        setStatus(
          mode === "note"
            ? "Live sync unavailable. This popout is read-only."
            : "Live sync unavailable. Showing a static snapshot.",
          true,
        );
      } else {
        const channel = new BroadcastChannel(channelName);

        channel.postMessage({
          type: "handshake.hello",
          clientId,
          mode,
          requiresEditHandshake: mode === "note",
        });
        channel.postMessage({ type: "handshake.ready", clientId, revision });
        if (mode === "note") {
          channel.postMessage({
            type: "note.edit.request",
            clientId,
            requestId: "edit-request-" + Math.random().toString(36).slice(2, 10),
          });
          setStatus("Waiting for edit grant from the main workspace…", false);
        } else {
          setStatus("Read-only viewer linked to the main workspace.", false);
        }

        channel.addEventListener("message", (event) => {
          const message = event.data;
          if (!message || typeof message !== "object") return;

          if (message.type === "state.snapshot") {
            revision = Number(message.revision || 0);
            applySnapshot(message.payload || initialSnapshot, Boolean(message.readOnly));
            if (mode === "viewer") {
              setStatus("Read-only viewer synced.", false);
            }
            return;
          }

          if (mode !== "note") return;

          if (message.type === "note.edit.granted" && message.clientId === clientId) {
            token = message.token;
            if (editorEl) {
              editorEl.readOnly = false;
            }
            setStatus("Live note editing enabled.", false);
            return;
          }

          if (message.type === "note.edit.denied" && message.clientId === clientId) {
            if (editorEl) {
              editorEl.readOnly = true;
            }
            setStatus(message.reason || "Edit request denied.", true);
            return;
          }

          if (message.type === "note.edit.ack" && message.clientId === clientId) {
            setStatus("Changes synced to the main workspace.", false);
          }
        });

        if (editorEl) {
          editorEl.addEventListener("input", () => {
            if (!token) return;
            revision += 1;
            channel.postMessage({
              type: "note.edit.patch",
              clientId,
              token,
              revision,
              content: editorEl.value,
            });
          });
        }

        window.addEventListener("beforeunload", () => {
          channel.postMessage({ type: "window.closed", clientId });
          channel.close();
        });
      }
    </script>
  </body>
</html>`;
}
