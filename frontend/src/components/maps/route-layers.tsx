import { Layer, Source } from "@vis.gl/react-maplibre"
import type { ExpressionSpecification } from "maplibre-gl"
import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson"
import { useMemo } from "react"

import { MAP } from "@/lib/map-colors"
import { turnPoints, type LatLng, type RoadRoute } from "@/lib/roads"

/**
 * Everything drawn over the basemap, as GeoJSON sources and layers: routes
 * with a dark casing, traffic, direction chevrons and turn dots (the way
 * Google draws a route), and areas (the dotted red outline round a selected
 * factory, a site's geofence).
 *
 * Every layer goes in before "overlay-below-labels" (a placeholder in
 * style.json), so routes lie over the roads and under the labels. Colours are
 * literals (lib/map-colors.ts): the map draws on a canvas, where CSS variables
 * do not resolve.
 */

const SLOT = "overlay-below-labels"

const lngLat = (p: LatLng): [number, number] => [p.lng, p.lat]
const lineOf = (path: LatLng[]): LineString => ({ type: "LineString", coordinates: path.map(lngLat) })

/** A width read from a feature's property, scaled with the zoom: `key` px at zoom 13. */
const widthBy = (key: string): ExpressionSpecification =>
  [
    "interpolate",
    ["exponential", 1.6],
    ["zoom"],
    8,
    ["*", ["get", key], 0.3],
    13,
    ["get", key],
    17,
    ["*", ["get", key], 2],
  ] as unknown as ExpressionSpecification

/* Routes */

export type RouteLook = "route" | "alert" | "muted" | "rejected" | "forbidden"
export type RouteState = "idle" | "selected" | "dimmed"

export type RouteLine = {
  /** Reported by a click on the line (a feature's `id` property). */
  id: string
  path: LatLng[]
  look: RouteLook
  state: RouteState
  /** Width in px at zoom 13 when not selected. */
  width?: number
}

const LOOKS: Record<RouteLook, { color: string; dashed: boolean; opacity: number }> = {
  route: { color: MAP.route, dashed: false, opacity: 0.78 },
  alert: { color: MAP.red, dashed: false, opacity: 0.7 },
  muted: { color: "#8c98a4", dashed: false, opacity: 0.8 },
  rejected: { color: "#8c98a4", dashed: true, opacity: 0.9 },
  forbidden: { color: MAP.red, dashed: true, opacity: 0.9 },
}

function routeFeature(line: RouteLine): Feature<LineString> {
  const look = LOOKS[line.look]
  // A selected route takes the Google route look; a dashed one keeps its own
  // colour (it is a route not to take) and only grows.
  const lit = line.state === "selected" && !look.dashed
  const base = line.width ?? 3.5
  return {
    type: "Feature",
    geometry: lineOf(line.path),
    properties: {
      id: line.id,
      color: lit ? MAP.route : look.color,
      casing: lit ? MAP.routeCasing : "",
      w: lit ? 8 : line.state === "selected" ? base + 2.5 : line.state === "dimmed" ? base * 0.8 : base,
      cw: lit ? 11.5 : 0,
      opacity: line.state === "selected" ? 1 : line.state === "dimmed" ? 0.22 : look.opacity,
      dash: look.dashed,
      z: line.state === "selected" ? 30 : line.state === "idle" ? 10 : 5,
    },
  }
}

export function RouteLines({ lines }: { lines: RouteLine[] }) {
  const data = useMemo<FeatureCollection<LineString>>(
    () => ({ type: "FeatureCollection", features: lines.map(routeFeature) }),
    [lines]
  )
  const layout = { "line-cap": "round", "line-join": "round", "line-sort-key": ["get", "z"] } as const
  return (
    <Source id="routes" type="geojson" data={data}>
      <Layer
        id="routes-casing"
        type="line"
        beforeId={SLOT}
        filter={["!=", ["get", "casing"], ""]}
        layout={layout as never}
        paint={{ "line-color": ["get", "casing"], "line-width": widthBy("cw"), "line-opacity": ["get", "opacity"] }}
      />
      <Layer
        id="routes-solid"
        type="line"
        beforeId={SLOT}
        filter={["!", ["get", "dash"]]}
        layout={layout as never}
        paint={{ "line-color": ["get", "color"], "line-width": widthBy("w"), "line-opacity": ["get", "opacity"] }}
      />
      <Layer
        id="routes-dashed"
        type="line"
        beforeId={SLOT}
        filter={["get", "dash"]}
        layout={{ "line-cap": "butt", "line-join": "round", "line-sort-key": ["get", "z"] }}
        paint={{
          "line-color": ["get", "color"],
          "line-width": widthBy("w"),
          "line-opacity": ["get", "opacity"],
          "line-dasharray": [2, 1.6],
        }}
      />
      {/* A wide invisible copy, so a thin line is easy to hit with a finger */}
      <Layer id="routes-hit" type="line" beforeId={SLOT} layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-width": 18, "line-opacity": 0 }} />
    </Source>
  )
}

