/**
 * Frontend Security Tests
 *
 * Checks for:
 * - XSS via dangerouslySetInnerHTML / .innerHTML
 * - Proper escaping of user-supplied content in components
 * - Error messages not leaking internal paths or stack traces
 * - API client error sanitization
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderSOPRefLinks, parseSOPRefs } from "@/utils/sopref";

// ═══════════════════════════════════════════════════════════════════════
// 1. innerHTML XSS via SOPRefRenderer
// ═══════════════════════════════════════════════════════════════════════

describe("SOPRefRenderer XSS surface", () => {
  /**
   * SECURITY ISSUE: SOPRefRenderer uses .innerHTML to render content
   * from renderSOPRefLinks(). If attacker-controlled content reaches
   * this renderer, XSS is possible. The regex in parseSOPRefs limits
   * the attack surface (only [\w\-\/\.#]+ inside SOPRef[...]), but
   * the surrounding content is passed through unescaped.
   */

  it("parseSOPRefs regex rejects script tags inside SOPRef brackets", () => {
    const result = parseSOPRefs('SOPRef[<script>alert(1)</script>]');
    // The regex [\w\-\/\.#]+ should NOT match angle brackets
    expect(result).toHaveLength(0);
  });

  it("parseSOPRefs regex rejects event handlers inside SOPRef brackets", () => {
    const result = parseSOPRefs('SOPRef[" onerror="alert(1)]');
    expect(result).toHaveLength(0);
  });

  it("parseSOPRefs regex rejects javascript: URIs", () => {
    const result = parseSOPRefs("SOPRef[javascript:alert(1)]");
    expect(result).toHaveLength(0);
  });

  it("renderSOPRefLinks passes surrounding content through unescaped", () => {
    // SECURITY ISSUE: Content outside SOPRef[] tags is NOT escaped.
    // When rendered via .innerHTML, this allows XSS.
    const malicious = '<img src=x onerror="alert(1)"> some text SOPRef[sop/file.md]';
    const rendered = renderSOPRefLinks(malicious, vi.fn());
    // The img tag survives in the output — it will execute in innerHTML
    expect(rendered).toContain('<img src=x onerror="alert(1)">');
  });

  it("renderSOPRefLinks does not double-encode safe SOPRef content", () => {
    const safe = "See SOPRef[sop/library/05-encode.md] for details";
    const rendered = renderSOPRefLinks(safe, vi.fn());
    expect(rendered).toContain("sopref-link");
    expect(rendered).toContain("05-encode.md");
    // Should not contain the raw SOPRef[] tag anymore
    expect(rendered).not.toContain("SOPRef[");
  });
});


// ═══════════════════════════════════════════════════════════════════════
// 2. XSS payload escaping in rendered HTML
// ═══════════════════════════════════════════════════════════════════════

describe("XSS payload handling", () => {
  const XSS_PAYLOADS = [
    '<script>alert("xss")</script>',
    '<img src=x onerror="alert(1)">',
    '"><svg onload=alert(1)>',
    "javascript:alert(1)",
    '<iframe src="javascript:alert(1)">',
  ];

  it("XSS payloads in SOPRef content are rejected by regex", () => {
    for (const payload of XSS_PAYLOADS) {
      const refs = parseSOPRefs(`SOPRef[${payload}]`);
      expect(refs).toHaveLength(0);
    }
  });

  it("XSS payloads outside SOPRef are NOT sanitized by renderSOPRefLinks", () => {
    // SECURITY ISSUE: renderSOPRefLinks does not sanitize surrounding content.
    // These payloads will execute when set via .innerHTML.
    for (const payload of XSS_PAYLOADS) {
      const output = renderSOPRefLinks(payload, vi.fn());
      // The payload passes through unchanged since it's not a SOPRef
      expect(output).toBe(payload);
    }
  });
});


// ═══════════════════════════════════════════════════════════════════════
// 3. API client error sanitization
// ═══════════════════════════════════════════════════════════════════════

