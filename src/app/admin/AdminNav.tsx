"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/specialties", label: "Specialități" },
  { href: "/admin/doctors", label: "Medici" },
  { href: "/admin/procedures", label: "Proceduri" },
  { href: "/admin/users", label: "Utilizatori" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-1 shadow-card">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:bg-surface-muted",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
