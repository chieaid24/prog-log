// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/(auth)/login/page";

const signInWithOtp = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOtp } }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  signInWithOtp.mockReset();
});

describe("login page", () => {
  it("sends a magic link to the entered email and shows the sent state", async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "a6chien@uwaterloo.ca");
    await user.click(screen.getByRole("button", { name: /send magic link/i }));

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "a6chien@uwaterloo.ca",
      options: { emailRedirectTo: expect.stringContaining("/auth/confirm") },
    });
    expect(await screen.findByText("Check your inbox")).toBeInTheDocument();
  });

  it("surfaces send errors and stays on the form", async () => {
    signInWithOtp.mockResolvedValue({ error: { message: "rate limited" } });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "a6chien@uwaterloo.ca");
    await user.click(screen.getByRole("button", { name: /send magic link/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("rate limited");
    expect(screen.getByRole("button", { name: /send magic link/i })).toBeInTheDocument();
  });
});
