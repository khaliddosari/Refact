import { FitBounds, MapView } from "@/components/maps/map-view"
import { FactoryPin, type PinRole } from "@/components/maps/pins"
import { RoadLine } from "@/components/maps/road-line"
import { SYM, factoryByKey } from "@/data"
import type { Opportunity } from "@/data/types"
import { useRoadRoutes, type RouteRequest } from "@/hooks/use-road-routes"
import { MAP } from "@/lib/map-colors"
import { boundsOf, type LatLng } from "@/lib/roads"

/** A factory's position. A factory that did not consent has none, so its exchanges are never drawn. */
function at(key: string): LatLng | null {
  const f = factoryByKey.get(key)
  return f && f.lat != null && f.lon != null ? { lat: f.lat, lng: f.lon } : null
}

const PLACED = SYM.factories.flatMap((f) => (f.lat != null && f.lon != null ? [{ factory: f, at: { lat: f.lat, lng: f.lon } }] : []))
const ALL = boundsOf(PLACED.map((p) => p.at))
const MAX_VALUE = Math.max(...SYM.opportunities.map((o) => o.netValue))

/** Module level, so the road routes are requested once. */
const REQUESTS: RouteRequest[] = SYM.opportunities.flatMap((o) => {
  const a = at(o.supplier)
  const b = at(o.receiver)
  return a && b ? [{ id: o.id, stops: [a, b] }] : []
})

/** Each factory's segment: supplier, receiver, both, or in no exchange. */
const ROLES = new Map<string, PinRole>()
for (const o of SYM.opportunities) {
  for (const [key, role] of [[o.supplier, "supplier"], [o.receiver, "receiver"]] as const) {
    const had = ROLES.get(key)
    ROLES.set(key, had && had !== role ? "both" : role)
  }
}

/** The opportunity a click on a factory opens: its best feasible one, else the first. */
function opportunityOf(key: string) {
  const mine = SYM.opportunities.filter((o) => o.supplier === key || o.receiver === key)
  return [...mine].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0]
}

/**
 * The factories in the city and the exchanges between them, drawn along the
 * real roads. A line's thickness is its monthly value (quantities come in
 * tonnes, cubic metres and MWh, so value is the comparable measure); a dashed
 * line is an exchange the agent rejected.
 *
 * Selecting an exchange highlights its two factories (named, pulsing, in the
 * leaf colour), lights its route with arrows from supplier to receiver, and
 * pushes every other factory and route back.
 */
export function SymbiosisMap({
  selectedId,
  onSelect,
  className,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
  className?: string
}) {
  const routes = useRoadRoutes(REQUESTS)
  const selected = SYM.opportunities.find((o) => o.id === selectedId)

  let focus = ALL
  if (selected) {
    const a = at(selected.supplier)
    const b = at(selected.receiver)
    const road = routes[selected.id]
    if (road) focus = boundsOf(road.path)
    else if (a && b) focus = boundsOf([a, b])
  }

  return (
    <MapView bounds={ALL} label="خريطة التكافل الصناعي في المدينة" className={className}>
      <FitBounds {...focus} />

      {SYM.opportunities.map((o) => (
        <ExchangeLine
          key={o.id}
          opportunity={o}
          road={routes[o.id]}
          selected={o.id === selectedId}
          dimmed={!!selected && o.id !== selectedId}
          onSelect={onSelect}
        />
      ))}

      {PLACED.map(({ factory: f, at: position }) => {
        const involved = !!selected && (selected.supplier === f.key || selected.receiver === f.key)
        const target = opportunityOf(f.key)
        return (
          <FactoryPin
            key={f.key}
            position={position}
            name={f.name}
            role={ROLES.get(f.key) ?? "none"}
            selected={involved}
            dimmed={!!selected && !involved}
            labelSide={selected?.supplier === f.key ? "top" : "bottom"}
            onClick={target ? () => onSelect(target.id) : undefined}
          />
        )
      })}
    </MapView>
  )
}

function ExchangeLine({
  opportunity: o,
  road,
  selected,
  dimmed,
  onSelect,
}: {
  opportunity: Opportunity
  /** undefined while loading, null if Google could not route it */
  road: { path: LatLng[] } | null | undefined
  selected: boolean
  dimmed: boolean
  onSelect: (id: string) => void
}) {
  const a = at(o.supplier)
  const b = at(o.receiver)
  if (!a || !b || road === undefined) return null
  return (
    <RoadLine
      path={road?.path ?? [a, b]}
      color={!o.feasible ? (o.compliant ? MAP.stone : MAP.red) : selected ? MAP.leaf : MAP.primary}
      weight={o.feasible ? 3 + 8 * Math.sqrt(o.netValue / MAX_VALUE) : selected ? 5 : 3}
      opacity={dimmed ? 0.22 : 0.92}
      dashed={!o.feasible}
      highlighted={selected && o.feasible}
      arrows={selected && o.feasible}
      zIndex={selected ? 20 : 2}
      onClick={() => onSelect(o.id)}
    />
  )
}
