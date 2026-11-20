import {
  FileCheck,
  Gavel,
  LayoutDashboard,
  MapPinned,
  Warehouse,
  Workflow,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  /** Route path. "/" is the dashboard. */
  to: string
  /** The tab label in the header. */
  label: string
  /** Short form for the phone tab bar, where a slot is ~54px at 360px wide. */
  short?: string
  icon: LucideIcon
  /** One line under the page title. */
  description: string
}

/** The six header tabs, in reading order (right to left on screen). */
export const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "لوحة التحكم",
    short: "اللوحة",
    icon: LayoutDashboard,
    description: "ملخص التكافل الصناعي والامتثال في المدينتين، كما يحسبه وكلاء حكيم.",
  },
  {
    to: "/tenders",
    label: "المناقصات",
    short: "مناقصات",
    icon: Gavel,
    description: "دفعات المخلفات المعروضة واحتياجات المواد، كما كتبتها المصانع وصنّفها الوكيل.",
  },
  {
    to: "/awards",
    label: "الترسيات",
    icon: FileCheck,
    description: "الفرص التي رتّبها وكيل المطابقة حسب الأثر، وما استُبعد منها ولماذا.",
  },
  {
    to: "/inventory",
    label: "مخزوني",
    icon: Warehouse,
    description: "سجلات النفايات المعلنة وتصنيف الوكيل لها، وفجوات الإفصاح المتوقعة.",
  },
  {
    to: "/operations",
    label: "عملياتي",
    icon: Workflow,
    description: "رحلات نقل النفايات المفحوصة، وقائمة التفتيش مرتبة حسب الخطورة.",
  },
  {
    to: "/tracking",
    label: "التتبع",
    icon: MapPinned,
    description: "مسارات المركبات والمواقع المعتمدة ورصد الطائرات المسيّرة على الخريطة.",
  },
]

export const BRAND_NAME = "حكيم"

export function navItemFor(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/"
  return NAV_ITEMS.find((item) => item.to === path)
}
