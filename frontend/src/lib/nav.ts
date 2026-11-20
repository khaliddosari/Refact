import {
  Bot,
  FileCheck,
  Gavel,
  LayoutDashboard,
  MapPinned,
  Warehouse,
  Workflow,
  type LucideIcon,
} from "lucide-react"

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

/**
 * Every page the app has, tab or not. Each page reads its own title and icon
 * from here, and the router serves them all, so a page that is not in
 * NAV_ITEMS below is still reachable by its path.
 */
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
  tenders: {
    to: "/tenders",
    label: "المناقصات",
    short: "مناقصات",
    icon: Gavel,
    description: "دفعات المخلفات المعروضة واحتياجات المواد، كما كتبتها المصانع وصنّفها الوكيل.",
  },
  awards: {
    to: "/awards",
    label: "الترسيات",
    icon: FileCheck,
    description: "الفرص التي رتّبها وكيل المشتريات حسب الأثر، وما استُبعد منها ولماذا.",
  },
  inventory: {
    to: "/inventory",
    label: "مخزوني",
    icon: Warehouse,
    description: "سجلات النفايات المعلنة وتصنيف الوكيل لها، وفجوات الإفصاح المتوقعة.",
  },
  operations: {
    to: "/operations",
    label: "عملياتي",
    icon: Workflow,
    description: "رحلات نقل النفايات المفحوصة، وقائمة التفتيش مرتبة حسب الخطورة.",
  },
  tracking: {
    to: "/tracking",
    label: "التتبع",
    icon: MapPinned,
    description: "مسارات المركبات والمواقع المعتمدة ورصد الطائرات المسيّرة على الخريطة.",
  },
} satisfies Record<string, NavItem>

/**
 * The header tabs, in reading order (right to left on screen).
 *
 * The first demo had six tabs, from لوحة التحكم to التتبع. Two are back
 * (لوحة التحكم and التتبع); the other four are commented out, not removed:
 * their pages and routes still work, and each comes back as a tab the moment
 * its line is uncommented. With a single tab the phone bar hides itself (see
 * mobile-tab-bar.tsx).
 */
export const NAV_ITEMS: NavItem[] = [
  PAGES.agents,
  PAGES.dashboard,
  // PAGES.tenders,
  // PAGES.awards,
  // PAGES.inventory,
  // PAGES.operations,
  PAGES.tracking,
]

/** The phone tab bar only exists when there is more than one tab to switch between. */
export const HAS_TAB_BAR = NAV_ITEMS.length > 1

export const BRAND_NAME = "ريفاكت"

export function navItemFor(pathname: string): NavItem | undefined {
  const path = pathname.replace(/\/+$/, "") || "/"
  return Object.values<NavItem>(PAGES).find((item) => item.to === path)
}
