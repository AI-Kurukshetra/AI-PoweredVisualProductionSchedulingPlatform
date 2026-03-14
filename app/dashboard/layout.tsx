import Link from "next/link";
import { ToasterProvider } from "@/app/components/Toaster";

const navGroups = [
  {
    label: "Foundation",
    items: [
      { href: "/dashboard", label: "Overview" },
      { href: "/dashboard/organizations", label: "Organizations" },
      { href: "/dashboard/facilities", label: "Facilities" },
      { href: "/dashboard/production-lines", label: "Production lines" },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/dashboard/machines", label: "Machines" },
      { href: "/dashboard/workers", label: "Workers" },
      { href: "/dashboard/suppliers", label: "Suppliers" },
    ],
  },
  {
    label: "Products",
    items: [
      { href: "/dashboard/products", label: "Products" },
      { href: "/dashboard/bom", label: "BOM" },
      { href: "/dashboard/inventory", label: "Inventory" },
    ],
  },
  {
    label: "Scheduling",
    items: [
      { href: "/dashboard/work-orders", label: "Work orders" },
      { href: "/dashboard/operations", label: "Operations" },
      { href: "/dashboard/scheduling", label: "Scheduling" },
      { href: "/dashboard/scheduling/visual", label: "Visual planner" },
      { href: "/dashboard/monitoring", label: "Production monitoring" },
    ],
  },
  {
    label: "Calendar",
    items: [
      { href: "/dashboard/calendar", label: "Calendar hub" },
      { href: "/dashboard/calendar/shifts", label: "Shifts" },
      { href: "/dashboard/calendar/holidays", label: "Holidays" },
      { href: "/dashboard/calendar/maintenance", label: "Maintenance" },
    ],
  },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToasterProvider>
      <div className="flex min-h-screen bg-[#f7f7f2] text-black dark:bg-[#0f0f0f] dark:text-white">
        <aside className="hidden w-72 flex-none flex-col border-r border-black/10 bg-white/80 p-6 shadow-[8px_0_24px_rgba(0,0,0,0.04)] backdrop-blur md:flex md:sticky md:top-0 md:h-screen dark:border-white/10 dark:bg-black/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/40">
                VizPlan
              </div>
              <div className="mt-2 text-lg font-semibold">Production OS</div>
            </div>
            <div className="rounded-full border border-black/10 bg-black px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white dark:border-white/10 dark:bg-white dark:text-black">
              Live
            </div>
          </div>

          <div className="mt-8 flex h-[calc(100vh-160px)] flex-col gap-4 overflow-y-auto pr-1">
            {navGroups.map((group) => (
              <details key={group.label} className="group" open>
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5">
                  <span>{group.label}</span>
                  <span className="text-black/40 transition-transform group-open:rotate-90 dark:text-white/40">
                    ›
                  </span>
                </summary>
                <nav className="mt-2 space-y-1 px-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      className="block rounded-xl px-3 py-2 text-sm font-medium text-black/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/5"
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </details>
            ))}
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-x-auto px-5 py-8 md:px-10 md:py-10">
          <div className="mb-6 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur md:hidden dark:border-white/10 dark:bg-black/40">
            <div className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
              Navigation
            </div>
            <div className="mt-3 space-y-3">
              {navGroups.map((group) => (
                <details key={group.label} className="group" open>
                  <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5">
                    <span>{group.label}</span>
                    <span className="text-black/40 transition-transform group-open:rotate-90 dark:text-white/40">
                      ›
                    </span>
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-black hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/5"
                        href={item.href}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/70 px-5 py-3 text-sm font-medium text-black shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/40 dark:text-white">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white dark:bg-white dark:text-black">
                Topnav
              </span>
              <span className="text-base font-semibold text-black dark:text-white">Production Scheduling</span>
            </div>
            <div className="flex items-center gap-3">
              {navGroups[0].items.slice(0, 3).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-black/10 px-3 py-1 text-[0.75rem] uppercase tracking-[0.25em] text-black/70 hover:border-black hover:text-black dark:border-white/20 dark:text-white/60 dark:hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          {children}
        </main>
      </div>
    </ToasterProvider>
  );
}
