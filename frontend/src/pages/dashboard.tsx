import {
  ArrowRight,
  Check,
  ChevronRight,
  Coins,
  Leaf,
  Mountain,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react"
import { Link } from "react-router"

import { CityTag, ClassBadge, ScoreBar, SegmentBar, TripFlags } from "@/components/data-display"
import { PageHeader } from "@/components/page-header"
import { Panel } from "@/components/panel"
import { StatusPill } from "@/components/status-pill"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  COMP,
  MAX_TRIP_SCORE,
  SYM,
  byproductById,
  feasibleOpportunities,
  materialByCode,
  partyName,
  suspiciousTrips,
} from "@/data"
import type { Opportunity, Trip } from "@/data/types"
import { AGENT_INFO, type AgentInfo } from "@/lib/agents"
import { arCount, fmt, fmtInt, fmtQty, fmtSar } from "@/lib/format"
import { PAGES } from "@/lib/nav"
import { cn } from "@/lib/utils"

const S = SYM.summary

function materialOf(o: Opportunity) {
  return materialByCode.get(byproductById.get(o.byproduct)?.material ?? "")?.nameAr ?? o.byproduct
}

const byValue = [...feasibleOpportunities].sort((a, b) => b.netValue - a.netValue)
const byCo2 = [...feasibleOpportunities].sort((a, b) => b.co2 - a.co2)
const diverted = feasibleOpportunities.filter((o) => o.landfillDiverted > 0)

const KPIS: {
  label: string
  value: string
  unit: string
  icon: LucideIcon
  segments: { label: string; value: number; fill?: string }[]
}[] = [
  {
    label: "الوفر الشهري",
    value: fmtInt(S.monthlySavings),
    unit: "ريال",
    icon: Coins,
    segments: byValue.map((o) => ({ label: `${materialOf(o)}: ${fmtSar(o.netValue)}`, value: o.netValue })),
  },
  {
    label: "تحويل عن الردم",
    value: fmtInt(S.landfillDiverted),
    unit: "طن/شهر",
    icon: Mountain,
    segments: diverted.map((o) => ({ label: `${materialOf(o)}: ${fmtInt(o.landfillDiverted)} طن`, value: o.landfillDiverted })),
  },
  {
    label: "انبعاثات متجنَّبة",
    value: fmtInt(S.co2),
    unit: "طن CO₂/شهر",
    icon: Leaf,
    segments: byCo2.map((o) => ({ label: `${materialOf(o)}: ${fmt(o.co2)} طن`, value: o.co2 })),
  },
  {
    label: "رحلات مشبوهة",
    value: fmtInt(suspiciousTrips.length),
    unit: `من ${fmtInt(COMP.trips.length)}`,
    icon: ShieldAlert,
    segments: [
      { label: `مشبوهة: ${suspiciousTrips.length}`, value: suspiciousTrips.length, fill: "bg-red-500" },
      { label: `سليمة: ${COMP.trips.length - suspiciousTrips.length}`, value: COMP.trips.length - suspiciousTrips.length, fill: "bg-stone-300" },
    ],
  },
]

/** The same three agents as the الوكلاء tab (lib/agents.ts), each with its headline result. */
const AGENTS: { info: AgentInfo; result: string }[] = [
  {
    info: AGENT_INFO.procurement,
    result: `${fmtInt(S.feasible)} من ${fmtInt(S.pairs)} فرص مجدية`,
  },
  {
    info: AGENT_INFO.classification,
    result: `${fmtInt(COMP.records.filter((r) => r.misdeclared).length)} سجلات أخطر من المعلن`,
  },
  {
    info: AGENT_INFO.tracking,
    result: arCount(suspiciousTrips.length, {
      zero: "لا رحلات مشبوهة",
      one: "رحلة مشبوهة",
      two: "رحلتان مشبوهتان",
      few: "# رحلات مشبوهة",
      many: "# رحلة مشبوهة",
      other: "# رحلة مشبوهة",
    }),
  },
]

const example = feasibleOpportunities[0]
const source = byproductById.get(example.byproduct)!

const LOOP: { label: string; value: string; running?: boolean }[] = [
  { label: "رصد حدث", value: `${fmtQty(source.quantity, source.unit)} للردم` },
  { label: "استدعاء الأدوات", value: "تصنيف، مطابقة، امتثال" },
  {
    label: "تقييم الخيارات",
    value: arCount(SYM.opportunities.filter((o) => o.byproduct === example.byproduct).length, {
      zero: "لا مرشحين",
      one: "مرشح واحد",
      two: "مرشحان",
      few: "# مرشحين",
      many: "# مرشحاً",
      other: "# مرشح",
    }),
  },
  { label: "إرسال توصية", value: `${fmtSar(example.netValue)}/شهر`, running: true },
]

