import { describe, it, expect } from "vitest";
import React from "react";

describe("Smoke Test", () => {
  it("should render a simple React element", () => {
    const element = React.createElement("div", null, "Hello, World!");
    expect(element).toBeDefined();
    expect(element.type).toBe("div");
    expect(element.props.children).toBe("Hello, World!");
  });
});
