import {
  ArrowRight,
  Biohazard,
  FileWarning,
  MapPin,
  MapPinOff,
  Route,
  Scale,
  ShieldOff,
  Timer,
  Trash2,
  WifiOff,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cityName, cityShort, cityTiny } from "@/data"
import type { Family, Trip, WasteClass } from "@/data/types"
import { CLASS_LABEL, FAMILY_ICON, FAMILY_LABEL, fmt, fmtPct } from "@/lib/format"
import { cn } from "@/lib/utils"

const SEGMENT_FILLS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"]

/** What a total is made of: proportional segments, each named in its title. */
export function SegmentBar({
  segments,
  label,
  className,
}: {
  segments: { label: string; value: number; fill?: string }[]
  label: string
  className?: string
}) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0) || 1
  return (
    <div role="img" aria-label={label} className={cn("flex h-2 w-full gap-0.5 overflow-hidden rounded-full", className)}>
      {segments
        .filter((s) => s.value > 0)
        .map((s, i) => (
          <span
            key={s.label}
            title={s.label}
            className={cn("h-full first:rounded-s-full last:rounded-e-full", s.fill ?? SEGMENT_FILLS[i % SEGMENT_FILLS.length])}
            style={{ width: `${(Math.max(0, s.value) / total) * 100}%` }}
          />
        ))}
    </div>
  )
}

/** Hazardous material: the one property that always shows in red. */
export function HazardBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("h-6 gap-1 border-red-300 bg-red-50 px-2 text-xs text-red-900", className)}>
      <Biohazard aria-hidden="true" className="size-3.5!" />
      خطرة
    </Badge>
  )
}

/** A waste class. Only "hazardous" gets colour; the other two are neutral. */
export function ClassBadge({ cls, className }: { cls: WasteClass; className?: string }) {
  if (cls === "Hazardous") return <HazardBadge className={className} />
  return (
    <Badge variant="outline" className={cn("h-6 border-primary/20 bg-card px-2 text-xs text-foreground/80", className)}>
      {CLASS_LABEL[cls]}
    </Badge>
  )
}

export function FamilyIcon({ family, className }: { family: Family; className?: string }) {
  const Icon = FAMILY_ICON[family]
  return (
    <span
      title={FAMILY_LABEL[family]}
      className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary ring-1 ring-primary/10", className)}
    >
      <Icon aria-hidden="true" className="size-[1.15rem]" />
    </span>
  )
}

/**
 * A number with its label: the summary row at the top of a page. `short` is
 * the phone form of the label (three of these share a 360px row).
 */
export function MiniStat({
  icon: Icon,
  label,
  short,
  value,
  unit,
  tone = "default",
}: {
  icon: LucideIcon
  label: string
  short?: string
  value: string
  unit?: string
  tone?: "default" | "alert"
}) {
  return (
    <Card className="gap-1.5 p-3 sm:p-4" title={label}>
      <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground sm:gap-2">
        <Icon aria-hidden="true" className={cn("size-4 shrink-0", tone === "alert" ? "text-red-700" : "text-primary")} />
        {short ? (
          <>
            <span className="truncate sm:hidden">{short}</span>
            <span className="hidden truncate sm:inline">{label}</span>
          </>
        ) : (
          <span className="truncate">{label}</span>
        )}
      </p>
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span className={cn("text-2xl leading-none font-bold tabular-nums", tone === "alert" ? "text-red-800" : "text-primary")}>
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
      </p>
    </Card>
  )
}

/** A risk score against the day's highest, with the number beside it. */
export function ScoreBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const high = value >= 100
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative h-1.5 w-full min-w-12 overflow-hidden rounded-full bg-primary/10">
        <span
          className={cn("absolute inset-y-0 start-0 rounded-full", high ? "bg-red-600" : value > 0 ? "bg-blue-600" : "bg-stone-300")}
          style={{ width: `${Math.max(3, (value / max) * 100)}%` }}
        />
      </span>
      <span className={cn("w-10 shrink-0 text-end text-sm font-bold tabular-nums", high && "text-red-800")}>{fmt(value)}</span>
    </div>
  )
}

