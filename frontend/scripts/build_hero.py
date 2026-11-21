"""
Build the hero artwork for ريفاكت: the brand over a ring of exchanging
factories, in two shapes of the same picture.

  public/hero-wide.svg   2160 x 1080 (2:1), the brand on the right, the ring on the left
  public/hero-tall.svg   1080 x 2160 (1:2), the brand on top, the ring below

The picture says what the platform does: six industries (plastics, metals,
heat, water, paper, oils) pass their waste to the hub in the middle, which
matches it with another industry's need and sends it on. The hub is the
recycle mark. Rings of contour lines spread from it like ripples.

Everything is vector, with the name and the tagline outlined (HarfBuzz, so the
Arabic joins properly), so the SVG renders the same anywhere. For the PNGs:

    pip install uharfbuzz fonttools
    python scripts/build_hero.py [path/to/thmanyahsans-Bold.otf]
    npx -y @resvg/resvg-js-cli --fit-width 2160 public/hero-wide.svg public/hero-wide.png
    npx -y @resvg/resvg-js-cli --fit-width 1080 public/hero-tall.svg public/hero-tall.png

Without a font path it downloads Thmanyah Sans Bold from the pinned
thmanyah-fonts tag. The brand lockup comes from src/components/brand/logo-art.ts.
"""

from __future__ import annotations

import math
import re
import sys
import tempfile
import urllib.request
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
LOGO_ART = ROOT / "src" / "components" / "brand" / "logo-art.ts"
PUBLIC = ROOT / "public"

FONT_URL = (
    "https://cdn.jsdelivr.net/gh/khaliddosari/thmanyah-fonts@v1/"
    "thmanyah%20typeface/thmanyahsans/otf/thmanyahsans-Bold.otf"
)

TAGLINE = "منصة التكافل الصناعي الاستباقي"

# The theme, as hex (src/index.css)
FOREST_DEEP = "#05201a"
FOREST = "#093423"
PRIMARY = "#134b32"
LEAF = "#9be97f"
CREAM = "#faf7eb"

# Lucide icons (24 x 24, drawn with a 2px stroke), one per industry.
ICONS = {
    "plastics": '<path d="M8 2h8"/><path d="M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2"/><path d="M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/>',
    "metals": '<path d="M7 10H6a4 4 0 0 1-4-4 1 1 0 0 1 1-1h4"/><path d="M7 5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1 7 7 0 0 1-7 7H8a1 1 0 0 1-1-1z"/><path d="M9 12v5"/><path d="M15 12v5"/><path d="M5 20a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3 1 1 0 0 1-1 1H6a1 1 0 0 1-1-1"/>',
    "heat": '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>',
    "water": '<path d="M2 12q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 19q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 5q2.5 2 5 0t5 0 5 0 5 0"/>',
    "paper": '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/><path d="m7.5 4.27 9 5.15"/>',
    "oils": '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
}
ORDER = ["plastics", "metals", "heat", "water", "paper", "oils"]

# The recycle mark: three chasing arrows on a circle centred at (24, 24) in a
# 48-unit box (same geometry as scripts/build_logo.py and public/favicon.svg).
MARK = [
    "M28.19 7.21A17.3 17.3 0 0 1 40.92 20.4L44.64 19.61L38.01 27.75L31.73 22.36L35.44 21.57A11.7 11.7 0 0 0 26.83 12.65A2.8 2.8 0 0 1 28.19 7.21Z",
    "M36.44 36.02A17.3 17.3 0 0 1 18.65 40.45L17.48 44.07L13.75 34.25L21.56 31.51L20.38 35.13A11.7 11.7 0 0 0 32.42 32.13A2.8 2.8 0 0 1 36.44 36.02Z",
    "M7.37 28.77A17.3 17.3 0 0 1 12.42 11.14L9.88 8.32L20.25 9.99L18.71 18.13L16.17 15.31A11.7 11.7 0 0 0 12.75 27.22A2.8 2.8 0 0 1 7.37 28.77Z",
]


def n(v: float) -> str:
    s = f"{v:.1f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


# ---------------------------------------------------------------- text


def outline(font_path: Path, text: str, px: float) -> tuple[str, float]:
    """The text as one SVG path with its baseline at y = 0 and its start at x = 0; and its width."""
    tt = TTFont(font_path)
    glyphs, order = tt.getGlyphSet(), tt.getGlyphOrder()
    font = hb.Font(hb.Face(hb.Blob.from_file_path(str(font_path))))
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {})
    scale = px / tt["head"].unitsPerEm
    pen = SVGPathPen(glyphs, ntos=n)
    x = 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        glyphs[order[info.codepoint]].draw(
            TransformPen(pen, (scale, 0, 0, -scale, (x + pos.x_offset) * scale, -pos.y_offset * scale))
        )
        x += pos.x_advance
    return pen.getCommands(), x * scale


