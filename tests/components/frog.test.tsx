// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Frog } from "@/components/ui/frog";

describe("Frog (Ferdy)", () => {
  it("is decorative by default: aria-hidden, no img role", () => {
    const { container } = render(<Frog />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("aria-hidden")).toBe("true");
    expect(svg!.getAttribute("role")).toBeNull();
  });

  it("becomes an image with an accessible name when standalone", () => {
    render(<Frog title="Ferdy, a pixel frog sitting on a log" />);
    const img = screen.getByRole("img", {
      name: "Ferdy, a pixel frog sitting on a log",
    });
    expect(img.getAttribute("aria-hidden")).toBeNull();
  });

  it("renders crisp token-driven pixels: green body, brown log, blinkable eyes", () => {
    const { container } = render(<Frog size={64} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("shape-rendering")).toBe("crispEdges");
    expect(svg.classList.contains("pixel-art")).toBe(true);
    const fills = [...svg.querySelectorAll("rect")].map((r) => r.getAttribute("fill"));
    expect(fills).toContain("var(--frog-green)");
    expect(fills).toContain("var(--log-brown)");
    const eyes = svg.querySelector("g.frog-eyes");
    expect(eyes).not.toBeNull();
    expect(eyes!.querySelectorAll("rect").length).toBeGreaterThan(0);
  });

  it("scales off the sprite grid", () => {
    const { container } = render(<Frog size={32} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("32");
    expect(Number(svg.getAttribute("height"))).toBe(28); // 32 * 14 / 16
  });
});
