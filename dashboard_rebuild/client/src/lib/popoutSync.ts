export type PopoutSyncMode = "viewer" | "note";

export type PopoutSyncMessage<T = unknown> =
  | {
      type: "handshake.hello";
      clientId: string;
      mode: PopoutSyncMode;
      requiresEditHandshake: boolean;
    }
  | {
      type: "handshake.ready";
      clientId: string;
      revision: number;
    }
  | {
      type: "state.snapshot";
      revision: number;
      payload: T;
      readOnly: boolean;
    }
  | {
      type: "note.edit.request";
      clientId: string;
      requestId: string;
    }
  | {
      type: "note.edit.granted";
      clientId: string;
      requestId: string;
      token: string;
    }
  | {
      type: "note.edit.denied";
      clientId: string;
      requestId: string;
      reason: string;
    }
  | {
      type: "note.edit.patch";
      clientId: string;
      token: string;
      revision: number;
      content: string;
    }
  | {
      type: "note.edit.ack";
      clientId: string;
      revision: number;
    }
  | {
      type: "window.closed";
      clientId: string;
    };

type BroadcastChannelFactory = new (name: string) => BroadcastChannel;

export interface BroadcastChannelTransport {
  available: boolean;
  postMessage: (message: PopoutSyncMessage) => void;
  subscribe: (listener: (message: PopoutSyncMessage) => void) => () => void;
  close: () => void;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createPopoutId(prefix = "popout"): string {
  return `${prefix}-${randomId()}`;
}

export function createPopoutChannelName(
  courseKey: string,
  mode: PopoutSyncMode,
  scopeKey: string,
): string {
  return ["tutor", "popout", courseKey, mode, scopeKey]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(":");
}

export function createBroadcastChannelTransport(
  channelName: string,
  BroadcastCtor: BroadcastChannelFactory | undefined = globalThis.BroadcastChannel,
): BroadcastChannelTransport {
  if (!BroadcastCtor) {
    return {
      available: false,
      postMessage: () => {},
      subscribe: () => () => {},
      close: () => {},
    };
  }

  const channel = new BroadcastCtor(channelName);
  return {
    available: true,
    postMessage: (message) => {
      channel.postMessage(message);
    },
    subscribe: (listener) => {
      const handleMessage = (event: MessageEvent<PopoutSyncMessage>) => {
        listener(event.data);
      };
      channel.addEventListener("message", handleMessage);
      return () => {
        channel.removeEventListener("message", handleMessage);
      };
    },
    close: () => {
      channel.close();
    },
  };
}

export function createViewerHello(clientId: string): PopoutSyncMessage {
  return {
    type: "handshake.hello",
    clientId,
    mode: "viewer",
    requiresEditHandshake: false,
  };
}

export function createNoteHello(clientId: string): PopoutSyncMessage {
  return {
    type: "handshake.hello",
    clientId,
    mode: "note",
    requiresEditHandshake: true,
  };
}

export function createStateSnapshot<T>(
  payload: T,
  revision: number,
  readOnly: boolean,
): PopoutSyncMessage<T> {
  return {
    type: "state.snapshot",
    payload,
    revision,
    readOnly,
  };
}

export function createEditRequest(clientId: string): PopoutSyncMessage {
  return {
    type: "note.edit.request",
    clientId,
    requestId: createPopoutId("edit-request"),
  };
}

export function createNotePatch(
  clientId: string,
  token: string,
  content: string,
  revision: number,
): PopoutSyncMessage {
  return {
    type: "note.edit.patch",
    clientId,
    token,
    content,
    revision,
  };
}

export interface PopoutEditHandshakeManager {
  grant: (clientId: string, requestId: string) => PopoutSyncMessage;
  deny: (clientId: string, requestId: string, reason: string) => PopoutSyncMessage;
  revoke: (clientId: string) => void;
  isAuthorized: (clientId: string, token: string) => boolean;
}

export function createPopoutEditHandshakeManager(): PopoutEditHandshakeManager {
  const grants = new Map<string, string>();

  return {
    grant: (clientId, requestId) => {
      const token = createPopoutId("edit-token");
      grants.set(clientId, token);
      return {
        type: "note.edit.granted",
        clientId,
        requestId,
        token,
      };
    },
    deny: (clientId, requestId, reason) => ({
      type: "note.edit.denied",
      clientId,
      requestId,
      reason,
    }),
    revoke: (clientId) => {
      grants.delete(clientId);
    },
    isAuthorized: (clientId, token) => grants.get(clientId) === token,
  };
}
