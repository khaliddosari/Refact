import { ArrowRight } from "lucide-react"
import { useId, type ReactNode } from "react"

import { CityTag, ClassBadge, PartyArrow, TripFlags } from "@/components/data-display"
import { PageHeader } from "@/components/page-header"
import { StatusPill } from "@/components/status-pill"
import { Card } from "@/components/ui/card"
import {
  COMP,
  MAX_TRIP_SCORE,
  SYM,
  byproductById,
  facilityLabel,
  feasibleOpportunities,
  materialByCode,
  partyName,
  suspiciousTrips,
} from "@/data"
import type { Opportunity, WasteRecord } from "@/data/types"
import { AGENT_INFO, type AgentInfo } from "@/lib/agents"
import { fmt, fmtInt, fmtPct } from "@/lib/format"
import { PAGES } from "@/lib/nav"
import { cn } from "@/lib/utils"

const S = SYM.summary

/** Findings per card. The last one only shows from lg, where three cards sit side by side with room to spare. */
const FINDINGS = 4
const PHONE_FINDINGS = 3

type Stat = { value: string; unit?: string; label: string; alert?: boolean }

/** One of an agent's three best findings: a rank, what it is, and its figure. */
type Finding = {
  key: string
  title: ReactNode
  detail: ReactNode
  figure: { value: string; unit?: string }
  alert?: boolean
}

/** An agent's name, goal, icon and status (lib/agents.ts), with the figures the card shows. */
type Agent = AgentInfo & {
  id: string
  /** The industrial city whose data the agent works on. */
  city: string
  stats: Stat[]
  findings: Finding[]
}

function materialOf(o: Opportunity) {
  return materialByCode.get(byproductById.get(o.byproduct)?.material ?? "")?.nameAr ?? o.byproduct
}

/**
 * A factory without its leading «مصنع»: every name starts with it, so on a
 * phone it would use up the width a truncated name has and say nothing.
 */
const bare = (name: string) => name.replace(/^مصنع\s+/, "")

/** Records the agent thinks are riskier than declared first, the surest of those at the top. */
const recordsByConcern: WasteRecord[] = [...COMP.records].sort(
  (a, b) => Number(b.misdeclared) - Number(a.misdeclared) || b.confidence - a.confidence
)

function ClassShift({ from, to }: { from: WasteRecord["declared"]; to: WasteRecord["predicted"] }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="sr-only">معلنة</span>
      <ClassBadge cls={from} />
      <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-primary rtl:rotate-180" />
      <span className="sr-only">متوقعة</span>
      <ClassBadge cls={to} />
    </span>
  )
}

const AGENTS: Agent[] = [
  {
    id: "procurement",
    ...AGENT_INFO.procurement,
    city: SYM.city,
    stats: [
      { value: fmtInt(S.feasible), unit: `من ${fmtInt(S.pairs)}`, label: "فرص مجدية" },
      { value: fmtInt(S.monthlySavings), label: "ريال شهرياً" },
      { value: fmtInt(S.landfillDiverted), label: "طن عن الردم" },
    ],
    findings: feasibleOpportunities.slice(0, FINDINGS).map((o) => ({
      key: o.id,
      title: materialOf(o),
      detail: <PartyArrow from={bare(partyName(o.supplier))} to={bare(partyName(o.receiver))} />,
      figure: { value: fmtInt(o.netValue), unit: "ريال" },
    })),
  },
  {
    id: "classification",
    ...AGENT_INFO.classification,
    city: COMP.city,
    stats: [
      { value: fmtInt(COMP.records.length), label: "سجلات" },
      { value: fmtInt(COMP.records.filter((r) => r.misdeclared).length), label: "أخطر من المعلن", alert: true },
      { value: fmtInt(COMP.records.filter((r) => r.review).length), label: "مراجعة بشرية" },
    ],
    findings: recordsByConcern.slice(0, FINDINGS).map((r) => ({
      key: r.id,
      title: facilityLabel(r.facility),
      detail: <ClassShift from={r.declared} to={r.predicted} />,
      figure: { value: fmtPct(r.confidence) },
      alert: r.misdeclared,
    })),
  },
  {
    id: "tracking",
    ...AGENT_INFO.tracking,
    city: COMP.city,
    stats: [
      { value: fmtInt(COMP.trips.length), label: "رحلات" },
      { value: fmtInt(suspiciousTrips.length), label: "مشبوهة", alert: true },
      { value: fmt(MAX_TRIP_SCORE), label: "أعلى خطورة" },
    ],
    findings: suspiciousTrips.slice(0, FINDINGS).map((t) => ({
      key: t.id,
      title: (
        <bdi dir="ltr" className="font-mono">
          {t.id}
        </bdi>
      ),
      detail: <TripFlags trip={t} max={1} />,
      figure: { value: fmt(t.score) },
      alert: true,
    })),
  },
]

