// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataSection } from "@/components/settings/data-section";

const importEntriesAction = vi.fn();

vi.mock("@/app/actions/data", () => ({
  importEntriesAction: (...args: unknown[]) => importEntriesAction(...args),
}));

beforeEach(() => {
  importEntriesAction.mockReset();
});

function csvFile() {
  return new File(["entry_date,project,time_spent\n2026-07-01,aim,small"], "export.csv", {
    type: "text/csv",
  });
}

describe("data section", () => {
  it("links both export formats", () => {
    render(<DataSection />);
    expect(screen.getByRole("link", { name: "Download CSV" })).toHaveAttribute(
      "href",
      "/api/export?format=csv",
    );
    expect(screen.getByRole("link", { name: "Download JSON" })).toHaveAttribute(
      "href",
      "/api/export?format=json",
    );
  });

  it("disables import until a file is chosen, then posts it and shows the summary", async () => {
    importEntriesAction.mockResolvedValue({
      ok: true,
      imported: 3,
      projectsCreated: 1,
      failed: [{ line: 4, message: 'invalid time_spent "huge" (small|medium|large)' }],
    });
    const user = userEvent.setup();
    render(<DataSection />);

    const importButton = screen.getByRole("button", { name: "Import" });
    expect(importButton).toBeDisabled();

    await user.upload(screen.getByLabelText(/Choose CSV or JSON/), csvFile());
    expect(importButton).toBeEnabled();

    await user.click(importButton);
    expect(importEntriesAction).toHaveBeenCalledTimes(1);
    expect(importEntriesAction.mock.calls[0][0]).toBeInstanceOf(FormData);

    expect(await screen.findByText("Imported 3 entries, created 1 project.")).toBeInTheDocument();
    expect(screen.getByText(/line 4:/)).toBeInTheDocument();
  });

  it("surfaces a failed import", async () => {
    importEntriesAction.mockResolvedValue({ ok: false, error: "Not signed in." });
    const user = userEvent.setup();
    render(<DataSection />);

    await user.upload(screen.getByLabelText(/Choose CSV or JSON/), csvFile());
    await user.click(screen.getByRole("button", { name: "Import" }));

    expect(await screen.findByText("Not signed in.")).toBeInTheDocument();
  });
});
