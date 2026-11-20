import { Polyline } from "@vis.gl/react-google-maps"

import { MAP } from "@/lib/map-colors"
import type { LatLng } from "@/lib/roads"

/**
 * A route as it is drawn on every map: a dark casing under the line when it is
 * highlighted, arrows along it to show the direction of travel, and a dash
 * (a repeated tick, which is how Google draws dashed lines) when the route is
 * not one to act on. `path` is the road path from Google, or two points when
 * the road route is unavailable, which draws a straight line.
 *
 * Colours are literal: Google draws on a canvas, where CSS variables do not
 * resolve (see lib/map-colors.ts).
 */
export function RoadLine({
  path,
  color = MAP.primary,
  weight = 4,
  opacity = 0.9,
  dashed,
  highlighted,
  arrows,
  zIndex = 2,
  onClick,
}: {
  path: LatLng[]
  color?: string
  weight?: number
  opacity?: number
  dashed?: boolean
  highlighted?: boolean
  arrows?: boolean
  zIndex?: number
  onClick?: () => void
}) {
  const dash: google.maps.IconSequence[] = [
    {
      icon: { path: "M 0,-1 0,1", strokeOpacity: opacity, strokeColor: color, strokeWeight: weight * 0.8, scale: 1 },
      offset: "0",
      repeat: `${weight * 3.5 + 6}px`,
    },
  ]
  const arrow: google.maps.IconSequence[] = [
    {
      icon: {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 2.4,
        strokeColor: MAP.forest,
        strokeWeight: 1,
        fillColor: MAP.white,
        fillOpacity: 1,
      },
      offset: "50%",
      repeat: "110px",
    },
  ]

  return (
    <>
      {highlighted && (
        <Polyline
          path={path}
          clickable={false}
          strokeColor={MAP.forest}
          strokeOpacity={0.95}
          strokeWeight={weight + 5}
          zIndex={zIndex + 10}
        />
      )}
      <Polyline
        path={path}
        clickable={!!onClick}
        onClick={onClick}
        strokeColor={color}
        strokeOpacity={dashed ? 0 : opacity}
        strokeWeight={weight}
        icons={dashed ? dash : arrows ? arrow : undefined}
        zIndex={zIndex + (highlighted ? 11 : 0)}
      />
    </>
  )
}
