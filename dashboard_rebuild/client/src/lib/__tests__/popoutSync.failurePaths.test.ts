import { describe, expect, it } from "vitest";

import {
  createBroadcastChannelTransport,
  createEditRequest,
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

describe("popoutSync failure paths", () => {
  it("denies edit when no handshake grant was issued", () => {
    const manager = createPopoutEditHandshakeManager();

    expect(manager.isAuthorized("unknown-client", "any-token")).toBe(false);
  });

  it("denies edit after the grant is revoked", () => {
    const manager = createPopoutEditHandshakeManager();
    const request = createEditRequest("client-revoke");
    if (request.type !== "note.edit.request") throw new Error("Expected edit request");

    const grant = manager.grant(request.clientId, request.requestId);
    if (grant.type !== "note.edit.granted") throw new Error("Expected grant");

    expect(manager.isAuthorized("client-revoke", grant.token)).toBe(true);

    manager.revoke("client-revoke");

    expect(manager.isAuthorized("client-revoke", grant.token)).toBe(false);
  });

  it("does not receive messages after the listener side closes", () => {
    const host = createBroadcastChannelTransport(
      "tutor:close-test",
      FakeBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    const child = createBroadcastChannelTransport(
      "tutor:close-test",
      FakeBroadcastChannel as unknown as typeof BroadcastChannel,
    );

    const received: unknown[] = [];
    child.subscribe((message) => {
      received.push(message);
    });

    // Close the child (listener) side — it should no longer receive
    child.close();

    host.postMessage(createStateSnapshot({ file: "orphan.md" }, 1, false));

    expect(received).toEqual([]);

    host.close();
  });

  it("viewer popout hello does not request edit handshake", () => {
    const hello = createViewerHello("viewer-client");

    expect(hello.requiresEditHandshake).toBe(false);
    expect(hello.mode).toBe("viewer");
  });

  it("handles multiple revokes for the same client without throwing", () => {
    const manager = createPopoutEditHandshakeManager();
    const request = createEditRequest("client-multi");
    if (request.type !== "note.edit.request") throw new Error("Expected edit request");

    manager.grant(request.clientId, request.requestId);

    manager.revoke("client-multi");
    expect(() => manager.revoke("client-multi")).not.toThrow();
    expect(() => manager.revoke("nonexistent-client")).not.toThrow();
  });
});
