#!/usr/bin/env python3
"""
Builds src/data/map-data.json: everything the two map screens draw that is not
the basemap, worked out once here so the app needs no routing service at run time.

  routes     A driving route for each exchange that goes by truck, each trip's
             expected leg (facility to site), and the recorded GPS track snapped
             to the roads. Geometry is OSRM's, on OpenStreetMap data. Each carries
             its length, its time, and the stretches drawn orange and red.
  outlines   A polygon around each factory and facility: the block of roads it
             stands in, from OpenStreetMap, or an octagon where the roads do not
             close round it. These are the dotted red outlines.

Traffic is illustrative. There is no live traffic source in the data pack, so
the orange and red stretches are picked per route by a seeded generator, only on
its faster roads, and their delay is added to the time. The same route always
gets the same traffic.

Needs the internet (the public OSRM and Overpass servers) and shapely:

    pip install shapely
    python scripts/build_map_data.py

Responses are cached in scripts/.cache, so a second run is quick and polite.
"""

from __future__ import annotations

import hashlib
import json
import math
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from shapely.geometry import LineString, Point, Polygon
from shapely.ops import polygonize, unary_union

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "src" / "data" / "refact-data.json"
OUT = HERE.parent / "src" / "data" / "map-data.json"
CACHE = HERE / ".cache"

UA = "refact-demo-build/1.0 (one-off build script)"
OSRM = "https://router.project-osrm.org"
OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# Exchanges that are not trucked: heat and treated water move by pipe, so the
# app draws them as straight lines and they get no road route.
PIPED = {"energy", "water"}

# Traffic levels: 1 slow (orange), 2 heavy (red); time on the stretch is
# multiplied by these.
SLOWDOWN = {1: 1.5, 2: 2.7}

HIGHWAYS = (
    "motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street|"
    "motorway_link|trunk_link|primary_link|secondary_link|tertiary_link"
)


# ---------------------------------------------------------------- plumbing


def fetch(url: str, data: bytes | None = None, tries: int = 5, pause: float = 1.1):
    """GET or POST, parse JSON, cache on disk. Retries with a growing wait."""
    CACHE.mkdir(exist_ok=True)
    key = hashlib.sha1((url + (data.decode() if data else "")).encode()).hexdigest()
    cached = CACHE / f"{key}.json"
    if cached.exists():
        return json.loads(cached.read_text("utf-8"))
    last: Exception | None = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=120) as response:
                body = json.load(response)
            cached.write_text(json.dumps(body), "utf-8")
            time.sleep(pause)
            return body
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            last = error
            time.sleep(pause * (attempt + 2) * 2)
    raise RuntimeError(f"{url[:120]} failed: {last}")


def overpass(query: str):
    body = urllib.parse.urlencode({"data": query}).encode()
    errors = []
    for endpoint in OVERPASS:
        try:
            return fetch(endpoint, body, tries=2, pause=2.0)
        except RuntimeError as error:
            errors.append(str(error))
    raise RuntimeError("; ".join(errors))


def log(message: str) -> None:
    print(message, flush=True)


# ---------------------------------------------------------------- geometry


def haversine(a: tuple[float, float], b: tuple[float, float]) -> float:
    (la1, lo1), (la2, lo2) = a, b
    p1, p2 = math.radians(la1), math.radians(la2)
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lo2 - lo1) / 2) ** 2
    return 2 * 6_371_000 * math.asin(min(1.0, math.sqrt(h)))


def decode(text: str, precision: int = 6) -> list[tuple[float, float]]:
    """Google's polyline format, as (lat, lon) pairs."""
    factor = 10**precision
    points, index, lat, lon = [], 0, 0, 0
    while index < len(text):
        for axis in (0, 1):
            shift = result = 0
            while True:
                byte = ord(text[index]) - 63
                index += 1
                result |= (byte & 0x1F) << shift
                shift += 5
                if byte < 0x20:
                    break
            delta = ~(result >> 1) if result & 1 else result >> 1
            if axis == 0:
                lat += delta
            else:
                lon += delta
        points.append((lat / factor, lon / factor))
    return points


def encode(points: list[tuple[float, float]], precision: int = 6) -> str:
    factor = 10**precision
    out, prev_lat, prev_lon = [], 0, 0
    for lat, lon in points:
        la, lo = round(lat * factor), round(lon * factor)
        for value in (la - prev_lat, lo - prev_lon):
            value = ~(value << 1) if value < 0 else value << 1
            while value >= 0x20:
                out.append(chr((0x20 | (value & 0x1F)) + 63))
                value >>= 5
            out.append(chr(value + 63))
        prev_lat, prev_lon = la, lo
    return "".join(out)


