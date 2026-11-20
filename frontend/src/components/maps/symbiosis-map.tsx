import type { LatLngExpression, Polyline as LeafletPolyline } from "leaflet"
import { useEffect, useRef } from "react"
import { CircleMarker, Pane, Polyline, Tooltip } from "react-leaflet"

import { BaseMap, FitBounds, boundsOf } from "@/components/maps/base-map"
import { SYM, byproductById, exclusionDetail, factoryByKey, materialByCode } from "@/data"
import type { Opportunity } from "@/data/types"
import { fmtQty, fmtSar } from "@/lib/format"

const MAX_VALUE = Math.max(...SYM.opportunities.map((o) => o.netValue))

function at(key: string): LatLngExpression | null {
  const f = factoryByKey.get(key)
  return f && f.lat != null && f.lon != null ? [f.lat, f.lon] : null
}

/**
 * Factories in the city and the exchanges between them: one line per
 * opportunity, thicker for more value a month (quantities come in tonnes,
 * cubic metres and MWh, so value is the comparable measure). Rejected pairs
 * are dashed. A factory that did not consent has no location, so its pair
 * is never drawn.
 *
 * Lines and factories sit in panes of their own, so the dots always draw
 * above the lines; the selected line is brought to the front of its pane.
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
  const placed = SYM.factories.filter((f) => f.lat != null && f.lon != null)
  const all = boundsOf(placed.map((f) => [f.lat!, f.lon!] as LatLngExpression))

  const selected = SYM.opportunities.find((o) => o.id === selectedId)
  const selectedEnds = selected ? [at(selected.supplier), at(selected.receiver)] : []
  const focus =
    selected && selectedEnds.every(Boolean) ? boundsOf(selectedEnds as LatLngExpression[]) : null

  return (
    <BaseMap bounds={all} label="خريطة التكافل الصناعي في المدينة" className={className}>
      <FitBounds bounds={focus ?? all} maxZoom={14} />
      <Pane name="exchanges" style={{ zIndex: 410 }}>
        {SYM.opportunities.map((o) => (
          <ExchangeLine key={o.id} opportunity={o} selected={o.id === selectedId} onSelect={onSelect} />
        ))}
      </Pane>
      <Pane name="factories" style={{ zIndex: 450 }}>
        {placed.map((f) => {
          const active = selected && (selected.supplier === f.key || selected.receiver === f.key)
          return (
            <CircleMarker
              key={f.key}
              center={[f.lat!, f.lon!]}
              radius={active ? 8 : 6}
              pathOptions={{
                color: "var(--primary)",
                weight: 2.5,
                fillColor: active ? "var(--leaf)" : "var(--cream)",
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <div dir="rtl" className="text-start">
                  <p className="font-bold">{f.name}</p>
                  <p className="text-xs opacity-75" dir="ltr">
                    {f.id}
                  </p>
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </Pane>
    </BaseMap>
  )
}

function ExchangeLine({
  opportunity: o,
  selected,
  onSelect,
}: {
  opportunity: Opportunity
  selected: boolean
  onSelect: (id: string) => void
}) {
  const casing = useRef<LeafletPolyline>(null)
  const line = useRef<LeafletPolyline>(null)

  // Mount order decides stacking in Leaflet; a selection has to ask for the top.
  useEffect(() => {
    if (!selected) return
    casing.current?.bringToFront()
    line.current?.bringToFront()
  }, [selected])

  const a = at(o.supplier)
  const b = at(o.receiver)
  if (!a || !b) return null
  const weight = o.feasible ? 3 + 9 * Math.sqrt(o.netValue / MAX_VALUE) : 2.5
  const color = !o.feasible ? (o.compliant ? "#a8a29e" : "#dc2626") : selected ? "var(--leaf)" : "var(--chart-1)"
  const material = materialByCode.get(byproductById.get(o.byproduct)?.material ?? "")
  return (
    <>
      {/* Always mounted, only shown when selected, so it never lands on top of its own line. */}
      <Polyline
        ref={casing}
        positions={[a, b]}
        interactive={false}
        pathOptions={{ color: "var(--primary)", weight: weight + 6, opacity: selected && o.feasible ? 0.95 : 0, lineCap: "round" }}
      />
      <Polyline
        ref={line}
        positions={[a, b]}
        eventHandlers={{ click: () => onSelect(o.id) }}
        pathOptions={{
          color,
          weight,
          opacity: o.feasible ? 0.92 : 0.85,
          dashArray: o.feasible ? undefined : "6 7",
          lineCap: "round",
        }}
      >
        <Tooltip sticky>
          <div dir="rtl" className="text-start">
            <p className="font-bold">{material?.nameAr ?? o.byproduct}</p>
            {o.feasible ? (
              <p className="text-xs">
                {fmtQty(o.quantity, o.unit, true)} شهرياً · وفر {fmtSar(o.netValue)}
              </p>
            ) : (
              <p className="text-xs text-red-800">مستبعدة: {exclusionDetail(o)}</p>
            )}
          </div>
        </Tooltip>
      </Polyline>
    </>
  )
}
