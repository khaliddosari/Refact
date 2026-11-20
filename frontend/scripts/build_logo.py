"""
Build the Hakeem logo lockup as outlined SVG paths.

Why outlines: the lockup must line up on every side. The light green mark on
the left is exactly as tall as the two-line name beside it, and "Hakeem" is
spaced to exactly the width of "حكيم". Live text cannot promise that (line
boxes, side bearings and font loading all get in the way); outlines measured
from the actual glyph ink can.

The name is shaped with HarfBuzz (the same engine the browser uses) from
Thmanyah Serif Display Black, with every optional OpenType feature the face
ships switched on, then converted to paths. The logo therefore needs no web
font and renders the same everywhere.

Run from frontend/:

    pip install uharfbuzz fonttools
    python scripts/build_logo.py [path/to/thmanyahserifdisplay-Black.otf]

Without a path it downloads the font from the pinned thmanyah-fonts tag. It
rewrites src/components/brand/logo-art.ts.
"""

from __future__ import annotations

import sys
import tempfile
import urllib.request
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
from fontTools.ttLib import TTFont

FONT_URL = (
    "https://cdn.jsdelivr.net/gh/khaliddosari/thmanyah-fonts@v1/"
    "thmanyah%20typeface/thmanyahserifdisplay/otf/thmanyahserifdisplay-Black.otf"
)
OUT = Path(__file__).resolve().parent.parent / "src" / "components" / "brand" / "logo-art.ts"

ARABIC = "حكيم"
ENGLISH = "Hakeem"

# Every optional feature in the face (the defaults are on already).
FEATURES = {tag: True for tag in (
    "aalt", "dlig", "salt", "swsh", "ss01", "ss03", "ss04", "ss05", "ss06", "ss07", "lnum",
)}

# The recycle mark: three chasing arrows on a circle centred at (24, 24) in a
# 48-unit box (same geometry as public/favicon.svg).
MARK = [
    "M28.19 7.21A17.3 17.3 0 0 1 40.92 20.4L44.64 19.61L38.01 27.75L31.73 22.36L35.44 21.57A11.7 11.7 0 0 0 26.83 12.65A2.8 2.8 0 0 1 28.19 7.21Z",
    "M36.44 36.02A17.3 17.3 0 0 1 18.65 40.45L17.48 44.07L13.75 34.25L21.56 31.51L20.38 35.13A11.7 11.7 0 0 0 32.42 32.13A2.8 2.8 0 0 1 36.44 36.02Z",
    "M7.37 28.77A17.3 17.3 0 0 1 12.42 11.14L9.88 8.32L20.25 9.99L18.71 18.13L16.17 15.31A11.7 11.7 0 0 0 12.75 27.22A2.8 2.8 0 0 1 7.37 28.77Z",
]
MARK_CENTRE = (24.0, 24.0)

# Proportions, all relative to the height of the two-line name.
TRACKING_EM = 0.06    # letter-spacing of "Hakeem", before it is fitted to the Arabic width
LINE_GAP = 0.09       # between the lowest Arabic ink and the top of "Hakeem"
MARK_GAP = 0.2        # between the mark and the name
TARGET_HEIGHT = 64.0  # viewBox height; the component scales it


def fmt(n: float) -> str:
    s = f"{n:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


class Run:
    """A shaped line: glyph names with their origins, in font units, y up."""

    def __init__(self, glyphset, glyph_order, hb_font, text: str, tracking: float = 0.0):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(hb_font, buf, FEATURES)
        self.glyphset = glyphset
        self.items: list[tuple[str, float, float]] = []
        x = y = 0.0
        infos, positions = buf.glyph_infos, buf.glyph_positions
        for i, (info, pos) in enumerate(zip(infos, positions)):
            self.items.append((glyph_order[info.codepoint], x + pos.x_offset, y + pos.y_offset))
            x += pos.x_advance + (tracking if i < len(infos) - 1 else 0.0)
            y += pos.y_advance
        self.names = [name for name, _, _ in self.items]

    def draw(self, pen, matrix):
        """Draw every glyph through an affine matrix (xx, xy, yx, yy, dx, dy)."""
        xx, xy, yx, yy, dx, dy = matrix
        for name, gx, gy in self.items:
            placed = (xx, xy, yx, yy, dx + xx * gx + yx * gy, dy + xy * gx + yy * gy)
            self.glyphset[name].draw(TransformPen(pen, placed))

    def bounds(self):
        pen = BoundsPen(self.glyphset)
        self.draw(pen, (1, 0, 0, 1, 0, 0))
        return pen.bounds  # (xMin, yMin, xMax, yMax), y up