# ---------------------------------------------------------------- OSRM


def osrm_route(stops: list[tuple[float, float]]):
    """One driving route through the stops, with a speed and length for every segment."""
    coords = ";".join(f"{lon:.6f},{lat:.6f}" for lat, lon in stops)
    url = (
        f"{OSRM}/route/v1/driving/{coords}?overview=full&geometries=polyline6"
        "&annotations=speed,duration,distance&continue_straight=false&steps=false"
    )
    reply = fetch(url)
    if reply.get("code") != "Ok":
        raise RuntimeError(f"OSRM said {reply.get('code')} for {stops}")
    route = reply["routes"][0]
    points = decode(route["geometry"])
    legs = route["legs"]
    speed = [v for leg in legs for v in leg["annotation"]["speed"]]
    dist = [v for leg in legs for v in leg["annotation"]["distance"]]
    dur = [v for leg in legs for v in leg["annotation"]["duration"]]
    if not (len(points) - 1 == len(speed) == len(dist) == len(dur)):
        raise RuntimeError(f"annotations do not line up with the geometry for {stops}")
    return {"pts": points, "speed": speed, "dist": dist, "dur": dur, "m": route["distance"], "s": route["duration"]}


def osrm_nearest(point: tuple[float, float], number: int = 6, within: float = 400.0):
    lat, lon = point
    reply = fetch(f"{OSRM}/nearest/v1/driving/{lon:.6f},{lat:.6f}?number={number}")
    found = [(w["location"][1], w["location"][0], w["distance"]) for w in reply.get("waypoints", []) if w["distance"] <= within]
    return found or [(w["location"][1], w["location"][0], w["distance"]) for w in reply.get("waypoints", [])[:1]]


def osrm_table(sources: list[tuple[float, float]], targets: list[tuple[float, float]]):
    """Road distance in metres from each source to each target (None where there is no road)."""
    coords = ";".join(f"{lon:.6f},{lat:.6f}" for lat, lon in sources + targets)
    src = ";".join(str(i) for i in range(len(sources)))
    dst = ";".join(str(len(sources) + i) for i in range(len(targets)))
    reply = fetch(f"{OSRM}/table/v1/driving/{coords}?sources={src}&destinations={dst}&annotations=distance")
    return reply["distances"]


# ---------------------------------------------------------------- traffic


