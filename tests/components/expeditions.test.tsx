// @vitest-environment jsdom
// The Expeditions tab (issue #57): create appends to the bottom, keyboard
// reorder persists through reorder_expeditions, answering moves the item to
// the showcase with thumbnail + title link, an invalid URL is rejected, and
// reopen returns the item to the bottom of the todo list.
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  addExpeditionAction: vi.fn(),
  answerExpeditionAction: vi.fn(),
  deleteExpeditionAction: vi.fn(),
  reopenExpeditionAction: vi.fn(),
  reorderExpeditionsAction: vi.fn(),
  updateExpeditionAction: vi.fn(),
}));
vi.mock("@/app/actions/expeditions", () => actions);

import { ExpeditionManager } from "@/components/expeditions/expedition-manager";
import type { Expedition } from "@/lib/types";

const VIDEO_ID = "dQw4w9WgXcQ";
const VIDEO_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

let seq = 0;
function expedition(title: string, over: Partial<Expedition> = {}): Expedition {
  seq += 1;
  return {
    id: `x${seq}`,
    user_id: "u1",
    title,
    description: null,
    status: "open",
    position: seq,
    youtube_url: null,
    youtube_video_id: null,
    youtube_title: null,
    answered_at: null,
    created_at: "2026-07-01T12:00:00Z",
    updated_at: "2026-07-01T12:00:00Z",
    ...over,
  };
}

function answered(title: string, over: Partial<Expedition> = {}): Expedition {
  return expedition(title, {
    status: "answered",
    youtube_url: VIDEO_URL,
    youtube_video_id: VIDEO_ID,
    youtube_title: "A watched explainer",
    answered_at: "2026-07-20T17:00:00Z",
    ...over,
  });
}

function openSection() {
  return screen.getByRole("region", { name: "Open Expeditions" });
}

function answeredSection() {
  return screen.getByRole("region", { name: "Answered Expeditions" });
}

function openTitles(): string[] {
  return within(openSection())
    .getAllByRole("listitem")
    .map((li) => li.querySelector("p")?.textContent ?? "");
}

// jsdom lays out nothing, so every rect is 0x0 and dnd-kit's keyboard
// coordinate getter can never find a row "below" the dragged one. Give each
// expedition row a distinct vertical rect derived from its list index.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value(this: HTMLElement) {
      const rect = { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 };
      const row = this.closest?.("[data-expedition-id]");
      if (row?.parentElement) {
        const index = Array.from(row.parentElement.children).indexOf(row);
        rect.y = rect.top = index * 60;
        rect.width = 400;
        rect.height = 56;
        rect.right = 400;
        rect.bottom = rect.top + 56;
      }
      return { ...rect, toJSON: () => rect };
    },
  });
});

beforeEach(() => {
  seq = 0;
  for (const mock of Object.values(actions)) mock.mockReset();
});

// A drag left active by a failing test would keep the keyboard sensor's
// window listeners alive (they preventDefault Space) and corrupt later tests.
afterEach(() => {
  fireEvent.keyDown(document, { code: "Escape" });
});

/** Let dnd-kit's rAF-scheduled droppable measurement settle. */
function frames() {
  return act(() => new Promise<void>((resolve) => setTimeout(resolve, 60)));
}

describe("creating an Expedition", () => {
  it("appends the new item to the bottom of the open list", async () => {
    const user = userEvent.setup();
    const initial = [expedition("Explain RSA"), expedition("Kalman filters")];
    render(<ExpeditionManager open={initial} answered={[]} />);

    const created = expedition("Why does gradient descent work?", {
      description: "Momentum in plain words",
    });
    actions.addExpeditionAction.mockResolvedValue({ ok: true, expedition: created });

    await user.type(screen.getByLabelText("New Expedition"), "Why does gradient descent work?");
    await user.type(screen.getByLabelText("Description"), "Momentum in plain words");
    await user.click(screen.getByRole("button", { name: "Add Expedition" }));

    expect(actions.addExpeditionAction).toHaveBeenCalledWith({
      title: "Why does gradient descent work?",
      description: "Momentum in plain words",
    });
    await waitFor(() =>
      expect(openTitles()).toEqual(["Explain RSA", "Kalman filters", "Why does gradient descent work?"]),
    );
    // The composer resets for the next capture.
    expect(screen.getByLabelText("New Expedition")).toHaveValue("");
  });
});

describe("reordering the open list", () => {
  it("moves a row with the keyboard and persists the new id order", async () => {
    const [a, b, c] = [expedition("Alpha"), expedition("Beta"), expedition("Gamma")];
    actions.reorderExpeditionsAction.mockResolvedValue({ ok: true, expeditions: [] });
    render(<ExpeditionManager open={[a, b, c]} answered={[]} />);

    // dnd-kit keyboard flow: Space lifts, ArrowDown moves over the next row,
    // Space drops - with a settle between steps for rAF-based measurement.
    const handle = screen.getByRole("button", { name: "Reorder Alpha" });
    handle.focus();
    fireEvent.keyDown(handle, { code: "Space" });
    await waitFor(() => expect(handle).toHaveAttribute("aria-pressed", "true"));
    await frames();
    fireEvent.keyDown(document, { code: "ArrowDown" });
    await frames();
    fireEvent.keyDown(document, { code: "Space" });

    await waitFor(() =>
      expect(actions.reorderExpeditionsAction).toHaveBeenCalledWith([b.id, a.id, c.id]),
    );
    expect(openTitles()).toEqual(["Beta", "Alpha", "Gamma"]);
  });
});