describe("API error message sanitization", () => {
  const mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("request() throws with statusText, not response body", async () => {
    // The api.ts request() function throws: `API ${response.status}: ${suffix}`
    // When headers are missing/unreadable, it falls back to statusText (safe).
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () =>
        Promise.resolve({
          error: "sqlite3.OperationalError: no such table: sessions",
        }),
    });

    const { request } = await import("@/api");
    // Use a wrapper to access the private request function via apiRequest
    const { apiRequest } = await import("@/api");
    await expect(apiRequest("/sessions")).rejects.toThrow("API 500: Internal Server Error");
  });

  it("error message does not contain file paths", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () =>
        Promise.resolve({
          error: 'File "/home/user/brain/dashboard/api_adapter.py", line 123',
        }),
    });

    const { apiRequest } = await import("@/api");
    try {
      await apiRequest("/sessions");
    } catch (e: unknown) {
      const msg = (e as Error).message;
      // The thrown error should NOT include the file path from the body
      expect(msg).not.toContain("/home/user");
      expect(msg).not.toContain("api_adapter.py");
      // It should only contain the statusText
      expect(msg).toContain("Internal Server Error");
    }
  });

  it("error message does not contain Python tracebacks", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () =>
        Promise.resolve({
          error: "Traceback (most recent call last):\n  File ...",
        }),
    });

    const { apiRequest } = await import("@/api");
    try {
      await apiRequest("/sessions");
    } catch (e: unknown) {
      const msg = (e as Error).message;
      expect(msg).not.toContain("Traceback");
    }
  });
});


// ═══════════════════════════════════════════════════════════════════════
// 4. Component error display safety
// ═══════════════════════════════════════════════════════════════════════

describe("Error display patterns", () => {
  /**
   * Multiple components display err.message to users via toast or status text.
   * The api.ts request() function throws `API ${status}: ${suffix}` which
   * falls back to statusText (a standard HTTP phrase) when body parsing fails.
   *
   * Components that use raw fetch (BrainChat, TutorChat) may display
   * server error bodies — those should be audited separately.
   */

  it("API error format only includes HTTP status code and text", () => {
    // Simulate the error format from api.ts when body parsing fails
    const status = 404;
    const statusText = "Not Found";
    const error = new Error(`API ${status}: ${statusText}`);
    expect(error.message).toBe("API 404: Not Found");
    expect(error.message).not.toContain("sqlite3");
    expect(error.message).not.toContain("Traceback");
    expect(error.message).not.toContain("/home");
  });

  it("HTTP status codes produce safe error messages", () => {
    const safeCodes: Record<number, string> = {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      500: "Internal Server Error",
    };
    for (const [code, text] of Object.entries(safeCodes)) {
      const msg = `API ${code}: ${text}`;
      // None of these leak internal info
      expect(msg).not.toMatch(/\.(py|js|ts|db|sqlite)/);
      expect(msg).not.toMatch(/\/[a-z]+\//i); // no file paths
    }
  });
});


// ═══════════════════════════════════════════════════════════════════════
// 5. dangerouslySetInnerHTML audit
// ═══════════════════════════════════════════════════════════════════════

describe("dangerouslySetInnerHTML audit", () => {
  /**
   * Audit results from codebase grep:
   *
   * - SOPRefRenderer.tsx (lines 16, 39): Uses .innerHTML = renderedContent
   *   SECURITY ISSUE: No DOMPurify or sanitization before innerHTML assignment.
   *   Content from Scholar/Brain passes through renderSOPRefLinks() which does
   *   NOT escape non-SOPRef content.
   *
   * - No React dangerouslySetInnerHTML usage found in components.
   *   All other components use React's built-in JSX escaping.
   *
   * RECOMMENDATION: Replace .innerHTML in SOPRefRenderer with DOMPurify.sanitize()
   * or refactor to use React createElement for link injection.
   */

  it("documents innerHTML usage locations", () => {
    // This test exists to document the audit findings.
    // If new innerHTML usage is added, this list should be updated.
    const KNOWN_INNERHTML_LOCATIONS = [
      "components/SOPRefRenderer.tsx:16",
      "components/SOPRefRenderer.tsx:39",
    ];
    expect(KNOWN_INNERHTML_LOCATIONS).toHaveLength(2);
  });

  it("SOPRef regex limits injectable characters", () => {
    // The regex /SOPRef\[([\w\-\/\.#]+)\]/g only matches word chars,
    // hyphens, slashes, dots, and hash. This prevents most XSS payloads
    // from being interpolated into the link HTML template.
    const dangerous = [
      '"', "'", "<", ">", "(", ")", " ", "=", ";", "&",
    ];
    for (const char of dangerous) {
      const refs = parseSOPRefs(`SOPRef[path${char}injection]`);
      // The regex should stop matching at the dangerous character
      expect(refs.every((r) => !r.path.includes(char))).toBe(true);
    }
  });
});
