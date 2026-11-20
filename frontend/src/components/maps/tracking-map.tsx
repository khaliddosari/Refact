import type { LatLngExpression, Polyline as LeafletPolyline } from "leaflet"
import { useEffect, useRef } from "react"
import { Circle, CircleMarker, Marker, Pane, Polyline, Tooltip } from "react-leaflet"

import { BaseMap, FitBounds, boundsOf, htmlIcon } from "@/components/maps/base-map"
import { useMediaQuery } from "@/hooks/use-media-query"
import { COMP, gpsFor, siteById, tripOrigin } from "@/data"
import type { Trip } from "@/data/types"
import { CLASS_LABEL, DRONE_LABEL, fmt, fmtPct, hhmm, shortDate } from "@/lib/format"

const TRUCK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>'

const truckIcon = htmlIcon(
  `<span class="grid size-8 place-items-center rounded-full bg-red-600 text-white shadow-lg ring-4 ring-white">${TRUCK_SVG}</span>`,
  32
)
const droneIcon = htmlIcon(
  '<span class="block size-3.5 rotate-45 rounded-[3px] bg-red-800 shadow ring-2 ring-white"></span>',
  14
)
const oldDumpIcon = htmlIcon(
  '<span class="block size-3 rotate-45 rounded-[2px] bg-stone-500 ring-2 ring-white"></span>',
  12
)

const siteLabels = new Map<string, ReturnType<typeof htmlIcon>>()
function siteLabel(id: string) {
  let icon = siteLabels.get(id)
  if (!icon) {
    icon = htmlIcon(`<span dir="ltr" class="hakeem-site-label">${id}</span>`, 40)
    siteLabels.set(id, icon)
  }
  return icon
}

/** Where a stop sat still for long enough to count (the GPS repeats the point). */
function longestStop(trip: Trip) {
  const points = gpsFor(trip)
  let best: { lat: number; lon: number; from: string; to: string; minutes: number } | null = null
  for (let i = 0; i < points.length; i++) {
    let j = i
    while (j + 1 < points.length && points[j + 1].lat === points[i].lat && points[j + 1].lon === points[i].lon) j++
    if (j > i) {
      const minutes = (Date.parse(points[j].time.replace(" ", "T")) - Date.parse(points[i].time.replace(" ", "T"))) / 60000
      if (!best || minutes > best.minutes) best = { lat: points[i].lat, lon: points[i].lon, from: points[i].time, to: points[j].time, minutes }
      i = j
    }
  }
  return best
}

