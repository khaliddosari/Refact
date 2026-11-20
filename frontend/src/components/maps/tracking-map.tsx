import { FitBounds, MapView } from "@/components/maps/map-view"
import { DronePin, FactoryPin, LabelMarker, RouteBubble, TruckPin } from "@/components/maps/pins"
import { AreaLayers, RouteLines, RouteOverlay, type Area, type RouteLine } from "@/components/maps/route-layers"
import { COMP, gpsFor, siteById, tripOrigin, tripsByRisk } from "@/data"
import { outlineFor, routeFor } from "@/data/map"
import type { GpsPoint, Trip } from "@/data/types"
import { DRONE_LABEL, fmt, hhmm } from "@/lib/format"
import { boundsOf, circleRing, pointAlong, positionOnTrack, type LatLng, type RoadRoute } from "@/lib/roads"

const FACILITIES = COMP.facilities.map((f) => ({ facility: f, at: { lat: f.lat, lng: f.lon } }))
const SITES = COMP.sites.map((s) => ({ site: s, at: { lat: s.lat, lng: s.lon } }))
const EVERYTHING = boundsOf([
  ...FACILITIES.map((f) => f.at),
  ...SITES.map((s) => s.at),
  ...COMP.gps.map((p) => ({ lat: p.lat, lng: p.lon })),
])

/** The recorded track of a trip, snapped to the roads (built by scripts/build_map_data.py), if it has one. */
export function trackFor(trip: Trip): RoadRoute | undefined {
  return routeFor(`track-${trip.id}`)
}

/** The longest stretch a vehicle sat still: where it stopped, and for how long. */
export function longestStop(points: GpsPoint[]) {
  const minutes = (ts: string) => Date.parse(ts.replace(" ", "T")) / 60000
  let best: { fix: GpsPoint; from: string; to: string; length: number; fromMinute: number } | null = null
  for (let i = 0; i < points.length; i++) {
    let j = i
    while (j + 1 < points.length && points[j + 1].lat === points[i].lat && points[j + 1].lon === points[i].lon) j++
    if (j > i) {
      const length = minutes(points[j].time) - minutes(points[i].time)
      if (!best || length > best.length) {
        best = { fix: points[i], from: points[i].time, to: points[j].time, length, fromMinute: minutes(points[i].time) - minutes(points[0].time) }
      }
      i = j
    }
  }
  return best
}

/**
 * Approved sites with their geofences, the producing facilities, every trip's
 * expected road, and, for the selected trip, its recorded GPS track snapped to
 * the roads, the stop, the drone sightings and the vehicle itself.
 *
 * Selecting a trip lights its route the way Google does (casing, traffic, a
 * bubble with the time and distance), outlines its facility and the site it
 * reported with a dotted red line, and pushes the rest back.
 */