export default function AgentsPage() {
  const item = PAGES.agents
  return (
    <>
      <PageHeader icon={item.icon} title={item.label} />
      {/* grid-cols-1 (a minmax(0,1fr) track), not an auto track: an auto track
          grows to the widest unbreakable line inside a card and overflows a phone */}
      <ul className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {AGENTS.map((agent) => (
          <li key={agent.id} className="flex min-w-0">
            <AgentCard agent={agent} />
          </li>
        ))}
      </ul>
    </>
  )
}

function AgentCard({ agent }: { agent: Agent }) {
  const headingId = useId()
  const { icon: Icon } = agent
  return (
    <Card
      role="group"
      aria-labelledby={headingId}
      className="min-w-0 flex-1 gap-4 bg-card p-4 shadow-(--glass-shadow) ring-(--glass-edge) backdrop-blur-xl backdrop-saturate-150 sm:p-5"
    >
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-(--glass-shadow) ring-1 ring-white/10">
            <Icon aria-hidden="true" className="size-6" />
          </span>
          <h2 id={headingId} className="min-w-0 flex-1 text-lg leading-snug font-bold">
            {agent.name}
          </h2>
          <StatusPill {...agent.status} />
        </div>
        {/* lg to xl: three narrow cards, so two lines are reserved and the strips below line up across cards */}
        <p className="text-sm text-balance text-muted-foreground lg:min-h-13 xl:min-h-0">{agent.goal}</p>
      </header>

      <dl className="grid grid-cols-3 divide-x divide-primary/12 rounded-xl bg-secondary/55 py-3 ring-1 ring-primary/8">
        {agent.stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 flex-col items-center gap-1.5 px-1 text-center">
            <dd className="order-1 flex flex-wrap items-baseline justify-center gap-x-1">
              <span className={cn("text-xl leading-none font-bold tabular-nums", stat.alert ? "text-red-800" : "text-primary")}>
                {stat.value}
              </span>
              {stat.unit && <span className="text-xs leading-none font-medium text-muted-foreground">{stat.unit}</span>}
            </dd>
            <dt className="order-2 text-xs leading-tight text-balance text-muted-foreground lg:min-h-9 xl:min-h-0">{stat.label}</dt>
          </div>
        ))}
      </dl>

      <section aria-label="أهم النتائج" className="flex flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-primary/12 pb-2">
          <h3 className="text-sm font-bold">أهم النتائج</h3>
          <CityTag city={agent.city} />
        </div>
        <ol className="divide-y divide-primary/10">
          {agent.findings.map((finding, i) => (
            <li key={finding.key} className={cn("flex items-center gap-3 py-2.5", i >= PHONE_FINDINGS && "max-lg:hidden")}>
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold tabular-nums",
                  finding.alert ? "bg-red-600 text-white" : "bg-primary text-primary-foreground"
                )}
              >
                {fmtInt(i + 1)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-sm font-bold">{finding.title}</p>
                {finding.detail}
              </div>
              <p className={cn("shrink-0 text-end leading-tight", finding.alert ? "text-red-800" : "text-primary")}>
                <span className="block text-sm font-bold tabular-nums">{finding.figure.value}</span>
                {finding.figure.unit && (
                  <span className="block text-xs font-medium text-muted-foreground">{finding.figure.unit}</span>
                )}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </Card>
  )
}
