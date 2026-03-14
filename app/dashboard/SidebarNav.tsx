"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type NavItem = { href: string; label: string; tag?: "live" | "new" | "alerts" };
export type NavGroup = { label: string; defaultOpen?: boolean; items: NavItem[] };

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (pathname.startsWith(href.endsWith("/") ? href : `${href}/`)) return true;
  return false;
}

function ItemTag({ tag, openAlerts }: { tag?: NavItem["tag"]; openAlerts: number }) {
  if (tag === "live") {
    return (
      <span className="shrink-0 rounded-full bg-emerald-600/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
        Live
      </span>
    );
  }
  if (tag === "new") {
    return (
      <span className="shrink-0 rounded-full bg-indigo-600/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200">
        New
      </span>
    );
  }
  if (tag === "alerts" && openAlerts) {
    return (
      <span className="shrink-0 rounded-full bg-red-600 px-2 py-1 text-[0.65rem] font-semibold text-white">
        {openAlerts}
      </span>
    );
  }
  return null;
}

export function SidebarNav({
  navGroups,
  openAlerts,
  variant,
}: {
  navGroups: NavGroup[];
  openAlerts: number;
  variant: "desktop" | "mobile";
}) {
  const pathname = usePathname() ?? "";
  const [openByGroup, setOpenByGroup] = useState<Record<string, boolean>>(() => {
    const entries = navGroups.map((group) => {
      const hasActive = group.items.some((item) => isActivePath(pathname, item.href));
      return [group.label, Boolean(group.defaultOpen || hasActive)] as const;
    });
    return Object.fromEntries(entries);
  });

  if (variant === "mobile") {
    return (
      <div className="mt-3 space-y-3">
        {navGroups.map((group) => {
          const hasActive = group.items.some((item) => isActivePath(pathname, item.href));
          return (
            <details
              key={group.label}
              className="group"
              open={openByGroup[group.label] ?? Boolean(group.defaultOpen || hasActive)}
              onToggle={(e) => {
                const nextOpen = (e.currentTarget as HTMLDetailsElement).open;
                setOpenByGroup((prev) => ({ ...prev, [group.label]: nextOpen }));
              }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5">
                <span>{group.label}</span>
                <span className="text-black/40 transition-transform group-open:rotate-90 dark:text-white/40">
                  ›
                </span>
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      className={[
                        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                        active
                          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                          : "border-black/10 bg-white text-black hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/5",
                      ].join(" ")}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                    >
                      <span>{item.label}</span>
                      <ItemTag tag={item.tag} openAlerts={openAlerts} />
                    </Link>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-8 flex h-[calc(100vh-160px)] flex-col gap-4 overflow-y-auto pr-1">
      {navGroups.map((group) => {
        const hasActive = group.items.some((item) => isActivePath(pathname, item.href));
        return (
          <details
            key={group.label}
            className="group"
            open={openByGroup[group.label] ?? Boolean(group.defaultOpen || hasActive)}
            onToggle={(e) => {
              const nextOpen = (e.currentTarget as HTMLDetailsElement).open;
              setOpenByGroup((prev) => ({ ...prev, [group.label]: nextOpen }));
            }}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5">
              <span>{group.label}</span>
              <span className="text-black/40 transition-transform group-open:rotate-90 dark:text-white/40">
                ›
              </span>
            </summary>
            <nav className="mt-2 space-y-1 px-1">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    className={[
                      "relative flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                        : "text-black/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/5",
                    ].join(" ")}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                  >
                    {active ? (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-white/80 dark:bg-black/80" />
                    ) : null}
                    <span className="min-w-0 truncate">{item.label}</span>
                    <ItemTag tag={item.tag} openAlerts={openAlerts} />
                  </Link>
                );
              })}
            </nav>
          </details>
        );
      })}
    </div>
  );
}
