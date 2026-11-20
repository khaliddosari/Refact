import { useMapsLibrary } from "@vis.gl/react-google-maps"
import { useEffect, useState } from "react"

import { MAPS_KEY } from "@/components/maps/maps-provider"
import { roadRoute, type LatLng, type RoadRoute } from "@/lib/roads"

export type RouteRequest = { id: string; stops: LatLng[] }

/**
 * Road routes by request id: `undefined` while loading, `null` if Google could
 * not route it (the caller draws a straight line), a route when ready.
 *
 * Pass an array that is stable between renders (module level or memoised):
 * a new array is a new set of requests.
 */
type Routes = Record<string, RoadRoute | null | undefined>

function useRoadRoutesLive(requests: RouteRequest[]): Routes {
  const routes = useMapsLibrary("routes")
  const [found, setFound] = useState<Routes>({})

  useEffect(() => {
    if (!routes) return
    let live = true
    for (const { id, stops } of requests) {
      roadRoute(routes, stops).then((route) => {
        if (live) setFound((prev) => (prev[id] !== undefined ? prev : { ...prev, [id]: route }))
      })
    }
    return () => {
      live = false
    }
  }, [routes, requests])

  return found
}

const NONE: Routes = {}
const useRoadRoutesOff: typeof useRoadRoutesLive = () => NONE

/**
 * Chosen once, at load: without a key there is no provider, and
 * `useMapsLibrary` must not be called outside one.
 */
export const useRoadRoutes = MAPS_KEY ? useRoadRoutesLive : useRoadRoutesOff
