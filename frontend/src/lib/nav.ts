import { Bot, LayoutDashboard, MapPinned, type LucideIcon } from "lucide-react"

export type NavItem = {
  /** Route path. "/" is the agents page. */
  to: string
  /** The tab label in the header. */
  label: string
  /** Short form for the phone tab bar, where a slot is ~54px at 360px wide. */
  short?: string
  icon: LucideIcon
  /** One line under the page title. */
  description: string
}

/** Every page the app has. Each page reads its own title and icon from here. */
export const PAGES = {
  agents: {
    to: "/",
    label: "الوكلاء",
    icon: Bot,
    description: "وكلاء ريفاكت الثلاثة: ما يعمل كل واحد منهم الآن وأهم ما وجده.",
  },
  dashboard: {
    to: "/dashboard",
    label: "لوحة التحكم",
    short: "اللوحة",
    icon: LayoutDashboard,
    description: "ملخص التكافل الصناعي والامتثال في المدينتين، كما يحسبه وكلاء ريفاكت.",
  },
  tracking: {
    to: "/tracking",
    label: "التتبع",
    icon: MapPinned,
    description: "مسارات المركبات والمواقع المعتمدة ورصد الطائرات المسيّرة على الخريطة.",
  },
} satisfies Record<string, NavItem>

/**
 * The header tabs, in reading order: the first is at the right on screen, so
 * الوكلاء sits in the middle, لوحة التحكم at its right and التتبع at its left.
 */
export const NAV_ITEMS: NavItem[] = [PAGES.dashboard, PAGES.agents, PAGES.tracking]

/** The phone tab bar only exists when there is more than one tab to switch between. */
export const HAS_TAB_BAR = NAV_ITEMS.length > 1

export const BRAND_NAME = "ريفاكت"

export function navItemFor(pathname: string): NavItem | undefined {
  const path = pathname.replace(/\/+$/, "") || "/"
  return Object.values<NavItem>(PAGES).find((item) => item.to === path)
}
