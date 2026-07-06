"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Log" },
  { href: "/monthly", label: "Monthly" },
  { href: "/projects", label: "Projects" },
  { href: "/settings", label: "Settings" },
];

// Quiet top nav (DESIGN.md): sans labels in ink-muted, the active item in ink
// with a frog-green underline. No boxed chrome, no pills.
export function LogNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex items-center gap-4">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative px-0.5 py-1.5 text-sm transition-colors ${
              active
                ? "font-medium text-ink after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-frog-green"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
