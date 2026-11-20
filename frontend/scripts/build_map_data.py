#!/usr/bin/env python3
"""
Builds src/data/map-data.json: everything the tracking map draws that is not
the basemap, worked out once here so the app needs no routing service at run time.

  routes     Each trip's expected leg (facility to site), and the recorded GPS
             track snapped to the roads. Geometry is OSRM's, on OpenStreetMap
             data. Each carries its length, its time, and the stretches drawn
             orange and red.
  outlines   A polygon around each producing facility: the block of roads it
             stands in, or a plot-shaped rectangle where the roads do not close
             round it. These are the dotted red outlines. The roads come from the
             same OpenStreetMap vector tiles the basemap draws (OpenFreeMap).

Traffic is illustrative. There is no live traffic source in the data pack, so
the orange and red stretches are picked per route by a seeded generator, only on
its faster roads, and their delay is added to the time. The same route always
gets the same traffic.

Needs the internet (the public OSRM server and OpenFreeMap's tiles) and shapely:

    pip install shapely
    python scripts/build_map_data.py

Responses are cached in scripts/.cache, so a second run is quick and polite.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import math
import random
import sys
import time
import urllib.error
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
TILEJSON = "https://tiles.openfreemap.org/planet"
TILE_ZOOM = 14  # the highest zoom the tiles are cut at

# Traffic levels: 1 slow (orange), 2 heavy (red); time on the stretch is
# multiplied by these.
SLOWDOWN = {1: 1.5, 2: 2.7}

# A leg of the GPS track whose road route is longer than this many times the
# straight line between its fixes is drawn straight.
DETOUR = 2.2

# Road classes of the vector tiles that bound a block (paths and tracks do not),
# and the service roads that are only a way into a plot.
BLOCK_ROADS = {"motorway", "trunk", "primary", "secondary", "tertiary", "minor", "service"}
PRIVATE_SERVICE = {"driveway", "parking_aisle", "drive-through", "emergency_access"}


# ---------------------------------------------------------------- plumbing


def fetch(url: str, data: bytes | None = None, tries: int = 5, pause: float = 1.1, timeout: float = 120):
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
            with urllib.request.urlopen(req, timeout=timeout) as response:
                body = json.load(response)
            cached.write_text(json.dumps(body), "utf-8")
            time.sleep(pause)
            return body
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            last = error
            time.sleep(pause * (attempt + 2) * 2)
    raise RuntimeError(f"{url[:120]} failed: {last}")


def fetch_bytes(url: str, tries: int = 4, pause: float = 0.4) -> bytes:
    """Raw bytes (a vector tile), cached on disk and gunzipped."""
    CACHE.mkdir(exist_ok=True)
    cached = CACHE / f"{hashlib.sha1(url.encode()).hexdigest()}.pbf"
    if cached.exists():
        return cached.read_bytes()
    last: Exception | None = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=60) as response:
                body = response.read()
            if body[:2] == b"\x1f\x8b":
                body = gzip.decompress(body)
            cached.write_bytes(body)
            time.sleep(pause)
            return body
        except (urllib.error.URLError, TimeoutError) as error:
            last = error
            time.sleep(pause * (attempt + 2) * 3)
    raise RuntimeError(f"{url} failed: {last}")


# ---------------------------------------------------------------- vector tiles
# A tile is a protobuf (Mapbox Vector Tile). Only what the roads need is read.


def _varint(buf: bytes, i: int) -> tuple[int, int]:
    shift = result = 0
    while True:
        byte = buf[i]
        i += 1
        result |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return result, i
        shift += 7


def _message(buf: bytes) -> dict[int, list]:
    """The fields of one protobuf message, by field number."""
    i, fields = 0, {}
    while i < len(buf):
        key, i = _varint(buf, i)
        number, wire = key >> 3, key & 7
        if wire == 0:
            value, i = _varint(buf, i)
        elif wire == 2:
            length, i = _varint(buf, i)
            value = buf[i : i + length]
            i += length
        elif wire == 1:
            value, i = buf[i : i + 8], i + 8
        elif wire == 5:
            value, i = buf[i : i + 4], i + 4
        else:
            raise ValueError(f"unsupported wire type {wire}")
        fields.setdefault(number, []).append(value)
    return fields


def _packed(buf: bytes) -> list[int]:
    out, i = [], 0
    while i < len(buf):
        value, i = _varint(buf, i)
        out.append(value)
    return out


def tile_lines(tile: bytes, layer_name: str):
    """Yield (properties, [(x, y), ...]) for each line of a layer, in tile units."""
    for raw in _message(tile).get(3, []):
        layer = _message(raw)
        if layer[1][0].decode() != layer_name:
            continue
        keys = [k.decode() for k in layer.get(3, [])]
        values = []
        for v in layer.get(4, []):
            m = _message(v)
            if 1 in m:
                values.append(m[1][0].decode())
            elif 4 in m or 5 in m:
                values.append(m.get(4, m.get(5))[0])
            elif 6 in m:
                n = m[6][0]
                values.append((n >> 1) ^ -(n & 1))
            elif 7 in m:
                values.append(bool(m[7][0]))
            else:
                values.append(None)
        extent = layer.get(5, [4096])[0]
        for rawf in layer.get(2, []):
            f = _message(rawf)
            if f.get(3, [0])[0] != 2:  # LINESTRING
                continue
            tags = _packed(f[2][0]) if 2 in f else []
            props = {keys[tags[n]]: values[tags[n + 1]] for n in range(0, len(tags), 2)}
            geometry = _packed(f[4][0]) if 4 in f else []
            lines, current, x, y, i = [], [], 0, 0, 0
            while i < len(geometry):
                command, count = geometry[i] & 7, geometry[i] >> 3
                i += 1
                for _ in range(count):
                    if command in (1, 2):
                        dx, dy = geometry[i], geometry[i + 1]
                        i += 2
                        x += (dx >> 1) ^ -(dx & 1)
                        y += (dy >> 1) ^ -(dy & 1)
                        if command == 1 and current:
                            lines.append(current)
                            current = []
                        current.append((x / extent, y / extent))
            if current:
                lines.append(current)
            for line in lines:
                if len(line) > 1:
                    yield props, line


def tile_url() -> str:
    return fetch(TILEJSON, pause=0.2)["tiles"][0]


def tile_roads(lat: float, lon: float, reach: float = 1000.0):
    """
    The roads round a point that can bound a block, as shapely lines in metres
    from the point. Bridges, tunnels and ramps are left out: they cross other
    roads without joining them and would cut false blocks.
    """
    n = 2**TILE_ZOOM
    kx = 111_320 * math.cos(math.radians(lat))
    ky = 110_540
    cx = int((lon + 180) / 360 * n)
    cy = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
    pattern = tile_url()
    out = []
    for tx in range(cx - 1, cx + 2):
        for ty in range(cy - 1, cy + 2):
            body = fetch_bytes(pattern.format(z=TILE_ZOOM, x=tx, y=ty))
            for props, line in tile_lines(body, "transportation"):
                if props.get("class") not in BLOCK_ROADS or props.get("brunnel") or props.get("ramp") == 1:
                    continue
                if props.get("service") in PRIVATE_SERVICE:
                    continue
                pts = []
                for u, v in line:
                    glon = (tx + u) / n * 360 - 180
                    glat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (ty + v) / n))))
                    pts.append(((glon - lon) * kx, (glat - lat) * ky))
                shape = LineString(pts)
                if shape.distance(Point(0, 0)) <= reach:
                    out.append(shape)
    return out


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


def plot(lines: list[LineString], half_length: float = 125.0, half_width: float = 85.0) -> Polygon:
    """
    A rounded rectangle on the point, turned to run along the nearest road within
    300 m (a plot sits square to its street), or east-west where there is none.
    """
    here = Point(0, 0)
    angle = 0.0
    near = [(l.distance(here), l) for l in lines if l.distance(here) <= 300]
    if near:
        _, line = min(near, key=lambda n: n[0])
        at = line.project(here)
        a, b = line.interpolate(max(0.0, at - 10)), line.interpolate(min(line.length, at + 10))
        angle = math.atan2(b.y - a.y, b.x - a.x)
    c, s = math.cos(angle), math.sin(angle)
    corners = [(-half_length, -half_width), (half_length, -half_width), (half_length, half_width), (-half_length, half_width)]
    box = Polygon([(x * c - y * s, x * s + y * c) for x, y in corners])
    return box.buffer(-8).buffer(8, quad_segs=4)


def outline_for(key: str, lat: float, lon: float):
    """
    The outline of a factory, as [lon, lat] pairs, and where it came from: the
    block of roads the point stands in (or sits on the edge of), when the roads
    close round it at a plot-like size; else a rectangle square to the nearest road.
    """
    _, to_ll = local_frame(lat, lon)
    shape, origin = None, "plot"
    lines: list[LineString] = []
    try:
        lines = tile_roads(lat, lon)
        faces = list(polygonize(unary_union(lines))) if lines else []
        here = Point(0, 0)
        around = sorted((f for f in faces if f.contains(here)), key=lambda f: f.area)
        around += sorted((f for f in faces if not f.contains(here) and f.distance(here) <= 60), key=lambda f: f.distance(here))
        for face in around:
            compact = 4 * math.pi * face.area / (face.length**2)
            if 3_000 <= face.area <= 250_000 and compact >= 0.12:
                inset = face.buffer(-7, join_style=2)
                if inset.is_empty or inset.area < face.area * 0.35:
                    inset = face.buffer(-3, join_style=2)
                if not inset.is_empty:
                    if inset.geom_type == "MultiPolygon":
                        inset = max(inset.geoms, key=lambda g: g.area)
                    shape, origin = inset.simplify(1.8), "roads"
                    break
    except RuntimeError as error:
        log(f"  {key}: tiles unavailable ({error}); drawing a plot")
    if shape is None:
        shape = plot(lines)
    ring = [to_ll(x, y) for x, y in shape.exterior.coords]
    return [[round(lo, 6), round(la, 6)] for la, lo in ring], origin


# ---------------------------------------------------------------- main


def main() -> int:
    data = json.loads(DATA.read_text("utf-8"))
    comp = data["compliance"]

    facilities = {f["id"]: (f["lat"], f["lon"]) for f in comp["facilities"]}
    sites = {s["id"]: (s["lat"], s["lon"]) for s in comp["sites"]}
    records = {r["id"]: r for r in comp["records"]}

    routes: dict[str, dict] = {}

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
            flight = haversine(stops[k], stops[k + 1])
            if r["m"] > DETOUR * flight + 300:
                # The roads reach the next fix only by a long way round (the
                # vehicle left the mapped network, as it did to reach the dump
                # sighting): draw the leg straight, as the fixes say.
                log(f"    leg {k}: {r['m'] / 1000:.1f} km by road for {flight / 1000:.1f} km as the crow flies; drawn straight")
                pts = [stops[k], stops[k + 1]]
                metres += flight
                seconds += flight / 13.9  # 50 km/h
            else:
                pts = r["pts"]
                if k == 0 and haversine(stops[0], pts[0]) > 12:
                    pts = [stops[0]] + pts
                if k == len(stops) - 2 and haversine(stops[-1], pts[-1]) > 12:
                    pts = pts + [stops[-1]]
                metres += r["m"]
                seconds += r["s"]
            legs.append(pts)
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
    for key, (lat, lon) in facilities.items():
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
