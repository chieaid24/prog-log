import { signOut } from "@/app/actions/auth";
import { Frog } from "@/components/ui/frog";
import { LogNav } from "./nav";

export default function LogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between gap-4 border-b border-border py-4">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-sm font-bold tracking-tight text-ink">
            <Frog size={22} />
            prog-log
          </span>
          <LogNav />
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </header>
      <main className="flex-1 py-6">{children}</main>
    </div>
  );
}
