// @vitest-environment jsdom
// The demo banner (issue #38): visible on every route in DEMO_MODE with a
// link back to the source (and the real app when configured), and absent
// from the private app.
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoBanner } from "@/components/ui/demo-banner";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("DemoBanner", () => {
  it("renders nothing outside DEMO_MODE", () => {
    const { container } = render(<DemoBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the demo badge and a source link in DEMO_MODE", () => {
    vi.stubEnv("DEMO_MODE", "1");
    render(<DemoBanner />);
    expect(screen.getByText("Demo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View the source" })).toHaveAttribute(
      "href",
      "https://github.com/chieaid24/prog-log",
    );
    expect(screen.queryByRole("link", { name: "real app" })).not.toBeInTheDocument();
  });

  it("links to the real app when NEXT_PUBLIC_SITE_URL is set", () => {
    vi.stubEnv("DEMO_MODE", "1");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    render(<DemoBanner />);
    expect(screen.getByRole("link", { name: "real app" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });
});
