import { Map, NavigationControl, useMap, type MapLayerMouseEvent } from "@vis.gl/react-maplibre"
import * as maplibre from "maplibre-gl"
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"
import "maplibre-gl/dist/maplibre-gl.css"
import { useEffect, useRef, useState, type ReactNode } from "react"

import style from "@/components/maps/style.json"
import type { Bounds } from "@/lib/roads"
import { cn } from "@/lib/utils"

// The worker is its own file next to the library; say where the bundler put it.
maplibre.setWorkerUrl(workerUrl)

const MAP_STYLE = style as unknown as StyleSpecification

/** The map's own strings, in Arabic. */
const LOCALE = {
  "CooperativeGesturesHandler.WindowsHelpText": "استخدم Ctrl مع التمرير لتكبير الخريطة",
  "CooperativeGesturesHandler.MacHelpText": "استخدم ⌘ مع التمرير لتكبير الخريطة",
  "CooperativeGesturesHandler.MobileHelpText": "استخدم إصبعين لتحريك الخريطة",
  "NavigationControl.ZoomIn": "تكبير",
  "NavigationControl.ZoomOut": "تصغير",
  "AttributionControl.ToggleAttribution": "المصادر",
  "AttributionControl.MapFeedback": "ملاحظات على الخريطة",
}

/** The white chevron that shows which way a route runs. Drawn once, here, so there is no image asset. */
function chevron(): ImageData {
  const size = 36
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!
  ctx.strokeStyle = "#ffffff"
  ctx.lineWidth = 6
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.beginPath()
  ctx.moveTo(13, 8)
  ctx.lineTo(24, 18)
  ctx.lineTo(13, 28)
  ctx.stroke()
  return ctx.getImageData(0, 0, size, size)
}

function addChevron(map: MapLibreMap) {
  if (!map.hasImage("chevron")) map.addImage("chevron", chevron(), { pixelRatio: 2 })
}

/**
 * The map surface every screen shares: OpenStreetMap data from OpenFreeMap,
 * drawn with MapLibre in a light, Google-like style (style.json, built by
 * scripts/build_map_style.py).
 *
 * - `dir="ltr"`: maps never mirror; labels and markers inside set their own dir.
 * - `isolate`: keeps the map's own layers under the sticky header.
 * - Cooperative gestures ask for two fingers (or Ctrl + scroll), so a map
 *   inside a scrolling page never traps the scroll; "greedy" is for a map that
 *   is the page.
 * - Only the zoom buttons are left on, and the map never rotates or tilts.
 */
export function MapView({
  bounds,
  label,
  className,
  children,
  gesture = "cooperative",
  interactiveLayerIds,
  onClick,
}: {
  /** The area the map opens on. */
  bounds: Bounds
  /** Accessible name for the map region. */
  label: string
  className?: string
  children?: ReactNode
  gesture?: "cooperative" | "greedy"
  /** Layers a click can land on; the click's `features` name what was hit. */
  interactiveLayerIds?: string[]
  onClick?: (event: MapLayerMouseEvent) => void
}) {
  const [cursor, setCursor] = useState("")
  return (
    <div
      dir="ltr"
      role="region"
      aria-label={label}
      className={cn("map-surface relative isolate overflow-hidden rounded-xl bg-[#f5efe6]", className)}
    >
      <Map
        mapLib={maplibre}
        mapStyle={MAP_STYLE}
        initialViewState={{
          bounds: [
            [bounds.west, bounds.south],
            [bounds.east, bounds.north],
          ],
          fitBoundsOptions: { padding: 40 },
        }}
        style={{ width: "100%", height: "100%" }}
        minZoom={5}
        maxZoom={18}
        dragRotate={false}
        touchPitch={false}
        pitchWithRotate={false}
        cooperativeGestures={gesture === "cooperative"}
        locale={LOCALE}
        attributionControl={{ compact: true }}
        interactiveLayerIds={interactiveLayerIds}
        cursor={cursor}
        onClick={onClick}
        onMouseMove={interactiveLayerIds ? (e) => setCursor(e.features?.length ? "pointer" : "") : undefined}
        onLoad={(e) => {
          const map = e.target
          map.touchZoomRotate.disableRotation()
          addChevron(map)
          map.on("styleimagemissing", (m) => {
            if (m.id === "chevron") addChevron(map)
          })
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {children}
      </Map>
    </div>
  )
}

/** Moves the view when what it should frame changes (a selection, a trip). The first fit is instant. */
export function FitBounds({
  north,
  south,
  east,
  west,
  padding = 56,
  maxZoom = 16.5,
}: Bounds & { padding?: number | { top: number; right: number; bottom: number; left: number }; maxZoom?: number }) {
  const { current: map } = useMap()
  const first = useRef(true)
  const pad = typeof padding === "number" ? `${padding}` : `${padding.top}/${padding.right}/${padding.bottom}/${padding.left}`
  useEffect(() => {
    if (!map) return
    // A phone-wide map leaves a pin's name (up to ~160px) room on both sides.
    const narrow = map.getContainer().clientWidth < 520
    const fit = !narrow
      ? padding
      : typeof padding === "number"
        ? { top: padding, bottom: padding, left: 84, right: 84 }
        : { ...padding, left: Math.max(padding.left, 84), right: Math.max(padding.right, 84) }
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: fit, maxZoom, duration: first.current ? 0 : 700 }
    )
    first.current = false
    // `pad` is the padding's value; the object itself is new on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, north, south, east, west, pad, maxZoom])
  return null
}
