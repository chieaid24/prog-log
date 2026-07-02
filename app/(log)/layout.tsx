import { signOut } from "@/app/actions/auth";
import { LogNav } from "./nav";

export default function LogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between gap-4 border-b border-line py-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-widest text-foreground">
            prog<span className="text-accent">-</span>log
          </span>
          <LogNav />
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg px-3 py-1.5 text-sm text-faint transition-colors hover:bg-panel-raised hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </header>
      <main className="flex-1 py-6">{children}</main>
    </div>
  );
}
