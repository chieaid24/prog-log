// Month-at-a-glance: four stat tiles plus the Time Commitment split meter.
// Pure props, server-rendered — no chart machinery for headline numbers.
import type { MonthlyStat, TimeSize } from "@/lib/types";
import { TIME_LABEL, TIME_SIZES } from "@/lib/types";
import { TIME_RAMP } from "./prepare";

type Props = {
  stat: MonthlyStat;
  /** Entry counts per Time Commitment for the displayed month. */
  split: Record<TimeSize, number>;
};

export function StatTiles({ stat, split }: Props) {
  const tiles = [
    { label: "Days worked", value: stat.daysWorked },
    { label: "Entries", value: stat.entries },
    { label: "Milestones", value: stat.milestones },
    { label: "Large sessions", value: stat.largeSessions },
  ];
  const total = TIME_SIZES.reduce((n, t) => n + split[t], 0);

  return (
    <section aria-label="Month at a glance" className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border border-line bg-panel px-4 py-3 transition-colors hover:border-line-strong"
          >
            <dt className="text-xs font-medium text-muted">{tile.label}</dt>
            <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {tile.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="rounded-xl border border-line bg-panel px-4 py-3">
        <h2 className="text-xs font-medium text-muted">Time Commitment split</h2>
        {total === 0 ? (
          <p className="mt-2 text-sm text-faint">No Entries this month.</p>
        ) : (
          <>
            <div
              role="img"
              aria-label={TIME_SIZES.map((t) => `${TIME_LABEL[t]} ${split[t]}`).join(", ")}
              className="mt-2.5 flex h-2.5 overflow-hidden rounded-full"
            >
              {TIME_SIZES.filter((t) => split[t] > 0).map((t) => (
                <div
                  key={t}
                  title={`${TIME_LABEL[t]}: ${split[t]}`}
                  className="border-r-2 border-background last:border-r-0"
                  style={{ width: `${(split[t] / total) * 100}%`, background: TIME_RAMP[t] }}
                />
              ))}
            </div>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {TIME_SIZES.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-2 rounded-sm"
                    style={{ background: TIME_RAMP[t] }}
                  />
                  {TIME_LABEL[t]} <span className="tabular-nums text-foreground">{split[t]}</span>
                </span>
              ))}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
