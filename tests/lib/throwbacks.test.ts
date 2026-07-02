import { describe, expect, it } from "vitest";
import { humanizeAge, pickThrowbacks, seededShuffle } from "@/lib/throwbacks";
import type { ThrowbackItem } from "@/lib/types";

describe("humanizeAge", () => {
  it("picks the nicest unit at each boundary", () => {
    expect(humanizeAge(0)).toBe("today");
    expect(humanizeAge(1)).toBe("yesterday");
    expect(humanizeAge(3)).toBe("3 days ago");
    expect(humanizeAge(6)).toBe("6 days ago");
    expect(humanizeAge(7)).toBe("1 week ago");
    expect(humanizeAge(13)).toBe("2 weeks ago");
    expect(humanizeAge(21)).toBe("3 weeks ago");
    expect(humanizeAge(27)).toBe("4 weeks ago");
    expect(humanizeAge(30)).toBe("1 month ago");
    expect(humanizeAge(122)).toBe("4 months ago");
    expect(humanizeAge(334)).toBe("11 months ago");
    expect(humanizeAge(335)).toBe("1 year ago");
    expect(humanizeAge(365)).toBe("1 year ago");
    expect(humanizeAge(548)).toBe("2 years ago"); // 1.5y rounds up
    expect(humanizeAge(731)).toBe("2 years ago");
  });
});

function pool(n: number): ThrowbackItem[] {
  return Array.from({ length: n }, (_, i) => ({
    entryId: `e${i}`,
    milestone: `milestone ${i}`,
    entryDate: "2025-01-01",
    projectName: "Work",
    color: null,
    daysAgo: 100 + i,
  }));
}

describe("seededShuffle", () => {
  it("is deterministic for the same seed", () => {
    const items = pool(20);
    expect(seededShuffle(items, "2026-07-02")).toEqual(seededShuffle(items, "2026-07-02"));
  });

  it("orders differently for different seeds", () => {
    const items = pool(20);
    const a = seededShuffle(items, "2026-07-02").map((i) => i.entryId);
    const b = seededShuffle(items, "2026-07-03").map((i) => i.entryId);
    expect(a).not.toEqual(b);
  });

  it("does not mutate its input", () => {
    const items = pool(5);
    const ids = items.map((i) => i.entryId);
    seededShuffle(items, "seed");
    expect(items.map((i) => i.entryId)).toEqual(ids);
  });
});

describe("pickThrowbacks", () => {
  it("returns the same items all day (page) and the page's first as digest top-1", () => {
    const items = pool(30);
    const page = pickThrowbacks(items, "2026-07-02", 3);
    const digest = pickThrowbacks(items, "2026-07-02", 1);
    expect(page).toHaveLength(3);
    expect(digest).toEqual([page[0]]);
  });

  it("returns an empty feed for an empty pool", () => {
    expect(pickThrowbacks([], "2026-07-02")).toEqual([]);
  });

  it("caps at the pool size", () => {
    expect(pickThrowbacks(pool(2), "2026-07-02", 3)).toHaveLength(2);
  });
});
