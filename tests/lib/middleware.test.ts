import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isPublicPath, updateSession } from "@/lib/supabase/middleware";

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

describe("updateSession in DEMO_MODE (ADR-0016)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("serves a private path without redirecting to login and without a Supabase session", async () => {
    vi.stubEnv("DEMO_MODE", "1");
    // No Supabase env is set: reaching createServerClient would throw, so a
    // clean pass-through proves the demo branch short-circuits before it.
    const res = await updateSession(new NextRequest("http://localhost/monthly"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});
