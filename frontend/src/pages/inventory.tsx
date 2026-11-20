import { ArrowRight, FileWarning, ListChecks, UserRoundCheck } from "lucide-react"

import { CityChip, ClassBadge, MiniStat } from "@/components/data-display"
import { PageHeader } from "@/components/page-header"
import { Panel } from "@/components/panel"
import { StatusPill, type Tone } from "@/components/status-pill"
import { COMP, facilityLabel } from "@/data"
import type { WasteRecord } from "@/data/types"
import { fmt, fmtInt, fmtPct } from "@/lib/format"
import { PAGES } from "@/lib/nav"
import { cn } from "@/lib/utils"

const HAZ_THRESHOLD = COMP.thresholds["حد التصنيف كخطرة (احتمال ≥)"] ?? 0.3
const CONFIDENT = COMP.thresholds["حد الثقة العالية (لا مراجعة بشرية ≥)"] ?? 0.7

function recordStatus(r: WasteRecord): { label: string; tone: Tone } {
  if (r.review) return { label: "مراجعة بشرية", tone: "running" }
  if (r.misdeclared) return { label: "أخطر من المعلن", tone: "malfunction" }
  return { label: "مطابق", tone: "done" }
}

/** The latest month each facility declared no hazardous waste while similar activity produces some. */
const gaps = [...new Set(COMP.generation.map((g) => g.facility))]
  .map((facility) =>
    COMP.generation
      .filter((g) => g.facility === facility && g.class === "Hazardous" && g.declared === 0 && g.expected > 0)
      .sort((a, b) => b.month.localeCompare(a.month))[0]
  )
  .filter(Boolean)

export default function InventoryPage() {
  const item = PAGES.inventory
  const records = [...COMP.records].sort(
    (a, b) => Number(b.misdeclared) - Number(a.misdeclared) || b.pHazardous - a.pHazardous
  )
  const max = Math.max(...gaps.map((g) => g!.expected))

  return (
    <>
      <PageHeader icon={item.icon} title={item.label} actions={<CityChip city={COMP.city} />} />

      <div className="mb-5 grid grid-cols-3 gap-3 sm:gap-4">
        <MiniStat icon={ListChecks} label="سجلات" value={fmtInt(COMP.records.length)} />
        <MiniStat icon={FileWarning} tone="alert" label="أخطر من المعلن" short="أخطر" value={fmtInt(COMP.records.filter((r) => r.misdeclared).length)} />
        <MiniStat icon={UserRoundCheck} label="مراجعة بشرية" short="مراجعة" value={fmtInt(COMP.records.filter((r) => r.review).length)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <Panel title="تصنيف الوكيل" bodyClassName="gap-2">
          <ul className="flex flex-col gap-2">
            {records.map((r) => (
              <RecordRow key={r.id} record={r} />
            ))}
          </ul>
        </Panel>

        <Panel title="نفايات خطرة غير معلنة" aside={<StatusPill label={fmtInt(gaps.length)} tone="malfunction" />} bodyClassName="gap-4">
          {gaps.map((g) => (
            <div key={g!.facility}>
              <p className="truncate text-sm font-bold" title={facilityLabel(g!.facility)}>
                {facilityLabel(g!.facility)}
              </p>
              <div className="mt-2 flex flex-col gap-1.5 text-xs">
                <GapBar label="معلن" value={g!.declared} max={max} fill="bg-chart-1" />
                <GapBar label="متوقع" value={g!.expected} max={max} fill="bg-red-500" />
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </>
  )
}

function RecordRow({ record: r }: { record: WasteRecord }) {
  const status = recordStatus(r)
  return (
    <li
      className={cn(
        "flex flex-col gap-2.5 rounded-xl bg-card p-3 ring-1 sm:flex-row sm:items-center sm:gap-4",
        r.misdeclared && !r.review ? "ring-red-200" : "ring-(--glass-edge)"
      )}
    >
      <p className="line-clamp-2 min-w-0 flex-1 text-sm font-bold sm:line-clamp-1" dir="auto" title={`${r.text} · ${facilityLabel(r.facility)}`}>
        {r.text}
      </p>
      {/* On a phone the classes and the probability share one row, the status pill ends it. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:contents">
        <div className="flex shrink-0 items-center gap-1.5">
          <ClassBadge cls={r.declared} />
          <ArrowRight aria-hidden="true" className="size-3.5 text-muted-foreground rtl:rotate-180" />
          <ClassBadge cls={r.predicted} />
        </div>
        <Probability p={r.pHazardous} />
        <StatusPill label={status.label} tone={status.tone} className="max-sm:ms-auto sm:w-32 sm:justify-center" />
      </div>
    </li>
  )
}

/** Probability the waste is hazardous, with both thresholds marked on the track. */
function Probability({ p }: { p: number }) {
  return (
    <div className="flex w-28 shrink-0 items-center gap-2 sm:w-36" title="احتمال أن تكون خطرة">
      <span
        className="relative h-2 flex-1 rounded-full bg-primary/10"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(p * 100)}
        aria-label="احتمال أن تكون خطرة"
      >
        <span
          className={cn("absolute inset-y-0 start-0 rounded-full", p >= CONFIDENT ? "bg-red-600" : p >= HAZ_THRESHOLD ? "bg-blue-600" : "bg-green-600")}
          style={{ width: `${p * 100}%` }}
        />
        {[HAZ_THRESHOLD, CONFIDENT].map((t) => (
          <span key={t} aria-hidden="true" className="absolute -inset-y-0.5 w-0.5 rounded-full bg-foreground/40" style={{ insetInlineStart: `${t * 100}%` }} />
        ))}
      </span>
      <span className={cn("w-9 shrink-0 text-end text-sm font-bold tabular-nums", p >= HAZ_THRESHOLD && "text-red-800")}>{fmtPct(p)}</span>
    </div>
  )
}

function GapBar({ label, value, max, fill }: { label: string; value: number; max: number; fill: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-muted-foreground">{label}</span>
      <span className="relative h-2.5 flex-1 rounded-full bg-primary/8">
        <span className={cn("absolute inset-y-0 start-0 rounded-full", fill)} style={{ width: `${(value / max) * 100}%` }} />
      </span>
      <span className="w-14 shrink-0 text-end font-bold tabular-nums">{fmt(value)} طن</span>
    </span>
  )
}
