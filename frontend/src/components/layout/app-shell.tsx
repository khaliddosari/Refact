import { useEffect } from "react"
import { Outlet, ScrollRestoration, useLocation } from "react-router"

import { MobileTabBar } from "@/components/layout/mobile-tab-bar"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { BRAND_NAME, navItemFor } from "@/lib/nav"

/** Header, the current tab's page, footer. The footer sits at the bottom even on a short page. */
export function AppShell() {
  const { pathname } = useLocation()

  useEffect(() => {
    const item = navItemFor(pathname)
    document.title = item
      ? `${item.label} · ${BRAND_NAME}`
      : `الصفحة غير موجودة · ${BRAND_NAME}`
  }, [pathname])

  return (
    // pb on phones keeps the footer clear of the fixed tab bar
    <div className="flex min-h-dvh flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <a
        href="#main"
        className="sr-only z-50 rounded-xl bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        انتقل إلى المحتوى
      </a>
      <SiteHeader />
      {/* Same width and side padding as the header and footer bars, so every
          panel edge lines up with theirs. A flex column, so a page can let
          its last block grow down to the footer. */}
      <main id="main" className="mx-auto flex w-full max-w-[112rem] flex-1 flex-col px-3 py-6 sm:px-4 lg:py-8">
        <Outlet />
      </main>
      <SiteFooter />
      <MobileTabBar />
      <ScrollRestoration />
    </div>
  )
}