describe("answering an Expedition", () => {
  it("moves the item to the answered section with thumbnail and title link", async () => {
    const user = userEvent.setup();
    const item = expedition("Explain RSA");
    render(<ExpeditionManager open={[item]} answered={[]} />);

    actions.answerExpeditionAction.mockResolvedValue({
      ok: true,
      expedition: {
        ...item,
        status: "answered",
        youtube_url: VIDEO_URL,
        youtube_video_id: VIDEO_ID,
        youtube_title: "RSA in twelve minutes",
        answered_at: "2026-07-28T12:00:00Z",
      },
    });

    await user.click(screen.getByRole("button", { name: "Answer" }));
    await user.type(screen.getByLabelText("YouTube link for Explain RSA"), VIDEO_URL);
    await user.click(screen.getByRole("button", { name: "Attach video" }));

    expect(actions.answerExpeditionAction).toHaveBeenCalledWith(item.id, VIDEO_URL);
    const link = await within(answeredSection()).findByRole("link", {
      name: "RSA in twelve minutes",
    });
    expect(link).toHaveAttribute("href", VIDEO_URL);
    const thumb = answeredSection().querySelector("img");
    expect(thumb).toHaveAttribute("src", `https://img.youtube.com/vi/${VIDEO_ID}/mqdefault.jpg`);
    expect(within(openSection()).queryByText("Explain RSA")).not.toBeInTheDocument();
  });

  it("keeps the item open and shows the error when the URL is rejected", async () => {
    const user = userEvent.setup();
    const item = expedition("Explain RSA");
    render(<ExpeditionManager open={[item]} answered={[]} />);

    actions.answerExpeditionAction.mockResolvedValue({
      ok: false,
      error: "That is not a YouTube link. Paste a watch, youtu.be, shorts, or embed URL.",
    });

    await user.click(screen.getByRole("button", { name: "Answer" }));
    await user.type(
      screen.getByLabelText("YouTube link for Explain RSA"),
      "https://vimeo.com/123456",
    );
    await user.click(screen.getByRole("button", { name: "Attach video" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("not a YouTube link");
    expect(openTitles()).toEqual(["Explain RSA"]);
    expect(within(answeredSection()).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("falls back to the raw link when the stored title is null", () => {
    const item = answered("Explain RSA", { youtube_title: null });
    render(<ExpeditionManager open={[]} answered={[item]} />);

    const link = within(answeredSection()).getByRole("link", { name: VIDEO_URL });
    expect(link).toHaveAttribute("href", VIDEO_URL);
  });
});

describe("reopening an answered Expedition", () => {
  it("returns the item to the bottom of the open list", async () => {
    const user = userEvent.setup();
    const stillOpen = expedition("Alpha");
    const done = answered("Beta");
    render(<ExpeditionManager open={[stillOpen]} answered={[done]} />);

    actions.reopenExpeditionAction.mockResolvedValue({
      ok: true,
      expedition: { ...done, status: "open", answered_at: null, position: 2 },
    });

    await user.click(screen.getByRole("button", { name: "Reopen" }));

    expect(actions.reopenExpeditionAction).toHaveBeenCalledWith(done.id);
    await waitFor(() => expect(openTitles()).toEqual(["Alpha", "Beta"]));
    expect(within(answeredSection()).queryAllByRole("listitem")).toHaveLength(0);
  });
});

describe("editing and deleting open Expeditions", () => {
  it("saves an inline edit through updateExpeditionAction", async () => {
    const user = userEvent.setup();
    const item = expedition("Alpha");
    render(<ExpeditionManager open={[item]} answered={[]} />);

    actions.updateExpeditionAction.mockResolvedValue({
      ok: true,
      expedition: { ...item, title: "Alpha, sharpened" },
    });

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const title = screen.getByLabelText("Title for Alpha");
    await user.clear(title);
    await user.type(title, "Alpha, sharpened");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(actions.updateExpeditionAction).toHaveBeenCalledWith(item.id, {
      title: "Alpha, sharpened",
      description: undefined,
    });
    await waitFor(() => expect(openTitles()).toEqual(["Alpha, sharpened"]));
  });

  it("removes a deleted item from the open list", async () => {
    const user = userEvent.setup();
    const [a, b] = [expedition("Alpha"), expedition("Beta")];
    render(<ExpeditionManager open={[a, b]} answered={[]} />);

    actions.deleteExpeditionAction.mockResolvedValue({ ok: true });

    const row = screen.getByText("Alpha").closest("li") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "Delete" }));

    expect(actions.deleteExpeditionAction).toHaveBeenCalledWith(a.id);
    await waitFor(() => expect(openTitles()).toEqual(["Beta"]));
  });
});
