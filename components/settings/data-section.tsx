"use client";

import { useRef, useState, useTransition } from "react";
import { importEntriesAction, type ImportResult } from "@/app/actions/data";
import { isDemoNotice } from "@/lib/demo/mode";

/**
 * Settings → Data: export downloads (plain links to /api/export) and the
 * CSV/JSON import form (ADR-0008: importing is safe to retry, so the UI can
 * treat it as a low-stakes action).
 */
export function DataSection() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setResult(null);
    startTransition(async () => {
      const outcome = await importEntriesAction(new FormData(form));
      setResult(outcome);
      if (outcome.ok && fileRef.current) {
        fileRef.current.value = "";
        setFileName(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm text-ink">Export</h3>
        <p className="max-w-md text-xs text-ink-muted">
          Every Entry, yours to take anywhere. CSV opens in a spreadsheet; JSON keeps Project
          colors and categories for a full restore.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/export?format=csv"
            className="rounded-lg border border-border px-4 py-2 text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:py-3 whitespace-nowrap"
            download
          >
            Download CSV
          </a>
          <a
            href="/api/export?format=json"
            className="rounded-lg border border-border px-4 py-2 text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:py-3 whitespace-nowrap"
            download
          >
            Download JSON
          </a>
        </div>
      </div>

      <form onSubmit={submit} aria-label="Import entries" className="flex flex-col gap-2">
        <h3 className="text-sm text-ink">Import</h3>
        <p className="max-w-md text-xs text-ink-muted">
          Bring data in from a prog-log export or a Notion CSV. Rows land through the same
          write path as every log: re-importing never shrinks a day or erases a Milestone.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {/* Input first so the visible label can mirror its keyboard focus
              via peer-focus-visible; the input itself is sr-only (1x1px), so
              the global focus ring is invisible on it. */}
          <input
            ref={fileRef}
            id="import-file"
            name="file"
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="peer sr-only"
            onChange={(e) => {
              setFileName(e.target.files?.[0]?.name ?? null);
              setResult(null);
            }}
          />
          <label
            htmlFor="import-file"
            className="cursor-pointer rounded-lg border border-dashed border-border px-4 py-2 text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:py-3 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-frog-green"
          >
            {fileName ?? "Choose CSV or JSON…"}
          </label>
          <button
            type="submit"
            disabled={pending || !fileName}
            className="rounded-lg bg-frog-green px-4 py-2 text-sm font-semibold text-on-green transition-colors hover:bg-frog-green-strong disabled:opacity-40 pointer-coarse:py-3"
          >
            {pending ? "Importing…" : "Import"}
          </button>
        </div>
        <div aria-live="polite" className="text-sm">
          {result?.ok === false && (
            <p className={isDemoNotice(result) ? "text-ink-muted" : "text-danger-red"}>
              {result.error}
            </p>
          )}
          {result?.ok === true && (
            <div className="flex flex-col gap-1">
              <p className="text-frog-green-strong">
                Imported {result.imported} {result.imported === 1 ? "entry" : "entries"}
                {result.projectsCreated > 0 &&
                  `, created ${result.projectsCreated} ${
                    result.projectsCreated === 1 ? "project" : "projects"
                  }`}
                .
              </p>
              {result.failed.length > 0 && (
                <ul className="text-xs text-danger-red">
                  {result.failed.slice(0, 5).map((f) => (
                    <li key={`${f.line}-${f.message}`}>
                      line {f.line}: {f.message}
                    </li>
                  ))}
                  {result.failed.length > 5 && (
                    <li>…and {result.failed.length - 5} more rows skipped</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
