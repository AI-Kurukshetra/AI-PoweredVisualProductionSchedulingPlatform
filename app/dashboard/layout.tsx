import Link from "next/link";
import { ToasterProvider } from "@/app/components/Toaster";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countOpenAlerts } from "@/lib/services/alerts";
import { SidebarNav, type NavGroup } from "./SidebarNav";

const navGroups: NavGroup[] = [
  {
    label: "Dashboards",
    defaultOpen: true,
    items: [
      { href: "/dashboard/kpi", label: "KPI dashboard", tag: "new" },
      { href: "/dashboard/monitoring", label: "Production monitoring", tag: "live" },
      { href: "/dashboard/exceptions", label: "Exceptions", tag: "alerts" },
    ],
  },
  {
    label: "Foundation",
    defaultOpen: true,
    items: [
      { href: "/dashboard/organizations", label: "Organizations" },
      { href: "/dashboard/facilities", label: "Facilities" },
      { href: "/dashboard/production-lines", label: "Production lines" },
    ],
  },
  {
    label: "Resources",
    defaultOpen: true,
    items: [
      { href: "/dashboard/machines", label: "Machines" },
      { href: "/dashboard/workers", label: "Workers" },
      { href: "/dashboard/suppliers", label: "Suppliers" },
    ],
  },
  {
    label: "Products",
    defaultOpen: true,
    items: [
      { href: "/dashboard/products", label: "Products" },
      { href: "/dashboard/bom", label: "BOM" },
      { href: "/dashboard/inventory", label: "Inventory" },
    ],
  },
  {
    label: "Planning",
    defaultOpen: false,
    items: [
      { href: "/dashboard/work-orders", label: "Work orders" },
      { href: "/dashboard/operations", label: "Operations" },
      { href: "/dashboard/scheduling", label: "Scheduling" },
      { href: "/dashboard/scheduling/visual", label: "Visual planner" },
      { href: "/dashboard/scenarios", label: "Scenario planning" },
    ],
  },
  {
    label: "Calendar",
    defaultOpen: false,
    items: [
      { href: "/dashboard/calendar", label: "Calendar hub" },
      { href: "/dashboard/calendar/shifts", label: "Shifts" },
      { href: "/dashboard/calendar/holidays", label: "Holidays" },
      { href: "/dashboard/calendar/maintenance", label: "Maintenance" },
    ],
  },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const openAlerts = user ? await countOpenAlerts(supabase) : 0;

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
            <SidebarNav navGroups={navGroups} openAlerts={openAlerts} variant="desktop" />
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-x-auto px-5 py-8 md:px-10 md:py-10">
          <div className="mb-6 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur md:hidden dark:border-white/10 dark:bg-black/40">
            <div className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
              Navigation
            </div>
            <SidebarNav navGroups={navGroups} openAlerts={openAlerts} variant="mobile" />
          </div>
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/70 px-5 py-3 text-sm font-medium text-black shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/40 dark:text-white">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white dark:bg-white dark:text-black">
                Topnav
              </span>
              <span className="text-base font-semibold text-black dark:text-white">Control tower</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/kpi"
                className="rounded-full border border-black/10 px-3 py-1 text-[0.75rem] uppercase tracking-[0.25em] text-black/70 hover:border-black hover:text-black dark:border-white/20 dark:text-white/60 dark:hover:text-white"
              >
                KPI
              </Link>
              <Link
                href="/dashboard/monitoring"
                className="rounded-full border border-black/10 px-3 py-1 text-[0.75rem] uppercase tracking-[0.25em] text-black/70 hover:border-black hover:text-black dark:border-white/20 dark:text-white/60 dark:hover:text-white"
              >
                Monitoring
              </Link>
              <Link
                href="/dashboard/inventory"
                className="rounded-full border border-black/10 px-3 py-1 text-[0.75rem] uppercase tracking-[0.25em] text-black/70 hover:border-black hover:text-black dark:border-white/20 dark:text-white/60 dark:hover:text-white"
              >
                Inventory
              </Link>
              <Link
                href="/dashboard/exceptions"
                className="relative rounded-full border border-black/10 px-3 py-1 text-[0.75rem] uppercase tracking-[0.25em] text-black/70 hover:border-black hover:text-black dark:border-white/20 dark:text-white/60 dark:hover:text-white"
              >
                Exceptions
                {openAlerts ? (
                  <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                    {openAlerts}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
          {children}
        </main>
      </div>
    </ToasterProvider>
  );
}
