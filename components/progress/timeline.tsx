"use client";

// The Progress timeline (ADR-0023): reverse-chronological moments — days with
// a Reflection or Milestones — under relative-then-monthly headers. Client
// only for the load-more reveal; moments arrive fully prepared from the
// server, so nothing here fetches.
import { Fragment, useState } from "react";
import { Frog } from "@/components/ui/frog";
import { ProjectChip } from "@/components/ui/project-chip";
import { TIME_LABEL } from "@/lib/types";
import {
  hasMoreMoments,
  momentDate,
  visibleMoments,
  type TimelineMoment,
} from "./prepare";

type Props = {
  moments: TimelineMoment[];
};

export function ProgressTimeline({ moments }: Props) {
  const [pages, setPages] = useState(1);

  if (moments.length === 0) {
    return (
      <section
        aria-label="Progress timeline"
        className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-4 py-10 text-center"
      >
        <Frog size={44} />
        <p className="max-w-sm text-sm text-ink-muted">
          No Reflections or Milestones yet. Log a Milestone or write a day&apos;s
          Reflection and your story starts here.
        </p>
      </section>
    );
  }

  const visible = visibleMoments(moments, pages);

  return (
    <section aria-label="Progress timeline" className="flex flex-col gap-3">
      {visible.map((moment, i) => (
        <Fragment key={moment.date}>
          {(i === 0 || visible[i - 1].header !== moment.header) && (
            <div className={`flex items-center gap-3 ${i === 0 ? "" : "mt-2"}`}>
              <h2 className="text-sm font-semibold text-ink">{moment.header}</h2>
              <span aria-hidden className="h-px flex-1 bg-border" />
            </div>
          )}
          <article className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
            <p className="font-mono text-xs font-medium text-ink-muted">
              {momentDate(moment.date)}
            </p>
            {moment.reflection && (
              <p className="text-sm italic leading-snug text-ink">{moment.reflection}</p>
            )}
            {moment.milestones.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {moment.milestones.map((m) => (
                  <li key={m.entryId} className="flex flex-wrap items-center gap-2">
                    <ProjectChip name={m.projectName} color={m.color} />
                    <span className="text-sm leading-snug text-ink">{m.milestone}</span>
                  </li>
                ))}
              </ul>
            )}
            {moment.others.length > 0 && (
              <p className="font-mono text-xs text-ink-muted">
                Also:{" "}
                {moment.others
                  .map((o) => `${o.projectName} ${TIME_LABEL[o.timeSpent]}`)
                  .join(" · ")}
              </p>
            )}
          </article>
        </Fragment>
      ))}
      {hasMoreMoments(moments, pages) && (
        <button
          type="button"
          onClick={() => setPages((p) => p + 1)}
          className="mt-1 self-center rounded-lg border border-border bg-surface px-4 py-2 text-sm text-ink transition-colors hover:border-border-strong pointer-coarse:py-3"
        >
          Load more
        </button>
      )}
    </section>
  );
}
