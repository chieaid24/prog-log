// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NowPage from "@/app/now/page";

const from = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from }),
}));

type Row = {
  entry_date: string;
  time_spent: string;
  milestone: string | null;
  project: { name: string; category: string | null; color: string | null };
};

function stubTables(rows: Row[], timezone = "America/Toronto") {
  const entriesBuilder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gte", "lte", "or"]) {
    entriesBuilder[method] = vi.fn(() => entriesBuilder);
  }
  entriesBuilder.order = vi.fn(async () => ({ data: rows, error: null }));

  from.mockImplementation((table: string) =>
    table === "app_settings"
      ? {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { timezone } }) }),
          }),
        }
      : entriesBuilder,
  );
  return entriesBuilder;
}

// Fixed clock: 2026-07-03 in America/Toronto.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-07-03T16:00:00Z"));
  vi.stubEnv("OWNER_USER_ID", "owner-1");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("public now page", () => {
  it("renders project cards with milestones, activity age and deep-work count", async () => {
    stubTables([
      {
        entry_date: "2026-06-25",
        time_spent: "large",
        milestone: null,
        project: { name: "AI-M", category: "coding", color: "#34d399" },
      },
      {
        entry_date: "2026-07-01",
        time_spent: "large",
        milestone: "shipped the beta",
        project: { name: "AI-M", category: "coding", color: "#34d399" },
      },
    ]);

    render(await NowPage());

    expect(screen.getByRole("heading", { name: "AI-M" })).toBeInTheDocument();
    expect(screen.getByText("shipped the beta")).toBeInTheDocument();
    expect(screen.getByText("active 2 days ago")).toBeInTheDocument();
    expect(screen.getByText(/deep-work days in the window/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("never selects entry descriptions (the ADR-0009 publication list)", async () => {
    const builder = stubTables([]);
    render(await NowPage());

    const selectArg = (builder.select as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(selectArg).not.toContain("description");
    expect(selectArg).toContain("milestone");
  });

  it("renders the quiet empty state when nothing qualifies", async () => {
    stubTables([]);
    render(await NowPage());
    expect(screen.getByText("Building quietly at the moment.")).toBeInTheDocument();
  });

  it("renders the quiet empty state without touching the db when OWNER_USER_ID is unset", async () => {
    vi.stubEnv("OWNER_USER_ID", "");
    render(await NowPage());
    expect(screen.getByText("Building quietly at the moment.")).toBeInTheDocument();
    expect(from).not.toHaveBeenCalled();
  });
});
