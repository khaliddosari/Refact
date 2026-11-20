import { Building2 } from "lucide-react"

import { Logo } from "@/components/brand/logo"
import { SiteNav } from "@/components/layout/site-nav"
import { CURRENT_USER } from "@/lib/site"

/**
 * The forest-green glass bar: logo at the start (right, in Arabic), tabs in
 * the true centre, and on wide screens the signed-in factory at the end.
 *
 * Three equal-share columns keep the tabs centred on the page rather than in
 * the space left over. Below lg the tabs drop to their own row, and the
 * header stops being sticky: pinning two rows of a phone screen to show a
 * logo is a bad trade.
 */
export function SiteHeader() {
  return (
    <header className="relative z-40 px-3 pt-3 sm:px-4 lg:sticky lg:top-0 lg:pt-4">
      <div className="mx-auto max-w-[112rem] rounded-2xl bg-forest text-forest-foreground shadow-(--forest-shadow) ring-1 ring-(--forest-edge) backdrop-blur-xl backdrop-saturate-150">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 px-3 py-2.5 sm:px-4 lg:grid-cols-[1fr_auto_1fr]">
          <Logo className="justify-self-start" />
          {/* Phones get the tabs in the bottom bar instead (MobileTabBar). */}
          <SiteNav className="order-last col-span-2 max-md:hidden lg:order-none lg:col-span-1" />
          <UserBadge />
        </div>
      </div>
    </header>
  )
}

/**
 * Who is signed in (the team the agents' results are addressed to, and who
 * "my" means in the hidden مخزوني and عملياتي pages). Information, not a menu.
 * From xl only: below that a full set of six tabs needs the row. It fills its
 * column and truncates, so it can never spill into the tabs.
 */
function UserBadge() {
  return (
    <div className="hidden min-w-0 items-center justify-end gap-2.5 xl:flex">
      <div className="min-w-0 text-end leading-tight">
        <p className="truncate text-sm font-medium" title={CURRENT_USER.name}>
          {CURRENT_USER.name}
        </p>
        <p className="truncate text-xs text-forest-muted" title={CURRENT_USER.detail}>
          {CURRENT_USER.detail}
        </p>
      </div>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-forest-foreground/10 ring-1 ring-forest-foreground/15">
        <Building2 aria-hidden="true" className="size-[1.1rem]" />
      </span>
    </div>
  )
}