export function TrackingMap({
  selectedId,
  onSelect,
  truckAt,
  track,
  roomForCard,
  className,
}: {
  selectedId: string
  onSelect: (id: string) => void
  /** Current playback position on the selected trip's track. */
  truckAt: LatLng | null
  /** The selected trip's GPS track snapped to roads, if it has one. */
  track: RoadRoute | undefined
  /** The details card floats over the end side of the map: keep the trip clear of it. */
  roomForCard: boolean
  className?: string
}) {
  const selected = COMP.trips.find((t) => t.id === selectedId)!
  const fixes = gpsFor(selected)
  const origin = tripOrigin(selected)
  const selectedSite = selected.site ? siteById.get(selected.site) : undefined
  const leg = routeFor(selected.id)
  const stop = longestStop(fixes)
  const stopAt = stop ? positionOnTrack(fixes, stop.fromMinute, track) : null

  // No useMemo below: the React Compiler keeps these stable while their inputs are.
  // The recorded track, or (without a snapped one) straight lines through the fixes.
  const trackPath = track?.path ?? fixes.map((p) => ({ lat: p.lat, lng: p.lon }))

  // What the view frames: the trip's own geography.
  const own: LatLng[] = [
    ...(origin ? [{ lat: origin.lat, lng: origin.lon }] : []),
    ...(selectedSite ? [{ lat: selectedSite.lat, lng: selectedSite.lon }] : []),
    ...(fixes.length > 1 ? trackPath : []),
    ...(leg?.path ?? []),
  ]
  const focus = own.length > 1 ? boundsOf(own) : EVERYTHING

  // Clean trips first, so suspicious ones draw above them; the selected one is lit.
  const legs: RouteLine[] = [...tripsByRisk]
    .sort((a, b) => Number(a.suspicious) - Number(b.suspicious))
    .flatMap((t) => {
      const road = routeFor(t.id)
      if (!road) return []
      return [
        {
          id: t.id,
          path: road.path,
          look: t.suspicious ? "alert" : "muted",
          state: t.id === selectedId ? "selected" : "dimmed",
          width: 3,
        } satisfies RouteLine,
      ]
    })
  const recorded: RouteLine[] = fixes.length > 1 ? [{ id: `track-${selectedId}`, path: trackPath, look: "route", state: "selected" }] : []
  const lines = [...legs, ...recorded]

  const areas: Area[] = SITES.map(({ site, at }) => ({
    id: site.id,
    ring: circleRing(at, site.geofenceM),
    look: site.id === selected.site ? "site-selected" : "site",
  }))
  const outline = outlineFor(origin?.id)
  if (outline) areas.push({ id: `outline-${origin!.id}`, ring: outline, look: "outline" })
  if (stopAt) areas.push({ id: "stop", ring: circleRing(stopAt, 140), look: "stop" })

  return (
    <MapView
      bounds={EVERYTHING}
      label="خريطة تتبع رحلات نقل النفايات"
      gesture={roomForCard ? "greedy" : "cooperative"}
      className={className}
      interactiveLayerIds={["routes-hit"]}
      onClick={(e) => {
        const id = e.features?.[0]?.properties?.id
        if (typeof id === "string" && !id.startsWith("track-")) onSelect(id)
      }}
    >
      <FitBounds {...focus} padding={{ top: 72, bottom: 72, left: 72, right: roomForCard ? 430 : 72 }} />

      <AreaLayers areas={areas} />
      <RouteLines lines={lines} />
      {leg && <RouteOverlay route={leg} id="leg" />}
      {track && fixes.length > 1 && <RouteOverlay route={track} id="track" />}

      {SITES.map(({ site, at }) => (
        <LabelMarker key={`${site.id}-label`} position={at} dimmed={site.id !== selected.site}>
          <bdi dir="ltr">{site.id}</bdi>
        </LabelMarker>
      ))}

      {stop && stopAt && (
        <LabelMarker position={stopAt} tone="alert" above zIndex={40}>
          توقف {fmt(stop.length, 0)} دقيقة · <bdi dir="ltr">{hhmm(stop.from)}–{hhmm(stop.to)}</bdi>
        </LabelMarker>
      )}

      {FACILITIES.map(({ facility: f, at }) => {
        const mine = origin?.id === f.id
        const target = tripsByRisk.find((t) => tripOrigin(t)?.id === f.id)
        return (
          <FactoryPin
            key={f.id}
            position={at}
            name={f.activity}
            selected={mine}
            dimmed={!mine}
            onClick={target ? () => onSelect(target.id) : undefined}
          />
        )
      })}

      {COMP.drone
        .filter((d) => d.label === "old_dump" || selected.droneLinked)
        .map((d) => (
          <DronePin
            key={d.id}
            position={{ lat: d.lat, lng: d.lon }}
            old={d.label === "old_dump"}
            title={`${DRONE_LABEL[d.label] ?? d.label} · ${fmt(d.areaM2, 0)} م²`}
          />
        ))}

      {leg && <RouteBubble at={pointAlong(leg.path, 0.5)} meters={leg.distanceMeters} seconds={leg.durationSeconds} />}
      {truckAt && <TruckPin position={truckAt} />}
    </MapView>
  )
}
