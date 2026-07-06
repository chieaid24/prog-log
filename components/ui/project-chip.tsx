// A Project's identity as a small chip: entity color dot + name. The name is
// always text (identity is never color-alone); the dot carries the color.
type Props = {
  name: string;
  color: string | null;
};

const FALLBACK_DOT = "var(--ink-faint)";

export function ProjectChip({ name, color }: Props) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-ink-muted">
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: color ?? FALLBACK_DOT }}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}
