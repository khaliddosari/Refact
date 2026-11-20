import { NavLink } from "react-router"

import { NAV_ITEMS } from "@/lib/nav"
import { cn } from "@/lib/utils"

/**
 * The six tabs on a phone: a fixed forest-glass bar at the thumb, so moving
 * between tabs never needs a scroll back to the top. Below md only; from md
 * the tabs sit in the header. Labels take their short form where one exists.
 * Clears the home indicator through env(safe-area-inset-bottom), which works
 * because index.html sets viewport-fit=cover.
 */
export function MobileTabBar() {
  return (
    <nav
      aria-label="الأقسام الرئيسية"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-6 gap-0.5 rounded-2xl bg-forest p-1.5 text-forest-foreground shadow-(--forest-shadow) ring-1 ring-(--forest-edge) backdrop-blur-xl backdrop-saturate-150">
        {NAV_ITEMS.map(({ to, label, short, icon: Icon }) => (
          <li key={to} className="min-w-0">
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  // 12px, not text-xs (14px in this theme): a slot is ~48px at 360px wide
                  "flex h-14 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[0.75rem] leading-none font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-leaf",
                  isActive ? "bg-cream text-primary" : "text-forest-foreground/85 active:bg-forest-foreground/10"
                )
              }
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span className="max-w-full truncate">{short ?? label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