def mark_bounds():
    pen = BoundsPen(None)
    for d in MARK:
        parse_path(d, pen)
    return pen.bounds  # y down, as drawn


def main():
    if len(sys.argv) > 1:
        font_path = Path(sys.argv[1])
    else:
        font_path = Path(tempfile.gettempdir()) / "thmanyahserifdisplay-Black.otf"
        if not font_path.exists():
            urllib.request.urlretrieve(FONT_URL, font_path)

    tt = TTFont(font_path)
    glyphset, order = tt.getGlyphSet(), tt.getGlyphOrder()
    upem = tt["head"].unitsPerEm
    hb_font = hb.Font(hb.Face(hb.Blob.from_file_path(str(font_path))))

    arabic = Run(glyphset, order, hb_font, ARABIC)
    axmin, aymin, axmax, aymax = arabic.bounds()
    width, arabic_h = axmax - axmin, aymax - aymin

    # Fit "Hakeem" to the Arabic width: natural ink width plus five gaps of
    # tracking, scaled by k, must equal the Arabic ink width.
    tracking = TRACKING_EM * upem
    natural = Run(glyphset, order, hb_font, ENGLISH)
    nxmin, _, nxmax, _ = natural.bounds()
    k = width / ((nxmax - nxmin) + 5 * tracking)
    english = Run(glyphset, order, hb_font, ENGLISH, tracking)
    exmin, eymin, exmax, eymax = english.bounds()
    english_h = k * (eymax - eymin)

    # Solve the vertical stack: Arabic ink, gap, English ink. The gap is a
    # share of the total, so: total = arabic_h + english_h + LINE_GAP * total.
    total = (arabic_h + english_h) / (1 - LINE_GAP)
    gap = LINE_GAP * total
    g = TARGET_HEIGHT / total  # font units -> viewBox units

    mxmin, mymin, mxmax, mymax = mark_bounds()
    m = TARGET_HEIGHT / (mymax - mymin)  # mark ink exactly as tall as the name
    mark_w = m * (mxmax - mxmin)
    text_x = mark_w + MARK_GAP * TARGET_HEIGHT
    view_w = text_x + g * width

    mark_pen = SVGPathPen(None, ntos=fmt)
    for d in MARK:
        parse_path(d, TransformPen(mark_pen, (m, 0, 0, m, -m * mxmin, -m * mymin)))

    ar_pen = SVGPathPen(glyphset, ntos=fmt)
    arabic.draw(ar_pen, (g, 0, 0, -g, text_x - g * axmin, g * aymax))

    en_pen = SVGPathPen(glyphset, ntos=fmt)
    en_top = g * (arabic_h + gap)
    en_scale = g * k
    english.draw(en_pen, (en_scale, 0, 0, -en_scale, text_x - en_scale * exmin, en_top + en_scale * eymax))

    centre = (m * (MARK_CENTRE[0] - mxmin), m * (MARK_CENTRE[1] - mymin))

    # Check the result really is flush on every side.
    check = BoundsPen(glyphset)
    arabic.draw(check, (g, 0, 0, -g, text_x - g * axmin, g * aymax))
    english.draw(check, (en_scale, 0, 0, -en_scale, text_x - en_scale * exmin, en_top + en_scale * eymax))
    tx0, ty0, tx1, ty1 = check.bounds  # y-flipped space, so ty0 is the visual top
    print(f"glyphs: {arabic.names} + {english.names}")
    print(f"viewBox 0 0 {view_w:.2f} {TARGET_HEIGHT:.2f}; name ink x {tx0:.2f}..{tx1:.2f}, y {ty0:.2f}..{ty1:.2f}")
    print(f"English size {k:.3f}x the Arabic, tracking {TRACKING_EM}em; mark {mark_w:.2f} wide")

    OUT.write_text(
        "// Generated by scripts/build_logo.py from Thmanyah Serif Display Black,\n"
        "// shaped with HarfBuzz with every OpenType feature on. Do not edit by hand.\n\n"
        f'export const LOGO_VIEWBOX = "0 0 {fmt(view_w)} {fmt(TARGET_HEIGHT)}"\n\n'
        f"/** Centre of the recycle loop, for rotating the mark in place. */\n"
        f"export const LOGO_MARK_CENTRE = {{ x: {fmt(centre[0])}, y: {fmt(centre[1])} }}\n\n"
        f'export const LOGO_MARK = "{mark_pen.getCommands()}"\n\n'
        f'export const LOGO_ARABIC = "{ar_pen.getCommands()}"\n\n'
        f'export const LOGO_ENGLISH = "{en_pen.getCommands()}"\n',
        encoding="utf-8",
    )
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
