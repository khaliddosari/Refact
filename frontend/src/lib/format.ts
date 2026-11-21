import type { WasteClass } from "@/data/types"
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

export const fmtSar = (n: number) => `${fmtInt(n)} ريال`

export const fmtPct = (x: number) => `${Math.round(x * 100)}%`

/** A driving time: "16 د", or "2 س 15 د" from an hour up. */
export function fmtDrive(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${fmtInt(minutes)} د`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${fmtInt(hours)} س` : `${fmtInt(hours)} س ${fmtInt(rest)} د`
}

/* Times as the data carries them ("2025-05-18 13:32"). */

export const hhmm = (ts: string) => ts.slice(11, 16)

/* Labels for the codes the screens show. */

export const CLASS_LABEL: Record<WasteClass, string> = {
  General: "عامة",
  Industrial: "صناعية",
  Hazardous: "خطرة",
}

export const DRONE_LABEL: Record<string, string> = {
  drums: "براميل",
  liquid_stain: "بقعة سائل",
  old_dump: "كوم نفايات قديم",
  fresh_dump: "كوم نفايات جديد",
}
