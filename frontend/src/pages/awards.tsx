import { Coins, History, Leaf, List, ListChecks, Map as MapIcon, Mountain, Target } from "lucide-react"
import { useState } from "react"

import { CityChip, FamilyIcon, MiniStat, PartyArrow } from "@/components/data-display"
import { GoogleMapsLink } from "@/components/maps/google-link"
import { MapsProvider } from "@/components/maps/maps-provider"
import { SymbiosisMap } from "@/components/maps/symbiosis-map"
import { PageHeader } from "@/components/page-header"
import { Panel } from "@/components/panel"
import { StatusPill } from "@/components/status-pill"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  SYM,
  byproductById,
  excludedOpportunities,
  exclusionDetail,
  factory,
  feasibleOpportunities,
  materialByCode,
  partyName,
} from "@/data"
import type { Opportunity } from "@/data/types"
import { useMediaQuery } from "@/hooks/use-media-query"
import { fmt, fmtInt, fmtPct, fmtQty, fmtSar } from "@/lib/format"
import { PAGES } from "@/lib/nav"
import { cn } from "@/lib/utils"

const S = SYM.summary

/** A stopped exchange between the same two factories: the lesson the agent carries forward. */
function history(o: Opportunity) {
  return SYM.exchanges.find((e) => e.supplier === o.supplier && e.receiver === o.receiver && e.status === "stopped")
}

type View = "list" | "map"

export default function AwardsPage() {
  return (
    <MapsProvider>
      <AwardsScreen />
    </MapsProvider>
  )
}

