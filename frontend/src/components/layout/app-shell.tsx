import { useEffect } from "react"
import { Outlet, ScrollRestoration, useLocation } from "react-router"

import { MobileTabBar } from "@/components/layout/mobile-tab-bar"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { BRAND_NAME, HAS_TAB_BAR, navItemFor } from "@/lib/nav"
import { cn } from "@/lib/utils"

/**
 * Header, the current tab's page, footer. The footer sits at the bottom even on
 * a short page.
 *
 * From desk (a wide window that is also tall enough) the shell is exactly the
 * window: the page fills what the header and footer leave and nothing scrolls,
 * so a page sheds rows instead of growing. Below that the page scrolls as usual.
 */
export function AppShell() {
  const { pathname } = useLocation()

  useEffect(() => {
    const item = navItemFor(pathname)
    document.title = item
      ? `${item.label} · ${BRAND_NAME}`
      : `الصفحة غير موجودة · ${BRAND_NAME}`
  }, [pathname])

  return (
    // pb on phones keeps the footer clear of the fixed tab bar (when there is one)
    <div
      className={cn(
        "flex min-h-dvh flex-col desk:h-dvh desk:min-h-0 desk:overflow-hidden",
        HAS_TAB_BAR && "pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0"
      )}
    >
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
      <main id="main" className="mx-auto flex w-full max-w-[112rem] flex-1 flex-col px-3 py-6 sm:px-4 lg:py-8 desk:min-h-0 desk:py-3">
        <Outlet />
      </main>
      <SiteFooter />
      <MobileTabBar />
      <ScrollRestoration />
    </div>
  )
}
