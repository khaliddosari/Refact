import { createBrowserRouter } from "react-router"

import { AppShell } from "@/components/layout/app-shell"
import AgentsPage from "@/pages/agents"
import DashboardPage from "@/pages/dashboard"
import InventoryPage from "@/pages/inventory"
import NotFoundPage from "@/pages/not-found"
import OperationsPage from "@/pages/operations"
import TendersPage from "@/pages/tenders"

/**
 * One route per page (paths match PAGES in lib/nav.ts). The home page is the
 * agents tab; the six earlier tabs are commented out of NAV_ITEMS but their
 * routes still work. The two map screens load on demand, so the map library
 * is only fetched when a map is.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppShell,
    // Shown for the moment a direct visit waits on a lazy map screen; the wash
    // behind is enough, so it renders nothing.
    HydrateFallback: () => null,
    children: [
      { index: true, Component: AgentsPage },
      { path: "dashboard", Component: DashboardPage },
      { path: "tenders", Component: TendersPage },
      { path: "awards", lazy: async () => ({ Component: (await import("@/pages/awards")).default }) },
      { path: "inventory", Component: InventoryPage },
      { path: "operations", Component: OperationsPage },
      { path: "tracking", lazy: async () => ({ Component: (await import("@/pages/tracking")).default }) },
      { path: "*", Component: NotFoundPage },
    ],
  },
])
