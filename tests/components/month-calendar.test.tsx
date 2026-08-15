// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import type { CalendarDayProject } from "@/lib/types";

const card = (over: Partial<CalendarDayProject> = {}): CalendarDayProject => ({
  date: "2026-06-10",
  projectId: "p1",
  projectName: "Turkish",
  color: "#339797",
  timeSpent: "medium",
  weight: 2,
  hasMilestone: false,
  ...over,
});

describe("month calendar milestone star", () => {
  it("marks milestone cards with a star sized to the project name (UA-031)", () => {
    render(
      <MonthCalendar
        monthStart="2026-06-01"
        todayISO="2026-06-15"
        cards={[card({ hasMilestone: true })]}
      />,
    );
    const star = screen.getByLabelText("Has milestone");
    expect(star).toHaveClass("text-[11px]");
  });

  it("omits the star on plain cards", () => {
    render(
      <MonthCalendar monthStart="2026-06-01" todayISO="2026-06-15" cards={[card()]} />,
    );
    expect(screen.queryByLabelText("Has milestone")).not.toBeInTheDocument();
  });
});
