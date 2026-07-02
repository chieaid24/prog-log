import { describe, expect, it } from "vitest";
import { isValidTimeZone, listTimeZones } from "@/lib/timezones";

describe("isValidTimeZone", () => {
  it("accepts real IANA names", () => {
    expect(isValidTimeZone("America/Toronto")).toBe(true);
    expect(isValidTimeZone("Pacific/Kiritimati")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("EST5EDT nonsense")).toBe(false);
  });
});

describe("listTimeZones", () => {
  it("includes the default and is usefully large", () => {
    const zones = listTimeZones();
    expect(zones).toContain("America/Toronto");
    expect(zones.length).toBeGreaterThan(300);
  });
});
