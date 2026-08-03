"use client";

import { useState, useTransition } from "react";
import { updateTimezoneAction } from "@/app/actions/settings";
import { DEMO_WRITE_NOTE } from "@/lib/demo/mode";
import type { TimeZoneOption } from "@/lib/timezones";

type Props = {
  current: string;
  timezones: readonly TimeZoneOption[];
};

export function TimezoneForm({ current, timezones }: Props) {
  const [timezone, setTimezone] = useState(current);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const options = timezones.some(({ id }) => id === current)
    ? timezones
    : [{ id: current, label: `${current.replaceAll("_", " ")} (current)` }, ...timezones];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("idle");
    startTransition(async () => {
      const result = await updateTimezoneAction(timezone);
      if (!result.ok) {
        setError(result.error);
        setState("error");
        return;
      }
      setState("saved");
    });
  }

  return (
    <form onSubmit={submit} aria-label="Timezone setting" className="flex flex-col gap-3">
      <label htmlFor="tz" className="sr-only">
        Timezone
      </label>
      <select
        id="tz"
        value={timezone}
        onChange={(e) => {
          setTimezone(e.target.value);
          setState("idle");
        }}
        className="max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base"
      >
        {options.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      <p className="max-w-md text-xs text-ink-muted">
        &ldquo;Today&rdquo; for every log (web, Discord, Shortcut) is resolved in this zone.
        Changing it affects only future entries; logged days stay exactly where they are.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || timezone === current}
          className="self-start rounded-lg bg-frog-green px-4 py-2 text-sm font-semibold text-on-green transition-colors hover:bg-frog-green-strong disabled:opacity-40 pointer-coarse:py-3"
        >
          {pending ? "Saving…" : "Save timezone"}
        </button>
        <span aria-live="polite" className="text-sm">
          {state === "saved" && <span className="text-frog-green-strong">Saved.</span>}
          {state === "error" && (
            <span className={error === DEMO_WRITE_NOTE ? "text-ink-muted" : "text-danger-red"}>
              {error}
            </span>
          )}
        </span>
      </div>
    </form>
  );
}
