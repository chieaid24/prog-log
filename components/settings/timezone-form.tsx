"use client";

import { useState, useTransition } from "react";
import { updateTimezoneAction } from "@/app/actions/settings";

type Props = {
  current: string;
  timezones: string[];
};

export function TimezoneForm({ current, timezones }: Props) {
  const [timezone, setTimezone] = useState(current);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
        className="max-w-sm rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      >
        {timezones.map((tz) => (
          <option key={tz} value={tz}>
            {tz.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <p className="max-w-md text-xs text-faint">
        &ldquo;Today&rdquo; for every log — web, Discord, Shortcut — is resolved in this zone.
        Changing it affects only future entries; logged days stay exactly where they are.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || timezone === current}
          className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save timezone"}
        </button>
        <span aria-live="polite" className="text-sm">
          {state === "saved" && <span className="text-success">Saved.</span>}
          {state === "error" && <span className="text-danger">{error}</span>}
        </span>
      </div>
    </form>
  );
}
