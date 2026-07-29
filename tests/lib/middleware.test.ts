import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPublicPath, updateSession } from "@/lib/supabase/middleware";

const { getUser, signOut } = vi.hoisted(() => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser, signOut } }),
}));

beforeEach(() => {
  vi.stubEnv("OWNER_USER_ID", "owner-1");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  getUser.mockReset();
  signOut.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

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
  it("serves a private path without redirecting to login and without a Supabase session", async () => {
    vi.stubEnv("DEMO_MODE", "1");
    const res = await updateSession(new NextRequest("http://localhost/monthly"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });
});

describe("updateSession owner gate", () => {
  it("redirects a signed-out request from a private path", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await updateSession(new NextRequest("http://localhost/monthly"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("serves a private path for the configured owner", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });

    const res = await updateSession(new NextRequest("http://localhost/monthly"));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signs out a non-owner session and redirects private paths", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "intruder" } } });

    const res = await updateSession(new NextRequest("http://localhost/monthly?view=all"));

    expect(signOut).toHaveBeenCalledOnce();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login");
  });

  it("fails closed when OWNER_USER_ID is missing", async () => {
    vi.stubEnv("OWNER_USER_ID", "");
    getUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });

    const res = await updateSession(new NextRequest("http://localhost/monthly"));

    expect(signOut).toHaveBeenCalledOnce();
    expect(res.status).toBe(307);
  });
});