function AwardsScreen() {
  const item = PAGES.awards
  // Nothing selected at first: the map opens on the whole city.
  const [selected, setSelected] = useState<string | null>(null)
  const toggle = (id: string) => setSelected((current) => (current === id ? null : id))

  // Side by side from lg; below that, one view at a time. The map mounts only
  // when it is visible: a map drawn into a hidden box comes out grey.
  const wide = useMediaQuery("(min-width: 64rem)")
  const [view, setView] = useState<View>("list")
  const showList = wide || view === "list"
  const showMap = wide || view === "map"

  return (
    <>
      <PageHeader icon={item.icon} title={item.label} actions={<CityChip city={SYM.city} />} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MiniStat icon={ListChecks} label="فرص مجدية" value={fmtInt(S.feasible)} unit={`من ${fmtInt(S.pairs)}`} />
        <MiniStat icon={Coins} label="الوفر الشهري" value={fmtInt(S.monthlySavings)} unit="ريال" />
        <MiniStat icon={Mountain} label="تحويل عن الردم" value={fmtInt(S.landfillDiverted)} unit="طن/شهر" />
        <MiniStat icon={Leaf} label="انبعاثات متجنَّبة" value={fmtInt(S.co2)} unit="طن CO₂" />
      </div>

      <Card className="mb-4 flex-row flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 lg:mb-5">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Target aria-hidden="true" className="size-4 text-primary" />
          دقة أفضل 5 فرص
        </p>
        <PrecisionBar label="ريفاكت" value={S.precisionAgent} fill="bg-primary" />
        <PrecisionBar label="التشابه النصي وحده" short="التشابه النصي" value={S.precisionText} fill="bg-stone-400" />
      </Card>

      {!wide && (
        <ToggleGroup
          aria-label="طريقة العرض"
          value={[view]}
          onValueChange={(v) => v[0] && setView(v[0] as View)}
          spacing={1}
          className="mb-4 w-full rounded-xl bg-card p-1 shadow-(--glass-shadow) ring-1 ring-(--glass-edge) backdrop-blur-xl"
        >
          <ToggleGroupItem value="list" className="h-10 flex-1 rounded-lg aria-pressed:bg-primary aria-pressed:text-primary-foreground">
            <List aria-hidden="true" />
            القائمة
          </ToggleGroupItem>
          <ToggleGroupItem value="map" className="h-10 flex-1 rounded-lg aria-pressed:bg-primary aria-pressed:text-primary-foreground">
            <MapIcon aria-hidden="true" />
            الخريطة
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {showList && (
          <Panel title="الفرص حسب الأثر" aside={<StatusPill label="بانتظار الاعتماد" tone="running" />} bodyClassName="gap-2">
            <ol className="flex flex-col gap-2">
              {feasibleOpportunities.map((o) => (
                <OpportunityItem
                  key={o.id}
                  opportunity={o}
                  selected={o.id === selected}
                  onSelect={toggle}
                  onShowMap={wide ? undefined : () => setView("map")}
                />
              ))}
            </ol>
            <ul className="mt-2 flex flex-col gap-2">
              {excludedOpportunities.map((o) => (
                <OpportunityItem key={o.id} opportunity={o} selected={o.id === selected} onSelect={toggle} />
              ))}
            </ul>
          </Panel>
        )}

        {showMap && (
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Panel title="الخريطة" bodyClassName="gap-3 p-3 sm:p-3">
              <SymbiosisMap
                selectedId={selected}
                onSelect={toggle}
                className="h-[60dvh] min-h-[22rem] lg:h-[calc(100dvh-14rem)] lg:max-h-[42rem] lg:min-h-[26rem]"
              />
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-chart-1 ring-2 ring-white" /> مورد
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-chart-3 ring-2 ring-white" /> مستقبل
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-chart-2 ring-2 ring-white" /> الاثنان
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1 w-5 rounded-full bg-chart-1" /> مجدية
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-0 w-5 border-t-2 border-dashed border-red-600" /> ممنوعة
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-0 w-5 border-t-2 border-dashed border-stone-400" /> غير متوافقة
                </li>
              </ul>
            </Panel>
          </div>
        )}
      </div>
    </>
  )
}

function PrecisionBar({ label, short, value, fill }: { label: string; short?: string; value: number; fill: string }) {
  return (
    <div className="flex min-w-48 flex-1 items-center gap-2 text-sm" title={label}>
      <span className="w-24 shrink-0 truncate text-muted-foreground sm:w-32">
        <span className="sm:hidden">{short ?? label}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
      <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-primary/10">
        <span className={cn("absolute inset-y-0 start-0 rounded-full", fill)} style={{ width: `${value * 100}%` }} />
      </span>
      <span className="w-11 shrink-0 text-end font-bold tabular-nums">{fmtPct(value)}</span>
    </div>
  )
}

function OpportunityItem({
  opportunity: o,
  selected,
  onSelect,
  onShowMap,
}: {
  opportunity: Opportunity
  selected: boolean
  onSelect: (id: string) => void
  /** Phones only: jump to the map view with this opportunity selected. */
  onShowMap?: () => void
}) {
  const byproduct = byproductById.get(o.byproduct)
  const material = materialByCode.get(byproduct?.material ?? "")?.nameAr ?? o.byproduct
  const lesson = history(o)
  // Only factories that consented have a position, so only their routes can be opened.
  const supplier = factory(o.supplier)
  const receiver = factory(o.receiver)
  const from = supplier?.lat != null && supplier.lon != null ? { lat: supplier.lat, lng: supplier.lon } : null
  const to = receiver?.lat != null && receiver.lon != null ? { lat: receiver.lat, lng: receiver.lon } : null
  return (
    <li className={cn("rounded-xl ring-1 transition-colors", o.feasible ? "bg-card" : "bg-card/50", selected ? "ring-2 ring-primary/60" : "ring-(--glass-edge)")}>
      <button
        type="button"
        onClick={() => onSelect(o.id)}
        aria-expanded={selected}
        className="flex w-full items-start gap-3 rounded-xl p-3 text-start hover:bg-secondary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {o.feasible ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground tabular-nums">
            {o.rank}
          </span>
        ) : (
          byproduct && <FamilyIcon family={byproduct.family} className="size-9 opacity-70" />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{material}</span>
            {o.feasible ? (
              <span className="shrink-0 text-sm font-bold text-primary tabular-nums">{fmtSar(o.netValue)}</span>
            ) : (
              <StatusPill label={o.compliant ? "غير متوافقة" : "ممنوعة"} tone={o.compliant ? "idle" : "malfunction"} />
            )}
          </span>
          {o.feasible ? (
            <PartyArrow from={partyName(o.supplier)} to={partyName(o.receiver)} className="mt-1" />
          ) : (
            <span className="mt-1 block truncate text-xs text-muted-foreground">{exclusionDetail(o)}</span>
          )}
        </span>
      </button>

      {selected && o.feasible && (
        <div className="flex flex-col gap-2 px-3 pb-3 sm:ps-15">
          {/* The names in full: the line above truncates them. */}
          <p className="text-sm leading-relaxed">
            {partyName(o.supplier)} <span className="text-primary">←</span> {partyName(o.receiver)}
          </p>
          <span className="flex flex-wrap gap-1.5">
            <Chip>{fmtQty(o.quantity, o.unit, true)}/شهر</Chip>
            <Chip>تغطي {fmtPct(o.coverage)}</Chip>
            <Chip>{fmt(o.distanceKm)} كم</Chip>
            <Chip>{fmt(o.co2)} طن CO₂</Chip>
            {o.landfillDiverted > 0 && <Chip>{fmtInt(o.landfillDiverted)} طن عن الردم</Chip>}
          </span>
          {lesson && (
            <span className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-950 ring-1 ring-red-200">
              <History aria-hidden="true" className="size-3.5 shrink-0 text-red-700" />
              توقف سابقاً: {lesson.stopReason}
            </span>
          )}
          <span className="flex flex-wrap gap-2">
            {onShowMap && (
              <Button type="button" variant="outline" onClick={onShowMap} className="h-10 flex-1 gap-1.5 rounded-xl bg-card">
                <MapIcon aria-hidden="true" />
                على الخريطة
              </Button>
            )}
            {from && to && <GoogleMapsLink origin={from} destination={to} className="flex-1" />}
          </span>
        </div>
      )}
    </li>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-7 items-center rounded-lg bg-secondary px-2 text-xs font-medium tabular-nums">{children}</span>
}
