import { useEffect, useRef } from "react"
import { NavLink, useLocation } from "react-router"

import { useScrollFade } from "@/hooks/use-scroll-fade"
import { NAV_ITEMS } from "@/lib/nav"
import { cn } from "@/lib/utils"

/**
 * The six tabs. Plain links with aria-current (they change the page), styled
 * as tabs: the current one is a cream pill on the forest header, so where you
 * are is never in doubt.
 *
 * Centred in the header from lg up. Below that it is its own row, which
 * scrolls sideways on a phone; the edge that still hides tabs fades, and the
 * current tab is scrolled into view after every navigation.
 */
export function SiteNav({ className }: { className?: string }) {
  const listRef = useRef<HTMLUListElement>(null)
  const fade = useScrollFade(listRef)
  const { pathname } = useLocation()

  useEffect(() => {
    const list = listRef.current
    if (!list || list.scrollWidth <= list.clientWidth) return
    const current = list.querySelector<HTMLElement>('[aria-current="page"]')
    if (!current) return
    // Scroll only the row, never the page: scrollIntoView would move both.
    const row = list.getBoundingClientRect()
    const tab = current.getBoundingClientRect()
    const offset = tab.left + tab.width / 2 - (row.left + row.width / 2)
    list.scrollBy({ left: offset, behavior: "smooth" })
  }, [pathname])

  return (
    <nav aria-label="الأقسام الرئيسية" className={cn("min-w-0", className)}>
      <ul
        ref={listRef}
        {...fade}
        // px-1/py-1 keep focus rings inside the scroller's clip; scroll-px-1
        // makes snapping respect that padding, so the row rests at 0.
        className="scrollbar-none -mx-1 flex snap-x snap-mandatory scroll-px-1 justify-center-safe gap-1 overflow-x-auto px-1 py-1"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="shrink-0 snap-start">
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium whitespace-nowrap transition-colors lg:h-9 lg:px-3 xl:px-3.5",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
                  isActive
                    ? "bg-cream text-primary shadow-[0_1px_2px_oklch(0.2_0.05_162/0.35)]"
                    : "text-forest-foreground/90 hover:bg-forest-foreground/10 hover:text-forest-foreground"
                )
              }
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
