import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, signInWithOtp } = vi.hoisted(() => ({
  createClient: vi.fn(),
  signInWithOtp: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { requestMagicLink } from "@/app/actions/auth";

function loginForm(email: string): FormData {
  const form = new FormData();
  form.set("email", email);
  return form;
}

beforeEach(() => {
  vi.stubEnv("OWNER_EMAIL", "owner@example.com");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://log.example.com/");
  signInWithOtp.mockReset().mockResolvedValue({ error: null });
  createClient.mockReset().mockResolvedValue({ auth: { signInWithOtp } });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requestMagicLink", () => {
  it("fails closed when OWNER_EMAIL is missing", async () => {
    vi.stubEnv("OWNER_EMAIL", "");

    await expect(requestMagicLink(loginForm("owner@example.com"))).resolves.toEqual({ ok: true });

    expect(createClient).not.toHaveBeenCalled();
  });

  it("silently accepts a non-owner email without touching Supabase", async () => {
    await expect(requestMagicLink(loginForm("other@example.com"))).resolves.toEqual({ ok: true });

    expect(createClient).not.toHaveBeenCalled();
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("sends a magic link to the normalized owner without creating a user", async () => {
    await expect(requestMagicLink(loginForm(" OWNER@EXAMPLE.COM "))).resolves.toEqual({
      ok: true,
    });

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "owner@example.com",
      options: {
        emailRedirectTo: "https://log.example.com/auth/confirm",
        shouldCreateUser: false,
      },
    });
  });
});
