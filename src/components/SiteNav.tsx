"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Morning Brief" },
  { href: "/weekend", label: "Weekend Fun" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:pt-5">
      <nav
        aria-label="Site"
        className="card mx-auto flex w-full max-w-md p-1 sm:w-auto"
      >
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 rounded-xl px-4 py-2 text-center text-sm font-medium transition sm:flex-none sm:px-5 ${
                active
                  ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-[var(--muted)] hover:bg-white/5 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
