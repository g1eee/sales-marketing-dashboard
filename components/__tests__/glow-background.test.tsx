import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { GlowBackground } from "@/components/glow-background";

describe("GlowBackground", () => {
  it("renders a decorative, aria-hidden layer", () => {
    const { container } = render(<GlowBackground />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute("aria-hidden")).toBe("true");
  });
});
