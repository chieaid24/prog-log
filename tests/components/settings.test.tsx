// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimezoneForm } from "@/components/settings/timezone-form";

const updateTimezoneAction = vi.fn();

vi.mock("@/app/actions/settings", () => ({
  updateTimezoneAction: (...args: unknown[]) => updateTimezoneAction(...args),
}));

const ZONES = ["America/Toronto", "Europe/Istanbul", "Pacific/Kiritimati"];

beforeEach(() => {
  updateTimezoneAction.mockReset();
});

describe("timezone form", () => {
  it("saves a changed timezone and confirms", async () => {
    updateTimezoneAction.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<TimezoneForm current="America/Toronto" timezones={ZONES} />);

    await user.selectOptions(screen.getByLabelText("Timezone"), "Europe/Istanbul");
    await user.click(screen.getByRole("button", { name: "Save timezone" }));

    expect(updateTimezoneAction).toHaveBeenCalledWith("Europe/Istanbul");
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
  });

  it("disables save when nothing changed", () => {
    render(<TimezoneForm current="America/Toronto" timezones={ZONES} />);
    expect(screen.getByRole("button", { name: "Save timezone" })).toBeDisabled();
  });

  it("surfaces save errors", async () => {
    updateTimezoneAction.mockResolvedValue({ ok: false, error: "Unknown timezone." });
    const user = userEvent.setup();
    render(<TimezoneForm current="America/Toronto" timezones={ZONES} />);

    await user.selectOptions(screen.getByLabelText("Timezone"), "Pacific/Kiritimati");
    await user.click(screen.getByRole("button", { name: "Save timezone" }));

    expect(await screen.findByText("Unknown timezone.")).toBeInTheDocument();
  });
});
