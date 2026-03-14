import { describe, expect, it } from "vitest";

import {
  createBroadcastChannelTransport,
  createEditRequest,
  createNoteHello,
  createPopoutChannelName,
  createPopoutEditHandshakeManager,
  createStateSnapshot,
  createViewerHello,
} from "@/lib/popoutSync";

class FakeBroadcastChannel {
  static registry = new Map<string, Set<FakeBroadcastChannel>>();

  private listeners = new Set<(event: MessageEvent) => void>();

  constructor(private readonly name: string) {
    const bucket = FakeBroadcastChannel.registry.get(name) || new Set();
    bucket.add(this);
    FakeBroadcastChannel.registry.set(name, bucket);
  }

  postMessage(data: unknown) {
    const bucket = FakeBroadcastChannel.registry.get(this.name) || new Set();
    for (const peer of bucket) {
      if (peer === this) continue;
      for (const listener of peer.listeners) {
        listener({ data } as MessageEvent);
      }
    }
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.add(listener);
  }

  removeEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.delete(listener);
  }

  close() {
    const bucket = FakeBroadcastChannel.registry.get(this.name);
    bucket?.delete(this);
  }
}

describe("popoutSync", () => {
  it("creates a safe no-op transport when BroadcastChannel is unavailable", () => {
    const transport = createBroadcastChannelTransport(
      "tutor:test",
      null as unknown as typeof BroadcastChannel,
    );

    expect(transport.available).toBe(false);
    expect(() => transport.postMessage(createViewerHello("client-1"))).not.toThrow();
    expect(() => transport.close()).not.toThrow();
  });

  it("relays BroadcastChannel messages when supported", () => {
    const host = createBroadcastChannelTransport(
      "tutor:test",
      FakeBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    const child = createBroadcastChannelTransport(
      "tutor:test",
      FakeBroadcastChannel as unknown as typeof BroadcastChannel,
    );

    const received: unknown[] = [];
    const unsubscribe = child.subscribe((message) => {
      received.push(message);
    });

    host.postMessage(createStateSnapshot({ file: "note.md" }, 3, true));

    expect(received).toEqual([
      {
        type: "state.snapshot",
        payload: { file: "note.md" },
        revision: 3,
        readOnly: true,
      },
    ]);

    unsubscribe();
    host.close();
    child.close();
  });

  it("requires a granted token before note edits are considered authorized", () => {
    const manager = createPopoutEditHandshakeManager();
    const request = createEditRequest("child-7");
    if (request.type !== "note.edit.request") {
      throw new Error("Expected edit request");
    }

    const grant = manager.grant(request.clientId, request.requestId);
    expect(grant.type).toBe("note.edit.granted");
    if (grant.type !== "note.edit.granted") {
      throw new Error("Expected grant");
    }

    expect(manager.isAuthorized("child-7", grant.token)).toBe(true);
    expect(manager.isAuthorized("child-7", "wrong-token")).toBe(false);

    manager.revoke("child-7");
    expect(manager.isAuthorized("child-7", grant.token)).toBe(false);
  });

  it("builds stable names and hello payloads for viewer versus note popouts", () => {
    expect(createPopoutChannelName("bio-101", "viewer", "material-12")).toBe(
      "tutor:popout:bio-101:viewer:material-12",
    );
    expect(createViewerHello("client-a")).toEqual({
      type: "handshake.hello",
      clientId: "client-a",
      mode: "viewer",
      requiresEditHandshake: false,
    });
    expect(createNoteHello("client-b")).toEqual({
      type: "handshake.hello",
      clientId: "client-b",
      mode: "note",
      requiresEditHandshake: true,
    });
  });
});