export default function DashboardPage() {
  const item = PAGES.dashboard
  return (
    <>
      <PageHeader icon={item.icon} title={item.label} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <KpiTile key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="أعلى الفرص" aside={<CityTag city={SYM.city} />} bodyClassName="py-1 sm:py-1">
          <ol className="divide-y divide-primary/10">
            {feasibleOpportunities.slice(0, 5).map((o) => (
              <OpportunityRow key={o.id} opportunity={o} />
            ))}
          </ol>
          <PanelLink to="/awards" label="كل الفرص" />
        </Panel>

        <Panel title="أخطر الرحلات" aside={<CityTag city={COMP.city} />} bodyClassName="py-1 sm:py-1">
          <ol className="divide-y divide-primary/10">
            {suspiciousTrips.slice(0, 3).map((t) => (
              <TripRow key={t.id} trip={t} />
            ))}
          </ol>
          <PanelLink to="/operations" label="قائمة التفتيش" />
        </Panel>
      </div>

      <Panel className="mt-5 bg-card/55" title="وكلاء ريفاكت" aside={<StatusPill label="يعمل" tone="running" />} bodyClassName="gap-4">
        <ul className="grid gap-3 md:grid-cols-3">
          {AGENTS.map(({ info, result }) => (
            <AgentCard key={info.name} {...info} result={result} />
          ))}
        </ul>
        <ol className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {LOOP.map((step, i) => (
            <LoopStep key={step.label} index={i + 1} last={i === LOOP.length - 1} {...step} />
          ))}
        </ol>
      </Panel>
    </>
  )
}

function KpiTile({ label, value, unit, icon: Icon, segments }: (typeof KPIS)[number]) {
  return (
    <Card className="gap-3 p-3.5 sm:p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
        <span className="truncate">{label}</span>
      </p>
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-2xl leading-none font-bold text-primary tabular-nums sm:text-3xl">{value}</span>
        <span className="text-sm font-medium text-muted-foreground">{unit}</span>
      </p>
      <SegmentBar segments={segments} label={segments.map((s) => s.label).join("، ")} />
    </Card>
  )
}

function OpportunityRow({ opportunity: o }: { opportunity: Opportunity }) {
  return (
    <li className="flex items-center gap-3 py-3" title={`${partyName(o.supplier)} ← ${partyName(o.receiver)}`}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground tabular-nums">
        {o.rank}
      </span>
      <p className="min-w-0 flex-1 truncate text-sm font-bold">{materialOf(o)}</p>
      <p className="shrink-0 text-sm font-bold text-primary tabular-nums">{fmtSar(o.netValue)}</p>
    </li>
  )
}

function TripRow({ trip: t }: { trip: Trip }) {
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-red-600 text-sm font-bold text-white tabular-nums">{t.rank}</span>
        <bdi dir="ltr" className="font-mono text-sm font-bold">
          {t.id}
        </bdi>
        <ClassBadge cls={t.predicted} />
        <ScoreBar value={t.score} max={MAX_TRIP_SCORE} className="ms-auto w-28" />
      </div>
      <TripFlags trip={t} max={3} />
    </li>
  )
}

function PanelLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "mt-1 mb-2 h-10 self-start gap-1.5 rounded-xl px-2.5 text-primary hover:bg-secondary lg:h-9"
      )}
    >
      {label}
      <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
    </Link>
  )
}

function AgentCard({ name, icon: Icon, status, result }: AgentInfo & { result: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-card p-3.5 ring-1 ring-(--glass-edge)">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Icon aria-hidden="true" className="size-[1.1rem]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="text-sm font-bold">{name}</span>
          <StatusPill {...status} className="ms-auto" />
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{result}</p>
      </div>
    </li>
  )
}

function LoopStep({ index, label, value, running, last }: { index: number; label: string; value: string; running?: boolean; last: boolean }) {
  return (
    <li className={cn("relative flex items-center gap-3 rounded-xl bg-card p-3 ring-1", running ? "ring-blue-300" : "ring-(--glass-edge)")}>
      <span
        aria-hidden="true"
        className={cn("relative grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white", running ? "bg-blue-600" : "bg-green-600")}
      >
        {running && <span className="absolute inset-0 rounded-full bg-blue-600 opacity-40 motion-safe:animate-ping" />}
        <span className="relative">{running ? index : <Check className="size-4" strokeWidth={3} />}</span>
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{value}</p>
      </div>
      {!last && (
        <ChevronRight
          aria-hidden="true"
          className="absolute -end-3 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-background p-0.5 text-primary shadow-sm ring-1 ring-primary/15 rtl:rotate-180 xl:block"
        />
      )}
    </li>
  )
}
