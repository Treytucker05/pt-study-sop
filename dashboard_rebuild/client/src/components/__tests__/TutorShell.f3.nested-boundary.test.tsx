import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Audit F3: The Tutor subtree must have its OWN `TutorErrorBoundary` so a
 * Tutor-specific crash does not also crash the Priming / Polish / Workspace
 * panes that live side-by-side in the StudioShell.
 *
 * Pre-fix `TutorShell.tsx` only wraps the entire `<StudioShell>` return in a
 * single boundary labelled "Studio Canvas" -- a crash inside `TutorLiveStudyPane`
 * takes the whole shell down. This structural test asserts the nested
 * boundary has been added around `tutorStudioContent`.
 */

describe("TutorShell — audit F3 nested error boundary", () => {
  const shellPath = resolve(
    __dirname,
    "..",
    "TutorShell.tsx",
  );
  const source = readFileSync(shellPath, "utf8");

  it("imports TutorErrorBoundary", () => {
    expect(source).toMatch(
      /from\s+"@\/components\/TutorErrorBoundary"/,
    );
  });

  it("wraps tutorStudioContent in its own TutorErrorBoundary", () => {
    // Capture the assignment block for `const tutorStudioContent = (...);`.
    // Regex is conservative: body up to the closing `);` at start of line.
    const match = source.match(
      /const\s+tutorStudioContent\s*=\s*\(([\s\S]*?)\n\s*\);/,
    );
    expect(
      match,
      "could not locate `const tutorStudioContent = (...)` assignment in TutorShell.tsx",
    ).not.toBeNull();

    const body = (match as RegExpMatchArray)[1];
    expect(
      body,
      "tutorStudioContent body must contain <TutorErrorBoundary ...> so a "
        + "Tutor crash does not take down Priming / Polish / Workspace panels",
    ).toMatch(/<TutorErrorBoundary\b/);
    // The nested boundary should expose a Tutor-specific label so the
    // fallback UI is distinguishable from the outer Studio Canvas boundary.
    expect(body).toMatch(
      /fallbackLabel\s*=\s*\{?["'`][^"'`]*[Tt]utor[^"'`]*["'`]\}?/,
    );
  });
});
