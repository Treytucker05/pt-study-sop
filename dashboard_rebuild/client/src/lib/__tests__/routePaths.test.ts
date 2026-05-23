import { describe, expect, it } from "vitest";

import { normalizeRoutePath } from "@/lib/routePaths";

describe("normalizeRoutePath", () => {
  it("maps /brain and nested /brain/* routes to app paths", () => {
    expect(normalizeRoutePath("/brain")).toBe("/");
    expect(normalizeRoutePath("/brain/tutor")).toBe("/tutor");
    expect(normalizeRoutePath("/brain/library")).toBe("/library");
    expect(normalizeRoutePath("/brain/calendar")).toBe("/calendar");
  });

  it("leaves non-prefixed paths unchanged", () => {
    expect(normalizeRoutePath("/tutor")).toBe("/tutor");
    expect(normalizeRoutePath("/")).toBe("/");
  });
});
