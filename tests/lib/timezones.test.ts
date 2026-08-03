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
  it("returns a curated, ordered set with unique ids and offsets", () => {
    const zones = listTimeZones();
    const offsets = zones.map(({ label }) => label.match(/^\(UTC([+-]\d{2}:\d{2})\)/)?.[1]);

    expect(zones).toHaveLength(25);
    expect(new Set(zones.map(({ id }) => id)).size).toBe(zones.length);
    expect(zones.every(({ id }) => isValidTimeZone(id))).toBe(true);
    expect(offsets.every(Boolean)).toBe(true);
    expect(new Set(offsets).size).toBe(zones.length);
    expect(offsets).toEqual([
      "-11:00",
      "-10:00",
      "-09:00",
      "-08:00",
      "-07:00",
      "-06:00",
      "-05:00",
      "-04:00",
      "-03:00",
      "-02:00",
      "-01:00",
      "+00:00",
      "+01:00",
      "+02:00",
      "+03:00",
      "+04:00",
      "+05:00",
      "+06:00",
      "+07:00",
      "+08:00",
      "+09:00",
      "+10:00",
      "+11:00",
      "+12:00",
      "+13:00",
    ]);
  });

  it("includes the default and maps Seattle to the Pacific IANA zone", () => {
    const zones = listTimeZones();

    expect(zones).toContainEqual({
      id: "America/Toronto",
      label: "(UTC-05:00) Eastern - Toronto",
    });
    expect(zones).toContainEqual({
      id: "America/Los_Angeles",
      label: "(UTC-08:00) Pacific - Seattle",
    });
  });
});
