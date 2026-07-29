import { isDemoMode } from "@/lib/demo/mode";

// The source repo is public and safe to link; the live app URL is embargoed
// (CLAUDE.md), so it only appears when the demo deployment injects it via env.
const SOURCE_URL = "https://github.com/chieaid24/prog-log";

/**
 * Global demo notice (ADR-0016): a slim strip above every route telling
 * visitors this is a read-only tour of sample data, linking back to the
 * source and, when configured, the real app. Renders nothing outside
 * DEMO_MODE, so the private app never shows it.
 */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return (
    <aside
      aria-label="Demo notice"
      data-testid="demo-banner"
      className="border-b border-border bg-surface-sunken px-4 py-2 text-center text-xs text-ink-muted"
    >
      <span className="mr-2 inline-block rounded-full border border-warning-amber bg-surface px-2 py-px font-mono text-[11px] font-medium text-ink">
        Demo
      </span>
      Sample data, read-only.{" "}
      <a
        href={SOURCE_URL}
        className="font-medium text-ink underline decoration-border-strong underline-offset-2 hover:decoration-ink"
      >
        View the source
      </a>
      {appUrl ? (
        <>
          {" or the "}
          <a
            href={appUrl}
            className="font-medium text-ink underline decoration-border-strong underline-offset-2 hover:decoration-ink"
          >
            real app
          </a>
        </>
      ) : null}
    </aside>
  );
}
