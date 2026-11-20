import { createBrowserRouter } from "react-router"

import { AppShell } from "@/components/layout/app-shell"
import DashboardPage from "@/pages/dashboard"
import InventoryPage from "@/pages/inventory"
import NotFoundPage from "@/pages/not-found"
import OperationsPage from "@/pages/operations"
import TendersPage from "@/pages/tenders"

/**
 * One route per header tab (paths match NAV_ITEMS in lib/nav.ts). The two
 * map screens load on demand, so Leaflet is only fetched when a map is.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppShell,
    // Shown for the moment a direct visit waits on a lazy map screen; the wash
    // behind is enough, so it renders nothing.
    HydrateFallback: () => null,
    children: [
      { index: true, Component: DashboardPage },
      { path: "tenders", Component: TendersPage },
      { path: "awards", lazy: async () => ({ Component: (await import("@/pages/awards")).default }) },
      { path: "inventory", Component: InventoryPage },
      { path: "operations", Component: OperationsPage },
      { path: "tracking", lazy: async () => ({ Component: (await import("@/pages/tracking")).default }) },
      { path: "*", Component: NotFoundPage },
    ],
  },
])
