import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  dateInTimeZone,
  daysBetween,
  endOfMonth,
  monthTitle,
  startOfMonth,
  weekdayMondayFirst,
} from "@/lib/dates";

describe("dateInTimeZone (ADR-0004)", () => {
  // 2026-07-02T23:30Z: still July 2 in Toronto (19:30), already July 3 in Kiritimati.
  const instant = new Date("2026-07-02T23:30:00Z");

  it("resolves the calendar day in the stored zone, not UTC", () => {
    expect(dateInTimeZone("America/Toronto", instant)).toBe("2026-07-02");
    expect(dateInTimeZone("Pacific/Kiritimati", instant)).toBe("2026-07-03");
    expect(dateInTimeZone("UTC", instant)).toBe("2026-07-02");
  });

  it("rolls an evening Toronto log back to the local day", () => {
    // 2026-07-03T02:00Z = 22:00 on July 2 in Toronto.
    const evening = new Date("2026-07-03T02:00:00Z");
    expect(dateInTimeZone("America/Toronto", evening)).toBe("2026-07-02");
    expect(dateInTimeZone("UTC", evening)).toBe("2026-07-03");
  });
});

describe("date math", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("handles leap days", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
  });

  it("computes signed day differences", () => {
    expect(daysBetween("2026-07-01", "2026-07-02")).toBe(1);
    expect(daysBetween("2026-07-02", "2026-07-01")).toBe(-1);
    expect(daysBetween("2025-07-02", "2026-07-02")).toBe(365);
  });

  it("computes month bounds", () => {
    expect(startOfMonth("2026-07-15")).toBe("2026-07-01");
    expect(endOfMonth("2026-07-15")).toBe("2026-07-31");
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
  });

  it("addMonths clamps to the target month length", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-07-15", -1)).toBe("2026-06-15");
    expect(addMonths("2026-12-01", 1)).toBe("2027-01-01");
  });

  it("weekdayMondayFirst maps Monday to 0 and Sunday to 6", () => {
    expect(weekdayMondayFirst("2026-06-29")).toBe(0); // Monday
    expect(weekdayMondayFirst("2026-07-02")).toBe(3); // Thursday
    expect(weekdayMondayFirst("2026-07-05")).toBe(6); // Sunday
  });

  it("renders month titles", () => {
    expect(monthTitle("2026-07-01")).toBe("July 2026");
  });
});