def logo_art() -> tuple[tuple[float, float], str, str]:
    """The lockup from logo-art.ts: its size, the mark's path and the name's path."""
    text = LOGO_ART.read_text("utf-8")
    pick = lambda name: re.search(rf'export const {name} = "([^"]+)"', text).group(1)  # noqa: E731
    w, h = (float(v) for v in pick("LOGO_VIEWBOX").split()[2:])
    return (w, h), pick("LOGO_MARK"), pick("LOGO_NAME")


# ---------------------------------------------------------------- the picture


def polar(centre: tuple[float, float], r: float, deg: float) -> tuple[float, float]:
    a = math.radians(deg)
    return centre[0] + r * math.cos(a), centre[1] + r * math.sin(a)


def arrowhead(tip: tuple[float, float], heading: float, size: float, fill: str, opacity: float) -> str:
    """A triangle whose point is `tip` and which points along `heading` (radians)."""
    bx, by = tip[0] - size * math.cos(heading), tip[1] - size * math.sin(heading)
    px, py = -math.sin(heading) * size * 0.55, math.cos(heading) * size * 0.55
    pts = f"{n(tip[0])},{n(tip[1])} {n(bx + px)},{n(by + py)} {n(bx - px)},{n(by - py)}"
    return f'<polygon points="{pts}" fill="{fill}" fill-opacity="{opacity}" stroke="{fill}" stroke-opacity="{opacity}" stroke-width="3" stroke-linejoin="round"/>'


def contours(centre: tuple[float, float], base: float, step: float, count: int) -> str:
    """Wobbly closed rings round a point, drifting a little from ring to ring, like ripples on a contour map."""
    rings = []
    for i in range(count):
        r0 = base + i * step
        phase = i * 0.17
        pts = []
        for k in range(181):
            t = 2 * math.pi * k / 180
            wobble = 1 + 0.032 * math.sin(3 * t + 0.6 + phase) + 0.018 * math.sin(5 * t + 2.1 - phase) + 0.01 * math.sin(9 * t + 4.0 + phase * 1.7)
            pts.append((centre[0] + r0 * wobble * math.cos(t), centre[1] + r0 * wobble * math.sin(t)))
        d = "M" + " L".join(f"{n(x)} {n(y)}" for x, y in pts) + "Z"
        opacity = max(0.015, 0.13 - i * 0.0042)
        rings.append(f'<path d="{d}" fill="none" stroke="{CREAM}" stroke-opacity="{opacity:.3f}" stroke-width="1.8"/>')
    return "\n".join(rings)