/** The industrial city a page's data comes from. */
export function CityChip({ city, className }: { city: string; className?: string }) {
  return (
    <p
      title={cityName(city)}
      className={cn(
        "flex h-10 items-center gap-2 rounded-xl bg-card px-3.5 text-sm font-medium shadow-(--glass-shadow) ring-1 ring-(--glass-edge) backdrop-blur-xl",
        className
      )}
    >
      <MapPin aria-hidden="true" className="size-4 shrink-0 text-primary" />
      <span className="truncate sm:hidden">{cityTiny(city)}</span>
      <span className="hidden truncate sm:inline">{cityShort(city)}</span>
    </p>
  )
}

/** The same city, small, for a panel's corner. */
export function CityTag({ city }: { city: string }) {
  return (
    <span title={cityName(city)} className="flex items-center gap-1 text-xs text-muted-foreground">
      <MapPin aria-hidden="true" className="size-3.5 text-primary" />
      {cityShort(city)}
    </span>
  )
}

/** Supplier to receiver, in reading order; the arrow follows the direction. */
export function PartyArrow({ from, to, className }: { from: string; to: string; className?: string }) {
  return (
    <p className={cn("flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <span className="truncate" title={from}>
        {from}
      </span>
      <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-primary rtl:rotate-180" />
      <span className="sr-only">إلى</span>
      <span className="truncate" title={to}>
        {to}
      </span>
    </p>
  )
}

/** Why a trip is suspicious, as short chips instead of sentences, worst first. */
export function tripFlags(t: Trip): { icon: LucideIcon; label: string }[] {
  const flags: { icon: LucideIcon; label: string }[] = []
  if (t.points.dumping > 0) flags.push({ icon: Trash2, label: t.droneLinked ? "رمي رصده الدرون" : "مكان رمي معروف" })
  if (t.points.weight > 0) {
    const diff = t.loaded - (t.gateNet ?? t.delivered)
    flags.push({ icon: Scale, label: diff > 0 ? `فقد ${fmt(diff)} طن` : `زيادة ${fmt(-diff)} طن` })
  }
  if (t.points.classification > 0) flags.push({ icon: FileWarning, label: "أخطر من المعلن" })
  if (t.points.site > 0) flags.push({ icon: MapPinOff, label: t.site ? "موقع لا يقبلها" : "لم تصل موقعاً" })
  if (t.points.license > 0) flags.push({ icon: ShieldOff, label: "مركبة غير مرخصة" })
  if (t.points.stop > 0) flags.push({ icon: Timer, label: `توقف ${fmt(t.stopMinutes, 0)} د` })
  if (t.points.tracker > 0) flags.push({ icon: WifiOff, label: `انقطاع ${fmt(t.trackerGapMinutes, 0)} د` })
  if (t.points.deviation > 0) flags.push({ icon: Route, label: `انحراف ${fmtPct(t.deviation)}` })
  return flags
}

export function TripFlags({ trip, max, className }: { trip: Trip; max?: number; className?: string }) {
  const flags = tripFlags(trip)
  const shown = max ? flags.slice(0, max) : flags
  const more = flags.length - shown.length
  if (flags.length === 0) return null
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} title={trip.reasons.join("؛ ")}>
      {shown.map(({ icon: Icon, label }) => (
        <li key={label} className="inline-flex h-7 items-center gap-1 rounded-lg bg-red-50 px-2 text-xs font-medium text-red-900 ring-1 ring-red-200">
          <Icon aria-hidden="true" className="size-3.5 shrink-0" />
          {label}
        </li>
      ))}
      {more > 0 && (
        <li className="inline-flex h-7 items-center rounded-lg bg-card px-2 text-xs font-medium text-muted-foreground ring-1 ring-(--glass-edge)">
          +{more}
        </li>
      )}
    </ul>
  )
}
