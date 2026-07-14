import Link from "next/link";
import { Frog } from "@/components/ui/frog";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      {/* Decorative: the heading right below carries the meaning, so the
          frog stays aria-hidden (DESIGN.md frog a11y). */}
      <Frog size={72} />
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        Nothing on this lily pad
      </h1>
      <p className="text-sm text-ink-muted">
        That page does not exist. Ferdy checked.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-frog-green px-4 py-2 text-sm font-semibold text-on-green transition-colors hover:bg-frog-green-strong pointer-coarse:py-3"
      >
        Back to the log
      </Link>
    </main>
  );
}
