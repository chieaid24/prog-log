import Link from "next/link";

type Props = {
  current: "heatmap" | "calendar";
  heatmapHref: string;
  calendarHref: string;
};

export function ViewToggle({ current, heatmapHref, calendarHref }: Props) {
  return (
    <nav
      aria-label="Daily log view"
      className="grid shrink-0 grid-cols-2 gap-1 rounded-lg bg-surface-sunken p-1 text-sm"
    >
      <ViewLink active={current === "heatmap"} href={heatmapHref}>
        Heatmap
      </ViewLink>
      <ViewLink active={current === "calendar"} href={calendarHref}>
        Calendar
      </ViewLink>
    </nav>
  );
}

function ViewLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      href={href}
      className={`rounded-md border px-3 py-1.5 transition-colors pointer-coarse:py-3 ${
        active
          ? "border-border bg-surface font-medium text-ink"
          : "border-transparent text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