/**
 * What a selected road route adds: its traffic (orange slow, red heavy), the
 * chevrons that show the direction, and white dots at the turns.
 */
export function RouteOverlay({ route, id = "selected" }: { route: RoadRoute; id?: string }) {
  const traffic = useMemo<FeatureCollection<LineString>>(
    () => ({
      type: "FeatureCollection",
      features: route.traffic.map((run) => ({
        type: "Feature",
        geometry: lineOf(route.path.slice(run.from, run.to + 1)),
        properties: { level: run.level, w: 8 },
      })),
    }),
    [route]
  )
  const whole = useMemo<FeatureCollection<LineString>>(
    () => ({ type: "FeatureCollection", features: [{ type: "Feature", geometry: lineOf(route.path), properties: {} }] }),
    [route]
  )
  const turns = useMemo<FeatureCollection<Point>>(
    () => ({
      type: "FeatureCollection",
      features: turnPoints(route.path).map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: lngLat(p) }, properties: {} })),
    }),
    [route]
  )
  return (
    <>
      <Source id={`${id}-traffic`} type="geojson" data={traffic}>
        <Layer
          id={`${id}-traffic`}
          type="line"
          beforeId={SLOT}
          layout={{ "line-cap": "butt", "line-join": "round" }}
          paint={{ "line-color": ["match", ["get", "level"], 2, MAP.heavy, MAP.slow], "line-width": widthBy("w") }}
        />
      </Source>
      <Source id={`${id}-direction`} type="geojson" data={whole}>
        <Layer
          id={`${id}-chevrons`}
          type="symbol"
          beforeId={SLOT}
          layout={{
            "symbol-placement": "line",
            "symbol-spacing": 120,
            "icon-image": "chevron",
            "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.45, 15, 0.85, 18, 1.1],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
        />
      </Source>
      <Source id={`${id}-turns`} type="geojson" data={turns}>
        <Layer
          id={`${id}-turns`}
          type="circle"
          beforeId={SLOT}
          minzoom={11}
          paint={{
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 2, 15, 3.6, 18, 5],
            "circle-color": MAP.white,
            "circle-stroke-color": "#3b10ea",
            "circle-stroke-width": 1.6,
          }}
        />
      </Source>
    </>
  )
}

/* Areas */

/**
 * outline       a selected factory or facility: dotted red, as Google marks a place
 * site          a site's geofence at rest: a thin green line
 * site-selected the geofence of the selected trip's site: dotted red
 * stop          where a vehicle stood still: a red ring
 */
export type AreaLook = "outline" | "site" | "site-selected" | "stop"

export type Area = {
  id: string
  /** A closed ring of [lng, lat]. */
  ring: [number, number][]
  look: AreaLook
}

const AREAS: Record<AreaLook, { color: string; fill: number; dotted: boolean; width: number }> = {
  outline: { color: MAP.outline, fill: 0.09, dotted: true, width: 2.4 },
  "site-selected": { color: MAP.outline, fill: 0.12, dotted: true, width: 2.4 },
  site: { color: MAP.primary, fill: 0.08, dotted: false, width: 1.4 },
  stop: { color: MAP.red, fill: 0.16, dotted: false, width: 2 },
}

export function AreaLayers({ areas }: { areas: Area[] }) {
  const data = useMemo<FeatureCollection<Polygon>>(
    () => ({
      type: "FeatureCollection",
      features: areas.map((a) => {
        const look = AREAS[a.look]
        return {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [a.ring] },
          properties: { id: a.id, color: look.color, fill: look.fill, dotted: look.dotted, w: look.width },
        }
      }),
    }),
    [areas]
  )
  const dotWidth = ["interpolate", ["linear"], ["zoom"], 8, 1.6, 14, ["get", "w"], 18, ["*", ["get", "w"], 1.3]] as unknown as ExpressionSpecification
  return (
    <Source id="areas" type="geojson" data={data}>
      <Layer id="areas-fill" type="fill" beforeId={SLOT} paint={{ "fill-color": ["get", "color"], "fill-opacity": ["get", "fill"] }} />
      <Layer
        id="areas-solid"
        type="line"
        beforeId={SLOT}
        filter={["!", ["get", "dotted"]]}
        layout={{ "line-join": "round" }}
        paint={{ "line-color": ["get", "color"], "line-width": ["get", "w"] }}
      />
      <Layer
        id="areas-dotted"
        type="line"
        beforeId={SLOT}
        filter={["get", "dotted"]}
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": ["get", "color"], "line-width": dotWidth, "line-dasharray": [0.1, 2.1] }}
      />
    </Source>
  )
}
