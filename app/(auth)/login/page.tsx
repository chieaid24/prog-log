"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { requestMagicLink } from "@/app/actions/auth";
import { Frog } from "@/components/ui/frog";

type SendState = { status: "idle" | "sending" | "sent" } | { status: "error"; message: string };

function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SendState>({ status: "idle" });
  const searchParams = useSearchParams();
  const confirmError = searchParams.get("error");

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setState({ status: "sending" });
    const result = await requestMagicLink(new FormData(event.currentTarget as HTMLFormElement));
    if (!result.ok) {
      setState({ status: "error", message: result.error });
    } else {
      setState({ status: "sent" });
    }
  }

  if (state.status === "sent") {
    return (
      <div className="text-center" role="status">
        <p className="text-2xl">Check your inbox</p>
        <p className="mt-2 text-sm text-ink-muted">
          A sign-in link is on its way to <span className="text-ink">{email}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={sendLink} className="flex flex-col gap-4">
      <label htmlFor="email" className="text-sm text-ink-muted">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoFocus
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-ink placeholder:text-ink-faint focus:border-frog-green pointer-coarse:py-3"
      />
      <button
        type="submit"
        disabled={state.status === "sending"}
        className="rounded-lg bg-frog-green px-4 py-2 text-sm font-semibold text-on-green transition-colors enabled:hover:bg-frog-green-strong disabled:bg-surface-sunken disabled:text-ink-faint pointer-coarse:py-3"
      >
        {state.status === "sending" ? "Sending…" : "Send magic link"}
      </button>
      {state.status === "error" && (
        <p className="text-sm text-danger-red" role="alert">
          {state.message}
        </p>
      )}
      {confirmError && state.status === "idle" && (
        <p className="text-sm text-danger-red" role="alert">
          Sign-in link was invalid or expired. Request a new one.
        </p>
      )}
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
        <div className="mb-1 flex items-center gap-2.5">
          <Frog size={28} />
          <h1 className="text-lg font-semibold text-ink">prog-log</h1>
        </div>
        <p className="mb-6 text-sm text-ink-muted">Sign in with a magic link.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
