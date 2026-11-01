"""Our subsets of the site fonts (ADR-G003 §2): one woff2 per family and style.

`next/font/google` gives only `latin` + `latin-ext`, so Polish text loaded two files per family
(137–224 KB of fonts per page, Lighthouse G15). This keeps Latin, Latin-1, the Polish letters and
the typography the site uses (quotes, dashes, ellipsis, minus, arrows, ≈ ≤ ≥), and cuts the weight
axis to the weights in use. A character outside the set falls back to Georgia / the system font.

Run by hand, only when a font, a weight or the character set changes (not part of the build):

    python -m venv .fontvenv && .fontvenv/Scripts/python -m pip install fonttools brotli
    .fontvenv/Scripts/python scripts/subset-site-fonts.py <dir with the source .ttf> "src/app/(site)/fonts"

Sources: the variable fonts of github.com/google/fonts (OFL): `ofl/manrope/Manrope[wght].ttf`,
`ofl/cormorantgaramond/CormorantGaramond[wght].ttf`, `…/CormorantGaramond-Italic[wght].ttf`,
`ofl/cinzel/Cinzel[wght].ttf`. Keep the `*-OFL.txt` licences next to the results.
"""
import sys, os
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

JOBS = [
    ('Manrope[wght].ttf', 'manrope.woff2', (400, 800)),
    ('CormorantGaramond[wght].ttf', 'cormorant.woff2', (500, 600)),
    ('CormorantGaramond-Italic[wght].ttf', 'cormorant-italic.woff2', (500, 600)),
    ('Cinzel[wght].ttf', 'cinzel.woff2', (400, 700)),
]
# Basic Latin, Latin-1 (NBSP, ó, «», ·, ×, é…), Polish letters, general punctuation,
# euro, arrows, minus, ≈ ≤ ≥ and the narrow no-break space (prices, FPS), check mark.
UNICODES = (
    list(range(0x20, 0x7F)) + list(range(0xA0, 0x100))
    + [ord(c) for c in 'ĄąĆćĘęŁłŃńŚśŹźŻż']
    + list(range(0x2010, 0x2028)) + [0x2030, 0x2039, 0x203A, 0x20AC, 0x2122]
    + [0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0x2264, 0x2265, 0x2248, 0x202F, 0x2713, 0x2022, 0x2026]
)

def main() -> None:
    src, out = sys.argv[1], sys.argv[2]
    for name, target, (lo, hi) in JOBS:
        font = TTFont(os.path.join(src, name), lazy=False)
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'lnum', 'pnum', 'tnum']
        opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
        opts.notdef_outline = True
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=UNICODES)
        sub.subset(font)
        font = instancer.instantiateVariableFont(font, {'wght': (lo, hi)})
        font.flavor = 'woff2'
        path = os.path.join(out, target)
        font.save(path)
        print(f'{target:24} {os.path.getsize(path)/1024:.1f} KB  wght {lo}-{hi}')


if __name__ == '__main__':
    main()
