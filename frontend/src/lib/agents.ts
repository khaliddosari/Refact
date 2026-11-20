import { PackageSearch, Radar, ScanSearch, type LucideIcon } from "lucide-react"

import type { Tone } from "@/components/status-pill"

export type AgentInfo = {
  name: string
  /** One line on what the agent does. */
  goal: string
  icon: LucideIcon
  status: { label: string; tone: Tone }
}

/**
 * The three agents, defined once so the الوكلاء tab and the dashboard always
 * call them the same thing, with the same icon and status.
 */
export const AGENT_INFO = {
  procurement: {
    name: "وكيل المشتريات",
    goal: "يؤمّن المواد الخام من مخلفات مصانع مجاورة",
    icon: PackageSearch,
    status: { label: "يعمل", tone: "running" },
  },
  classification: {
    name: "وكيل التصنيف",
    goal: "يصنّف المخلفات ويكشف الخطرة غير المعلنة",
    icon: ScanSearch,
    status: { label: "اكتمل", tone: "done" },
  },
  tracking: {
    name: "وكيل التتبع",
    goal: "يتتبع شاحنات النقل ويكشف المخالفات",
    icon: Radar,
    status: { label: "تنبيه", tone: "malfunction" },
  },
} satisfies Record<string, AgentInfo>
