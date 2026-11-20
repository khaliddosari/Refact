import {
  Anvil,
  FlaskConical,
  Flame,
  Droplet,
  Milk,
  Mountain,
  Package,
  Waves,
  type LucideIcon,
} from "lucide-react"

import type { Family, WasteClass } from "@/data/types"
import { LOCALE } from "@/lib/site"

/* Numbers: Latin digits, Arabic separators, in one place. */

const formatters = new Map<number, Intl.NumberFormat>()
export function fmt(n: number, digits = 1) {
  let f = formatters.get(digits)
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: digits })
    formatters.set(digits, f)
  }
  return f.format(n)
}

export const fmtInt = (n: number) => fmt(Math.round(n), 0)

const plural = new Intl.PluralRules("ar")

/** Arabic counts take six forms (0, 1, 2, 3–10, 11–99, 100+); the caller supplies the words. */
export function arCount(n: number, forms: Record<Intl.LDMLPluralRule, string>) {
  return forms[plural.select(n)].replace("#", fmtInt(n))
}
export const fmtSar = (n: number) => `${fmtInt(n)} ريال`
export const fmtPct = (x: number) => `${Math.round(x * 100)}%`

/** "1.2 مليون" from 1,234,567: large money reads better rounded. */
export function fmtMillions(n: number) {
  return `${fmt(n / 1_000_000, 2)} مليون`
}

const UNIT: Record<string, string> = {
  t: "طن",
  m3: "م³",
  MWh_th: "ميغاواط ساعة حرارية",
  MWh: "ميغاواط ساعة حرارية",
}
const UNIT_SHORT: Record<string, string> = {
  t: "طن",
  m3: "م³",
  MWh_th: "ميغاواط ساعة",
  MWh: "ميغاواط ساعة",
}

export function unitLabel(unit: string, short = false) {
  return (short ? UNIT_SHORT : UNIT)[unit] ?? unit
}

export function fmtQty(q: number, unit: string, short = false) {
  return `${fmt(q)} ${unitLabel(unit, short)}`
}

/* Dates and times as the data carries them ("2025-05-18 13:32"). */

export const hhmm = (ts: string) => ts.slice(11, 16)

export function dayLabel(date: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date.slice(0, 10)}T12:00:00`))
}

export function monthLabel(date: string) {
  return new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric" }).format(
    new Date(`${date.slice(0, 10)}T12:00:00`)
  )
}

export function shortDate(date: string) {
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${date.slice(0, 10)}T12:00:00`)
  )
}

/* Labels for every code the data uses. */

export const FAMILY_LABEL: Record<Family, string> = {
  plastics: "بلاستيك",
  metals: "معادن",
  paper: "ورق وكرتون",
  oils: "زيوت",
  minerals: "معادن لافلزية",
  energy: "طاقة حرارية",
  water: "مياه",
  chemicals: "كيماويات",
}

export const FAMILY_ICON: Record<Family, LucideIcon> = {
  plastics: Milk,
  metals: Anvil,
  paper: Package,
  oils: Droplet,
  minerals: Mountain,
  energy: Flame,
  water: Waves,
  chemicals: FlaskConical,
}

export const ROUTE_LABEL: Record<string, string> = {
  landfill: "ردم",
  sold: "بيع",
  hazardous_treatment: "معالجة خطرة",
  stored: "تخزين",
  discharged: "تصريف دون استفادة",
}

export const FREQUENCY_LABEL: Record<string, string> = {
  continuous: "مستمر",
  weekly: "أسبوعي",
  batch: "على دفعات",
}

export const SOURCE_LABEL: Record<string, string> = {
  import: "استيراد",
  local_virgin: "مادة أولية محلية",
  local_secondary: "مادة ثانوية محلية",
}

export const CLASS_LABEL: Record<WasteClass, string> = {
  General: "عامة",
  Industrial: "صناعية",
  Hazardous: "خطرة",
}

export const CONTAINER_LABEL: Record<string, string> = {
  drum: "براميل",
  bulk: "سائبة",
  skip: "حاوية مفتوحة",
  bag: "أكياس",
  tank: "خزان",
  box: "صناديق",
}

export const VEHICLE_TYPE_LABEL: Record<string, string> = {
  tipper: "قلاب",
  box: "صندوق مغلق",
  tanker: "صهريج",
  skip_loader: "ناقلة حاويات",
}

export const DESTINATION_LABEL: Record<string, string> = {
  landfill: "ردم",
  recycler: "مدوّر",
  treatment: "معالجة",
  buyer: "بيع لمشترٍ",
}

export const DRONE_LABEL: Record<string, string> = {
  drums: "براميل",
  liquid_stain: "بقعة سائل",
  old_dump: "كوم نفايات قديم",
  fresh_dump: "كوم نفايات جديد",
}

export const LICENSE_LABEL: Record<string, string> = {
  general: "نقل نفايات عامة",
  haz_collect_transport: "جمع ونقل النفايات الخطرة",
}

export const SERVICE_LABEL: Record<string, string> = {
  transport: "نقل",
  recycle: "تدوير",
  treat: "معالجة",
}

export const SITE_KIND_LABEL: Record<string, string> = {
  municipal_landfill: "مردم بلدي",
  recycling: "تدوير",
  compost: "تسميد",
  industrial_landfill: "مردم صناعي",
  haz_treatment: "معالجة خطرة",
  haz_cell: "خلية خطرة",
}

export function qualityLabel(q: string | null) {
  if (!q) return "—"
  if (q === "tertiary") return "معالجة ثلاثية"
  if (q === "secondary") return "ثانوية"
  return `درجة ${q}`
}

/** A route's cost reads as a cost or as income, never as a negative number. */
export function routeCostLabel(costPerUnit: number, unit: string) {
  if (costPerUnit === 0) return "بلا تكلفة"
  const per = `ريال/${unitLabel(unit, true)}`
  return costPerUnit < 0
    ? `تكلفة ${fmtInt(-costPerUnit)} ${per}`
    : `عائد ${fmtInt(costPerUnit)} ${per}`
}
