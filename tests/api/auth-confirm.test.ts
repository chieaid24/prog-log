// Request tests for the magic-link confirm route: both GoTrue link styles
// (custom token_hash template and the default ConfirmationURL → PKCE ?code=)
// must set a session, and every failure lands back on /login?error=confirm.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyOtp, exchangeCodeForSession, redirect } = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp, exchangeCodeForSession } }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import { GET } from "@/app/auth/confirm/route";
import type { NextRequest } from "next/server";

function get(query: string) {
  return GET(new Request(`http://localhost/auth/confirm?${query}`) as unknown as NextRequest);
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyOtp.mockResolvedValue({ error: null });
  exchangeCodeForSession.mockResolvedValue({ error: null });
});

describe("GET /auth/confirm", () => {
  it("verifies a token_hash link and redirects to next", async () => {
    await expect(get("token_hash=abc&type=email&next=/settings")).rejects.toThrow(
      "REDIRECT:/settings",
    );
    expect(verifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "abc" });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchanges a pkce code link (default gotrue template) and redirects home", async () => {
    await expect(get("code=pkce-123")).rejects.toThrow("REDIRECT:/");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-123");
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("bounces to login on a failed token_hash verification", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    await expect(get("token_hash=abc&type=email")).rejects.toThrow(
      "REDIRECT:/login?error=confirm",
    );
  });

  it("bounces to login on a failed code exchange", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "bad code" } });
    await expect(get("code=nope")).rejects.toThrow("REDIRECT:/login?error=confirm");
  });

  it("bounces to login when the link carries neither style", async () => {
    await expect(get("")).rejects.toThrow("REDIRECT:/login?error=confirm");
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
