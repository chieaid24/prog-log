import { describe, expect, it } from "vitest";
import { computeMomentum, computeStreaks } from "@/lib/streaks";

const TODAY = "2026-07-02";

describe("computeStreaks", () => {
  it("handles no logged days", () => {
    expect(computeStreaks([], TODAY)).toEqual({
      current: 0,
      longest: 0,
      totalDays: 0,
      lastLogged: null,
    });
  });

  it("counts a run ending today", () => {
    const s = computeStreaks(["2026-06-30", "2026-07-01", "2026-07-02"], TODAY);
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it("keeps the streak alive when today is not yet logged", () => {
    const s = computeStreaks(["2026-06-30", "2026-07-01"], TODAY);
    expect(s.current).toBe(2);
  });

  it("kills the streak after a full missed day", () => {
    const s = computeStreaks(["2026-06-29", "2026-06-30"], TODAY);
    expect(s.current).toBe(0);
    expect(s.longest).toBe(2);
  });

  it("tracks the longest run in history", () => {
    const s = computeStreaks(
      ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-07-02"],
      TODAY,
    );
    expect(s.longest).toBe(4);
    expect(s.current).toBe(1);
    expect(s.totalDays).toBe(5);
  });

  it("ignores duplicate dates (several projects logged one day)", () => {
    const s = computeStreaks(["2026-07-01", "2026-07-01", "2026-07-02"], TODAY);
    expect(s.current).toBe(2);
    expect(s.totalDays).toBe(2);
  });
});

describe("computeMomentum", () => {
  it("reports rising when the recent window has more logged days", () => {
    const dates = ["2026-06-25", "2026-06-28", "2026-07-01"]; // all in last 14
    expect(computeMomentum(dates, TODAY)).toEqual({
      daysLast14: 3,
      daysPrev14: 0,
      direction: "rising",
    });
  });

  it("reports cooling when activity dropped off", () => {
    const dates = ["2026-06-05", "2026-06-08", "2026-06-10"]; // all in prev 14
    expect(computeMomentum(dates, TODAY).direction).toBe("cooling");
  });

  it("reports steady when both windows match", () => {
    expect(computeMomentum([], TODAY).direction).toBe("steady");
  });
});
