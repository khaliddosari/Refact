#!/usr/bin/env python3
"""
Builds src/components/maps/style.json, the basemap, from OpenFreeMap's Liberty
style (a snapshot in scripts/map-source/liberty.json): the same OpenStreetMap
vector tiles, drawn in a light, Google-like palette.

  - Land is warm beige; built-up areas (residential, commercial, industrial) are
    pale grey; parks are soft green; water is light blue.
  - Roads are white with a pale blue-grey casing, arterials a little darker, and
    motorways slate blue, wider than Liberty draws them.
  - Labels are Arabic first (name:ar, then the local name), in grey with a white halo.
  - No POI icons, shields, sprites, 3D buildings or country and state labels:
    the map is a quiet ground for the routes, outlines and pins drawn over it.

A layer called "overlay-below-labels" marks where the app inserts its own
layers, so routes sit above the roads and under the labels.

    python scripts/build_map_style.py
"""

from __future__ import annotations

import copy
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "map-source" / "liberty.json"
OUT = HERE.parent / "src" / "components" / "maps" / "style.json"

# ---- palette (sampled from Google Maps screenshots of Riyadh, where noted)
LAND = "#f5efe6"  # sampled
BUILT = "#f5f3f1"  # sampled: built-up areas
INDUSTRIAL = "#f1efec"
PARK = "#cde9d1"
GRASS = "#e2eedb"
WATER = "#a9d3ef"
WATERWAY = "#bfe0e4"  # sampled: the pale wadi line
SAND = "#f2eadb"

MINOR_CASING = "#d3d9df"  # sampled
MINOR = "#ffffff"
SERVICE_CASING = "#dde2e7"
ARTERIAL_CASING = "#c3cbd5"
ARTERIAL = "#ffffff"
PRIMARY_CASING = "#a8b6c6"
PRIMARY = "#dae2eb"
MOTORWAY_CASING = "#6f889f"
MOTORWAY = "#8ba5bc"  # sampled: highways

TEXT = "#4d5560"
TEXT_ROAD = "#566676"
TEXT_PLACE = "#3a3f45"
TEXT_WATER = "#5a8db8"
HALO = "rgba(255,255,255,0.92)"

ARABIC_FIRST = ["coalesce", ["get", "name:ar"], ["get", "name"], ["get", "name_en"]]

DROP_EXACT = {
    "natural_earth",
    "building-3d",
    "park_outline",
    "poi_transit",
    "airport",
    "boundary_3",
    "boundary_2",
    "boundary_disputed",
    "label_state",
    "label_country_1",
    "label_country_2",
    "label_country_3",
    "label_city_capital",
    "road_area_pattern",
    "road_major_rail_hatching",
    "road_transit_rail",
    "road_transit_rail_hatching",
    "tunnel_major_rail",
    "tunnel_major_rail_hatching",
    "tunnel_transit_rail",
    "tunnel_transit_rail_hatching",
    "bridge_major_rail",
    "bridge_major_rail_hatching",
    "bridge_transit_rail",
    "bridge_transit_rail_hatching",
    "aeroway_taxiway",
}
DROP_PREFIX = ("poi_", "highway-shield", "road_shield", "road_one_way")


def scaled(width, factor: float):
    """Multiply every output of a zoom-interpolated width."""
    if isinstance(width, (int, float)):
        return width * factor
    if isinstance(width, list) and width and width[0] == "interpolate":
        out = list(width[:3])
        rest = width[3:]
        for i in range(0, len(rest), 2):
            value = rest[i + 1]
            out += [rest[i], round(value * factor, 3) if isinstance(value, (int, float)) else value]
        return out
    return width


def road_colours(layer: dict) -> None:
    """Colour and weigh a road layer by its id."""
    lid = layer["id"]
    paint = layer["paint"]
    is_casing = lid.endswith("_casing")
    # tunnels and bridges take the colours of the road they carry
    kind = lid.split("_", 1)[1] if "_" in lid else lid
    kind = kind.replace("_casing", "")

    if kind.startswith("motorway"):
        paint["line-color"] = MOTORWAY_CASING if is_casing else MOTORWAY
        paint["line-width"] = scaled(paint["line-width"], 1.55)
    elif kind.startswith("trunk_primary"):
        paint["line-color"] = PRIMARY_CASING if is_casing else PRIMARY
        paint["line-width"] = scaled(paint["line-width"], 1.3)
    elif kind.startswith("secondary_tertiary"):
        paint["line-color"] = ARTERIAL_CASING if is_casing else ARTERIAL
        paint["line-width"] = scaled(paint["line-width"], 1.15)
    elif kind.startswith("link"):
        paint["line-color"] = ARTERIAL_CASING if is_casing else ARTERIAL
    elif kind.startswith("service_track"):
        paint["line-color"] = SERVICE_CASING if is_casing else MINOR
    elif kind.startswith("street") or kind.startswith("minor"):
        paint["line-color"] = MINOR_CASING if is_casing else MINOR
    elif kind.startswith("path_pedestrian"):
        paint["line-color"] = "#e6e2da" if not is_casing else "#ffffff00"
    elif kind.startswith("major_rail"):
        paint["line-color"] = "#c6cbd2"
    if lid.startswith("tunnel_"):
        paint["line-opacity"] = 0.55


