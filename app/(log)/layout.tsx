import { signOut } from "@/app/actions/auth";
import { Frog } from "@/components/ui/frog";
import { LogNav, TabBar } from "./nav";

export default function LogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>
      <header className="flex items-center justify-between gap-4 border-b border-border py-3 md:py-4">
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
            className="tap rounded-lg px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </header>
      {/* Bottom padding clears the fixed tab bar (plus the home indicator)
          on phones; from md up the tab bar is gone. */}
      <main
        id="main"
        className="flex-1 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6"
      >
        {children}
      </main>
      <TabBar />
    </div>
  );
}
