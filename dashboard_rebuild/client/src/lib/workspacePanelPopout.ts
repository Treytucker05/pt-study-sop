/**
 * Workspace panel pop-out utilities.
 *
 * Uses BroadcastChannel to keep the main canvas and popped-out windows in sync.
 * The popped-out window gets a minimal HTML shell with the panel content rendered
 * via window.open + document.write. State sync is bidirectional via BroadcastChannel.
 */

// ── Channel naming ──────────────────────────────────────────────────────────

export function panelChannelName(panelId: string): string {
  return `workspace:panel:${panelId}`;
}

// ── Message types ───────────────────────────────────────────────────────────

export type PanelPopoutMessage =
  | { type: "panel.send-back"; panelId: string }
  | { type: "panel.child-ready"; panelId: string }
  | { type: "panel.child-closed"; panelId: string };

// ── Transport ───────────────────────────────────────────────────────────────

export interface PanelPopoutTransport {
  available: boolean;
  postMessage: (msg: PanelPopoutMessage) => void;
  subscribe: (listener: (msg: PanelPopoutMessage) => void) => () => void;
  close: () => void;
}

export function createPanelPopoutTransport(
  channelName: string,
): PanelPopoutTransport {
  if (typeof BroadcastChannel === "undefined") {
    return {
      available: false,
      postMessage: () => {},
      subscribe: () => () => {},
      close: () => {},
    };
  }

  const channel = new BroadcastChannel(channelName);
  return {
    available: true,
    postMessage: (msg) => channel.postMessage(msg),
    subscribe: (listener) => {
      const handler = (e: MessageEvent<PanelPopoutMessage>) => listener(e.data);
      channel.addEventListener("message", handler);
      return () => channel.removeEventListener("message", handler);
    },
    close: () => channel.close(),
  };
}

// ── Pop-out window opener ───────────────────────────────────────────────────

export interface PopoutWindowHandle {
  window: Window;
  transport: PanelPopoutTransport;
  close: () => void;
}

/**
 * Opens a minimal pop-out window for a workspace panel.
 * The window contains a "Send Back" button and a content container.
 * The caller is responsible for rendering content into `container` (via React portal).
 */
export function openPanelPopoutWindow(
  panelId: string,
  title: string,
  width = 600,
  height = 500,
): PopoutWindowHandle | null {
  const left = window.screenX + 50;
  const top = window.screenY + 50;
  const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;

  const popoutWindow = window.open("", `panel-${panelId}`, features);
  if (!popoutWindow) return null;

  const transport = createPanelPopoutTransport(panelChannelName(panelId));

  // Build minimal HTML shell
  popoutWindow.document.open();
  popoutWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title} - Pop Out</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
      background: #0a0a0f;
      color: #e0e0e0;
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .popout-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(15, 15, 25, 0.95);
      border-bottom: 1px solid rgba(120, 200, 255, 0.15);
      flex-shrink: 0;
    }
    .popout-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(120, 200, 255, 0.8);
    }
    .popout-sync-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: rgba(80, 200, 120, 0.7);
    }
    .popout-sync-badge .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(80, 200, 120, 0.7);
      animation: pulse-dot 2s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    .send-back-btn {
      padding: 4px 12px;
      font-size: 11px;
      font-family: inherit;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: rgba(120, 200, 255, 0.1);
      border: 1px solid rgba(120, 200, 255, 0.3);
      color: rgba(120, 200, 255, 0.8);
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .send-back-btn:hover {
      background: rgba(120, 200, 255, 0.2);
      color: rgba(120, 200, 255, 1);
    }
    #popout-content {
      flex: 1;
      overflow: auto;
      position: relative;
    }
  </style>
</head>
<body>
  <div class="popout-header">
    <span class="popout-title">${title}</span>
    <div style="display:flex;align-items:center;gap:12px;">
      <span class="popout-sync-badge"><span class="dot"></span>Synced</span>
      <button class="send-back-btn" id="send-back-btn">Send Back</button>
    </div>
  </div>
  <div id="popout-content"></div>
</body>
</html>`);
  popoutWindow.document.close();

  // Copy stylesheets from parent for Tailwind/theme classes
  const parentStyles = document.querySelectorAll('style, link[rel="stylesheet"]');
  parentStyles.forEach((node) => {
    const clone = node.cloneNode(true);
    popoutWindow.document.head.appendChild(clone);
  });

  // Wire up "Send Back" button
  const sendBackBtn = popoutWindow.document.getElementById("send-back-btn");
  if (sendBackBtn) {
    sendBackBtn.addEventListener("click", () => {
      transport.postMessage({ type: "panel.send-back", panelId });
      popoutWindow.close();
    });
  }

  // Notify parent when child window closes
  const checkClosed = setInterval(() => {
    if (popoutWindow.closed) {
      clearInterval(checkClosed);
      transport.postMessage({ type: "panel.child-closed", panelId });
      transport.close();
    }
  }, 500);

  const handle: PopoutWindowHandle = {
    window: popoutWindow,
    transport,
    close: () => {
      clearInterval(checkClosed);
      transport.close();
      if (!popoutWindow.closed) popoutWindow.close();
    },
  };

  return handle;
}
