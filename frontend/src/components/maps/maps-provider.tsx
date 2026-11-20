import { APIProvider } from "@vis.gl/react-google-maps"
import type { ReactNode } from "react"

/** Set in .env.local (see .env.example). Without it the map screens say what is missing. */
export const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || undefined

/** A Map ID is required for advanced markers; Google's demo id works until you make a styled one. */
export const MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID?.trim() || "DEMO_MAP_ID"

/**
 * Loads the Maps JavaScript API for a screen that draws a map, in Arabic and
 * for Saudi Arabia (labels, road names and the "use two fingers" hint). Libraries are
 * fetched on demand by whoever needs them, the map by <Map>, routing by the
 * road-routes hook, so a screen without a map never loads Google at all.
 */
export function MapsProvider({ children }: { children: ReactNode }) {
  if (!MAPS_KEY) return <>{children}</>
  return (
    <APIProvider apiKey={MAPS_KEY} language="ar" region="SA">
      {children}
    </APIProvider>
  )
}
