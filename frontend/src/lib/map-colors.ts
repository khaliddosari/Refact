/**
 * Colours the map layers use. MapLibre draws on a canvas, where CSS variables
 * do not resolve, so these are literals: the Google-like route palette (sampled
 * from Google Maps screenshots), plus the theme's own tokens (index.css, :root)
 * converted from oklch to hex once. Keep the theme ones in step.
 */
export const MAP = {
  /** The route line */
  route: "#440dfd",
  /** The dark edge round the route */
  routeCasing: "#1a0083",
  /** Slow traffic on a route */
  slow: "#fdb33a",
  /** Heavy traffic on a route */
  heavy: "#d9304f",
  /** The time and distance bubble */
  bubble: "#0b25d1",
  /** The dotted outline round a selected factory or site */
  outline: "#ea4335",
  /** --primary: site geofences */
  primary: "#134b32",
  /** --forest */
  forest: "#093423",
  /** --leaf: the highlighted factory */
  leaf: "#9be97f",
  /** --cream */
  cream: "#faf7eb",
  /** status red, for suspicious trips and forbidden exchanges */
  red: "#dc2626",
  /** an incompatible exchange, and trips that are fine: grey, not red */
  stone: "#a8a29e",
  white: "#ffffff",
} as const
