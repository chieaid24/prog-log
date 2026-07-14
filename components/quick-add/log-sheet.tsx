"use client";

// Mobile capture (ADR-0015): on phones the quick-add card leaves the flow and
// becomes a floating "Log" button opening a bottom sheet, so capture is
// thumb-reachable from anywhere on the page. Native <dialog> supplies the
// focus trap, Escape handling and top layer; the sheet shape and slide-up
// live in globals.css (.log-sheet). The form inside is the same QuickAddForm
// as the desktop aside; behavior is untouched.
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/types";
import { QuickAddForm } from "./quick-add-form";

export function LogSheet({ projects }: { projects: Project[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [logged, setLogged] = useState(false);

  // The confirmation chip outlives the closed sheet, then clears itself.
  useEffect(() => {
    if (!logged) return;
    const timer = setTimeout(() => setLogged(false), 2500);
    return () => clearTimeout(timer);
  }, [logged]);

  function open() {
    setLogged(false);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function onLogged() {
    close();
    setLogged(true);
  }

  // Light dismiss: a click on the backdrop (the dialog element itself, not
  // its children) closes the sheet.
  function onBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) close();
  }

  // showModal() makes the page inert but Chromium still parks focus on
  // <body> for one Tab press at the cycle edge, leaving no visible focus.
  // Wrap explicitly instead.
  function onKeyDown(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = [
      ...dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={open}
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-frog-green text-on-green shadow-overlay transition-colors hover:bg-frog-green-strong md:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <svg
          viewBox="0 0 11 11"
          width={22}
          height={22}
          shapeRendering="crispEdges"
          aria-hidden="true"
          className="pixel-art"
        >
          <rect x={4} y={1} width={3} height={9} fill="currentColor" />
          <rect x={1} y={4} width={9} height={3} fill="currentColor" />
        </svg>
        <span className="sr-only">Log today&apos;s work</span>
      </button>

      <div aria-live="polite">
        {logged && (
          <p className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 rounded-full bg-frog-green-soft px-4 py-2 text-sm font-medium text-frog-green-strong shadow-overlay md:bottom-[max(1.5rem,env(safe-area-inset-bottom))]">
            Logged.
          </p>
        )}
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Log today"
        className="log-sheet"
        onClick={onBackdropClick}
        onKeyDown={onKeyDown}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Log today</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="tap rounded-lg px-2 py-1 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            &#x2715;
          </button>
        </div>
        <QuickAddForm projects={projects} onLogged={onLogged} />
      </dialog>
    </div>
  );
}
