"""Subset of Archivo for the PRO–KOM mark (ADR-G003 §2: Archivo, width 118, weight 800).

The full variable Archivo is ~88 KB and loads on every page, only for the seven letters of the
logo (Lighthouse G7). This script pins the axes to wdth 118 / wght 800 and keeps just the logo's
characters, which gives a static font of a few KB for `next/font/local`.

Run by hand, only when the logo text changes (not part of the build):

    python -m venv .fontvenv && .fontvenv/Scripts/python -m pip install fonttools brotli
    .fontvenv/Scripts/python scripts/subset-logo-font.py <Archivo variable .ttf/.woff2> \
        "src/app/(site)/fonts/archivo-logo.woff2"

Source: the Archivo variable font (OFL, github.com/Omnibus-Type/Archivo — or the latin file that
`next/font/google` downloads into `.next/static/media`). Keep `Archivo-OFL.txt` next to the result.
"""

import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

# "PRO–KOM" (en dash) plus a plain hyphen, in case the mark is ever typed with one.
TEXT = "PROKM–-"
AXES = {"wght": 800, "wdth": 118}


def main(source: str, target: str) -> None:
    font = instancer.instantiateVariableFont(TTFont(source), AXES)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["kern"]
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]  # keep copyright and licence
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=TEXT)
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(target)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
