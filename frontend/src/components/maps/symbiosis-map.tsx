import { FitBounds, MapView } from "@/components/maps/map-view"
import { FactoryPin, RouteBubble, type PinRole } from "@/components/maps/pins"
import { AreaLayers, RouteLines, RouteOverlay, type Area, type RouteLine } from "@/components/maps/route-layers"
import { SYM, byproductById, factoryByKey } from "@/data"
import { outlineFor, routeFor } from "@/data/map"
import type { Opportunity } from "@/data/types"
import { boundsOf, distance, pointAlong, type LatLng, type RoadRoute } from "@/lib/roads"

/** A factory's position. A factory that did not consent has none, so its exchanges are never drawn. */
function at(key: string): LatLng | null {
  const f = factoryByKey.get(key)
  return f && f.lat != null && f.lon != null ? { lat: f.lat, lng: f.lon } : null
}

const PLACED = SYM.factories.flatMap((f) => (f.lat != null && f.lon != null ? [{ factory: f, at: { lat: f.lat, lng: f.lon } }] : []))
const ALL = boundsOf(PLACED.map((p) => p.at))
const MAX_VALUE = Math.max(...SYM.opportunities.map((o) => o.netValue))

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

/** Heat and treated water go by pipe, not by truck: they have no road route and are drawn straight. */
function kindOf(o: Opportunity): "drive" | "heat" | "water" {
  const family = byproductById.get(o.byproduct)?.family
  return family === "energy" ? "heat" : family === "water" ? "water" : "drive"
}

/**
 * The factories in the city and the exchanges between them, drawn along the
 * real roads (a straight line for a pipe). A line's thickness is its monthly
 * value (quantities come in tonnes, cubic metres and MWh, so value is the
 * comparable measure); a dashed line is an exchange the agent rejected.
 *
 * Selecting an exchange lights its route the way Google lights one (dark
 * casing, traffic, a bubble with the time and distance), outlines the two
 * factories with a dotted red line, names them, and pushes the rest back.
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
  const selected = SYM.opportunities.find((o) => o.id === selectedId)
  const road = selected ? routeFor(selected.id) : undefined
  const a = selected ? at(selected.supplier) : null
  const b = selected ? at(selected.receiver) : null

  // No useMemo: the React Compiler keeps these stable while their inputs are.
  const lines: RouteLine[] = SYM.opportunities.flatMap((o) => {
    const from = at(o.supplier)
    const to = at(o.receiver)
    if (!from || !to) return []
    return [
      {
        id: o.id,
        path: routeFor(o.id)?.path ?? [from, to],
        look: !o.feasible ? (o.compliant ? "rejected" : "forbidden") : "route",
        state: o.id === selectedId ? "selected" : selectedId ? "dimmed" : "idle",
        width: o.feasible ? 2.5 + 3.5 * Math.sqrt(o.netValue / MAX_VALUE) : 3,
      } satisfies RouteLine,
    ]
  })

  const outlines: Area[] = selected
    ? [selected.supplier, selected.receiver].flatMap((key) => {
        const ring = outlineFor(key)
        return ring ? [{ id: key, ring, look: "outline" as const }] : []
      })
    : []

  let focus = ALL
  if (selected) {
    if (road) focus = boundsOf(road.path)
    else if (a && b) focus = boundsOf([a, b])
  }

  // What lights up with the selected exchange: a road route, or for a pipe the
  // straight line between the two factories (its chevrons show the direction).
  const lit: RoadRoute | null =
    selected?.feasible && a && b
      ? (road ?? { path: [a, b], legs: [], distanceMeters: distance(a, b), durationSeconds: 0, traffic: [] })
      : null
  // The bubble: a road's time and distance, or a pipe's length.
  const bubble =
    selected && lit
      ? {
          at: pointAlong(lit.path, 0.5),
          meters: lit.distanceMeters,
          seconds: road ? lit.durationSeconds : undefined,
          kind: kindOf(selected),
        }
      : null

  return (
    <MapView
      bounds={ALL}
      label="خريطة التكافل الصناعي في المدينة"
      className={className}
      interactiveLayerIds={["routes-hit"]}
      onClick={(e) => {
        const id = e.features?.[0]?.properties?.id
        if (typeof id === "string") onSelect(id)
      }}
    >
      <FitBounds {...focus} />

      <AreaLayers areas={outlines} />
      <RouteLines lines={lines} />
      {lit && <RouteOverlay route={lit} />}

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

      {bubble && <RouteBubble {...bubble} />}
    </MapView>
  )
}