export function TrackingMap({
  selectedId,
  onSelect,
  truckAt,
  className,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
  /** Current playback position on the selected trip's GPS track. */
  truckAt: { lat: number; lon: number } | null
  className?: string
}) {
  const everything = boundsOf([
    ...COMP.facilities.map((f) => [f.lat, f.lon] as LatLngExpression),
    ...COMP.sites.map((s) => [s.lat, s.lon] as LatLngExpression),
    ...COMP.gps.map((p) => [p.lat, p.lon] as LatLngExpression),
  ])

  const selected = COMP.trips.find((t) => t.id === selectedId) ?? null
  const track = selected ? gpsFor(selected) : []
  const stop = selected ? longestStop(selected) : null

  let focus = null
  if (selected) {
    const origin = tripOrigin(selected)
    const site = selected.site ? siteById.get(selected.site) : undefined
    const pts: LatLngExpression[] = track.map((p) => [p.lat, p.lon])
    if (origin) pts.push([origin.lat, origin.lon])
    if (site) pts.push([site.lat, site.lon])
    if (pts.length > 1) focus = boundsOf(pts)
  }

  // Clean trips mount first so suspicious ones draw above them; a selection
  // brings itself to the front (see TripLine).
  const ordered = [...COMP.trips].sort((a, b) => Number(a.suspicious) - Number(b.suspicious))

  // The wheel zooms the map only where the map is the page (lg up); in the
  // stacked phone layout it would trap the page scroll.
  const wide = useMediaQuery("(min-width: 64rem)")

  return (
    <BaseMap key={wide ? "wide" : "narrow"} bounds={everything} scrollWheelZoom={wide} label="خريطة تتبع رحلات نقل النفايات" className={className}>
      <FitBounds bounds={focus ?? everything} maxZoom={14} />
      <Pane name="sites" style={{ zIndex: 405 }} />
      <Pane name="trips" style={{ zIndex: 410 }} />
      <Pane name="track" style={{ zIndex: 420 }} />
      <Pane name="places" style={{ zIndex: 450 }} />

      {/* A Leaflet layer holds one tooltip, so the id label is its own marker
          and the circle keeps the hover card. */}
      {COMP.sites.map((s) => (
        <Circle
          key={s.id}
          pane="sites"
          center={[s.lat, s.lon]}
          radius={s.geofenceM}
          pathOptions={{ color: "var(--primary)", weight: 1.5, fillColor: "var(--primary)", fillOpacity: 0.12 }}
        >
          <Tooltip direction="bottom" offset={[0, 8]}>
            <div dir="rtl" className="text-start">
              <p className="font-bold">{s.name}</p>
              <p className="text-xs">يقبل: {s.accepts.map((c) => CLASS_LABEL[c]).join("، ")}</p>
              <p className="text-xs">{s.weighbridge ? "ميزان عند البوابة" : "بلا ميزان: الوزن من الناقل فقط"}</p>
            </div>
          </Tooltip>
        </Circle>
      ))}
      {COMP.sites.map((s) => (
        <Marker key={`${s.id}-label`} position={[s.lat, s.lon]} icon={siteLabel(s.id)} interactive={false} keyboard={false} />
      ))}

      {ordered.map((t) => (
        <TripLine key={t.id} trip={t} selected={t.id === selectedId} dimmed={!!selectedId && t.id !== selectedId} onSelect={onSelect} />
      ))}

      {COMP.facilities.map((f) => (
        <CircleMarker
          key={f.id}
          pane="places"
          center={[f.lat, f.lon]}
          radius={6}
          pathOptions={{ color: "var(--primary)", weight: 2, fillColor: "var(--cream)", fillOpacity: 1 }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            <div dir="rtl" className="text-start">
              <p className="font-bold">{f.activity}</p>
              <p className="text-xs" dir="ltr">
                {f.id}
              </p>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}

      {track.length > 1 && (
        <>
          <Polyline
            pane="track"
            positions={track.map((p) => [p.lat, p.lon] as LatLngExpression)}
            pathOptions={{ color: "var(--primary)", weight: 9, opacity: 0.25, lineCap: "round", lineJoin: "round" }}
          />
          <Polyline
            pane="track"
            positions={track.map((p) => [p.lat, p.lon] as LatLngExpression)}
            pathOptions={{ color: "#dc2626", weight: 4, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
          />
          {track.map((p) => (
            <CircleMarker
              key={p.time}
              pane="track"
              center={[p.lat, p.lon]}
              radius={3}
              pathOptions={{ color: "#fff", weight: 1.5, fillColor: "#dc2626", fillOpacity: 1 }}
            >
              <Tooltip>
                <span dir="ltr">{hhmm(p.time)}</span> · {fmt(p.speed, 0)} كم/س
              </Tooltip>
            </CircleMarker>
          ))}
        </>
      )}

      {stop && (
        <Circle
          pane="track"
          center={[stop.lat, stop.lon]}
          radius={140}
          pathOptions={{ color: "#dc2626", weight: 2, dashArray: "4 5", fillColor: "#dc2626", fillOpacity: 0.12 }}
        >
          <Tooltip direction="top" permanent className="hakeem-map-label hakeem-map-alert">
            <span dir="rtl">
              توقف {fmt(stop.minutes, 0)} دقيقة · <bdi dir="ltr">{hhmm(stop.from)}–{hhmm(stop.to)}</bdi>
            </span>
          </Tooltip>
        </Circle>
      )}

      {selected?.droneLinked &&
        COMP.drone
          .filter((d) => d.label !== "old_dump")
          .map((d) => (
            <Marker key={d.id} position={[d.lat, d.lon]} icon={droneIcon}>
              <Tooltip direction="bottom" offset={[0, 6]}>
                <div dir="rtl" className="text-start">
                  <p className="font-bold">رصد درون: {DRONE_LABEL[d.label] ?? d.label}</p>
                  <p className="text-xs">
                    {fmt(d.areaM2, 0)} م² · ثقة {fmtPct(d.confidence)} · {shortDate(d.time)}{" "}
                    <bdi dir="ltr">{hhmm(d.time)}</bdi>
                  </p>
                </div>
              </Tooltip>
            </Marker>
          ))}

      {COMP.drone
        .filter((d) => d.label === "old_dump")
        .map((d) => (
          <Marker key={d.id} position={[d.lat, d.lon]} icon={oldDumpIcon}>
            <Tooltip>
              <div dir="rtl" className="text-start">
                <p className="font-bold">{DRONE_LABEL[d.label]}</p>
                <p className="text-xs">
                  {fmt(d.areaM2, 0)} م² · رُصد في {shortDate(d.time)}
                </p>
              </div>
            </Tooltip>
          </Marker>
        ))}

      {truckAt && <Marker position={[truckAt.lat, truckAt.lon]} icon={truckIcon} zIndexOffset={1000} />}
    </BaseMap>
  )
}

/**
 * A trip without a recorded track: a dashed line from the facility to the
 * site it reported. Leaflet stacks by mount order, so a selected line asks
 * to be brought to the front of its pane.
 */
function TripLine({
  trip: t,
  selected,
  dimmed,
  onSelect,
}: {
  trip: Trip
  selected: boolean
  dimmed: boolean
  onSelect: (id: string) => void
}) {
  const ref = useRef<LeafletPolyline>(null)
  useEffect(() => {
    if (selected) ref.current?.bringToFront()
  }, [selected])

  const origin = tripOrigin(t)
  const site = t.site ? siteById.get(t.site) : undefined
  if (!origin || !site) return null
  return (
    <Polyline
      ref={ref}
      pane="trips"
      positions={[
        [origin.lat, origin.lon],
        [site.lat, site.lon],
      ]}
      eventHandlers={{ click: () => onSelect(t.id) }}
      pathOptions={{
        color: t.suspicious ? "#dc2626" : "#78716c",
        weight: selected ? 5 : 2.5,
        opacity: dimmed ? 0.35 : 0.85,
        dashArray: "5 7",
        lineCap: "round",
      }}
    >
      <Tooltip sticky>
        <div dir="rtl" className="text-start">
          <p className="font-bold">
            <span dir="ltr">{t.id}</span> · {t.suspicious ? "مشبوهة" : "سليمة"}
          </p>
          <p className="text-xs">مسار تقديري</p>
        </div>
      </Tooltip>
    </Polyline>
  )
}
