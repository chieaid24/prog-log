"use client";

// The Expeditions tab (PRD #55, ADR-0018): a todoist-style composer, the
// hand-ordered open list (drag or keyboard reorder via dnd-kit, persisted
// through reorder_expeditions), and the answered showcase linking each
// Expedition to its YouTube video. Lists update optimistically; the server
// revalidation that follows each action re-syncs them from the database.
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition } from "react";
import {
  addExpeditionAction,
  answerExpeditionAction,
  deleteExpeditionAction,
  reopenExpeditionAction,
  reorderExpeditionsAction,
  updateExpeditionAction,
} from "@/app/actions/expeditions";
import { DEMO_WRITE_NOTE } from "@/lib/demo/mode";
import type { Expedition } from "@/lib/types";
import { youtubeThumbnailUrl } from "@/lib/youtube";

type Props = {
  /** Open Expeditions in position order (the hand-ordered todo list). */
  open: Expedition[];
  /** Answered Expeditions, most recent first. */
  answered: Expedition[];
};

export function ExpeditionManager({ open: openProp, answered: answeredProp }: Props) {
  const [open, setOpen] = useState(openProp);
  const [answered, setAnswered] = useState(answeredProp);
  const [lastOpenProp, setLastOpenProp] = useState(openProp);
  const [lastAnsweredProp, setLastAnsweredProp] = useState(answeredProp);

  if (openProp !== lastOpenProp) {
    setLastOpenProp(openProp);
    setOpen(openProp);
  }
  if (answeredProp !== lastAnsweredProp) {
    setLastAnsweredProp(answeredProp);
    setAnswered(answeredProp);
  }

  const [reorderError, setReorderError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = open.findIndex((x) => x.id === active.id);
    const to = open.findIndex((x) => x.id === over.id);
    if (from < 0 || to < 0) return;
    const previous = open;
    const next = arrayMove(open, from, to);
    setReorderError(null);
    setOpen(next);
    startTransition(async () => {
      const result = await reorderExpeditionsAction(next.map((x) => x.id));
      if (!result.ok) {
        if (result.error === DEMO_WRITE_NOTE) {
          setReorderError(result.error);
        } else {
          setOpen(previous);
          setReorderError(result.error);
        }
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <Composer onAdded={(x) => setOpen((xs) => [...xs, x])} />

      <section aria-label="Open Expeditions" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink-muted">
          Open <span className="font-mono text-ink-muted">({open.length})</span>
        </h2>
        {open.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-muted">
            Nothing to answer. Add an Expedition above.
          </p>
        ) : (
          <DndContext
            id="expeditions-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={open.map((x) => x.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2">
                {open.map((x) => (
                  <OpenRow
                    key={x.id}
                    expedition={x}
                    onSaved={(next) =>
                      setOpen((xs) => xs.map((e) => (e.id === next.id ? next : e)))
                    }
                    onDeleted={(id) => setOpen((xs) => xs.filter((e) => e.id !== id))}
                    onAnswered={(next) => {
                      setOpen((xs) => xs.filter((e) => e.id !== next.id));
                      setAnswered((xs) => [next, ...xs]);
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        {reorderError && (
          <p
            role="alert"
            className={`text-sm ${reorderError === DEMO_WRITE_NOTE ? "text-ink-muted" : "text-danger-red"}`}
          >
            {reorderError}
          </p>
        )}
      </section>

      <section aria-label="Answered Expeditions" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink-muted">
          Answered <span className="font-mono text-ink-muted">({answered.length})</span>
        </h2>
        {answered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-ink-muted">
            No answered Expeditions yet. Attach a YouTube link to an open one and it lands here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {answered.map((x) => (
              <AnsweredRow
                key={x.id}
                expedition={x}
                onSaved={(next) =>
                  setAnswered((xs) => xs.map((e) => (e.id === next.id ? next : e)))
                }
                onReopened={(next) => {
                  setAnswered((xs) => xs.filter((e) => e.id !== next.id));
                  setOpen((xs) => [...xs, next]);
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Todoist-style capture: a one-line title plus an optional description line. */
function Composer({ onAdded }: { onAdded: (x: Expedition) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addExpeditionAction({
        title,
        description: description || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setDescription("");
      onAdded(result.expedition);
    });
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Add an Expedition"
      className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="New Expedition"
        placeholder="What will you explain on video?"
        autoComplete="off"
        enterKeyHint="done"
        className="w-full border-0 bg-transparent text-base font-medium text-ink outline-none placeholder:text-ink-faint pointer-coarse:py-1"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label="Description"
        placeholder="Description (optional)"
        autoComplete="off"
        enterKeyHint="done"
        className="w-full border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint pointer-coarse:py-1 pointer-coarse:text-base"
      />
      <div className="mt-1.5 flex items-center justify-end gap-3 border-t border-border pt-3">
        {error && (
          <p
            role="alert"
            className={`mr-auto text-sm ${error === DEMO_WRITE_NOTE ? "text-ink-muted" : "text-danger-red"}`}
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || title.trim().length === 0}
          className="rounded-lg bg-frog-green px-4 py-2 text-sm font-semibold text-on-green transition-colors hover:bg-frog-green-strong disabled:opacity-40 pointer-coarse:py-3"
        >
          {pending ? "Adding..." : "Add Expedition"}
        </button>
      </div>
    </form>
  );
}

/** Two-column pixel grip for the drag handle, in the nav icons' language. */
function GripIcon() {
  return (
    <svg
      viewBox="0 0 7 11"
      width={9}
      height={14}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="pixel-art"
    >
      {[0, 4].map((x) =>
        [0, 4, 8].map((y) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={3} height={3} fill="currentColor" />
        )),
      )}
    </svg>
  );
}

function OpenRow({
  expedition,
  onSaved,
  onDeleted,
  onAnswered,
}: {
  expedition: Expedition;
  onSaved: (x: Expedition) => void;
  onDeleted: (id: string) => void;
  onAnswered: (x: Expedition) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: expedition.id,
  });
  const [mode, setMode] = useState<"view" | "edit" | "answer">("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteExpeditionAction(expedition.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDeleted(expedition.id);
    });
  }

  return (
    <li
      ref={setNodeRef}
      data-expedition-id={expedition.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border border-border bg-surface p-3 ${
        isDragging ? "z-10 shadow-overlay" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={`Reorder ${expedition.title}`}
          {...attributes}
          {...listeners}
          className="tap mt-0.5 cursor-grab touch-none rounded-md px-1 py-1.5 text-ink-faint transition-colors hover:text-ink-muted active:cursor-grabbing"
        >
          <GripIcon />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{expedition.title}</p>
          {expedition.description && (
            <p className="mt-0.5 text-sm text-ink-muted">{expedition.description}</p>
          )}
        </div>
        <span className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === "answer" ? "view" : "answer")}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:min-h-11 pointer-coarse:px-4 pointer-coarse:py-3"
          >
            {mode === "answer" ? "Close" : "Answer"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "edit" ? "view" : "edit")}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:min-h-11 pointer-coarse:px-4 pointer-coarse:py-3"
          >
            {mode === "edit" ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-danger-red hover:text-danger-red disabled:opacity-50 pointer-coarse:min-h-11 pointer-coarse:px-4 pointer-coarse:py-3"
          >
            Delete
          </button>
        </span>
      </div>
      {error && (
        <p
          role="alert"
          className={`mt-2 text-sm ${error === DEMO_WRITE_NOTE ? "text-ink-muted" : "text-danger-red"}`}
        >
          {error}
        </p>
      )}
      {mode === "edit" && (
        <EditForm
          expedition={expedition}
          onSaved={(next) => {
            setMode("view");
            onSaved(next);
          }}
        />
      )}
      {mode === "answer" && <AnswerForm expedition={expedition} onAnswered={onAnswered} />}
    </li>
  );
}

/** Attach the answering video: a required YouTube URL (ADR-0019). */
function AnswerForm({
  expedition,
  onAnswered,
}: {
  expedition: Expedition;
  onAnswered: (x: Expedition) => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await answerExpeditionAction(expedition.id, url);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onAnswered(result.expedition);
    });
  }

  return (
    <form
      onSubmit={submit}
      aria-label={`Answer ${expedition.title}`}
      className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3"
    >
      <input
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setError(null);
        }}
        type="url"
        inputMode="url"
        aria-label={`YouTube link for ${expedition.title}`}
        placeholder="https://www.youtube.com/watch?v=..."
        autoComplete="off"
        enterKeyHint="done"
        className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-ink-faint focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base"
      />
      <button
        type="submit"
        disabled={pending || url.trim().length === 0}
        className="rounded-lg bg-frog-green px-4 py-2 text-sm font-semibold text-on-green transition-colors hover:bg-frog-green-strong disabled:opacity-40 pointer-coarse:py-3"
      >
        {pending ? "Attaching..." : "Attach video"}
      </button>
      {error && (
        <p
          role="alert"
          className={`w-full text-sm ${error === DEMO_WRITE_NOTE ? "text-ink-muted" : "text-danger-red"}`}
        >
          {error}
        </p>
      )}
    </form>
  );
}

function EditForm({
  expedition,
  onSaved,
}: {
  expedition: Expedition;
  onSaved: (x: Expedition) => void;
}) {
  const [title, setTitle] = useState(expedition.title);
  const [description, setDescription] = useState(expedition.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateExpeditionAction(expedition.id, {
        title,
        description: description || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(result.expedition);
    });
  }

  return (
    <form
      onSubmit={submit}
      aria-label={`Edit ${expedition.title}`}
      className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label={`Title for ${expedition.title}`}
        autoComplete="off"
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label={`Description for ${expedition.title}`}
        placeholder="Description (optional)"
        autoComplete="off"
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-ink-faint focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || title.trim().length === 0}
          className="rounded-lg bg-frog-green px-4 py-2 text-sm font-semibold text-on-green transition-colors hover:bg-frog-green-strong disabled:opacity-40 pointer-coarse:py-3"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className={`text-sm ${error === DEMO_WRITE_NOTE ? "text-ink-muted" : "text-danger-red"}`}
        >
          {error}
        </p>
      )}
    </form>
  );
}

function AnsweredRow({
  expedition,
  onSaved,
  onReopened,
}: {
  expedition: Expedition;
  onSaved: (x: Expedition) => void;
  onReopened: (x: Expedition) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reopen() {
    setError(null);
    startTransition(async () => {
      const result = await reopenExpeditionAction(expedition.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onReopened(result.expedition);
    });
  }

  const url = expedition.youtube_url;

  return (
    <li data-expedition-id={expedition.id} className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-start gap-3">
        {url && expedition.youtube_video_id && (
          <a href={url} target="_blank" rel="noreferrer" aria-hidden="true" tabIndex={-1} className="shrink-0">
            {/* Derived thumbnail (ADR-0019); plain img, no optimizer fetch. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={youtubeThumbnailUrl(expedition.youtube_video_id)}
              alt=""
              width={112}
              height={63}
              loading="lazy"
              className="h-16 w-28 rounded-lg border border-border object-cover"
            />
          </a>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{expedition.title}</p>
          {expedition.description && (
            <p className="mt-0.5 text-sm text-ink-muted">{expedition.description}</p>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block truncate text-sm font-medium text-frog-green-strong hover:underline"
            >
              {expedition.youtube_title ?? url}
            </a>
          )}
        </div>
        <span className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={reopen}
            disabled={pending}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-border-strong hover:text-ink disabled:opacity-50 pointer-coarse:min-h-11 pointer-coarse:px-4 pointer-coarse:py-3"
          >
            Reopen
          </button>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:min-h-11 pointer-coarse:px-4 pointer-coarse:py-3"
          >
            {editing ? "Close" : "Edit"}
          </button>
        </span>
      </div>
      {error && (
        <p
          role="alert"
          className={`mt-2 text-sm ${error === DEMO_WRITE_NOTE ? "text-ink-muted" : "text-danger-red"}`}
        >
          {error}
        </p>
      )}
      {editing && (
        <EditForm
          expedition={expedition}
          onSaved={(next) => {
            setEditing(false);
            onSaved(next);
          }}
        />
      )}
    </li>
  );
}
