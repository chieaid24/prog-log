// @vitest-environment jsdom
// Mobile + accessibility pass (issue #11): the bottom tab bar, the capture
// sheet, mobile-correct form attributes, the shell's landmark structure and
// the web app manifest.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/(auth)/login/page";
import LogLayout from "@/app/(log)/layout";
import { LogNav, TabBar } from "@/app/(log)/nav";
import manifest from "@/app/manifest";
import { LogSheet } from "@/components/quick-add/log-sheet";
import type { Project } from "@/lib/types";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/app/actions/auth", () => ({ requestMagicLink: vi.fn(), signOut: vi.fn() }));
vi.mock("@/app/actions/entries", () => ({ logEntryAction: vi.fn() }));
vi.mock("@/app/actions/projects", () => ({ createProjectAction: vi.fn() }));
vi.mock("@/app/actions/reflections", () => ({ setReflectionAction: vi.fn() }));

const PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Rocketry",
    category: null,
    color: "#8a7ddb",
    status: "active",
  } as Project,
];

beforeEach(() => {
  pathname = "/";
});

// jsdom ships HTMLDialogElement but not showModal/close; mirror the open
// attribute so the sheet's open/close flow is observable.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

describe("primary navigation", () => {
  it("tab bar exposes all four routes as labelled links and marks the active one", () => {
    pathname = "/monthly";
    render(<TabBar />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "Log",
      "Monthly",
      "Projects",
      "Settings",
    ]);
    expect(within(nav).getByRole("link", { name: "Monthly" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Log" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("collapses responsively: tab bar is phone-only, top nav is md-up", () => {
    render(
      <div>
        <LogNav />
        <TabBar />
      </div>,
    );
    const [topNav, tabBar] = screen.getAllByRole("navigation", { name: "Primary" });
    expect(topNav.className).toContain("hidden");
    expect(topNav.className).toContain("md:flex");
    expect(tabBar.className).toContain("md:hidden");
    expect(tabBar.className).toContain("fixed");
    expect(tabBar.className).toContain("bottom-0");
  });
});

describe("shell landmarks", () => {
  it("renders banner, primary nav, main and a skip link in order", () => {
    render(<LogLayout>content</LogLayout>);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
    expect(screen.getAllByRole("navigation", { name: "Primary" }).length).toBe(2);

    const skip = screen.getByRole("link", { name: "Skip to content" });
    expect(skip).toHaveAttribute("href", "#main");
    // The skip link is the document's first focusable element.
    expect(
      skip.compareDocumentPosition(screen.getByRole("banner")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("capture sheet", () => {
  it("opens the quick-add sheet from the floating log button and closes it again", async () => {
    const user = userEvent.setup();
    render(<LogSheet projects={PROJECTS} />);

    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).not.toHaveAttribute("open");

    await user.click(screen.getByRole("button", { name: /log today/i }));
    expect(dialog).toHaveAttribute("open");
    // The full quick-add form is inside, unchanged: two-tap capture intact.
    expect(
      within(dialog).getByRole("button", { name: "Log it" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Project")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(dialog).not.toHaveAttribute("open");
  });
});

describe("mobile-correct form inputs", () => {
  it("login email input brings up the email keyboard and autofills", () => {
    render(<LoginPage />);
    const email = screen.getByLabelText("Email");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("inputmode", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(email).toHaveAttribute("autocapitalize", "none");
  });
});

describe("web app manifest", () => {
  it("describes an installable app on paper surfaces with generated icons", () => {
    const m = manifest();
    expect(m.name).toBe("prog-log");
    expect(m.display).toBe("standalone");
    expect(m.theme_color).toBe("#f7f6f0");
    expect(m.background_color).toBe("#f7f6f0");

    const icons = m.icons ?? [];
    expect(icons.length).toBeGreaterThanOrEqual(3);
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
    // Every icon the manifest points at actually exists in public/.
    for (const icon of icons) {
      expect(existsSync(join(process.cwd(), "public", icon.src))).toBe(true);
    }
  });
});
