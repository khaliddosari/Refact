import { Circle } from "@vis.gl/react-google-maps"

import { FitBounds, MapView } from "@/components/maps/map-view"
import { DronePin, FactoryPin, LabelMarker, TruckPin } from "@/components/maps/pins"
import { RoadLine } from "@/components/maps/road-line"
import { COMP, gpsFor, siteById, tripOrigin, tripsByRisk } from "@/data"
import type { GpsPoint, Trip } from "@/data/types"
import { useRoadRoutes, type RouteRequest } from "@/hooks/use-road-routes"
import { DRONE_LABEL, fmt, hhmm } from "@/lib/format"
import { MAP } from "@/lib/map-colors"
import { boundsOf, positionOnTrack, trackStops, type LatLng, type RoadRoute } from "@/lib/roads"

const FACILITIES = COMP.facilities.map((f) => ({ facility: f, at: { lat: f.lat, lng: f.lon } }))
const SITES = COMP.sites.map((s) => ({ site: s, at: { lat: s.lat, lng: s.lon } }))
const EVERYTHING = boundsOf([
  ...FACILITIES.map((f) => f.at),
  ...SITES.map((s) => s.at),
  ...COMP.gps.map((p) => ({ lat: p.lat, lng: p.lon })),
])

/** The expected road from each trip's facility to the site it reported (module level: requested once). */
function legOf(t: Trip): LatLng[] | null {
  const origin = tripOrigin(t)
  const site = t.site ? siteById.get(t.site) : undefined
  return origin && site ? [{ lat: origin.lat, lng: origin.lon }, { lat: site.lat, lng: site.lon }] : null
}
const TRIP_REQUESTS: RouteRequest[] = COMP.trips.flatMap((t) => {
  const stops = legOf(t)
  return stops ? [{ id: t.id, stops }] : []
})

/** The recorded track of a trip, as the stops a road route has to pass through. */
export function trackRequest(trip: Trip): RouteRequest | null {
  const points = gpsFor(trip)
  if (points.length < 2) return null
  return { id: `track-${trip.id}`, stops: trackStops(points).stops }
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
 * Selecting a trip highlights its facility (named, pulsing) and the site it
 * reported (stronger geofence), lights its route, and pushes the rest back.
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
  /** The selected trip's GPS track snapped to roads: undefined while loading, null if unavailable. */
  track: RoadRoute | null | undefined
  /** The details card floats over the end side of the map: keep the trip clear of it. */
  roomForCard: boolean
  className?: string
}) {
  const roads = useRoadRoutes(TRIP_REQUESTS)
  const selected = COMP.trips.find((t) => t.id === selectedId)!
  const fixes = gpsFor(selected)
  const origin = tripOrigin(selected)
  const selectedSite = selected.site ? siteById.get(selected.site) : undefined
  const stop = longestStop(fixes)
  const stopAt = stop ? positionOnTrack(fixes, stop.fromMinute, track) : null

  // What the view frames: the trip's own geography.
  const own: LatLng[] = [
    ...(origin ? [{ lat: origin.lat, lng: origin.lon }] : []),
    ...(selectedSite ? [{ lat: selectedSite.lat, lng: selectedSite.lon }] : []),
    ...(track ? track.path : fixes.map((p) => ({ lat: p.lat, lng: p.lon }))),
    ...(roads[selected.id]?.path ?? []),
  ]
  const focus = own.length > 1 ? boundsOf(own) : EVERYTHING

  // Clean trips mount first so suspicious ones draw above them.
  const ordered = [...tripsByRisk].sort((a, b) => Number(a.suspicious) - Number(b.suspicious))

  return (
    <MapView
      bounds={EVERYTHING}
      label="خريطة تتبع رحلات نقل النفايات"
      gesture={roomForCard ? "greedy" : "cooperative"}
      className={className}
    >
      <FitBounds {...focus} padding={{ top: 72, bottom: 72, left: 72, right: roomForCard ? 430 : 72 }} />

      {SITES.map(({ site, at }) => {
        const chosen = site.id === selected.site
        return (
          <Circle
            key={site.id}
            center={at}
            radius={site.geofenceM}
            clickable={false}
            strokeColor={MAP.primary}
            strokeWeight={chosen ? 3 : 1.5}
            strokeOpacity={chosen ? 1 : 0.55}
            fillColor={MAP.primary}
            fillOpacity={chosen ? 0.28 : 0.1}
            zIndex={1}
          />
        )
      })}
      {SITES.map(({ site, at }) => (
        <LabelMarker key={`${site.id}-label`} position={at} dimmed={site.id !== selected.site}>
          <bdi dir="ltr">{site.id}</bdi>
        </LabelMarker>
      ))}

      {ordered.map((t) => {
        const stops = legOf(t)
        const road = roads[t.id]
        if (!stops || road === undefined) return null
        const isSelected = t.id === selectedId
        return (
          <RoadLine
            key={t.id}
            path={road?.path ?? stops}
            color={t.suspicious ? MAP.red : MAP.stone}
            weight={isSelected ? 6 : 3}
            opacity={isSelected ? 0.95 : 0.4}
            highlighted={isSelected}
            arrows={isSelected}
            zIndex={isSelected ? 20 : 2}
            onClick={() => onSelect(t.id)}
          />
        )
      })}

      {fixes.length > 1 && (track !== undefined) && (
        <RoadLine
          path={track ? track.path : fixes.map((p) => ({ lat: p.lat, lng: p.lon }))}
          color={MAP.red}
          weight={6}
          highlighted
          arrows
          zIndex={25}
        />
      )}

      {stop && stopAt && (
        <>
          <Circle
            center={stopAt}
            radius={140}
            clickable={false}
            strokeColor={MAP.red}
            strokeWeight={2}
            fillColor={MAP.red}
            fillOpacity={0.16}
            zIndex={26}
          />
          <LabelMarker position={stopAt} tone="alert" above zIndex={40}>
            توقف {fmt(stop.length, 0)} دقيقة · <bdi dir="ltr">{hhmm(stop.from)}–{hhmm(stop.to)}</bdi>
          </LabelMarker>
        </>
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

      {truckAt && <TruckPin position={truckAt} />}
    </MapView>
  )
}
