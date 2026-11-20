import { createBrowserRouter } from "react-router"

import { AppShell } from "@/components/layout/app-shell"
import AgentsPage from "@/pages/agents"
import DashboardPage from "@/pages/dashboard"
import NotFoundPage from "@/pages/not-found"

/**
 * One route per page (paths match PAGES in lib/nav.ts). The tracking screen
 * loads on demand, so the map library is only fetched when a map is.
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
      { path: "tracking", lazy: async () => ({ Component: (await import("@/pages/tracking")).default }) },
      { path: "*", Component: NotFoundPage },
    ],
  },
])