def network(centre: tuple[float, float], radius: float, node_r: float) -> str:
    """The hub, the six industries round it, and the flows between."""
    cx, cy = centre
    hub_r = radius * 0.43
    out: list[str] = []

    # a soft glow behind it all
    out.append(f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(radius * 1.35)}" fill="url(#glow)"/>')
    out.append(f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(radius)}" fill="none" stroke="{CREAM}" stroke-opacity="0.07" stroke-width="2"/>')

    # flows round the ring, industry to industry
    delta = math.degrees(math.asin((node_r + 12) / radius))
    for k in range(6):
        a0 = -90 + 60 * k + delta
        a1 = -90 + 60 * (k + 1) - delta
        (x0, y0), (x1, y1) = polar(centre, radius, a0), polar(centre, radius, a1)
        out.append(
            f'<path d="M{n(x0)} {n(y0)}A{n(radius)} {n(radius)} 0 0 1 {n(x1)} {n(y1)}" fill="none" stroke="{LEAF}" stroke-opacity="0.5" '
            'stroke-width="4" stroke-linecap="round" stroke-dasharray="1 15"/>'
        )
        out.append(arrowhead((x1, y1), math.radians(a1 + 90), 17, LEAF, 0.6))

    # spokes: waste in from the even ones, resources out to the odd ones
    for k in range(6):
        theta = -90 + 60 * k
        inward = k % 2 == 0
        near = polar(centre, hub_r + 8, theta)
        far = polar(centre, radius - node_r - 10, theta)
        start, end = (far, near) if inward else (near, far)
        mid = ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2)
        bend = (radius * 0.07) * (1 if k % 4 < 2 else -1)
        ctrl = (mid[0] - math.sin(math.radians(theta)) * bend, mid[1] + math.cos(math.radians(theta)) * bend)
        out.append(
            f'<path d="M{n(start[0])} {n(start[1])}Q{n(ctrl[0])} {n(ctrl[1])} {n(end[0])} {n(end[1])}" fill="none" stroke="{LEAF}" '
            'stroke-opacity="0.85" stroke-width="6" stroke-linecap="round"/>'
        )
        out.append(arrowhead(end, math.atan2(end[1] - ctrl[1], end[0] - ctrl[0]), 26, LEAF, 0.95))
        for t in (0.3, 0.62):
            qx = (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * ctrl[0] + t**2 * end[0]
            qy = (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * ctrl[1] + t**2 * end[1]
            out.append(f'<circle cx="{n(qx)}" cy="{n(qy)}" r="7" fill="{CREAM}" fill-opacity="0.95"/>')

    # the hub: the recycle mark in a ring
    out.append(f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(hub_r)}" fill="{FOREST}" fill-opacity="0.55" stroke="{LEAF}" stroke-opacity="0.35" stroke-width="3"/>')
    s = hub_r * 1.18 / 48
    paths = "".join(f'<path d="{d}"/>' for d in MARK)
    out.append(f'<g transform="translate({n(cx - 24 * s)} {n(cy - 24 * s)}) scale({s:.4f})" fill="{LEAF}">{paths}</g>')

    # the industries
    for k, name in enumerate(ORDER):
        px, py = polar(centre, radius, -90 + 60 * k)
        out.append(f'<circle cx="{n(px)}" cy="{n(py)}" r="{n(node_r + 16)}" fill="{LEAF}" fill-opacity="0.12"/>')
        out.append(f'<circle cx="{n(px)}" cy="{n(py)}" r="{n(node_r)}" fill="{CREAM}" stroke="{LEAF}" stroke-width="6"/>')
        i = node_r * 1.02 / 24
        out.append(
            f'<g transform="translate({n(px - 12 * i)} {n(py - 12 * i)}) scale({i:.4f})" fill="none" stroke="{PRIMARY}" '
            f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{ICONS[name]}</g>'
        )
    return "\n".join(out)


def brand(font: Path, anchor_x: float, top: float, lockup_w: float, align: str, tag_px: float) -> str:
    """The lockup and the tagline under it. `align` is where `anchor_x` sits: 'end' or 'middle'."""
    (lw, lh), mark, name = logo_art()
    k = lockup_w / lw
    x = anchor_x - lockup_w if align == "end" else anchor_x - lockup_w / 2
    out = [
        f'<g transform="translate({n(x)} {n(top)}) scale({k:.4f})">'
        f'<path d="{mark}" fill="{LEAF}"/><path d="{name}" fill="{CREAM}"/></g>'
    ]
    d, width = outline(font, TAGLINE, tag_px)
    ty = top + lh * k + tag_px * 1.9
    tx = anchor_x - width if align == "end" else anchor_x - width / 2
    rule_w = 120
    rx = anchor_x - rule_w if align == "end" else anchor_x - rule_w / 2
    out.append(f'<rect x="{n(rx)}" y="{n(top + lh * k + tag_px * 0.55)}" width="{rule_w}" height="7" rx="3.5" fill="{LEAF}"/>')
    out.append(f'<path d="{d}" transform="translate({n(tx)} {n(ty)})" fill="{CREAM}" fill-opacity="0.92"/>')
    return "\n".join(out)


def scene(width: int, height: int, tall: bool, font: Path) -> str:
    if tall:
        centre = (width / 2, height * 0.64)
        radius, node_r = width * 0.35, 70.0
        art = brand(font, width / 2, height * 0.14, width * 0.72, "middle", 54)
    else:
        centre = (width * 0.285, height / 2)
        radius, node_r = height * 0.355, 68.0
        art = brand(font, width - 170, height * 0.5 - 150, 800, "end", 58)
    glow_x, glow_y = (width * 0.72, height * 0.28) if not tall else (width * 0.5, height * 0.2)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#11523a"/><stop offset="0.5" stop-color="{FOREST}"/><stop offset="1" stop-color="{FOREST_DEEP}"/>
</linearGradient>
<radialGradient id="glow" gradientUnits="objectBoundingBox" cx="0.5" cy="0.5" r="0.5">
<stop offset="0" stop-color="{LEAF}" stop-opacity="0.28"/><stop offset="0.6" stop-color="{LEAF}" stop-opacity="0.07"/><stop offset="1" stop-color="{LEAF}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="warm" gradientUnits="userSpaceOnUse" cx="{n(glow_x)}" cy="{n(glow_y)}" r="{n(max(width, height) * 0.5)}">
<stop offset="0" stop-color="{CREAM}" stop-opacity="0.09"/><stop offset="1" stop-color="{CREAM}" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="{width}" height="{height}" fill="url(#bg)"/>
<rect width="{width}" height="{height}" fill="url(#warm)"/>
{contours(centre, radius * 0.5, radius * 0.085, 34)}
{network(centre, radius, node_r)}
{art}
</svg>
"""


def main() -> None:
    if len(sys.argv) > 1:
        font = Path(sys.argv[1])
    else:
        font = Path(tempfile.gettempdir()) / "thmanyahsans-Bold.otf"
        if not font.exists():
            urllib.request.urlretrieve(FONT_URL, font)
    for name, w, h, tall in (("hero-wide", 2160, 1080, False), ("hero-tall", 1080, 2160, True)):
        out = PUBLIC / f"{name}.svg"
        out.write_text(scene(w, h, tall, font), encoding="utf-8")
        print(f"wrote {out} ({out.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
