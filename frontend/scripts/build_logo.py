"""
Build the logo lockup (ريفاكت) as outlined SVG paths.

Why outlines: the lockup must line up on every side. The light green mark on
the left is exactly as tall as the ink of the name beside it, top and bottom
flush. Live text cannot promise that (line boxes, side bearings and font
loading all get in the way); outlines measured from the actual glyph ink can.

The name is shaped with HarfBuzz (the same engine the browser uses) from
Thmanyah Serif Display Black, with every optional OpenType feature the face
ships switched on (but not aalt, see FEATURES), then converted to paths. The
logo therefore needs no web font and renders the same everywhere.

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

NAME = "ريفاكت"

# Every optional feature in the face (the defaults are on already), except
# "aalt". aalt (access all alternates) is a menu for a text editor, not a style:
# switched on, it swaps every glyph for its first alternate, and the first
# alternate of ر is its final form, which carries a joining stub that reaches
# for a letter before it. At the start of a word that reads as a broken ر.
FEATURES = {tag: True for tag in (
    "dlig", "salt", "swsh", "ss01", "ss03", "ss04", "ss05", "ss06", "ss07", "lnum",
)}

# The recycle mark: three chasing arrows on a circle centred at (24, 24) in a
# 48-unit box (same geometry as public/favicon.svg).
MARK = [
    "M28.19 7.21A17.3 17.3 0 0 1 40.92 20.4L44.64 19.61L38.01 27.75L31.73 22.36L35.44 21.57A11.7 11.7 0 0 0 26.83 12.65A2.8 2.8 0 0 1 28.19 7.21Z",
    "M36.44 36.02A17.3 17.3 0 0 1 18.65 40.45L17.48 44.07L13.75 34.25L21.56 31.51L20.38 35.13A11.7 11.7 0 0 0 32.42 32.13A2.8 2.8 0 0 1 36.44 36.02Z",
    "M7.37 28.77A17.3 17.3 0 0 1 12.42 11.14L9.88 8.32L20.25 9.99L18.71 18.13L16.17 15.31A11.7 11.7 0 0 0 12.75 27.22A2.8 2.8 0 0 1 7.37 28.77Z",
]
MARK_CENTRE = (24.0, 24.0)

MARK_GAP = 0.22       # between the mark and the name, relative to the lockup height
TARGET_HEIGHT = 64.0  # viewBox height; the component scales it


def fmt(n: float) -> str:
    s = f"{n:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


class Run:
    """A shaped line: glyph names with their origins, in font units, y up."""

    def __init__(self, glyphset, glyph_order, hb_font, text: str):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(hb_font, buf, FEATURES)
        self.glyphset = glyphset
        self.items: list[tuple[str, float, float]] = []
        x = y = 0.0
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            self.items.append((glyph_order[info.codepoint], x + pos.x_offset, y + pos.y_offset))
            x += pos.x_advance
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
    hb_font = hb.Font(hb.Face(hb.Blob.from_file_path(str(font_path))))

    name = Run(glyphset, order, hb_font, NAME)
    xmin, ymin, xmax, ymax = name.bounds()
    width, height = xmax - xmin, ymax - ymin

    g = TARGET_HEIGHT / height  # font units -> viewBox units

    mxmin, mymin, mxmax, mymax = mark_bounds()
    m = TARGET_HEIGHT / (mymax - mymin)  # mark ink exactly as tall as the name's ink
    mark_w = m * (mxmax - mxmin)
    text_x = mark_w + MARK_GAP * TARGET_HEIGHT
    view_w = text_x + g * width

    mark_pen = SVGPathPen(None, ntos=fmt)
    for d in MARK:
        parse_path(d, TransformPen(mark_pen, (m, 0, 0, m, -m * mxmin, -m * mymin)))

    name_pen = SVGPathPen(glyphset, ntos=fmt)
    name.draw(name_pen, (g, 0, 0, -g, text_x - g * xmin, g * ymax))

    centre = (m * (MARK_CENTRE[0] - mxmin), m * (MARK_CENTRE[1] - mymin))

    # Check the result really is flush on every side.
    check = BoundsPen(glyphset)
    name.draw(check, (g, 0, 0, -g, text_x - g * xmin, g * ymax))
    tx0, ty0, tx1, ty1 = check.bounds  # y-flipped space, so ty0 is the visual top
    print(f"glyphs: {name.names}")
    print(f"viewBox 0 0 {view_w:.2f} {TARGET_HEIGHT:.2f}; name ink x {tx0:.2f}..{tx1:.2f}, y {ty0:.2f}..{ty1:.2f}")
    print(f"mark {mark_w:.2f} wide, name {g * width:.2f} wide")

    OUT.write_text(
        "// Generated by scripts/build_logo.py from Thmanyah Serif Display Black,\n"
        "// shaped with HarfBuzz with every OpenType feature on except aalt. Do not edit by hand.\n\n"
        f'export const LOGO_VIEWBOX = "0 0 {fmt(view_w)} {fmt(TARGET_HEIGHT)}"\n\n'
        f"/** Centre of the recycle loop, for rotating the mark in place. */\n"
        f"export const LOGO_MARK_CENTRE = {{ x: {fmt(centre[0])}, y: {fmt(centre[1])} }}\n\n"
        f'export const LOGO_MARK = "{mark_pen.getCommands()}"\n\n'
        f'export const LOGO_NAME = "{name_pen.getCommands()}"\n',
        encoding="utf-8",
    )
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
