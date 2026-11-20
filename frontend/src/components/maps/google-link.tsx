import { ExternalLink } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import type { LatLng } from "@/lib/roads"
import { cn } from "@/lib/utils"

/**
 * Google Maps' own URL scheme (developers.google.com/maps/documentation/urls):
 * the official, keyless way to open Google Maps itself with a driving route
 * between two points, and up to three stops along the way. It works with or
 * without the Maps API key the in-app maps use.
 */
export function googleDirectionsUrl(origin: LatLng, destination: LatLng, via: LatLng[] = []) {
  const point = (p: LatLng) => `${p.lat},${p.lng}`
  const params = new URLSearchParams({
    api: "1",
    origin: point(origin),
    destination: point(destination),
    travelmode: "driving",
  })
  if (via.length > 0) params.set("waypoints", via.slice(0, 3).map(point).join("|"))
  return `https://www.google.com/maps/dir/?${params}`
}

/** A button that opens the route in Google Maps, in a new tab. */
export function GoogleMapsLink({
  origin,
  destination,
  via,
  className,
}: {
  origin: LatLng
  destination: LatLng
  via?: LatLng[]
  className?: string
}) {
  return (
    <a
      href={googleDirectionsUrl(origin, destination, via)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: "outline" }), "h-10 gap-1.5 rounded-xl bg-card px-3 lg:h-9", className)}
    >
      <ExternalLink aria-hidden="true" />
      خرائط Google
      <span className="sr-only">(يفتح في نافذة جديدة)</span>
    </a>
  )
}