def style_label(layer: dict) -> None:
    layout = layer.setdefault("layout", {})
    paint = layer.setdefault("paint", {})
    lid = layer["id"]
    if "text-field" in layout:
        layout["text-field"] = ARABIC_FIRST
    for key in [k for k in layout if k.startswith("icon-")]:
        del layout[key]
    layout.pop("text-transform", None)
    layout.pop("text-letter-spacing", None)
    if lid in {"label_city", "label_town", "label_village"}:
        # Liberty puts these above a dot; with no dot the name sits on its place
        layout.pop("text-anchor", None)
        layout.pop("text-offset", None)
    layout["text-font"] = ["Noto Sans Regular"]
    if lid.startswith("highway-name"):
        paint.update({"text-color": TEXT_ROAD, "text-halo-color": HALO, "text-halo-width": 1.6, "text-halo-blur": 0.4})
    elif lid.startswith("water") or lid.startswith("waterway"):
        paint.update({"text-color": TEXT_WATER, "text-halo-color": HALO, "text-halo-width": 1.4})
    else:
        paint.update({"text-color": TEXT_PLACE if lid in {"label_city", "label_town"} else TEXT, "text-halo-color": HALO, "text-halo-width": 1.6, "text-halo-blur": 0.4})
        if lid == "label_other":
            paint["text-color"] = "#6a727c"
        if lid in {"label_city", "label_town"}:
            layout["text-font"] = ["Noto Sans Bold"]


def restyle(layer: dict) -> dict | None:
    lid = layer["id"]
    if lid in DROP_EXACT or lid.startswith(DROP_PREFIX):
        return None
    layer = copy.deepcopy(layer)
    paint = layer.setdefault("paint", {})
    kind = layer["type"]

    if lid == "background":
        paint["background-color"] = LAND
    elif lid == "park":
        paint.update({"fill-color": PARK, "fill-opacity": 0.85})
        paint.pop("fill-outline-color", None)
    elif lid == "landuse_residential":
        layer.pop("maxzoom", None)
        paint["fill-color"] = BUILT
    elif lid == "landcover_grass":
        paint.update({"fill-color": GRASS, "fill-opacity": 0.7})
    elif lid == "landcover_wood":
        paint.update({"fill-color": "#d6e9d0", "fill-opacity": 0.7})
    elif lid == "landcover_wetland":
        paint.update({"fill-color": "#dbeadf", "fill-opacity": 0.6})
    elif lid == "landcover_ice":
        paint.update({"fill-color": "#ffffff", "fill-opacity": 0.6})
    elif lid == "landcover_sand":
        paint["fill-color"] = SAND
    elif lid in {"landuse_pitch", "landuse_track"}:
        paint["fill-color"] = "#d9ecd3"
    elif lid == "landuse_cemetery":
        paint["fill-color"] = "#e6ede1"
    elif lid == "landuse_hospital":
        paint["fill-color"] = "#f6e6e3"
    elif lid == "landuse_school":
        paint["fill-color"] = "#f3ebdf"
    elif lid == "water":
        paint["fill-color"] = WATER
    elif lid.startswith("waterway") and kind == "line":
        paint["line-color"] = WATERWAY
    elif lid == "aeroway_fill":
        paint["fill-color"] = "#ece6dc"
    elif lid == "aeroway_runway":
        paint["line-color"] = "#e0dbd0"
    elif lid == "building":
        layer["minzoom"] = 14
        layer.pop("maxzoom", None)
        paint.update({"fill-color": "#ebe7df", "fill-outline-color": "#ddd8cd"})
    elif kind == "line" and lid.split("_")[0] in {"road", "bridge", "tunnel"}:
        road_colours(layer)
    elif kind == "symbol":
        style_label(layer)
    return layer


def main() -> None:
    liberty = json.loads(SOURCE.read_text("utf-8"))
    layers = [l for l in (restyle(layer) for layer in liberty["layers"]) if l]

    # Built-up land the Liberty style leaves to the background: one fill for
    # every kind, under the roads and the water.
    built = {
        "id": "landuse_built",
        "type": "fill",
        "source": "openmaptiles",
        "source-layer": "landuse",
        "filter": ["match", ["get", "class"], ["residential", "suburb", "neighbourhood", "commercial", "retail", "garages"], True, False],
        "paint": {"fill-color": BUILT},
    }
    industrial = {
        "id": "landuse_industrial",
        "type": "fill",
        "source": "openmaptiles",
        "source-layer": "landuse",
        "filter": ["==", ["get", "class"], "industrial"],
        "paint": {"fill-color": INDUSTRIAL},
    }
    at = next(i for i, l in enumerate(layers) if l["id"] == "landuse_residential")
    layers[at : at + 1] = [built, industrial]

    # the slot the app's own layers go before: above the roads, under every label
    first_symbol = next(i for i, l in enumerate(layers) if l["type"] == "symbol")
    layers.insert(first_symbol, {"id": "overlay-below-labels", "type": "background", "paint": {"background-opacity": 0}})

    style = {
        "version": 8,
        "name": "Refact",
        "metadata": {"about": "Generated by scripts/build_map_style.py from OpenFreeMap Liberty."},
        "sources": {"openmaptiles": liberty["sources"]["openmaptiles"]},
        "glyphs": liberty["glyphs"],
        "layers": layers,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(style, ensure_ascii=False, separators=(",", ":")), "utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB, {len(layers)} layers)")


if __name__ == "__main__":
    main()
