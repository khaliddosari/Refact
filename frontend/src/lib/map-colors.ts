/**
 * Overlay colours for Google Maps. Its polylines and circles are drawn on a
 * canvas, where CSS variables do not resolve, so these are the theme's tokens
 * (index.css, :root) converted from oklch to hex once. Keep them in step.
 */
export const MAP = {
  /** --primary: routes, site geofences */
  primary: "#134b32",
  /** --forest: the dark casing under a highlighted route */
  forest: "#093423",
  /** --leaf: the highlighted route and factory */
  leaf: "#9be97f",
  /** --cream */
  cream: "#faf7eb",
  /** status red, for suspicious trips and forbidden exchanges */
  red: "#dc2626",
  /** an incompatible exchange: grey, not red */
  stone: "#a8a29e",
  white: "#ffffff",
} as const
