import { createPopoutChannelName } from "@/lib/popoutSync";

export const STUDIO_MATERIAL_VIEWER_POPOUT_COURSE_KEY = "studio-material";
export const STUDIO_MATERIAL_VIEWER_POPOUT_SCOPE = "active";

export const STUDIO_MATERIAL_VIEWER_POPOUT_CHANNEL = createPopoutChannelName(
  STUDIO_MATERIAL_VIEWER_POPOUT_COURSE_KEY,
  "viewer",
  STUDIO_MATERIAL_VIEWER_POPOUT_SCOPE,
);

export interface MaterialViewerPopoutSnapshot {
  title: string;
  url: string | null;
  fileType: string | null;
  textContent: string | null;
}

function escapeScriptJson<T>(value: T): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function renderContent(snapshot: { fileType: string | null; url: string | null; textContent: string | null }): string {
  if (snapshot.fileType === "pdf" && snapshot.url) {
    return `<iframe id="pdf-frame" src="${snapshot.url}" style="width:100%;height:100%;border:none;"></iframe>`;
  }
  if (snapshot.textContent != null) {
    return `<pre id="text-content">${snapshot.textContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
  }
  return '<div id="unsupported" class="empty-msg">Unsupported file type</div>';
}

export function buildMaterialViewerPopoutHtml(args: {
  channelName: string;
  initialSnapshot: MaterialViewerPopoutSnapshot;
  liveSyncAvailable: boolean;
}): string {
  const serializedInitial = escapeScriptJson(args.initialSnapshot);
  const serializedChannel = escapeScriptJson(args.channelName);
  const liveSyncAvailable = args.liveSyncAvailable ? "true" : "false";
  const pageTitle = args.initialSnapshot.title || "Material Viewer";
  const fileTypeBadge = args.initialSnapshot.fileType
    ? `<span class="badge">${args.initialSnapshot.fileType.toUpperCase()}</span>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${pageTitle}</title>
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
        height: 100vh;
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
      .title-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .title {
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .badge {
        font-size: 9px;
        letter-spacing: 0.12em;
        padding: 2px 6px;
        border: 1px solid var(--accent);
        color: var(--accent);
        border-radius: 2px;
        flex-shrink: 0;
      }
      .body {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .body iframe {
        flex: 1;
        background: #111;
      }
      .body pre {
        flex: 1;
        margin: 0;
        padding: 16px;
        border: none;
        background: rgba(4, 8, 16, 0.92);
        color: var(--text);
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
        overflow: auto;
      }
      .empty-msg {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--muted);
        font-size: 14px;
      }
      .status-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 16px;
        border-top: 1px solid var(--border);
        background: var(--surface);
        font-size: 11px;
        color: var(--muted);
      }
      .status-bar.warning { color: var(--warning); }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="header">
        <div class="meta">
          <div class="eyebrow">MATERIAL VIEWER</div>
          <div class="title-row">
            <div class="title" id="title">${pageTitle}</div>
            <span class="badge" id="badge" ${fileTypeBadge ? "" : 'style="display:none"'}>${args.initialSnapshot.fileType?.toUpperCase() ?? ""}</span>
          </div>
        </div>
      </div>
      <div class="body" id="content-area">
        ${renderContent(args.initialSnapshot)}
      </div>
      <div class="status-bar" id="status-bar">
        <span id="status">Initializing…</span>
      </div>
    </div>
    <script>
      var channelName = ${serializedChannel};
      var liveSyncAvailable = ${liveSyncAvailable};
      var snapshot = ${serializedInitial};
      var clientId = "material-popout-" + Math.random().toString(36).slice(2, 10);
      var titleEl = document.getElementById("title");
      var badgeEl = document.getElementById("badge");
      var statusEl = document.getElementById("status");
      var statusBar = document.getElementById("status-bar");
      var contentArea = document.getElementById("content-area");

      function setStatus(text, warning) {
        if (!statusEl) return;
        statusEl.textContent = text || "";
        if (statusBar) statusBar.className = warning ? "status-bar warning" : "status-bar";
      }

      function escHtml(s) {
        var d = document.createElement("div");
        d.textContent = s;
        return d.innerHTML;
      }

      function applySnapshot(snap) {
        document.title = snap.title || "Material Viewer";
        if (titleEl) titleEl.textContent = snap.title || "Material Viewer";
        if (badgeEl) {
          if (snap.fileType) {
            badgeEl.textContent = snap.fileType.toUpperCase();
            badgeEl.style.display = "";
          } else {
            badgeEl.style.display = "none";
          }
        }
        if (!contentArea) return;
        if (snap.fileType === "pdf" && snap.url) {
          contentArea.innerHTML = '<iframe src="' + escHtml(snap.url) + '" style="width:100%;height:100%;border:none;"></iframe>';
        } else if (snap.textContent != null) {
          contentArea.innerHTML = "<pre>" + escHtml(snap.textContent) + "</pre>";
        } else {
          contentArea.innerHTML = '<div class="empty-msg">Unsupported file type</div>';
        }
      }

      if (!liveSyncAvailable) {
        setStatus("Live sync unavailable. Showing a static snapshot.", true);
      } else {
        var channel = new BroadcastChannel(channelName);

        channel.postMessage({
          type: "handshake.hello",
          clientId: clientId,
          mode: "viewer",
          requiresEditHandshake: false,
        });
        channel.postMessage({ type: "handshake.ready", clientId: clientId, revision: 0 });
        setStatus("Read-only viewer linked to the main workspace.", false);

        channel.addEventListener("message", function (event) {
          var message = event.data;
          if (!message || typeof message !== "object") return;
          if (message.type === "state.snapshot") {
            applySnapshot(message.payload || snapshot);
            setStatus("Read-only viewer synced.", false);
          }
        });

        window.addEventListener("beforeunload", function () {
          channel.postMessage({ type: "window.closed", clientId: clientId });
          channel.close();
        });
      }
    </script>
  </body>
</html>`;
}
