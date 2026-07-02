import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/supabase/middleware";

describe("isPublicPath", () => {
  it("keeps login, auth plumbing, the public now page and api routes public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/confirm")).toBe(true);
    expect(isPublicPath("/now")).toBe(true);
    expect(isPublicPath("/api/discord")).toBe(true);
    expect(isPublicPath("/api/log")).toBe(true);
    expect(isPublicPath("/api/cron/digest")).toBe(true);
  });

  it("protects the dashboard and every log view", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/monthly")).toBe(false);
    expect(isPublicPath("/projects")).toBe(false);
    expect(isPublicPath("/settings")).toBe(false);
  });

  it("does not let prefixes leak: /nowhere is private, /now is public", () => {
    expect(isPublicPath("/nowhere")).toBe(false);
    expect(isPublicPath("/logins")).toBe(false);
  });
});
