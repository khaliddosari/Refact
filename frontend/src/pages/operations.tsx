import { Map as MapIcon, ShieldAlert, Truck, UserRoundCheck } from "lucide-react"
import { Link } from "react-router"

import { CityChip, MiniStat, ScoreBar, TripFlags } from "@/components/data-display"
import { PageHeader } from "@/components/page-header"
import { Panel } from "@/components/panel"
import { StatusPill } from "@/components/status-pill"
import { buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { COMP, MAX_TRIP_SCORE, caseByTrip, suspiciousTrips, tripsByRisk } from "@/data"
import type { Trip } from "@/data/types"
import { fmt, fmtInt } from "@/lib/format"
import { PAGES } from "@/lib/nav"
import { cn } from "@/lib/utils"

export default function OperationsPage() {
  const item = PAGES.operations
  return (
    <>
      <PageHeader icon={item.icon} title={item.label} actions={<CityChip city={COMP.city} />} />

      <div className="mb-5 grid grid-cols-3 gap-3 sm:gap-4">
        <MiniStat icon={Truck} label="رحلات" value={fmtInt(COMP.trips.length)} />
        <MiniStat icon={ShieldAlert} tone="alert" label="مشبوهة" value={fmtInt(suspiciousTrips.length)} />
        <MiniStat icon={UserRoundCheck} label="مراجعة بشرية" short="مراجعة" value={fmtInt(COMP.cases.filter((c) => c.review).length)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel title="قائمة التفتيش" aside={<StatusPill label="الأخطر أولاً" tone="malfunction" />} bodyClassName="gap-2">
          <ol className="flex flex-col gap-2">
            {suspiciousTrips.map((t) => (
              <CaseItem key={t.id} trip={t} />
            ))}
          </ol>
        </Panel>

        <Panel title="كل الرحلات" bodyClassName="p-0 sm:p-0">
          {/* A list on a phone, the table from sm: rows here have few fields. */}
          <TripsList />
          <div className="hidden sm:block">
            <TripsTable />
          </div>
        </Panel>
      </div>
    </>
  )
}

function CaseItem({ trip: t }: { trip: Trip }) {
  const c = caseByTrip.get(t.id)
  const critical = t.score >= 100
  return (
    <li className={cn("flex flex-col gap-2.5 rounded-xl bg-card p-3 ring-1", critical ? "ring-red-200" : "ring-(--glass-edge)")}>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold tabular-nums",
            critical ? "bg-red-600 text-white" : "bg-primary text-primary-foreground"
          )}
        >
          {t.rank}
        </span>
        <p className="flex min-w-0 items-baseline gap-2">
          <bdi dir="ltr" className="font-mono text-sm font-bold">
            {t.id}
          </bdi>
          <bdi dir="ltr" className="hidden font-mono text-xs text-muted-foreground sm:inline">
            {t.vehicle}
          </bdi>
        </p>
        {c?.review && <StatusPill label="مراجعة" tone="running" />}
        <ScoreBar value={t.score} max={MAX_TRIP_SCORE} className="ms-auto w-20 sm:w-36" />
        <Link
          to={`/tracking?trip=${t.id}`}
          aria-label={`عرض الرحلة ${t.id} على الخريطة`}
          title="على الخريطة"
          // cn, not buttonVariants' className: only a merge lets size-10 replace the default h-8
          className={cn(buttonVariants({ variant: "outline" }), "size-10 shrink-0 rounded-xl bg-card p-0 lg:size-9")}
        >
          <MapIcon aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <TripFlags trip={t} />
    </li>
  )
}

function TripsList() {
  return (
    <ul className="divide-y divide-primary/10 sm:hidden">
      {tripsByRisk.map((t) => (
        <li key={t.id}>
          <Link
            to={`/tracking?trip=${t.id}`}
            className="flex min-h-14 items-center gap-3 px-4 py-2.5 active:bg-secondary/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <span className="min-w-0 flex-1">
              <bdi dir="ltr" className="block font-mono text-sm font-bold">
                {t.id}
              </bdi>
              <span className="block text-xs text-muted-foreground tabular-nums">
                {fmt(t.loaded)} ← {fmt(t.delivered)} طن
              </span>
            </span>
            <StatusPill label={t.suspicious ? fmt(t.score) : "سليمة"} tone={t.suspicious ? "malfunction" : "done"} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function TripsTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>الرحلة</TableHead>
          <TableHead className="text-end">المحمّل</TableHead>
          <TableHead className="text-end">المسلّم</TableHead>
          <TableHead>الموقع</TableHead>
          <TableHead className="text-end">الدرجة</TableHead>
          <TableHead>الحالة</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tripsByRisk.map((t) => (
          <TableRow key={t.id}>
            <TableCell>
              <bdi dir="ltr" className="font-mono text-xs font-bold">
                {t.id}
              </bdi>
            </TableCell>
            <TableCell className="text-end tabular-nums">{fmt(t.loaded)}</TableCell>
            <TableCell className={cn("text-end tabular-nums", t.points.weight > 0 && "font-bold text-red-800")}>{fmt(t.delivered)}</TableCell>
            <TableCell className={cn(t.points.site > 0 && "font-bold text-red-800")}>
              <bdi dir="ltr" className="font-mono text-xs">
                {t.site ?? "—"}
              </bdi>
            </TableCell>
            <TableCell className="text-end font-bold tabular-nums">{fmt(t.score)}</TableCell>
            <TableCell>
              <StatusPill label={t.suspicious ? "مشبوهة" : "سليمة"} tone={t.suspicious ? "malfunction" : "done"} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
