// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/(auth)/login/page";

const { requestMagicLink } = vi.hoisted(() => ({ requestMagicLink: vi.fn() }));

vi.mock("@/app/actions/auth", () => ({ requestMagicLink }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  requestMagicLink.mockReset();
});

describe("login page", () => {
  it("sends a magic link to the entered email and shows the sent state", async () => {
    requestMagicLink.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "a6chien@uwaterloo.ca");
    await user.click(screen.getByRole("button", { name: /send magic link/i }));

    const form = requestMagicLink.mock.calls[0][0] as FormData;
    expect(form.get("email")).toBe("a6chien@uwaterloo.ca");
    expect(await screen.findByText("Check your inbox")).toBeInTheDocument();
  });

  it("surfaces send errors and stays on the form", async () => {
    requestMagicLink.mockResolvedValue({ ok: false, error: "rate limited" });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "a6chien@uwaterloo.ca");
    await user.click(screen.getByRole("button", { name: /send magic link/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("rate limited");
    expect(screen.getByRole("button", { name: /send magic link/i })).toBeInTheDocument();
  });
});