def synth_traffic(route_id: str, dist: list[float], speed: list[float]) -> list[list[int]]:
    """
    Orange and red stretches as [first segment, end segment, level], chosen on the
    route's faster roads (45 km/h and up, never within 350 m of an end). Seeded
    by the route id, so a route's traffic never changes between builds.
    """
    total = sum(dist)
    if total < 1500:
        return []
    rng = random.Random(int(hashlib.sha1(route_id.encode()).hexdigest()[:8], 16))
    cum = [0.0]
    for d in dist:
        cum.append(cum[-1] + d)
    fast = [s for s in range(len(dist)) if speed[s] >= 12.5 and cum[s] > 350 and cum[s + 1] < total - 350]
    if not fast:
        return []
    wanted = 1 if total < 9000 else 2
    if rng.random() < 0.2:
        wanted -= 1
    taken: list[tuple[int, int]] = []
    runs: list[list[int]] = []
    for _ in range(wanted):
        for _try in range(12):
            first = rng.choice(fast)
            length = rng.uniform(280, 760)
            end, run = first, 0.0
            while end < len(dist) and speed[end] >= 12.5 and run < length:
                run += dist[end]
                end += 1
            if run < 160:
                continue
            if any(not (end + 12 < a or first > b + 12) for a, b in taken):
                continue
            taken.append((first, end))
            # the queue is orange; its heavy core, a third of it, is red
            core = max(1, (end - first) // 3)
            start_core = first + rng.randint(0, max(0, (end - first) - core))
            pieces = [[first, start_core, 1], [start_core, start_core + core, 2], [start_core + core, end, 1]]
            runs += [p for p in pieces if p[1] > p[0]]
            break
    return sorted(runs)


def route_record(route_id: str, origin: tuple[float, float], destination: tuple[float, float], r: dict, traffic: bool = True):
    """Compact record: polyline, metres, seconds, traffic as point ranges. The ends are joined to the stops themselves."""
    pts = r["pts"]
    runs = synth_traffic(route_id, r["dist"], r["speed"]) if traffic else []
    delay = sum(r["dur"][s] * (SLOWDOWN[level] - 1) for a, b, level in runs for s in range(a, b))
    head = haversine(origin, pts[0])
    tail = haversine(destination, pts[-1])
    pre = [origin] if head > 12 else []
    post = [destination] if tail > 12 else []
    shift = len(pre)
    record = {
        "path": encode(pre + pts + post),
        "m": round(r["m"] + (head if pre else 0) + (tail if post else 0)),
        "s": round(r["s"] + delay),
    }
    if runs:
        record["traffic"] = [[a + shift, b + shift, level] for a, b, level in runs]
    return record


# ---------------------------------------------------------------- GPS track


def snap_track(fixes: list[tuple[float, float]]):
    """
    The recorded fixes snapped to the road, as one route through them.

    Routing straight through the nearest road point of every fix can send a
    vehicle round a motorway interchange to reach the wrong carriageway. So each
    fix keeps a few candidate road points, and the chain of candidates with the
    least road distance between neighbours wins (a hidden Markov model's Viterbi
    pass, with OSRM's table service as the transition cost).
    """
    candidates = [osrm_nearest(f) for f in fixes]
    sigma, beta = 60.0, 250.0
    cost = [[(c[2] / sigma) ** 2 / 2 for c in candidates[0]]]
    back: list[list[int]] = []
    for k in range(1, len(fixes)):
        a = [(c[0], c[1]) for c in candidates[k - 1]]
        b = [(c[0], c[1]) for c in candidates[k]]
        table = osrm_table(a, b)
        flight = haversine(fixes[k - 1], fixes[k])
        row, pointer = [], []
        for j, cj in enumerate(candidates[k]):
            best, arg = math.inf, 0
            for i in range(len(a)):
                d = table[i][j]
                if d is None:
                    continue
                total = cost[k - 1][i] + abs(d - flight) / beta
                if total < best:
                    best, arg = total, i
            row.append(best + (cj[2] / sigma) ** 2 / 2)
            pointer.append(arg)
        cost.append(row)
        back.append(pointer)
    j = min(range(len(cost[-1])), key=lambda n: cost[-1][n])
    chosen = [j]
    for pointer in reversed(back):
        j = pointer[j]
        chosen.append(j)
    chosen.reverse()
    snapped = [(candidates[k][chosen[k]][0], candidates[k][chosen[k]][1]) for k in range(len(fixes))]
    return snapped


# ---------------------------------------------------------------- outlines


def local_frame(lat0: float, lon0: float):
    kx = 111_320 * math.cos(math.radians(lat0))
    ky = 110_540
    to_xy = lambda lat, lon: ((lon - lon0) * kx, (lat - lat0) * ky)
    to_ll = lambda x, y: (lat0 + y / ky, lon0 + x / kx)
    return to_xy, to_ll


def octagon(radius: float = 95.0) -> Polygon:
    return Polygon([(radius * math.cos(math.radians(22.5 + 45 * i)), radius * math.sin(math.radians(22.5 + 45 * i))) for i in range(8)])


def outline_for(key: str, lat: float, lon: float):
    """The block of roads the point stands in, as [lon, lat] pairs, and where it came from."""
    to_xy, to_ll = local_frame(lat, lon)
    query = (
        f'[out:json][timeout:90];way(around:800,{lat},{lon})["highway"~"^({HIGHWAYS})$"]'
        '["service"!~"driveway|parking_aisle|drive-through|emergency_access"];out geom;'
    )
    shape, origin = None, "octagon"
    try:
        reply = overpass(query)
        lines = [
            LineString([to_xy(n["lat"], n["lon"]) for n in way["geometry"]])
            for way in reply["elements"]
            if len(way.get("geometry", [])) > 1
        ]
        faces = list(polygonize(unary_union(lines))) if lines else []
        here = Point(0, 0)
        around = [f for f in faces if f.contains(here)] or [f for f in faces if f.distance(here) < 25]
        around.sort(key=lambda f: f.area)
        for face in around:
            compact = 4 * math.pi * face.area / (face.length**2)
            if 2_500 <= face.area <= 220_000 and compact > 0.1:
                inset = face.buffer(-7, join_style=2)
                if inset.is_empty or inset.area < face.area * 0.35:
                    inset = face.buffer(-3, join_style=2)
                if not inset.is_empty:
                    if inset.geom_type == "MultiPolygon":
                        inset = max(inset.geoms, key=lambda g: g.area)
                    shape, origin = inset.simplify(1.8), "roads"
                    break
    except RuntimeError as error:
        log(f"  {key}: overpass unavailable ({error}); octagon")
    if shape is None:
        shape = octagon()
    ring = [to_ll(x, y) for x, y in shape.exterior.coords]
    return [[round(lo, 6), round(la, 6)] for la, lo in ring], origin


# ---------------------------------------------------------------- main


def main() -> int:
    data = json.loads(DATA.read_text("utf-8"))
    sym, comp = data["symbiosis"], data["compliance"]

    factories = {f["key"]: (f["lat"], f["lon"]) for f in sym["factories"] if f["lat"] is not None and f["lon"] is not None}
    families = {b["id"]: b["family"] for b in sym["byproducts"]}
    facilities = {f["id"]: (f["lat"], f["lon"]) for f in comp["facilities"]}
    sites = {s["id"]: (s["lat"], s["lon"]) for s in comp["sites"]}
    records = {r["id"]: r for r in comp["records"]}

    routes: dict[str, dict] = {}

    log("exchanges")
    for o in sym["opportunities"]:
        a, b = factories.get(o["supplier"]), factories.get(o["receiver"])
        if not a or not b:
            continue
        if families.get(o["byproduct"]) in PIPED:
            log(f"  {o['id']}: by pipe, no road route")
            continue
        routes[o["id"]] = route_record(o["id"], a, b, osrm_route([a, b]))
        log(f"  {o['id']}: {routes[o['id']]['m'] / 1000:.1f} km, {routes[o['id']]['s'] / 60:.0f} min, traffic {routes[o['id']].get('traffic', [])}")

    log("trips")
    for t in comp["trips"]:
        record = records.get(t["record"])
        origin = facilities.get(record["facility"]) if record else None
        site = sites.get(t["site"]) if t["site"] else None
        if not origin or not site:
            continue
        routes[t["id"]] = route_record(t["id"], origin, site, osrm_route([origin, site]))
        log(f"  {t['id']}: {routes[t['id']]['m'] / 1000:.1f} km, {routes[t['id']]['s'] / 60:.0f} min")

    log("gps track")
    track = None
    fixes_all = [p for p in comp["gps"] if p["vehicle"] == next((t["vehicle"] for t in comp["trips"] if t["id"] == comp["gpsTrip"]), None)]
    if len(fixes_all) >= 2:
        fixes = [(p["lat"], p["lon"]) for p in fixes_all]
        stops: list[tuple[float, float]] = []
        for i, f in enumerate(fixes):
            if i == 0 or f != fixes[i - 1]:
                stops.append(f)
        snapped = snap_track(stops)
        legs, metres, seconds = [], 0.0, 0.0
        for k in range(len(stops) - 1):
            r = osrm_route([snapped[k], snapped[k + 1]])
            pts = r["pts"]
            if k == 0 and haversine(stops[0], pts[0]) > 12:
                pts = [stops[0]] + pts
            if k == len(stops) - 2 and haversine(stops[-1], pts[-1]) > 12:
                pts = pts + [stops[-1]]
            legs.append(pts)
            metres += r["m"]
            seconds += r["s"]
        path = list(legs[0])
        for leg in legs[1:]:
            path += leg[1:] if leg and path and leg[0] == path[-1] else leg
        track = {
            "path": encode(path),
            "legs": [encode(leg) for leg in legs],
            "m": round(metres),
            "s": round(seconds),
        }
        straight = sum(haversine(stops[k], stops[k + 1]) for k in range(len(stops) - 1))
        log(f"  {comp['gpsTrip']}: {metres / 1000:.1f} km along the road, {straight / 1000:.1f} km between fixes, {len(legs)} legs")
        routes[f"track-{comp['gpsTrip']}"] = track

    log("outlines")
    outlines: dict[str, list[list[float]]] = {}
    for key, (lat, lon) in {**factories, **facilities}.items():
        ring, origin = outline_for(key, lat, lon)
        outlines[key] = ring
        log(f"  {key}: {origin}, {len(ring)} points")

    OUT.write_text(
        json.dumps(
            {
                "_about": "Generated by scripts/build_map_data.py. Routes by OSRM on OpenStreetMap data (ODbL); outlines from OpenStreetMap roads; traffic is illustrative.",
                "routes": routes,
                "outlines": outlines,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        "utf-8",
    )
    log(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
