import { CircleCheck, CircleX, ScanSearch } from "lucide-react"
import { useRef, useState } from "react"

import { CityChip, FamilyIcon, HazardBadge } from "@/components/data-display"
import { PageHeader } from "@/components/page-header"
import { StatusPill } from "@/components/status-pill"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SYM, exclusionDetail, factory, materialByCode, opportunitiesFor, partyName } from "@/data"
import { useScrollFade } from "@/hooks/use-scroll-fade"
import type { Byproduct, Family, Need, Opportunity } from "@/data/types"
import { FAMILY_LABEL, ROUTE_LABEL, fmt, fmtInt, fmtQty, fmtSar, qualityLabel, unitLabel } from "@/lib/format"
import { NAV_ITEMS } from "@/lib/nav"

type Kind = "offers" | "needs"

/** One line of facts, skipping the ones a stream doesn't have. */
const facts = (...parts: (string | null | false)[]) => parts.filter(Boolean).join(" · ")

export default function TendersPage() {
  const item = NAV_ITEMS[1]
  const [kind, setKind] = useState<Kind>("offers")
  const [family, setFamily] = useState<Family | "all">("all")
  const chipsRef = useRef<HTMLDivElement>(null)
  const chipsFade = useScrollFade(chipsRef)

  const list: (Byproduct | Need)[] = kind === "offers" ? SYM.byproducts : SYM.needs
  const families = [...new Set(list.map((x) => x.family))]
  const active = family !== "all" && families.includes(family) ? family : "all"
  const visible = active === "all" ? list : list.filter((x) => x.family === active)

  return (
    <>
      <PageHeader icon={item.icon} title={item.label} actions={<CityChip city={SYM.city} />} />

      <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)} className="gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <TabsList className="h-12! w-full rounded-xl bg-card p-1 shadow-(--glass-shadow) ring-1 ring-(--glass-edge) backdrop-blur-xl sm:w-fit lg:h-11!">
            <TabsTrigger value="offers" className="h-10 rounded-lg px-4 text-sm data-active:bg-primary data-active:text-primary-foreground lg:h-9">
              عروض المخلفات <span className="tabular-nums opacity-80">{fmtInt(SYM.byproducts.length)}</span>
            </TabsTrigger>
            <TabsTrigger value="needs" className="h-10 rounded-lg px-4 text-sm data-active:bg-primary data-active:text-primary-foreground lg:h-9">
              طلبات المواد <span className="tabular-nums opacity-80">{fmtInt(SYM.needs.length)}</span>
            </TabsTrigger>
          </TabsList>

          {/* One swipeable row on a phone, wrapping from sm. */}
          <ToggleGroup
            ref={chipsRef}
            {...chipsFade}
            aria-label="تصفية حسب المادة"
            value={[active]}
            onValueChange={(v) => setFamily((v[0] as Family | "all" | undefined) ?? "all")}
            className="scrollbar-none -mx-1 w-[calc(100%+0.5rem)] flex-nowrap overflow-x-auto px-1 py-1 sm:mx-0 sm:w-fit sm:flex-wrap sm:overflow-visible sm:p-0"
            spacing={1}
          >
            <FamilyChip value="all" label="الكل" />
            {families.map((f) => (
              <FamilyChip key={f} value={f} label={FAMILY_LABEL[f]} />
            ))}
          </ToggleGroup>
        </div>

        <TabsContent value="offers">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(visible as Byproduct[]).map((b) => (
              <OfferCard key={b.id} byproduct={b} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="needs">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(visible as Need[]).map((n) => (
              <NeedCard key={n.id} need={n} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}

function FamilyChip({ value, label }: { value: string; label: string }) {
  return (
    <ToggleGroupItem
      value={value}
      className="h-10 rounded-xl bg-card px-3.5 text-sm ring-1 ring-(--glass-edge) aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:ring-primary lg:h-9"
    >
      {label}
    </ToggleGroupItem>
  )
}

/** The material the agent read out of the free text. EWC on hover. */
function AgentLabel({ code, ewc }: { code: string | null; ewc?: string | null }) {
  const material = code ? materialByCode.get(code) : undefined
  return (
    <p
      title={ewc ? `صنّفه الوكيل · EWC ${ewc}` : "صنّفه الوكيل"}
      className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-sm font-medium text-secondary-foreground"
    >
      <ScanSearch aria-hidden="true" className="size-4 shrink-0" />
      {material?.nameAr ?? "وقود أولي"}
    </p>
  )
}

/** The one line that matters: the best match, or why there is none. */
function MatchLine({ opportunities, side }: { opportunities: Opportunity[]; side: "offer" | "need" }) {
  const best = opportunities.filter((o) => o.feasible).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0]
  const rejected = opportunities.filter((o) => !o.feasible)
  const other = (o: Opportunity) => partyName(side === "offer" ? o.receiver : o.supplier)

  return (
    <div className="mt-auto flex flex-col gap-2 border-t border-primary/10 pt-3">
      {best ? (
        <p className="flex items-center gap-2 text-sm">
          <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-green-700" />
          <span className="min-w-0 flex-1 truncate font-medium" title={other(best)}>
            {other(best)}
          </span>
          <span className="shrink-0 font-bold text-primary tabular-nums">{fmtSar(best.netValue)}</span>
        </p>
      ) : (
        rejected.length === 0 && <p className="text-sm text-muted-foreground">لا مطابقة بعد</p>
      )}
      {rejected.map((o) => (
        <p key={o.id} className="flex items-center gap-2 text-sm" title={`${other(o)}: ${exclusionDetail(o)}`}>
          <CircleX aria-hidden="true" className="size-4 shrink-0 text-red-700" />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{exclusionDetail(o)}</span>
          <StatusPill label={o.compliant ? "غير متوافقة" : "ممنوعة"} tone={o.compliant ? "idle" : "malfunction"} />
        </p>
      ))}
    </div>
  )
}

function CardHead({ family, text, factoryKey, hazardous }: { family: Family; text: string; factoryKey: string; hazardous?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <FamilyIcon family={family} />
      <div className="min-w-0 flex-1">
        <h3 className="text-base leading-snug font-bold" dir="auto">
          {text}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{factory(factoryKey)?.name}</p>
      </div>
      {hazardous && <HazardBadge />}
    </div>
  )
}

function OfferCard({ byproduct: b }: { byproduct: Byproduct }) {
  return (
    <Card className="gap-3 p-4">
      <CardHead family={b.family} text={b.text} factoryKey={b.factory} hazardous={b.hazardous} />
      <AgentLabel code={b.material} ewc={b.ewc} />
      <p className="text-sm text-muted-foreground">
        {facts(`${fmtQty(b.quantity, b.unit, true)}/شهر`, b.quality && qualityLabel(b.quality), ROUTE_LABEL[b.route] ?? b.route)}
      </p>
      <MatchLine opportunities={opportunitiesFor("byproduct", b.id)} side="offer" />
    </Card>
  )
}

function NeedCard({ need: n }: { need: Need }) {
  return (
    <Card className="gap-3 p-4">
      <CardHead family={n.family} text={n.text} factoryKey={n.factory} />
      <AgentLabel code={n.material} ewc={n.material ? materialByCode.get(n.material)?.ewc : null} />
      <p className="text-sm text-muted-foreground">
        {facts(
          `${fmtQty(n.quantity, n.unit, true)}/شهر`,
          n.minQuality && qualityLabel(n.minQuality),
          `${fmt(n.price, 2)} ريال/${unitLabel(n.unit, true)}`
        )}
      </p>
      <MatchLine opportunities={opportunitiesFor("need", n.id)} side="need" />
    </Card>
  )
}
